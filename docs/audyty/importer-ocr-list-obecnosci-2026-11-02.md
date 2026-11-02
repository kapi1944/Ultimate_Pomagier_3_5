# Importer OCR list obecności — wdrożenie i weryfikacja

Data: 02.11.2026. Praca wyłącznie na `main`, bez publikacji i bez pushu.

## Stan repozytorium

Ukończony importer maili do Dyplomów jest zachowany w osobnym lokalnym commicie `b93ea23`. Zmiany OCR nie zostały do niego dołączone i pozostają niecommitowane. Zachowano także równoległe zmiany Pulpitu, harmonogramu i Ustawień; nie są częścią implementacji OCR.

## Zakres wdrożenia

- Przycisk „Importuj listę ze skanu (OCR)” w formularzu uczestników List obecności, również otwieranych z dokumentu, oraz w sekcji uczestników grupy szkolenia.
- PDF, PNG, JPG/JPEG, WebP, wybór zdjęcia, wklejanie obrazu ze schowka i drag & drop. Wklejenie nie uruchamia analizy automatycznie.
- Cyfrowy PDF odczytywany przez istniejący PDF.js; strony bez rozpoznanej warstwy tabeli przechodzą przez renderowanie i OCR. Obsługa kolejnych stron bez równoległego ładowania wszystkich kanw.
- Lokalny Tesseract.js 7.0.0, modele polskiego i angielskiego w wersji `best_int`, bez CDN podczas przetwarzania. Worker, warianty WASM i modele są dołączane przez plugin Vite zarówno do serwera deweloperskiego, jak i do builda. Zasoby OCR w buildzie zajmują około 17,4 MB.
- Przygotowanie obrazu w osobnym Web Workerze: ograniczenie rozdzielczości, obrót, skala szarości i rozciągnięcie kontrastu według histogramu; opcjonalny wariant binarny. Rozpoznawanie Tesseract również działa poza głównym wątkiem.
- Wykrywanie siatki przez projekcje linii obrazu. Dla cyfrowych i bezramkowych tabel odtwarzanie wierszy i kolumn z geometrii tekstu oraz nagłówków. Zmienna kolejność pól rozpoznawana po znaczeniu nazw kolumn.
- Oryginał i wynik w dwóch panelach z istniejącym regulowanym separatorem; na małym ekranie układ pionowy. Powiększanie podglądu, wybór strony i obrót przed analizą. Kliknięcie komórki pokazuje jej obszar źródłowy, gdy geometria jest dostępna.
- Widoki Tekst i Tabela, edycja komórek i nagłówków, dodawanie i usuwanie wierszy. Niepełny odczyt nie tworzy fikcyjnych osób; dostępne jest ręczne utworzenie tabeli do korekty.
- Oznaczenia pewności, niezależne potwierdzenie wierszy i zatwierdzenie zastosowania. Ponowne przetwarzanie wymaga zgody na zastąpienie wyniku. Błąd lub anulowanie pozostawia poprzedni wynik.
- Kopiowanie tabeli, wybranych wierszy lub zatwierdzonej listy osób, eksport CSV i XLSX. CSV jest zabezpieczony przed interpretacją formuł, XLSX zapisuje komórki jako tekst.
- PDF i druk pozostają w istniejącym generatorze List obecności po przeniesieniu zatwierdzonych osób. Nie dodano drugiego silnika PDF ani eksportera DOCX — w repozytorium nie znaleziono działającego eksportera DOCX tabeli tego typu.
- Import dopisuje osoby przez istniejące formularze. Zachowuje dotychczasowe ID i dane, pomija identyczne nazwy, pokazuje potencjalne duplikaty. Grupa przyjmuje imię i nazwisko; jej model nie ma pola zespołu. Zespół pozostaje w tabeli OCR i może trafić do pola Firma w Listach obecności.
- Ręczny zapis i odtworzenie wyniku roboczego w istniejącym rejestrze autosave, osobno dla użytkownika i kontekstu formularza. Skany nie są utrwalane. Przywrócony wynik zachowuje weryfikację komórek; podgląd źródła wymaga ponownego wybrania pliku.
- Dotychczasowa zaślepka `ocr.ts` została podłączona do rzeczywistej wspólnej usługi. Wspólny importer obrazów otrzymuje tekst i prawidłową informację o wykonanym OCR.

## Podpisy i bezpieczeństwo danych

Najpierw analizowany jest nagłówek tabeli; rozpoznane kolumny podpisów są maskowane przed OCR danych. Dla nierozpoznanej siatki lub położenia podpisów importer wymaga wskazania i potwierdzenia obszaru na oryginale. Ręczny obszar obejmuje prawą część strony; w tabeli z liniami granica jest rozszerzana do początku komórki. Wartość 100% oznacza brak podpisów i wymaga świadomego potwierdzenia w tym trybie.

Grafika w komórce podpisu jest oceniana wyłącznie jako brak grafiki, ślad niejednoznaczny albo grafika wymagająca obejrzenia. Nie jest transkrybowana ani używana do identyfikacji osoby czy ustalania obecności. Kolumny podpisów nie mogą zostać zastosowane jako dane osób.

Dokumenty nie są przesyłane do zewnętrznych API. Nie dodano logowania treści, nazwisk ani skanów. Test przeglądarkowy blokuje zewnętrzne żądania i potwierdza, że OCR pobiera wyłącznie zasoby lokalnego serwera.

## Wykorzystanie SEMPER i dobór technologii

Odczytano projekt `Referencje_SEMPER_2_0/semper_referencje_ocr_mv3_v0.3.16`, zwłaszcza `page/page-bridge.js`. Wykorzystano jego podejście: jeden worker dla kolejnych rozpoznań, języki polski/angielski, skalowanie i kontrast z percentyli histogramu oraz ręczna weryfikacja. Nie zmodyfikowano żadnego pliku projektu SEMPER. Zależność od CDN zastąpiono zasobami dołączanymi do Pomagiera; skala obrazu jest limitowana dla ograniczenia pamięci.

Tesseract.js pasuje do obecnego frontendu, działa w workerze i pozwala wskazać lokalne ścieżki modeli. PDF jest przygotowywany osobno przez PDF.js. Zobacz [dokumentację lokalnego uruchomienia](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md) oraz [API Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/api.md).

PaddleOCR oferuje odrębne mechanizmy analizy układu i tabel, ale jego standardowa instalacja wymaga dodatkowego środowiska PaddlePaddle/Python. Dla aplikacji działającej również w przeglądarce Androida i na Raspberry Pi wybór Tesseract.js ogranicza dodatkowe wymagania środowiskowe. Jest to decyzja implementacyjna dla tego repozytorium, a nie porównanie jakości modeli. Źródło: [oficjalny quick start PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/quick_start.en.md).

## Weryfikacja

- Testy jednostkowe `tabeleOcr.test.ts`: 5/5 — 22 wiersze, sześć kolumn, dwa dni, polskie znaki i nazwisko dwuczłonowe, źródła komórek, weryfikacja, duplikaty i ID, kopia robocza, CSV/XLSX oraz grafika podpisów.
- Testy przeglądarkowe OCR: sześć scenariuszy — rzeczywisty silnik z PNG, clipboard i drag & drop, edycja i kopiowanie, XLSX, import do generatora i grupy, cyfrowy PDF z dwiema stronami bez uruchamiania OCR, dwustronicowy skan PDF, obrócony JPEG, pusty WebP, uszkodzony plik, anulowanie i przywrócenie wyników, syntetyczna kursywa z obniżoną pewnością.
- Łączny przebieg OCR i istniejących importerów maili: 12/12 scenariuszy Chrome.
- Dodatkowo sprawdzono wspólny importer obrazu po zastąpieniu zaślepki rzeczywistym OCR oraz kopiowanie tabeli i pojedynczego zaznaczonego wiersza.
- Pełne `npm test`, `npm run lint`, `npm run build`: kod 0. Sprawdzono `git diff --check` i rejestr powierzchni UI.
- Inspekcja zrzutów i test przepełnienia przy 390 px; testy desktopowe przy 1440 px. Nie uruchamiano aplikacji na fizycznym Androidzie ani Raspberry Pi.
- `npm audit` zgłosił 12 pozycji moderate w istniejącym łańcuchu ESLint/minimatch; raport nie wskazuje nowych pakietów OCR. Nie wykonywano aktualizacji poza zakresem zadania ani `audit fix --force`.
- Build zachowuje ostrzeżenia o rozmiarze chunków i mieszanym imporcie Tauri.

## Ograniczenia

1. Tesseract jest przede wszystkim silnikiem tekstu drukowanego. Importuje także obrazy odręcznych list, ale nie zapewnia pewnej transkrypcji pisma odręcznego. Tryb odręczny ogranicza pewność do 60% i wymaga weryfikacji. Test kursywy jest syntetyczny; nie stanowi walidacji na rzeczywistych rękopisach. Wysokiej jakości automatyczne HTR pozostaje niewdrożone. [FAQ Tesseract](https://github.com/tesseract-ocr/tessdoc/blob/main/FAQ.md) potwierdza to ograniczenie silnika.
2. Nietypowe, scalone, pochylone lub bezramkowe tabele mogą wymagać poprawienia nagłówków i ręcznego uzupełnienia wierszy. Nie wdrożono pełnego modelu uczenia maszynowego struktury tabel ani automatycznego prostowania perspektywy fotografii.
3. Gdy nie rozpoznano nagłówków podpisów, użytkownik musi obejrzeć oryginał i potwierdzić prawy obszar maskowania. Przy podpisach w innym układzie należy przygotować odpowiedni kadr zamiast potwierdzać niezgodną granicę. Nie należy traktować estymacji grafiki jako potwierdzenia złożenia podpisu.
4. Limity ochrony pamięci: 40 MB na plik, 40 megapikseli na obraz i 30 stron PDF; obrazy przetwarzane do maksymalnego boku 2600 px. Większe dokumenty wymagają podziału.
5. Identyczna znormalizowana nazwa jest pomijana przy dopisywaniu. Różne osoby o tym samym imieniu i nazwisku wymagają rozstrzygnięcia poza automatycznym dodawaniem. Nie dodano oddzielnej kartoteki uczestników.
6. Pełna geometria, źródła i stany weryfikacji pozostają dostępne w trybie tabeli. Przepisanie całej tabeli w widoku tekstowym usuwa geometrię i wymaga ponownej weryfikacji wierszy.
7. Eksport bezpośredni: CSV/XLSX/tekst. PDF przez istniejący generator. DOCX tabeli OCR pozostaje niewdrożony.

## Pliki zadania

- `src/wspolne/ocr/ImporterListyOcr.tsx`, `importerListyOcr.css` — wspólny interfejs i weryfikacja.
- `src/wspolne/ocr/importDokumentuOcr.ts`, `przetwarzanieObrazu.worker.ts`, `ocr.ts` — wspólne przetwarzanie dokumentów i silnik.
- `src/wspolne/ocr/modelTabeliOcr.ts`, `eksportTabeliOcr.ts` — model przejściowy, mapowanie osób i eksport.
- `src/moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci.tsx` — podłączenie do List obecności.
- `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PoleUczestnikowGrupy.tsx` — podłączenie do źródłowej grupy.
- `src/wspolne/import/importujPlikDoDokumentu.ts` — metadane rzeczywistego OCR i ochrona adresu źródła przy błędzie.
- `skrypty/zasobyOcr.mjs`, `skrypty/zasobyOcr.d.mts`, `vite.config.ts` — pakowanie zasobów offline.
- `package.json`, `package-lock.json` — przypięte zależności i dołączenie testów OCR, z zachowaniem pozostałych zmian.
- `testy/tabeleOcr.test.ts`, `testy/importListyOcr.przegladarka.test.mjs` — testy i syntetyczne dokumenty tworzone w pamięci.
- `docs/v4/manifest-widokow.json`, `docs/v4/rejestr-widokow.md` — rejestr wspólnego dialogu.
- Ten raport — audyt, wyniki i ograniczenia.
