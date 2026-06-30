import { parsujMaile } from '../parsery/parserMaili'
import { parsujNumeryTelefonu } from '../parsery/parserNumerowTelefonu'
import type {
  DaneWyekstrahowaneDokumentu,
  DokumentPomagiera,
  ElementDokumentu,
  ElementTabeliDokumentu,
  ElementTekstowyDokumentu,
  PoleDynamiczneDokumentu,
  RaportImportuDokumentu,
  RodzajDanychWyekstrahowanych,
  TypRozpoznanegoDokumentu,
  TypZrodlaDokumentu,
} from './typyDokumentu'

const wzorzecDatyGlobalny = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/g
const wzorzecDaty = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/
const wzorzecPunktuProgramu = /^(?:\d+[.)]|[ivxlcdm]+[.)])\s+/i

function normalizuj(tekst: string) {
  return tekst
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function pobierzElementyDokumentu(elementy: ElementDokumentu[]): ElementDokumentu[] {
  return elementy.flatMap((element) => (element.rodzaj === 'blok' ? [element, ...pobierzElementyDokumentu(element.elementy)] : [element]))
}

export function pobierzPelnyTekstDokumentu(dokument: DokumentPomagiera) {
  const teksty = dokument.strony.flatMap((strona) =>
    pobierzElementyDokumentu(strona.elementy).flatMap((element) => {
      if (element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka') {
        return element.tekst
      }

      if (element.rodzaj === 'tabela') {
        return element.komorki.flatMap((wiersz) => wiersz.map((komorka) => komorka.tekst)).join(' ')
      }

      return []
    }),
  )

  return teksty.join('\n')
}

function czyZawieraWszystkie(tekst: string, frazy: string[]) {
  return frazy.every((fraza) => tekst.includes(normalizuj(fraza)))
}

export function rozpoznajTypDokumentu(tekstZrodlowy: string): TypRozpoznanegoDokumentu | undefined {
  const tekst = normalizuj(tekstZrodlowy)

  if (czyZawieraWszystkie(tekst, ['Lista obecności', 'Lp.', 'Imię i nazwisko', 'Podpis uczestnika'])) {
    return 'lista_obecnosci'
  }

  if (czyZawieraWszystkie(tekst, ['Ankieta ewaluacyjna', 'PYTANIA/OCENA', 'bardzo dobrze', 'do udoskonalenia'])) {
    return 'ankieta_ewaluacyjna'
  }

  if (czyZawieraWszystkie(tekst, ['CERTYFIKAT', 'Nr z rejestru']) && tekst.includes('ukonczyl/a szkolenie')) {
    return 'certyfikat'
  }

  if (tekst.includes('program szkolenia') && tekstZrodlowy.split('\n').some((wiersz) => wzorzecPunktuProgramu.test(wiersz.trim()))) {
    return 'program_szkolenia'
  }

  if (tekst.includes('ekspert merytoryczny') && (tekst.includes('opiekun') || tekst.includes('kontakt')) && (tekst.includes('ramka') || tekst.includes('ramce') || tekst.includes('tytul'))) {
    return 'karta_na_drzwi'
  }

  if (tekst.includes('qr') && tekst.includes('material') && (tekst.includes('stopka prawna') || tekst.includes('prezentacyjny'))) {
    return 'okladka_materialow'
  }

  return undefined
}

function utworzDane(
  rodzaj: RodzajDanychWyekstrahowanych,
  wartosc: string,
  indeks: number,
  zrodlo: TypZrodlaDokumentu,
): DaneWyekstrahowaneDokumentu {
  return {
    id: `${rodzaj}-${indeks + 1}`,
    rodzaj,
    etykieta: rodzaj === 'wartosc_csv' ? 'Wartość CSV' : rodzaj,
    wartosc,
    status: 'do_zatwierdzenia',
    zrodlo,
  }
}

function czyWierszUczestnika(wiersz: string) {
  const tekst = normalizuj(wiersz)
  const czyInstrukcja = tekst.includes('czytelnie drukowanymi') || tekst.includes('imie i nazwisko prosimy')
  const czyPunktProgramu = wzorzecPunktuProgramu.test(wiersz.trim()) || /^[a-z][.)]\s+/.test(wiersz.trim())
  const czyNowaSekcja = wiersz.includes(':')
  const czyImieNazwisko = /^[\p{L}'-]+(?:\s+[\p{L}'-]+){1,3}$/u.test(wiersz)

  return czyImieNazwisko && !czyInstrukcja && !czyPunktProgramu && !czyNowaSekcja
}

function pobierzUczestnikowZTekstu(tekst: string) {
  if (rozpoznajTypDokumentu(tekst) === 'program_szkolenia') {
    return []
  }

  const wiersze = tekst
    .split('\n')
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
  const indeksSekcji = wiersze.findIndex((wiersz) => normalizuj(wiersz).startsWith('uczestnicy'))

  if (indeksSekcji === -1) {
    return []
  }

  return wiersze.slice(indeksSekcji + 1).filter(czyWierszUczestnika)
}

function pobierzPunktyProgramu(tekst: string) {
  if (rozpoznajTypDokumentu(tekst) !== 'program_szkolenia') {
    return []
  }

  return tekst
    .split('\n')
    .map((wiersz) => wiersz.trim())
    .filter((wiersz) => wzorzecPunktuProgramu.test(wiersz))
}

export function utworzDaneWyekstrahowane(tekstZrodlowy: string, zrodlo: TypZrodlaDokumentu): DaneWyekstrahowaneDokumentu[] {
  const maile = parsujMaile(tekstZrodlowy).map((wartosc, indeks) => utworzDane('email', wartosc, indeks, zrodlo))
  const telefony = parsujNumeryTelefonu(tekstZrodlowy).map((wartosc, indeks) => utworzDane('telefon', wartosc, indeks, zrodlo))
  const daty = Array.from(new Set(tekstZrodlowy.match(wzorzecDatyGlobalny) ?? [])).map((wartosc, indeks) => utworzDane('data', wartosc, indeks, zrodlo))
  const uczestnicy = pobierzUczestnikowZTekstu(tekstZrodlowy).map((wartosc, indeks) => utworzDane('uczestnik', wartosc, indeks, zrodlo))
  const punktyProgramu = pobierzPunktyProgramu(tekstZrodlowy).map((wartosc, indeks) => ({
    ...utworzDane('tekst', wartosc, indeks, zrodlo),
    id: `punkt-programu-${indeks + 1}`,
    etykieta: 'szkolenie.program.punkty[]',
  }))

  return [...maile, ...telefony, ...daty, ...uczestnicy, ...punktyProgramu]
}

export function utworzDaneZCsv(tekstCsv: string): DaneWyekstrahowaneDokumentu[] {
  const wiersze = tekstCsv
    .split(/\r?\n/)
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
  const naglowki = (wiersze[0] ?? '').split(/[;,]/).map((wartosc) => wartosc.trim())

  return wiersze.slice(1).flatMap((wiersz, indeksWiersza) =>
    wiersz.split(/[;,]/).map((wartosc, indeksKolumny) => ({
      id: `csv-${indeksWiersza + 1}-${indeksKolumny + 1}`,
      rodzaj: 'wartosc_csv' as const,
      etykieta: naglowki[indeksKolumny] || `Kolumna ${indeksKolumny + 1}`,
      wartosc: wartosc.trim(),
      status: 'do_zatwierdzenia' as const,
      zrodlo: 'csv' as const,
    })),
  )
}

function utworzPole(
  element: ElementTekstowyDokumentu,
  nazwa: string,
  etykieta: string,
): PoleDynamiczneDokumentu {
  return {
    id: `pole-${element.id}-${nazwa.replace(/[^a-z0-9_.-]/gi, '-')}`,
    nazwa,
    etykieta,
    elementId: element.id,
    status: 'propozycja',
    wartoscPrzykladowa: `{{${nazwa}}}`,
    wartoscZrodlowa: element.tekst,
    pozycja: element.pozycja,
  }
}

function znajdzElementTytuluSzkolenia(elementy: ElementTekstowyDokumentu[]) {
  const indeksProgramu = elementy.findIndex((element) => normalizuj(element.tekst).includes('program szkolenia'))

  if (indeksProgramu === -1) {
    return undefined
  }

  return elementy.slice(indeksProgramu + 1).find((element) => {
    const tekst = element.tekst.trim()

    return tekst.length > 6 && !wzorzecPunktuProgramu.test(tekst) && !wzorzecDaty.test(tekst)
  })
}

export function zaproponujPolaDynamiczne(dokument: DokumentPomagiera): PoleDynamiczneDokumentu[] {
  const pola: PoleDynamiczneDokumentu[] = []
  const elementy = dokument.strony.flatMap((strona) => pobierzElementyDokumentu(strona.elementy))
  const elementyTekstowe = elementy.filter(
    (element): element is ElementTekstowyDokumentu => element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka',
  )
  const typDokumentu = rozpoznajTypDokumentu(pobierzPelnyTekstDokumentu(dokument))
  const elementTytuluProgramu = typDokumentu === 'program_szkolenia' ? znajdzElementTytuluSzkolenia(elementyTekstowe) : undefined

  elementyTekstowe.forEach((element) => {
    const tekst = normalizuj(element.tekst)

    if (elementTytuluProgramu?.id === element.id || tekst.includes('tytul szkolenia') || tekst.includes('szkolenie:')) {
      pola.push(utworzPole(element, 'szkolenie.tytul', 'Tytuł szkolenia'))
    }

    if (tekst.includes('miejsce')) {
      pola.push(utworzPole(element, 'szkolenie.miejsce', 'Miejsce szkolenia'))
    }

    if (wzorzecDaty.test(element.tekst) || tekst.includes('data')) {
      pola.push(utworzPole(element, 'szkolenie.data', 'Data szkolenia'))
    }

    if (tekst.includes('uczestnik') || tekst.includes('imie i nazwisko')) {
      pola.push(utworzPole(element, 'uczestnik.imie_nazwisko', 'Imię i nazwisko uczestnika'))
    }

    if (tekst.includes('nr z rejestru')) {
      pola.push(utworzPole(element, 'certyfikat.nr_rejestru', 'Numer rejestru'))
    }

    if (wzorzecPunktuProgramu.test(element.tekst.trim())) {
      pola.push(utworzPole(element, 'szkolenie.program.punkty[]', 'Punkt programu szkolenia'))
    }
  })

  const unikalne = new Map<string, PoleDynamiczneDokumentu>()
  pola.forEach((pole) => unikalne.set(`${pole.elementId}-${pole.nazwa}`, pole))

  return Array.from(unikalne.values())
}

function policzTabeleWychodzacePozaStrone(dokument: DokumentPomagiera, tabele: ElementTabeliDokumentu[]) {
  return tabele.filter((tabela) => {
    const strona = dokument.strony.find((obecnaStrona) => pobierzElementyDokumentu(obecnaStrona.elementy).some((element) => element.id === tabela.id))

    return Boolean(strona && tabela.pozycja.y + tabela.pozycja.wysokosc > strona.wysokoscMm)
  }).length
}

export function utworzRaportImportu(dokument: DokumentPomagiera): RaportImportuDokumentu {
  const elementy = dokument.strony.flatMap((strona) => pobierzElementyDokumentu(strona.elementy))
  const tabele = elementy.filter((element): element is ElementTabeliDokumentu => element.rodzaj === 'tabela')
  const tekst = pobierzPelnyTekstDokumentu(dokument)
  const ostrzezenia = [...dokument.metadane.ostrzezenia]
  const liczbaTabelPozaStrona = policzTabeleWychodzacePozaStrone(dokument, tabele)

  if (liczbaTabelPozaStrona > 0) {
    ostrzezenia.push('Tabela wychodzi poza obszar strony i wymaga korekty układu.')
  }

  tabele.forEach((tabela) => {
    tabela.ostrzezenia?.forEach((ostrzezenie) => ostrzezenia.push(ostrzezenie))
  })

  return {
    liczbaStron: dokument.strony.length,
    liczbaTekstow: elementy.filter((element) => element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka').length,
    liczbaObrazow: elementy.filter((element) => element.rodzaj === 'obraz').length,
    liczbaTabel: tabele.length,
    liczbaKsztaltow: elementy.filter((element) => element.rodzaj === 'ksztalt').length,
    liczbaCheckboxow: elementy.filter((element) => element.rodzaj === 'checkbox').length,
    liczbaPolDynamicznych: dokument.polaDynamiczne.length,
    liczbaNiepewnych: elementy.filter((element) => element.status === 'niepewny').length + dokument.metadane.daneWyekstrahowane.filter((dane) => dane.status === 'do_zatwierdzenia').length,
    mozliwyTypDokumentu: dokument.metadane.mozliwyTypDokumentu ?? rozpoznajTypDokumentu(tekst),
    ostrzezenia: Array.from(new Set(ostrzezenia)),
  }
}

export function uzupelnijAnalizeDokumentu(dokument: DokumentPomagiera, tekstZrodlowy = pobierzPelnyTekstDokumentu(dokument)): DokumentPomagiera {
  const mozliwyTypDokumentu = rozpoznajTypDokumentu(tekstZrodlowy)
  const propozycjePol = zaproponujPolaDynamiczne(dokument)
  const istniejacePola = new Map(dokument.polaDynamiczne.map((pole) => [`${pole.elementId}-${pole.nazwa}`, pole]))
  const polaDynamiczne = propozycjePol.map((pole) => istniejacePola.get(`${pole.elementId}-${pole.nazwa}`) ?? pole)
  const daneWyekstrahowane = dokument.metadane.daneWyekstrahowane.length
    ? dokument.metadane.daneWyekstrahowane
    : utworzDaneWyekstrahowane(tekstZrodlowy, dokument.zrodlo.typ)
  const dokumentZAnaliza: DokumentPomagiera = {
    ...dokument,
    polaDynamiczne,
    metadane: {
      ...dokument.metadane,
      emaile: parsujMaile(tekstZrodlowy),
      telefony: parsujNumeryTelefonu(tekstZrodlowy),
      mozliwyTypDokumentu,
      daneWyekstrahowane,
    },
  }

  return {
    ...dokumentZAnaliza,
    metadane: {
      ...dokumentZAnaliza.metadane,
      raportImportu: utworzRaportImportu(dokumentZAnaliza),
    },
  }
}
