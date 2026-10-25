# Dystrybucja Ultimate Pomagiera — rozszerzenie dwóch promptów

## Prompt ① — granice platform i danych

Windows, Android i WEB korzystają z jednego frontendu `src/` i tego samego modelu domenowego. Ten etap nie dodaje synchronizacji ani nie przenosi danych między urządzeniami. `localStorage` pozostaje lokalny dla profilu i originu; konto, dokumenty, drafty i uprawnienia na Windows nie stają się automatycznie dostępne na Androidzie. Trwałe modele dokumentów nie zostały zmienione.

Uwierzytelnianie WEB nadal wymaga zaufanej usługi. Publiczny ekran pobierania nie otwiera sesji i nie daje dostępu do danych firmy. Kod instalatora nie włącza demonstracji w produkcji. Funkcje Windows (DPAPI, osobne profile WebView2, single-instance, aktualizator EXE) nie są kompilowane jako funkcje Androida. Mobile używa katalogu `app_data_dir()/konta` i istniejącego repozytorium kont; token sesji pozostaje po stronie Rust. Nie kopiujemy bazy Windows, haseł ani sesji.

## Prompt ② — centrum wersji i instalatory

Ustawienia → **Aktualizacje i wersje** pokazują bieżącą kompilację, platformę, metadane opublikowanego wydania, kafelki Windows/Android/WEB i rozwijaną historię. Ten sam panel można otworzyć przed logowaniem przyciskiem **Pobierz aplikację — aktualizacje i wersje**. Detekcja platformy ustala kolejność; nie blokuje przeglądania innych plików. Architektura natywna pochodzi z Rust; przeglądarka może nie ujawniać architektury.

Jedynym źródłem opublikowanych wersji jest publiczne GitHub Releases `kapi1944/Ultimate_Pomagier_3_5` (publiczność potwierdzono 2026-10-25). Klient wykonuje anonimowe zapytania REST, bez tokenu i bez ciasteczek. Prywatne repozytorium lub niedostępne API kończy się komunikatem, bez próby obchodzenia autoryzacji. Przy przyszłym przejściu na prywatny kod należy osobno zatwierdzić publiczne repozytorium zawierające wyłącznie instalatory i zmienić spójnie kanał dystrybucji, zakres opener oraz endpoint dotychczasowego updatera. Nie zmieniono widoczności repozytorium.

Każdy opis wydania zawiera generowany blok `pomagier-wydanie` (schemat 1): wersję, commit, kanał i listę plików z platformą, architekturą, formatem, nazwą, rozmiarem, SHA-256 oraz metadanymi podpisu. Data publikacji pochodzi z API GitHub. Rozmiar, digest i stan `uploaded` muszą odpowiadać rzeczywistym assets. Pliki Windows wymagają także dostępnego `.sig` o zgodnym digescie. APK wymaga metadanych certyfikatu, identyfikatora i versionCode. Niekompletne, stare wydania bez manifestu i szkice nie mają przycisków pobierania. Przed pobraniem ponownie sprawdzamy publikację i tożsamość pliku.

Brak internetu usuwa dostępne operacje pobierania. Błąd API, limit zapytań, timeout i wycofanie pliku mają komunikaty. Za zakończenie pobrania odpowiada przeglądarka systemowa; panel potwierdza tylko przekazanie operacji, nie udaje potwierdzenia pobrania lub instalacji. SHA-256 służy kontroli integralności, a podpis APK oraz podpis Tauri — autentyczności sprawdzanej przez system Android/updater. Sam panel nie wykonuje kryptograficznego audytu pliku APK. Nie zastępuje to weryfikacji certyfikatu przed publikacją.

Najnowsze stabilne wydanie wybierane jest według numeru wersji, niezależnie od kolejności dat. Wersja testowa nie staje się zalecaną aktualizacją. Starsze stabilne wersje pozostają widoczne w historii, ale instalacja wstecz jest zachowawczo blokowana, ponieważ nie potwierdzono zgodności migracji danych. Nowa publikacja pojawia się po otwarciu panelu lub użyciu **Odśwież listę wydań**. Nie ma automatycznej instalacji ani dodatkowego harmonogramu.

## Android: narzędzia i budowanie

Wymagane: Node.js 24, JDK 21, Rust, target `aarch64-linux-android`, Android SDK (platforma 36 i build-tools 36.0.0), NDK 27.2.12479018. Proces CI przypina tę wersję NDK. `tauri android init` tworzy projekt w ignorowanym `src-tauri/gen/android/`; nie jest on drugim frontendem. Skrypt ustawia API 36, generuje ikony z oryginalnego `public/logo-ultimate-pomagier.png` z zachowaniem całej kompozycji i kopiuje je do zasobów aplikacji. Nie podmienia logotypu ani nie zapisuje sekretów w Gradle.

Tauri na Windows wymaga prawa tworzenia dowiązań symbolicznych do biblioteki JNI (zwykle przez systemowy tryb dewelopera). Bez niego kompilacja Rust może przejść, ale pakowanie APK się zatrzyma. Implementacja nie zmienia zasad ani ustawień Windows. Można przygotować APK w opisanym workflow Linux; jego konfiguracja nie jest dowodem udanego przebiegu CI.

Ustaw `ANDROID_HOME` na SDK oraz `NDK_HOME` na katalog NDK; dodaj Rust i JDK do PATH. Przykład dla standardowej instalacji Windows:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\27.2.12479018"
rustup target add aarch64-linux-android
npm run android:init
npm run android:build:test
```

`android:build:test` tworzy tylko **debug APK** w `wydanie-android/testowe/`. Nie jest wydaniem produkcyjnym, nie tworzy publicznych metadanych i nie może być używany do akceptacji aktualizacji produkcyjnej. Domyślny Android `applicationId` pozostaje **pl.ultimatepomagier.desktop**. Nie instaluj debug na istniejącej instalacji produkcyjnej — certyfikaty są inne. Testy wykonuj na oddzielnym urządzeniu/profilu z danymi syntetycznymi.

`android:release` wymaga kompletu sekretów, czystych źródeł i dokładnego tagu `vX.Y.Z`. Generuje release, wykonuje `zipalign`, podpisuje przez `apksigner`, sprawdza podpis, certyfikat, pakiet, wersję i brak flagi debug oraz obecność manifestu i natywnej biblioteki arm64. Efekt: `wydanie-android/podpisane/Ultimate_Pomagier_X.Y.Z_Android_arm64.apk`, SHA-256 i `wydanie-android.json`. Hasła są przekazywane przez zmienne środowiska, nigdy przez argument z jawną wartością. Podpisany APK nadal wymaga testów instalacji i funkcji na urządzeniu.

Stała numeracja: `versionCode = major × 1000000 + minor × 1000 + patch`; minor i patch muszą być mniejsze niż 1000, wynik maksymalnie 2100000000. Każde opublikowane wydanie musi zwiększać wersję w `package.json` oraz zgodne wersje Cargo. Nie resetuj numeracji i nie wymieniaj certyfikatu. Ponowna kompilacja tej samej wersji nie jest kolejną aktualizacją.

## Klucze i sekrety

Właściciel wydania tworzy i zabezpiecza produkcyjny keystore poza repozytorium, np. przez interaktywny `keytool -genkeypair -keystore <prywatny-katalog>/pomagier.jks -alias pomagier -keyalg RSA -keysize 3072 -validity 10000`. Nie umieszczaj hasła w historii poleceń. Zachowaj kopię zapasową keystore, aliasu i haseł: ich utrata uniemożliwi zwykłą aktualizację istniejących instalacji.

Konfiguracja procesu lokalnego:

| Zmienna | Znaczenie |
| --- | --- |
| `ANDROID_KEYSTORE_PATH` | Ścieżka do prywatnego pliku JKS poza repozytorium |
| `ANDROID_KEYSTORE_PASSWORD` | Hasło magazynu |
| `ANDROID_KEY_ALIAS` | Stały alias wydawcy |
| `ANDROID_KEY_PASSWORD` | Hasło klucza |
| `ANDROID_CERT_SHA256` | Zatwierdzony odcisk SHA-256 certyfikatu, 64 znaki hex |

Odcisk sprawdź niezależnie przez `keytool -list -v -keystore <plik>` i zapisz jako zmienną GitHub **ANDROID_CERT_SHA256**. W GitHub Actions dodaj sekrety **ANDROID_KEYSTORE_BASE64**, **ANDROID_KEYSTORE_PASSWORD**, **ANDROID_KEY_ALIAS**, **ANDROID_KEY_PASSWORD**. `ANDROID_KEYSTORE_BASE64` to pełny plik JKS zakodowany base64, nie hasło. Workflow odtwarza go wyłącznie w `RUNNER_TEMP` i usuwa po budowaniu. Nigdy nie dodawaj do Git plików `.jks`, `.keystore`, właściwości z hasłami ani prywatnych kluczy Tauri.

Windows zachowuje istniejące **TAURI_SIGNING_PRIVATE_KEY**, **TAURI_SIGNING_PRIVATE_KEY_PASSWORD** i zmienną **TAURI_UPDATER_PUBLIC_KEY**. Podpis Tauri nie jest certyfikatem Authenticode EXE; jego konfiguracja jest osobnym wymaganiem, jeśli firma wymaga podpisu Windows. Dotychczasowy updater i `latest.json` pozostają jedyną ścieżką instalowania aktualizacji EXE.

## Przygotowanie i zatwierdzenie publikacji

1. Po przeglądzie kodu, testach i zatwierdzeniu utwórz commit i tag wydania. To zadanie nie tworzy ich automatycznie.
2. Skonfiguruj opisane sekrety oraz środowisko GitHub **wydania-produkcyjne** z wymaganymi recenzentami. Sama nazwa środowiska w YAML nie konfiguruje recenzentów.
3. Uruchom ręcznie **Przygotowanie Windows, Android i WEB** na dokładnym tagu `vX.Y.Z`, podając rzeczywisty opis zmian. Proces korzysta z istniejącego workflow Windows, buduje podpisany APK i archiwum WEB.
4. Trzy platformy muszą pochodzić z jednego commita. Skrypt łączenia ponownie oblicza sumy i rozmiary. Powstaje wyłącznie **draft GitHub Release**, niedostępny w panelu zwykłego użytkownika. Nie tworzy nowego tagu, nie nadpisuje istniejącego wydania i nie publikuje go.
5. Pobierz pliki szkicu, sprawdź podpisy, instalację i aktualizację oraz wykonaj testy funkcji i zachowania danych. Debug APK ani wynik samego bundlera nie wystarczają.
6. Dopiero po Twojej akceptacji uruchom **Zatwierdzenie publikacji przygotowanego wydania** na tym samym tagu, zaznaczając zatwierdzenie. Proces ponownie sprawdza kompletność assets, digesty i commit, a następnie publikuje istniejący szkic jako stabilny Latest. Używa standardowego tokenu workflow, który nigdy nie trafia do aplikacji.

Nie uruchomiono żadnego zdalnego workflow ani publikacji podczas implementacji. WEB ZIP jest artefaktem do wdrożenia, nie automatycznym hostingiem. Publiczne logowanie przeglądarkowe pozostaje niedostępne bez właściwej usługi tożsamości; nie wdrażaj go jako produkcyjnego obejścia lokalnego logowania.

## Instalacja i aktualizacja użytkownika

W przeglądarce otwórz Pomagiera → **Pobierz aplikację — aktualizacje i wersje** → **Pobierz na Android**. Systemowa przeglądarka pobierze APK; użytkownik zezwala zaufanemu źródłu na instalację i potwierdza systemowy dialog. Kolejne wydanie instaluje się na istniejącą aplikację z tym samym pakietem i certyfikatem oraz wyższym versionCode. Nie odinstalowuj aplikacji i nie czyść jej danych. Wykonaj kopię danych przed aktualizacją. Nie ma cichej instalacji ani obchodzenia mechanizmów Androida.

## Granice akceptacji

Osobno odnotuj: lokalne testy logiki i UI; build Windows; build Android; weryfikację podpisów rzeczywistych artefaktów; zdalne CI; instalację na Windows; instalację/aktualizację APK na emulatorze lub urządzeniu; zachowanie dokumentów, draftów i ustawień po aktualizacji. W Androidzie trzeba sprawdzić pierwszą konfigurację/logowanie, dotykową nawigację, importy, generatory, PDF/DOCX, druk/pobieranie, offline i ponowne uruchomienie. Wykonanie testów przeglądarkowych w rozmiarze telefonu nie dowodzi tych operacji w Android WebView.

Źródła: [wspólny punkt wejścia desktop/mobile](https://v2.tauri.app/start/migrate/from-tauri-1/), [podpisywanie Androida](https://v2.tauri.app/distribute/sign/android/), [dotychczasowy updater Tauri](https://v2.tauri.app/plugin/updater/), [metadane assets GitHub](https://docs.github.com/en/rest/releases/assets).
