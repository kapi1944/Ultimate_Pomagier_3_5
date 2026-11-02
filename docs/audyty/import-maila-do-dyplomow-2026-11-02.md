# Import danych szkolenia z maila do Dyplomów

Data: 02.11.2026. Gałąź: `main`. Bez commita, pushu i publikacji.

## Wdrożenie

- Przycisk „📩 Importuj dane szkolenia z maila” obok importu PDF/TXT.
- Wspólny dialog: wklejanie tekstu i schowka, czyszczenie, jawne rozpoczęcie analizy, powrót do wiadomości i anulowanie.
- Edytowalny staging z wyborem pól, źródłami, oznaczeniem niepewności, wariantami konfliktów oraz porównaniem wartości obecnych i importowanych. Nadpisanie wymaga zatwierdzenia.
- Import tytułu, dat, prowadzącego, trybu, lokalizacji oraz liczby i rodzaju godzin. Klient, limit uczestników i program są informacyjne, ponieważ formularz Dyplomów nie obsługuje ich jako danych organizacyjnych.
- Natychmiastowe odświeżenie istniejącego podglądu i istniejący autosave. Uczestnicy, branding, podpisy, typ dokumentu i formatowanie pozostają zachowane.
- Cofnięcie ostatniego importu przywraca zmienione pola; zachowuje późniejsze zmiany innych ustawień. Cofnięcie działa w bieżącej sesji widoku, przed jego opuszczeniem lub przeładowaniem. Wybór innego szkolenia, import dyplomu i nowy dokument unieważniają poprzednie cofnięcie.
- Import odłącza wcześniejsze powiązanie ze Szczegółami i grupą, co jest opisane przed zatwierdzeniem; cofnięcie przywraca te powiązania.

## Architektura

Wykorzystano istniejący `parserMailaSzczegolow`, jego normalizację, rozdzielenie nagłówków i kontekstów, parser dat, godzin i programu. Nowa wspólna warstwa zbiera kandydatów i źródła oraz porównuje sprzeczne deklaracje. Adapter Dyplomów przenosi wyłącznie obsługiwane pola. Nie dodano drugiego magazynu, integracji AI, bibliotek ani zapytań do usług zewnętrznych. Wiadomość pozostaje w pamięci dialogu.

Audyt potwierdził lokalny szkic Dyplomów obsługiwany przez `useStanDokumentu` oraz jawny zapis dokumentu do wspólnego rejestru. Zachowano ten istniejący podział; zadanie nie obejmuje migracji storage. Uwzględniono audyty importu maili z 30.10 i zapisu dokumentów z 09.10.

## Pliki

| Plik | Zmiana |
| --- | --- |
| `src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx` | Przycisk, dialog, zastosowanie i cofnięcie. |
| `src/moduly/dokumenty/generatory/dyplomy/importMailaDoDyplomu.ts` | Adapter formularza i odtworzenie wcześniejszych wartości. |
| `src/wspolne/parsery/importDanychSzkoleniaZMaila.ts` | Kandydaci, źródła, konflikty, harmonogram i walidacja stagingu. |
| `src/wspolne/import/ImporterDanychSzkoleniaZMaila.tsx` | Wspólna weryfikacja danych przed zastosowaniem. |
| `src/wspolne/import/importerDanychSzkoleniaZMaila.css` | Responsywny dialog i tabela. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/analizaTresciMaila.ts` | Aliasy i normalizacja tabel HTML, Markdown oraz tabulatorów. |
| `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts` | Udostępnienie istniejących funkcji i rozszerzenie granic kontekstów. |
| `testy/importDanychSzkoleniaZMaila.test.ts` | Testy analizy, adaptera, ochrony ustawień i cofania. |
| `testy/importMailaDyplomow.przegladarka.test.mjs` | Scenariusze formularza na desktopie i małym ekranie, TXT/PDF. |
| `testy/fixtures/mailSzkolenieNbp.txt` | Odtworzona wiadomość referencyjna; nie jest oryginalnym mailem NBP. |
| `package.json` | Dołączenie nowych testów jednostkowych do `npm test`. |
| `docs/v4/manifest-widokow.json`, `docs/v4/rejestr-widokow.md` | Rejestr wspólnego dialogu. |
| Ten raport | Zakres, weryfikacja i ograniczenia. |

## Weryfikacja

- Testy jednostkowe nowego importu: 13/13; razem z istniejącym parserem: 225/225.
- Nowe testy Chrome: 3/3, w tym 1440 i 390 px, skala 85%, dotyk, podgląd, autosave, cofnięcie, anulowanie, przywracanie fokusu, import TXT i tekstowego PDF oraz eksport PDF. Bez wysyłania maila przez POST.
- Dotychczasowe testy importu Szczegółów: 3/3.
- Pełny `npm test` z pretest i testami kont: kod 0.
- Starsze testy Dyplomów po przygotowaniu sesji w kopii tymczasowej: 3/4. Test proporcji logo z gotowym podpisem zgłasza niezgodność pomiaru podglądu z PDF. Ten sam błąd odtworzono na niezmienionym widoku z `HEAD` za pomocą lokalnego serwera porównawczego; nie zmieniano źródeł ani historii Git. PDF zachowuje proporcje oryginału. Oryginalny skrypt bez przygotowania sesji zatrzymuje się wcześniej na logowaniu. Nie poprawiano tych odrębnych problemów w zakresie importera.
- Build i lint: kod 0. Build zachowuje ostrzeżenia o wielkości chunków oraz mieszanym imporcie Tauri.
- `git diff --check`: kod 0.

## Ograniczenia

- Parser jest lokalny i deterministyczny: obsługuje aliasy, konteksty oraz wybrane konstrukcje zdań, a nie dowolne rozumienie języka. Nietypowa treść wymaga korekty użytkownika.
- Wiadomości z rozpoznanymi wieloma szkoleniami lub grupami wymagają ograniczenia treści do jednego szkolenia i grupy.
- Harmonogram służy ostrzeganiu; przerwy, nakładające się przedziały i niekompletne plany wymagają ręcznej kontroli. Deklarowana liczba godzin nie jest zastępowana obliczeniem.
- Tryb hybrydowy jest rozpoznawany, lecz obecny model Dyplomów go nie obsługuje. Użytkownik musi pominąć pole albo zweryfikować właściwy wariant.
- Test NBP bazuje na odtworzonym opisie, ponieważ oryginalnej wiadomości nie załączono.
- Sprawdzono Chrome na Windows oraz wąski widok z dotykiem; nie wykonano testu na fizycznym Androidzie ani Raspberry Pi.
- Podłączenie wspólnego dialogu do pozostałych generatorów oraz osobny importer OCR list obecności pozostają poza tym wdrożeniem.
