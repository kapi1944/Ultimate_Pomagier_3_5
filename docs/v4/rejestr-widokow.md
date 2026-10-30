# Rejestr widoków V4

Baza: `19a9427010ffe758284f658b2f81efead181533a`. Inwentaryzacja V4-01, 16.10.2026.

Manifest `manifest-widokow.json` jest wersjonowanym przypisaniem zakresów. Test `testy/v4Rejestr.test.mjs` rozwiązuje typ WidokNawigacji kompilatorem TypeScript i porównuje go z listą aktywnych widoków, renderujWidok, konfiguracją tras i rzeczywistym drzewem menu. Każdy plik TSX ma właściciela; wykrywane formularze, zakładki, panele, modale i natywne potwierdzenia mają dodatkowe sygnatury. Dodanie widoku/pliku lub zmiana tych powierzchni wymaga świadomej aktualizacji manifestu.

## Przypisanie etapów

Obowiązuje poniższy plan 23 etapów, zsynchronizowany jednorazowo w V4-05. Dawna numeracja V4-05–23 w raportach historycznych nie jest planem dalszych prac.

- V4-01: Fundament wizualny, tokeny i rejestr widoków — **ukończony**.
- V4-02: Powłoka, menu, nagłówek, dock i wspólne dialogi — **ukończony**.
- V4-03: Ekran logowania i jego stany — **ukończony**.
- V4-04: Pulpit, zadania, oś czasu, paczki i zakupy — **ukończony**.
- V4-05: Szkolenia zamknięte i otwarte — **ukończony**.
- V4-06: Lista i kopie szczegółów organizacyjnych — **ukończony**.
- V4-07: Formularz szczegółów organizacyjnych — **przyszłe zadanie**.
- V4-08: Centrum dokumentów, rejestry, kopie i kosze — **przyszłe zadanie**.
- V4-09: Wspólny workspace generatorów — **przyszłe zadanie**.
- V4-10: Generator programów szkoleń — **przyszłe zadanie**.
- V4-11: Generator list obecności — **przyszłe zadanie**.
- V4-12: Generator ankiet — **przyszłe zadanie**.
- V4-13: Generator dyplomów — **przyszłe zadanie**.
- V4-14: Generator kart na drzwi — **przyszłe zadanie**.
- V4-15: Generator checklist paczek — **przyszłe zadanie**.
- V4-16: Replikator dokumentów — **przyszłe zadanie**.
- V4-17: Narzędzia i Poprawiacz prezentacji — **przyszłe zadanie**.
- V4-18: Zakupy — **przyszłe zadanie**.
- V4-19: Magazyn i mapa — **przyszłe zadanie**.
- V4-20: Kartoteki klientów, trenerów i lokalizacji — **przyszłe zadanie**.
- V4-21: Szablony, użytkownicy i profile — **przyszłe zadanie**.
- V4-22: Ustawienia aplikacji — **przyszłe zadanie**.
- V4-23: Audyt końcowy i Release Candidate — **przyszłe zadanie**.

### Własność i wykonanie

- `widoki[id].zadanie` oznacza właściciela liftingu widoku, a `pliki[ścieżka].zadanie` właściciela kodu. Właściciel pliku koordynuje zmiany; nie ma wyłączności na jego modyfikację.
- `wspoldzieloneZ` wskazuje inne etapy mogące modyfikować współdzielony komponent wraz z jego odbiorcami. Wspólny plik nie przenosi własności widoku na właściciela kodu.
- `ukonczoneEtapy` pliku odnotowuje rzeczywisty udział w commitach V4-01–06, a nie ukończenie wszystkich jego przyszłych zadań. Dla widoku oznacza ukończony lifting tego widoku.
- `realizacjaEtapow` zawiera faktyczny status etapu i dowody historyczne (SHA/raport); V4-06 wskazuje niniejszy commit, aby uniknąć samoodwołującego się SHA. Właściciele V4-01–04 i raporty pozostają zachowani. V4-07–23 są planowane i nie zostały rozpoczęte w V4-06.
- V4-09 obejmuje workspace bez odrębnej trasy; V4-23 audytuje wszystkie 53 widoki i wszystkie pliki/powierzchnie, bez przejmowania ich własności. Etap nie musi mieć własnego ID widoku.
- `generator-szczegolow` to alias pełnego formularza `zamkniete_szczegoly_organizacyjne_nowe`, nie osobny ekran wejściowy. Oba należą do V4-07. Lista i kopie szczegółów należą do V4-06. Rejestry, kopie i kosze wszystkich generatorów należą do V4-08.

## Nawigacja

Adres `/` oznacza istniejący fallback nawigacji, a nie nową trasę. Kilka widoków dzieli ten adres i jest wybieranych stanem aplikacji; nie zmieniono ID ani zachowania odświeżania strony. Profil oraz generator-szczegolow nie mają własnego wpisu w menu. Dynamiczne ID dokumentów i profilu pozostają niezmienione.

| ID widoku | Właściciel widoku | Adresy | Menu | Ukończony lifting |
| --- | --- | --- | --- | --- |
| `ankiety` | V4-12 | `/dokumenty/ankiety` | tak | — |
| `ankiety_kopie_robocze` | V4-08 | `/dokumenty/ankiety/kopie-robocze` | tak | — |
| `ankiety_kosz` | V4-08 | `/dokumenty/ankiety/kosz` | tak | — |
| `ankiety_wszystkie` | V4-08 | `/dokumenty/ankiety/wszystkie` | tak | — |
| `checklisty_paczek` | V4-15 | `/dokumenty/checklisty-paczek`, `/dokumenty/checklisty-paczek/:dokumentId` | tak | — |
| `checklisty_paczek_kopie_robocze` | V4-08 | `/dokumenty/checklisty-paczek/kopie-robocze` | tak | — |
| `checklisty_paczek_kosz` | V4-08 | `/dokumenty/checklisty-paczek/kosz` | tak | — |
| `checklisty_paczek_wszystkie` | V4-08 | `/dokumenty/checklisty-paczek/wszystkie` | tak | — |
| `dokumenty` | V4-08 | `/` | tak | — |
| `dokumenty_kopie_robocze` | V4-08 | `/dokumenty/kopie-robocze` | tak | — |
| `dokumenty_kosz` | V4-08 | `/dokumenty/kosz` | tak | — |
| `dokumenty_wszystkie` | V4-08 | `/dokumenty/wszystkie` | tak | — |
| `dyplomy` | V4-13 | `/dokumenty/dyplomy` | tak | — |
| `dyplomy_kopie_robocze` | V4-08 | `/dokumenty/dyplomy/kopie-robocze` | tak | — |
| `dyplomy_kosz` | V4-08 | `/dokumenty/dyplomy/kosz` | tak | — |
| `dyplomy_wszystkie` | V4-08 | `/dokumenty/dyplomy/wszystkie` | tak | — |
| `generator-szczegolow` | V4-07 | `/` | kod / nawigacja wewnętrzna | — |
| `karta-na-drzwi` | V4-14 | `/dokumenty/karta-na-drzwi` | tak | — |
| `karta_na_drzwi_kopie_robocze` | V4-08 | `/dokumenty/karta-na-drzwi/kopie-robocze` | tak | — |
| `karta_na_drzwi_kosz` | V4-08 | `/dokumenty/karta-na-drzwi/kosz` | tak | — |
| `karta_na_drzwi_wszystkie` | V4-08 | `/dokumenty/karta-na-drzwi/wszystkie` | tak | — |
| `kartoteki` | V4-20 | `/` | tak | — |
| `kartoteki_klienci` | V4-20 | `/` | tak | — |
| `kartoteki_lokalizacje` | V4-20 | `/` | tak | — |
| `kartoteki_szablony_dokumentow` | V4-21 | `/` | tak | — |
| `kartoteki_trenerzy` | V4-20 | `/` | tak | — |
| `kartoteki_uzytkownicy` | V4-21 | `/` | tak | — |
| `listy-obecnosci` | V4-11 | `/dokumenty/listy-obecnosci`, `/dokumenty/listy-obecnosci/:dokumentId` | tak | — |
| `listy_obecnosci_kopie_robocze` | V4-08 | `/dokumenty/listy-obecnosci/kopie-robocze` | tak | — |
| `listy_obecnosci_kosz` | V4-08 | `/dokumenty/listy-obecnosci/kosz` | tak | — |
| `listy_obecnosci_wszystkie` | V4-08 | `/dokumenty/listy-obecnosci/wszystkie` | tak | — |
| `narzedzia` | V4-17 | `/narzedzia` | tak | — |
| `poprawiacz_prezentacji` | V4-17 | `/narzedzia/poprawiacz-prezentacji` | tak | — |
| `profil_uzytkownika` | V4-21 | `/profil`, `/profil/:uzytkownikId` | kod / nawigacja wewnętrzna | — |
| `programy_szkolen` | V4-10 | `/dokumenty/programy-szkolen`, `/dokumenty/programy-szkolen/:dokumentId` | tak | — |
| `programy_szkolen_kopie_robocze` | V4-08 | `/dokumenty/programy-szkolen/kopie-robocze` | tak | — |
| `programy_szkolen_kosz` | V4-08 | `/dokumenty/programy-szkolen/kosz` | tak | — |
| `pulpit` | V4-04 | `/` | tak | V4-04 |
| `replikator_dokumentow` | V4-16 | `/` | tak | — |
| `szkolenia-otwarte` | V4-05 | `/` | tak | V4-05 |
| `szkolenia-zamkniete` | V4-05 | `/` | tak | V4-05 |
| `ustawienia` | V4-22 | `/` | tak | — |
| `zakupy_historia` | V4-18 | `/zakupy/historia` | tak | — |
| `zakupy_katalog` | V4-18 | `/zakupy/katalog-produktow` | tak | — |
| `zakupy_listy` | V4-18 | `/zakupy/listy-zakupowe` | tak | — |
| `zakupy_magazyn` | V4-19 | `/zakupy/magazyn/stan-magazynowy`, `/zakupy/magazyn` | tak | — |
| `zakupy_mapa_magazynu` | V4-19 | `/zakupy/magazyn/mapa` | tak | — |
| `zakupy_pulpit` | V4-18 | `/zakupy` | tak | — |
| `zakupy_zamowienia` | V4-18 | `/zakupy/zamowienia-i-dostawy` | tak | — |
| `zakupy_zapotrzebowania` | V4-18 | `/zakupy/zapotrzebowania` | tak | — |
| `zamkniete_szczegoly_organizacyjne_kopie_robocze` | V4-06 | `/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze` | tak | V4-06 |
| `zamkniete_szczegoly_organizacyjne_lista` | V4-06 | `/szkolenia-zamkniete/szczegoly-organizacyjne` | tak | V4-06 |
| `zamkniete_szczegoly_organizacyjne_nowe` | V4-07 | `/szkolenia-zamkniete/szczegoly-organizacyjne/nowe` | tak | — |

## Podwidoki i powierzchnie wewnętrzne

Właściciel pliku obejmuje wszystkie warunki renderowania, stany pusty/błąd/ładowanie, podglądy, formularze tworzenia i edycji oraz dialogi w tym pliku. Pliki współdzielone zmienia się wspólnie z ich odbiorcami. Szczegółowe sygnatury powierzchni są w manifeście.

- Ustawienia: Ogólne, Wygląd, Nawigacja, Pulpit, Zadania, Dostępność, Dane i kopie; import/eksport ustawień, backup/restore, potwierdzenia migracji i galeria trzech motywów.
- Kartoteki: klienci, trenerzy i lokalizacje (V4-20), szablony oraz użytkownicy/profile (V4-21). Wspólny plik WidokKartotek należy do V4-20. Formularze, edycja, szczegóły, filtrowanie i usuwanie należą do właściciela zakładki.
- Pulpit: kafelki, zadania, paczki, formularz zakupu, formularz zadania, panel szczegółów, potwierdzenia.
- Szczegóły organizacyjne: lista i kopie, formularz sekcyjny, grupy, uczestnicy, import maila, historia i porównanie wersji, checklista publikacji, panel problemów, przygotowania dokumentów, list obecności i dokumentów powiązanych.
- Generatory: konfiguracja, edycja, wybór organizatora/szablonu, podgląd A4, walidacja, kopie, listy wszystkich dokumentów i kosze; Programy dodatkowo staging importu TXT/DOCX/PDF i edytor WYSIWYG; Dyplomy dodatkowo warianty i generowanie seryjne; wspólny układ, status zapisu, panel jakości i akcje eksportu w V4-09; rejestry, kopie i kosze w V4-08. Papier i eksport nie podlegają zmianie wyglądu.
- Replikator: oryginał i wynik, mapowanie/analiza, podglądy; Narzędzia: start oraz poprawiacz prezentacji, panel analizy i podgląd struktury.
- Zakupy: pulpit, zapotrzebowania, katalog, listy, zamówienia/dostawy, historia; Magazyn: stany, ruchy i inwentaryzacje, mapa 2D i edytor lokalizacji.
- Powłoka: logowanie przed sesją, menu drzewo/lista, nagłówek, profil, potwierdzenie opuszczenia niezapisanych zmian, granice błędów. Wspólne pola telefonu, odznaki i akcje rekordu są zinwentaryzowane również bez własnej trasy.

| Plik powierzchni | Właściciel kodu | Współdzielony z | Udział w ukończonych etapach | Liczba sygnatur |
| --- | --- | --- | --- | --- |
| `src/App.tsx` | V4-02 | — | — | 0 |
| `src/aplikacja/desktop/PanelAktualizacji.tsx` | V4-22 | V4-02 | — | 2 |
| `src/aplikacja/layout/NaglowekAplikacji.tsx` | V4-02 | — | V4-02 | 1 |
| `src/aplikacja/layout/UkladAplikacji.tsx` | V4-02 | V4-03, V4-04, V4-05, V4-06, V4-07, V4-08, V4-09, V4-10, V4-11, V4-12, V4-13, V4-14, V4-15, V4-16, V4-17, V4-18, V4-19, V4-20, V4-21, V4-22, V4-23 | V4-02, V4-05 | 7 |
| `src/aplikacja/logowanie/KontekstUzytkownika.tsx` | V4-02 | — | — | 1 |
| `src/aplikacja/logowanie/PanelLogowania.tsx` | V4-03 | — | V4-02, V4-03 | 7 |
| `src/aplikacja/menu/IkonaMenu.tsx` | V4-02 | V4-04, V4-05, V4-06, V4-07, V4-08, V4-09, V4-10, V4-11, V4-12, V4-13, V4-14, V4-15, V4-16, V4-17, V4-18, V4-19, V4-20, V4-21, V4-22, V4-23 | — | 0 |
| `src/aplikacja/menu/MenuBoczne.tsx` | V4-02 | V4-05 | V4-02, V4-05 | 1 |
| `src/aplikacja/ustawienia/WidokUstawien.tsx` | V4-22 | V4-01, V4-02 | V4-01, V4-02 | 5 |
| `src/kartoteki/WidokKartotek.tsx` | V4-20 | V4-21 | — | 7 |
| `src/kartoteki/szablony_dokumentow/WidokSzablonowDokumentow.tsx` | V4-21 | V4-20 | — | 1 |
| `src/kartoteki/uzytkownicy/WidokProfiluUzytkownika.tsx` | V4-21 | — | — | 1 |
| `src/kartoteki/uzytkownicy/OchronaKartotekiUzytkownikow.tsx` | V4-21 | — | — | 1 |
| `src/kartoteki/uzytkownicy/PanelResetowaniaHasel.tsx` | V4-21 | — | — | 1 |
| `src/kartoteki/uzytkownicy/PanelZmianyHasla.tsx` | V4-21 | — | — | 1 |
| `src/kartoteki/uzytkownicy/PanelOperacjiKont.tsx` | V4-21 | — | — | 1 |
| `src/kartoteki/uzytkownicy/PodgladUzytkownika.tsx` | V4-21 | — | — | 1 |
| `src/kartoteki/uzytkownicy/WidokUzytkownikow.tsx` | V4-21 | — | — | 2 |
| `src/kartoteki/uzytkownicy/komponenty/AvatarUzytkownika.tsx` | V4-21 | V4-02, V4-03, V4-04, V4-07, V4-20 | — | 0 |
| `src/kartoteki/uzytkownicy/komponenty/OdznakaRoli.tsx` | V4-21 | V4-02, V4-03, V4-04, V4-07, V4-20 | — | 0 |
| `src/kartoteki/uzytkownicy/komponenty/OdznakaUzytkownika.tsx` | V4-21 | V4-02, V4-03, V4-04, V4-07, V4-20 | — | 0 |
| `src/main.tsx` | V4-02 | — | V4-01 | 0 |
| `src/moduly/dokumenty/KartaDokumentuDyplomu.tsx` | V4-08 | — | — | 0 |
| `src/moduly/dokumenty/ListaDokumentow.tsx` | V4-08 | — | — | 2 |
| `src/moduly/dokumenty/WidokKopiiRoboczychDokumentow.tsx` | V4-08 | — | — | 0 |
| `src/moduly/dokumenty/WidokWszystkichDokumentow.tsx` | V4-08 | — | — | 0 |
| `src/moduly/dokumenty/generatory/ankiety/RendererAnkiety.tsx` | V4-12 | — | — | 0 |
| `src/moduly/dokumenty/generatory/ankiety/WidokAnkiet.tsx` | V4-12 | — | — | 2 |
| `src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx` | V4-15 | — | — | 7 |
| `src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx` | V4-13 | — | — | 4 |
| `src/moduly/dokumenty/generatory/karta_na_drzwi/RendererKartyNaDrzwi.tsx` | V4-14 | — | — | 0 |
| `src/moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi.tsx` | V4-14 | — | — | 3 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/RendererListyObecnosci.tsx` | V4-11 | — | — | 0 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/UstawieniaTabeliListy.tsx` | V4-11 | — | — | 0 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/UstawieniaTytuluListy.tsx` | V4-11 | — | — | 0 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci.tsx` | V4-11 | — | — | 2 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu.tsx` | V4-11 | — | — | 1 |
| `src/moduly/dokumenty/generatory/programy_szkolen/RendererPodgladuProgramu.tsx` | V4-10 | — | — | 0 |
| `src/moduly/dokumenty/generatory/programy_szkolen/RendererStronProgramu.tsx` | V4-10 | — | — | 1 |
| `src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx` | V4-10 | — | — | 9 |
| `src/moduly/dokumenty/generatory/programy_szkolen/komponenty/EdytorProgramuWysiwyg.tsx` | V4-10 | — | — | 0 |
| `src/moduly/dokumenty/replikator_dokumentow/PodgladOryginaluDokumentu.tsx` | V4-16 | — | — | 0 |
| `src/moduly/dokumenty/replikator_dokumentow/RenderujDokumentPomagiera.tsx` | V4-16 | — | — | 0 |
| `src/moduly/dokumenty/replikator_dokumentow/WidokReplikatoraDokumentow.tsx` | V4-16 | — | — | 4 |
| `src/moduly/dokumenty/wspolne/GranicaBleduGeneratora.tsx` | V4-09 | V4-02, V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 0 |
| `src/moduly/dokumenty/wspolne/StatusZapisuDokumentu.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 0 |
| `src/moduly/dokumenty/wspolne/UkladGeneratoraDokumentu.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 9 |
| `src/moduly/dokumenty/wspolne/WyborZapisanegoUkladu.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 0 |
| `src/moduly/narzedzia/WidokNarzedzi.tsx` | V4-17 | — | — | 0 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/PanelPrzygotowania.tsx` | V4-17 | — | — | 1 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/eksport/PanelEksportu.tsx` | V4-17 | — | — | 1 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/eksport/PodgladWydruku.tsx` | V4-17 | — | — | 0 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/PodgladStrukturalny.tsx` | V4-17 | — | — | 0 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/WidokPoprawiaczaPrezentacji.tsx` | V4-17 | — | — | 1 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/analiza/PanelAnalizy.tsx` | V4-17 | — | — | 1 |
| `src/moduly/otwarte/WidokSzkolenOtwartych.tsx` | V4-05 | — | V4-05 | 0 |
| `src/moduly/zakupy/WidokZakupow.tsx` | V4-18 | — | — | 0 |
| `src/moduly/zakupy/magazyn/EdytorLokalizacji.tsx` | V4-19 | — | — | 0 |
| `src/moduly/zakupy/magazyn/PlanMagazynu.tsx` | V4-19 | — | — | 0 |
| `src/moduly/zakupy/magazyn/WidokMapyMagazynu.tsx` | V4-19 | — | — | 2 |
| `src/moduly/zakupy/magazyn/WidokStanowMagazynowych.tsx` | V4-19 | — | — | 1 |
| `src/moduly/zamkniete/pulpit/DailyRoutines.tsx` | V4-04 | — | — | 5 |
| `src/moduly/zamkniete/pulpit/FormularzZakupu.tsx` | V4-04 | — | V4-04 | 2 |
| `src/moduly/zamkniete/pulpit/MonitorWysylek.tsx` | V4-04 | — | — | 1 |
| `src/moduly/zamkniete/pulpit/WidokPulpitu.tsx` | V4-04 | — | V4-04 | 11 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KartaGrupySzkoleniowej.tsx` | V4-07 | — | — | 1 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KontekstBledowPol.tsx` | V4-07 | — | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelDokumentowPowiazanych.tsx` | V4-07 | V4-08, V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 1 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelPrzygotowaniaDokumentow.tsx` | V4-07 | V4-08, V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelTworzeniaListObecnosci.tsx` | V4-07 | V4-08, V4-11 | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelWykrytychProblemow.tsx` | V4-07 | — | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PasekStickySzczegolow.tsx` | V4-07 | — | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PolaSzczegolow.tsx` | V4-07 | — | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PoleMinutWczesniejszegoPrzyjazdu.tsx` | V4-07 | — | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PoleUczestnikowGrupy.tsx` | V4-07 | — | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PrzelacznikTakNie.tsx` | V4-07 | V4-20 | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/SekcjaFormularza.tsx` | V4-07 | — | — | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych.tsx` | V4-06 | — | V4-06 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych.tsx` | V4-06 | — | V4-06 | 3 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx` | V4-07 | — | — | 10 |
| `src/moduly/zamkniete/szkolenia/WidokSzkolenZamknietych.tsx` | V4-05 | — | V4-05 | 0 |
| `src/moduly/zamkniete/szkolenia/generator_szczegolow/WidokGeneratoraSzczegolow.tsx` | V4-07 | — | — | 0 |
| `src/wspolne/dokumenty/AkcjeEksportuPdf.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 1 |
| `src/wspolne/dokumenty/EdytorSwobodnychBlokow.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 1 |
| `src/wspolne/dokumenty/ElementPomocniczyEdytora.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 0 |
| `src/wspolne/dokumenty/PanelKontroliJakosciDokumentu.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15, V4-16, V4-21 | — | 9 |
| `src/wspolne/dokumenty/RendererSwobodnychBlokow.tsx` | V4-09 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15, V4-16 | — | 0 |
| `src/wspolne/dokumenty/TrescStopkiOrganizatora.tsx` | V4-09 | V4-10, V4-11 | — | 0 |
| `src/wspolne/dokumenty/WidokKopiiRoboczychGeneratora.tsx` | V4-08 | V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 0 |
| `src/wspolne/komponenty/AkcjeRekordu.tsx` | V4-08 | V4-06, V4-20, V4-21 | V4-01, V4-06 | 0 |
| `src/wspolne/komponenty/ElementyInterfejsu.tsx` | V4-22 | V4-01, V4-02, V4-03, V4-04, V4-05, V4-06, V4-07, V4-08, V4-09, V4-10, V4-11, V4-12, V4-13, V4-14, V4-15, V4-16, V4-17, V4-18, V4-19, V4-20, V4-21, V4-23 | V4-01, V4-02 | 5 |
| `src/wspolne/komponenty/GaleriaKomponentow.tsx` | V4-22 | V4-01 | V4-01 | 2 |
| `src/wspolne/komponenty/RegulacjaSzerokosci.tsx` | V4-02 | V4-07, V4-09, V4-10, V4-11, V4-12, V4-13, V4-14, V4-15 | — | 0 |
| `src/wspolne/telefon/PoleTelefonu.tsx` | V4-07 | V4-20, V4-21 | — | 0 |
| `src/aplikacja/layout/DockAplikacji.tsx` | V4-02 | — | V4-02 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KartaRejestruSzczegolow.tsx` | V4-06 | — | V4-06 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PodgladSzczegolow.tsx` | V4-06 | — | V4-06 | 3 |

Wspólny lokalny styl obu ekranów szkoleń: `src/moduly/szkoleniaV4.css` — właściciel V4-05, używany przez oba widoki. W V4-06 inwentaryzację rozszerzono o lokalną kartę rejestru; zachowano wszystkie dotychczasowe sygnatury.

## Ustalenia audytu i zgodność

Istnieje jeden model i magazyn ustawień aplikacji: wersja 1, klucz ultimatePomagier.ustawieniaAplikacji.v1. Migrację niepełnych ustawień realizuje dotychczasowa normalizacja na odczycie/importowaniu; dodanie palet nie wymaga przepisywania klucza ani zmiany schematu. Stare DOMYSLNA pozostaje aliasem zielonego motywu, CRM/DDP/SEMPER/EVENTIS/ARKUSZE_GOOGLE zachowują wartości. Nowe instalacje używają EMERALD_DARK. Nie uruchamia się migracji dokumentów. Równoległe historyczne magazyny opisane w docs/audyty/audyt-magazynow-danych.md pozostają poza zakresem.

Tokeny rozszerzają istniejące --ui-*; nie powstaje drugi system ustawień ani biblioteka zależności. Galeria jest w istniejącym podglądzie ustawień (zakładka Wygląd), obejmuje jednocześnie trzy motywy. Natywny dialog daje modalność, blokadę fokusu i Escape; komponent przywraca fokus. Zakładki obsługują strzałki, Home i End. Tokeny statusów są niezależne od marki; draft jest fioletowy, error czerwony. Preferencje geometrii, gęstości i ograniczenia animacji nadal obowiązują.

Kolejne etapy muszą zastępować lokalne kolory tokenami stopniowo. V4-01 nie jest potwierdzeniem zgodności WCAG wszystkich starych ekranów: obecne lokalne style niektórych modułów nadal wymagają modernizacji przez przypisanych właścicieli.


## V4-02 — powłoka aplikacji

Wdrożono rail 72 px z rozwijaniem kursorem i fokusem, przypinanie per użytkownik, kontekst sekcji w nagłówku i dock z wyborem skrótów wszystkich 53 istniejących widoków. Nowy DockAplikacji należy do V4-02. Wspólny OknoDialogowe rozwija mechanizm panelu z V4-01; używany jest w edycji docka i istniejącym potwierdzeniu opuszczenia formularza.

Preferencje powłoki są opcjonalną sekcją powloka w istniejącym rekordzie menuDrzewo.v1.<użytkownik>. Brak sekcji oznacza odczyt starych globalnych preferencji przypięcia/wysuwania; odczyt nie przepisuje danych. Zapis drzewa zachowuje powłokę i dodatkowe pola rekordu. Domyślna widoczność docka zależy od szerokości ekranu; jawny wybór użytkownika ma pierwszeństwo.

Nagłówek i dock zajmują osobne wiersze układu, a main ma własne przewijanie. Lokalne sticky pozostają w main. ResizeObserver wyznacza rzeczywiste granice main dla istniejących paneli fixed. Warstwy: lokalne sticky 10, nagłówek/dock 30, panele 40, menu 50, tooltipy 60; natywne dialogi korzystają z top layer. CSS zmian geometrii i warstw działa tylko na ekranie; druk ukrywa powłokę.

Dock, menu i profil korzystają z centralnego ustawWidok. Zachowano funkcje zapisu i odrzucenia zmian oraz blokowanie po nieudanym zapisie. Wylogowanie pyta także przy niezapisanym dokumencie, a historia przeglądarki także przy niezapisanym profilu. Dialog profilu nie oferuje zapisu przez adapter dokumentu: użytkownik wraca do edycji albo jawnie odrzuca zmiany.


## V4-03 — logowanie

Zgodnie z późniejszym poleceniem użytkownika V4-03 obejmuje PanelLogowania, a V4-04 Pulpit. Historycznie przypisano szkolenia zamknięte i Szczegóły organizacyjne do V4-05. Synchronizacja V4-05 zastępuje to przypisanie: oba ekrany szkoleń V4-05, lista/kopie V4-06, formularz i alias V4-07. Żaden widok nie traci właściciela.

Wybór kont to natywna grupa radio z kafelkami, istniejącymi avatarami i oznaczeniami ról. Błąd korzysta ze wspólnego komunikatu error, brak kont z pustego stanu i blokady submit. Wywołanie zalogujUzytkownika i mechanizmy sesji pozostają bez zmian. Paleta jest odczytywana z istniejących ustawień także przed logowaniem. Nowe instalacje używają Emerald Dark.


## V4-04 — Pulpit

Podsumowania mają ikony i semantyczne obramowania. Zadania, paczki, formularze i priorytety korzystają z tokenów V4; wszystkie przyciski są wspólne. Zastąpiono lokalne modale/drawery wspólnym natywnym dialogiem i panelem z obsługą Escape, modalnością i powrotem fokusu, zachowując dotychczasowe callbacki operacji i warunki uprawnień. Oś przewija się w osobnym regionie, bez rozszerzania strony. Dla zagęszczonych deadline dostępna jest rozwijana lista tych samych zadań. Pozycje i algorytmy czasu oraz kolory identyfikujące zadaniodawcę i zadaniobiorcę pozostają bez zmian.

Plan tygodniowy nie istnieje w obecnym kodzie; zapisano go w docs/v4/backlog.md. Nie dodano kalendarza, modeli, dat ani nowego magazynu.

## V4-05 — Szkolenia i synchronizacja planu

Oba ekrany szkoleń otrzymały lifting V4. Zamknięte udostępniają istniejącą listę, formularz oraz kopie szczegółów przez centralne ustawWidok. Pozycja nadrzędna menu otwiera teraz ten ekran, zachowując rozwijanie podmenu; na telefonie zamyka menu po wyborze. Otwarte pozostają widokiem informacyjnym bez fikcyjnych operacji i danych. Zmiana właścicieli w planie nie oznacza wykonania przyszłych etapów. Formularza, list, modeli ani storage nie zmieniano. Szczegóły w raporcie V4-05.

## V4-06 — rejestry Szczegółów organizacyjnych

- Lista szczegółów organizacyjnych: ukończony lifting, pełne karty, osobne metadane i statusy, zachowane operacje oraz reguły workflow.
- Kopie robocze szczegółów organizacyjnych: ukończony lifting, odrębne szkice, metadane wersji bazowej i ostrzeżenie o historycznej podstawie aktualizacji; akcje zależą od istniejących uprawnień.

Lokalna karta KartaRejestruSzczegolow należy do V4-06. Wspólny arkusz `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/rejestrySzczegolowV4.css` i prezentacja statusów `src/moduly/zamkniete/szczegoly_organizacyjne/prezentacjaRejestruSzczegolow.ts` również należą do V4-06. Pełny formularz i jego arkusz pozostały bez zmian; V4-07 nie rozpoczęto. Szczegóły w raporcie V4-06.

| `src/aplikacja/desktop/PanelWersji.tsx` | V4-22 | V4-03 | — | 1 |
