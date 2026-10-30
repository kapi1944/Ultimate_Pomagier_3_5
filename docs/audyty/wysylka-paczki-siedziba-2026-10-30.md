# Import wysyłki paczki i powiązanie z siedzibą — 30.10.2026

## A. Diagnoza

Istniejący parser wyodrębniał wysyłkę, ale odczytywał tylko pierwszy wiersz nazwy odbiorcy. Wymagał kodu w postaci `NN-NNN`, nie rozróżniał dopisku na etykietę od kontaktu i traktował „MATERIAŁY SZKOLENIOWE:” w bloku paczki jako początek sekcji dokumentów. W rezultacie dalsze dane kontaktowe wypadały z kontekstu wysyłki. Brakowało części nagłówków dostawy.

Formularz ma osobne pola ulicy, numeru budynku, lokalu, kodu, miasta, kraju i kontaktu. Nie miał pola dopisku ani przełącznika powiązania adresu. Zachowano dotychczasowy model adresowy, kartoteki, zapis kopii i mechanizm zatwierdzania niepewnych pól.

## B. Zmienione pliki tego etapu

Ścieżki względem repozytorium:

| Plik | Zmiana |
| --- | --- |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts` | Kontekst paczki i etykiety, pełna nazwa, kody, kontakt, priorytety adresów, statusy i automatyczne rozpoznanie siedziby. Rozpoznanie drukowania przez klienta z użyciem skrótu jego nazwy. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/analizaTresciMaila.ts` | Normalizacja nagłówków wysyłki podzielonych na wiersze. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/logikaWysylkiPaczki.ts` | Porównanie pełnych adresów, ustalenie odbiorcy, synchronizacja, odłączenie ręcznej korekty i walidacja. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts`, `danePoczatkowe.ts` | Opcjonalny dopisek, opcjonalny stan przełącznika i domyślne wyłączenie. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts` | Synchronizacja w centralnej aktualizacji danych/importu, ochrona ręcznej korekty, domyślne wartości starych rekordów, checklista i walidacja aktywnej wysyłki. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx` | Istniejący toggle switch przy adresie i pole informacji na etykietę wewnątrz sekcji Wysyłka. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/eksportSzczegolow.ts` | Adres, stan powiązania i etykieta w istniejącym podsumowaniu tekstowym. |
| `testy/fixtures/mailWysylkaSiedziba.txt` | Reprezentatywna wiadomość z siedzibą, wysyłką, instrukcjami materiałowymi i odrębnym hotelem. |
| `testy/parserMailaSzczegolow.regresja.test.ts` | Regresja nagłówków, kodów, formatowania, synchronizacji, niezależności kontaktu i braków. |
| `testy/importMailaSzczegolow.przegladarka.test.mjs` | Rzeczywisty import, ręczny telefon, toggle, aktualizacja siedziby, zapis i ponowne otwarcie. |

## C. Faktyczny import

| Pole wysyłki | Oczekiwana wartość | Faktyczna wartość | Status |
| --- | --- | --- | --- |
| Instytucja | Wojewódzki Fundusz Ochrony Środowiska i Gospodarki Wodnej w Łodzi | Wojewódzki Fundusz Ochrony Środowiska i Gospodarki Wodnej w Łodzi | Zaimportowane |
| Ulica i numer | ul. Dubois 118 | `ulica: Dubois`, `nrBudynku: 118` | Zaimportowane |
| Kod | 93-465 | 93-465 | Zaimportowane |
| Miasto | Łódź | Łódź | Zaimportowane |
| Kontakt | Ryszard Przybył | Ryszard Przybył | Zaimportowane |
| Telefon | 42 663 41 86 | 42 663 41 86 | Zaimportowane |
| Email | rprzybyl@wfosigw.lodz.pl | rprzybyl@wfosigw.lodz.pl | Zaimportowane |
| Etykieta | MATERIAŁY SZKOLENIOWE | MATERIAŁY SZKOLENIOWE | Zaimportowane |
| Na siedzibę odbiorcy | WŁ. | WŁ. przy jednoznacznej zgodności danych | Zaimportowane |

Prefiks `ul.` nie jest przechowywany w nazwie ulicy, zgodnie z istniejącym modelem. Nazwa instytucji zachowuje oba wiersze; adres hotelu nie trafia do paczki.

## D. Przełącznik i zapis

- Włączenie kopiuje wyłącznie dane adresowe siedziby rzeczywistego odbiorcy. Kontakt, telefon, email i etykieta pozostają zachowane.
- Gdy odbiorca dokumentów jest nabywcą, wykorzystywane są jego dane. Przy braku osobnego odbiorcy nabywca jest źródłem wyłącznie po jednoznacznym dopasowaniu nazwy odbiorcy paczki.
- Wyłączenie zachowuje widoczne wartości i umożliwia niezależną edycję. Ręczna korekta adresu sama odłącza powiązanie, co jest opisane przy przełączniku; stan ten podlega ochronie przed ponownym importem.
- Zmiana siedziby aktualizuje adres pochodny. Brak kompletnej siedziby zachowuje aktualne dane, pokazuje błąd i blokuje uznanie wysyłki za kompletną.
- Automatyczne włączenie wymaga zgodności nazwy, ulicy, numeru budynku/lokalu, kodu, miasta i kraju oraz braku konfliktu adresów. Sama miejscowość nie wystarcza.
- Oba nowe pola są częścią istniejących danych kopii i autosave. Starsze rekordy bez przełącznika odczytywane są z wartością wyłączoną, a brak dopisku jako pusty tekst. Nie zmieniono kluczy storage.
- Materiały online, certyfikaty online, lista drukowana przez klienta i drukowane dodatki/ankiety pozostają w istniejących dyspozycjach materiałowych. Reguły checklist paczek i kompletowania nie zostały przebudowane.

## E. Weryfikacja

- Parser i logika: **212/212**. W tym dziesięć nagłówków × cztery zapisy kodu, Markdown, HTML Outlooka, NBSP/tabulatory, podzielone nagłówki, zachowanie kontaktu, odłączenie adresu i walidacja brakującego kodu.
- Lokalne Chrome: **3/3** scenariusze integracyjne. Nowy scenariusz używa symulacji dotyku oraz skali 85%, przełącza przez dotyk i klawiaturę, chroni ręcznie poprawiony telefon przy reimporcie, synchronizuje siedzibę i otwiera zapisaną kopię z zachowanym przełącznikiem.
- Pełny `npm test`, łącznie z pretest i testami kont: **kod 0**.
- `npm run lint`, `npm run build`, `git diff --check`: **kod 0**. Build zgłasza istniejące ostrzeżenia o dużych chunkach i mieszanym imporcie Tauri.
- Nie wykonano testów na fizycznych urządzeniach Android ani Raspberry Pi. Toggle wykorzystuje dotychczasowy semantyczny przycisk `role="switch"`; nie aktywuje pola tekstowego przy przełączaniu.

## F. Git

Katalog: `C:\Users\madej\Documents\____GitHub_Projects\___Projekty_GitHub\Ultimate_Pomagier_4_aktualny`. Gałąź `main`, HEAD `1454685287ba440eef9eb83d1d5597cfcd117e24`. Origin: `https://github.com/kapi1944/Ultimate_Pomagier_3_5.git` — zastana historyczna nazwa repozytorium zdalnego.

Zmiany pozostały lokalne, bez commita, pushu i publikacji. Zachowano wszystkie zastane zmiany poprzednich etapów oraz niepowiązane pliki Programów szkoleń i `testy/publikacjaBezUmowy.przegladarka.test.mjs`.
