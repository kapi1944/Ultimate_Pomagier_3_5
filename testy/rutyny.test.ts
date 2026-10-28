import assert from 'node:assert/strict'
import { dataWarszawska, obliczPostep, poczatekTygodnia, wystapieniaDnia, wystapieniaTygodnia, type Rutyna, type WystapienieRutyny } from '../src/moduly/zamkniete/pulpit/logika/rutyny'
import { pobierzRutyny, zapiszRutyne, zmienWykonanieRutyny } from '../src/moduly/zamkniete/pulpit/uslugi/rutynyPulpitu'
import type { Uzytkownik } from '../src/kartoteki/uzytkownicy/typyUzytkownikow'

function postep(liczba: number, wykonane: number) {
  const wystapienia: WystapienieRutyny[] = Array.from({ length: liczba }, (_, numer) => ({ rutynaId: 'a', okres: '2026-10-28', numer, tytul: 'Test', wykonane: numer < wykonane }))
  return obliczPostep(wystapienia)
}

assert.equal(postep(0, 0).stan, 'BRAK')
assert.equal(postep(5, 0).stan, 'CZERWONY')
assert.equal(postep(5, 3).stan, 'POMARANCZOWY')
assert.equal(postep(5, 4).stan, 'POMARANCZOWY')
assert.equal(postep(20, 17).stan, 'ZIELONY')
assert.equal(postep(5, 5).stan, 'UKONCZONE')
assert.equal(postep(1000, 599).stan, 'CZERWONY')
assert.equal(postep(1000, 849).stan, 'POMARANCZOWY')
assert.equal(dataWarszawska(new Date('2026-03-28T23:30:00Z')), '2026-03-29')
assert.equal(dataWarszawska(new Date('2026-10-25T23:30:00Z')), '2026-10-26')
assert.equal(poczatekTygodnia('2027-01-01'), '2026-12-28')

const rutyny: Rutyna[] = [
  { id: 'a', tytul: 'Codzienna', wlascicielId: 'u', wersje: [{ od: '2026-10-28', aktywna: true, harmonogram: { rodzaj: 'CODZIENNIE' } }] },
  { id: 'b', tytul: 'Cel', wlascicielId: 'u', wersje: [{ od: '2026-10-28', aktywna: true, harmonogram: { rodzaj: 'CEL_TYGODNIOWY', liczba: 3 } }, { od: '2026-11-02', aktywna: true, harmonogram: { rodzaj: 'CEL_TYGODNIOWY', liczba: 2 } }] },
  { id: 'c', tytul: 'Środa', wlascicielId: 'u', wersje: [{ od: '2026-10-28', aktywna: true, harmonogram: { rodzaj: 'DNI_TYGODNIA', dni: [3] } }] },
]
const wykonania = [{ rutynaId: 'b', okres: '2026-10-26', numer: 1, wykonane: true }]
assert.equal(wystapieniaDnia(rutyny, wykonania, '2026-10-28').length, 2)
assert.equal(wystapieniaTygodnia(rutyny, wykonania, '2026-10-28').length, 9)
assert.equal(obliczPostep(wystapieniaTygodnia(rutyny, wykonania, '2026-10-28')).wykonane, 1)
assert.equal(wystapieniaTygodnia(rutyny, wykonania, '2026-11-02').filter((wpis) => wpis.rutynaId === 'b').length, 2)
assert.deepEqual(wystapieniaTygodnia(rutyny, wykonania, '2026-10-28'), wystapieniaTygodnia(rutyny, wykonania, '2026-10-28'))

const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => { magazyn.set(klucz, wartosc) }, removeItem: (klucz: string) => { magazyn.delete(klucz) }, clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage
const pracownik = { id: 'u', rola: 'PRACOWNIK', status: 'AKTYWNY', organizacja: 'SEMPER', odznaki: [] } as Uzytkownik
const inny = { ...pracownik, id: 'inny' }
const nowa: Rutyna = { id: 'codzienna', tytul: 'Kontrola', wlascicielId: 'u', wersje: [{ od: '2026-10-28', aktywna: true, harmonogram: { rodzaj: 'CODZIENNIE' } }] }
zapiszRutyne(nowa, pracownik, '2026-10-28')
assert.equal(pobierzRutyny().rutyny.length, 1)
const wystapienie = wystapieniaDnia(pobierzRutyny().rutyny, [], '2026-10-28')[0]
assert.throws(() => zmienWykonanieRutyny(wystapienie, true, inny, '2026-10-28'), /uprawnień/)
zmienWykonanieRutyny(wystapienie, true, pracownik, '2026-10-28')
zmienWykonanieRutyny(wystapienie, true, pracownik, '2026-10-28')
assert.equal(pobierzRutyny().wykonania.length, 1)
assert.equal(obliczPostep(wystapieniaDnia(pobierzRutyny().rutyny, pobierzRutyny().wykonania, '2026-10-28')).wykonane, 1)
zmienWykonanieRutyny(wystapienie, false, pracownik, '2026-10-28')
assert.equal(pobierzRutyny().historia.length, 3)
assert.equal(obliczPostep(wystapieniaDnia(pobierzRutyny().rutyny, pobierzRutyny().wykonania, '2026-10-28')).wykonane, 0)
assert.throws(() => zapiszRutyne({ ...nowa, wlascicielId: 'inny' }, pracownik, '2026-10-28'), /swoimi/)
assert.throws(() => zapiszRutyne({ ...nowa, wersje: [{ od: '2026-10-28', aktywna: false, harmonogram: { rodzaj: 'CODZIENNIE' } }] }, pracownik, '2026-10-28'), /najwcześniej od jutra/)
zapiszRutyne({ ...nowa, wersje: [{ od: '2026-10-29', aktywna: false, harmonogram: { rodzaj: 'CODZIENNIE' } }] }, pracownik, '2026-10-28')
assert.equal(wystapieniaDnia(pobierzRutyny().rutyny, [], '2026-10-28').length, 1)
assert.equal(wystapieniaDnia(pobierzRutyny().rutyny, [], '2026-10-29').length, 0)
const cel: Rutyna = { id: 'cel', tytul: 'Cel', wlascicielId: 'u', wersje: [{ od: '2026-10-28', aktywna: true, harmonogram: { rodzaj: 'CEL_TYGODNIOWY', liczba: 3 } }] }
zapiszRutyne(cel, pracownik, '2026-10-28')
assert.throws(() => zapiszRutyne({ ...cel, wersje: [{ od: '2026-10-30', aktywna: true, harmonogram: { rodzaj: 'CEL_TYGODNIOWY', liczba: 2 } }] }, pracownik, '2026-10-28'), /poniedziałku/)
zapiszRutyne({ ...cel, wersje: [{ od: '2026-11-02', aktywna: true, harmonogram: { rodzaj: 'CEL_TYGODNIOWY', liczba: 2 } }] }, pracownik, '2026-10-28')
assert.equal(wystapieniaTygodnia(pobierzRutyny().rutyny.filter((wpis) => wpis.id === 'cel'), [], '2026-10-28').length, 3)
assert.equal(wystapieniaTygodnia(pobierzRutyny().rutyny.filter((wpis) => wpis.id === 'cel'), [], '2026-11-02').length, 2)
const wybrane: Rutyna = { id: 'wybrane', tytul: 'Wybrane', wlascicielId: 'u', wersje: [{ od: '2026-10-28', aktywna: true, harmonogram: { rodzaj: 'DNI_TYGODNIA', dni: [1, 3, 5] } }] }
zapiszRutyne(wybrane, pracownik, '2026-10-28')
assert.equal(wystapieniaDnia([wybrane], [], '2026-10-29').length, 0)
assert.equal(wystapieniaDnia([wybrane], [], '2026-10-30').length, 1)
const odzyskanyZapis = magazyn.get('ultimatePomagier.pulpit.v1')!
assert.equal(JSON.parse(odzyskanyZapis).rutyny.historia.length, 7)
magazyn.set('ultimatePomagier.pulpit.v1', '{')
assert.throws(() => zapiszRutyne(nowa, pracownik, '2026-10-28'), /uszkodzone/)
assert.equal(magazyn.get('ultimatePomagier.pulpit.v1'), '{')
magazyn.set('ultimatePomagier.pulpit.v1', odzyskanyZapis)
