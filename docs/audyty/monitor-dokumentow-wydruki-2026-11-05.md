# Dokończenie kontroli dokumentów i wydruków w Monitorze paczek

Data: 2026-11-05. Repozytorium robocze: `Ultimate_Pomagier_4_aktualny`.

## Stan bazowy i GitHub Actions

- Lokalny `main`, lokalny `origin/main` i odczyt gałęzi `main` przez połączenie GitHub wskazywały `a84bc36f9b1495ce399f6615e0b15aca639de52d`. Katalog roboczy na początku kontynuacji był czysty.
- Istniejąca implementacja monitora oraz równoległe prace były już częścią tego commita. Nie odtwarzano implementacji, nie przełączano gałęzi, nie cofano zmian i nie modyfikowano historii Git.
- W trakcie końcowej weryfikacji pojawiły się kolejne niezwiązane zmiany parsera maili, modelu opiekunów, formularza Szczegółów oraz testów importu i kont. Pozostawiono je bez edycji. Podczas ich zapisywania odnotowano przejściowy błąd składni wyrażenia regularnego, błędy nieużywanych funkcji i dwa niezgodne oczekiwania testów parsera; po zmianie bieżących źródeł ponowiono kontrole. Końcowe `npm test`, lint, build, testy monitora i pełny zestaw przeglądarkowy zakończyły się sukcesem.
- Potwierdzono logi [CI #102](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/42002490254) oraz [Instalatora Windows #32](https://github.com/kapi1944/Ultimate_Pomagier_3_5/actions/runs/42002490338). Oba kończą się błędem w `testy/v4Rejestr.test.mjs`: brak właściciela V4 dla `DokumentyWysylki.tsx`.
- Dalsza lokalna kontrola wykazała również nieaktualne sygnatury powierzchni `RutynyNaOsi.tsx` i `WidokPulpitu.tsx`. Uzupełniono ich opis w rejestrze, zachowując aktualny kod tych równoległych prac.
- Kontynuacja pozostawia poprawki lokalne, bez nowego commita, pushu, uruchamiania wydań i publikacji. Wskazane historyczne przebiegi GitHub Actions pozostają `failure`; przejście nowej wersji na runnerach GitHub wymaga osobnego commita i pushu. Nie uruchamiano ponownie testów niezmienionego, wadliwego commita.

## Istniejące mechanizmy i zweryfikowane zachowanie

- Źródłem dokumentów, historii i powiązań pozostaje wspólny rejestr dokumentów v3. Nie dodano kolejnego magazynu ani generatora.
- Sześć rodzajów dokumentów korzysta z jednego kafelka i wspólnego panelu akcji. Statusy: brak dokumentu, przygotowany/częściowy wydruk, komplet potwierdzonych wydruków; osobno „Nie dotyczy”, ostrzeżenia i wymaganie aktualizacji.
- `OperacjaWydruku` przechowuje ID operacji i dokumentu, ID wersji wydruku, szkolenie, szczegóły, grupę, checklistę, paczkę, ilość, czas, użytkownika, status i powiązanie korekty. Operacje są dopisywane do istniejącej historii jako `operacja_wydruku`.
- `WymaganieWydruku` zapisuje jawne wymagania wydruków danej grupy/paczki jako `wymaganie_wydruku` w tej samej historii. Domyślne ilości wynikają z dyspozycji, pozycji checklisty i uczestników; ręczne zatwierdzenie ma priorytet. Wymagania wydruków nie zmieniają fizycznej zawartości checklisty.
- ID wersji obejmuje numer wersji oraz odcisk treści, ustawień i powiązań. Wydruk wcześniejszej treści nie jest przenoszony do bieżącej wersji. Historia rodziny dokumentu pozostaje dostępna.
- Ilości są rozliczane w kontekście konkretnej grupy i paczki. Te same egzemplarze wspólnego dokumentu nie zasilają liczników sąsiednich paczek. Zapis z tym samym identyfikatorem operacji jest idempotentny; korekta zastępuje ilość poprzedniego wpisu i zachowuje historię.
- Status odświeża się po zapisie wspólnego rejestru, zdarzeniu `storage`, odzyskaniu fokusu i zmianie danych wysyłek. Operacje ponownie odczytują aktualny dokument oraz uprawnienia. W przeglądarce operacje wydruków korzystają z Web Locks.
- Dodruk przechodzi do istniejącego generatora i wspólnych akcji druku. Zlecenie i wywołanie okna drukowania nie podnoszą licznika potwierdzonych wydruków. Nieaktualny dokument wymaga sprawdzenia; potwierdzenie aktualności jest osobną, jawną czynnością użytkownika.
- Wymagania, potwierdzenia i korekty wymagają uprawnienia wysyłki; zlecenie druku wymaga uprawnienia eksportu. Brak checklisty/paczki uniemożliwia rejestrację wydruków. Dotychczasowe potwierdzenie wysyłki i jego ograniczenia zachowano.

## Naprawione błędy kontynuacji

1. Brak wpisu nowego komponentu i nieaktualne sygnatury w rejestrze V4 powodowały zatrzymanie obu workflow przed dalszymi kontrolami.
2. Skrypt przeglądarkowy w `package.json` wskazywał nieistniejący plik. Dodano pełny test bez wyłączania walidacji lub zmiany skryptu.
3. Reguła `.pulpit button` nadpisywała obramowania kafelków. Faktyczne kolory braku i dokumentu przygotowanego były jednakowe. Zawężono i wzmocniono lokalne selektory monitora, również dla najechania myszą.
4. Przycisk dodruku pozostawał aktywny bez checklisty, mimo blokady w usłudze zapisu. UI respektuje teraz tę samą granicę.
5. Po przywróceniu dyspozycji kafelek zmieniał wymaganą ilość z 12 na 10, lecz formularz nadal pokazywał 12. Panel odtwarza teraz stan przy zmianie wersji, źródła lub wymagań. Zachowuje stan przy samym dopisywaniu potwierdzeń i korekt.

## Pliki zmienione w kontynuacji

| Plik | Zakres |
| --- | --- |
| `docs/v4/manifest-widokow.json` | Właściciel nowego komponentu, sygnatury istniejących powierzchni. |
| `docs/v4/rejestr-widokow.md` | Odpowiadające wpisy i liczniki powierzchni. |
| `src/moduly/zamkniete/pulpit/DokumentyWysylki.tsx` | Blokada dodruku bez checklisty/paczki i odświeżanie formularza. |
| `src/moduly/zamkniete/pulpit/monitorWysylek.css` | Widoczne kolory statusów niezależnie od stylu przycisków Pulpitu. |
| `testy/dokumentyMonitora.przegladarka.test.mjs` | Dwa scenariusze integracyjne opisane poniżej. |
| `docs/audyty/monitor-dokumentow-wydruki-2026-11-05.md` | Niniejszy raport. |

## Weryfikacja

- Rejestr V4: 53 widoki i 107 plików interfejsu, kompletne przypisanie, routing, menu i sygnatury.
- `npm test`: sukces, łącznie z pretest, kontrolą bezpieczeństwa zależności i testami kont.
- `npm run test:monitor`: sukces, w tym 14 testów monitora wysyłek, 14 testów dokumentów i wydruków, 60 regresji Pulpitu oraz kontrola V4-04.
- `npm run test:monitor:przegladarka`: 3 scenariusze — dotychczasowy monitor oraz dwa nowe scenariusze dokumentów. Izolowany profil Chrome, lokalny Vite w trybie demonstracyjnym i lokalnie dostępny Playwright; bez instalowania zależności.
- Nowe scenariusze sprawdzają rzeczywiste różnice kolorów, częściowe i pełne potwierdzenia, większą ilość, przywrócenie dyspozycji wraz z polem formularza, historię korekt, brak mieszania grup/paczek, brak powielenia po reloadzie i równoległym ponowieniu w dwóch kartach, nową treść dokumentu, „Nie dotyczy”, brak checklisty, istniejący generator, samą obsługę `window.print`, zmianę źródła, jawną weryfikację aktualności, odmowę usługi oraz interfejs użytkownika bez uprawnień.
- Skala 85%: sprawdzono właściwą zmienną skali, klawiaturę, dotyk i szerokość strony przy 390 px. Zrzuty robocze: `tmp/monitor-dokumentow/telefon-85.png` i `tmp/monitor-dokumentow/pulpit-85.png`.
- `npm run lint`, `npm run build`, `git diff --check`: sukces. Build nadal zgłasza ostrzeżenia o wielkości chunków i mieszanym imporcie Tauri.
- `npm run test:desktop` i `npm run test:dystrybucja`: sukces. Nie budowano ani nie publikowano instalatora lub nowego wydania.

## Ograniczenia

- Test `window.print` sprawdza wywołanie istniejącego mechanizmu oraz brak automatycznego potwierdzenia. Nie potwierdza działania fizycznej drukarki. Liczbę kopii i strony dokumentu seryjnego wybiera użytkownik w oknie drukowania.
- Dane są nadal lokalne dla profilu/originu przeglądarki. Nie dodano synchronizacji między komputerami. Web Locks koordynuje nowe operacje wydruków w obsługujących je przeglądarkach; nie zastępuje transakcji serwerowej dla całego rejestru.
- Nie wykonano testów na fizycznym telefonie, drukarce ani produkcyjnym profilu użytkownika. Sprawdzono emulację dotyku i rozmiaru telefonu w Chrome.
- Kontrola aktualności nie przepisuje automatycznie treści dokumentu. Użytkownik sprawdza/poprawia go w istniejącym generatorze i jawnie potwierdza zgodność ze źródłem.
- Notatniki, programy w kategorii TECZKI, kolumna Podpis i logo checklisty pozostają poza zakresem.
