# Raport dystrybucji wieloplatformowej — 2026-10-25

**Stan: implementacja częściowa. Brak akceptacji produkcyjnej.** Na polecenie użytkownika wstrzymano edycje wspólnych plików, ponieważ w tym samym repozytorium trwa równoległa praca.

## Potwierdzony punkt bazowy

- Gałąź `main`, HEAD `9decff6f5c1e26f0407f6212c44861aa8ab0c3f7`; nie zmieniono gałęzi ani historii.
- Na początku istniały lokalne zmiany kont/logowania i 35 zmienionych lub nowych plików. Zachowano ich kopię wraz z SHA-256 oraz patchem w `.desktop-tools/dystrybucja-start-2026-10-25/`.
- Nie wykryto aktywnego merge/rebase/cherry-pick/revert ani konfliktów indeksu. Końcowa kontrola również nie wykazała takich operacji.
- Repozytorium GitHub jest publiczne. Odczyt rzeczywistego GitHub Releases zwrócił pustą listę. Nie dodano fikcyjnych instalatorów.
- W trakcie pracy zmieniały się także pliki kont, profili i sesji, m.in. `src-tauri/src/lib.rs`, `konta_desktop.rs`, `ochrona_lokalna.rs`, konfiguracje capabilities oraz pliki logowania. Użytkownik potwierdził równoległą pracę i polecił wstrzymać edycje plików wspólnych. Poniższe wyniki odnoszą się do sprawdzonych w danym momencie źródeł, nie do dowolnych późniejszych zmian.

## Zaimplementowano i sprawdzono lokalnie

- Sekcję **Aktualizacje i wersje** w ustawieniach i dostęp do centrum pobierania przed logowaniem. Wspólny panel zawiera aktualną kompilację, platformę/architekturę, kafelki, opis zmian, informacje o podpisach, historię, stany offline i błędów oraz blokadę starszych wersji.
- Rejestr oparty na publicznym GitHub Releases, z manifestem w opisie wydania i kontrolą rzeczywistych assets: stan publikacji, rozmiar, SHA-256, dozwolony adres i metadane podpisu. Ponowną kontrolę dostępności przed przekazaniem pobrania do przeglądarki.
- Konfigurację Tauri 2 mobile i wspólny punkt wejścia Rust. Oddzielenie desktopowego updatera/single-instance od Androida; mobilny katalog istniejącej bazy kont. Dotychczasowy silnik dokumentów i trwałe modele biznesowe nie zostały zmienione przez to zadanie.
- Skrypty numeracji Android versionCode, inicjalizacji projektu, generowania ikon z oryginalnego logo, release APK, `zipalign`/`apksigner`, kontroli certyfikatu, pakietu i wersji oraz tworzenia metadanych. Skrypty WEB ZIP, metadanych Windows, łączenia i weryfikacji artefaktów.
- Workflow przygotowujący trzy platformy i szkic wydania oraz osobny workflow publikacji po jawnym zatwierdzeniu. Nie uruchomiono ich zdalnie.

| Kontrola | Rzeczywisty wynik |
| --- | --- |
| `npm run test:dystrybucja` | PASS: 10 testów logiki, API, certyfikatów, versionCode, zbierania artefaktów i manifestu/publikacji |
| `npm run test:dystrybucja:przegladarka` | PASS: Edge headless, widok Android 390×844 oraz Windows 1440×1000; rekomendacja platformy, historia, pobieranie kontrolowanego pliku testowego, wycofanie, offline, brak poziomego przewijania i błędów JS |
| `npm run test:desktop` | PASS: 13 testów, przed kolejnymi zmianami równoległymi w pakietowaniu/kontach |
| `npm run lint` | PASS na sprawdzonym stanie, w tym po ostatniej zmianie panelu wersji |
| `npm run build` / frontend z `desktop:build` | PASS TypeScript i Vite; pozostają ostrzeżenia o dużym bundle i współdzielonym imporcie Tauri |
| `cargo check --locked` | PASS dla Windows przed dalszymi zmianami kont; nie jest dowodem akceptacji późniejszego drzewa |
| Kompilacja Rust `aarch64-linux-android` | PASS w profilu debug; powstała `libpomagier_aplikacja.so`, 147051272 bajty |
| Actionlint 1.7.12 | PASS: wszystkie cztery workflow projektu, bez uruchamiania CI |
| `git diff --check` | PASS w końcowej kontroli |

Test przeglądarkowy pobierał wyłącznie kontrolowany plik fixture. Nie jest to test rzeczywistego EXE/APK z GitHub, ponieważ nie ma tam opublikowanych instalatorów. Dane syntetyczne pozostają w testach; nie są listą wydań aplikacji.

## Niedokończone i wymagające wspólnej integracji

1. **Logowanie Android a profile Windows.** Obecne `daneDesktop.ts` rozpoznaje desktop przez samo `isTauri()`. `klientTozsamosci.ts` po odczycie sesji wywołuje `otworzObszarKonta()`, co na Androidzie prowadzi do komendy `otworz_obszar_konta`, dostępnej wyłącznie w gałęzi desktopowej Rust. Trzeba oddzielić wykrywanie natywnej aplikacji od Windows, zachować pierwszą konfigurację Androida, a operacje profili/DPAPI ograniczyć do Windows. Nie edytowano dalej tych plików po poleceniu wstrzymania.
2. **Rejestr V4.** Pierwsze pełne `npm test` zatrzymało się na brakującym wpisie nowego `PanelWersji.tsx`; wpis dodano. Następna kontrola `v4Rejestr.test.mjs` wykazała brak wpisu pojawiającego się równolegle `PanelZmianyHasla.tsx`. Pełny zestaw pozostaje bez wyniku PASS. Po uzgodnieniu wspólnego stanu trzeba uzupełnić rejestr także o aktualne powierzchnie logowania i ponownie wykonać pełne testy.
3. **Aktualny EXE.** Pierwszy `desktop:build` zatrzymał się na trzech błędach typów w równolegle dodawanych plikach kont/DPAPI. Późniejszy odczyt pokazał ich poprawione wersje. Kolejny build przeprowadził frontend i rozpoczął Rust, ale został przerwany po potwierdzeniu równoległej pracy. Nie potwierdzono nowego instalatora odpowiadającego końcowemu drzewu. Starszy EXE nie jest dowodem tego zadania.
4. **Pakowanie Android na tym Windows.** `android:build:test` skompilował natywną bibliotekę, lecz Tauri nie mógł utworzyć dowiązania do JNI: `Creation symbolic link is not allowed for this system.` Nie zmieniono ustawień Windows. APK nie powstał. Opisany workflow Linux omija zależność od tego uprawnienia Windows, ale nie został uruchomiony.
5. **Watcher developmentu.** Podczas lokalnej kompilacji Vite próbował obserwować pobrany do `.desktop-tools` NDK i zgłosił `EBUSY` dla `clang++.exe`. Narzędzia przeniesiono poza repozytorium do standardowego SDK `C:\Users\Kacper\AppData\Local\Android\Sdk\ndk\27.2.12479018`. Nie zmieniano wspólnej konfiguracji Vite. Wymaga to uwzględnienia standardowego `NDK_HOME` przy kolejnym uruchomieniu.

## Oczekujące na sekrety, publikację i urządzenia

- W lokalnym środowisku nie skonfigurowano klucza Android, haseł, aliasu ani zatwierdzonego odcisku certyfikatu. Nie skonfigurowano także lokalnych kluczy podpisanych aktualizacji Tauri. Nie odczytywano wartości sekretów i nie tworzono zastępczych kluczy produkcyjnych. Stan sekretów w GitHub nie był potwierdzany.
- Nie powstał podpisany produkcyjny APK ani podpisane aktualizacyjne wydanie Windows. Konfiguracja poleceń nie oznacza wykonanej weryfikacji kryptograficznej realnych instalatorów.
- Nie było podłączonego urządzenia Android ani skonfigurowanego AVD. Nie wykonano instalacji, aktualizacji, testu zachowania danych, testów generatorów/importów/eksportu w Android WebView ani dotykowej akceptacji aplikacji. Testy te są **NIEWYKONANE**.
- Nie wykonano instalacji/aktualizacji aktualnego EXE ani akceptacji Windows/WebView2 z danymi testowymi. Nie wdrożono WEB; produkcyjne logowanie w przeglądarce nadal wymaga zaufanej usługi.
- Nie uruchomiono GitHub Actions, nie utworzono szkicu GitHub Release, nie opublikowano wydania, nie zmieniono widoczności repozytorium. Nie wykonano commita, tagu, push, resetu, rebase ani nowego worktree.

## Pliki tego zakresu

Frontend: `src/aplikacja/desktop/PanelWersji.tsx`, `rejestrWydan.ts`, `panelWersji.css`; integracja w `WidokUstawien.tsx` i `PanelLogowania.tsx`; ograniczenie natywnego zoomu w `skalaInterfejsu.ts`. Rejestr widoków: `docs/v4/manifest-widokow.json`, `rejestr-widokow.md`.

Native: wspólny `src-tauri/src/lib.rs`, launcher `main.rs`, wpis `[lib]` i zależności w Cargo, `tauri.android.conf.json`, zakres platform desktopowej capability, `capabilities/dystrybucja.json`, CSP GitHub. Pliki wspólne zawierają również pracę równoległą; nie należy stage'ować ich całego diffu jako wyłącznie tego zadania.

Budowanie: `skrypty/budujAndroid.mjs`, `dystrybucja.mjs`, `zatwierdzWydanie.mjs`, rozszerzenie `budujDesktop.mjs`; `package.json`/lock, Cargo.lock, `.gitignore`; dwa nowe workflow i rozszerzenia istniejących. Testy: `rejestrWydan.test.ts`, `dystrybucja.test.mjs`, `dystrybucja.przegladarka.test.mjs`. Dodano plugin Tauri opener do uruchamiania wyłącznie instalatorów dozwolonego repozytorium w przeglądarce systemowej; nie dodano bibliotek UI.

Instrukcja kluczy, instalacji, aktualizacji i dwóch etapów publikacji: [dystrybucja-wieloplatformowa.md](dystrybucja-wieloplatformowa.md).

**Następny warunek wznowienia:** uzgodniony stan wspólnych plików kont/logowania i pakietowania. Potem integracja granic Windows/Android, pełne kontrole, rzeczywiste instalatory, podpisy i akceptacja urządzeń. Sam panel pobierania nie kończy wdrożenia.
