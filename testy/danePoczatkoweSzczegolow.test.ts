import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { poczatkoweDaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import {
  pobierzAktualnaWersjeRobocza,
  pobierzAutosaveSzczegolow,
  pobierzKopieRobocze,
  rozpocznijNoweSzczegolyOrganizacyjne,
  usunAutosaveSzczegolow,
  ustawAktualnaWersjeRobocza,
  zapiszAutosaveSzczegolow,
  zapiszWersjeRobocza,
} from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts'
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

test('nowe Szczegóły zaczynają od pustego formularza i pozostawiają autosave do jawnej decyzji', () => {
  magazyn.clear()
  const dane = structuredClone(poczatkoweDaneFormularza) as DaneFormularza
  dane.tytulSzkolenia = 'Dane z poprzedniej sesji'
  const wersja: WersjaRoboczaGeneratora = {
    id: 'poprzednia-kopia',
    dokumentId: 'poprzednia-kopia',
    wersja: 'test',
    etykietaWersji: 'testowa',
    nazwa: 'Poprzednia kopia',
    dataZapisu: '2026-09-10T08:00:00.000Z',
    autorId: 'autor',
    autorNazwa: 'Autor',
    dane,
    grupy: [],
    adresaci: { reczniAdresaci: '', trybTresci: 'Tylko zmiany', czyPodpis: true, wiadomoscWlasna: '' },
    statusyPol: {},
  }
  ustawAktualnaWersjeRobocza(wersja)
  zapiszAutosaveSzczegolow({
    id: 'autosave-1',
    dataZapisu: '2026-09-10T09:00:00.000Z',
    dane,
    grupy: [],
    adresaci: wersja.adresaci,
    statusyPol: {},
    aktywnaKopiaId: wersja.id,
  })

  rozpocznijNoweSzczegolyOrganizacyjne()

  assert.equal(pobierzAktualnaWersjeRobocza(), null)
  assert.equal(pobierzAutosaveSzczegolow()?.dane.tytulSzkolenia, 'Dane z poprzedniej sesji')
  assert.equal(poczatkoweDaneFormularza.tytulSzkolenia, '')

  usunAutosaveSzczegolow()
  assert.equal(pobierzAutosaveSzczegolow(), null)
})

test('banner kopii roboczej ma trwałe, jawne akcje przywrócenia i odrzucenia', () => {
  const widok = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx', import.meta.url), 'utf8')
  const hook = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts', import.meta.url), 'utf8')
  assert.match(widok, /Znaleziono niezapisaną kopię roboczą\./)
  assert.match(widok, /Przywróć kopię/)
  assert.match(widok, /onClick=\{generator\.przywrocAutosave\}/)
  assert.match(widok, /Odrzuć kopię/)
  assert.match(widok, /onClick=\{generator\.odrzucAutosave\}/)
  assert.doesNotMatch(widok, /toast/i)
  assert.match(hook, /czyPominacNastepnyAutosave = useRef\(true\)/)
  assert.match(hook, /function odrzucAutosave\(\)[\s\S]*czyPominacNastepnyAutosave\.current = true[\s\S]*usunAutosaveSzczegolow\(\)/)
})
