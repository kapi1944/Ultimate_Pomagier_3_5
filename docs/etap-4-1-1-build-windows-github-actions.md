# Etap 4.1.1 — przygotowanie buildu Windows w GitHub Actions

## Baza i zakres

Gałąź: `codex/integracja-v4-desktop`. Baza: `995b52555e336f55df4cd25afb02abd8221973e0`. Przed pracą drzewo robocze było czyste.

Odczytano raport etapu 4.1 i odtworzono wszystkie cztery niepowodzenia przed poprawkami. Nie powtarzano merge'a ani audytu architektury. Nie zmieniono żadnego pliku aplikacji w `src/`, modelu danych, formularza, generatora, Launchera, konfiguracji Tauri ani zależności. Nie instalowano Rust i nie uruchamiano lokalnego buildu natywnego objętego blokadą Windows.

## Cztery niepowodzenia

| Test | Przyczyna | Przed integracją? | Poprawka i wynik | Blokowanie desktopu |
| --- | --- | --- | --- | --- |
| `generatoryOperacyjne.test.ts`: „kolumny podpisów nie są ściskane; przełączanie dni zachowuje osoby i numerację” | Oczekiwanie `[0, 27, 54]` pochodziło ze starszej wysokości nagłówka. Obecny nagłówek dopasowywany do tekstu pozwala zmieścić 28 krótkich wierszy na stronie, więc indeksy wynoszą `[0, 28, 56]`. | Tak. Test i model listy są identyczne w wejściowym V4 i commicie integracji. | Poprawiono oczekiwaną numerację i dodano kontrolę zachowania wszystkich 57 uczestników w obu grupach dat. PASS, 9 testów w pliku. | Wcześniej zatrzymywał `pretest`, więc CI nie dochodził do NSIS. Po poprawce nie blokuje. Nie wykryto regresji aplikacji. |
| `wygladListyObecnosci.test.ts`: wysokość nagłówka, odstęp pod terminem i renderowanie | Stałe 62.8/56/58 mm nie uwzględniały automatycznego dopasowania bloków tekstowych. Dla domyślnych danych rzeczywista wysokość wynosiła 55.15696 mm. | Tak. Test i model są identyczne przed i po integracji. Dopasowanie nagłówka występowało już w historii przed etapem 4.1. | Test sprawdza przyrost wysokości o zadany odstęp, wzrost dla długiego tytułu oraz niezależny przypadek kontrolny z logo o wysokości 80 mm. Zachowano kontrolę serializacji i zgodności renderowania. PASS. | Wcześniej blokował główny zestaw testów CI. Po poprawce nie blokuje. Nie zmieniano wymiarów ani zachowania generatora. |
| `checklistaPublikacji.regresja.test.ts`: „kliknięcie błędu przekazuje pole, przewija je i odświeża timer podświetlenia” | Mock `window` nie udostępniał `matchMedia`, używanego do respektowania ograniczenia animacji. | Tak. Test i `nawigacjaDoPola.ts` są identyczne przed i po integracji. Obsługę `matchMedia` dodano wcześniej, w `f98afc4`. | Uzupełniono mock i sprawdzanie przewijania `smooth` oraz `instant`, fokusu, zdarzenia i timerów. PASS. | Wcześniej blokował testy CI z powodu niepełnego środowiska testowego. Po poprawce nie blokuje. |
| `v4Rejestr.test.mjs`: kompletność plików i sygnatur powierzchni V4 | W manifeście brakowało istniejących `MonitorWysylek.tsx` i `TrescStopkiOrganizatora.tsx`. Po uzupełnieniu ujawniły się również nieaktualne sygnatury: ID paczki w checkliście oraz `inert` i nagłówek panelu jakości w szczegółach. | Tak. Brakujące komponenty, test i zmiany powierzchni były już w V4. ID paczki pochodzi z `29b7b48`, a `inert` z `f98afc4`. Integracja dopisała wcześniej swój panel aktualizacji. | Uzupełniono właścicieli dwóch plików i świadomie odświeżono sygnatury dwóch istniejących plików w manifeście oraz rejestrze Markdown. PASS: 53 widoki i 86 plików interfejsu. | Wcześniej blokował bramkę kompletności CI. Po poprawce nie blokuje. Test nadal sprawdza pełną listę plików i dokładne sygnatury. |

Status „przed integracją” potwierdzono porównaniem identyfikatorów obiektów Git dla czterech testów i właściwych modułów pomiędzy `4d7028dbdaea188caa8fc7353a5a4bb55ac02a7f` a `995b52555e336f55df4cd25afb02abd8221973e0`. Nie znaleziono regresji działania aplikacji wymagającej zmiany kodu produkcyjnego. Nie usuwano ani nie pomijano testów.

## Ponowna weryfikacja

- Cztery testy zakresowe: PASS, po wcześniejszym potwierdzeniu czterech niepowodzeń.
- `npm test`: PASS, wraz z pełnym `pretest` i wszystkimi 60 poleceniami głównego zestawu.
- `npm run lint`: PASS.
- `npm run build`: PASS. Pozostaje ostrzeżenie Vite o dużym chunku; nie zmieniano podziału aplikacji.
- `npm run test:desktop`: PASS, 10 testów konfiguracji, aktualizacji i metadanych.
- `npm run test:launcher`: PASS, istniejące testy Node i PowerShell, uruchomione poza izolacją sieciową sandboxa. Launcher nie był przebudowywany ani zmieniany.
- `git diff --check`: PASS.

Wersja pozostaje `Ultimate Pomagier 4.0` / `4.0.0`. Produkcyjny build nadal korzysta z frontendu V4; kod `src/` nie zmienił się względem integracji. Tauri wciąż pakuje `../dist` po `npm run build`. Nazwa produktu, wersja, pełny commit i stan źródeł są zapisywane do `dist/wersja.json`. Końcowy build należy identyfikować pełnym commitem z tego manifestu, zgodnym z końcowym HEAD gałęzi. Nie zmieniono `pl.ultimatepomagier.desktop`, schematu originu ani lokalizacji profilu i danych.

## Workflow

Zmodyfikowano istniejący `.github/workflows/desktop-windows.yml`, dodając wyłącznie wyzwalacz `push` dla dokładnej gałęzi `codex/integracja-v4-desktop`. Workflow uruchomi się automatycznie po zatwierdzonym przez użytkownika pushu. Nadal można uruchomić go ręcznie przez `workflow_dispatch`; zachowano również obsługę pull requestów.

Pozostają: `windows-2022`, Node.js 24, Rust stable z targetem MSVC `x86_64-pc-windows-msvc` i rustfmt, `npm ci`, pełne testy, lint, testy Launchera, testy desktopu, `cargo fmt --check`, Tauri 2 oraz NSIS. Checkout pobiera historię Git, więc metadane buildu wskazują commit faktycznie pobranych źródeł. Dla pushu na gałąź jest to commit gałęzi; dla pull requestu może to być testowy commit scalenia utworzony przez GitHub.

Domyślnie wykonywany jest testowy build z wyłączonymi aktualizacjami. Zachowano istniejące zabezpieczenia ścieżki podpisanego wydania; nie tworzono kluczy ani tagu i nie uruchamiano tej ścieżki. Workflow zapisuje artefakt `Ultimate-Pomagier-Windows-<numer uruchomienia>` na 30 dni, zawierający instalator, SHA-256 i `wersja.json`.

**Gotowość:** lokalne bramki JavaScript przechodzą, konfiguracja workflow została przejrzana i gałąź jest przygotowana do wysłania. Zdalny build Rust/NSIS, kontrola rustfmt na runnerze i działanie EXE pozostają do potwierdzenia przez rzeczywiste GitHub Actions. Nie wykonano push, dispatch, merge do `main`, GitHub Release ani stabilnego tagu.

## Wysłanie i uruchomienie — wykonuje użytkownik

Polecenie wysyłające istniejącą gałąź, bez zmiany `main`:

```powershell
git push -u origin codex/integracja-v4-desktop
```

Po pushu sprawdź repozytorium `kapi1944/Ultimate_Pomagier_3_5` → **Actions** → **Instalator Windows**. Uruchomienie typu `push` zacznie się automatycznie. Aby powtórzyć build ręcznie: **Run workflow** → wybierz `codex/integracja-v4-desktop` → pozostaw `podpisane` wyłączone → **Run workflow**.

Alternatywa po pushu, przy skonfigurowanym GitHub CLI:

```powershell
gh workflow run desktop-windows.yml --repo kapi1944/Ultimate_Pomagier_3_5 --ref codex/integracja-v4-desktop -F podpisane=false
```

Po udanym uruchomieniu pobierz artefakt. Powinien zawierać `Ultimate_Pomagier_4.0_Setup.exe`, odpowiadającą mu sumę SHA-256 i manifest `wersja.json`. Porównaj commit manifestu z commitem uruchomienia Actions; po instalacji sprawdź ten sam commit w Ustawieniach aplikacji, markę 4.0 i Pulpit. Sam zielony build nie zastępuje akceptacji działania instalatora i WebView2.

## Zmienione pliki

```text
.github/workflows/desktop-windows.yml
docs/v4/manifest-widokow.json
docs/v4/rejestr-widokow.md
testy/generatoryOperacyjne.test.ts
testy/wygladListyObecnosci.test.ts
testy/checklistaPublikacji.regresja.test.ts
docs/etap-4-1-1-build-windows-github-actions.md
```
