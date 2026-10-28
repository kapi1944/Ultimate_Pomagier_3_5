# Etap 4.3.3 — pierwsze oficjalne wydanie 4.0.0

## Końcowy komplet z poprawioną procedurą publikacji — 27 października 2026

**STATUS WYDANIA: SZKIC GOTOWY. Publikacja wstrzymana do obowiązkowych testów instalacyjnych i akceptacji właściciela.**

Tag **v4.0.0**, wersja **4.0.0**, commit **`cfb619f96c880367fdb9e0987b96efed06f555eb`**. W ramach zatwierdzonej naprawy wydania na `main` zapisano cztery lokalne korekty istniejącego procesu. Kod modułów aplikacji, wersje, zależności, klucze, dane użytkowników i bramka akceptacji pozostały bez zmian. Nie tworzono gałęzi, alternatywnego procesu, hostingu, nowych integracji ani kluczy. Nie uruchamiano lokalnego Cargo ani force push.

Po udanej dystrybucji `d03f9b0…` kontrola rzeczywistego szkicu ujawniła dwa błędy istniejącego skryptu zatwierdzania: endpoint `/releases/tags/v4.0.0` zwracał 404 dla szkicu, a adresy jego plików zawierały `untagged-…`. Commit `cfb619f…` ustala ID przez `gh release view` i pobiera pełne metadane po ID; walidator dopuszcza wyłącznie adresy tego samego szkicu w tym samym repozytorium. Nadal wymaga stabilnego tagu, kompletnego manifestu trzech platform, zgodnych rozmiarów, SHA-256, podpisu Windows i metadanych podpisanego Androida. Dopasowanie commita oraz Required reviewers środowiska pozostały aktywne.

Regresje obejmują prywatny szkic, nieprawidłowe ID, obce repozytorium i inne oznaczenie `untagged`. `npm run test:dystrybucja`: **15/15**; pełny lint oraz lint zmienionych plików: kod 0. Build aplikacji przeszedł przy poprzedniej korekcie; ostatnia zmiana dotyczy wyłącznie skryptu publikacji i jego regresji. Poprawiony odczyt i walidator sprawdzono na rzeczywistym szkicu ID `425256941`: osiem plików, manifest i dane wszystkich platform były zgodne z niezależnym odbiorem.

Żeby również procedura zapisana pod tagiem działała po akceptacji, zachowano lokalnie wszystkie pliki i opis tego własnego, nieopublikowanego szkicu (`tmp/etap433/powtorzenie3/`), następnie usunięto wyłącznie ten szkic, odtworzono nieopublikowany tag na poprawce i uruchomiono istniejący workflow. Nie zastępowano plików ręcznie. Nowy komplet musi pochodzić z tego samego commita co tag.

- [Końcowa dystrybucja — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40482903555): Windows, Android, WEB i automatyczny szkic — wszystkie zadania zakończone sukcesem.
- [CI końcowego commita — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40482857961).
- [Automatyczny Windows po pushu commita wydania — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40482857853), odrębny od podpisanej dystrybucji.

Końcowy [szkic Ultimate Pomagier 4.0.0](https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/tag/untagged-74babc2dea4d272e6f97), ID **425273752**: `tag_name=v4.0.0`, `draft=true`, `prerelease=false`, `published_at=null`. Zawiera osiem przesłanych plików: EXE, APK, ZIP WEB, podpis Tauri, dwie sumy `.sha256`, `latest.json` i `rejestr-wydania.json`. Poprawiony odczyt i istniejący parser potwierdziły zgodność manifestu oraz rozmiarów i SHA-256 wszystkich plików z niezależnym odbiorem trzech platform. Podpis, sumy i metadane pobrano również bezpośrednio ze szkicu. Opis uzupełniono rzeczywistymi wynikami i ograniczeniami; automatyczny blok `pomagier-wydanie` zachowano dokładnie. Wydanie nie jest jeszcze publiczne; publiczny adres `/releases/tag/v4.0.0` oraz endpoint Latest wymagają kontroli po publikacji.

Testy instalacji, uruchomienia, logowania, zamknięcia/restartu oraz zachowania danych na izolowanym Windows i Androidzie: **NIEZWERYFIKOWANE**. Nie uruchomiono publikacji. Required reviewer `kapi1944`, brak administracyjnego obejścia oraz ograniczenie środowiska do tagu `v4.0.0` zostały potwierdzone ponownie. Nazwy sześciu sekretów i dwóch zmiennych są kompletne; wartości sekretów nie były odczytywane. Do technicznego odbioru użyto wyłącznie publicznego klucza Tauri i odcisku certyfikatu Androida, bez wypisywania klucza.

Odbiór rzeczywistych plików końcowego commita zapisano w ignorowanym `tmp/etap433/powtorzenie4/`, oddzielnie od poprzednich prób:

| Plik | Rozmiar w bajtach | SHA-256 | Odbiór techniczny |
| --- | ---: | --- | --- |
| `Ultimate_Pomagier_4.0_Setup.exe` | 227349343 | `b80c635b6a7bbf7fab3cd34be329eb26635d1e7693303f3a3af294765e79398d` | PASS: x64, wersja 4.0.0, commit, SHA-256, kryptograficzny podpis Tauri i latest.json; Authenticode **NotSigned** |
| `Ultimate_Pomagier_4.0.0_Android_arm64.apk` | 16734748 | `d8d6a3569f2506a0b1093d8fb0f76e9bdc10acebc5936343de7723fb93eef926` | PASS: podpis/certyfikat, pakiet, wersja, brak debug, ARM64, kompletność, integralność, ELF i ZIP 16 KB |
| `Ultimate_Pomagier_4.0.0_WEB.zip` | 6553347 | `1cd74befad7f21e85cf71aa0444ed09743999887ee43fd89d1836d4746fdd6c9` | PASS: manifest produkcyjny, wersja/commit/czyste źródła, ZIP, uruchomienie, odrzucenie sesji demo i logowania bez usługi kont |

Android: `applicationId=pl.ultimatepomagier.desktop`, `versionCode=4000000`, minSdk 26, targetSdk 36, ABI `arm64-v8a`, `debuggable=false`. Certyfikat SHA-256 `d93a9ec7961647e18f7a11949d04bebd3a63c4ad984b5a1a422c5e584aadfd02` zgodny z konfiguracją i manifestem. Użyto `apksigner`, `aapt`, `zipalign` oraz istniejącej walidacji bibliotek. WEB otwarto z rzeczywistego ZIP w osobnym profilu Chrome z syntetyczną sesją, bez użycia rzeczywistych danych; brak błędów JavaScript. Nie jest to potwierdzenie logowania produkcyjnego — archiwum nie zapewnia usługi tożsamości. Dane pozostają lokalne dla urządzenia/profilu, bez automatycznej synchronizacji.

Windows: FileVersion i ProductVersion rzeczywistego EXE wynoszą 4.0.0. Podpis Tauri sprawdzono kryptograficznie Ed25519/BLAKE2b wraz z podpisem komentarza i identyfikatorem klucza, po dodatnim i ujemnym wektorze kontrolnym z lokalnego minisign-verify. `latest.json` ma wersję 4.0.0, platformę `windows-x86_64`, dokładny podpis `.sig` i docelowy adres `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/v4.0.0/Ultimate_Pomagier_4.0_Setup.exe`. Endpoint aktualizatora pozostaje `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/latest/download/latest.json`. `Get-AuthenticodeSignature` zwróciło **NotSigned**; podpis Tauri go nie zastępuje. Kontrola produkcyjnego frontendu przeszła w oficjalnym buildzie; uruchomienie interfejsu wewnątrz zainstalowanej aplikacji pozostaje NIEZWERYFIKOWANE.

Stan repozytorium na końcu: lokalny `main` i `origin/main` wskazują już późniejszy commit **`ae2c5259f7514b6555d7e3aaf4438388c4be2647`**, dotyczący Poprawiacza prezentacji. Zaobserwowano go w końcowej kontroli; nie ustalano autora procesu ani nie analizowano nowego modułu. Nie zmienia on workflow dystrybucji ani skryptu publikacji. Tag, manifest i wszystkie odebrane artefakty nadal wskazują **`cfb619f96c880367fdb9e0987b96efed06f555eb`**; późniejszych zmian nie dołączano do wydania i nie przesuwano tagu. Pozostawiono tylko lokalną modyfikację tego raportu, bez stage i commita dokumentacji. `git diff --check` bez błędów. Wyniki testów i CI tego wydania odnoszą się do jego tagu, nie do późniejszego modułu na main.

Warunki odbioru przez właściciela/IT przed publikacją:

1. Windows: zatwierdzona izolowana VM/komputer z Windows 10/11 x64 i syntetycznym profilem. Zainstalować końcowy EXE, uruchomić, skonfigurować syntetyczne konto i zalogować. Zapisać dokument lub zadanie, zamknąć aplikację, uruchomić ponownie i potwierdzić zachowanie danych oraz ponowne logowanie. Uzgodnić dopuszczenie instalatora z IT przy braku Authenticode; nie obchodzić zabezpieczeń.
2. Android: izolowane urządzenie lub emulator ARM64, Android 8.0/API 26 lub nowszy. Zainstalować końcowy produkcyjny APK, skonfigurować syntetyczne konto, zalogować, sprawdzić podstawowe moduły i zapisać dokument. Zrestartować aplikację i potwierdzić zachowanie danych. Nie czyścić ani nie odinstalowywać rzeczywistych danych użytkowników.
3. Dopiero po potwierdzeniu obu odbiorów uruchomić istniejący `publikacja-wydania.yml` na `v4.0.0` z `zatwierdzam=true` i zaakceptować środowisko jako właściciel. Następnie anonimowo sprawdzić publiczne Latest, manifest i pobieranie każdego pliku z porównaniem SHA-256. Nie uruchamiano tego workflow w ramach przygotowania szkicu.

## Odbiór kompletu d03f9b0 — 27 października 2026 (zapis historyczny)

**STATUS WYDANIA: ZABLOKOWANE do publikacji — oczekiwanie na komplet artefaktów i odbiór instalacyjny.**

Punkt wydania: **v4.0.0 / 4.0.0 / `d03f9b02f5819aa896782f184d1c8914efcbe45e`**. Lokalny main, origin/main i tag wskazują ten commit. Na początku wznowienia właściciel zatwierdził naprawę procesu, commit, usunięcie i odtworzenie nieopublikowanego tagu oraz ponowienie dystrybucji. Wszystkie zmiany tagu wykonano przez usunięcie i zwykły push; nie używano force push. Przed kolejnymi próbami potwierdzano brak Release. Dotychczasowe pliki i raporty zachowano.

Wykonane lokalne korekty istniejącego procesu, bez aktualizacji zależności, zmiany wersji, kluczy lub kodu funkcjonalnego aplikacji:

| Commit | Potwierdzona przyczyna / korekta |
| --- | --- |
| `faba1bf116d0614deaa53eb956b0c47ee0570aba` | Akcja SDK domyślnie żąda niedostępnego `tools`; jawne `packages: 'platform-tools'` w istniejącym workflow |
| `6faf2db410f005bbef5c542ccfc3e94930bc38d1` | Gradle zgłasza `Missing script: tauri`; standardowy wpis `tauri` w package.json dla generowanego projektu Android |
| `d03f9b02f5819aa896782f184d1c8914efcbe45e` | Po udanej kompilacji walidator odrzucił niekompletne APK; kopiowanie `libc++_shared.so` istniało wyłącznie w ścieżce odmowy dowiązań Windows. Przygotowanie tej samej biblioteki z właściwego NDK przeniesiono przed pakowanie także na Linuxie. Regresja obejmuje hosty Linux/Windows, ARM64/x64 i brak NDK. Zachowano wymóg obu bibliotek, ABI, podpisów i stron 16 KB; błąd brakujących plików podaje teraz ich nazwy |

Weryfikacja korekt: `npm run tauri -- --version` i pomoc `android android-studio-script` potwierdziły kontrakt bez kompilacji Cargo. `npm run test:dystrybucja`: **14/14**; `npm run lint` i `npm run build`: kod 0. Build zachowuje znane ostrzeżenia o rozmiarze chunków i statycznym/dynamicznym imporcie Tauri. Po ostatniej drobnej zmianie diagnostyki ponowiono testy dystrybucji i lint obu zmienionych plików. Staged diff przejrzano przed każdym commitem; raport pozostawał poza stage. Nie uruchamiano lokalnego Cargo ani nie obchodzono Code Integrity.

- [CI bieżącego commita — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40480522931).
- [Dystrybucja bieżącego commita](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40480559177) — Windows, Android i WEB **SUCCESS**; automatyczne przygotowanie szkicu w toku.
- Próba `faba1bf…`: [40473582744](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40473582744), Android odrzucony przez brak skryptu Tauri; po ustaleniu przyczyny zatrzymano pozostałe własne zadania tego przebiegu.
- Próba `6faf2db…`: [40474587763](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40474587763), Windows i WEB **SUCCESS**, Android **FAILURE** przy kontroli kompletności APK, szkic **SKIPPED**.

WEB bieżącego commita: `Ultimate_Pomagier_4.0.0_WEB.zip`, **6553339 bajtów**, SHA-256 `bdebb7bbe7414d1de023a7d7f1b52352189762ccfd648742b7025ce568cd7d60`. Odbiór rzeczywistego ZIP, manifestu produkcyjnego, wersji/commita, czystych źródeł, uruchomienia w odizolowanym Chrome, odrzucenia syntetycznej sesji demo oraz logowania bez usługi kont: **PASS**, bez błędów JavaScript. Bieżące artefakty i wyniki zapisano odrębnie w ignorowanym `tmp/etap433/powtorzenie3/`; wcześniejsze próby zachowano.

APK bieżącego commita: `Ultimate_Pomagier_4.0.0_Android_arm64.apk`, **16734748 bajtów**, SHA-256 `dc31703513c1d38d20bc51d0d79cc47b679337b52cadee665ccf9076ecdffce1`. Niezależny odbiór pobranego pliku: **PASS**. `apksigner verify --verbose --print-certs` potwierdził podpis; certyfikat SHA-256 `d93a9ec7961647e18f7a11949d04bebd3a63c4ad984b5a1a422c5e584aadfd02` jest zgodny z konfiguracją i manifestem. `aapt dump badging`: applicationId `pl.ultimatepomagier.desktop`, wersja 4.0.0, versionCode 4000000, minSdk 26, targetSdk 36, ABI `arm64-v8a`, brak debug. Odczyt APK, integralność podpisanego archiwum, komplet obu bibliotek, architektura ELF, segmenty i `zipalign -c -P 16 4`: **PASS**. Użyto istniejącego lokalnego JDK i build-tools 36.1.0 wyłącznie do odczytu, nie kompilowano Cargo. Wynik: `tmp/etap433/powtorzenie3/android-odbior.json`.

Testy instalacji, logowania, restartu i zachowania danych na izolowanym Windows oraz Androidzie: **NIEZWERYFIKOWANE**. Nie uruchomiono `publikacja-wydania.yml`. Publikacja wymaga zakończenia tych testów, odbioru kompletu plików i akceptacji właściciela w `wydania-produkcyjne`. Dane pozostają lokalne; archiwum WEB nie zapewnia usługi tożsamości ani produkcyjnego logowania. Authenticode jest odrębny od podpisu Tauri; pierwszy rzeczywisty instalator był **NotSigned**, co wymaga uzgodnienia z IT przy wdrożeniu firmowym.

## Pierwsze wznowienie po akceptacji — 27 października 2026 (zapis historyczny)

**STATUS WYDANIA: ZABLOKOWANE do publikacji — trwa przygotowanie kompletu artefaktów.** Właściciel zatwierdził commit przygotowanej poprawki Android SDK oraz usunięcie i odtworzenie nieopublikowanego tagu `v4.0.0`. Nie jest wymagana ponowna zgoda na te wykonane czynności.

- Commit wydania: `faba1bf116d0614deaa53eb956b0c47ee0570aba`, wersja **4.0.0**, gałąź `main`.
- Commit zawiera wyłącznie jedną linię `.github/workflows/dystrybucja.yml`: `packages: 'platform-tools'`. Przed commitem przejrzano staged diff i `git diff --cached --check`; 13 testów dystrybucji przeszło w pierwszym przebiegu dla dokładnie tej poprawki. Raport pozostawiono poza commitem.
- Wykonano zwykły push main, zatwierdzone usunięcie starego tagu oraz utworzenie i zwykły push nowego tagu na tym commicie. Bez force push, przełączania gałęzi, zmiany wersji, zależności, kluczy lub danych.
- [Ponowna dystrybucja](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40473582744): `workflow_dispatch`, tag `v4.0.0`, dokładnie nowy commit. Android przeszedł konfigurację SDK i rozpoczął produkcyjną kompilację; Windows również jest w kompilacji; WEB zakończył się sukcesem.
- [CI poprawki — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40473509527). Dodatkowy [automatyczny workflow Windows po pushu main](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40473509856) jest odrębny od podpisanego buildu dystrybucji.

Nowy WEB odebrano niezależnie z artefaktu workflow, w izolowanym profilu Chrome: wersja i commit zgodne, źródła czyste, manifest produkcyjny, ZIP odczytany, syntetyczna sesja demo odrzucona, logowanie bez usługi kont odrzucone, brak błędów JavaScript. `Ultimate_Pomagier_4.0.0_WEB.zip`: **6553331 bajtów**, SHA-256 `98f265d83fd13c48031f0904560db899eb72f82b0ccde1c61c729a93e7de5388`. Wyniki i zrzut: `tmp/etap433/powtorzenie1/web-odbior.json` i `web-odbior.png`.

Nowe pliki i wyniki są odseparowane od pierwszego przebiegu w ignorowanym `tmp/etap433/powtorzenie1/`; wcześniejszych plików nie usuwano. Do ukończenia pozostaje odbiór rzeczywistych Windows/APK i kompletnego szkicu. Testy instalacji, logowania, restartu i trwałości danych na izolowanym Windows oraz Androidzie pozostają **NIEZWERYFIKOWANE**. Nie uruchomiono publikacji ani lokalnego Cargo.

## Pierwsza próba — 27 października 2026 (zapis historyczny)

**STATUS WYDANIA: ZABLOKOWANE — błąd konfiguracji Android SDK w workflow.** Konfiguracja podpisów i bramki akceptacji jest kompletna według bieżącego odczytu GitHub. Na zatwierdzonym przez właściciela commicie `a78d1ea0cbdd4f6bd4465db3c71011be0c760701` utworzono i zwykłym pushem wypchnięto tag `v4.0.0`. Uruchomiono istniejącą dystrybucję; Windows i WEB zakończyły się sukcesem, Android błędem, utworzenie szkicu zostało pominięte. Nie uruchomiono publikacji.

| Kontrola | Bieżący wynik |
| --- | --- |
| Repozytorium / gałąź | `kapi1944/Ultimate_Pomagier_3_5` / `main` |
| HEAD, lokalne origin/main i zdalne main przez API | Zgodne: `a78d1ea0cbdd4f6bd4465db3c71011be0c760701` |
| Pierwotny commit / decyzja właściciela | `10443b17db3c11f95149fdfa678b43cb6be31abc` — rodzic HEAD; właściciel następnie zatwierdził obecny main `a78d1ea…` dla tagu |
| Różnica między tymi commitami | Wyłącznie dwa raporty w `docs/`; brak zmian kodu, wersji i workflow |
| Początkowe drzewo robocze | Czyste; `git diff --check` bez błędów |
| package.json / Cargo.toml | `4.0.0` / `4.0.0` |
| Tag `v4.0.0` | Utworzony lokalnie i wypchnięty na GitHub; wskazuje zatwierdzony `a78d1ea…` |
| Releases, w tym szkice | Uwierzytelnione API: pusta lista |
| GitHub Actions | Włączone; CI, Windows, dystrybucja i publikacja aktywne |
| Sekrety repozytorium | Wszystkie sześć wymaganych nazw obecne |
| Zmienne repozytorium | Obecne `TAURI_UPDATER_PUBLIC_KEY` i `ANDROID_CERT_SHA256` |
| `wydania-produkcyjne` | Required reviewer: `kapi1944`; `can_admins_bypass=false`; dopuszczony wyłącznie tag `v4.0.0` |
| Samodzielne zatwierdzenie właściciela | `prevent_self_review=false`; wymagana akceptacja pozostaje aktywna |

Kompletność konfiguracji sprawdzono wyłącznie na podstawie nazw i metadanych. Nie odczytywano ani nie ujawniano wartości sekretów. Późniejsza weryfikacja kryptograficzna EXE użyła publicznego klucza ze zmiennej `TAURI_UPDATER_PUBLIC_KEY`, bez jego wypisywania. Nie tworzono ani nie zmieniano kluczy. Historyczne instrukcje tworzenia kluczy poniżej nie są obecnie czynnością do wykonania.

### CI i publikacja

- [CI obecnego main — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40347608168).
- [Instalator Windows obecnego main — SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40347607958). Odczyt kroków potwierdził sukces testów, lint, launchera, pakietowania i kompilacji testowej; podpisany stabilny build został pominięty.
- Wyniki CI wskazanego `10443b1…` pozostają zapisane w historycznej części raportu. Nie powtarzano testów aplikacji, lint ani build; nie zmieniano kodu. Nie uruchamiano lokalnego Cargo ani nie instalowano zależności.
- [Dystrybucja v4.0.0 — FAILURE](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/40469222583), dokładnie commit `a78d1ea0cbdd4f6bd4465db3c71011be0c760701`: Windows **SUCCESS**, WEB **SUCCESS**, Android **FAILURE**, szkic **SKIPPED**.
- `publikacja-wydania.yml`: nie uruchomiono. Brak szkicu i APK blokuje publikację. Wymaganej akceptacji środowiska nie zmieniano.

Przyczyna błędu Androida jest potwierdzona logiem zadania `122071981175`: akcja `android-actions/setup-android@v3` wywołuje domyślnie `sdkmanager tools`; odpowiedź SDK: `Failed to find package 'tools'`, kod 1. Awaria wystąpiła przed kompilacją i przygotowaniem klucza. Odczyt `action.yml` używanej wersji akcji potwierdził domyślne `packages: 'tools platform-tools'`.

Przygotowano lokalną poprawkę jednej linii `.github/workflows/dystrybucja.yml`: jawne `packages: 'platform-tools'`. Następny istniejący krok nadal instaluje NDK 27.2.12479018, platformę 36 i build-tools 36.0.0. Nie zmieniano architektury, wersji akcji ani zależności. Poprawka nie została jeszcze uruchomiona w Actions; nie jest potwierdzonym sukcesem Androida. `npm run test:dystrybucja`: **13/13**, kod 0. Nie dodawano testu powielającego pojedynczą linię YAML. Samodzielna kontrola parserem YAML nie została wykonana — brak lokalnego modułu; nie instalowano zależności.

Adres aktualizatora w konfiguracji i skrypcie podpisanego Windows jest zgodny z docelowym repozytorium: `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/latest/download/latest.json`. Rzeczywisty `latest.json` wskazuje `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/v4.0.0/Ultimate_Pomagier_4.0_Setup.exe`, wersję 4.0.0, platformę `windows-x86_64` i dokładnie podpis z pobranego pliku `.sig`. Adres pobierania pozostanie niedostępny do publikacji Release.

### Status platform i odbioru

| Platforma | Artefakt i podpisy | Test instalacyjny / uruchomieniowy |
| --- | --- | --- |
| Windows x64 | Podpisany build **SUCCESS**, artefakt Actions `Ultimate-Pomagier-Windows-1`, ID `12718520987`; SHA-256, wersja, metadane commita, podpis Tauri i latest.json **PASS**; Authenticode **NotSigned** | Instalacja, logowanie, zamknięcie, restart i zachowanie danych: **NIEZWERYFIKOWANE** |
| Android ARM64 | Oficjalnego produkcyjnego APK brak. Certyfikat, applicationId, versionCode, ABI, brak debug i integralność: **NIEZWERYFIKOWANE** | Instalacja, logowanie, moduły, restart i zachowanie danych: **NIEZWERYFIKOWANE** |
| WEB | Artefakt Actions `Ultimate-Pomagier-WEB`, ID `12718056501`; wersja, commit, manifest produkcyjny i SHA-256 zgodne | **PASS**: rzeczywiste archiwum w izolowanym profilu Chrome, syntetyczna sesja demo odrzucona, logowanie bez usługi kont odrzucone, brak błędów JavaScript |

ZIP WEB: `Ultimate_Pomagier_4.0.0_WEB.zip`, **6553339 bajtów**, SHA-256 `d11e31b6d039ff93c9cc80140589d88053e15e36d15baf9172e2a4407ff6b8ac`. Po pobraniu porównano sumę i rozmiar z `wydanie-web.json`, odczytano ZIP oraz `wersja.json` i `tryb-frontendu.json`: wersja 4.0.0, commit `a78d1ea…`, czyste źródła i tryb produkcyjny. Test otworzył pliki wyłącznie na lokalnym serwerze, w nowym profilu Chrome, z odciętymi żądaniami do usług zewnętrznych. Nie używano rzeczywistych kont ani danych. Zapis lokalny: `tmp/etap433/web-odbior.json`, `tmp/etap433/web-odbior.png`; skrypt kontroli w tym samym ignorowanym katalogu. Test nie potwierdza logowania produkcyjnego — jego niedostępność bez usługi została sprawdzona.

EXE Windows: `Ultimate_Pomagier_4.0_Setup.exe`, **227347370 bajtów**, SHA-256 `f996292cc2848c4f599a4bb24911226a304a48aba5a222ced6610a9974ca7de8`. Porównano rozmiar, hash pliku i wpis `.sha256` z `wydanie-windows.json`; metadane `wersja.json` wskazują wersję 4.0.0, zatwierdzony commit i czyste źródła. Zasoby wersji rzeczywistego EXE: FileVersion/ProductVersion 4.0.0. Podpis Tauri sprawdzono kryptograficznie przez Ed25519/BLAKE2b, wraz z podpisem komentarza i zgodnością identyfikatora publicznego klucza. Przed kontrolą EXE procedura przeszła poprawny i zmieniony wektor z lokalnego `minisign-verify` 0.3.0; nie kompilowano Rust. `latest.json` i hash pliku `.sig` są zgodne. Wynik lokalny: `tmp/etap433/windows-odbior.json`; skrypt kontroli i pobrane pliki w tym samym ignorowanym katalogu.

`Get-AuthenticodeSignature` rzeczywistego EXE zwróciło **NotSigned**. Nie uruchamiano instalatora ani nie obchodzono polityk firmowego Windows. Kontrola produkcyjnego frontendu jest potwierdzona przez sukces istniejącego kroku budowania z `kontrolaTrybuFrontendu.mjs`; niezależny odbiór interfejsu wewnątrz zainstalowanego EXE pozostaje **NIEZWERYFIKOWANY**.

Podpis Tauri nie zastępuje Authenticode. Istniejąca konfiguracja Windows nie zawiera podpisywania Authenticode; jego brak będzie ograniczeniem wdrożenia firmowego. Ewentualny wymóg i zatwierdzony sposób podpisania uzgodnić z IT. Archiwum WEB nie zapewnia usługi tożsamości ani produkcyjnego logowania. Dane pozostają lokalne dla urządzenia/profilu.

### Pozostałe decyzje i czynności

1. Właściciel zatwierdził `a78d1ea…`; tagowanie i pierwsza dystrybucja zostały wykonane. Nowa blokada wymaga osobnej decyzji: commit przygotowanej poprawki workflow na main, usunięcie nieopublikowanego tagu `v4.0.0` i odtworzenie go na nowym commicie oraz ponowna dystrybucja, bez force push. Zadano to pytanie przed zmianą istniejącego tagu. Do czasu decyzji tag pozostaje bez zmian; lokalnej poprawki nie commitowano ani nie wypychano.
2. Po decyzji i ponownym sprawdzeniu stanu GitHub uruchomić istniejący `dystrybucja.yml` na zatwierdzonym tagu. Przygotowany opis rzeczywistych zmian znajduje się w `tmp/etap433/opis-zmian.md`; należy zaktualizować go do ostatecznego SHA. Automatyczny blok `pomagier-wydanie` ma pochodzić z workflow; nie tworzono zastępczego manifestu ani ręcznego Release.
3. Odebrać ponownie komplet trzech artefaktów tego samego commita oraz prywatny szkic. Przeprowadzić odbiór na izolowanym Windows i Androidzie, z danymi syntetycznymi. Nie znaleziono lokalnie WindowsSandbox/VBoxManage ani skonfigurowanego AVD; testów instalacyjnych nie wykonano. WEB z pierwszego przebiegu odebrano, ale nowe archiwum wymaga kontroli zgodności. Brak obowiązkowego odbioru blokuje publikację.
4. Po kompletnym odbiorze uruchomić `publikacja-wydania.yml` na tagu i pozostawić wymaganą akceptację właścicielowi w `wydania-produkcyjne`. Następnie sprawdzić publiczną widoczność i pobieranie plików.

Docelowy [Release v4.0.0](https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/tag/v4.0.0) jeszcze nie istnieje. Lokalnie zmieniono wyłącznie ten raport i jedną linię workflow dystrybucji. Nie wykonano commita; push dotyczył wyłącznie nowego, zatwierdzonego tagu. Nie przełączano gałęzi, nie usuwano danych, nie zmieniano kluczy ani polityk bezpieczeństwa. Nie wykonywano lokalnego Cargo ani force push.

## Historyczny przebieg — 26 października 2026

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
