#[cfg(mobile)]
use std::sync::Mutex;
use tauri::Manager;
#[cfg(desktop)]
mod konta_desktop;
#[cfg(desktop)]
mod ochrona_lokalna;

#[cfg(mobile)]
struct StanKont {
    magazyn: Mutex<pomagier_konta::MagazynKont>,
    sesja: Mutex<Option<String>>,
}

#[cfg(mobile)]
#[tauri::command]
async fn operacja_konta(
    okno: tauri::WebviewWindow,
    stan: tauri::State<'_, StanKont>,
    operacja: String,
    dane: serde_json::Value,
) -> Result<serde_json::Value, String> {
    if okno.label() != "main" {
        return Err("Niedozwolone okno aplikacji.".into());
    }
    let mut magazyn = stan
        .magazyn
        .lock()
        .map_err(|_| "Usługa kont jest niedostępna.")?;
    let mut sesja = stan.sesja.lock().map_err(|_| "Sesja jest niedostępna.")?;
    let wynik = magazyn.wykonaj(sesja.as_deref(), &operacja, &dane)?;
    if wynik.wyloguj {
        *sesja = None;
    }
    if let Some(token) = wynik.nowa_sesja {
        *sesja = Some(token);
    }
    Ok(wynik.dane)
}

#[tauri::command]
fn czy_aktualizacje_dostepne(aplikacja: tauri::AppHandle) -> bool {
    if cfg!(mobile) || cfg!(feature = "demo-desktop") {
        return false;
    }
    aplikacja
        .config()
        .plugins
        .0
        .get("updater")
        .and_then(|konfiguracja| konfiguracja.get("pubkey"))
        .and_then(|klucz| klucz.as_str())
        .is_some_and(|klucz| !klucz.trim().is_empty())
}

#[tauri::command]
fn informacje_o_platformie() -> serde_json::Value {
    serde_json::json!({ "system": std::env::consts::OS, "architektura": std::env::consts::ARCH })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn uruchom() {
    let konstruktor = tauri::Builder::default()
        .setup(|aplikacja| {
            #[cfg(desktop)]
            konta_desktop::przygotuj(aplikacja)?;
            #[cfg(mobile)]
            let sciezka = {
                let katalog = aplikacja.path().app_data_dir()?.join("konta");
                std::fs::create_dir_all(&katalog)?;
                katalog.join("konta.sqlite3")
            };
            #[cfg(mobile)]
            let magazyn =
                pomagier_konta::MagazynKont::otworz(&sciezka).map_err(std::io::Error::other)?;
            #[cfg(mobile)]
            aplikacja.manage(StanKont {
                magazyn: Mutex::new(magazyn),
                sesja: Mutex::new(None),
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init());
    #[cfg(desktop)]
    let konstruktor = konstruktor
        .plugin(tauri_plugin_single_instance::init(|aplikacja, _, _| {
            if let Some(okno) = aplikacja
                .get_webview_window("obszar")
                .or_else(|| aplikacja.get_webview_window("main"))
            {
                let _ = okno.unminimize();
                let _ = okno.show();
                let _ = okno.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_updater::Builder::new()
                .default_version_comparator(|obecna, dostepna| {
                    dostepna.version.pre.is_empty() && dostepna.version > obecna
                })
                .build(),
        );
    #[cfg(desktop)]
    let konstruktor = konstruktor.invoke_handler(tauri::generate_handler![
        czy_aktualizacje_dostepne,
        informacje_o_platformie,
        konta_desktop::operacja_konta,
        konta_desktop::otworz_obszar_konta,
        konta_desktop::otworz_logowanie,
        konta_desktop::przygotuj_migracje_danych,
        konta_desktop::migracja_danych_konta
    ]);
    #[cfg(mobile)]
    let konstruktor = konstruktor.invoke_handler(tauri::generate_handler![
        czy_aktualizacje_dostepne,
        operacja_konta,
        informacje_o_platformie
    ]);
    konstruktor
        .run(tauri::generate_context!())
        .expect("Nie udało się uruchomić Ultimate Pomagiera");
}
