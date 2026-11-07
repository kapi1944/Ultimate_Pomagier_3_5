# ULTIMATE POMAGIER 4.0 — UX-1B
## Segmenty wyboru 2–3 opcji i spójność kontrolek — prompt po UX-1A

**Repozytorium:** `kapi1944/Ultimate_Pomagier_3_5`  
**Nakład:** średni · **Codex:** Medium (High, jeżeli wyjdą złożone konflikty z walidacją/klawiaturą)  
**Kontynuacja:** **ta sama rozmowa i ten sam worktree** co UX-1A: `tmp/ux-szczegoly`, branch `ux/szczegoly`.  
**Oczekiwany punkt startowy lokalnie:** `9830011c6705feb2ffab3d92ced4822a12b363af` (commit UX-1A).  
**Poprzedni commit UX-0:** `87a89c71e0d300ab4db7e435bb5804ea6fc7172f`.  
**Zdalny main odnotowany wcześniej:** `b51e9de485624e080f076195d4c4c0dfcf998f68`; **nie zakładaj, że nadal jest aktualny**.

### 0. Warunek wejścia i ochrona równoległych zmian

1. Przeczytaj `AGENTS.md`, `docs/UX_SZCZEGOLY_BAZA.md`, sprawdź `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git worktree list` i ostatnie commity.
2. Kontynuuj w **istniejącym, czystym** worktree `ux/szczegoly` na commicie UX-1A `9830011`. Jeśli stan jest inny, ustal przyczynę i odpowiednio zaktualizuj punkt startowy; **nie wykonuj resetu, czyszczenia ani automatycznego merge**.
3. Nie dotykaj głównego lokalnego katalogu `main` z pięcioma niezacommitowanymi zmianami Programów. Nie zmieniaj kodu pakietów PDF/etykiet/QR/E4 ani instalatorów, workflow, wersji produktu czy schematów danych.
4. **UX-1A jest skończone:** nie implementuj ponownie stepperów `[−] [wartość] [+]`; pilnuj ich regresji.

### 1. Cel i decyzje wiążące

Ujednolić kontrolki tam, gdzie zmniejsza to liczbę kliknięć i poprawia czytelność. **Zachowaj wszystkie istniejące sekcje w osobnych kontenerach oraz wszystkie pola, wartości, ich semantykę i mechanizmy zapisu.**

W obrębie kart grup szkoleniowych zastąp rozwijane listy **wzajemnie wykluczających się 2–3 opcji** responsywnymi segmentami:

- **Forma szkolenia:** `Stacjonarne | Online`.
- **Sposób naliczania ceny:** `za grupę | za osobę`.
- **Oświadczenie VAT:** `Nie – 23% | Min. 70% | ZW – 100%`.

**Nie zmieniaj przechowywanych wartości ani funkcji biznesowych.** W szczególności wykorzystaj istniejącą ścieżkę `ustawFormeGrupy` i zachowaj logikę pól dynamicznych, ceny oraz VAT.

**Nie zmieniaj na segmenty** wyborów mających więcej niż 3 opcje, np. organizatora `SEMPER/IIST/SD/klient/inny` czy sześciu rodzajów godzin — pozostają obecne listy, włącznie z opcją niestandardową. Bez zmiany kontrolek `Wzór klienta` (checkbox 18 px), `Druk/Online`, niezależnych checkboxów pakietu i przełączników `Tak/Nie`, poza punktową poprawką dostępności poniżej.

### 2. Implementacja ograniczona do zakresu

1. Wprowadź **jeden współdzielony komponent segmentów** umieszczony w istniejącym obszarze Szczegółów, z parametryzowanymi opcjami, aktualną wartością, `onChange`, etykietą, `disabled`, powiązaniem z ID/statusami importu i informacją o błędzie. Nie duplikuj logiki wyboru w trzech polach.
2. Zachowaj aktualną infrastrukturę `PolaSzczegolow.tsx`: etykietę, status importu, walidację, `aria-invalid`, `aria-describedby` i identyfikację pól w obrębie grup. Rozwiązanie powinno działać również w dwóch grupach o takich samych etykietach.
3. Wybierz **jedną poprawną semantykę ARIA**: np. native radio (`fieldset`/`legend`, `input type="radio"`) albo grupa przycisków z `aria-pressed`. Nie łącz przypadkowo `role="radiogroup"` z niepowiązanymi przyciskami, jeżeli nie obsługujesz wymaganej interakcji klawiaturą. Zapewnij tab/shift+tab, aktywację Enter/Space i widoczny fokus. W przypadku native radio sprawdź zachowanie klawiszy strzałek.
4. Segmenty nie mogą wywoływać wysłania formularza (`button type="button"`), tworzyć pustych lub nowych wartości modeli ani zmieniać sąsiednich grup.
5. Styl: spójny z istniejącym ciemnym UI, jednoznacznie aktywna opcja, kontrast, obszar kliknięcia. Dla 3 opcji przewidź responsywne zawijanie/układ pionowy zamiast wymuszania przewijania poziomego. Testuj 75%, 85%, 100% oraz szerokości 1440 i 390 px.
6. **Sprawdź `PrzelacznikTakNie.tsx`**: dotychczas obsługuje `onClick` i ręczny `onKeyDown` dla Enter/Space. Zweryfikuj w Chrome, czy nie powoduje podwójnej aktywacji; usuń ewentualną duplikację wyłącznie wtedy, gdy test lub analiza potwierdza potrzebę. Zachowaj publiczne API, warianty i wartości.
7. Nie naprawiaj w tym kroku całego panelu jakości, statusów pozycyjnych po usuwaniu grup ani nieliczbowych ID Harmonogramu. Zanotuj je jako ryzyka UX-2/UX-4, chyba że bezpośrednio blokują nowe kontrolki.

### 3. Testy regresyjne — wymagane

Dodaj ukierunkowane testy komponentowe/przeglądarkowe i uruchom odpowiednie istniejące testy. Sprawdź co najmniej:

- każdą opcję z trzech pól, także odczyt zapisanej wartości po ponownym otwarciu formularza;
- przełączenie `Stacjonarne ⇄ Online` i prawidłowe zachowanie lokalizacji oraz pola `Kto zapewnia salę / łącze` zgodnie z istniejącą logiką;
- `za grupę ⇄ za osobę`: obliczenia/podgląd kwoty, bez zmiany precyzji i bez naruszenia MPP;
- wszystkie 3 warianty VAT w obu kierunkach;
- dwie i więcej grup: zmiana wyboru w jednej nie modyfikuje innych, a import/statusy pozostają przypisane prawidłowo;
- fokus, klawiaturę, ARIA, etykiety i disabled; zachowanie przy skali 75/85/100% i 1440/390 px (brak overflow samych segmentów);
- brak regresji z UX-1A: przyciski `−/+`, ręczna edycja, limity i brak scroll-wheel zmieniającego wartości;
- integralność autosave, kopii roboczych, walidacji i dokumentów, bez zmiany ich schematu.

Uruchom co najmniej:

```bash
node --import ./testy/rejestrujLoaderTs.mjs testy/grupySzkoleniowe.regresja.test.ts
node --import ./testy/rejestrujLoaderTs.mjs testy/daneOdbiorcy.regresja.test.ts
npm run test:szczegoly:przegladarka
npm test
npm run lint
npm run build
git diff --check
```

Jeśli Twoja zmiana obejmuje testy przeglądarkowe importu/zapisu, uruchom także odpowiednie scenariusze z istniejącego zestawu. Nie deklaruj testu jako zaliczonego, jeżeli nie został wykonany. Dwa historyczne `test.skip` Checklisty raportuj jako pominięte.

### 4. Zakończenie

Po zielonych testach utwórz **jeden lokalny commit wyłącznie z UX-1B** na `ux/szczegoly`, bez `push`, `merge` i publikacji. Nie dodawaj do niego żadnych innych zmian. Podaj:

- branch/worktree, `HEAD` przed i po, stan katalogu roboczego;
- listę plików oraz wykaz kontrolek zmienionych i celowo pozostawionych;
- wyniki każdego testu, liczbę zaliczonych/pominiętych oraz wyniki wizualne 75/85/100%; 
- potwierdzenie zachowania wszystkich danych/ID oraz nietknięcia pięciu lokalnych zmian Programów;
- ryzyka otwarte (390 px i otwarty panel jakości; ID nieliczbowych pól Harmonogramu; statusy po usunięciu grupy);
- końcowy status: `GOTOWE DO INTEGRACJI` albo `BLOKADA` wraz z uzasadnieniem.

**Zasada integracji:** UX-1B kontynuuje tę samą lokalną gałąź UX po UX-1A. Nie scalaj jeszcze do `main`; o wspólnej integracji etapów zdecydujemy po testach kolejnych prac.
