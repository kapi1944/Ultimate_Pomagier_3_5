import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { obliczPostepCzasuDnia, pobierzEtykietyOsiCzasu, pobierzGraniceDniaPracyNaOsi, pobierzStanWskaznikaCzasu, pozycjaGodzinyNaOsi } from '../src/moduly/zamkniete/pulpit/logika/czasDnia.ts'
import { domyslneUstawieniaAplikacji, normalizujUstawieniaAplikacji } from '../src/aplikacja/ustawienia/modelUstawienAplikacji.ts'
import { eksportujUstawieniaAplikacji, importujUstawieniaAplikacji, pobierzUstawieniaAplikacji, zapiszUstawieniaAplikacji } from '../src/aplikacja/ustawienia/magazynUstawienAplikacji.ts'
import { czyMoznaZmienicKontekstPulpitu } from '../src/moduly/zamkniete/pulpit/logika/kontekstPulpitu.ts'
import { czyPaczkaOpozniona, czyPaczkaWidoczna, czyWysylkaWymagaDodatkowegoPotwierdzenia, pobierzGotowoscPaczki, sortujPaczki } from '../src/moduly/zamkniete/pulpit/logika/paczki.ts'
import { obliczLicznikiPulpitu } from '../src/moduly/zamkniete/pulpit/logika/podsumowaniePulpitu.ts'
import { obliczLiczbeAktywnychZapotrzebowanZakupowych, odmienRzeczDoZakupu, pobierzTekstLicznikaZakupow, walidujNoweZapotrzebowanieZakupowe } from '../src/moduly/zamkniete/pulpit/logika/zapotrzebowaniaZakupowe.ts'
import { generujZadaniaAutomatyczne } from '../src/moduly/zamkniete/pulpit/logika/zadaniaAutomatyczne.ts'
import { normalizujKadrMiniatury } from '../src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts'
import { czyMoznaEdytowacZadanie, czyMoznaOznaczycZadanieRecznie, czyMoznaWybracZadaniodawce, czyZadanieDoKoncaDnia, czyZadanieOpoznione, czyZadanieWidoczneDlaUzytkownika, pobierzEtykieteStatusuZadania, pobierzGodzineLogicznegoDeadline, pobierzGodzineMarkeraZadania, pobierzMomentPrzypomnieniaZadania, pobierzSzerokoscLiniiDoFajrantu, pobierzZadaniaDeadline, rozstrzygnijPrzypisanieZadania, sortujZadaniaBezGodziny, walidujPrzypomnienia } from '../src/moduly/zamkniete/pulpit/logika/zadania.ts'
import type { PaczkaPulpitu, StatusZapotrzebowaniaZakupowego, ZadaniePulpitu, ZapotrzebowanieZakupowe } from '../src/moduly/zamkniete/pulpit/modele/pulpit.ts'
import { edytujZadanieRecznePrzezZadaniodawce, normalizujZadaniePulpitu, pobierzStanPulpitu, zapiszZadanieReczne, zapiszZapotrzebowanieZakupowe } from '../src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts'

const teraz = new Date('2026-07-22T14:00:00')
const zadanie = (zmiany: Partial<ZadaniePulpitu> = {}): ZadaniePulpitu => ({ id: 'zadanie', tytul: 'Zadanie', data: '2026-07-22', utworzono: '2026-07-22T08:00:00.000Z', status: 'OTWARTE', priorytet: 'ZWYKLE', typZrodla: 'RECZNE', typZadania: 'ZADANIE_WLASNE', wlascicielId: 'anna', zadaniodawcaId: 'anna', zadaniobiorcaId: 'anna', przypomnienia: [], czyAutomatyczne: false, czyTerminKrytyczny: false, ...zmiany })
const paczka = (zmiany: Partial<PaczkaPulpitu> = {}): PaczkaPulpitu => ({ id: 'paczka', nazwaSzkolenia: 'Excel', miasto: 'Warszawa', terminySzkolenia: ['2026-07-30'], trenerzy: ['Anna Trener'], planowanaDataWysylki: '2026-07-29', wlascicielId: 'anna', liczbaGotowych: 5, liczbaWymaganych: 7, brakujaceElementy: ['materiały'], czyWyslana: false, ...zmiany })

test('tylko Architekt może zmieniać kontekst Pulpitu', () => {
  assert.equal(czyMoznaZmienicKontekstPulpitu('ARCHITEKT'), true)
  assert.equal(czyMoznaZmienicKontekstPulpitu('ADMINISTRATOR'), false)
  assert.equal(czyMoznaZmienicKontekstPulpitu('OPIEKUN'), false)
})

test('postęp czasu dnia obejmuje pełną dobę i skraca czas poza pracą', () => {
  assert.equal(obliczPostepCzasuDnia(new Date('2026-07-22T00:00:00')), 0)
  assert.ok(Math.abs(obliczPostepCzasuDnia(new Date('2026-07-22T12:00:00')) - 50.3875968992248) < 0.000001)
  assert.ok(Math.abs(obliczPostepCzasuDnia(new Date('2026-07-22T18:00:00')) - 81.3953488372093) < 0.000001)
  assert.ok(obliczPostepCzasuDnia(new Date('2026-07-22T23:59:00')) > 99.9)

  const granice = pobierzGraniceDniaPracyNaOsi()
  const skalaMinutyPrzedPraca = granice.poczatek / (7 * 60 + 45)
  const skalaMinutyPracy = (granice.koniec - granice.poczatek) / (8 * 60 + 15)
  const skalaMinutyPoPracy = (100 - granice.koniec) / (8 * 60)
  assert.ok(Math.abs(skalaMinutyPracy / skalaMinutyPrzedPraca - 2) < 0.000001)
  assert.ok(Math.abs(skalaMinutyPracy / skalaMinutyPoPracy - 2) < 0.000001)
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


test('wskaźnik czasu pokazuje PREFAJRANT o 07:44', () => {
  assert.deepEqual(pobierzStanWskaznikaCzasu(new Date('2026-07-22T07:44:00')), {
    etykieta: 'PREFAJRANT',
    pozycja: 23.979328165374678,
    wyrownanieEtykiety: 'SRODEK',
  })
})

test('wskaźnik czasu pokazuje TERAZ od 07:45 do 15:59', () => {
  assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-22T07:45:00')).etykieta, 'TERAZ')
  assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-22T15:59:00')).etykieta, 'TERAZ')
})

test('wskaźnik czasu pokazuje FAJRANT od 16:00', () => {
  assert.deepEqual(pobierzStanWskaznikaCzasu(new Date('2026-07-22T16:00:00')), {
    etykieta: 'FAJRANT',
    pozycja: 75.1937984496124,
    wyrownanieEtykiety: 'SRODEK',
  })
})

test('etykieta czasu jest przypięta do wnętrza lewej i prawej krawędzi pełnej osi', () => {
  const lewa = pobierzStanWskaznikaCzasu(new Date('2026-07-22T00:00:00'))
  const prawa = pobierzStanWskaznikaCzasu(new Date('2026-07-22T23:59:00'))
  assert.equal(lewa.pozycja, 0)
  assert.equal(lewa.wyrownanieEtykiety, 'POCZATEK')
  assert.ok(prawa.pozycja > 99.9)
  assert.equal(prawa.wyrownanieEtykiety, 'KONIEC')
})

test('ASAP jest sortowane przed wszystkimi pozostałymi priorytetami', () => {
  const posortowane = sortujZadaniaBezGodziny([
    zadanie({ id: 'zwykle', priorytet: 'ZWYKLE' }),
    zadanie({ id: 'pilne', priorytet: 'PILNE' }),
    zadanie({ id: 'asap', priorytet: 'ASAP' }),
  ], teraz)
  assert.deepEqual(posortowane.map((pozycja) => pozycja.id), ['asap', 'pilne', 'zwykle'])
})

test('deadline trafia we właściwe miejsce pełnej osi czasu', () => {
  const zakresPracy = { poczatek: '07:45', koniec: '16:00' }
  assert.equal(pozycjaGodzinyNaOsi('00:00'), 0)
  assert.ok(Math.abs(pozycjaGodzinyNaOsi('12:00') - 50.3875968992248) < 0.000001)
  assert.ok(Math.abs(pozycjaGodzinyNaOsi('18:00') - 81.3953488372093) < 0.000001)
  assert.ok(pozycjaGodzinyNaOsi('23:59') > 99.9)
  assert.ok(Math.abs(pozycjaGodzinyNaOsi('13:52', zakresPracy) - 61.963824289405686) < 0.000001)
})

test('zadanie bez godziny nie tworzy markera deadline', () => {
  const zadaniaDeadline = pobierzZadaniaDeadline([
    zadanie({ id: 'z-godzina', godzina: '12:00' }),
    zadanie({ id: 'bez-godziny' }),
    zadanie({ id: 'inny-dzien', data: '2026-07-23', godzina: '12:00' }),
  ], '2026-07-22', teraz)
  assert.deepEqual(zadaniaDeadline.map((pozycja) => pozycja.id), ['z-godzina'])
})

test('zadanie do końca dnia ma logiczny deadline FAJRANT, marker utworzenia i linię do końca pracy', () => {
  const zakresDniaPracy = { poczatek: '07:45', koniec: '16:00' }
  const doKoncaDnia = zadanie({
    id: 'do-konca-dnia',
    rodzajTerminu: 'DO_KONCA_DNIA',
    utworzono: '2026-07-22T10:30:00',
  })

  assert.equal(doKoncaDnia.godzina, undefined)
  assert.equal(czyZadanieDoKoncaDnia(doKoncaDnia), true)
  assert.equal(pobierzGodzineLogicznegoDeadline(doKoncaDnia, zakresDniaPracy), '16:00')
  assert.equal(pobierzGodzineMarkeraZadania(doKoncaDnia, zakresDniaPracy), '10:30')
  assert.ok(Math.abs(pozycjaGodzinyNaOsi(pobierzGodzineMarkeraZadania(doKoncaDnia, zakresDniaPracy)!, zakresDniaPracy) - 41.08527131782946) < 0.000001)
  assert.ok(Math.abs(pozycjaGodzinyNaOsi(zakresDniaPracy.koniec, zakresDniaPracy) - 75.1937984496124) < 0.000001)
  assert.ok(Math.abs(pobierzSzerokoscLiniiDoFajrantu(doKoncaDnia, zakresDniaPracy) - 34.10852713178294) < 0.000001)
  assert.deepEqual(pobierzZadaniaDeadline([doKoncaDnia, zadanie({ id: 'bez-godziny' })], '2026-07-22', teraz, zakresDniaPracy).map((pozycja) => pozycja.id), ['do-konca-dnia'])
  assert.equal(czyZadanieOpoznione(doKoncaDnia, new Date('2026-07-22T15:59:00'), zakresDniaPracy), false)
  assert.equal(czyZadanieOpoznione(doKoncaDnia, new Date('2026-07-22T16:01:00'), zakresDniaPracy), true)
  assert.equal(pobierzMomentPrzypomnieniaZadania(doKoncaDnia, { id: 'godzina', wartosc: 1, jednostka: 'GODZINY' }, zakresDniaPracy)?.getHours(), 15)
})

test('zadanie do końca dnia utworzone po FAJRANCIE zachowuje marker bez linii wstecz', () => {
  const zakresDniaPracy = { poczatek: '07:45', koniec: '16:00' }
  const poFajrancie = zadanie({
    rodzajTerminu: 'DO_KONCA_DNIA',
    utworzono: '2026-07-22T17:00:00',
  })

  assert.equal(pobierzGodzineMarkeraZadania(poFajrancie, zakresDniaPracy), '17:00')
  assert.equal(pobierzSzerokoscLiniiDoFajrantu(poFajrancie, zakresDniaPracy), 0)
  assert.equal(czyZadanieOpoznione(poFajrancie, new Date('2026-07-22T17:00:00'), zakresDniaPracy), true)
})

test('zadanie do końca dnia przełożone na następny dzień zaczyna się od początku pracy', () => {
  const zakresDniaPracy = { poczatek: '07:45', koniec: '16:00' }
  const przelozone = zadanie({
    data: '2026-07-23',
    odlozonoDo: '2026-07-23',
    rodzajTerminu: 'DO_KONCA_DNIA',
    utworzono: '2026-07-22T14:47:00',
  })

  assert.equal(pobierzGodzineMarkeraZadania(przelozone, zakresDniaPracy), '07:45')
})

test('domyślnie Zadaniodawca i Zadaniobiorca są aktualnym użytkownikiem', () => {
  assert.deepEqual(rozstrzygnijPrzypisanieZadania('anna', 'OPIEKUN'), {
    zadaniodawcaId: 'anna',
    zadaniobiorcaId: 'anna',
  })
})

test('zwykły użytkownik nie może zmienić Zadaniodawcy', () => {
  assert.equal(czyMoznaWybracZadaniodawce('OPIEKUN'), false)
  assert.deepEqual(rozstrzygnijPrzypisanieZadania('anna', 'OPIEKUN', 'jan', 'ewa'), {
    zadaniodawcaId: 'anna',
    zadaniobiorcaId: 'ewa',
  })
})

test('Administrator może wybrać Zadaniodawcę, a Ja oznacza efektywnego Zadaniodawcę', () => {
  assert.equal(czyMoznaWybracZadaniodawce('ADMINISTRATOR'), true)
  assert.deepEqual(rozstrzygnijPrzypisanieZadania('admin', 'ADMINISTRATOR', 'jan'), {
    zadaniodawcaId: 'jan',
    zadaniobiorcaId: 'jan',
  })
})

test('Zadaniobiorca widzi przypisane mu zadanie', () => {
  assert.equal(czyZadanieWidoczneDlaUzytkownika(zadanie({ zadaniodawcaId: 'jan', zadaniobiorcaId: 'anna' }), 'anna'), true)
})

test('Zadaniodawca widzi zlecone zadanie', () => {
  assert.equal(czyZadanieWidoczneDlaUzytkownika(zadanie({ zadaniodawcaId: 'jan', zadaniobiorcaId: 'anna' }), 'jan'), true)
})

test('można zapisać kilka różnych przypomnień, ale nie duplikaty', () => {
  const rozne = [
    { id: 'minuty', wartosc: 15, jednostka: 'MINUTY' as const },
    { id: 'godziny', wartosc: 1, jednostka: 'GODZINY' as const },
    { id: 'dni', wartosc: 1, jednostka: 'DNI' as const },
  ]
  assert.equal(walidujPrzypomnienia(rozne), null)
  assert.match(walidujPrzypomnienia([...rozne, { id: 'duplikat', wartosc: 15, jednostka: 'MINUTY' }]) ?? '', /identyczne/)
  assert.match(walidujPrzypomnienia([{ id: 'bledne', wartosc: 0, jednostka: 'DNI' }]) ?? '', /większa od zera/)
})

test('Architekt może edytować wszystkie ręczne zadania, a pozostali tylko własne otwarte', () => {
  const otwarte = zadanie({
    zadaniodawcaId: 'jan',
    zadaniobiorcaId: 'anna',
  })

  assert.equal(
    czyMoznaEdytowacZadanie(otwarte, 'jan', 'PRACOWNIK'),
    true,
  )

  assert.equal(
    czyMoznaEdytowacZadanie(otwarte, 'anna', 'PRACOWNIK'),
    false,
  )

  assert.equal(
    czyMoznaEdytowacZadanie(otwarte, 'administrator', 'ADMINISTRATOR'),
    false,
  )

  assert.equal(
    czyMoznaEdytowacZadanie(otwarte, 'kacper', 'ARCHITEKT'),
    true,
  )

  assert.equal(
    czyMoznaEdytowacZadanie(
      { ...otwarte, status: 'WYKONANE' },
      'kacper',
      'ARCHITEKT',
    ),
    true,
  )

  assert.equal(
    czyMoznaEdytowacZadanie(
      { ...otwarte, status: 'WYKONANE' },
      'jan',
      'PRACOWNIK',
    ),
    false,
  )

  assert.equal(
    czyMoznaEdytowacZadanie(
      { ...otwarte, czyAutomatyczne: true },
      'kacper',
      'ARCHITEKT',
    ),
    false,
  )
})

test('magazyn chroni edycję i zachowuje historyczne metadane zadania', () => {
  const magazyn = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (klucz: string) => magazyn.get(klucz) ?? null,
    setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
    removeItem: (klucz: string) => magazyn.delete(klucz),
    clear: () => magazyn.clear(),
    key: () => null,
    length: 0,
  } as Storage

  const oryginalne = zadanie({
    id: 'edytowane',
    tytul: 'Stary tytuł',
    zadaniodawcaId: 'jan',
    zadaniobiorcaId: 'anna',
    wlascicielId: 'anna',
    utworzono: '2026-07-20T08:00:00.000Z',
  })

  zapiszZadanieReczne(oryginalne)

  const niedozwolone = edytujZadanieRecznePrzezZadaniodawce(
    oryginalne.id,
    'anna',
    'PRACOWNIK',
    {
      tytul: 'Niedozwolona zmiana',
      data: '2026-07-23',
      godzina: '10:00',
      priorytet: 'PILNE',
      zadaniobiorcaId: 'anna',
      przypomnienia: [],
      powiazaneSzkolenieId: undefined,
    },
  )

  assert.equal(niedozwolone, null)
  assert.equal(pobierzStanPulpitu().zadaniaReczne[0]?.tytul, 'Stary tytuł')

  const zaktualizowane = edytujZadanieRecznePrzezZadaniodawce(
    oryginalne.id,
    'jan',
    'PRACOWNIK',
    {
      tytul: 'Nowy tytuł',
      data: '2026-07-24',
      godzina: '12:30',
      priorytet: 'ASAP',
      zadaniobiorcaId: 'ewa',
      przypomnienia: [{ id: 'p1', wartosc: 15, jednostka: 'MINUTY' }],
      powiazaneSzkolenieId: 'szkolenie-1',
      odlozonoDo: '2026-07-24',
    },
  )

  assert.ok(zaktualizowane)
  assert.equal(zaktualizowane.id, oryginalne.id)
  assert.equal(zaktualizowane.zadaniodawcaId, 'jan')
  assert.equal(zaktualizowane.utworzono, '2026-07-20T08:00:00.000Z')
  assert.equal(zaktualizowane.tytul, 'Nowy tytuł')
  assert.equal(zaktualizowane.data, '2026-07-24')
  assert.equal(zaktualizowane.godzina, '12:30')
  assert.equal(zaktualizowane.zadaniobiorcaId, 'ewa')
  assert.equal(zaktualizowane.wlascicielId, 'ewa')
  assert.equal(zaktualizowane.odlozonoDo, '2026-07-24')

  zapiszZadanieReczne({
    ...zaktualizowane,
    status: 'WYKONANE',
    wykonano: '2026-07-22T21:15:00.000Z',
  })

  const poWykonaniu = edytujZadanieRecznePrzezZadaniodawce(
    oryginalne.id,
    'jan',
    'PRACOWNIK',
    {
      tytul: 'Nie wolno',
      data: '2026-07-25',
      godzina: '13:00',
      priorytet: 'ZWYKLE',
      zadaniobiorcaId: 'jan',
      przypomnienia: [],
      powiazaneSzkolenieId: undefined,
    },
  )

  assert.equal(poWykonaniu, null)

  const wykonane = pobierzStanPulpitu().zadaniaReczne[0]
  assert.equal(wykonane?.tytul, 'Nowy tytuł')
  assert.equal(wykonane?.wykonano, '2026-07-22T21:15:00.000Z')

  const korektaArchitekta = edytujZadanieRecznePrzezZadaniodawce(
    oryginalne.id,
    'kacper',
    'ARCHITEKT',
    {
      tytul: 'Korekta Architekta',
      data: '2026-07-26',
      godzina: '14:15',
      priorytet: 'PILNE',
      zadaniobiorcaId: 'ewa',
      przypomnienia: [],
      powiazaneSzkolenieId: undefined,
    },
  )

  assert.ok(korektaArchitekta)
  assert.equal(korektaArchitekta.tytul, 'Korekta Architekta')
  assert.equal(korektaArchitekta.status, 'WYKONANE')
  assert.equal(korektaArchitekta.zadaniodawcaId, 'jan')
  assert.equal(korektaArchitekta.zadaniobiorcaId, 'ewa')
  assert.equal(korektaArchitekta.wykonano, '2026-07-22T21:15:00.000Z')
})

test('widok zapisuje moment wykonania i pokazuje brak czasu tylko dla starych danych', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')
  assert.match(widok, /wykonano: new Date\(\)\.toISOString\(\)/)
  assert.match(widok, /Brak danych o czasie wykonania/)
  assert.match(widok, /Edytuj zadanie/)
  assert.match(widok, /Zapisz zmiany/)
  assert.match(widok, /Odłóż o dzień/)
  assert.match(widok, /zapiszSzybkaEdycjeTerminu/)
})

test('stare zadanie bez nowych pól jest bezpiecznie normalizowane', () => {
  const stare = normalizujZadaniePulpitu({
    id: 'stare',
    tytul: 'Starsze zadanie',
    data: '2026-07-22',
    utworzono: '2026-07-20T08:00:00.000Z',
    status: 'OTWARTE',
    priorytet: 'ZWYKLE',
    typZrodla: 'RECZNE',
    typZadania: 'ZADANIE_WLASNE',
    wlascicielId: 'anna',
    czyAutomatyczne: false,
    czyTerminKrytyczny: false,
  })
  assert.ok(stare)
  assert.equal(stare.zadaniodawcaId, 'anna')
  assert.equal(stare.zadaniobiorcaId, 'anna')
  assert.equal(stare.rodzajTerminu, undefined)
  assert.deepEqual(stare.przypomnienia, [])
})

test('normalizacja zachowuje nowe terminy i rozróżnia stare zadanie godzinowe', () => {
  const doKoncaDnia = normalizujZadaniePulpitu({
    ...zadanie(),
    godzina: undefined,
    rodzajTerminu: 'DO_KONCA_DNIA',
  })
  const stareGodzinowe = normalizujZadaniePulpitu({
    ...zadanie(),
    godzina: '13:52',
  })

  assert.equal(doKoncaDnia?.rodzajTerminu, 'DO_KONCA_DNIA')
  assert.equal(doKoncaDnia?.godzina, undefined)
  assert.equal(stareGodzinowe?.rodzajTerminu, 'KONKRETNA_GODZINA')
  assert.equal(stareGodzinowe?.godzina, '13:52')
})

const zapotrzebowanie = (zmiany: Partial<ZapotrzebowanieZakupowe> = {}): ZapotrzebowanieZakupowe => ({ id: 'zakup', nazwa: 'Papier A4', ilosc: 1, status: 'ZGLOSZONE', utworzonePrzezId: 'kacper', utworzonoAt: '2026-07-22T08:00:00.000Z', ...zmiany })

test('kafelek ZAKUPY i formularz sa obecne w widoku Pulpitu', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')
  assert.match(widok, /ZAKUPY/)
  assert.match(widok, /pulpit-zakup-nazwa/)
  assert.match(widok, /zapiszZapotrzebowanieZakupowe/)
  assert.doesNotMatch(widok, /liczbaZakupow\s*=/)
})

test('licznik zakupow liczy pozycje aktywne, a nie ilosc sztuk', () => {
  assert.equal(obliczLiczbeAktywnychZapotrzebowanZakupowych([]), 0)
  assert.equal(obliczLiczbeAktywnychZapotrzebowanZakupowych([zapotrzebowanie({ ilosc: 10 })]), 1)
  assert.equal(obliczLiczbeAktywnychZapotrzebowanZakupowych([zapotrzebowanie({ id: 'pierwsze' }), zapotrzebowanie({ id: 'drugie' }), zapotrzebowanie({ id: 'trzecie' })]), 3)
})

test('tylko wskazane statusy zapotrzebowan sa aktywne', () => {
  const aktywne: StatusZapotrzebowaniaZakupowego[] = ['ZGLOSZONE', 'DO_ZAKUPU', 'W_REALIZACJI']
  const nieaktywne: StatusZapotrzebowaniaZakupowego[] = ['KUPIONE', 'ANULOWANE', 'ZAMKNIETE', 'ARCHIWALNE']
  for (const status of aktywne) assert.equal(obliczLiczbeAktywnychZapotrzebowanZakupowych([zapotrzebowanie({ status })]), 1)
  for (const status of nieaktywne) assert.equal(obliczLiczbeAktywnychZapotrzebowanZakupowych([zapotrzebowanie({ status })]), 0)
})

test('walidacja zakupu odrzuca pusta nazwe oraz ilosc zero i ujemna', () => {
  assert.ok(walidujNoweZapotrzebowanieZakupowe('   ', 1))
  assert.ok(walidujNoweZapotrzebowanieZakupowe('Papier A4', 0))
  assert.ok(walidujNoweZapotrzebowanieZakupowe('Papier A4', -1))
  assert.equal(walidujNoweZapotrzebowanieZakupowe('Papier A4', 10), null)
})

test('odmiana rzeczy do zakupu i licznik 999 plus sa poprawne', () => {
  assert.equal(odmienRzeczDoZakupu(1), 'rzecz do zakupu')
  for (const liczba of [0, 2, 3, 4, 5, 11, 12, 14, 21, 22, 24, 25, 101, 102, 105]) {
    assert.equal(odmienRzeczDoZakupu(liczba), 'rzeczy do zakupu')
  }
  assert.equal(pobierzTekstLicznikaZakupow(999), '999')
  assert.equal(pobierzTekstLicznikaZakupow(1000), '999+')
})

test('brak rejestru zakupow nie powoduje crasha, a zapis zachowuje zglaszajacego i historie statusu', () => {
  const magazyn = new Map<string, string>()
  globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc), removeItem: (klucz: string) => magazyn.delete(klucz), clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage
  assert.deepEqual(pobierzStanPulpitu().zapotrzebowaniaZakupowe, [])
  const zgloszone = zapotrzebowanie({ id: 'papier', utworzonePrzezId: 'aktualny-uzytkownik', ilosc: 10 })
  zapiszZapotrzebowanieZakupowe(zgloszone)
  zapiszZapotrzebowanieZakupowe({ ...zgloszone, status: 'KUPIONE' })
  const zapisane = pobierzStanPulpitu().zapotrzebowaniaZakupowe
  assert.equal(zapisane.length, 1)
  assert.equal(zapisane[0]?.utworzonePrzezId, 'aktualny-uzytkownik')
  assert.equal(zapisane[0]?.status, 'KUPIONE')
})


test('marker deadline rozróżnia kolorem Zadaniodawcę i Zadaniobiorcę', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')
  const css = readFileSync('src/moduly/zamkniete/pulpit/pulpit.css', 'utf8')

  assert.match(widok, /--kolor-zadaniodawcy/)
  assert.match(widok, /--kolor-zadaniobiorcy/)
  assert.match(widok, /zadanie\.zadaniodawcaId/)
  assert.match(widok, /zadanie\.zadaniobiorcaId/)

  assert.match(css, /border:\s*4px solid var\(--kolor-zadaniobiorcy\)/)
  assert.match(css, /background:\s*transparent/)
  assert.match(css, /width:\s*28px/)
  assert.match(css, /height:\s*28px/)
  assert.match(css, /background:\s*var\(--kolor-zadaniodawcy\)/)
  assert.match(css, /width:\s*16px/)
  assert.match(css, /height:\s*16px/)
})

test('marker deadline dodaje glow wyłącznie dla Pilne i mocniej dla ASAP', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')
  const css = readFileSync('src/moduly/zamkniete/pulpit/pulpit.css', 'utf8')

  assert.match(widok, /pulpit-deadline--pilne/)
  assert.match(widok, /pulpit-deadline--asap/)
  assert.match(widok, /pulpit-deadline--zwykle/)
  assert.match(css, /\.pulpit-deadline--zwykle \.pulpit-deadline__romb/)
  assert.match(css, /\.pulpit-deadline--pilne \.pulpit-deadline__romb/)
  assert.match(css, /calc\(var\(--pulpit-deadline-glow\) \+ 4px\)/)
  assert.match(css, /\.pulpit-deadline--asap \.pulpit-deadline__romb/)
  assert.match(css, /calc\(var\(--pulpit-deadline-glow\) \+ 12px\)/)
})

test('marker wiąże każdy priorytet z jawną klasą, a do końca dnia używa koloru Zadaniodawcy', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')
  const css = readFileSync('src/moduly/zamkniete/pulpit/pulpit.css', 'utf8')

  assert.match(widok, /zadanie\.priorytet === 'ZWYKLE'/)
  assert.match(widok, /pulpit-deadline--zwykle/)
  assert.match(widok, /pulpit-deadline--pilne/)
  assert.match(widok, /pulpit-deadline--asap/)
  assert.match(widok, /pulpit-deadline--do-konca-dnia/)
  assert.match(widok, /DO KOŃCA DNIA/)
  assert.match(widok, /Do: FAJRANT/)
  assert.match(css, /\.pulpit-deadline__linia-do-fajrantu/)
  assert.match(css, /background:\s*var\(--kolor-zadaniodawcy\)/)
  assert.match(css, /pointer-events:\s*none/)
})

test('odcinek czasu pracy ma podwójną grubość i pozostaje wyśrodkowany na osi', () => {
  const css = readFileSync('src/moduly/zamkniete/pulpit/pulpit.css', 'utf8')

  assert.match(css, /\.pulpit-os-czasu__odcinek--praca\s*\{[^}]*top:\s*-6px;[^}]*height:\s*24px;/s)
  assert.match(css, /\.pulpit-os-czasu__odcinek--przed-praca,[^}]*\.pulpit-os-czasu__odcinek--po-pracy\s*\{[^}]*height:\s*6px;/s)
})


test('zakres dnia pracy steruje rozszerzonym segmentem pracy na całej osi', () => {
  const zakres = { poczatek: '08:00', koniec: '17:00' }
  const zadanieDoKoncaDnia = zadanie({ rodzajTerminu: 'DO_KONCA_DNIA', utworzono: '2026-07-22T12:30:00' })

  assert.ok(Math.abs(obliczPostepCzasuDnia(new Date('2026-07-22T08:00:00'), zakres) - 24.242424242424242) < 0.000001)
  assert.ok(Math.abs(obliczPostepCzasuDnia(new Date('2026-07-22T12:30:00'), zakres) - 51.515151515151516) < 0.000001)
  assert.ok(Math.abs(obliczPostepCzasuDnia(new Date('2026-07-22T17:00:00'), zakres) - 78.78787878787878) < 0.000001)

  assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-22T07:59:00'), zakres).etykieta, 'PREFAJRANT')
  assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-22T08:00:00'), zakres).etykieta, 'TERAZ')
  assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-22T17:00:00'), zakres).etykieta, 'FAJRANT')

  const etykiety = pobierzEtykietyOsiCzasu(zakres)
  assert.deepEqual(etykiety, ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '23:59'])
  const graniceZmodyfikowane = pobierzGraniceDniaPracyNaOsi(zakres)
  const graniceDomyslne = pobierzGraniceDniaPracyNaOsi({ poczatek: '07:45', koniec: '16:00' })
  assert.ok(Math.abs(graniceZmodyfikowane.poczatek - 24.242424242424242) < 0.000001)
  assert.ok(Math.abs(graniceZmodyfikowane.koniec - 78.78787878787878) < 0.000001)
  assert.ok(Math.abs(graniceDomyslne.poczatek - 24.031007751937985) < 0.000001)
  assert.ok(Math.abs(graniceDomyslne.koniec - 75.1937984496124) < 0.000001)
  assert.equal(pozycjaGodzinyNaOsi('12:30', zakres), 51.515151515151516)
  assert.ok(Math.abs(pobierzSzerokoscLiniiDoFajrantu(zadanieDoKoncaDnia, zakres) - 27.272727272727266) < 0.000001)
})

test('widok ustawia etykiety i znaczniki według aktywnego zakresu dnia pracy', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')

  assert.match(widok, /pozycjaGodzinyNaOsi\(godzinaMarkera, zakresDniaPracy\)/)
  assert.match(widok, /pozycjaGodzinyNaOsi\(etykieta, zakresDniaPracy\)/)
})

test('system ustawień aplikacji ma bezpieczne wartości domyślne i ogranicza zakresy', () => {
  const ustawienia = normalizujUstawieniaAplikacji({
    wersja: 1,
    wyglad: {
      paleta: 'NIEISTNIEJACA',
      gestosc: 'STANDARDOWA',
      promienKart: 999,
      promienPol: -10,
      czasPrzejsciaMs: 9999,
      skalaHover: 2,
    },
    pulpit: {
      poczatekDnia: '18:00',
      koniecDnia: '08:00',
      deadline: {
        rozmiarRombu: 999,
        gruboscObramowania: 99,
        rozmiarKropki: 99,
        poswiata: 'MOCNA',
        pokazPlomienAsap: false,
      },
    },
    dostepnosc: {
      ograniczAnimacje: true,
    },
  })

  assert.equal(ustawienia.wyglad.paleta, 'DOMYSLNA')
  assert.equal(ustawienia.wyglad.promienKart, 32)
  assert.equal(ustawienia.wyglad.promienPol, 0)
  assert.equal(ustawienia.wyglad.czasPrzejsciaMs, 600)
  assert.equal(ustawienia.wyglad.skalaHover, 1.05)

  assert.equal(ustawienia.pulpit.poczatekDnia, '07:45')
  assert.equal(ustawienia.pulpit.koniecDnia, '16:00')
  assert.equal(ustawienia.pulpit.deadline.rozmiarRombu, 48)
  assert.equal(ustawienia.pulpit.deadline.gruboscObramowania, 8)
  assert.equal(ustawienia.pulpit.deadline.rozmiarKropki, 24)
  assert.equal(ustawienia.dostepnosc.ograniczAnimacje, true)
})

test('ustawienia zapisują się jako jeden wersjonowany rekord i poprawnie importują JSON', () => {
  const magazyn = new Map<string, string>()

  globalThis.localStorage = {
    getItem: (klucz: string) => magazyn.get(klucz) ?? null,
    setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
    removeItem: (klucz: string) => magazyn.delete(klucz),
    clear: () => magazyn.clear(),
    key: (indeks: number) => Array.from(magazyn.keys())[indeks] ?? null,
    get length() { return magazyn.size },
  } as Storage

  const zmienione = normalizujUstawieniaAplikacji({
    ...domyslneUstawieniaAplikacji,
    wyglad: {
      ...domyslneUstawieniaAplikacji.wyglad,
      paleta: 'CRM',
      promienKart: 14,
    },
    pulpit: {
      ...domyslneUstawieniaAplikacji.pulpit,
      poczatekDnia: '08:00',
      koniecDnia: '17:00',
      deadline: {
        ...domyslneUstawieniaAplikacji.pulpit.deadline,
        rozmiarRombu: 34,
      },
    },
  })

  assert.equal(zapiszUstawieniaAplikacji(zmienione), true)

  const odczytane = pobierzUstawieniaAplikacji()
  assert.equal(odczytane.wyglad.paleta, 'CRM')
  assert.equal(odczytane.wyglad.promienKart, 14)
  assert.equal(odczytane.pulpit.poczatekDnia, '08:00')
  assert.equal(odczytane.pulpit.deadline.rozmiarRombu, 34)

  const eksport = eksportujUstawieniaAplikacji(odczytane)
  const importPoprawny = importujUstawieniaAplikacji(eksport)
  assert.equal(importPoprawny.ok, true)

  const importBlednyJson = importujUstawieniaAplikacji('{')
  assert.equal(importBlednyJson.ok, false)

  const importZlaWersja = importujUstawieniaAplikacji('{"wersja":2}')
  assert.equal(importZlaWersja.ok, false)
})

test('CSS i Pulpit korzystają z centralnych zmiennych ustawień', () => {
  const indexCss = readFileSync('src/index.css', 'utf8')
  const pulpitCss = readFileSync('src/moduly/zamkniete/pulpit/pulpit.css', 'utf8')
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')

  assert.match(indexCss, /--ui-promien-karty/)
  assert.match(indexCss, /--pulpit-deadline-size/)
  assert.match(indexCss, /data-ui-ogranicz-animacje/)

  assert.match(pulpitCss, /var\(--pulpit-deadline-size\)/)
  assert.match(pulpitCss, /var\(--pulpit-deadline-border\)/)
  assert.match(pulpitCss, /var\(--pulpit-deadline-dot-size\)/)
  assert.match(pulpitCss, /data-ui-pokaz-plomien-asap="false"/)

  assert.match(widok, /pobierzUstawieniaAplikacji/)
  assert.match(widok, /zakresDniaPracy/)
})


test('Etap 2 ustawień obsługuje nawigację, kafelki i wartości domyślne zadań', () => {
  const domyslne = normalizujUstawieniaAplikacji({})

  assert.equal(domyslne.nawigacja.szerokoscMenu, 280)
  assert.equal(domyslne.nawigacja.wysokoscPrzyciskuMenu, 'STANDARDOWA')

  assert.equal(domyslne.pulpit.widoczneKafelki.doZrobienia, true)
  assert.equal(domyslne.pulpit.widoczneKafelki.pilne, true)
  assert.equal(domyslne.pulpit.widoczneKafelki.paczki, true)
  assert.equal(domyslne.pulpit.widoczneKafelki.blokady, true)
  assert.equal(domyslne.pulpit.widoczneKafelki.zakupy, true)

  assert.equal(domyslne.zadania.domyslnyPriorytet, 'ZWYKLE')
  assert.equal(domyslne.zadania.domyslnaGodzina, '')
  assert.deepEqual(domyslne.zadania.domyslnePrzypomnienia, {
    piecMinut: false,
    pietnascieMinut: false,
    godzina: false,
    dzien: false,
  })
})

test('Etap 2 ustawień normalizuje zakres menu oraz konfigurację nowych zadań', () => {
  const ustawienia = normalizujUstawieniaAplikacji({
    wersja: 1,
    nawigacja: {
      szerokoscMenu: 999,
      wysokoscPrzyciskuMenu: 'DUZA',
    },
    pulpit: {
      widoczneKafelki: {
        doZrobienia: false,
        pilne: true,
        paczki: false,
        blokady: true,
        zakupy: false,
      },
    },
    zadania: {
      domyslnyPriorytet: 'ASAP',
      domyslnaGodzina: '14:30',
      domyslnePrzypomnienia: {
        piecMinut: true,
        pietnascieMinut: true,
        godzina: false,
        dzien: true,
      },
    },
  })

  assert.equal(ustawienia.nawigacja.szerokoscMenu, 360)
  assert.equal(ustawienia.nawigacja.wysokoscPrzyciskuMenu, 'DUZA')

  assert.equal(ustawienia.pulpit.widoczneKafelki.doZrobienia, false)
  assert.equal(ustawienia.pulpit.widoczneKafelki.paczki, false)
  assert.equal(ustawienia.pulpit.widoczneKafelki.zakupy, false)

  assert.equal(ustawienia.zadania.domyslnyPriorytet, 'ASAP')
  assert.equal(ustawienia.zadania.domyslnaGodzina, '14:30')
  assert.equal(ustawienia.zadania.domyslnePrzypomnienia.piecMinut, true)
  assert.equal(ustawienia.zadania.domyslnePrzypomnienia.pietnascieMinut, true)
  assert.equal(ustawienia.zadania.domyslnePrzypomnienia.godzina, false)
  assert.equal(ustawienia.zadania.domyslnePrzypomnienia.dzien, true)
})

test('Etap 2 ustawień zachowuje zgodność ze starym rekordem wersji 1', () => {
  const stare = normalizujUstawieniaAplikacji({
    wersja: 1,
    wyglad: {
      paleta: 'DOMYSLNA',
      gestosc: 'STANDARDOWA',
      promienKart: 10,
      promienPol: 6,
      czasPrzejsciaMs: 150,
      skalaHover: 1,
    },
    pulpit: {
      poczatekDnia: '07:45',
      koniecDnia: '16:00',
      deadline: {
        rozmiarRombu: 28,
        gruboscObramowania: 5,
        rozmiarKropki: 16,
        poswiata: 'STANDARDOWA',
        pokazPlomienAsap: true,
      },
    },
    dostepnosc: {
      ograniczAnimacje: false,
    },
  })

  assert.equal(stare.nawigacja.szerokoscMenu, 280)
  assert.equal(stare.pulpit.widoczneKafelki.zakupy, true)
  assert.equal(stare.zadania.domyslnyPriorytet, 'ZWYKLE')
})

test('Pulpit respektuje widoczność kafelków i domyślne pola nowego zadania', () => {
  const widok = readFileSync(
    'src/moduly/zamkniete/pulpit/WidokPulpitu.tsx',
    'utf8',
  )

  assert.match(widok, /widoczneKafelki\.doZrobienia/)
  assert.match(widok, /widoczneKafelki\.pilne/)
  assert.match(widok, /widoczneKafelki\.paczki/)
  assert.match(widok, /widoczneKafelki\.blokady/)
  assert.match(widok, /widoczneKafelki\.zakupy/)

  assert.match(widok, /ustawienia\.zadania\.domyslnyPriorytet/)
  assert.match(widok, /ustawienia\.zadania\.domyslnaGodzina/)
  assert.match(widok, /domyslnePrzypomnienia\.piecMinut/)
  assert.match(widok, /domyslnePrzypomnienia\.dzien/)
})

test('Nawigacja korzysta z centralnych zmiennych szerokości i wysokości menu', () => {
  const css = readFileSync(
    'src/aplikacja/layout/ukladAplikacji.css',
    'utf8',
  )

  const magazyn = readFileSync(
    'src/aplikacja/ustawienia/magazynUstawienAplikacji.ts',
    'utf8',
  )

  assert.match(css, /--ui-menu-width/)
  assert.match(css, /--ui-menu-button-height/)
  assert.match(magazyn, /--ui-menu-width/)
  assert.match(magazyn, /--ui-menu-button-height/)
})

test('kadr miniatury ma bezpieczne wartości domyślne i ogranicza przesunięcie oraz zoom', () => {
  assert.deepEqual(normalizujKadrMiniatury(undefined), {
    x: 0,
    y: 0,
    zoom: 1,
    proporcja: '16:9',
  })
  assert.deepEqual(normalizujKadrMiniatury({ x: 8, y: -5, zoom: 99, proporcja: '1:1' }), {
    x: 1,
    y: -1,
    zoom: 3,
    proporcja: '1:1',
  })
})

test('stara miniatura bez źródła i kadru jest migrowana bez utraty zadania', () => {
  const staraMiniatura = 'data:image/webp;base64,AAAA'
  const znormalizowane = normalizujZadaniePulpitu({
    ...zadanie({ id: 'stara-miniatura' }),
    miniatura: {
      daneUrl: staraMiniatura,
      nazwaPliku: 'stara.webp',
      szerokosc: 320,
      wysokosc: 180,
    },
  })

  assert.ok(znormalizowane)
  assert.equal(znormalizowane.miniatura?.daneUrl, staraMiniatura)
  assert.equal(znormalizowane.miniatura?.zrodloDaneUrl, staraMiniatura)
  assert.equal(znormalizowane.miniatura?.szerokoscZrodla, 320)
  assert.equal(znormalizowane.miniatura?.wysokoscZrodla, 180)
  assert.deepEqual(znormalizowane.miniatura?.kadr, { x: 0, y: 0, zoom: 1, proporcja: '16:9' })
})

test('uszkodzona miniatura jest odrzucana bez odrzucania zadania', () => {
  const znormalizowane = normalizujZadaniePulpitu({
    ...zadanie({ id: 'uszkodzona-miniatura' }),
    miniatura: {
      daneUrl: 'javascript:alert(1)',
      zrodloDaneUrl: 'javascript:alert(1)',
      szerokosc: 320,
      wysokosc: 180,
      szerokoscZrodla: 1000,
      wysokoscZrodla: 600,
      kadr: { x: 0, y: 0, zoom: 1, proporcja: '16:9' },
    },
  })

  assert.ok(znormalizowane)
  assert.equal(znormalizowane.miniatura, undefined)
})

test('widok zapisuje miniaturę przy tworzeniu i edycji oraz renderuje ją nad markerem z tą samą pozycją czasu', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')
  const css = readFileSync('src/moduly/zamkniete/pulpit/pulpit.css', 'utf8')

  assert.match(widok, /miniatura:\s*noweZadanie\.miniatura/)
  assert.match(widok, /miniatura:\s*formularzEdycji\.miniatura/)
  assert.match(widok, /pulpit-os-czasu__miniatury/)
  assert.match(widok, /MiniaturaZadaniaNaOsi/)
  assert.match(widok, /pozycjaGodzinyNaOsi\(godzinaMarkera, zakresDniaPracy\)/)
  assert.match(widok, /Edytuj miniaturę/)
  assert.match(widok, /Zmień obraz/)
  assert.match(widok, /Usuń miniaturę/)
  assert.match(widok, /Zastosuj kadr/)
  assert.match(css, /\.pulpit-os-czasu__miniatura/)
})

test('model miniatury zachowuje źródło robocze i parametry ponownej edycji kadru', () => {
  const model = readFileSync('src/moduly/zamkniete/pulpit/modele/pulpit.ts', 'utf8')
  const logika = readFileSync('src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts', 'utf8')

  assert.match(model, /zrodloDaneUrl:\s*string/)
  assert.match(model, /szerokoscZrodla:\s*number/)
  assert.match(model, /wysokoscZrodla:\s*number/)
  assert.match(model, /kadr:\s*KadrMiniaturyZadania/)
  assert.match(logika, /maksymalnyWymiarZrodla\s*=\s*1600/)
  assert.match(logika, /aktualizujKadrMiniatury/)
  assert.match(logika, /proporcja/)
})
