# Gotowość pierwszego wydania Ultimate Pomagier 4.0

Data: 2026-10-25. Wersja: **4.0.0**. Punkt bazowy: `main`, `8553140ef612c3f9ee96e16883278c54a97b0de9`, początkowo czyste drzewo zgodne z `origin/main`.

Wykorzystano cztery wskazane raporty/instrukcje oraz rzeczywiste wyniki Actions. Rozpoznanie ograniczono do instalatorów, kont natywnych, aktualizacji i publikacji. Nie przebudowywano modułów biznesowych ani logowania. Nie instalowano niczego na danych użytkownika.

## A. Windows

### Instalator i pochodzenie

| Właściwość | Potwierdzony wynik |
| --- | --- |
| Workflow | [Instalator Windows, 40205111418](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40205111418), **SUCCESS**, próba 1 |
| Commit źródłowy | `8553140ef612c3f9ee96e16883278c54a97b0de9` |
| Artefakt Actions | `Ultimate-Pomagier-Windows-8`, ID `12602839451`, nie wygasł podczas kontroli |
| Plik | `Ultimate_Pomagier_4.0_Setup.exe` |
| Rozmiar EXE | **227 278 941 bajtów** |
| ProductVersion / FileVersion | **4.0.0 / 4.0.0** |
| ProductName / FileDescription | `Ultimate Pomagier` |
| SHA-256 EXE | `4a893fa2cf43807f4ebe8a461fb84abd3cff54a31bb6abff15a2aaecfbc303c6` |
| Lokalizacja lokalna | `C:\GitHub\Projects\Ultimate_Pomagier_3_5\wydanie-desktop\actions-40205111418\testowe\Ultimate_Pomagier_4.0_Setup.exe` |
| Metadane | Sąsiednie `wersja.json` i `.exe.sha256`: zgodne z rzeczywiście obliczoną sumą, wersją i commitem; `zmienioneZrodla: false` |
| Podpis aktualizacji Tauri | Brak — świadomie testowy pakiet, updater wyłączony |
| Authenticode | **NotSigned**, sprawdzono rzeczywisty EXE |

Archiwum pobrano i rozpakowano. ZIP ma 227 329 865 bajtów, SHA-256 `6f34f21fd209864b8ca218f71b4b5a7040e56a417e0a6786df0e36283ad960a4`, zgodny z digestem artefaktu Actions. Pobieranie: [artefakt Windows](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40205111418/artifacts/12602839451) po zalogowaniu do GitHub; deklarowany termin wygaśnięcia: **2026-11-24 15:14:18 UTC**. Nie jest to publiczny instalator z GitHub Releases.

Różnica `zrodlaSha256` między lokalnym frontendem (`15b34f17…`) i Actions (`e2b99974…`) wynika z zakończeń linii: przeliczenie lokalnych tekstów jako CRLF, z zachowaniem bajtów plików binarnych, daje dokładnie hash Actions. Hash panelu logowania jest identyczny. Nie stwierdzono rozjazdu treści wymagającego ponownego budowania EXE.

Instalatora Windows nie kompilowano ponownie. Lokalna poprawka opisana w sekcji Android zmienia linkowanie wyłącznie dla `CARGO_CFG_TARGET_OS=android`; EXE pozostaje artefaktem commita bazowego, a nie późniejszego lokalnego commita.

### Instalacja, konta i dane

Pełny test instalacyjny aktualnego EXE: **NIEWYKONANY**. Host to Windows 11 Home, bez Windows Sandbox i dostępnej maszyny Hyper-V; istnieje instalacja Ultimate Pomagiera 4.0.0 w profilu użytkownika. Nie uruchamiano na niej instalatora ani deinstalatora.

Nie potwierdzono dla tego EXE: instalacji, logo w uruchomionej aplikacji, skrótu na pulpicie, Menu Start, startu bez Node.js/terminala, pierwszej konfiguracji, logowania/wylogowania, zapamiętania sesji, zapisu/restartu, odinstalowania i ponownej instalacji z ochroną danych. Konfiguracja NSIS i testy pakietowania potwierdzają zamiar tych zachowań, nie ich wykonanie przez instalator.

Raport integracji z 25 października zawiera wcześniejszy PASS rzeczywistego WebView2 na osobnej kompilacji testowej: pierwsze konto offline, migracja, zadanie zapisane przez UI, restart, trwałość, zapamiętana sesja, zmiana hasła i izolacja dwóch profili. Zachowano ten dowód bez powtarzania testu; nie przeniesiono jego wyniku na akceptację instalatora NSIS. Po obecnej poprawce wykonano także test Rust DPAPI: odtworzenie danych i odrzucenie uszkodzonego zapisu — PASS.

### Aktualizacje

Zachowano jeden Tauri Updater. Podpisany build konfiguruje endpoint `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/latest/download/latest.json`, klucz publiczny i podpis artefaktu. Kontrola wersji odrzuca starsze i niestabilne wydania. Pobranie i sprawdzenie podpisu poprzedza instalację; błąd pobrania blokuje jej wywołanie. UI wymaga działania użytkownika, umożliwia odłożenie, komunikuje błąd i zaleca zapis formularzy oraz kopię danych.

Testy tych reguł przeszły. W pakiecie testowym aktualizacje są wyłączone, a Releases jest pusty. **Nie potwierdzono rzeczywistej podpisanej aktualizacji**, zachowania danych w jej trakcie ani odzyskania działania po przerwaniu instalatora. Nie ma potwierdzonego automatycznego rollbacku. Bezpieczna procedura odbioru wymaga kopii danych i próby ponownej instalacji zatwierdzonego pakietu bez usuwania danych; nie należy wykonywać downgrade'u bez potwierdzenia zgodności danych.

## B. Android

### Wykryty problem i minimalna poprawka

Pierwotny APK istniał, miał poprawny podpis debug, manifest i arm64, lecz `llvm-readelf` wykazał **wyrównanie segmentów ELF 0x1000 (4 KB)** biblioteki Rust. Samo prawidłowe wyrównanie ZIP nie oznacza zgodności ELF ze stronami 16 KB. W używanym NDK r27 wymagane są odpowiednie flagi linkera: [dokumentacja Androida](https://developer.android.com/guide/practices/page-sizes).

Zmieniono tylko:

- `src-tauri/build.rs`: flagi `max-page-size=16384` i `common-page-size=16384`, wyłącznie dla Androida.
- `skrypty/budujAndroid.mjs`: kontrola kompletności bibliotek, ELF64, architektury i segmentów 16 KB; produkcyjny `zipalign -P 16` oraz ponowna kontrola ZIP po podpisaniu.
- `testy/dystrybucja.test.mjs`: regresja dla bibliotek 4 KB, brakujących bibliotek, obcej architektury i uszkodzonych nagłówków.

Nowa kontrola odrzuciła rzeczywisty stary APK. Dopiero ta potwierdzona usterka uzasadniła ponowną kompilację: `npm run android:build:test` — PASS. Wykorzystano istniejący fallback kopiowania JNI i Gradle przy odmowie dowiązań Windows; nie zmieniano uprawnień systemu. Wyrównanie nie jest dowodem działania na urządzeniu 16 KB — taki test nadal pozostaje do wykonania.

### Aktualny artefakt testowy

| Właściwość | Potwierdzony wynik |
| --- | --- |
| Lokalizacja | `C:\GitHub\Projects\Ultimate_Pomagier_3_5\wydanie-android\testowe\Ultimate_Pomagier_TESTOWY_arm64.apk` |
| Rozmiar | **156 199 249 bajtów** |
| SHA-256 | `47951feb5f9ade838e7a607769d1a03475b9f5fa18cb13ccfddcadf0aaedad9a` |
| Pakiet | `pl.ultimatepomagier.desktop` |
| Wersja / versionCode | **4.0.0 / 4000000** |
| minSdk / targetSdk / compileSdk | **26 / 36 / 36** |
| ABI / ELF | `arm64-v8a`, AArch64, ELF64 |
| Biblioteki | `libpomagier_aplikacja.so` i `libc++_shared.so`, obie zgodne z wyrównaniem 16 KB |
| Manifest / zasoby | `aapt` odczytuje manifest, aktywność startową, nazwę Ultimate Pomagier i zasoby ikon; APK zawiera zasoby aplikacji |
| Podpis | **Android Debug**, schemat v2 zweryfikowany przez `apksigner` |
| SHA-256 certyfikatu debug | `ee6a46dbbc496313110b392e087c507e546ef43bc67b7c265fdb75e18d0b70dd` |
| Integralność i pakowanie | Odczyt ZIP, kontrola bibliotek ELF, `apksigner verify`, `zipalign -c -P 16 4` — PASS |

Odczytano rzeczywiście osadzone, skompresowane metadane z biblioteki znajdującej się w APK: bazowy commit `8553140ef612c3f9ee96e16883278c54a97b0de9`, `zmienioneZrodla: true`, frontend `15b34f17b8c3c6dc007a04378432f1d4df5a015a31cf77bc735dd5fab9ad8dc0`. To lokalna kompilacja bazowego commita z powyższą poprawką, wykonana przed jej commitem, **nie czysty artefakt produkcyjny exact-SHA**. Frontend nie był zmieniany. Biblioteka Rust w nowym APK: 146 984 888 bajtów, SHA-256 `5873b924785d9643c188ff21c6d64a9b9de9ecf9e9e992221475a9621b9a2b42`.

Poprzedni APK zachowano w `.desktop-tools/odbior-v4/Android-przed-poprawka-16KB.apk`; SHA-256 `6b16d3f5d9d0c943a1111d238a970d18c9b2da66c3557b035c947e9bcbfe93c5`. Nie należy mylić go z poprawionym plikiem.

### Emulator, instalacja i funkcje

Brak urządzenia Android i istniejących AVD. `emulator -accel-check` wskazał brak sterownika hypervisora. W istniejącym SDK doinstalowano wyłącznie obraz `system-images/android-30/google_apis/x86_64`, bez aktualizowania pozostałych pakietów. Obraz Google APIs API 30 umożliwia translację ARM64: [informacja producenta](https://android-developers.googleblog.com/2020/03/run-arm-apps-on-android-emulator.html).

Utworzono osobny AVD `Pomagier_odbior_v4_API30` w `.desktop-tools/odbior-v4/avd/`, bez modyfikowania profili AVD użytkownika. Dwie próby programowej emulacji, z różnymi ustawieniami GPU/liczby rdzeni, zatrzymały się przed startem systemu: ADB stale `offline`, brak `sys.boot_completed`. Procesy utworzonego emulatora zamknięto. Nie włączano funkcji Windows, sterowników ani wirtualizacji i nie restartowano komputera.

**Instalacja APK nie została potwierdzona.** Zablokowane są wszystkie próby wykonawcze na Androidzie: pierwsze uruchomienie, utworzenie konta, logowanie, reset hasła, sesja po odświeżeniu, wylogowanie, dotyk, responsywność WebView, moduły, dane syntetyczne, restart i trwałość, offline, generatory, importy, PDF, DOCX, pobieranie plików, klawiatura ekranowa, przewijanie i przycisk Wstecz. Nie zastąpiono tych wyników testami mobilnego viewportu Chrome/Edge. Nie potwierdzono wyglądu ikony na launcherze.

Zadanie Gradle `testArm64DebugUnitTest` kończy się `BUILD SUCCESSFUL`, ale testy aplikacji mają **NO-SOURCE** — nie są to wykonane testy funkcji Androida.

### Granica uwierzytelniania

Nie zmieniono kont. Android korzysta z istniejącego `pomagier-konta`, SQLite w `app_data_dir()/konta` oraz tokenu sesji w pamięci Rust. Token nie trafia do localStorage. DPAPI, profile WebView2 i plugin aktualizacji desktopowych są poza kompilacją mobile; capability updatera obejmuje platformy desktopowe. Test IPC potwierdza odświeżenie sesji, projekcję kont i wylogowanie Androida bez komend Windows.

Na Androidzie nie ma obietnicy zapamiętania sesji Windows: odpowiednie pole formularza jest dostępne tylko na desktopie. Zamknięcie procesu Androida wymaga ponownego logowania; nie oznacza usunięcia zapisanych dokumentów. Trwałość tych dokumentów wymaga jeszcze testu rzeczywistego APK.

## C. Dystrybucja

### Rejestr i centrum wersji

GitHub Releases podczas kontroli zwraca **pustą listę**. Repozytorium pozostaje publiczne. Nie utworzono szkicu ani publikacji.

Panel Ustawienia → Aktualizacje i wersje oraz panel przed logowaniem korzystają z jednego rejestru GitHub Releases. Potwierdzono:

- Testy reguł: rozpoznawanie Windows/Android, wersjonowanie, kompletność metadanych, podpis Windows, wybór najnowszej stabilnej wersji, blokada starszych, puste wydania, paginacja, limity API i wycofanie pliku.
- Edge, istniejący test przeglądarkowy: Windows i mobilny viewport, historia, przekazanie pobrania syntetycznego APK, offline i wycofanie.
- Dodatkowa kontrola Edge: rzeczywisty pusty rejestr, wersja 4.0.0, brak fikcyjnych przycisków pobrania; zasymulowane HTTP 503; WEB ZIP o poprawnych metadanych i przekazanie pobrania fixture.

Przekazanie pobrania nie jest potwierdzeniem pobrania/instalacji realnego EXE/APK. Nie ma jeszcze realnego produkcyjnego pliku do pobrania z tego panelu. Natywne otwieranie odnośników na Androidzie pozostaje nieprzetestowane.

### Podpisy, sekrety i bramki

Odczyt API z uprawnieniami właściciela potwierdził: **0 sekretów repozytorium, 0 zmiennych repozytorium, 0 środowisk GitHub**. Nie odczytywano wartości sekretów. W szczególności `wydania-produkcyjne` nie istnieje — samo odwołanie YAML nie zapewnia recenzentów ani zatwierdzenia.

| Miejsce | Nazwy wymagane przez istniejący proces |
| --- | --- |
| GitHub Actions Secrets — Android | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| GitHub Actions Variables — Android | `ANDROID_CERT_SHA256` |
| GitHub Actions Secrets — Windows | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |
| GitHub Actions Variables — Windows | `TAURI_UPDATER_PUBLIC_KEY` |
| Lokalny proces Android | `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_CERT_SHA256`, `ANDROID_HOME`, `NDK_HOME` |

Sekrety podpisujące są obecnie odczytywane na poziomie repozytorium przez workflow przygotowania. Przeniesienie ich wyłącznie do środowiska publikacji nie udostępni ich zadaniom budowania w obecnym YAML. `GITHUB_TOKEN` dostarcza Actions; nie potrzeba tokenu w aplikacji.

Tauri Updater i Authenticode to osobne podpisy. Obecny proces obsługuje podpisy updatera, **nie konfiguruje firmowego certyfikatu Authenticode**. Nie uznano niepodpisanego EXE za gotowy produkcyjnie. Nie generowano zastępczych kluczy produkcyjnych ani haseł.

Kontrole rzeczywistych poleceń produkcyjnych zatrzymały się bez obchodzenia zabezpieczeń:

- `android:release`: brak `ANDROID_KEYSTORE_PATH`.
- `desktop:release`: brak dokładnego stabilnego tagu.
- `web:release`: build przeszedł, pakowanie wydania odrzucono przez brak dokładnego tagu.

Nie ma podpisanego produkcyjnego APK, podpisanego pakietu aktualizacji Windows ani oficjalnego WEB ZIP. WEB nie ma skonfigurowanej produkcyjnej zaufanej usługi tożsamości; samo archiwum frontendu nie zapewnia operacyjnego logowania.

### Istniejąca automatyzacja

Przejrzano cztery wskazane workflow i skrypty, bez tworzenia nowych workflow:

1. `ci.yml`: [40205111421](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40205111421), **SUCCESS**, dokładnie `8553140`. Wynik dotyczy punktu bazowego, nie późniejszej poprawki Androida.
2. `desktop-windows.yml`: testowy EXE potwierdzony; tryb podpisany wymaga tagu i kluczy, w tym wywołanie przez `dystrybucja.yml`.
3. `dystrybucja.yml`: istniejące zadania Windows, podpisanego Androida i WEB; sprawdzanie sum i rozmiarów, zgodności wersji/commita trzech platform, podpisów/metadanych; szkic przez `gh release create --draft --verify-tag`. Nie uruchomiono procesu zdalnego.
4. `publikacja-wydania.yml`: oddzielne ręczne zatwierdzenie, tag i środowisko `wydania-produkcyjne`; sprawdzenie istniejącego szkicu i zgodności commita przed publikacją. Nie uruchomiono publikacji.

Actionlint przechodzi. Testy łączenia i akceptacji szkicu przechodzą na syntetycznych plikach; nie są kryptograficzną weryfikacją nieistniejących artefaktów produkcyjnych. Pełnego przebiegu trzech podpisanych platform do szkicu nie potwierdzono. **Infrastruktura istnieje, ale jej operacyjna gotowość jest zablokowana przez brak kluczy, tagu i ochrony środowiska.**

## D. Niezbędne działania właściciela

### 1. Udostępnić odizolowany Windows do odbioru

**Do testów i produkcji.** Na osobnym testowym Windows/VM, bez danych firmy, uruchomić wskazany EXE. Sprawdzić logo/nazwę, oba skróty, start bez terminala i Node.js; utworzyć konto i syntetyczne zadanie/dokument, zalogować/wylogować, włączyć zapamiętanie sesji, zamknąć i uruchomić ponownie. Wykonać kopię danych. Odinstalować bez opcji usuwania danych, ponownie zainstalować i potwierdzić konto/dokumenty. Obecny komputer nie zapewnia izolacji; nie wystarczy zgoda na nadpisanie istniejącej instalacji bez kopii danych.

### 2. Udostępnić działające środowisko Androida

**Do testów i produkcji.** Zapewnić emulator z działającą akceleracją albo oddzielne urządzenie testowe. Na tym hoście wymaga to administracyjnego skonfigurowania obsługi hypervisora/wirtualizacji i ewentualnego restartu; nie wykonano tego automatycznie. Alternatywnie potrzebna jest wyraźna zgoda na użycie wskazanego telefonu/profilu testowego. Nie wymaga się udostępnienia telefonu, jeśli działa emulator.

Po uruchomieniu wyłącznie wybranego emulatora: sprawdzić `adb -s <serial-emulatora> shell getprop sys.boot_completed` i listę ABI, następnie `adb -s <serial-emulatora> install "C:\GitHub\Projects\Ultimate_Pomagier_3_5\wydanie-android\testowe\Ultimate_Pomagier_TESTOWY_arm64.apk"`. Wykonać pełną listę prób z sekcji B. Dodatkowo dla zgodności 16 KB użyć środowiska, w którym `adb -s <serial-emulatora> shell getconf PAGE_SIZE` zwraca `16384`. Na urządzeniu z produkcyjną instalacją nie instalować debug APK z innym certyfikatem.

### 3. Skonfigurować tożsamość wydawcy i podpisy

**Wyłącznie do produkcji; zbędne do obecnych testów debug.** Zachować istniejące klucze produkcyjne, jeśli właściciel już je posiada. Jeżeli nie istnieją, właściciel sam tworzy i zabezpiecza klucze poza repozytorium zgodnie z `docs/dystrybucja-wieloplatformowa.md`; nie należy przekazywać ich w czacie.

Android: prywatny JKS, stały alias, hasła i kopia zapasowa; odcisk sprawdzić `keytool -list -v -keystore <plik>` bez hasła w argumentach. W GitHub → Settings → Secrets and variables → Actions dodać wskazane cztery sekrety Android i zmienną `ANDROID_CERT_SHA256`. Lokalnie używać `ANDROID_KEYSTORE_PATH`; w Actions plik jest odtwarzany z base64 w RUNNER_TEMP i usuwany.

Windows: skonfigurować parę kluczy Tauri, hasło klucza oraz `TAURI_UPDATER_PUBLIC_KEY` w tych samych ustawieniach. Osobno zapewnić zatwierdzony certyfikat Authenticode i metodę podpisywania Windows — obecne workflow nie mają takiej konfiguracji ani jej zmiennych. Po jej uzgodnieniu trzeba podłączyć podpis do istniejącego pakowania i sprawdzić `Get-AuthenticodeSignature` rzeczywistego EXE; samo ustawienie sekretów Tauri tego nie zastąpi.

### 4. Skonfigurować bramkę produkcyjną i zatwierdzić kolejne operacje Git/wydania

**Wyłącznie do produkcji.** GitHub → Settings → Environments → New environment → `wydania-produkcyjne`: skonfigurować Required reviewers z uprawnioną osobą i ograniczyć deployment do zatwierdzonych tagów wydań. Ustawienia zweryfikować przed pierwszą publikacją; samo utworzenie nazwy nie wystarczy. Zasady samodzielnego zatwierdzania muszą odpowiadać rzeczywistej obsadzie recenzentów.

Osobno zatwierdzić push lokalnej poprawki, a po CI i przeglądzie dokładny commit/tag `v4.0.0`. Nie utworzono tagu w tym zadaniu. Następnie, po konfiguracji podpisów, uruchomić istniejące **Przygotowanie Windows, Android i WEB** na zatwierdzonym tagu, z rzeczywistym opisem zmian. Odebrać szkic, podpisy, instalację, aktualizację i dane obu aplikacji. Dopiero po akceptacji uruchomić **Zatwierdzenie publikacji przygotowanego wydania** na tym samym tagu. Nie należy podmieniać debug APK na produkcyjny asset.

### 5. Ustalić zakres produkcyjnego WEB

**Tylko jeśli pierwsze wydanie ma obejmować operacyjne logowanie WEB.** Wymagana jest osobna decyzja dotycząca istniejącej zaufanej usługi tożsamości i jej wdrożenia. Do testów lokalnych Windows/Android nie jest to potrzebne. Nie dodano nowego API, hostingu ani integracji i nie włączono DEMO jako obejścia.

## E. Werdykt

| Platforma | Status | Granica dowodów |
| --- | --- | --- |
| Windows | **GOTOWA DO TESTÓW** | Poprawny testowy EXE z Actions; odbiór instalacji/odinstalowania i podpisanej aktualizacji pozostaje niewykonany. Brak podpisów produkcyjnych. |
| Android | **GOTOWA DO TESTÓW** | Poprawiony debug APK, sprawdzony manifest/podpis/ELF/ZIP. Nie potwierdzono instalacji ani funkcji WebView; potrzebne działające środowisko testowe. |
| WEB | **ZABLOKOWANA** | Frontend i centrum wersji przechodzą kontrole, lecz nie ma oficjalnego archiwum wydania ani produkcyjnej zaufanej usługi logowania. |

**Żadna platforma nie otrzymuje statusu GOTOWA DO WYDANIA.** Publikacja wieloplatformowa pozostaje zablokowana do czasu podpisów, ochrony środowiska, zgody na tag/push i odbioru rzeczywistych aplikacji.

## Weryfikacja po poprawce i stan końcowy

| Kontrola | Wynik |
| --- | --- |
| `npm test`, z pretest i zagnieżdżonym `test:konta` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS, uruchomiony przez aktualne `android:build:test`; bez zbędnego kolejnego wywołania |
| `npm run test:desktop` | PASS: 8 + 3 + 2 testy |
| `npm run test:dystrybucja` | PASS: 7 + 6 testów, w tym nowa regresja ELF |
| `npm run test:reset-hasel` | PASS: zwykły TypeScript, DEMO, 29 testów Rust |
| `npm run test:konta` | PASS w ramach `npm test`, nie powtarzano osobno |
| `npm run test:launcher` | PASS |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib --locked --target-dir src-tauri/target/konta-testy` | PASS: 1 test DPAPI |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS |
| `npm run android:build:test` | PASS: aktualny arm64 Rust i Gradle, kontrola rzeczywistych ELF |
| Gradle `testArm64DebugUnitTest` | BUILD SUCCESSFUL, **NO-SOURCE testów aplikacji**, nie zaliczano jako testu funkcjonalnego |
| `apksigner verify`, `zipalign -c -P 16 4`, aapt, llvm-readelf | PASS dla poprawionego APK |
| Actionlint | PASS |
| `git diff --check` i przegląd diffu | PASS |

Test przeglądarkowy centrum wersji i dodatkowe scenariusze wykonano w tym zadaniu; późniejsza poprawka dotyczy wyłącznie linkowania/pakowania Androida, więc nie powtarzano ich po niej. Pozostają dotychczasowe ostrzeżenia Vite o dużym bundle i statycznym/dynamicznym imporcie Tauri oraz ostrzeżenia testów PDF o `standardFontDataUrl`; kontrole zakończyły się powodzeniem.

Ślady lokalne: `.desktop-tools/odbior-v4/` — odpowiedzi API bez sekretów, logi kontroli, podpis APK, metadane artefaktu, zrzut pustego centrum wersji, AVD i logi jego obu nieudanych startów. Obraz API 30 pozostaje w SDK; utworzone procesy emulatora zamknięto. Dane aplikacji użytkownika i starszy lokalny EXE pozostały nietknięte.

Zakres zmian repozytorium: trzy pliki poprawki Androida wymienione w sekcji B oraz niniejszy raport. Praca na `main`; bez nowej gałęzi/worktree, reset/clean/rebase, tagu, pushu, zmiany widoczności, uruchamiania zdalnych workflow ani szkicu/publikacji Release. Lokalna poprawka ma wyniki testów lokalnych; aktualne zdalne CI potwierdza wyłącznie commit bazowy.
