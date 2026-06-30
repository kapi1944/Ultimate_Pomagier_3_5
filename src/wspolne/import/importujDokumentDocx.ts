import { rozpoznajTypDokumentu, uzupelnijAnalizeDokumentu } from '../dokumenty/analizaDokumentu'
import type {
  DokumentPomagiera,
  ElementDokumentu,
  ElementKsztaltuDokumentu,
  ElementObrazuDokumentu,
  ElementTabeliDokumentu,
  ElementTekstowyDokumentu,
  KomorkaTabeliDokumentu,
  RolaGrafikiDokumentu,
  StylTekstuDokumentu,
  UstawieniaListyObecnosci,
  ZasobDokumentu,
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

type ZipDocx = Awaited<ReturnType<typeof czytajZip>>

type RelacjaDocx = {
  id: string
  cel: string
  typ: string
}

type CzescDocx = {
  sciezka: string
  dokument: Document
  relacje: Map<string, RelacjaDocx>
}

type GrafikaDocx = {
  id: string
  nazwa: string
  zrodlo: string
  rola: RolaGrafikiDokumentu
}

const wzorzecDatyWDokumencie = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g

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

function normalizuj(tekst: string) {
  return tekst
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function ucieczHtml(tekst: string) {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tekstWezla(wezel: Element) {
  return Array.from(wezel.getElementsByTagNameNS(nsW, 't'))
    .map((tekst) => tekst.textContent ?? '')
    .join('')
    .replace(/\s+([:,.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function tekstAkapitu(akapit: Element) {
  return Array.from(akapit.getElementsByTagNameNS(nsW, 'r'))
    .map((run) => {
      const tekst = Array.from(run.getElementsByTagNameNS(nsW, 't')).map((wezel) => wezel.textContent ?? '').join('')
      const tabulatory = run.getElementsByTagNameNS(nsW, 'tab').length

      return `${tekst}${tabulatory ? ' '.repeat(tabulatory) : ''}`
    })
    .join('')
    .replace(/\s+([:,.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function czytajRelacje(xml: string, katalogBazowy: string) {
  const relacje = new Map<string, RelacjaDocx>()

  if (!xml) {
    return relacje
  }

  const dokument = new DOMParser().parseFromString(xml, 'application/xml')

  Array.from(dokument.getElementsByTagName('Relationship')).forEach((relacja) => {
    const id = relacja.getAttribute('Id')
    const cel = relacja.getAttribute('Target')
    const typ = relacja.getAttribute('Type') ?? ''

    if (id && cel) {
      relacje.set(id, {
        id,
        cel: sciezkaZRelacji(cel, katalogBazowy),
        typ,
      })
    }
  })

  return relacje
}

function sciezkaZRelacji(cel: string, katalogBazowy: string) {
  if (/^https?:\/\//i.test(cel)) {
    return ''
  }

  if (cel.startsWith('/')) {
    return cel.slice(1)
  }

  if (cel.startsWith('word/')) {
    return cel
  }

  const czesci = `${katalogBazowy}/${cel}`.split('/')
  const wynik: string[] = []

  czesci.forEach((czesc) => {
    if (!czesc || czesc === '.') {
      return
    }

    if (czesc === '..') {
      wynik.pop()
      return
    }

    wynik.push(czesc)
  })

  return wynik.join('/')
}

function sciezkaRelacjiDlaCzesci(sciezka: string) {
  const ostatniSlash = sciezka.lastIndexOf('/')
  const katalog = ostatniSlash === -1 ? '' : sciezka.slice(0, ostatniSlash)
  const nazwa = ostatniSlash === -1 ? sciezka : sciezka.slice(ostatniSlash + 1)

  return `${katalog}/_rels/${nazwa}.rels`
}

function katalogCzesci(sciezka: string) {
  const ostatniSlash = sciezka.lastIndexOf('/')

  return ostatniSlash === -1 ? '' : sciezka.slice(0, ostatniSlash)
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

async function pobierzObraz(zip: ZipDocx, sciezka: string) {
  const bajty = await zip.bajty(sciezka)

  if (!bajty) {
    return ''
  }

  return `data:${mimeZPliku(sciezka)};base64,${bajtyNaBase64(bajty)}`
}

function pobierzIdRelacjiObrazow(wezel: Element) {
  const relacjeDrawing = Array.from(wezel.getElementsByTagNameNS(nsA, 'blip')).map(
    (obraz) => obraz.getAttributeNS(nsR, 'embed') ?? obraz.getAttribute('r:embed') ?? '',
  )
  const relacjeVml = Array.from(wezel.getElementsByTagName('*'))
    .filter((obraz) => obraz.localName === 'imagedata')
    .map((obraz) => obraz.getAttributeNS(nsR, 'id') ?? obraz.getAttribute('r:id') ?? '')

  return [...relacjeDrawing, ...relacjeVml].filter(Boolean)
}

function rozpoznajRoleGrafiki(nazwa: string, rolaDomyslna: RolaGrafikiDokumentu): RolaGrafikiDokumentu {
  const malaNazwa = normalizuj(nazwa)

  if (malaNazwa.includes('qr')) {
    return 'qr'
  }

  if (malaNazwa.includes('podpis')) {
    return 'podpis'
  }

  if (malaNazwa.includes('logo') || malaNazwa.includes('semper') || malaNazwa.includes('iist')) {
    return rolaDomyslna === 'logotyp_projektowy' ? 'logotyp_projektowy' : 'logo'
  }

  return rolaDomyslna
}

async function pobierzObrazyZWezla(
  zip: ZipDocx,
  wezel: Element,
  relacje: Map<string, RelacjaDocx>,
  rolaDomyslna: RolaGrafikiDokumentu,
) {
  const obrazy: GrafikaDocx[] = []

  for (const idRelacji of pobierzIdRelacjiObrazow(wezel)) {
    const relacja = relacje.get(idRelacji)

    if (!relacja?.cel || !relacja.typ.includes('/image')) {
      continue
    }

    const obraz = await pobierzObraz(zip, relacja.cel)

    if (obraz) {
      obrazy.push({
        id: idRelacji,
        nazwa: relacja.cel.split('/').pop() ?? relacja.cel,
        zrodlo: obraz,
        rola: rozpoznajRoleGrafiki(relacja.cel, rolaDomyslna),
      })
    }
  }

  return obrazy
}

function pobierzAtrybutW(wezel: Element, nazwa: string) {
  return wezel.getAttributeNS(nsW, nazwa) ?? wezel.getAttribute(`w:${nazwa}`) ?? wezel.getAttribute(nazwa)
}

function pobierzKolorCieniowania(wezel: Element) {
  const cieniowanie = wezel.getElementsByTagNameNS(nsW, 'shd')[0]
  const kolor = cieniowanie ? pobierzAtrybutW(cieniowanie, 'fill') : null

  if (!kolor || kolor === 'auto' || kolor === 'FFFFFF') {
    return ''
  }

  return `#${kolor.replace('#', '')}`
}

function pobierzWyrownanie(wezel: Element): StylTekstuDokumentu['wyrownanie'] {
  const wyrownanie = wezel.getElementsByTagNameNS(nsW, 'jc')[0]
  const wartosc = wyrownanie ? pobierzAtrybutW(wyrownanie, 'val') : null

  if (wartosc === 'center') {
    return 'srodek'
  }

  if (wartosc === 'right') {
    return 'prawo'
  }

  if (wartosc === 'both') {
    return 'wyjustuj'
  }

  return 'lewo'
}

function pobierzStylRunu(run: Element | undefined, akapit: Element): StylTekstuDokumentu {
  const kolor = run?.getElementsByTagNameNS(nsW, 'color')[0]
  const rozmiar = run?.getElementsByTagNameNS(nsW, 'sz')[0]
  const wartoscKoloru = kolor ? pobierzAtrybutW(kolor, 'val') : null
  const wartoscRozmiaru = rozmiar ? Number(pobierzAtrybutW(rozmiar, 'val')) : NaN

  return {
    ...stylPodstawowy,
    pogrubienie: Boolean(run?.getElementsByTagNameNS(nsW, 'b').length),
    kursywa: Boolean(run?.getElementsByTagNameNS(nsW, 'i').length),
    podkreslenie: Boolean(run?.getElementsByTagNameNS(nsW, 'u').length),
    kolor: wartoscKoloru && wartoscKoloru !== 'auto' ? `#${wartoscKoloru.replace('#', '')}` : stylPodstawowy.kolor,
    rozmiarCzcionki: Number.isFinite(wartoscRozmiaru) && wartoscRozmiaru > 0 ? Math.max(7, Math.round(wartoscRozmiaru / 2)) : stylPodstawowy.rozmiarCzcionki,
    wyrownanie: pobierzWyrownanie(akapit),
  }
}

function czyAkapitNumerowany(akapit: Element) {
  return Boolean(akapit.getElementsByTagNameNS(nsW, 'numPr').length)
}

function czyPrzerwaStrony(akapit: Element) {
  return Array.from(akapit.getElementsByTagNameNS(nsW, 'br')).some((przerwa) => pobierzAtrybutW(przerwa, 'type') === 'page')
}

function utworzTekst(
  id: string,
  tekst: string,
  x: number,
  y: number,
  szerokosc: number,
  wysokosc: number,
  styl: StylTekstuDokumentu,
  status: ElementTekstowyDokumentu['status'] = 'staly',
): ElementTekstowyDokumentu {
  return {
    id,
    rodzaj: 'tekst',
    status,
    tekst,
    pozycja: {
      x,
      y,
      szerokosc,
      wysokosc,
    },
    styl,
    zIndex: 4,
  }
}

function utworzKsztalt(
  id: string,
  x: number,
  y: number,
  szerokosc: number,
  wysokosc: number,
  wypelnienie: string,
  status: ElementKsztaltuDokumentu['status'] = 'staly',
): ElementKsztaltuDokumentu {
  return {
    id,
    rodzaj: 'ksztalt',
    status,
    typKsztaltu: 'prostokat',
    rola: 'tlo_tytulu',
    wypelnienie,
    obramowanie: '1px solid #c7c7c7',
    promienZaokraglenia: 0,
    pozycja: {
      x,
      y,
      szerokosc,
      wysokosc,
    },
    zIndex: 1,
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
  rola: RolaGrafikiDokumentu,
  zasobId: string,
): ElementObrazuDokumentu {
  return {
    id,
    rodzaj: 'obraz',
    status: 'staly',
    nazwa,
    zrodlo,
    rola,
    zasobId,
    pozycja: {
      x,
      y,
      szerokosc,
      wysokosc,
    },
    zIndex: 2,
  }
}

function utworzKomorke(tekst: string, kolorTla?: string, wyrownanie: StylTekstuDokumentu['wyrownanie'] = 'srodek'): KomorkaTabeliDokumentu {
  return {
    tekst,
    rowSpan: 1,
    colSpan: 1,
    obramowanie: true,
    kolorTla,
    wyrownanie,
  }
}

function pobierzWierszeTabeli(tabela: Element) {
  return Array.from(tabela.getElementsByTagNameNS(nsW, 'tr')).map((wiersz) =>
    Array.from(wiersz.getElementsByTagNameNS(nsW, 'tc')).map((komorka) =>
      Array.from(komorka.getElementsByTagNameNS(nsW, 'p'))
        .map(tekstWezla)
        .filter(Boolean)
        .join(' '),
    ),
  )
}

function pobierzKomorkiTabeli(tabela: Element) {
  return Array.from(tabela.getElementsByTagNameNS(nsW, 'tr')).map((wiersz) =>
    Array.from(wiersz.getElementsByTagNameNS(nsW, 'tc')).map((komorka) => {
      const tekst = Array.from(komorka.getElementsByTagNameNS(nsW, 'p'))
        .map(tekstWezla)
        .filter(Boolean)
        .join(' ')
      const pierwszyAkapit = komorka.getElementsByTagNameNS(nsW, 'p')[0]

      return utworzKomorke(tekst, pobierzKolorCieniowania(komorka), pierwszyAkapit ? pobierzWyrownanie(pierwszyAkapit) : 'srodek')
    }),
  )
}

function pobierzDatyZWierszy(wiersze: string[][]) {
  const daty = wiersze
    .flatMap((wiersz) => wiersz)
    .flatMap((tekst) => tekst.match(wzorzecDatyWDokumencie) ?? [])

  return Array.from(new Set(daty)).slice(0, 5)
}

function policzKolumnyPodpisu(wiersze: string[][]) {
  const daty = pobierzDatyZWierszy(wiersze)
  const liczbaKolumnZTabeli = Math.max(...wiersze.map((wiersz) => Math.max(0, wiersz.length - 2)), 1)

  return Math.min(Math.max(daty.length || liczbaKolumnZTabeli || 1, 1), 5)
}

function odtworzWierszeListy(wiersze: string[][]) {
  const daty = pobierzDatyZWierszy(wiersze)
  const liczbaKolumnPodpisu = policzKolumnyPodpisu(wiersze)
  const wierszeDanych = wiersze.slice(2)
  const dane = wierszeDanych.length
    ? wierszeDanych.map((wiersz, indeks) => [
        `${indeks + 1}.`,
        wiersz[1] ?? '',
        ...Array.from({ length: liczbaKolumnPodpisu }, (_, indeksKolumny) => wiersz[indeksKolumny + 2] ?? ''),
      ])
    : Array.from({ length: 20 }, (_, indeks) => [`${indeks + 1}.`, '', ...Array.from({ length: liczbaKolumnPodpisu }, () => '')])

  return {
    liczbaKolumnPodpisu,
    trybListy: dane.some((wiersz) => wiersz[1]?.trim()) ? 'wypelniona' as const : 'pusta' as const,
    naglowek: [
      ['Lp.', 'Imię i nazwisko uczestnika:', ...Array.from({ length: liczbaKolumnPodpisu }, () => 'Podpis uczestnika:')],
      ['', '', ...Array.from({ length: liczbaKolumnPodpisu }, (_, indeks) => daty[indeks] ?? '')],
    ],
    dane,
  }
}

function podzielWierszeNaStrony(wiersze: string[][], liczbaKolumnPodpisu: number) {
  const limitPierwszejStrony = liczbaKolumnPodpisu > 3 ? 16 : 20
  const limitKolejnejStrony = liczbaKolumnPodpisu > 3 ? 22 : 26
  const strony: string[][][] = []
  let indeks = 0
  let limit = limitPierwszejStrony

  while (indeks < wiersze.length) {
    strony.push(wiersze.slice(indeks, indeks + limit))
    indeks += limit
    limit = limitKolejnejStrony
  }

  return strony.length ? strony : [[]]
}

function utworzKolumnyTabeli(liczbaKolumn: number, czyLista = false) {
  if (czyLista && liczbaKolumn >= 3) {
    const szerokoscPodpisu = 50 / Math.max(1, liczbaKolumn - 2)

    return [
      { szerokosc: 7 },
      { szerokosc: 43 },
      ...Array.from({ length: liczbaKolumn - 2 }, () => ({ szerokosc: szerokoscPodpisu })),
    ]
  }

  return Array.from({ length: Math.max(1, liczbaKolumn) }, () => ({ szerokosc: 100 / Math.max(1, liczbaKolumn) }))
}

function utworzTabeleListy(id: string, y: number, wiersze: string[][], liczbaKolumnPodpisu: number): ElementTabeliDokumentu {
  const wysokoscWiersza = liczbaKolumnPodpisu > 3 ? 6.4 : 7
  const wysokosc = Math.min(245, wiersze.length * wysokoscWiersza)
  const ostrzezenia = y + wysokosc > 297 ? ['Tabela wychodzi poza stronę i wymaga podziału albo korekty układu.'] : []

  return {
    id,
    rodzaj: 'tabela',
    status: 'staly',
    komorki: wiersze.map((wiersz) => wiersz.map((komorka) => utworzKomorke(komorka))),
    kolumny: utworzKolumnyTabeli(2 + liczbaKolumnPodpisu, true),
    wiersze: wiersze.map(() => ({ wysokosc: wysokoscWiersza })),
    powtorzNaglowek: true,
    liczbaKolumnPodpisu,
    ostrzezenia,
    pozycja: {
      x: 12,
      y,
      szerokosc: 186,
      wysokosc,
    },
    styl: {
      ...stylPodstawowy,
      rozmiarCzcionki: liczbaKolumnPodpisu > 3 ? 7 : 8,
      wyrownanie: 'srodek',
    },
    zIndex: 3,
  }
}

function utworzTabeleZXml(id: string, y: number, tabela: Element): ElementTabeliDokumentu {
  const komorki = pobierzKomorkiTabeli(tabela)
  const liczbaKolumn = Math.max(...komorki.map((wiersz) => wiersz.length), 1)
  const wysokoscWiersza = 8
  const wysokosc = Math.max(12, komorki.length * wysokoscWiersza)

  return {
    id,
    rodzaj: 'tabela',
    status: 'staly',
    komorki,
    kolumny: utworzKolumnyTabeli(liczbaKolumn),
    wiersze: komorki.map(() => ({ wysokosc: wysokoscWiersza })),
    powtorzNaglowek: true,
    pozycja: {
      x: 17,
      y,
      szerokosc: 176,
      wysokosc,
    },
    styl: {
      ...stylPodstawowy,
      rozmiarCzcionki: 8,
    },
    ostrzezenia: y + wysokosc > 297 ? ['Tabela wychodzi poza stronę i wymaga ręcznego podziału.'] : [],
    zIndex: 3,
  }
}

function utworzZasob(id: string, nazwa: string, zrodlo: string, typ: RolaGrafikiDokumentu): ZasobDokumentu {
  return {
    id,
    nazwa,
    typ,
    zrodlo,
    typMime: mimeZPliku(nazwa),
  }
}

function utworzStronyListyObecnosci(
  teksty: string[],
  obrazNaglowka: GrafikaDocx | undefined,
  obrazBody: GrafikaDocx | undefined,
  wierszeTabeli: string[][],
) {
  const instrukcja = teksty.find((tekst) => tekst.includes('CZYTELNIE')) ?? 'Imię i nazwisko prosimy wpisać CZYTELNIE DRUKOWANYMI literami.'
  const { naglowek, dane, liczbaKolumnPodpisu, trybListy } = odtworzWierszeListy(wierszeTabeli)
  const daneNaStronach = podzielWierszeNaStrony(dane, liczbaKolumnPodpisu)
  const ustawieniaListy: UstawieniaListyObecnosci = {
    trybListy,
    orientacja: liczbaKolumnPodpisu > 3 ? 'automatyczna' : 'pionowa',
    pokazLogotypyProjektowe: Boolean(obrazNaglowka),
    liczbaKolumnPodpisu,
  }

  const strony = daneNaStronach.map((wiersze, indeksStrony) => {
    const elementy: ElementDokumentu[] = []
    const czyPierwszaStrona = indeksStrony === 0

    if (czyPierwszaStrona && obrazNaglowka) {
      elementy.push(utworzObraz('naglowek-logo', 'Logotypy nagłówka', obrazNaglowka.zrodlo, 20, 12, 170, 18, 'logotyp_projektowy', obrazNaglowka.id))
    }

    if (czyPierwszaStrona && obrazBody) {
      elementy.push(utworzObraz('logo-organizatora', 'Logotyp organizatora', obrazBody.zrodlo, 18, 49, 47, 20, 'logo', obrazBody.id))
    }

    if (czyPierwszaStrona) {
      elementy.push(utworzTekst('tytul-listy', teksty[0] ?? 'Lista obecności', 82, 45, 80, 7, stylTytulu))
      elementy.push(utworzTekst('tytul-szkolenia', teksty[1] ?? '"Tytuł szkolenia"', 82, 53, 80, 7, stylCzerwony))
      elementy.push(utworzTekst('miejsce-data', teksty[2] ?? '', 74, 63, 100, 6, { ...stylPodstawowy, rozmiarCzcionki: 9, wyrownanie: 'srodek' }))
    }

    elementy.push(
      utworzTekst(
        `instrukcja-gora-${indeksStrony + 1}`,
        instrukcja,
        22,
        czyPierwszaStrona ? 78 : 12,
        166,
        6,
        stylInstrukcji,
      ),
    )
    elementy.push(utworzTabeleListy(`tabela-${indeksStrony + 1}`, czyPierwszaStrona ? 91 : 24, [...naglowek, ...wiersze], liczbaKolumnPodpisu))
    elementy.push(utworzTekst(`instrukcja-dol-${indeksStrony + 1}`, instrukcja, 22, 281, 166, 6, stylInstrukcji))

    return {
      id: `strona-${indeksStrony + 1}`,
      numer: indeksStrony + 1,
      format: 'A4' as const,
      jednostka: 'mm' as const,
      szerokoscMm: 210,
      wysokoscMm: 297,
      elementy,
    }
  })

  return {
    strony,
    ustawieniaListy,
  }
}

async function wczytajCzesci(
  zip: ZipDocx,
  relacjeDokumentu: Map<string, RelacjaDocx>,
  typ: 'header' | 'footer',
) {
  const sciezki = new Set<string>()

  relacjeDokumentu.forEach((relacja) => {
    if (relacja.typ.includes(`/${typ}`) && relacja.cel) {
      sciezki.add(relacja.cel)
    }
  })

  for (let indeks = 1; indeks <= 5; indeks++) {
    const sciezka = `word/${typ}${indeks}.xml`
    const xml = await zip.tekst(sciezka)

    if (xml) {
      sciezki.add(sciezka)
    }
  }

  const czesci: CzescDocx[] = []

  for (const sciezka of sciezki) {
    const xml = await zip.tekst(sciezka)

    if (!xml) {
      continue
    }

    czesci.push({
      sciezka,
      dokument: new DOMParser().parseFromString(xml, 'application/xml'),
      relacje: czytajRelacje(await zip.tekst(sciezkaRelacjiDlaCzesci(sciezka)), katalogCzesci(sciezka)),
    })
  }

  return czesci
}

async function pobierzGrafikiCzesci(zip: ZipDocx, czesci: CzescDocx[], rola: RolaGrafikiDokumentu) {
  const grafiki: GrafikaDocx[] = []

  for (const czesc of czesci) {
    grafiki.push(...await pobierzObrazyZWezla(zip, czesc.dokument.documentElement, czesc.relacje, rola))
  }

  return grafiki
}

function pobierzTekstyCzesci(czesci: CzescDocx[]) {
  return czesci
    .flatMap((czesc) => Array.from(czesc.dokument.getElementsByTagNameNS(nsW, 'p')).map(tekstAkapitu))
    .map((tekst) => tekst.trim())
    .filter(Boolean)
}

function dodajZasob(zrodloZasobow: Map<string, ZasobDokumentu>, grafika: GrafikaDocx) {
  if (!zrodloZasobow.has(grafika.id)) {
    zrodloZasobow.set(grafika.id, utworzZasob(grafika.id, grafika.nazwa, grafika.zrodlo, grafika.rola))
  }
}

function utworzElementyNaglowka(numerStrony: number, tekstyNaglowka: string[], grafikiNaglowka: GrafikaDocx[], zasoby: Map<string, ZasobDokumentu>) {
  const elementy: ElementDokumentu[] = []

  grafikiNaglowka.slice(0, 2).forEach((grafika, indeks) => {
    dodajZasob(zasoby, grafika)
    elementy.push(utworzObraz(`naglowek-${numerStrony}-${indeks + 1}`, grafika.nazwa, grafika.zrodlo, 18 + indeks * 92, 9, indeks === 0 ? 82 : 74, 16, grafika.rola, grafika.id))
  })

  tekstyNaglowka.slice(0, 2).forEach((tekst, indeks) => {
    elementy.push(utworzTekst(`naglowek-tekst-${numerStrony}-${indeks + 1}`, tekst, 18, 8 + indeks * 6, 174, 5, { ...stylPodstawowy, rozmiarCzcionki: 8, wyrownanie: 'srodek' }))
  })

  return elementy
}

function utworzElementyStopki(numerStrony: number, tekstyStopki: string[], grafikiStopki: GrafikaDocx[], zasoby: Map<string, ZasobDokumentu>) {
  const elementy: ElementDokumentu[] = []

  grafikiStopki.slice(0, 1).forEach((grafika, indeks) => {
    dodajZasob(zasoby, grafika)
    elementy.push(utworzObraz(`stopka-${numerStrony}-${indeks + 1}`, grafika.nazwa, grafika.zrodlo, 18, 276, 174, 12, grafika.rola, grafika.id))
  })

  tekstyStopki.slice(0, 2).forEach((tekst, indeks) => {
    elementy.push(utworzTekst(`stopka-tekst-${numerStrony}-${indeks + 1}`, tekst, 18, 278 + indeks * 5, 174, 5, { ...stylPodstawowy, rozmiarCzcionki: 7, kolor: '#4b5563', wyrownanie: 'srodek' }))
  })

  return elementy
}

async function renderujAkapitHtml(zip: ZipDocx, akapit: Element, relacje: Map<string, RelacjaDocx>) {
  const runy = Array.from(akapit.getElementsByTagNameNS(nsW, 'r'))
  const fragmentyTekstu = runy
    .map((run) => {
      const tekst = Array.from(run.getElementsByTagNameNS(nsW, 't')).map((wezel) => wezel.textContent ?? '').join('')

      if (!tekst) {
        return ''
      }

      const styl = pobierzStylRunu(run, akapit)
      const style = [
        `font-size:${styl.rozmiarCzcionki}pt`,
        `color:${styl.kolor}`,
        styl.pogrubienie ? 'font-weight:700' : '',
        styl.kursywa ? 'font-style:italic' : '',
        styl.podkreslenie ? 'text-decoration:underline' : '',
      ].filter(Boolean).join(';')

      return `<span style="${style}">${ucieczHtml(tekst)}</span>`
    })
    .join('')
  const obrazy = await pobierzObrazyZWezla(zip, akapit, relacje, 'dekoracja')
  const htmlObrazow = obrazy.map((obraz) => `<img alt="${ucieczHtml(obraz.nazwa)}" src="${obraz.zrodlo}" />`).join('')
  const wypelnienie = pobierzKolorCieniowania(akapit)
  const wyrownanie = pobierzWyrownanie(akapit)
  const style = [
    `text-align:${wyrownanie === 'srodek' ? 'center' : wyrownanie === 'prawo' ? 'right' : wyrownanie === 'wyjustuj' ? 'justify' : 'left'}`,
    wypelnienie ? `background:${wypelnienie}` : '',
  ].filter(Boolean).join(';')

  return `<p style="${style}">${fragmentyTekstu || ucieczHtml(tekstAkapitu(akapit))}${htmlObrazow}</p>`
}

async function renderujTabeleHtml(tabela: Element) {
  const wiersze = pobierzKomorkiTabeli(tabela)

  return `<table>${wiersze.map((wiersz) => `<tr>${wiersz.map((komorka) => `<td style="${komorka.kolorTla ? `background:${komorka.kolorTla};` : ''}text-align:${komorka.wyrownanie === 'prawo' ? 'right' : komorka.wyrownanie === 'lewo' ? 'left' : 'center'}">${ucieczHtml(komorka.tekst)}</td>`).join('')}</tr>`).join('')}</table>`
}

async function renderujCzescHtml(zip: ZipDocx, czesc: CzescDocx) {
  const body = czesc.dokument.getElementsByTagNameNS(nsW, 'body')[0] ?? czesc.dokument.documentElement
  const fragmenty: string[] = []

  for (const dziecko of Array.from(body.children)) {
    if (dziecko.localName === 'p') {
      fragmenty.push(await renderujAkapitHtml(zip, dziecko, czesc.relacje))
    }

    if (dziecko.localName === 'tbl') {
      fragmenty.push(await renderujTabeleHtml(dziecko))
    }
  }

  return fragmenty.join('')
}

async function utworzPodgladHtml(zip: ZipDocx, dokument: Document, relacje: Map<string, RelacjaDocx>, naglowki: CzescDocx[], stopki: CzescDocx[]) {
  const body = dokument.getElementsByTagNameNS(nsW, 'body')[0]
  const glownaCzesc: CzescDocx = {
    sciezka: 'word/document.xml',
    dokument,
    relacje,
  }
  const htmlNaglowkow = (await Promise.all(naglowki.map((czesc) => renderujCzescHtml(zip, czesc)))).join('')
  const htmlStopki = (await Promise.all(stopki.map((czesc) => renderujCzescHtml(zip, czesc)))).join('')
  const htmlBody = body ? await renderujCzescHtml(zip, glownaCzesc) : ''

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<style>
body{margin:0;background:#f1f5f9;color:#111827;font-family:Calibri,Arial,sans-serif}
.strona{box-sizing:border-box;width:210mm;min-height:297mm;margin:0 auto 16px;padding:16mm 14mm;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.18)}
.naglowek,.stopka{font-size:8pt;color:#475569;text-align:center}
p{margin:0 0 6pt;line-height:1.25}
img{max-width:100%;max-height:30mm;object-fit:contain}
table{width:100%;border-collapse:collapse;margin:6pt 0;font-size:8pt}
td{border:1px solid #9ca3af;padding:3pt;vertical-align:middle}
</style>
</head>
<body>
<main class="strona">
<section class="naglowek">${htmlNaglowkow}</section>
${htmlBody}
<section class="stopka">${htmlStopki}</section>
</main>
</body>
</html>`
}

function utworzStrone(
  numer: number,
  tekstyNaglowka: string[],
  grafikiNaglowka: GrafikaDocx[],
  tekstyStopki: string[],
  grafikiStopki: GrafikaDocx[],
  zasoby: Map<string, ZasobDokumentu>,
) {
  return {
    id: `strona-${numer}`,
    numer,
    format: 'A4' as const,
    jednostka: 'mm' as const,
    szerokoscMm: 210,
    wysokoscMm: 297,
    elementy: [
      ...utworzElementyNaglowka(numer, tekstyNaglowka, grafikiNaglowka, zasoby),
      ...utworzElementyStopki(numer, tekstyStopki, grafikiStopki, zasoby),
    ],
  }
}

async function utworzStronyOgolne(
  zip: ZipDocx,
  body: Element,
  relacje: Map<string, RelacjaDocx>,
  tekstyNaglowka: string[],
  grafikiNaglowka: GrafikaDocx[],
  tekstyStopki: string[],
  grafikiStopki: GrafikaDocx[],
  zasoby: Map<string, ZasobDokumentu>,
) {
  const strony = [utworzStrone(1, tekstyNaglowka, grafikiNaglowka, tekstyStopki, grafikiStopki, zasoby)]
  let y = grafikiNaglowka.length || tekstyNaglowka.length ? 32 : 20
  let licznikElementow = 1
  let licznikNumeracji = 1
  let poprzedniBylNaglowkiemProgramu = false

  function obecnaStrona() {
    return strony[strony.length - 1]
  }

  function dodajStrone() {
    strony.push(utworzStrone(strony.length + 1, tekstyNaglowka, grafikiNaglowka, tekstyStopki, grafikiStopki, zasoby))
    y = grafikiNaglowka.length || tekstyNaglowka.length ? 32 : 20
    poprzedniBylNaglowkiemProgramu = false
  }

  for (const dziecko of Array.from(body.children)) {
    if (dziecko.localName === 'p') {
      const tekstSurowy = tekstAkapitu(dziecko)
      const obrazy = await pobierzObrazyZWezla(zip, dziecko, relacje, 'dekoracja')

      for (const obraz of obrazy) {
        if (y + 24 > 272) {
          dodajStrone()
        }

        dodajZasob(zasoby, obraz)
        obecnaStrona().elementy.push(utworzObraz(`obraz-${licznikElementow++}`, obraz.nazwa, obraz.zrodlo, 20, y, 170, 22, obraz.rola, obraz.id))
        y += 26
      }

      if (tekstSurowy) {
        const pierwszyRun = dziecko.getElementsByTagNameNS(nsW, 'r')[0]
        const czyNumerowany = czyAkapitNumerowany(dziecko)
        const tekst = czyNumerowany && !/^\d+[.)]\s+/.test(tekstSurowy) ? `${licznikNumeracji++}. ${tekstSurowy}` : tekstSurowy
        const tekstNormalny = normalizuj(tekst)
        const czyNaglowekProgramu = tekstNormalny.includes('program szkolenia')
        const czyTytulPoProgramie = poprzedniBylNaglowkiemProgramu && tekst.length > 6 && !/^\d+[.)]\s+/.test(tekst)
        const wysokosc = Math.max(6, Math.ceil(tekst.length / 78) * 5)
        const wypelnienie = pobierzKolorCieniowania(dziecko)

        if (y + wysokosc > 272) {
          dodajStrone()
        }

        if (wypelnienie || czyTytulPoProgramie) {
          obecnaStrona().elementy.push(utworzKsztalt(`ksztalt-${licznikElementow++}`, 18, y - 2, 174, wysokosc + 4, wypelnienie || '#d9d9d9', wypelnienie ? 'staly' : 'niepewny'))
        }

        obecnaStrona().elementy.push(
          utworzTekst(
            `tekst-${licznikElementow++}`,
            tekst,
            20,
            y,
            170,
            wysokosc,
            czyNaglowekProgramu
              ? { ...stylCzerwony, rozmiarCzcionki: Math.max(12, pobierzStylRunu(pierwszyRun, dziecko).rozmiarCzcionki), wyrownanie: 'srodek' }
              : pobierzStylRunu(pierwszyRun, dziecko),
            wypelnienie || czyTytulPoProgramie ? 'niepewny' : 'staly',
          ),
        )
        y += wysokosc + 3
        poprzedniBylNaglowkiemProgramu = czyNaglowekProgramu
      }

      if (czyPrzerwaStrony(dziecko)) {
        dodajStrone()
      }
    }

    if (dziecko.localName === 'tbl') {
      const tabela = utworzTabeleZXml(`tabela-${licznikElementow++}`, y, dziecko)

      if (y + tabela.pozycja.wysokosc > 272 && y > 40) {
        dodajStrone()
        tabela.pozycja.y = y
      }

      obecnaStrona().elementy.push(tabela)
      y += tabela.pozycja.wysokosc + 6
      poprzedniBylNaglowkiemProgramu = false
    }
  }

  return strony
}

export async function importujDokumentDocx(plik: File): Promise<DokumentPomagiera> {
  const zip = await czytajZip(await plik.arrayBuffer())
  const xml = await zip.tekst('word/document.xml')
  const dokumentXml = new DOMParser().parseFromString(xml, 'application/xml')
  const body = dokumentXml.getElementsByTagNameNS(nsW, 'body')[0]
  const relacje = czytajRelacje(await zip.tekst('word/_rels/document.xml.rels'), 'word')
  const naglowki = await wczytajCzesci(zip, relacje, 'header')
  const stopki = await wczytajCzesci(zip, relacje, 'footer')
  const grafikiNaglowka = await pobierzGrafikiCzesci(zip, naglowki, 'logotyp_projektowy')
  const grafikiStopki = await pobierzGrafikiCzesci(zip, stopki, 'logo')
  const tekstyNaglowka = pobierzTekstyCzesci(naglowki)
  const tekstyStopki = pobierzTekstyCzesci(stopki)
  const teksty: string[] = []
  const tabele: Element[] = []
  const grafikiBody: GrafikaDocx[] = []
  const zasoby = new Map<string, ZasobDokumentu>()

  if (!body) {
    throw new Error('DOCX nie zawiera word/document.xml z treścią dokumentu.')
  }

  for (const dziecko of Array.from(body.children)) {
    if (dziecko.localName === 'p') {
      const tekst = tekstAkapitu(dziecko)

      if (tekst) {
        teksty.push(tekst)
      }

      grafikiBody.push(...await pobierzObrazyZWezla(zip, dziecko, relacje, 'dekoracja'))
    }

    if (dziecko.localName === 'tbl') {
      tabele.push(dziecko)
      teksty.push(...pobierzWierszeTabeli(dziecko).flat().filter(Boolean))
    }
  }

  const tekstZrodlowy = [
    ...tekstyNaglowka,
    ...teksty,
    ...tekstyStopki,
  ].join('\n')
  const typDokumentu = rozpoznajTypDokumentu(tekstZrodlowy)
  const podgladHtml = await utworzPodgladHtml(zip, dokumentXml, relacje, naglowki, stopki)

  grafikiNaglowka.forEach((grafika) => dodajZasob(zasoby, grafika))
  grafikiStopki.forEach((grafika) => dodajZasob(zasoby, grafika))
  grafikiBody.forEach((grafika) => dodajZasob(zasoby, grafika))

  const wynikListy = typDokumentu === 'lista_obecnosci' && tabele[0]
    ? utworzStronyListyObecnosci(teksty, grafikiNaglowka[0], grafikiBody[0], pobierzWierszeTabeli(tabele[0]))
    : null
  const strony = wynikListy
    ? wynikListy.strony
    : await utworzStronyOgolne(zip, body, relacje, tekstyNaglowka, grafikiNaglowka, tekstyStopki, grafikiStopki, zasoby)
  const ostrzezenia = [
    ...(wynikListy?.ustawieniaListy.liczbaKolumnPodpisu && wynikListy.ustawieniaListy.liczbaKolumnPodpisu > 3
      ? ['Dla 4-5 dni sugerowany jest układ poziomy albo ręczna korekta szerokości kolumn podpisu.']
      : []),
    ...(typDokumentu === 'program_szkolenia' && strony.flatMap((strona) => strona.elementy).every((element) => element.rodzaj !== 'ksztalt')
      ? ['Nie wykryto jawnego cieniowania tytułu w DOCX. Pasek tytułu może wymagać ręcznej korekty.']
      : []),
  ]

  const dokument: DokumentPomagiera = {
    id: utworzIdZPliku(plik.name),
    nazwa: plik.name.replace(/\.[^.]+$/, ''),
    zrodlo: {
      typ: 'docx',
      nazwaPliku: plik.name,
      typMime: plik.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      podgladOryginalu: URL.createObjectURL(plik),
      podgladHtml,
    },
    strony,
    zasoby: Array.from(zasoby.values()),
    style: {
      domyslnyTekst: stylPodstawowy,
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
      ustawieniaListyObecnosci: wynikListy?.ustawieniaListy,
      ostrzezenia,
    },
  }

  return uzupelnijAnalizeDokumentu(dokument, tekstZrodlowy)
}
