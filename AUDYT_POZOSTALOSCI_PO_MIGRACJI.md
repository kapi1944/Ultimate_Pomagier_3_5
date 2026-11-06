# Audyt pozostałości po migracji folderów

Data audytu: 2026-11-06  
Zakres: wyłącznie analiza, kopia zabezpieczająca i raport. Nie wykonano integracji, commitów ani pushowania.

## A. Stan repozytoriów

| Folder | HEAD / gałąź | Remote i stan lokalnych referencji | Zmiany robocze |
|---|---|---|---|
| `Ultimate_Pomagier_3_5` | `b93ea23f9f1bf9985966d4c3319233aced6bdea1`, `main` | `origin` = `https://github.com/kapi1944/Ultimate_Pomagier_3_5.git`. Lokalny `origin/main` wskazuje `780a9a4`, więc ten klon pokazuje `main` jako 7 commitów za swoim refem origin. | 16 zmienionych śledzonych plików, 13 plików nieśledzonych (29 ścieżek plików łącznie), bez usunięć. |
| `Ultimate_Pomagier_4_aktualny` | `e05d58f5a7bfb8d36c832db3439c062dfe93097c`, `main` | Ten sam URL `origin`; lokalny `origin/main` wskazuje dokładnie ten sam commit co HEAD. HEAD jest 8 commitów potomkiem starego HEAD. | Przy pierwszej inwentaryzacji czysty. Podczas audytu końcowa kontrola wykazała lokalną zmianę w `.github/workflows/pakiet-offline-pdf-lib.yml`; jej nie ruszałem. |

To dwa osobne klony lokalne o tym samym URL origin, ze wspólną historią. Nie potwierdzałem aktualnego stanu GitHub przez sieć: instrukcje repozytorium zakazują internetu. Wnioski o origin dotyczą wyłącznie lokalnych refów remote-tracking; nie są sprawdzeniem live GitHub.

Stary klon ma 5 lokalnych gałęzi poza `main` (`codex/integracja-v4-desktop`, `codex/plan-dnia-24h`, `etap-4c/domkniecie-dynamicznych-pol-i-walidacji`, `feat/ultimate-pomagier-v4`, `fix/walidacja-sekcji-i-porownanie-wersji`). Wskazuje jedną skrytkę oraz dodatkowy worktree w `C:/Users/madej/.codex/worktrees/kompletowanie-paczek/Ultimate_Pomagier_3_5`, na gałęzi `feat/ultimate-pomagier-v4`. Aktualny klon ma tylko lokalną gałąź `main` i jeden worktree. Lokalna gałąź funkcji pakietów istnieje zatem w starym repo/worktree; nie jest gałęzią aktualnego klonu.

### Zabezpieczenie starych zmian

Kopia jest poza oboma repozytoriami:

`C:\Users\madej\AppData\Local\Packages\sandbox.{e5f72521-f841-41ec-9e6b-c75fcfd0214f}\AC\Temp\Ultimate_Pomagier_3_5_audyt_ba9a62be64844fb1ade10b0bf692c816`

Zawiera binarny patch śledzonych plików, kopie wszystkich 13 nieśledzonych plików, metadane, listę usunięć (pusta) i manifest SHA-256. Nie kopiowano plików `.env*` ani katalogów generowanych. SHA-256 patcha: `EA9D37784606FD310180711D047F654B27DA3C3CB9058DD1377711CA187C780E`. Sumy pozostałych plików są w `manifest-sha256.json`; sam manifest ma SHA-256 `3C89B9A3EB02F5F078EF5C1A0D57D9096EC486DC7FA12EC3F91818D7BF0B14B8`.

## B. Inwentaryzacja 29 plików

| # | Ścieżka w starym folderze | Semantyczna ocena względem aktualnego projektu |
|---:|---|---|
| 1 | `docs/v4/manifest-widokow.json` | Dopisuje/koryguje rejestr widoków. Manifest aktualny ma późniejsze i szersze zmiany; nie zastępować całego pliku. Zmiana dokumentacyjna. |
| 2 | `docs/v4/rejestr-widokow.md` | Aktualizuje dokumentacyjny rejestr widoków; obecny rejestr ma późniejsze wpisy. Ewentualnie przenieść pojedyncze brakujące wpisy. |
| 3 | `package.json` | Dodaje `pdf-lib@1.17.1` i skrypty testów pakietu. Aktualny plik ich nie ma. Zależność jest potrzebna nowemu scalaczowi, ale wpływa na instalację aplikacji. |
| 4 | `package-lock.json` | Dodaje pdf-lib i zależności pośrednie. Nie przenosić niezależnie od zatwierdzenia runtime feature i lockfile. |
| 5 | `src-tauri/src/lib.rs` | Rejestruje komendę Tauri do natywnego zapisu PDF; brak odpowiednika w aktualnym Tauri. |
| 6 | `src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx` | Mała zmiana klasy CSS wydruku dla „Pakiet CRM”. Aktualna checklista i testy już obsługują tę kategorię; sprawdzić dokładny selektor, nie przenosić całego widoku. |
| 7 | `src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx` | Wydziela odczyt zapisu i dodaje renderer dyplomów do pakietu: anonimowy wzór lub seria. Aktualny generator nie eksportuje tego adaptera. |
| 8 | `src/moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi.tsx` | Eksportuje renderer istniejącego zestawu kart do użycia w agregatorze. Aktualny renderer istnieje, lecz nie ma adaptera pakietu. |
| 9 | `src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx` | Dodaje walidujący renderer programu do eksportu pakietowego, używając istniejącego modelu i layoutu. Brak w aktualnej wersji. |
| 10 | `src/moduly/dokumenty/generatory/programy_szkolen/rejestrProgramowSzkolen.ts` | Eksportuje `polaczProgram`, by adapter mógł odtworzyć zapis. Aktualny plik ma nowszą treść, ale funkcja nie jest eksportowana. |
| 11 | `src/moduly/dokumenty/generatory/programy_szkolen/usePaginacjaProgramu.ts` | Zmienia pomiar elementu tak, by nie wymagał globalnego `HTMLElement`; przydatne dla obcego kontekstu dokumentu. Aktualny kod nadal ma kontrolę `instanceof HTMLElement`. Kandydat na niezależną poprawkę z regresją. |
| 12 | `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelPrzygotowaniaDokumentow.tsx` | Dodaje wejście do lazy-loaded generatora zbiorczego PDF, obsługę fokusu po zamknięciu i wersję pakietu. Aktualny panel tworzy dokumenty/rejestrowane zestawy, ale nie łączy ich w jeden PDF do zatwierdzenia. |
| 13 | `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx` | Przekazuje aktualne dane formularza i grupy do generatora pakietu. Brak takiego panelu w aktualnym widoku. |
| 14 | `src/wspolne/dokumenty/eksportPdf.ts` | Wydziela render zwracający obiekt jsPDF, zachowując osobne pobieranie. Aktualny eksport nie zwraca PDF wywołującemu. |
| 15 | `src/wspolne/dokumenty/eksportPdfLegacy.ts` | Analogicznie zwraca rastrowy PDF i dostosowuje viewport do iframe. Aktualna wersja tego nie robi; ryzyko dotyczy wyglądu i wymiarów eksportu. |
| 16 | `src/wspolne/dokumenty/semantykaPdf.ts` | Dodaje sprawdzanie klas DOM z `defaultView` iframe. Aktualny kod używa globalnych klas; sortowanie dzieci w starej zmianie nadal odwołuje się do globalnego `window.getComputedStyle`, więc rozwiązanie cross-realm wymaga domknięcia i testu. |
| 17 | `src/wspolne/dokumenty/pakietyDoZatwierdzenia/modelPakietu.ts` (nowy) | Model konfiguracji, metadanych, stanów dokumentów, wyboru/kolejności po ID, grup i walidacji aktualności. Korzysta z autosave wspólnego repozytorium dokumentów. Brak agregatora w aktualnym kodzie. |
| 18 | `src/wspolne/dokumenty/pakietyDoZatwierdzenia/przygotujPakiet.ts` (nowy) | Sekwencyjny render z postępem/anulowaniem, kontrola sygnatury źródeł i pobranie w przeglądarce lub Tauri. |
| 19 | `src/wspolne/dokumenty/pakietyDoZatwierdzenia/renderujDokumentPakietu.tsx` (nowy) | Adaptery odtwarzają wybrane zapisane generatory do PDF i sprawdzają błędy eksportu. |
| 20 | `src/wspolne/dokumenty/pakietyDoZatwierdzenia/scalPakietPdf.ts` (nowy) | Scala PDF bez rasteryzacji; tworzy opcjonalną stronę tytułową, spis, separatory grup i oznaczenie „DO ZATWIERDZENIA”. Używa pdf-lib. |
| 21 | `src/wspolne/dokumenty/pakietyDoZatwierdzenia/PanelPakietu.tsx` (nowy) | UI wyboru dokumentów i grup, kolejności, opcji oraz przygotowania/pobrania. |
| 22 | `src/wspolne/dokumenty/pakietyDoZatwierdzenia/PodgladPakietu.tsx` (nowy) | Podgląd stron PDF i komunikaty/postęp procesu. |
| 23 | `src/wspolne/dokumenty/pakietyDoZatwierdzenia/pakietPdf.css` (nowy) | Style panelu i podglądu z wierszy 21–22. |
| 24 | `src-tauri/src/pakiety_pdf.rs` (nowy) | Ogranicza wywołanie do okna `obszar` lub `main`, zapisuje do Pobrane na desktopie i odmawia zapisu na Androidzie. |
| 25 | `src-tauri/src/zapis_pdf.rs` (nowy) | Waliduje nazwę, nagłówek PDF i limit 100 MB; tworzy plik bez nadpisywania oraz zawiera test Rust. |
| 26 | `testy/danePakietuPdf.ts` (nowy) | Fixture danych pakietu i grup. |
| 27 | `testy/wyborPakietuPdf.test.ts` (nowy) | Testuje powiązania, wybór/kolejność, autosave, grupy, błędne stany i sygnaturę. |
| 28 | `testy/scalaniePakietuPdf.test.ts` (nowy) | Testy scalania, stron, spisu, grup, formatów oraz anulowania. |
| 29 | `testy/pakietyPdf.przegladarka.test.mjs` (nowy) | Testy UI, podglądu, pobrania, grup i adapterów. |

Unikalny bilans wynosi **16 zmienionych śledzonych plików + 13 nowych plików = 29**. Lista zabezpieczonych ścieżek w manifeście kopii jest rozstrzygająca.

## C. Odzyskiwanie funkcjonalności

| Funkcjonalność | Stary folder | Aktualny folder | Status | Priorytet | Rekomendacja |
|---|---|---|---|---|---|
| Zbiorczy, wersjonowany PDF do przeglądu/zatwierdzenia | Nowy moduł: wybór dokumentów z rejestru, kolejność, zakres grup, stan gotowości, render adapterami, scalanie i podgląd | Brak. Są istniejące dokumenty/pakiety zapisów w rejestrze oraz tworzenie pojedynczych dokumentów ze Szczegółów | **ODZYSKAĆ** | Wysoki | Zachować ideę i testy; integrować przez aktualny rejestr oraz aktualne komponenty. Nie kopiować całego katalogu bez przeglądu. |
| Eksport wielu istniejących dokumentów w jednym PDF | Zależność pdf-lib, scalacz, strona tytułowa, spis, grupy, watermark | Aktualny eksport daje pojedynczy PDF; nie ma agregatora | **ODZYSKAĆ** | Wysoki | Wydzielić agregację po potwierdzeniu zależności i kontraktu eksportu. Uzgodnić jakość/limit wielkości i zachowanie po błędzie. |
| Zapis natywny PDF w Tauri | Nowa komenda i bezpieczny zapis bez nadpisania; Android ma jawny błąd | Brak | **SCALIĆ CZĘŚCIOWO** | Średni | Zachować walidację nazwy, walidację PDF i bezpieczne tworzenie pliku. Sprawdzić obecne granice uprawnień/capabilities Tauri przed integracją. |
| Adaptery istniejących generatorów (program, lista, ankieta, certyfikat/dyplom, karta, checklista) | Renderer pakietu oparty na zapisanych dokumentach | Generatory i wspólny rejestr istnieją; adapterów do agregatora brak | **SCALIĆ CZĘŚCIOWO** | Wysoki | Renderować dokładnie snapshot z rejestru, testować wszystkie typy, strony, grupy i certyfikat „wzór/wszyscy”. |
| Bazowe tworzenie dokumentów z Szczegółów | Zmiany podłączają dodatkowy przycisk do istniejącego panelu | Już działa przez `fabrykiDokumentowZeSzczegolow`, panel i testy | **JUŻ WDROŻONE** (funkcja bazowa) | Niski | Nie odzyskiwać starej fabryki; potraktować nowy pakiet PDF jako kolejny przepływ. |
| Cross-realm pomiary/eksport w iframe | Zmiany w paginacji, rendererach PDF i semantyce | Aktualny kod eksportu pozostaje bez tych adaptacji | **SCALIĆ CZĘŚCIOWO** | Średni | Wydzielać tylko niezbędne poprawki i dodać regresję iframe. Stary renderer semantyczny nadal używa globalnego `window.getComputedStyle` w sortowaniu potomków, więc zmiany nie są kompletnym rozwiązaniem cross-realm. |
| Zmiany dokumentacji widoków | Modyfikują manifest i rejestr | Aktualna dokumentacja ma dalsze, różniące się zmiany | **SCALIĆ CZĘŚCIOWO** | Niski | Przenieść jedynie brakujące, aktualne wpisy po porównaniu, nie zastępować plików. |
| Zmiana klasy wydruku checklisty | Mała korekta w widoku | Aktualny moduł ma kategorię Pakiet CRM i testy regresyjne | **WYMAGA DECYZJI** | Niski | Zweryfikować diff klasy z aktualnym CSS i kontraktem testu przed odzyskaniem; sama nazwa klasy nie uzasadnia kopiowania. |

Nowa funkcja PDF nie zastępuje istniejących dokumentów ani workflow checklist. Nie znaleziono nowszego odpowiednika agregatora. Przeniesienie starych plików wprost grozi konfliktami w wersjach widoków, rejestrze programów i panelu Szczegółów; bieżące moduły są nowsze niż punkt bazowy starych zmian.

## D. Workflow `.github/workflows/pakiet-offline-pdf-lib.yml`

Workflow uruchamia się wyłącznie ręcznie przez `workflow_dispatch`, z uprawnieniem `contents: read`. Checkoutuje repozytorium, konfiguruje Node 24, wykonuje `npm install pdf-lib@1.17.1` z publicznego npm, sprawdza import i działanie biblioteki, uruchamia build, audit i TypeScript, zbiera pdf-lib wraz z zależnościami opisanymi w package-lock, pakuje ZIP i publikuje artifact na 30 dni.

Ocena:

- Nie obchodzi blokady sieci ani ENOTFOUND. Instalacja zależy od dostępu runnera do `registry.npmjs.org`; gdy DNS/rejestr jest niedostępny, workflow zatrzyma się przed utworzeniem artefaktu. Może pomóc tylko wtedy, gdy GitHub-hosted runner ma dostęp do npm, a użytkownik może pobrać Actions artifact.
- Artefakt zawiera paczki pdf-lib i ich zależności, manifesty `package.json`/lock oraz instrukcję kopiowania. Nie jest pełnym archiwum wszystkich zależności aplikacji. Celuje w offline’owe dostarczenie nowej biblioteki, a nie w naprawę lokalnego DNS.
- `npm install` instaluje zależności projektu i może wykonywać skrypty lifecycle zależności; nie używa cache z npm ci. Wymaga publicznego rejestru i może zmienić lock w efemerycznym runnerze. Nie zapisuje zmian do repozytorium.
- Dołączone są npm audit i weryfikacja importu/build. Workflow nie ujawnia tokenów, nie deklaruje sekretów, używa wyłącznie read permission i publikuje ZIP jako artifact Actions. Nie można na podstawie statycznego odczytu potwierdzić, że GitHub pomyślnie uruchomił go lub artefakt jest dostępny.
- Istniejący `.github/workflows/desktop-windows.yml` też buduje, testuje i publikuje artifact, ale dla instalatora Windows. Nowy workflow nie dubluje artefaktu/produktu; powtarza część build i kontroli zależności.
- Podczas audytu wykryto niezależną lokalną edycję tego workflow: dodano trap sprzątający plik TS oraz flagę `tsc --ignoreConfig`. Pozostawiłem ją nienaruszoną. Nie należy jej przypisywać zmianom ze starego folderu ani dołączać do integracji bez osobnego przeglądu.

Wniosek: workflow jest ograniczony uprawnieniami i używa wersji pdf-lib przypiętej dokładnie w instalacji, lecz pozostaje zależny od npm i nie rozwiązuje lokalnego `ENOTFOUND registry.npmjs.org`. Dla powtarzalności łańcucha dostaw w razie wdrożenia lepszym źródłem prawdy byłby zatwierdzony lockfile i `npm ci`; dla paczki offline trzeba osobno zdecydować sposób pozyskania jej bez sieci i weryfikacji sum.

## E. Ryzyka i plan integracji

1. **Decyzja produktowa:** potwierdzić, czy wymagany jest osobny PDF do zatwierdzenia, jakie typy dokumentów obejmuje i czy domyślnie dołącza wzór czy serię imienną. Nie mieszać go z „pakietem” checklisty, checklistami paczek ani istniejącym tworzeniem wielu dokumentów w rejestrze.
2. **Kontrakt i model:** zaakceptować konfigurację po szkoleniu z autosave w repozytorium dokumentów; ustalić zachowanie przy usuniętym, zarchiwizowanym, roboczym lub nieaktualnym dokumencie. Stary kod blokuje część stanów i zachowuje wybrane usunięte ID, co trzeba utrzymać albo świadomie zmienić.
3. **Eksport pojedynczy jako źródło:** dodać/wykorzystać bezpieczne API zwracające bajty PDF bez zmiany zwykłego pobrania; sprawdzić deterministyczność, fonty, obrazy i render iframe.
4. **Scalanie:** dodać pdf-lib zgodnie z polityką zależności, implementować stronę tytułową/spis/grupy/oznaczenie i walidację kompletności. Zachować oryginalne strony bez rasteryzacji. Ocenić limit 100 MB i pamięć przeglądarki.
5. **Adaptery i UI:** integrować po jednym typie dokumentu, zaczynając od programu i listy, potem ankieta, karta/checklista oraz certyfikat/dyplom; korzystać z istniejących modeli i wersji z rejestru. Nie podmieniać currentowych widoków całymi starszymi plikami.
6. **Zapis Tauri:** dodać command/capability w zgodzie z aktualną konfiguracją, testować collision bez nadpisania, traversal, nie-PDF, limit bajtów, błąd I/O i zachowanie Androida.
7. **Regresja i rollout:** testy jednostkowe konfiguracji, walidacji, sygnatury, stron/spisu i native save; przeglądarkowe testy wielogrupowe i pobierania; później pełne testy, lint/build i Rust CI. Zrobić to dopiero w osobnym zadaniu wdrożeniowym.

Ryzyko całościowej integracji: **średnio-wysokie** (nowa zależność runtime, wiele generatorów, przechowywanie konfiguracji oraz Tauri). Rozłożenie na powyższe etapy ogranicza ryzyko.

## F. Testy i kontrole

### Wykonane

- Inwentaryzacja Git w obu klonach: status, gałąź, remotes, HEAD, log, diff, pliki nieśledzone, branch refs, worktrees, stash i merge-base.
- `git diff --check` dla starego klonu: brak błędów whitespace; Git zgłosił tylko ostrzeżenia o konwersji LF/CRLF.
- Stare testy PDF: `wyborPakietuPdf.test.ts` i `scalaniePakietuPdf.test.ts` — **16 zaliczonych**. Zaobserwowano ostrzeżenie pdfjs o braku `standardFontDataUrl`, testy przeszły.
- Aktualne testy fabryki dokumentów ze Szczegółów — **8 zaliczonych**.
- Aktualne testy `eksportPdf.test.ts` — **12 zaliczonych**.
- Aktualne testy `eksportPdfSemantyczny.test.ts` — **4 zaliczone**.
- Aktualne `checklistaPaczki.regresja.test.ts` — **47 zaliczonych, 2 pominięte**.
- Łącznie z tych czterech aktualnych suites: 71 zaliczonych i 2 pominięte.
- Sprawdzono, że stary katalog ma zainstalowane `pdf-lib`; nie instalowano niczego i nie modyfikowano lockfile.

### Nieudane / nieuruchomione

- `pakietyPdf.przegladarka.test.mjs` — nie wystartował: brak modułu `playwright` w starym `node_modules`. Zgodnie z zakresem nie instalowałem zależności.
- Test Rust zapisu PDF uruchomiono offline z `--locked` i katalogiem target poza repozytoriami; kompilacja przerwała się przed testem, bo Windows App Control zablokował wykonanie `build-script-build` (os error 4551). To ograniczenie środowiska, a nie wynik testu kodu.
- Nie uruchamiano pełnego `npm test`, lint ani build — to audyt zmian, nie implementacja; wybrano testy bezpośrednio dotyczące istniejącego odpowiednika i pakietu.
- Workflow GitHub Actions nie uruchamiano, bo wymaga zdalnego runnera i dostępu npm. Brak weryfikacji CI/artefaktu.
- Testy Androida nie istnieją dla natywnego zapisu pakietu; stary kod jawnie odmawia zapisu na Androidzie.
- Brak testu regresyjnego dla zmiany paginacji i eksportu cross-realm, poza statycznym przeglądem.
- Testy już istniejące w aktualnym repo potwierdzają tworzenie dokumentów, ale nie scalanie ich w jeden PDF.

## G. Podsumowanie

- Zidentyfikowane: **29 plików** (16 śledzonych zmian + 13 nowych plików), bez usunięć.
- Warta odzyskania funkcjonalność: **1 główna** — konfigurator i generator zbiorczego PDF do zatwierdzenia; składa się z UI, adapterów, scalania, native save i testów.
- Funkcjonalność bazowa już obecna: **1** — tworzenie i rejestracja powiązanych dokumentów ze Szczegółów; nie tworzy jednak zbiorczego PDF.
- Nieaktualne pełne implementacje: **0** zidentyfikowanych; są jednak starsze warianty plików, których nie należy kopiować w całości, oraz dokumentacja wymagająca selektywnego uzgodnienia.
- Zmiany wymagające decyzji: **1 zakres funkcji** — zatwierdzić sam produktowy przepływ pakietu PDF i domyślny zakres dyplomów/certyfikatów.
- Szacowane ryzyko integracji: **średnio-wysokie**.
- Rekomendacja: odzyskać funkcję etapami po zatwierdzeniu osobnego zadania; użyć aktualnych modeli i rejestru jako źródła dokumentów, a testy starego klonu traktować jako specyfikację zachowania. Na tym etapie niczego nie scalono.




