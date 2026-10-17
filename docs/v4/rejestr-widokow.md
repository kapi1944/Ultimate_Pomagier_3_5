# Rejestr widoków V4

Baza: `19a9427010ffe758284f658b2f81efead181533a`. Inwentaryzacja V4-01, 16.10.2026.

Manifest `manifest-widokow.json` jest wersjonowanym przypisaniem zakresów. Test `testy/v4Rejestr.test.mjs` rozwiązuje typ WidokNawigacji kompilatorem TypeScript i porównuje go z listą aktywnych widoków, renderujWidok, konfiguracją tras i rzeczywistym drzewem menu. Każdy plik TSX ma właściciela; wykrywane formularze, zakładki, panele, modale i natywne potwierdzenia mają dodatkowe sygnatury. Dodanie widoku/pliku lub zmiana tych powierzchni wymaga świadomej aktualizacji manifestu.

## Przypisanie etapów

- V4-02: Powłoka, menu, nagłówek i logowanie.
- V4-03: Ekran logowania i jego stany.
- V4-04: Pulpit, zadania, oś czasu, paczki i zakupy.
- V4-05: Szkolenia zamknięte i Szczegóły organizacyjne.
- V4-06: Szkolenia otwarte.
- V4-07: Rejestr dokumentów, kopie, kosze i wspólne mechanizmy UI dokumentów.
- V4-08: Programy szkoleń, import, edytor i podgląd.
- V4-09: Listy obecności.
- V4-10: Ankiety.
- V4-11: Dyplomy.
- V4-12: Karty na drzwi.
- V4-13: Checklisty paczek.
- V4-14: Replikator dokumentów.
- V4-15: Kartoteka trenerów.
- V4-16: Kartoteka klientów.
- V4-17: Kartoteka lokalizacji.
- V4-18: Kartoteka szablonów.
- V4-19: Użytkownicy i profile.
- V4-20: Ustawienia i galeria elementów wspólnych.
- V4-21: Narzędzia i poprawiacz prezentacji.
- V4-22: Zakupy.
- V4-23: Magazyn i mapa magazynu.

## Nawigacja

Adres `/` oznacza istniejący fallback nawigacji, a nie nową trasę. Kilka widoków dzieli ten adres i jest wybieranych stanem aplikacji; nie zmieniono ID ani zachowania odświeżania strony. Profil oraz generator-szczegolow nie mają własnego wpisu w menu. Dynamiczne ID dokumentów i profilu pozostają niezmienione.

| ID widoku | Etap | Adresy | Menu |
| --- | --- | --- | --- |
| `ankiety` | V4-10 | `/dokumenty/ankiety` | tak |
| `ankiety_kopie_robocze` | V4-10 | `/dokumenty/ankiety/kopie-robocze` | tak |
| `ankiety_kosz` | V4-10 | `/dokumenty/ankiety/kosz` | tak |
| `ankiety_wszystkie` | V4-10 | `/dokumenty/ankiety/wszystkie` | tak |
| `checklisty_paczek` | V4-13 | `/dokumenty/checklisty-paczek`, `/dokumenty/checklisty-paczek/:dokumentId` | tak |
| `checklisty_paczek_kopie_robocze` | V4-13 | `/dokumenty/checklisty-paczek/kopie-robocze` | tak |
| `checklisty_paczek_kosz` | V4-13 | `/dokumenty/checklisty-paczek/kosz` | tak |
| `checklisty_paczek_wszystkie` | V4-13 | `/dokumenty/checklisty-paczek/wszystkie` | tak |
| `dokumenty` | V4-07 | `/` | tak |
| `dokumenty_kopie_robocze` | V4-07 | `/dokumenty/kopie-robocze` | tak |
| `dokumenty_kosz` | V4-07 | `/dokumenty/kosz` | tak |
| `dokumenty_wszystkie` | V4-07 | `/dokumenty/wszystkie` | tak |
| `dyplomy` | V4-11 | `/dokumenty/dyplomy` | tak |
| `dyplomy_kopie_robocze` | V4-11 | `/dokumenty/dyplomy/kopie-robocze` | tak |
| `dyplomy_kosz` | V4-11 | `/dokumenty/dyplomy/kosz` | tak |
| `dyplomy_wszystkie` | V4-11 | `/dokumenty/dyplomy/wszystkie` | tak |
| `generator-szczegolow` | V4-05 | `/` | kod / nawigacja wewnętrzna |
| `karta-na-drzwi` | V4-12 | `/dokumenty/karta-na-drzwi` | tak |
| `karta_na_drzwi_kopie_robocze` | V4-12 | `/dokumenty/karta-na-drzwi/kopie-robocze` | tak |
| `karta_na_drzwi_kosz` | V4-12 | `/dokumenty/karta-na-drzwi/kosz` | tak |
| `karta_na_drzwi_wszystkie` | V4-12 | `/dokumenty/karta-na-drzwi/wszystkie` | tak |
| `kartoteki` | V4-15 | `/` | tak |
| `kartoteki_klienci` | V4-16 | `/` | tak |
| `kartoteki_lokalizacje` | V4-17 | `/` | tak |
| `kartoteki_szablony_dokumentow` | V4-18 | `/` | tak |
| `kartoteki_trenerzy` | V4-15 | `/` | tak |
| `kartoteki_uzytkownicy` | V4-19 | `/` | tak |
| `listy-obecnosci` | V4-09 | `/dokumenty/listy-obecnosci`, `/dokumenty/listy-obecnosci/:dokumentId` | tak |
| `listy_obecnosci_kopie_robocze` | V4-09 | `/dokumenty/listy-obecnosci/kopie-robocze` | tak |
| `listy_obecnosci_kosz` | V4-09 | `/dokumenty/listy-obecnosci/kosz` | tak |
| `listy_obecnosci_wszystkie` | V4-09 | `/dokumenty/listy-obecnosci/wszystkie` | tak |
| `narzedzia` | V4-21 | `/narzedzia` | tak |
| `poprawiacz_prezentacji` | V4-21 | `/narzedzia/poprawiacz-prezentacji` | tak |
| `profil_uzytkownika` | V4-19 | `/profil`, `/profil/:uzytkownikId` | kod / nawigacja wewnętrzna |
| `programy_szkolen` | V4-08 | `/dokumenty/programy-szkolen`, `/dokumenty/programy-szkolen/:dokumentId` | tak |
| `programy_szkolen_kopie_robocze` | V4-08 | `/dokumenty/programy-szkolen/kopie-robocze` | tak |
| `programy_szkolen_kosz` | V4-08 | `/dokumenty/programy-szkolen/kosz` | tak |
| `pulpit` | V4-04 | `/` | tak |
| `replikator_dokumentow` | V4-14 | `/` | tak |
| `szkolenia-otwarte` | V4-06 | `/` | tak |
| `szkolenia-zamkniete` | V4-05 | `/` | tak |
| `ustawienia` | V4-20 | `/` | tak |
| `zakupy_historia` | V4-22 | `/zakupy/historia` | tak |
| `zakupy_katalog` | V4-22 | `/zakupy/katalog-produktow` | tak |
| `zakupy_listy` | V4-22 | `/zakupy/listy-zakupowe` | tak |
| `zakupy_magazyn` | V4-23 | `/zakupy/magazyn/stan-magazynowy`, `/zakupy/magazyn` | tak |
| `zakupy_mapa_magazynu` | V4-23 | `/zakupy/magazyn/mapa` | tak |
| `zakupy_pulpit` | V4-22 | `/zakupy` | tak |
| `zakupy_zamowienia` | V4-22 | `/zakupy/zamowienia-i-dostawy` | tak |
| `zakupy_zapotrzebowania` | V4-22 | `/zakupy/zapotrzebowania` | tak |
| `zamkniete_szczegoly_organizacyjne_kopie_robocze` | V4-05 | `/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze` | tak |
| `zamkniete_szczegoly_organizacyjne_lista` | V4-05 | `/szkolenia-zamkniete/szczegoly-organizacyjne` | tak |
| `zamkniete_szczegoly_organizacyjne_nowe` | V4-05 | `/szkolenia-zamkniete/szczegoly-organizacyjne/nowe` | tak |

## Podwidoki i powierzchnie wewnętrzne

Właściciel pliku obejmuje wszystkie warunki renderowania, stany pusty/błąd/ładowanie, podglądy, formularze tworzenia i edycji oraz dialogi w tym pliku. Pliki współdzielone zmienia się wspólnie z ich odbiorcami. Szczegółowe sygnatury powierzchni są w manifeście.

- Ustawienia: Ogólne, Wygląd, Nawigacja, Pulpit, Zadania, Dostępność, Dane i kopie; import/eksport ustawień, backup/restore, potwierdzenia migracji i galeria trzech motywów.
- Kartoteki: trenerzy (V4-15), klienci (V4-16), lokalizacje (V4-17), szablony (V4-18); wspólny plik WidokKartotek koordynowany przez V4-15 z pozostałymi etapami. Formularze nowego rekordu, edycji, szczegóły, filtrowanie i potwierdzenia usuwania pozostają w zakresie właściciela zakładki.
- Pulpit: kafelki, zadania, paczki, formularz zakupu, formularz zadania, panel szczegółów, potwierdzenia.
- Szczegóły organizacyjne: lista i kopie, formularz sekcyjny, grupy, uczestnicy, import maila, historia i porównanie wersji, checklista publikacji, panel problemów, przygotowania dokumentów, list obecności i dokumentów powiązanych.
- Generatory: konfiguracja, edycja, wybór organizatora/szablonu, podgląd A4, walidacja, kopie, listy wszystkich dokumentów i kosze; Programy dodatkowo staging importu TXT/DOCX/PDF i edytor WYSIWYG; Dyplomy dodatkowo warianty i generowanie seryjne; wspólny układ, status zapisu, panel jakości i akcje eksportu w V4-07. Papier i eksport nie podlegają zmianie wyglądu.
- Replikator: oryginał i wynik, mapowanie/analiza, podglądy; Narzędzia: start oraz poprawiacz prezentacji, panel analizy i podgląd struktury.
- Zakupy: pulpit, zapotrzebowania, katalog, listy, zamówienia/dostawy, historia; Magazyn: stany, ruchy i inwentaryzacje, mapa 2D i edytor lokalizacji.
- Powłoka: logowanie przed sesją, menu drzewo/lista, nagłówek, profil, potwierdzenie opuszczenia niezapisanych zmian, granice błędów. Wspólne pola telefonu, odznaki i akcje rekordu są zinwentaryzowane również bez własnej trasy.

| Plik powierzchni | Właściciel | Liczba sygnatur |
| --- | --- | --- |
| `src/App.tsx` | V4-02 | 0 |
| `src/aplikacja/layout/NaglowekAplikacji.tsx` | V4-02 | 1 |
| `src/aplikacja/layout/UkladAplikacji.tsx` | V4-02 | 7 |
| `src/aplikacja/logowanie/KontekstUzytkownika.tsx` | V4-02 | 0 |
| `src/aplikacja/logowanie/PanelLogowania.tsx` | V4-03 | 9 |
| `src/aplikacja/menu/IkonaMenu.tsx` | V4-02 | 0 |
| `src/aplikacja/menu/MenuBoczne.tsx` | V4-02 | 1 |
| `src/aplikacja/ustawienia/WidokUstawien.tsx` | V4-20 | 5 |
| `src/kartoteki/WidokKartotek.tsx` | V4-15 | 7 |
| `src/kartoteki/szablony_dokumentow/WidokSzablonowDokumentow.tsx` | V4-18 | 1 |
| `src/kartoteki/uzytkownicy/WidokProfiluUzytkownika.tsx` | V4-19 | 1 |
| `src/kartoteki/uzytkownicy/WidokUzytkownikow.tsx` | V4-19 | 1 |
| `src/kartoteki/uzytkownicy/komponenty/AvatarUzytkownika.tsx` | V4-19 | 0 |
| `src/kartoteki/uzytkownicy/komponenty/OdznakaRoli.tsx` | V4-19 | 0 |
| `src/kartoteki/uzytkownicy/komponenty/OdznakaUzytkownika.tsx` | V4-19 | 0 |
| `src/main.tsx` | V4-02 | 0 |
| `src/moduly/dokumenty/KartaDokumentuDyplomu.tsx` | V4-07 | 0 |
| `src/moduly/dokumenty/ListaDokumentow.tsx` | V4-07 | 2 |
| `src/moduly/dokumenty/WidokKopiiRoboczychDokumentow.tsx` | V4-07 | 0 |
| `src/moduly/dokumenty/WidokWszystkichDokumentow.tsx` | V4-07 | 0 |
| `src/moduly/dokumenty/generatory/ankiety/RendererAnkiety.tsx` | V4-10 | 0 |
| `src/moduly/dokumenty/generatory/ankiety/WidokAnkiet.tsx` | V4-10 | 2 |
| `src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx` | V4-13 | 5 |
| `src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx` | V4-11 | 4 |
| `src/moduly/dokumenty/generatory/karta_na_drzwi/RendererKartyNaDrzwi.tsx` | V4-12 | 0 |
| `src/moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi.tsx` | V4-12 | 3 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/RendererListyObecnosci.tsx` | V4-09 | 0 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/UstawieniaTabeliListy.tsx` | V4-09 | 0 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/UstawieniaTytuluListy.tsx` | V4-09 | 0 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci.tsx` | V4-09 | 2 |
| `src/moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu.tsx` | V4-09 | 1 |
| `src/moduly/dokumenty/generatory/programy_szkolen/RendererPodgladuProgramu.tsx` | V4-08 | 0 |
| `src/moduly/dokumenty/generatory/programy_szkolen/RendererStronProgramu.tsx` | V4-08 | 1 |
| `src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx` | V4-08 | 9 |
| `src/moduly/dokumenty/generatory/programy_szkolen/komponenty/EdytorProgramuWysiwyg.tsx` | V4-08 | 0 |
| `src/moduly/dokumenty/replikator_dokumentow/PodgladOryginaluDokumentu.tsx` | V4-14 | 0 |
| `src/moduly/dokumenty/replikator_dokumentow/RenderujDokumentPomagiera.tsx` | V4-14 | 0 |
| `src/moduly/dokumenty/replikator_dokumentow/WidokReplikatoraDokumentow.tsx` | V4-14 | 4 |
| `src/moduly/dokumenty/wspolne/GranicaBleduGeneratora.tsx` | V4-07 | 0 |
| `src/moduly/dokumenty/wspolne/StatusZapisuDokumentu.tsx` | V4-07 | 0 |
| `src/moduly/dokumenty/wspolne/UkladGeneratoraDokumentu.tsx` | V4-07 | 8 |
| `src/moduly/dokumenty/wspolne/WyborZapisanegoUkladu.tsx` | V4-07 | 0 |
| `src/moduly/narzedzia/WidokNarzedzi.tsx` | V4-21 | 0 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/PodgladStrukturalny.tsx` | V4-21 | 0 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/WidokPoprawiaczaPrezentacji.tsx` | V4-21 | 1 |
| `src/moduly/narzedzia/poprawiacz_prezentacji/analiza/PanelAnalizy.tsx` | V4-21 | 1 |
| `src/moduly/otwarte/WidokSzkolenOtwartych.tsx` | V4-06 | 0 |
| `src/moduly/zakupy/WidokZakupow.tsx` | V4-22 | 0 |
| `src/moduly/zakupy/magazyn/EdytorLokalizacji.tsx` | V4-23 | 0 |
| `src/moduly/zakupy/magazyn/PlanMagazynu.tsx` | V4-23 | 0 |
| `src/moduly/zakupy/magazyn/WidokMapyMagazynu.tsx` | V4-23 | 2 |
| `src/moduly/zakupy/magazyn/WidokStanowMagazynowych.tsx` | V4-23 | 1 |
| `src/moduly/zamkniete/pulpit/FormularzZakupu.tsx` | V4-04 | 2 |
| `src/moduly/zamkniete/pulpit/WidokPulpitu.tsx` | V4-04 | 11 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KartaGrupySzkoleniowej.tsx` | V4-05 | 1 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KontekstBledowPol.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelDokumentowPowiazanych.tsx` | V4-05 | 1 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelPrzygotowaniaDokumentow.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelTworzeniaListObecnosci.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelWykrytychProblemow.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PasekStickySzczegolow.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PolaSzczegolow.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PoleMinutWczesniejszegoPrzyjazdu.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PoleUczestnikowGrupy.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PrzelacznikTakNie.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/SekcjaFormularza.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych.tsx` | V4-05 | 3 |
| `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx` | V4-05 | 7 |
| `src/moduly/zamkniete/szkolenia/WidokSzkolenZamknietych.tsx` | V4-05 | 0 |
| `src/moduly/zamkniete/szkolenia/generator_szczegolow/WidokGeneratoraSzczegolow.tsx` | V4-05 | 0 |
| `src/wspolne/dokumenty/AkcjeEksportuPdf.tsx` | V4-07 | 1 |
| `src/wspolne/dokumenty/EdytorSwobodnychBlokow.tsx` | V4-07 | 1 |
| `src/wspolne/dokumenty/ElementPomocniczyEdytora.tsx` | V4-07 | 0 |
| `src/wspolne/dokumenty/PanelKontroliJakosciDokumentu.tsx` | V4-07 | 9 |
| `src/wspolne/dokumenty/RendererSwobodnychBlokow.tsx` | V4-07 | 0 |
| `src/wspolne/dokumenty/WidokKopiiRoboczychGeneratora.tsx` | V4-07 | 0 |
| `src/wspolne/komponenty/AkcjeRekordu.tsx` | V4-07 | 0 |
| `src/wspolne/komponenty/ElementyInterfejsu.tsx` | V4-20 | 5 |
| `src/wspolne/komponenty/GaleriaKomponentow.tsx` | V4-20 | 2 |
| `src/wspolne/telefon/PoleTelefonu.tsx` | V4-07 | 0 |

| `src/aplikacja/layout/DockAplikacji.tsx` | V4-02 | 0 |

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

Zgodnie z późniejszym poleceniem użytkownika V4-03 obejmuje PanelLogowania, a V4-04 Pulpit. Dawny zakres szkoleń zamkniętych przypisano do V4-05 obok Szczegółów organizacyjnych. Żaden widok nie traci właściciela.

Wybór kont to natywna grupa radio z kafelkami, istniejącymi avatarami i oznaczeniami ról. Błąd korzysta ze wspólnego komunikatu error, brak kont z pustego stanu i blokady submit. Wywołanie zalogujUzytkownika i mechanizmy sesji pozostają bez zmian. Paleta jest odczytywana z istniejących ustawień także przed logowaniem. Nowe instalacje używają Emerald Dark.


## V4-04 — Pulpit

Podsumowania mają ikony i semantyczne obramowania. Zadania, paczki, formularze i priorytety korzystają z tokenów V4; wszystkie przyciski są wspólne. Zastąpiono lokalne modale/drawery wspólnym natywnym dialogiem i panelem z obsługą Escape, modalnością i powrotem fokusu, zachowując dotychczasowe callbacki operacji i warunki uprawnień. Oś przewija się w osobnym regionie, bez rozszerzania strony. Dla zagęszczonych deadline dostępna jest rozwijana lista tych samych zadań. Pozycje i algorytmy czasu oraz kolory identyfikujące zadaniodawcę i zadaniobiorcę pozostają bez zmian.

Plan tygodniowy nie istnieje w obecnym kodzie; zapisano go w docs/v4/backlog.md. Nie dodano kalendarza, modeli, dat ani nowego magazynu.
