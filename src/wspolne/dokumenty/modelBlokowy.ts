export type TypBlokuDokumentu =
  | 'Logotyp'
  | 'Tytul'
  | 'Dzien'
  | 'Modul'
  | 'Sekcja'
  | 'Punkt'
  | 'Podpunkt'
  | 'Akapit'
  | 'Tabela'
  | 'Obraz'
  | 'Separator'
  | 'Podpis'
  | 'Naglowek'
  | 'Stopka'
  | 'Numeracja'
  | 'PoleZmienne'
  | 'ElementNiepewny'
  | 'ElementNieobslugiwany'

export type StatusDiagnostycznyBloku = 'poprawny' | 'do_sprawdzenia' | 'blad'
export type PoziomProblemuDokumentu = 'blad_krytyczny' | 'ostrzezenie' | 'informacja'
export type KategoriaProblemuDokumentu =
  | 'struktura'
  | 'formatowanie'
  | 'brakujace_dane'
  | 'parser'
  | 'eksport'
  | 'zgodnosc_pdf_docx'

export type BezpiecznyStylBloku = {
  pogrubienie?: boolean
  kursywa?: boolean
  podkreslenie?: boolean
  rozmiarCzcionki?: 9 | 10 | 11 | 12 | 14 | 16 | 18 | 20 | 24
  interlinia?: 1 | 1.15 | 1.3 | 1.5
  wciecie?: number
}

export type MetadaneBlokuDokumentu = {
  zrodlo?: 'parser' | 'uzytkownik' | 'szablon' | 'import'
  indeksWiersza?: number
  opisDiagnostyczny?: string
  poziom?: number
}

export type BlokDokumentu = {
  id: string
  typ: TypBlokuDokumentu
  tresc?: string
  dane?: Record<string, string | number | boolean | null>
  dzieci: BlokDokumentu[]
  metadane: MetadaneBlokuDokumentu
  stylLokalny: BezpiecznyStylBloku
  statusDiagnostyczny: StatusDiagnostycznyBloku
}

export type DaneDokumentu = {
  uczestnik?: string
  klient?: string
  data?: string
  trener?: string
  tytulSzkolenia?: string
  miejsce?: string
  organizator?: 'SEMPER' | 'IIST' | 'klient'
  cena?: string
  numerDokumentu?: string
}

export type MarginesyStronyA4 = {
  goraMm: number
  prawoMm: number
  dolMm: number
  lewoMm: number
}

export type ModelStronyA4 = {
  format: 'A4'
  orientacja: 'pionowa' | 'pozioma'
  szerokoscMm: number
  wysokoscMm: number
  marginesy: MarginesyStronyA4
  obszarRoboczy: {
    xMm: number
    yMm: number
    szerokoscMm: number
    wysokoscMm: number
  }
  naglowek: {
    aktywny: boolean
    wysokoscMm: number
    organizator: 'SEMPER' | 'IIST' | 'klient'
  }
  stopka: {
    aktywna: boolean
    wysokoscMm: number
    organizator: 'SEMPER' | 'IIST' | 'klient'
  }
  logotyp: {
    aktywny: boolean
    zrodlo?: string
    szerokoscProcent: number
  }
  numeracjaStron: {
    aktywna: boolean
    format: '1' | '1_z_n' | 'strona_1_z_n'
  }
  lamanieStron: {
    unikajDzieleniaNaglowkow: boolean
    minimalnaLiczbaWierszyPoNaglowku: number
  }
  minimalneOdstepyOdKrawedziMm: number
  skalowaniePodgladu: number
  ustawieniaWydruku: {
    drukujTlo: boolean
  }
  ustawieniaEksportu: {
    pdfReferencyjny: boolean
    docxZTejSamejStruktury: boolean
  }
}

export type WygladDokumentu = {
  marginesy: MarginesyStronyA4
  styleBlokow: Partial<Record<TypBlokuDokumentu, BezpiecznyStylBloku>>
}

export type ProblemDokumentu = {
  id: string
  poziom: PoziomProblemuDokumentu
  kategoria: KategoriaProblemuDokumentu
  komunikat: string
  blokId?: string
  czyBlokujeEksport: boolean
}

export type RaportEksportuDokumentu = {
  format: 'PDF' | 'DOCX'
  czyDozwolony: boolean
  wymagaPotwierdzeniaArchitekta: boolean
  roznicePdfDocx: string[]
  problemy: ProblemDokumentu[]
}

export type StatusSzablonuBlokowego = 'Roboczy' | 'Aktywny' | 'Archiwalny'

export type SzablonBlokowyDokumentu = {
  id: string
  nazwa: string
  wersja: number
  status: StatusSzablonuBlokowego
  organizator: 'SEMPER' | 'IIST' | 'klient'
  strona: ModelStronyA4
  wyglad: WygladDokumentu
  ustawieniaEksportu: ModelStronyA4['ustawieniaEksportu']
  problemyWalidacji: ProblemDokumentu[]
}

export type DokumentBlokowy = {
  id: string
  typ: 'program_szkolenia' | 'dyplom' | 'lista_obecnosci' | 'inny'
  dane: DaneDokumentu
  struktura: BlokDokumentu[]
  strona: ModelStronyA4
  wyglad: WygladDokumentu
  problemy: ProblemDokumentu[]
  raportyEksportu: RaportEksportuDokumentu[]
  metadane: {
    wersjaModelu: number
    zrodlo: 'parser' | 'uzytkownik' | 'szablon' | 'import'
    zatwierdzonyPrzezUzytkownika: boolean
  }
}

export function utworzModelStronyA4(organizator: 'SEMPER' | 'IIST' | 'klient', logotyp?: string): ModelStronyA4 {
  const marginesy: MarginesyStronyA4 = {
    goraMm: 14,
    prawoMm: 14,
    dolMm: 14,
    lewoMm: 14,
  }

  return {
    format: 'A4',
    orientacja: 'pionowa',
    szerokoscMm: 210,
    wysokoscMm: 297,
    marginesy,
    obszarRoboczy: {
      xMm: marginesy.lewoMm,
      yMm: marginesy.goraMm,
      szerokoscMm: 210 - marginesy.lewoMm - marginesy.prawoMm,
      wysokoscMm: 297 - marginesy.goraMm - marginesy.dolMm,
    },
    naglowek: {
      aktywny: true,
      wysokoscMm: 28,
      organizator,
    },
    stopka: {
      aktywna: true,
      wysokoscMm: 12,
      organizator,
    },
    logotyp: {
      aktywny: Boolean(logotyp),
      zrodlo: logotyp,
      szerokoscProcent: 90,
    },
    numeracjaStron: {
      aktywna: true,
      format: '1_z_n',
    },
    lamanieStron: {
      unikajDzieleniaNaglowkow: true,
      minimalnaLiczbaWierszyPoNaglowku: 2,
    },
    minimalneOdstepyOdKrawedziMm: 5,
    skalowaniePodgladu: 1,
    ustawieniaWydruku: {
      drukujTlo: true,
    },
    ustawieniaEksportu: {
      pdfReferencyjny: true,
      docxZTejSamejStruktury: true,
    },
  }
}

function splaszczBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
  return bloki.flatMap((blok) => [blok, ...splaszczBloki(blok.dzieci)])
}

function utworzProblem(
  indeks: number,
  poziom: PoziomProblemuDokumentu,
  kategoria: KategoriaProblemuDokumentu,
  komunikat: string,
  blokId?: string,
): ProblemDokumentu {
  return {
    id: `problem-dokumentu-${indeks}`,
    poziom,
    kategoria,
    komunikat,
    blokId,
    czyBlokujeEksport: poziom === 'blad_krytyczny',
  }
}

export function sprawdzDokumentBlokowy(dokument: DokumentBlokowy): ProblemDokumentu[] {
  const problemy: ProblemDokumentu[] = []
  const bloki = splaszczBloki(dokument.struktura)

  if (!dokument.dane.tytulSzkolenia?.trim()) {
    problemy.push(utworzProblem(problemy.length + 1, 'blad_krytyczny', 'brakujace_dane', 'Brakuje tytułu szkolenia.'))
  }

  if (!bloki.length) {
    problemy.push(utworzProblem(problemy.length + 1, 'blad_krytyczny', 'struktura', 'Dokument nie ma struktury blokowej.'))
  }

  bloki.forEach((blok) => {
    const tresc = blok.tresc ?? ''

    if (blok.typ === 'ElementNieobslugiwany') {
      problemy.push(utworzProblem(problemy.length + 1, 'blad_krytyczny', 'struktura', 'Dokument zawiera nieobsługiwany element.', blok.id))
    }

    if (blok.statusDiagnostyczny === 'do_sprawdzenia' || blok.typ === 'ElementNiepewny') {
      problemy.push(utworzProblem(problemy.length + 1, 'ostrzezenie', 'parser', 'Parser oznaczył fragment jako wymagający sprawdzenia.', blok.id))
    }

    if (/\S{46,}/.test(tresc)) {
      problemy.push(utworzProblem(problemy.length + 1, 'ostrzezenie', 'formatowanie', 'Bardzo długi wyraz może zaburzyć układ PDF/DOCX.', blok.id))
    }

    if ((blok.stylLokalny.wciecie ?? 0) > 6) {
      problemy.push(utworzProblem(problemy.length + 1, 'ostrzezenie', 'formatowanie', 'Zbyt głębokie wcięcie może zaburzyć układ dokumentu.', blok.id))
    }

    if (tresc.length > 220) {
      problemy.push(utworzProblem(problemy.length + 1, 'ostrzezenie', 'formatowanie', 'Długi blok tekstu może wymagać ręcznego podziału.', blok.id))
    }
  })

  return problemy
}

export function przygotujRaportEksportuDokumentu(
  dokument: DokumentBlokowy,
  format: 'PDF' | 'DOCX',
  czyArchitektWymuszaEksport = false,
): RaportEksportuDokumentu {
  const problemy = sprawdzDokumentBlokowy(dokument)
  const bledyKrytyczne = problemy.filter((problem) => problem.czyBlokujeEksport)

  return {
    format,
    czyDozwolony: !bledyKrytyczne.length || czyArchitektWymuszaEksport,
    wymagaPotwierdzeniaArchitekta: Boolean(bledyKrytyczne.length && czyArchitektWymuszaEksport),
    roznicePdfDocx:
      format === 'DOCX'
        ? ['DOCX korzysta z tej samej struktury blokowej, ale może minimalnie różnić się łamaniem stron od PDF.']
        : [],
    problemy,
  }
}
