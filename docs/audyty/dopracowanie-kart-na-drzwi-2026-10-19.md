# Karty na drzwi - dopracowanie i kontrola wymagań

## Zakres i stan bazowy

Gałąź: `feat/ultimate-pomagier-v4`. Przy wznowieniu zadania zastano czysty working tree oraz commit `f820f80` (`save`) zawierający dotychczasową implementację. Kontynuacja nie zmienia historii tego commita.

Potwierdzono istniejący przepływ: model Karty na drzwi, wspólny renderer i edytor bloków, zapis do wspólnego rejestru oraz dotychczasowy szkic, jedna reprezentacja karty dla podglądu, PDF i druku. Odczytano audyt zapisu z 2026-10-09. Nie dodano nowego magazynu ani migracji istniejących mechanizmów zapisu.

## Implementacja

- Tytuł zawija się zgodnie z rzeczywistą szerokością bloku, również dla słów bez spacji. Pełna treść pozostaje w DOM; brak skalowania transformacją, wielokropka i ukrywania nadmiaru tytułu.
- Szerokość 40-100% liczona jest względem obszaru treści po odjęciu marginesów. Nowe szablony zaczynają od 80%. Rozmiar 14-48 pt korzysta z istniejącego `rozmiarCzcionkiPt` i jest współdzielony z właściwościami zaznaczonego bloku. Nie powstały równoległe ustawienia szerokości ani fontu.
- Auto-fit mierzy kopię tego samego renderera w fizycznych wymiarach karty. Przeglądarka wyznacza zawijanie, wysokość bloku i zasięg tekstu przez `Range`. Pomiar uwzględnia font, interlinię, padding, granice strony oraz sąsiednie widoczne bloki na pierwszej stronie. Rozmiar maleje o 0,5 pt, do 14 pt; dla istniejącego ręcznie ustawionego rozmiaru poniżej 14 pt nie jest zwiększany. Pętla ma limit 128 zmniejszeń, również dla skrajnych zapisanych wartości. Ponowny pomiar po załadowaniu fontów jest wykonywany tylko podczas ich ładowania. Pomiar nie zapisuje dopasowanego rozmiaru do modelu ani nie wywołuje kolejnych renderów Reacta.
- Przepełnienie daje widoczne ostrzeżenie i pozostawia pełną treść do ręcznej korekty. Element ostrzeżenia nie uczestniczy w siatce eksportu.
- Organizator jest ostatnim polem formularza. Jego nowa pozycja wynika z wysokości strony pomniejszonej o wysokość bloku i bezpieczny dolny margines. Nie zależy od wysokości tytułu. Zapisana ręczna pozycja jest zachowana. Poprawiono domyślne rozmieszczenie końcowych bloków, aby nie zachodziły na organizatora.
- Lokalne ustawienia układu karty zawierają istniejące bloki i przełącznik auto-fit. Duplikowanie kopiuje je niezależnie, zapis szablonu utrwala ustawienia wybranej karty. Zmiana widoczności nie zaokrągla ręcznej geometrii. Skalowanie geometrii następuje przy jawnej zmianie formatu lub orientacji.
- Jednostki pt/mm są przeliczane względem rzeczywistej szerokości karty, również w A5/A6, bez podwójnego skalowania. Opcjonalne style we wspólnym rendererze nie zmieniają domyślnego renderowania innych generatorów.

## Pokrycie wymaganych regresji

| Wymaganie | Kontrola |
| --- | --- |
| A-G: krótki tytuł, 100/200/350 znaków, długi wyraz, polskie i specjalne znaki | Przeglądarka: zachowana treść, dopasowanie, zawijanie i stabilna stopka |
| H: szerokość 100% do 40% | Przeglądarka: zmiana geometrii i wysokości tekstu, wyśrodkowanie, stały rozmiar strony |
| I: rozmiar czcionki | Suwak i edycja zaznaczonego bloku korzystają z tej samej wartości |
| J: auto-fit ON/OFF | Rozmiar zadany i dopasowany, ostrzeżenie o przepełnieniu |
| K: zapis i ponowne otwarcie | Reload oraz wejście z rejestru po usunięciu samego szkicu w izolowanym kontekście |
| L: duplikowanie | Kopia układu, niezależność zmian obu kart, osobne identyfikatory |
| M: własny szablon | Zapis i ponowny wybór szerokości, ręcznej pozycji organizatora oraz wyłączonego auto-fit |
| N-O: wydruk jednej karty i zestawu | Rzeczywisty renderer druku Chromium, odpowiednio 1 i 2 strony A4 |
| P: PDF | Rzeczywiste pobranie PDF jednej karty, zestawu oraz arkusza z dwiema kartami A5; kontrola liczby stron i wymiarów |
| Q: oryginalny układ | Przywrócenie bazowego szablonu i reset całego układu |
| R: ręczne pozycje | Zachowanie po zmianie tytułu, zapisie, odczycie starszego dokumentu i zapisie szablonu |

Dodatkowo: skalowanie podglądu zachowuje rozmiar w punktach i liczbę wierszy; pionowy wariant nowoczesny z 350 znakami; geometria stopki obu wariantów dla A4/A5/A6 i obu orientacji; zabezpieczenie pętli pomiaru dla bardzo dużej wartości fontu.

## Wykonana weryfikacja

- Test zakresowy: `node --import ./testy/rejestrujLoaderTs.mjs testy/kartaNaDrzwiSwobodneBloki.test.ts`.
- Test przeglądarkowy: `node --test testy/kartyNaDrzwi.przegladarka.test.mjs`. Wymaga działającego lokalnego Vite, Playwright i Chrome. `POMAGIER_PLAYWRIGHT` wskazuje istniejącą instalację, `POMAGIER_ADRES` adres serwera. Nie instalowano zależności.
- `npm test` wraz z `pretest`, `npm run lint`, `npm run build` oraz `git diff --check`.
- Wizualnie obejrzano podgląd oraz obrazy wyrenderowane Popplerem z eksportowanego PDF i PDF wygenerowanego przez renderer druku Chromium. Długi tytuł zachował pięć wierszy oraz tę samą treść; organizator pozostał ostatnim tekstem, nad bezpiecznym dolnym marginesem. Eksport pojedynczej karty ma jedną stronę, zestawu dwie, arkusza A5 jedną stronę A4.

## Pliki objęte całością zadania

1. `src/moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi.ts`
2. `src/moduly/dokumenty/generatory/karta_na_drzwi/RendererKartyNaDrzwi.tsx`
3. `src/moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi.tsx`
4. `src/moduly/dokumenty/generatory/karta_na_drzwi/widokKartNaDrzwi.css`
5. `src/wspolne/dokumenty/RendererSwobodnychBlokow.tsx`
6. `testy/kartaNaDrzwiSwobodneBloki.test.ts`
7. `testy/kartyNaDrzwi.przegladarka.test.mjs`
8. Ten raport.

## Ograniczenia

- Gdy pełna treść nie mieści się przy minimalnym rozmiarze, użytkownik musi poprawić układ zgodnie z ostrzeżeniem. Wyłączenie auto-fit zachowuje zadany font, także gdy powoduje przepełnienie.
- Sprawdzono Chrome/Chromium, bez fizycznego wydruku na drukarce. Sterownik drukarki powinien używać skali 100% i prawidłowego formatu papieru.
- Build zgłasza istniejące ostrzeżenie Vite o dużych paczkach; nie dodano zależności ani zmian w dzieleniu paczek.
- Nowa pozycja organizatora i szerokość 80% dotyczą nowych/przywróconych szablonów. Starsze ręczne układy zachowują własną geometrię.
