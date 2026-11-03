# Wdrożenie trzech trybów prezentacji — 03.11.2026

Sekcje A–E dokumentują stan wdrożenia przed integracją. Aktualne ustalenia integracyjne znajdują się w sekcji F.

## A. Implementacja

Praca dotyczy istniejącego modułu `src/moduly/narzedzia/poprawiacz_prezentacji/`. Na początku HEAD wynosił `9464790264acdc1e249c343d735a22b0901e23ca`, working tree był czysty, bez różnic względem audytu. Przy wznowieniu HEAD wynosił `efb11e8a85c793e0e9a4f5fc3554dc5378bbbaba` (`save`), zawierający implementację. Źródła utworzenia tego commita nie ustalono; Codex nie wykonywał commita ani pushu.

Wdrożono:

- Tryby Roboczy, Pełnoekranowy i Porównawczy na wspólnym modelu, bez ponownego importowania pliku przy przełączaniu.
- Osobny oryginał, wersję roboczą, wspólny numer slajdu, zaznaczenie, zoom/przesunięcie, rewizję i aktualność renderu w `stanPoprawiacza.ts`.
- Historię transakcji zapisującą zmienione części ZIP przed/po, undo/redo oraz jeden ręczny punkt kontrolny. Limit 30 transakcji i 32 MiB; pojedyncza większa transakcja jest zachowywana. Archiwum nie jest kopiowane przy każdym ruchu wskaźnika.
- Tożsamość obiektu opartą na stabilnej ścieżce części slajdu, cNvPr i identyfikatorach grup nadrzędnych. Nie korzysta ona z indeksu `klucz`, podobieństwa tekstu ani położenia. Brakujące i powielone ID dają wynik niejednoznaczny.
- Wspólny podgląd strukturalny/interakcyjny i podgląd PDF. Oryginał i poprawki w porównaniu korzystają z tej samej metody: oba PDF albo oba strukturalnie. Przy różnych rozmiarach slajdów zachowane są wspólne proporcje jednostek EMU i wyrównanie początku układu.
- Cache maksymalnie sześciu obrazów stron, zależny od rewizji, źródła PDF i numeru slajdu. Anulowanie nieaktualnego renderowania PDF.js, odrzucanie starych wyników i zwalnianie dokumentów/obrazów.
- Jeden współdzielony PDF aktualnego modelu dla podglądu oraz istniejącego eksportu i podglądu wydruku.
- Fullscreen API z układem zastępczym wewnątrz aplikacji, dopasowanie, zoom 50–400% i presety 100/150/200/400%, przesuwanie, strzałki, Home/End/Escape i numer slajdu. Bez zmiany systemowej skali aplikacji.
- Porównanie obok siebie, nakładkę przezroczystości i odsłanianie oryginału. Wspólny zoom/przesunięcie, osobną widoczność podświetleń stron.
- Różnice tekstu, geometrii, jawnej czcionki/formatowania/koloru, kolejności warstw, dodanych/usuniętych obiektów oraz obrazów (w tym SHA-256 zawartości mediów). Tolerancja geometrii: 2 EMU.
- Pomocnicze porównanie pikseli na żądanie, z tolerancją 24/255 i sąsiedztwem jednego piksela. Wynik nie jest traktowany jako dowód błędu konkretnego obiektu.
- Wysuwany panel zmian: filtr typu, wartości przed/po, położenie, wybór elementu, status oceny i przywracanie pojedynczego obiektu. Przywracanie uczestniczy w historii; zmienione relacje blokują niebezpieczne odtworzenie.
- Kolory czerwony/żółty/niebieski/zielony, dowolny HEX/RGB i zapis preferencji według użytkownika. Kolor podświetlenia jest wyłącznie warstwą UI.
- Roboczy układ miniatury/edytor/właściwości z regulacją szerokości, wyborem pojedynczym/wielokrotnym (także przełącznikiem dla dotyku), przesuwaniem, uchwytem rozmiaru, geometrią w cm, tekstem, czcionką, rozmiarem i kolorem tekstu, wyrównaniem, odstępem po akapicie, warstwami, rozkładaniem poziomym, siatką/prowadnicami oraz istniejącą kontrolą kolizji.
- Edycję tekstu po istniejących fragmentach `a:t`, bez rekonstruowania akapitów: zachowane są style fragmentów, pogrubienia, kursywa, numeracja, hiperłącza i pozostałe węzły. Jawne zastosowanie formatowania do zaznaczonych pól jest intencjonalną operacją użytkownika.
- Inspekcję obiektów nieedytowalnych i elementów wzorca; uzupełnienie manifestu oraz rejestru V4 bez nowych tras.

## B. Testy i dowody

- `npm run test:prezentacje`: **53/53**, w tym **22 nowe testy** względem 31 istniejących.
- Testy przeglądarkowe: **5 różnych scenariuszy zaliczonych** w pełnym przebiegu i przebiegach zakresowych; **3 scenariusze nowe**. Pełny wcześniejszy przebieg 4/4 obejmował rzeczywiste generowanie PDF dla 1, 10, 99, 100, 101 i 292 slajdów. Dodatkowy scenariusz sprawdza oba podglądy PDF, zmianę źródła cache, piksele i unieważnianie renderu po edycji. Końcowe rozszerzenie dotyku sprawdza także wybór wielu elementów.
- Dla 292 slajdów uzyskano osobną okładkę oraz 146 stron materiałów. Długi test PDF trwał około 499 s; nie należy dodawać go bezwarunkowo do szybkich przebiegów UI.
- `npm test`: zaliczony, kod wyjścia 0. Skrypt obejmuje różne style testów i powtarzane zestawy; liczba powyżej dotyczy modułu prezentacji, a nie sumy unikalnych asercji całej aplikacji.
- `npm run lint`, `npm run build`, `git diff --check`: zaliczone. Build zgłasza ostrzeżenia o dużym pakiecie i mieszanym imporcie modułów Tauri; nie zmieniano konfiguracji bundlowania.
- Chromium: trzy tryby, klawiatura, pełny ekran, mysz, emulowany dotyk i przeciąganie, kolor podświetleń, szerokość 390 px oraz skala 75%/85%. Po 24 przełączeniach z załadowanymi PDF przyrost sterty po GC wyniósł w dwóch przebiegach około 280–312 KiB (limit testu 32 MiB).
- Windows/PowerPoint: rzeczywisty render oryginalnego szablonu SEMPER oraz zmodyfikowanej kopii, przez istniejący `src-tauri/src/renderuj_prezentacje.ps1`. PowerPoint zaakceptował PPTX po zmianie tekstu z polskimi znakami. PNG slajdów 2 i 3 pozostały identyczne bajtowo. Na slajdzie 3 renderer zgłosił dwa ostrzeżenia o możliwym przepełnieniu istniejących pól; tego slajdu nie edytowano.
- Obejrzano zrzuty pełnego ekranu, porównania PDF, edytora oraz natywny render zmodyfikowanego slajdu. To kontrola wybranych przypadków, nie pełna walidacja wyglądu wszystkich typów PPTX i motywów.
- Nie wykonano testów na fizycznym Androidzie, Linux/LibreOffice ani pełnego UI Tauri z natywnym zoomem WebView. Dotyk był emulowany w Chromium.

Przejściowe problemy środowiska: brak Playwright w projekcie (użyto biblioteki dostarczonej z runtime), izolacja lokalnej sieci i COM (testy wymagały odpowiednich uprawnień), zatrzymanie watchera Vite podczas blokowania PNG przez PowerPoint oraz przerwanie kontroli uprawnień przez limit usługi. Powtórzenia po usunięciu przyczyn wykonano. Test wyboru wielu elementów dotykiem sprawdzono przed syntetycznym gestem CDP, ponieważ w odwrotnej kolejności test nie generował kolejnego kliknięcia.

CI: istniejący workflow uruchamia `npm test`, więc nowe testy modelu są włączone. Nie dodano zależności ani nowego joba publikacyjnego. Testy przeglądarkowe wymagają uruchomionego demo, Chrome i Playwright; dedykowany job UI można dodać osobno, rozdzielając szybkie scenariusze i długi test PDF.

## C. Ograniczenia

- Bezpieczna edycja geometrii obejmuje główne nieobrócone kształty, linie i obrazy. Grupy i ich dzieci, tabele, wykresy, SmartArt, obiekty obrócone oraz wzorce pozostają do odczytu. Nie są rasteryzowane w PPTX.
- Nie jest to pełny edytor WYSIWYG ani edytor zaznaczeń znakowych w stylu PowerPoint. Tekst edytuje się we fragmentach i zatwierdza przyciskiem; właściwości formatowania stosuje się do zaznaczonych pól.
- Podgląd strukturalny jest uproszczony. Wierny podgląd wymaga PDF; po edycji trzeba go odświeżyć na żądanie. Cache stron ma szerokość 1600 px, co ogranicza ostrość przy dużym zoomie.
- Ręczny PDF weryfikowany jest liczbą stron, bez dowodu zgodności treści/kolejności. Ostrzeżenie jest widoczne w UI. Oba PDF do porównania powinny pochodzić z tego samego renderera.
- Różnice dotyczą przede wszystkim obiektów slajdów. Pełna klasyfikacja zmian dziedziczonych z motywu/wzorca, animacji i wszystkich rozszerzeń OOXML wymaga dalszej pracy. Niepewnych dopasowań nie należy traktować jako potwierdzonych zmian.
- Przywrócenie slajdu dotyczy jego drzewa obiektów; rozmiar prezentacji jest wspólny i pozostaje aktualny. Nie zaimplementowano zamiany zawartości obrazów ani rekonstrukcji zmienionych relacji/mediów per obiekt.
- Po zatwierdzeniu operacji istniejący zapis ZIP i parser ponownie otwierają prezentację. Nie odbywa się to podczas każdego ruchu wskaźnika, lecz bardzo duże pliki mogą powodować zauważalną przerwę po operacji.
- Historia i punkt kontrolny działają w bieżącej sesji; nie dodano trwałego autosave PPTX. W przypadku jednej transakcji większej niż 32 MiB limit pamięci historii może zostać przekroczony o jej rozmiar.

## D. Bezpieczeństwo i repozytorium

Oryginalny plik pozostaje niezmieniony. Edycja korzysta z kopii dokumentu XML i istniejącego zapisu PPTX. Testy sprawdzają zachowanie nieedytowanych części, obrazów, relacji, wzorców i nieznanych danych. Profile druku, szablony, okładki, mapowanie SEMPER, kontrola kolizji, PDF i ZIP pozostają na istniejących mechanizmach. Nie narzucono globalnie Book Antiqua.

Nie zmieniono kont, updatera ani konfiguracji publikacji. Nie instalowano nowych zależności. Codex nie wykonywał commita, pushu ani publikacji. Implementacja została zastana po wznowieniu w commicie `efb11e8`; końcowe rozszerzenie testu dotyku, lokalna poprawka deklaracji obramowania podglądu (usunięcie konfliktu border/borderColor) i niniejszy raport pozostają zmianami roboczymi.

## E. Dalsze prace

1. Testy sprzętowe Tauri/Android oraz LibreOffice i szerszy zestaw rzeczywistych plików z grupami, tabelami, wykresami i SmartArt.
2. Bezpieczne operacje lokalne w grupach i edycja typów złożonych, po osobnej analizie transformacji i relacji.
3. Porównywanie stylów dziedziczonych oraz render w wyższej rozdzielczości zależnej od zoomu.
4. Profilowanie dużych archiwów i skrócenie czasu zatwierdzania transakcji bez kopiowania parsera i eksportera.
5. Dedykowany CI UI z oddzielnym, rzadszym testem druku dużych prezentacji.

## Lista plików implementacji i weryfikacji

- `docs/v4/manifest-widokow.json`
- `docs/v4/rejestr-widokow.md`
- `package.json`
- `src/moduly/narzedzia/poprawiacz_prezentacji/PanelPrzygotowania.tsx`
- `src/moduly/narzedzia/poprawiacz_prezentacji/PodgladSlajdu.tsx`
- `src/moduly/narzedzia/poprawiacz_prezentacji/PodgladStrukturalny.tsx`
- `src/moduly/narzedzia/poprawiacz_prezentacji/TrybyPrezentacji.tsx`
- `src/moduly/narzedzia/poprawiacz_prezentacji/WidokPoprawiaczaPrezentacji.tsx`
- `src/moduly/narzedzia/poprawiacz_prezentacji/WlasciwosciObiektu.tsx`
- `src/moduly/narzedzia/poprawiacz_prezentacji/eksport/PanelEksportu.tsx`
- `src/moduly/narzedzia/poprawiacz_prezentacji/eksport/renderowaniePdf.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/modele/preferencjePodgladu.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/modele/stanPoprawiacza.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/operacje/edycjaPrezentacji.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/operacje/historiaPrezentacji.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/operacje/porownaniePikseli.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/operacje/porownaniePrezentacji.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/poprawiaczPrezentacji.css`
- `src/moduly/narzedzia/poprawiacz_prezentacji/pptx/modelPptx.ts`
- `src/moduly/narzedzia/poprawiacz_prezentacji/pptx/otworzPptx.ts`
- `testy/prezentacje.przegladarka.test.mjs`
- `testy/trybyPrezentacji.test.ts`
- `docs/audyty/wdrozenie-trybow-prezentacji-2026-11-03.md`

## F. Zabezpieczenie i integracja wdrożenia

Stan wejściowy: branch main, HEAD efb11e8a85c793e0e9a4f5fc3554dc5378bbbaba. Aktualny origin/main pobrany z GitHub wskazywał ten sam commit; brak commitów do scalenia w obu kierunkach. Porównano zakres od 9464790264acdc1e249c343d735a22b0901e23ca bez ponawiania pełnego audytu. Commit efb11e8 zawiera 22 pliki wdrożenia wymienione wyżej (raport jest dodatkowym, 23. plikiem).

Zmiany pozostałe do zatwierdzenia obejmują wyłącznie:

- src/moduly/narzedzia/poprawiacz_prezentacji/PodgladStrukturalny.tsx — usunięcie konfliktu deklaracji border/borderColor, bez zmian modelu PPTX.
- testy/prezentacje.przegladarka.test.mjs — kontrola ostrzeżenia Reacta i wielokrotnego zaznaczania dotykiem.
- docs/audyty/wdrozenie-trybow-prezentacji-2026-11-03.md — utrwalenie raportu oraz niniejszej weryfikacji.

Nie stwierdzono niezwiązanych zmian roboczych. Główne wdrożenie jest już w historii; commit integracyjny domyka powyższe trzy pliki bez przepisywania wcześniejszego commita.

Ocena pushu:

- Przejrzano wszystkie cztery pliki .github/workflows oraz bezpośrednią ścieżkę budowania instalatora.
- Push na main uruchamia CI oraz Instalator Windows: niepodpisany instalator testowy, bez endpointów aktualizacji, przechowywany jako artefakt Actions. Nie jest to publikacja aplikacji.
- Dystrybucja i przygotowanie szkicu wymagają workflow_dispatch; publikacja produkcyjna dodatkowo zatwierdzenia, tagu vX.Y.Z i środowiska wydania-produkcyjne. Nie uruchamiano tych workflow.
- Brak aktywnych lokalnych hooków pre-commit/pre-push, niestandardowego core.hooksPath i konfiguracji push.followTags. Nie zmieniono workflow, wersji ani tagów. Zwykły push samej gałęzi main jest dopuszczalny po zakończeniu kontroli.
- Dla bazowego efb11e8 potwierdzono na GitHub sukces CI (run 41659861335) i Instalatora Windows (run 41659861476). Wynik pushu oraz aktualne statusy przebiegów dla nowego SHA są raportowane w odpowiedzi końcowej.

Kontrole integracyjne:

- npm run test:prezentacje: 53/53, w tym historia/undo/redo, niezmienność oryginału, ponowny import eksportu, zachowanie nieedytowanych części i prezentacje do 292 slajdów.
- npm test: kod wyjścia 0, pełne kontrole regresyjne pozostałych modułów.
- npm run test:desktop: 16/16; npm run test:dystrybucja: 15/15.
- npm run lint i npm run build: kod wyjścia 0. Ostrzeżenia builda o rozmiarze pakietu i mieszanym imporcie Tauri pozostają opisane w sekcji B.
- git diff --check oraz kontrola dokładnego zakresu zmian: bez błędów. Do stage przeznaczono wyłącznie trzy wskazane pliki; staged diff jest dodatkowo sprawdzany bezpośrednio przed commitem.
- npm run test:prezentacje:przegladarka: 5/5 w jednym pełnym przebiegu, kod wyjścia 0. Rzeczywiste PDF dla 1, 10, 99, 100, 101 i 292 slajdów; dla 292 uzyskano okładkę i 146 stron materiałów. Przeszły historia, porównanie, eksport, klawiatura, dotyk i skala 75%/85%. Przyrost pamięci po 24 przełączeniach: 280 KiB. Cały przebieg trwał około 416 s.

Ograniczenia sekcji C pozostają aktualne, w szczególności odczyt obiektów złożonych, ręczne potwierdzenie zgodności PDF i brak testów sprzętowych Android/Linux/WebView. W tym etapie nie rozszerzano edycji ani architektury. Poprzednie natywne renderowanie PowerPointa pozostaje dowodem z etapu wdrożenia; nie powtarzano go dla poprawki obramowania UI.
