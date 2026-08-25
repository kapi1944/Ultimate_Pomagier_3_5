import assert from 'node:assert/strict'
import test from 'node:test'
import { kluczRepozytoriumDokumentow, repozytoriumDokumentow } from '../src/wspolne/dokumenty/repozytoriumDokumentow.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

const rekordLegacy = {
  id: 'program-legacy', typGeneratora: 'programy_szkolen', tytul: 'Program legacy', stanCyklu: 'kopia_robocza', statusBiznesowy: 'ROBOCZY', utworzono: '2026-08-01T10:00:00.000Z', zaktualizowano: '2026-08-01T10:00:00.000Z', widocznosc: 'prywatny', zrodlo: 'nowy', daneDokumentu: { tresc: 'zachowana' }, metadaneGeneratora: {},
}

test('adapter legacy pozwala wyłącznie odczytać nietknięte dane', () => {
  magazyn.clear()
  const surowyZapis = JSON.stringify({ dokumenty: [rekordLegacy], historia: [] })
  magazyn.set(kluczRepozytoriumDokumentow, surowyZapis)

  assert.equal(repozytoriumDokumentow.pobierz().length, 1)
  assert.equal(repozytoriumDokumentow.pobierzPoId('programy_szkolen', 'program-legacy')?.tytul, 'Program legacy')
  assert.throws(() => repozytoriumDokumentow.zapiszNowy(rekordLegacy), /wyłącznie do odczytu/)
  assert.equal(magazyn.get(kluczRepozytoriumDokumentow), surowyZapis)
})
