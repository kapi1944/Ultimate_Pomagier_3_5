#[cfg(desktop)]
use tauri::Manager;
#[tauri::command]
pub async fn zapisz_pakiet_pdf(
    okno: tauri::WebviewWindow,
    aplikacja: tauri::AppHandle,
    nazwa: String,
    bajty: Vec<u8>,
) -> Result<String, String> {
    if okno.label() != "obszar" && okno.label() != "main" {
        return Err("Niedozwolone okno aplikacji.".into());
    }
    #[cfg(mobile)]
    {
        let _ = (aplikacja, nazwa, bajty);
        Err("Zapis pakietu na Androidzie wymaga integracji natywnej. Pobierz pakiet w przeglądarce lub na Windows.".into())
    }
    #[cfg(desktop)]
    {
        let katalog = aplikacja
            .path()
            .download_dir()
            .map_err(|_| "Nie znaleziono folderu Pobrane.")?;
        tauri::async_runtime::spawn_blocking(move || {
            crate::zapis_pdf::zapisz_w_katalogu(&katalog, &nazwa, &bajty)
        })
        .await
        .map_err(|blad| blad.to_string())?
    }
}
