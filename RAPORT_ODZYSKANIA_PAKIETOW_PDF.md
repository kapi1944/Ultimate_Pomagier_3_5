# Selektywne odzyskanie pakietów PDF

Data: 2026-11-07. Praca wyłącznie w `Ultimate_Pomagier_4_aktualny`, bez internetu, commitów, pushowania i publikacji.

## Punkt bazowy i audyt

- HEAD przed rozpoczęciem: `aaba4998e20ced18abc890df1983ffd165cbe08c`, gałąź `ux/panel-jakosci-responsywnosc`. `git diff --check`: bez błędów.
- Zastane zmiany: `WidokProgramowSzkolen.tsx`, `modelProgramuSzkolenia.ts`, `presetyProgramu.ts`, `testy/presetyProgramu.test.ts`; nieśledzone `.codex-attachments/` oraz `testy/ustawieniaProgramu.przegladarka.test.mjs`. Nie są częścią tego zadania; pozostawiono je bez edycji.
- Raport `AUDYT_POZOSTALOSCI_PO_MIGRACJI.md` opisuje starszy stan. Aktualna historia zawiera już commit `0633e25` („Dodaj zbiorcze pakiety PDF do zatwierdzenia”). Obecne implementacje należy zachować i uzupełnić; nie przywracano starych plików.
- Stary katalog sprawdzono tylko do odczytu: HEAD nadal `b93ea23f9f1bf9985966d4c3319233aced6bdea1`; nadal występują zmiany generatora opisane w audycie. Żadnej komendy modyfikującej stary katalog nie wykonano.
- Ścieżka kopii bezpieczeństwa z audytu nie istnieje w bieżącym środowisku. Nie usuwano ani nie modyfikowano kopii; jej dostępności i sum nie można potwierdzić.
- Źródło dokumentów: aktualny wspólny rejestr i integracja `szczegolyDoDokumentow`; konfiguracja korzysta z jego autosave. Przeczytano audyty zapisu i magazynów danych; nie dodawano magazynu ani migracji.

## Etap 1 — model pakietu

Potwierdzono istniejące: konfigurację v1, stabilne ID wyboru i kolejności, metadane szkolenia, grupy, stany dokumentów, blokowanie braków/archiwum/nieaktualności, sygnaturę pełnych źródeł oraz zgodność zapisu i odczytu autosave. Metadane i relacje grup pozostają dostępne dla istniejącego przepływu etykiet QR.

Uzupełnienie: walidacja usuniętej grupy wybranej w konfiguracji, także gdy pakiet zawiera tylko dokument wspólny. Dodano regresję oraz kontrolę niezmieniania uszkodzonego/nieznanego autosave przy odczycie.

Weryfikacja punktu bazowego: `npm run test:pakiety-pdf` — 16/16; `npx tsc -b` — sukces. Wyniki po uzupełnieniu zostaną zapisane poniżej.

## Kolejne etapy

Przegląd potwierdził istniejące scalanie przez `pdf-lib` (kopiowanie oryginalnych stron), renderowanie przez aktualne generatory, opcjonalne strony wstępne, podgląd i panel w Szczegółach. Brak jawnego wyboru lokalizacji zapisu wymaga lokalnego uzupełnienia granicy zapisu pliku; nie wymaga nowego silnika PDF ani zmiany modeli generatorów.

Raport jest uzupełniany po kolejnych kontrolach.
