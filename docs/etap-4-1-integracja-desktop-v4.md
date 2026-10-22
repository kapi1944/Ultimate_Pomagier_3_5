# Etap 4.1 — integracja V4 i Tauri

Stan: źródła zintegrowane, frontend produkcyjny sprawdzony w Edge. Instalator i uruchomienie Tauri pozostają niezweryfikowane. Na polecenie użytkownika zakończono po zgłoszeniu blokady narzędzia przez Windows.

## Przyczyna i historia

- Początkowe drzewo robocze było czyste, aktywna gałąź: `feat/ultimate-pomagier-v4`.
- V4: `4d7028dbdaea188caa8fc7353a5a4bb55ac02a7f`.
- Lokalny `main` i zapisany `origin/main`: `2b9769f92a7f660ab46e36d36635394855e56c3d`.
- Wspólny przodek: `19a9427010ffe758284f658b2f81efead181533a`.
- V4 zawiera 16 kolejnych commitów interfejsu i funkcji. `main` zawiera jeden osobny commit dodający desktop do starszego frontendu. Numer 4.0.0 pakietu Tauri nie oznaczał obecności frontendu V4.
- Nie wykonywano ponownego audytu całej aplikacji ani pobierania nowych referencji Git. Podane HEAD dotyczą stanu lokalnego na początku zadania.

Utworzono `codex/integracja-v4-desktop` z HEAD V4 i wykonano `git merge --no-ff --no-commit refs/heads/main`. Jedyny konflikt tekstowy dotyczył `package.json`: zachowano wszystkie testy V4 i dołączono skrypty oraz zależności desktopu. Integracja zachowuje obie historie; nie zastępowano komponentów V4 wersjami V3.

## Wersja i wspólny frontend

`package.json` jest źródłem numeru 4.0.0. Nazwa produktu `Ultimate Pomagier 4.0` wynika z tej wersji. Tauri odczytuje numer bezpośrednio z `../package.json`; wymagana przez Cargo kopia numeru jest kontrolowana przed pakietowaniem oraz testem. Stabilne `productName`, identyfikator aplikacji i nazwa folderu instalacji pozostają zachowane, aby nie zmieniać tożsamości instalacji.

`skrypty/informacjeOWersji.mjs` dostarcza wspólne metadane dla Vite i procesu pakietowania. Nagłówek, logowanie, menu, tytuł strony i ustawienia korzystają z tej informacji. Diagnostyka zawiera pełny commit i oznaczenie niezacommitowanych źródeł. Vite zapisuje `dist/wersja.json`. Pakietowanie porównuje ten manifest z bieżącym buildem i dołącza manifest z sumą instalatora do artefaktów.

Tauri nadal wykonuje `npm run build` przez `beforeBuildCommand`, a następnie pakuje `../dist`. Przeglądarka i desktop mają wspólny kod oraz build Vite. Nie zmieniono formularzy, generatorów, modeli, migracji ani magazynów. Kod w `src/moduly/` oraz `src/wspolne/` jest identyczny z wejściowym V4.

Zachowano konfigurację NSIS, offline WebView2, CSP, uprawnienia IPC, single-instance i weryfikację podpisanych aktualizacji. Poza odwołaniem do wersji w `tauri.conf.json` pliki `src-tauri/` są identyczne z `main`. Testowe pakiety nadal mają wyłączone aktualizacje; nie tworzono kluczy ani wydania produkcyjnego.

## Pochodzenie poprzedniego instalatora

Historia jednoznacznie potwierdza starszą bazę frontendu w `main`. Poprzedni proces nie zapisywał commita w instalatorze ani manifeście, więc samego numeru 4.0.0 nie można użyć do ustalenia pochodzenia starego pliku EXE. W sprawdzonych lokalizacjach bieżącego środowiska nie znaleziono poprzedniego instalatora ani wpisu instalacji w HKCU. Nie można rozstrzygnąć, czy konkretny plik użytkownika zawierał dodatkowo wcześniejsze `dist`.

Nowy build przeglądarkowy utworzono z bieżących źródeł. Identyfikator jego końcowego commita znajduje się w `dist/wersja.json`; przy niezacommitowanych źródłach manifest jawnie to sygnalizuje. Nie usuwano danych lokalnych ani profilu WebView2 i nie uruchamiano deinstalatora.

## Weryfikacja

- `npm run lint`: PASS.
- `npm run build`: PASS; pozostaje ostrzeżenie o dużym chunku.
- `npm run test:desktop`: PASS, 10 testów konfiguracji, aktualizacji i metadanych.
- Test logowania V4 po dostosowaniu do wspólnej wersji: PASS.
- `npm run test:launcher`: PASS poza sandboxem. Pierwsza próba w izolacji sieciowej nie rozpoznała lokalnego serwera.
- `npm test`: FAIL w istniejącym preteście `generatoryOperacyjne.test.ts`, oczekiwanie indeksów `[0, 27, 54]`, wynik `[0, 28, 56]`.
- Uruchomiono również wszystkie 60 poleceń głównego skryptu testowego, niezależnie od zatrzymującego pretestu. 56 przeszło za pierwszym razem; test logowania po poprawce przeszedł ponownie. Pozostałe trzy niepowodzenia istnieją w obszarach niezmienianych przez integrację: `wygladListyObecnosci.test.ts` (55.15696 zamiast 62.8), `checklistaPublikacji.regresja.test.ts` (brak mocka `window.matchMedia`) i `v4Rejestr.test.mjs` (brak istniejących plików `MonitorWysylek.tsx` oraz `TrescStopkiOrganizatora.tsx` w rejestrze). Nowy panel aktualizacji został jawnie wpisany do rejestru V4. Nie korygowano logiki generatorów ani niezwiązanych testów.
- Produkcyjny `dist` uruchomiono w izolowanych kontekstach Edge 155 przy 1440×960, 1280×720 oraz minimalnym oknie Tauri 1024×700: logowanie i Pulpit PASS, brak błędów JavaScript, widoczna marka 4.0. Góra tytułu Pulpitu: odpowiednio 103.44, 101.84 i 101.84 px; dół górnego paska: 81.84 px. Zasłanianie tytułu nie wystąpiło, nie wprowadzano zmian CSS. Zrzuty i skrypt pomiarowy pozostają w ignorowanym `tmp/`.

## Ograniczenie Windows

Za zgodą użytkownika pobrano brakujące zależności npm i lokalny Rust MSVC do ignorowanego `.desktop-tools/`, bez zmiany systemowego PATH. Rozpoczęto również instalację wymaganych Visual Studio Build Tools. `rustc` zgłasza wersję 1.99.1. Windows blokuje wykonanie `cargo` błędem 4551: „Zasady kontroli aplikacji zablokowały ten plik”. `npm run desktop:build` zatrzymuje się na `cargo metadata`, przed kompilacją i pakietowaniem. Nie obchodzono zabezpieczeń Windows.

**Nowy instalator nie powstał.** Docelowa ścieżka po usunięciu blokady i udanym buildzie: `wydanie-desktop/testowe/Ultimate_Pomagier_4.0_Setup.exe`. Nie jest to odnośnik do istniejącego nowego artefaktu.

Nie potwierdzono uruchomienia V4 we właściwym Tauri/WebView2 ani instalacji EXE. Potwierdzona jest zgodność źródeł i konfiguracji wspólnego frontendu oraz działanie produkcyjnego frontendu w Edge. Pełne potwierdzenie desktop–przeglądarka wymaga dopuszczonego Rust MSVC, udanego builda NSIS i uruchomienia instalatora. Nie wykonywano push ani publikacji.

## Pliki

Pliki przejęte z desktopowego commita `main`:

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

Dodatkowe pliki etapu 4.1:

```text
docs/etap-4-1-integracja-desktop-v4.md
docs/v4/manifest-widokow.json
docs/v4/rejestr-widokow.md
index.html
skrypty/informacjeOWersji.mjs
skrypty/informacjeOWersji.d.mts
src/aplikacja/wersjaAplikacji.ts
src/aplikacja/layout/NaglowekAplikacji.tsx
src/aplikacja/logowanie/PanelLogowania.tsx
src/aplikacja/menu/MenuBoczne.tsx
testy/wersjaAplikacji.test.mjs
testy/v4Logowanie.test.mjs
vite.config.ts
```

Ponadto lokalnie dostosowano przejęte pliki: skrypty i nazwę pakietu, lockfile, konfigurację wersji Tauri, pakietowanie, diagnostykę ustawień, test konfiguracji oraz workflow przechowujący manifest wydania.
