import assert from 'node:assert/strict'
import { blokiNaDzien, domyslnyHarmonogramPracy, normalizujHarmonogramPracy, oknoKurieraNaDzien, walidujHarmonogramPracy, zmienGraniceBloku } from '../src/moduly/zamkniete/pulpit/logika/harmonogramPracy'
import { czyGodzinaWOsi, czyTerazWOsi, domyslnaOsCzasu, normalizujOsCzasu, pobierzEtykietyOsiCzasu, pozycjaGodzinyNaOsi, walidujOsCzasu } from '../src/moduly/zamkniete/pulpit/logika/czasDnia'
import { normalizujUstawieniaAplikacji } from '../src/aplikacja/ustawienia/modelUstawienAplikacji'
import { eksportujUstawieniaAplikacji, importujUstawieniaAplikacji, kluczUstawienAplikacji, pobierzUstawieniaAplikacji, zapiszOsUzytkownika, zapiszUstawieniaAplikacji } from '../src/aplikacja/ustawienia/magazynUstawienAplikacji'
import { wystapieniaDnia, type Rutyna } from '../src/moduly/zamkniete/pulpit/logika/rutyny'
import { pobierzRutyny, zapiszRutyne, zmienWykonanieRutyny } from '../src/moduly/zamkniete/pulpit/uslugi/rutynyPulpitu'
import type { Uzytkownik } from '../src/kartoteki/uzytkownicy/typyUzytkownikow'
import { pobierzStylBlokuPracy, pobierzStylRutyny } from '../src/moduly/zamkniete/pulpit/koloryBlokowPracy'

const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => { magazyn.set(klucz, wartosc) }, removeItem: (klucz: string) => { magazyn.delete(klucz) }, clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage

const domyslny = structuredClone(domyslnyHarmonogramPracy)
assert.deepEqual(domyslny.blokiPracy.map(({ nazwa, poczatek, koniec }) => [nazwa, poczatek, koniec]), [
  ['Rozruch', '07:45', '08:30'], ['Przygotowania', '08:30', '10:00'], ['Paczkowanie', '10:00', '13:00'], ['Multitasking', '13:00', '15:00'], ['Podsumowania', '15:00', '16:00'],
])
assert.deepEqual(walidujHarmonogramPracy(domyslny), [])
// Kolory wynikają z tych samych bloków dla kart, godzin, liczników i starszych ustawień.
const blokiKolorow = structuredClone(domyslny.blokiPracy)
const blokiPrzedKolorowaniem = structuredClone(blokiKolorow)
assert.deepEqual(blokiKolorow.map((blok) => pobierzStylRutyny({ blokPracyId: blok.id }, blokiKolorow)?.['--pulpit-kolor-bloku']), ['#f97316', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'])
for (const blok of blokiKolorow) {
  assert.deepEqual(pobierzStylRutyny({ godzina: blok.poczatek }, blokiKolorow), pobierzStylBlokuPracy(blok, blokiKolorow))
  assert.deepEqual(pobierzStylRutyny({ blokPracyId: blok.id, godzina: blok.poczatek }, blokiKolorow), pobierzStylBlokuPracy(blok, blokiKolorow))
}
assert.equal(pobierzStylRutyny({ godzina: '08:30' }, blokiKolorow)?.['--pulpit-kolor-bloku'], blokiKolorow[1].kolor)
for (const plan of [{}, { godzina: '05:00' }, { godzina: '16:00' }, { blokPracyId: 'niedostepny' }, { blokPracyId: 'niedostepny', godzina: '10:30' }, { blokPracyId: 'rozruch', godzina: '10:30' }]) {
  assert.equal(pobierzStylRutyny(plan, blokiKolorow), undefined)
}
assert.equal(pobierzStylRutyny({ blokPracyId: 'rozruch' }, [{ ...blokiKolorow[0], wlaczony: false }]), undefined)
assert.equal(pobierzStylRutyny({ godzina: '08:00' }, [blokiKolorow[0], { ...blokiKolorow[0], id: 'nakladajacy' }]), undefined)
assert.equal(pobierzStylRutyny({ godzina: '08:00' }, []), undefined)
const stareBloki = blokiKolorow.map((blok) => ({ ...blok, kolor: undefined }))
assert.equal(pobierzStylRutyny({ blokPracyId: 'rozruch' }, stareBloki)?.['--pulpit-kolor-bloku'], 'var(--ui-akcent)')
const wlasneBloki = stareBloki.slice(0, 3).map((blok, indeks) => ({ ...blok, id: 'wlasny-' + indeks }))
for (const [indeks, blok] of wlasneBloki.entries()) {
  assert.deepEqual(pobierzStylRutyny({ blokPracyId: blok.id }, wlasneBloki), pobierzStylBlokuPracy(blok, wlasneBloki))
  assert.equal(pobierzStylBlokuPracy(blok, wlasneBloki)['--pulpit-tlo-bloku'], `color-mix(in srgb, var(--ui-${indeks === 1 ? 'info' : 'akcent'}) ${indeks === 2 ? 32 : 18}%, var(--ui-panel))`)
}
assert.deepEqual(blokiKolorow, blokiPrzedKolorowaniem)
blokiKolorow[0].kolor = '#abcdef'
assert.equal(pobierzStylRutyny({ blokPracyId: 'rozruch' }, blokiKolorow)?.['--pulpit-kolor-bloku'], '#abcdef')
assert.equal(pobierzStylRutyny({ godzina: '08:00' }, blokiKolorow)?.['--pulpit-kolor-bloku'], '#abcdef')
const [rozruch, przygotowania] = domyslny.blokiPracy
const przesuniete = zmienGraniceBloku(domyslny.blokiPracy, rozruch, 'koniec', '08:15', true)
assert.equal(przesuniete[1].poczatek, '08:15')
assert.deepEqual(walidujHarmonogramPracy({ ...domyslny, blokiPracy: przesuniete }), [])
assert.equal(przygotowania.poczatek, '08:30')
const zPrzerwa = zmienGraniceBloku(domyslny.blokiPracy, rozruch, 'koniec', '08:15', false)
assert.equal(zPrzerwa[1].poczatek, '08:30')
assert.deepEqual(walidujHarmonogramPracy({ ...domyslny, blokiPracy: zPrzerwa }), [])
assert.ok(walidujHarmonogramPracy({ ...domyslny, blokiPracy: zmienGraniceBloku(domyslny.blokiPracy, rozruch, 'koniec', rozruch.poczatek, true) }).length)
const zKolorem = { ...domyslny, blokiPracy: [{ ...rozruch, kolor: '#ab1234' }, ...domyslny.blokiPracy.slice(1)] }
assert.deepEqual(normalizujHarmonogramPracy(zKolorem), zKolorem)
assert.match(walidujHarmonogramPracy({ ...domyslny, blokiPracy: [{ ...rozruch, kolor: 'red' }] }).join(), /kolor/)
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

// Prezentacja czasu nie modyfikuje godzin pracy ani terminów.
const praca = { poczatek: '07:45', koniec: '16:00' }
assert.deepEqual(domyslnaOsCzasu, { poczatek: '06:00', koniec: '18:00', skalaPozaPraca: 25 })
assert.deepEqual(normalizujOsCzasu(undefined), domyslnaOsCzasu)
for (const skalaPozaPraca of [10, 25, 50, 100]) {
  const zakres = { ...praca, osCzasu: { ...domyslnaOsCzasu, skalaPozaPraca } }
  const jednostki = 495 + 225 * skalaPozaPraca / 100
  assert.equal(pozycjaGodzinyNaOsi('06:00', zakres), 0)
  assert.equal(pozycjaGodzinyNaOsi('18:00', zakres), 100)
  assert.ok(Math.abs(pozycjaGodzinyNaOsi('07:45', zakres) - 105 * skalaPozaPraca / jednostki) < 1e-9)
  assert.ok(Math.abs(pozycjaGodzinyNaOsi('16:00', zakres) - (105 * skalaPozaPraca / 100 + 495) / jednostki * 100) < 1e-9)
  const pozaPraca = pozycjaGodzinyNaOsi('07:00', zakres) - pozycjaGodzinyNaOsi('06:00', zakres)
  const podczasPracy = pozycjaGodzinyNaOsi('10:00', zakres) - pozycjaGodzinyNaOsi('09:00', zakres)
  assert.ok(Math.abs(pozaPraca / podczasPracy - skalaPozaPraca / 100) < 1e-9)
  const etykiety = pobierzEtykietyOsiCzasu(zakres, 720)
  assert.equal(etykiety[0], '06:00')
  assert.equal(etykiety.at(-1), '18:00')
  assert.equal(new Set(etykiety).size, etykiety.length)
  for (let indeks = 1; indeks < etykiety.length; indeks++) assert.ok((pozycjaGodzinyNaOsi(etykiety[indeks], zakres) - pozycjaGodzinyNaOsi(etykiety[indeks - 1], zakres)) / 100 * 720 >= 76 - 1e-9)
  assert.ok(pobierzEtykietyOsiCzasu(zakres, 300).length < pobierzEtykietyOsiCzasu(zakres, 1500).length)
}
const dokladnaOs = { ...praca, osCzasu: { ...praca, skalaPozaPraca: 10 } }
assert.equal(pozycjaGodzinyNaOsi(praca.poczatek, dokladnaOs), 0)
assert.equal(pozycjaGodzinyNaOsi(praca.koniec, dokladnaOs), 100)
assert.equal(czyGodzinaWOsi('05:59', dokladnaOs), false)
assert.equal(czyGodzinaWOsi('20:00', dokladnaOs), false)
assert.equal(czyTerazWOsi(new Date('2026-11-02T05:00:00'), dokladnaOs), false)
for (const os of [{ ...domyslnaOsCzasu, poczatek: '08:00' }, { ...domyslnaOsCzasu, koniec: '15:00' }, { ...domyslnaOsCzasu, poczatek: '18:00', koniec: '06:00' }, { ...domyslnaOsCzasu, koniec: '24:00' }, { ...domyslnaOsCzasu, skalaPozaPraca: 0 }, { ...domyslnaOsCzasu, skalaPozaPraca: 11 }, { ...domyslnaOsCzasu, skalaPozaPraca: NaN }]) {
  assert.ok(walidujOsCzasu(os, praca).length)
  for (const godzina of ['06:00', '12:00', '23:59', 'błąd']) assert.ok(Number.isFinite(pozycjaGodzinyNaOsi(godzina, { ...praca, osCzasu: os })))
}

const zgodneUstawienia = pobierzUstawieniaAplikacji()
const przedPreferencja = structuredClone(zgodneUstawienia)
const terminyPrzed = structuredClone(pobierzRutyny())
assert.equal(zapiszOsUzytkownika({ ...domyslnaOsCzasu, skalaPozaPraca: 100 }, pracownik), true)
assert.deepEqual(pobierzUstawieniaAplikacji().pulpit.osCzasu, przedPreferencja.pulpit.osCzasu)
assert.equal(pobierzUstawieniaAplikacji().pulpit.osieUzytkownikow.u.skalaPozaPraca, 100)
assert.equal(pobierzUstawieniaAplikacji().pulpit.poczatekDnia, przedPreferencja.pulpit.poczatekDnia)
assert.deepEqual(pobierzRutyny(), terminyPrzed)
assert.equal(zapiszOsUzytkownika(domyslnaOsCzasu, null), false)
assert.equal(zapiszOsUzytkownika(domyslnaOsCzasu, { ...pracownik, status: 'NIEAKTYWNY' }), false)
const administrator: Uzytkownik = { ...pracownik, id: 'administrator', rola: 'ADMINISTRATOR' }
const harmonogramPrzedEdycja = pobierzUstawieniaAplikacji().pulpit.harmonogramPracy
const zmianaBlokow = { poprzednie: harmonogramPrzedEdycja.blokiPracy, nowe: zKolorem.blokiPracy }
assert.equal(zapiszOsUzytkownika(domyslnaOsCzasu, pracownik, zmianaBlokow), false)
assert.equal(zapiszOsUzytkownika(domyslnaOsCzasu, administrator, zmianaBlokow), true)
assert.equal(zapiszOsUzytkownika(domyslnaOsCzasu, administrator, zmianaBlokow), false)
assert.deepEqual(pobierzUstawieniaAplikacji().pulpit.harmonogramPracy, { ...harmonogramPrzedEdycja, blokiPracy: zmianaBlokow.nowe })
const przedBledem = magazyn.get(kluczUstawienAplikacji)
const blednaOs = { ...zgodneUstawienia, pulpit: { ...zgodneUstawienia.pulpit, osCzasu: { ...domyslnaOsCzasu, poczatek: '09:00' } } }
assert.equal(zapiszUstawieniaAplikacji(blednaOs), false)
assert.equal(importujUstawieniaAplikacji(JSON.stringify(blednaOs)).ok, false)
assert.equal(magazyn.get(kluczUstawienAplikacji), przedBledem)
const noweGodziny = pobierzUstawieniaAplikacji()
noweGodziny.pulpit.poczatekDnia = '05:00'
noweGodziny.pulpit.koniecDnia = '20:00'
assert.equal(zapiszUstawieniaAplikacji(noweGodziny), true)
assert.equal(pobierzUstawieniaAplikacji().pulpit.osCzasu.poczatek, '05:00')
assert.equal(pobierzUstawieniaAplikacji().pulpit.osCzasu.koniec, '20:00')
assert.equal(pobierzUstawieniaAplikacji().pulpit.osieUzytkownikow.u.koniec, '20:00')
assert.equal(importujUstawieniaAplikacji(eksportujUstawieniaAplikacji()).ok, true)
const stareOsie = importujUstawieniaAplikacji(JSON.stringify({ wersja: 1, pulpit: { poczatekDnia: '04:00', koniecDnia: '21:00' } }))
assert.equal(stareOsie.ok, true)
if (stareOsie.ok) {
  assert.equal(stareOsie.ustawienia.pulpit.poczatekDnia, '04:00')
  assert.deepEqual(stareOsie.ustawienia.pulpit.osCzasu, { poczatek: '04:00', koniec: '21:00', skalaPozaPraca: 25 })
}
console.log('Oś czasu: współrzędne, 10–100%, walidacja, etykiety, preferencje użytkownika i zgodność ustawień — OK')
