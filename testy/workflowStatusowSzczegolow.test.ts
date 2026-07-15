import assert from 'node:assert/strict'
import test from 'node:test'
import type { KontoSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow.ts'
import type { DaneFormularza, WersjaRoboczaGeneratora } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'
import {
  opublikujWersjeRobocza,
  pobierzHistorieSzczegolow,
  pobierzOpublikowaneSzczegoly,
  ustawStatusOpublikowanychSzczegolow,
  utworzKopieRoboczaZOpublikowanychSzczegolow,
} from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts'
import { czyMoznaEdytowacBezposrednio, czyMoznaUtworzycAktualizacje, czyStatusJestZamkniety, walidujPrzejscieStatusuSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/workflowStatusow.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

const konto: KontoSzczegolow = { id: 'tester', nazwa: 'Tester', rola: 'Architekt' }

function utworzWersjeRobocza(): WersjaRoboczaGeneratora {
  return {
    id: `wersja-testowa-${Date.now()}`,
    wersja: 'test',
    etykietaWersji: 'testowa',
    nazwa: '[Kopia robocza] Test',
    dataZapisu: new Date().toISOString(),
    autorId: konto.id,
    autorNazwa: konto.nazwa,
    dane: {
      status: 'PEŁNE',
      statusSzkolenia: 'W PRZYGOTOWANIACH',
      tytulSzkolenia: 'Test workflow',
      opiekunId: konto.id,
    } as DaneFormularza,
    grupy: [],
    adresaci: {} as WersjaRoboczaGeneratora['adresaci'],
    statusyPol: {},
  }
}

function opublikujTestowyRekord() {
  magazyn.clear()
  return opublikujWersjeRobocza(utworzWersjeRobocza())
}

test('publikacja korzysta z przejścia PEŁNE do OCZEKUJĄCE', () => {
  assert.equal(walidujPrzejscieStatusuSzczegolow('PEŁNE', 'OCZEKUJĄCE').poprawne, true)
})

test('niedozwolone przejście statusu jest odrzucane', () => {
  assert.equal(walidujPrzejscieStatusuSzczegolow('OCZEKUJĄCE', 'ROZLICZONE').poprawne, false)
})

test('niezrealizowanie wymaga niepustej przyczyny', () => {
  assert.equal(walidujPrzejscieStatusuSzczegolow('GOTOWE', 'NIEZREALIZOWANE', '   ').poprawne, false)
  assert.equal(walidujPrzejscieStatusuSzczegolow('GOTOWE', 'NIEZREALIZOWANE', 'Klient odwołał termin.').poprawne, true)
})

test('publikacja automatyczna zapisuje historię z aktorem i oznaczeniem automatycznym', () => {
  const rekord = opublikujTestowyRekord()
  const wpis = pobierzHistorieSzczegolow().find((pozycja) => pozycja.zmianaStatusu?.na === 'OCZEKUJĄCE')

  assert.equal(rekord.status, 'OCZEKUJĄCE')
  assert.equal(wpis?.autorId, konto.id)
  assert.equal(wpis?.automatyczne, true)
  assert.equal(wpis?.akcjaStatusu, 'publikacja')
})

test('ręczna zmiana bez aktora nie zapisuje anonimowej zmiany', () => {
  const rekord = opublikujTestowyRekord()
  const liczbaWpisow = pobierzHistorieSzczegolow().length

  assert.throws(() => ustawStatusOpublikowanychSzczegolow(rekord.id, 'ZAAKCEPTOWANE', undefined as unknown as { konto: KontoSzczegolow }), /wymaga wskazania aktora/)
  assert.equal(pobierzOpublikowaneSzczegoly()[0]?.status, 'OCZEKUJĄCE')
  assert.equal(pobierzHistorieSzczegolow().length, liczbaWpisow)
})

test('domyślny komentarz ani białe znaki nie są przyczyną niezrealizowania', () => {
  const rekord = opublikujTestowyRekord()
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'ZAAKCEPTOWANE', { konto })
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'GOTOWE', { konto })

  assert.throws(
    () => ustawStatusOpublikowanychSzczegolow(rekord.id, 'NIEZREALIZOWANE', { konto, komentarz: 'Zmieniono status szczegółów.' }),
    /Podaj przyczynę/,
  )
  assert.throws(() => ustawStatusOpublikowanychSzczegolow(rekord.id, 'NIEZREALIZOWANE', { konto, powod: '   ' }), /Podaj przyczynę/)
  assert.equal(pobierzOpublikowaneSzczegoly()[0]?.status, 'GOTOWE')
})

test('rzeczywista przyczyna zmienia status i trafia do historii', () => {
  const rekord = opublikujTestowyRekord()
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'ZAAKCEPTOWANE', { konto })
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'GOTOWE', { konto })
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'NIEZREALIZOWANE', { konto, komentarz: 'Klient potwierdził anulowanie.', powod: 'Klient odwołał szkolenie.' })

  const wpis = pobierzHistorieSzczegolow().find((pozycja) => pozycja.zmianaStatusu?.na === 'NIEZREALIZOWANE')
  assert.equal(pobierzOpublikowaneSzczegoly()[0]?.status, 'NIEZREALIZOWANE')
  assert.equal(wpis?.powod, 'Klient odwołał szkolenie.')
  assert.equal(wpis?.komentarz, 'Klient potwierdził anulowanie.')
  assert.equal(wpis?.autorId, konto.id)
})

test('niedozwolone przejście nie zmienia rekordu', () => {
  const rekord = opublikujTestowyRekord()

  assert.throws(() => ustawStatusOpublikowanychSzczegolow(rekord.id, 'ROZLICZONE', { konto }), /nie jest dozwolone/)
  assert.equal(pobierzOpublikowaneSzczegoly()[0]?.status, 'OCZEKUJĄCE')
})

test('rozliczenie zamyka rekord, a wcześniejszy status pozwala utworzyć aktualizację bez modyfikacji publikacji', () => {
  const rekord = opublikujTestowyRekord()
  const kopia = utworzKopieRoboczaZOpublikowanychSzczegolow(rekord, konto)

  assert.equal(czyMoznaEdytowacBezposrednio(rekord.status), false)
  assert.equal(czyMoznaUtworzycAktualizacje(rekord.status), true)
  assert.notEqual(kopia?.id, rekord.id)
  assert.equal(pobierzOpublikowaneSzczegoly()[0]?.id, rekord.id)
  assert.equal(pobierzOpublikowaneSzczegoly()[0]?.dane.tytulSzkolenia, 'Test workflow')

  ustawStatusOpublikowanychSzczegolow(rekord.id, 'ZAAKCEPTOWANE', { konto })
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'GOTOWE', { konto })
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'ZREALIZOWANE', { konto })
  ustawStatusOpublikowanychSzczegolow(rekord.id, 'ROZLICZONE', { konto })

  const rozliczony = pobierzOpublikowaneSzczegoly()[0]
  assert.equal(czyStatusJestZamkniety(rozliczony.status), true)
  assert.equal(czyMoznaUtworzycAktualizacje(rozliczony.status), false)
  assert.equal(utworzKopieRoboczaZOpublikowanychSzczegolow(rozliczony, konto), null)
})
