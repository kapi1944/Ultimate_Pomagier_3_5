# Integracja Windows i Android — 2026-10-25

## Zabezpieczenie zastanego stanu

Punkt wyjścia: `main`, HEAD `9decff6f5c1e26f0407f6212c44861aa8ab0c3f7`, dokładnie 76 zmienionych lub nowych plików. Bez tworzenia gałęzi i worktree, resetowania, czyszczenia ani zmiany historii.

Przed edycją skopiowano wszystkie 76 plików poza repozytorium do:

`C:\GitHub\Backups\Ultimate_Pomagier_integracja_2026-10-25T14-14-52-225Z`

`manifest.json` zawiera ścieżki, rozmiary i SHA-256. Porównanie źródło/kopia: **76 zgodnych, 0 niezgodności**. Zachowano też binarny diff względem HEAD, staged diff, status, indeks Git i bazowy HEAD. Kopia obejmuje zmienione i nowe pliki, nie całe ignorowane środowisko ani dane użytkownika aplikacji. Logi kontroli znajdują się w tym samym katalogu poza repozytorium.

## Rozpoznanie i integracja istniejących zmian

Rozpoznanie oparto na diffie, dwóch istniejących raportach z 25 października i punktach styku implementacji; nie powtarzano pełnego audytu aplikacji.

- Konta lokalne i reset haseł: biblioteka `src-tauri/konta`, adapter Windows `konta_desktop.rs`, DPAPI, profile WebView2, migracja danych, logowanie, projekcja kartoteki, zmiana własnego hasła, reset indywidualny i zbiorczy oraz testy. Zachowano źródła legacy i granicę DEMO.
- Dystrybucja i Android: wspólny punkt wejścia Rust, oddzielenie pluginów desktopowych od mobile, natywne konta Androida, konfiguracje i capabilities, panel wersji, rejestr wydań, skrypty pakowania i workflow przygotowania/publikacji.
- Wspólne pliki: `package.json` i lockfile, manifesty Cargo, start aplikacji, panel logowania, ustawienia, rejestr V4 oraz CI. Zachowano oba zakresy zmian.
- Zastany kod już rozróżniał logowanie natywne od desktopowego oraz ograniczał profile, DPAPI i migrację do desktopu. Android nadal wykonuje pierwszą konfigurację przez zaufaną warstwę natywną. Rejestr V4 zawiera wszystkie nowe panele.
- Zachowano zastane wyróżnienie sortowania kont z jego testem oraz historyczny raport Git z 23 października. Ten raport opisuje dawny stan, nie aktualną relację gałęzi.
- Rozszerzono `testy/platformyNatywne.test.ts`: odświeżenie potwierdzonej sesji Androida, projekcja kont i wylogowanie przechodzą przez IPC kont, bez komend profili Windows. To test kontraktu z mockiem IPC, nie test urządzenia Android.
- Zastany fallback pakowania JNI przy odmowie dowiązań Windows pomyślnie przygotował aktualny debug APK przez Gradle, bez zmiany uprawnień Windows.

## Weryfikacja obecnego wspólnego drzewa

| Kontrola | Wynik |
| --- | --- |
| `npm test` wraz z `pretest` i `test:konta` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run test:desktop` | PASS |
| `npm run test:dystrybucja` po rozszerzeniu testu sesji | PASS: 12 testów |
| `npm run test:reset-hasel` | PASS: TypeScript zwykły i DEMO, 29 testów Rust |
| `npm run test:dystrybucja:przegladarka` | PASS: Edge, telefon i Windows, historia, pobranie fixture, offline, wycofanie |
| `npm run test:reset-hasel:przegladarka` | PASS: Chrome, rzeczywista lokalna usługa i syntetyczna baza |
| Test sortowania użytkowników w Chrome | PASS: kierunek, filtry, zaznaczenie, motywy i klawiatura |
| `npm run test:launcher` | PASS |
| Build natywnego desktopu z `tauri/custom-protocol`, osobny identyfikator testowy | PASS |
| `testy/kontaDesktop.natywne.test.mjs` | PASS: rzeczywisty Windows WebView2, offline, migracja, trwałość, restart, sesja, zmiana hasła, izolacja dwóch profili |
| `npm run test:konta:demo` | PASS: rzeczywisty WebView2, osobny profil, odmowa rzeczywistego uwierzytelniania |
| `cargo test --lib --locked`, osobny target testowy | PASS: DPAPI odtwarza dane i odrzuca uszkodzony zapis |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS |
| Actionlint, wszystkie workflow | PASS |
| `npm run android:build:test` | PASS: Rust arm64 i Gradle, aktualny testowy APK |
| `git diff --check` | PASS |

Testy używały syntetycznych danych i osobnych profili. Nie instalowano aplikacji na danych użytkownika. Pozostają ostrzeżenia Vite o wielkości bundle oraz statycznym i dynamicznym imporcie Tauri.

Testowy artefakt: `wydanie-android/testowe/Ultimate_Pomagier_TESTOWY_arm64.apk` (ignorowany przez Git). Nie jest podpisanym wydaniem produkcyjnym.

## Kontrola sekretów i granice zakończenia

Sprawdzono komplet plików przygotowywanych do commita: nazwy plików kluczy, bloki kluczy prywatnych, formaty tokenów GitHub/AWS/API/JWT, dane uwierzytelniające w URL i literały pól sekretów, uzupełniając kontrolę przeglądem kodu i workflow. Cztery wskazania dotyczą wyłącznie jawnie syntetycznych danych w testach: atrap klucza podpisującego, haseł testowych i wartości testujących wykluczenie sekretów z eksportu. Nie znaleziono rzeczywistych sekretów. Nazwy zmiennych środowiskowych i odwołania do GitHub Secrets nie są ich wartościami. Nie dodano kluczy, baz kont, sesji, APK, EXE ani logów do repozytorium.

Kontrole potwierdzają lokalną integrację i regresję. Nie potwierdzają fizycznego Androida, instalacji/aktualizacji na czystym Windows, podpisanych instalatorów produkcyjnych ani zdalnego CI. Nie uruchomiono publikacji, nie utworzono tagu i nie wykonano push. Po lokalnym commicie `main` będzie wyprzedzać `origin/main`; synchronizacja zdalna wymaga osobnego zatwierdzenia push.
