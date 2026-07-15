# Integracja Szczegółów organizacyjnych z dokumentami

Moduł `src/wspolne/integracje/szczegolyDoDokumentow` oddziela dane Szczegółów organizacyjnych od generatorów dokumentów. Funkcja `zbudujKontekstZeSzczegolow` przyjmuje zwykłe dane źródłowe (`DaneSzczegolowDoKontekstu`), a pomocnicze funkcje przygotowują je z rzeczywistych typów `WersjaRoboczaGeneratora` oraz `OpublikowaneSzczegolyOrganizacyjne`. Dzięki temu generator nie odczytuje hooka `useGeneratorSzczegolow`, Reacta ani magazynu przeglądarkowego.

`KontekstDokumentuSzkolenia` jest migawką: wszystkie obiekty są klonowane przed zwróceniem i przed zapisaniem ich jako powiązanie dokumentu. Zawiera identyfikator Szczegółów, rzeczywisty identyfikator wersji (albo `null`), datę modyfikacji i deterministyczny odcisk. Odcisk powstaje przez stabilną serializację obiektu z posortowanymi kluczami, a następnie 32-bitowy skrót FNV-1a. Nie jest zależny od kolejności kluczy ani od wartości losowych.

Model `GrupaSzkoleniowa` przechowuje opcjonalną listę `uczestnicy` (identyfikator, imię, nazwisko i e-mail), dzięki czemu Lista obecności może otrzymać rzeczywistych uczestników wybranej grupy. Pole jest opcjonalne dla zgodności ze starszymi wersjami roboczymi; jego brak mapuje się na pustą listę i jest błędem blokującym tylko dla tworzonej Listy obecności. Model nadal nie przechowuje identyfikatora ani adresu lokalizacji, więc mapper przekazuje te wartości jako `null`. Nie tworzy danych demonstracyjnych ani nie odczytuje `localStorage`.

Plan generowania obsługuje trzy strategie:

- `JEDEN_NA_GRUPE` tworzy osobną pozycję dla każdej wybranej grupy.
- `JEDEN_NA_UCZESTNIKA` tworzy pozycję dla każdego uczestnika wybranych grup.
- `JEDEN_ZBIORCZY` tworzy jedną pozycję obejmującą wszystkie wybrane grupy.

Pierwszy adapter, `adapterListyObecnosci`, przygotowuje DTO jednej grupy: dane szkolenia, daty, lokalizacje, organizatora wraz z logo, klienta, trenerów i uczestników. Dokument może objąć wiele dni tej samej grupy, ale nigdy nie miesza danych innych grup. DTO jest opakowane przez `DaneDokumentuZIntegracji`, które rozdziela `daneZrodlowe`, `korektyReczne` i `powiazanieZeZrodlem` z osobną migawką kontekstu. Przyszłe odświeżenie danych źródłowych może więc zachować korekty ręczne.

Walidacja zwraca błędy i ostrzeżenia zamiast wyświetlać UI. Dla Listy obecności blokują: brak tytułu, brak lub błędny wybór grupy, brak terminu oraz brak uczestników. Ostrzeżenia obejmują brak trenera, lokalizacji, klienta, organizatora, logo oraz niepełne dane uczestnika. Brak e-maila ani stanowiska nie blokuje dokumentu.

Etap 5G wykorzystuje ten kontrakt w Szczegółach organizacyjnych: pozwala wybrać grupy, tworzy osobne robocze Listy obecności przez wspólne repozytorium, otwiera pojedynczy dokument albo pokazuje wynik zbiorczy, a także udostępnia Dokumenty powiązane. Generator odczytuje dokument po ID i zapisuje wyłącznie korekty ręczne. Kolejny etap może dodać synchronizację danych źródłowych albo generator Zestawienia organizacyjnego grup.
