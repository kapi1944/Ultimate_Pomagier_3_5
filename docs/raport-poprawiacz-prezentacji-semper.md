# Poprawiacz prezentacji SEMPER — raport wdrożenia

Data: 27.10.2026. Repozytorium: Ultimate_Pomagier_4_aktualny, gałąź `main`.

## Co potwierdził audyt modułu

Dotychczasowy moduł odczytywał archiwum PPTX, usuwał dwa rozpoznawane rodzaje obiektów i udostępniał podgląd strukturalny. Brakowało renderowania, składu druku, okładek i eksportu ZIP. Rozbudowa korzysta z tego samego modelu PPTX i istniejącego wyboru Szczegółów organizacyjnych. Nie dodaje nowego rejestru, magazynu danych ani integracji sieciowej.

Przekazane wzorce skopiowano bez zmiany oryginałów do `public/szablony/prezentacje/`. Pionowy ma jeden slajd 19,05 × 25,4 cm; poziomy ma trzy slajdy 33,8667 × 19,05 cm. Pozioma prezentacja zawiera dwa wzorce, a jej slajd treści dziedziczy firmowe paski, logo i numerację. Okładki wykorzystują osobne kompozycje obu źródeł.

## Dodane funkcje

- Odczyt relacji slajd → układ → wzorzec, dziedziczonej geometrii pól i separatorów o zerowej wysokości.
- Własne wymiary slajdu oraz profil wysokości 20,5 cm. Zachowanie natywnych obiektów PPTX, mediów, relacji, układów i wzorców.
- Wyznaczanie obszaru bezpiecznego, ochrona nagłówka i stopki, powiększanie pola nagłówka, przesuwanie separatora i treści pod nim, proporcjonalne dopasowanie obrazów i grup.
- Zachowanie numeracji wzorca i usuwanie dodatkowych pól liczbowych w jego obecności. Obiekty powiązane z animacjami lub połączeniami są chronione przed usunięciem.
- Wykrywanie potencjalnych kolizji i obiektów poza slajdem. Korekta nie zatwierdza przesunięć wprowadzających nowe kolizje. Istniejące, niejednoznaczne nakładanie elementów pozostaje do kontroli.
- Wybór Szczegółów organizacyjnych i konkretnej grupy/terminu. Dane: tytuł, data, miejscowość, trener, e-mail trenera i klient. Ręczne korekty oraz mapowanie dowolnego pola tekstowego pierwszego slajdu z podglądem nowej wartości i zatwierdzeniem. Niezmapowane pola pozostają bez zmian.
- Niezależny generator okładek z danych formularza, także bez wczytanej prezentacji: edytowalny PPTX, PDF A4 i PNG w obu orientacjach. Alternatywnie eksport pierwszego slajdu aktualnej prezentacji, dopasowanego proporcjonalnie do A4.
- Lokalny eksport PPTX do PDF przez PowerPoint w Windows. Adapter LibreOffice dla desktopowego Linux. Możliwość wczytania PDF aktualnej prezentacji w przeglądarce, Androidzie lub przy braku programu renderującego.
- Panel „EKSPORT I DRUK”: format A4/A3/Letter, orientacja, jeden/dwa slajdy na stronie, zakres, margines, kolor/skala szarości, dwustronność, krawędź odwracania i opcjonalna końcowa pusta strona.
- Automatyczne profile SEMPER, rzeczywisty podgląd układu stron, PDF do druku i komplet ZIP z instrukcją ustawień drukarki.
- Unieważnianie wcześniejszego PDF i podglądu po zmianie modelu PPTX; unieważnianie okładek po zmianie ich danych. Kontrola liczby stron importowanego PDF.

## Profile i liczba stron

| Liczba slajdów | Pliki PDF do druku w profilu automatycznym |
| --- | --- |
| 1 | 1 strona A4 pozioma |
| 10 | 10 stron A4 poziomych |
| 99 | 99 stron A4 poziomych |
| 100 | 100 stron A4 poziomych |
| 101 | okładka: 1 strona A4 pionowa; materiały: 50 stron A4 poziomych |
| 292 | okładka: 1 strona A4 pionowa; materiały: 146 stron A4 poziomych |

Profil A obejmuje wszystkie slajdy, po jednym na stronie. Profil B oddziela pierwszy slajd i układa pozostałe po dwa na stronie, jeden nad drugim. Nieparzysty ostatni slajd nie jest powielany. Pustą stronę można dodać jawnie w profilu ręcznym.

PDF nie ustawia fizycznego sterownika drukarki. Zalecenia są wyświetlane i zapisywane w ZIP: jedna strona PDF na arkusz, skala 100%, kolor, dwustronność i odpowiednia krawędź. Domyślna krawędź to dłuższa. Okładka w profilu B jest jednostronna.

## Biblioteki i środowisko

Wykorzystano istniejące zależności: JSZip 3.10.2, jsPDF 4.2.1, pdfjs-dist 6.2.108, React i Tauri. Nie instalowano nowych zależności. PowerPoint jest używany przez lokalny COM, z wyłączonymi makrami, na kopii otwartej do odczytu. Renderowanie ma limit czterech minut i korzysta z tymczasowego katalogu. Polecenie natywne sprawdza sesję i profil okna przed wykonaniem.

Podstawowy PDF zachowuje wynik renderowania PowerPoint. Skład druku używa obrazów slajdów w 300 DPI. Podgląd i eksport korzystają z tego samego rozkładu obszarów oraz reguł dopasowania. Eksportowane materiały do druku nie mają edytowalnych pól tekstowych; PPTX pozostaje edytowalny.

## Weryfikacja

- `npm test` — przechodzi pełny zestaw, wraz z nowymi testami.
- `npm run test:prezentacje` — 26/26 testów; wszystkie sześć wielkości prezentacji, zachowanie kolejności i edytowalności, wzorce, pola, separator, numeracja, proporcje, ZIP oraz ochrona kompozycji slajdu „Kontakt”.
- `npm run lint` — przechodzi.
- `npm run build` — przechodzi; pozostają ostrzeżenia Vite o rozmiarze istniejącego pakietu i statycznym/dynamicznym imporcie Tauri.
- `cargo check --offline --manifest-path src-tauri/Cargo.toml` — przechodzi w Windows. Ostrzeżenie środowiska o kopiowaniu zamiast hardlinków w cache nie zatrzymuje kompilacji.
- Lokalne renderowanie obu oryginalnych wzorców, wygenerowanych okładek i poprawionej prezentacji przez PowerPoint; oględziny PNG wszystkich slajdów źródłowych i zmienionych kompozycji. Obie końcowe okładki z długim tytułem nie zgłaszają przepełnienia tekstu.
- Test interfejsu w Chrome: niezależne okładki, import, korekta, mapowanie, odrzucenie PDF o złej liczbie stron, podgląd, eksport PDF i ZIP, unieważnianie podglądu oraz szerokość 390 px — przechodzi.
- `npm run test:prezentacje:przegladarka` — 2/2 testy. Wygenerowano i ponownie odczytano rzeczywiste PDF dla 1/10/99/100/101/292 slajdów; liczby stron i orientacje odpowiadają tabeli. Sprawdzono piksele renderowanego PDF z dwoma slajdami na stronie, potwierdzając ich kolejność; wykonano też oględziny tej strony. Końcowy przebieg trwał około 6,5 minuty.
- `git diff --check` — bez błędów białych znaków. Przejrzano diff plików zadania i końcowy stan repozytorium.

## Ograniczenia i dalsza weryfikacja

Korekta nie jest pełnym silnikiem składu PowerPoint. Pomiar nagłówka i dopasowanie czcionki są oszacowaniami; obracane obiekty, grupy, SmartArt i złożone kompozycje wymagają kontroli wizualnej. Niejednoznaczne kolizje są zgłaszane, a ryzykowne przesunięcia pomijane. Nie ma gwarancji automatycznej naprawy każdego rodzaju slajdu.

W trzecim slajdzie przekazanego poziomego szablonu PowerPoint zgłasza dwa ostrzeżenia pomiaru tekstu („Text Placeholder 4” i „Text Placeholder 3”). Występują również w oryginale. Są prezentowane użytkownikowi; nie są ukrywane jako udana walidacja.

Nie przekazano pliku referencyjnego `Ustawa_deweloperska_NOVISA_30-10-2026_FINAL_20-5cm.pptx`, więc nie wykonano porównania z jego rzeczywistymi 292 slajdami. Testy tej wielkości korzystają z danych syntetycznych. Renderowanie natywne sprawdzono w Windows/PowerPoint; adapter LibreOffice i natywne pakiety Android/Raspberry Pi wymagają oddzielnego sprawdzenia na tych platformach. Dla przeglądarki przetestowano ścieżkę z ręcznie wczytanym PDF. Zgodność jego treści z PPTX wymaga kontroli użytkownika, ponieważ sama liczba stron tego nie potwierdza.

## Uruchomienie i korzystanie

1. Przeglądarka: `npm run dev`. Windows/Tauri: `npm run desktop:dev`, z zainstalowanym PowerPoint. Testowy interfejs z kontem demonstracyjnym: `npm run dev:demo`.
2. Otwórz **Narzędzia → Poprawiacz prezentacji**. Wczytaj PPTX i wybierz **Analizuj prezentację**.
3. Zastosuj wybrane dotychczasowe operacje oczyszczania, docelowe wymiary i korektę. Przeczytaj uwagi.
4. Wybierz Szczegóły organizacyjne i grupę albo wpisz dane ręcznie. Rozwiń mapowanie pierwszego slajdu i zatwierdź konkretne zamiany.
5. W **EKSPORT I DRUK** pozostaw profil automatyczny lub zmień ustawienia. Przygotuj podgląd i przejrzyj strony oraz ostrzeżenia.
6. Pobierz PPTX, PDF, materiały do druku lub komplet ZIP. Dla ponad 100 slajdów przycisk PDF do druku pobiera ZIP zawierający dwa osobne PDF.
7. W przeglądarce/Androidzie najpierw pobierz aktualny PPTX i zapisz z niego PDF w PowerPoint/LibreOffice, uwzględniając wszystkie slajdy. Wczytaj ten PDF do panelu. Dla okładek pobierz wypełnione PPTX obu orientacji i analogicznie wczytaj ich jednostronicowe PDF. Możesz też wybrać jako źródło okładki pierwszy slajd wczytanego PDF prezentacji.

Testy przeglądarkowe wymagają uruchomionego serwera demonstracyjnego, Chrome i Playwright. `POMAGIER_ADRES` zmienia adres (domyślnie `http://127.0.0.1:5180`), a `POMAGIER_PLAYWRIGHT` pozwala wskazać istniejącą instalację Playwright. Uruchom `npm run test:prezentacje:przegladarka`. Duże PDF w 300 DPI mogą wymagać kilku minut.

## Pliki zadania

W `src/moduly/narzedzia/poprawiacz_prezentacji/`:

- `WidokPoprawiaczaPrezentacji.tsx`, `PanelPrzygotowania.tsx`, `poprawiaczPrezentacji.css`;
- `analiza/analizujPrezentacje.ts`, `analiza/analizujUklad.ts`;
- `operacje/zastosujPoprawki.ts`, `operacje/korygujUklad.ts`, `operacje/mapowanieDanych.ts`, `operacje/okladkiSemper.ts`;
- `pptx/modelPptx.ts`, `pptx/slajdyPptx.ts`, `pptx/geometriaPptx.ts`, `pptx/otworzPptx.ts`, `pptx/wzorcePptx.ts`, `pptx/zmianyPptx.ts`;
- `eksport/planDruku.ts`, `eksport/renderowaniePdf.ts`, `eksport/eksportMaterialow.ts`, `eksport/PanelEksportu.tsx`, `eksport/PodgladWydruku.tsx`.

Pozostałe pliki:

- `src-tauri/src/lib.rs`, `src-tauri/src/konta_desktop.rs`, `src-tauri/src/prezentacje.rs`, `src-tauri/src/renderuj_prezentacje.ps1`;
- `public/szablony/prezentacje/semper-pion.pptx`, `public/szablony/prezentacje/semper-poziom.pptx`;
- `testy/przygotowaniePrezentacji.test.ts`, `testy/prezentacje.przegladarka.test.mjs`, `package.json`;
- `docs/v4/manifest-widokow.json`, `docs/v4/rejestr-widokow.md` — obowiązkowa rejestracja nowych komponentów interfejsu;
- niniejszy raport.

Publikacja na gałęzi `main` obejmuje wyłącznie pliki wdrożenia Poprawiacza. Istniejąca wcześniej zmiana `docs/raport-wydania-v4.0.0.md` nie należy do tego zadania i nie była edytowana w ramach wdrożenia.
