import type {
  DaneListyObecnosciZIntegracji,
  KorektyReczneListyObecnosci,
} from '../../../../wspolne/integracje/szczegolyDoDokumentow'

export type OrganizatorListyObecnosci = 'SEMPER' | 'IIST'
export type TrybListyObecnosci = 'WYPELNIONA' | 'PUSTA'

export type UczestnikListyObecnosci = {
  id: string
  imieINazwisko: string
}

export type DaneListyObecnosci = {
  wersjaSchematu: 1
  tytulSzkolenia: string
  miejsce: string
  daty: string[]
  organizator: OrganizatorListyObecnosci
  trybListy: TrybListyObecnosci
  liczbaPustychWierszy: number
  uczestnicy: UczestnikListyObecnosci[]
}

const maksymalnaLiczbaDni = 5

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
  return typeof wartosc === 'string' && wartosc.toUpperCase().includes('PUST') ? 'PUSTA' : 'WYPELNIONA'
}

function normalizujLiczbePustychWierszy(wartosc: unknown) {
  const liczba = typeof wartosc === 'number' ? wartosc : Number(wartosc)
  return Number.isFinite(liczba) ? Math.min(Math.max(Math.round(liczba), 1), 200) : 20
}

function normalizujDaty(wartosc: unknown) {
  if (!Array.isArray(wartosc)) return []

  return [...new Set(wartosc.filter((data): data is string => typeof data === 'string' && data.trim() !== ''))]
    .slice(0, maksymalnaLiczbaDni)
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

    return [{
      id: pobierzTekst(uczestnik, 'id') || `uczestnik-${indeks + 1}`,
      imieINazwisko,
    }]
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
  if (Number.isNaN(poczatek.getTime()) || Number.isNaN(koniec.getTime()) || poczatek > koniec) {
    return normalizujDaty([dataOd, dataDo])
  }

  const daty: string[] = []
  for (const data = new Date(poczatek); data <= koniec && daty.length < maksymalnaLiczbaDni; data.setUTCDate(data.getUTCDate() + 1)) {
    daty.push(data.toISOString().slice(0, 10))
  }
  return daty
}

function odczytajUczestnikowLegacy(tekst: string) {
  const wiersze = tekst.split(/\r?\n/)
  const indeksSekcji = wiersze.findIndex((wiersz) => wiersz.trim().toLocaleLowerCase('pl').startsWith('uczestnicy'))
  if (indeksSekcji < 0) return []

  return normalizujUczestnikow(wiersze.slice(indeksSekcji + 1).map((wiersz) => wiersz.trim()).filter(Boolean))
}

function pobierzMiejsce(dane: DaneListyObecnosciZIntegracji) {
  const lokalizacja = dane.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.adres || pozycja.trybOnline)
  return lokalizacja?.nazwa ?? lokalizacja?.adres ?? (lokalizacja?.trybOnline ? 'Online' : '')
}

export function utworzDomyslneDaneListyObecnosci(): DaneListyObecnosci {
  return {
    wersjaSchematu: 1,
    tytulSzkolenia: 'Skuteczna komunikacja w zespole',
    miejsce: '',
    daty: [],
    organizator: 'SEMPER',
    trybListy: 'WYPELNIONA',
    liczbaPustychWierszy: 20,
    uczestnicy: [
      { id: 'uczestnik-1', imieINazwisko: 'Anna Kowalska' },
      { id: 'uczestnik-2', imieINazwisko: 'Piotr Nowak' },
      { id: 'uczestnik-3', imieINazwisko: 'Maria Zielińska' },
    ],
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

    return {
      wersjaSchematu: 1,
      tytulSzkolenia: pobierzTekst(dane, 'tytulSzkolenia', daneDomyslne.tytulSzkolenia),
      miejsce: pobierzTekst(dane, 'miejsce'),
      daty: normalizujDaty(dane.daty),
      organizator: normalizujOrganizatora(dane.organizator),
      trybListy: normalizujTrybListy(dane.trybListy),
      liczbaPustychWierszy: normalizujLiczbePustychWierszy(dane.liczbaPustychWierszy),
      uczestnicy: normalizujUczestnikow(dane.uczestnicy),
    }
  } catch {
    const dataOd = odczytajPoleLegacy(tekst, 'Data od')
    const dataDo = odczytajPoleLegacy(tekst, 'Data do')
    return {
      ...daneDomyslne,
      tytulSzkolenia: odczytajPoleLegacy(tekst, 'Tytuł szkolenia') || daneDomyslne.tytulSzkolenia,
      miejsce: odczytajPoleLegacy(tekst, 'Miejsce'),
      daty: utworzDatyZakresu(dataOd, dataDo),
      organizator: normalizujOrganizatora(odczytajPoleLegacy(tekst, 'Marka') || odczytajPoleLegacy(tekst, 'Organizator')),
      trybListy: normalizujTrybListy(odczytajPoleLegacy(tekst, 'Tryb listy')),
      uczestnicy: odczytajUczestnikowLegacy(tekst),
    }
  }
}

export function utworzDaneListyObecnosciZIntegracji(
  daneZrodlowe: DaneListyObecnosciZIntegracji,
  korektyReczne: KorektyReczneListyObecnosci,
): DaneListyObecnosci {
  const dane = { ...daneZrodlowe, ...korektyReczne }
  const uczestnicy = dane.uczestnicy.map((uczestnik, indeks) => ({
    id: uczestnik.id ?? `uczestnik-${indeks + 1}`,
    imieINazwisko: uczestnik.nazwaPelna,
  }))

  return {
    wersjaSchematu: 1,
    tytulSzkolenia: dane.tytulSzkolenia,
    miejsce: pobierzMiejsce(dane),
    daty: normalizujDaty(dane.daty),
    organizator: normalizujOrganizatora(dane.organizator.marka ?? dane.organizator.nazwa),
    trybListy: uczestnicy.length ? 'WYPELNIONA' : 'PUSTA',
    liczbaPustychWierszy: Math.max(dane.liczbaUczestnikow, 20),
    uczestnicy,
  }
}

export function podzielWierszeListyObecnosci(dane: DaneListyObecnosci, liczbaWierszyNaStronie = 28) {
  const wiersze = dane.trybListy === 'PUSTA'
    ? Array.from({ length: dane.liczbaPustychWierszy }, (_, indeks) => ({ id: `pusty-${indeks + 1}`, imieINazwisko: '' }))
    : dane.uczestnicy
  const strony: UczestnikListyObecnosci[][] = []

  for (let indeks = 0; indeks < wiersze.length; indeks += liczbaWierszyNaStronie) {
    strony.push(wiersze.slice(indeks, indeks + liczbaWierszyNaStronie))
  }

  return strony.length ? strony : [[]]
}
