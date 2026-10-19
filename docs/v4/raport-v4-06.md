# V4-06 — lista i kopie robocze Szczegółów organizacyjnych

Gałąź: `feat/ultimate-pomagier-v4`. Baza: `fc457ba122b2cd76fb6ba8e0aa4671a995518971` — ukończony V4-05. Początkowe drzewo robocze było czyste, a odświeżony origin zgodny z HEAD. Test manifestu potwierdził zatwierdzony plan 23 etapów. Nie tworzono gałęzi ani worktree.

Raport należy do jednego commita V4-06; SHA podano w odpowiedzi po jego utworzeniu, bez samoodwołania w treści commita.

## Audyt i granice zmian

Przeanalizowano oba widoki, arkusz formularza, magazyn wersji roboczych, workflow statusów, model użytkowników i jego uprawnienia, AkcjeRekordu oraz komponenty V4. Uwzględniono audyt magazynów w `docs/audyty/audyt-magazynow-danych.md`; aktualny kod obu rejestrów czyta Szczegóły organizacyjne ze wspólnego rejestru dokumentów.

Nie zmieniono magazynu, workflow, modeli, reguł uprawnień, serializacji ani odzyskiwania. Pełny formularz oraz `widokNowychSzczegolowOrganizacyjnych.css` pozostały bez zmian. Rejestry używają nowego lokalnego arkusza, bez dziedziczenia starszych intensywnych teł kart. Nie było wyszukiwarki ani filtrów do odświeżenia; nie dodano pozornych kontrolek.

## Lista szczegółów — ukończona

Karta eksponuje tytuł i klienta, a semantyczna lista `dl` oddziela organizatora, opiekuna, autora, datę publikacji, liczbę grup, liczbę trenerów oraz numer wersji. Trenerzy są dodatkowo pokazani według grup, z pełnymi nazwami. Liczba trenerów liczy osoby po istniejącym ID, z nazwą jako fallback dla starszych danych, zamiast wielokrotnie liczyć tego samego trenera przypisanego do kilku grup.

Dotychczasowy `pobierzKolorTlaOpiekuna` nadal wyznacza kolor tożsamości, używany teraz wyłącznie na wąskim bocznym obramowaniu. Tło karty i pól jest pełne i zależy od motywu. Pozostałe obramowanie oraz odznaki korzystają z semantyki statusu: oczekiwanie i niepełne dane mają warning, zaakceptowane i rozliczone info, gotowość success, niezrealizowane error. Status szkolenia ma osobną odznakę. Oznaczenie danych do weryfikacji wynika z istniejących znaczników importu `brak`/`niepewne`; nie zastępuje walidacji formularza.

Zachowano akceptację, gotowość, cofanie z komentarzem, zmianę statusu szkolenia, aktualizację, podgląd, edycję przez aktualizację, duplikację oraz miękkie usuwanie. Handlery operacji i istniejące sprawdzenia uprawnień pozostały niezmienione. Rozliczony dokument nie pokazuje już pozornie aktywnej edycji, którą dotychczas zatrzymywał handler. Duplikowanie i usuwanie publikacji oraz zmiana statusu szkolenia zachowują dotychczasową dostępność; nie wprowadzono nowych zasad ról.

## Kopie robocze — ukończone

Kopie mają ten sam język prezentacji, własny status Szkic, datę zapisu, etykietę wersji i pełną nazwę kopii. Opublikowane dokumenty pozostają w osobnym rejestrze. Aktualizacje pokazują numer bazowej wersji opublikowanej; porównanie z istniejącym dokumentem źródłowym oznacza starszą podstawę jako historyczną i pokazuje ostrzeżenie. Nie tworzono nowej listy historycznych snapshotów ani nie mieszano ich ze szkicami.

Istniejący filtr widoczności kopii, w tym szczególne traktowanie aktualnej kopii, pozostał bez zmian. Kopie dostępne tylko do odczytu pokazują podgląd i wyjaśnienie uprawnień. Edycja, duplikacja i usunięcie są prezentowane wyłącznie po pozytywnym wyniku istniejącego `czyKontoMozeEdytowacKopie`; zachowano też te same zabezpieczenia w handlerach. Wznowienie korzysta z dotychczasowego ustawienia aktualnej kopii i centralnego callbacku nawigacji.

AkcjeRekordu przyjmuje opcjonalne callbacki operacji modyfikujących. Dotychczasowi odbiorcy przekazujący wszystkie callbacki nadal otrzymują komplet przycisków. Destrukcyjny przycisk w rejestrach ma czerwone obramowanie również przed najechaniem. Podgląd można ponownie zamknąć tym samym przyciskiem.

## Testy automatyczne

- `npm test` — kod 0, pełny zestaw wraz z dotychczasowymi regresjami V4-01–05, workflow, wersjonowania, kopii, uprawnień i nowym testem obu rejestrów.
- `npm run lint` — kod 0.
- `npm run build` — kod 0; pozostaje dotychczasowe ostrzeżenie o dużych paczkach.
- `git diff --check` — kod 0.

Nowy test renderuje rzeczywiste komponenty przez React. Osobno sprawdza listę i kopie dla 0, 1 i 40 rekordów, bardzo długie nazwy, wiele grup, różne wersje i semantyczne statusy. Obejmuje administratora, uprawnionego opiekuna, autora będącego pracownikiem oraz innego opiekuna. Sprawdza brak niedozwolonych przycisków, odrębność zbiorów i historyczną podstawę szkicu. Porównanie całego testowego magazynu przed i po każdym renderowaniu oraz danych obu rejestrów po przejściu macierzy ról potwierdza brak mutacji zapisanych wartości.

Manifest i rejestr zaktualizowano osobno dla listy i kopii: oba widoki mają ukończony V4-06. Zachowano wszystkie 53 ID, adresy, właścicieli i 122 dotychczasowe sygnatury. Inwentaryzacja obejmuje 83 pliki TSX po dodaniu lokalnej karty. Wspólny plik AkcjeRekordu zachowuje właściciela kodu V4-08 oraz odnotowany udział V4-06. V4-07–23 pozostają planowane.

## Przeglądarka

Chrome, osobny lokalny origin `127.0.0.1:5177`. Przed dodaniem testowych rekordów potwierdzono brak rejestru, aktualnej wersji i autosave. Dane dodano bez kasowania lub zastępowania istniejących zapisów. Tymczasowe skrypty przeglądarkowe pozostają w ignorowanym `tmp/`, poza commitem i aplikacją produkcyjną.

Sprawdzone interakcje:

- Lista: akceptacja klawiaturą, gotowość, cofnięcie z komentarzem, zmiana statusu szkolenia, podgląd, aktualizacja, edycja przez aktualizację, duplikacja oraz miękkie usunięcie testowego rekordu.
- Kopie: podgląd, duplikacja, wznowienie edycji i miękkie usunięcie testowej kopii. Zapisane aktualizacje zachowały źródłowy dokument, wersję bazową i trzy grupy.
- Pracownik nie otrzymał przycisków akceptacji, gotowości ani cofania. Jego widoczna kopia tylko do odczytu nie pokazała edycji, duplikacji ani usuwania. Dozwolona operacja „Utwórz formularz bez grup” zachowała powiązanie i bazową wersję, tworząc dotychczasową pojedynczą pustą grupę.
- Enter i Space uruchamiają istniejące operacje; Tab przechodzi do kolejnego przycisku. Przy 320 px skupiony przycisk Edytuj przewija się do obszaru nad dockiem i ma widoczny obrys.

Macierz pomiarów: dwa rejestry × trzy motywy × rzeczywiste szerokości CSS 1440/800/320 px, łącznie 18 kombinacji. Duży zbiór obejmował 44 publikacje i 46 kopii, w tym po 40 rekordów z długimi nazwami bez spacji oraz trzema grupami. Wszystkie pomiary wykazały brak poziomego przepełnienia dokumentu i main, pełną dostępność tekstów nagłówków i metadanych oraz prawidłowe umieszczenie main między nagłówkiem i dockiem. Przy 320 px kontrolki mieściły się w kartach. Zmiany widoków i motywów nie zmieniły surowego zapisu rejestru.

Pełne tła kart: Emerald Dark `rgb(9,31,25)`, Soft Grey `rgb(212,217,214)`, Dark Gray `rgb(35,40,43)`. Teksty korzystają z odpowiednich tokenów. Tymczasowe nadpisania palety i geometrii usunięto; przeładowanie przywróciło Emerald Dark. Konsola kontrolowanej karty nie zgłosiła błędów.

## Ograniczenia

Przechwytywanie `Page.captureScreenshot` nadal kończy się timeoutem. Wykonano kontrolę interakcji, DOM, geometrii i stylów obliczonych; **nie wykonano pełnej kontroli wizualnej ani regresji screenshotów**.

Natywny prompt komentarza został otwarty, lecz narzędzie sterujące kartą zablokowało się podczas jego obsługi. Test cofnięcia dokończono w nowej karcie z deterministyczną odpowiedzią testową `window.prompt`; potwierdzenie miękkiego usunięcia publikacji również miało kontrolowaną odpowiedź `window.confirm`. Nie zmieniano tych dialogów w kodzie aplikacji. Przeładowanie usunęło nadpisania. Nie jest to potwierdzenie pełnej obsługi natywnych okien przez narzędzie automatyzujące.

Brak blokerów implementacji. Nie rozpoczęto V4-07 i nie wykonano merge do main.

## Zmienione pliki

- `docs/v4/manifest-widokow.json`
- `docs/v4/rejestr-widokow.md`
- `docs/v4/raport-v4-06.md`
- `package.json`
- `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KartaRejestruSzczegolow.tsx`
- `src/moduly/zamkniete/szczegoly_organizacyjne/prezentacjaRejestruSzczegolow.ts`
- `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych.tsx`
- `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych.tsx`
- `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/rejestrySzczegolowV4.css`
- `src/wspolne/komponenty/AkcjeRekordu.tsx`
- `testy/daneRejestrowSzczegolowV4.mjs`
- `testy/v4Rejestr.test.mjs`
- `testy/v4RejestrySzczegolow.test.mjs`
