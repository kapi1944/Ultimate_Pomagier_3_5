# Ultimate Pomagier 4.0.0 — Windows

## Zakres i wynik rozpoznania

Tauri 2 opakowuje ten sam statyczny build React/TypeScript/Vite z `dist/`. Nie dodaje serwera, Node.js, Git, telemetrii ani nowego magazynu domenowego. Dotychczasowe `npm run dev`, `npm run build` i katalog `launcher/` pozostają dostępne. Zmiana obejmuje powłokę, pakietowanie, ręczne aktualizacje i CI; nie stanowi pełnego audytu aplikacji.

Sprawdzono konfigurację Vite, launcher developerski, istniejący CI, źródła zasobów/runtime oraz bieżący rejestr i backupy. Fonty PDF, logotypy i worker PDF są lokalnymi zasobami builda. Operacyjne funkcje nie wymagają serwera; istniejący odnośnik do Google Drive wymaga internetu. Pobieranie plików Blob, drukowanie i otwieranie zewnętrznych stron wymagają osobnej akceptacji w WebView2.

Historyczny `docs/audyty/audyt-magazynow-danych.md` opisuje starszy stan; bieżący `rejestrDokumentow.ts` ma już schemat 3, historię i autosave. `backupDanych.ts` ma manifest, walidację i przywracanie z kopią przed operacją. Nadal istnieją klucze legacy i inne magazyny modułów. Powłoka nie konsoliduje ich ani nie zmienia ich migracji.

## Instalator i uruchomienie

- Docelowy plik: `Ultimate_Pomagier_4.0_Setup.exe` (wersja aplikacji 4.0.0).
- Windows x64, zalecany aktualny Windows 10/11. Inne architektury nie są pakietowane.
- NSIS `currentUser`: instalacja w `%LOCALAPPDATA%\Ultimate Pomagier`, bez żądania uprawnień administratora przez instalator aplikacji.
- Jedyny język instalatora: polski, w tym 27 dodatkowych komunikatów Tauri z `src-tauri/nsis/polski.nsh`. Standardowy szablon Tauri dodaje skrót menu Start oraz zaznaczone opcje skrótu pulpitu i uruchomienia na ekranie końcowym. Użytkownik może je odznaczyć.
- WebView2 Evergreen jest dołączony jako instalator offline. Instalator sprawdza runtime i instaluje go, gdy jest potrzebny. Polityki firmowe mogą zablokować instalację runtime; wymaga to testu na zarządzanym komputerze.
- Nie ma autostartu przy logowaniu do Windows. Uruchomienie po instalacji jest opcją instalatora.
- Plugin single-instance przenosi fokus do istniejącego okna, ograniczając równoczesne zapisy dwóch procesów.
- Ikony powstały z `public/logo-ultimate-pomagier.png` przez `tauri icon --fit contain`; zachowano pełną kompozycję.

## Budowanie

Wymagania wyłącznie na komputerze budującym: Node.js 24, npm, Rust stable MSVC, Visual Studio Build Tools z C++ i Windows SDK. `Cargo.lock` i `package-lock.json` utrwalają zależności; build używa `--locked`.

```powershell
npm ci
npm test
npm run lint
npm run build
npm run test:launcher
npm run test:desktop
npm run desktop:build
```

Pakiet testowy powstaje w `wydanie-desktop/testowe/Ultimate_Pomagier_4.0_Setup.exe`, obok sumy SHA-256. Aktualizacje są w nim wyłączone. Nie jest podpisanym wydaniem aktualizacyjnym. Wynik natywnego bundlera jest także w `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.

`npm run desktop:dev` używa Vite na `localhost:1420` ze strictPort, osobnego identyfikatora `pl.ultimatepomagier.desktop.dev` i osobnego profilu WebView2. Nie zmienia domyślnego portu launchera przeglądarkowego. Plik `src-tauri/tauri.dev.conf.json` służy tylko developmentowi, nigdy wydaniu.

Workflow `.github/workflows/desktop-windows.yml` buduje na `windows-2022`. Działa ręcznie, po push na `main` oraz dla PR do `main`, bez filtrów ścieżek. Testy aplikacji, lint, launcher, konfiguracja desktopowa, dystrybucja i format Rust muszą przejść przed budowaniem. Artefakt `Ultimate-Pomagier-Windows-<numer uruchomienia>` zawiera rzeczywisty instalator i sumę SHA-256; wygasa po 30 dniach. Push i PR przygotowują pakiet bez aktualizacji. Ręczne uruchomienie na tagu z `podpisane=true` przygotowuje podpisany pakiet wybranego kanału. Dodatkowe `publikuj=true` uruchamia publikację po udanym buildzie i przejściu ochrony środowiska `aktualizacje-windows`. Konfiguracja workflow nie oznacza wykonanego przebiegu CI.

## Logowanie i demonstracja

Usługa tożsamości nie jest podłączona: produkcyjne logowanie zwraca `NIEDOSTEPNE` i nie otwiera sesji. Kontrakt `UslugaTozsamosci` wymaga uwierzytelnienia, weryfikacji sesji i wylogowania po stronie prawidłowej usługi. Jej wdrożenie pozostaje blokerem pracy produkcyjnej.

`npm run dev:demo` udostępnia jawnie oznaczoną demonstrację wyłącznie w serwerze deweloperskim na interfejsie lokalnym. Wymagane są jednocześnie `DEV`, tryb `demonstracyjny` i jawna flaga demo. Statyczny build demonstracyjny (również istniejąca komenda `build:demo`) jest odrzucany. Zwykły build oraz instalator nie przyjmują demonstracyjnej sesji z localStorage. Nie używaj demonstracji do przechowywania rzeczywistych danych firmy.

Odciski SHA-256 źródeł `src/` i panelu logowania trafiają do wspólnego `wersja.json`, wraz z wersją, commitem i oznaczeniem zmienionych źródeł. Kontrola Tauri porównuje te same metadane z frontendem przed przygotowaniem artefaktu. Vite pomija obserwację `src-tauri/target/` i `wydanie-desktop/`, żeby równoległa kompilacja Rust i zapis instalatora nie blokowały serwera deweloperskiego na Windows.

## Podpisane aktualizacje Windows

Windows workflow przygotowuje i testuje artefakty; nigdy sam nie publikuje produkcji. Wspólny workflow dystrybucji przekazuje przez workflow_call podpisane=true, kanal=stabilny oraz opis_zmian i przygotowuje szkic Windows/Android/WEB. Osobny workflow publikacja-wydania wymaga ręcznej akceptacji oraz środowiska wydania-produkcyjne. Po sprawdzeniu trzech platform, podpisu, zgodności metadanych i rosnącej wersji publikuje istniejący szkic, a następnie aktualizuje windows-stabilny.json w technicznym prerelease windows-aktualizacje.

Klucze Tauri przekazuje się przez istniejące sekrety i zmienną publicznego klucza; nie wolno zastępować użytej wcześniej pary. Wersja X.Y.Z musi być wyższa niż wszystkie poprzednie wydania obu kanałów. Pierwsza instalacja z wyłączonym updaterem wymaga ręcznej instalacji podpisanego pakietu bez usuwania danych. Samo przygotowanie szkicu nie potwierdza odbioru instalacji ani zachowania danych.

Panel pozwala wybrać kanał stabilny lub testowy, obejrzeć opis, pobrać podpisany pakiet i osobno zatwierdzić instalację po zapisaniu formularzy i kopii danych. Wersja, kanał, commit i zgodność danych są sprawdzane przed pobieraniem. Kanał testowy jest obsługiwany przez build i klienta; centralny proces publikacji produkcyjnej obsługuje wyłącznie stabilne wspólne wydania. Nie ma niezależnego publikatora produkcyjnego Windows.

Migracja URL repozytorium wymaga potwierdzenia kompatybilności istniejących instalacji. Do tego czasu zachowujemy dotychczasowy endpoint i identyfikator pl.ultimatepomagier.desktop. Nie wolno uznawać samego przekierowania GitHub za test aktualizacji.

## Dane i granice aktualizacji

Identyfikator produkcyjny `pl.ultimatepomagier.desktop`, etykieta okna `main` i `useHttpsScheme: true` są trwałym kontraktem. Origin desktopowy Windows to `https://tauri.localhost`, a domyślny profil WebView2 znajduje się pod `%LOCALAPPDATA%\pl.ultimatepomagier.desktop`. Profil jest oddzielony od Edge/Chrome i od instalacji plików EXE. Nie wolno zmieniać tożsamości, schematu URL ani katalogu profilu w kolejnych wydaniach bez osobnej migracji.

Instalator zastępuje pliki aplikacji. Kod pakietowania i aktualizacji nie czyści localStorage, dokumentów, draftów, konfiguracji, historii ani profilu. Standardowy NSIS Tauri używa `/UPDATE` i pomija usuwanie danych podczas aktualizacji. Zwykłe odinstalowanie ma osobną, domyślnie niezaznaczoną opcję usunięcia danych — nie należy jej wybierać, jeśli dane mają pozostać.

Dane przeglądarkowe nie są automatycznie widoczne w desktopie. Nie skanujemy profili Chrome/Edge i nie kopiujemy LevelDB. Istniejący eksport/import w Ustawieniach → Dane pozostaje jedyną ścieżką ręcznego przeniesienia, po sprawdzeniu manifestu i treści na kopii testowej. Testy restore nie dowodzą jeszcze akceptacji przeniesienia między rzeczywistą przeglądarką a WebView2.

Zachowanie profilu nie gwarantuje zapisania zmian pozostających wyłącznie w pamięci formularza. Instalacja jest jawna i przypomina o zapisie oraz backupie. Ochrona nie obejmuje awarii dysku, ręcznego kasowania profilu ani niezgodnej przyszłej migracji domenowej.

## Akceptacja przed dystrybucją operacyjną

Wymagane na standardowym koncie Windows i danych testowych:

- świeża instalacja bez Node/Git, język polski, oba skróty, opcja uruchomienia, brak UAC dla aplikacji;
- instalacja WebView2 na maszynie bez runtime, także bez sieci i przy firmowych politykach;
- uruchomienie, ponowne uruchomienie, single-instance, import pliku, fonty, druk/PDF/DOCX i zapis pobieranych plików;
- dokumenty, historia, drafty i konfiguracja przed oraz po aktualizacji rzeczywistym podpisanym kolejnym wydaniem;
- odrzucenie uszkodzonej paczki, podpisu innym kluczem i brakującego podpisu; błąd sieci, „Później”, ponowna próba, restart po instalacji;
- oddzielenie profilu przeglądarki, desktop development i desktop production; kontrolowany import istniejącego backupu.

`npm run test:desktop` obejmuje wersje, oba kanały, deklarację zgodności, blokadę po błędzie podpisu, konfigurację Tauri oraz blokady publikacji. `npm run test:aktualizacje:przegladarka` uruchamia rzeczywisty interfejs React w Edge z atrapą IPC Tauri; wymaga dostępnego `playwright` (lub `POMAGIER_PLAYWRIGHT` wskazującego zewnętrzny pakiet). Sprawdza wykrycie wydania, brak aktualizacji, oba kanały, niezgodne dane, opis zmian, postęp, blokadę instalacji po błędzie podpisu, ponowne pobranie, odmowę zgody, błąd instalatora, błąd sieci i niezmienność testowego localStorage. Atrapa IPC nie wykonuje kryptografii, instalacji NSIS ani restartu. Odbiór dwóch rzeczywistych podpisanych wydań, brakującego/błędnego podpisu i zachowania kont SQLite/DPAPI oraz profilu WebView2 pozostaje wymagany przed pracą operacyjną.

Pozostałe ograniczenia poza zakresem powłoki: manifest backupu nadal używa historycznej etykiety `ultimate-pomagier-3.5` (nie jest źródłem wersji desktopowej), Vite ostrzega o dużym głównym bundle, a npm podczas instalacji zależności zgłosił 36 podatności (28 moderate, 8 high). Nie przeprowadzano audytu ani aktualizacji całego drzewa zależności.

Źródła mechanik Tauri: [instalatory Windows](https://v2.tauri.app/distribute/windows-installer/), [podpisane aktualizacje](https://v2.tauri.app/plugin/updater/), [referencja konfiguracji](https://v2.tauri.app/reference/config/). Konkretną konfigurację i zachowanie opisane powyżej należy oceniać razem z kodem tego repozytorium i wynikami testów.

## Lista plików etapu 4.0.0

```text
.github/workflows/ci.yml
.github/workflows/desktop-windows.yml
.gitignore
docs/desktop-windows.md
eslint.config.js
package-lock.json
package.json
skrypty/budujDesktop.mjs
src-tauri/Cargo.lock
src-tauri/Cargo.toml
src-tauri/build.rs
src-tauri/capabilities/desktop.json
src-tauri/icons/128x128.png
src-tauri/icons/icon.ico
src-tauri/nsis/polski.nsh
src-tauri/src/main.rs
src-tauri/tauri.conf.json
src-tauri/tauri.dev.conf.json
src/aplikacja/desktop/PanelAktualizacji.tsx
src/aplikacja/desktop/aktualizacjeDesktop.ts
src/aplikacja/ustawienia/WidokUstawien.tsx
testy/aktualizacjeDesktop.test.ts
testy/pakietowanieDesktop.test.mjs
```

## Wyniki lokalne — 2026-10-22

- `npm test`, `npm run lint`, `npm run build`: PASS.
- `npm run test:launcher`: PASS (testy Node oraz skrypt PowerShell).
- `npm run test:desktop`: PASS, 5 testów konfiguracji i 3 testy aktualizacji.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: PASS.
- `npm run desktop:build`: PASS, rzeczywisty build Rust MSVC i NSIS. Na tym stanowisku użyto Rust 1.99.1 w ignorowanym `.desktop-tools/`, bez zmiany systemowego PATH.
- Kontrola artefaktu: poprawny nagłówek PE, aplikacja x64, zgodna suma SHA-256. W wygenerowanym skrypcie NSIS potwierdzono `currentUser`, poziom `user`, polski język i własne tłumaczenia, skróty, uruchomienie po instalacji i warunek pomijający usuwanie profilu podczas `/UPDATE`. To kontrola artefaktu i skryptu, a nie wykonana aktualizacja zainstalowanej aplikacji.

Plik: `wydanie-desktop/testowe/Ultimate_Pomagier_4.0_Setup.exe`, **223 256 460 bajtów** (około 213 MiB).

SHA-256: `d0cbdeb9d850bd2fc52db064fdceb61616c3fa1654ba4339cbc1c7dbe7a1dcea`.

Status Authenticode: `NotSigned`. Pakiet testowy ma wyłączone aktualizacje; nie utworzono klucza produkcyjnego ani podpisanej paczki aktualizacyjnej. Nie wykonano instalacji na koncie współpracownika, akceptacji interfejsu WebView2 ani rzeczywistej aktualizacji między dwoma podpisanymi wydaniami. CI przygotowano, ale nie uruchomiono zdalnie. Nie wykonano push ani publikacji.

**Gotowość: pakiet do testów instalacyjnych. Dystrybucja operacyjna wymaga konfiguracji kluczy i wykonania opisanej akceptacji Windows, w tym zachowania danych po aktualizacji.**

## Wyniki lokalne etapu aktualizacji — 2026-10-25

- `npm test`, `npm run lint`, `npm run build`: PASS. Zarejestrowano nowy panel opisu zmian w obowiązującym manifeście widoków V4. Build zgłasza istniejące ostrzeżenia o wielkości paczki i mieszanym imporcie API Tauri.
- `npm run test:desktop`: PASS, 15 testów, w tym oba kanały, zgodność danych, blokady podpisanego wydania i publikacji. Testy metadanych oraz pakietowania nie wymagają już stałej wersji `4.0.0`, więc nie blokują następnego numeru wydania.
- `npm run test:dystrybucja`: PASS, 13 testów istniejącego rejestru i dystrybucji.
- `npm run test:aktualizacje:przegladarka`: PASS, rzeczywisty Edge i React z atrapą IPC Tauri. Dane testowego localStorage pozostały identyczne; nie jest to próba migracji zainstalowanej aplikacji.
- Natywne testy `offline_tests` z lokalnie zainstalowanego źródła `tauri-plugin-updater 2.14.0`: PASS, 10 testów. Uruchomiono `cargo test --manifest-path .desktop-tools/cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-plugin-updater-2.14.0/Cargo.toml --locked --lib offline_tests` z lokalnym Rust i CARGO_HOME. Testy używają publicznych wektorów testowych pluginu, sprawdzają rzeczywistą kryptografię: zmianę bajtów paczki, niepoprawny podpis/klucz, podpis bez wersji oraz niezgodność wersji z podpisem. Log: `.desktop-tools/testy-podpisu-tauri.log`. Pierwsza próba offline wymagała brakujących zależności testowych; ponowienie z pobraniem zależności i `--locked` przeszło. Nie modyfikowano źródeł pluginu ani nie generowano kluczy produkcyjnych.
- `actionlint` dla zmienionego workflow i wywołującego `dystrybucja.yml`: PASS. `git diff --check`: PASS.
- Brak sekretów, zmiennej klucza i wydań GitHub uniemożliwia odbiór publikacji na rzeczywistych artefaktach. Nie uruchomiono zdalnego Actions, podpisanego builda produkcyjnego, instalacji aktualizacji, restartu ani kontroli danych WebView2/SQLite/DPAPI po aktualizacji. Nie deklarujemy tych etapów jako zaliczonych.
- Praca na `main`, bez commita, push, tagowania, publikacji i tworzenia worktree. Zastaną zmianę w `src/kartoteki/uzytkownicy/widokUzytkownikow.css` pozostawiono poza zakresem.

## Konsolidacja publikacji — 2026-10-28

Obowiazujacy proces: desktop-windows.yml tylko buduje i testuje; dystrybucja.yml przygotowuje wspolny szkic trzech platform; publikacja-wydania.yml osobno zatwierdza publikacje i aktualizuje manifest stabilnego kanalu. Wczesniejszy opis publikuj=true oraz samodzielnej publikacji Windows jest nieaktualny. Testowy kanal pozostaje dostepny w buildzie i panelu; nie otrzymuje niezaleznego publikatora produkcyjnego. Migracja nazwy repozytorium wymaga potwierdzonej zgodnosci starych instalacji; w tym etapie nie publikujemy wydania.
