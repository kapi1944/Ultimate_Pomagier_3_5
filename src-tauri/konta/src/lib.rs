use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::{rngs::OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use subtle::ConstantTimeEq;

pub const UPRAWNIENIE_RESETU: &str = "users.password.reset";
const BLAD_KODU: &str =
    "Kod jest nieprawidłowy, wygasł lub został unieważniony. Poproś uprawnioną osobę o nowy kod.";
const BLAD_LOGOWANIA: &str = "Nie udało się zalogować. Sprawdź dane lub dokończ reset hasła.";
const BLAD_BAZY: &str = "Nie udało się wykonać operacji w bazie kont. Spróbuj ponownie.";
const POLA_PROFILU: &[&str] = &[
    "id",
    "zwrot",
    "tytulNaukowy",
    "imie",
    "nazwisko",
    "pseudonim",
    "email",
    "emaile",
    "telefony",
    "login",
    "rola",
    "organizacja",
    "odznaki",
    "status",
    "kolorProfilu",
    "aliasyHistoryczne",
    "przypisanyKlientId",
    "przypisanyTrenerId",
    "wersjaUprawnien",
    "ostatnieLogowanie",
    "utworzono",
    "zaktualizowano",
];

pub struct MagazynKont {
    baza: Connection,
}
pub struct WynikOperacji {
    pub dane: Value,
    pub nowa_sesja: Option<String>,
    pub wyloguj: bool,
}
impl WynikOperacji {
    fn dane(dane: Value) -> Self {
        Self {
            dane,
            nowa_sesja: None,
            wyloguj: false,
        }
    }
}
fn blad_bazy(_: rusqlite::Error) -> String {
    BLAD_BAZY.into()
}
fn teraz() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
fn data(czas: i64) -> String {
    chrono::DateTime::from_timestamp(czas, 0)
        .unwrap_or_default()
        .to_rfc3339()
}
fn sekret() -> String {
    let mut bajty = [0u8; 32];
    OsRng.fill_bytes(&mut bajty);
    bajty.iter().map(|bajt| format!("{bajt:02x}")).collect()
}
fn skrot(wartosc: &str) -> String {
    format!("{:x}", Sha256::digest(wartosc.as_bytes()))
}
fn tekst<'a>(dane: &'a Value, pole: &str) -> &'a str {
    dane[pole].as_str().unwrap_or("")
}
fn poziom(rola: &str) -> u8 {
    match rola {
        "ARCHITEKT" => 8,
        "ADMINISTRATOR" => 7,
        "MODERATOR" => 6,
        "OPIEKUN" => 5,
        "PRACOWNIK" => 4,
        "TRENER" => 3,
        "KOORDYNATOR_KLIENTA" => 2,
        "GOSC" => 1,
        _ => 0,
    }
}
pub fn klucz_profilu(id: &str) -> String {
    skrot(id)
}
fn zabezpiecz_haslo(haslo: &str, powtorzone: &str) -> Result<String, String> {
    if haslo != powtorzone {
        return Err("Podane hasła są różne.".into());
    }
    if haslo.chars().count() < 8 || haslo.len() > 1024 || haslo.chars().any(|znak| znak.is_whitespace() || znak == '\u{feff}') {
        return Err("Minimum 8 znaków, bez spacji. Polskie znaki są dozwolone. Maksymalnie 1024 bajty.".into());
    }
    Argon2::default()
        .hash_password(haslo.as_bytes(), &SaltString::generate(&mut OsRng))
        .map(|hasz| hasz.to_string())
        .map_err(|_| "Nie udało się zabezpieczyć hasła.".into())
}
pub fn czy_moze_resetowac(wykonujacy: &Value, konto: &Value) -> bool {
    tekst(wykonujacy, "status") == "AKTYWNY"
        && wykonujacy["id"] != konto["id"]
        && poziom(tekst(wykonujacy, "rola")) >= 7
        && poziom(tekst(konto, "rola")) > 0
        && poziom(tekst(wykonujacy, "rola")) > poziom(tekst(konto, "rola"))
}
pub fn domyslna_sciezka() -> Result<PathBuf, String> {
    let katalog = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|dom| PathBuf::from(dom).join(".local/share")))
        .ok_or("Nie znaleziono prywatnego katalogu danych systemowych.")?
        .join("pl.ultimatepomagier.desktop")
        .join("konta");
    std::fs::create_dir_all(&katalog).map_err(|_| "Nie udało się utworzyć katalogu kont.")?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&katalog, std::fs::Permissions::from_mode(0o700))
            .map_err(|_| "Nie udało się zabezpieczyć katalogu kont.")?;
    }
    Ok(katalog.join("konta.sqlite3"))
}
impl MagazynKont {
    pub fn otworz(sciezka: &Path) -> Result<Self, String> {
        let baza = Connection::open(sciezka).map_err(blad_bazy)?;
        let wersja: i64 = baza
            .query_row("PRAGMA user_version", [], |wiersz| wiersz.get(0))
            .map_err(blad_bazy)?;
        if wersja > 1 {
            return Err(
                "Baza kont pochodzi z nowszej wersji aplikacji. Zachowano dane bez zmian.".into(),
            );
        }
        baza.busy_timeout(Duration::from_secs(10))
            .map_err(blad_bazy)?;
        baza.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS konta (id TEXT PRIMARY KEY, login TEXT UNIQUE NOT NULL, profil TEXT NOT NULL,
                haslo TEXT, wymagany_reset INTEGER NOT NULL DEFAULT 1, wersja_sesji INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS klucze_logowania (klucz TEXT PRIMARY KEY, konto_id TEXT NOT NULL REFERENCES konta(id));
            CREATE TABLE IF NOT EXISTS resety (konto_id TEXT PRIMARY KEY REFERENCES konta(id), skrot TEXT,
                zainicjowano INTEGER NOT NULL, wygasa INTEGER NOT NULL, proby INTEGER NOT NULL DEFAULT 0, wykonujacy TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sesje (skrot TEXT PRIMARY KEY, konto_id TEXT NOT NULL REFERENCES konta(id), wersja INTEGER NOT NULL, wygasa INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS zgody_resetowania (skrot TEXT PRIMARY KEY, konto_id TEXT NOT NULL REFERENCES konta(id), skrot_kodu TEXT NOT NULL, wygasa INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS audyt (id INTEGER PRIMARY KEY, czas INTEGER NOT NULL, wykonujacy TEXT NOT NULL, konto_id TEXT NOT NULL, operacja TEXT NOT NULL, wynik TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS audyt_legacy (id INTEGER PRIMARY KEY, wpis TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS ograniczenia (klucz TEXT PRIMARY KEY, poczatek INTEGER NOT NULL, proby INTEGER NOT NULL);
            PRAGMA user_version=1;").map_err(blad_bazy)?;
        Ok(Self { baza })
    }
    // Jawny import operatora lub pierwszej konfiguracji. Nigdy nie nadpisuje istniejących kont.
    pub fn importuj_kartoteke(&mut self, dane: &Value) -> Result<(), String> {
        let transakcja = self
            .baza
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(blad_bazy)?;
        importuj_do_pustej_bazy(&transakcja, dane)?;
        transakcja.commit().map_err(blad_bazy)
    }
    pub fn odzyskaj_architekta(&mut self, id: &str) -> Result<String, String> {
        let transakcja = self
            .baza
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(blad_bazy)?;
        let profil = profil(&transakcja, id)?.ok_or("Nie znaleziono konta.")?;
        if tekst(&profil, "rola") != "ARCHITEKT" || tekst(&profil, "status") != "AKTYWNY" {
            return Err("Procedura systemowa dotyczy wyłącznie aktywnego Architekta.".into());
        }
        let kod = rozpocznij_reset(&transakcja, id, "operator-systemu", teraz())?;
        audyt(
            &transakcja,
            "operator-systemu",
            id,
            "ODZYSKIWANIE_ARCHITEKTA",
            "SUKCES",
            teraz(),
        )?;
        transakcja.commit().map_err(blad_bazy)?;
        Ok(kod)
    }
    pub fn wykonaj(
        &mut self,
        sesja: Option<&str>,
        operacja: &str,
        dane: &Value,
    ) -> Result<WynikOperacji, String> {
        let czas = teraz();
        let transakcja = self
            .baza
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(blad_bazy)?;
        // Wygaśnięcia zapisujemy raz; status nie zależy od otwarcia profilu w React.
        let wygasle: Vec<(String, String)> = {
            let mut zapytanie = transakcja
                .prepare(
                    "SELECT konto_id,wykonujacy FROM resety WHERE skrot IS NOT NULL AND wygasa<=?1",
                )
                .map_err(blad_bazy)?;
            let wpisy = zapytanie
                .query_map([czas], |wiersz| Ok((wiersz.get(0)?, wiersz.get(1)?)))
                .map_err(blad_bazy)?;
            wpisy.collect::<Result<_, _>>().map_err(blad_bazy)?
        };
        for (id, wykonujacy) in wygasle {
            audyt(
                &transakcja,
                &wykonujacy,
                &id,
                "WYGASNIECIE_KODU",
                "SUKCES",
                czas,
            )?;
        }
        transakcja
            .execute("UPDATE resety SET skrot=NULL WHERE wygasa<=?1", [czas])
            .map_err(blad_bazy)?;
        transakcja
            .execute("DELETE FROM sesje WHERE wygasa<=?1", [czas])
            .map_err(blad_bazy)?;
        transakcja
            .execute("DELETE FROM zgody_resetowania WHERE wygasa<=?1", [czas])
            .map_err(blad_bazy)?;
        transakcja
            .execute("DELETE FROM ograniczenia WHERE poczatek<?1", [czas - 900])
            .map_err(blad_bazy)?;
        let wynik = wykonaj_operacje(&transakcja, sesja, operacja, dane, czas);
        if (operacja == "pierwsza-konfiguracja" && wynik.is_err())
            || wynik
                .as_ref()
                .err()
                .is_some_and(|blad| blad == BLAD_BAZY || blad == "Uszkodzony profil w bazie kont.")
        {
            return wynik;
        }
        // Również odmowa i błędna próba muszą utrwalić licznik oraz audyt.
        transakcja.commit().map_err(blad_bazy)?;
        wynik
    }
}
fn importuj_do_pustej_bazy(baza: &Connection, dane: &Value) -> Result<(), String> {
    let konta = dane
        .as_array()
        .or_else(|| dane["uzytkownicy"].as_array())
        .ok_or("Nieprawidłowa kopia kartoteki.")?;
    if konta.is_empty()
        || konta
            .iter()
            .filter(|konto| tekst(konto, "rola") == "ARCHITEKT")
            .count()
            != 1
    {
        return Err("Kopia musi zawierać dokładnie jednego Architekta.".into());
    }
    if baza
        .query_row("SELECT count(*) FROM konta", [], |wiersz| {
            wiersz.get::<_, i64>(0)
        })
        .map_err(blad_bazy)?
        != 0
    {
        return Err(
            "Import jest możliwy tylko do pustej bazy. Istniejące konta pozostają bez zmian."
                .into(),
        );
    }
    for konto in konta {
        if poziom(tekst(konto, "rola")) == 0
            || tekst(konto, "id").is_empty()
            || tekst(konto, "login").trim().is_empty()
            || !konto["emaile"].is_array()
            || !konto["telefony"].is_array()
            || !konto["odznaki"].is_array()
            || !konto["aliasyHistoryczne"].is_array()
            || ![
                "UTWORZONY",
                "OCZEKUJE_NA_AKTYWACJE",
                "AKTYWNY",
                "ZABLOKOWANY",
                "NIEAKTYWNY",
            ]
            .contains(&tekst(konto, "status"))
            || (tekst(konto, "rola") == "ARCHITEKT"
                && (tekst(konto, "id") != "administrator-kacper-madej"
                    || tekst(konto, "status") != "AKTYWNY"))
        {
            return Err("Nieprawidłowy profil lub chroniona rola w kopii kartoteki.".into());
        }
        let profil: serde_json::Map<String, Value> = POLA_PROFILU
            .iter()
            .filter_map(|pole| {
                konto
                    .get(*pole)
                    .map(|wartosc| (pole.to_string(), wartosc.clone()))
            })
            .collect();
        baza.execute(
            "INSERT INTO konta(id,login,profil) VALUES(?1,?2,?3)",
            params![
                tekst(konto, "id"),
                tekst(konto, "login").trim().to_lowercase(),
                Value::Object(profil).to_string()
            ],
        )
        .map_err(blad_bazy)?;
        let klucze = std::iter::once(tekst(konto, "login").to_string()).chain(
            konto["emaile"]
                .as_array()
                .unwrap()
                .iter()
                .filter_map(|email| email.as_str().map(str::to_string)),
        );
        for klucz in klucze {
            let klucz = klucz.trim().to_lowercase();
            if klucz.is_empty() {
                return Err("Pusty login lub adres e-mail.".into());
            }
            let poprzedni: Option<String> = baza
                .query_row(
                    "SELECT konto_id FROM klucze_logowania WHERE klucz=?1",
                    [&klucz],
                    |wiersz| wiersz.get(0),
                )
                .optional()
                .map_err(blad_bazy)?;
            if poprzedni
                .as_deref()
                .is_some_and(|id| id != tekst(konto, "id"))
            {
                return Err("Kolizja loginów lub adresów e-mail. Import wycofano.".into());
            }
            baza.execute(
                "INSERT OR IGNORE INTO klucze_logowania VALUES(?1,?2)",
                params![klucz, tekst(konto, "id")],
            )
            .map_err(blad_bazy)?;
        }
    }
    if let Some(historia) = dane["historia"].as_array() {
        for wpis in historia {
            let mut zapis = serde_json::Map::new();
            for pole in ["czas", "wykonujacyId", "uzytkownikId", "operacja", "wynik"] {
                let wartosc = wpis[pole]
                    .as_str()
                    .ok_or("Nieprawidłowa historia kont. Import wycofano.")?;
                if wartosc.len() > 200 {
                    return Err("Nieprawidłowa historia kont. Import wycofano.".into());
                }
                zapis.insert(pole.into(), json!(wartosc));
            }
            let pola = wpis["pola"]
                .as_array()
                .ok_or("Nieprawidłowe pola historii kont.")?;
            if pola.iter().any(|pole| {
                !pole.as_str().is_some_and(|pole| {
                    POLA_PROFILU.contains(&pole)
                        || ["statusUwierzytelniania", "wymagaZmianyHasla", "kartoteka"]
                            .contains(&pole)
                })
            }) {
                return Err("Nieznane pola w historii kont. Zachowano oryginał.".into());
            }
            zapis.insert("pola".into(), json!(pola));
            baza.execute(
                "INSERT INTO audyt_legacy(wpis) VALUES(?1)",
                [Value::Object(zapis).to_string()],
            )
            .map_err(blad_bazy)?;
        }
    }
    Ok(())
}
fn audyt(
    baza: &Connection,
    wykonujacy: &str,
    id: &str,
    operacja: &str,
    wynik: &str,
    czas: i64,
) -> Result<(), String> {
    baza.execute(
        "INSERT INTO audyt(czas,wykonujacy,konto_id,operacja,wynik) VALUES(?1,?2,?3,?4,?5)",
        params![czas, wykonujacy, id, operacja, wynik],
    )
    .map_err(blad_bazy)?;
    Ok(())
}
fn profil(baza: &Connection, id: &str) -> Result<Option<Value>, String> {
    let zapis: Option<String> = baza
        .query_row("SELECT profil FROM konta WHERE id=?1", [id], |wiersz| {
            wiersz.get(0)
        })
        .optional()
        .map_err(blad_bazy)?;
    zapis
        .map(|zapis| {
            serde_json::from_str(&zapis).map_err(|_| "Uszkodzony profil w bazie kont.".into())
        })
        .transpose()
}
fn publiczny_profil(baza: &Connection, id: &str, czas: i64) -> Result<Value, String> {
    let mut konto = profil(baza, id)?.ok_or("Nie znaleziono konta.")?;
    let (wymagany, haslo): (bool, bool) = baza
        .query_row(
            "SELECT wymagany_reset,haslo IS NOT NULL FROM konta WHERE id=?1",
            [id],
            |wiersz| Ok((wiersz.get(0)?, wiersz.get(1)?)),
        )
        .map_err(blad_bazy)?;
    let reset: Option<(i64, i64, bool)> = baza
        .query_row(
            "SELECT zainicjowano,wygasa,skrot IS NOT NULL FROM resety WHERE konto_id=?1",
            [id],
            |wiersz| Ok((wiersz.get(0)?, wiersz.get(1)?, wiersz.get(2)?)),
        )
        .optional()
        .map_err(blad_bazy)?;
    konto["wymagaZmianyHasla"] = json!(wymagany);
    konto["statusUwierzytelniania"] = json!(if haslo {
        "SKONFIGUROWANE"
    } else {
        "NIESKONFIGUROWANE"
    });
    konto["stanResetowaniaHasla"] = json!(match reset {
        Some((_, wygasa, true)) if wygasa > czas => "RESET_OCZEKUJACY",
        Some(_) => "RESET_WYGASLY",
        None if wymagany => "RESET_WYMAGANY",
        _ => "NORMALNY",
    });
    if let Some((utworzono, wygasa, _)) = reset {
        konto["resetZainicjowano"] = json!(data(utworzono));
        konto["resetWygasa"] = json!(data(wygasa));
    }
    Ok(konto)
}
fn tozsamosc(baza: &Connection, sesja: Option<&str>, czas: i64) -> Result<Value, String> {
    let id: Option<String> = baza.query_row("SELECT k.id FROM sesje s JOIN konta k ON k.id=s.konto_id WHERE s.skrot=?1 AND s.wygasa>?2 AND s.wersja=k.wersja_sesji AND k.wymagany_reset=0", params![skrot(sesja.unwrap_or("")),czas], |wiersz| wiersz.get(0)).optional().map_err(blad_bazy)?;
    let konto = publiczny_profil(
        baza,
        &id.ok_or("Sesja wygasła. Zaloguj się ponownie.")?,
        czas,
    )?;
    if tekst(&konto, "status") != "AKTYWNY" {
        return Err("Konto jest nieaktywne.".into());
    }
    Ok(konto)
}
fn ogranicz(baza: &Connection, klucz: &str, limit: i64, czas: i64) -> Result<bool, String> {
    baza.execute("INSERT INTO ograniczenia VALUES(?1,?2,1) ON CONFLICT(klucz) DO UPDATE SET proby=CASE WHEN poczatek<=?2-900 THEN 1 ELSE proby+1 END,poczatek=CASE WHEN poczatek<=?2-900 THEN ?2 ELSE poczatek END", params![klucz,czas]).map_err(blad_bazy)?;
    Ok(baza
        .query_row(
            "SELECT proby FROM ograniczenia WHERE klucz=?1",
            [klucz],
            |wiersz| wiersz.get::<_, i64>(0),
        )
        .map_err(blad_bazy)?
        <= limit)
}
fn rozpocznij_reset(
    baza: &Connection,
    id: &str,
    wykonujacy: &str,
    czas: i64,
) -> Result<String, String> {
    let kod = sekret();
    baza.execute(
        "UPDATE konta SET wymagany_reset=1,wersja_sesji=wersja_sesji+1 WHERE id=?1",
        [id],
    )
    .map_err(blad_bazy)?;
    baza.execute("DELETE FROM sesje WHERE konto_id=?1", [id])
        .map_err(blad_bazy)?;
    baza.execute("DELETE FROM zgody_resetowania WHERE konto_id=?1", [id])
        .map_err(blad_bazy)?;
    baza.execute("INSERT INTO resety VALUES(?1,?2,?3,?4,0,?5) ON CONFLICT(konto_id) DO UPDATE SET skrot=excluded.skrot,zainicjowano=excluded.zainicjowano,wygasa=excluded.wygasa,proby=0,wykonujacy=excluded.wykonujacy", params![id,skrot(&kod),czas,czas+86400,wykonujacy]).map_err(blad_bazy)?;
    Ok(kod)
}
fn wydaj_sesje(baza: &Connection, id: &str, czas: i64) -> Result<String, String> {
    let mut konto = profil(baza, id)?.ok_or("Nie znaleziono konta.")?;
    konto["ostatnieLogowanie"] = json!(data(czas));
    baza.execute(
        "UPDATE konta SET profil=?1 WHERE id=?2",
        params![konto.to_string(), id],
    )
    .map_err(blad_bazy)?;
    let token = sekret();
    baza.execute("INSERT INTO sesje SELECT ?1,id,wersja_sesji,?2 FROM konta WHERE id=?3 AND wymagany_reset=0", params![skrot(&token),czas+28800,id]).map_err(blad_bazy)?;
    Ok(token)
}
fn wykonaj_operacje(
    baza: &Connection,
    sesja: Option<&str>,
    operacja: &str,
    dane: &Value,
    czas: i64,
) -> Result<WynikOperacji, String> {
    if dane.to_string().len()
        > if operacja == "pierwsza-konfiguracja" {
            5 * 1024 * 1024
        } else {
            32768
        }
    {
        return Err("Za duże żądanie.".into());
    }
    match operacja {
        "stan-konfiguracji" => Ok(WynikOperacji::dane(
            json!({"wymagaKonfiguracji": baza.query_row("SELECT count(*)=0 FROM konta",[],|wiersz| wiersz.get::<_,bool>(0)).map_err(blad_bazy)?}),
        )),
        "pierwsza-konfiguracja" => {
            if baza
                .query_row("SELECT count(*) FROM konta", [], |wiersz| {
                    wiersz.get::<_, i64>(0)
                })
                .map_err(blad_bazy)?
                != 0
            {
                return Err("Pierwsza konfiguracja została już zakończona. Zaloguj się na istniejące konto.".into());
            }
            let login = tekst(dane, "login").trim().to_lowercase();
            let imie = tekst(dane, "imie").trim();
            let nazwisko = tekst(dane, "nazwisko").trim();
            if login.is_empty()
                || login.len() > 100
                || imie.is_empty()
                || nazwisko.is_empty()
                || imie.len() > 100
                || nazwisko.len() > 100
                || login.chars().any(char::is_whitespace)
            {
                return Err("Podaj imię, nazwisko i login bez spacji (do 100 znaków).".into());
            }
            let hasz = zabezpiecz_haslo(tekst(dane, "haslo"), tekst(dane, "powtorzoneHaslo"))?;
            let id = "administrator-kacper-madej";
            if !dane["kartoteka"].is_null() {
                importuj_do_pustej_bazy(baza, &dane["kartoteka"])?;
                let wlasciciel =
                    profil(baza, id)?.ok_or("Kopia nie zawiera chronionego konta Architekta.")?;
                if tekst(&wlasciciel, "login").trim().to_lowercase() != login {
                    return Err("Podaj istniejący login Architekta. Import nie zmienia tożsamości historycznych kont.".into());
                }
                baza.execute(
                    "UPDATE konta SET haslo=?1,wymagany_reset=0 WHERE id=?2",
                    params![hasz, id],
                )
                .map_err(blad_bazy)?;
                audyt(
                    baza,
                    id,
                    id,
                    "PIERWSZA_KONFIGURACJA_Z_MIGRACJA",
                    "SUKCES",
                    czas,
                )?;
                let token = wydaj_sesje(baza, id, czas)?;
                return Ok(WynikOperacji {
                    dane: publiczny_profil(baza, id, czas)?,
                    nowa_sesja: Some(token),
                    wyloguj: false,
                });
            }
            let konto = json!({"id":id,"imie":imie,"nazwisko":nazwisko,"pseudonim":imie,"login":login,"rola":"ARCHITEKT","organizacja":"SEMPER","status":"AKTYWNY","zwrot":"","tytulNaukowy":"","email":"","emaile":[],"telefony":[],"odznaki":[],"aliasyHistoryczne":[],"kolorProfilu":"#334155","wersjaUprawnien":1,"ostatnieLogowanie":null,"utworzono":data(czas),"zaktualizowano":data(czas)});
            baza.execute(
                "INSERT INTO konta(id,login,profil,haslo,wymagany_reset) VALUES(?1,?2,?3,?4,0)",
                params![id, login, konto.to_string(), hasz],
            )
            .map_err(blad_bazy)?;
            baza.execute(
                "INSERT INTO klucze_logowania VALUES(?1,?2)",
                params![login, id],
            )
            .map_err(blad_bazy)?;
            audyt(baza, id, id, "PIERWSZA_KONFIGURACJA", "SUKCES", czas)?;
            let token = wydaj_sesje(baza, id, czas)?;
            Ok(WynikOperacji {
                dane: publiczny_profil(baza, id, czas)?,
                nowa_sesja: Some(token),
                wyloguj: false,
            })
        }
        "zmien-haslo" => {
            let konto = tozsamosc(baza, sesja, czas)?;
            let id = tekst(&konto, "id");
            if !ogranicz(baza, &format!("zmiana:{}", skrot(id)), 5, czas)? {
                return Err("Zbyt wiele prób. Spróbuj za 15 minut.".into());
            }
            let stare: String = baza
                .query_row("SELECT haslo FROM konta WHERE id=?1", [id], |wiersz| {
                    wiersz.get(0)
                })
                .map_err(blad_bazy)?;
            if !PasswordHash::new(&stare).ok().is_some_and(|hasz| {
                Argon2::default()
                    .verify_password(tekst(dane, "dotychczasoweHaslo").as_bytes(), &hasz)
                    .is_ok()
            }) {
                return Err("Dotychczasowe hasło jest nieprawidłowe.".into());
            }
            if tekst(dane, "haslo") == tekst(dane, "dotychczasoweHaslo") {
                return Err("Wybierz inne hasło niż dotychczasowe.".into());
            }
            let hasz = zabezpiecz_haslo(tekst(dane, "haslo"), tekst(dane, "powtorzoneHaslo"))?;
            baza.execute(
                "UPDATE konta SET haslo=?1,wersja_sesji=wersja_sesji+1 WHERE id=?2",
                params![hasz, id],
            )
            .map_err(blad_bazy)?;
            baza.execute("DELETE FROM sesje WHERE konto_id=?1", [id])
                .map_err(blad_bazy)?;
            audyt(baza, id, id, "ZMIANA_WLASNEGO_HASLA", "SUKCES", czas)?;
            let token = wydaj_sesje(baza, id, czas)?;
            Ok(WynikOperacji {
                dane: publiczny_profil(baza, id, czas)?,
                nowa_sesja: Some(token),
                wyloguj: false,
            })
        }
        "logowanie" => {
            if !ogranicz(baza, "logowanie-globalne", 100, czas)? {
                return Err("Zbyt wiele prób. Spróbuj za 15 minut.".into());
            }
            let login = tekst(dane, "login").trim().to_lowercase();
            if login.len() > 320 || tekst(dane, "haslo").len() > 1024 {
                return Err(BLAD_LOGOWANIA.into());
            }
            if !ogranicz(baza, &format!("login:{}", skrot(&login)), 10, czas)? {
                return Err(BLAD_LOGOWANIA.into());
            }
            let znaleziony: Option<(String,Option<String>,bool)> = baza.query_row("SELECT k.id,k.haslo,k.wymagany_reset FROM konta k JOIN klucze_logowania l ON l.konto_id=k.id WHERE l.klucz=?1", [&login], |wiersz| Ok((wiersz.get(0)?,wiersz.get(1)?,wiersz.get(2)?))).optional().map_err(blad_bazy)?;
            // Koszt Argon2 również dla nieznanej tożsamości i kont bez skonfigurowanego hasła.
            let zastepczy = "$argon2id$v=19$m=19456,t=2,p=1$c29sZGxhdGVzdG93YW5pYQ$hbkJ+Sp7x9rH8oufn9NPbzVnzKZ3W3fHVY3b9+qOWCU";
            let zapis = znaleziony
                .as_ref()
                .and_then(|(_, haslo, _)| haslo.as_deref())
                .unwrap_or(zastepczy);
            let poprawne = PasswordHash::new(zapis).ok().is_some_and(|hasz| {
                Argon2::default()
                    .verify_password(tekst(dane, "haslo").as_bytes(), &hasz)
                    .is_ok()
            });
            let (id, _, wymagany) = znaleziony.ok_or(BLAD_LOGOWANIA)?;
            if !poprawne
                || wymagany
                || tekst(&profil(baza, &id)?.ok_or(BLAD_LOGOWANIA)?, "status") != "AKTYWNY"
            {
                return Err(BLAD_LOGOWANIA.into());
            }
            let token = wydaj_sesje(baza, &id, czas)?;
            Ok(WynikOperacji {
                dane: publiczny_profil(baza, &id, czas)?,
                nowa_sesja: Some(token),
                wyloguj: false,
            })
        }
        "sprawdz-kod" => {
            if !ogranicz(baza, "reset-globalny", 100, czas)? {
                return Err(BLAD_KODU.into());
            }
            let login = tekst(dane, "login").trim().to_lowercase();
            let id: Option<String> = baza
                .query_row(
                    "SELECT konto_id FROM klucze_logowania WHERE klucz=?1",
                    [&login],
                    |wiersz| wiersz.get(0),
                )
                .optional()
                .map_err(blad_bazy)?;
            let Some(id) = id else {
                return Err(BLAD_KODU.into());
            };
            let reset: Option<(Option<String>, i64, i64, String)> = baza
                .query_row(
                    "SELECT skrot,wygasa,proby,wykonujacy FROM resety WHERE konto_id=?1",
                    [&id],
                    |wiersz| {
                        Ok((
                            wiersz.get(0)?,
                            wiersz.get(1)?,
                            wiersz.get(2)?,
                            wiersz.get(3)?,
                        ))
                    },
                )
                .optional()
                .map_err(blad_bazy)?;
            let (oczekiwany, wygasa, proby, wykonujacy) =
                reset.unwrap_or((None, 0, 5, String::new()));
            let kod = tekst(dane, "kod");
            let poprawny = kod.len() == 64
                && oczekiwany.as_deref().is_some_and(|oczekiwany| {
                    bool::from(oczekiwany.as_bytes().ct_eq(skrot(kod).as_bytes()))
                });
            if !poprawny
                || wygasa <= czas
                || proby >= 5
                || tekst(&profil(baza, &id)?.ok_or(BLAD_KODU)?, "status") != "AKTYWNY"
            {
                baza.execute("UPDATE resety SET proby=proby+1,skrot=CASE WHEN proby>=4 THEN NULL ELSE skrot END WHERE konto_id=?1", [&id]).map_err(blad_bazy)?;
                audyt(
                    baza,
                    &wykonujacy,
                    &id,
                    "NIEUDANA_PROBA_KODU",
                    "ODRZUCONO",
                    czas,
                )?;
                return Err(BLAD_KODU.into());
            }
            // Ograniczona zgoda nie jest sesją. Kolejna weryfikacja unieważnia poprzednią zgodę.
            baza.execute("DELETE FROM zgody_resetowania WHERE konto_id=?1", [&id])
                .map_err(blad_bazy)?;
            let zgoda = sekret();
            baza.execute(
                "INSERT INTO zgody_resetowania VALUES(?1,?2,?3,?4)",
                params![skrot(&zgoda), id, oczekiwany, czas + 600],
            )
            .map_err(blad_bazy)?;
            Ok(WynikOperacji::dane(json!({"zgoda":zgoda})))
        }
        "ustaw-haslo" => {
            if !ogranicz(baza, "ustawienie-globalne", 100, czas)? {
                return Err(BLAD_KODU.into());
            }
            let zgoda = tekst(dane, "zgoda");
            let dane_resetowania: Option<(String,String)> = baza.query_row("SELECT z.konto_id,r.wykonujacy FROM zgody_resetowania z JOIN resety r ON r.konto_id=z.konto_id WHERE z.skrot=?1 AND z.wygasa>?2 AND r.skrot=z.skrot_kodu AND r.wygasa>?2 AND r.proby<5", params![skrot(zgoda),czas], |wiersz| Ok((wiersz.get(0)?,wiersz.get(1)?))).optional().map_err(blad_bazy)?;
            let (id, wykonujacy) = dane_resetowania.ok_or(BLAD_KODU)?;
            if tekst(&profil(baza, &id)?.ok_or(BLAD_KODU)?, "status") != "AKTYWNY" {
                return Err(BLAD_KODU.into());
            }
            let haslo = tekst(dane, "haslo");
            if haslo != tekst(dane, "powtorzoneHaslo") {
                return Err("Podane hasła są różne.".into());
            }
            if haslo.chars().count() < 8 || haslo.len() > 1024 || haslo.chars().any(|znak| znak.is_whitespace() || znak == '\u{feff}') {
                return Err("Minimum 8 znaków, bez spacji. Polskie znaki są dozwolone. Maksymalnie 1024 bajty.".into());
            }
            let stare: Option<String> = baza
                .query_row("SELECT haslo FROM konta WHERE id=?1", [&id], |wiersz| {
                    wiersz.get(0)
                })
                .map_err(blad_bazy)?;
            if stare
                .as_deref()
                .and_then(|zapis| PasswordHash::new(zapis).ok())
                .is_some_and(|hasz| {
                    Argon2::default()
                        .verify_password(haslo.as_bytes(), &hasz)
                        .is_ok()
                })
            {
                return Err("Wybierz inne hasło niż dotychczasowe.".into());
            }
            let hasz = zabezpiecz_haslo(haslo, tekst(dane, "powtorzoneHaslo"))?;
            baza.execute("UPDATE konta SET haslo=?1,wymagany_reset=0,wersja_sesji=wersja_sesji+1 WHERE id=?2", params![hasz,id]).map_err(blad_bazy)?;
            baza.execute("DELETE FROM sesje WHERE konto_id=?1", [&id])
                .map_err(blad_bazy)?;
            baza.execute("DELETE FROM resety WHERE konto_id=?1", [&id])
                .map_err(blad_bazy)?;
            baza.execute("DELETE FROM zgody_resetowania WHERE konto_id=?1", [&id])
                .map_err(blad_bazy)?;
            audyt(
                baza,
                &wykonujacy,
                &id,
                "ZAKONCZENIE_ZMIANY_HASLA",
                "SUKCES",
                czas,
            )?;
            let token = wydaj_sesje(baza, &id, czas)?;
            Ok(WynikOperacji {
                dane: publiczny_profil(baza, &id, czas)?,
                nowa_sesja: Some(token),
                wyloguj: false,
            })
        }
        "sesja" => Ok(WynikOperacji::dane(tozsamosc(baza, sesja, czas)?)),
        "wyloguj" => {
            baza.execute(
                "DELETE FROM sesje WHERE skrot=?1",
                [skrot(sesja.unwrap_or(""))],
            )
            .map_err(blad_bazy)?;
            Ok(WynikOperacji {
                dane: Value::Null,
                nowa_sesja: None,
                wyloguj: true,
            })
        }
        "katalog" | "historia" | "resetuj" | "anuluj-reset" | "utworz-konto" => {
            let wykonujacy = match tozsamosc(baza, sesja, czas) {
                Ok(konto) => konto,
                Err(blad) => {
                    audyt(
                        baza,
                        "niezalogowany",
                        "*",
                        "ODMOWA_UPRAWNIEN",
                        "ODRZUCONO",
                        czas,
                    )?;
                    return Err(blad);
                }
            };
            let wykonujacy_id = tekst(&wykonujacy, "id");
            if operacja == "utworz-konto" {
                let dane = &dane["profil"];
                let rola = tekst(dane, "rola");
                if poziom(tekst(&wykonujacy, "rola")) < 7
                    || poziom(rola) == 0
                    || poziom(rola) >= poziom(tekst(&wykonujacy, "rola"))
                {
                    audyt(
                        baza,
                        wykonujacy_id,
                        "*",
                        "ODMOWA_UPRAWNIEN",
                        "ODRZUCONO",
                        czas,
                    )?;
                    return Err("Możesz tworzyć wyłącznie konta o niższej roli.".into());
                }
                let login = tekst(dane, "login").trim().to_lowercase();
                if login.is_empty()
                    || login.len() > 100
                    || tekst(dane, "imie").trim().is_empty()
                    || tekst(dane, "nazwisko").trim().is_empty()
                    || !["SEMPER", "IIST", "KLIENT", "ZEWNETRZNY"]
                        .contains(&tekst(dane, "organizacja"))
                    || ![
                        "UTWORZONY",
                        "OCZEKUJE_NA_AKTYWACJE",
                        "AKTYWNY",
                        "ZABLOKOWANY",
                        "NIEAKTYWNY",
                    ]
                    .contains(&tekst(dane, "status"))
                {
                    return Err("Nieprawidłowe dane konta.".into());
                }
                let emaile = dane["emaile"].as_array().ok_or("Podaj adres e-mail.")?;
                if emaile.is_empty()
                    || emaile.iter().any(|email| {
                        !email
                            .as_str()
                            .is_some_and(|email| email.contains('@') && email.len() <= 320)
                    })
                    || !dane["telefony"].is_array()
                    || !dane["odznaki"].is_array()
                {
                    return Err("Nieprawidłowy kontakt konta.".into());
                }
                let klucze: std::collections::HashSet<String> = std::iter::once(login.clone())
                    .chain(
                        emaile
                            .iter()
                            .map(|email| email.as_str().unwrap_or("").trim().to_lowercase()),
                    )
                    .collect();
                for klucz in &klucze {
                    if baza
                        .query_row(
                            "SELECT EXISTS(SELECT 1 FROM klucze_logowania WHERE klucz=?1)",
                            [klucz],
                            |wiersz| wiersz.get::<_, bool>(0),
                        )
                        .map_err(blad_bazy)?
                    {
                        return Err("Login lub e-mail jest już używany.".into());
                    }
                }
                let id = format!("konto-{}", sekret());
                let mut konto: Value = Value::Object(
                    POLA_PROFILU
                        .iter()
                        .filter_map(|pole| {
                            dane.get(*pole)
                                .map(|wartosc| (pole.to_string(), wartosc.clone()))
                        })
                        .collect(),
                );
                konto["id"] = json!(id);
                konto["login"] = json!(login);
                konto["email"] = emaile[0].clone();
                konto["wersjaUprawnien"] = json!(1);
                konto["ostatnieLogowanie"] = Value::Null;
                konto["utworzono"] = json!(data(czas));
                konto["zaktualizowano"] = json!(data(czas));
                baza.execute(
                    "INSERT INTO konta(id,login,profil) VALUES(?1,?2,?3)",
                    params![id, login, konto.to_string()],
                )
                .map_err(blad_bazy)?;
                for klucz in klucze {
                    baza.execute(
                        "INSERT INTO klucze_logowania VALUES(?1,?2)",
                        params![klucz, id],
                    )
                    .map_err(blad_bazy)?;
                }
                audyt(baza, wykonujacy_id, &id, "UTWORZENIE_KONTA", "SUKCES", czas)?;
                return Ok(WynikOperacji::dane(publiczny_profil(baza, &id, czas)?));
            }
            if operacja == "katalog" {
                let mut zapytanie = baza
                    .prepare("SELECT id FROM konta ORDER BY id")
                    .map_err(blad_bazy)?;
                let identyfikatory: Vec<String> = zapytanie
                    .query_map([], |wiersz| wiersz.get(0))
                    .map_err(blad_bazy)?
                    .collect::<Result<_, _>>()
                    .map_err(blad_bazy)?;
                let mut konta = Vec::new();
                for id in identyfikatory {
                    let konto = publiczny_profil(baza, &id, czas)?;
                    // Zakres zgodny z dotychczasowym przeglądaniem profili; role klienta/gościa widzą wyłącznie siebie.
                    let wewnetrzny = |profil: &Value| {
                        ["SEMPER", "IIST"].contains(&tekst(profil, "organizacja"))
                            && poziom(tekst(profil, "rola")) >= 3
                    };
                    if id == wykonujacy_id
                        || poziom(tekst(&wykonujacy, "rola")) >= 7
                        || (wewnetrzny(&wykonujacy) && wewnetrzny(&konto))
                    {
                        konta.push(konto);
                    }
                }
                return Ok(WynikOperacji::dane(json!(konta)));
            }
            if operacja == "historia" {
                if poziom(tekst(&wykonujacy, "rola")) < 7 {
                    audyt(
                        baza,
                        wykonujacy_id,
                        wykonujacy_id,
                        "ODMOWA_UPRAWNIEN",
                        "ODRZUCONO",
                        czas,
                    )?;
                    return Err("Brak uprawnień do audytu kont.".into());
                }
                let mut zapytanie = baza.prepare("SELECT czas,wykonujacy,konto_id,operacja,wynik FROM audyt ORDER BY id DESC LIMIT 1000").map_err(blad_bazy)?;
                let wpisy: Vec<Value> = zapytanie.query_map([], |wiersz| Ok(json!({"czas":data(wiersz.get(0)?),"wykonujacyId":wiersz.get::<_,String>(1)?,"uzytkownikId":wiersz.get::<_,String>(2)?,"operacja":wiersz.get::<_,String>(3)?,"wynik":wiersz.get::<_,String>(4)?,"pola":[]}))).map_err(blad_bazy)?.collect::<Result<_,_>>().map_err(blad_bazy)?;
                let mut historia = Vec::new();
                let mut legacy = baza
                    .prepare("SELECT wpis FROM audyt_legacy ORDER BY id")
                    .map_err(blad_bazy)?;
                for wpis in legacy
                    .query_map([], |wiersz| wiersz.get::<_, String>(0))
                    .map_err(blad_bazy)?
                {
                    historia.push(
                        serde_json::from_str::<Value>(&wpis.map_err(blad_bazy)?)
                            .map_err(|_| "Uszkodzona historia kont.")?,
                    );
                }
                historia.extend(wpisy.into_iter().rev());
                return Ok(WynikOperacji::dane(json!(historia)));
            }
            let ids = dane["identyfikatory"].as_array().ok_or("Wybierz konta.")?;
            if ids.is_empty() || ids.len() > 100 {
                return Err("Wybierz od 1 do 100 kont.".into());
            }
            if ids
                .iter()
                .any(|id| !id.is_string() || id.as_str().unwrap_or("").len() > 200)
            {
                return Err("Nieprawidłowe konto.".into());
            }
            let mut wyniki = Vec::new();
            let mut przetworzone = std::collections::HashSet::new();
            for id in ids {
                let id = id.as_str().ok_or("Nieprawidłowe konto.")?;
                if !przetworzone.insert(id) {
                    continue;
                }
                let konto = profil(baza, id)?;
                if !konto
                    .as_ref()
                    .is_some_and(|konto| czy_moze_resetowac(&wykonujacy, konto))
                {
                    audyt(
                        baza,
                        wykonujacy_id,
                        id,
                        "ODMOWA_UPRAWNIEN",
                        "ODRZUCONO",
                        czas,
                    )?;
                    wyniki.push(json!({"id":id,"blad":"Brak uprawnienia users.password.reset dla tego konta."}));
                    continue;
                }
                if operacja == "resetuj" {
                    let ponownie: bool = baza
                        .query_row(
                            "SELECT EXISTS(SELECT 1 FROM resety WHERE konto_id=?1)",
                            [id],
                            |wiersz| wiersz.get(0),
                        )
                        .map_err(blad_bazy)?;
                    let kod = rozpocznij_reset(baza, id, wykonujacy_id, czas)?;
                    audyt(
                        baza,
                        wykonujacy_id,
                        id,
                        if ponownie {
                            "PONOWNE_WYGENEROWANIE_KODU"
                        } else {
                            "ZAINICJOWANIE_RESETU"
                        },
                        "SUKCES",
                        czas,
                    )?;
                    wyniki.push(json!({"id":id,"kod":kod,"wygasa":data(czas+86400)}));
                } else {
                    baza.execute("DELETE FROM resety WHERE konto_id=?1", [id])
                        .map_err(blad_bazy)?;
                    baza.execute("DELETE FROM zgody_resetowania WHERE konto_id=?1", [id])
                        .map_err(blad_bazy)?;
                    // Wymagany reset pozostaje: anulowanie kodu nie przywraca starego hasła.
                    audyt(baza, wykonujacy_id, id, "ANULOWANIE_RESETU", "SUKCES", czas)?;
                    wyniki.push(json!({"id":id}));
                }
            }
            Ok(WynikOperacji::dane(json!(wyniki)))
        }
        _ => Err("Nieobsługiwana operacja konta.".into()),
    }
}

#[cfg(test)]
mod testy;
