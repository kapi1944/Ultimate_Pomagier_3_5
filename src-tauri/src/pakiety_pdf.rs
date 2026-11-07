#[cfg(desktop)]
use tauri::Manager;
#[tauri::command]
pub async fn zapisz_pakiet_pdf(
    okno: tauri::WebviewWindow,
    aplikacja: tauri::AppHandle,
    nazwa: String,
    bajty: Vec<u8>,
    wybierz_miejsce: Option<bool>,
) -> Result<String, String> {
    if okno.label() != "obszar" && okno.label() != "main" {
        return Err("Niedozwolone okno aplikacji.".into());
    }
    #[cfg(mobile)]
    {
        let _ = (aplikacja, nazwa, bajty, wybierz_miejsce);
        Err("Zapis pakietu na Androidzie wymaga integracji natywnej. Pobierz pakiet w przeglądarce lub na Windows.".into())
    }
    #[cfg(desktop)]
    {
        let katalog = aplikacja
            .path()
            .download_dir()
            .map_err(|_| "Nie znaleziono folderu Pobrane.")?;
        #[cfg(windows)]
        let wlasciciel = okno.hwnd().map_err(|blad| blad.to_string())?.0 as usize;
        tauri::async_runtime::spawn_blocking(move || {
            if wybierz_miejsce.unwrap_or(false) {
                #[cfg(windows)]
                {
                    let Some(sciezka) = crate::zapis_pdf::wybierz_sciezke(&nazwa, wlasciciel)? else {
                        return Ok("Anulowano wybór miejsca zapisu. Nie zapisano pliku.".into());
                    };
                    let katalog = sciezka.parent().ok_or("Brak katalogu docelowego PDF.")?;
                    let nazwa = sciezka.file_name().and_then(|nazwa| nazwa.to_str()).ok_or("Nieprawidłowa nazwa PDF.")?;
                    return crate::zapis_pdf::zapisz_w_katalogu(katalog, nazwa, &bajty);
                }
                #[cfg(not(windows))]
                return Err("Wybór lokalizacji w aplikacji jest dostępny na Windows. Użyj pobierania do folderu Pobrane.".into());
            }
            crate::zapis_pdf::zapisz_w_katalogu(&katalog, &nazwa, &bajty)
        })
        .await
        .map_err(|blad| blad.to_string())?
    }
}
