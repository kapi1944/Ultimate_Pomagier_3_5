import assert from 'node:assert/strict'
import test from 'node:test'
import type { DaneFormularza, WersjaRoboczaGeneratora } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'
import {
  opublikujWersjeRobocza,
  pobierzKopieRobocze,
  pobierzOpublikowaneSzczegoly,
  usunKopieRobocza,
  zapiszWersjeRobocza,
} from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts'
import { migrujStarszeDokumenty } from '../src/wspolne/dokumenty/migracjaStarszychDokumentow.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

function utworzWersje(id: string): WersjaRoboczaGeneratora {
  return {
    id,
    dokumentId: id,
    wersja: 'test',
    etykietaWersji: 'testowa',
    nazwa: '[Kopia robocza] Szczegoly testowe',
    dataZapisu: '2026-07-17T10:00:00.000Z',
    autorId: 'tester',
    autorNazwa: 'Tester',
    dane: {
      tytulSzkolenia: 'Szczegoly testowe',
      nazwaKlienta: 'Klient testowy',
      organizator: 'SEMPER',
      opiekunId: 'tester',
      status: 'PEŁNE',
      statusSzkolenia: 'W PRZYGOTOWANIACH',
    } as DaneFormularza,
    grupy: [{ trenerzy: [{ imieNazwisko: 'Trener Testowy' }] }] as WersjaRoboczaGeneratora['grupy'],
    adresaci: {} as WersjaRoboczaGeneratora['adresaci'],
    statusyPol: {},
  }
}

test('listy szczegolow filtrują wspólny rejestr oraz obsługują publikację i usunięcie', () => {
  magazyn.clear()
  const wersja = utworzWersje('szczegoly-1')

  zapiszWersjeRobocza(wersja)
  repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'program-1', typ: 'PROGRAM_SZKOLENIA', tytul: 'Program testowy', generatorId: 'programy_szkolen', daneDokumentu: {}, ustawieniaDokumentu: {} }))

  assert.deepEqual(pobierzKopieRobocze().map((kopia) => kopia.id), ['szczegoly-1'])
  assert.equal(repozytoriumWspolnychDokumentow.pobierzPoId('szczegoly-1')?.status, 'ROBOCZY')
  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => dokument.status === 'ROBOCZY').length, 2)

  opublikujWersjeRobocza(wersja)

  assert.deepEqual(pobierzKopieRobocze(), [])
  assert.deepEqual(pobierzOpublikowaneSzczegoly().map((rekord) => rekord.id), ['szczegoly-1'])
  assert.equal(repozytoriumWspolnychDokumentow.pobierzPoId('szczegoly-1')?.status, 'OPUBLIKOWANY')
  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().some((dokument) => dokument.id === 'program-1'), true)

  const kopiaDoUsuniecia = utworzWersje('szczegoly-2')
  zapiszWersjeRobocza(kopiaDoUsuniecia)
  usunKopieRobocza(kopiaDoUsuniecia.id)

  assert.equal(pobierzKopieRobocze().some((kopia) => kopia.id === kopiaDoUsuniecia.id), false)
  assert.equal(repozytoriumWspolnychDokumentow.pobierzPoId(kopiaDoUsuniecia.id)?.czyUsunietyMiekko, true)
})

test('migracja rozpoznaje starszą kopię szczegółów bez typu dokumentu', () => {
  magazyn.clear()
  magazyn.set('ultimatePomagier.kopieRobocze', JSON.stringify([{
    id: 'stare-szczegoly',
    daneFormularza: { tytulSzkolenia: 'Starsze szczegoly', nazwaKlienta: 'Starszy klient', organizator: 'IIST', statusSzczegolow: 'PEŁNE', programSzkolenia: 'Program', uwagi: {} },
    grupy: [],
    dataZapisu: '2026-07-16T10:00:00.000Z',
  }]))

  migrujStarszeDokumenty()

  assert.deepEqual(pobierzKopieRobocze().map((kopia) => kopia.id), ['stare-szczegoly'])
})