# Naprawa importu maili do Szczegółów organizacyjnych

Data: 30.10.2026. Repozytorium lokalne: `Ultimate_Pomagier_4_aktualny`, gałąź `main`, HEAD `1454685287ba440eef9eb83d1d5597cfcd117e24`.

## 1. Diagnoza

- Część prostych zapisów trenera, uczestników i kwot była już obsługiwana. Problem obejmował cały przepływ: granice kontekstów, interpretację, mapowanie i wznowienie formularza.
- Odczyt pojedynczego pola i odczyt bloku używały różnych reguł. Nazwa klienta była skracana do pierwszego wiersza; normalizacja podzielonych etykiet nie była wspólna dla wykrywania sekcji.
- Data szkolenia po nagłówkach nadawcy mogła zostać zakwalifikowana jako data wysłania wiadomości.
- Parser nie mapował rodzaju godzin. W formularzu pozostawała początkowa wartość „Dydaktyczne (45 min)”. Domyślne wartości mogły również otrzymywać mylący status danych ręcznych.
- Uczestnicy i trenerzy byli wybierani na podstawie pierwszego trafienia, bez rozstrzygania sprzecznych deklaracji. Brakowało części aliasów liczby uczestników i dopasowania klienta po NIP.
- Nawigacja z przycisku „Edytuj” czyściła aktywną kopię przed jej otwarciem. Odtworzono to rzeczywistym testem przeglądarkowym, po poprawnym zapisaniu danych.

## 2. Zmienione pliki

Ścieżki poniżej są względne względem katalogu repozytorium.

| Plik | Cel zmiany |
| --- | --- |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/analizaTresciMaila.ts` | Wydzielona normalizacja, wspólna ekstrakcja sekcji i konwersja uczestników, godzin oraz kwot; odtworzenie numeracji list HTML. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts` | Interpretacja kontekstów, dat, wieloliniowej firmy, rodzaju godzin, konfliktów, danych klienta i programu. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/mapowanieImportuMaila.ts` | Statusy danych początkowych, dopasowanie nazwanych grup i zachowanie ręcznych wartości. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts` | Przekazanie istniejącej kartoteki klientów, zastosowanie danych do docelowej grupy i prezentacja ostrzeżeń. |
| `src/kartoteki/klienciKartoteki.ts` | Wydzielenie istniejącego typu, danych startowych, klucza i odczytu klientów do użycia przez oba przepływy. |
| `src/kartoteki/WidokKartotek.tsx` | Korzystanie z wydzielonego odczytu zamiast utrzymywania drugiej definicji klientów. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/stale.ts` | Uwzględnienie rodzaju godzin w statusach importu. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PolaSzczegolow.tsx` | Puste pole liczbowe przy braku informacji zamiast prezentacji początkowego zera. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx` | Rozwijany dostęp do zachowanej wiadomości źródłowej. |
| `src/aplikacja/layout/UkladAplikacji.tsx` | Zachowanie wybranej kopii podczas otwierania jej z rejestru. |
| `testy/fixtures/mailOrganizacyjnyOze.txt` | Reprezentatywna wiadomość z odrębnymi rolami osób i adresów oraz programem. |
| `testy/parserMailaSzczegolow.regresja.test.ts` | Testy warstw analizy, konwersji, kartotek, konfliktów, mapowania i ochrony ręcznej edycji. |
| `testy/importMailaSzczegolow.przegladarka.test.mjs` | Testy rzeczywistego formularza, formatowania, zapisu i ponownego otwarcia kopii. |
| `docs/v4/manifest-widokow.json`, `docs/v4/rejestr-widokow.md` | Wymagana aktualizacja rejestru powierzchni UI po dodaniu źródła importu. |
| `docs/audyty/naprawa-importu-maili-szczegolow-2026-10-30.md` | Raport prac i wyników. |

## 3. Poprawione mechanizmy

Istniejący parser korzysta z wydzielonych, czystych funkcji analizy. Normalizacja służy dopasowaniu etykiet i granic sekcji; oryginalna wiadomość pozostaje zachowana. Program zachowuje numerację, podpunkty i wcięcia. Konwersja ceny nie wykonuje działań zmiennoprzecinkowych na kwocie; końcowa wartość pozostaje liczbą zgodną z modelem formularza.

Jednoznaczny trener jest wybierany z kartoteki z zachowaniem jej ID i pisowni. Nierozpoznana osoba pozostaje w imporcie do weryfikacji; kartoteka nie jest automatycznie rozszerzana. Dopasowanie klienta korzysta z NIP, a przy jego braku z nazwy. Niejednoznaczne rekordy dają propozycje i ostrzeżenie.

Rozpoznane wartości zastępują wartości początkowe, a ręczne poprawki i wyczyszczenia pozostają chronione. Sprzeczne liczby uczestników i trenerzy nie powodują arbitralnego wyboru. Nazwana grupa jest dopasowywana do istniejącej grupy formularza; niejednoznaczne nazwy nie powodują jej nadpisania.

Nie zmieniono schematu trwałych rekordów, kluczy storage ani mechanizmu zapisu. W istniejącym modelu liczbowym początkowe zero nadal jest wartością techniczną; brak rozpoznania nie zapisuje go jako wyniku parsera, a formularz pokazuje puste pole i status „Brak”.

## 4. Wyniki importu referencyjnego

| Pole | Oczekiwana wartość | Wartość po imporcie | Wynik |
| --- | --- | --- | --- |
| Trener | Rafał Wojtaszek | Rafał Wojtaszek, ID dopasowanego rekordu | OK |
| Liczba uczestników | 50 | 50 | OK |
| Cena netto | 7500 | 7500; w formularzu 7500,00 | OK |
| Oświadczenie VAT | ZW – 100% | ZW – 100% | OK |
| Liczba godzin | 6 | 6 | OK |
| Rodzaj godzin | Zegarowe (60 min) | Zegarowe (60 min) | OK |
| Nazwa klienta | Wojewódzki Fundusz Ochrony Środowiska i Gospodarki Wodnej w Łodzi | Wojewódzki Fundusz Ochrony Środowiska i Gospodarki Wodnej w Łodzi | OK |
| Data od / do | 06.11.2026 / 06.11.2026 | 2026-11-06 / 2026-11-06 | OK |
| Forma | Stacjonarne | Stacjonarne | OK |
| NIP | 7272755012 | 7272755012 | OK |
| Adres klienta | Dubois 118, 93-465 Łódź | ulica Dubois, nr 118, kod 93-465, miasto Łódź | OK |
| Termin płatności | 14 dni | 14 | OK |
| Harmonogram | 09:00–15:00 | 09:00–15:00 w istniejącym opisie harmonogramu grupy | OK |

Pola trenera, uczestników, kwoty, VAT, liczby i rodzaju godzin oraz dat uzyskały status „Zaimportowane” w testach rzeczywistego formularza. Nie powstały fikcyjne rekordy uczestników. Wartości są widoczne bez odświeżania widoku.

## 5. Wykonane testy

- `node --import ./testy/rejestrujLoaderTs.mjs --test testy/parserMailaSzczegolow.regresja.test.ts`: 152/152.
- `node --test testy/importMailaSzczegolow.przegladarka.test.mjs`: 2/2 w lokalnym Chrome, na izolowanym serwerze Vite w trybie demonstracyjnym.
- `node --test testy/wydajnoscSzczegolow.przegladarka.test.mjs`: 2/2; edycja wielu grup i walidacja po zmianie kompletnej grupy.
- `npm test`: cały skrypt, wraz z pretest i końcowymi testami kont, zakończony kodem 0.
- `npm run lint`: kod 0, bez błędów.
- `npm run build`: kod 0. Pozostają komunikaty Vite o rozmiarze chunków i mieszanym imporcie modułu Tauri.
- `git diff --check`: kod 0.

Warianty obejmują zwykły tekst, Markdown, tabele Markdown/HTML, NBSP, dodatkowe spacje, etykiety podzielone na wiersze i wartości pod etykietą. Sprawdzono wszystkie wskazane jednostki godzin oraz polskie formaty kwot. Test przeglądarkowy wykonuje trzy warianty importu, ręczną zmianę 50→48, ponowny import, zapis kopii i jej otwarcie przez „Edytuj” w rejestrze.

## 6. Regresje

Przeszedł dotychczasowy scenariusz V4: kartoteki, adresy, wiele grup, rozliczenia, ręczne poprawki i rozstrzyganie niejednoznacznego trenera. Pełny zestaw repozytorium obejmuje również istniejące generatory, zapis, migracje, dokumenty, checklisty, uprawnienia i workflow. Program numerowany i zagnieżdżone listy HTML mają osobne testy. Nie dodano zależności ani zapytań do usług zewnętrznych.

## 7. Ograniczenia istniejącego modelu

- Kartoteka zawiera cztery miejscowości o nazwie „Łódź”. Jej dotychczasowy mechanizm nie rozstrzyga ich samą nazwą ani kodem pocztowym; lokalizacja może nadal wymagać weryfikacji. Test zapisu używa izolowanej, jednoznacznej kartoteki testowej. Produkcyjna kartoteka nie została zmieniona.
- Model nie ma osobnego pola terminu otrzymania imiennej listy uczestników. „Lista uczestników: po szkoleniu” pozostaje dostępna w zachowanej wiadomości źródłowej i nie zmienia liczby uczestników.
- Samodzielny tytuł w cudzysłowie, bez potwierdzenia tematem lub jawną etykietą, zachowuje dotychczasowy status wymagający weryfikacji. Nie wpływa to na pewność pozostałych pól.
- Szczegóły przechowują nazwę i snapshot nabywcy; dopasowanie klienta nie dodaje nowego identyfikatora relacji do trwałego modelu.

## 8. Status Git

- Katalog: `C:\Users\madej\Documents\____GitHub_Projects\___Projekty_GitHub\Ultimate_Pomagier_4_aktualny`.
- Origin: `https://github.com/kapi1944/Ultimate_Pomagier_3_5.git` — zastana historyczna nazwa zdalnego repozytorium.
- Gałąź: `main`; HEAD: `1454685287ba440eef9eb83d1d5597cfcd117e24`.
- Zmiany zadania pozostają lokalne, bez stage i commita. Nie wykonano publikacji ani wydania instalatorów.
- Zachowano trzy zastane zmiany użytkownika: `WidokProgramowSzkolen.tsx`, `modelProgramuSzkolenia.ts`, `rdzenProgramowSzkolen.test.ts`.
