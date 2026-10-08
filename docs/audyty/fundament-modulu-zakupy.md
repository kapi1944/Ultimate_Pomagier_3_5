# Fundament modułu ZAKUPY

## Potwierdzone mechanizmy

- Nawigacja: `WidokNawigacji` i History API w `UkladAplikacji`; trasy zakupów uczestniczą w wejściu bezpośrednim, zmianie widoku oraz powrocie przeglądarki.
- Menu: istniejące drzewo, preferencje użytkownika, rozwijanie aktywnej ścieżki i responsywny layout. Sekcja ZAKUPY znajduje się między NARZĘDZIAMI a KARTOTEKAMI.
- Widoki wykorzystują istniejące zmienne designu `--ui-*`, semantyczne przyciski i widoczny fokus. Bez nowych zależności.
- Persistence jest lokalne i modułowe. Audyt magazynów dokumentowych nie daje podstaw do użycia rejestru dokumentów jako magazynu produktów.
- Istniejące zapotrzebowania to `ZapotrzebowanieZakupowe` w `ultimatePomagier.pulpit.v1`, odczytywane i normalizowane przez `magazynPulpitu`.

## Granica tego etapu

`pobierzStanZakupow` tworzy projekcję do odczytu z istniejącego magazynu Pulpitu. Zachowuje ID, status, autora, datę, ilość i uwagi. Nie zapisuje danych, nie migruje i nie tworzy drugiego źródła zapotrzebowań. Edycja pozostaje w Pulpicie. Pozostałe kolekcje są puste; nie są jeszcze trwałym magazynem. Wersja schematu opisuje przygotowany model, a nie wykonaną migrację.

Katalog produktów jest wspólny dla zakupów i magazynu. Wariant, oferta, pozycja zamówienia, stan i ruch odwołują się do niego przez ID. Produkt rozdziela rodzaj (materiał/sprzęt) od sposobu ewidencji (ilościowy/egzemplarzowy). Egzemplarz ma osobną stabilną tożsamość, bez kopiowania produktu. Zapotrzebowanie może mieć pozycję bez wybranego produktu — istniejące zgłoszenia tekstowe nie stają się automatycznie produktami katalogowymi.

Kwoty snapshotu są liczbami w najmniejszych jednostkach waluty; ilości są liczbami, a daty tekstem w formacie ISO. Snapshot ceny jest historyczną wartością przypisaną do pozycji zamówienia. Przesyłki wskazują pozycje zamówienia i mogą obejmować częściowe dostawy. Pozycje listy zakupowej mogą wskazywać wiele pozycji zapotrzebowań.

## Granica kolejnego etapu

Przed dodaniem zapisu należy wybrać docelowy magazyn domeny i przeprowadzić jawną, testowaną migrację zgłoszeń z Pulpitu, przełączając jednocześnie jego odczyt i zapis. Nie wolno rozszerzyć dwóch równoległych magazynów. Trzeba wtedy dodać normalizację i walidację referencji (w tym przynależności wariantu do produktu), ilości, kwot i reguł ewidencji, obsługę błędów zapisu, uprawnienia oraz zgodność backupu. Ten etap nie implementuje operacji zakupowych ani magazynowych.

## Stan magazynowy — widok odczytu

Magazyn ma podsekcję „Stan magazynowy” pod adresem `/zakupy/magazyn/stan-magazynowy`; dotychczasowy adres `/zakupy/magazyn` nadal działa. Widok korzysta z `StanZakupow`. Nie dodaje persistence, danych demonstracyjnych, edycji ilości ani niezależnego stanu całkowitego. Dopóki katalog jest pusty, pokazuje komunikat pustej tabeli.

Sumy produktu obejmują wszystkie jego lokalizacje i warianty; osobne wiersze wariantów są częściami tej sumy i nie należy sumować ich ponownie z wierszem produktu. Akcja „Lokalizacje” pokazuje składniki sumy. Minimum i cel są opcjonalnymi polami produktu oraz wariantu. Próg produktu dotyczy jego sumy, a próg wariantu wyłącznie wariantu; wariant nie dziedziczy celu całego produktu. Brak pól w starszym rekordzie oznacza nieustawione progi i nie wymaga migracji.

Miarka ma 10 segmentów. Dodatni zapas wypełnia `ceil(stan/cel*10)` segmentów (minimum 1, maksimum 10); zero nie wypełnia żadnego. Kolor wszystkich aktywnych segmentów zależy od ich liczby: 1–3 czerwony, 4–6 pomarańczowy, 7–10 zielony. Procent nie jest ograniczany do 100. Nieustawiony, zerowy lub nieprawidłowy cel daje neutralne „brak celu”. Tooltip zawiera stan, cel, procent i minimum; jest dostępny po najechaniu i z klawiatury, z zamknięciem przez Escape.

Filtr „do zamówienia” oznacza stan zerowy lub poniżej ustawionego minimum; „niski stan” — 1–6 aktywnych segmentów; „stan prawidłowy” — 7–10. „Brak” oznacza zero. „Do przeliczenia” oznacza brak zamkniętego przeliczenia którejś kombinacji lokalizacji, wariantu i egzemplarza albo trwającą inwentaryzację z pozycją produktu. Wiersz bez stanów i bez przeliczeń też wymaga przeliczenia. Ostatnia inwentaryzacja to najnowsza data zamknięcia z wypełnioną ilością stwierdzoną; data pojedynczej lokalizacji nie oznacza kompletnego przeliczenia całego produktu.

## Mapa magazynu — zapis konfiguracji lokalizacji

`/zakupy/magazyn/mapa` udostępnia prosty plan 2D. Pokazuje bezpośrednie dzieci wybranej lokalizacji; ścieżka i przycisk otwarcia planu pozwalają zejść od obiektu przez strefę, regał i półkę do opcjonalnej pozycji. Współrzędne i wymiary są procentami planu rodzica. Elementy można przeciągać i skalować, a także edytować liczbowo z klawiatury. Nakładanie jest dozwolone; geometria musi mieścić się w granicach 0–100%, z minimalnym rozmiarem 5%.

Pierwszy trwały magazyn lokalizacji to `ultimatePomagier.zakupy.lokalizacje.v1`, format `{ wersja: 1, lokalizacje }`. Zarówno mapa, jak i `pobierzStanZakupow` odczytują go przez jeden serwis `magazynLokalizacji`. Dotychczasowe puste lokalizacje w projekcji ZAKUPÓW nie są drugim magazynem. Nie migrujemy zapotrzebowań Pulpitu ani nie zapisujemy produktów lub ilości. Pełny backup `WSZYSTKO` obejmuje nowy klucz przez istniejące odkrywanie kluczy originu.

Zachowane są stabilne ID oraz dotychczasowe pole `nadrzednaLokalizacjaId` (odpowiednik parentId). Nowe pola modelu lokalizacji są opcjonalne dla zgodności z dotychczasowymi rekordami; odczyt normalizuje brak kodu, typu i geometrii w pamięci bez zapisu. Kod musi być unikalny, typ odpowiadać poziomowi rodzica, a hierarchia nie może zawierać cykli. Lokalizacji nie usuwa się — można ją dezaktywować, zachowując referencje stanów i ruchów. Zdjęcia PNG/JPEG/WebP do 512 KB są opcjonalnymi lokalnymi danymi obrazu; nie są analizowane ani wysyłane na zewnątrz.

Edycja i serwis zapisu korzystają z istniejącej reguły aktywnego pracownika wewnętrznego przez wspólne uprawnienia. Nieprawidłowy JSON, nieznana wersja, błąd dostępu i zmiana konfiguracji w innym oknie blokują nadpisanie. Błąd quota zachowuje poprzedni zapis oraz edytowaną kopię. Istniejący strażnik niezapisanych zmian obsługuje mapę; opcjonalny wynik `false` z zapisu zatrzymuje nawigację i wylogowanie. Dotychczasowe callbacki zwracające `void` zachowują działanie. Odczyt nie tworzy automatycznie konfiguracji ani przykładowych lokalizacji.

Wyszukiwarka „Gdzie to leży?” korzysta z istniejących stanów, pokazuje wszystkie dodatnie lokalizacje produktu oraz ich sumę i podświetla także ich przodków. Pozostałe miejsca przygasza. Kliknięcie wyniku otwiera odpowiedni plan. Zawartość zaznaczonej strefy obejmuje jej potomków bez powielania ilości. Sygnalizacja wyczerpania i inwentaryzacji dotyczy lokalnych stanów; niski zapas korzysta z progów produktu/wariantu i ich globalnego zapasu, ponieważ model nie ma progów na pojedynczą lokalizację. Nie porównuje części zapasu z celem całego produktu.

Katalog, ilości i inwentaryzacje nadal pozostają fundamentem bez trwałego zapisu i CRUD. Po ich podłączeniu wyszukiwarka oraz zawartość mapy wykorzystają ten sam `StanZakupow`; ten etap zapisuje wyłącznie konfigurację lokalizacji.
