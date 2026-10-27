use serde_json::{json, Value};
use std::{
    fs,
    path::Path,
    process::{Command, Stdio},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

struct KatalogTymczasowy(std::path::PathBuf);
impl Drop for KatalogTymczasowy {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn uruchom_z_limitem(mut polecenie: Command, katalog: &Path) -> Result<(), String> {
    let bledy = fs::File::create(katalog.join("bledy.txt")).map_err(|blad| blad.to_string())?;
    let mut proces = polecenie
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(bledy)
        .spawn()
        .map_err(|_| {
            "Nie można uruchomić lokalnego programu do renderowania prezentacji.".to_string()
        })?;
    let poczatek = Instant::now();
    loop {
        if let Some(status) = proces.try_wait().map_err(|blad| blad.to_string())? {
            return if status.success() {
                Ok(())
            } else {
                Err(fs::read_to_string(katalog.join("bledy.txt"))
                    .unwrap_or_else(|_| "Renderowanie PPTX nie powiodło się.".into()))
            };
        }
        if poczatek.elapsed() > Duration::from_secs(240) {
            let _ = proces.kill();
            let _ = proces.wait();
            return Err("Przekroczono 4 minuty renderowania. Możesz wczytać PDF wyeksportowany z poprawionego PPTX.".into());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}

fn renderuj(dane: Vec<u8>) -> Result<Value, String> {
    if dane.len() > 120 * 1024 * 1024 || !dane.starts_with(b"PK\x03\x04") {
        return Err("Nieprawidłowy PPTX lub plik większy niż 120 MB.".into());
    }
    let znacznik = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|blad| blad.to_string())?
        .as_nanos();
    let katalog = KatalogTymczasowy(
        std::env::temp_dir().join(format!("pomagier-pptx-{}-{znacznik}", std::process::id())),
    );
    fs::create_dir(&katalog.0).map_err(|blad| blad.to_string())?;
    fs::write(katalog.0.join("zrodlo.pptx"), dane).map_err(|blad| blad.to_string())?;
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        fs::write(
            katalog.0.join("renderuj.ps1"),
            include_str!("renderuj_prezentacje.ps1"),
        )
        .map_err(|blad| blad.to_string())?;
        let system = std::env::var_os("SystemRoot").ok_or("Brak katalogu systemu Windows.")?;
        let mut polecenie =
            Command::new(Path::new(&system).join("System32/WindowsPowerShell/v1.0/powershell.exe"));
        polecenie
            .creation_flags(0x08000000)
            .args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
            ])
            .arg(katalog.0.join("renderuj.ps1"))
            .arg("-Katalog")
            .arg(&katalog.0);
        uruchom_z_limitem(polecenie, &katalog.0)?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut polecenie = Command::new("libreoffice");
        let profil = tauri::Url::from_directory_path(katalog.0.join("profil"))
            .map_err(|_| "Niepoprawny katalog profilu LibreOffice.")?;
        polecenie.arg(format!("-env:UserInstallation={profil}"))
            .args(["--headless", "--convert-to", "pdf:impress_pdf_Export:{\"ExportHiddenSlides\":{\"type\":\"boolean\",\"value\":\"true\"}}", "--outdir"])
            .arg(&katalog.0).arg(katalog.0.join("zrodlo.pptx"));
        uruchom_z_limitem(polecenie, &katalog.0)?;
        fs::rename(katalog.0.join("zrodlo.pdf"), katalog.0.join("wynik.pdf"))
            .map_err(|blad| blad.to_string())?;
    }
    let pdf = fs::read(katalog.0.join("wynik.pdf")).map_err(|_| {
        "Nie utworzono PDF. W Windows wymagany jest PowerPoint, w Linux lokalny LibreOffice."
            .to_string()
    })?;
    if !pdf.starts_with(b"%PDF-") {
        return Err("Program nie wygenerował poprawnego PDF.".into());
    }
    let uwagi: Value = fs::read_to_string(katalog.0.join("uwagi.json"))
        .ok()
        .and_then(|tekst| serde_json::from_str(&tekst).ok())
        .unwrap_or(json!([]));
    Ok(json!({ "pdf": pdf, "uwagi": uwagi }))
}

#[tauri::command]
pub async fn renderuj_prezentacje(
    okno: tauri::WebviewWindow,
    stan: tauri::State<'_, crate::konta_desktop::StanKont>,
    dane: Vec<u8>,
) -> Result<Value, String> {
    crate::konta_desktop::sprawdz_sesje_prezentacji(&okno, &stan)?;
    tauri::async_runtime::spawn_blocking(move || renderuj(dane))
        .await
        .map_err(|blad| blad.to_string())?
}
