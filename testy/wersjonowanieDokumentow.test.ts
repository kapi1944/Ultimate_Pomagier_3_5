import assert from 'node:assert/strict'
import test from 'node:test'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { opublikujDokument, pobierzHistorieEksportow, pobierzHistorieWersji, utworzAktualizacjeDokumentu, zarejestrujEksportDokumentu } from '../src/wspolne/dokumenty/wersjonowanieDokumentow.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc), removeItem: (klucz: string) => magazyn.delete(klucz), clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage

test('publikacja utrwala wersje, a aktualizacja tworzy nowy roboczy rekord', () => {
  magazyn.clear()
  const roboczy = repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'wersja-1', typ: 'ANKIETA', tytul: 'Ankieta', generatorId: 'ankiety', daneDokumentu: {}, ustawieniaDokumentu: {} }))
  const opublikowany = opublikujDokument(roboczy.id)
  const aktualizacja = utworzAktualizacjeDokumentu(roboczy.id)

  assert.equal(opublikowany?.status, 'OPUBLIKOWANY')
  assert.ok(opublikowany?.opublikowano)
  assert.equal(aktualizacja?.status, 'ROBOCZY')
  assert.equal(aktualizacja?.wersja, 2)
  assert.equal(aktualizacja?.poprzedniaWersjaId, roboczy.id)
  assert.equal(pobierzHistorieWersji(aktualizacja!.id).length, 2)
})

test('historia eksportow przechowuje wyłącznie metadane', () => {
  magazyn.clear()
  const dokument = repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'eksport-1', typ: 'ANKIETA', tytul: 'Ankieta', generatorId: 'ankiety', daneDokumentu: {}, ustawieniaDokumentu: {} }))
  const wpis = zarejestrujEksportDokumentu(dokument.id, 'PDF', 'ankieta.pdf')

  assert.equal(wpis?.nazwa, 'ankieta.pdf')
  assert.equal(pobierzHistorieEksportow(dokument.id)[0]?.format, 'PDF')
  assert.equal('sciezka' in (wpis ?? {}), false)
})
