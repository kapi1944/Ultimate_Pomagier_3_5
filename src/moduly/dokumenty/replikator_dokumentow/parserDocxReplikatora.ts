import { pobierzPelnyTekstDokumentu } from '../../../wspolne/dokumenty/analizaDokumentu'
import {
  sprawdzDokumentBlokowy,
  utworzModelStronyA4,
  type BezpiecznyStylBloku,
  type BlokDokumentu,
  type DokumentBlokowy,
  type TypBlokuDokumentu,
} from '../../../wspolne/dokumenty/modelBlokowy'
import type {
  DokumentPomagiera,
  ElementDokumentu,
  ElementObrazuDokumentu,
  ElementTabeliDokumentu,
  ElementTekstowyDokumentu,
  MarkaDokumentu,
  TypRozpoznanegoDokumentu,
} from '../../../wspolne/dokumenty/typyDokumentu'
import { utworzDokumentZTekstu } from '../../../wspolne/dokumenty/utworzDokumentZTekstu'
import { importujPlikDoDokumentu } from '../../../wspolne/import/importujPlikDoDokumentu'
import { wykryjPlaceholderyReplikatora } from './placeholderyReplikatora'
import { pobierzBlokiReplikatora, utworzRaportReplikacji } from './raportReplikacji'
import type {
  DecyzjaUzytkownikaReplikatora,
  SzablonRoboczyReplikatora,
  TypDokumentuReplikatora,
  WynikImportuReplikatora,
  ZrodloImportuReplikatora,
} from './typyReplikatora'

function normalizuj(tekst: string) {
  return tekst
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function utworzId(rdzen: string) {
  return rdzen
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'dokument'
}

function stylBloku(element?: ElementTekstowyDokumentu): BezpiecznyStylBloku {
  const rozmiar = element?.styl.rozmiarCzcionki ?? 12
  const rozmiarBezpieczny = [9, 10, 11, 12, 14, 16, 18, 20, 24].find((wartosc) => wartosc >= rozmiar) ?? 24

  return {
    pogrubienie: element?.styl.pogrubienie,
    kursywa: element?.styl.kursywa,
    podkreslenie: element?.styl.podkreslenie,
    rozmiarCzcionki: rozmiarBezpieczny as BezpiecznyStylBloku['rozmiarCzcionki'],
  }
}

function typBlokuTekstowego(element: ElementTekstowyDokumentu, indeks: number): TypBlokuDokumentu {
  const tekst = element.tekst.trim()
  const tekstNormalny = normalizuj(tekst)

  if (element.rodzaj === 'naglowek') {
    return 'Naglowek'
  }

  if (element.rodzaj === 'stopka') {
    return 'Stopka'
  }

  if (indeks === 0 || tekstNormalny.includes('program szkolenia')) {
    return 'Tytul'
  }

  if (/^(?:[-•*]|\d+[.)])\s+/.test(tekst)) {
    return 'Punkt'
  }

  return 'Akapit'
}

function czyElementTekstowy(element: ElementDokumentu): element is ElementTekstowyDokumentu {
  return element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka'
}

function czyElementObrazu(element: ElementDokumentu): element is ElementObrazuDokumentu {
  return element.rodzaj === 'obraz'
}

function czyElementTabeli(element: ElementDokumentu): element is ElementTabeliDokumentu {
  return element.rodzaj === 'tabela'
}

function utworzBlok(
  id: string,
  typ: TypBlokuDokumentu,
  tresc: string | undefined,
  statusDiagnostyczny: BlokDokumentu['statusDiagnostyczny'],
  opisDiagnostyczny?: string,
  dane: BlokDokumentu['dane'] = {},
  stylLokalny: BezpiecznyStylBloku = {},
): BlokDokumentu {
  return {
    id,
    typ,
    tresc,
    dane,
    dzieci: [],
    metadane: {
      zrodlo: 'import',
      opisDiagnostyczny,
    },
    stylLokalny,
    statusDiagnostyczny,
  }
}

function konwertujTabele(element: ElementTabeliDokumentu): BlokDokumentu {
  const czyNiepewna = Boolean(element.ostrzezenia?.length)

  return utworzBlok(
    `blok-${element.id}`,
    'Tabela',
    element.komorki.map((wiersz) => wiersz.map((komorka) => komorka.tekst).join(' | ')).join('\n'),
    czyNiepewna ? 'do_sprawdzenia' : 'poprawny',
    czyNiepewna ? element.ostrzezenia?.join(' ') : undefined,
    {
      komorki: JSON.stringify(element.komorki),
      liczbaWierszy: element.komorki.length,
      liczbaKolumn: element.kolumny.length,
    },
  )
}

function konwertujElement(element: ElementDokumentu, indeks: number): BlokDokumentu[] {
  if (czyElementTekstowy(element)) {
    return [
      utworzBlok(
        `blok-${element.id}`,
        element.status === 'niepewny' ? 'ElementNiepewny' : typBlokuTekstowego(element, indeks),
        element.tekst,
        element.status === 'niepewny' ? 'do_sprawdzenia' : 'poprawny',
        element.status === 'niepewny' ? 'Tekst oznaczony jako niepewny przez importer.' : undefined,
        { idElementuZrodlowego: element.id },
        stylBloku(element),
      ),
    ]
  }

  if (czyElementObrazu(element)) {
    const typ: TypBlokuDokumentu = element.rola === 'logo' || element.rola === 'logotyp_projektowy' ? 'Logotyp' : element.rola === 'podpis' ? 'Podpis' : 'Obraz'

    return [
      utworzBlok(
        `blok-${element.id}`,
        typ,
        element.nazwa,
        element.status === 'niepewny' ? 'do_sprawdzenia' : 'poprawny',
        element.status === 'niepewny' ? 'Grafika wymaga ręcznej kontroli.' : undefined,
        { idElementuZrodlowego: element.id, rola: element.rola, zasobId: element.zasobId ?? null },
      ),
    ]
  }

  if (czyElementTabeli(element)) {
    return [konwertujTabele(element)]
  }

  if (element.rodzaj === 'linia') {
    return [utworzBlok(`blok-${element.id}`, 'Separator', undefined, 'poprawny', undefined, { idElementuZrodlowego: element.id })]
  }

  if (element.rodzaj === 'blok') {
    return element.elementy.flatMap((dziecko, indeksDziecka) => konwertujElement(dziecko, indeksDziecka))
  }

  return [
    utworzBlok(
      `blok-${element.id}`,
      'ElementNieobslugiwany',
      element.rodzaj,
      'blad',
      `Importer nie potrafi wiarygodnie odtworzyć elementu typu ${element.rodzaj}. Element nie został usunięty.`,
      { idElementuZrodlowego: element.id, rodzajElementu: element.rodzaj },
    ),
  ]
}

function mapujTypDokumentu(typ?: TypRozpoznanegoDokumentu): TypDokumentuReplikatora {
  const mapowanie: Partial<Record<TypRozpoznanegoDokumentu, TypDokumentuReplikatora>> = {
    program_szkolenia: 'Program szkolenia',
    lista_obecnosci: 'Lista obecności',
    ankieta_ewaluacyjna: 'Ankieta',
    certyfikat: 'Certyfikat',
  }

  return typ ? mapowanie[typ] ?? 'Inny' : 'Inny'
}

function mapujTypBlokowy(typ: TypDokumentuReplikatora): DokumentBlokowy['typ'] {
  if (typ === 'Program szkolenia') {
    return 'program_szkolenia'
  }

  if (typ === 'Dyplom' || typ === 'Certyfikat' || typ === 'Zaświadczenie') {
    return 'dyplom'
  }

  if (typ === 'Lista obecności') {
    return 'lista_obecnosci'
  }

  return 'inny'
}

export function utworzDokumentBlokowyZDokumentuPomagiera(dokument: DokumentPomagiera, typDokumentu = mapujTypDokumentu(dokument.metadane.mozliwyTypDokumentu)): DokumentBlokowy {
  const struktura = dokument.strony.flatMap((strona) => strona.elementy.flatMap((element, indeks) => konwertujElement(element, indeks)))
  const organizator = dokument.metadane.branding.marka
  const strona = utworzModelStronyA4(organizator, dokument.zasoby.find((zasob) => zasob.typ === 'logo' || zasob.typ === 'logotyp_projektowy')?.zrodlo)

  if (!struktura.length) {
    struktura.push(utworzBlok('blok-import-pusty', 'ElementNiepewny', 'Importer nie wykrył treści dokumentu.', 'do_sprawdzenia', 'Brak rozpoznanej struktury wymaga ręcznej decyzji użytkownika.'))
  }

  const dokumentBlokowy: DokumentBlokowy = {
    id: `blokowy-${dokument.id}`,
    typ: mapujTypBlokowy(typDokumentu),
    dane: {
      tytulSzkolenia: pobierzPelnyTekstDokumentu(dokument).split('\n').find((wiersz) => wiersz.trim().length > 6),
      organizator,
    },
    struktura,
    strona,
    wyglad: {
      marginesy: strona.marginesy,
      styleBlokow: {},
    },
    problemy: [],
    raportyEksportu: [],
    metadane: {
      wersjaModelu: 1,
      zrodlo: 'import',
      zatwierdzonyPrzezUzytkownika: false,
    },
  }

  return {
    ...dokumentBlokowy,
    problemy: sprawdzDokumentBlokowy(dokumentBlokowy),
  }
}

export function utworzSzablonRoboczyZDokumentu(
  dokument: DokumentPomagiera,
  zrodloImportu: ZrodloImportuReplikatora,
  uzytkownik: string,
  ograniczenia: string[] = [],
  historiaDecyzji: DecyzjaUzytkownikaReplikatora[] = [],
): SzablonRoboczyReplikatora {
  const typDokumentu = mapujTypDokumentu(dokument.metadane.mozliwyTypDokumentu)
  const dokumentBlokowy = utworzDokumentBlokowyZDokumentuPomagiera(dokument, typDokumentu)
  const raportImportu = utworzRaportReplikacji(dokumentBlokowy, zrodloImportu, ograniczenia)
  const bloki = pobierzBlokiReplikatora(dokumentBlokowy)
  const placeholdery = wykryjPlaceholderyReplikatora(dokumentBlokowy)

  return {
    id: `szablon-roboczy-${utworzId(dokument.nazwa)}-${Date.now()}`,
    nazwa: dokument.nazwa,
    typDokumentu,
    pewnoscTypuDokumentu: typDokumentu === 'Inny' ? 0.35 : 0.82,
    organizator: dokument.metadane.branding.marka,
    status: 'Roboczy',
    zrodloImportu,
    dataImportu: raportImportu.dataImportu,
    uzytkownik,
    wersja: 1,
    procentZgodnosci: raportImportu.procentZgodnosci,
    poziomZgodnosci: raportImportu.poziomZgodnosci,
    raportImportu,
    dokumentBlokowy,
    dokumentPodgladu: dokument,
    placeholdery,
    elementyNiepewne: bloki.filter((blok) => blok.typ === 'ElementNiepewny' || blok.statusDiagnostyczny === 'do_sprawdzenia').map((blok) => blok.id),
    elementyNieobslugiwane: bloki.filter((blok) => blok.typ === 'ElementNieobslugiwany').map((blok) => blok.id),
    historiaDecyzji,
    czyPokazacZnakWodnyWersjiTestowej: true,
  }
}

export function utworzSzablonRoboczyZTekstu(nazwa: string, tekst: string, uzytkownik: string) {
  return utworzSzablonRoboczyZDokumentu(utworzDokumentZTekstu(nazwa, tekst), 'TEKST', uzytkownik)
}

export function zatwierdzNiskaZgodnoscSzablonu(
  szablon: SzablonRoboczyReplikatora,
  komentarz: string,
  uzytkownik: string,
  data = new Date().toISOString(),
): SzablonRoboczyReplikatora {
  const trescKomentarza = komentarz.trim()

  if (!trescKomentarza) {
    throw new Error('Komentarz jest wymagany do zatwierdzenia niskiej zgodności.')
  }

  return {
    ...szablon,
    dokumentBlokowy: {
      ...szablon.dokumentBlokowy,
      metadane: {
        ...szablon.dokumentBlokowy.metadane,
        zatwierdzonyPrzezUzytkownika: true,
      },
    },
    historiaDecyzji: [
      ...szablon.historiaDecyzji,
      {
        id: `decyzja-niska-zgodnosc-${Date.now()}`,
        typ: 'niska_zgodnosc',
        komentarz: trescKomentarza,
        uzytkownik,
        data,
        poprzedniWynikZgodnosci: szablon.procentZgodnosci,
      },
    ],
  }
}

export function zsynchronizujDokumentPomagieraZDokumentemBlokowym(
  dokument: DokumentPomagiera,
  dokumentBlokowy: DokumentBlokowy,
): DokumentPomagiera {
  const tekstyWedlugElementow = new Map<string, string>()

  pobierzBlokiReplikatora(dokumentBlokowy).forEach((blok) => {
    const idElementu = blok.dane?.idElementuZrodlowego

    if (typeof idElementu === 'string' && typeof blok.tresc === 'string') {
      tekstyWedlugElementow.set(idElementu, blok.tresc)
    }
  })

  function synchronizujElementy(elementy: ElementDokumentu[]): ElementDokumentu[] {
    return elementy.map((element) => {
      if (element.rodzaj === 'blok') {
        return {
          ...element,
          elementy: synchronizujElementy(element.elementy),
        }
      }

      if (czyElementTekstowy(element) && tekstyWedlugElementow.has(element.id)) {
        return {
          ...element,
          tekst: tekstyWedlugElementow.get(element.id) ?? element.tekst,
        }
      }

      return element
    })
  }

  return {
    ...dokument,
    strony: dokument.strony.map((strona) => ({
      ...strona,
      elementy: synchronizujElementy(strona.elementy),
    })),
  }
}

export async function importujDocxReplikatora(plik: File, uzytkownik: string): Promise<WynikImportuReplikatora> {
  const wynik = await importujPlikDoDokumentu(plik)
  const szablonRoboczy = utworzSzablonRoboczyZDokumentu(wynik.dokument, 'DOCX', uzytkownik, [
    'Nieobsługiwane elementy DOCX są zachowane jako ElementNieobslugiwany zamiast cichego usunięcia.',
    'Pozycjonowanie absolutne i elementy pływające wymagają ręcznej kontroli.',
  ], [
    {
      id: `decyzja-import-${Date.now()}`,
      typ: 'import',
      komentarz: `Import DOCX: ${plik.name}`,
      uzytkownik,
      data: new Date().toISOString(),
    },
  ])

  return {
    szablonRoboczy,
    dokumentPodgladu: wynik.dokument,
    tekstZrodlowy: wynik.tekstZrodlowy,
    komunikat: wynik.komunikat,
  }
}

export function aktualizujDokumentBlokowyTekstem(
  dokument: DokumentBlokowy,
  elementId: string,
  tekst: string,
): DokumentBlokowy {
  function aktualizujBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
    return bloki.map((blok) => {
      const czyTenSamElement = blok.id === `blok-${elementId}` || blok.dane?.idElementuZrodlowego === elementId
      const zaktualizowany = czyTenSamElement ? { ...blok, tresc: tekst, metadane: { ...blok.metadane, zrodlo: 'uzytkownik' as const } } : blok

      return {
        ...zaktualizowany,
        dzieci: aktualizujBloki(zaktualizowany.dzieci),
      }
    })
  }

  const nowyDokument = {
    ...dokument,
    struktura: aktualizujBloki(dokument.struktura),
  }

  return {
    ...nowyDokument,
    problemy: sprawdzDokumentBlokowy(nowyDokument),
  }
}

export function ustawTypDokumentuBlokowego(dokument: DokumentBlokowy, typDokumentu: TypDokumentuReplikatora): DokumentBlokowy {
  return {
    ...dokument,
    typ: mapujTypBlokowy(typDokumentu),
  }
}

export function ustawOrganizatoraDokumentuBlokowego(dokument: DokumentBlokowy, organizator: MarkaDokumentu): DokumentBlokowy {
  const strona = utworzModelStronyA4(organizator, dokument.strona.logotyp.zrodlo)

  return {
    ...dokument,
    dane: {
      ...dokument.dane,
      organizator,
    },
    strona,
    wyglad: {
      ...dokument.wyglad,
      marginesy: strona.marginesy,
    },
  }
}
