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
        id: 'generator-szczegolow',
        etykieta: 'Generator szczegółów',
        dzieci: [
          {
            id: 'zamkniete_szczegoly_organizacyjne_nowe',
            etykieta: 'Nowe szczegóły organizacyjne',
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
    ],
  },
  {
    id: 'ustawienia',
    etykieta: 'Ustawienia',
  },
]
