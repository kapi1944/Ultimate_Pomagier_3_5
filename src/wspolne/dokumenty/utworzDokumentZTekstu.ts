import { uzupelnijAnalizeDokumentu } from './analizaDokumentu'
import type {
  DokumentPomagiera,
  ElementTekstowyDokumentu,
  StylTekstuDokumentu,
} from './typyDokumentu'

const domyslnyStylTekstu: StylTekstuDokumentu = {
  krojCzcionki: 'Arial',
  rozmiarCzcionki: 12,
  pogrubienie: false,
  kursywa: false,
  podkreslenie: false,
  kolor: '#111827',
  wyrownanie: 'lewo',
}

function utworzIdDokumentu(nazwa: string) {
  const rdzen = nazwa
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${rdzen || 'dokument'}-${Date.now()}`
}

function podzielTekstNaElementy(tekst: string): ElementTekstowyDokumentu[] {
  const wiersze = tekst.split('\n')
  const elementy = wiersze
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
    .map<ElementTekstowyDokumentu>((wiersz, indeks) => ({
      id: `tekst-${indeks + 1}`,
      rodzaj: 'tekst',
      status: 'staly',
      tekst: wiersz,
      pozycja: {
        x: 20,
        y: 24 + indeks * 9,
        szerokosc: 170,
        wysokosc: 7,
      },
      styl: domyslnyStylTekstu,
    }))

  if (elementy.length > 0) {
    return elementy
  }

  return [
    {
      id: 'tekst-1',
      rodzaj: 'tekst',
      status: 'staly',
      tekst: 'Pusty wzorzec dokumentu',
      pozycja: {
        x: 20,
        y: 24,
        szerokosc: 170,
        wysokosc: 7,
      },
      styl: domyslnyStylTekstu,
    },
  ]
}

export function utworzDokumentZTekstu(nazwa: string, tekst: string): DokumentPomagiera {
  const dokument: DokumentPomagiera = {
    id: utworzIdDokumentu(nazwa),
    nazwa: nazwa.trim() || 'Wzorzec tekstowy',
    zrodlo: {
      typ: 'tekst',
      podgladTekst: tekst,
    },
    strony: [
      {
        id: 'strona-1',
        numer: 1,
        format: 'A4',
        jednostka: 'mm',
        szerokoscMm: 210,
        wysokoscMm: 297,
        elementy: podzielTekstNaElementy(tekst),
      },
    ],
    zasoby: [],
    style: {
      domyslnyTekst: domyslnyStylTekstu,
    },
    polaDynamiczne: [],
    metadane: {
      utworzono: new Date().toISOString(),
      emaile: [],
      telefony: [],
      daneWyekstrahowane: [],
      branding: {
        marka: 'SEMPER',
        kolorGlowny: '#0f766e',
        kolorDodatkowy: '#dc2626',
      },
      ostrzezenia: [],
    },
  }

  return uzupelnijAnalizeDokumentu(dokument, tekst)
}
