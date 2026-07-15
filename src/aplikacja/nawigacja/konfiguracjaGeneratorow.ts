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
    pozycje: [{ widok: 'listy-obecnosci', etykieta: 'Nowa lista obecności', sciezka: '/dokumenty/listy-obecnosci' }],
  },
  {
    klucz: 'generator-ankiet',
    miejsce: 'dokumenty',
    etykieta: 'Ankiety',
    pozycje: [{ widok: 'ankiety', etykieta: 'Nowa ankieta', sciezka: '/dokumenty/ankiety' }],
  },
  {
    klucz: 'generator-dyplomow',
    miejsce: 'dokumenty',
    etykieta: 'Dyplomy',
    pozycje: [{ widok: 'dyplomy', etykieta: 'Nowy dyplom', sciezka: '/dokumenty/dyplomy' }],
  },
  {
    klucz: 'generator-kart-na-drzwi',
    miejsce: 'dokumenty',
    etykieta: 'Karta na drzwi',
    pozycje: [{ widok: 'karta-na-drzwi', etykieta: 'Nowa karta na drzwi', sciezka: '/dokumenty/karta-na-drzwi' }],
  },
  {
    klucz: 'programy-szkolen',
    miejsce: 'dokumenty',
    etykieta: 'Programy szkoleń',
    pozycje: [
      { widok: 'programy_szkolen', etykieta: 'Nowy program szkolenia', sciezka: '/dokumenty/programy-szkolen' },
      { widok: 'programy_szkolen_kopie_robocze', etykieta: 'Kopie robocze', sciezka: '/dokumenty/programy-szkolen/kopie-robocze' },
    ],
  },
]

export function pobierzKonfiguracjePodmenuGeneratorow(miejsce: MiejscePodmenuGeneratora) {
  return konfiguracjePodmenuGeneratorow.filter((konfiguracja) => konfiguracja.miejsce === miejsce)
}

export function pobierzSciezkeGeneratora(widok: WidokNawigacji) {
  return [...pozycjeRejestruDokumentow, ...konfiguracjePodmenuGeneratorow.flatMap((konfiguracja) => konfiguracja.pozycje)].find((pozycja) => pozycja.widok === widok)?.sciezka
}

export function pobierzWidokGeneratoraZeSciezki(sciezka: string) {
  const widok = [...pozycjeRejestruDokumentow, ...konfiguracjePodmenuGeneratorow.flatMap((konfiguracja) => konfiguracja.pozycje)].find((pozycja) => pozycja.sciezka === sciezka)?.widok

  if (widok) {
    return widok
  }

  if (/^\/dokumenty\/listy-obecnosci\/[^/]+$/.test(sciezka)) {
    return 'listy-obecnosci'
  }

  return /^\/dokumenty\/programy-szkolen\/[^/]+$/.test(sciezka) ? 'programy_szkolen' : undefined
}
