import assert from 'node:assert/strict'
import test from 'node:test'
import { poczatkoweDaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { pobierzKopieRobocze, zapiszWersjeRobocza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts'
import type { DaneFormularza, WersjaRoboczaGeneratora } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

test('nowy formularz szczegółów organizacyjnych ma ustalone wartości domyślne', () => {
  const { dokumentacja, dodatkoweWymogi } = poczatkoweDaneFormularza

  assert.deepEqual(
    {
      listaObecnosci: dokumentacja.listaObecnosci,
      ankiety: dokumentacja.ankiety,
      certyfikaty: dokumentacja.certyfikaty,
      program: dokumentacja.program,
      kartaInformacyjna: dokumentacja.kartaInformacyjna,
      podreczniki: dokumentacja.podreczniki,
      materialyDodatkowe: dokumentacja.materialyDodatkowe,
      projektTesty: dokumentacja.projektTesty,
      dostepnoscCyfrowa: dokumentacja.dostepnoscCyfrowa,
      logotypy: dokumentacja.logotypy,
      plusJedenEgzemplarz: dokumentacja.plusJedenEgzemplarz,
      wczesniejszyPrzyjazdTrenera: dodatkoweWymogi.wczesniejszyPrzyjazdTrenera,
      minutyWczesniej: dodatkoweWymogi.minutyWczesniej,
      dokumentacjaZdjęciowa: dodatkoweWymogi.dokumentacjaZdjęciowa,
      karyWHarmonogramie: dodatkoweWymogi.karyWHarmonogramie,
      noweSzkolenieZaOcene: dodatkoweWymogi.noweSzkolenieZaOcene,
      kfs: dodatkoweWymogi.kfs,
    },
    {
      listaObecnosci: true,
      ankiety: true,
      certyfikaty: true,
      program: true,
      kartaInformacyjna: false,
      podreczniki: false,
      materialyDodatkowe: false,
      projektTesty: false,
      dostepnoscCyfrowa: false,
      logotypy: 'Nie',
      plusJedenEgzemplarz: false,
      wczesniejszyPrzyjazdTrenera: true,
      minutyWczesniej: 20,
      dokumentacjaZdjęciowa: false,
      karyWHarmonogramie: false,
      noweSzkolenieZaOcene: false,
      kfs: false,
    },
  )

  assert.deepEqual(dokumentacja.wzoryKlienta, Object.fromEntries(Object.keys(dokumentacja.wzoryKlienta).map((klucz) => [klucz, false])))
  assert.deepEqual(dodatkoweWymogi.wzoryKlienta, Object.fromEntries(Object.keys(dodatkoweWymogi.wzoryKlienta).map((klucz) => [klucz, false])))
})

test('wczytana kopia robocza zachowuje zapisane wartości zamiast nowych domyślnych', () => {
  magazyn.clear()
  const dane = structuredClone(poczatkoweDaneFormularza) as DaneFormularza
  dane.dokumentacja.listaObecnosci = false
  dane.dokumentacja.kartaInformacyjna = true
  dane.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera = false
  dane.dodatkoweWymogi.minutyWczesniej = 45
  const wersja: WersjaRoboczaGeneratora = {
    id: 'kopia-zapisana',
    dokumentId: 'dokument-zapisany',
    wersja: 'test',
    etykietaWersji: 'testowa',
    nazwa: 'Zapisana kopia',
    dataZapisu: '2026-07-16T00:00:00.000Z',
    autorId: 'autor',
    autorNazwa: 'Autor',
    dane,
    grupy: [],
    adresaci: { reczniAdresaci: '', trybTresci: 'Tylko zmiany', czyPodpis: true, wiadomoscWlasna: '' },
    statusyPol: {},
  }

  zapiszWersjeRobocza(wersja)

  const [wczytana] = pobierzKopieRobocze()

  assert.equal(wczytana.dane.dokumentacja.listaObecnosci, false)
  assert.equal(wczytana.dane.dokumentacja.kartaInformacyjna, true)
  assert.equal(wczytana.dane.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera, false)
  assert.equal(wczytana.dane.dodatkoweWymogi.minutyWczesniej, 45)
})
