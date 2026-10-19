# V4-05 — Szkolenia i synchronizacja planu

Gałąź: `feat/ultimate-pomagier-v4`. Baza: `31dc4e7e2dd8956a7ce5830c46d9b002cb358407`. Przed zmianami HEAD i odświeżony origin wskazywały tę samą bazę; drzewo robocze było czyste. Nie utworzono gałęzi ani worktree. Raport należy do pojedynczego commita V4-05; jego SHA podano po zapisie w odpowiedzi końcowej, bez samoodwołania w treści commita.

## Potwierdzenie V4-01–04

Historia, kod i raporty potwierdzają wykonanie:

| Etap | Commit | Zakres |
| --- | --- | --- |
| V4-01 | `26f5484029764709525eca8074b36954136e05a5` | Fundament wizualny, tokeny i rejestr |
| V4-02 | `f9563e6203ecd1bb6990bafa05760e80a2f91a90` | Powłoka, menu, nagłówek, dock, dialogi |
| V4-03 | `6f65c804697f301b5f7cef80d00ca9512b88e0dc` | Logowanie |
| V4-04 | `31dc4e7e2dd8956a7ce5830c46d9b002cb358407` | Pulpit, oś czasu i formularze |

## Oba widoki

**Szkolenia zamknięte — lifting ukończony.** Nagłówek, ikony z istniejącego zestawu, opis pracy, trzy pełne karty operacji i pomocniczy komunikat korzystają z komponentów V4. Przejścia otwierają istniejącą listę szczegółów, formularz i kopie robocze. Nie dodano modeli szkoleń, rekordów przykładowych ani liczników. Przycisk formularza nie sugeruje automatycznego wyczyszczenia istniejącej pracy.

Audyt przeglądarkowy ujawnił, że nadrzędna pozycja menu szkoleń zamkniętych rozwijała wyłącznie podmenu. Lokalny warunek w MenuBoczne otwiera teraz również istniejący widok; podmenu pozostaje rozwijalne, a na telefonie menu zamyka się po wyborze. Callback nadal prowadzi do centralnego `ustawWidok`, tak samo jak dock i operacje nowego ekranu. Nie zmieniono guarda.

**Szkolenia otwarte — lifting ukończony, funkcjonalność nadal informacyjna.** Osobna ikonografia i opis oferty otwartej, status informacyjny, karty oraz pusty stan jasno wskazują, że rejestr i zapisy nie są dostępne. Nie dodano pozornych operacji ani CRM.

Wspólny lokalny arkusz dotyczy wyłącznie `.szkolenia-v4`. Używa istniejących tokenów, nieprzezroczystych powierzchni, obramowań oraz stanów najechania i fokusu wspólnych przycisków. Modeli, storage, uprawnień, formularza szczegółów i rendererów dokumentów nie zmieniano.

## Synchronizacja planu

Manifest w wersji 2 zawiera jeden zatwierdzony plan V4-01–23. Właściciele kodu V4-02–04 pozostali zachowani. Historia wykonania fundamentu V4-01 jest osobną metadaną; przyszły właściciel wspólnego pliku nie oznacza, że wcześniejsze prace w tym pliku nie zostały wykonane.

- Zachowano **53 ID widoków, 82 pliki TSX i 122 sygnatury powierzchni**. Liczbę 122 przeliczono z aktualnego manifestu bazowego V4-04; historyczne 115 z raportu V4-02 nie opisuje już tej bazy.
- Porównanie z bazowym JSON potwierdziło identyczne sygnatury, adresy i flagi menu; żaden ID ani zinwentaryzowany plik nie zniknął.
- `widoki[].zadanie` wskazuje właściciela widoku, `pliki[].zadanie` właściciela kodu, `wspoldzieloneZ` inne etapy korzystające ze wspólnego pliku, a `ukonczoneEtapy` rzeczywiste wykonanie. `realizacjaEtapow` przechowuje statusy i dowody wykonania. Tabele rejestru odpowiadają tym polom i są kontrolowane testem.
- Lista/kopie szczegółów: V4-06. Formularz i alias `generator-szczegolow`: V4-07. Centrum dokumentów oraz wszystkie rejestry, kopie i kosze generatorów: V4-08. Wspólny workspace i mechaniki generatorów: V4-09. Generatory: V4-10–15. Dalsze zakresy odpowiadają zatwierdzonej mapie.
- V4-09 nie potrzebuje nowego ID, a V4-23 obejmuje audyt wszystkich widoków i powierzchni bez przejmowania ich właścicieli. Test kompletności uwzględnia te zakresy przekrojowe zamiast wymuszać sztuczny ekran audytu.
- V4-06–23 pozostają przyszłymi zadaniami. Nie rozpoczęto V4-06.

## Weryfikacja

Końcowe `npm test`, `npm run lint`, `npm run build` i `git diff --check` zakończyły się kodem 0. Pełny zestaw obejmuje zachowane regresje V4-01–04, storage, formularzy, dokumentów i uprawnień. Nowy test renderuje oba rzeczywiste komponenty przez React; sprawdza nagłówki, wspólne komponenty, semantykę przycisków, centralne podłączenie nawigacji i uczciwy stan informacyjny. Test manifestu nadal sprawdza typ nawigacji, listę aktywnych widoków, renderowanie, trasy, menu, wszystkie TSX i dokładne powierzchnie; dodatkowo sprawdza całą zatwierdzoną numerację, przypisania widoków, alias, statusy i zgodność tabel dokumentacji.

Chrome, izolowany lokalny origin `127.0.0.1:5176`:

| Zakres | Wynik |
| --- | --- |
| Oba widoki × Emerald Dark / Soft Grey / Dark Gray × 1440 / 800 / 320 px CSS | 18 kombinacji: bez poziomego przepełnienia dokumentu i main |
| Nagłówki i przyciski | Nagłówki mieszczą się bez ucięcia; przyciski mieszczą się w kartach, zawijają tekst i nie kolidują |
| Powierzchnie i tekst | Pełne tła paneli: Emerald `rgb(9,31,25)`, Soft Grey `rgb(212,217,214)`, Dark Gray `rgb(35,40,43)`; odpowiednie tokeny tekstów |
| Powłoka | Rail na desktopie/tablecie, mobilne menu, nagłówek i widoczny dock współpracują z widokami; main mieści się między nagłówkiem a dockiem |
| Klawiatura | Enter otwiera listę i formularz, Space kopie; Tab przechodzi do kolejnego przycisku i przewija go do widocznego obszaru nad dockiem |
| Menu przy 320 px | Enter na pozycji szkoleń zamkniętych otwiera ekran i zamyka menu |
| Guard | Niezapisany profil blokuje przejście dockiem do otwartych oraz menu do zamkniętych; Escape zachowuje wpisany pseudonim; edycję testową anulowano |
| Istniejące przepływy | Lista i kopie pokazują rzeczywiste stany puste; formularz szczegółów otwiera istniejące sekcje i walidację; po powrocie dostępna jest propozycja przywrócenia autosave |

Pomiary dotyczą rzeczywistych szerokości `window.innerWidth`; uwzględniono przeliczenie skali przeglądarki. Motywy sprawdzono przez tymczasowy atrybut palety i style obliczone; odczyt/zapis ustawień pokrywa istniejący test motywów. Po kontroli przeładowanie przywróciło Emerald Dark, a tymczasowe nadpisania rozmiaru usunięto.

## Ograniczenia i uwagi

`Page.captureScreenshot` nadal kończy się timeoutem. Wykonano alternatywną kontrolę interakcji, DOM, geometrii i stylów obliczonych; **nie jest to pełna kontrola wizualna**. Build zachowuje ostrzeżenie o dużych paczkach, a testy PDF dotychczasowe ostrzeżenia fontów.

Formularz szczegółów ma własne autosave i propozycję przywrócenia; obecnie nie rejestruje centralnego guarda dokumentów. Jest to istniejąca odrębność przepływu, pozostawiona do oceny w V4-07, bez rozszerzania zakresu obecnego zadania. Nowe przejścia nie omijają centralnej nawigacji.

Brak blokerów implementacji. Nie wykonywano merge do main ani zmian produkcyjnych integracji.

## Zmienione pliki

- `docs/v4/manifest-widokow.json`
- `docs/v4/rejestr-widokow.md`
- `docs/v4/raport-v4-05.md`
- `package.json`
- `src/aplikacja/layout/UkladAplikacji.tsx`
- `src/aplikacja/menu/MenuBoczne.tsx`
- `src/moduly/otwarte/WidokSzkolenOtwartych.tsx`
- `src/moduly/zamkniete/szkolenia/WidokSzkolenZamknietych.tsx`
- `src/moduly/szkoleniaV4.css`
- `testy/v4Rejestr.test.mjs`
- `testy/v4Szkolenia.test.mjs`
