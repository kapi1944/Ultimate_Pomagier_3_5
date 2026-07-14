import assert from 'node:assert/strict'
import test from 'node:test'
import {
  pobierzKopieRoboczeGeneratora,
  usunKopieRobocza,
  zapiszKopieRobocza,
} from '../src/wspolne/dokumenty/magazynKopiiRoboczych.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

test('aktualizuje istniejącą kopię bez duplikatu i zachowuje datę utworzenia', () => {
  magazyn.clear()
  const utworzona = zapiszKopieRobocza({
    typGeneratora: 'programy_szkolen',
    tytul: 'Program A',
    status: 'robocza',
    daneDokumentu: { tresc: 'pierwsza' },
  })
  const zaktualizowana = zapiszKopieRobocza({
    id: utworzona.id,
    typGeneratora: 'programy_szkolen',
    tytul: 'Program A po korekcie',
    status: 'robocza',
    daneDokumentu: { tresc: 'druga' },
  })
  const kopie = pobierzKopieRoboczeGeneratora<{ tresc: string }>('programy_szkolen')

  assert.equal(kopie.length, 1)
  assert.equal(kopie[0].id, utworzona.id)
  assert.equal(kopie[0].utworzono, utworzona.utworzono)
  assert.equal(kopie[0].daneDokumentu.tresc, 'druga')
  assert.equal(zaktualizowana.id, utworzona.id)
})

test('izoluje kopie robocze według typu generatora i usuwa wyłącznie wskazany rekord', () => {
  magazyn.clear()
  const program = zapiszKopieRobocza({
    typGeneratora: 'programy_szkolen',
    tytul: 'Program',
    status: 'robocza',
    daneDokumentu: {},
  })
  const szczegoly = zapiszKopieRobocza({
    typGeneratora: 'szczegoly_organizacyjne',
    tytul: 'Szczegóły',
    status: 'robocza',
    daneDokumentu: {},
  })

  assert.equal(pobierzKopieRoboczeGeneratora('programy_szkolen').length, 1)
  assert.equal(pobierzKopieRoboczeGeneratora('szczegoly_organizacyjne').length, 1)

  usunKopieRobocza('programy_szkolen', program.id)

  assert.equal(pobierzKopieRoboczeGeneratora('programy_szkolen').length, 0)
  assert.equal(pobierzKopieRoboczeGeneratora('szczegoly_organizacyjne')[0].id, szczegoly.id)
})
