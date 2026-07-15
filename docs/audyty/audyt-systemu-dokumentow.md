# Audyt wspólnego systemu dokumentów

Data audytu: 2026-07-15
Commit bazowy: `2c04295 merge: zakoncz etap 5F kontekstu integracji dokumentow`

## Zakres i architektura

Przeanalizowano: Programy szkoleń, Szczegóły organizacyjne, Dyplomy, Listy obecności, Ankiety, Karty na drzwi, Replikator dokumentów oraz Kartotekę szablonów. Wspólny rejestr docelowy znajduje się w `src/wspolne/dokumenty/rejestrDokumentow.ts`; starsze generatory nadal używają adapterów i magazynów `localStorage`.

| Zasada | Wynik |
| --- | --- |
| Jeden logiczny dokument ze stałym ID | niepotwierdzone dla Szczegółów organizacyjnych; aktualizacja po publikacji może utworzyć nowy rekord |
| Autosave nie tworzy elementu listy ani historii | potwierdzona dla Programów i Szczegółów |
| Ręczny zapis tworzy punkt historii | potwierdzona dla Programów i Szczegółów |
| Kopie robocze są widokiem wspólnego magazynu | potwierdzona dla podłączonych generatorów |
| Usunięcie miękkie i przywrócenie z kosza | potwierdzone w rejestrze docelowym |
| Przywrócenie historycznej wersji jako nowej wersji | niepotwierdzone w UI; wymaga odrębnej akcji domenowej |

## Elementy wdrożone w tej gałęzi

Ta gałąź zawiera audyt 5G oraz fundament domenowy workflow 4D. Nie stanowi pełnego zakończenia etapu 4D: interfejs nie obsługuje jeszcze wszystkich przejść i kontrolowanych akcji workflow.

- Dodano centralną macierz przejść statusów Szczegółów organizacyjnych.
- Publikacja korzysta z przejścia `PEŁNE → OCZEKUJĄCE` i tworzy oznaczony wpis historii automatycznej zmiany.
- Ręczna zmiana statusu wymaga aktora oraz korzysta z obiektu `{ konto, komentarz, powod }`.
- `GOTOWE → NIEZREALIZOWANE` wymaga osobnej, niepustej przyczyny; komentarz historii nie może jej zastąpić.
- Każda skuteczna ręczna zmiana zapisuje poprzedni i nowy status, aktora, akcję, opcjonalny komentarz oraz — gdy wymagana — przyczynę.
- Wersji opublikowanej nie edytuje się bezpośrednio. Aktualizacja tworzy nową kopię roboczą, natomiast `ROZLICZONE` jest statusem zamkniętym i blokuje zwykłe tworzenie aktualizacji.

## Zakres potwierdzony automatycznie

Automatyczne testy potwierdzają: zapis publikacji do historii, odrzucenie ręcznej zmiany bez aktora, odrzucenie niedozwolonego przejścia, wymaganie jawnej przyczyny dla `NIEZREALIZOWANE`, zapis przyczyny w historii oraz zamknięcie statusu `ROZLICZONE`.

## Zakres sprawdzony wyłącznie analizą kodu

Przeanalizowano rejestr dokumentów, autosave, ręczne kopie robocze, historię i miękkie usuwanie. Dla podłączonych generatorów mechanizmy te spełniają podstawowy model rejestru, z zastrzeżeniami poniżej.

## Zakres ręczny i niezweryfikowany

Nie wykonano ręcznych testów w przeglądarce. W szczególności niezweryfikowane ręcznie pozostają: publikacja kompletnej wersji, widok historii oraz dostępność akcji w interfejsie.

## Elementy pozostawione na później

- Proste generatory przechowują pojedyncze szkice i nie są jeszcze podłączone do rejestru wersjonowanych dokumentów.
- Starsze `repozytoriumDokumentow.ts` operuje kopią jako nowym rekordem; nie jest wspólnym modelem docelowym i powinno zostać wygaszone po migracji użyć.
- Interfejs nie udostępnia jeszcze przywrócenia wybranej wersji historii jako nowej wersji.
- Kopia aktualizacji zachowuje `zrodloOpublikowanegoId`, ale ponowna publikacja nadal nadaje `szczegoly-${Date.now()}`. Aktualizacja może więc utworzyć drugi opublikowany rekord zamiast kolejnej wersji tego samego logicznego rekordu. Wymaga to osobnego etapu: **Etap 5H — publikacja aktualizacji jako nowej wersji tego samego rekordu**.
- Import Szczegółów organizacyjnych obsługuje wklejoną treść maila, ale stosuje wynik bez ekranu wyboru pól; PDF i DOCX nie są importowane do formularza.
- W repozytorium nie ma bezpiecznego parsera DOCX/PDF dla formularza Szczegółów; nie dodano sztucznych wyników ani OCR.
- Etap 4C (dynamiczne pola i walidacja) nie został wykonany w tej gałęzi.
- Etap 4E (podgląd importu, cofanie importu oraz import PDF/DOCX) nie został wykonany w tej gałęzi.

## Testy wykonane

Wyniki kontroli są aktualizowane przy każdym commicie tej gałęzi. Build zgłasza jedynie zastane ostrzeżenie Vite o dużym pliku wynikowym JavaScript (ponad 500 kB po minifikacji).

## Ryzyka i kolejne etapy

Największym ryzykiem pozostaje równoległe utrzymywanie magazynów starszych generatorów. Kolejny etap powinien podłączyć import do wspólnego podglądu i jednej operacji cofania, a potem migrować proste szkice do rejestru bez utraty obecnych danych.
