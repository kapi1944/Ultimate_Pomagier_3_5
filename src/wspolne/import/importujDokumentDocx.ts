import { parsujMaile } from '../parsery/parserMaili'
import { parsujNumeryTelefonu } from '../parsery/parserNumerowTelefonu'
import type {
  DokumentPomagiera,
  ElementDokumentu,
  ElementObrazuDokumentu,
  ElementTabeliDokumentu,
  ElementTekstowyDokumentu,
  StylTekstuDokumentu,
} from '../dokumenty/typyDokumentu'
import { czytajZip } from './czytnikZip'

const nsW = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const nsA = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const nsR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const stylPodstawowy: StylTekstuDokumentu = {
  krojCzcionki: 'Calibri',
  rozmiarCzcionki: 11,
  pogrubienie: false,
  kursywa: false,
  podkreslenie: false,
  kolor: '#111827',
  wyrownanie: 'lewo',
}

const stylInstrukcji: StylTekstuDokumentu = {
  ...stylPodstawowy,
  rozmiarCzcionki: 10,
  kolor: '#6b7280',
  wyrownanie: 'srodek',
}

const stylTytulu: StylTekstuDokumentu = {
  ...stylPodstawowy,
  rozmiarCzcionki: 12,
  pogrubienie: true,
  podkreslenie: true,
  wyrownanie: 'srodek',
}

const stylCzerwony: StylTekstuDokumentu = {
  ...stylPodstawowy,
  rozmiarCzcionki: 12,
  pogrubienie: true,
  kolor: '#dc2626',
  wyrownanie: 'srodek',
}

function utworzIdZPliku(nazwa: string) {
  const rdzen = nazwa
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${rdzen || 'docx'}-${Date.now()}`
}

function tekstWezla(wezel: Element) {
  return Array.from(wezel.getElementsByTagNameNS(nsW, 't'))
    .map((tekst) => tekst.textContent ?? '')
    .join(' ')
    .replace(/\s+([:,.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function czytajRelacje(xml: string) {
  const relacje = new Map<string, string>()

  if (!xml) {
    return relacje
  }

  const dokument = new DOMParser().parseFromString(xml, 'application/xml')

  Array.from(dokument.getElementsByTagName('Relationship')).forEach((relacja) => {
    const id = relacja.getAttribute('Id')
    const cel = relacja.getAttribute('Target')

    if (id && cel) {
      relacje.set(id, cel)
    }
  })

  return relacje
}

function sciezkaZRelacji(cel: string) {
  if (cel.startsWith('/')) {
    return cel.slice(1)
  }

  return `word/${cel.replace(/^\.\.\//, '')}`
}

function mimeZPliku(nazwa: string) {
  const malaNazwa = nazwa.toLowerCase()

  if (malaNazwa.endsWith('.jpg') || malaNazwa.endsWith('.jpeg')) {
    return 'image/jpeg'
  }

  if (malaNazwa.endsWith('.svg')) {
    return 'image/svg+xml'
  }

  return 'image/png'
}

function bajtyNaBase64(bajty: Uint8Array) {
  let wynik = ''
  const rozmiarPaczki = 0x8000

  for (let indeks = 0; indeks < bajty.length; indeks += rozmiarPaczki) {
    wynik += String.fromCharCode(...bajty.slice(indeks, indeks + rozmiarPaczki))
  }

  return btoa(wynik)
}

async function pobierzObraz(zip: Awaited<ReturnType<typeof czytajZip>>, sciezka: string) {
  const bajty = await zip.bajty(sciezka)

  if (!bajty) {
    return ''
  }

  return `data:${mimeZPliku(sciezka)};base64,${bajtyNaBase64(bajty)}`
}

function znajdzRelacjeObrazow(wezel: Element) {
  return Array.from(wezel.getElementsByTagNameNS(nsA, 'blip'))
    .map((obraz) => obraz.getAttributeNS(nsR, 'embed') ?? obraz.getAttribute('r:embed') ?? '')
    .filter(Boolean)
}

async function pobierzObrazyZWezla(
  zip: Awaited<ReturnType<typeof czytajZip>>,
  wezel: Element,
  relacje: Map<string, string>,
) {
  const obrazy: string[] = []

  for (const idRelacji of znajdzRelacjeObrazow(wezel)) {
    const cel = relacje.get(idRelacji)

    if (!cel) {
      continue
    }

    const obraz = await pobierzObraz(zip, sciezkaZRelacji(cel))

    if (obraz) {
      obrazy.push(obraz)
    }
  }

  return obrazy
}

async function pobierzObrazNaglowka(zip: Awaited<ReturnType<typeof czytajZip>>) {
  for (const nazwa of ['header3', 'header1', 'header2']) {
    const xml = await zip.tekst(`word/${nazwa}.xml`)
    const relacje = czytajRelacje(await zip.tekst(`word/_rels/${nazwa}.xml.rels`))

    if (!xml || relacje.size === 0) {
      continue
    }

    const dokument = new DOMParser().parseFromString(xml, 'application/xml')
    const obrazy = await pobierzObrazyZWezla(zip, dokument.documentElement, relacje)

    if (obrazy[0]) {
      return obrazy[0]
    }
  }

  return ''
}

function utworzTekst(
  id: string,
  tekst: string,
  x: number,
  y: number,
  szerokosc: number,
  styl: StylTekstuDokumentu,
): ElementTekstowyDokumentu {
  return {
    id,
    rodzaj: 'tekst',
    tekst,
    pozycja: {
      x,
      y,
      szerokosc,
      wysokosc: 6,
    },
    styl,
  }
}

function utworzObraz(
  id: string,
  nazwa: string,
  zrodlo: string,
  x: number,
  y: number,
  szerokosc: number,
  wysokosc: number,
): ElementObrazuDokumentu {
  return {
    id,
    rodzaj: 'obraz',
    nazwa,
    zrodlo,
    pozycja: {
      x,
      y,
      szerokosc,
      wysokosc,
    },
  }
}

function pobierzWierszeTabeli(tabela: Element) {
  return Array.from(tabela.getElementsByTagNameNS(nsW, 'tr')).map((wiersz) =>
    Array.from(wiersz.getElementsByTagNameNS(nsW, 'tc')).map(tekstWezla),
  )
}

function odtworzWierszeListy(wiersze: string[][]) {
  const daty = wiersze[1]?.filter(Boolean) ?? []
  const liczbaWierszy = Math.max(wiersze.length - 2, 0)

  return {
    naglowek: [
      ['Lp.', 'Imię i nazwisko uczestnika:', 'Podpis uczestnika:', '', ''],
      ['', '', daty[0] ?? '', daty[1] ?? '', daty[2] ?? ''],
    ],
    dane: Array.from({ length: liczbaWierszy }, (_, indeks) => [`${indeks + 1}.`, '', '', '', '']),
  }
}

function podzielWierszeNaStrony(wiersze: string[][]) {
  const rozmiaryStron = wiersze.length > 46 ? [20, 26, 26] : [wiersze.length]
  const strony: string[][][] = []
  let indeks = 0

  for (const rozmiar of rozmiaryStron) {
    const czesc = wiersze.slice(indeks, indeks + rozmiar)

    if (czesc.length > 0) {
      strony.push(czesc)
    }

    indeks += rozmiar
  }

  if (indeks < wiersze.length) {
    strony.push(wiersze.slice(indeks))
  }

  return strony
}

function utworzTabele(id: string, y: number, wiersze: string[][]): ElementTabeliDokumentu {
  return {
    id,
    rodzaj: 'tabela',
    wiersze,
    pozycja: {
      x: 12,
      y,
      szerokosc: 186,
      wysokosc: Math.min(245, wiersze.length * 7),
    },
    styl: {
      ...stylPodstawowy,
      rozmiarCzcionki: 8,
      wyrownanie: 'srodek',
    },
  }
}

function utworzStronyListyObecnosci(
  teksty: string[],
  obrazNaglowka: string,
  obrazBody: string,
  wierszeTabeli: string[][],
) {
  const instrukcja = teksty.find((tekst) => tekst.includes('CZYTELNIE')) ?? 'Imię i nazwisko prosimy wpisać CZYTELNIE DRUKOWANYMI literami.'
  const { naglowek, dane } = odtworzWierszeListy(wierszeTabeli)
  const daneNaStronach = podzielWierszeNaStrony(dane)

  return daneNaStronach.map((wiersze, indeksStrony) => {
    const elementy: ElementDokumentu[] = []
    const czyPierwszaStrona = indeksStrony === 0

    if (czyPierwszaStrona && obrazNaglowka) {
      elementy.push(utworzObraz('naglowek-logo', 'Logotypy nagłówka', obrazNaglowka, 20, 12, 170, 18))
    }

    if (czyPierwszaStrona && obrazBody) {
      elementy.push(utworzObraz('logo-organizatora', 'Logotyp organizatora', obrazBody, 18, 49, 47, 20))
    }

    if (czyPierwszaStrona) {
      elementy.push(utworzTekst('tytul-listy', teksty[0] ?? 'Lista obecności', 82, 45, 80, stylTytulu))
      elementy.push(utworzTekst('tytul-szkolenia', teksty[1] ?? '"Tytuł szkolenia"', 82, 53, 80, stylCzerwony))
      elementy.push(utworzTekst('miejsce-data', teksty[2] ?? '', 74, 63, 100, { ...stylPodstawowy, rozmiarCzcionki: 9, wyrownanie: 'srodek' }))
    }

    elementy.push(
      utworzTekst(
        `instrukcja-gora-${indeksStrony + 1}`,
        instrukcja,
        22,
        czyPierwszaStrona ? 78 : 12,
        166,
        stylInstrukcji,
      ),
    )
    elementy.push(utworzTabele(`tabela-${indeksStrony + 1}`, czyPierwszaStrona ? 91 : 24, [...naglowek, ...wiersze]))
    elementy.push(utworzTekst(`instrukcja-dol-${indeksStrony + 1}`, instrukcja, 22, 281, 166, stylInstrukcji))

    return {
      id: `strona-${indeksStrony + 1}`,
      numer: indeksStrony + 1,
      format: 'A4' as const,
      szerokoscMm: 210,
      wysokoscMm: 297,
      elementy,
    }
  })
}

export async function importujDokumentDocx(plik: File): Promise<DokumentPomagiera> {
  const zip = await czytajZip(await plik.arrayBuffer())
  const xml = await zip.tekst('word/document.xml')
  const dokumentXml = new DOMParser().parseFromString(xml, 'application/xml')
  const body = dokumentXml.getElementsByTagNameNS(nsW, 'body')[0]
  const relacje = czytajRelacje(await zip.tekst('word/_rels/document.xml.rels'))
  const teksty: string[] = []
  let tabela: Element | null = null
  let obrazBody = ''

  for (const dziecko of Array.from(body.children)) {
    if (dziecko.localName === 'p') {
      const tekst = tekstWezla(dziecko)
      const obrazy = await pobierzObrazyZWezla(zip, dziecko, relacje)

      if (tekst) {
        teksty.push(tekst)
      }

      if (!obrazBody && obrazy[0]) {
        obrazBody = obrazy[0]
      }
    }

    if (dziecko.localName === 'tbl' && !tabela) {
      tabela = dziecko
    }
  }

  const obrazNaglowka = await pobierzObrazNaglowka(zip)
  const strony = tabela
    ? utworzStronyListyObecnosci(teksty, obrazNaglowka, obrazBody, pobierzWierszeTabeli(tabela))
    : [
        {
          id: 'strona-1',
          numer: 1,
          format: 'A4' as const,
          szerokoscMm: 210,
          wysokoscMm: 297,
          elementy: teksty.map((tekst, indeks) =>
            utworzTekst(`tekst-${indeks + 1}`, tekst, 20, 24 + indeks * 8, 170, stylPodstawowy),
          ),
        },
      ]

  const tekstZrodlowy = teksty.join('\n')

  return {
    id: utworzIdZPliku(plik.name),
    nazwa: plik.name.replace(/\.[^.]+$/, ''),
    zrodlo: {
      typ: 'docx',
      nazwaPliku: plik.name,
    },
    strony,
    style: {
      domyslnyTekst: stylPodstawowy,
    },
    polaDynamiczne: [],
    metadane: {
      utworzono: new Date().toISOString(),
      emaile: parsujMaile(tekstZrodlowy),
      telefony: parsujNumeryTelefonu(tekstZrodlowy),
    },
  }
}
