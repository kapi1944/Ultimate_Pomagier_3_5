# Naprawa formularza Szczegółów organizacyjnych — 05.11.2026

Zaimplementowano pięć poprawek w istniejącym module. Nie dodano magazynu, migracji, integracji z usługą zewnętrzną ani uprawnień. Zapis kopii, autosave, historia i workflow korzystają z dotychczasowych mechanizmów.

## Przyczyny i poprawki

| Problem | Potwierdzona przyczyna | Wprowadzona poprawka |
| --- | --- | --- |
| Opiekunowie | Lista była liczona przy imporcie modułu, przed inicjalizacją produkcyjnej projekcji. Widok dodatkowo porównywał ID kont z ustaloną listą nazw. | Bieżący odczyt kartoteki oraz subskrypcja zmian projekcji, zapisów DEMO i zdarzeń storage. Opcje przechowują ID kont i wyświetlają nazwy kartoteki. Konto nieaktywne przypisane wcześniej jest zachowane jako niedostępna opcja; nie można wybrać go ponownie. |
| Prefiksy email | Parser dopisywał `E-mail: ` do raportu; część pól przejmowała całą etykietę. Ekstrakcja mogła też przyjąć poprawnie wyglądający fragment uszkodzonego adresu. | Wspólna ekstrakcja całego adresu, obsługa oddzielnych linii, HTML/mailto i Markdown, walidacja wyniku. Opisy sposobu wysyłki pozostają tekstem. Błędne kontakty pozostają do poprawienia i otrzymują niepewność. Oryginalna wiadomość jest zachowana. |
| Odbiorca | Zwracano nabywcę bez odwzorowania `osobaKontaktowa` na `imieNazwiskoOdbiorcy`. Dodatkowo normalizacja przy każdej edycji i odczycie kopii zastępowała własnego odbiorcę danymi nabywcy. | Efektywne dane odbiorcy są wyliczane na bieżąco, z poprawną nazwą pola i mapowaniem statusów. Własne wartości pozostają w modelu, kopii i autosave. Podgląd i eksport używają efektywnego odbiorcy. Odbiorca paczki pozostaje odrębny. |
| Układ | Dwa oddzielne kontenery grupowały sekcje w wierszach. Końcowa reguła ekranowa wymuszała jedną kolumnę. | Jeden Grid `repeat(2, minmax(0, 1fr))`, dwie niezależne pionowe kolumny. Po lewej Pakiet i Materiały; po prawej Dodatkowe i Wymogi materiałów. Przy szerokości formularza do 760 px jedna kolumna. Usunięto kolidujące nadpisania. Zachowano identyfikatory i semantyczne sekcje. |
| Walidacja kontaktów | Uproszczone, powielone wzorce email dopuszczały etykiety i niepoprawną domenę. Telefonów klienta nie sprawdzano na bieżąco. | Wspólny `walidujEmail`, istniejące definicje krajów i `pobierzBladTelefonu`, lokalny adapter tekstowych kontaktów do centralnej walidacji. Błędy od razu trafiają do kontekstu pól, czerwonych ramek, ARIA i Kontroli jakości. |

Kartoteka nazywa obecnie konto Izy „Iza Cz” (dotychczasowe ID: `Iza`). Zachowano tę nazwę kartoteki; nie zmieniano kont ani ich odznak. Pozostali opiekunowie to Kasia RB, Kamila i Dawid. Test produkcyjny używa także innych, niejawnych ID, aby potwierdzić niezależność od nazw.

Puste opcjonalne kontakty nie dostają błędu formatu. Wymagane braki, błędny format i niepewność mają odrębne komunikaty; pod polem widoczny jest jeden komunikat. Błędna wartość nie jest usuwana. Błędne kontakty klienta blokują kompletność, a poprawienie danych i zapis pozwalają ponownie uzyskać status PEŁNE. Kontakty paczki zachowują ostrzegający charakter dotychczasowej walidacji wysyłki.

## Dokładna lista plików zadania

Ścieżki względem repozytorium `Ultimate_Pomagier_4_aktualny`:

1. `src/aplikacja/logowanie/projekcjaKont.ts`
2. `src/kartoteki/uzytkownicy/magazynUzytkownikow.ts`
3. `src/moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow.ts`
4. `src/moduly/zamkniete/szczegoly_organizacyjne/logikaDanychOdbiorcy.ts`
5. `src/moduly/zamkniete/szczegoly_organizacyjne/walidacjaKontaktowSzczegolow.ts` — nowy, lokalny adapter istniejących walidatorów.
6. `src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts`
7. `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PolaSzczegolow.tsx`
8. `src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PodgladSzczegolow.tsx`
9. `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/analizaTresciMaila.ts`
10. `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts`
11. `src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/eksportSzczegolow.ts`
12. `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx`
13. `src/moduly/zamkniete/szczegoly_organizacyjne/widoki/widokNowychSzczegolowOrganizacyjnych.css`
14. `src/wspolne/walidacja/walidatoryDanych.ts`
15. `testy/parserMailaSzczegolow.regresja.test.ts`
16. `testy/daneOdbiorcy.regresja.test.ts`
17. `testy/uwierzytelnianieProdukcyjne.test.ts`
18. `testy/importMailaSzczegolow.przegladarka.test.mjs`
19. `docs/audyty/naprawa-formularza-szczegolow-2026-11-05.md` — ten raport.

## Wykonana weryfikacja

| Kontrola | Wynik końcowy |
| --- | --- |
| Zakresowe testy parsera, odbiorcy i projekcji produkcyjnej | 262/262, kod 0. |
| Pełne `npm test`, wraz z pretest i testami kont | Kod 0. |
| `npm run lint` | Kod 0. |
| `npm run build` | Kod 0. Pozostały ostrzeżenia o dużych chunkach i mieszanym imporcie Tauri. |
| `git diff --check` | Kod 0. |
| `importMailaSzczegolow.przegladarka.test.mjs` | 6/6 w Chrome na Windows, kod 0. |
| `podgladSzczegolow.przegladarka.test.mjs` | 13/13, kod 0. |
| `npm run test:szczegoly:przegladarka` | 2/2, kod 0; edycja wielu grup, autosave, zachowanie danych i kontrola kompletności. |

Test formularza obejmuje osobny wybór, zapis i ponowne otwarcie kopii dla każdego opiekuna, pustą projekcję przed logowaniem, rzeczywiste ID różne od nazw, późne wczytanie katalogu, nieaktywność, blokadę i ponowne logowanie. Test bez DEMO korzysta z izolowanych odpowiedzi testowych lokalnej usługi kont; nie używa rzeczywistych kont produkcyjnych ani haseł.

Pozostałe scenariusze obejmują prefixy i linki email, ochronę tekstu źródłowego oraz poprawnych znaków adresu, zachowanie błędnych wartości i niepewności, natychmiastowe zmiany efektywnego odbiorcy, własne wartości po wyłączeniu powiązania i po ponownym otwarciu kopii, podgląd oraz tekst eksportu. Sprawdzono powiązanie błędu przez ARIA i przejście z Kontroli jakości do pola, zachowanie kopii z błędnym telefonem oraz blokadę publikacji po błędzie email/telefonu. Pusty opcjonalny telefon pozostaje dozwolony.

Geometrię wszystkich czterech sekcji sprawdzono dla okien 1920, 1440, 1000, 768 i 390 px, przy rzeczywistej skali aplikacji 85%, otwartym i zamkniętym panelu jakości, przypiętym menu oraz w kontekście dotykowym. Sprawdzono położenie i niezależną wysokość obu kolumn. Obejrzano zrzuty desktopowe i mobilne; cztery zrzuty i logi są w ignorowanym katalogu `tmp/`.

Pierwsze próby Chrome wymagały uruchomienia lokalnych serwerów i przeglądarki poza izolacją sieciową. Rozszerzone testy wykryły nadpisywanie odbiorcy przez normalizator; poprawiono kod i ponowiono weryfikację. Końcowe wyniki powyżej dotyczą poprawionej wersji.

## Ograniczenia i stan Git

Nie wykonano testów na fizycznym Androidzie ani Raspberry Pi. Weryfikacja responsywności i dotyku odbyła się w Chrome na Windows. Nie wykonywano logowania na rzeczywistych kontach produkcyjnych. Poprawka chroni zachowane własne dane odbiorcy; nie odtwarza danych nadpisanych przez starszą wersję aplikacji.

Gałąź `main`; HEAD i lokalny `origin/main`: `a60b66371500179230615c1647717cd52951bdf7`. Nie wykonywano fetch, commita, pushu, publikacji produkcyjnej ani nowego wydania. Diff zadania został przejrzany. Zmiany są lokalne i gotowe do przeglądu oraz integracji.

Zachowano zastane zmiany `package.json`, ustawień harmonogramu i modułu pulpitu oraz nowe pliki kalendarza pracy i jego audytu/testów. Nie wchodzą do zakresu tej poprawki. Nie zmieniono kluczy storage ani struktury trwałych rekordów.
