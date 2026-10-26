import assert from 'node:assert/strict'
import test from 'node:test'
import type { Lokalizacja } from '../src/kartoteki/lokalizacje/typyLokalizacji.ts'
import { zbudujIndeksLokalizacjiSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/indeksLokalizacjiSzczegolow.ts'

function lokalizacja(nazwa: string, klucz = nazwa): Lokalizacja {
  return { nazwa, klucz_lokalizacji: klucz, wojewodztwo: '', rodzaj: '', gmina: '', powiat: '', miejscownik_pelny_auto: '', status_odmiany: false }
}

test('indeks zachowuje polskie znaki, adres z kodem i jednoznaczność dopasowania', () => {
  const lodz = lokalizacja('Łódź')
  const mielec = lokalizacja('Mielec')
  const indeks = zbudujIndeksLokalizacjiSzczegolow([lodz, mielec, lokalizacja('Brzeziny', 'a'), lokalizacja('BRZEZINY', 'b')])
  assert.deepEqual(indeks.znajdz(' ŁÓDŹ '), lodz)
  assert.deepEqual(indeks.znajdz('Hotel Bulwary, ul. Rzeczna 8, 39-300 Mielec'), mielec)
  assert.deepEqual(indeks.znajdz('Mielcu'), null)
  assert.deepEqual(indeks.znajdz('Lodz'), null)
  assert.deepEqual(indeks.znajdz('Brzeziny'), null)
  assert.deepEqual(indeks.znajdz(''), null)
  assert.deepEqual(indeks.podpowiedz('ÓDŹ'), [lodz])
})

test('limit 50 dotyczy wyników, zachowuje kolejność i nie pomija późniejszych dopasowań', () => {
  const miejscowosci = Array.from({ length: 120 }, (_, indeks) => lokalizacja(`Miejscowość ${indeks}`))
  const ostatnia = lokalizacja('Żółkiewka')
  const indeks = zbudujIndeksLokalizacjiSzczegolow([...miejscowosci, ostatnia])
  assert.deepEqual(indeks.podpowiedz(''), miejscowosci.slice(0, 50))
  assert.deepEqual(indeks.podpowiedz('miejscowość'), miejscowosci.slice(0, 50))
  assert.deepEqual(indeks.podpowiedz(' żół '), [ostatnia])
})

test('odświeżenie indeksu uwzględnia potwierdzenie odmiany i nowe lokalizacje', () => {
  const przed = lokalizacja('Łódź')
  const po = { ...przed, miejscownik_pelny_auto: 'Łodzi', status_odmiany: true }
  const staryIndeks = zbudujIndeksLokalizacjiSzczegolow([przed])
  const nowyIndeks = zbudujIndeksLokalizacjiSzczegolow([po, lokalizacja('Mielec')])
  assert.equal(staryIndeks.znajdz('Łódź')?.status_odmiany, false)
  assert.equal(nowyIndeks.znajdz('Łódź')?.status_odmiany, true)
  assert.equal(nowyIndeks.znajdz('Łódź')?.miejscownik_pelny_auto, 'Łodzi')
  assert.equal(nowyIndeks.znajdz('Mielec')?.nazwa, 'Mielec')
})

test('pusta nazwa w kartotece nie dopasowuje pustego pola formularza', () => {
  const lokalizacje = [lokalizacja(''), lokalizacja('Łódź'), lokalizacja('Brzeziny', 'a'), lokalizacja('BRZEZINY', 'b')]
  const indeks = zbudujIndeksLokalizacjiSzczegolow(lokalizacje)
  for (const miejsce of ['', ' ', 'Brzeziny', 'Nieznane', 'Lodz']) assert.equal(indeks.znajdz(miejsce), null, miejsce)
  assert.deepEqual(indeks.znajdz('90-001 Łódź'), lokalizacje[1])
})

test('migawka wykrywa zmianę odmiany, nazw, kolejności i usunięcie lokalizacji', () => {
  const lokalizacje = [lokalizacja('Łódź'), lokalizacja('Mielec')]
  const indeks = zbudujIndeksLokalizacjiSzczegolow(lokalizacje)
  assert.equal(indeks.czyAktualny(structuredClone(lokalizacje)), true)
  assert.equal(indeks.czyAktualny([...lokalizacje].reverse()), false)
  assert.equal(indeks.czyAktualny(lokalizacje.slice(1)), false)
  lokalizacje[0].status_odmiany = true
  lokalizacje[0].miejscownik_pelny_auto = 'Łodzi'
  assert.equal(indeks.czyAktualny(lokalizacje), false)
  assert.equal(indeks.znajdz('Łódź')?.status_odmiany, false)
  const odswiezony = zbudujIndeksLokalizacjiSzczegolow(lokalizacje)
  assert.equal(odswiezony.znajdz('Łódź')?.miejscownik_pelny_auto, 'Łodzi')
  lokalizacje[0].nazwa = 'Inna miejscowość'
  assert.equal(odswiezony.czyAktualny(lokalizacje), false)
})
