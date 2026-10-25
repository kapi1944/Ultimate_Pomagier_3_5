use crate::ochrona_lokalna;
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Mutex};
use tauri::{Manager, WebviewWindow, WebviewWindowBuilder};

pub struct StanKont {
    magazyn: Mutex<Option<pomagier_konta::MagazynKont>>,
    sesja: Mutex<Option<String>>,
    konto_okna: Mutex<Option<String>>,
    zapamietaj: Mutex<bool>,
    komunikat_sesji: Mutex<String>,
    katalog: PathBuf,
}
pub fn przygotuj(aplikacja: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    if cfg!(feature = "demo-desktop") && !aplikacja.config().identifier.ends_with(".demo") {
        return Err(std::io::Error::other(
            "DEMO wymaga osobnej konfiguracji i identyfikatora aplikacji.",
        )
        .into());
    }
    let katalog = aplikacja.path().app_local_data_dir()?.join("konta");
    #[cfg(debug_assertions)]
    let katalog = std::env::var_os("POMAGIER_KATALOG_TESTOWY")
        .map(PathBuf::from)
        .map(|katalog| katalog.join(&aplikacja.config().identifier).join("konta"))
        .unwrap_or(katalog);
    std::fs::create_dir_all(&katalog)?;
    let mut komunikat_sesji = String::new();
    let (magazyn, sesja) = if cfg!(feature = "demo-desktop") {
        (None, None)
    } else {
        let mut magazyn = pomagier_konta::MagazynKont::otworz(&katalog.join("konta.sqlite3"))
            .map_err(std::io::Error::other)?;
        let odzyskane = ochrona_lokalna::odczytaj(&katalog.join("sesja.dpapi"));
        let istniala = odzyskane
            .as_ref()
            .map(|dane| dane.is_some())
            .unwrap_or(true);
        let sesja = odzyskane
            .ok()
            .flatten()
            .and_then(|dane| String::from_utf8(dane).ok())
            .filter(|token| magazyn.wykonaj(Some(token), "sesja", &Value::Null).is_ok());
        if istniala && sesja.is_none() {
            komunikat_sesji =
                "Zapamiętana sesja wygasła lub nie można jej odczytać. Zaloguj się ponownie."
                    .into();
        }
        (Some(magazyn), sesja)
    };
    let zapamietaj = sesja.is_some();
    let katalog_logowania = katalog
        .parent()
        .ok_or_else(|| std::io::Error::other("Nieprawidłowy katalog danych."))?
        .to_path_buf();
    aplikacja.manage(StanKont {
        magazyn: Mutex::new(magazyn),
        sesja: Mutex::new(sesja),
        konto_okna: Mutex::new(None),
        zapamietaj: Mutex::new(zapamietaj),
        komunikat_sesji: Mutex::new(komunikat_sesji),
        katalog,
    });
    WebviewWindowBuilder::from_config(aplikacja, &aplikacja.config().app.windows[0])?
        .data_directory(katalog_logowania)
        .build()?;
    Ok(())
}
fn sprawdz_okno(okno: &WebviewWindow, stan: &StanKont) -> Result<(), String> {
    if cfg!(feature = "demo-desktop") {
        return Err("Natywna demonstracja nie ma dostępu do rzeczywistych kont ani haseł.".into());
    }
    if !["main", "obszar"].contains(&okno.label()) {
        return Err("Niedozwolone okno aplikacji.".into());
    }
    if okno.label() == "obszar"
        && stan
            .konto_okna
            .lock()
            .map_err(|_| "Profil jest niedostępny.")?
            .is_none()
    {
        return Err("Brak autoryzowanego profilu danych.".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn operacja_konta(
    okno: WebviewWindow,
    stan: tauri::State<'_, StanKont>,
    operacja: String,
    dane: Value,
) -> Result<Value, String> {
    sprawdz_okno(&okno, &stan)?;
    if okno.label() == "obszar"
        && [
            "logowanie",
            "pierwsza-konfiguracja",
            "sprawdz-kod",
            "ustaw-haslo",
        ]
        .contains(&operacja.as_str())
    {
        return Err("Wróć do ekranu logowania, aby zmienić konto.".into());
    }
    let mut magazyn = stan
        .magazyn
        .lock()
        .map_err(|_| "Usługa kont jest niedostępna.")?;
    let magazyn = magazyn.as_mut().ok_or("Usługa kont jest niedostępna.")?;
    let mut sesja = stan.sesja.lock().map_err(|_| "Sesja jest niedostępna.")?;
    if okno.label() == "obszar" && operacja != "wyloguj" {
        let tozsamosc = magazyn
            .wykonaj(sesja.as_deref(), "sesja", &Value::Null)?
            .dane;
        if tozsamosc["id"].as_str()
            != stan
                .konto_okna
                .lock()
                .map_err(|_| "Profil jest niedostępny.")?
                .as_deref()
        {
            return Err("Sesja nie należy do tego profilu danych.".into());
        }
    }
    let wynik = magazyn.wykonaj(sesja.as_deref(), &operacja, &dane)?;
    if wynik.wyloguj {
        *sesja = None;
        ochrona_lokalna::usun(&stan.katalog.join("sesja.dpapi"))?;
    }
    let mut odpowiedz = wynik.dane;
    if operacja == "stan-konfiguracji" {
        odpowiedz["komunikatSesji"] = json!(stan
            .komunikat_sesji
            .lock()
            .map_err(|_| "Stan sesji jest niedostępny.")?
            .clone());
    }
    if let Some(token) = wynik.nowa_sesja {
        let mut zapamietaj = stan
            .zapamietaj
            .lock()
            .map_err(|_| "Ustawienie sesji jest niedostępne.")?;
        if operacja != "zmien-haslo" {
            *zapamietaj = dane["zapamietajSesje"].as_bool().unwrap_or(false);
        }
        let zapis = if *zapamietaj {
            ochrona_lokalna::zapisz(&stan.katalog.join("sesja.dpapi"), token.as_bytes())
        } else {
            ochrona_lokalna::usun(&stan.katalog.join("sesja.dpapi"))
        };
        *sesja = Some(token);
        if zapis.is_err() {
            odpowiedz["ostrzezenieSesji"]=json!("Zalogowano, ale nie udało się zapamiętać sesji. Przy kolejnym uruchomieniu podaj hasło.");
        }
    }
    Ok(odpowiedz)
}

#[tauri::command]
pub async fn otworz_obszar_konta(
    okno: WebviewWindow,
    aplikacja: tauri::AppHandle,
    stan: tauri::State<'_, StanKont>,
) -> Result<(), String> {
    sprawdz_okno(&okno, &stan)?;
    if okno.label() != "main" {
        return Ok(());
    }
    let mut magazyn = stan
        .magazyn
        .lock()
        .map_err(|_| "Usługa kont jest niedostępna.")?;
    let sesja = stan.sesja.lock().map_err(|_| "Sesja jest niedostępna.")?;
    let konto = magazyn
        .as_mut()
        .ok_or("Usługa kont jest niedostępna.")?
        .wykonaj(sesja.as_deref(), "sesja", &Value::Null)?
        .dane;
    let id = konto["id"].as_str().ok_or("Nieprawidłowa tożsamość.")?;
    let katalog = stan
        .katalog
        .join("profile")
        .join(pomagier_konta::klucz_profilu(id));
    std::fs::create_dir_all(&katalog)
        .map_err(|_| "Nie udało się przygotować magazynu danych konta.")?;
    let mut konfiguracja = aplikacja.config().app.windows[0].clone();
    konfiguracja.label = "obszar".into();
    *stan
        .konto_okna
        .lock()
        .map_err(|_| "Profil jest niedostępny.")? = Some(id.into());
    if aplikacja.get_webview_window("obszar").is_none() {
        WebviewWindowBuilder::from_config(&aplikacja, &konfiguracja)
            .map_err(|_| "Nie udało się przygotować okna konta.")?
            .data_directory(katalog)
            .build()
            .map_err(|_| "Nie udało się otworzyć obszaru konta.")?;
    }
    okno.destroy()
        .map_err(|_| "Nie udało się zamknąć ekranu logowania.".into())
}

#[tauri::command]
pub async fn otworz_logowanie(
    okno: WebviewWindow,
    aplikacja: tauri::AppHandle,
    stan: tauri::State<'_, StanKont>,
    sesja_wygasla: bool,
) -> Result<(), String> {
    sprawdz_okno(&okno, &stan)?;
    if okno.label() == "main" {
        return Ok(());
    }
    *stan.sesja.lock().map_err(|_| "Sesja jest niedostępna.")? = None;
    *stan
        .konto_okna
        .lock()
        .map_err(|_| "Profil jest niedostępny.")? = None;
    ochrona_lokalna::usun(&stan.katalog.join("sesja.dpapi"))?;
    *stan
        .komunikat_sesji
        .lock()
        .map_err(|_| "Stan sesji jest niedostępny.")? = if sesja_wygasla {
        "Sesja wygasła lub została unieważniona. Zaloguj się ponownie.".into()
    } else {
        String::new()
    };
    if aplikacja.get_webview_window("main").is_none() {
        WebviewWindowBuilder::from_config(&aplikacja, &aplikacja.config().app.windows[0])
            .map_err(|_| "Nie udało się przygotować logowania.")?
            .data_directory(
                stan.katalog
                    .parent()
                    .ok_or("Nieprawidłowy katalog danych.")?
                    .to_path_buf(),
            )
            .build()
            .map_err(|_| "Nie udało się otworzyć logowania.")?;
    }
    okno.destroy()
        .map_err(|_| "Nie udało się zamknąć obszaru konta.".into())
}

#[tauri::command]
pub async fn przygotuj_migracje_danych(
    okno: WebviewWindow,
    stan: tauri::State<'_, StanKont>,
    dane: Value,
) -> Result<(), String> {
    sprawdz_okno(&okno, &stan)?;
    if okno.label() != "main" {
        return Err("Przeniesienie wymaga ekranu pierwszej konfiguracji.".into());
    }
    let mut magazyn = stan
        .magazyn
        .lock()
        .map_err(|_| "Usługa kont jest niedostępna.")?;
    let sesja = stan.sesja.lock().map_err(|_| "Sesja jest niedostępna.")?;
    let magazyn = magazyn.as_mut().ok_or("Usługa kont jest niedostępna.")?;
    let konfiguracja = magazyn
        .wykonaj(None, "stan-konfiguracji", &Value::Null)?
        .dane;
    let konto = if konfiguracja["wymagaKonfiguracji"] == true {
        json!({"id":"administrator-kacper-madej"})
    } else {
        magazyn
            .wykonaj(sesja.as_deref(), "sesja", &Value::Null)?
            .dane
    };
    let id = konto["id"].as_str().ok_or("Nieprawidłowa tożsamość.")?;
    let obiekt = dane.as_object().ok_or("Nieprawidłowy zapis migracji.")?;
    if dane.to_string().len() > 64 * 1024 * 1024 {
        return Err(
            "Kopia migracyjna przekracza 64 MB. Użyj istniejącego eksportu i importu kopii danych."
                .into(),
        );
    }
    if obiekt.iter().any(|(klucz, wartosc)| {
        !klucz.starts_with("ultimatePomagier.")
            && !klucz.starts_with("ultimate-pomagier.")
            && !klucz.starts_with("szczegolyOrganizacyjne.")
            || !wartosc.is_string()
            || klucz.to_lowercase().contains("sesj")
            || klucz.to_lowercase().contains("hasl")
            || klucz.to_lowercase().contains("token")
            || klucz.contains("uzytkownicy")
    }) {
        return Err("Kopia zawiera nieobsługiwany klucz. Sesje i konta nie podlegają migracji danych biznesowych.".into());
    }
    let sciezka = stan.katalog.join(format!(
        "migracja-{}.dpapi",
        pomagier_konta::klucz_profilu(id)
    ));
    if sciezka.exists() {
        if ochrona_lokalna::odczytaj(&sciezka)?.as_deref() == Some(dane.to_string().as_bytes()) {
            return Ok(());
        }
        return Err(
            "Kopia migracyjna już istnieje i zawiera inne dane. Nie została nadpisana.".into(),
        );
    }
    ochrona_lokalna::zapisz(&sciezka, dane.to_string().as_bytes())
}

#[tauri::command]
pub async fn migracja_danych_konta(
    okno: WebviewWindow,
    stan: tauri::State<'_, StanKont>,
    potwierdz: bool,
) -> Result<Value, String> {
    sprawdz_okno(&okno, &stan)?;
    if okno.label() != "obszar" {
        return Ok(Value::Null);
    }
    let mut magazyn = stan
        .magazyn
        .lock()
        .map_err(|_| "Usługa kont jest niedostępna.")?;
    let sesja = stan.sesja.lock().map_err(|_| "Sesja jest niedostępna.")?;
    let konto = magazyn
        .as_mut()
        .ok_or("Usługa kont jest niedostępna.")?
        .wykonaj(sesja.as_deref(), "sesja", &Value::Null)?
        .dane;
    let id = konto["id"].as_str().ok_or("Nieprawidłowa tożsamość.")?;
    if Some(id)
        != stan
            .konto_okna
            .lock()
            .map_err(|_| "Profil jest niedostępny.")?
            .as_deref()
    {
        return Err("Nieprawidłowy profil danych.".into());
    }
    let klucz = pomagier_konta::klucz_profilu(id);
    let znacznik = stan.katalog.join(format!("migracja-{klucz}.zakonczona"));
    if znacznik.exists() {
        return Ok(Value::Null);
    }
    if potwierdz {
        std::fs::write(znacznik, b"1").map_err(|_| "Nie udało się potwierdzić migracji.")?;
        return Ok(Value::Null);
    }
    match ochrona_lokalna::odczytaj(&stan.katalog.join(format!("migracja-{klucz}.dpapi")))? {
        Some(dane) => {
            serde_json::from_slice(&dane).map_err(|_| "Uszkodzona kopia migracyjna.".into())
        }
        None => Ok(Value::Null),
    }
}
