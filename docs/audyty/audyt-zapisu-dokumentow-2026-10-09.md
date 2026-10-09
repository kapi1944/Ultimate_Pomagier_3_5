# Audyt zapisu dokumentów i kopii roboczych

Data: 2026-10-09. Zakres: aktualny working tree na `main`, w tym zastane zmiany użytkownika. Nie zmieniono kodu ani danych przeglądarki. Próby wykonano na zastępczym localStorage w pamięci procesu Node.

## Stan potwierdzony

- Wspólny rejestr ma schemat v3: dokumenty, kopie techniczne, autosave, historia i migracje. Repozytorium legacy ma zablokowany zapis. Wnioski audytów z lipca i sierpnia dotyczące aktywnego podwójnego zapisu nie opisują już aktualnego kodu.
- Programy, listy obecności (także ze Szczegółów), ankiety, karty, dyplomy, checklisty i Szczegóły zapisują dokumenty do wspólnego rejestru. Globalne Kopie robocze filtrują dokumenty `ROBOCZY`, poza koszem i archiwum. Techniczna kolekcja `kopieRobocze` oraz autosave nie są tą listą.
- Zapis pojedynczego stanu rejestru zachowuje poprzednią wartość przy niepowodzeniu; istnieją testy kompresji przy braku miejsca. Migracja legacy ma testy idempotencji, historii, backupu i wycofania.

## Błędy i ryzyka

### 1. P1 — zapis omija cykl życia dokumentu

`src/wspolne/dokumenty/zapisDokumentuGeneratora.ts`, funkcja `zapiszDokumentRoboczyGeneratora`, aktualizuje istniejący rekord bez sprawdzenia statusu, kosza oraz zgodności generatora. Gdy wskazane ID nie istnieje, tworzy dokument z tym samym ID.

Odtworzono: zapis ankiety po publikacji zmienia treść, zachowując `OPUBLIKOWANY`; zapis po usunięciu miękkim aktualizuje dokument pozostający w koszu; zapis po trwałym usunięciu odtwarza dokument pod usuniętym ID. Istniejący wskaźnik szkicu lub otwarty generator może więc zapisać zmiany w niewidocznym rekordzie albo odtworzyć usunięty dokument. Programy mają własny adapter, który również nie blokuje aktualizacji publikacji/kosza.

Naprawa: w operacjach domenowych odróżnić utworzenie od aktualizacji, odrzucać nieistniejące aktywne ID, blokować zapis do kosza/archiwum/publikacji i sprawdzać typ oraz generator. Edycję publikacji prowadzić przez jawną aktualizację. Nie blokować uprawnionych operacji publikacji i przywracania w ogólnym repozytorium bez uwzględnienia ich kontraktów.

### 2. P1 — ochrona wyjścia nie czeka na wynik zapisu

`src/moduly/dokumenty/wspolne/strzeznikNiezapisanegoDokumentu.ts` uznaje każdy wynik poza `false` za sukces. Listy, ankiety i karty przekazują do `useOchronaNiezapisanegoDokumentu` funkcję z `void stanDokumentu.zapiszTeraz()`, więc wynik jest `undefined` i wyjście może nastąpić mimo niepowodzenia. Powiązana lista zapisuje synchronicznie, ale po niepowodzeniu także nie zwraca `false`; wyjątek zapisu nie jest tam obsłużony.

Potwierdzone analizą kodu, bez testu przeglądarkowego. Lokalny szkic może zachować część danych, lecz nie gwarantuje skutecznego zapisu dokumentu do rejestru.

Naprawa: dopuścić `Promise<boolean>`, oczekiwać na zapis przed nawigacją, zachować formularz przy `false`/wyjątku i pokazać błąd. Dodać test nawigacji z odrzuconym zapisem i przepełnieniem storage.

### 3. P1 — nowa wersja gubi tożsamość logiczną i powiązania

`src/wspolne/dokumenty/wersjonowanieDokumentow.ts`, `utworzAktualizacjeDokumentu`, kopiuje tylko część metadanych. Odtworzono utratę `powiazania.grupaId`, `powiazania.szczegolyOrganizacyjneId` oraz zmianę `dokumentLogicznyId`. Nie przekazuje też integralności źródła. `rejestrProgramowSzkolen.ts` przy `utworz_nowa` zachowuje relacje wersji, ale nowy model nadal domyślnie otrzymuje wersję 1 i nowe ID logiczne.

Naprawa: rozdzielić semantykę niezależnego duplikatu od kolejnej wersji. Dla aktualizacji zachować logiczne ID, komplet powiązań i integralność, a numer wersji wyznaczać z rodziny dokumentu. Sprawdzić istniejące rodziny; nie scalać ich automatycznie wyłącznie według tytułu.

### 4. P2 — zapis zmienia autora i właściciela

Wspólny adapter przy aktualizacji przyjmuje `autorId` i `wlascicielId` z aktualnie zalogowanego użytkownika. Listy, ankiety i karty przekazują te wartości przy każdym zapisie. Odtworzono zmianę autora A na B po aktualizacji ankiety.

Naprawa: zachować autora utworzenia, aktualizować `ostatnioModyfikujacyId`; zmianę właściciela wykonywać osobną, uprawnioną operacją. Dodać test edycji przez drugiego użytkownika.

### 5. P2 — niejednolity autosave i nadmiar historii

Programy zapisują autosave w kolekcji rejestru, bez zmiany jawnej kopii. Listy, ankiety i karty przekazują zwykły zapis dokumentu jako autosave do `useStanDokumentu`: po 650 ms zmiany tworzą/aktualizują rekord i dodają pełną migawkę historii. Dodatkowo efekty zapisują pełny szkic do osobnych kluczy bez obsługi błędu. Szczegóły i dyplomy nadal mają osobny zapis autosave/szkicu. Powiązane listy mają autosave wyłączony.

Skutek: znaczenie „zapisano” i „kopia robocza” zależy od generatora, historia rośnie także podczas zwykłego pisania, a pełne stany są utrwalane równolegle. Początkowy stan hooka jest uznawany za zapisany nawet przy szkicu bez rekordu w rejestrze. Jest to niespójność kontraktów i ryzyko pojemności; nie dowód utraty wszystkich szkiców.

Naprawa: wykorzystać istniejący autosave rejestru z identyfikacją generatora, użytkownika i dokumentu. Jawny zapis tworzy punkt historii, autosave zachowuje stan odzyskiwania. Przenieść odczyt starych szkiców przez adapter zgodności i kontrolowaną migrację; nie usuwać starych danych przed potwierdzeniem. Zdefiniować stan początkowy na podstawie rzeczywistego trwałego zapisu.

### 6. P2 — część zmian statusów checklist nie spełnia modelu

`src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts`, `ustawStatusChecklisty`, ustawia `OPUBLIKOWANY` dla `WYDRUKOWANA`, ale nie ustawia `opublikowano`. Odtworzono odrzucenie operacji komunikatem „Zmiany naruszają model dokumentu”. Także zapis danych z takim statusem wymaga kontroli. Osobna ścieżka rejestracji wydruku musi być zachowana i ujednolicona z tym kontraktem.

Naprawa: centralnie wyliczać komplet metadanych przejścia statusu, w tym publikację i archiwizację. Testować wszystkie dozwolone przejścia, zapis oraz odczyt po przejściu.

### 7. P2 — jawny zapis nie jest jedną transakcją całego workflow

Program zapisuje kolejno dokument, aktywne ID, historię i usuwa autosave. Szczegóły również zapisują dokument, aktywny stan oraz historię osobnymi operacjami; publikacja dodatkowo usuwa kopię. Błąd późniejszego zapisu może zostawić wcześniejszą część operacji wykonaną, mimo komunikatu o błędzie. Atomowe `setItem` pojedynczego rejestru nie zabezpiecza całej sekwencji.

Potwierdzono strukturę kodu; nie wykonano symulacji awarii każdego kroku.

Naprawa: dokument, historię i usunięcie autosave/kopii składać w jeden kandydat stanu rejestru i jeden zapis. Wskaźniki UI aktualizować po skutecznym zapisie; odróżniać błąd wskaźnika od błędu zapisu dokumentu. Dodać awarie na kolejnych krokach i sprawdzenie ponowienia bez duplikatów.

## Kolejność planu naprawczego

1. Dodać testy reprodukujące błędy 1–4 i 6 oraz test błędu zapisu przy wyjściu. Zabezpieczyć cykl życia, autorstwo i oczekiwanie na wynik zapisu.
2. Naprawić tożsamość oraz numerację kolejnych wersji i komplet metadanych statusów checklist. Zweryfikować zapis → zamknięcie → otwarcie → publikacja → aktualizacja → kosz → przywrócenie dla każdego generatora.
3. Uczynić jawne operacje dokument/history/autosave transakcyjnymi w istniejącym rejestrze. Przetestować brak miejsca, awarię kolejnych kroków i ponowienie.
4. Ujednolicić autosave oraz odzyskiwanie szkiców przez istniejący mechanizm, z backupem, mapą starych kluczy i migracją zgodną wstecz. Nie tworzyć drugiego rejestru ani drugiego systemu draftów.
5. Wykonać testy przeglądarkowe całego workflow, także z dwoma użytkownikami i dwiema kartami. Dopiero po nich ocenić ewentualną korektę istniejących danych i aktualizować historyczne audyty.

## Weryfikacja i ograniczenia

- `npm test` (wraz z `pretest`): sukces.
- `npm run lint`: sukces.
- `npm run build`: sukces; ostrzeżenie o dużym bundle.
- Próby domenowe w pamięci: odtworzono edycję publikacji, zmianę autora, zapis do kosza, odtworzenie usuniętego ID, utratę powiązań/tożsamości wersji i błąd statusu checklisty.
- Nie badano rzeczywistego localStorage użytkownika ani działania w przeglądarce. Audyt nie potwierdza poprawności konkretnych zapisanych dokumentów użytkownika.
- Zastane zmiany użytkownika pozostawiono bez edycji. Jedynym plikiem dodanym w ramach zadania jest ten raport; bez commita.
