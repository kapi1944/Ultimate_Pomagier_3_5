# Audyt modelu dokumentow

Data audytu: 2026-07-14. Zakres obejmuje generatory, ich listy i kopie robocze, magazyny przegladarkowe, statusy, identyfikatory oraz sciezki eksportu. Nie stwierdzono uzycia `sessionStorage` ani IndexedDB.

| Modul | Obecne dane | Miejsce zapisu | Przyszly TypDokumentu | Sposob migracji | Ryzyko |
| --- | --- | --- | --- | --- | --- |
| Programy szkolen | Formularz programu, metadane organizatora, historia i autosave | `ultimatePomagier.dokumenty.wspolne.v1`; autosave `ultimatePomagier.programySzkolen.autosave.v1`; aktywna kopia w osobnym kluczu | `PROGRAM_SZKOLENIA` | Odczyt rekordu `programy_szkolen` z zachowaniem ID; formularz do `daneDokumentu`, ustawienia eksportu do `ustawieniaDokumentu` | Srednie: aktywna kopia i autosave musza pozostac poza rekordem biznesowym |
| Szczegoly organizacyjne | Dane formularza, grupy, adresaci, statusy pol, publikacje i historia | Wspolny rekord `szczegoly_organizacyjne`; stare klucze `ultimatePomagier.szczegolyOrganizacyjne.*` | `SZCZEGOLY_ORGANIZACYJNE` | Znane wersje robocze i publikacje przepisac idempotentnie, zachowujac `id`, daty oraz zrodlo | Wysokie: istnieje kilka starych kluczy, status biznesowy i wersja nie sa dzis rozdzielone od cyklu zycia |
| Dyplomy | Dane szkolenia, uczestnicy, numeracja, dodatki, druga strona i tryb tytulu | `ultimate-pomagier.dyplomy.generator-pawla` | `DYPLOM`, `CERTYFIKAT`, `ZASWIADCZENIE` | Jeden dokument na wybrany tryb tytulu; dane formularza i ustawienia podgladu rozdzielic przy podlaczeniu generatora | Srednie: jeden klucz przechowuje biezacy stan, nie kolekcje dokumentow |
| Listy obecnosci | Tekst szkicu i wygenerowany podglad | `ultimate-pomagier.listy-obecnosci.szkic` | `LISTA_OBECNOSCI` | Jednorazowo utworzyc roboczy rekord tylko dla rozpoznawalnego szkicu; zrodla nie usuwac | Niskie: aktualny generator jest prostym szkicem bez identyfikatora |
| Ankiety | Tekst szkicu i wygenerowany podglad | `ultimate-pomagier.ankiety.szkic` | `ANKIETA` | Jak dla list obecnosci | Niskie: brak wersji, statusu i listy |
| Karty na drzwi | Tekst szkicu i wygenerowany podglad | `ultimate-pomagier.karta-na-drzwi.szkic` | `KARTA_NA_DRZWI` | Jak dla prostych szkicow; typ dodany ponad minimalna liste, bo jest faktycznie dzialajacym generatorem | Niskie: brak wersji, statusu i listy |
| Replikator dokumentow | Dokument blokowy, szablon roboczy, raport importu DOCX/PDF i decyzje | Stan React podczas sesji; szablony w `ultimate-pomagier.kartoteki.szablony-dokumentow` | `MATERIAL_DODATKOWY` lub `INNY` | Nie migrowac automatycznie: rozroznic szablon kartoteki od dokumentu biznesowego podczas pozniejszego podlaczenia | Wysokie: import PDF/DOCX bywa niepelny, a szablon nie zawsze jest dokumentem biznesowym |
| Kartoteka szablonow dokumentow | Nazwa, typ, tresc/model blokowy, wersje i status szablonu | `ultimate-pomagier.kartoteki.szablony-dokumentow` | `INNY` (tylko gdy szablon zostanie instancja dokumentu) | Pozostawic jako niezalezna kartoteke; nie migrowac jej jako dokumentow | Srednie: pomieszanie szablonow z instancjami zduplikowaloby dane |
| Wspolne kopie robocze i stare repozytorium | `RekordDokumentu`, historia, `typGeneratora`, `stanCyklu`, dane generatora | `ultimatePomagier.dokumenty.wspolne.v1` oraz starsze `ultimatePomagier.kopieRobocze` | `PROGRAM_SZKOLENIA`, `SZCZEGOLY_ORGANIZACYJNE` | W etapie 5B dodac adapter i rejestr migracji; zachowac stare ID jako `id` lub metadane migracji | Wysokie: kontrakt rozni sie od docelowego `Dokument`, a identyfikator jest unikalny tylko w parze z typem generatora |

## Wykryte wzorce

- Trwaly zapis dokumentow odbywa sie obecnie tylko w `localStorage`; eksport PDF jest drukowaniem przegladarkowym, a import DOCX/PDF wystepuje w Replikatorze i szczegolach organizacyjnych. Nie ma ogolnego eksportera DOCX dokumentu biznesowego.
- Programy i szczegoly organizacyjne maja duplikujace sie operacje utworzenia, aktualizacji, historii, publikacji i kopii roboczych. Oba moduly korzystaja z wczesniejszego `repozytoriumDokumentow`, ale nadal przechowuja osobne klucze autosave oraz stan aktywnej kopii.
- Proste generatory (listy obecnosci, ankiety, karta na drzwi) zapisuja pojedynczy szkic bez identyfikatora, wersji i statusu.
- Status cyklu zycia wystepuje jako `kopia_robocza`, `opublikowany`, `archiwalny`, `kosz`; szczegoly organizacyjne maja dodatkowe statusy biznesowe, ktore powinny pozostac w `daneDokumentu`.

## Decyzja etapu 5A

Dodany model `Dokument<TDane, TUstawienia>` jest nowym kontraktem docelowym i nie zmienia istniejacych zapisow ani UI. Rozdziela status cyklu zycia (`StatusDokumentu`) od danych generatora, dodaje wersje schematu oraz jawne znaczniki archiwizacji i miekkiego usuniecia. Konfiguracja mapuje faktycznie dostepne trasy generatorow; `PROTOKOL` pozostaje typem zarezerwowanym bez generatora i trasy.
