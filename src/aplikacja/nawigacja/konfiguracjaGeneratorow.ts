import type { WidokNawigacji } from './typyNawigacji'

type MiejscePodmenuGeneratora = 'szkolenia-zamkniete' | 'dokumenty'

export type PozycjaPodmenuGeneratora = {
  widok: WidokNawigacji
  etykieta: string
  sciezka: string
}

export type KonfiguracjaPodmenuGeneratora = {
  klucz: string
  miejsce: MiejscePodmenuGeneratora
  etykieta: string
  pozycje: PozycjaPodmenuGeneratora[]
}

export const pozycjeRejestruDokumentow: PozycjaPodmenuGeneratora[] = [
  { widok: 'dokumenty_wszystkie', etykieta: 'Wszystkie dokumenty', sciezka: '/dokumenty/wszystkie' },
  { widok: 'dokumenty_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/kopie-robocze' },
  { widok: 'dokumenty_kosz', etykieta: 'Kosz', sciezka: '/dokumenty/kosz' },
]

export const konfiguracjePodmenuGeneratorow: KonfiguracjaPodmenuGeneratora[] = [
  {
    klucz: 'szczegoly-organizacyjne',
    miejsce: 'szkolenia-zamkniete',
    etykieta: 'Szczegóły Organizacyjne',
    pozycje: [
      { widok: 'zamkniete_szczegoly_organizacyjne_lista', etykieta: 'Lista szczegółów organizacyjnych', sciezka: '/szkolenia-zamkniete/szczegoly-organizacyjne' },
      { widok: 'zamkniete_szczegoly_organizacyjne_nowe', etykieta: 'Nowe Szczegóły Organizacyjne', sciezka: '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe' },
      { widok: 'zamkniete_szczegoly_organizacyjne_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze' },
    ],
  },
  {
    klucz: 'generator-list-obecnosci',
    miejsce: 'dokumenty',
    etykieta: 'Listy obecności',
    pozycje: [
      { widok: 'listy-obecnosci', etykieta: 'Nowa lista obecności', sciezka: '/dokumenty/listy-obecnosci' },
      { widok: 'listy_obecnosci_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/listy-obecnosci/kopie-robocze' },
      { widok: 'listy_obecnosci_wszystkie', etykieta: 'Wszystkie listy obecności', sciezka: '/dokumenty/listy-obecnosci/wszystkie' },
      { widok: 'listy_obecnosci_kosz', etykieta: 'Kosz', sciezka: '/dokumenty/listy-obecnosci/kosz' },
    ],
  },
  {
    klucz: 'generator-ankiet',
    miejsce: 'dokumenty',
    etykieta: 'Ankiety',
    pozycje: [
      { widok: 'ankiety', etykieta: 'Nowa ankieta', sciezka: '/dokumenty/ankiety' },
      { widok: 'ankiety_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/ankiety/kopie-robocze' },
      { widok: 'ankiety_wszystkie', etykieta: 'Wszystkie ankiety', sciezka: '/dokumenty/ankiety/wszystkie' },
      { widok: 'ankiety_kosz', etykieta: 'Kosz', sciezka: '/dokumenty/ankiety/kosz' },
    ],
  },
  {
    klucz: 'generator-dyplomow',
    miejsce: 'dokumenty',
    etykieta: 'Dyplomy',
    pozycje: [
      { widok: 'dyplomy', etykieta: 'Nowy dyplom', sciezka: '/dokumenty/dyplomy' },
      { widok: 'dyplomy_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/dyplomy/kopie-robocze' },
      { widok: 'dyplomy_wszystkie', etykieta: 'Wszystkie dyplomy', sciezka: '/dokumenty/dyplomy/wszystkie' },
      { widok: 'dyplomy_kosz', etykieta: 'Kosz', sciezka: '/dokumenty/dyplomy/kosz' },
    ],
  },
  {
    klucz: 'generator-kart-na-drzwi',
    miejsce: 'dokumenty',
    etykieta: 'Karta na drzwi',
    pozycje: [
      { widok: 'karta-na-drzwi', etykieta: 'Nowa karta na drzwi', sciezka: '/dokumenty/karta-na-drzwi' },
      { widok: 'karta_na_drzwi_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/karta-na-drzwi/kopie-robocze' },
      { widok: 'karta_na_drzwi_wszystkie', etykieta: 'Wszystkie karty na drzwi', sciezka: '/dokumenty/karta-na-drzwi/wszystkie' },
      { widok: 'karta_na_drzwi_kosz', etykieta: 'Kosz', sciezka: '/dokumenty/karta-na-drzwi/kosz' },
    ],
  },
  {
    klucz: 'generator-checklist-paczek',
    miejsce: 'dokumenty',
    etykieta: 'Checklisty paczek',
    pozycje: [
      { widok: 'checklisty_paczek', etykieta: 'Nowa checklista paczki', sciezka: '/dokumenty/checklisty-paczek' },
      { widok: 'checklisty_paczek_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/checklisty-paczek/kopie-robocze' },
      { widok: 'checklisty_paczek_wszystkie', etykieta: 'Wszystkie checklisty paczek', sciezka: '/dokumenty/checklisty-paczek/wszystkie' },
      { widok: 'checklisty_paczek_kosz', etykieta: 'Kosz', sciezka: '/dokumenty/checklisty-paczek/kosz' },
    ],
  },
  {
    klucz: 'programy-szkolen',
    miejsce: 'dokumenty',
    etykieta: 'Programy szkoleń',
    pozycje: [
      { widok: 'programy_szkolen', etykieta: 'Nowy program szkolenia', sciezka: '/dokumenty/programy-szkolen' },
      { widok: 'programy_szkolen_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/programy-szkolen/kopie-robocze' },
      { widok: 'programy_szkolen_kosz', etykieta: 'Kosz', sciezka: '/dokumenty/programy-szkolen/kosz' },
    ],
  },
]

export function pobierzKonfiguracjePodmenuGeneratorow(miejsce: MiejscePodmenuGeneratora) {
  return konfiguracjePodmenuGeneratorow.filter((konfiguracja) => konfiguracja.miejsce === miejsce)
}

export function pobierzSciezkeGeneratora(widok: WidokNawigacji) {
  return [...pozycjeRejestruDokumentow, ...konfiguracjePodmenuGeneratorow.flatMap((konfiguracja) => konfiguracja.pozycje)]
    .find((pozycja) => pozycja.widok === widok)?.sciezka
}

export function pobierzWidokGeneratoraZeSciezki(sciezka: string) {
  const widok = [...pozycjeRejestruDokumentow, ...konfiguracjePodmenuGeneratorow.flatMap((konfiguracja) => konfiguracja.pozycje)]
    .find((pozycja) => pozycja.sciezka === sciezka)?.widok

  if (widok) return widok
  if (/^\/dokumenty\/listy-obecnosci\/[^/]+$/.test(sciezka)) return 'listy-obecnosci'
  if (/^\/dokumenty\/checklisty-paczek\/[^/]+$/.test(sciezka)) return 'checklisty_paczek'
  return /^\/dokumenty\/programy-szkolen\/[^/]+$/.test(sciezka) ? 'programy_szkolen' : undefined
}
