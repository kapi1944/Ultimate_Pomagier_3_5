# Testy przeglądarkowe

Wymagania: Node.js 24, `npm ci` i zainstalowany Google Chrome. Testy używają pakietu `playwright` z pliku blokady oraz kanału `chrome`; nie wymagają pobierania przeglądarek Playwright.

Uruchom `npm run test:e2e`. Skrypt uruchamia lokalne serwery Vite w trybie demonstracyjnym oraz produkcyjnego frontendu deweloperskiego, przekazuje ich adresy przez `POMAGIER_ADRES` i `POMAGIER_ADRES_PRODUKCYJNY`, wykonuje istniejący test `importMailaSzczegolow.przegladarka.test.mjs` przez `node --test`, a następnie zamyka serwery. Dane przeglądarki powstają w odizolowanych kontekstach testowych.

Inny test zgodny z tymi serwerami można wskazać jawnie: `npm run test:e2e -- testy/wybrany.przegladarka.test.mjs`. Nie wszystkie testy przeglądarkowe mają te same wymagania: testy natywne i testy usługi kont wymagają dodatkowych komponentów, dlatego skrypt nie uruchamia automatycznie całego katalogu.

GitHub Actions uruchamia ten sam skrypt w zadaniu CI na `ubuntu-latest`, którego obraz zawiera Google Chrome. Brak przeglądarki lub zależności powoduje błąd testu, a nie jego pominięcie. Środowisko musi zezwalać Chrome na dostęp do localhost. W środowisku ograniczonym sieciowo pakiety należy dostarczyć przez dozwolony rejestr lub lokalną pamięć npm; nie wyłączać zabezpieczeń przeglądarki.
