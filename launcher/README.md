# Launcher Ultimate Pomagiera — Windows

Uruchom dwuklikiem **Uruchom Ultimate Pomagier.cmd** w tym katalogu. Możesz utworzyć do niego skrót na pulpicie. Repozytorium może znajdować się w dowolnym katalogu, również ze spacjami, polskimi znakami i nawiasami. Wymagane: Windows PowerShell 5.1+, Node.js zgodny z wymaganiami zainstalowanego Vite oraz npm. Git jest opcjonalny. Okno pozostaje otwarte przy błędzie. `npm run dev` nadal działa niezależnie.

Launcher uruchamia istniejące `npm run dev`, otwiera domyślną przeglądarkę i pozostaje aktywny razem z serwerem. Zatrzymuj serwer przez **Ctrl+C** w jego oknie. Nie zamykaj okna podczas instalacji lub aktualizacji.

## Dane i adres przeglądarki

Rozpoznanie obejmowało `src/wspolne/dane/backupDanych.ts`, rejestr dokumentów, migrator starszych dokumentów, użycia komunikacji sieciowej i audyt magazynów. Aktualny kod ma backupy z manifestem i sumą kontrolną, import/przywracanie oraz migrację z kopią przed operacją. Rejestr ma wersję schematu 3 oraz stany migracji, w tym `OCZEKUJE_WERYFIKACJI`. Audyt opisuje także starsze, równoległe magazyny; launcher ich nie konsoliduje.

Nie ma zdalnej synchronizacji danych ani kolejki wysyłki. Dane są w `localStorage` przeglądarki. Node/PowerShell nie może odczytać ich przed otwarciem aplikacji. `sprawdzStan.mjs dane` zwraca więc `status: niedostepny`, `pending: null`, ostrzeżenia i informację o braku synchronizacji. Nie udaje sprawdzenia integralności ani braku oczekujących operacji. Weryfikację danych, kopie, import i migracje pozostawiono istniejącym mechanizmom aplikacji; launcher nie modyfikuje danych.

Adres jest wyliczany z konfiguracji Vite przez jego `resolveConfig`. Launcher używa `localhost` i `--strictPort`, aby zajęty port nie powodował cichego przejścia na inny origin, z innym `localStorage`. Korzystaj z tego samego adresu i profilu przeglądarki co wcześniej. Jeśli używałeś np. `127.0.0.1` lub innego portu, otwórz pierwotny adres albo wykonaj backup i przywrócenie przez aplikację; launcher nie przenosi danych między originami.

Minimalny middleware w `vite.config.ts` rozpoznaje Pomagiera z tego konkretnego katalogu. Działający serwer na skonfigurowanym porcie zostaje otwarty ponownie. Obcy serwer lub starszy Pomagier bez middleware powoduje błąd zajętego portu — zatrzymaj go ręcznie. Mutex Windows blokuje równoczesną pracę launcherów tego samego katalogu; podczas trwającego startu drugi launcher informuje o oczekiwaniu. Nie są zabijane procesy Node. HTTPS wymaga ręcznego `npm run dev`.

## Zależności i aktualizacja

Stan techniczny jest wyłącznie w ignorowanym `.launcher/`: hash lockfile, logi fetch i poprzedni HEAD/preflight. Brak zależności Vite/TypeScript lub inny hash `package-lock.json` powoduje `npm ci`. Pierwsze uruchomienie także instaluje zależności, jeśli nie ma zapamiętanego hasha. Po nieudanej instalacji hash nie jest zapisywany. Offline można uruchamiać już zainstalowaną wersję; brakujących zależności bez cache npm nie da się pobrać.

Aktualizacja sprawdza całe working tree, w tym pliki nieśledzone. Przy zmianach można zobaczyć `git status --porcelain`, uruchomić lokalną wersję lub zakończyć. Nie ma stashowania ani usuwania plików. Sprawdzanie GitHub ma limit 20 sekund i wyłączone interaktywne uwierzytelnianie. Niepowodzenie pozwala uruchomić lokalną wersję. Timeout zatrzymuje wyłącznie rozpoczęty przez launcher proces fetch.

Aktualizowany jest tylko czysty `main` z właściwym `origin` GitHub, bez własnych commitów. Launcher pokazuje SHA, liczbę i kilka tytułów commitów. Po decyzji ponownie sprawdza stan, zapamiętuje HEAD i wykonuje `git merge --ff-only --no-autostash <sprawdzony-SHA>` z wyłączonymi hookami tej operacji. Własne commity, rozbieżność historii, inna gałąź lub błąd Git wstrzymują aktualizację. Nie ma zwykłego merge ani automatycznego rollbacku.

Po aktualizacji launcher sprawdza zależności i wykonuje `npm run build`. Nieudany build blokuje start i pozostawia marker wymaganego preflightu również na kolejne uruchomienie. Poprzedni SHA jest wypisywany oraz zapisany w `.launcher/`. Bezpieczny ręczny powrót: po zatrzymaniu serwera użyj `git worktree add --detach ../Pomagier-poprzedni <poprzedni-SHA>`, następnie `npm ci` i `npm run dev` w tym osobnym katalogu. Bieżące pliki pozostają zachowane. Nie uruchamiaj obu serwerów jednocześnie na tym samym porcie.

## Weryfikacja

`npm run test:launcher` sprawdza raport danych, rozpoznawanie rzeczywistego serwera Vite, zabezpieczenia aktualizacji oraz instalację zależności przy zmianie lockfile i zachowanie po błędzie npm. Pełne sprawdzenia aplikacji: `npm test`, `npm run lint`, `npm run build`.
