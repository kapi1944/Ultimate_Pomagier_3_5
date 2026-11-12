# Lokalizacje magazynowe — audyt i odbiór

Data: 2026-11-10. Gałąź: `codex/hierarchia-lokalizacji-magazynowych`.

## Ustalenia przed zmianą

- Mapa była już zintegrowana z trasą `/zakupy/magazyn/mapa`, uprawnieniami pracownika wewnętrznego, wspólnym strażnikiem niezapisanych zmian i pełnym backupem.
- Komponenty: `WidokMapyMagazynu` koordynował edycję i zawartość, `PlanMagazynu` realizował przeciąganie i skalowanie, a `EdytorLokalizacji` edytował pojedynczy rekord. `WidokStanowMagazynowych` korzystał ze wspólnej projekcji `StanZakupow`.
- Model zawierał stabilne ID, relację rodzica, kod, typ, aktywność, opis, zdjęcie i geometrię. Wymuszał pięć konkretnych poziomów, globalną unikalność kodów i geometrię każdego rekordu. Brakowało kreatora, drzewa i kolejności.
- Jedynym trwałym zapisem magazynowym był `ultimatePomagier.zakupy.lokalizacje.v1`, koperta `{ wersja: 1, lokalizacje }`. `magazynLokalizacji` obsługiwał odczyt, zapis, walidację, błąd quota i konflikt między oknami. Nie było drugiego aktywnego magazynu lokalizacji magazynowych. Kartoteka miejscowości w `src/kartoteki/lokalizacje` dotyczy innej domeny.
- Produkty, warianty, egzemplarze, stany w wielu lokalizacjach, ruchy i inwentaryzacje były zdefiniowane w `modele/zakupy.ts`. Sumy wyliczał `logika/stanyMagazynowe.ts`. Projekcja zwracała jednak puste kolekcje: nie istniały trwały katalog ani formularze przypisań. Nie można było jedynie podmienić istniejącego selektora.
- Zapotrzebowania nadal należą do magazynu Pulpitu. Nie migrowano ich do magazynu ani nie zmieniono ich zapisu.
- Nie było usuwania lokalizacji: zapis blokował utratę istniejących ID, a dezaktywacja zachowywała referencje. Przeciąganie zmieniało tylko geometrię. Zmiana rodzica w edytorze była ograniczona typami poziomów.
- Przeczytano `docs/audyty/fundament-modulu-zakupy.md` i `docs/audyty/audyt-magazynow-danych.md`. Testy zastane: `mapaMagazynu.test.ts`, `stanyMagazynowe.test.ts`, `zakupy.regresja.test.ts`; wykorzystano również obowiązkowy rejestr interfejsu V4 i istniejący lokalny runner przeglądarkowy.

## Implementacja i model

Adres powstaje z kodów kolejnych przodków, np. `MAG/LEWA/KARTONY/POLKA-3`. Liczba poziomów nie jest ograniczona typem lokalizacji. Kody lokalne są normalizowane do liter A–Z, cyfr i myślników, w tym transliteracji polskich znaków. Unikalność obowiązuje wśród dzieci tego samego rodzica, także dla korzeni.

`LokalizacjaMagazynowa` otrzymała opcjonalne `pelnyKod` i `kolejnosc`. Znormalizowany `LokalizacjaMapy` wymaga tych pól, kodu i typu; geometria jest opcjonalna. `pelnyKod` jest każdorazowo wyliczany, więc zapisany wcześniej adres nie jest źródłem prawdy. Relacje stanów i ruchów nadal wskazują ID.

Kreator tworzy lokalizację z półkami w jednej operacji w pamięci. Dodawanie kolejnych półek wyszukuje wolne numery. Duplikacja nadaje nowe ID całej gałęzi oraz nowy kod jej korzenia; nie kopiuje zapasów ani geometrii. Przeniesienie i zmiana kodu przeliczają adresy potomków, zachowując ID i układ. Zmiana kolejności działa przez pola oraz przyciski wyżej/niżej. Walidacja odrzuca cykle, brak rodzica, powtórzone ID, kolizje kodów i nieprawidłową geometrię przed zastosowaniem operacji.

Drzewo obsługuje rozwijanie, zwijanie, fragmenty nazw i adresów, wybór oraz szybkie dodawanie dzieci. Pokazuje pełny adres, aktywność, brak geometrii, liczbę różnych produktów i liczbę pozycji stanów w gałęzi. Ilości konkretnych produktów są dostępne w szczegółach, bez sumowania różnych jednostek miary.

Dotychczasowa mapa zachowuje przeciąganie i skalowanie; dodano siatkę 5%, przyciąganie, powiększenie 50–200%, przesuwanie strzałkami, podświetlenie wyników i synchronizację z drzewem, również po zmianie rodzica. Plan wyświetla bezpośrednie dzieci wskazanego rodzica. Lokalizację bez geometrii można wybrać w drzewie i umieścić na mapie przełącznikiem.

## Stany produktów i jeden zapis

Rozszerzono istniejącą kopertę i serwis, zachowując dotychczasowy klucz storage. Wersja zapisu `2` zawiera `lokalizacje` i `daneMagazynowe`: istniejące kolekcje produktów, wariantów, egzemplarzy, stanów, ruchów i inwentaryzacji. Nie powstał drugi magazyn ani osobne pole z całkowitą ilością produktu. Wersja `1` typu `StanZakupow` nadal opisuje projekcję domenową; jest niezależna od wersji koperty persistence.

Formularz na mapie pozwala dodać produkt ilościowy do wspólnego katalogu, wybrać lokalizację po pełnym adresie lub fragmencie nazwy/kodu, utworzyć brakującą lokalizację, przyjąć zapas oraz przesunąć istniejący zapas. Obsługuje wybór zapisanych wariantów i egzemplarzy. Zmiana produktu zeruje wybory zależne. Źródło przesunięcia musi zawierać zapas dokładnie tego produktu, wariantu i egzemplarza.

Przyjęcie dopisuje ilość oraz ruch `PRZYJECIE`. Przesunięcie odejmuje ilość od źródła, dodaje ją w celu i dopisuje `PRZESUNIECIE`, zachowując sumę. Nie usuwa zerowych rekordów ani historii. Egzemplarz nie może być jednocześnie w dwóch lokalizacjach. Nie można przyjąć zapasu do nieaktywnej gałęzi. Zapis zabrania usuwania istniejących rekordów, zmiany historycznych ruchów i przepinania zapisanej pozycji do innego produktu lub miejsca.

Lokalizacje, produkty, ilości i ruchy są utrwalane jednym `localStorage.setItem`, dopiero przez „Zapisz konfigurację”. Błąd zapisu zachowuje dotychczasową kopertę i kopię edycyjną. Serwis egzekwuje istniejące uprawnienie pracownika wewnętrznego. Tabela stanów oraz mapa korzystają z tych samych kolekcji. Po zapisie odświeżana jest projekcja; tabela pokazuje pełne adresy.

## Migracja

1. Odczyt v1 sprawdza dotychczasową hierarchię i konflikty kodów przed przejściem do v2. Brakujące kody, typy i geometria otrzymują dokładnie dotychczasowe wartości domyślne. Istniejące ID, rodzice, opis, zdjęcie, aktywność i geometria pozostają zachowane.
2. W pamięci wyliczane są adresy i kolejność. Sam odczyt niczego nie zapisuje.
3. Jawny zapis przełącza tę samą kopertę na v2. Pole `zapisPrzedMigracja` zawiera niezmieniony surowy zapis v1; pozostałe pola koperty również pozostają zachowane. Kopia jest archiwum, nie drugim źródłem danych operacyjnych.
4. Zapis v2 nie zmienia ponownie kopii źródłowej. Ponowny odczyt i zapis nie dodają rekordów. Brakujące lub błędne dane v2, konflikty kodów, cykle, brak rodzica i niepoprawne powiązania blokują nadpisanie zamiast usuwać dane lub zastępować je pustą konfiguracją.
5. Przed zapisem sprawdzana jest zgodność surowej koperty z wersją bazową edycji. Konflikt z drugim oknem zachowuje zmiany użytkownika w pamięci i wymaga świadomego wczytania aktualnego planu.

Pełny backup nadal obejmuje ten sam klucz. Migrację sprawdzono na danych regresyjnych w izolowanej przeglądarce; nie wykonywano migracji rzeczywistych danych profilu użytkownika.

## Weryfikacja

- Testy zakresowe: 43/43 (`hierarchiaMagazynu.test.ts`, `mapaMagazynu.test.ts`, `stanyMagazynowe.test.ts`, `zakupy.regresja.test.ts`), w tym 14 nowych testów domenowych i persistence.
- Przeglądarka: 3/3, lokalny Chrome i serwery Vite. Scenariusze obejmują regał z pięcioma półkami, automatyczne adresy, wyszukiwanie, produkt w dwóch lokalizacjach, przesunięcie 12 + 18 → 7 + 23, przeniesienie regału do innej strefy, zawartość mapy, przeciąganie, skalowanie, siatkę, zoom, restart, konflikt zapisu, błędną edycję, tworzenie brakującej lokalizacji, masowe półki, duplikowanie i kolejność.
- Klawiatura: przesuwanie obiektu strzałką oraz rozwijanie/zwijanie przyciskiem Enter. Kontrola szerokości modułu i mapy: 1920, 1440, 1024, 768 i 390 px. Obejrzano zrzuty komputera i telefonu w `tmp/magazyn/`.
- `npm run lint`: kod wyjścia 0.
- `npm run build`: kod wyjścia 0; pozostaje ostrzeżenie Vite o dużych fragmentach aplikacji.
- `npm test`: pełny przebieg wraz z `pretest` i `test:konta` zakończony kodem wyjścia 0.
- `git diff --check`: kod wyjścia 0.
- Nie zmieniono ani nie osłabiono zastanych asercji. Nowe testy domenowe włączono do `npm test`; przeglądarkowe uruchamia `npm run test:magazyn:przegladarka`.

## Wykaz plików zadania

| Plik | Zakres |
| --- | --- |
| `src/moduly/zakupy/modele/zakupy.ts` | Adres, kolejność, opcjonalna geometria, typ danych magazynowych. |
| `src/moduly/zakupy/logika/mapaMagazynu.ts` | Hierarchia, normalizacja, walidacja, wyszukiwanie, operacje struktur i kolejności. |
| `src/moduly/zakupy/logika/przypisaniaMagazynowe.ts` | Walidacja kolekcji i referencji, przyjęcie oraz przesunięcie zapasu. |
| `src/moduly/zakupy/logika/stanyMagazynowe.ts` | Pełne adresy w istniejącej projekcji stanów. |
| `src/moduly/zakupy/uslugi/magazynLokalizacji.ts` | Migracja v1/v2, jeden atomowy zapis, ochrona istniejących danych. |
| `src/moduly/zakupy/uslugi/stanZakupow.ts` | Odczyt tych samych trwałych kolekcji magazynowych. |
| `src/moduly/zakupy/WidokZakupow.tsx` | Odświeżenie projekcji po zapisie, informacja o błędzie odczytu. |
| `src/moduly/zakupy/magazyn/WidokMapyMagazynu.tsx` | Koordynacja drzewa, kreatora, mapy, przypisań i historii. |
| `src/moduly/zakupy/magazyn/EdytorLokalizacji.tsx` | Edycja pól i rodzica, ochrona niezastosowanych zmian, opcjonalna geometria. |
| `src/moduly/zakupy/magazyn/PlanMagazynu.tsx` | Siatka, zoom, klawiatura, pomijanie elementów bez geometrii. |
| `src/moduly/zakupy/magazyn/DrzewoLokalizacji.tsx` | Hierarchiczna nawigacja i wyszukiwanie. |
| `src/moduly/zakupy/magazyn/KreatorLokalizacji.tsx` | Tworzenie struktury z półkami. |
| `src/moduly/zakupy/magazyn/SelektorLokalizacji.tsx` | Wyszukiwanie i wybór adresu przez ID. |
| `src/moduly/zakupy/magazyn/FormularzPrzypisania.tsx` | Produkt, lokalizacja, ilość i rodzaj operacji. |
| `src/moduly/zakupy/magazyn/mapaMagazynu.css` | Responsywne drzewo, plan i formularze w obecnym systemie wizualnym. |
| `testy/hierarchiaMagazynu.test.ts` | Nowe regresje domenowe, serializacja, migracja i ochrona danych. |
| `testy/hierarchiaMagazynu.przegladarka.test.mjs` | Trzy przepływy akceptacyjne. |
| `package.json` | Włączenie testów i lokalny skrypt przeglądarkowy. |
| `docs/v4/manifest-widokow.json` | Obowiązkowe wpisy komponentów i powierzchni interfejsu. |
| `docs/v4/rejestr-widokow.md` | Synchronizacja rejestru V4. |
| `docs/audyty/lokalizacje-magazynowe-2026-11-10.md` | Ten raport. |

## Ograniczenia i dalsza praca

- Kreator i masowe dodawanie mają limit 500 półek na operację; nie ogranicza to głębokości hierarchii. Duplikaty celowo pozostają bez pozycji, aby nie nakładać nowych obiektów na stary plan.
- Zapisy pozostają lokalne dla urządzenia i originu. Nie dodano serwera ani synchronizacji między urządzeniami. Konflikty między oknami są wykrywane, bez automatycznego scalania.
- Nieprawidłowy stary zapis pozostaje nietknięty i blokuje edycję. Nie dodano osobnego edytora naprawczego ani interfejsu przywracania archiwum migracji. Takie dane wymagają analizy i świadomej korekty lub przywrócenia kopii.
- Formularz pozwala zakładać produkty ilościowe. Pełne CRUD katalogu, zakładanie wariantów i egzemplarzy oraz workflow wydań, korekt i inwentaryzacji pozostają osobnym zakresem. Istniejące warianty, egzemplarze i inwentaryzacje są walidowane oraz zachowywane; selektor obsługuje ich przypisania.
- Edycję tekstowych pól lokalizacji trzeba zastosować przed zapisem konfiguracji. Próba wyjścia lub zapisu wcześniej jest blokowana, zachowując pola.

Status integracji: zmiany lokalne w istniejącym module ZAKUPY, na osobnej gałęzi. Nie wykonano wdrożenia, commita ani pushu. Nie ma nowego SHA. Bazowy HEAD: `00d0d34ed510deeb41b9ac77dba7d2c390d47aac`.

Zastane zmiany Pulpitu i jego testów oraz raport checklist pozostały poza zakresem zadania i nie były modyfikowane.
