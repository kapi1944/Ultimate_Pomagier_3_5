use super::*;
use std::sync::{Arc, Barrier, OnceLock};

const HASLO: &str = "stare hasło testowe 123";
const NOWE: &str = "zażółćgę";

#[test]
fn walidacja_nowych_hasel() {
    for (haslo, poprawne) in [
        ("abcdefg".to_string(), false), ("abcdefgh".to_string(), true),
        ("abcdefghij".to_string(), true), ("abcd efgh".to_string(), false),
        (" abcdefgh".to_string(), false), ("abcdefgh ".to_string(), false),
        ("zażółćgę".to_string(), true), ("😀".repeat(7), false), ("😀".repeat(8), true),
        ("a".repeat(1024), true), ("a".repeat(1025), false),
        ("ą".repeat(512), true), ("ą".repeat(513), false),
        ("abcd\tefgh".to_string(), false), ("abcd\nefgh".to_string(), false),
        ("abcd\u{0085}efgh".to_string(), false), ("abcd\u{feff}efgh".to_string(), false),
    ] {
        assert_eq!(zabezpiecz_haslo(&haslo, &haslo).is_ok(), poprawne);
    }
}
fn konta() -> Value {
    json!({"wersja":2,"uzytkownicy":[
        {"id":"administrator-kacper-madej","login":"architekt","imie":"Architekt","nazwisko":"Testowy","rola":"ARCHITEKT","status":"AKTYWNY","organizacja":"SEMPER","emaile":["architekt@example.test"],"odznaki":[],"telefony":[],"aliasyHistoryczne":[],"wersjaUprawnien":1},
        {"id":"admin","login":"admin","imie":"Administrator","nazwisko":"Testowy","rola":"ADMINISTRATOR","status":"AKTYWNY","organizacja":"SEMPER","emaile":["admin@example.test"],"odznaki":[],"telefony":[],"aliasyHistoryczne":[],"wersjaUprawnien":1},
        {"id":"pracownik","login":"pracownik","imie":"Pracownik","nazwisko":"Testowy","rola":"PRACOWNIK","status":"AKTYWNY","organizacja":"SEMPER","emaile":["pracownik@example.test"],"odznaki":[],"telefony":[],"aliasyHistoryczne":[],"wersjaUprawnien":1},
        {"id":"gosc","login":"gosc","imie":"Gość","nazwisko":"Testowy","rola":"GOSC","status":"AKTYWNY","organizacja":"ZEWNETRZNY","emaile":["gosc@example.test"],"odznaki":[],"telefony":[],"aliasyHistoryczne":[],"wersjaUprawnien":1}
    ]})
}
#[test]
fn nowszy_format_bazy_nie_jest_nadpisywany() {
    let katalog = tempfile::tempdir().unwrap();
    let sciezka = katalog.path().join("nowsza.sqlite3");
    let baza = Connection::open(&sciezka).unwrap();
    baza.execute_batch("PRAGMA user_version=999;").unwrap();
    drop(baza);
    assert!(MagazynKont::otworz(&sciezka).is_err());
    let baza = Connection::open(&sciezka).unwrap();
    assert_eq!(
        baza.query_row("PRAGMA user_version", [], |wiersz| wiersz.get::<_, i64>(0))
            .unwrap(),
        999
    );
}
fn baza() -> MagazynKont {
    let mut magazyn = MagazynKont::otworz(Path::new(":memory:")).unwrap();
    magazyn.importuj_kartoteke(&konta()).unwrap();
    let hasz = OnceLock::get_or_init(
        {
            static HASZ: OnceLock<String> = OnceLock::new();
            &HASZ
        },
        || {
            Argon2::default()
                .hash_password(HASLO.as_bytes(), &SaltString::generate(&mut OsRng))
                .unwrap()
                .to_string()
        },
    );
    magazyn
        .baza
        .execute("UPDATE konta SET haslo=?1,wymagany_reset=0", [hasz])
        .unwrap();
    magazyn
}
fn zaloguj(magazyn: &mut MagazynKont, login: &str, haslo: &str) -> String {
    magazyn
        .wykonaj(None, "logowanie", &json!({"login":login,"haslo":haslo}))
        .unwrap()
        .nowa_sesja
        .unwrap()
}
fn resetuj(magazyn: &mut MagazynKont, sesja: &str, id: &str) -> Value {
    magazyn
        .wykonaj(Some(sesja), "resetuj", &json!({"identyfikatory":[id]}))
        .unwrap()
        .dane[0]
        .clone()
}
fn sprawdz(magazyn: &mut MagazynKont, login: &str, kod: &str) -> Result<WynikOperacji, String> {
    magazyn.wykonaj(None, "sprawdz-kod", &json!({"login":login,"kod":kod}))
}
fn zakoncz(
    magazyn: &mut MagazynKont,
    zgoda: &str,
    haslo: &str,
    powtorzone: &str,
) -> Result<WynikOperacji, String> {
    magazyn.wykonaj(
        None,
        "ustaw-haslo",
        &json!({"zgoda":zgoda,"haslo":haslo,"powtorzoneHaslo":powtorzone}),
    )
}
fn przygotuj() -> (MagazynKont, String, String) {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "admin", HASLO);
    let wynik = resetuj(&mut magazyn, &sesja, "pracownik");
    (magazyn, sesja, tekst(&wynik, "kod").into())
}

#[test]
fn architekt_resetuje_administratora() {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "architekt", HASLO);
    assert!(resetuj(&mut magazyn, &sesja, "admin")["kod"].is_string());
}
#[test]
fn administrator_resetuje_nizsza_role() {
    let (mut magazyn, _, kod) = przygotuj();
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_ok());
}
#[test]
fn nizsze_role_i_niezalogowany_nie_resetuja() {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "pracownik", HASLO);
    assert!(resetuj(&mut magazyn, &sesja, "gosc")["blad"].is_string());
    assert!(magazyn
        .wykonaj(None, "resetuj", &json!({"identyfikatory":["gosc"]}))
        .is_err());
}
#[test]
fn ochrona_wlasnego_rownego_i_wyzszego_konta() {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "admin", HASLO);
    for id in ["admin", "administrator-kacper-madej"] {
        assert!(resetuj(&mut magazyn, &sesja, id)["blad"].is_string());
    }
    let sesja = zaloguj(&mut magazyn, "architekt", HASLO);
    assert!(resetuj(&mut magazyn, &sesja, "administrator-kacper-madej")["blad"].is_string());
}
#[test]
fn kod_ma_256_bitow_i_baza_zawiera_wylacznie_skrot() {
    let (magazyn, _, kod) = przygotuj();
    assert_eq!(kod.len(), 64);
    assert!(kod.bytes().all(|bajt| bajt.is_ascii_hexdigit()));
    let (zapis, zainicjowano, wygasa): (String, i64, i64) = magazyn
        .baza
        .query_row(
            "SELECT skrot,zainicjowano,wygasa FROM resety",
            [],
            |wiersz| Ok((wiersz.get(0)?, wiersz.get(1)?, wiersz.get(2)?)),
        )
        .unwrap();
    assert_eq!(zapis, skrot(&kod));
    assert_ne!(zapis, kod);
    assert_eq!(wygasa - zainicjowano, 86400);
}
#[test]
fn wygasly_kod_nie_uwierzytelnia_i_ma_jeden_wpis_wygasniecia() {
    let (mut magazyn, _, kod) = przygotuj();
    magazyn
        .baza
        .execute("UPDATE resety SET wygasa=?1", [teraz() - 1])
        .unwrap();
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_err());
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_err());
    let liczba: i64 = magazyn
        .baza
        .query_row(
            "SELECT count(*) FROM audyt WHERE operacja='WYGASNIECIE_KODU'",
            [],
            |wiersz| wiersz.get(0),
        )
        .unwrap();
    assert_eq!(liczba, 1);
}
#[test]
fn jednorazowosc_po_ustawieniu_hasla() {
    let (mut magazyn, _, kod) = przygotuj();
    let zgoda = sprawdz(&mut magazyn, "pracownik", &kod).unwrap().dane;
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).is_ok());
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).is_err());
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_err());
}
#[test]
fn regeneracja_uniewaznia_kod_i_wczesniejsza_zgode() {
    let (mut magazyn, sesja, kod) = przygotuj();
    let zgoda = sprawdz(&mut magazyn, "pracownik", &kod).unwrap().dane;
    let nowy = resetuj(&mut magazyn, &sesja, "pracownik");
    assert_ne!(kod, tekst(&nowy, "kod"));
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_err());
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).is_err());
    assert!(sprawdz(&mut magazyn, "pracownik", tekst(&nowy, "kod")).is_ok());
}
#[test]
fn bledny_kod_i_nieznany_login_maja_neutralny_komunikat() {
    let (mut magazyn, _, _) = przygotuj();
    assert_eq!(
        sprawdz(&mut magazyn, "pracownik", "bledny").err(),
        sprawdz(&mut magazyn, "nieistniejacy", "bledny").err()
    );
}
#[test]
fn piec_blednych_prob_blokuje_rowniez_poprawny_kod_i_zgode() {
    let (mut magazyn, _, kod) = przygotuj();
    let zgoda = sprawdz(&mut magazyn, "pracownik", &kod).unwrap().dane;
    for _ in 0..5 {
        assert!(sprawdz(&mut magazyn, "pracownik", "bledny").is_err());
    }
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_err());
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).is_err());
}
#[test]
fn nowe_haslo_argon2id_i_sesja_dopiero_po_zakonczeniu() {
    let (mut magazyn, _, kod) = przygotuj();
    let weryfikacja = sprawdz(&mut magazyn, "pracownik", &kod).unwrap();
    assert!(weryfikacja.nowa_sesja.is_none());
    let wynik = zakoncz(&mut magazyn, tekst(&weryfikacja.dane, "zgoda"), NOWE, NOWE).unwrap();
    assert!(wynik.nowa_sesja.is_some());
    let zapis: String = magazyn
        .baza
        .query_row(
            "SELECT haslo FROM konta WHERE id='pracownik'",
            [],
            |wiersz| wiersz.get(0),
        )
        .unwrap();
    assert!(zapis.starts_with("$argon2id$"));
    assert!(!zapis.contains(NOWE));
    assert_eq!(wynik.dane["stanResetowaniaHasla"], "NORMALNY");
    assert_eq!(wynik.dane["wymagaZmianyHasla"], false);
}
#[test]
fn niezgodne_i_zbyt_krotkie_hasla_nie_zuzywaja_zgody() {
    let (mut magazyn, _, kod) = przygotuj();
    let zgoda = sprawdz(&mut magazyn, "pracownik", &kod).unwrap().dane;
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, "inne").is_err());
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), "krotkie", "krotkie").is_err());
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).is_ok());
}
#[test]
fn sesje_sa_uniewazniane_natychmiast_i_po_zmianie_hasla() {
    let mut magazyn = baza();
    let sesja_pracownika = zaloguj(&mut magazyn, "pracownik", HASLO);
    let sesja_admina = zaloguj(&mut magazyn, "admin", HASLO);
    let reset = resetuj(&mut magazyn, &sesja_admina, "pracownik");
    assert!(magazyn
        .wykonaj(Some(&sesja_pracownika), "sesja", &Value::Null)
        .is_err());
    let zgoda = sprawdz(&mut magazyn, "pracownik", tekst(&reset, "kod"))
        .unwrap()
        .dane;
    let nowa = zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).unwrap();
    assert!(magazyn
        .wykonaj(Some(&sesja_pracownika), "sesja", &Value::Null)
        .is_err());
    assert!(magazyn
        .wykonaj(nowa.nowa_sesja.as_deref(), "sesja", &Value::Null)
        .is_ok());
}
#[test]
fn logowanie_nowym_haslem_i_blokada_starego_od_inicjacji_resetowania() {
    let (mut magazyn, _, kod) = przygotuj();
    assert!(magazyn
        .wykonaj(
            None,
            "logowanie",
            &json!({"login":"pracownik","haslo":HASLO})
        )
        .is_err());
    let zgoda = sprawdz(&mut magazyn, "pracownik", &kod).unwrap().dane;
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), HASLO, HASLO).is_err());
    zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).unwrap();
    assert!(magazyn
        .wykonaj(
            None,
            "logowanie",
            &json!({"login":"pracownik","haslo":HASLO})
        )
        .is_err());
    assert!(!zaloguj(&mut magazyn, "pracownik", NOWE).is_empty());
}
#[test]
fn zbiorczy_reset_sprawdza_kazde_konto_i_nie_wspoldzieli_kodow() {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "admin", HASLO);
    let wynik = magazyn.wykonaj(Some(&sesja),"resetuj",&json!({"identyfikatory":["admin","pracownik","gosc","administrator-kacper-madej","gosc"]})).unwrap().dane;
    assert_eq!(wynik.as_array().unwrap().len(), 4);
    assert!(wynik[0]["blad"].is_string());
    assert!(wynik[3]["blad"].is_string());
    assert_ne!(wynik[1]["kod"], wynik[2]["kod"]);
    assert!(sprawdz(&mut magazyn, "gosc", tekst(&wynik[1], "kod")).is_err());
}
#[test]
fn izolacja_profilow_i_danych_uwierzytelniania() {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "gosc", HASLO);
    let dane = magazyn
        .wykonaj(Some(&sesja), "katalog", &Value::Null)
        .unwrap()
        .dane;
    assert_eq!(dane.as_array().unwrap().len(), 1);
    assert_eq!(dane[0]["id"], "gosc");
    assert!(!dane.to_string().contains("$argon2"));
    assert!(magazyn
        .wykonaj(Some(&sesja), "historia", &Value::Null)
        .is_err());
}
#[test]
fn rownoczesne_zuzycie_zgody_ma_dokladnie_jeden_sukces() {
    let katalog = tempfile::tempdir().unwrap();
    let sciezka = katalog.path().join("konta.sqlite3");
    let mut magazyn = MagazynKont::otworz(&sciezka).unwrap();
    magazyn.importuj_kartoteke(&konta()).unwrap();
    let kod = magazyn
        .odzyskaj_architekta("administrator-kacper-madej")
        .unwrap();
    let zgoda = sprawdz(&mut magazyn, "architekt", &kod).unwrap().dane;
    let bariera = Arc::new(Barrier::new(2));
    let watki: Vec<_> = (0..2)
        .map(|_| {
            let sciezka = sciezka.clone();
            let bariera = bariera.clone();
            let zgoda = tekst(&zgoda, "zgoda").to_string();
            std::thread::spawn(move || {
                let mut magazyn = MagazynKont::otworz(&sciezka).unwrap();
                bariera.wait();
                zakoncz(&mut magazyn, &zgoda, NOWE, NOWE).is_ok()
            })
        })
        .collect();
    assert_eq!(
        watki
            .into_iter()
            .filter_map(|watek| watek.join().ok())
            .filter(|sukces| *sukces)
            .count(),
        1
    );
}
#[test]
fn audyt_i_katalog_nie_zawieraja_sekretow() {
    let (mut magazyn, sesja, kod) = przygotuj();
    let zgoda = sprawdz(&mut magazyn, "pracownik", &kod).unwrap().dane;
    zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).unwrap();
    let historia = magazyn
        .wykonaj(Some(&sesja), "historia", &Value::Null)
        .unwrap()
        .dane
        .to_string();
    for sekret in [&kod, &sesja, tekst(&zgoda, "zgoda"), HASLO, NOWE] {
        assert!(!historia.contains(sekret));
    }
    assert!(historia.contains("ZAKONCZENIE_ZMIANY_HASLA"));
    assert!(historia.contains("wykonujacyId"));
}
#[test]
fn anulowanie_nie_przywraca_starego_hasla_i_pozwala_wydac_nowy_kod() {
    let (mut magazyn, sesja, kod) = przygotuj();
    magazyn
        .wykonaj(
            Some(&sesja),
            "anuluj-reset",
            &json!({"identyfikatory":["pracownik"]}),
        )
        .unwrap();
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_err());
    assert!(magazyn
        .wykonaj(
            None,
            "logowanie",
            &json!({"login":"pracownik","haslo":HASLO})
        )
        .is_err());
    assert!(resetuj(&mut magazyn, &sesja, "pracownik")["kod"].is_string());
}
#[test]
fn zgoda_wygasa_i_sam_login_nie_wystarcza() {
    let (mut magazyn, _, kod) = przygotuj();
    let zgoda = sprawdz(&mut magazyn, "pracownik", &kod).unwrap().dane;
    magazyn
        .baza
        .execute("UPDATE zgody_resetowania SET wygasa=?1", [teraz() - 1])
        .unwrap();
    assert!(zakoncz(&mut magazyn, tekst(&zgoda, "zgoda"), NOWE, NOWE).is_err());
    assert!(zakoncz(&mut magazyn, "pracownik", NOWE, NOWE).is_err());
}
#[test]
fn import_jest_atomowy_zachowuje_id_i_nie_nadpisuje_istniejacej_bazy() {
    let mut magazyn = MagazynKont::otworz(Path::new(":memory:")).unwrap();
    let mut dane = konta();
    dane["uzytkownicy"][2]["login"] = json!("admin");
    assert!(magazyn.importuj_kartoteke(&dane).is_err());
    assert_eq!(
        magazyn
            .baza
            .query_row("SELECT count(*) FROM konta", [], |wiersz| wiersz
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
    magazyn.importuj_kartoteke(&konta()).unwrap();
    assert!(magazyn.importuj_kartoteke(&konta()).is_err());
    assert!(profil(&magazyn.baza, "pracownik").unwrap().is_some());
}
#[test]
fn zablokowane_konto_nie_zuzywa_kodu_i_rola_pochodzi_z_bazy() {
    let (mut magazyn, sesja, kod) = przygotuj();
    let mut konto = profil(&magazyn.baza, "pracownik").unwrap().unwrap();
    konto["status"] = json!("ZABLOKOWANY");
    magazyn
        .baza
        .execute(
            "UPDATE konta SET profil=?1 WHERE id='pracownik'",
            [konto.to_string()],
        )
        .unwrap();
    assert!(sprawdz(&mut magazyn, "pracownik", &kod).is_err());
    let mut admin = profil(&magazyn.baza, "admin").unwrap().unwrap();
    admin["rola"] = json!("PRACOWNIK");
    magazyn
        .baza
        .execute(
            "UPDATE konta SET profil=?1 WHERE id='admin'",
            [admin.to_string()],
        )
        .unwrap();
    assert!(resetuj(&mut magazyn, &sesja, "gosc")["blad"].is_string());
}
#[test]
fn awaria_zapisu_wycofuje_calosc_resetowania() {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "admin", HASLO);
    magazyn.baza.execute_batch("CREATE TRIGGER awaria BEFORE INSERT ON audyt BEGIN SELECT RAISE(FAIL,'symulacja'); END;").unwrap();
    assert!(magazyn
        .wykonaj(
            Some(&sesja),
            "resetuj",
            &json!({"identyfikatory":["pracownik"]})
        )
        .is_err());
    assert_eq!(
        magazyn
            .baza
            .query_row(
                "SELECT wymagany_reset FROM konta WHERE id='pracownik'",
                [],
                |wiersz| wiersz.get::<_, bool>(0)
            )
            .unwrap(),
        false
    );
    assert_eq!(
        magazyn
            .baza
            .query_row("SELECT count(*) FROM resety", [], |wiersz| wiersz
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
}
#[test]
fn pierwsza_konfiguracja_tworzy_konto_bez_stalego_hasla_i_nie_moze_byc_powtorzona() {
    let mut magazyn = MagazynKont::otworz(Path::new(":memory:")).unwrap();
    let dane = json!({"login":"wlasciciel","imie":"Osoba","nazwisko":"Lokalna","haslo":NOWE,"powtorzoneHaslo":NOWE});
    assert_eq!(
        magazyn
            .wykonaj(None, "stan-konfiguracji", &Value::Null)
            .unwrap()
            .dane["wymagaKonfiguracji"],
        true
    );
    let wynik = magazyn
        .wykonaj(None, "pierwsza-konfiguracja", &dane)
        .unwrap();
    assert_eq!(wynik.dane["rola"], "ARCHITEKT");
    assert_eq!(wynik.dane["login"], "wlasciciel");
    assert!(magazyn
        .wykonaj(None, "pierwsza-konfiguracja", &dane)
        .is_err());
    assert_eq!(
        magazyn
            .wykonaj(None, "stan-konfiguracji", &Value::Null)
            .unwrap()
            .dane["wymagaKonfiguracji"],
        false
    );
    assert!(magazyn
        .wykonaj(wynik.nowa_sesja.as_deref(), "sesja", &Value::Null)
        .is_ok());
}
#[test]
fn zmiana_hasla_wymaga_dotychczasowego_i_uniewaznia_inne_sesje() {
    let mut magazyn = baza();
    let sesja = zaloguj(&mut magazyn, "pracownik", HASLO);
    let druga = zaloguj(&mut magazyn, "pracownik", HASLO);
    assert!(magazyn
        .wykonaj(
            Some(&sesja),
            "zmien-haslo",
            &json!({"dotychczasoweHaslo":"zle","haslo":NOWE,"powtorzoneHaslo":NOWE})
        )
        .is_err());
    let wynik = magazyn
        .wykonaj(
            Some(&sesja),
            "zmien-haslo",
            &json!({"dotychczasoweHaslo":HASLO,"haslo":NOWE,"powtorzoneHaslo":NOWE,"id":"admin"}),
        )
        .unwrap();
    assert_eq!(wynik.dane["id"], "pracownik");
    assert!(magazyn
        .wykonaj(Some(&druga), "sesja", &Value::Null)
        .is_err());
    assert!(magazyn
        .wykonaj(wynik.nowa_sesja.as_deref(), "sesja", &Value::Null)
        .is_ok());
    assert!(!zaloguj(&mut magazyn, "pracownik", NOWE).is_empty());
    assert!(!zaloguj(&mut magazyn, "admin", HASLO).is_empty());
}
#[test]
fn ponowne_otwarcie_bazy_zachowuje_konto_i_sesje_a_wylogowanie_nie_usuwa_konta() {
    let katalog = tempfile::tempdir().unwrap();
    let sciezka = katalog.path().join("konta.sqlite3");
    let mut magazyn = MagazynKont::otworz(&sciezka).unwrap();
    let wynik=magazyn.wykonaj(None,"pierwsza-konfiguracja",&json!({"login":"wlasciciel","imie":"Osoba","nazwisko":"Trwała","haslo":NOWE,"powtorzoneHaslo":NOWE})).unwrap();
    drop(magazyn);
    let mut magazyn = MagazynKont::otworz(&sciezka).unwrap();
    assert!(magazyn
        .wykonaj(wynik.nowa_sesja.as_deref(), "sesja", &Value::Null)
        .is_ok());
    magazyn
        .wykonaj(wynik.nowa_sesja.as_deref(), "wyloguj", &Value::Null)
        .unwrap();
    assert!(magazyn
        .wykonaj(wynik.nowa_sesja.as_deref(), "sesja", &Value::Null)
        .is_err());
    assert!(!zaloguj(&mut magazyn, "wlasciciel", NOWE).is_empty());
}
#[test]
fn pierwsza_konfiguracja_z_migracja_zachowuje_id_role_i_historie() {
    let mut magazyn = MagazynKont::otworz(Path::new(":memory:")).unwrap();
    let mut kopia = konta();
    kopia["historia"] = json!([{"czas":"2026-10-20T10:00:00Z","wykonujacyId":"admin","uzytkownikId":"pracownik","operacja":"EDYCJA_PROFILU","pola":["nazwisko"],"wynik":"SUKCES"}]);
    let wynik=magazyn.wykonaj(None,"pierwsza-konfiguracja",&json!({"login":"architekt","imie":"Osoba","nazwisko":"Lokalna","haslo":NOWE,"powtorzoneHaslo":NOWE,"kartoteka":kopia})).unwrap();
    let katalog = magazyn
        .wykonaj(wynik.nowa_sesja.as_deref(), "katalog", &Value::Null)
        .unwrap()
        .dane;
    assert_eq!(katalog.as_array().unwrap().len(), 4);
    assert_eq!(
        katalog
            .as_array()
            .unwrap()
            .iter()
            .find(|konto| konto["id"] == "admin")
            .unwrap()["rola"],
        "ADMINISTRATOR"
    );
    let historia = magazyn
        .wykonaj(wynik.nowa_sesja.as_deref(), "historia", &Value::Null)
        .unwrap()
        .dane;
    assert_eq!(historia[0]["operacja"], "EDYCJA_PROFILU");
}
#[test]
fn nieprawidlowa_migracja_pierwszej_konfiguracji_wycofuje_wszystkie_konta() {
    let mut magazyn = MagazynKont::otworz(Path::new(":memory:")).unwrap();
    assert!(magazyn.wykonaj(None,"pierwsza-konfiguracja",&json!({"login":"obcy","imie":"Osoba","nazwisko":"Lokalna","haslo":NOWE,"powtorzoneHaslo":NOWE,"kartoteka":konta()})).is_err());
    assert_eq!(
        magazyn
            .wykonaj(None, "stan-konfiguracji", &Value::Null)
            .unwrap()
            .dane["wymagaKonfiguracji"],
        true
    );
}
