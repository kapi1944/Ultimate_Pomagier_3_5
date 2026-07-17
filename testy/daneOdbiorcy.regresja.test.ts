import assert from 'node:assert/strict'
import test from 'node:test'
import { poczatkoweDaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { pobierzBrakujacePolaEfektywnegoOdbiorcy, pobierzEfektywneDaneOdbiorcy, pobierzEfektywneStatusyPolOdbiorcy } from '../src/moduly/zamkniete/szczegoly_organizacyjne/logikaDanychOdbiorcy.ts'

function utworzDane() {
  const dane = structuredClone(poczatkoweDaneFormularza)
  dane.nabywca = { ...dane.nabywca, nazwa: 'Firma nabywcy', email: 'biuro@nabywca.pl', ulica: 'Kwiatowa 1', kodPocztowy: '00-001', miasto: 'Warszawa' }
  dane.odbiorca = { ...dane.odbiorca, nazwa: '', email: '' }
  return dane
}

test('nabywca jako odbiorca daje kompletne skuteczne dane, statusy i walidację odbiorcy', () => {
  const dane = utworzDane()
  dane.czyNabywcaJestOdbiorca = true
  const statusy = pobierzEfektywneStatusyPolOdbiorcy(dane, { 'odbiorca.nazwa': 'brak', 'odbiorca.email': 'brak' })
  const brakujacePola = pobierzBrakujacePolaEfektywnegoOdbiorcy(dane)

  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).nazwa, 'Firma nabywcy')
  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).email, 'biuro@nabywca.pl')
  assert.equal(statusy['odbiorca.nazwa'], undefined)
  assert.equal(statusy['odbiorca.email'], undefined)
  assert.deepEqual(brakujacePola, [])
})

test('brakująca wartość nabywcy pozostaje brakiem skutecznego odbiorcy i walidacji', () => {
  const dane = utworzDane()
  dane.czyNabywcaJestOdbiorca = true
  dane.nabywca.email = ''
  const statusy = pobierzEfektywneStatusyPolOdbiorcy(dane, { 'odbiorca.nazwa': 'brak', 'odbiorca.email': 'brak' })
  const brakujacePola = pobierzBrakujacePolaEfektywnegoOdbiorcy(dane)

  assert.equal(statusy['odbiorca.nazwa'], undefined)
  assert.equal(statusy['odbiorca.email'], 'brak')
  assert.deepEqual(brakujacePola, ['email'])
})

test('odznaczenie nabywcy jako odbiorcy przywraca własne dane i statusy odbiorcy', () => {
  const dane = utworzDane()
  dane.odbiorca = { ...dane.odbiorca, nazwa: 'Własny odbiorca', email: '' }
  const statusy = pobierzEfektywneStatusyPolOdbiorcy(dane, { 'odbiorca.email': 'brak' })

  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).nazwa, 'Własny odbiorca')
  assert.equal(statusy['odbiorca.email'], 'brak')
})
