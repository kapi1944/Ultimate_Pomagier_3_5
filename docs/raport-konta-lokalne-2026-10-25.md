# Lokalne konta Windows, dane, offline i reset haseł — 25.10.2026

Praca na `main`, bez commita, pushu, publikacji i instalowania nowej wersji. Wcześniej przekazany prompt o kontach i offline potraktowano jako fundament dla rozpoczętej funkcji resetowania haseł. Wszystkie operacje wykonawcze dotyczyły syntetycznych kont w katalogach testowych, nie rzeczywistych haseł ani dokumentów użytkownika.

## Ustalenia audytu

- Istniały: kartoteka `Uzytkownik`, stałe ID, hierarchia ról, reguły uprawnień, historia kont, logowanie demonstracyjne, konfiguracja Tauri, aktualizator, pakietowanie Windows oraz testy `test:konta` i `test:desktop`.
- Logowanie hasłem zwracało `NIEDOSTEPNE`. Produkcyjne hasła i natywne sesje nie istniały. W Tauri nie było zaufanej weryfikacji tożsamości.
- Dokumenty, ustawienia, szkice i dane operacyjne mają istniejące formaty `localStorage`. Audyt `docs/audyty/audyt-magazynow-danych.md` opisuje również aktywne magazyny legacy. Nie zastępowano ich nowym silnikiem dokumentów ani nie wykonywano zbiorczej migracji danych użytkownika.
- Kopie danych obsługuje `src/wspolne/dane/backupDanych.ts`; pozostał używany w ustawieniach aplikacji.
- Fonty PDF, logotypy i pliki aplikacji są lokalnymi zasobami. Rejestr wydań, aktualizacje oraz otwarcie Google Drive wymagają internetu. Nie są warunkiem logowania ani otwarcia lokalnego obszaru pracy.

## Wdrożony mechanizm

Zaufany moduł Rust `src-tauri/konta` rozszerza istniejącą kartotekę, zachowując model profilu, role i techniczne ID. SQLite jest źródłem tożsamości, haseł, sesji i resetów. Dane kont nie są pobierane jako autorytet z modyfikowalnego `localStorage`. React otrzymuje tylko projekcję profili i historii; sesji demonstracyjnej nie można użyć do uwierzytelnienia natywnego.

Pierwsze uruchomienie pustej instalacji pokazuje konfigurację właściciela. Pierwsze konto otrzymuje rolę Architekt, własny login i hasło. Nie ma stałego hasła ani publicznej rejestracji kolejnych Architektów. Kolejne konta tworzy uprawniona osoba w istniejącej Administracji. Można tworzyć wyłącznie role niższe od własnej; nowy właściciel ustawia hasło za pomocą osobnego kodu.

Hasła zabezpiecza Argon2id z losową solą. Minimum wynosi 15 znaków, maksimum 1024 bajty; dozwolone są spacje i polskie litery. Zmiana własnego hasła wymaga dotychczasowego hasła i unieważnia inne sesje. Hasła, kody i tokeny nie są zapisywane w kartotece przeglądarkowej, eksportach ani nowym audycie.

Sesja natywna pozostaje w Rust. Opcja „Zapamiętaj sesję” zapisuje token przez Windows DPAPI, związany z bieżącym kontem Windows. Sesja ma maksymalnie osiem godzin ważności. Bez tej opcji zamknięcie aplikacji wymaga ponownego logowania. Wylogowanie unieważnia sesję i usuwa jej zapamiętanie; nie usuwa danych. Warstwa natywna sprawdza sesję przy operacjach kont, a UI odświeża jej stan co 15 sekund i po powrocie fokusu. Wygaśnięcie lub cofnięcie sesji prowadzi do logowania.

Każde konto otwiera osobne środowisko WebView2 i katalog danych. Zachowano istniejące formaty dokumentów oraz wywołania repozytoriów; ustawienia, zadania, dokumenty i szkice kolejnych kont nie współdzielą jednego magazynu. Przełączenie konta zamyka jego dotychczasowe środowisko. Kopie biznesowe w ustawieniach dotyczą bieżącego profilu.

## Katalogi danych

Dla zwykłej instalacji Windows:

```text
%LOCALAPPDATA%\pl.ultimatepomagier.desktop\
  konta\konta.sqlite3             konta, skróty haseł, sesje, audyt
  konta\sesja.dpapi               opcjonalne zapamiętanie sesji
  konta\profile\<skrót ID>\       osobny magazyn WebView2 każdego konta
  konta\migracja-<skrót ID>.dpapi  chroniona kopia przed przeniesieniem
```

Zwykły development używa identyfikatora `pl.ultimatepomagier.desktop.dev`, natywne DEMO — `pl.ultimatepomagier.desktop.demo`, a testy wykonawcze — osobnego identyfikatora i katalogów tymczasowych. Katalog instalatora nie jest magazynem danych użytkownika. Aktualizacja zachowująca identyfikator aplikacji korzysta z tych samych katalogów; testu rzeczywistej aktualizacji instalatora w tym zadaniu nie wykonano.

## Pierwsza konfiguracja i migracja

1. Uruchom aplikację Windows i podaj imię, nazwisko, login oraz dwukrotnie własne hasło.
2. Jeśli wykryto starą kartotekę, można jawnie przenieść ją z zachowaniem ID, ról, kontaktów i historii. Wówczas hasło konfiguruje właściciel istniejącego konta Architekta, z zachowaniem jego loginu. Pozostałe konta wymagają ustawienia haseł przez kody.
3. Osobno można zaznaczyć przeniesienie dotychczasowych danych biznesowych do własnego profilu. Formularz podaje liczbę zapisów. Nie należy przypisywać sobie danych innego właściciela.
4. Przed utworzeniem konta zapisywana jest kopia migracyjna chroniona DPAPI. Dane źródłowe pozostają zachowane. W nowym profilu zapis jest sprawdzany; konflikt z innymi danymi zatrzymuje przeniesienie. Format zawartości poszczególnych kluczy nie jest zmieniany.
5. Import kartoteki i utworzenie hasła właściciela są transakcyjne. Nieprawidłowy import jest wycofywany. Nowszy, nieobsługiwany format SQLite nie jest nadpisywany.

Oryginalny zapis legacy pozostaje materiałem do odzyskania; po zalogowaniu źródłem kont jest SQLite, a źródłem bieżących danych biznesowych — magazyn danego konta. Nie rozszerzano równolegle produkcyjnej i demonstracyjnej kartoteki.

## Uruchamianie

```powershell
npm run desktop:dev
npm run desktop:demo
```

Pierwsze polecenie uruchamia zwykłą aplikację deweloperską Windows. Drugie uruchamia natywne DEMO, z osobnym identyfikatorem, portem 1421 i domyślnie osobnym katalogiem kompilacji `src-tauri/target/demo`. DEMO nie otwiera rzeczywistej bazy haseł. Wydanie produkcyjne odrzuca frontend demonstracyjny, a funkcja Rust `demo-desktop` jest zabroniona w profilu `release`.

`npm run dev:demo` nadal uruchamia demonstrację przeglądarkową. Zwykłe `npm run dev` nie daje internetowego logowania bez usługi tożsamości. Lokalny transport przeglądarkowy przygotowany dla resetów wymaga jawnie uruchomionej usługi na `127.0.0.1:47831`; nie jest usługą sieciową ani rozwiązaniem wielostanowiskowym.

Zmiana własnego hasła: **Profil → Bezpieczeństwo konta → Zmień własne hasło**. Kopie dokumentów i ustawień: dotychczasowe **Ustawienia → Dane**.

## Resetowanie haseł

Uprawnienie `users.password.reset` jest ponownie egzekwowane w Rust na podstawie aktualnej sesji i roli:

| Wykonujący | Dozwolone konta |
| --- | --- |
| Architekt | Administratorzy i role niższe |
| Administrator | Role niższe od Administratora |
| Pozostali | Brak resetowania innych kont |

Nie można resetować własnego konta, konta o równej lub wyższej roli ani Architekta przez zwykłą administrację. Odzyskanie Architekta jest osobną lokalną procedurą operatora systemu, niewystawioną w interfejsie administracyjnym.

Administrator otwiera profil, wybiera **Resetuj hasło** lub **Wygeneruj nowy kod**, sprawdza dane i skutki, a następnie potwierdza. Zestawienie kodów pojawia się tylko w otwartym oknie i pozwala je skopiować. W tabeli można również zaznaczyć konta i wybrać **Resetuj hasła zaznaczonych**; każde konto podlega osobnej kontroli uprawnień i otrzymuje osobny kod.

Kod ma 256 bitów entropii, ważność 24 godzin i limit pięciu błędnych prób. SQLite przechowuje wyłącznie SHA-256 kodu. Regeneracja unieważnia poprzedni kod i rozpoczęte ustawianie hasła. Poprawna weryfikacja wydaje ograniczoną zgodę ważną dziesięć minut; sesja logowania powstaje dopiero po zapisaniu nowego hasła. Transakcje `BEGIN IMMEDIATE` chronią przed równoczesnym wykorzystaniem. Anulowanie kodu pozostawia stare hasło zablokowane.

Właściciel konta na ekranie logowania podaje login, wybiera **Dokończ resetowanie hasła**, wpisuje kod i dwukrotnie nowe hasło. Po zakończeniu stary kod i wcześniejsze sesje są unieważnione. Wygasły lub zablokowany kod wymaga nowego kodu od uprawnionej osoby.

Audyt zachowuje identyfikatory, czas, typ i wynik operacji: inicjowanie, regenerację, wygaśnięcie, anulowanie, zakończenie, błędne próby i odmowy. Nie zapisuje nowych haseł, kodów ani tokenów. Istniejąca historia kont jest zachowywana przy migracji.

Administratorzy nie mają funkcji odczytu haseł ani ustawienia docelowego hasła innej osoby. Ważne ograniczenie ręcznego przekazania: kod jest sekretem typu bearer — osoba, która go zna, może go wykorzystać. Samo pokazanie kodu administratorowi nie daje technicznej gwarancji ochrony przed złośliwym administratorem, który użyje go zamiast przekazać właścicielowi. Bez zweryfikowanego, niezależnego kanału dostarczenia nie należy deklarować takiej gwarancji. Nie dodano usługi pocztowej ani płatnej integracji. Wzorce kodów i sesji sprawdzano względem [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Weryfikacja

Wykonano na Windows, na syntetycznych danych:

- `npm run test:konta` — PASS.
- `npm test` wraz z `pretest` — PASS.
- `npm run build` — PASS; pozostało ostrzeżenie o rozmiarze istniejącego dużego pakietu aplikacji.
- `npm run lint` — PASS.
- `npm run test:desktop` — PASS.
- `npm run test:reset-hasel` — PASS: 29 testów Rust oraz po trzy testy TypeScript w zwykłym środowisku i DEMO.
- Natywny test DPAPI — PASS: odtworzenie sekretu i odrzucenie uszkodzonego szyfrogramu.
- `testy/kontaDesktop.natywne.test.mjs` na rzeczywistym WebView2 — PASS: pierwsze konto, migracja starego zapisu, praca z wyłączoną siecią kontekstu, zapis rzeczywistego zadania przez UI, zamknięcie i restart, przywrócenie sesji, zmiana hasła, odrzucenie starego hasła, dwa osobne profile i zachowanie ich danych po przełączeniu.
- `npm run test:konta:demo` na rzeczywistym WebView2 — PASS: natywne DEMO, oddzielny profil, brak rzeczywistej bazy haseł, odmowa rzeczywistego uwierzytelniania, zachowany znacznik danych normalnej aplikacji.
- Test Chrome lokalnego przepływu resetowania — PASS: reset zbiorczy, ochrona ról, formularz właściciela, blokowanie starych sesji i haseł, audyt bez sekretów oraz odmowa błędnego Origin/Host i żądania bez ochrony CSRF.
- `git diff --check` — PASS.

Testy nie odłączały fizycznie komputera od sieci i nie modyfikowały rzeczywistych danych użytkownika. Nie wykonano instalacji ani aktualizacji na czystym Windows, testu innego konta Windows ani akceptacji Androida. Testy resetów i uprawnień działają również jako niezależny zestaw Rust, bez uruchamiania UI.

## Pliki zakresu

- Zaufana warstwa: `src-tauri/konta/Cargo.toml`, `src-tauri/konta/Cargo.lock`, `src-tauri/konta/src/lib.rs`, `src-tauri/konta/src/main.rs`, `src-tauri/konta/src/testy.rs`.
- Integracja natywna: `src-tauri/src/konta_desktop.rs`, `src-tauri/src/ochrona_lokalna.rs`, odpowiednie fragmenty `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/build.rs`, `src-tauri/tauri.conf.json`, `src-tauri/tauri.dev.conf.json`, `src-tauri/tauri.demo.conf.json`, `src-tauri/capabilities/desktop.json` oraz zakres okien w istniejącej capability dystrybucji.
- Logowanie i start: `src/main.tsx`, `src/App.tsx`, `src/aplikacja/logowanie/uwierzytelnianie.ts`, `klientTozsamosci.ts`, `projekcjaKont.ts`, `daneDesktop.ts`, `KontekstUzytkownika.tsx`, `stanKontekstuUzytkownika.ts`, `sesjaUzytkownika.ts`, `PanelLogowania.tsx` oraz `src/aplikacja/layout/NaglowekAplikacji.tsx`.
- Konta i profil: `src/kartoteki/uzytkownicy/magazynUzytkownikow.ts`, `typyUzytkownikow.ts`, `uprawnienia.ts`, `WidokUzytkownikow.tsx`, `WidokProfiluUzytkownika.tsx`, `PanelOperacjiKont.tsx`, `PanelResetowaniaHasel.tsx`, `PanelZmianyHasla.tsx`, `resetowanieHasel.css`.
- Uruchamianie i testy: `skrypty/kontaLokalne.mjs`, `skrypty/uruchomDemoDesktop.mjs`, odpowiednie skrypty `package.json`, nowy wpis ignorowania targetu Rust oraz `testy/resetowanieHasel.test.ts`, `resetowanieHasel.przegladarka.test.mjs`, `kontaDesktop.natywne.test.mjs`, `kontaDesktop.demo.test.mjs`, `monitorWysylek.test.ts`, `pakietowanieDesktop.test.mjs`, `v4Logowanie.test.mjs`.
- Rejestr interfejsu: odpowiednie wpisy w `docs/v4/manifest-widokow.json`, `docs/v4/rejestr-widokow.md` oraz niniejszy raport.

Working tree zawiera również zastane i przybyłe podczas pracy zmiany sortowania, dystrybucji, aktualizacji, Androida i CI. Zachowano je. Lista powyżej wskazuje zakres kont; nie przypisuje temu zadaniu całego wspólnego diffu.

## Ograniczenia i następny etap

- Granicą zaufania pozostaje konto systemu Windows. Operator tego konta i administrator systemu mogą czytać lub zmieniać jego pliki. DPAPI nie zapewnia niezależnej ochrony przed tym samym użytkownikiem systemowym.
- Dane biznesowe nadal używają istniejącego magazynu WebView2 i ochrony katalogu użytkownika Windows; nie zadeklarowano szyfrowania wszystkich dokumentów. Sesja i kopia migracyjna mają osobną ochronę DPAPI, a hasła — Argon2id.
- Oryginały legacy pozostają do odzyskania; nie usuwa się ich automatycznie po migracji. Kopia biznesowa nie jest kopią haseł ani przenośną kopią aktywnej sesji.
- Pełna edycja i zbiorczy import/restore kartoteki nadal mają dotychczasowe ograniczenie do DEMO. W trybie rzeczywistym działają pierwsza konfiguracja, odczyt kont, tworzenie niższych ról, logowanie, zmiana własnego hasła i reset. Nie otwarto niezaufanego zapisu ról z `localStorage`.
- Nie powstała usługa wielostanowiskowa. Lokalny transport HTTP jest ograniczony do loopback i właściwego originu; nie należy wystawiać go do sieci.
- Fundament jest sprawdzony do rozpoczęcia przygotowania **testowego instalatora Windows**. Instalacja na czystym systemie, aktualizacja zachowująca rzeczywiste dane i końcowa akceptacja produkcyjna pozostają osobnymi kontrolami. W tym zadaniu nie publikowano ani nie wydawano instalatora.
