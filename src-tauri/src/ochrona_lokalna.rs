use std::path::Path;

#[cfg(windows)]
fn przeksztalc(dane: &[u8], zaszyfruj: bool) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::Cryptography::{
            CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
        },
    };
    let wejscie = CRYPT_INTEGER_BLOB {
        cbData: dane
            .len()
            .try_into()
            .map_err(|_| "Za duży zapis lokalny.")?,
        pbData: dane.as_ptr().cast_mut(),
    };
    let mut wyjscie = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    // DPAPI wiąże zapis z kontem Windows. Nigdy nie używamy zakresu całego komputera.
    let sukces = unsafe {
        if zaszyfruj {
            CryptProtectData(
                &wejscie,
                std::ptr::null(),
                std::ptr::null(),
                std::ptr::null(),
                std::ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut wyjscie,
            )
        } else {
            CryptUnprotectData(
                &wejscie,
                std::ptr::null_mut(),
                std::ptr::null(),
                std::ptr::null(),
                std::ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut wyjscie,
            )
        }
    };
    if sukces == 0 {
        return Err("Windows nie może zabezpieczyć lub odczytać danych lokalnych.".into());
    }
    let wynik =
        unsafe { std::slice::from_raw_parts(wyjscie.pbData, wyjscie.cbData as usize).to_vec() };
    unsafe {
        LocalFree(wyjscie.pbData.cast());
    }
    Ok(wynik)
}
#[cfg(not(windows))]
fn przeksztalc(_: &[u8], _: bool) -> Result<Vec<u8>, String> {
    Err("Trwałe poufne dane wymagają ochrony konta Windows (DPAPI).".into())
}

pub fn zapisz(sciezka: &Path, dane: &[u8]) -> Result<(), String> {
    let szyfrogram = przeksztalc(dane, true)?;
    let tymczasowy = sciezka.with_extension("zapis-dpapi");
    std::fs::write(&tymczasowy, szyfrogram)
        .map_err(|_| "Nie udało się zapisać zabezpieczonych danych.")?;
    // rename na Windows zastępuje plik docelowy atomowo na tym samym woluminie.
    std::fs::rename(&tymczasowy, sciezka)
        .map_err(|_| "Nie udało się zatwierdzić zabezpieczonego zapisu.".into())
}
pub fn odczytaj(sciezka: &Path) -> Result<Option<Vec<u8>>, String> {
    match std::fs::read(sciezka) {
        Ok(dane) => przeksztalc(&dane, false).map(Some),
        Err(blad) if blad.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err("Nie udało się odczytać zabezpieczonych danych.".into()),
    }
}
pub fn usun(sciezka: &Path) -> Result<(), String> {
    match std::fs::remove_file(sciezka) {
        Ok(()) => Ok(()),
        Err(blad) if blad.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("Nie udało się usunąć zapamiętanej sesji.".into()),
    }
}

#[cfg(all(test, windows))]
mod testy {
    use super::*;
    #[test]
    fn dpapi_odtwarza_dane_i_odrzuca_uszkodzony_zapis() {
        let dane = b"tylko syntetyczny sekret testowy";
        let mut zaszyfrowane = przeksztalc(dane, true).unwrap();
        assert!(!zaszyfrowane.windows(dane.len()).any(|okno| okno == dane));
        assert_eq!(przeksztalc(&zaszyfrowane, false).unwrap(), dane);
        zaszyfrowane[0] ^= 1;
        assert!(przeksztalc(&zaszyfrowane, false).is_err());
    }
}
