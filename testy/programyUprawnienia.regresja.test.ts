import assert from 'node:assert/strict'
import test from 'node:test'

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

const { czyUzytkownikMozeWymusicEksportProgramu } = await import('../src/moduly/dokumenty/generatory/programy_szkolen/uprawnieniaEksportuProgramu.ts')

test('tylko bieżący użytkownik ARCHITEKT może wymusić eksport Programu szkolenia', () => {
  assert.equal(czyUzytkownikMozeWymusicEksportProgramu({ rola: 'ARCHITEKT' }), true)
  assert.equal(czyUzytkownikMozeWymusicEksportProgramu({ rola: 'PRACOWNIK' }), false)

  magazyn.set('ultimate-pomagier-rola-uzytkownika', 'Architekt')
  magazyn.set('rolaUzytkownika', 'Architekt')

  assert.equal(czyUzytkownikMozeWymusicEksportProgramu({ rola: 'PRACOWNIK' }), false)
  assert.equal(czyUzytkownikMozeWymusicEksportProgramu(null), false)
})
