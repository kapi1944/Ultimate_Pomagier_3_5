import { utworzDokumentZTekstu } from '../dokumenty/utworzDokumentZTekstu'
import type {
  DokumentPomagiera,
  ElementObrazuDokumentu,
  ElementOsadzonegoPlikuDokumentu,
  TypZrodlaDokumentu,
} from '../dokumenty/typyDokumentu'
import { importujDokumentDocx } from './importujDokumentDocx'
import { rozpoznajTypPliku } from './rozpoznajTypPliku'

export type WynikImportuDokumentu = {
  dokument: DokumentPomagiera
  tekstZrodlowy: string
  komunikat: string
}

function utworzIdZPliku(nazwa: string) {
  return nazwa
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function czyObraz(typ: string) {
  return typ.startsWith('image/')
}

function utworzDokumentZObrazu(plik: File, adres: string): DokumentPomagiera {
  const obraz: ElementObrazuDokumentu = {
    id: 'obraz-1',
    rodzaj: 'obraz',
    nazwa: plik.name,
    zrodlo: adres,
    pozycja: {
      x: 15,
      y: 15,
      szerokosc: 180,
      wysokosc: 267,
    },
  }

  return {
    id: `${utworzIdZPliku(plik.name) || 'obraz'}-${Date.now()}`,
    nazwa: plik.name.replace(/\.[^.]+$/, ''),
    zrodlo: {
      typ: 'obraz',
      nazwaPliku: plik.name,
    },
    strony: [
      {
        id: 'strona-1',
        numer: 1,
        format: 'A4',
        szerokoscMm: 210,
        wysokoscMm: 297,
        elementy: [obraz],
      },
    ],
    style: {
      domyslnyTekst: {
        krojCzcionki: 'Arial',
        rozmiarCzcionki: 12,
        pogrubienie: false,
        kursywa: false,
        podkreslenie: false,
        kolor: '#111827',
        wyrownanie: 'lewo',
      },
    },
    polaDynamiczne: [],
    metadane: {
      utworzono: new Date().toISOString(),
      emaile: [],
      telefony: [],
    },
  }
}

function utworzDokumentZWizualnegoPliku(
  plik: File,
  adres: string,
  typZrodla: TypZrodlaDokumentu,
): DokumentPomagiera {
  const plikOsadzony: ElementOsadzonegoPlikuDokumentu = {
    id: 'plik-osadzony-1',
    rodzaj: 'plik_osadzony',
    nazwa: plik.name,
    zrodlo: adres,
    typMime: plik.type || 'application/pdf',
    pozycja: {
      x: 0,
      y: 0,
      szerokosc: 210,
      wysokosc: 297,
    },
  }

  return {
    id: `${utworzIdZPliku(plik.name) || 'plik'}-${Date.now()}`,
    nazwa: plik.name.replace(/\.[^.]+$/, ''),
    zrodlo: {
      typ: typZrodla,
      nazwaPliku: plik.name,
    },
    strony: [
      {
        id: 'strona-1',
        numer: 1,
        format: 'A4',
        szerokoscMm: 210,
        wysokoscMm: 297,
        elementy: [plikOsadzony],
      },
    ],
    style: {
      domyslnyTekst: {
        krojCzcionki: 'Arial',
        rozmiarCzcionki: 12,
        pogrubienie: false,
        kursywa: false,
        podkreslenie: false,
        kolor: '#111827',
        wyrownanie: 'lewo',
      },
    },
    polaDynamiczne: [],
    metadane: {
      utworzono: new Date().toISOString(),
      emaile: [],
      telefony: [],
    },
  }
}

export async function importujPlikDoDokumentu(plik: File): Promise<WynikImportuDokumentu> {
  const typ = rozpoznajTypPliku(plik)

  if (typ === 'docx') {
    const dokument = await importujDokumentDocx(plik)

    return {
      dokument,
      tekstZrodlowy: dokument.strony
        .flatMap((strona) => strona.elementy)
        .filter((element) => element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka')
        .map((element) => (element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka' ? element.tekst : ''))
        .join('\n'),
      komunikat: 'Zaimportowano DOCX i odtworzono układ stron, teksty, obrazy oraz tabelę.',
    }
  }

  if (typ === 'tekst') {
    const tekst = await plik.text()

    return {
      dokument: utworzDokumentZTekstu(plik.name.replace(/\.[^.]+$/, ''), tekst),
      tekstZrodlowy: tekst,
      komunikat: 'Zaimportowano plik tekstowy.',
    }
  }

  if (typ === 'obraz' || czyObraz(plik.type)) {
    const adres = URL.createObjectURL(plik)

    return {
      dokument: utworzDokumentZObrazu(plik, adres),
      tekstZrodlowy: '',
      komunikat: 'Zaimportowano obraz jako wizualny wzorzec strony.',
    }
  }

  if (typ === 'pdf') {
    const adres = URL.createObjectURL(plik)

    return {
      dokument: utworzDokumentZWizualnegoPliku(plik, adres, 'pdf'),
      tekstZrodlowy: '',
      komunikat: 'Zaimportowano PDF jako wizualny wzorzec strony. Analiza tekstu PDF będzie kolejnym etapem.',
    }
  }

  return {
    dokument: utworzDokumentZTekstu(plik.name.replace(/\.[^.]+$/, ''), ''),
    tekstZrodlowy: '',
    komunikat: 'Nie rozpoznano typu pliku do replikacji.',
  }
}
