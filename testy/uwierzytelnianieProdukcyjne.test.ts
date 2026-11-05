import assert from 'node:assert/strict'
import test from 'node:test'
import { czyTrybDemonstracyjny, uwierzytelnijPrzezUsluge } from '../src/aplikacja/logowanie/uwierzytelnianie.ts'
import { pobierzSesje, rozpocznijSesje } from '../src/aplikacja/logowanie/sesjaUzytkownika.ts'
import { ustawProjekcjeKont } from '../src/aplikacja/logowanie/projekcjaKont.ts'
import { subskrybujUzytkownikow } from '../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts'
import { daneStartoweUzytkownikow } from '../src/kartoteki/uzytkownicy/daneUzytkownikow.ts'
import { pobierzKontoSzczegolow, pobierzOpiekunowSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow.ts'
test('bez usługi tożsamości hasło ani modyfikacja localStorage nie otwierają sesji produkcyjnej', async () => {
  globalThis.localStorage = { getItem: () => JSON.stringify({ uzytkownikId: 'administrator-kacper-madej', wersjaUprawnien: 1, dataUtworzenia: new Date().toISOString(), tryb: 'DEMONSTRACYJNY' }) } as unknown as Storage
  assert.equal(czyTrybDemonstracyjny, false)
  assert.equal(pobierzSesje(), null)
  assert.equal(rozpocznijSesje('administrator-kacper-madej'), false)
  assert.equal((await uwierzytelnijPrzezUsluge()).status, 'NIEDOSTEPNE')
})

test('produkcyjna projekcja: późne konta, zmiana statusu, wylogowanie i ponowne logowanie odświeżają opiekunów', () => {
  ustawProjekcjeKont([], [], null)
  assert.deepEqual(pobierzOpiekunowSzczegolow(), [])
  const konta = daneStartoweUzytkownikow.map((konto, indeks) => ({ ...konto, id: `rzeczywiste-id-${indeks}` }))
  let liczbaPowiadomien = 0
  const zakoncz = subskrybujUzytkownikow(() => { liczbaPowiadomien += 1 })
  try {
    ustawProjekcjeKont(konta, [], konta[0])
    const opiekunowie = pobierzOpiekunowSzczegolow()
    assert.deepEqual(opiekunowie.map((konto) => konto.nazwa).sort(), ['Kasia RB', 'Iza Cz', 'Kamila', 'Dawid'].sort())
    assert.ok(opiekunowie.every((konto) => konto.id.startsWith('rzeczywiste-id-')))
    assert.equal(opiekunowie.find((konto) => konto.pseudonim === 'Dawid')?.imieNazwisko, 'Dawid Chyła')
    assert.equal(opiekunowie.find((konto) => konto.pseudonim === 'Dawid')?.organizacja, 'IIST')
    const nieaktywny = opiekunowie[0]
    const zablokowany = opiekunowie[1]
    ustawProjekcjeKont(konta.map((konto) => konto.id === nieaktywny.id ? { ...konto, status: 'NIEAKTYWNY' } : konto.id === zablokowany.id ? { ...konto, status: 'ZABLOKOWANY' } : konto), [], konta[0])
    assert.ok(!pobierzOpiekunowSzczegolow().some((konto) => [nieaktywny.id, zablokowany.id].includes(konto.id)))
    assert.equal(pobierzKontoSzczegolow(nieaktywny.id)?.id, nieaktywny.id)
    ustawProjekcjeKont([], [], null)
    assert.deepEqual(pobierzOpiekunowSzczegolow(), [])
    ustawProjekcjeKont(konta, [], konta[0])
    assert.deepEqual(pobierzOpiekunowSzczegolow(), opiekunowie)
    assert.equal(liczbaPowiadomien, 4)
    assert.deepEqual(konta.map((konto) => konto.odznaki), daneStartoweUzytkownikow.map((konto) => konto.odznaki))
  } finally {
    zakoncz()
    ustawProjekcjeKont([], [], null)
  }
  assert.equal(liczbaPowiadomien, 4)
})
