# Etap 4.2.0 — tożsamość, uruchamianie Windows i granica produkcji

Data: 22.10.2026. Gałąź: `codex/integracja-v4-desktop`. Baza i HEAD na początku: `7adb19b34e4d58ad8b5b96e2bd5c69203a4cc4ad`.

Dokument wykorzystuje `docs/modernizacja-kont-2026-10-22.md`. Nie powtarza audytu kartoteki, importu, migracji ani innych modułów. Nie utworzono usługi, kont w chmurze, sekretów, instalatora ani wdrożenia. Analiza protokołów jest projektem na podstawie znanych zasad i lokalnego kodu; zgodność konkretnego dostawcy OIDC trzeba potwierdzić przy wyborze. Nie korzystano z internetu.

## A. Stan repozytorium

- Na początku `typyUzytkownikow.ts` i `uprawnienia.ts` są zgodne z HEAD; nie ma w nich niezacommitowanych zmian. W tym etapie ich nie zmieniamy.
- Zastany nieśledzony `multimedia/logo_tabliczka_ikona.png` pozostaje nietknięty i poza zakresem.
- Nie przełączamy gałęzi, nie dodajemy niezwiązanych plików, nie commitujemy ani nie wykonujemy push. Push na tę gałąź uruchamia obecny workflow budujący instalator, co byłoby sprzeczne z zakazem generowania nowego instalatora w tym zadaniu.

## B. Potwierdzone blokady w kodzie

| Blokada | Dowód i skutek |
| --- | --- |
| Brak rzeczywistego uwierzytelnienia | `src/aplikacja/logowanie/uwierzytelnianie.ts`: funkcja zawsze zwraca NIEDOSTEPNE. Brak adaptera usługi. |
| Formularz nie jest podłączony do kontraktu logowania | `PanelLogowania.tsx` wywołuje funkcję bez loginu/hasła; sam kontrakt `UslugaTozsamosci` nie ma implementacji. Nawet hipotetyczne POTWIERDZONO nie tworzy tu produkcyjnej sesji. |
| Kontekst odtwarza tylko demonstrację | `KontekstUzytkownika.tsx` ustawia użytkownika wyłącznie przy fladze demo; wejście wybiera chronione ID demonstracyjne. Produkcyjne logowanie wymaga osobnej obsługi zweryfikowanej sesji. |
| Dane uprawnień i sesji są modyfikowalne | `sesjaUzytkownika.ts` i istniejący magazyn korzystają z localStorage. Kontrole lokalne nie są barierą przeciw użytkownikowi kontrolującemu frontend. |
| Tauri uruchamia zablokowany frontend | `tauri.conf.json` uruchamia `npm run dev`, a build używa `npm run build`. Brak osobnego działającego trybu prywatnego. |
| Brak infrastruktury SSO w desktopie | `src-tauri/src/main.rs`: zarejestrowana komenda dotyczy aktualizacji. `Cargo.toml` ma Tauri, updater i single-instance; nie ma przepływu OIDC, callbacku, bezpiecznego magazynu sesji ani klienta chronionego API. |
| CSP nie dopuszcza planowanych usług w WebView | Obecne connect-src ogranicza się do self i IPC. Po wyborze architektury trzeba ustawić dokładne domeny, bez wildcardów; dla wywołań z Rust osobno ograniczyć dopuszczalne adresy. |
| Demo nie ma izolacji danych | Ta sama aplikacja i nazwy kluczy storage; `dev` i `dev:demo` domyślnie mogą użyć tego samego originu. Port wybrany automatycznie nie jest kontraktem izolacji. `build` i `build:demo` domyślnie zapisują do `dist`. |
| Dwa identyfikatory Tauri nie oznaczają trzech środowisk | Produkcja ma `pl.ultimatepomagier.desktop`, development `pl.ultimatepomagier.desktop.dev`; brak trzeciego profilu demonstracji. Nie można wskazywać katalogu produkcyjnego jako dataDirectory demo. |
| Konfiguracja usług nie istnieje | Brak zatwierdzonego issuer, klientów OIDC, callbacków, API, centralnej bazy i mapowania tożsamości. Nie tworzymy fikcyjnych wartości. |

### Macierz uruchamiania

Przy poprawnym środowisku, bez nadpisania flagi demo:

| Polecenie | Rzeczywista ścieżka | Wejście do aplikacji obecnie |
| --- | --- | --- |
| `npm run dev` | Vite development | Formularz; usługa logowania niedostępna. Brak wejścia produkcyjnego. |
| `npm run dev:demo` | Vite --mode demonstracyjny; `.env.demonstracyjny` | Osobny przycisk wejścia do demonstracji Architekta. Hasło nadal niczego nie uwierzytelnia. |
| `npm run build` | TypeScript + Vite production | Po udostępnieniu plików: formularz bez usługi. Sam build nie uruchamia aplikacji. |
| `npm run build:demo` | TypeScript + Vite demonstracyjny | Po udostępnieniu plików: jawna demonstracja. Domyślny wspólny `dist` nadal wymaga rozdzielenia w 4.2.1. |
| `npm run desktop:dev` | tauri dev + dev config → npm run dev na localhost:1420 | Osobny profil development, ale ten sam zablokowany frontend bez usługi. |
| `npm run desktop:build` | budujDesktop → Tauri/NSIS → produkcyjny frontend | Instalacja miałaby formularz bez usługi; wariant „testowe” oznacza brak podpisanych aktualizacji, a nie demonstrację ani działające uwierzytelnienie. |

Nie uruchamiano `desktop:build` ani pakowania NSIS. Wniosek o desktopie wynika z prześledzenia hooków, konfiguracji i identycznego frontendu; nie jest deklaracją przetestowanego natywnego logowania Windows.

### Usunięte ryzyko budowania demo jako produkcji

Dodano `skrypty/kontrolaTrybuFrontendu.mjs` i podłączono go do Vite oraz Tauri:

1. Vite odczytuje efektywne env (również lokalne pliki i zmienne procesu). Flaga true jest dozwolona wyłącznie przy jawnym trybie demonstracyjny. Niepoprawne wartości flagi są odrzucane.
2. Każdy frontend otrzymuje `tryb-frontendu.json` z wersją schematu i rozróżnieniem trybu Vite/środowiska. Nazwa „produkcyjny” identyfikuje profil kompilacji, nie gotowość uwierzytelnienia.
3. Tauri ma hook `npm run build && node skrypty/kontrolaTrybuFrontendu.mjs`. Sprawdzenie odbywa się przed dalszym pakowaniem, także przy bezpośrednim użyciu standardowej konfiguracji Tauri.
4. Skrypt budowania Windows odrzuca konfigurację pomijającą kontrolę, a po buildzie ponownie sprawdza frontend przed skopiowaniem artefaktów do katalogu wydania.

Kontrola wykrywa pomyłkę konfiguracji, nie jest kryptograficzną ochroną przed osobą celowo zmieniającą kod builda lub manifest. Release wymaga zaufanych źródeł i CI. Kontrola nie zapewnia jeszcze separacji storage ani gotowości produkcyjnego logowania.

## C. Porównanie wariantów tożsamości

| Wariant | Zalety i wymagania | Ocena dla Pomagiera |
| --- | --- | --- |
| Centralny dostawca OIDC + własne API autoryzacji | Indywidualne konta lub firmowe SSO, obsługa aktywacji/resetu/MFA i sesji u dostawcy. Aplikacja nadal musi mieć centralne dane, sesje aplikacyjne, aktualne role i kontrolę operacji. Wymaga konfiguracji osobnych klientów web/native. | **Rekomendowany**. Wykorzystać istniejącą firmową tożsamość, jeżeli dostępna. Wybór konkretnej usługi wymaga informacji o organizacji. |
| Dedykowana usługa uwierzytelniania i autoryzacji | Pełna kontrola, ale własna odpowiedzialność za hashowanie, tokeny, reset, aktywację, ograniczanie prób, audyt, unieważnianie sesji i utrzymanie. Używać sprawdzonego komponentu tożsamości/protokołu, nie tworzyć własnej kryptografii. | Alternatywa, jeśli istnieje wymóg samodzielnego utrzymania i zasoby operacyjne. Zwykle dłuższa ścieżka niż OIDC + API. |
| Odrębny lokalny tryb Windows jednego użytkownika | Zaufanie do zalogowanego użytkownika Windows, SID odczytywanego przez Rust, izolacja ACL i ochrona sekretów magazynem systemowym/DPAPI. Chronione operacje i dane muszą działać poza JS, np. w Rust i natywnej bazie. Bez publicznego wyboru 17 profili. | Może być osobnym produktem/trybem jednej instalacji. Nie daje wielokomputerowej tożsamości ani synchronizacji. Nie chroni przed właścicielem systemu/debuggerem/lokalnym administratorem. Nie jest skrótem do firmowego logowania wieloużytkownikowego. |

### Rekomendowana architektura i granica zaufania

```text
Web → BFF / sesja w bezpiecznym cookie → chronione API → centralna baza i audyt
                  ↕                         ↑
             Dostawca OIDC                 │
                  ↕                         │
Windows: przeglądarka systemowa ↔ broker w Rust → to samo API
                                  ↕
                         systemowy magazyn sesji
```

**OIDC odpowiada za tożsamość; API za prawo do konkretnej operacji na konkretnych danych.** React i localStorage są niezaufanym interfejsem/cache. Nie wystarczy ukryć przycisku albo pobrać poprawnego tokenu, a potem zatwierdzać operacji na dowolnie edytowanym lokalnym obiekcie.

- **Web:** Authorization Code, walidacja state/nonce; BFF jako klient poufny przechowuje tokeny po stronie usługi. Cookie HttpOnly/Secure, dobrana polityka SameSite, ochrona CSRF i ścisłe originy. BFF nie przekazuje sekretu klienta ani tokenów odświeżania do JavaScript.
- **Desktop:** klient publiczny OIDC, Authorization Code + PKCE S256, logowanie w systemowej przeglądarce. Rust generuje i weryfikuje state/nonce/PKCE, obsługuje krótko żyjący callback na loopback oraz wymianę kodu. Dokładny wariant callbacku i obsługa zmiennego portu muszą być zgodne z dostawcą; listener wiązać tylko z loopback i zamykać po użyciu. Nie logować we wbudowanym formularzu WebView i nie umieszczać client_secret w EXE.
- Token odświeżania desktopu jest dostępny tylko brokerowi w systemowym magazynie poświadczeń; token dostępu pozostaje w pamięci Rust. Broker wywołuje dozwolone API. WebView dostaje wynik i minimalny profil, nie tokeny. Nowe komendy IPC muszą mieć wąski zakres, walidację i kontrolę po stronie zaufanej; samo wywołanie invoke nie oznacza autoryzacji.
- API sprawdza podpis i dozwolony algorytm tokenu, issuer, audience i ważność; korzysta z zaufanej konfiguracji discovery/JWKS, nie z adresu podanego przez frontend. Każda chroniona operacja sprawdza też aktualny status konta, rolę, odznaki, organizację, powiązanie z zasobem i unieważnienie sesji. Brak zaufania do ID wykonującego/roli/wersji z body lub localStorage.
- Centralne repozytorium jest źródłem prawdy dla kont, uprawnień i chronionych stanów. Import/edycja administracyjna, aktywacja, nadawanie ról i zmiany workflow, które mają znaczenie operacyjne, muszą kończyć się autoryzowaną transakcją API. Reguły lokalne służą UX i testom zgodności, nie nadawaniu dostępu.
- Lokalne szkice i generowanie własnego pliku mogą pozostać funkcją roboczą. Jeżeli dokument ma potwierdzać zatwierdzenie, publikację lub wykonanie chronionej operacji, sam lokalny PDF/JSON nie jest dowodem; stan musi zatwierdzić usługa. Nie deklarować ochrony dla przepływów nadal kończących się wyłącznie zapisem frontendu.
- Wylogowanie odwołuje sesję aplikacyjną na serwerze i usuwa lokalne poświadczenia/cookie. Sesję IdP kończyć zgodnie z dostawcą i przyjętą polityką SSO. Zmiana uprawnień lub blokada konta działa przy następnym chronionym żądaniu, a nie dopiero po restarcie klienta. Polityka „wyloguj wszystkie urządzenia” jest osobną operacją serwerową.
- Aktywacja i reset korzystają z mechanizmu IdP; jeżeli aplikacja generuje własne zaproszenie, token jest losowy, jednorazowy, wygasający, powiązany z właściwą operacją, a w bazie pozostaje jego hash. Bez ujawniania istnienia konta, z limitami prób i audytem bez sekretów. Aktywacja nie nadaje sama roli ani nie omija decyzji administratora.
- Brak usługi/odmowa logowania nie przełącza aplikacji na demo. Offline: domyślnie bez logowania i operacji administracyjnych; ewentualna praca na szkicach musi być jawnie niezatwierdzona. Produkcyjny offline wymaga osobnej decyzji i modelu zagrożeń.

### Zachowanie 17 ID i migracja bez zaufania do lokalnych ról

Zachować wszystkie istniejące `uzytkownik.id`. Dodać po stronie serwera relację `issuer + sub → uzytkownikId` z wymuszoną unikalnością. Identyfikator dostawcy nie zastępuje ID w dokumentach. Login i e-mail mogą się zmieniać; nie łączyć tożsamości automatycznie po e-mailu lub nazwisku.

Pierwszy Architekt powstaje przez kontrolowany bootstrap administracyjny po stronie usługi i potwierdzenie rzeczywistej tożsamości. Nie przyznawać roli dlatego, że frontend przesłał chronione ID lub lokalny rekord zawiera ARCHITEKT. Także zaproszenia i powiązanie SSO wymagają zatwierdzonego mapowania.

Migracja etapowa: lokalna kopia i inwentaryzacja originów/instalacji → staging serwerowy jako dane niezaufane → porównanie rozbieżności pod tym samym ID → zatwierdzenie powiązań, ról i konfliktów przez zaufanego administratora → import transakcyjny z identyfikatorem paczki/idempotencją → kontrola referencji i odczytu → zachowany, lokalny oryginał do odzyskania. Nie importować lokalnej sesji jako sesji serwera ani lokalnej historii jako kryptograficznie wiarygodnego audytu. Nie nadpisywać nowszej bazy przy ponownym uruchomieniu starej instalacji.

## D. Najkrótsza bezpieczna ścieżka i trzy środowiska

| Środowisko | Dozwolone zastosowanie | Izolacja wymagana przed dalszym użyciem |
| --- | --- | --- |
| Demonstracja | Syntetyczne dane, jawne wejście bez gwarancji tożsamości, brak usług produkcyjnych i aktualizacji produkcyjnych. | Własny origin web, wyjściowy katalog buildu, identyfikator i profil danych Tauri; nie odczytywać danych pracowników. |
| Prywatne programistyczne | Praca autora na Windows i testy przepływów; jawny dostęp lokalny wyłącznie w konfiguracji debug, bez twierdzenia, że zweryfikowano pracownika. | Osobny profil Windows/Tauri i web, brak automatycznego kopiowania produkcji; kopia realnych danych tylko po świadomym lokalnym imporcie, nigdy do repozytorium. |
| Produkcja pracowników | Wyłącznie zweryfikowana tożsamość i serwerowo egzekwowane uprawnienia. | Dotychczasowy profil produkcyjny zachowany dla odzyskania, oddzielne issuer/klienci/API/baza/sekrety; bez obejść demo/developer. |

**Przywrócenie używalności prywatnego Windows następuje najpierw w 4.2.1. Nie oznacza odblokowania instalatora produkcyjnego dla pracowników.** Do tego czasu nie zaleca się korzystania z obecnej demonstracji na originie/profilu z realnymi danymi. W tym etapie nie przestawiono `desktop:dev` na demo i nie usunięto blokady produkcyjnego logowania.

Krótkie etapy implementacji:

1. **4.2.1 — izolacja środowisk i prywatny Windows:** trzy jawne profile i brak współdzielenia storage/originów, oddzielny output demo, wyraźne oznaczenia, lokalne wejście debug poza produkcją, zachowanie oryginalnego profilu i kopii. Testy restartu, braku przenikania danych oraz zakazu zapakowania obejścia debug. Bez IdP i instalatora do dystrybucji.
2. **4.2.2 — zaufany fundament usługi:** zatwierdzić hosting/IdP, wdrożyć minimalne API + bazę kont/mapowań/uprawnień, bootstrap Architekta i audyt. Egzekwować autoryzację na serwerze od pierwszej operacji. Testy 401/403 i transakcji bez klienta React.
3. **4.2.3 — pionowy przepływ web/native:** OIDC → zweryfikowana sesja → chronione GET /me i jedna operacja kont → wylogowanie/odwołanie. Systemowy broker Tauri, web BFF, aktywacja/reset u dostawcy. Testy na dwóch komputerach i w przeglądarce. To pilot, nie deklaracja ochrony całej aplikacji.
4. **4.2.4 — migracja i zastąpienie źródeł lokalnych:** włączyć istniejące importy/edycję do API bez przebudowy UI; 17 ID i referencje bez zmian. Stopniowo przenieść źródła prawdy i każdą operację, dla której obiecywana jest autoryzacja. Nie wystarczy dodać token do fetch i zostawić zaufanego lokalnego writera.
5. **4.2.5 — bramka produkcyjna:** pełne testy sesji/aktywacji/resetu/odwołania/uprawnień, odtwarzanie backupu, weryfikacja WebView2/Windows, kontrola podpisywania i profili. Dopiero po akceptacji użytkownika osobne zadanie budowy i dystrybucji instalatora.

### Dane i zasoby wymagane przed 4.2.2/4.2.3

- Osoba odpowiedzialna za firmową tożsamość; informacja, czy firma ma tenant SSO i zgodę na użycie; docelowy issuer/tenant, polityka MFA, aktywacji i resetu oraz dostęp administratora IdP.
- Osobne rejestracje klientów web (poufny, sekret wyłącznie w BFF) i Windows (publiczny PKCE, bez sekretu), dla środowiska prywatnego/testowego i produkcji. Dokładne callbacki i logout URI, dozwolone originy, audience/scope API i potwierdzone wsparcie wybranego callbacku natywnego. Żadnych fikcyjnych client_id/kluczy.
- Docelowe adresy HTTPS web/BFF i API, kontrola DNS/TLS, lokalizacja hostingu i danych, sieć/firewall/VPN, środowiska testowe i produkcyjne oraz osoba utrzymująca usługę.
- Centralna baza z backupem, kontem migracyjnym i runtime o minimalnych prawach, zarządzanie sekretami i kluczami oraz monitoring/audyt z retencją bez tokenów i haseł.
- Źródło wysyłki aktywacji/resetów u IdP albo konfiguracja nadawcy SMTP, domena/nadawca i wymagane ustawienia DNS; nie wysyłać żadnych wiadomości na tym etapie.
- Potwierdzenie tożsamości pierwszego Architekta i właściciela importowanych danych, lista instalacji i lokalnych kopii, zasady rozstrzygania konfliktów, polityka offline, czas sesji oraz sposób odwołania dostępu na wszystkich urządzeniach.
- Konfiguracja podpisywania aktualizacji jest niezależna od kluczy OIDC i poświadczeń użytkowników. Nie używać jednego sekretu do obu celów; nie wkładać żadnych sekretów do VITE_*.

## E. Przewidywane pliki

Zmiany wykonane teraz: `vite.config.ts`, `src-tauri/tauri.conf.json`, `skrypty/budujDesktop.mjs`, nowy `skrypty/kontrolaTrybuFrontendu.mjs`, `testy/pakietowanieDesktop.test.mjs`, `testy/wersjaAplikacji.test.mjs` i ten dokument.

4.2.1: `package.json`, `vite.config.ts`, pliki konfiguracji środowisk (bez sekretów), `src-tauri/tauri.dev.conf.json` i nowa konfiguracja demo, warstwa wyboru profilu/prywatnego wejścia w `src/aplikacja/logowanie/`, `src-tauri/src/main.rs` dla wiarygodnego rozpoznania debug/środowiska, oznaczenia w panelu/nagłówku i testy. Nie tworzyć drugiego magazynu domenowego użytkowników; odseparować całe kontenery danych, nie tylko klucz użytkowników. Jeżeli zmienią się powierzchnie UI, uzupełnić rejestr V4.

4.2.2–4.2.4: implementacja istniejącego kontraktu `uwierzytelnianie.ts`, `sesjaUzytkownika.ts`, `KontekstUzytkownika.tsx`, `PanelLogowania.tsx`, adapter wywołań w `magazynUzytkownikow.ts`, nowe moduły brokera w `src-tauri/src/`, jawnie uzasadnione zależności `Cargo.toml`/lock, capabilities i CSP. Usługę API/BFF i jej repozytorium/umiejscowienie uzgodnić przed utworzeniem; nie dodajemy teraz nowego backendu. Typy i uprawnienia zmieniać tylko w zakresie zatwierdzonego kontraktu, po ponownej kontroli lokalnego diffu.

## F. Kryteria akceptacji i ryzyka danych

**4.2.0:** wszystkie sześć ścieżek prześledzone; brak zmian w wskazanych plikach typów/uprawnień; produkcyjny build odrzuca demo z env; Tauri odrzuca niewłaściwy manifest/komendę przed dystrybucją; żaden instalator ani zasób zewnętrzny nie powstaje.

**4.2.1:** można wejść do prywatnej aplikacji Windows w debug; widoczne oznaczenie środowiska; syntetyczne demo nie widzi produkcyjnych/prywatnych rekordów; przełączenie i restart nie zmieniają oryginalnych danych; produkcyjny frontend i Rust odrzucają obejście debug; brak automatycznej migracji danych pomiędzy profilami.

**Produkcja:** indywidualne konto/SSO, aktywacja/reset i wylogowanie działają end-to-end; użytkownik zablokowany/nieaktywny nie uzyska sesji; zmiana localStorage, ID wykonującego i roli nie daje prawa do chronionego API; Administrator nie zmienia Architekta; cofnięcie uprawnień działa na obu komputerach; 17 ID i relacje są zachowane; ponowny import nie dubluje kont; backup/restore sprawdzony; żadna chroniona operacja nie kończy się wyłącznie modyfikacją frontendowego źródła prawdy.

Ryzyka lokalnych danych:

- Identyczne ID na różnych komputerach mogą zawierać odmienne ręczne dane i role. Nie wybierać automatycznie zwycięzcy na podstawie czasu klienta.
- Origin (schemat/host/port) i profil WebView2 decydują, gdzie jest localStorage. Zmiana identyfikatora lub originu może sprawiać wrażenie utraty danych; kopiowanie niewłaściwego profilu może je nadpisać. Nie usuwać katalogów ani danych podczas instalacji testowej.
- Pełny lokalny backup może obejmować więcej magazynów niż kartoteka kont; nie wolno izolować tylko sesji, pozostawiając pozostałe dane współdzielone. Kopie chronić lokalnymi ACL; nie commitować ani nie wysyłać automatycznie.
- Lokalne role/historia są niezaufane, ale historyczne przypisania i autorstwo nadal trzeba zachować jako dane źródłowe z oznaczeniem pochodzenia.
- Migracja nie może zamienić demonstracyjnej sesji na sesję produkcyjną. Sam centralny login nie zabezpieczy starych lokalnych writerów.
- Obecny build demo nadpisuje domyślny dist i używa tej samej rodziny kluczy. Nowa bramka pakowania ogranicza skutek, ale nie usuwa jeszcze ryzyka otwarcia tego samego originu. Izolacja jest pierwszym etapem wykonawczym.

## G. Gotowy prompt wykonawczy — 4.2.1

```text
ULTIMATE POMAGIER 4.0 — ETAP 4.2.1
Izolacja środowisk i przywrócenie prywatnej pracy Windows.

Pracuj na aktualnej gałęzi codex/integracja-v4-desktop. Najpierw sprawdź HEAD,
git status i diff typyUzytkownikow.ts/uprawnienia.ts. Zachowaj zastane zmiany.
Przeczytaj docs/etap-4-2-0-tozsamosc-windows.md oraz wcześniejszy raport kont.
Nie powtarzaj audytu kartoteki, importu ani innych modułów.

Wprowadź trzy jawne środowiska: demonstracyjne, prywatne programistyczne,
produkcyjne. Zastosuj jedną walidowaną konfigurację uruchomienia wspólną
z buildem i Tauri; nie wybieraj środowiska ani uprawnień na podstawie localStorage.
Zachowaj bramkę produkcyjnego pakowania dodaną w 4.2.0.

Demo ma mieć osobny origin web, katalog wynikowy, identyfikator aplikacji
oraz profil WebView2/danych. Korzysta wyłącznie z danych syntetycznych,
nie odczytuje ani nie importuje automatycznie danych pracowników.
Zapewnij przewidywalne porty i bezpieczny błąd przy konflikcie portu;
nie traktuj automatycznej zmiany portu jako izolacji.

Prywatny development Windows ma dać jawny dostęp lokalny do testowania
aplikacji, bez podawania go za uwierzytelnienie pracownika. Udostępnij go
wyłącznie w rzeczywistym buildzie debug Tauri oraz trybie programistycznym
frontendu; nie wystarczy flaga VITE_* lub ukryty przycisk. Nie dodawaj
publicznego wyboru cudzych kont ani wspólnych haseł. Oznacz tryb stale w UI.
Użyj osobnego profilu danych. Istniejąca produkcyjna instalacja i jej dane
muszą pozostać nietknięte. Jeżeli potrzebna jest kopia realnych danych do pracy
prywatnej, przygotuj podgląd i świadomy lokalny import istniejącej kopii;
nie kopiuj danych bez decyzji operatora i nie przenoś sesji/uprawnień jako zaufanych.

Produkcja nadal wymaga prawdziwej usługi tożsamości i autoryzacji; bez niej
pokaż uczciwy stan niedostępności. Nie włączaj obejścia developerskiego
w release i nie przemianowuj demonstracji na produkcyjne logowanie.
Nie twórz nowego backendu, integracji, kluczy ani zasobów chmurowych.

Nie zmieniaj 17 stabilnych ID, nie przebudowuj kartoteki ani nie dodawaj
równoległego repozytorium użytkowników. Izoluj całe kontenery danych,
nie tylko sesję lub klucz kartoteki. Nie kasuj ani nie migruj automatycznie
oryginalnego localStorage/profilu. Dostosuj istniejące komponenty lokalnie;
przy zmianie powierzchni UI uzupełnij manifest/rejestr V4.

Testy: trzy środowiska i restart, brak przenikania danych, zachowanie
oryginału, odrzucenie flag demo/debug w produkcji, weryfikacja profili Tauri,
wejście do prywatnego debug Windows, stan produkcji bez usługi.
Uruchom testy zakresowe, npm test, npm run test:desktop, lint, build oraz
git diff --check. Nie generuj instalatora do dystrybucji, nie publikuj,
nie wykonuj push uruchamiającego workflow instalatora.

Raportuj wykonane zmiany, wyniki rzeczywistych testów Windows/WebView2,
pozostające blokady produkcji i wymagane konfiguracje następnego etapu.
Nie deklaruj gotowego produkcyjnego uwierzytelniania.
```

## Weryfikacja wykonania tego etapu

Wyniki kontroli zostaną uzupełnione po zakończeniu testów. Budowanie frontendów i testy konfiguracji nie tworzą instalatorów. Nie uruchomiono native desktop:build/desktop:release ani workflow GitHub Actions.

### Archiwalne uzupełnienie odzyskane w etapie 4.3.1

Powyższy akapit jest historycznym stanem raportu. W niezacommitowanej wersji starszego katalogu zapisano później poniższe wyniki dotyczące kodu utrwalonego w `82c2ed1c7f0f49b7d797ec983172863ce6faa5f8` („rozbudowa”). To zapis wcześniejszej weryfikacji, a nie wyniki ponownie uzyskane dla aktualnego `main`.

| Kontrola historyczna | Wynik zapisany w odzyskanym raporcie |
| --- | --- |
| Testy pakowania | 8/8; bez tworzenia instalatora |
| `npm run test:desktop` | 13/13 |
| `npm test`, `npm run lint`, `npm run build` | Kod wyjścia 0 |
| Osobny build demonstracyjny | Build zakończony, manifest odrzucony przez bramkę produkcyjną |
| Chrome | Sprawdzone dev, dev:demo i oba buildy przez preview; testowe porty nie potwierdzały izolacji domyślnych środowisk |
| `git diff --check` | Bez błędów |

Archiwalny zapis odnotowywał zastanie nowego HEAD `82c2ed1` z przygotowanymi zmianami i logo, bez potwierdzenia źródła commita. Logo nie należało do ówczesnego zadania. Do plików tamtej implementacji należała również deklaracja `skrypty/kontrolaTrybuFrontendu.d.mts`.

W tamtym etapie nie zweryfikowano natywnego logowania Windows/WebView2, aktywacji ani resetu haseł i nie uruchamiano pakowania NSIS ani publikacji. Opis demonstracyjnego buildu dotyczy wyłącznie dawnej konfiguracji — obecna V4 celowo odrzuca taki build. Oryginał uzupełnienia zachowano w kopii etapu 4.3.0, bez jej modyfikowania.
