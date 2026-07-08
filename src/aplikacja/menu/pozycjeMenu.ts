import type { WidokNawigacji } from '../nawigacja/typyNawigacji'

export type PozycjaMenu = {
  id: WidokNawigacji
  etykieta: string
  sciezka?: string
  ikona?: string
  grupa?: string
  dzieci?: PozycjaMenu[]
}

const FileText = 'FileText'

export const pozycjeMenu: PozycjaMenu[] = [
  {
    id: 'pulpit',
    etykieta: 'Pulpit',
  },
  {
    id: 'szkolenia-zamkniete',
    etykieta: 'Szkolenia Zamknięte',
    dzieci: [
      {
        id: 'zamkniete_szczegoly_organizacyjne_lista',
        etykieta: 'Szczegóły Organizacyjne',
        dzieci: [
          {
            id: 'zamkniete_szczegoly_organizacyjne_lista',
            etykieta: 'Lista szczegółów organizacyjnych',
          },
          {
            id: 'zamkniete_szczegoly_organizacyjne_kopie_robocze',
            etykieta: 'Kopie robocze',
          },
          {
            id: 'zamkniete_szczegoly_organizacyjne_nowe',
            etykieta: 'Nowe Szczegóły Organizacyjne',
          },
        ],
      },
    ],
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
      {
        id: 'listy-obecnosci',
        etykieta: 'Listy obecności',
      },
      {
        id: 'ankiety',
        etykieta: 'Ankiety',
      },
      {
        id: 'dyplomy',
        etykieta: 'Dyplomy',
      },
      {
        id: 'karta-na-drzwi',
        etykieta: 'Karta na drzwi',
      },
      {
        id: 'programy_szkolen',
        etykieta: 'Programy szkoleń',
        sciezka: '/dokumenty/programy-szkolen',
        ikona: FileText,
        grupa: 'Dokumenty',
      },
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
