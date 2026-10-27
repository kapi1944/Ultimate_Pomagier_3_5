# Poprawiacz prezentacji — test referencyjny, etap 2

Data: 27 października 2026 r. Baza: `main`, `ae2c525`.

## Wynik

Przetworzono **292/292 slajdy** rzeczywistej prezentacji. Oryginał oraz wzorzec z katalogu `C:/Users/madej/Downloads/` pozostały niezmienione. Wysokość wynikowego PPTX wynosi dokładnie 20,5 cm, szerokość pozostała oryginalna. Zachowano kolejność i natywne, edytowalne obiekty PowerPoint. Wszystkie istniejące media, wykresy i osadzone pliki pozostały identyczne bajtowo.

Wygenerowano pełny PPTX, pełny PDF, dwie edytowalne okładki PPTX, jednostronicowe okładki PDF A4 pionową i poziomą oraz PDF materiałów ze slajdów 2–292. **Materiały mają 146 stron**, po dwa slajdy na stronie A4 poziomej; ostatnia strona zawiera tylko slajd 292. Slajd 2 jest pusty także w źródle i wzorcu, więc został zachowany w wymaganym zakresie.

Wynik jest wizualnie bliski referencji, ale **nie jest certyfikowany jako identyczny ze wzorcem**. Nadal występują drobne różnice odstępów i formatowania, a diagnostyka geometryczna zgłasza możliwe kolizje opisane niżej.

## Audyt i poprawki silnika

Przed zmianami uruchomiono silnik z `ae2c525`, oczyszczanie SEMPER i korektę do wysokości 20,5 cm. Pierwszy przebieg zachował 292 slajdy, usunął 137 dodatkowych numerów i pozostawił widoczne rozbieżności względem wzorca.

Naprawiono **10 klas problemów wizualnych**:

1. Skalowanie wszystkich pozycji w pionie przy zwiększeniu wysokości. Profil SEMPER zachowuje geometrię treści, kotwiczy stopkę do dolnej krawędzi i rozszerza odpowiednie tła wzorca. Eliminuje też przesunięcia kompozycji końcowego slajdu kontaktowego.
2. Białe, puste tła całego slajdu zasłaniające firmowy wzorzec. Usuwanie dotyczy pustych kształtów, z ochroną obiektów używanych przez połączenia i animacje.
3. Obce górne paski w różnych kolorach. Profil rozpoznaje ich geometrię w chronionej strefie istniejącego wzorca SEMPER.
4. Dodatkowa numeracja w prawym górnym oraz dolnym rogu. Usuwanie wymaga numeracji we wzorcu. Białe numery są chronione; białe oznaczenia wewnątrz diagramów poruszają się razem z treścią.
5. Dodatkowe dolne separatory kolidujące z firmową stopką.
6. Nagłówki zapisane jako zwykłe pola tekstowe, bez placeholdera `title`.
7. Separatory pod wielowierszowymi nagłówkami, w tym cienkie prostokąty zamiast linii. Zachowywany jest odstęp od dolnej krawędzi pola nagłówka.
8. Duże panele działowe zasłaniające górny pasek. Panele są ograniczane do bezpiecznej przestrzeni; obrazy nie są rozciągane w jednej osi. Etykiety wraz ze swoim panelem zachowują wzajemne położenie.
9. Błędne uznawanie dużych pól z cytatami za nagłówki, wykryte na slajdach 275 i 280.
10. Nadmierne zmniejszanie tekstu podczas mapowania danych okładki. Pomiar korzysta najpierw z rozmiarów rzeczywistych fragmentów tekstu, zamiast nieużywanych poziomów stylu listy.

Ponadto worker PDF.js jest jawnie pakowany przez Vite jako lokalny zasób. Testy obejmują wielokrotne otwieranie PDF, eksporty i ZIP. W trakcie prób serwer developerski zatrzymał się przy obserwowaniu zapisywanych plików tymczasowych (`EBUSY`); finalne testy przeprowadzono na serwerze pomijającym obserwację `tmp/`, bez zmiany konfiguracji produkcyjnej.

W rzeczywistej prezentacji usunięto **730 zbędnych obiektów**: 275 dodatkowych numerów, 275 obcych górnych pasków, 159 dolnych separatorów i 21 pustych białych teł. Zmieniono geometrię 4267 zachowanych obiektów. Te liczby opisują operacje na obiektach, a nie liczbę niezależnych błędów.

W kopii wynikowej uzupełniono cztery pola zgodnie z referencją: datę i miejscowość, tytuł, prowadzącego na okładce oraz prowadzącego na slajdzie końcowym. Użyto istniejącego mechanizmu zamiany tekstu; silnik korekty nie kopiuje układów ani slajdów z referencji.

## Porównanie wyglądu

W PowerPoint wyrenderowano wszystkie 292 slajdy wersji bazowej, referencyjnej i końcowej, a także obie okładki. Sprawdzono zestawienia porównawcze całej prezentacji oraz zbliżenia przypadków krytycznych: wielowierszowych tytułów, paneli działowych, numeracji, stopek, cytatów i końcowej kompozycji kontaktowej. Dodatkowo obejrzano okładki oraz pierwszą, środkową i ostatnią stronę materiałów wydrukowych. Slajd 280 sprawdzono również bezpośrednio z pełnego PDF, potwierdzając oba wystąpienia tekstu „TEZA”.

Pomocniczy pomiar MAE, czyli średniej bezwzględnej różnicy kanałów RGB dla renderów 1400 px:

| Wersja | Średnia różnica względem referencji |
| --- | ---: |
| Silnik przed poprawkami | 3,503% |
| Silnik po poprawkach | 0,045% |

MAE nie jest procentem zgodności ani samodzielnym warunkiem zaliczenia. Nie wyklucza lokalnych różnic. Największa końcowa różnica wyniosła 0,203% na okładce. Porównanie strukturalne wykazuje 326 różnic geometrii obiektów na 154 slajdach; obejmuje również bardzo małe różnice zaokrągleń. Dokładny wykaz znajduje się w `roznice-geometrii.json`. Pozostają m.in. drobne przesunięcia nagłówków i separatorów oraz różnice formatowania tekstów i podkreślenia adresu na slajdach 1 i 292.

## Pozostające kolizje i ograniczenia

Diagnostyka końcowego PPTX zgłasza **59 możliwych przecięć pól** na slajdach:

`38, 49, 62, 73, 86, 97, 110, 121, 129, 134, 145, 161, 167, 215, 274, 277`.

Wzorzec sprawdzony tym samym analizatorem zgłasza 60 uwag. Wiele przecięć dotyczy pustych fragmentów prostokątnych pól, a nie widocznych liter. Nie usuwałem informacji ani nie przebudowywałem układów w celu wyzerowania licznika. Pełne ostrzeżenia wyniku i referencji zapisano w `kolizje-geometryczne.json`. Nie potwierdzono nowych istotnych kolizji wizualnych w przejrzanych renderach, ale samej tej diagnostyki nie można uznać za dowód ich całkowitego braku.

PowerPoint zgłasza **8 ostrzeżeń pomiaru tekstu**, identycznych z referencją:

- slajdy 161, 215, 274, 277: `Rectangle 6`;
- slajdy 196, 263: `Rectangle 2`;
- slajd 292: `Text Placeholder 4` i `Text Placeholder 3`.

Pozostają do kontroli przy dalszych zmianach treści; w sprawdzonych renderach teksty są czytelne. Silnik nie wykonuje dokładnego składu typograficznego PowerPoint, nie rozwiązuje dowolnej kompozycji oraz złożonych transformacji i nie gwarantuje takiego samego wyniku po zmianie fontów lub aplikacji renderującej. Profil jest kalibrowany dla istniejących wzorców SEMPER przy wysokości 20,5 cm. Nie jest automatyczną konwersją dowolnej prezentacji na nowy branding. Materiały PDF do druku używają istniejącego renderowania w 300 DPI; pełną edytowalność zachowuje PPTX.

## Testy i stan repozytorium

- `npm run test:prezentacje`: **31/31**, w tym 5 nowych testów zachowania.
- `npm test`: kod zakończenia **0**.
- `npm run test:prezentacje:przegladarka`: **2/2**, eksport, podgląd, mapowanie, okładki, ZIP oraz zakresy 1, 10, 99, 100, 101 i 292 slajdów.
- Eksport rzeczywistej prezentacji przez istniejący moduł: pełny PDF **292 strony**, materiały **146 stron**, każda okładka **1 strona**. Liczby stron i rozmiary wszystkich stron A4 dodatkowo sprawdzono niezależnie przez `pypdf`.
- `npm run lint`: kod zakończenia **0**.
- `npm run build`: kod zakończenia **0**; pozostaje standardowe ostrzeżenie o wielkości części pakietu.
- `git diff --check`: bez błędów białych znaków.

Praca pozostała na `main`; nie utworzono gałęzi, commita ani pushu. Istniejąca przed zadaniem zmiana `docs/raport-wydania-v4.0.0.md` została pozostawiona bez edycji.

## Zmienione pliki

W `src/moduly/narzedzia/poprawiacz_prezentacji/`:

- `PanelPrzygotowania.tsx` — przekazanie jawnego profilu, wyłączenie go po ręcznej zmianie wymiarów;
- `analiza/analizujPrezentacje.ts`, `analiza/analizujUklad.ts` — ochrona białej numeracji, rozpoznawanie nagłówków i separatorów, kontrola paneli;
- `operacje/korygujUklad.ts`, nowy `operacje/profilSemper.ts` — integracja profilu z istniejącym zapisem PPTX;
- `pptx/zmianyPptx.ts` — dobór rozmiaru czcionki przy dopasowaniu tekstu;
- `eksport/renderowaniePdf.ts` — lokalny zasób workera PDF.js.

Pozostałe pliki: `testy/przygotowaniePrezentacji.test.ts` i niniejszy raport.

## Pliki wynikowe i odtworzenie próby

Komplet znajduje się w `tmp/etap2-prezentacja/`, poza śledzonym kodem. Zawiera PPTX, PDF, obie okładki, materiały, raport i wyniki kontroli. W ZIP dołączono zestawienia wyglądu wszystkich slajdów. Pełne rendery PNG są w `tmp/proba-prezentacji/wynik/`, referencyjne w `tmp/proba-prezentacji/wzorzec/`.

Skrypty próby pozostawiono w `tmp/proba-prezentacji/`: `uruchom-profil.mjs` uruchamia silnik, `uzupelnij.mjs` uzupełnia cztery pola, `okladki.mjs` generuje okładki, `druk.mjs` wywołuje istniejący eksport drukowany w lokalnej przeglądarce, a `weryfikuj.mjs` i `kontrola-pdf.py` sprawdzają strukturę oraz strony. Renderowanie korzysta z istniejącego `src-tauri/src/renderuj_prezentacje.ps1` na kopiach plików. Skrypty są materiałem diagnostycznym tej próby i zawierają lokalne ścieżki.

SHA-256 oryginału: `070a121a147480a77345b21f1c383338343ddf5f02fa9e78d171472390dd7424`.

SHA-256 referencji: `7bd07cebf2eef8dd4c7ed99a03eb05b98fe90f46601740fbf1df746ca15ca07a`.
