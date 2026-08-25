import assert from 'node:assert/strict'
import test from 'node:test'
import { migrujStarszeDokumenty } from '../src/wspolne/dokumenty/migracjaStarszychDokumentow.ts'
import { kluczRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { kluczRepozytoriumDokumentow } from '../src/wspolne/dokumenty/repozytoriumDokumentow.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

function ustawLegacy(dokumenty: unknown[], historia: unknown[] = []) {
  magazyn.set(kluczRepozytoriumDokumentow, JSON.stringify({ dokumenty, historia }))
}

function legacyLista(id = 'lista-legacy') {
  return {
    id,
    typGeneratora: 'listy_obecnosci',
    tytul: 'Lista obecności legacy',
    stanCyklu: 'kopia_robocza',
    statusBiznesowy: 'ROBOCZY',
    utworzono: '2026-08-01T10:00:00.000Z',
    zaktualizowano: '2026-08-01T10:00:00.000Z',
    widocznosc: 'zespol',
    zrodlo: 'nowy',
    rekordZrodlowyId: 'szczegoly-1',
    wersjaFormatu: 'lista-obecnosci-z-integracji-v1',
    daneDokumentu: {
      daneZrodlowe: { tytulSzkolenia: 'Bezpieczna praca', uczestnicy: [{ id: 'uczestnik-1' }] },
      powiazanieZeZrodlem: { szczegolyOrganizacyjneId: 'szczegoly-1', grupaId: 'grupa-1', odciskDanych: 'odcisk-1' },
      korektyReczne: { tytulSzkolenia: 'Ręczna korekta' },
    },
    metadaneGeneratora: {
      szczegolyOrganizacyjneId: 'szczegoly-1',
      wersjaSzczegolowId: 'wersja-1',
      odciskDanych: 'odcisk-1',
      grupaId: 'grupa-1',
      typDokumentu: 'LISTA_OBECNOSCI',
      wersja: 1,
    },
  }
}

test('charakterystyka: ponowna migracja legacy tworzy dodatkowy dokument', () => {
  magazyn.clear()
  ustawLegacy([legacyLista()])

  migrujStarszeDokumenty()
  migrujStarszeDokumenty()

  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => dokument.typ === 'LISTA_OBECNOSCI').length, 1)
})

test('migracja przenosi Listę obecności z legacy do nowego rejestru', () => {
  magazyn.clear()
  ustawLegacy([legacyLista()])

  migrujStarszeDokumenty()

  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => dokument.typ === 'LISTA_OBECNOSCI').length, 1)
})

test('charakterystyka: historia Programów i Szczegółów pozostaje poza nowym rejestrem', () => {
  magazyn.clear()
  ustawLegacy([legacyLista()], [
    { id: 'historia-programu', typGeneratora: 'programy_szkolen', dokumentId: 'program-1', data: '2026-08-01T10:00:00.000Z', dane: { typOperacji: 'utworzenie_kopii' } },
    { id: 'historia-szczegolow', typGeneratora: 'szczegoly_organizacyjne', dokumentId: 'szczegoly-1', data: '2026-08-01T10:00:00.000Z', dane: { typ: 'wersja' } },
  ])

  migrujStarszeDokumenty()

  const stan = JSON.parse(magazyn.get(kluczRejestruDokumentow) ?? '{}') as { historia?: Array<{ typ?: string }> }
  assert.equal(stan.historia?.filter((wpis) => wpis.typ === 'migracja_historii').length, 2)
})
