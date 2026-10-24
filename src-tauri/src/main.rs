#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn czy_aktualizacje_dostepne(aplikacja: tauri::AppHandle) -> bool {
    aplikacja
        .config()
        .plugins
        .0
        .get("updater")
        .and_then(|konfiguracja| konfiguracja.get("pubkey"))
        .and_then(|klucz| klucz.as_str())
        .is_some_and(|klucz| !klucz.trim().is_empty())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|aplikacja, _, _| {
            if let Some(okno) = aplikacja.get_webview_window("main") {
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
        )
        .invoke_handler(tauri::generate_handler![czy_aktualizacje_dostepne])
        .run(tauri::generate_context!())
        .expect("Nie udało się uruchomić Ultimate Pomagiera");
}
