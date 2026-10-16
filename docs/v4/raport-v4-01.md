# Raport V4-01 — 16.10.2026

Gałąź: `feat/ultimate-pomagier-v4`, utworzona z odświeżonego `origin/main` równego lokalnemu `main`: `19a9427010ffe758284f658b2f81efead181533a`. Stan początkowy był czysty. Brak cudzych zmian do przenoszenia lub pomijania.

## Wdrożenie

- Rejestr i maszynowy manifest: 53 wartości rozwiązanego typu `WidokNawigacji`, 81 plików TSX, 116 sygnatur formularzy, zakładek, paneli, dialogów i potwierdzeń; właściciele V4-02–V4-23. Porównanie typu, aktywnej listy, renderowania, menu i konfiguracji adresów jest częścią `npm test`.
- Centralne tokeny rozszerzają istniejące `--ui-*`. Emerald Dark jest domyślny; Soft Grey i Dark Gray są wybierane w dotychczasowych ustawieniach. Zachowano wszystkie poprzednie identyfikatory palet. `DOMYSLNA` jest aliasem Emerald Dark.
- Semantyczne success/warning/error/info/draft mają osobne tła i teksty, niezależne od akcentu marki. Wspólny status zapisu i niezapisane ustawienia korzystają z tych tokenów.
- Komponenty: karta, przycisk, status, pole z etykietą i błędem, zakładki, pusty stan, komunikat i wysuwany panel. Dotychczasowe `AkcjeRekordu` korzystają z tego samego przycisku. Brak nowej zależności UI.
- Galeria jest w Ustawienia → Wygląd → Podgląd na żywo. Pokazuje trzy motywy jednocześnie, interaktywne zakładki i panele. Powierzchnie mają pełne wypełnienia. Pasek zapisu ustawień otrzymał nieprzezroczyste tło.
- Wykorzystano istniejące preferencje gęstości, promieni, czasu przejść i ograniczenia animacji oraz istniejącą obsługę `prefers-reduced-motion`. Gradient tła aplikacji i ogólny fokus są ograniczone do ekranu.

## Zgodność ustawień

Audyt modelu, magazynu, importu/eksportu i audytu magazynów potwierdził jeden magazyn ustawień aplikacji. Zachowano schemat i klucz wersji 1. Istniejąca normalizacja uzupełnia brakujące pola na odczycie, bez przepisywania storage. Testy obejmują każdą starą i nową paletę oraz zachowanie pozostałych preferencji, zapis, ponowny odczyt, import/eksport i uszkodzony JSON. Nie zmieniono modeli biznesowych, parserów, autosave, migracji dokumentów ani rendererów PDF/DOCX i druku.

## Weryfikacja

| Kontrola | Wynik |
| --- | --- |
| `npm test` (wraz z pretest i dwoma nowymi testami V4) | kod 0 |
| `npm run lint` | kod 0 |
| `npm run build` | kod 0 |
| `git diff --check` | kod 0 |
| Kompletność routingu i manifestu | 53 widoki / 81 plików / 116 sygnatur |
| Kontrast tokenów trzech motywów | tekst ≥ 4,5:1; fokus i obramowania ≥ 3:1 |
| Zgodność starych ustawień | odczyt/zapis/import/eksport bez utraty obsługiwanych preferencji |

Kontrola w Chrome na odizolowanym lokalnym originie `127.0.0.1:5174`: logowanie, przejście do ustawień wyglądu, wyświetlenie trzech motywów i rzeczywistych pełnych kolorów paneli/pól, otwarcie panelu Soft Grey, Escape i powrót fokusu do przycisku otwierającego, zmiana zakładki strzałką i wyświetlenie pustego stanu. Obejrzano zrzuty desktopu i wąskiego układu; przy mobilnym nadpisaniu viewportu dokument i karty galerii nie miały poziomego przepełnienia. Po kontroli przywrócono rozmiar przeglądarki. Nie wykonano pełnej wizualnej regresji wszystkich 53 ekranów ani kontroli wydruków.

Pierwszy pełny przebieg wykrył asercję oczekującą dawnego domyślnego motywu. Zmieniono wyłącznie jej oczekiwanie na wymagane `EMERALD_DARK`; końcowy pełny przebieg przeszedł. Build nadal zgłasza ostrzeżenie o dużych paczkach. Historyczne testy oznaczone SKIP pozostają pomijane. Lokalne kolory starych modułów wymagają stopniowego przejścia na tokeny w przypisanych etapach; wynik testu kontrastu tokenów nie oznacza pełnego audytu WCAG całej aplikacji.

## Lista zmienionych plików

- `package.json`
- `docs/v4/manifest-widokow.json`
- `docs/v4/rejestr-widokow.md`
- `docs/v4/raport-v4-01.md`
- `src/main.tsx`
- `src/aplikacja/layout/naglowekAplikacji.css`
- `src/aplikacja/ustawienia/modelUstawienAplikacji.ts`
- `src/aplikacja/ustawienia/WidokUstawien.tsx`
- `src/aplikacja/ustawienia/widokUstawien.css`
- `src/moduly/dokumenty/wspolne/ukladGeneratoraDokumentu.css`
- `src/wspolne/komponenty/AkcjeRekordu.tsx`
- `src/wspolne/komponenty/akcjeRekordu.css`
- `src/wspolne/komponenty/ElementyInterfejsu.tsx`
- `src/wspolne/komponenty/elementyInterfejsu.css`
- `src/wspolne/komponenty/GaleriaKomponentow.tsx`
- `src/wspolne/komponenty/tokeny.css`
- `testy/inwentaryzacjaV4.mjs`
- `testy/v4Rejestr.test.mjs`
- `testy/v4Motywy.test.mjs`
- `testy/pulpit.regresja.test.ts`

Brak blokerów implementacji. SHA i potwierdzenie push są podane w odpowiedzi po wykonaniu zapisu. Nie wykonywano merge, tagowania ani wydania na main.
