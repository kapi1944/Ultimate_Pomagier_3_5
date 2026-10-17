# V4-03 — logowanie, 17.10.2026

Baza f9563e6203ecd1bb6990bafa05760e80a2f91a90, gałąź feat/ultimate-pomagier-v4; stan przed zmianą czysty.

Panel otrzymał oddzieloną strefę brandingu i wyboru konta, nieprzezroczyste powierzchnie, tokeny trzech motywów oraz kafelki z natywnymi przyciskami radio, istniejącymi avatarami i rolami. Wspólny przycisk, komunikaty info/error i pusty stan pochodzą z V4-01. Brak kont blokuje submit. Handler nadal wywołuje ten sam zalogujUzytkownika; sesji, magazynu użytkowników, ról i uprawnień nie zmieniano. Zapisaną paletę odczytuje istniejący magazyn ustawień także przed logowaniem. Rejestr dostosowano do późniejszej numeracji użytkownika: V4-03 logowanie, V4-04 Pulpit; szkolenia zamknięte należą do V4-05.

Testy: v4Logowanie (renderowanie pustego/aktywnego wyboru, role, pojedynczy wybór, submit), uzytkownicySesje.regresja (13 testów), v4Rejestr, v4Motywy; npm run lint, npm run build, git diff --check — kod 0. Loader JSX służy testowaniu rzeczywistych komponentów przez React, bez nowych zależności.

Przeglądarka: prawidłowe logowanie oryginalnym callbackiem i powrót do aplikacji; osobna lokalna strona testowa ze stubem false potwierdziła role=alert po odmowie i wybór konta strzałką. Pusty wybór blokował Zaloguj. Brak poziomego przepełnienia przy rzeczywistych szerokościach CSS 320/800/1600 px. Trzy motywy odtworzono przez zapis istniejących ustawień i reload strony testowej, z pełnymi kolorami panelu i kontrastowymi tekstami. Strona testowa znajduje się wyłącznie w ignorowanym tmp/, nie jest funkcją aplikacji ani częścią commita.

Ograniczenie kontroli wizualnej: Chrome zwraca timeout zrzutów Page.captureScreenshot, dlatego kontrola przeglądarkowa obejmuje DOM, dostępność, geometrię i style obliczone; nie potwierdza pełnej oceny obrazowej. Build nadal ostrzega o dużych paczkach. Brak blokerów implementacji.

Pliki: src/aplikacja/logowanie/PanelLogowania.tsx, src/aplikacja/logowanie/panelLogowania.css, testy/loaderKomponentow.mjs, testy/v4Logowanie.test.mjs, package.json, docs/v4/manifest-widokow.json, docs/v4/rejestr-widokow.md, docs/v4/raport-v4-03.md.
