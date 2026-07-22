import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { obliczPostepCzasuDnia, pobierzStanWskaznikaCzasu, pozycjaGodzinyNaOsi } from '../src/moduly/zamkniete/pulpit/logika/czasDnia.ts'
import { czyMoznaZmienicKontekstPulpitu } from '../src/moduly/zamkniete/pulpit/logika/kontekstPulpitu.ts'
import { czyPaczkaOpozniona, czyPaczkaWidoczna, czyWysylkaWymagaDodatkowegoPotwierdzenia, pobierzGotowoscPaczki, sortujPaczki } from '../src/moduly/zamkniete/pulpit/logika/paczki.ts'
import { obliczLicznikiPulpitu } from '../src/moduly/zamkniete/pulpit/logika/podsumowaniePulpitu.ts'
import { obliczLiczbeAktywnychZapotrzebowanZakupowych, odmienRzeczDoZakupu, pobierzTekstLicznikaZakupow, walidujNoweZapotrzebowanieZakupowe } from '../src/moduly/zamkniete/pulpit/logika/zapotrzebowaniaZakupowe.ts'
import { generujZadaniaAutomatyczne } from '../src/moduly/zamkniete/pulpit/logika/zadaniaAutomatyczne.ts'
import { czyMoznaEdytowacZadanie, czyMoznaOznaczycZadanieRecznie, czyMoznaWybracZadaniodawce, czyZadanieOpoznione, czyZadanieWidoczneDlaUzytkownika, pobierzEtykieteStatusuZadania, pobierzZadaniaDeadline, rozstrzygnijPrzypisanieZadania, sortujZadaniaBezGodziny, walidujPrzypomnienia } from '../src/moduly/zamkniete/pulpit/logika/zadania.ts'
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


test('wskaźnik czasu pokazuje PREFAJRANT o 07:44', () => {
  assert.deepEqual(pobierzStanWskaznikaCzasu(new Date('2026-07-22T07:44:00')), {
    etykieta: 'PREFAJRANT',
    pozycja: 0,
    wyrownanieEtykiety: 'POCZATEK',
  })
})

test('wskaźnik czasu pokazuje TERAZ od 07:45 do 15:59', () => {
  assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-22T07:45:00')).etykieta, 'TERAZ')
  assert.equal(pobierzStanWskaznikaCzasu(new Date('2026-07-22T15:59:00')).etykieta, 'TERAZ')
})

test('wskaźnik czasu pokazuje FAJRANT od 16:00', () => {
  assert.deepEqual(pobierzStanWskaznikaCzasu(new Date('2026-07-22T16:00:00')), {
    etykieta: 'FAJRANT',
    pozycja: 100,
    wyrownanieEtykiety: 'KONIEC',
  })
})

test('etykieta czasu jest przypięta do wnętrza lewej i prawej krawędzi osi', () => {
  const lewa = pobierzStanWskaznikaCzasu(new Date('2026-07-22T07:30:00'))
  const prawa = pobierzStanWskaznikaCzasu(new Date('2026-07-22T17:00:00'))
  assert.equal(lewa.pozycja, 0)
  assert.equal(lewa.wyrownanieEtykiety, 'POCZATEK')
  assert.equal(prawa.pozycja, 100)
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

test('deadline trafia we właściwe miejsce osi czasu', () => {
  assert.equal(pozycjaGodzinyNaOsi('07:45'), 0)
  assert.equal(pozycjaGodzinyNaOsi('16:00'), 100)
  assert.ok(Math.abs(pozycjaGodzinyNaOsi('12:00') - 51.515151515151516) < 0.000001)
})

test('zadanie bez godziny nie tworzy markera deadline', () => {
  const zadaniaDeadline = pobierzZadaniaDeadline([
    zadanie({ id: 'z-godzina', godzina: '12:00' }),
    zadanie({ id: 'bez-godziny' }),
    zadanie({ id: 'inny-dzien', data: '2026-07-23', godzina: '12:00' }),
  ], '2026-07-22', teraz)
  assert.deepEqual(zadaniaDeadline.map((pozycja) => pozycja.id), ['z-godzina'])
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

test('tylko Zadaniodawca może edytować otwarte ręczne zadanie', () => {
  const otwarte = zadanie({
    zadaniodawcaId: 'jan',
    zadaniobiorcaId: 'anna',
  })

  assert.equal(czyMoznaEdytowacZadanie(otwarte, 'jan'), true)
  assert.equal(czyMoznaEdytowacZadanie(otwarte, 'anna'), false)
  assert.equal(czyMoznaEdytowacZadanie(otwarte, 'obcy'), false)
  assert.equal(czyMoznaEdytowacZadanie({ ...otwarte, status: 'WYKONANE' }, 'jan'), false)
  assert.equal(czyMoznaEdytowacZadanie({ ...otwarte, czyAutomatyczne: true }, 'jan'), false)
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
  assert.deepEqual(stare.przypomnienia, [])
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
