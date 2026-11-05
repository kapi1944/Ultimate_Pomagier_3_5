import assert from 'node:assert/strict'
import { dataWarszawska, domyslnyKalendarzPracy, ocenDzienPracy, walidujWyjatkiKalendarza, type KalendarzPracy, type WyjatekKalendarzaPracy } from '../src/wspolne/czas/kalendarzPracy'
import { czyDzienRoboczy, isWorkingDay, pobierzKalendarzPracy, sprawdzDzienPracy } from '../src/wspolne/czas/serwisKalendarzaPracy'
import { dodajDni, wystapieniaDnia, wystapieniaTygodnia, type Rutyna } from '../src/moduly/zamkniete/pulpit/logika/rutyny'
import { pobierzRutyny, zapiszRutyne, zmienWykonanieRutyny } from '../src/moduly/zamkniete/pulpit/uslugi/rutynyPulpitu'
import { blokiNaDzien, domyslnyHarmonogramPracy } from '../src/moduly/zamkniete/pulpit/logika/harmonogramPracy'
import { czyDzienPracy, pobierzStanWskaznikaCzasu } from '../src/moduly/zamkniete/pulpit/logika/czasDnia'
import { eksportujUstawieniaAplikacji, importujUstawieniaAplikacji, kluczUstawienAplikacji, pobierzUstawieniaAplikacji, zapiszUstawieniaAplikacji } from '../src/aplikacja/ustawienia/magazynUstawienAplikacji'
import type { Uzytkownik } from '../src/kartoteki/uzytkownicy/typyUzytkownikow'

const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => { magazyn.set(klucz, wartosc) }, removeItem: (klucz: string) => { magazyn.delete(klucz) }, clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage

// Kalendarz nie wykonuje zapytań nawet po zmianie konfiguracji i ponownym odczycie.
globalThis.fetch = () => { throw new Error('Test offline: sieć niedostępna') }
for (const [data, roboczy, powod] of [
  ['2026-11-02', true, 'Zaplanowany'],
  ['2026-11-07', false, 'Weekend'], ['2026-11-08', false, 'Weekend'],
  ['2026-11-11', false, 'Niepodległości'],
  ['2026-04-05', false, 'Wielkanoc'], ['2026-04-06', false, 'Wielkanocny'],
  ['2026-05-24', false, 'Zielone'], ['2026-06-04', false, 'Boże Ciało'],
  ['2026-12-24', false, 'Wigilia'], ['2025-12-24', false, 'Wigilia'], ['2024-12-24', true, 'Zaplanowany'],
  ['2026-12-31', true, 'Zaplanowany'], ['2027-01-01', false, 'Nowy Rok'], ['2027-01-04', true, 'Zaplanowany'],
  ['2027-03-29', false, 'Wielkanocny'], ['2027-05-27', false, 'Boże Ciało'],
  ['2026-02-30', false, 'Nieprawidłowa'], ['', false, 'Nieprawidłowa'],
] as const) {
  const wynik = ocenDzienPracy(data, 'u')
  assert.equal(wynik.roboczy, roboczy, data)
  assert.ok(wynik.powod.includes(powod), `${data}: ${wynik.powod}`)
}
for (const [data, powod] of [['2026-01-01', 'Nowy Rok'], ['2026-01-06', 'Trzech Króli'], ['2026-05-01', 'Pracy'], ['2026-05-03', 'Konstytucji'], ['2026-08-15', 'Wniebowzięcie'], ['2026-11-01', 'Wszystkich'], ['2026-12-25', 'Boże Narodzenie'], ['2026-12-26', 'Drugi']]) {
  assert.equal(ocenDzienPracy(data, 'u').roboczy, false)
  assert.ok(ocenDzienPracy(data, 'u').powod.includes(powod))
}
assert.equal(ocenDzienPracy(new Date(NaN), 'u').roboczy, false)
assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-11-02T06:59:00Z'), { poczatek: '08:00', koniec: '16:00', kalendarzPracy: domyslnyKalendarzPracy }).etykieta, 'PREFAJRANT')
assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-06T06:00:00Z'), { poczatek: '08:00', koniec: '16:00', kalendarzPracy: domyslnyKalendarzPracy }).etykieta, 'TERAZ')

// Te same momenty dają polską datę niezależnie od strefy systemu i zmiany czasu.
for (const [moment, dzien, roboczy] of [
  ['2026-03-28T23:30:00Z', '2026-03-29', false],
  ['2026-03-29T00:30:00Z', '2026-03-29', false], ['2026-03-29T01:30:00Z', '2026-03-29', false],
  ['2026-03-29T22:30:00Z', '2026-03-30', true],
  ['2026-10-25T00:30:00Z', '2026-10-25', false], ['2026-10-25T01:30:00Z', '2026-10-25', false],
  ['2026-10-25T23:30:00Z', '2026-10-26', true], ['2026-12-31T23:30:00Z', '2027-01-01', false],
] as const) {
  assert.equal(dataWarszawska(new Date(moment)), dzien)
  assert.equal(ocenDzienPracy(new Date(moment), 'u').roboczy, roboczy)
}

const urlop: WyjatekKalendarzaPracy = { id: 'urlop', od: '2026-11-02', do: '2026-11-06', uzytkownikId: 'u', rodzaj: 'URLOP', powod: 'Urlop wypoczynkowy' }
const odbior: WyjatekKalendarzaPracy = { id: 'odbior', od: '2026-08-14', do: '2026-08-14', rodzaj: 'WOLNE', powod: 'Wolne za sobotnie święto 15 sierpnia' }
const sobota: WyjatekKalendarzaPracy = { id: 'sobota', od: '2026-11-07', do: '2026-11-07', uzytkownikId: 'u', rodzaj: 'PRACA', powod: 'Pracująca sobota' }
const kalendarz: KalendarzPracy = { ...domyslnyKalendarzPracy, wyjatki: [urlop, odbior, sobota] }
for (let indeks = 0; indeks < 5; indeks++) {
  assert.deepEqual(ocenDzienPracy(dodajDni(urlop.od, indeks), 'u', kalendarz), { roboczy: false, powod: urlop.powod })
  assert.equal(ocenDzienPracy(dodajDni(urlop.od, indeks), 'inny', kalendarz).roboczy, true)
}
assert.equal(ocenDzienPracy('2026-08-14', 'inny', kalendarz).roboczy, false)
assert.equal(ocenDzienPracy('2026-11-07', 'u', kalendarz).roboczy, true)
assert.equal(ocenDzienPracy('2026-11-07', 'inny', kalendarz).roboczy, false)
assert.equal(ocenDzienPracy('2026-11-09', 'u', kalendarz).roboczy, true)
assert.equal(blokiNaDzien(domyslnyHarmonogramPracy.blokiPracy, urlop.od, kalendarz, 'u').length, 0)
assert.equal(blokiNaDzien(domyslnyHarmonogramPracy.blokiPracy, sobota.od, kalendarz, 'u').length, 5)
assert.equal(czyDzienPracy(urlop.od, { poczatek: '08:00', koniec: '16:00', kalendarzPracy: kalendarz, uzytkownikId: 'u' }), false)
assert.equal(ocenDzienPracy('2026-11-02', 'u', { dniPracy: [2, 3, 4, 5, 6], wyjatki: [] }).roboczy, false)

// Pierwszeństwo jest niezależne od kolejności zapisu, także przy nakładających się zakresach.
const nakladajace: WyjatekKalendarzaPracy[] = [
  { ...urlop, id: 'firma-praca', uzytkownikId: undefined, rodzaj: 'PRACA', powod: 'Firma pracuje' },
  { ...urlop, id: 'firma-wolne', uzytkownikId: undefined, rodzaj: 'WOLNE', powod: 'Firma zamknięta' },
  urlop, { ...urlop, id: 'zwolnienie', rodzaj: 'ZWOLNIENIE', powod: 'Zwolnienie lekarskie' },
  { ...urlop, id: 'indywidualna-praca', rodzaj: 'PRACA', powod: 'Indywidualny dzień pracy' },
]
for (const wyjatki of [nakladajace, [...nakladajace].reverse()]) {
  assert.equal(ocenDzienPracy(urlop.od, 'u', { ...kalendarz, wyjatki }).powod, 'Indywidualny dzień pracy')
  assert.equal(ocenDzienPracy(urlop.od, 'inny', { ...kalendarz, wyjatki }).powod, 'Firma zamknięta')
  assert.equal(ocenDzienPracy(urlop.od, 'u', { ...kalendarz, wyjatki: wyjatki.filter((wpis) => wpis.rodzaj !== 'PRACA') }).powod, 'Zwolnienie lekarskie')
}
assert.equal(ocenDzienPracy('2026-12-24', 'u', { ...kalendarz, wyjatki: [{ ...sobota, od: '2026-12-24', do: '2026-12-24' }] }).roboczy, true)
assert.deepEqual(walidujWyjatkiKalendarza(kalendarz.wyjatki), [])
for (const wpis of [{ ...urlop, do: '2026-02-30' }, { ...urlop, od: '2026-11-08' }, { ...urlop, uzytkownikId: undefined }, { ...urlop, powod: ' ' }, { ...urlop, rodzaj: 'NIEZNANY' }]) assert.ok(walidujWyjatkiKalendarza([wpis]).length)
assert.ok(walidujWyjatkiKalendarza([urlop, urlop]).length)

// Starszy harmonogram i rutyny są czytane bez zapisu i bez zmiany częstotliwości.
const stareUstawienia = JSON.stringify({ wersja: 1, pulpit: { harmonogramPracy: domyslnyHarmonogramPracy, dniPracy: [1, 2, 3, 4] } })
magazyn.set(kluczUstawienAplikacji, stareUstawienia)
assert.deepEqual(pobierzKalendarzPracy(), { dniPracy: [1, 2, 3, 4], wyjatki: [] })
assert.equal(magazyn.get(kluczUstawienAplikacji), stareUstawienia)
const ustawienia = pobierzUstawieniaAplikacji()
ustawienia.pulpit.dniPracy = [1, 2, 3, 4, 5]
ustawienia.pulpit.harmonogramPracy.wyjatkiKalendarza = kalendarz.wyjatki
assert.equal(zapiszUstawieniaAplikacji(ustawienia), true)
assert.equal(czyDzienRoboczy(urlop.od, 'u'), false)
assert.equal(isWorkingDay(sobota.od, 'u'), true)
assert.equal(sprawdzDzienPracy(urlop.od, 'u').powod, urlop.powod)
const importowane = importujUstawieniaAplikacji(eksportujUstawieniaAplikacji())
assert.equal(importowane.ok, true)
if (importowane.ok) assert.deepEqual(importowane.ustawienia, ustawienia)
const zapisUstawien = magazyn.get(kluczUstawienAplikacji)
const bledne = { ...ustawienia, pulpit: { ...ustawienia.pulpit, harmonogramPracy: { ...ustawienia.pulpit.harmonogramPracy, wyjatkiKalendarza: [{ ...urlop, do: '2026-02-30' }] } } }
assert.equal(zapiszUstawieniaAplikacji(bledne), false)
assert.equal(importujUstawieniaAplikacji(JSON.stringify(bledne)).ok, false)
assert.equal(magazyn.get(kluczUstawienAplikacji), zapisUstawien)

const pracownik = { id: 'u', rola: 'PRACOWNIK', status: 'AKTYWNY', organizacja: 'SEMPER', odznaki: [] } as Uzytkownik
const rutyna: Rutyna = { id: 'robocza', tytul: 'Praca', wlascicielId: 'u', wersje: [{ od: '2026-10-30', aktywna: true, godzina: '10:00', harmonogram: { rodzaj: 'DNI_ROBOCZE' } }] }
zapiszRutyne(rutyna, pracownik, '2026-10-30')
const poprzednie = wystapieniaDnia([rutyna], [], '2026-10-30', pobierzKalendarzPracy())[0]
assert.equal(poprzednie.godzina, '10:00')
zmienWykonanieRutyny(poprzednie, true, pracownik, '2026-10-30')
const wykonania = structuredClone(pobierzRutyny().wykonania)
assert.equal(wystapieniaDnia([rutyna], [], urlop.od, pobierzKalendarzPracy()).length, 0)
assert.throws(() => zmienWykonanieRutyny({ ...poprzednie, okres: urlop.od }, true, pracownik, urlop.od), /nie jest dostępne/)
assert.equal(wystapieniaTygodnia([rutyna], [], urlop.od, pobierzKalendarzPracy()).length, 1)
assert.equal(wystapieniaDnia([rutyna], [], '2026-11-09', pobierzKalendarzPracy()).length, 1)
// Dni pominięte nie są przenoszone; powstaje tylko jedno wystąpienie z datą bieżącego dnia pracy.
assert.equal(wystapieniaDnia([rutyna], [], '2026-11-09', pobierzKalendarzPracy())[0].okres, '2026-11-09')
const przeniesiona: Rutyna = { ...rutyna, wlascicielId: 'inny', wersje: [
  { ...rutyna.wersje[0], wlascicielId: 'u' },
  { ...rutyna.wersje[0], od: '2026-11-05', wlascicielId: 'inny' },
] }
assert.equal(wystapieniaDnia([przeniesiona], [], '2026-11-04', kalendarz).length, 0)
assert.equal(wystapieniaDnia([przeniesiona], [], '2026-11-05', kalendarz).length, 1)

// Edycja starej rutyny zachowuje poprzednie dni i regułę obowiązywania zmian od jutra.
const stara: Rutyna = { ...rutyna, id: 'stara', wersje: [{ ...rutyna.wersje[0], harmonogram: { rodzaj: 'CODZIENNIE' } }] }
zapiszRutyne(stara, pracownik, '2026-10-30')
const zapisRutyn = magazyn.get('ultimatePomagier.pulpit.v1')
assert.equal(pobierzRutyny().rutyny.find((wpis) => wpis.id === 'stara')?.wersje[0].harmonogram.rodzaj, 'CODZIENNIE')
assert.equal(magazyn.get('ultimatePomagier.pulpit.v1'), zapisRutyn)
assert.throws(() => zapiszRutyne({ ...stara, wersje: [{ ...rutyna.wersje[0] }] }, pracownik, '2026-10-30'), /jutra/)
zapiszRutyne({ ...stara, wersje: [{ ...rutyna.wersje[0], od: '2026-11-02' }] }, pracownik, '2026-10-30')
const poEdycji = pobierzRutyny().rutyny.find((wpis) => wpis.id === stara.id)!
assert.equal(wystapieniaDnia([poEdycji], [], '2026-11-01', kalendarz).length, 1)
assert.equal(wystapieniaDnia([poEdycji], [], '2026-11-02', kalendarz).length, 0)
assert.deepEqual(pobierzRutyny().wykonania, wykonania)

// Kalendarz zmieniony po zapisie rutyny przelicza daty bez mutacji rutyn i historii.
ustawienia.pulpit.harmonogramPracy.wyjatkiKalendarza = [{ ...urlop, od: '2026-10-30', do: '2026-11-06' }]
const stanPrzedZmiana = pobierzRutyny()
assert.equal(zapiszUstawieniaAplikacji(ustawienia), true)
assert.equal(wystapieniaDnia([rutyna], wykonania, '2026-10-30', pobierzKalendarzPracy()).length, 0)
assert.deepEqual(pobierzRutyny(), stanPrzedZmiana)
assert.deepEqual(pobierzRutyny().wykonania, wykonania)
ustawienia.pulpit.harmonogramPracy.wyjatkiKalendarza = []
assert.equal(zapiszUstawieniaAplikacji(ustawienia), true)
assert.equal(wystapieniaDnia([rutyna], wykonania, '2026-10-30', pobierzKalendarzPracy())[0].wykonane, true)
assert.equal(wystapieniaTygodnia([rutyna], wykonania, '2026-12-31', pobierzKalendarzPracy()).length, 4)
console.log('Kalendarz pracy: święta, nieobecności, wyjątki, pierwszeństwo, Warszawa, offline, zgodność zapisu i historia rutyn — OK')
