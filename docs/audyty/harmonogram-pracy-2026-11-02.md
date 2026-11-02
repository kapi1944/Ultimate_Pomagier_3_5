# Harmonogram pracy Pulpitu — 2026-11-02

## Audyt i zakres

Praca na zastanej gałęzi `main`, z lokalnym HEAD `b93ea23` (import maila do Dyplomów), o jeden commit przed lokalną referencją `origin/main`. Na początku istniał nieśledzony audyt OCR. W czasie realizacji pojawiały się kolejne zmiany importera OCR; zachowano je bez modyfikowania jego kodu. Nie tworzono gałęzi, commitów, pushu ani publikacji produkcyjnej. Nie korzystano z internetu i nie dodawano zależności na potrzeby harmonogramu.

Audyt kodu i `audyt-magazynow-danych.md` potwierdził odrębność magazynów domenowych Pulpitu i ustawień od rejestrów dokumentów. Rutyny i ich wykonania mają jedno źródło prawdy: `StanPulpitu.rutyny` w `ultimatePomagier.pulpit.v1`. Konfiguracja interfejsu i godzin pracy jest przechowywana przez istniejący magazyn ustawień aplikacji. Zachowano oba te przeznaczenia, bez nowego klucza storage i bez kopii rutyn.

Układ Plan dnia → Do wykonania dzisiaj → Zadania z terminem → kompaktowe Daily Routines → statystyki już istniał. Został zachowany. Zastany model odkładał zmianę godziny rutyny na przyszłą datę razem ze zmianą cykliczności; rozdzielono te reguły zgodnie z wymaganiem aktualizacji planowanego czasu od dziś.

## Funkcje zaimplementowane

- Pięć domyślnych bloków: Rozruch 07:45–08:30, Przygotowania 08:30–10:00, Paczkowanie 10:00–13:00, Multitasking 13:00–15:00, Podsumowania 15:00–16:00. Domyślnie poniedziałek–piątek.
- W Ustawieniach → Pulpit: nazwy, godziny, dni, kolejność listy, dodawanie, usuwanie i wyłączanie bloków. Oś umieszcza segmenty według godzin; kolejność ustawień określa kolejność wyboru bloku. Identyfikator bloku pozostaje stabilny przy zmianie nazwy i kolejności.
- Centralna walidacja przedziałów, nazw, dni, unikalności identyfikatorów i nakładania aktywnych bloków w tych samych dniach. Błąd blokuje zapis i import konfiguracji, a formularz zachowuje wpisane dane.
- Trzy tryby planowanego czasu rutyny dziennej: godzina, blok pracy, brak czasu. Dotychczasowe opcjonalne pole `godzina` zachowano; dodano opcjonalne `blokPracyId`. Kombinacja godziny i bloku jest odrzucana.
- Rutyna bloku jest prezentowana jako przedział powiązanego segmentu, bez przypisania sztucznej godziny ani deadline'u. Rutyny bez czasu pozostają dostępne przez cały dzień.
- Wyłączony, usunięty lub niewystępujący w wybranym dniu blok nie usuwa rutyny; na osi pojawia się informacja o niedostępności i potrzebie ponownego przypisania.
- Zmiana samego planowanego czasu może obowiązywać od dziś; wersje wcześniejszych dni i historyczne wykonania pozostają zachowane. Ograniczenia zmian cykliczności, aktywności, właściciela i celów tygodniowych pozostają w usłudze domenowej.
- Wykonanie i cofnięcie wykonania na osi, w skrócie i w module rutyn korzystają z tej samej usługi. Zdarzenie po udanym zapisie odświeża hooki w bieżącym oknie; istniejące odświeżanie `storage` obsługuje inne okna.
- Konfiguracja kuriera: poniedziałek i piątek 13:30–16:00, wtorek–czwartek 14:30–16:00, weekend bez odbioru. Można edytować każdy dzień tygodnia oraz dodawać i usuwać wyjątki dla konkretnych dat, w tym odwołanie odbioru.
- Okno kuriera jest wyliczane dla wybranej daty. Wyjątek ma pierwszeństwo przed konfiguracją tygodnia. Wizualizacja to wyłącznie półprzezroczyste tło osi, z podpowiedzią dla myszy, dotyku i fokusu oraz tekstem dla technologii wspomagających. Nie tworzy się zdarzeń dziennych, potwierdzeń przyjazdu ani statusów opóźnienia.
- Segmenty i tło kuriera wykorzystują semantyczne zmienne CSS i tokeny aktywnego motywu. Krótkie segmenty mają skracane etykiety i pełne podpowiedzi. Etykiety rutyn zawijają tekst, a wysokość rośnie wraz z zawartością.
- Przykłady „Przygotuj etykiety kurierskie” i „Sprawdź gotowość paczek do odbioru” dostępne jako przyciski wypełniające formularz nowej rutyny. Nic nie jest tworzone automatycznie; mechanizmy etykiet paczek pozostały bez zmian.

## Zgodność danych

Stare ustawienia otrzymują domyślny harmonogram przez normalizację w pamięci, bez zapisu podczas odczytu. Stare rutyny bez `blokPracyId` zachowują dotychczasową interpretację godziny lub braku czasu. Zapis, odczyt, eksport i import używają istniejącego magazynu ustawień. Nie ma destrukcyjnej migracji ani przepisywania historycznych wykonań.

Daty kalendarzowe konfiguracji są sprawdzane przed interpretacją dnia tygodnia. Wybrana data jest interpretowana lokalnie, bez przesuwania przez konwersję z daty UTC na lokalną. Istniejący mechanizm okresów rutyn i jego strefa Europe/Warsaw zostały zachowane.

## Pliki zadania

| Plik | Zmiana |
| --- | --- |
| `src/moduly/zamkniete/pulpit/logika/harmonogramPracy.ts` | Nowy model konfiguracji, wartości domyślne, walidacja, normalizacja i wyliczanie bloków/okien dla daty |
| `src/aplikacja/ustawienia/modelUstawienAplikacji.ts` | Rozszerzenie istniejącego modelu i normalizacji ustawień |
| `src/aplikacja/ustawienia/magazynUstawienAplikacji.ts` | Walidacja harmonogramu przy zapisie i imporcie |
| `src/aplikacja/ustawienia/UstawieniaHarmonogramu.tsx` | Nowy lokalny formularz konfiguracji bloków, tygodnia i wyjątków kuriera |
| `src/aplikacja/ustawienia/WidokUstawien.tsx` | Włączenie formularza i prezentacja błędów zapisu |
| `src/aplikacja/ustawienia/widokUstawien.css` | Responsywne wiersze formularza |
| `src/moduly/zamkniete/pulpit/logika/rutyny.ts` | Opcjonalne powiązanie bloku w wersji i wystąpieniu rutyny |
| `src/moduly/zamkniete/pulpit/uslugi/rutynyPulpitu.ts` | Walidacja czasu/bloku, reguły zmiany czasu od dziś i zdarzenie po zapisie |
| `src/moduly/zamkniete/pulpit/useRutynyPulpitu.ts` | Reakcja na zapis rutyn w tym samym oknie |
| `src/moduly/zamkniete/pulpit/DailyRoutines.tsx` | Formularz planowanego czasu, opis planu i przykłady paczkowania |
| `src/moduly/zamkniete/pulpit/RutynyNaOsi.tsx` | Rutyny przypisane do przedziału bloku i obsługa niedostępnych bloków |
| `src/moduly/zamkniete/pulpit/WidokPulpitu.tsx` | Segmenty i tło kuriera; reakcja na zmianę ustawień |
| `src/moduly/zamkniete/pulpit/pulpit.css` | Style segmentów, przedziałów rutyn, kuriera i podpowiedzi |
| `testy/harmonogramPracy.test.ts` | Nowe testy domeny, storage i integracji rutyn |
| `testy/harmonogramPracy.przegladarka.test.mjs` | Nowy test rzeczywistego interfejsu |
| `testy/rutyny.test.ts` | Zaktualizowany kontrakt zmiany planowanej godziny od dziś |
| `testy/rutyny.przegladarka.test.mjs` | Dostosowanie wejścia do istniejącego kompaktowego widoku i jawny wybór zakładki Dzisiaj |
| `package.json` | Dołączenie testu harmonogramu do `npm test`; pozostałe zmiany OCR w tym pliku nie należą do tego zadania |
| `docs/v4/manifest-widokow.json` | Wpis właściciela nowego komponentu ustawień; zachowano wpisy innych prac |
| `docs/v4/rejestr-widokow.md` | Odpowiadający wpis rejestru V4 |
| `docs/audyty/harmonogram-pracy-2026-11-02.md` | Niniejszy raport |

## Weryfikacja

- `npm test` — przeszedł pełny zestaw wraz z nowym testem harmonogramu.
- `npm run lint` — przeszedł.
- `npm run build` — przeszedł. Pozostają ostrzeżenia bundlera o dużym chunku i jednoczesnym statycznym/dynamicznym imporcie Tauri.
- `git diff --check` — przeszedł.
- `harmonogramPracy.przegladarka.test.mjs` — przeszedł: tworzenie rutyn we wszystkich trzech trybach, zmiana czasu i bloku od dziś, dwustronna synchronizacja wykonania, restart, wszystkie dni kuriera, dotykowa podpowiedź, edycja i kolejność bloków, dodawanie/usuwanie/wyłączanie, konflikt godzin i wyjątek odwołujący odbiór.
- `rutyny.przegladarka.test.mjs` — przeszedł: istniejący przepływ rutyn i celów tygodniowych, restart, małe ekrany i kontrast komunikatów.
- `reorganizacjaPulpitu.przegladarka.test.mjs` — przeszedł: istniejące zadania, rutyny, daty, motywy, skale i hierarchia Pulpitu.
- `osCzasuPulpitu.przegladarka.test.mjs` — przeszedł: pusty widok 126 px, dynamiczny wzrost przy 1 i 6 zadaniach, długie etykiety i miniatury bez kolizji.
- Test nowego harmonogramu objął dziewięć motywów, skale 75% i 85%, szerokość 1440 px, ekran 390×844 i poziomy 844×390, długą etykietę rutyny, brak obcięcia i kolizji oraz dokładne współrzędne tła kuriera.
- Testy domenowe uwzględniają poniedziałkowe 13:29, 13:30, 15:59 i 16:00, stykanie bez nakładania bloków, różne dni aktywności, błędne daty, zapis/odczyt/import/eksport, odczyt starych danych bez mutacji oraz zachowanie wykonania przy zmianie planu.

Testy przeglądarkowe uruchomiono w osobnych profilach Chrome przeciw lokalnemu serwerowi demonstracyjnemu. Nie używano danych sesji użytkownika ani usług zewnętrznych.

## Przygotowane architektonicznie i ograniczenia

Konfiguracja tygodniowa i funkcja wyliczająca okno dla daty mogą w przyszłości zasilać przypomnienia. Systemu powiadomień ani automatyzacji nie wdrożono. Nie dodano nieużywanych pól przypomnień.

Wyjątki dat są już działającą funkcją, a nie samym przygotowaniem modelu. Informację o odwołaniu odbioru użytkownik wprowadza ręcznie; kalendarz świąt nie jest pobierany.

Cele „N razy w tygodniu” zachowują dotychczasową semantykę bez przypisania do godziny dnia. Bloki mogą działać w dowolnych dniach tygodnia; rutyna dzienna poza dniami aktywności jej bloku jest jawnie oznaczona jako wymagająca ponownego przypisania, z zachowaniem możliwości wykonania.

Responsywność i dotyk przetestowano w Chrome na Windows. Nie przeprowadzono testu na fizycznym urządzeniu Android ani Raspberry Pi. Konfiguracja pozostaje globalną konfiguracją aplikacji, zgodnie z istniejącym modelem ustawień i jego kontrolą dostępu; nie dodano oddzielnych ustawień użytkowników.

Working tree zawiera także odrębne, niezakończone prace OCR. Nie należy ich przypadkowo dołączać do przyszłego commita harmonogramu. `package.json` i rejestry V4 mają zmiany obu zadań i wymagają selektywnego stagingu, jeśli zadania będą commitowane osobno.
