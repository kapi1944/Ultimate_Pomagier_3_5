import { statusyDokumentow, typyDokumentow, walidujDokument, type Dokument } from './modelDokumentu'

export const kluczRejestruDokumentow = 'ultimatePomagier.rejestrDokumentow.v1'
export const kluczKopiiBezpieczenstwaRejestruDokumentow = 'ultimatePomagier.rejestrDokumentow.kopia-bezpieczenstwa'
export const wersjaRejestruDokumentow = 1

type StanRejestruDokumentow = {
  wersja: number
  dokumenty: Dokument<unknown, unknown>[]
}

export type ZmianyDokumentu = Partial<Omit<Dokument<unknown, unknown>, 'id' | 'utworzono' | 'zmodyfikowano'>>

export interface RepozytoriumWspolnychDokumentow {
  pobierzWszystkie(): Dokument<unknown, unknown>[]
  pobierzPoId(id: string): Dokument<unknown, unknown> | null
  utworz<TDane, TUstawienia>(dokument: Dokument<TDane, TUstawienia>): Dokument<TDane, TUstawienia>
  aktualizuj(id: string, zmiany: ZmianyDokumentu): Dokument<unknown, unknown> | null
  archiwizuj(id: string): Dokument<unknown, unknown> | null
  przywroc(id: string): Dokument<unknown, unknown> | null
  usunMiekko(id: string): Dokument<unknown, unknown> | null
}

type MigracjaRejestruDokumentow = {
  wersjaZrodlowa: number
  wersjaDocelowa: number
  wykonaj: (stan: unknown) => StanRejestruDokumentow
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function czyNalezyDo<Typ extends string>(wartosc: unknown, wartosci: readonly Typ[]): wartosc is Typ {
  return typeof wartosc === 'string' && wartosci.includes(wartosc as Typ)
}

function czyTekstLubNull(wartosc: unknown): wartosc is string | null {
  return wartosc === null || typeof wartosc === 'string'
}

function czyDataLubNull(wartosc: unknown): wartosc is string | null {
  return wartosc === null || (typeof wartosc === 'string' && !Number.isNaN(Date.parse(wartosc)))
}

function bezpiecznieParsuj(wartosc: string | null): unknown {
  if (!wartosc) {
    return null
  }

  try {
    return JSON.parse(wartosc) as unknown
  } catch {
    return null
  }
}

function normalizujDokument(wartosc: unknown): Dokument<unknown, unknown> | null {
  if (!czyObiekt(wartosc)) {
    return null
  }

  const dokument: Dokument<unknown, unknown> = {
    id: typeof wartosc.id === 'string' ? wartosc.id : '',
    typ: czyNalezyDo(wartosc.typ, typyDokumentow) ? wartosc.typ : 'INNY',
    tytul: typeof wartosc.tytul === 'string' ? wartosc.tytul : '',
    status: czyNalezyDo(wartosc.status, statusyDokumentow) ? wartosc.status : 'ROBOCZY',
    wersja: typeof wartosc.wersja === 'number' ? wartosc.wersja : 0,
    wersjaSchematu: typeof wartosc.wersjaSchematu === 'number' ? wartosc.wersjaSchematu : 0,
    daneDokumentu: wartosc.daneDokumentu,
    ustawieniaDokumentu: wartosc.ustawieniaDokumentu,
    generatorId: typeof wartosc.generatorId === 'string' ? wartosc.generatorId : '',
    szkolenieId: czyTekstLubNull(wartosc.szkolenieId) ? wartosc.szkolenieId : null,
    klientId: czyTekstLubNull(wartosc.klientId) ? wartosc.klientId : null,
    organizatorId: czyTekstLubNull(wartosc.organizatorId) ? wartosc.organizatorId : null,
    dokumentNadrzednyId: czyTekstLubNull(wartosc.dokumentNadrzednyId) ? wartosc.dokumentNadrzednyId : null,
    poprzedniaWersjaId: czyTekstLubNull(wartosc.poprzedniaWersjaId) ? wartosc.poprzedniaWersjaId : null,
    utworzono: typeof wartosc.utworzono === 'string' ? wartosc.utworzono : '',
    zmodyfikowano: typeof wartosc.zmodyfikowano === 'string' ? wartosc.zmodyfikowano : '',
    opublikowano: czyDataLubNull(wartosc.opublikowano) ? wartosc.opublikowano : null,
    autorId: czyTekstLubNull(wartosc.autorId) ? wartosc.autorId : null,
    wlascicielId: czyTekstLubNull(wartosc.wlascicielId) ? wartosc.wlascicielId : null,
    ostatnioModyfikujacyId: czyTekstLubNull(wartosc.ostatnioModyfikujacyId) ? wartosc.ostatnioModyfikujacyId : null,
    czyZarchiwizowany: wartosc.czyZarchiwizowany === true,
    zarchiwizowano: czyDataLubNull(wartosc.zarchiwizowano) ? wartosc.zarchiwizowano : null,
    czyUsunietyMiekko: wartosc.czyUsunietyMiekko === true,
    usunieto: czyDataLubNull(wartosc.usunieto) ? wartosc.usunieto : null,
  }

  return walidujDokument(dokument).czyPoprawny ? dokument : null
}

function migrujWersjeZero(stan: unknown): StanRejestruDokumentow {
  const zrodloDokumentow = Array.isArray(stan) ? stan : czyObiekt(stan) && Array.isArray(stan.dokumenty) ? stan.dokumenty : []
  const dokumenty = zrodloDokumentow.map(normalizujDokument).filter((dokument): dokument is Dokument<unknown, unknown> => dokument !== null)

  return { wersja: 1, dokumenty }
}

export const rejestrMigracjiDokumentow: MigracjaRejestruDokumentow[] = [
  { wersjaZrodlowa: 0, wersjaDocelowa: 1, wykonaj: migrujWersjeZero },
]

function zapiszKopieBezpieczenstwa(wartosc: string) {
  try {
    localStorage.setItem(kluczKopiiBezpieczenstwaRejestruDokumentow, wartosc)
  } catch {
    return
  }
}

function zapiszStan(stan: StanRejestruDokumentow) {
  localStorage.setItem(kluczRejestruDokumentow, JSON.stringify(stan))
}

function pobierzStan(): StanRejestruDokumentow {
  const zapis = localStorage.getItem(kluczRejestruDokumentow)
  const odczyt = bezpiecznieParsuj(zapis)

  if (!czyObiekt(odczyt)) {
    return { wersja: wersjaRejestruDokumentow, dokumenty: [] }
  }

  let wersja = typeof odczyt.wersja === 'number' ? odczyt.wersja : 0
  let stan: unknown = odczyt

  while (wersja < wersjaRejestruDokumentow) {
    const migracja = rejestrMigracjiDokumentow.find((kandydat) => kandydat.wersjaZrodlowa === wersja)

    if (!migracja || !zapis) {
      return { wersja: wersjaRejestruDokumentow, dokumenty: [] }
    }

    zapiszKopieBezpieczenstwa(zapis)
    stan = migracja.wykonaj(stan)
    wersja = migracja.wersjaDocelowa
  }

  const rekord = czyObiekt(stan) ? stan : null
  const zajeteId = new Set<string>()
  const dokumenty = (Array.isArray(rekord?.dokumenty) ? rekord.dokumenty : [])
    .map(normalizujDokument)
    .filter((dokument): dokument is Dokument<unknown, unknown> => {
      if (!dokument || zajeteId.has(dokument.id)) {
        return false
      }

      zajeteId.add(dokument.id)
      return true
    })

  const wynik = { wersja: wersjaRejestruDokumentow, dokumenty }

  if (wersja !== (typeof odczyt.wersja === 'number' ? odczyt.wersja : 0)) {
    zapiszStan(wynik)
  }

  return wynik
}

function aktualizujStan(id: string, zmien: (dokument: Dokument<unknown, unknown>) => Dokument<unknown, unknown>) {
  const stan = pobierzStan()
  const indeks = stan.dokumenty.findIndex((dokument) => dokument.id === id)

  if (indeks === -1) {
    return null
  }

  const dokument = zmien(stan.dokumenty[indeks])

  if (!walidujDokument(dokument).czyPoprawny) {
    throw new Error('Zmiany naruszaja model dokumentu.')
  }

  stan.dokumenty[indeks] = dokument
  zapiszStan(stan)
  return dokument
}

export const repozytoriumWspolnychDokumentow: RepozytoriumWspolnychDokumentow = {
  pobierzWszystkie() {
    return pobierzStan().dokumenty.sort((pierwszy, drugi) => Date.parse(drugi.zmodyfikowano) - Date.parse(pierwszy.zmodyfikowano))
  },

  pobierzPoId(id) {
    return pobierzStan().dokumenty.find((dokument) => dokument.id === id) ?? null
  },

  utworz<TDane, TUstawienia>(dokument: Dokument<TDane, TUstawienia>) {
    const stan = pobierzStan()
    const rekord = dokument as Dokument<unknown, unknown>

    if (stan.dokumenty.some((istniejacy) => istniejacy.id === rekord.id)) {
      throw new Error('Dokument o tym identyfikatorze juz istnieje.')
    }

    if (!walidujDokument(rekord).czyPoprawny) {
      throw new Error('Nie mozna zapisac niepoprawnego dokumentu.')
    }

    stan.dokumenty.unshift(rekord)
    zapiszStan(stan)
    return dokument
  },

  aktualizuj(id, zmiany) {
    return aktualizujStan(id, (dokument) => ({
      ...dokument,
      ...zmiany,
      id: dokument.id,
      utworzono: dokument.utworzono,
      zmodyfikowano: new Date().toISOString(),
    }))
  },

  archiwizuj(id) {
    const teraz = new Date().toISOString()
    return aktualizujStan(id, (dokument) => ({ ...dokument, status: 'ZARCHIWIZOWANY', czyZarchiwizowany: true, zarchiwizowano: teraz, zmodyfikowano: teraz }))
  },

  przywroc(id) {
    const teraz = new Date().toISOString()
    return aktualizujStan(id, (dokument) => ({ ...dokument, status: 'GOTOWY', czyZarchiwizowany: false, zarchiwizowano: null, zmodyfikowano: teraz }))
  },

  usunMiekko(id) {
    const teraz = new Date().toISOString()
    return aktualizujStan(id, (dokument) => ({ ...dokument, czyUsunietyMiekko: true, usunieto: teraz, zmodyfikowano: teraz }))
  },
}
