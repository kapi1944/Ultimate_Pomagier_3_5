import { parsujMaile } from '../parsery/parserMaili'
import { parsujNumeryTelefonu } from '../parsery/parserNumerowTelefonu'
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
  return {
    id: utworzIdDokumentu(nazwa),
    nazwa: nazwa.trim() || 'Wzorzec tekstowy',
    zrodlo: {
      typ: 'tekst',
    },
    strony: [
      {
        id: 'strona-1',
        numer: 1,
        format: 'A4',
        szerokoscMm: 210,
        wysokoscMm: 297,
        elementy: podzielTekstNaElementy(tekst),
      },
    ],
    style: {
      domyslnyTekst: domyslnyStylTekstu,
    },
    polaDynamiczne: [],
    metadane: {
      utworzono: new Date().toISOString(),
      emaile: parsujMaile(tekst),
      telefony: parsujNumeryTelefonu(tekst),
    },
  }
}
