use std::{fs::OpenOptions, io::Write, path::Path};

#[cfg(windows)]
pub(crate) fn wybierz_sciezke(nazwa: &str, wlasciciel: usize) -> Result<Option<std::path::PathBuf>, String> {
    use std::{ffi::OsString, os::windows::ffi::OsStringExt};
    use windows_sys::Win32::UI::Controls::Dialogs::{
        CommDlgExtendedError, GetSaveFileNameW, OFN_EXPLORER, OFN_NOCHANGEDIR,
        OFN_PATHMUSTEXIST, OPENFILENAMEW,
    };
    let mut bufor = vec![0u16; 32768];
    let poczatkowa: Vec<u16> = nazwa.encode_utf16().collect();
    if poczatkowa.len() >= bufor.len() { return Err("Nazwa pliku PDF jest za długa.".into()); }
    bufor[..poczatkowa.len()].copy_from_slice(&poczatkowa);
    let filtr: Vec<u16> = "Dokument PDF\0*.pdf\0\0".encode_utf16().collect();
    let rozszerzenie: Vec<u16> = "pdf\0".encode_utf16().collect();
    let tytul: Vec<u16> = "Zapisz pakiet PDF (istniejący plik otrzyma nowy numer)\0".encode_utf16().collect();
    let mut ustawienia = OPENFILENAMEW {
        lStructSize: std::mem::size_of::<OPENFILENAMEW>() as u32,
        hwndOwner: wlasciciel as *mut std::ffi::c_void,
        lpstrFile: bufor.as_mut_ptr(),
        nMaxFile: bufor.len() as u32,
        lpstrFilter: filtr.as_ptr(),
        lpstrDefExt: rozszerzenie.as_ptr(),
        lpstrTitle: tytul.as_ptr(),
        Flags: OFN_EXPLORER | OFN_NOCHANGEDIR | OFN_PATHMUSTEXIST,
        ..Default::default()
    };
    // Bufory UTF-16 oraz właściciel okna pozostają ważne przez całe wywołanie.
    if unsafe { GetSaveFileNameW(&mut ustawienia) } == 0 {
        let kod = unsafe { CommDlgExtendedError() };
        return if kod == 0 { Ok(None) } else { Err(format!("Nie udało się wybrać pliku PDF (błąd {kod}).")) };
    }
    let koniec = bufor.iter().position(|znak| *znak == 0).ok_or("Nieprawidłowa ścieżka zapisu PDF.")?;
    Ok(Some(std::path::PathBuf::from(OsString::from_wide(&bufor[..koniec]))))
}

pub(crate) fn zapisz_w_katalogu(
    katalog: &Path,
    nazwa: &str,
    bajty: &[u8],
) -> Result<String, String> {
    if nazwa.is_empty()
        || nazwa.len() > 220
        || !nazwa.ends_with(".pdf")
        || nazwa
            .chars()
            .any(|znak| znak.is_control() || "<>:\"/\\|?*".contains(znak))
        || nazwa.ends_with(' ')
        || nazwa.starts_with('.')
    {
        return Err("Nieprawidłowa nazwa pliku PDF.".into());
    }
    if bajty.len() > 100 * 1024 * 1024 || !bajty.starts_with(b"%PDF-") {
        return Err("Nieprawidłowy PDF lub pakiet większy niż 100 MB.".into());
    }
    let rdzen = nazwa.strip_suffix(".pdf").ok_or("Brak rozszerzenia PDF.")?;
    for numer in 0..1000 {
        let nazwa_docelowa = if numer == 0 {
            nazwa.to_owned()
        } else {
            format!("{rdzen} ({numer}).pdf")
        };
        let sciezka = katalog.join(nazwa_docelowa);
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&sciezka)
        {
            Ok(mut plik) => {
                if let Err(blad) = plik.write_all(bajty).and_then(|_| plik.sync_all()) {
                    drop(plik);
                    let sprzatanie = std::fs::remove_file(&sciezka);
                    return Err(format!("Nie udało się zapisać kompletnego PDF: {blad}. Usunięcie niepełnego pliku: {sprzatanie:?}"));
                }
                return Ok(sciezka.to_string_lossy().into_owned());
            }
            Err(blad) if blad.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(blad) => return Err(format!("Nie udało się zapisać PDF: {blad}")),
        }
    }
    Err("Zbyt wiele plików o tej samej nazwie w folderze Pobrane.".into())
}

#[cfg(test)]
mod testy {
    use super::*;
    #[test]
    fn zapis_nie_nadpisuje_istniejacego_pliku_i_blokuje_wyjscie_z_katalogu() {
        let katalog =
            std::env::temp_dir().join(format!("pomagier-pdf-test-{}", std::process::id()));
        std::fs::create_dir_all(&katalog).unwrap();
        let wynik = (|| {
            let pierwszy =
                zapisz_w_katalogu(&katalog, "SEMPER_szkolenie.pdf", b"%PDF-1.7 test pierwszy")
                    .unwrap();
            let drugi = zapisz_w_katalogu(&katalog, "SEMPER_szkolenie.pdf", b"%PDF-1.7 test drugi")
                .unwrap();
            assert_ne!(pierwszy, drugi);
            assert_eq!(std::fs::read(pierwszy).unwrap(), b"%PDF-1.7 test pierwszy");
            assert!(zapisz_w_katalogu(&katalog, "../obcy.pdf", b"%PDF-1.7").is_err());
            assert!(zapisz_w_katalogu(&katalog, "plik.pdf", b"nie PDF").is_err());
        })();
        std::fs::remove_dir_all(katalog).unwrap();
        wynik
    }
}
