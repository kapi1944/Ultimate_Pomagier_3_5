import assert from 'node:assert/strict'
import test from 'node:test'
import { migrujStarszeDokumenty } from '../src/wspolne/dokumenty/migracjaStarszychDokumentow.ts'
import { kluczRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

test('migracja prostych szkicow zachowuje zrodlo, tworzy kopie i jest idempotentna', () => {
  magazyn.clear()
  const szkic = 'Tytuł szkolenia: Test\nUczestnicy: Anna Kowalska'
  magazyn.set('ultimate-pomagier.listy-obecnosci.szkic', szkic)

  const pierwszyRaport = migrujStarszeDokumenty()
  const dokument = repozytoriumWspolnychDokumentow.pobierzWszystkie().find((rekord) => rekord.typ === 'LISTA_OBECNOSCI')

  assert.equal(pierwszyRaport.przeniesione, 1)
  assert.equal(dokument?.status, 'ROBOCZY')
  assert.equal((dokument?.daneDokumentu as { tekst?: string }).tekst, szkic)
  assert.equal(magazyn.get('ultimate-pomagier.listy-obecnosci.szkic'), szkic)
  assert.equal(magazyn.get('ultimatePomagier.migracjaDokumentow.kopia.ultimate-pomagier.listy-obecnosci.szkic'), szkic)

  const drugiRaport = migrujStarszeDokumenty()
  assert.equal(drugiRaport.przeniesione, 0)
  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((rekord) => rekord.typ === 'LISTA_OBECNOSCI').length, 1)
})

test('migracja pomija uszkodzony zapis dyplomu bez blokowania innych danych', () => {
  magazyn.clear()
  magazyn.set('ultimate-pomagier.dyplomy.generator-pawla', '{uszkodzony')
  magazyn.set('ultimate-pomagier.ankiety.szkic', 'Marka: SEMPER')

  const raport = migrujStarszeDokumenty()

  assert.equal(raport.bledne, 1)
  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().some((rekord) => rekord.typ === 'ANKIETA'), true)
  assert.ok(magazyn.get(kluczRejestruDokumentow))
})
