import { pobierzPelnyTekstDokumentu, uzupelnijAnalizeDokumentu, utworzDaneZCsv } from '../dokumenty/analizaDokumentu'
import { utworzDokumentZTekstu } from '../dokumenty/utworzDokumentZTekstu'
import { rozpoznajObrazLokalnie } from '../ocr/ocr'
import type {
  DaneWyekstrahowaneDokumentu,
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

function utworzMetadane(daneWyekstrahowane: DaneWyekstrahowaneDokumentu[] = [], ostrzezenia: string[] = []) {
  return {
    utworzono: new Date().toISOString(),
    emaile: [],
    telefony: [],
    daneWyekstrahowane,
    branding: {
      marka: 'SEMPER' as const,
      kolorGlowny: '#0f766e',
      kolorDodatkowy: '#dc2626',
    },
    ostrzezenia,
  }
}

function utworzDokumentZObrazu(plik: File, adres: string, daneWyekstrahowane: DaneWyekstrahowaneDokumentu[]): DokumentPomagiera {
  const obraz: ElementObrazuDokumentu = {
    id: 'obraz-1',
    rodzaj: 'obraz',
    status: 'niepewny',
    nazwa: plik.name,
    zrodlo: adres,
    rola: 'dekoracja',
    zasobId: 'zasob-obraz-1',
    pozycja: {
      x: 15,
      y: 15,
      szerokosc: 180,
      wysokosc: 267,
    },
  }

  const dokument: DokumentPomagiera = {
    id: `${utworzIdZPliku(plik.name) || 'obraz'}-${Date.now()}`,
    nazwa: plik.name.replace(/\.[^.]+$/, ''),
    zrodlo: {
      typ: 'obraz',
      nazwaPliku: plik.name,
      typMime: plik.type,
      podgladOryginalu: adres,
      wymagaOcr: true,
    },
    strony: [
      {
        id: 'strona-1',
        numer: 1,
        format: 'A4',
        jednostka: 'mm',
        szerokoscMm: 210,
        wysokoscMm: 297,
        elementy: [obraz],
      },
    ],
    zasoby: [
      {
        id: 'zasob-obraz-1',
        nazwa: plik.name,
        typ: 'dekoracja',
        zrodlo: adres,
        typMime: plik.type,
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
    metadane: utworzMetadane(daneWyekstrahowane, ['Wymaga OCR: obraz zapisano jako oryginał i warstwę roboczą.']),
  }

  return uzupelnijAnalizeDokumentu(dokument)
}

function utworzDokumentZWizualnegoPliku(
  plik: File,
  adres: string,
  typZrodla: TypZrodlaDokumentu,
): DokumentPomagiera {
  const plikOsadzony: ElementOsadzonegoPlikuDokumentu = {
    id: 'plik-osadzony-1',
    rodzaj: 'plik_osadzony',
    status: typZrodla === 'pdf' ? 'niepewny' : 'staly',
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

  const dokument: DokumentPomagiera = {
    id: `${utworzIdZPliku(plik.name) || 'plik'}-${Date.now()}`,
    nazwa: plik.name.replace(/\.[^.]+$/, ''),
    zrodlo: {
      typ: typZrodla,
      nazwaPliku: plik.name,
      typMime: plik.type || 'application/pdf',
      podgladOryginalu: adres,
      czyEdytowalnyDocelowo: typZrodla === 'pdf',
    },
    strony: [
      {
        id: 'strona-1',
        numer: 1,
        format: 'A4',
        jednostka: 'mm',
        szerokoscMm: 210,
        wysokoscMm: 297,
        elementy: [plikOsadzony],
      },
    ],
    zasoby: [],
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
    metadane: utworzMetadane([], typZrodla === 'pdf' ? ['PDF zapisano jako źródło porównawcze. Edytowalna warstwa PDF wymaga osobnego importera tekstu i tabel.'] : []),
  }

  return uzupelnijAnalizeDokumentu(dokument)
}

export async function importujPlikDoDokumentu(plik: File): Promise<WynikImportuDokumentu> {
  const typ = rozpoznajTypPliku(plik)

  if (plik.name.toLowerCase().endsWith('.doc') && !plik.name.toLowerCase().endsWith('.docx')) {
    return {
      dokument: utworzDokumentZTekstu(plik.name.replace(/\.[^.]+$/, ''), ''),
      tekstZrodlowy: '',
      komunikat: 'Format DOC nie jest obsługiwany. Zapisz plik jako DOCX i zaimportuj ponownie.',
    }
  }

  if (typ === 'docx') {
    const dokument = await importujDokumentDocx(plik)

    return {
      dokument,
      tekstZrodlowy: pobierzPelnyTekstDokumentu(dokument),
      komunikat: 'Zaimportowano DOCX i odtworzono roboczy układ stron, teksty, grafiki, kształty oraz tabele.',
    }
  }

  if (typ === 'csv') {
    const tekst = await plik.text()
    const dokument = utworzDokumentZTekstu(plik.name.replace(/\.[^.]+$/, ''), tekst)
    const dokumentZCsv: DokumentPomagiera = {
      ...dokument,
      zrodlo: {
        typ: 'csv',
        nazwaPliku: plik.name,
        typMime: plik.type || 'text/csv',
        podgladTekst: tekst,
      },
      metadane: {
        ...dokument.metadane,
        daneWyekstrahowane: utworzDaneZCsv(tekst),
      },
    }

    return {
      dokument: uzupelnijAnalizeDokumentu(dokumentZCsv, tekst),
      tekstZrodlowy: tekst,
      komunikat: 'Zaimportowano CSV jako ogólne dane wyekstrahowane do zatwierdzenia.',
    }
  }

  if (typ === 'tekst') {
    const tekst = await plik.text()
    const dokument = utworzDokumentZTekstu(plik.name.replace(/\.[^.]+$/, ''), tekst)

    return {
      dokument: {
        ...dokument,
        zrodlo: {
          typ: 'tekst',
          nazwaPliku: plik.name,
          typMime: plik.type || 'text/plain',
          podgladTekst: tekst,
        },
      },
      tekstZrodlowy: tekst,
      komunikat: 'Zaimportowano plik tekstowy.',
    }
  }

  if (typ === 'obraz' || czyObraz(plik.type)) {
    const adres = URL.createObjectURL(plik)
    const wynikOcr = await rozpoznajObrazLokalnie(plik)

    return {
      dokument: utworzDokumentZObrazu(plik, adres, wynikOcr.daneWyekstrahowane),
      tekstZrodlowy: wynikOcr.tekst,
      komunikat: wynikOcr.komunikat,
    }
  }

  if (typ === 'pdf') {
    const adres = URL.createObjectURL(plik)

    return {
      dokument: utworzDokumentZWizualnegoPliku(plik, adres, 'pdf'),
      tekstZrodlowy: '',
      komunikat: 'Zaimportowano PDF jako źródło porównawcze. Docelowa edycja PDF wymaga warstwy tekstu i tabel.',
    }
  }

  return {
    dokument: utworzDokumentZTekstu(plik.name.replace(/\.[^.]+$/, ''), ''),
    tekstZrodlowy: '',
    komunikat: 'Nie rozpoznano typu pliku do replikacji.',
  }
}
