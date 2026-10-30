# Opiekun, kontakt klienta i zatwierdzanie danych — 30.10.2026

## Diagnoza

Pusta wartość opiekuna nie miała opisowej opcji początkowej. Ochrona operacji nie pozwalała opiekunowi rozpocząć pustego formularza ani zapisać nowego formularza przypisanego innej osobie. Lista korzystała z istniejącej kartoteki, więc nie było potrzeby tworzenia osób. Zachowano istniejące ID i ograniczenia edycji zapisanych dokumentów.

Parser odczytywał pojedynczą etykietę osoby kontaktowej, bez połączenia jej z telefonem i emailem z kolejnych wierszy. Brakowało etykiety „Dane osoby kontaktowej”. W obecnym modelu te trzy pola znajdują się w `nabywca.osobaKontaktowa`, `nabywca.telefon`, `nabywca.email`; nie istnieje osobny email kontaktu klienta. Odbiorca dokumentów i odbiorca paczki mają własne pola, które pozostają niezależne. Komunikaty nabywcy nadal dotyczą jego obiektu. Uzupełniono centralną walidację formatu emaila, która wcześniej sprawdzała przede wszystkim brak wymaganej wartości.

Znaczniki niepewności były informacyjne. Dodano wspólną operację zatwierdzania i cofania, bez zmiany danych i bez ponownego parsowania maila.

## Zmienione pliki tego etapu

Względem katalogu repozytorium:

- `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts`: jawny opiekun po nazwie/aliasie, kontekst kontaktu, telefon, email, opis wysyłki raportu; usunięcie automatycznego przypisania opiekuna z nadawcy i podpisu.
- `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/analizaTresciMaila.ts`: rozpoznanie podzielonych etykiet kontaktu i opiekuna.
- `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/mapowanieImportuMaila.ts`: ochrona zatwierdzonych wartości i ostrzeżenie przy zmienionym źródle.
- `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/zatwierdzaniePol.ts`: wspólna operacja i trwałe klucze zatwierdzeń według ID grupy.
- `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PolaSzczegolow.tsx`: przycisk, klikalny znacznik, cofnięcie i etykiety opcji selecta.
- `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KartaGrupySzkoleniowej.tsx`: wykorzystanie tego samego znacznika w polach grupy.
- `src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts`: stan, autosave, zapis i odtworzenie metadanych, aktualizacja walidacji i liczników.
- `src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts`, `stale.ts`: status „Zatwierdzone” i jego prezentacja.
- `src/moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow.ts`: uprawniona praca nad nowym formularzem z wyborem opiekuna.
- `src/moduly/zamkniete/szczegoly_organizacyjne/logikaDanychOdbiorcy.ts`: centralne błędy formatu emaila dla właściwych obiektów.
- `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx`, `widokNowychSzczegolowOrganizacyjnych.css`: zamknięta lista czterech osób, kontekst operacji i kompaktowe kontrolki.
- `testy/parserMailaSzczegolow.regresja.test.ts`, `testy/importMailaSzczegolow.przegladarka.test.mjs`: rozszerzenie regresji oraz aktualizacja dawnego oczekiwania przypisywania opiekuna z nadawcy, sprzecznego z nowym poleceniem.

## Faktyczne wyniki

| Pole | Oczekiwany wynik | Faktyczny wynik |
| --- | --- | --- |
| Osoba kontaktowa | Ryszard Przybył | Ryszard Przybył |
| Nr telefonu | 42 663 41 86 | 42 663 41 86 |
| Email | rprzybyl@wfosigw.lodz.pl | rprzybyl@wfosigw.lodz.pl |
| Opiekun | Cztery osoby | Kasia RB, Iza, Kamila, Dawid; każda wybrana w Chrome |
| Zatwierdzanie | Jedno kliknięcie | Działa przez znacznik i „✓ Zatwierdź”, z cofnięciem |

„Raport na adres” trafia do istniejącego swobodnego opisu sposobu wysyłki jako `E-mail: adres`. Nie zmienia adresu osoby kontaktowej ani odbiorcy paczki. Model nie ma osobnego pola odbiorcy raportu.

## Trwałość i zgodność danych

Zatwierdzenia są częścią istniejącego `statusyPol`, zapisywanego razem z konkretną kopią formularza. Pola grup używają dodatkowych kluczy `zatwierdzenia.<ID grupy>.<pole>`; indeksowe ścieżki widoku są odtwarzane z aktualnej kolejności grup. Starsze kopie bez tych metadanych pozostają obsługiwane. Nie zmieniono kluczy magazynu ani nie dodano oddzielnego storage.

Ponowny import identycznej wartości zachowuje zatwierdzenie. Inna propozycja źródłowa powoduje ostrzeżenie i zachowanie poprzedniej wartości. Ręczna edycja usuwa jej zatwierdzenie i nadaje status ręczny. Cofnięcie przywraca niepewność bez usuwania wartości. Zatwierdzenie nie usuwa błędów właściwej walidacji.

## Testy

- Parser i metadane: **167/167**, w tym cztery jawne nazwy opiekunów, pięć etykiet kontaktu, pięć formatów telefonu, rozdzielenie ról, zapis/odczyt, zmiana kolejności grup, cofnięcie i konflikt zmienionego źródła.
- Chrome: **2/2** scenariusze integracyjne; wszystkie cztery wybory, kontakt, obie akcje zatwierdzania, niezależność dat, ponowny import, zapis i ponowne otwarcie kopii z Kamilą oraz zatwierdzoną datą. Dodatkowo potwierdzono zachowanie błędów emaila i ujemnej liczby uczestników po zatwierdzeniu.
- Pełne `npm test`, wraz z pretest i końcowymi testami kont: **kod 0**.
- `npm run lint`: **kod 0**.
- `npm run build`: **kod 0**; komunikaty Vite o rozmiarze chunków i mieszanym imporcie Tauri pozostają ostrzeżeniami.
- `git diff --check`: **kod 0**.

Weryfikacja interakcji odbyła się w lokalnym Chrome. Nie wykonano testów na fizycznym Androidzie ani Raspberry Pi; kontrolki są semantycznymi przyciskami i nie wymagają hovera ani podwójnego kliknięcia.

## Repozytorium

Katalog: `C:\Users\madej\Documents\____GitHub_Projects\___Projekty_GitHub\Ultimate_Pomagier_4_aktualny`. Gałąź `main`, HEAD `1454685287ba440eef9eb83d1d5597cfcd117e24`. Origin zachowuje historyczny adres `https://github.com/kapi1944/Ultimate_Pomagier_3_5.git`.

Zmiany są lokalne, bez commita, pushu i wydania. Zachowano zastane zmiany, w tym poprzedni etap importu oraz pliki Programów szkoleń. Podczas pracy pojawił się również nieśledzony `testy/publikacjaBezUmowy.przegladarka.test.mjs`; nie był modyfikowany w tym zadaniu.
