# Rutyny — Dni robocze, 2026-11-05

## Audyt istniejącego przepływu

Praca na zastanej gałęzi `main`, HEAD `a60b663`. Początkowo working tree był czysty, `main` zgodny z lokalną referencją `origin/main`. Nie tworzono gałęzi, commitów ani wydania; nie zmieniano konfiguracji publikacji i nie używano internetu ani nowych zależności.

- `logika/rutyny.ts`: `Rutyna`, wersje harmonogramu z datą `od`, trzy dotychczasowe częstotliwości (`CODZIENNIE`, `DNI_TYGODNIA`, `CEL_TYGODNIOWY`), dzienne i tygodniowe wystąpienia obliczane bez tworzenia osobnych zadań.
- `DailyRoutines.tsx`: wspólny formularz tworzenia i edycji, widoki dnia, tygodnia, zaległości, historii oraz zarządzania.
- `uslugi/rutynyPulpitu.ts`: jeden zapis rutyn, wykonań i historii w `StanPulpitu.rutyny`, w kluczu `ultimatePomagier.pulpit.v1`. Kontrola użytkownika i uprawnień oraz wersjonowanie zmian harmonogramu i właściciela pozostają w tej usłudze.
- `logika/harmonogramPracy.ts`: bloki pracy i niezależny rozkład odbiorów kuriera. `pulpit.dniPracy` w modelu ustawień to istniejące źródło tygodnia pracy; nie dodano drugiej listy dni.
- `modelUstawienAplikacji.ts`, `magazynUstawienAplikacji.ts`, `UstawieniaHarmonogramu.tsx`: istniejący model, walidacja, normalizacja, zapis, import i eksport ustawień. Konfiguracja jest lokalna i wspólna dla instalacji/originu, a nie serwerowym kalendarzem firmy.
- Model `Uzytkownik` ma stabilne ID, role, status i organizację. Nie znaleziono istniejącego modelu urlopów, zwolnień ani innych nieobecności.
- Nie znaleziono oddzielnego silnika cyklicznych zadań użytkownika ani kalendarza pracy do przejęcia. Kalendarze terminów dokumentów dotyczą innej domeny.
- Hooki obsługują zdarzenia w bieżącym oknie, `storage` między oknami tego samego originu, fokus i okresowe odświeżanie. Nie ma synchronizacji tych danych pomiędzy Windows, Androidem i Raspberry Pi. Istniejący backup obejmuje ustawienia i Pulpit, ale nie jest synchronizacją.

Przeczytano wcześniejsze audyty harmonogramu i magazynów danych. Magazyn rutyn oraz magazyn konfiguracji mają różne odpowiedzialności; nie wymagają konsolidacji z rejestrami dokumentów.

## Zmiany i pliki

| Plik | Odpowiedzialność |
| --- | --- |
| `src/wspolne/czas/kalendarzPracy.ts` | Czysty model kalendarza, walidacja wyjątków, data warszawska, święta, pierwszeństwo i ocena dnia z powodem |
| `src/wspolne/czas/serwisKalendarzaPracy.ts` | Adapter istniejących ustawień, `sprawdzDzienPracy`, `czyDzienRoboczy` i alias `isWorkingDay(date, userId)` |
| `src/moduly/zamkniete/pulpit/logika/harmonogramPracy.ts` | Opcjonalne wyjątki kalendarza w istniejącym modelu, walidacja i bloki uwzględniające kalendarz |
| `src/aplikacja/ustawienia/UstawieniaHarmonogramu.tsx` | Minimalna rejestracja zakresów nieobecności oraz firmowych i indywidualnych dni wolnych/pracujących |
| `src/moduly/zamkniete/pulpit/logika/rutyny.ts` | Nowy wariant `DNI_ROBOCZE`; przekazywanie kalendarza do wystąpień dnia i tygodnia |
| `src/moduly/zamkniete/pulpit/uslugi/rutynyPulpitu.ts` | Odczyt nowej częstotliwości i sprawdzanie dostępności wykonania według aktualnego kalendarza |
| `src/moduly/zamkniete/pulpit/useRutynyPulpitu.ts` | Udostępnienie kalendarza i odświeżanie po zmianie ustawień |
| `src/moduly/zamkniete/pulpit/DailyRoutines.tsx` | Nowa domyślna częstotliwość, opis, zachowanie istniejących konfiguracji, wspólne obliczenia list i zaległości |
| `src/moduly/zamkniete/pulpit/RutynyNaOsi.tsx` | Wystąpienia i przypisane bloki według kalendarza właściciela |
| `src/moduly/zamkniete/pulpit/logika/czasDnia.ts` | Wspólna ocena dnia pracy; wskazanie czasu według Warszawy dla zakresu powiązanego z kalendarzem |
| `src/moduly/zamkniete/pulpit/WidokPulpitu.tsx` | Kalendarz obserwowanego użytkownika, bloki i oznaczenie dnia wolnego; polska data planu i przycisku Dzisiaj |
| `testy/kalendarzPracy.test.ts` | Regresje domeny, zgodności storage, wersjonowania i historii |
| `testy/kalendarzPracy.przegladarka.test.mjs` | Rzeczywiste formularze, historia, Pulpit, mały ekran, obca strefa urządzenia i offline |
| `package.json` | Włączenie nowego testu domenowego do `npm test` |
| `docs/audyty/rutyny-dni-robocze-2026-11-05.md` | Niniejszy audyt i raport |

Nie dodano nowych kluczy localStorage. Opcjonalne `harmonogramPracy.wyjatkiKalendarza` pozwala odczytać stare ustawienia bez migracji zapisującej dane. Brak pola oznacza pustą listę wyjątków. Obecna normalizacja zachowuje poprawne nowe dane; istniejąca walidacja zapisu i importu odrzuca błędne zakresy, identyfikatory, rodzaje i brak użytkownika przy nieobecności. Odczyt starych rutyn nie zmienia częstotliwości i niczego nie zapisuje.

## Reguły kalendarza

Domyślnie poniedziałek–piątek, z wykorzystaniem istniejącego `pulpit.dniPracy`. Daty zakresów są datami kalendarzowymi `YYYY-MM-DD`, obie granice są włączne. Moment `Date` jest interpretowany w `Europe/Warsaw`; obliczenia dni i świąt nie zależą od lokalnej strefy systemu ani długości doby podczas zmiany czasu.

Pierwszeństwo, od najwyższego:

1. Indywidualny, jawnie zarejestrowany dzień pracujący — również podczas urlopu, święta lub zamknięcia firmy.
2. Indywidualna nieobecność: zwolnienie, następnie urlop, inna nieobecność i dodatkowy dzień wolny.
3. Firmowy dzień wolny.
4. Firmowy dzień pracujący.
5. Polskie święto.
6. Skonfigurowany tydzień pracy.

Przy jednakowym priorytecie powód wybierany jest według ID wpisu, a nie kolejności tablicy. Wyjątki indywidualne dotyczą właściciela wystąpienia z wersji obowiązującej w danym dniu, także po późniejszym przeniesieniu rutyny do innej osoby.

Święta stałe: 1 stycznia, 6 stycznia (od 2011), 1 i 3 maja, 15 sierpnia, 1 i 11 listopada, 24 grudnia (od 2025), 25 i 26 grudnia. Święta ruchome obliczane lokalnie z daty Wielkanocy: Wielkanoc, Poniedziałek Wielkanocny, Zielone Świątki i Boże Ciało. Dodatkowy dzień wolny za sobotnie święto wymaga wpisania daty ustalonej w firmie; system nie wybiera jej sam.

Wolny dzień nie tworzy wystąpienia rutyny `DNI_ROBOCZE`, nie zwiększa jej zaległości i nie przenosi zadania na jutro. Kolejny dzień pracy daje jedno wystąpienie z własną datą. Godzina albo ID bloku pozostają w wersji rutyny. Wyjątkowy dzień pracy bez własnych aktywnych bloków korzysta z bloków pierwszego skonfigurowanego dnia tygodnia pracy (poniedziałku przy ustawieniach domyślnych).

Zmiana kalendarza przelicza wystąpienia dla podanych dat, także historycznych, lecz nie usuwa i nie przepisuje wykonań ani dziennika historii. Wykonania pozostają w zakładce Historia nawet po oznaczeniu daty jako wolnej. Próba wykonania niedostępnego wystąpienia jest blokowana także w usłudze, a nie wyłącznie w UI. Reguły dat `od` dla zmian rutyn i osobna semantyka celów tygodniowych pozostają zachowane.

## Weryfikacja

- `npm test` — przeszedł pełny zestaw, w tym nowy test kalendarza.
- `npm run lint` oraz `npm run build` — przeszły.
- `npm run test:dystrybucja` — przeszło 15 testów, w tym kontrakty platform natywnych i pakowania.
- `testy/kalendarzPracy.test.ts` — poniedziałek, oba dni weekendu, święta stałe i ruchome, Wigilia przed i po 2025, zakres urlopu, zwolnienie i nakładanie wyjątków, dzień za sobotnie święto, pracująca sobota, przełom roku, zmiana czasu, zmiana właściciela, stara rutyna, daty obowiązywania zmian, zmiana kalendarza po zapisie, historia, eksport/import i brak sieci.
- Ten sam test domenowy uruchomiony również przy `TZ=UTC`, `America/Los_Angeles` i `Asia/Tokyo`.
- `testy/kalendarzPracy.przegladarka.test.mjs` — widoki 1440×900 i 390×844 z dotykiem; formularz nowej i istniejącej rutyny, walidacja wyjątków, zapis i restart, rozdzielenie firmowych i indywidualnych wyjątków, oś i zaległości, historia wykonań, pracująca sobota, święto i Wigilia. Mały ekran używa strefy Los Angeles przy momencie będącym już poniedziałkiem w Polsce. Odłączenie sieci i zmiana kalendarza w otwartej aplikacji nie blokują obliczeń ani odświeżenia.
- Nowe testy przeglądarkowe — przeszły oba scenariusze. Potwierdzono także brak przepełnienia szerokości formularza ustawień i Pulpitu.
- Istniejące testy przeglądarkowe `harmonogramPracy.przegladarka.test.mjs` i `rutyny.przegladarka.test.mjs` — przeszły.
- Przejrzano diff; `git diff --check` przeszedł.

Testy przeglądarkowe używają osobnych profili Chrome i lokalnego serwera demonstracyjnego. Pierwsze próby zatrzymały ograniczenia połączeń lokalnych sandboxa; docelowe uruchomienie odbyło się z dostępem do lokalnego serwera poza izolacją. Poprawiono także dwa selektory etykiet w nowym teście. Nie używano danych użytkownika.

## Ograniczenia i integracja

- Windows: testy Node i Chrome. Android: dotykowy mały ekran oraz istniejące testy kontraktów platformy; bez fizycznego urządzenia. Raspberry Pi: wspólna logika TypeScript i build WEB; bez uruchomienia na fizycznym Raspberry Pi ani kompilacji ARM.
- Kalendarz działa offline po uruchomieniu aplikacji. Nie dodano mechanizmu uruchamiania całej strony WEB bez sieci ani service workera.
- Ustawienia i rutyny pozostają lokalne. Automatyczna synchronizacja między urządzeniami nie istnieje i nie została dodana. Tydzień bazowy pozostaje wspólnym ustawieniem; indywidualne różnice rejestruje się wyjątkami dat.
- Wyjątki korzystają z istniejącego dostępu do globalnych ustawień; nie jest to serwerowy moduł kadrowy z nową polityką dostępu. Usuwanie i ponowne dodanie wpisu służy korekcie zakresu. Nie dodano zatwierdzania urlopów ani osobnego wersjonowania kalendarza.
- Rozkład kuriera jest osobną konfiguracją zewnętrznej usługi. Nie zmieniono go automatycznie na podstawie urlopu pracownika.
- Reguły świąt są częścią kodu, bez pobierania z API; ewentualne przyszłe zmiany reguł wymagają aktualizacji aplikacji lub jawnego wyjątku.
- Build zachowuje wcześniejsze ostrzeżenia o dużych chunkach i mieszanym statycznym/dynamicznym imporcie Tauri.

Rozwiązanie nadaje się do integracji w istniejącej lokalnej architekturze. Wspólny serwis może obsługiwać przyszły moduł nieobecności lub zadań cyklicznych bez tworzenia kolejnego kalendarza. Nie uruchamiano publikacji ani nowego wydania.
