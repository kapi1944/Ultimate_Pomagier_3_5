import assert from 'node:assert/strict'
import test from 'node:test'
import {
  pobierzLiczbeUkrytychWpisowHistorii,
  pobierzWidoczneWpisyHistorii,
} from '../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/widoczneWpisyHistorii.ts'
import type { WpisHistoriiSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'

function utworzWpis(id: string, typ: WpisHistoriiSzczegolow['typ'] = 'wersja'): WpisHistoriiSzczegolow {
  return { id, typ, data: '2026-07-16T12:00:00.000Z', autorId: 'autor', autorNazwa: 'Autor', komentarz: id }
}

test('zwinięta historia pokazuje tylko dwa najnowsze wpisy i liczbę ukrytych pozycji', () => {
  const historia = [utworzWpis('v6'), utworzWpis('v5'), utworzWpis('v4'), utworzWpis('v3')]

  assert.deepEqual(pobierzWidoczneWpisyHistorii(historia, false).map((wpis) => wpis.id), ['v6', 'v5'])
  assert.equal(pobierzLiczbeUkrytychWpisowHistorii(historia), 2)
})

test('rozwinięta historia pokazuje wszystkie wpisy, a ponowne zwinięcie przywraca dwa najnowsze', () => {
  const historia = [utworzWpis('v6'), utworzWpis('v5'), utworzWpis('v4')]

  assert.deepEqual(pobierzWidoczneWpisyHistorii(historia, true), historia)
  assert.deepEqual(pobierzWidoczneWpisyHistorii(historia, false).map((wpis) => wpis.id), ['v6', 'v5'])
})

test('historia z maksymalnie dwoma wpisami nie ma ukrytych pozycji', () => {
  const historia = [utworzWpis('v2'), utworzWpis('v1')]

  assert.equal(pobierzLiczbeUkrytychWpisowHistorii(historia), 0)
  assert.deepEqual(pobierzWidoczneWpisyHistorii(historia, false), historia)
})

test('wpis importu jest liczony jak pojedyncza pozycja historii', () => {
  const historia = [utworzWpis('v2'), utworzWpis('v1'), utworzWpis('import', 'import')]

  assert.equal(pobierzLiczbeUkrytychWpisowHistorii(historia), 1)
  assert.deepEqual(pobierzWidoczneWpisyHistorii(historia, false).map((wpis) => wpis.id), ['v2', 'v1'])
})
