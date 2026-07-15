# Audyt wspólnego systemu dokumentów

Data audytu: 2026-07-15  
Commit bazowy: `2c04295 merge: zakoncz etap 5F kontekstu integracji dokumentow`

## Zakres i architektura

Przeanalizowano: Programy szkoleń, Szczegóły organizacyjne, Dyplomy, Listy obecności, Ankiety, Karty na drzwi, Replikator dokumentów oraz Kartotekę szablonów. Wspólny rejestr docelowy znajduje się w `src/wspolne/dokumenty/rejestrDokumentow.ts`; starsze generatory nadal używają adapterów i magazynów `localStorage`.

| Zasada | Wynik |
| --- | --- |
| Stabilny identyfikator dokumentu w rejestrze | potwierdzona dla `Dokument` i wspólnego rejestru |
| Autosave nie tworzy elementu listy ani historii | potwierdzona dla Programów i Szczegółów |
| Ręczny zapis tworzy punkt historii | potwierdzona dla Programów i Szczegółów |
| Kopie robocze są widokiem wspólnego magazynu | potwierdzona dla podłączonych generatorów |
| Usunięcie miękkie i przywrócenie z kosza | potwierdzone w rejestrze docelowym |
| Przywrócenie historycznej wersji jako nowej wersji | niepotwierdzone w UI; wymaga odrębnej akcji domenowej |

## Błędy blokujące i poprawki

Nie znaleziono blokera uruchomienia ani utraty danych w automatycznych testach. Dodano centralną macierz przejść statusów Szczegółów organizacyjnych. Publikacja wykorzystuje teraz weryfikowane przejście `PEŁNE → OCZEKUJĄCE`; niedozwolone przejścia i przejście do `NIEZREALIZOWANE` bez przyczyny są odrzucane przez wspólną funkcję domenową.

## Problemy pozostawione na później

- Proste generatory przechowują pojedyncze szkice i nie są jeszcze podłączone do rejestru wersjonowanych dokumentów.
- Starsze `repozytoriumDokumentow.ts` operuje kopią jako nowym rekordem; nie jest wspólnym modelem docelowym i powinno zostać wygaszone po migracji użyć.
- Interfejs nie udostępnia jeszcze przywrócenia wybranej wersji historii jako nowej wersji.
- Import Szczegółów organizacyjnych obsługuje wklejoną treść maila, ale stosuje wynik bez ekranu wyboru pól; PDF i DOCX nie są importowane do formularza.
- W repozytorium nie ma bezpiecznego parsera DOCX/PDF dla formularza Szczegółów; nie dodano sztucznych wyników ani OCR.

## Testy wykonane

Uruchomiono `npm test` (wszystkie testy przeszły), `npm run lint` oraz `npm run build` (przeszły). Build zgłosił jedynie zastane ostrzeżenie Vite o dużym pliku wynikowym JavaScript (ponad 500 kB po minifikacji).

Nie wykonano ręcznych testów w przeglądarce, ponieważ w tym audycie nie uruchomiono sesji aplikacji. Nie oznaczono ich jako wykonanych.

## Ryzyka i kolejne etapy

Największym ryzykiem pozostaje równoległe utrzymywanie magazynów starszych generatorów. Kolejny etap powinien podłączyć import do wspólnego podglądu i jednej operacji cofania, a potem migrować proste szkice do rejestru bez utraty obecnych danych.
