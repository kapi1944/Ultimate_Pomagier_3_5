# Naprawa generatora checklist paczek — 2026-10-09

## Rzeczywista przyczyna

Awarię odtworzono w istniejącej karcie Chrome pod `/dokumenty/checklisty-paczek`, na rzeczywistym magazynie użytkownika. Konsola zgłosiła:

```text
QuotaExceededError: Failed to execute 'setItem' on 'Storage':
Setting the value of 'ultimatePomagier.rejestrDokumentow.v1' exceeded the quota.
zapiszStan → repozytoriumWspolnychDokumentow.utworz
→ utworzRecznaChecklistePaczki → useEffect w WidokChecklistPaczek
```

Rejestr zajmował 3 354 317 znaków. Obok pozostawały m.in. kopia rejestru (870 048 znaków), magazyn Dyplomów oraz kopie migracyjne. Nie usuwano żadnych danych ani magazynów legacy. Bez Error Boundary wyjątek efektu montowania usuwał całe drzewo interfejsu, łącznie z menu i nagłówkiem. Nie był to błąd importu, routingu ani kompilacji.

Źródłem prawdy checklist pozostaje wspólny rejestr. Generator wykorzystuje jego adapter `rejestrChecklistPaczek`, normalizację `modelChecklistyPaczki`, `useStanDokumentu`, wspólny układ, swobodne bloki i `AkcjeEksportuPdf`. Przejrzano oba audyty magazynów/systemu dokumentów. Nie konsolidowano innych magazynów ani migracji.

## Historia Git

Commit `f0ce199c5ccde099c611c892b2935142012b0469`, **2026-10-01 13:12:56 +0200**, „Umożliw samodzielne checklisty paczek i opcjonalne powiązanie ze szkoleniem”, wprowadził:

```tsx
useEffect(() => {
  if (dokumentId || tworzenieRozpoczete.current) return
  tworzenieRozpoczete.current = true
  const nowa = utworzRecznaChecklistePaczki(aktorId)
  otworz(nowa.id)
}, [dokumentId, aktorId])
```

Potwierdzono to przez `git log --follow`, diff commita i `git blame` linii 134–139. Wcześniejszy widok tworzył checklistę dopiero po działaniu użytkownika. Ten commit wprowadził zależność otwarcia widoku od skutecznego zapisu do magazynu oraz nieobsłużony wyjątek montowania. **Nie pozwala to przypisać mu samego zapełnienia magazynu ani ustalić daty pierwszej awarii.**

Pliki tego commita: `UkladAplikacji.tsx`, `WidokChecklistPaczek.tsx`, `modelChecklistyPaczki.ts`, `rejestrChecklistPaczek.ts`, `checklistaPaczki.regresja.test.ts`, `domkniecieWidokowDokumentow.regresja.test.ts`.

## Zakres i zmienione pliki naprawy

- `src/wspolne/dokumenty/rejestrDokumentow.ts` oraz nowy `serializacjaRejestruDokumentow.ts`: przy przekroczeniu limitu bezstratna kompresja gzip/base64 w **tym samym kluczu**, bez usuwania starego zapisu. Gdy kompresja też się nie mieści, zapis pozostaje atomowy i błąd nie jest ukrywany.
- `src/wspolne/dane/backupDanych.ts`: poprawna liczba dokumentów w manifeście również dla skompresowanego rejestru; backup zachowuje surowy zapis.
- `src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx`: zachowanie wpisanych danych po odmowie zapisu, komunikat, ponowienie, istniejąca ochrona wyjścia; eksport nie może korzystać ze starszej zapisanej treści przy niezapisanych zmianach.
- `src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts`: domyślne puste kolekcje historii, wydruków, załączników i próśb w niekompletnych zapisach.
- `src/moduly/dokumenty/wspolne/GranicaBleduGeneratora.tsx` oraz `src/aplikacja/layout/UkladAplikacji.tsx`: Error Boundary dla sześciu generatorów dokumentów, zachowujący menu/nagłówek, nazwę generatora, ponowienie i powrót do Dokumentów. Fragment nie dodaje elementu zmieniającego layout.
- `src/moduly/dokumenty/wspolne/useStanDokumentu.ts`: kontrakt ochrony wyjścia uwzględnia wynik `false` nieudanego zapisu.
- `package.json`, `package-lock.json`: bezpośrednia zależność `fflate@0.8.3`, już obecna lokalnie i w lockfile; nowy test zapisu w `npm test` i osobny skrypt przeglądarkowy.
- `testy/zapisRejestruPrzyBrakuMiejsca.test.ts`, `testy/checklistyPaczek.przegladarka.test.mjs`, `testy/checklistaPaczki.regresja.test.ts`: ochrona regresyjna i aktualizacja kontraktu eksportu.
- Ten raport.

## Weryfikacja

- `npm test`: pełny dostępny zestaw, pozytywny wynik.
- `npm run lint`, `npm run build`, `git diff --check`: pozytywne wyniki. Build nadal zgłasza ostrzeżenie o rozmiarze istniejących dużych chunków.
- Testy zapisu: zgodność zwykłego JSON, pełna treść i Unicode po kompresji, zachowanie innych dokumentów/historii/kopii, ponowny odczyt, wydruk, manifest backupu, odmowa obu zapisów oraz `SecurityError` bez nadpisania danych.
- Chrome/Playwright w osobnym profilu: bezpośrednia trasa, wejście przez menu, pusty formularz, zapis/ponowne otwarcie, pozycje (dodanie, edycja, usunięcie), kategorie, odbiorca/przesyłka, podgląd, pobranie rzeczywistego PDF z nagłówkiem `%PDF`, stary format i brakujące kolekcje, symulacja quota z kompresją, odmowa zapisu z zachowaniem formularza, Error Boundary/ponowienie/powrót oraz szerokość 390 px.
- Otwarto pozostałe generatory: Listy obecności, Ankiety, Dyplomy, Karty na drzwi, Programy szkoleń. Brak nieoczekiwanych błędów JS, konsoli i ładowania zasobów w teście.
- Powtórnie otwarto checklistę na danych użytkownika: formularz i podgląd widoczne, brak nowych błędów. Obejrzano pełny zrzut z testu: zachowane pionowe checklisty, jednokrotne kategorie, kolorowe tła i tabela przesyłki. CSS nie zmieniano.

Test przeglądarkowy uruchamia się przy działającym Vite poleceniem `npm run test:checklisty:przegladarka`. Wymaga lokalnego Playwright i Chrome; można wskazać moduł przez `POMAGIER_PLAYWRIGHT` i adres przez `POMAGIER_ADRES`. W tej sesji użyto Playwright dołączonego do środowiska Codex. Test zapisuje zrzuty w ignorowanym `tmp/`.

## Ograniczenia i stan repozytorium

Kompresja nie usuwa fizycznego limitu przeglądarki. Przy jego ponownym przekroczeniu formularz zachowuje niezapisane zmiany, a awaria montowania pokazuje komunikat zamiast pustego interfejsu. Nie dokonano migracji do innej technologii storage ani usuwania historii.

Model rejestru pozostaje w wersji 3; skompresowane **opakowanie zapisu ma wersję 4**. Stare zapisy są odczytywane bez zmian. Starsze wydania aplikacji odrzucą opakowanie 4 zamiast je nadpisać: powrót do kodu sprzed naprawy wymaga wcześniejszego rozpakowania rejestru. Generator wcześniej udostępniał PDF/druk; nie dodawano nowego eksportu DOCX.

Test ujawnił również przechwytywanie kliknięcia przycisku otwarcia menu przez nagłówek w domyślnym profilu. Menu otwarto klawiszem Enter, a następnie sprawdzono jego przyciski. Nie zmieniano tego niezwiązanego problemu layoutu.

Na zrzucie pustej checklisty w profilu testowym widać częściowe przycięcie domyślnego swobodnego bloku nagłówka. Tabela checklisty i przesyłki pozostaje czytelna; nie zmieniano szablonu ani CSS przy naprawie awarii zapisu.

Początkowo repozytorium było czyste na `main`, HEAD `ec89a23`. Podczas pracy pojawiła się niepowiązana zmiana `src/moduly/dokumenty/generatory/programy_szkolen/RendererStronProgramu.tsx`; pozostawiono ją nietkniętą i poza commitem naprawy. Przed commitem sprawdzono aktualny `origin/main`; push ma być zwykły, bez force.
