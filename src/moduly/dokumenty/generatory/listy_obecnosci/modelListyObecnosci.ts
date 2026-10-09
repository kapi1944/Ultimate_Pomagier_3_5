import { domyslnyWygladTabeliListy, normalizujWygladTabeliListy, type WygladTabeliListy } from './wygladTabeliListy'
import type { DaneListyObecnosciZIntegracji, KorektyReczneListyObecnosci } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import { WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW, normalizujBlokiSwobodneDokumentu, type BlokSwobodnyDokumentu } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'

export type OrganizatorListyObecnosci = 'SEMPER' | 'IIST'
export type TrybListyObecnosci = 'WYPELNIONA' | 'WKLEJONA' | 'PUSTA'
export type WariantWielodniowyListyObecnosci = 'KOLUMNY_PODPISOW' | 'OSOBNE_STRONY'
export type KolumnaListyObecnosci = 'LP' | 'IMIE_I_NAZWISKO' | 'FIRMA' | 'PODPIS'

export type UczestnikListyObecnosci = {
  id: string
  imieINazwisko: string
  firma?: string
  czyReczny?: boolean
}

export type DaneListyObecnosci = {
  wersjaSchematu: 2
  wygladTabeli: WygladTabeliListy
  odstepPodTerminemMm?: number
  szczegolyId?: string
  grupaId?: string
  trener?: string
  tytulSzkolenia: string
  miejsce: string
  daty: string[]
  organizator: OrganizatorListyObecnosci
  trybListy: TrybListyObecnosci
  liczbaPustychWierszy: number
  uczestnicyTekst: string
  uczestnicy: UczestnikListyObecnosci[]
  kolumny: KolumnaListyObecnosci[]
  wariantWielodniowy: WariantWielodniowyListyObecnosci
  czyPokazacPodpisTrenera: boolean
  czyPokazacPodpisOrganizatora: boolean
  blokiSwobodne: BlokSwobodnyDokumentu[]
  wersjaSchematuBlokow: typeof WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW
}

export type RozniceUczestnikowListyObecnosci = {
  nowi: UczestnikListyObecnosci[]
  usunieci: UczestnikListyObecnosci[]
  zmienieni: Array<{ obecny: UczestnikListyObecnosci; zrodlowy: UczestnikListyObecnosci }>
}

export type DzienKalendarzaListyObecnosci = {
  iso: string
  dzien: number
  wMiesiacu: boolean
  weekend: boolean
}

const maksymalnaLiczbaDni = 31
const domyslneKolumny: KolumnaListyObecnosci[] = ['LP', 'IMIE_I_NAZWISKO', 'PODPIS']

export const etykietyKolumnListyObecnosci: Record<KolumnaListyObecnosci, string> = {
  LP: 'Lp.', IMIE_I_NAZWISKO: 'Imię i nazwisko', FIRMA: 'Firma', PODPIS: 'Podpis',
}

export const etykietyWariantowWielodniowych: Record<WariantWielodniowyListyObecnosci, string> = {
  KOLUMNY_PODPISOW: 'Jedna lista z kolumnami podpisów', OSOBNE_STRONY: 'Osobna lista dla każdego dnia',
}

export function zaproponujWariantWielodniowyListyObecnosci(daty: string[]): WariantWielodniowyListyObecnosci {
  return daty.filter(Boolean).length > 3 ? 'OSOBNE_STRONY' : 'KOLUMNY_PODPISOW'
}

export function pobierzDniKalendarzaListyObecnosci(miesiacKalendarza: string): DzienKalendarzaListyObecnosci[] {
  const [rok, miesiac] = miesiacKalendarza.split('-').map(Number)
  if (!Number.isInteger(rok) || !Number.isInteger(miesiac) || miesiac < 1 || miesiac > 12) return []
  const pierwszyDzien = new Date(rok, miesiac - 1, 1)
  const przesuniecieStartu = (pierwszyDzien.getDay() + 6) % 7
  const start = new Date(rok, miesiac - 1, 1 - przesuniecieStartu)
  return Array.from({ length: 42 }, (_, indeks) => {
    const data = new Date(start)
    data.setDate(start.getDate() + indeks)
    return {
      iso: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`,
      dzien: data.getDate(),
      wMiesiacu: data.getMonth() === miesiac - 1,
      weekend: data.getDay() === 0 || data.getDay() === 6,
    }
  })
}

export function utworzBlokiSzablonuListyObecnosci(): BlokSwobodnyDokumentu[] {
  const podstawa = (id: string, nazwa: string, xMm: number, yMm: number, szerokoscMm: number, wysokoscMm: number) => ({ id, nazwa, rola: 'element_staly_szablonu' as const, pochodzenie: 'szablon' as const, zablokowany: false, xMm, yMm, szerokoscMm, wysokoscMm, przypisanieDoStrony: { rodzaj: 'pierwsza' as const }, widoczny: true, indeksWarstwy: 8 })
  return [
    { ...podstawa('lista-logo', 'Logo organizatora', 10, 8, 42, 20), rola: 'logo' as const, typ: 'obraz' as const, dane: { zrodlo: { rodzaj: 'zasob_organizatora' as const, klucz: 'logo_organizatora' }, tekstAlternatywny: 'Logo organizatora', zachowajProporcje: true, trybDopasowania: 'contain' as const } },
    { ...podstawa('lista-tytul', 'Tytuł dokumentu', 48, 22, 114, 12), typ: 'tekst' as const, dane: { zrodlo: { rodzaj: 'statyczne' as const, tekst: 'Lista obecności' }, rozmiarCzcionkiPt: 15, gruboscCzcionki: 700 as const, rodzinaCzcionki: 'Arial', wyrownanie: 'srodek' as const, interlinia: 1.1, podkreslenie: true, marginesWewnetrznyMm: 1 } },
    { ...podstawa('lista-szkolenie', 'Tytuł szkolenia', 25, 38, 160, 14), typ: 'tekst' as const, dane: { zrodlo: { rodzaj: 'pole_danych' as const, sciezka: 'tytulSzkolenia', tekstZastepczy: 'Tytuł szkolenia' }, rozmiarCzcionkiPt: 15, gruboscCzcionki: 700 as const, rodzinaCzcionki: 'Arial', wyrownanie: 'srodek' as const, interlinia: 1.1, kolor: '#c80000', marginesWewnetrznyMm: 1 } },
    { ...podstawa('lista-miejsce', 'Miejsce i termin', 25, 52, 160, 12), typ: 'tekst' as const, dane: { zrodlo: { rodzaj: 'pole_danych' as const, sciezka: 'miejsceITermin', tekstZastepczy: 'Miejsce i termin' }, rozmiarCzcionkiPt: 12, gruboscCzcionki: 400 as const, rodzinaCzcionki: 'Arial', wyrownanie: 'srodek' as const, interlinia: 1.1, marginesWewnetrznyMm: 1 } },
  ]
}

export function zmienWygladTytuluListy(dane: DaneListyObecnosci, pole: 'rozmiarCzcionkiPt' | 'marginesMm' | 'szerokoscMm', wartosc: number): DaneListyObecnosci {
  if (!Number.isFinite(wartosc)) return dane
  return { ...dane, blokiSwobodne: dane.blokiSwobodne.map((blok) => {
    if (blok.id !== 'lista-szkolenie' || blok.typ !== 'tekst') return blok
    if (pole === 'rozmiarCzcionkiPt') return { ...blok, dane: { ...blok.dane, rozmiarCzcionkiPt: Math.min(20, Math.max(8, wartosc)) } }
    const marginesMm = pole === 'szerokoscMm' ? (210 - Math.min(200, Math.max(100, wartosc))) / 2 : Math.min(55, Math.max(5, wartosc))
    return { ...blok, xMm: marginesMm, szerokoscMm: 210 - 2 * marginesMm }
  }) }
}

export function zmienOdstepyBlokuListy(dane: DaneListyObecnosci, id: string, pole: 'wysokoscMm' | 'marginesWewnetrznyMm' | 'rozmiarCzcionkiPt', wartosc: number): DaneListyObecnosci {
  if (!Number.isFinite(wartosc) || !['lista-szkolenie', 'lista-miejsce', 'lista-tytul'].includes(id)) return dane
  return { ...dane, blokiSwobodne: dane.blokiSwobodne.map((blok) => {
    if (blok.id !== id || blok.typ !== 'tekst') return blok
    if (pole === 'rozmiarCzcionkiPt') return { ...blok, dane: { ...blok.dane, rozmiarCzcionkiPt: Math.min(20, Math.max(8, wartosc)) } }
    if (pole === 'wysokoscMm') return { ...blok, wysokoscMm: Math.min(30, Math.max(4, wartosc)) }
    return { ...blok, dane: { ...blok.dane, marginesWewnetrznyMm: Math.min(5, Math.max(0, wartosc)) } }
  }) }
}

function czyRekord(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc) && typeof wartosc === 'object' && !Array.isArray(wartosc)
}

function pobierzTekst(rekord: Record<string, unknown>, klucz: string, wartoscDomyslna = '') {
  return typeof rekord[klucz] === 'string' ? rekord[klucz] : wartoscDomyslna
}

function normalizujOrganizatora(wartosc: unknown): OrganizatorListyObecnosci {
  return typeof wartosc === 'string' && wartosc.toUpperCase().includes('IIST') ? 'IIST' : 'SEMPER'
}

function normalizujTrybListy(wartosc: unknown): TrybListyObecnosci {
  if (wartosc === 'WKLEJONA') return 'WKLEJONA'
  return typeof wartosc === 'string' && wartosc.toUpperCase().includes('PUST') ? 'PUSTA' : 'WYPELNIONA'
}

function normalizujWariantWielodniowy(wartosc: unknown, daty: string[]): WariantWielodniowyListyObecnosci {
  if (wartosc === 'OSOBNE_STRONY') return 'OSOBNE_STRONY'
  if (wartosc === 'KOLUMNY_PODPISOW') return 'KOLUMNY_PODPISOW'
  return zaproponujWariantWielodniowyListyObecnosci(daty)
}

function normalizujLiczbePustychWierszy(wartosc: unknown) {
  const liczba = typeof wartosc === 'number' ? wartosc : Number(wartosc)
  return Number.isFinite(liczba) ? Math.min(Math.max(Math.round(liczba), 1), 200) : 20
}

function normalizujDaty(wartosc: unknown) {
  if (!Array.isArray(wartosc)) return []
  return [...new Set(wartosc.filter((data): data is string => typeof data === 'string' && data.trim() !== ''))].slice(0, maksymalnaLiczbaDni)
}

function normalizujKolumny(wartosc: unknown): KolumnaListyObecnosci[] {
  if (!Array.isArray(wartosc)) return [...domyslneKolumny]
  const dozwolone: KolumnaListyObecnosci[] = ['LP', 'IMIE_I_NAZWISKO', 'FIRMA', 'PODPIS']
  const kolumny = wartosc.filter((kolumna): kolumna is KolumnaListyObecnosci => typeof kolumna === 'string' && dozwolone.includes(kolumna as KolumnaListyObecnosci))
  return kolumny.length ? dozwolone.filter((kolumna) => kolumny.includes(kolumna)) : [...domyslneKolumny]
}

function normalizujUczestnikow(wartosc: unknown) {
  if (!Array.isArray(wartosc)) return []
  return wartosc.flatMap((uczestnik, indeks): UczestnikListyObecnosci[] => {
    if (typeof uczestnik === 'string') {
      const imieINazwisko = uczestnik.trim()
      return imieINazwisko ? [{ id: `uczestnik-${indeks + 1}`, imieINazwisko }] : []
    }
    if (!czyRekord(uczestnik)) return []
    const imieINazwisko = pobierzTekst(uczestnik, 'imieINazwisko', pobierzTekst(uczestnik, 'nazwaPelna')).trim()
    if (!imieINazwisko) return []
    const firma = pobierzTekst(uczestnik, 'firma').trim()
    return [{ id: pobierzTekst(uczestnik, 'id') || `uczestnik-${indeks + 1}`, imieINazwisko, ...(firma ? { firma } : {}), ...(uczestnik.czyReczny === true ? { czyReczny: true } : {}) }]
  })
}

export function utworzUczestnikowZWklejonegoTekstu(tekst: string): UczestnikListyObecnosci[] {
  return tekst.split(/\r?\n/).flatMap((wiersz, indeks): UczestnikListyObecnosci[] => {
    const imieINazwisko = wiersz.split('\t').map((kolumna) => kolumna.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    return imieINazwisko ? [{ id: `wklejony-${indeks + 1}`, imieINazwisko, czyReczny: true }] : []
  })
}

function odczytajPoleLegacy(tekst: string, etykieta: string) {
  const wiersz = tekst.split(/\r?\n/).find((linia) => linia.toLocaleLowerCase('pl').startsWith(`${etykieta.toLocaleLowerCase('pl')}:`))
  return wiersz?.split(':').slice(1).join(':').trim() ?? ''
}

function utworzDatyZakresu(dataOd: string, dataDo: string) {
  if (!dataOd && !dataDo) return []
  if (!dataOd || !dataDo || dataOd === dataDo) return [dataOd || dataDo]
  const poczatek = new Date(`${dataOd}T00:00:00Z`)
  const koniec = new Date(`${dataDo}T00:00:00Z`)
  if (Number.isNaN(poczatek.getTime()) || Number.isNaN(koniec.getTime()) || poczatek > koniec) return normalizujDaty([dataOd, dataDo])
  const daty: string[] = []
  for (const data = new Date(poczatek); data <= koniec && daty.length < maksymalnaLiczbaDni; data.setUTCDate(data.getUTCDate() + 1)) daty.push(data.toISOString().slice(0, 10))
  return daty
}

function odczytajUczestnikowLegacy(tekst: string) {
  const wiersze = tekst.split(/\r?\n/)
  const indeksSekcji = wiersze.findIndex((wiersz) => wiersz.trim().toLocaleLowerCase('pl').startsWith('uczestnicy'))
  return indeksSekcji < 0 ? [] : normalizujUczestnikow(wiersze.slice(indeksSekcji + 1).map((wiersz) => wiersz.trim()).filter(Boolean))
}

function pobierzMiejsce(dane: DaneListyObecnosciZIntegracji) {
  const lokalizacja = dane.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.adres || pozycja.trybOnline)
  return lokalizacja?.nazwa ?? lokalizacja?.adres ?? (lokalizacja?.trybOnline ? 'Online' : '')
}

export function utworzDomyslneDaneListyObecnosci(): DaneListyObecnosci {
  return {
    wersjaSchematu: 2,
    wygladTabeli: { ...domyslnyWygladTabeliListy },
    tytulSzkolenia: '',
    miejsce: '',
    daty: [],
    organizator: 'SEMPER',
    trybListy: 'WYPELNIONA',
    liczbaPustychWierszy: 20,
    uczestnicyTekst: '',
    uczestnicy: [],
    kolumny: [...domyslneKolumny],
    wariantWielodniowy: 'KOLUMNY_PODPISOW',
    czyPokazacPodpisTrenera: false,
    czyPokazacPodpisOrganizatora: false,
    blokiSwobodne: utworzBlokiSzablonuListyObecnosci(),
    wersjaSchematuBlokow: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW,
  }
}

export function serializujDaneListyObecnosci(dane: DaneListyObecnosci) {
  return JSON.stringify(dane)
}

export function deserializujDaneListyObecnosci(tekst: string | null): DaneListyObecnosci {
  const daneDomyslne = utworzDomyslneDaneListyObecnosci()
  if (!tekst?.trim()) return daneDomyslne
  try {
    const dane = JSON.parse(tekst) as unknown
    if (!czyRekord(dane)) throw new Error('Nieprawidłowy zapis Listy obecności.')
    const daty = normalizujDaty(dane.daty)
    const bloki = normalizujBlokiSwobodneDokumentu(dane.blokiSwobodne)
    return {
      wersjaSchematu: 2,
      wygladTabeli: normalizujWygladTabeliListy(dane.wygladTabeli),
      ...(typeof dane.odstepPodTerminemMm === 'number' && Number.isFinite(dane.odstepPodTerminemMm)
        ? { odstepPodTerminemMm: Math.min(30, Math.max(0, dane.odstepPodTerminemMm)) } : {}),
      szczegolyId: pobierzTekst(dane, 'szczegolyId'),
      grupaId: pobierzTekst(dane, 'grupaId'),
      trener: pobierzTekst(dane, 'trener'),
      tytulSzkolenia: pobierzTekst(dane, 'tytulSzkolenia', daneDomyslne.tytulSzkolenia),
      miejsce: pobierzTekst(dane, 'miejsce'),
      daty,
      organizator: normalizujOrganizatora(dane.organizator),
      trybListy: normalizujTrybListy(dane.trybListy),
      liczbaPustychWierszy: normalizujLiczbePustychWierszy(dane.liczbaPustychWierszy),
      uczestnicyTekst: pobierzTekst(dane, 'uczestnicyTekst'),
      uczestnicy: normalizujUczestnikow(dane.uczestnicy),
      kolumny: normalizujKolumny(dane.kolumny),
      wariantWielodniowy: normalizujWariantWielodniowy(dane.wariantWielodniowy, daty),
      czyPokazacPodpisTrenera: dane.czyPokazacPodpisTrenera === true,
      czyPokazacPodpisOrganizatora: dane.czyPokazacPodpisOrganizatora === true,
      blokiSwobodne: Array.isArray(dane.blokiSwobodne) ? bloki : daneDomyslne.blokiSwobodne,
      wersjaSchematuBlokow: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW,
    }
  } catch {
    const dataOd = odczytajPoleLegacy(tekst, 'Data od')
    const dataDo = odczytajPoleLegacy(tekst, 'Data do')
    const daty = utworzDatyZakresu(dataOd, dataDo)
    return { ...daneDomyslne, tytulSzkolenia: odczytajPoleLegacy(tekst, 'Tytuł szkolenia') || daneDomyslne.tytulSzkolenia, miejsce: odczytajPoleLegacy(tekst, 'Miejsce'), daty, organizator: normalizujOrganizatora(odczytajPoleLegacy(tekst, 'Marka') || odczytajPoleLegacy(tekst, 'Organizator')), trybListy: normalizujTrybListy(odczytajPoleLegacy(tekst, 'Tryb listy')), uczestnicy: odczytajUczestnikowLegacy(tekst), wariantWielodniowy: zaproponujWariantWielodniowyListyObecnosci(daty) }
  }
}

export function utworzDaneListyObecnosciZIntegracji(daneZrodlowe: DaneListyObecnosciZIntegracji, korektyReczne: KorektyReczneListyObecnosci): DaneListyObecnosci {
  const dane = { ...daneZrodlowe, ...korektyReczne }
  const uczestnicy = dane.uczestnicy.map((uczestnik, indeks) => ({ id: uczestnik.id ?? `uczestnik-${indeks + 1}`, imieINazwisko: uczestnik.nazwaPelna }))
  const daty = normalizujDaty(dane.daty)
  return { wersjaSchematu: 2, wygladTabeli: { ...domyslnyWygladTabeliListy }, trener: dane.trenerzy.map((trener) => trener.imieINazwisko).join(', '), szczegolyId: dane.daneZrodlowe.szczegolyOrganizacyjneId, tytulSzkolenia: dane.tytulSzkolenia, miejsce: pobierzMiejsce(dane), daty, organizator: normalizujOrganizatora(dane.organizator.marka ?? dane.organizator.nazwa), trybListy: 'WYPELNIONA', liczbaPustychWierszy: Math.max(dane.liczbaUczestnikow, 20), uczestnicyTekst: '', uczestnicy, kolumny: [...domyslneKolumny], wariantWielodniowy: zaproponujWariantWielodniowyListyObecnosci(daty), czyPokazacPodpisTrenera: false, czyPokazacPodpisOrganizatora: false, blokiSwobodne: utworzBlokiSzablonuListyObecnosci(), wersjaSchematuBlokow: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW }
}

export function pobierzLiczbeWierszyNaStronieListyObecnosci(dane: DaneListyObecnosci) {
  const dotychczasowyLimit = dane.czyPokazacPodpisTrenera || dane.czyPokazacPodpisOrganizatora ? 24 : 28
  const wyglad = normalizujWygladTabeliListy(dane.wygladTabeli)
  const rezerwaNaglowkaMm = Math.max(0, wyglad.rozmiarNaglowkowPt - domyslnyWygladTabeliListy.rozmiarNaglowkowPt) * 25.4 / 72 * 1.15 * 2
  return Math.max(1, Math.floor((dotychczasowyLimit * domyslnyWygladTabeliListy.wysokoscWierszaMm - rezerwaNaglowkaMm - Math.max(0, pobierzWysokoscNaglowkaListy(dane) - 60.8)) / wyglad.wysokoscWierszaMm + 1e-9))
}

export function pobierzWierszeListyObecnosci(dane: DaneListyObecnosci): UczestnikListyObecnosci[] {
  return dane.trybListy === 'PUSTA'
    ? Array.from({ length: dane.liczbaPustychWierszy }, (_, indeks) => ({ id: `pusty-${indeks + 1}`, imieINazwisko: '' }))
    : dane.uczestnicy
}

export function podzielWierszeListyObecnosci(dane: DaneListyObecnosci, liczbaWierszyNaStronie = 28) {
  const wiersze = pobierzWierszeListyObecnosci(dane)
  const strony: UczestnikListyObecnosci[][] = []
  const limit = Math.max(1, Math.floor(liczbaWierszyNaStronie))
  let koszt = 0
  for (const uczestnik of wiersze) {
    const skalaFontu = normalizujWygladTabeliListy(dane.wygladTabeli).rozmiarTekstuPt / domyslnyWygladTabeliListy.rozmiarTekstuPt
    const szerokoscTekstu = (dane.kolumny.includes('FIRMA') ? 23 : 48) / skalaFontu
    const kosztWiersza = Math.max(1, Math.ceil(uczestnik.imieINazwisko.length / szerokoscTekstu), dane.kolumny.includes('FIRMA') ? Math.ceil((uczestnik.firma?.length ?? 0) / (23 / skalaFontu)) : 1)
    if (!strony.length || (koszt + kosztWiersza > limit && strony.at(-1)!.length)) { strony.push([]); koszt = 0 }
    strony.at(-1)!.push(uczestnik)
    koszt += kosztWiersza
  }
  return strony.length ? strony : [[]]
}

export function podzielListeObecnosciNaStrony(dane: DaneListyObecnosci) {
  const liczbaWierszy = pobierzLiczbeWierszyNaStronieListyObecnosci(dane)
  const strony = podzielWierszeListyObecnosci(dane, liczbaWierszy)
  const grupyDat = dane.wariantWielodniowy === 'OSOBNE_STRONY' ? dane.daty.map((data) => [data]) : Array.from({ length: Math.ceil(dane.daty.length / 3) }, (_, indeks) => dane.daty.slice(indeks * 3, indeks * 3 + 3))
  return (grupyDat.length ? grupyDat : [[]]).flatMap((datyPodpisow) => {
    let indeksPierwszegoWiersza = 0
    return strony.map((uczestnicy) => {
      const strona = { uczestnicy, indeksPierwszegoWiersza, datyPodpisow, dataPodpisu: dane.wariantWielodniowy === 'OSOBNE_STRONY' ? datyPodpisow[0] ?? null : null }
      indeksPierwszegoWiersza += uczestnicy.length
      return strona
    })
  })
}

export function porownajUczestnikowListyObecnosci(obecni: UczestnikListyObecnosci[], zrodlowi: UczestnikListyObecnosci[]): RozniceUczestnikowListyObecnosci {
  const zrodlowiPoId = new Map(zrodlowi.map((uczestnik) => [uczestnik.id, uczestnik]))
  const obecniPoId = new Map(obecni.filter((uczestnik) => !uczestnik.czyReczny).map((uczestnik) => [uczestnik.id, uczestnik]))
  const nowi = zrodlowi.filter((uczestnik) => !obecniPoId.has(uczestnik.id))
  const usunieci = obecni.filter((uczestnik) => !uczestnik.czyReczny && !zrodlowiPoId.has(uczestnik.id))
  const zmienieni = obecni.flatMap((uczestnik) => {
    const zrodlowy = zrodlowiPoId.get(uczestnik.id)
    return zrodlowy && (zrodlowy.imieINazwisko !== uczestnik.imieINazwisko || zrodlowy.firma !== uczestnik.firma) ? [{ obecny: uczestnik, zrodlowy }] : []
  })
  return { nowi, usunieci, zmienieni }
}

export function zastosujSynchronizacjeUczestnikow(dane: DaneListyObecnosci, zrodlowi: UczestnikListyObecnosci[]): DaneListyObecnosci {
  const reczni = dane.uczestnicy.filter((uczestnik) => uczestnik.czyReczny)
  return { ...dane, trybListy: 'WYPELNIONA', uczestnicy: [...zrodlowi.map((uczestnik) => ({ ...uczestnik, czyReczny: false })), ...reczni] }
}

export function pobierzBladEksportuListy(dane: DaneListyObecnosci): string | null {
  if (!dane.kolumny.length) return 'Wybierz co najmniej jedną kolumnę.'
  if (dane.trybListy === 'PUSTA') return Number.isInteger(dane.liczbaPustychWierszy) && dane.liczbaPustychWierszy >= 1 && dane.liczbaPustychWierszy <= 200 ? null : 'Wybierz od 1 do 200 pustych wierszy.'
  if (!dane.uczestnicy.length) return 'Dodaj uczestników albo wybierz tryb „Pusta lista do ręcznego wypełnienia”.'
  if (dane.uczestnicy.some((uczestnik) => !uczestnik.imieINazwisko.trim())) return 'Uzupełnij imiona i nazwiska uczestników.'
  return null
}

export function pobierzOdstepPodTerminemListy(dane: DaneListyObecnosci): number {
  if (typeof dane.odstepPodTerminemMm === 'number' && Number.isFinite(dane.odstepPodTerminemMm)) return Math.min(30, Math.max(0, dane.odstepPodTerminemMm))
  const blok = dane.blokiSwobodne.find((pozycja) => pozycja.id === 'lista-miejsce')
  return Math.max(0, 70.8 - (blok ? blok.yMm + blok.wysokoscMm : 64))
}

export function pobierzWysokoscNaglowkaListy(dane: DaneListyObecnosci): number {
  // Starsze dokumenty zachowują dotychczasową pozycję tabeli do pierwszej regulacji odstępu.
  if (dane.odstepPodTerminemMm === undefined) return 60.8
  const dolNaglowka = Math.max(10, ...dane.blokiSwobodne
    .filter((blok) => blok.widoczny && ['lista-logo', 'lista-tytul', 'lista-szkolenie', 'lista-miejsce'].includes(blok.id))
    .map((blok) => blok.yMm + blok.wysokoscMm))
  return Math.max(0, dolNaglowka - 10 + pobierzOdstepPodTerminemListy(dane))
}
