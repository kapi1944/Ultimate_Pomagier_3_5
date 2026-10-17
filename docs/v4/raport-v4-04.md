# V4-04 — Pulpit, 17.10.2026

Baza 6f65c804697f301b5f7cef80d00ca9512b88e0dc, gałąź feat/ultimate-pomagier-v4. Przed etapem stan był czysty. Zmiany obejmują prezentację i dostępność; magazynów, modeli, walidacji, algorytmów dat, uprawnień i eksportów nie zmieniano.

Kafelki podsumowań mają ikony, znaczące kolory obramowań i aria-pressed. Zadania, paczki, zapotrzebowania, formularze i puste stany korzystają z tokenów V4 oraz wspólnych przycisków i komunikatów. Niezapisane zmiany mają status draft, błędy error. Powierzchnie są nieprzezroczyste w trzech motywach. Lokalny zasięg CSS zachowuje układ pozostałych modułów.

Oś czasu ma oddzielny, dostępny klawiaturą obszar przewijania oraz rozwijaną listę istniejących zadań z terminem, zapewniającą dostęp przy zagęszczonych markerach. Zachowano wyliczenia położenia, godzin i kolory tożsamości użytkowników. Przewijanie formularza respektuje ustawienie ograniczenia animacji oraz prefers-reduced-motion. Formularz otrzymuje fokus po otwarciu.

Wszystkie dwa drawery i trzy okna modalne Pulpitu korzystają ze wspólnego natywnego dialogu: modalność, Escape, zamykanie i przywrócenie fokusu. Panele mieszczą się między nagłówkiem a dockiem. Callbacki tworzenia, edycji, wysyłki i statusów pozostały dotychczasowe.

Audyt nie znalazł planu tygodniowego ani animacji rozwijania dni. Zgodnie z zakresem nie rozbudowywano kalendarza; brak zapisano w backlog.md.

Weryfikacja automatyczna: pełne npm test (w tym 58 regresji Pulpitu, zadania, zakupy, paczki oraz nowy test renderowania rzeczywistych komponentów), npm run lint, npm run build i git diff --check — kod 0. Test renderowania obejmuje kafelki, semantykę, dostępny region osi, puste stany, komunikat błędu zakupu i dotychczasową dostępność linków dla Zamawiaczy. Istniejące asercje źródłowe dostosowano do wspólnego panelu i przewijania bez animacji. Build zgłasza ostrzeżenie o dużych paczkach.

Chrome, odizolowany lokalny origin 127.0.0.1:5174: dodanie zadania z przypomnieniem, walidacja brakującej godziny, edycja nazwy i oznaczenie Wykonane; dodanie zakupu, edycja ilości, otwarcie i anulowanie duplikatu oraz status Kupione. Escape zamyka panel i przywraca fokus do kafelka Zakupy. Nie było gotowych paczek do ręcznej próby wysyłki; reguły wysyłki i gotowości obejmuje zestaw regresyjny.

Kontrola geometrii: rzeczywiste szerokości CSS 320, 1000, 2000 i 3000 px bez poziomego przepełnienia dokumentu i main. Przy 320 px przewija się wyłącznie wewnętrzny region osi. Emerald Dark, Soft Grey i Dark Gray sprawdzono przez zapis istniejących ustawień i style obliczone paneli oraz tekstów; przywrócono Emerald Dark. Tymczasowe nadpisania rozmiaru przeglądarki usunięto.

Ograniczenie: Page.captureScreenshot kończy się timeoutem. Wykonano kontrolę interakcji, dostępności DOM, geometrii i stylów obliczonych; pełnej kontroli obrazowej nie przeprowadzono. Brak blokerów implementacji; kontrola obrazowa pozostaje w backlogu.

Zmienione pliki:

- src/moduly/zamkniete/pulpit/WidokPulpitu.tsx
- src/moduly/zamkniete/pulpit/FormularzZakupu.tsx
- src/moduly/zamkniete/pulpit/pulpit.css
- testy/pulpit.regresja.test.ts
- testy/v4Pulpit.test.mjs
- testy/inwentaryzacjaV4.mjs
- package.json
- docs/v4/manifest-widokow.json
- docs/v4/rejestr-widokow.md
- docs/v4/backlog.md
- docs/v4/raport-v4-04.md
