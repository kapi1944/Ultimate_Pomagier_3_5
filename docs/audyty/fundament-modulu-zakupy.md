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
