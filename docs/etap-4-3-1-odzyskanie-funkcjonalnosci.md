# Etap 4.3.1 — odzyskanie brakujących funkcjonalności

Data: 26.10.2026. Punkt odniesienia: raport 4.3.0 oraz `main` na `a1fef0f27bfda94e3df114f4a8012b6b242da40b`.

## Zakres i zależności

Przeanalizowano wyłącznie siedem pozycji B, trzy D i ich bieżące odpowiedniki. Trzy pliki generatora były zgodne z bazą starszych zmian, co pozwoliło przenieść odpowiednie fragmenty, a następnie dostosować je do obecnych kontraktów. Nie wykonywano audytu całej aplikacji.

Zależności wdrożenia: indeks istniejącej kartoteki → pamięć walidacji grup i stabilne callbacki hooka → memoizacja kart i lokalny kontekst błędów → podłączenie widoku → testy regresyjne i przeglądarkowe. Archiwalny raport jest niezależny od kodu wykonawczego.

Indeks jest wyłącznie migawką w pamięci. Kartoteka lokalizacji pozostaje źródłem prawdy; nie dodano storage, migracji ani drugiego repozytorium. Zgodnie z wcześniejszym audytem nie konsolidowano istniejących magazynów dokumentów/autosave. Pozostawiono bieżące mechanizmy zapisu i kopii roboczych.

## Wynik siedmiu pozycji B

| Funkcjonalność | Poprzedni stan | Nowy stan | Wynik testów |
| --- | --- | --- | --- |
| Walidacja i wydajność hooka | Walidacja wszystkich grup po zmianie danych formularza; niestabilne callbacki | Osobna walidacja danych i grup; pamięć wyników według obiektu i pozycji grupy, odtwarzana po zmianie indeksu; stabilne callbacki i mapa błędów | Pełne regresje oraz przeglądarkowe scenariusze edycji, zmiany statusu i eksportu |
| Karty grup | Odczyt lokalizacji per karta; wielokrotne liczenie duplikatów trenerów; renderowanie przy edycji tytułu | Wspólny indeks lokalizacji, liniowe zliczanie nazw trenerów, memoizacja kart i błędy ograniczone do konkretnej grupy | Edycja sześciu grup, niezależne błędy dat/uczestników, pola zależne, duplikowanie i usuwanie; brak renderowania kart przy wpisywaniu długiego tytułu w wykonanym pomiarze |
| Widok generatora | Powtarzane podpowiedzi miast i niestabilny callback checklisty | Memoizacja podpowiedzi, szybka obsługa pustej frazy, stabilny callback, jawne odświeżenie kontroli jakości | Test przeglądarkowy i pełne testy integracji dokumentów |
| Indeks lokalizacji | Liniowe wyszukiwanie i pełne filtrowanie | Map dla jednoznacznych nazw; adres z kodem, polskie znaki, brak dopasowania przy duplikatach, limit 50 z wcześniejszym zatrzymaniem; migawka wykrywa zmiany danych | 5/5 testów indeksu oraz test aktualności kartoteki przed zapisem i po odzyskaniu fokusu |
| Testy regresyjne indeksu | Brak | Odzyskane i rozszerzone o pustą nazwę, zmianę istniejącego obiektu, kolejność i usunięcie lokalizacji; uruchamiane w `pretest` | 5/5 |
| Testy przeglądarkowe wydajności | Scenariusz wyłącznie w starym katalogu, zależny od dawnego logowania DEV | Dwa scenariusze korzystające z istniejącego przycisku demonstracji i świeżych kontekstów Chrome, z syntetycznymi danymi | 2/2; autosave, ręczny zapis, zachowanie pól niepewnych i stabilnych ID, odświeżanie lokalizacji, status kompletności, blokada oraz poprawny eksport JSON |
| Archiwalne wyniki etapu 4.2.0 | Uzupełnienie tylko w starym katalogu | Odzyskane w pierwotnym dokumencie z wyraźnym oznaczeniem historycznych wyników i starego SHA | Porównanie z odzyskaną treścią; nie przypisano dawnych wyników obecnej wersji |

Adaptacje względem starszego rozwiązania:

- Indeks przechowuje kopie wartości, aby zmiana istniejącego obiektu lokalizacji nie zmieniała niezauważenie migawki. Pusta nazwa nie dopasowuje pustego pola formularza.
- Kontrola jakości przed zapisem, publikacją i eksportem odczytuje aktualną kartotekę. Wynik obejmuje deduplikowane problemy całego modelu sekcyjnego, w tym pola niepewne, a nie tylko podstawowe błędy pól.
- Test przeglądarkowy korzysta z obecnej demonstracji Architekta. Nie przenosi wyboru dowolnego profilu bez hasła. Instrumentacja renderów istnieje tylko w odpowiedziach lokalnego serwera przechwytywanych przez test.
- Test ujawnił również kolizję kluczy React w panelu jakości: brak wartości i niepewność tego samego pola miały identyczny klucz. Klucz uwzględnia teraz kod/treść błędu zgodnie z istniejącą deduplikacją; test sprawdza również brak błędów konsoli. Nie zmieniono reguł walidacji ani zawartości komunikatów.

## Rozstrzygnięcie trzech pozycji D

| Pozycja D | Decyzja | Uzasadnienie |
| --- | --- | --- |
| Dawny dopisek `package.json` do `test:konta` | Odrzucony | Rejestrował test starego modelu logowania. `test:konta` pozostaje bez zmian. Oddzielnie podłączono bezpieczne testy B do `pretest` i dodano `test:szczegoly:przegladarka`; zależności npm nie zmieniły się. |
| Dawna flaga lokalnego serwera w `vite.config.ts` | Nieprzeniesiona; ewentualne zaostrzenie gwarancji wymaga osobnej akceptacji bezpieczeństwa | Obecna konfiguracja ma szersze wykluczenia watchera i blokadę buildu demo. Dodanie dawnej flagi wymagałoby zmian w uwierzytelnianiu kategorii C i nie jest częścią bezpiecznych optymalizacji B. |
| `logowanieDev.test.mjs` | Nieprzeniesiony; nowy test odporności konfiguracji wymaga osobnego zatwierdzenia zakresu | Stare oczekiwania kolidują z potwierdzoną tożsamością/projekcją kont i celowym odrzucaniem buildu demo. Nie stwierdzono równoważności gwarancji dla celowego nadpisywania DEV/PROD podczas kompilacji. Nie deklaruje się rozwiązania tej kwestii. |

Nie przeniesiono siedmiu pozycji C: zmian `App.tsx`, kontekstu użytkownika, panelu logowania, sesji, uwierzytelniania, loadera demo i starego testu przeglądarkowego logowania DEV. Konta, role, uprawnienia, izolacja demonstracji i migracje pozostają w obecnym systemie. Nie zmieniono Vite, Tauri, workflow ani aktualizacji Windows.

Do osobnej decyzji pozostaje wyłącznie opisane wzmocnienie/testowanie gwarancji trybu demonstracyjnego przy celowym przedefiniowaniu środowiska buildu. Nie blokuje to odzyskanych funkcjonalności B i nie zostało wdrożone w tym etapie.

## Weryfikacja

- `node --import ./testy/rejestrujLoaderTs.mjs --test testy/indeksLokalizacjiSzczegolow.test.ts`: 5/5.
- `npm test`: kod 0; obejmuje istniejące regresje Szczegółów, grup, checklisty publikacji, kopii roboczych, workflow, integracji dokumentów, kont i sesji. Nowy test indeksu jest dodatkowo w `pretest`.
- `npm run pretest`: kod 0 po podłączeniu testu indeksu.
- `testy/checklistaPublikacji.regresja.test.ts`: kod 0, powtórzony po poprawieniu kluczy panelu jakości.
- `npm run test:szczegoly:przegladarka`: 2/2, Chrome headless, istniejący tryb demo, syntetyczne dane w świeżych kontekstach. Brak użycia rzeczywistego profilu przeglądarki.
- `npm run lint`, `npm run build`, `git diff --check`: kod 0. Build nadal zgłasza ostrzeżenia o wielkości chunków i nieskutecznym dynamicznym imporcie Tauri.

Logi i pomiary bieżącego wykonania zapisano lokalnie w ignorowanym `tmp/etap431/`. Pomiary dotyczą serwera deweloperskiego i instrumentacji; nie są benchmarkiem produkcyjnego instalatora ani procentowym porównaniem z dawną wersją. Nie testowano natywnej instalacji Windows.

Uruchomienie testów przeglądarkowych bez instalowania zależności: uruchomić `npm run dev:demo -- --port 5182 --strictPort`, ustawić `POMAGIER_ADRES=http://127.0.0.1:5182`, wskazać dostępny lokalny Playwright zmienną `POMAGIER_PLAYWRIGHT` i wykonać `npm run test:szczegoly:przegladarka`. Można wskazać przeglądarkę przez `POMAGIER_CHROME`. Test nie korzysta z kont produkcyjnych.

## Pliki i stan Git

Zmodyfikowane:

- `src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts`
- `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/KartaGrupySzkoleniowej.tsx`
- `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelWykrytychProblemow.tsx` — unikalne klucze komunikatów
- `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx`
- `package.json` — wyłącznie skrypty testowe
- `docs/etap-4-2-0-tozsamosc-windows.md` — archiwalne uzupełnienie

Dodane:

- `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/indeksLokalizacjiSzczegolow.ts`
- `testy/indeksLokalizacjiSzczegolow.test.ts`
- `testy/wydajnoscSzczegolow.przegladarka.test.mjs`
- ten raport

Gałąź `main`, HEAD bez zmian: `a1fef0f`. Zmiany pozostają lokalnie, bez stage, commita i push. `package-lock.json`, zależności oraz pliki kont/logowania, Vite, Tauri i workflow bez zmian. Ponowne porównanie SHA-256 potwierdziło zgodność wszystkich 17 oryginałów w starym katalogu i ich kopii z manifestem etapu 4.3.0. Nie modyfikowano kopii ani rzeczywistych danych użytkowników. Nie rozpoczęto kolejnego etapu.
