import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pobierzKonfiguracjePodmenuGeneratorow, pozycjeRejestruDokumentow } from '../nawigacja/konfiguracjaGeneratorow'

export type PozycjaMenu = {
  id: string
  etykieta: string
  widok?: WidokNawigacji
  czyPrzelaczaPodmenu?: boolean
  czySeparatorPrzed?: boolean
  dzieci?: PozycjaMenu[]
}

function pobierzPozycjePodmenuGeneratorow(miejsce: 'szkolenia-zamkniete' | 'dokumenty'): PozycjaMenu[] {
  return pobierzKonfiguracjePodmenuGeneratorow(miejsce).map((konfiguracja, indeks) => ({
    id: konfiguracja.klucz,
    etykieta: konfiguracja.etykieta,
    czyPrzelaczaPodmenu: true,
    czySeparatorPrzed: miejsce === 'dokumenty' && indeks === 0,
    dzieci: konfiguracja.pozycje.map((pozycja) => ({
      id: pozycja.widok,
      widok: pozycja.widok,
      etykieta: pozycja.etykieta,
    })),
  }))
}

export const pozycjeMenu: PozycjaMenu[] = [
  {
    id: 'pulpit',
    widok: 'pulpit',
    etykieta: 'PULPIT',
  },
  {
    id: 'szkolenia-zamkniete',
    widok: 'szkolenia-zamkniete',
    etykieta: 'SZKOLENIA ZAMKNIĘTE',
    czyPrzelaczaPodmenu: true,
    dzieci: pobierzPozycjePodmenuGeneratorow('szkolenia-zamkniete'),
  },
  {
    id: 'szkolenia-otwarte',
    widok: 'szkolenia-otwarte',
    etykieta: 'SZKOLENIA OTWARTE',
  },
  {
    id: 'dokumenty',
    widok: 'dokumenty',
    etykieta: 'DOKUMENTY',
    czyPrzelaczaPodmenu: true,
    dzieci: [
      ...pozycjeRejestruDokumentow.map((pozycja) => ({
        id: pozycja.widok,
        widok: pozycja.widok,
        etykieta: pozycja.etykieta,
      })),
      {
        id: 'replikator_dokumentow',
        widok: 'replikator_dokumentow',
        etykieta: 'Replikator dokumentów',
      },
      ...pobierzPozycjePodmenuGeneratorow('dokumenty'),
    ],
  },
  {
    id: 'kartoteki',
    widok: 'kartoteki',
    etykieta: 'KARTOTEKI',
    czyPrzelaczaPodmenu: true,
    dzieci: [
      { id: 'kartoteki_trenerzy', widok: 'kartoteki_trenerzy', etykieta: 'Trenerzy' },
      { id: 'kartoteki_klienci', widok: 'kartoteki_klienci', etykieta: 'Klienci' },
      { id: 'kartoteki_lokalizacje', widok: 'kartoteki_lokalizacje', etykieta: 'Lokalizacje' },
      { id: 'kartoteki_szablony_dokumentow', widok: 'kartoteki_szablony_dokumentow', etykieta: 'Szablony dokumentów' },
    ],
  },
  {
    id: 'ustawienia',
    widok: 'ustawienia',
    etykieta: 'USTAWIENIA',
  },
]

export function czyPozycjaLubPotomekJestAktywny(pozycja: PozycjaMenu, aktywnyWidok: WidokNawigacji): boolean {
  return pozycja.widok === aktywnyWidok
    || Boolean(pozycja.dzieci?.some((dziecko) => czyPozycjaLubPotomekJestAktywny(dziecko, aktywnyWidok)))
}

export function pobierzIdRozwijalnychPozycji(pozycje: PozycjaMenu[] = pozycjeMenu): string[] {
  return pozycje.flatMap((pozycja) => [
    ...(pozycja.czyPrzelaczaPodmenu ? [pozycja.id] : []),
    ...pobierzIdRozwijalnychPozycji(pozycja.dzieci ?? []),
  ])
}

export function pobierzSciezkeMenuDlaWidoku(
  aktywnyWidok: WidokNawigacji,
  pozycje: PozycjaMenu[] = pozycjeMenu,
): string[] {
  for (const pozycja of pozycje) {
    if (pozycja.widok === aktywnyWidok) return [pozycja.id]
    const sciezkaDziecka = pobierzSciezkeMenuDlaWidoku(aktywnyWidok, pozycja.dzieci ?? [])
    if (sciezkaDziecka.length) return [pozycja.id, ...sciezkaDziecka]
  }

  return []
}
