# Ultimate Pomagier — instrukcje dla agentów

## Cel i priorytety projektu

Ultimate Pomagier jest wewnętrznym systemem operacyjnym firmy, służącym do obsługi codziennych procesów związanych ze szkoleniami i generowaniem dokumentów. Celem nie jest tworzenie demonstracyjnych ekranów, lecz możliwie szybkie doprowadzenie aplikacji do bezpiecznej, stabilnej i używalnej produkcyjnie pracy operacyjnej.

Przy wyborze między idealną abstrakcją a prostą, stabilną i rozszerzalną implementacją zgodną z istniejącą architekturą wybieraj drugą opcję. Nie uzasadnia to jednak duplikowania danych, kopiowania logiki generatorów ani lokalnych obejść mechanizmów domenowych.

Kolejność priorytetów rozwoju:

1. Stabilność obecnych przepływów i codzienna używalność aplikacji.
2. Dokończenie oraz ujednolicenie generatorów dokumentów.
3. Wyciąganie mechanik wspólnych z działających implementacji zamiast tworzenia niezależnych generatorów.
4. Rozbudowa generatorów na podstawie rzeczywistych dokumentów źródłowych.
5. Dalsze usprawnienia architektury, UX i automatyzacji.

## Hierarchia źródeł prawdy

W razie konfliktu stosuj poniższą kolejność:

1. Aktualne, jednoznaczne polecenie użytkownika.
2. Rzeczywisty stan aktualnego repozytorium.
3. Ten plik `AGENTS.md`.
4. Zaakceptowane specyfikacje danego modułu.
5. Istniejące testy i kontrakty domenowe.
6. Historyczne dokumenty oraz stare implementacje — wyłącznie jako materiały referencyjne.

Nie przywracaj automatycznie starego rozwiązania, jeśli koliduje z obecnym systemem. Najpierw ustal, czy jego funkcję należy przenieść do aktualnej architektury.

Instrukcje bliższe zmienianemu katalogowi mogą doprecyzować te zasady. Nie nadpisują jednak jednoznacznego polecenia użytkownika ani potwierdzonego modelu domenowego bez uzgodnionej migracji.

## Potwierdzony stan techniczny

- Aplikacja używa Reacta, TypeScriptu, Vite i ESLinta; kod źródłowy znajduje się w `src/`, a testy regresyjne w `testy/`.
- Interfejs i nazewnictwo domenowe są po polsku. Zachowuj tę konwencję: nowe nazwy funkcji, zmiennych, komponentów, typów i komentarzy zapisuj po polsku, chyba że wymagany zewnętrzny kontrakt narzuca inną nazwę.
- Katalogi są organizowane według obszarów: `aplikacja`, `kartoteki`, `moduly` i `wspolne`. Preferuj lokalne, modułowe zmiany zgodne z tym podziałem.
- Istnieją wspólne elementy systemu dokumentów w `src/wspolne/dokumenty/`, w tym model `Dokument`, `repozytoriumWspolnychDokumentow`, rejestr, zapis generatora, mechanizmy historii, kopii roboczych, eksportu PDF i integracji Szczegółów organizacyjnych z dokumentami.
- Generator Programów szkoleń ma centralny pipeline importu: adapter wejściowy TXT/DOCX/PDF → `WynikImportuProgramu` → staging i decyzja użytkownika → centralne zastosowanie zmian → walidacja modelu → stan formularza. Ma też własne mechanizmy autosave i kopii roboczych.
- Szczegóły organizacyjne mają sekcyjny formularz, walidację, checklistę publikacji, nawigację do pól, workflow statusów, historię oraz integrację z dokumentami przez `src/wspolne/integracje/szczegolyDoDokumentow/`.
- Kartoteki użytkowników zawierają role i uprawnienia; sesja użytkownika jest obsługiwana w `src/aplikacja/logowanie/`.
- Dane trwałe są obecnie przechowywane w `localStorage`, obok danych startowych i plików statycznych. Traktuj dane przeglądarkowe jako dane użytkownika wymagające zgodności wstecznej.

### Stan wymagający ostrożności

Wspólny model dokumentów jest kierunkiem docelowym, lecz konsolidacja nie jest pełna. Audyty w `docs/audyty/` opisują aktywne magazyny legacy i częściowo nakładające się ścieżki zapisu, zwłaszcza dla dokumentów, historii i autosave. W szczególności nie zakładaj, że wszystkie generatory są już podłączone do jednego rejestru ani że każda migracja została zakończona.

Przed zmianą storage, historii, autosave, list dokumentów lub migracji przeczytaj aktualny kod oraz właściwy audyt w `docs/audyty/`. Nie rozszerzaj obu równoległych mechanizmów. Zidentyfikuj źródło prawdy dla danego przepływu, opisz wykryty rozjazd i konsoliduj tylko wtedy, gdy zadanie wyraźnie obejmuje migrację.

## Architektura i jedno źródło prawdy

Zawsze najpierw odnajdź istniejący model domenowy, repozytorium, usługę, magazyn, hook albo komponent wspólny. Nie twórz drugiego równoległego mechanizmu tylko dlatego, że lokalna implementacja jest szybsza.

Dotyczy to w szczególności szkoleń, klientów, trenerów, programów, dokumentów, wersji dokumentów, draftów, autosave, walidacji, użytkowników, sesji, uprawnień, organizatorów, storage i rejestrów dokumentów.

Jeśli wykryjesz dwa systemy przechowujące te same dane:

1. Nie rozszerzaj obu.
2. Ustal aktualne źródło prawdy dla konkretnego przepływu na podstawie kodu i testów.
3. Zgłoś rozjazd wraz z ryzykiem.
4. Konsoliduj tylko w zakresie zatwierdzonego zadania i z migracją danych.

Kartoteki klienta, trenera i lokalizacji są źródłami danych powiązanych. Dokument może utrwalać snapshot potrzebny do historycznej treści, lecz nie powinien bez potrzeby stawać się drugim niezależnym CRM-em. Zachowuj relacje między szkoleniem, grupą, terminem, trenerem i dokumentem zgodnie z rzeczywistym modelem modułu.

Techniczne ID muszą pozostawać stabilne, jeśli uczestniczą w powiązaniach. Nie zastępuj ich indeksem tablicy. Nie eksponuj ich w UI ani nie pozwalaj ich ręcznie zmieniać bez uzasadnienia domenowego; ukrycie ID nie oznacza usunięcia go z modelu.

## System dokumentów i generatory

### Kierunek docelowy: wspólny silnik dokumentów

Nowe generatory nie powinny być niezależnymi aplikacjami z własnymi, skopiowanymi mechanizmami podglądu, zapisu, draftów, walidacji, eksportu, layoutu, wersjonowania, wyboru organizatora, importu i obsługi błędów.

Docelowy układ to:

```text
wspólny silnik dokumentów
        ↓
mechanizmy współdzielone
        ↓
konfiguracja konkretnego generatora
        ↓
specyficzne pola, szablony i reguły dokumentu
```

Istniejący model/rejestr dokumentów i wspólne integracje są fundamentem tej konsolidacji. `ProstyGeneratorDokumentu` jest współdzielonym komponentem dla części prostych generatorów, ale nie zakładaj, że pokrywa cały docelowy silnik.

Programy szkoleń traktuj jako implementację referencyjną tam, gdzie dany mechanizm jest potwierdzony w kodzie i testach — szczególnie dla pipeline importu, walidacji, podglądu i pracy z kopią roboczą. Nie kopiuj jego kodu mechanicznie; wydzielaj wyłącznie mechanizmy, które są rzeczywiście uniwersalne.

### Granica odpowiedzialności

Do warstwy wspólnej mogą należeć: tworzenie i zapis dokumentu, autosave, kopie robocze, historia i wersjonowanie tam, gdzie istnieją, walidacja, prezentacja błędów, import, eksport, druk, wybór organizatora i szablonu, layout generatora, stan formularza, integracja ze szkoleniem oraz kontrola uprawnień.

Do generatora należą: jego pola i sekcje, pytania ankiety, uczestnicy, układ listy obecności, zawartość checklisty lub karty, specyficzne reguły renderowania PDF/DOCX i szablony. Nie podnoś reguły specyficznej dla jednego dokumentu do warstwy wspólnej bez uzasadnienia.

Priorytetowe obszary generatorów to Programy szkoleń, Listy obecności, Ankiety, Checklisty paczek, Karty na drzwi oraz Dyplomy i pozostałe dokumenty.

### Nowy generator — obowiązkowa kolejność pracy

1. Zrób audyt istniejących generatorów, modeli, rejestrów, integracji i mechanizmów wspólnych.
2. Przeanalizuj dokument wzorcowy: pola, sekcje, warunki widoczności, powtarzalne grupy, branding, układ i warianty.
3. Utwórz mapę pochodzenia każdego pola: szkolenie, klient, trener, uczestnik, formularz, konfiguracja organizatora, wartość wyliczana albo ręczna.
4. Sprawdź lukę mechanik wspólnych.
5. Jeżeli mechanizm jest uniwersalny, dodaj go do warstwy wspólnej w zakresie zadania.
6. Dodaj tylko model, pola, renderowanie i reguły specyficzne dla dokumentu.
7. Zweryfikuj formularz, zapis, odczyt, draft, walidację, podgląd i właściwy eksport.

## Import i dane niepewne

Nowy format importu Programów szkoleń jest przede wszystkim nowym adapterem wejścia do istniejącego pipeline. Nie omijaj `WynikImportuProgramu`, stagingu, selekcji użytkownika, centralnego zastosowania zmian, walidacji ani istniejącego zapisu/autosave.

Importer ma przekształcać format zewnętrzny w model pośredni. Nie powinien sam zapisywać draftu, zmieniać storage, omijać walidacji ani bezpośrednio aktualizować kilku niezależnych stanów Reacta.

Inteligentnie pozyskane dane z tekstu, maila, PDF lub DOCX nie są automatycznie pewne. Przechowuj lub przekazuj wartość wraz ze źródłem i stanem pewności/wymaganej weryfikacji, jeśli model importu to obsługuje. Wykorzystuj istniejące oznaczenia niepewności, zamiast tworzyć osobny model dla każdego importera. Jeśli dany moduł nie ma potwierdzonego modelu, najpierw wykonaj audyt — nie zakładaj jego istnienia.

## Formularze, walidacja i UX

Formularze są częścią workflow operacyjnego, a nie prostym CRUD-em. Zachowuj logiczne sekcje, czytelną hierarchię, pola zależne od danych i typu szkolenia, prawidłową obsługę grup, jasne oznaczenie wymagań oraz zachowanie wpisanych danych przy błędach.

Walidacja musi być centralna, deterministyczna i testowalna. Nie rozrzucaj tej samej reguły po komponentach React i nie uzależniaj jej wyłącznie od wizualnego stanu UI. Checklisty publikacji i kompletności muszą korzystać z rzeczywistej walidacji; ich liczniki wynikają z zdefiniowanych wymagań. Jeśli moduł ma mechanizm przejścia do pola błędnego, korzystaj z niego.

Gdy model wymaga prostego przełącznika logicznego `true`/`false`, preferuj toggle switch zamiast sztucznego enuma o dwóch przeciwstawnych wartościach.

Ultimate Pomagier służy do intensywnej pracy. Priorytetem UX są szybkość, jednoznaczność, mała liczba kliknięć, zachowanie kontekstu, czytelne braki, bezpieczne poprawianie błędów i przewidywalność. Nie usuwaj istotnych informacji w imię uproszczenia i nie dodawaj dekoracji bez funkcji.

Elementy procesu, które muszą być dostępne podczas przewijania, mogą korzystać ze sticky workflow zgodnie z istniejącym wzorcem. Nie dodawaj `position: sticky` mechanicznie do wszystkich paneli.

Przy zmianach UI nie pogarszaj dostępności: używaj semantycznych przycisków, poprawnego `type="button"`, etykiet, powiązań `label`/`input`, stosownych atrybutów ARIA, fokusu i obsługi klawiatury. Nie zmieniaj typografii, spacingu, kolorów ani layoutu przy zadaniu dotyczącym logiki lub danych, jeśli nie jest to konieczne.

## Drafty, autosave, storage i migracje

Jeżeli moduł ma mechanizm draftu, autosave albo kopii roboczej, nowe funkcje muszą z niego korzystać. Nie wprowadzaj osobnego `localStorage` wewnątrz pojedynczego komponentu tylko dla szybszej lokalnej implementacji i nie duplikuj typu draftu, gdy model powinien mieszkać we wspólnej warstwie.

Każda zmiana trwałego modelu danych wymaga sprawdzenia zapisu, odczytu, normalizacji starych rekordów, serializacji, deserializacji, wartości domyślnych, migracji i zgodności istniejących danych użytkownika. Sama zmiana typu TypeScript nie jest migracją.

Nie zakładaj, że użytkownik zaczyna od pustego `localStorage`. W szczególności migracje muszą być świadome istniejących magazynów legacy, bezpieczne dla danych i objęte testami regresyjnymi. Nie usuwaj danych historycznych ani magazynów tylko dlatego, że nie znalazłeś pojedynczego importu.

## Uprawnienia, organizatorzy i eksport

Nie implementuj bezpieczeństwa samym ukrywaniem elementu UI (`display: none` lub warunek renderowania). Operacje wymagające uprawnienia mają korzystać z istniejącego modelu użytkownik → rola → uprawnienie → operacja. Nie duplikuj logiki ról w komponentach. Widoczność pola i możliwość wykonania operacji są odrębnymi zagadnieniami.

SEMPER i IIST traktuj jako warianty organizatora/brandingu, jeśli potwierdza to moduł. Preferowany model to generator + konfiguracja organizatora + szablon, a nie dwa niezależne generatory różniące się wyłącznie logotypem, nagłówkiem, stopką lub danymi organizatora.

Podgląd musi wynikać z tego samego stanu dokumentu co eksport. Dla układu „Podgląd | Edycja” wykorzystuj istniejący wspólny layout, jeżeli jest dostępny; nie buduj kolejnego separatora wyłącznie dla następnego generatora.

Rozdzielaj dane dokumentu, szablon, render i eksport. PDF oraz DOCX mogą mieć różne adaptery renderowania, ale powinny opierać się na tym samym modelu dokumentu. Nie ukrywaj logiki biznesowej wyłącznie w eksporterze. Eksport ma być deterministyczny i możliwy do objęcia regresją.

Wartości domenowe trzymaj w formie domenowej, a prezentację w warstwie UI lub eksportu: liczby jako liczby, daty jako daty/uzgodniony format, wartości logiczne jako wartości logiczne. Nie przechowuj np. ceny wyłącznie jako sformatowanego tekstu walutowego.

## Standard pracy w repozytorium

### Internet i zależności

Podczas developmentu wolno korzystać z internetu, w tym z dokumentacji, wyszukiwania informacji technicznych oraz instalowania uzasadnionych zależności npm. Nie oznacza to automatycznej zgody na wysyłanie danych Pomagiera do usług zewnętrznych ani na dodawanie telemetrii, SaaS lub produkcyjnych zewnętrznych API.

### Zmiany stanu repozytorium

Jeżeli podczas pracy zmieni się `HEAD`, `origin/main` albo working tree, nie przypisuj zmiany automatycznie „zewnętrznemu procesowi”. Gdy źródła zmiany nie można potwierdzić, opisz ją neutralnie, ponownie oceń aktualny stan repozytorium i kontynuuj z nowego punktu bazowego, jeśli jest to bezpieczne. Zatrzymaj pracę wyłącznie przy rzeczywistym ryzyku nadpisania zmian, destrukcyjnej modyfikacji historii lub konieczności decyzji użytkownika.

Przed zmianą sprawdź co najmniej:

```bash
git status -sb
git branch --show-current
git diff --check
```

Chroń istniejące zmiany użytkownika: nie resetuj ich, nie checkoutuj, nie formatuj przypadkowo, nie dodawaj do własnego commita i nie usuwaj po to, aby uzyskać czysty stan.

Nie twórz automatycznie worktree ani nowej gałęzi. Pracuj na wskazanym środowisku i nie przełączaj gałęzi bez potrzeby wynikającej z polecenia.

Bez jednoznacznego polecenia nie wykonuj `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git restore .`, `git rebase`, `git push --force`, `git branch -D` ani operacji równoważnych.

Nie zakładaj, że zadanie wymaga commita. Gdy commit jest polecony: sprawdź dokładny diff, dodaj do stage tylko pliki zadania, sprawdź staged diff, uruchom odpowiednie testy i dopiero wtedy commituj. Przy pushu sprawdź stan `origin`, użyj zwykłego push i nie stosuj force push bez jasnej zgody.

Naprawiaj problem w najwęższym sensownym zakresie bez tworzenia lokalnego obejścia naruszającego architekturę. Nie wykonuj przy okazji dużych refaktorów, masowych zmian nazw, formatowania całych katalogów, wymiany bibliotek ani przebudowy UI. Pozostałe problemy zgłoś w raporcie.

Przed usunięciem kodu sprawdź importy dynamiczne, konfiguracje, routing, testy, rejestry, lazy loading, eksporty barrel, storage, dane migracyjne i zależności historyczne. Usuwanie martwego kodu jest osobnym, świadomym zadaniem.

## TypeScript, React i błędy

Nie obchodź problemów typów przez `any`, `as any`, `@ts-ignore` lub `@ts-expect-error` bez szczególnego, udokumentowanego uzasadnienia. Preferuj poprawny model danych, type guard, union, adapter lub normalizację. Nie duplikuj istniejących typów domenowych lokalnie.

Komponent React odpowiada przede wszystkim za renderowanie, interakcję użytkownika i koordynację stanu UI. Reguły biznesowe, parsery, walidatory i adaptery, które można testować jako czyste moduły, trzymaj poza komponentem.

Nie ukrywaj błędów przez puste `catch {}`. Zapewnij przewidywalny fallback, komunikat dla użytkownika, gdy błąd wpływa na jego pracę, i ochronę aktualnych danych formularza.

## Testy, weryfikacja i raportowanie

Każda zmiana funkcjonalna wymaga proporcjonalnej ochrony regresyjnej. Preferuj test zachowania użytkownika albo reguły domenowej zamiast testu szczegółu implementacyjnego. Dla naprawy błędu: ustal przyczynę, jeśli możliwe dodaj test reprodukujący, wykonaj poprawkę i potwierdź przejście testu.

Przed zakończeniem odczytaj `package.json` i uruchom rzeczywiste, dostępne skrypty adekwatne do zakresu — standardowo odpowiedniki `npm test`, `npm run lint`, `npm run build` oraz `git diff --check`. Nie deklaruj sukcesu testów, których nie uruchomiono. Gdy pełny zestaw jest zbyt szeroki, najpierw uruchom testy zakresowe; przed commitem wykonaj pełną wymaganą weryfikację, o ile środowisko na to pozwala.

W większym zadaniu raportuj: co potwierdził audyt, przyczynę problemu, zmienione pliki, wykonane testy i pozostające ryzyka. Nie opisuj każdej komendy. Nie pisz „gotowe”, „działa”, „naprawione” ani „zweryfikowane”, jeśli właściwa kontrola nie została faktycznie wykonana.

Zmiana jest zakończona dopiero, gdy odpowiada poleceniu, nie narusza istniejących przepływów, nie powiela architektury, nie zawiera przypadkowych zmian, ma odpowiednie testy, przechodzi wymagany lint i build (jeśli dotyczą), przechodzi `git diff --check`, jej diff został przejrzany, a stan repozytorium jest jasno zaraportowany.

## Zasada na wypadek niepewności

> Jeżeli instrukcja wymaga założenia dotyczącego architektury, którego nie można potwierdzić na podstawie repozytorium, najpierw wykonaj audyt odpowiedniego przepływu. Nie twórz nowego mechanizmu wyłącznie na podstawie nazwy komponentu lub przypuszczenia. W przypadku konfliktu pomiędzy lokalnym uproszczeniem a istniejącym mechanizmem domenowym preferuj integrację z mechanizmem istniejącym.
