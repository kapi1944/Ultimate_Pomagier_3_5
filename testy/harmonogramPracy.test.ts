import assert from 'node:assert/strict'
import { blokiNaDzien, domyslnyHarmonogramPracy, normalizujHarmonogramPracy, oknoKurieraNaDzien, walidujHarmonogramPracy } from '../src/moduly/zamkniete/pulpit/logika/harmonogramPracy'
import { pozycjaGodzinyNaOsi } from '../src/moduly/zamkniete/pulpit/logika/czasDnia'
import { normalizujUstawieniaAplikacji } from '../src/aplikacja/ustawienia/modelUstawienAplikacji'
import { eksportujUstawieniaAplikacji, importujUstawieniaAplikacji, kluczUstawienAplikacji, pobierzUstawieniaAplikacji, zapiszUstawieniaAplikacji } from '../src/aplikacja/ustawienia/magazynUstawienAplikacji'
import { wystapieniaDnia, type Rutyna } from '../src/moduly/zamkniete/pulpit/logika/rutyny'
import { pobierzRutyny, zapiszRutyne, zmienWykonanieRutyny } from '../src/moduly/zamkniete/pulpit/uslugi/rutynyPulpitu'
import type { Uzytkownik } from '../src/kartoteki/uzytkownicy/typyUzytkownikow'

const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => { magazyn.set(klucz, wartosc) }, removeItem: (klucz: string) => { magazyn.delete(klucz) }, clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage

const domyslny = structuredClone(domyslnyHarmonogramPracy)
assert.deepEqual(domyslny.blokiPracy.map(({ nazwa, poczatek, koniec }) => [nazwa, poczatek, koniec]), [
  ['Rozruch', '07:45', '08:30'], ['Przygotowania', '08:30', '10:00'], ['Paczkowanie', '10:00', '13:00'], ['Multitasking', '13:00', '15:00'], ['Podsumowania', '15:00', '16:00'],
])
assert.deepEqual(walidujHarmonogramPracy(domyslny), [])
assert.equal(blokiNaDzien(domyslny.blokiPracy, '2026-11-02').length, 5)
assert.equal(blokiNaDzien(domyslny.blokiPracy, '2026-11-07').length, 0)
assert.equal(blokiNaDzien(domyslny.blokiPracy, '').length, 0)
assert.equal(oknoKurieraNaDzien(domyslny.kurier, '2026-02-30'), null)
for (let dzien = 2; dzien <= 8; dzien++) {
  const data = `2026-11-${String(dzien).padStart(2, '0')}`
  const oczekiwany = dzien >= 7 ? null : { poczatek: dzien === 2 || dzien === 6 ? '13:30' : '14:30', koniec: '16:00' }
  assert.deepEqual(oknoKurieraNaDzien(domyslny.kurier, data), oczekiwany)
}
const poniedzialek = oknoKurieraNaDzien(domyslny.kurier, '2026-11-02')!
for (const [godzina, wewnatrz] of [['13:29', false], ['13:30', true], ['15:59', true], ['16:00', false]] as const) {
  const pozycja = pozycjaGodzinyNaOsi(godzina)
  assert.equal(pozycja >= pozycjaGodzinyNaOsi(poniedzialek.poczatek) && pozycja < pozycjaGodzinyNaOsi(poniedzialek.koniec), wewnatrz)
}
domyslny.kurier.wyjatki['2026-11-02'] = null
domyslny.kurier.wyjatki['2026-11-07'] = { poczatek: '09:00', koniec: '10:00' }
assert.equal(oknoKurieraNaDzien(domyslny.kurier, '2026-11-02'), null)
assert.deepEqual(oknoKurieraNaDzien(domyslny.kurier, '2026-11-07'), { poczatek: '09:00', koniec: '10:00' })
const konflikt = structuredClone(domyslny)
konflikt.blokiPracy[1].poczatek = '08:29'
assert.match(walidujHarmonogramPracy(konflikt).join(), /nakładać/)
konflikt.blokiPracy[1].wlaczony = false
assert.deepEqual(walidujHarmonogramPracy(konflikt), [])
konflikt.blokiPracy[1].wlaczony = true
konflikt.blokiPracy[1].dni = [6]
assert.deepEqual(walidujHarmonogramPracy(konflikt), [])
konflikt.blokiPracy[1].koniec = '08:29'
assert.ok(walidujHarmonogramPracy(konflikt).length)
konflikt.blokiPracy[1].koniec = '24:30'
assert.ok(walidujHarmonogramPracy(konflikt).length)
assert.deepEqual(normalizujHarmonogramPracy(undefined), domyslnyHarmonogramPracy)

// Stare ustawienia otrzymują brakujące pola w odczycie, bez przepisywania storage.
magazyn.set(kluczUstawienAplikacji, JSON.stringify({ wersja: 1, pulpit: { poczatekDnia: '08:00' }, wyglad: { paleta: 'SOFT_GREY', skalaInterfejsu: 75 } }))
const staryZapis = magazyn.get(kluczUstawienAplikacji)
const ustawienia = pobierzUstawieniaAplikacji()
assert.equal(ustawienia.pulpit.poczatekDnia, '08:00')
assert.deepEqual(ustawienia.pulpit.harmonogramPracy, domyslnyHarmonogramPracy)
assert.equal(magazyn.get(kluczUstawienAplikacji), staryZapis)
ustawienia.pulpit.harmonogramPracy = domyslny
assert.equal(zapiszUstawieniaAplikacji(ustawienia), true)
assert.deepEqual(pobierzUstawieniaAplikacji(), ustawienia)
const importowane = importujUstawieniaAplikacji(eksportujUstawieniaAplikacji())
assert.equal(importowane.ok, true)
if (importowane.ok) assert.deepEqual(importowane.ustawienia, ustawienia)
const poprawnyZapis = magazyn.get(kluczUstawienAplikacji)
assert.equal(zapiszUstawieniaAplikacji({ ...ustawienia, pulpit: { ...ustawienia.pulpit, harmonogramPracy: konflikt } }), false)
assert.equal(importujUstawieniaAplikacji(JSON.stringify({ ...ustawienia, pulpit: { ...ustawienia.pulpit, harmonogramPracy: konflikt } })).ok, false)
assert.equal(magazyn.get(kluczUstawienAplikacji), poprawnyZapis)
assert.equal(normalizujUstawieniaAplikacji(ustawienia).wyglad.paleta, 'SOFT_GREY')

const pracownik = { id: 'u', rola: 'PRACOWNIK', status: 'AKTYWNY', organizacja: 'SEMPER', odznaki: [] } as Uzytkownik
const rutyna: Rutyna = { id: 'paczki', tytul: 'Przygotuj etykiety kurierskie', wlascicielId: 'u', wersje: [{ od: '2026-11-01', aktywna: true, harmonogram: { rodzaj: 'CODZIENNIE' }, blokPracyId: 'paczkowanie' }] }
zapiszRutyne(rutyna, pracownik, '2026-11-01')
const wystapienie = wystapieniaDnia(pobierzRutyny().rutyny, [], '2026-11-02')[0]
assert.equal(wystapienie.blokPracyId, 'paczkowanie')
assert.equal(wystapienie.godzina, undefined)
assert.equal(Object.hasOwn(wystapienie, 'deadline'), false)
zmienWykonanieRutyny(wystapienie, true, pracownik, '2026-11-02')
const wykonania = structuredClone(pobierzRutyny().wykonania)
zapiszRutyne({ ...rutyna, wersje: [{ ...rutyna.wersje[0], od: '2026-11-02', blokPracyId: undefined, godzina: '11:30' }] }, pracownik, '2026-11-02')
let odczyt = pobierzRutyny()
assert.deepEqual(odczyt.wykonania, wykonania)
assert.equal(wystapieniaDnia(odczyt.rutyny, [], '2026-11-01')[0].blokPracyId, 'paczkowanie')
assert.equal(wystapieniaDnia(odczyt.rutyny, odczyt.wykonania, '2026-11-02')[0].godzina, '11:30')
assert.equal(wystapieniaDnia(odczyt.rutyny, odczyt.wykonania, '2026-11-02')[0].wykonane, true)
zapiszRutyne({ ...rutyna, wersje: [{ ...rutyna.wersje[0], od: '2026-11-02', blokPracyId: undefined }] }, pracownik, '2026-11-02')
odczyt = pobierzRutyny()
assert.equal(wystapieniaDnia(odczyt.rutyny, odczyt.wykonania, '2026-11-02')[0].godzina, undefined)
assert.equal(wystapieniaDnia(odczyt.rutyny, odczyt.wykonania, '2026-11-02')[0].blokPracyId, undefined)
zmienWykonanieRutyny(wystapienie, false, pracownik, '2026-11-02')
assert.equal(wystapieniaDnia(pobierzRutyny().rutyny, pobierzRutyny().wykonania, '2026-11-02')[0].wykonane, false)
assert.throws(() => zapiszRutyne({ ...rutyna, id: 'bledna', wersje: [{ ...rutyna.wersje[0], godzina: '12:00' }] }, pracownik, '2026-11-01'), /jeden planowany/)
assert.throws(() => zapiszRutyne({ ...rutyna, id: 'bledna', wersje: [{ ...rutyna.wersje[0], blokPracyId: 'nieistniejacy' }] }, pracownik, '2026-11-01'), /dostępny/)
assert.throws(() => zapiszRutyne({ ...rutyna, id: 'bledna', wersje: [{ ...rutyna.wersje[0], harmonogram: { rodzaj: 'CEL_TYGODNIOWY', liczba: 2 } }] }, pracownik, '2026-11-01'), /tygodniowy/)
assert.throws(() => zapiszRutyne(rutyna, { ...pracownik, id: 'inny' }, '2026-11-01'), /swoimi/)

// Wyłączenie/usunięcie bloku nie usuwa rutyny ani wcześniejszych wykonań.
const bezBloku = pobierzUstawieniaAplikacji()
bezBloku.pulpit.harmonogramPracy.blokiPracy = []
assert.equal(zapiszUstawieniaAplikacji(bezBloku), true)
assert.equal(pobierzRutyny().rutyny.length, 1)
assert.equal(wystapieniaDnia(pobierzRutyny().rutyny, [], '2026-11-01')[0].blokPracyId, 'paczkowanie')
assert.equal(blokiNaDzien(pobierzUstawieniaAplikacji().pulpit.harmonogramPracy.blokiPracy, '2026-11-01').length, 0)
console.log('Harmonogram pracy: bloki, dni, kurier, granice, wyjątki, zgodność storage i synchronizacja rutyn — OK')
