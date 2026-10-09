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

## Ponowna diagnostyka i dowodowe zawężenie historii — 2026-10-09

Ta część opisuje nową weryfikację, niezależną od wcześniejszego raportu. Stan początkowy: czysty `main`, HEAD `efa0ee7e2cf228064e26420febadc8e9dd78dcc3`, zgodny z lokalnym `origin/main`. Nie było niezacommitowanych zmian użytkownika. Naprawa `946964bfd25ef9d06c056ad4bc13d621c7642d59` była już obecna. Na aktualnym kodzie nie odtworzono pustego ekranu ani na istniejącej checkliście użytkownika, ani przy bezpośrednim otwarciu nowej checklisty w jego profilu Chrome. Po odświeżeniu formularz, podgląd i menu były widoczne; odczytana konsola nie zawierała błędów ani ostrzeżeń.

### Mapa zależności

```text
/dokumenty/checklisty-paczek[/id]
→ UkladAplikacji.tsx: odczyt trasy, wybór widoku, GranicaBleduGeneratora
→ WidokChecklistPaczek.tsx
  → efekty odczytu trasy, statusu zapisu i tworzenia nowej checklisty
  → Paczki / Pozycja / formularz danych / wspólny układ generatorów
  → rejestrChecklistPaczek.ts / normalizujDaneChecklisty
  → repozytoriumWspolnychDokumentow / rejestrDokumentow.ts
  → localStorage: ultimatePomagier.rejestrDokumentow.v1
  → Druk / RendererSwobodnychBlokow
  → AkcjeEksportuPdf / wspólne adaptery PDF i druk
```

Checklisty nie mają osobnego silnika ani magazynu IndexedDB. Zapis, historia i wersje wydruku korzystają z rejestru; `useStanDokumentu` śledzi stan zapisu, a wpisane dane przy odmowie zapisu zachowuje widok. Adapter odczytu normalizuje starszy model. Migracje rejestru i starszych dokumentów pozostają w istniejącej warstwie wspólnej. Widok jest importowany statycznie przez layout; awaria nie pochodziła z lazy importu, podglądu ani eksportu. Eksport dostępny w tym generatorze to PDF/druk, nie DOCX.

### GOOD / BAD potwierdzone w Chrome

Porównano pełne snapshoty źródeł z `git archive` w ignorowanym katalogu `tmp/regresja-checklist/`, bez checkoutu, worktree, zmiany brancha ani HEAD. Każdy snapshot uruchomiono przez Vite na osobnym porcie, w odizolowanym kontekście Chrome/Playwright. Wszystkie korzystały z aktualnych lokalnych zależności i konfiguracji Vite; nie rekonstruowano historycznych instalacji npm. Jest to porównanie zachowania historycznego kodu przy tym samym środowisku, nie ustalenie daty awarii użytkownika.

Warunek reprodukcji: `Storage.setItem` odmawia zapisu zwykłego JSON pod kluczem rejestru przez `DOMException` o nazwie `QuotaExceededError`, dopuszczając mniejszy zapis skompresowany. To deterministyczna symulacja odmowy magazynu; nie zapełniano ani nie usuwano danych użytkownika.

| Snapshot | Bez odmowy zapisu | Przy odmowie zapisu rejestru |
| --- | --- | --- |
| `0e5e2879e67ba7da3125ccc52efc0be7e313be63` — rodzic `f0ce199`, 2026-10-01 13:07:40 +0200 | Dotychczasowy ekran tworzenia i listy checklist, bez błędów | Ten sam ekran oraz menu pozostają dostępne, bez wyjątku — **GOOD dla awarii otwierania** |
| `f0ce199c5ccde099c611c892b2935142012b0469` — 2026-10-01 13:12:56 +0200 | Formularz checklisty działa | `QuotaExceededError`, pusta treść strony, brak menu — **pierwszy BAD na tej granicy** |
| `ec89a232b0decc0e9e48a4e0d0fe141bbd5a9302` — rodzic wcześniejszej naprawy | Formularz checklisty działa | Ten sam wyjątek i pusty ekran; nowy test regresyjny **FAIL** |
| `efa0ee7e2cf228064e26420febadc8e9dd78dcc3` — początkowy HEAD tej weryfikacji | Formularz i istniejące dokumenty działają | Bezpośrednie otwarcie działa po kompresji, nowy test **PASS** |

GOOD i BAD są sąsiednimi commitami, więc dalszy bisect nie był potrzebny. GOOD oznacza brak tej awarii przy otwieraniu ówczesnego ekranu; nie oznacza możliwości tworzenia dokumentu przy całkowicie niedostępnym storage. Źródło zapełnienia rzeczywistego magazynu oraz data jego pierwszego przekroczenia nadal nie są ustalone.

Debugger CDP zatrzymany w chwili rzucenia wyjątku potwierdził stos:

```text
QuotaExceededError: Symulacja przekroczenia limitu rejestru
Storage.setItem
→ zapiszStan
→ repozytoriumWspolnychDokumentow.utworz
→ utworzRecznaChecklistePaczki
→ efekt WidokChecklistPaczek
→ commitHookEffectListMount / commitHookPassiveMountEffects
→ commitPassiveMountOnFiber / flushPassiveEffects
```

Pełne ramki CDP, wyjątki, ostrzeżenia Reacta i wyniki sieci zachowano lokalnie w `tmp/regresja-checklist/wyniki.json`, przebieg w `przebieg.txt`, zrzuty w `rodzic.png`, `f0ce199.png`, `ec89a23.png`. Historyczne widoki nie zgłosiły błędów ładowania zasobów ani nieobsłużonych błędów bez odmowy zapisu. Ostrzeżenie Reacta po wyjątku wskazywało `WidokChecklistPaczek` i brak Error Boundary. Stos z rethrow Reacta nie wskazywał pierwotnego wywołania; dlatego przechwycono również ramki w miejscu rzucenia wyjątku.

### Dlaczego wcześniejsze testy przepuszczały regresję

W `f0ce199` test `checklistaPaczki.regresja.test.ts` zastępował localStorage przez nieograniczoną `Map`: `setItem` zawsze wykonywał `magazyn.set`. Testował model, repozytorium i fragmenty źródła, bez montowania widoku w przeglądarce i bez błędu quota. Build sprawdzał typy i bundling, więc również nie odtwarzał wyjątku zapisu w efekcie Reacta. Nie ustalono, jakie kontrole wykonywano poza repozytorium.

### Zmiany tej ponownej weryfikacji

Zmieniono tylko ten raport oraz `testy/checklistyPaczek.przegladarka.test.mjs`. Kod produkcyjny i CSS pozostają bez zmian, ponieważ istniejąca naprawa usuwa potwierdzoną regresję. Dodany test sprawdza bezpośrednie otwarcie przy odmowie zapisu JSON, widoczność formularza/menu/podglądu, skompresowany zapis, reload oraz ponowny odczyt istniejącej checklisty bez utraty treści. Uruchomiony przeciw niezmienionemu snapshotowi `ec89a23` kończy się kodem 1 i błędem quota; przeciw aktualnemu kodowi przechodzi. Dotychczasowy obszerniejszy test nadal sprawdza wejście z menu, edycję, dodawanie/usuwanie pozycji, kategorie, przesyłkę, zapis, PDF, niekompletne/starsze dane, odmowę obu formatów zapisu oraz Error Boundary z ponowieniem i powrotem do Dokumentów.

Potwierdzono `npm test`, `npm run lint`, `npm run build` i `git diff --check`. Nie ma osobnego skryptu `typecheck`; `build` wykonuje `tsc -b`. Testy Chrome: **2 PASS, 0 FAIL** po uruchomieniu działającego Vite. Pierwsza próba była blokowana przez sandbox sieci, a jedna późniejsza próba zakończyła się `ERR_CONNECTION_REFUSED`, gdy lokalny Vite przestał odpowiadać; po uruchomieniu Vite powtórzono cały test przeglądarkowy z wynikiem PASS. Ostrzeżenia testów parsera PDF o danych fontów i builda o dużych chunkach nie powodują niepowodzenia kontroli.

Przejrzano zrzut działającego podglądu: pionowe pozycje, pojedyncze nazwy kategorii, kolorowe tła i tabela przesyłki pozostają zachowane. Test sprawdza także szerokość 390 px. Na rzeczywistym profilu wejście pod bazowy URL utworzyło nową pustą checklistę zgodnie z obecnym przepływem; nie usuwano żadnego dokumentu użytkownika.

Wspólny rejestr jest używany także przez inne generatory i ich adaptery zapisu/kopii. Test przeglądarkowy otworzył Listy obecności, Ankiety, Karty na drzwi, Dyplomy i Programy na tym samym skompresowanym rejestrze: bez nieoczekiwanych błędów JS, konsoli, sieci i fallbacku. Nie jest to pełna weryfikacja eksportów wszystkich generatorów. Nie znaleziono dodatkowej aktualnej regresji wymagającej poprawki. Pozostają wcześniej opisane ograniczenia quota, zgodności ze starszą aplikacją oraz zastane problemy przycięcia nagłówka i trafiania myszą w przycisk menu. Test przeglądarkowy wymaga jawnego uruchomienia `npm run test:checklisty:przegladarka`; `npm test` uruchamia natomiast test odmowy zapisu rejestru z wcześniejszej naprawy.
