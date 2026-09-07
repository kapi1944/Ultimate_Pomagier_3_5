import assert from 'node:assert/strict'
import test from 'node:test'
import { deserializujDaneAnkiety, podzielAnkieteNaStrony, serializujDaneAnkiety, utworzDomyslneDaneAnkiety, zastosujPresetAnkiety, type PytanieAnkiety } from '../src/moduly/dokumenty/generatory/ankiety/modelAnkiety.ts'
import { deserializujDaneListyObecnosci, pobierzBladEksportuListy, podzielListeObecnosciNaStrony, porownajUczestnikowListyObecnosci, serializujDaneListyObecnosci, utworzDomyslneDaneListyObecnosci, zastosujSynchronizacjeUczestnikow } from '../src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci.ts'
import { pobierzSzablonyDokumentow, zapiszKopieUkladuSwobodnychBlokow } from '../src/wspolne/dokumenty/szablonyDokumentow.ts'
import { utworzBlokiWzorcaProjektowego } from '../src/moduly/dokumenty/wspolne/blokiWzorcaProjektowego.ts'

test('ankieta zachowuje treść i skalę po kilku zmianach wariantu i ponownym odczycie', () => {
  const oryginalna = utworzDomyslneDaneAnkiety()
  const pytania: PytanieAnkiety[] = [
    { id: 'naglowek', typ: 'NAGLOWEK_SEKCJI', tekst: 'Wiedza' },
    { id: 'skala', typ: 'SKALA', tekst: 'Ocena szkolenia', skala: { liczbaStopni: 10, etykiety: Array.from({ length: 10 }, (_, indeks) => String(indeks + 1)), opisLewy: 'Bardzo źle', opisPrawy: 'Bardzo dobrze' } },
    { id: 'otwarte', typ: 'OTWARTE', tekst: 'Co poprawić?' },
    { id: 'wybor', typ: 'JEDNOKROTNY_WYBOR', tekst: 'Tryb', opcje: ['Online', 'Stacjonarnie'] },
    { id: 'tekst', typ: 'TEKST_INFORMACYJNY', tekst: 'Dziękujemy.' },
  ]
  const wlasna = { ...oryginalna, preset: 'WLASNA' as const, sekcje: [{ id: 'sekcja', nazwa: 'Ocena', widoczna: true, pytania }] }
  const nowoczesna = zastosujPresetAnkiety(wlasna, 'NOWOCZESNA_SEMPER')
  const ponownie = zastosujPresetAnkiety(nowoczesna, 'ORYGINALNA_IIST_SKROCONA')
  assert.deepEqual(deserializujDaneAnkiety(serializujDaneAnkiety(ponownie)).sekcje, wlasna.sekcje)
  assert.equal(ponownie.preset, 'WLASNA')
  assert.equal(oryginalna.sekcje[0].pytania[0].typ, 'OCENA_4')
  assert.equal(utworzDomyslneDaneAnkiety('ORYGINALNA_IIST_SKROCONA').sekcje.at(-1)?.widoczna, false)
})

test('długie pytania zwiększają liczbę stron bez zgubienia kolejności ani pustych fragmentów', () => {
  const dane = { ...utworzDomyslneDaneAnkiety('WLASNA'), sekcje: [{ id: 'sekcja', nazwa: 'Pytania', widoczna: true, pytania: Array.from({ length: 12 }, (_, indeks) => ({ id: String(indeks), typ: 'OTWARTE' as const, tekst: 'Pytanie' })) }] }
  const dlugie = { ...dane, sekcje: dane.sekcje.map((sekcja) => ({ ...sekcja, pytania: sekcja.pytania.map((pytanie) => ({ ...pytanie, tekst: 'Długie pytanie '.repeat(80) })) })) }
  const strony = podzielAnkieteNaStrony(dlugie)
  assert.ok(strony.length > podzielAnkieteNaStrony(dane).length)
  assert.deepEqual(strony.flatMap((strona) => strona.sekcje.flatMap((sekcja) => sekcja.pytania.map((pytanie) => pytanie.id))), dane.sekcje[0].pytania.map((pytanie) => pytanie.id))
  assert.ok(strony.every((strona) => strona.sekcje.every((sekcja) => sekcja.pytania.length)))
})

test('usunięta treść i bloki nie odrastają po otwarciu dokumentu', () => {
  const ankieta = deserializujDaneAnkiety(serializujDaneAnkiety({ ...utworzDomyslneDaneAnkiety('WLASNA'), sekcje: [], blokiSwobodne: [] }))
  assert.deepEqual(ankieta.sekcje, [])
  assert.deepEqual(ankieta.blokiSwobodne, [])
  assert.deepEqual(deserializujDaneListyObecnosci(serializujDaneListyObecnosci({ ...utworzDomyslneDaneListyObecnosci(), blokiSwobodne: [] })).blokiSwobodne, [])
})

test('pusta lista wymaga jawnego wyboru; 10, 15, 20 i własna liczba są eksportowalne', () => {
  const dane = utworzDomyslneDaneListyObecnosci()
  assert.ok(pobierzBladEksportuListy(dane))
  for (const liczbaPustychWierszy of [10, 15, 20, 57]) {
    const pusta = { ...dane, trybListy: 'PUSTA' as const, liczbaPustychWierszy }
    assert.equal(pobierzBladEksportuListy(pusta), null)
    assert.equal(podzielListeObecnosciNaStrony(pusta).flatMap((strona) => strona.uczestnicy).length, liczbaPustychWierszy)
  }
  assert.ok(pobierzBladEksportuListy({ ...dane, trybListy: 'PUSTA', liczbaPustychWierszy: 1.5 }))
  assert.ok(pobierzBladEksportuListy({ ...dane, kolumny: [] }))
})

test('kolumny podpisów nie są ściskane; przełączanie dni zachowuje osoby i numerację', () => {
  const dane = { ...utworzDomyslneDaneListyObecnosci(), uczestnicy: Array.from({ length: 57 }, (_, indeks) => ({ id: String(indeks), imieINazwisko: `Osoba ${indeks}` })), daty: ['1', '2', '3'] }
  assert.equal(podzielListeObecnosciNaStrony(dane).length, 3)
  assert.equal(podzielListeObecnosciNaStrony({ ...dane, wariantWielodniowy: 'OSOBNE_STRONY' }).length, 9)
  const strony = podzielListeObecnosciNaStrony({ ...dane, daty: ['1', '2', '3', '4', '5'] })
  assert.equal(strony.length, 6)
  assert.ok(strony.every((strona) => strona.datyPodpisow.length <= 3))
  assert.deepEqual(strony.slice(0, 3).map((strona) => strona.indeksPierwszegoWiersza), [0, 28, 56])
  const dlugie = { ...dane, uczestnicy: dane.uczestnicy.map((osoba) => ({ ...osoba, imieINazwisko: 'Bardzo długie nazwisko '.repeat(6) })) }
  assert.ok(podzielListeObecnosciNaStrony(dlugie).length > 3)
})

test('synchronizacja pokazuje także usunięcie wszystkich osób i chroni osoby ręczne', () => {
  const dane = { ...utworzDomyslneDaneListyObecnosci(), uczestnicy: [{ id: 'a', imieINazwisko: 'Lokalna korekta' }, { id: 'b', imieINazwisko: 'Osoba ręczna', czyReczny: true }] }
  assert.equal(porownajUczestnikowListyObecnosci(dane.uczestnicy, []).usunieci.length, 1)
  assert.equal(porownajUczestnikowListyObecnosci(dane.uczestnicy, [{ id: 'a', imieINazwisko: 'Źródłowa nazwa' }]).zmienieni[0].obecny.imieINazwisko, 'Lokalna korekta')
  assert.equal(dane.uczestnicy.length, 2)
  assert.deepEqual(zastosujSynchronizacjeUczestnikow(dane, []).uczestnicy.map((osoba) => osoba.id), ['b'])
})

test('własne szablony obu generatorów zapisują niezależne bloki we wspólnej kartotece', () => {
  const magazyn = new Map<string, string>()
  globalThis.localStorage = { getItem: (klucz) => magazyn.get(klucz) ?? null, setItem: (klucz, wartosc) => { magazyn.set(klucz, wartosc) }, removeItem: (klucz) => { magazyn.delete(klucz) }, clear: () => magazyn.clear(), key: (indeks) => [...magazyn.keys()][indeks] ?? null, get length() { return magazyn.size } }
  for (const typDokumentu of ['Ankieta', 'Lista obecności'] as const) {
    const bloki = typDokumentu === 'Ankieta' ? utworzDomyslneDaneAnkiety().blokiSwobodne : utworzDomyslneDaneListyObecnosci().blokiSwobodne
    const szablon = zapiszKopieUkladuSwobodnychBlokow({ nazwa: `Własny ${typDokumentu}`, typDokumentu, organizator: 'SEMPER', autor: 'Test', bloki: [...bloki, ...utworzBlokiWzorcaProjektowego(typDokumentu)] })
    bloki[0].xMm = 99
    const odczyt = pobierzSzablonyDokumentow().find((pozycja) => pozycja.id === szablon.id)!
    assert.notEqual(odczyt.dokumentBlokowy.blokiSwobodne![0].xMm, 99)
    assert.ok(odczyt.dokumentBlokowy.blokiSwobodne!.some((blok) => blok.typ === 'tekst'))
    assert.ok(odczyt.dokumentBlokowy.blokiSwobodne!.some((blok) => blok.id === 'projekt-stopka'))
  }
})
