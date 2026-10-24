# Modernizacja kont — 22.10.2026

Gałąź: `codex/integracja-v4-desktop`. Początkowy HEAD: `87bcab6b1ff6313d4a30520e2bf0fabd22a616db`, working tree czysty. W trakcie pracy HEAD zmienił się na `7bb3901fd1394910b3bc8ce2d9aa5ad22df2097d`; zachowano niezależne zmiany skali interfejsu i konfiguracji desktopowej. Ta zmiana nie zawiera ich implementacji. Bez wdrożenia produkcyjnego.

## Zakres i stan etapów

- Etapy 0–3: kontrola ograniczona do kont i sesji, migracja v2, import/eksport i edycja zbiorcza istniejącej kartoteki.
- Etap 4: formularz login/e-mail + hasło, pokaż/ukryj, zapamiętanie wyłącznie loginu, kontrakt centralnej usługi tożsamości i model aktywacji. **Brak produkcyjnego uwierzytelniania.** Obecny frontend i powłoka Tauri nie mają bezpiecznej usługi weryfikacji haseł. Nie wdrożono lokalnego porównywania haseł, resetowania ani tokenów aktywacyjnych.
- Etap 5: wyłącznie demonstracyjny podgląd profilu i dostępnych operacji. Modal, stały pasek, powrót/Escape, niezmieniona tożsamość sesji, dziennik początku i końca, blokada zapisów kont w warstwie operacji. **Nie jest pełną symulacją wszystkich ekranów.** Nie montuje edytorów ani eksporterów.
- Etapy 6–8: walidacja ról/odznak/organizacji, aktywnej sesji i bieżącej wersji uprawnień, historia, backup/restore, testy domenowe i przeglądarkowe.

Nie odczytywano ani nie modyfikowano rzeczywistego localStorage pracowników. Migracja uruchamia się przy kolejnym odczycie lokalnej kartoteki. Testy korzystają z izolowanej pamięci i osobnego kontekstu Chrome.

## Rozbieżności i decyzje

| Rozbieżność | Rozwiązanie |
| --- | --- |
| Kacper: kacper.madej / k.madej | Przycisk porównania proponuje k.madej; zmiana wymaga akceptacji. Stary login pozostaje aliasem. Dane startowe nie zmieniają loginu automatycznie. |
| Paweł i Tomasz: WYSYŁACZ / PRACOWNIK | Zachowano PRACOWNIK + WYSYLACZ. Import roli WYSYŁACZ pokazuje ostrzeżenie semantyczne i propozycję odznaki. |
| Paweł i Angelika: inne ID w źródle zewnętrznym | Zachowano stabilne ID z prefiksem pracownik-. Potwierdzenie dopasowania nie zmienia ID istniejącego konta. |
| Izabela Czugała / Izabela Szoć | Osobne konta. Imię i nazwisko mogą wskazywać propozycje, nie automatyczne scalenie. |
| Dane lokalne / startowe | Migracja nie wybiera wartości startowych. Porównanie wymaga akceptacji pól. |
| Powtarzana migracja ról | Nie nadajemy/odbieramy roli przy każdym odczycie. Chronioną rolę i konto sprawdza operacja zapisu. |
| Liczba pracowników | Kod zawiera 10 PRACOWNIK: 9 aktywnych i 1 zablokowane. Wcześniejsze 9 pomijało konto zablokowane. |

Nie dostarczono zewnętrznego dokumentu z pozostałymi kontami; nie zgadujemy różnic. Do akceptacji pozostają: login Kacpra, rozbieżności lokalne/startowe, niejednoznaczne dopasowania i rzeczywiste importy. Historycznie utraconych danych nie można odzyskać bez wcześniejszej kopii.

## Dane, migracja i odzyskiwanie

Źródłem prawdy pozostaje `ultimatePomagier.uzytkownicy.v1`. Pod tym samym kluczem tablica legacy przechodzi do `{ wersja: 2, uzytkownicy, historia }`. Migracja uzupełnia wyłącznie brak statusu konfiguracji uwierzytelniania. Nie usuwa kont, nie dodaje automatycznie brakujących rekordów startowych i nie nadpisuje danych osobowych, ról, statusów, kontaktów, powiązań, dat ani wersji uprawnień.

Przed migracją dokładny oryginał trafia do `ultimatePomagier.uzytkownicy.kopiaPrzedMigracja.v2` (istniejąca kopia nie jest nadpisywana). Przed importem, edycją lub przywróceniem pełny poprzedni stan trafia do `ultimatePomagier.uzytkownicy.kopiaPrzedZmiana.v2`. Błąd kopii zatrzymuje operację. Konta i historia zatwierdzonej operacji są zapisywane jednym `setItem`. Operacja ponownie sprawdza sesję, zapisany profil wykonującego, rolę, status, wersję uprawnień i aktualność podglądu. Zmiany uprawnień unieważniają sesję. Logowanie i audyt podglądu nie nadpisują kopii sprzed importu.

Przywrócenie JSON wymaga aktywnego Architekta, podglądu różnic i akceptacji. Kopia musi zawierać wszystkie wcześniejsze ID; historię scalamy, a sesje unieważniamy. Konta udokumentowane w dzienniku jako utworzone po kopii pozostają zachowane z tym samym ID jako NIEAKTYWNE (pokazuje to podgląd). Pozwala to cofnąć tworzenie bez usuwania powiązań. Kopię niepełną względem starszych kont należy najpierw scalić. JSON eksportuje jawnie dozwolone pola, także wewnątrz telefonów i historii; nie zawiera haseł, tokenów ani hashy.

Uszkodzony JSON nie jest zastępowany danymi startowymi. Ekran odzyskiwania pozwala pobrać oryginał i, wyłącznie w jawnej demonstracji, odtworzyć poprawną kopię. Znane ID muszą pozostać zachowane, a uszkodzony oryginał jest archiwizowany pod osobnym kluczem z UUID. Bez usługi tożsamości awaryjne odzyskiwanie nie jest uwierzytelnione; nie udostępniamy go produkcyjnie.

Dziennik zapisuje czas, wykonującego, konto, operację, nazwy zmienionych pól i wynik. Nie przechowuje wartości pól ani sekretów. Jest lokalny i modyfikowalny; nie zastępuje audytu serwerowego. Błędne walidacje są raportowane w interfejsie i raporcie importu bez częściowego zapisu kont.

## Obsługa importu, tabeli i eksportu

Ścieżka: **ADMINISTRACJA → Użytkownicy → Importuj użytkowników**.

1. Wybierz lub przeciągnij XLSX/CSV UTF-8. Limity: 5 MB, 5000 wierszy, 100 kolumn.
2. Sprawdź automatyczne mapowanie i popraw je ręcznie. Nieznane kolumny można pominąć. Pierwsze 100 wierszy da się poprawić w aplikacji; większe korekty wykonuj w pliku.
3. Porównaj: ID → jednoznaczny login → e-mail → alias; sprzeczne tożsamości i podobne nazwy wymagają decyzji.
4. Sprawdź status każdego wiersza i różnice przed/po. Domyślnie nic nie jest zaakceptowane. Wybieraj pojedyncze pola, konta lub cały zestaw.
5. Zapisz zaakceptowane zmiany. Jedna atomowa operacja obejmuje cały wybrany zakres; błędy walidacji tego zakresu zatrzymują całość. Wiersze błędne i odrzucone są świadomie pomijane. Dostępny jest raport CSV błędów/statusów.

Puste komórki zachowują dane. Świadome usuwanie: kolumna „Wyczyść pola”, np. `telefony | pseudonim`. Nie można nią usuwać ID, loginu lub głównego e-maila. Daty, wersja uprawnień i konfiguracja uwierzytelniania w arkuszu są wyłącznie informacyjne. Historyczne loginy i usunięte e-maile zachowujemy jako aliasy. Walidacja obejmuje typy, enumy, kontakty, kolor, daty, chronione konto, unikalność oraz kolizje nowych tożsamości z aliasami. Telefony używają istniejącego normalizatora.

Importujemy pierwszy arkusz XLSX. Formuły są odrzucane; nie wykonujemy kodu ani formuł. PDF nie służy do importu kont. JSON jest pełną kopią z historią, obsługiwaną osobną operacją przywracania.

Tabela ma wyszukiwanie, filtry, sortowanie, wybór wielu wierszy, strony po 25 kont i przewijanie poziome. Edycja zbiorcza obsługuje organizację, rolę, status, dodanie/usunięcie odznaki i kolor, zawsze z podglądem. Profil zachowuje dotychczasowe komponenty, podzielone na dane osobowe, kontakt, organizację/rolę, uprawnienia, uwierzytelnianie, powiązania oraz historię.

CSV/XLSX eksportują wszystkie konta, zestaw filtrowany lub zaznaczenie. CSV zabezpiecza znaki inicjujące formuły; XLSX ma tekstowe telefony, daty, filtry, zamrożony nagłówek, szerokości i legendę ról/odznak. Pełna kopia JSON zawsze obejmuje wszystkie konta i historię. Nie dodano PDF.

## Uruchomienie i wymagany następny krok

- `npm run dev` / `npm run build`: formularz bez dostępnej usługi tożsamości. Lokalna sesja nie otwiera dostępu. Brak listy pracowników przed uwierzytelnieniem.
- `npm run dev:demo`: jawna demonstracja na 127.0.0.1, flaga z `.env.demonstracyjny`. Osobny przycisk wejścia do demonstracji Architekta, bez publicznego wyboru kont. Nie weryfikuje tożsamości.
- `npm run build:demo`: osobna kompilacja demonstracyjna. Nie przedstawiać jako zabezpieczonej aplikacji produkcyjnej.
- Hasło po próbie jest czyszczone; nie jest zapisywane, wysyłane ani porównywane lokalnie. Nie ma pozornego resetowania hasła.

Kontrakt `UslugaTozsamosci` opisuje uwierzytelnienie, niezależną weryfikację i zakończenie sesji. Nie wdrożono dostawcy chmurowego, backendu ani integracji. Następna iteracja wymaga decyzji:

1. Wybrać firmową usługę tożsamości/autoryzacji lub dostawcę OIDC; zachować stabilne ID kartoteki jako relacje z niezależnym ID tożsamości.
2. Po stronie usługi wdrożyć weryfikację hasła/OIDC, bezpieczne hashowanie, limit prób, wygasanie/unieważnianie sesji i autoryzację każdej operacji. Wymagać aktywnego konta.
3. Ustalić przechowywanie sesji: przeglądarka — HttpOnly/Secure/SameSite; Tauri — systemowy magazyn poświadczeń i zaufana przeglądarka logowania. Tokeny poza kartoteką i localStorage.
4. Zdecydować o offline. Zalecany pierwszy etap: brak logowania i operacji administracyjnych offline. Praca offline wymaga osobnego projektu wygasających podpisanych uprawnień i synchronizacji.
5. Dodać aktywację/reset: jednorazowe wygasające tokeny, ich hashe po stronie usługi i ochrona przed ponownym użyciem. Dopiero wtedy wysyłać wiadomości.
6. Dodać centralne dane i audyt, kontrolę rewizji, synchronizację komputerów i migrację lokalnych baz z decyzjami o konfliktach. Pełny podgląd użytkownika wymaga rozdzielenia rzeczywistego wykonującego i użytkownika podglądu oraz serwerowej blokady zapisów.
7. Przetestować sesje na wielu komputerach, odwołanie dostępu i serwerową autoryzację przed włączeniem logowania produkcyjnego.

## Ograniczenia

Brak centralnej autoryzacji, automatycznej synchronizacji i pełnej symulacji ekranów. Modyfikowalny localStorage nie jest granicą bezpieczeństwa. Jeden zapis zapewnia atomowość zestawu na danej instalacji; nie jest transakcją między urządzeniami/procesami. Historia i kopie zużywają limit przeglądarki; brak miejsca przerywa zapis. Kopie JSON przechowuj również poza przeglądarką.

## Weryfikacja końcowa

Wyniki końcowe: **39 testów zakresowych** (25 modernizacji + 13 dotychczasowych regresji kont/sesji + 1 test blokady logowania produkcyjnego), **npm test**, **npm run lint**, **npm run build** i **git diff --check** — zakończone powodzeniem. Test Windows Chrome przeszedł cały przepływ: formularz hasła bez tworzenia sesji, wejście do jawnej demonstracji, Administracja, filtry, edycja dwóch kont, błędy importu, anulowanie bez zapisu, zmiana loginu z akceptacją, pobranie XLSX, modal podglądu i powrót przez Escape, siedem sekcji profilu, przywrócenie kopii i ponowne wejście po unieważnieniu sesji. Sprawdzono też syntetyczne długie imiona i nazwiska. Sprawdzono 1920×1080, 1280×720, 800×600 i powiększenie tekstu do 125%; wykonano i obejrzano zrzuty. Testy Chrome działały poza sandboxem z powodu blokady połączeń do lokalnego serwera; wszystkie połączenia testu pozostały na 127.0.0.1. Build zgłasza istniejącą uwagę o wielkości pakietu. Nie wykonywano wdrożenia produkcyjnego. Zmieniono wyłącznie testy kontraktów celowo zmienionych zadaniem: zachowanie starych kont i ręcznych danych zamiast nadpisywania/usuwania, brak wyboru kont na logowaniu i nową sekcję Administracja. Rejestr V4 uzupełniono o nowe powierzchnie. Lint pomija katalog roboczy tmp zawierający kopię projektu.

## 17 kont po kontrolnej migracji danych startowych

To tabela z repozytorium, nie eksport rzeczywistych instalacji. Potwierdzono 17 ID, 15 kont aktywnych, 1 zablokowane, 1 nieaktywne. Role: 1 ARCHITEKT, 1 ADMINISTRATOR, 4 OPIEKUN, 10 PRACOWNIK (9 aktywnych), 1 GOSC. Konfiguracja uwierzytelniania: NIESKONFIGUROWANE, o ile istniejący rekord nie miał innej wartości. Kont spoza tej tabeli nie usuwamy.

| Konto | Stabilne ID | Login | Rola | Organizacja | Status |
| --- | --- | --- | --- | --- | --- |
| Architekt Systemu | `architekt-systemu` | `architekt` | ADMINISTRATOR | SEMPER | AKTYWNY |
| Kacper Madej | `administrator-kacper-madej` | `kacper.madej` | ARCHITEKT | SEMPER | AKTYWNY |
| Izabela Czugała | `Iza` | `i.czugala` | OPIEKUN | SEMPER | AKTYWNY |
| Kamila Zaremba | `Kamila` | `k.zaremba` | OPIEKUN | SEMPER | AKTYWNY |
| Dawid Chyła | `Dawid` | `d.chyla` | OPIEKUN | IIST | AKTYWNY |
| Katarzyna Rohde-Buraczek | `Kasia RB` | `k.buraczek` | OPIEKUN | SEMPER | AKTYWNY |
| Konto Zablokowane | `konto-zablokowane` | `zablokowane` | PRACOWNIK | SEMPER | ZABLOKOWANY |
| Konto Nieaktywne | `konto-nieaktywne` | `nieaktywne` | GOSC | ZEWNETRZNY | NIEAKTYWNY |
| Paweł Kwieciński | `pracownik-pawel-kwiecinski` | `p.kwiecinski` | PRACOWNIK | SEMPER | AKTYWNY |
| Tomasz Czekaj | `pracownik-tomasz-czekaj` | `t.czekaj` | PRACOWNIK | SEMPER | AKTYWNY |
| Angelika Poznańska | `pracownik-angelika-poznanska` | `a.poznanska` | PRACOWNIK | SEMPER | AKTYWNY |
| Agata Pelc | `pracownik-agata-pelc` | `a.pelc` | PRACOWNIK | SEMPER | AKTYWNY |
| Alicja Krysińska | `pracownik-alicja-krysinska` | `a.krysinska` | PRACOWNIK | SEMPER | AKTYWNY |
| Paulina Kaźmierczak | `pracownik-paulina-kazmierczak` | `p.kazmierczak` | PRACOWNIK | SEMPER | AKTYWNY |
| Izabela Szoć | `pracownik-izabela-szoc` | `i.szoc` | PRACOWNIK | SEMPER | AKTYWNY |
| Ewelina Kostecka | `pracownik-ewelina-kostecka` | `e.kostecka` | PRACOWNIK | SEMPER | AKTYWNY |
| Ewa Nizioł | `pracownik-ewa-niziol` | `e.niziol` | PRACOWNIK | IIST | AKTYWNY |

## Zmienione pliki

- `.env.demonstracyjny`
- `docs/modernizacja-kont-2026-10-22.md`
- `docs/v4/manifest-widokow.json`
- `docs/v4/rejestr-widokow.md`
- `eslint.config.js`
- `package.json`
- `src/App.tsx`
- `src/aplikacja/layout/NaglowekAplikacji.tsx`
- `src/aplikacja/logowanie/KontekstUzytkownika.tsx`
- `src/aplikacja/logowanie/PanelLogowania.tsx`
- `src/aplikacja/logowanie/panelLogowania.css`
- `src/aplikacja/logowanie/sesjaUzytkownika.ts`
- `src/aplikacja/logowanie/uwierzytelnianie.ts`
- `src/aplikacja/menu/MenuBoczne.tsx`
- `src/aplikacja/menu/ikonyPozycjiMenu.ts`
- `src/aplikacja/menu/pozycjeMenu.ts`
- `src/kartoteki/uzytkownicy/OchronaKartotekiUzytkownikow.tsx`
- `src/kartoteki/uzytkownicy/PanelOperacjiKont.tsx`
- `src/kartoteki/uzytkownicy/PodgladUzytkownika.tsx`
- `src/kartoteki/uzytkownicy/WidokProfiluUzytkownika.tsx`
- `src/kartoteki/uzytkownicy/WidokUzytkownikow.tsx`
- `src/kartoteki/uzytkownicy/daneUzytkownikow.ts`
- `src/kartoteki/uzytkownicy/importEksportUzytkownikow.ts`
- `src/kartoteki/uzytkownicy/magazynUzytkownikow.ts`
- `src/kartoteki/uzytkownicy/stanPodgladuUzytkownika.ts`
- `src/kartoteki/uzytkownicy/typyUzytkownikow.ts`
- `src/kartoteki/uzytkownicy/uprawnienia.ts`
- `src/kartoteki/uzytkownicy/walidacjaUzytkownikow.ts`
- `src/kartoteki/uzytkownicy/widokUzytkownikow.css`
- `testy/konta.przegladarka.test.mjs`
- `testy/loaderDemoKont.mjs`
- `testy/menuDrzewo.regresja.test.ts`
- `testy/modernizacjaKont.test.ts`
- `testy/srodowiskoDemoKont.mjs`
- `testy/uwierzytelnianieProdukcyjne.test.ts`
- `testy/uzytkownicySesje.regresja.test.ts`
- `testy/v4Logowanie.test.mjs`
