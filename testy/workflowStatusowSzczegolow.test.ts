import assert from 'node:assert/strict'
import test from 'node:test'
import { walidujPrzejscieStatusuSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/workflowStatusow.ts'

test('publikacja korzysta z przejścia PEŁNE do OCZEKUJĄCE', () => {
  assert.equal(walidujPrzejscieStatusuSzczegolow('PEŁNE', 'OCZEKUJĄCE').poprawne, true)
})

test('niedozwolone przejście statusu jest odrzucane', () => {
  assert.equal(walidujPrzejscieStatusuSzczegolow('OCZEKUJĄCE', 'ROZLICZONE').poprawne, false)
})

test('niezrealizowanie wymaga niepustej przyczyny', () => {
  assert.equal(walidujPrzejscieStatusuSzczegolow('GOTOWE', 'NIEZREALIZOWANE', '   ').poprawne, false)
  assert.equal(walidujPrzejscieStatusuSzczegolow('GOTOWE', 'NIEZREALIZOWANE', 'Klient odwołał termin.').poprawne, true)
})
