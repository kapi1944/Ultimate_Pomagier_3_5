import assert from 'node:assert/strict'
import test from 'node:test'
import { obliczPostepCzasuDnia } from '../src/moduly/zamkniete/pulpit/logika/czasDnia.ts'
import { czyMoznaZmienicKontekstPulpitu } from '../src/moduly/zamkniete/pulpit/logika/kontekstPulpitu.ts'
import { czyPaczkaOpozniona, czyPaczkaWidoczna, czyWysylkaWymagaDodatkowegoPotwierdzenia, pobierzGotowoscPaczki, sortujPaczki } from '../src/moduly/zamkniete/pulpit/logika/paczki.ts'
import { obliczLicznikiPulpitu } from '../src/moduly/zamkniete/pulpit/logika/podsumowaniePulpitu.ts'
import { generujZadaniaAutomatyczne } from '../src/moduly/zamkniete/pulpit/logika/zadaniaAutomatyczne.ts'
import { czyMoznaOznaczycZadanieRecznie, czyZadanieOpoznione, pobierzEtykieteStatusuZadania, sortujZadaniaBezGodziny } from '../src/moduly/zamkniete/pulpit/logika/zadania.ts'
import type { PaczkaPulpitu, ZadaniePulpitu } from '../src/moduly/zamkniete/pulpit/modele/pulpit.ts'

const teraz = new Date('2026-07-22T14:00:00')
const zadanie = (zmiany: Partial<ZadaniePulpitu> = {}): ZadaniePulpitu => ({ id: 'zadanie', tytul: 'Zadanie', data: '2026-07-22', utworzono: '2026-07-22T08:00:00.000Z', status: 'OTWARTE', priorytet: 'ZWYKLE', typZrodla: 'RECZNE', typZadania: 'ZADANIE_WLASNE', wlascicielId: 'anna', czyAutomatyczne: false, czyTerminKrytyczny: false, ...zmiany })
const paczka = (zmiany: Partial<PaczkaPulpitu> = {}): PaczkaPulpitu => ({ id: 'paczka', nazwaSzkolenia: 'Excel', miasto: 'Warszawa', terminySzkolenia: ['2026-07-30'], trenerzy: ['Anna Trener'], planowanaDataWysylki: '2026-07-29', wlascicielId: 'anna', liczbaGotowych: 5, liczbaWymaganych: 7, brakujaceElementy: ['materiały'], czyWyslana: false, ...zmiany })

test('tylko Architekt może zmieniać kontekst Pulpitu', () => {
  assert.equal(czyMoznaZmienicKontekstPulpitu('ARCHITEKT'), true)
  assert.equal(czyMoznaZmienicKontekstPulpitu('ADMINISTRATOR'), false)
  assert.equal(czyMoznaZmienicKontekstPulpitu('OPIEKUN'), false)
})

test('postęp czasu dnia obejmuje dokładnie zakres 07:45–16:00', () => {
  assert.equal(obliczPostepCzasuDnia(new Date('2026-07-22T07:44:00')), 0)
  assert.equal(obliczPostepCzasuDnia(new Date('2026-07-22T07:45:00')), 0)
  assert.equal(obliczPostepCzasuDnia(new Date('2026-07-22T11:52:30')), 50)
  assert.equal(obliczPostepCzasuDnia(new Date('2026-07-22T16:00:00')), 100)
  assert.equal(obliczPostepCzasuDnia(new Date('2026-07-22T18:00:00')), 100)
})

test('status zadania rozróżnia opóźnione, wykonane i zadanie bez godziny', () => {
  assert.equal(czyZadanieOpoznione(zadanie({ data: '2026-07-23', godzina: '09:00' }), teraz), false)
  assert.equal(czyZadanieOpoznione(zadanie({ godzina: '13:59' }), teraz), true)
  assert.equal(pobierzEtykieteStatusuZadania(zadanie({ status: 'WYKONANE', godzina: '13:00' }), teraz), 'Wykonane')
  assert.equal(czyZadanieOpoznione(zadanie(), teraz), false)
})

test('zadania bez godziny są sortowane według pilności i utworzenia', () => {
  const posortowane = sortujZadaniaBezGodziny([zadanie({ id: 'zwykle', utworzono: '2026-07-22T08:00:00Z' }), zadanie({ id: 'pilne-pozne', priorytet: 'PILNE', utworzono: '2026-07-22T10:00:00Z' }), zadanie({ id: 'pilne-wczesne', priorytet: 'PILNE', utworzono: '2026-07-22T09:00:00Z' })], teraz)
  assert.deepEqual(posortowane.map((pozycja) => pozycja.id), ['pilne-wczesne', 'pilne-pozne', 'zwykle'])
})

test('reguły automatyczne wykrywają zatwierdzone braki i nie pozwalają ich ręcznie zamknąć', () => {
  const zadania = generujZadaniaAutomatyczne([{ id: 'szkolenie-1', tytul: 'Szkolenie', wlascicielId: 'anna', data: '2026-07-22', czyMaTrenera: false, czyHotelWymagany: true, czyHotelZarezerwowany: false, czyDaneKlientaKompletne: false, czyMaterialyOdTreneraGotowe: false }])
  assert.deepEqual(zadania.map((pozycja) => pozycja.typZadania), ['BRAK_TRENERA', 'BRAK_HOTELU', 'BRAK_DANYCH_KLIENTA', 'BRAK_MATERIALOW_TRENERA'])
  assert.equal(czyMoznaOznaczycZadanieRecznie(zadania[0]), false)
  assert.deepEqual(generujZadaniaAutomatyczne([{ id: 'szkolenie-2', tytul: 'Bez hotelu', wlascicielId: 'anna', data: '2026-07-22', czyMaTrenera: true, czyHotelWymagany: false, czyHotelZarezerwowany: false, czyDaneKlientaKompletne: true }]), [])
})

test('paczki są widoczne od siedmiu dni, pozostają po terminie i znikają po wysłaniu', () => {
  assert.equal(czyPaczkaWidoczna(paczka({ planowanaDataWysylki: '2026-07-30' }), teraz), false)
  assert.equal(czyPaczkaWidoczna(paczka({ planowanaDataWysylki: '2026-07-29' }), teraz), true)
  assert.equal(czyPaczkaWidoczna(paczka({ planowanaDataWysylki: '2026-07-22' }), teraz), true)
  assert.equal(czyPaczkaOpozniona(paczka({ planowanaDataWysylki: '2026-07-21' }), teraz), true)
  assert.equal(czyPaczkaWidoczna(paczka({ planowanaDataWysylki: '2026-07-21', czyWyslana: true }), teraz), false)
})

test('paczki opóźnione są pierwsze, a gotowość pokazuje X/Y i procent', () => {
  const posortowane = sortujPaczki([paczka({ id: 'pozniej', planowanaDataWysylki: '2026-07-28' }), paczka({ id: 'opozniona', planowanaDataWysylki: '2026-07-21' }), paczka({ id: 'wczesniej', planowanaDataWysylki: '2026-07-25' })], teraz)
  assert.deepEqual(posortowane.map((pozycja) => pozycja.id), ['opozniona', 'wczesniej', 'pozniej'])
  assert.deepEqual(pobierzGotowoscPaczki(paczka()), { procent: 71, tekst: '71% • 5/7', czyGotowa: false })
  assert.deepEqual(pobierzGotowoscPaczki(paczka({ liczbaGotowych: 7, brakujaceElementy: [] })), { procent: 100, tekst: '100% • 7/7', czyGotowa: true })
  assert.equal(czyWysylkaWymagaDodatkowegoPotwierdzenia(paczka()), true)
  assert.equal(czyWysylkaWymagaDodatkowegoPotwierdzenia(paczka({ brakujaceElementy: [] })), false)
})

test('liczniki kafelków wynikają z aktualnych zadań i paczek', () => {
  const automatyczne = zadanie({ id: 'blokada', czyAutomatyczne: true, priorytet: 'PILNE', godzina: '13:00' })
  const liczniki = obliczLicznikiPulpitu([zadanie(), automatyczne], [paczka({ planowanaDataWysylki: '2026-07-29' })], teraz, '2026-07-22')
  assert.deepEqual(liczniki, { doZrobienia: 2, pilne: 1, paczki: 1, blokady: 1 })
})
