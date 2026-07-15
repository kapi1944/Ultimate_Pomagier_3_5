import assert from 'node:assert/strict'
import test from 'node:test'
import { porownajDaneZrodloweProgramu, zastosujZmianyZrodlaProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/zrodlaProgramu.ts'

const poprzednie = { tytulSzkolenia: 'Program', organizator: 'SEMPER' as const, termin: '01.01', lokalizacja: 'Warszawa', trener: 'Jan', grupy: 'A' }

test('samodzielny Program nie ma zmian zrodla', () => assert.deepEqual(porownajDaneZrodloweProgramu(poprzednie, poprzednie), []))
test('wykrywa pojedyncza zmiane i chroni reczne nadpisanie', () => {
  const zmiany = porownajDaneZrodloweProgramu(poprzednie, { ...poprzednie, lokalizacja: 'Krakow' }, ['lokalizacja'])
  assert.equal(zmiany[0]?.czyNadpisaneRecznie, true)
  assert.equal(zastosujZmianyZrodlaProgramu(poprzednie, zmiany, []).lokalizacja, 'Warszawa')
})
