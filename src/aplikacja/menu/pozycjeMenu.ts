import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pobierzKonfiguracjePodmenuGeneratorow } from '../nawigacja/konfiguracjaGeneratorow'

type PozycjaMenuNawigacji = {
  id: WidokNawigacji
  etykieta: string
  czyPrzelaczaPodmenu?: false
  dzieci?: PozycjaMenu[]
}

type PozycjaMenuPodmenu = {
  id: string
  etykieta: string
  czyPrzelaczaPodmenu: true
  dzieci: PozycjaMenu[]
}

export type PozycjaMenu = PozycjaMenuNawigacji | PozycjaMenuPodmenu

function pobierzPozycjePodmenuGeneratorow(miejsce: 'szkolenia-zamkniete' | 'dokumenty'): PozycjaMenu[] {
  return pobierzKonfiguracjePodmenuGeneratorow(miejsce).map((konfiguracja) => ({
    id: konfiguracja.klucz,
    etykieta: konfiguracja.etykieta,
    czyPrzelaczaPodmenu: true,
    dzieci: konfiguracja.pozycje.map((pozycja) => ({
      id: pozycja.widok,
      etykieta: pozycja.etykieta,
    })),
  }))
}

export const pozycjeMenu: PozycjaMenu[] = [
  {
    id: 'pulpit',
    etykieta: 'Pulpit',
  },
  {
    id: 'szkolenia-zamkniete',
    etykieta: 'Szkolenia Zamknięte',
    dzieci: pobierzPozycjePodmenuGeneratorow('szkolenia-zamkniete'),
  },
  {
    id: 'szkolenia-otwarte',
    etykieta: 'Szkolenia Otwarte',
  },
  {
    id: 'dokumenty',
    etykieta: 'Dokumenty',
    dzieci: [
      {
        id: 'replikator_dokumentow',
        etykieta: 'Replikator dokumentów',
      },
      ...pobierzPozycjePodmenuGeneratorow('dokumenty'),
    ],
  },
  {
    id: 'kartoteki',
    etykieta: 'Kartoteki',
    dzieci: [
      {
        id: 'kartoteki_trenerzy',
        etykieta: 'Trenerzy',
      },
      {
        id: 'kartoteki_klienci',
        etykieta: 'Klienci',
      },
      {
        id: 'kartoteki_lokalizacje',
        etykieta: 'Lokalizacje',
      },
      {
        id: 'kartoteki_szablony_dokumentow',
        etykieta: 'Szablony dokumentów',
      },
    ],
  },
  {
    id: 'ustawienia',
    etykieta: 'Ustawienia',
  },
]
