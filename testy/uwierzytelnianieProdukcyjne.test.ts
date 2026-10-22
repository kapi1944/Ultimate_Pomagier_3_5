import assert from 'node:assert/strict'
import test from 'node:test'
import { czyTrybDemonstracyjny, uwierzytelnijPrzezUsluge } from '../src/aplikacja/logowanie/uwierzytelnianie.ts'
import { pobierzSesje, rozpocznijSesje } from '../src/aplikacja/logowanie/sesjaUzytkownika.ts'
test('bez usługi tożsamości hasło ani modyfikacja localStorage nie otwierają sesji produkcyjnej', async () => {
  globalThis.localStorage = { getItem: () => JSON.stringify({ uzytkownikId: 'administrator-kacper-madej', wersjaUprawnien: 1, dataUtworzenia: new Date().toISOString(), tryb: 'DEMONSTRACYJNY' }) } as unknown as Storage
  assert.equal(czyTrybDemonstracyjny, false)
  assert.equal(pobierzSesje(), null)
  assert.equal(rozpocznijSesje('administrator-kacper-madej'), false)
  assert.equal((await uwierzytelnijPrzezUsluge()).status, 'NIEDOSTEPNE')
})
