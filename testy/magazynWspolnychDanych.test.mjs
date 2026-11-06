import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { otworzMagazynWspolnychDanych } from '../serwer/dane/magazynSqlite.mjs'

const szkolenie = [{ rodzaj: 'SZKOLENIE', id: 'szkolenie-Łódź' }]
const grupa = [...szkolenie, { rodzaj: 'GRUPA', id: 'grupa-1' }]
const checklista = [...grupa, { rodzaj: 'CHECKLISTA', id: 'checklista-1' }]
const paczka = [...checklista, { rodzaj: 'PACZKA', id: 'paczka-1' }]
const pozycja = [...paczka, { rodzaj: 'POZYCJA_CHECKLISTY', id: 'pozycja-1' }]
const zdjecie = [...paczka, { rodzaj: 'ZDJECIE', id: 'zdjęcie-1' }]
const dokument = [...grupa, { rodzaj: 'DOKUMENT', id: 'dokument-1' }]
const pakiet = [...grupa, { rodzaj: 'PAKIET_PDF', id: 'pakiet-1' }]
const zmiana = (sciezka, wersjaBazowa = 0, dane = {}) => ({ sciezka, wersjaBazowa, dane })
const zadanie = (operacjaId, zmiany, aktorId = 'konto-a') => ({ aktorId, operacjaId, zmiany })

test('powiązania zachowują identyfikatory i rozróżniają grupę o tym samym ID w innym szkoleniu', () => {
  const magazyn = otworzMagazynWspolnychDanych(':memory:')
  try {
    const inneSzkolenie = [{ rodzaj: 'SZKOLENIE', id: 'szkolenie-2' }]
    const innaGrupa = [...inneSzkolenie, grupa.at(-1)]
    const sciezki = [szkolenie, grupa, checklista, paczka, pozycja, zdjecie, dokument, pakiet, inneSzkolenie, innaGrupa]
    const zmiany = sciezki.map((sciezka) => zmiana(sciezka, 0, { id: sciezka.at(-1).id, szkolenieId: sciezka[0].id }))
    assert.deepEqual(magazyn.zapiszPartie(zadanie('import-1', zmiany)), sciezki.map((sciezka) => ({ sciezka, wersja: 1 })))
    assert.equal(magazyn.pobierz(grupa).dane.szkolenieId, szkolenie[0].id)
    assert.equal(magazyn.pobierz(innaGrupa).dane.szkolenieId, inneSzkolenie[0].id)
    assert.equal(magazyn.pobierz(zdjecie).dane.id, 'zdjęcie-1')
    assert.throws(() => magazyn.zapiszPartie(zadanie('duplikat', [zmiana([...innaGrupa, dokument.at(-1)])])), { kod: 'KONFLIKT_ID' })
    assert.throws(() => magazyn.zapiszPartie(zadanie('zly-rodzic', [zmiana([...grupa, zdjecie.at(-1)])])), { kod: 'NIEPRAWIDLOWE_POWIAZANIE' })
  } finally {
    magazyn.zamknij()
  }
})

test('po odtworzeniu połączenia ponowienie daje poprzednie potwierdzenie, a cudza nowsza zmiana jest chroniona', () => {
  const katalog = mkdtempSync(join(tmpdir(), 'pomagier-wspolne-dane-'))
  const plik = join(katalog, 'dane.sqlite3')
  try {
    const pierwsze = otworzMagazynWspolnychDanych(plik)
    const drugie = otworzMagazynWspolnychDanych(plik)
    try {
      pierwsze.zapiszPartie(zadanie('poczatek', [szkolenie, grupa, checklista, paczka, pozycja].map((sciezka) => zmiana(sciezka))))
      assert.equal(drugie.pobierz(pozycja).wersja, 1)
      const zapisA = zadanie('kompletowanie', [zmiana(pozycja, 1, { gotowe: false, ilosc: 12 })])
      const wynik = pierwsze.zapiszPartie(zapisA)
      assert.throws(() => drugie.zapiszPartie(zadanie('kompletowanie', [zmiana(pozycja, 1, { ilosc: 30 })], 'konto-b')), { kod: 'KONFLIKT_WERSJI' })
      assert.equal(drugie.pobierz(pozycja).dane.ilosc, 12)
      drugie.zapiszPartie(zadanie('kompletowanie', [zmiana(pozycja, 2, { ilosc: 30 })], 'konto-b'))
      assert.deepEqual(drugie.zapiszPartie(zadanie('kompletowanie', [zmiana(pozycja, 1, { ilosc: 12, gotowe: false })])), wynik)
      assert.throws(() => drugie.zapiszPartie(zadanie('kompletowanie', [zmiana(pozycja, 3, { ilosc: 31 })])), { kod: 'KONFLIKT_OPERACJI' })
      assert.equal(drugie.pobierz(pozycja).dane.ilosc, 30)
      assert.deepEqual(drugie.pobierzHistorie(pozycja).map(({ aktorId, wersja, wersjaBazowa }) => [aktorId, wersja, wersjaBazowa]), [
        ['konto-a', 1, 0], ['konto-a', 2, 1], ['konto-b', 3, 2],
      ])
    } finally {
      pierwsze.zamknij()
      drugie.zamknij()
    }
    const odtworzone = otworzMagazynWspolnychDanych(plik)
    try { assert.equal(odtworzone.pobierz(pozycja).wersja, 3) }
    finally { odtworzone.zamknij() }
  } finally {
    for (const koncowka of ['', '-wal', '-shm']) rmSync(plik + koncowka, { force: true })
    rmdirSync(katalog)
  }
})

test('nieudana partia wycofuje zapis rekordów, historii i potwierdzenia', () => {
  const magazyn = otworzMagazynWspolnychDanych(':memory:')
  try {
    assert.throws(() => magazyn.zapiszPartie(zadanie('import', [zmiana(szkolenie), zmiana(zdjecie)])), { kod: 'BRAK_RODZICA' })
    assert.equal(magazyn.pobierz(szkolenie), null)
    assert.deepEqual(magazyn.pobierzHistorie(szkolenie), [])
    assert.equal(magazyn.zapiszPartie(zadanie('import', [zmiana(szkolenie), zmiana(grupa) /* Poprawiona partia */])).length, 2)
    assert.throws(() => magazyn.zapiszPartie(zadanie('aktualizacja', [zmiana(szkolenie, 1), zmiana(grupa, 0)])), { kod: 'KONFLIKT_WERSJI' })
    assert.equal(magazyn.pobierzHistorie(szkolenie).length, 1)
  } finally {
    magazyn.zamknij()
  }
})

test('adapter odrzuca istniejącą bazę o obcym schemacie bez zmiany danych', () => {
  const katalog = mkdtempSync(join(tmpdir(), 'pomagier-wspolne-dane-'))
  const plik = join(katalog, 'konta.sqlite3')
  try {
    const innaBaza = new DatabaseSync(plik)
    try {
      innaBaza.exec("CREATE TABLE konta (id TEXT); INSERT INTO konta VALUES ('konto-a');")
      assert.throws(() => otworzMagazynWspolnychDanych(plik), { kod: 'NIEZGODNA_BAZA' })
      assert.equal(innaBaza.prepare('SELECT id FROM konta').get().id, 'konto-a')
      assert.equal(innaBaza.prepare('SELECT count(*) AS liczba FROM sqlite_schema').get().liczba, 1)
    } finally {
      innaBaza.close()
    }
  } finally {
    rmSync(plik, { force: true })
    rmdirSync(katalog)
  }
})
