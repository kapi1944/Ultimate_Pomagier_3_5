# Konsolidacja lokalnych repozytoriów — 26 października 2026

Docelowe środowisko: `C:\Users\madej\Documents\____GitHub_Projects\___Projekty_GitHub\Ultimate_Pomagier_4_aktualny`, gałąź **main**, origin `https://github.com/kapi1944/Ultimate_Pomagier_3_5.git`.

## Zabezpieczenie i stan początkowy

- Zdalne main, lokalne main i origin/main wskazywały `10443b17db3c11f95149fdfa678b43cb6be31abc`. Po `git fetch origin main` różnica wynosiła 0/0; fast-forward nie był potrzebny.
- Docelowy katalog zawierał jedynie nieśledzony raport `docs/raport-wydania-v4.0.0.md` z poprzedniego zadania.
- Stary `Ultimate_Pomagier_3_5` pozostał na `codex/integracja-v4-desktop`, HEAD `82c2ed1c7f0f49b7d797ec983172863ce6faa5f8`: 0 unikalnych commitów, 9 commitów za main, dokładnie 12 zmodyfikowanych i 5 nieśledzonych plików. Nie przełączano tej gałęzi ani nie modyfikowano starych plików.
- Prywatna kopia poza repozytoriami: `C:\Users\madej\Documents\Pomagier-zabezpieczenie-20261026-433`. Zawiera wszystkie 17 plików starego katalogu, wcześniejszy raport nowego katalogu, binarne patche zmian i stage, zapis statusu i HEAD oraz manifest SHA-256. Każdą kopię porównano ze źródłem.
- ACL kopii i katalogu nowych kluczy ograniczono do bieżącego użytkownika oraz SYSTEM. Nie wykonano stash, reset, clean, usunięcia katalogu ani nadpisania historii. Stary katalog, jego zależności, lokalne narzędzia, konfiguracje i dane pozostawiono na miejscu. Nie przenoszono profili aplikacji ani danych przeglądarki.

## Rozliczenie 17 zmian starego katalogu

Porównano robocze pliki ze współczesnym main, a nie tylko różnice między commitami. Żaden plik aplikacji nie wymagał kopiowania.

| Plik starego katalogu | Decyzja i przyczyna |
| --- | --- |
| `docs/etap-4-2-0-tozsamosc-windows.md` | Zachowany w kopii jako historyczne uzupełnienie odbioru etapu 4.2.0; nie zastępuje aktualnych raportów. |
| `package.json` | Nie przenoszono rozszerzenia test:konta o stary logowanieDev.test.mjs; bieżące testy pokrywają nowszą izolację demo. |
| `src/App.tsx` | Nie przywracano dawnego wejścia DEV bez hasła w miejsce aktualnego przepływu tożsamości. |
| `src/aplikacja/logowanie/KontekstUzytkownika.tsx` | Nowszy main obsługuje potwierdzoną sesję; lokalna wersja pochodzi sprzed tego mechanizmu. |
| `src/aplikacja/logowanie/PanelLogowania.tsx` | Dawny wybór profilu DEV nie zastępuje obecnego panelu i logowania natywnego. |
| `src/aplikacja/logowanie/sesjaUzytkownika.ts` | Zachowano aktualną izolację sesji demo zamiast rozszerzać ją na zwykły DEV. |
| `src/aplikacja/logowanie/uwierzytelnianie.ts` | Zachowano obecnego klienta tożsamości i znacznik serwera demo. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts` | Optymalizacje już w main; main dodatkowo zbiera problemy modelu również przy ponownej kontroli jakości. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KartaGrupySzkoleniowej.tsx` | Identyczny z main po normalizacji końców linii. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx` | Identyczny z main po normalizacji końców linii. |
| `testy/loaderDemoKont.mjs` | Zachowano nowszy kontrakt środowiska testowego zgodny z bieżącym uwierzytelnianiem. |
| `vite.config.ts` | Main ma izolację demo i szersze wykluczenia obserwacji katalogów kompilacji. Nie przywracano starego znacznika logowania DEV. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/indeksLokalizacjiSzczegolow.ts` | Już w main; nowszy kod dodatkowo ma migawkę danych i ochronę pustej nazwy. |
| `testy/indeksLokalizacjiSzczegolow.test.ts` | Main ma rozszerzone regresje migawki, mutacji oraz pustych nazw. |
| `testy/logowanieDev.przegladarka.test.mjs` | Zachowany w kopii; testuje historyczny wybór profilu DEV, którego współczesny main nie udostępnia. |
| `testy/logowanieDev.test.mjs` | Zachowany w kopii; zakłada build demonstracyjny, obecnie celowo odrzucany. Aktualne testy bezpieczeństwa pokrywają ten kontrakt. |
| `testy/wydajnoscSzczegolow.przegladarka.test.mjs` | Main zawiera tę implementację wraz z późniejszymi regresjami jakości, statusów i kartoteki. |

Nie wprowadzono alternatywnego logowania ani nie zmieniono kodu użytkowego, wersji, zależności i lockfile. Nie utracono historycznych zmian, nawet gdy ich rozwiązanie zostało zastąpione w main.

## Przyczyna zgłoszenia Missing script i narzędzia

W sprawdzonym docelowym package.json **już istnieją** `desktop:dev`, `desktop:release`, `android:release` oraz `web:release`. Polecenie `npm run desktop:dev -- --help` poprawnie uruchamia lokalny Tauri. Nie odtworzono Missing script; bez zapisu pierwotnej sesji nie da się ustalić jej katalogu/pakietu. Nie dopisywano ponownie istniejących skryptów.

Do dalszej pracy używać jawnego katalogu:

```powershell
Set-Location -LiteralPath 'C:\Users\madej\Documents\____GitHub_Projects\___Projekty_GitHub\Ultimate_Pomagier_4_aktualny'
npm prefix
npm run desktop:dev
```

Ostatnie polecenie uruchamia lokalną kompilację Cargo. Obowiązuje wcześniejsze ograniczenie właściciela związane z Code Integrity, dopóki właściciel nie dopuści zwykłej próby. Nie zmieniano polityk Windows i nie obchodzono blokad.

| Narzędzie | Dostępność i zakres |
| --- | --- |
| Node / npm | Globalne, `C:\Program Files\nodejs`, wersje 24.17.0 / 12.0.2. |
| GitHub CLI | Globalne, 2.97.0; uwierzytelnione operacje repozytorium dostępne. |
| Rust / Cargo | Globalny rustup w profilu użytkownika; rustc 1.99.1, Cargo 1.99.1, target hosta x86_64-pc-windows-msvc. Stare repo ma dodatkową lokalną instalację .desktop-tools/cargo i rustup — nie przenoszono jej. |
| Tauri | Lokalny dla projektu, @tauri-apps/cli 2.12.4 w node_modules; nie wymaga globalnego polecenia tauri. |
| Zależności npm | node_modules dostępne; npm ls poprawne, porównanie wersji z lockfile: 0 różnic. Nie wykonywano zbędnego npm ci. |
| JDK / keytool | Android Studio JBR 21.0.10: `C:\Program Files\Android\Android Studio\jbr`. Nie jest domyślnie w PATH. |
| Android SDK | `C:\Users\madej\AppData\Local\Android\Sdk`; adb 37.0.0, platformy android-36 i 36.1; build-tools 35.0.0, 36.1.0 i 37.0.0. |
| Braki lokalnego budowania Androida | Brak NDK 27.2.12479018, cmdline-tools, build-tools dokładnie 36.0.0 i targetu Rust aarch64-linux-android. Istniejący workflow instaluje je na runnerze; nie są potrzebne do desktopowego frontendu ani konfiguracji podpisów. |

Zmienne profilu procesu izolowanego przekierowują LOCALAPPDATA; sprawdzono również rzeczywisty profil użytkownika. Nie uznano braku SDK w przekierowanym profilu za brak instalacji na komputerze.

Serwer `npm run dev -- --host localhost --port 1420 --strictPort` uruchomił się. Odczyt HTTP strony zwrócił 200, a endpoint identyfikacji launchera potwierdził dokładnie katalog Ultimate_Pomagier_4_aktualny. Jest to kontrola frontendu, nie potwierdzenie uruchomienia natywnego okna Windows.

## Pierwsze klucze i GitHub Actions

Właściciel jednoznacznie potwierdził brak wcześniejszych kluczy produkcyjnych i zgodę na utworzenie pierwszych. W sprawdzonych katalogach nie znaleziono kluczy produkcyjnych Pomagiera; istniejącego debug.keystore ani klucza adb nie użyto do produkcji.

- Utworzono parę Tauri i produkcyjny JKS Android RSA 3072, alias pomagier, poza repozytoriami: `C:\Users\madej\Documents\Pomagier-klucze-produkcyjne`.
- Hasła wygenerowano kryptograficznie i zapisano wyłącznie jako `hasla.dpapi`, chronione przez Windows DPAPI bieżącego użytkownika. Nie wypisywano ich, nie przekazywano w argumentach systemowych procesów ani nie zapisywano jawnie do raportów lub repozytorium.
- Skrypt `konfiguruj-podpisy.mjs` w tym prywatnym katalogu odmawia nadpisania kluczy i istniejących ustawień GitHub. Wyjście narzędzi generujących/podpisujących przechwycono bez wyświetlania.
- Sprawdzono format publicznego klucza Tauri, odczyt certyfikatu JKS oraz podpisano syntetyczny plik kluczem Tauri. To kontrola nowych kluczy, nie podpisu przyszłego EXE/APK.
- Kopia kluczy i zaszyfrowanych haseł znajduje się w prywatnym podkatalogu `klucze-produkcyjne` wskazanej kopii bezpieczeństwa; sprawdzono identyczność SHA-256.
- GitHub CLI przekazał wartości przez stdin. Późniejszy odczyt nazw potwierdził **6 sekretów i 2 zmienne**.

| Rodzaj w repozytorium GitHub | Nazwa | Wymagana zawartość |
| --- | --- | --- |
| Secret | TAURI_SIGNING_PRIVATE_KEY | Zawartość prywatnego klucza Tauri. |
| Secret | TAURI_SIGNING_PRIVATE_KEY_PASSWORD | Hasło tego klucza. |
| Secret | ANDROID_KEYSTORE_BASE64 | Cały produkcyjny JKS zakodowany base64. |
| Secret | ANDROID_KEYSTORE_PASSWORD | Hasło JKS. |
| Secret | ANDROID_KEY_ALIAS | Stały alias klucza Androida. |
| Secret | ANDROID_KEY_PASSWORD | Hasło klucza Androida. |
| Variable | TAURI_UPDATER_PUBLIC_KEY | Zawartość odpowiadającego pliku .pub w formacie Tauri. |
| Variable | ANDROID_CERT_SHA256 | Odcisk certyfikatu Androida: 64 znaki hex, bez dwukropków. |

Utworzono środowisko **wydania-produkcyjne**, Required reviewers: **kapi1944**, can_admins_bypass=false, reguła wdrożenia wyłącznie tagu **v4.0.0**. Prevent self-review=false umożliwia odbiór przez właściciela również przy jednoosobowej obsłudze; wymaganej akceptacji nie usunięto. Nie uruchamiano publikacji ani dystrybucji i nie tworzono tagu.

Tauri i Android mają obecnie skonfigurowaną tożsamość podpisującą. **Certyfikat Authenticode nie został utworzony ani dostarczony**; podpis Tauri go nie zastępuje. Gotowość przyszłego oficjalnego artefaktu nadal wymaga podpisanego buildu i odbioru.

## Kontrole i działania właściciela

W docelowym katalogu przeszły: `npm test` (z pretest i test:konta), `npm run lint`, `npm run build`, `npm run test:desktop` i `npm run test:dystrybucja`. Build zachowuje znane ostrzeżenia o rozmiarze bundle i statycznym/dynamicznym imporcie Tauri. Kontrola dokumentacji obejmuje przegląd zmian i git diff --check. Nie wykonywano nowych testów przeglądarkowych całej aplikacji ani kompilacji Cargo.

Pełne uruchomienie natywnego Windows: **NIEZWERYFIKOWANE**. Sprawdzono rozpoznanie komendy desktop:dev, lokalne CLI i frontend. Nie utożsamiać tego z odbiorem okna, logowania i danych aplikacji.

Pozostałe czynności:

1. Rozstrzygnąć jedną zwykłą próbę desktop:dev wobec wcześniejszego zakazu lokalnej kompilacji. Jeżeli Windows odmówi uruchomienia narzędzi, uzgodnić dozwolone środowisko z IT; nie wyłączać Code Integrity.
2. Zabezpieczyć kopię kluczy także na odrębnym, zatwierdzonym nośniku. Obecna kopia leży na tym samym komputerze. **DPAPI zależy od bieżącego konta Windows**; samo skopiowanie hasla.dpapi na inny komputer nie zapewnia odzyskania haseł. Przed zmianą/utratą profilu właściciel powinien zapisać hasła w zatwierdzonym menedżerze sekretów, lokalnie, bez przesyłania ich w czacie. Skrypt używa DPAPI do konfiguracji GitHub bez ich wyświetlania.
3. Jeśli wymagany jest lokalny build Androida: w Android Studio → SDK Manager doinstalować Android SDK Command-line Tools, NDK 27.2.12479018 i build-tools 36.0.0; ustawić JAVA_HOME, ANDROID_HOME, NDK_HOME w sesji i dodać target Rust. Obecne przygotowanie przez Actions tego lokalnie nie wymaga.
4. Przed wydaniem uzgodnić wymagania Authenticode z IT i przeprowadzić odbiór produkcyjnych EXE/APK/WEB. Brak testu instalacji nie jest sukcesem.

Do dalszej pracy wybrano wyłącznie **Ultimate_Pomagier_4_aktualny / main**. Starego katalogu nie usunięto. Nowy commit ma dotyczyć tylko dokumentacji konsolidacji i zachowanego raportu wydania; nie zmienia zatwierdzonego kodu 4.0.0. Dokładny wynik commita i zwykłego pushu należy odczytać z końcowego raportu zadania oraz Git.
