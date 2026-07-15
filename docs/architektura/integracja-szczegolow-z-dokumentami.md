# Integracja Szczegółów organizacyjnych z dokumentami

Moduł `src/wspolne/integracje/szczegolyDoDokumentow` oddziela dane Szczegółów organizacyjnych od generatorów dokumentów. Funkcja `zbudujKontekstZeSzczegolow` przyjmuje zwykłe dane źródłowe (`DaneSzczegolowDoKontekstu`), a pomocnicze funkcje przygotowują je z rzeczywistych typów `WersjaRoboczaGeneratora` oraz `OpublikowaneSzczegolyOrganizacyjne`. Dzięki temu generator nie odczytuje hooka `useGeneratorSzczegolow`, Reacta ani magazynu przeglądarkowego.

`KontekstDokumentuSzkolenia` jest migawką: wszystkie obiekty są klonowane przed zwróceniem i przed zapisaniem ich jako powiązanie dokumentu. Zawiera identyfikator Szczegółów, rzeczywisty identyfikator wersji (albo `null`), datę modyfikacji i deterministyczny odcisk. Odcisk powstaje przez stabilną serializację obiektu z posortowanymi kluczami, a następnie 32-bitowy skrót FNV-1a. Nie jest zależny od kolejności kluczy ani od wartości losowych.

Obecny model `GrupaSzkoleniowa` ma zakres `dataOd`/`dataDo`, liczbę uczestników, trenerów, formę i nazwę miejsca, lecz nie przechowuje list uczestników ani identyfikatora/adresu lokalizacji. Mapper zachowuje więc znane daty, nazwę miejsca i liczbę uczestników, a dla nieistniejących danych przekazuje puste listy lub `null`. Nie tworzy danych demonstracyjnych ani nie odczytuje `localStorage`.

Plan generowania obsługuje trzy strategie:

- `JEDEN_NA_GRUPE` tworzy osobną pozycję dla każdej wybranej grupy.
- `JEDEN_NA_UCZESTNIKA` tworzy pozycję dla każdego uczestnika wybranych grup.
- `JEDEN_ZBIORCZY` tworzy jedną pozycję obejmującą wszystkie wybrane grupy.

Pierwszy adapter, `adapterListyObecnosci`, przygotowuje DTO jednej grupy: dane szkolenia, daty, lokalizacje, organizatora wraz z logo, klienta, trenerów i uczestników. Dokument może objąć wiele dni tej samej grupy, ale nigdy nie miesza danych innych grup. DTO jest opakowane przez `DaneDokumentuZIntegracji`, które rozdziela `daneZrodlowe`, `korektyReczne` i `powiazanieZeZrodlem` z osobną migawką kontekstu. Przyszłe odświeżenie danych źródłowych może więc zachować korekty ręczne.

Walidacja zwraca błędy i ostrzeżenia zamiast wyświetlać UI. Dla Listy obecności blokują: brak tytułu, brak lub błędny wybór grupy, brak terminu oraz brak uczestników. Ostrzeżenia obejmują brak trenera, lokalizacji, klienta, organizatora, logo oraz niepełne dane uczestnika. Brak e-maila ani stanowiska nie blokuje dokumentu.

Następny etap może dodać wybór grup, utworzenie rekordu w rejestrze dokumentów i podłączenie DTO do generatora. Ten etap celowo nie dodaje UI, zapisu do rejestru, synchronizacji przy otwieraniu ani generatora Zestawienia organizacyjnego grup.
