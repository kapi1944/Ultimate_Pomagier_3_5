# Etap 4.3.3 — pierwsze oficjalne wydanie 4.0.0

Data kontroli: 26 października 2026, Europe/Warsaw.

> Zapis historyczny kontroli przed konfiguracją. Później, na polecenie właściciela, utworzono pierwsze klucze produkcyjne, dodano sześć sekretów i dwie zmienne oraz skonfigurowano środowisko akceptacji. Aktualny stan opisuje [raport konsolidacji](konsolidacja-lokalnych-repozytoriow-2026-10-26.md). Nie utworzono tagu ani Release; poniższe informacje o brakującej konfiguracji odnoszą się do stanu początkowego.

**STATUS WYDANIA: ZABLOKOWANE.** Brakuje konfiguracji podpisów obu platform i środowiska z wymaganą akceptacją. Zgodnie z poleceniem zatrzymano proces przed utworzeniem tagu. Nie uruchomiono dystrybucji ani publikacji.

## Potwierdzony punkt wydania

| Kontrola | Wynik |
| --- | --- |
| Repozytorium | `kapi1944/Ultimate_Pomagier_3_5`, publiczne, aktywne |
| Gałąź | `main` |
| HEAD, lokalne origin/main i zdalne main przez API | `10443b17db3c11f95149fdfa678b43cb6be31abc` — zgodne |
| Początkowe drzewo robocze | Czyste; `git diff --check` bez błędów |
| package.json / src-tauri/Cargo.toml | `4.0.0` / `4.0.0`; Tauri odczytuje wersję z package.json |
| Tag docelowy | `v4.0.0` — nie istnieje lokalnie ani na GitHub (API ref: 404) |
| GitHub Releases | Pusta lista, również brak szkiców w uwierzytelnionym odczycie |
| GitHub Actions | Włączone; wszystkie cztery istniejące workflow aktywne |
| Sekrety repozytorium | **0**; odczyt wyłącznie nazw, bez wartości |
| Zmienne repozytorium | **0**; odczyt wyłącznie nazw, bez wartości |
| Środowiska GitHub | **0**; brak `wydania-produkcyjne` i reguły Required reviewers |

Metadane administracyjne odczytano przez uwierzytelnione `gh api` z dostępem administratora repozytorium. Puste listy nie są wynikiem odmowy dostępu. Nie sprawdzano prywatnych plików właściciela; brak konfiguracji GitHub nie oznacza, że właściciel nie posiada kluczy poza GitHub.

## Istniejące wyniki CI tego commita

- [CI — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40325002602): testy aplikacji, konfiguracji desktopowej i dystrybucji, lint oraz build — wszystkie kroki zakończone sukcesem.
- [Instalator Windows — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40325002620): testy aplikacji, lint, launcher, pakietowanie/aktualizacje, formatowanie Rust oraz **build testowego instalatora** — sukces. Krok podpisanego stabilnego instalatora został **pominięty**.
- Istnieje niewygasły artefakt CI `Ultimate-Pomagier-Windows-13`, ID `12651517176`, archiwum 227336718 bajtów. To metadane archiwum CI, nie rozmiar oficjalnego EXE ani potwierdzenie jego podpisu.
- `dystrybucja.yml` i `publikacja-wydania.yml` nie zostały uruchomione w tym zadaniu. Sukces testowej kompilacji Windows nie oznacza przygotowania trzech platform ani publikacji.

Nie powtarzano audytu aplikacji, zakończonych etapów ani testów niezwiązanych z wydaniem. Nie uruchamiano lokalnej kompilacji Cargo. Wykorzystano powyższe wyniki dokładnie zatwierdzonego commita oraz wcześniejsze raporty.

## Platformy i podpisy

| Platforma | Stan przygotowania oficjalnego artefaktu | Kontrole rzeczywistego artefaktu 4.0.0 |
| --- | --- | --- |
| Windows x64 | ZABLOKOWANE — brak kluczy Tauri; oczekiwana nazwa `Ultimate_Pomagier_4.0_Setup.exe` | Podpis Tauri, SHA-256, latest.json, produkcyjny frontend i brak demo: NIEZWERYFIKOWANE dla oficjalnego instalatora |
| Android ARM64 | ZABLOKOWANE — brak produkcyjnego keystore i konfiguracji w Actions | Podpis/certyfikat, ABI, manifest, brak debug, integralność i instalacja: NIEZWERYFIKOWANE dla produkcyjnego APK |
| WEB | ZABLOKOWANE — brak oficjalnego archiwum z tagu | Wersja/commit, produkcyjny tryb, izolacja demo, manifest i ZIP: NIEZWERYFIKOWANE dla oficjalnego archiwum |

Kontrakt Androida pozostaje bez zmian: `applicationId = pl.ultimatepomagier.desktop`, wersja `4.0.0`, oczekiwany `versionCode = 4000000`, ABI `arm64-v8a`. To wartości wynikające z konfiguracji i istniejącego skryptu, nie odczyt z nieistniejącego produkcyjnego APK. Historyczny debug APK nie zastępuje odbioru wersji produkcyjnej.

Podpis aktualizacji Tauri jest odrębny od Authenticode. Obecna konfiguracja nie zawiera podpisywania Authenticode; podpisu rzeczywistego oficjalnego EXE **nie zweryfikowano**. Brak Authenticode będzie ograniczeniem wdrożenia na firmowym Windows. Jeżeli IT go wymaga, właściciel/IT musi dostarczyć zatwierdzony certyfikat i uzgodnić jego użycie w istniejącym procesie przed odbiorem. Nie obchodzono Code Integrity ani innych polityk.

Źródłowy endpoint aktualizatora i nadpisanie konfiguracji podpisanego buildu są zgodne:

`https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/latest/download/latest.json`

Skrypt ma wygenerować URL EXE:

`https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/v4.0.0/Ultimate_Pomagier_4.0_Setup.exe`

Bazowa konfiguracja ma pusty klucz publiczny i wyłączone artefakty aktualizatora; podpisany build włącza je i wstrzykuje klucz z `TAURI_UPDATER_PUBLIC_KEY`. Nie jest to dowód poprawności pary kluczy ani przyszłego latest.json. Tę zgodność trzeba sprawdzić na rzeczywistych plikach szkicu.

## Konfiguracja do wykonania przez właściciela

### 1. Najpierw ustalić istniejącą tożsamość wydawcy

Sprawdzić prywatny magazyn i kopie bezpieczeństwa kluczy używanych we wcześniejszych instalacjach. Jeżeli istnieją produkcyjne klucze, użyć **tych samych**. Nie tworzyć zastępczej pary Tauri ani nowego certyfikatu Androida. Utrata tych kluczy może uniemożliwić aktualizacje. Nie przesyłać kluczy ani haseł do czatu, repozytorium, raportów czy logów.

### 2. Windows — Tauri

Tylko jeżeli właściciel potwierdzi, że nie istnieje wcześniejszy klucz produkcyjny: utworzyć parę na zaufanym komputerze, w prywatnym katalogu poza repozytorium, z ograniczonym dostępem i zaszyfrowaną kopią zapasową. Obecny lokalny CLI potwierdza opcję `signer generate --write-keys`. Przykład do samodzielnego wykonania przez właściciela, po zastąpieniu ścieżki istniejącym prywatnym katalogiem:

```powershell
& .\node_modules\.bin\tauri.cmd signer generate --write-keys 'D:\PrywatneKlucze\pomagier-tauri.key' 1> $null
```

Użyć interaktywnego pytania o hasło, bez `--password`, `--ci` i `--force`. Nie uruchamiać z rejestrowaniem sesji; wyjście standardowe jest wyciszone, ponieważ może zawierać klucz. Zachować prywatny plik, publiczny plik `.pub` i hasło w bezpiecznym magazynie. Jeżeli katalog/plik już istnieje, nie nadpisywać istniejących kluczy.

W [Settings → Secrets and variables → Actions](https://github.com/kapi1944/Ultimate_Pomagier_3_5/settings/secrets/actions) dodać na poziomie **repozytorium**:

| Rodzaj | Nazwa | Zawartość |
| --- | --- | --- |
| Secret | `TAURI_SIGNING_PRIVATE_KEY` | Pełna zawartość zachowanego prywatnego pliku Tauri |
| Secret | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Hasło tego klucza |
| Variable | `TAURI_UPDATER_PUBLIC_KEY` | Pełna zakodowana zawartość odpowiadającego pliku `.pub`, zgodna z formatem Tauri |

Nie podawać ścieżki zamiast zawartości klucza. Nie dekodować pliku publicznego do surowego formatu minisign. Poprawność pary pozostaje do potwierdzenia podczas podpisanego buildu i odbioru aktualizacji.

### 3. Android — produkcyjny keystore

Jeżeli istnieje keystore produkcyjny, zachować go wraz z aliasem. Tylko gdy potwierdzono brak wcześniejszego certyfikatu, właściciel może utworzyć nowy JKS poza repozytorium:

```powershell
keytool -genkeypair -storetype JKS -keystore 'D:\PrywatneKlucze\pomagier-android.jks' -alias pomagier -keyalg RSA -keysize 3072 -validity 10000
keytool -list -v -keystore 'D:\PrywatneKlucze\pomagier-android.jks' -alias pomagier
```

Wprowadzić hasła interaktywnie; nie używać jawnych haseł w argumentach. Zachować certyfikat, alias, hasła i zaszyfrowaną kopię JKS. Z odczytu certyfikatu pobrać SHA-256; zmienna ma zawierać 64 znaki hex, bez dwukropków i spacji.

W tych samych ustawieniach Actions dodać:

| Rodzaj | Nazwa | Zawartość |
| --- | --- | --- |
| Secret | `ANDROID_KEYSTORE_BASE64` | Cały binarny JKS zakodowany base64 |
| Secret | `ANDROID_KEYSTORE_PASSWORD` | Hasło magazynu |
| Secret | `ANDROID_KEY_ALIAS` | Zachowany alias klucza produkcyjnego |
| Secret | `ANDROID_KEY_PASSWORD` | Hasło klucza wskazanego aliasem |
| Variable | `ANDROID_CERT_SHA256` | Zatwierdzony odcisk certyfikatu |

Bezpieczne przekazanie base64 bez wyświetlania go ani tworzenia pliku w repozytorium, w prywatnej sesji właściciela z uwierzytelnionym `gh`:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('D:\PrywatneKlucze\pomagier-android.jks')) | gh secret set ANDROID_KEYSTORE_BASE64 --repo kapi1944/Ultimate_Pomagier_3_5
```

Nie uruchamiać wyrażenia base64 osobno ani nie kopiować wyniku do logów. Przekazanie sekretu nie jest potwierdzeniem poprawności certyfikatu. Obecny workflow odtwarza JKS w `RUNNER_TEMP` i usuwa jego kopię po budowaniu.

Sekrety i dwie zmienne muszą być dostępne na poziomie repozytorium: zadania przygotowania nie korzystają ze środowiska publikacji. Umieszczenie ich wyłącznie w `wydania-produkcyjne` nie wystarczy.

### 4. Wymagana akceptacja publikacji

W [Settings → Environments](https://github.com/kapi1944/Ultimate_Pomagier_3_5/settings/environments) utworzyć `wydania-produkcyjne`. Włączyć **Required reviewers** i wskazać właściciela/uprawnionego recenzenta. Wybrać regułę **Selected branches and tags** i dopuścić zatwierdzone tagi wydań (dla tego wydania dokładnie `v4.0.0` jako regułę tagu). Wyłączyć możliwość administracyjnego ominięcia reguł, jeśli ustawienie jest dostępne.

Jeżeli włączono Prevent self-review, uruchamiający publikację i zatwierdzający muszą być różnymi uprawnionymi osobami. Dobrać tę opcję do rzeczywistej obsady; nie usuwać Required reviewers. Potwierdzić zapisane reguły przez API przed przygotowaniem tagu. Samo odwołanie do nazwy środowiska w YAML nie stanowi bramki akceptacji.

## Przygotowany opis do wejścia opis_zmian

Poniższy tekst jest materiałem do istniejącego `dystrybucja.yml`, a nie opublikowanym opisem ani potwierdzeniem odbioru plików:

> Pierwsze oficjalne wydanie Ultimate Pomagier 4.0.0: Windows x64, Android ARM64 oraz archiwum WEB. Aplikacja wspiera obsługę szkoleń, Szczegóły organizacyjne, kartoteki i generatory dokumentów, w tym programy szkoleń, listy obecności, ankiety, checklisty, karty na drzwi oraz dyplomy.
>
> Wydanie obejmuje optymalizacje generatora Szczegółów organizacyjnych z etapu 4.3.1 oraz poprawki bezpieczeństwa i izolacji trybu demonstracyjnego z etapu 4.3.2. Tryb demonstracyjny nie nadaje uprawnień w wydaniu produkcyjnym.
>
> Windows: instalator x64 dla Windows 10/11, z instalatorem WebView2 offline; instalacja podlega politykom firmowego IT. Podpis aktualizacji Tauri nie zastępuje Authenticode. Status Authenticode należy podać po kontroli rzeczywistego EXE przed publikacją. Android: produkcyjny APK ARM64, Android 8.0/API 26 lub nowszy; wymagania potwierdzić w manifeście gotowego APK. Instalację zatwierdza użytkownik w systemowym dialogu zaufanego źródła.
>
> Aktualizacje Windows są dostępne przez istniejący panel aktualizacji i podpisany mechanizm Tauri. Android aktualizuje się APK z tym samym identyfikatorem i certyfikatem oraz wyższym versionCode. Przed aktualizacją wykonać kopię danych; nie odinstalowywać aplikacji ani nie czyścić danych. Ponowna instalacja tej samej wersji nie jest aktualizacją.
>
> Dane są lokalne dla urządzenia i profilu; wydanie nie zapewnia automatycznej synchronizacji Windows, Android i WEB. Archiwum WEB nie konfiguruje hostingu ani produkcyjnego logowania bez zaufanej usługi tożsamości. Nie należy używać trybu demo jako obejścia logowania.
>
> Wersja 4.0.0, commit 10443b17db3c11f95149fdfa678b43cb6be31abc. Metadane plików, rozmiary, SHA-256 i dane podpisów zawiera automatyczny blok pomagier-wydanie oraz rejestr-wydania.json; dla Windows dołączone są podpis aktualizacji i latest.json. Przed instalacją porównać SHA-256 pobranego pliku z metadanymi wydania.

Przed publikacją zastąpić zdania wymagające potwierdzenia konkretnymi wynikami kontroli artefaktów. Nie dopisywać ręcznie fikcyjnego manifestu ani sum. Blok `pomagier-wydanie` schematu 1 dopisuje wyłącznie istniejący skrypt łączenia na podstawie rzeczywistych plików. Zachować ten blok przy korekcie opisu szkicu.

## Warunki wznowienia i odbioru

1. Ponownie potwierdzić konfigurację, czyste źródła, zgodność zdalnego main i dokładny commit `10443b17db3c11f95149fdfa678b43cb6be31abc`. Niniejszy raport jest lokalnym plikiem; przed dalszą pracą trzeba świadomie rozstrzygnąć jego zapis, aby nie włączyć go przypadkowo do źródeł wydania. Nie zmieniać zatwierdzonego punktu tagu.
2. Dopiero po spełnieniu warunków utworzyć i wypchnąć nieistniejący `v4.0.0` wskazujący dokładnie ten commit, bez force push. Uruchomić istniejący `dystrybucja.yml` na tagu z rzeczywistym opisem zmian. Nie zastępować workflow ręcznymi plikami.
3. Odebrać trzy platformy i prywatny szkic `Ultimate Pomagier 4.0.0`, stabilny, bez prerelease. Sprawdzić zgodność commita i wersji wszystkich plików, sum i rozmiarów, podpis Tauri, latest.json, oddzielnie Authenticode, a dla APK podpis produkcyjny i odcisk, brak debug, ABI i kompletność ZIP. Skontrolować produkcyjny frontend i manifest WEB.
4. **Windows — NIEZWERYFIKOWANE:** na izolowanej VM/komputerze z danymi syntetycznymi zainstalować oficjalny EXE, uruchomić, skonfigurować konto, zalogować, zapisać dokument, zamknąć i uruchomić ponownie; potwierdzić zachowanie danych. Odbiór podpisanej aktualizacji wykonać w uzgodnionym środowisku; nie oznaczać sukcesu bez takiego testu.
5. **Android — NIEZWERYFIKOWANE:** na izolowanym urządzeniu ARM64 lub zgodnym emulatorze zainstalować produkcyjny APK, zalogować, sprawdzić podstawowe moduły i dokumenty, restart i trwałość danych. Debug APK i viewport mobilny nie zastępują testu instalacji. Kontrola stron 16 KB wymaga odpowiedniego środowiska.
6. **WEB — NIEZWERYFIKOWANE:** otworzyć frontend z rzeczywistego archiwum w izolowanym profilu, sprawdzić wersję/commit i izolację demo. Brak usługi tożsamości nie może zostać opisany jako działające logowanie produkcyjne.
7. Dopiero po kompletnym odbiorze uruchomić `publikacja-wydania.yml` na `v4.0.0`, z zatwierdzeniem właściciela i przez Required reviewers środowiska. Następnie anonimowo potwierdzić widoczność stabilnego Latest, kompletność manifestu, pobieranie każdego assetu i zgodność sum.

Docelowy adres Release: [v4.0.0](https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/tag/v4.0.0) — **jeszcze nie istnieje**. [Aktualna lista Releases](https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases) jest pusta.

## Zakres wykonanych zmian

Dodano wyłącznie ten raport. Kod aplikacji, zależności, workflow, wersje, dane użytkowników i historia Git nie zostały zmienione. Nie utworzono kluczy, tagu, gałęzi, worktree, commita ani Release. Nie wykonano pushu. Nie skonfigurowano hostingu, nowych integracji ani obejść zabezpieczeń.

Weryfikacja lokalnego dokumentu: przegląd diffu i `git diff --check`; testy, lint i build aplikacji przyjęto z zakończonego CI zatwierdzonego commita. Testy instalacyjne oraz podpisy nieistniejących oficjalnych artefaktów pozostają **NIEZWERYFIKOWANE**.
