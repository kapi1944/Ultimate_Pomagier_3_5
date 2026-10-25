use pomagier_konta::{domyslna_sciezka, MagazynKont};
use serde_json::{json, Value};
use std::{io::Read, path::PathBuf};
use tiny_http::{Header, Method, Response, Server, StatusCode};

fn naglowek(nazwa: &str, wartosc: &str) -> Header {
    Header::from_bytes(nazwa, wartosc).expect("Stały poprawny nagłówek")
}
fn uruchom() -> Result<(), String> {
    let argumenty: Vec<String> = std::env::args().skip(1).collect();
    if argumenty.len() < 2 {
        return Err("Użycie: pomagier-konta <baza.sqlite3 | domyslna> <importuj kopia.json | odzyskaj-architekta ID POTWIERDZAM | serwuj katalog-dist>".into());
    }
    let sciezka = if argumenty[0] == "domyslna" {
        domyslna_sciezka()?
    } else {
        PathBuf::from(&argumenty[0])
    };
    let mut magazyn = MagazynKont::otworz(&sciezka)?;
    match argumenty[1].as_str() {
        "importuj" => {
            let zapis = std::fs::read_to_string(argumenty.get(2).ok_or("Wskaż kopię kartoteki.")?)
                .map_err(|_| "Nie udało się odczytać kopii kartoteki.")?;
            let dane: Value =
                serde_json::from_str(&zapis).map_err(|_| "Nieprawidłowy JSON kartoteki.")?;
            magazyn.importuj_kartoteke(&dane)?;
            println!("Przeniesiono kartotekę z zachowaniem ID. Konta wymagają ustawienia hasła; oryginał pozostał bez zmian.");
        }
        "odzyskaj-architekta" => {
            if argumenty.get(3).map(String::as_str) != Some("POTWIERDZAM") {
                return Err("Wymagane jawne POTWIERDZAM. Operacja unieważnia sesje i stare hasło Architekta.".into());
            }
            let kod =
                magazyn.odzyskaj_architekta(argumenty.get(2).ok_or("Wskaż ID Architekta.")?)?;
            println!("Poufny jednorazowy kod ważny 24 godziny (nie przekierowuj wyjścia do pliku ani dziennika):\n{kod}");
        }
        "serwuj" => {
            let katalog = std::fs::canonicalize(argumenty.get(2).ok_or("Wskaż katalog dist.")?)
                .map_err(|_| "Nie znaleziono katalogu frontendu.")?;
            if !katalog.join("index.html").is_file() {
                return Err("Brak zbudowanego frontendu.".into());
            }
            let serwer = Server::http("127.0.0.1:47831")
                .map_err(|_| "Nie udało się uruchomić lokalnej usługi kont.")?;
            println!("Ultimate Pomagier: http://127.0.0.1:47831 — wyłącznie lokalny dostęp.");
            for mut zadanie in serwer.incoming_requests() {
                let host = zadanie
                    .headers()
                    .iter()
                    .find(|naglowek| naglowek.field.equiv("Host"))
                    .map(|naglowek| naglowek.value.as_str());
                if host != Some("127.0.0.1:47831") {
                    let _ = zadanie.respond(Response::empty(StatusCode(403)));
                    continue;
                }
                if zadanie.url() == "/api/konta" {
                    let pochodzenie = zadanie
                        .headers()
                        .iter()
                        .find(|naglowek| naglowek.field.equiv("Origin"))
                        .map(|naglowek| naglowek.value.as_str());
                    let typ = zadanie
                        .headers()
                        .iter()
                        .find(|naglowek| naglowek.field.equiv("Content-Type"))
                        .map(|naglowek| naglowek.value.as_str());
                    let znacznik = zadanie.headers().iter().any(|naglowek| {
                        naglowek.field.equiv("X-Pomagier-Konta") && naglowek.value.as_str() == "1"
                    });
                    if zadanie.method() != &Method::Post
                        || pochodzenie != Some("http://127.0.0.1:47831")
                        || typ != Some("application/json")
                        || !znacznik
                    {
                        let _ = zadanie.respond(Response::empty(StatusCode(403)));
                        continue;
                    }
                    let sesja = zadanie
                        .headers()
                        .iter()
                        .find(|naglowek| naglowek.field.equiv("Cookie"))
                        .and_then(|naglowek| {
                            naglowek
                                .value
                                .as_str()
                                .split(';')
                                .find_map(|czesc| czesc.trim().strip_prefix("pomagier_sesja="))
                        })
                        .map(str::to_string);
                    let mut zapis = String::new();
                    let dane = zadanie
                        .as_reader()
                        .take(32769)
                        .read_to_string(&mut zapis)
                        .ok()
                        .filter(|_| zapis.len() <= 32768)
                        .and_then(|_| serde_json::from_str::<Value>(&zapis).ok());
                    let wynik = dane
                        .ok_or_else(|| "Nieprawidłowe żądanie.".to_string())
                        .and_then(|dane| {
                            magazyn.wykonaj(
                                sesja.as_deref(),
                                dane["operacja"].as_str().unwrap_or(""),
                                &dane["dane"],
                            )
                        });
                    let (odpowiedz, ciasteczko) = match wynik {
                        Ok(wynik) => (
                            json!({"dane":wynik.dane}),
                            if wynik.wyloguj {
                                Some("pomagier_sesja=; HttpOnly; SameSite=Strict; Path=/api/konta; Max-Age=0".to_string())
                            } else {
                                wynik.nowa_sesja.map(|token| format!("pomagier_sesja={token}; HttpOnly; SameSite=Strict; Path=/api/konta; Max-Age=28800"))
                            },
                        ),
                        Err(blad) => (json!({"blad":blad}), None),
                    };
                    let mut odpowiedz = Response::from_string(odpowiedz.to_string())
                        .with_header(naglowek("Content-Type", "application/json; charset=utf-8"))
                        .with_header(naglowek("Cache-Control", "no-store"));
                    if let Some(ciasteczko) = ciasteczko {
                        odpowiedz.add_header(naglowek("Set-Cookie", &ciasteczko));
                    }
                    let _ = zadanie.respond(odpowiedz);
                } else {
                    if zadanie.method() != &Method::Get
                        || zadanie.url().contains(['%', '\\', '\0'])
                        || zadanie.url().split('/').any(|czesc| czesc == "..")
                    {
                        let _ = zadanie.respond(Response::empty(StatusCode(404)));
                        continue;
                    }
                    let nazwa = zadanie
                        .url()
                        .split('?')
                        .next()
                        .unwrap_or("/")
                        .trim_start_matches('/');
                    let plik = katalog.join(if nazwa.is_empty() {
                        "index.html"
                    } else {
                        nazwa
                    });
                    let plik = std::fs::canonicalize(plik)
                        .ok()
                        .filter(|plik| plik.starts_with(&katalog) && plik.is_file());
                    let zawartosc = plik.as_ref().and_then(|plik| std::fs::read(plik).ok());
                    if let Some(zawartosc) = zawartosc {
                        let typ = match plik
                            .as_ref()
                            .and_then(|plik| plik.extension())
                            .and_then(|rozszerzenie| rozszerzenie.to_str())
                        {
                            Some("html") => "text/html; charset=utf-8",
                            Some("js" | "mjs") => "text/javascript",
                            Some("css") => "text/css",
                            Some("json") => "application/json",
                            Some("svg") => "image/svg+xml",
                            Some("png") => "image/png",
                            Some("jpg" | "jpeg") => "image/jpeg",
                            Some("woff2") => "font/woff2",
                            Some("pdf") => "application/pdf",
                            _ => "application/octet-stream",
                        };
                        let odpowiedz = Response::from_data(zawartosc).with_header(naglowek("Content-Type",typ))
                            .with_header(naglowek("Cache-Control","no-store"))
                            .with_header(naglowek("X-Content-Type-Options","nosniff"))
                            .with_header(naglowek("Referrer-Policy","no-referrer"))
                            .with_header(naglowek("Content-Security-Policy","default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"));
                        let _ = zadanie.respond(odpowiedz);
                    } else {
                        let _ = zadanie.respond(Response::empty(StatusCode(404)));
                    }
                }
            }
        }
        _ => return Err("Nieobsługiwane polecenie.".into()),
    }
    Ok(())
}
fn main() {
    if let Err(blad) = uruchom() {
        eprintln!("{blad}");
        std::process::exit(1);
    }
}
