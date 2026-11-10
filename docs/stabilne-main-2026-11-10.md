# Stabilne main — zamknięcie integracji, 10 listopada 2026

## Potwierdzony punkt wejścia

- Lokalny HEAD i rzeczywisty zdalny `main`: `a0d89db88d8fc5bad57fa4c0fc64a4878df0351d` (odczyt `git ls-remote`). Working tree był czysty.
- Integracja UX-2 już istnieje w `45f40d6b323ffb0ee1ff54e051aa993a94d81766`, a niezależna poprawka testu menu w `95974fe1537ef6182c374d160145465cd79616a3`. Nie powtórzono cherry-pick ani integracji.
- Porównano wszystkie dziewięć plików PR #3 z `98c66a0` i `aaba499`. Kod trzech komponentów/stylów, test checklisty oraz test wydajności odpowiadają końcowemu UX. Różnice to poprawka skali w teście menu, szeregowe uruchamianie testów w CI oraz późniejsze wpisy checklist paczek w rejestrze i manifeście V4. Te późniejsze zmiany zachowano.
- Jedna przestrzeń robocza, `main` i zachowana gałąź `ux/panel-jakosci-responsywnosc` na `aaba499`. Pięć stashy pozostawiono bez zmian.
- Kopia poza repozytorium: `../_zabezpieczenia_Pomagier/stabilne-main-20261110-065541/`. Zawiera pusty diff wejściowy, manifest pustej listy modyfikacji, kopie plików zakresu, metadane HEAD/czasu i SHA-256. Nie kopiowano konfiguracji sekretów ani danych użytkownika. Logi weryfikacji zapisano w tym samym katalogu.
- [CI początkowego HEAD: SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/42640622305), [testowy instalator Windows: SUCCESS](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/42640622464). Łącznik GitHub filtruje odczyt uruchomień do PR, dlatego uruchomienia `push` odczytano przez `gh run list`.

## Przyczyny i zamknięty zakres

| Problem | Klasyfikacja | Przyczyna i rozwiązanie |
| --- | --- | --- |
| Dawne oczekiwanie szerokości menu 360 px | ZASTANY, poprawiony wcześniej w `95974fe` | Bazowy `d68f748` miał skalę 85%, szerokość CSS 280 px i przeliczenie gestu przez skalę. Playwright mierzy szerokość ekranową: 238 + 80 ≈ 318 px, zapis CSS ≈ 374 px. Oczekiwanie 360 mieszało jednostki. Kod menu i separatora nie zmienił się od tej bazy. Zachowano poprawkę i dodano test 75/85/100/130%, Home/End, granic 190–420, gestu, zapisu i odczytu po reload. Tolerancja 2 px pozostała bez zmian. |
| Przepełnienie przy 390 px / 130% | ZASTANY | Odtworzono 416 px przed otwarciem panelu i po nim. `body` wymuszało 320 CSS px × 1,3. Ekranowe minimum uwzględnia teraz skalę; druk nadal ma 320 px. Nie zmieniono szerokości desktopowych ani eksportu. |
| Przycisk jakości zasłonięty przez dock przy 768 px / 130%, z przypiętym menu | ZASTANY względem wejściowego `main`; bez przypisywania autorstwa UX-2 | Pasek sticky miał 492 px, podczas gdy nagłówek i dock ograniczały dostępną wysokość. Pasek w trybie mobilnego panelu może zająć najwyżej połowę obszaru pracy i przewija własną zawartość. Formularz pozostaje dostępny. Nie przebudowano powłoki. |
| Zajęty port 5173 runnera | ŚRODOWISKOWY | Działał istniejący serwer demonstracyjny użytkownika. Runner pozwala Vite wybrać kolejny wolny port i przekazuje rzeczywiste adresy obu swoich serwerów do testów. Nie zatrzymano cudzych procesów. |

Macierz UX obejmuje 390, 430, 768, 900, 1000, 1440 i 1920 px × 75/85/100/130%, powrót do 390 px oraz zmianę trybu z otwartym panelem. Test dotykowy obejmuje Tab/Shift+Tab/Escape, przywracanie fokusu, wybór błędu w zwiniętej grupie, odsłonięcie pola i zachowanie danych. Osobny test sprawdza przepełnienie powłoki Programów, Checklist i Szczegółów przy czterech skalach oraz szerokościach 390/430/1440/1920 px. CI obejmuje również plik testu menu.

Dowód zastanego błędu menu oparto na odczycie historycznego kodu `git show`, porównaniu niezmienionej implementacji i wcześniejszej reprodukcji opisanej w PR #3. Nie uruchamiano historycznej aplikacji przez podmianę plików ani nie tworzono worktree.

## Windows — wynik diagnostyki i zakres następnego wdrożenia

`Get-AuthenticodeSignature` rzeczywistych zainstalowanych plików `%LOCALAPPDATA%/Ultimate Pomagier/ultimate-pomagier.exe` i `uninstall.exe` (wersja 4.0.0) zwrócił **NotSigned**. Brak certyfikatu podpisującego i znacznika czasu. Nie uruchamiano instalatora ani Cargo. Podpis aktualnego instalatora NSIS nie został ponownie zmierzony — pliku nie znaleziono w lokalnym katalogu artefaktów tej przestrzeni roboczej.

Istniejący `desktop-windows.yml` buduje na `windows-2022`, wykonuje testy, przygotowuje NSIS i przechowuje artefakty. `desktop:release --podpisane` sprawdza tag, czystość źródeł i klucze Tauri; generuje `.sig`, sumy i manifesty aktualizacji. `tauri.conf.json` nie konfiguruje Authenticode: brak certyfikatu, polecenia podpisującego i serwera czasu. Publikacja sprawdza metadane, sumy i obecność podpisu Tauri; **nie ma bramy wymagającej prawidłowego Authenticode**. Updater wymaga podpisanej wersji i nie powinien być wyłączany ani zastępowany.

Praktyczna ścieżka wdrożenia w istniejącym workflow, bez lokalnego Cargo:

1. Właściciel/IT wybiera i uzyskuje zaufany certyfikat Code Signing lub usługę podpisywania z kluczem w HSM. Preferowana usługa powinna obsługiwać federację GitHub OIDC, aby prywatny klucz pozostawał poza repozytorium i runnerem. Nie zakłada się posiadania certyfikatu, kwalifikacji do konkretnej usługi ani zgody na zakup.
2. Podpisywanie udostępnić wyłącznie zatwierdzanym buildom wydania z istniejącego `main` i tagu, w chronionym środowisku GitHub. Nadać minimalne uprawnienia do podpisu; OIDC `id-token: write` tylko zadaniu wymagającemu federacji. Buildy PR/testowe nie otrzymują poświadczeń. Pozostawić dotychczasową ręczną bramę publikacji.
3. Po wyborze dostawcy podłączyć jego narzędzie do `bundle.windows.signCommand` przez generowane nadpisanie konfiguracji w `budujDesktop.mjs`. Lokalny schemat zainstalowanego Tauri obsługuje `{ cmd, args }` i argument `%1`. Wymagać SHA-256 oraz zaufanego znacznika czasu RFC 3161. Dla certyfikatu dostępnego w magazynie Windows schemat udostępnia także `certificateThumbprint`, `digestAlgorithm`, `timestampUrl` i `tsp`; nie oznacza to, że certyfikat jest obecnie dostępny.
4. Podpisywać EXE aplikacji przed osadzeniem w NSIS, następnie końcowy instalator. Sprawdzić również podpis deinstalatora wygenerowanego przez NSIS. Wszystkie operacje zmieniające bajty instalatora muszą zakończyć się przed podpisem aktualizacji Tauri, obliczeniem SHA-256 i zapisaniem manifestów. Nie dopisywać Authenticode dopiero po wygenerowaniu istniejącego `.sig`.
5. Na Windows uruchamiać `Get-AuthenticodeSignature` i `signtool verify /pa /all /v` dla końcowych artefaktów. Wymagać `Valid`, zatwierdzonego wydawcy/łańcucha, przeznaczenia Code Signing i znacznika czasu. Błąd/brak podpisu przerywa budowę oficjalnego wydania i blokuje przekazanie do publikacji. Zapisać raport bez sekretów; powiązać go z wersją, SHA commita i sumą końcowego instalatora. Brama publikacji musi wymagać dowodu weryfikacji odpowiadającego dokładnie tym bajtom.
6. Dodać testy odrzucenia braku podpisu, nieprawidłowego podpisu, zmienionego pliku i niezgodnych metadanych. Odebrać instalację na zatwierdzonym Windows oraz aktualizację pomiędzy dwiema podpisanymi wersjami, z zachowaniem danych. Dopiero wtedy zatwierdzić oficjalne wydanie. Nie wyłączać Smart App Control ani polityk firmowych.

To specyfikacja kolejnego, kontrolowanego zadania. Nie wdrożono nowej usługi, certyfikatu, płatnego zasobu ani zmiany procesu publikacji.

## Jeden rejestr zaległości

| ID | Zadanie | Warunek zakończenia | Stan |
| --- | --- | --- | --- |
| UP-01 | Finalizacja UX-2 | Zatwierdzone zmiany bez regresji | Zakończone lokalnie: funkcjonalność zachowana w `45f40d6`; ponowna weryfikacja PASS. |
| UP-02 | Naprawa testu menu | Test stabilny, przyczyna wyjaśniona | Zakończone lokalnie: poprawka `95974fe` zachowana; trzy pełne uruchomienia po 2/2 PASS. |
| UP-03 | Kontrola skali 130% | Naprawa lub udokumentowane ograniczenie | Zakończone lokalnie: poprawka minimum powłoki i dostępności paska; rozszerzona macierz PASS. |
| UP-04 | Stabilizacja main | Czysty working tree i poprawne testy | Kontrole PASS; końcowy stan po commitach podaje raport operacji. |
| UP-05 | Synchronizacja GitHub | Zweryfikowany push i CI | Wymaga zgody na push nowych commitów i kontroli CI tego HEAD. |
| UP-06 | Zamknięcie starego PR UX | Wszystkie zmiany zachowane na main | PR #3 pozostaje otwarty; zamknąć bez merge po zatwierdzonym pushu i kontroli zdalnego main. |
| UP-07 | Authenticode Windows | Działające podpisywanie i weryfikacja | Brak konfiguracji Authenticode; certyfikat i metoda do uzgodnienia z właścicielem/IT. |
| UP-08 | Oficjalne wydanie | Zweryfikowany instalator i aktualizator | Zależne od UP-05/07 i odbioru instalacji/aktualizacji. Publikacji nie uruchamiano. |

Przygotowany tekst przyszłego komentarza do PR #3: „Funkcjonalności PR z `98c66a0` i `aaba499` zachowano przez bezpośrednią integrację na main w `45f40d6b323ffb0ee1ff54e051aa993a94d81766`. Niezależną korektę testu skali menu zawiera `95974fe1537ef6182c374d160145465cd79616a3`. Po potwierdzeniu końcowych commitów tej operacji na zdalnym main PR zostaje zamknięty jako zastąpiony integracją bezpośrednią, bez ponownego merge.” Przed wysłaniem dopisać końcowy SHA i wynik CI. Komentarza jeszcze nie opublikowano.

## Końcowa walidacja

| Wykonana kontrola | Wynik | Liczba / zakres |
| --- | --- | --- |
| `npm test` | PASS | 813 testów raportowanych przez Node w 53 raportach oraz pozostałe skrypty asercyjne bez wspólnego licznika; obejmuje import/autosave/model Programów, walidację i rejestr V4. |
| `npm run lint` | PASS | Pełny ESLint. |
| `npm run build` | PASS | TypeScript i Vite. |
| `npm run test:desktop` | PASS | 16/16. |
| `npm run test:dystrybucja` | PASS | 15/15. |
| Pełny zestaw `npm run test:e2e -- --test-concurrency=1 …` | PASS | 42/42 z podtestami: menu, import, podgląd, Szczegóły/jakość, checklisty i backup E4. |
| `npm run test:szczegoly:przegladarka` | PASS | Osobne 13/13, uruchomione z adresami serwerów istniejącego runnera. |
| `paneleBoczne.przegladarka.test.mjs` | PASS | 2/2 w pełnym zestawie i dwa dodatkowe uruchomienia po 2/2; łącznie trzy kolejne udane przebiegi. |
| `ustawieniaProgramu.przegladarka.test.mjs` | PASS | 1/1: ustawienia, zachowanie wartości i PDF. |
| `git diff --check` | PASS | Brak błędów whitespace. |

Nie sumować powtórzeń i podzbiorów z pełnym zestawem. Pierwsze pomocnicze wywołanie zagnieżdżonych kontroli odziedziczyło `NODE_TEST_CONTEXT`, więc Node pominął testy potomne; jego pozornego wyniku 3/3 **nie zaliczono**. Powtórzenie po usunięciu tej zmiennej wyłącznie ze środowiska procesów potomnych rzeczywiście uruchomiło 13 + 2 + 2 + 1 testów. Pomocniczy plik i wszystkie logi są poza repozytorium. Pierwotna reprodukcja 390 px / 130% była FAIL przed poprawką; końcowe kontrole tego przypadku są PASS. Początkową kolizję portu zaliczono do problemów środowiskowych, a nie niepowodzeń aplikacji.

Niewykonane: push, CI nowych commitów na GitHub, publikacja/zamykanie PR, nowy build Cargo/NSIS, podpisywanie Authenticode, instalacja i rzeczywista aktualizacja Windows oraz odbiór na fizycznym telefonie. Nie są oznaczone jako PASS. Ostrzeżenie Vite o dużych chunkach jest zastane i nie stanowi błędu kompilacji. Testy mobilne używają emulacji Chrome; nie zastępują odbioru na fizycznym telefonie lub w natywnym WebView2.
