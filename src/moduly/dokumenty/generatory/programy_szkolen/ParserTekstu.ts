import type { BlokDokumentu, DokumentBlokowy, ProblemDokumentu } from '../../../../wspolne/dokumenty/modelBlokowy'
import { utworzModelStronyProgramu } from './geometriaStronyProgramu.ts'

export type TypElementuProgramu = 'naglowekListyProgramu' | 'cwiczenie' | 'warsztat' | 'przyklad'

export interface PodpunktProgramu {
  id: string
  tresc: string
  poziom: number
  typ?: TypElementuProgramu
  czyNiepewne?: boolean
}

export interface ModulProgramu {
  id: string
  tytul: string
  podpunkty: PodpunktProgramu[]
  typ?: TypElementuProgramu
  czyNiepewne?: boolean
}

export interface DzienProgramu {
  id: string
  tytul: string
  tytulDnia?: string
  czyDomyslny?: boolean
  moduly: ModulProgramu[]
}

export interface PozycjaListyProgramu {
  id: string
  tresc: string
  poziom: number
  typ?: TypElementuProgramu
  czyNiepewne?: boolean
}

export interface BlokiStandardoweProgramu {
  notatkaOnline: boolean
  programPartnerski: boolean
  informacjeOrganizacyjne: boolean
}

export interface OstrzezenieParsera {
  id: string
  tresc: string
  indeksWiersza?: number
}

export interface ProgramSzkolenia {
  dni: DzienProgramu[]
  listaProsta: PozycjaListyProgramu[]
  blokiStandardowe: BlokiStandardoweProgramu
  ostrzezenia: OstrzezenieParsera[]
  dokumentBlokowy: DokumentBlokowy
}

type WierszProgramu = {
  indeks: number
  surowy: string
  tresc: string
  poziom: number
}

type ZrodloModulu = 'arabski' | 'rzymski' | 'nienumerowany' | 'techniczny'
type RodzajOstatniegoElementu = 'modul' | 'podpunkt' | 'punkt-arabski'

type OstatniElement = {
  rodzaj: RodzajOstatniegoElementu
  poziom: number
  pobierzTresc: () => string
  ustawTresc: (tresc: string) => void
}

const wzorzecDnia = /^dzi(?:eń|en)\s+([0-9]+|[ivxlcdm]+)[.:)]?\s*(.*)$/i
const wzorzecModulu = /^(modu(?:ł|l)|blok|rozdzia(?:ł|l))(?:\s+([0-9]+|[ivxlcdm]+))?[.:)–—-]?\s*(.*)$/i
const wzorzecNaglowkaMarkdown = /^#{2,3}\s+(.+)$/
const wzorzecRzymski = /^([IVXLCDM]+)[.)]\s*(.+)$/
const wzorzecArabski = /^([0-9]{1,3})(?:\s*[.)]|\s*[-–—]|\s+)\s*(.+)$/
const wzorzecPunktora = /^(\s*)(?:[•▪·*o]|[-–—])\s+(.+)$/i
const wzorzecTytuluTechnicznego = /^program szkolenia$/i
const wzorzecInformacjiOrganizacyjnych = /^informacje organizacyjne$/i
const wzorzecProgramuPartnerskiego = /szkolenie realizowane w ramach programu partnerskiego/i
const wzorzecNotatkiOnline = /w przypadku szkolenia w formule on-?line/i
const wzorzecZakonczeniaZdania = /[.;:?]$/
const skrotyChronione = ['m.in.', 'np.', 'tj.', 'tzn.', 'art.', 'ust.', 'pkt.', 'dz.u.']
const znacznikiFormatowaniaLinii = ['**', '++', '*']

function utworzBlok(
  id: string,
  typ: BlokDokumentu['typ'],
  tresc: string | undefined,
  dzieci: BlokDokumentu[],
  czyNiepewne = false,
  poziom = 0,
): BlokDokumentu {
  return {
    id,
    typ,
    tresc,
    dzieci,
    metadane: {
      zrodlo: 'parser',
      poziom,
      opisDiagnostyczny: czyNiepewne ? 'Parser nie ma pewności co do roli tego fragmentu.' : undefined,
    },
    stylLokalny: {
      wciecie: poziom,
    },
    statusDiagnostyczny: czyNiepewne ? 'do_sprawdzenia' : 'poprawny',
  }
}

function utworzProblemParsera(ostrzezenie: OstrzezenieParsera, indeks: number): ProblemDokumentu {
  return {
    id: `parser-${indeks + 1}`,
    poziom: 'ostrzezenie',
    kategoria: 'parser',
    komunikat: ostrzezenie.tresc,
    czyBlokujeEksport: false,
  }
}

function zbudujDokumentBlokowyProgramu(program: Omit<ProgramSzkolenia, 'dokumentBlokowy'>): DokumentBlokowy {
  const struktura: BlokDokumentu[] = [
    utworzBlok('tytul-programu', 'Tytul', 'Program szkolenia', []),
    ...program.dni.map((dzien) =>
      utworzBlok(
        dzien.id,
        'Dzien',
        dzien.czyDomyslny ? undefined : dzien.tytul,
        [
          ...(dzien.tytulDnia ? [utworzBlok(`${dzien.id}-temat`, 'Sekcja', dzien.tytulDnia, [])] : []),
          ...dzien.moduly.map((modul) =>
            utworzBlok(
              modul.id,
              'Modul',
              modul.tytul,
              modul.podpunkty.map((podpunkt) =>
                utworzBlok(
                  podpunkt.id,
                  podpunkt.poziom > 0 ? 'Podpunkt' : 'Punkt',
                  podpunkt.tresc,
                  [],
                  podpunkt.czyNiepewne,
                  podpunkt.poziom,
                ),
              ),
              modul.czyNiepewne,
            ),
          ),
        ],
        dzien.moduly.some((modul) => modul.czyNiepewne || modul.podpunkty.some((podpunkt) => podpunkt.czyNiepewne)),
      ),
    ),
    ...program.listaProsta.map((pozycja) =>
      utworzBlok(
        pozycja.id,
        pozycja.poziom > 0 ? 'Podpunkt' : 'Punkt',
        pozycja.tresc,
        [],
        pozycja.czyNiepewne,
        pozycja.poziom,
      ),
    ),
  ]

  return {
    id: 'program-szkolenia-z-parsera',
    typ: 'program_szkolenia',
    dane: {
      tytulSzkolenia: 'Program szkolenia',
      organizator: 'SEMPER',
    },
    struktura,
    strona: utworzModelStronyProgramu(),
    wyglad: {
      marginesy: utworzModelStronyProgramu().marginesy,
      styleBlokow: {
        Tytul: { pogrubienie: true, rozmiarCzcionki: 16, interlinia: 1.15 },
        Dzien: { pogrubienie: true, rozmiarCzcionki: 12, interlinia: 1.15 },
        Modul: { pogrubienie: true, rozmiarCzcionki: 11, interlinia: 1.3 },
        Punkt: { rozmiarCzcionki: 10, interlinia: 1.3 },
        Podpunkt: { rozmiarCzcionki: 10, interlinia: 1.3 },
      },
    },
    problemy: program.ostrzezenia.map(utworzProblemParsera),
    raportyEksportu: [],
    metadane: {
      wersjaModelu: 1,
      zrodlo: 'parser',
      zatwierdzonyPrzezUzytkownika: false,
    },
  }
}

function zakonczProgram(program: Omit<ProgramSzkolenia, 'dokumentBlokowy'>): ProgramSzkolenia {
  return {
    ...program,
    dokumentBlokowy: zbudujDokumentBlokowyProgramu(program),
  }
}

function utworzId(prefiks: string, licznik: number) {
  return `${prefiks}-${licznik}`
}

function policzPoziomWciecia(wciecie: string) {
  const tabulatory = (wciecie.match(/\t/g) ?? []).length
  const spacje = wciecie.replace(/\t/g, '').length

  return tabulatory + Math.floor(spacje / 2)
}

function pobierzWciecie(wiersz: string) {
  return wiersz.match(/^\s*/)?.[0] ?? ''
}

function rozpakujPelneFormatowanieLinii(tresc: string) {
  const znaczniki: string[] = []
  let wynik = tresc.trim()
  let czyZmieniono = true

  while (czyZmieniono) {
    czyZmieniono = false

    for (const znacznik of znacznikiFormatowaniaLinii) {
      if (wynik.startsWith(znacznik) && wynik.endsWith(znacznik) && wynik.length > znacznik.length * 2) {
        znaczniki.push(znacznik)
        wynik = wynik.slice(znacznik.length, -znacznik.length).trim()
        czyZmieniono = true
        break
      }
    }
  }

  return { tresc: wynik, znaczniki }
}

function opakujTrescZnacznikami(tresc: string, znaczniki: string[]) {
  return znaczniki.reduceRight((wynik, znacznik) => `${znacznik}${wynik}${znacznik}`, tresc)
}

function pobierzPrefiksStruktury(tresc: string) {
  const dzien = tresc.match(/^(Dzie(?:ń|n)\s+(?:[0-9]+|[ivxlcdm]+))[.:)]?\s*(.*)$/i)

  if (dzien) {
    return { prefiks: dzien[1], reszta: dzien[2] ?? '' }
  }

  const naglowek = tresc.match(/^(#{2,3}\s+)(.+)$/)

  if (naglowek) {
    return { prefiks: naglowek[1].trimEnd(), reszta: naglowek[2] ?? '' }
  }

  const numer = tresc.match(/^([0-9]{1,3}(?:[.)]|\s*[-–—]|\s+))\s*(.+)$/)

  if (numer) {
    return { prefiks: numer[1].trimEnd(), reszta: numer[2] ?? '' }
  }

  return null
}

function normalizujFormatowanieZnacznikaStruktury(tresc: string) {
  const bezFormatowaniaSamegoPrefiksu = tresc
    .replace(/^(\*\*|\+\+|\*)(Dzie(?:ń|n)\s+(?:[0-9]+|[ivxlcdm]+))\1\s*/i, '$2 ')
    .replace(/^(\*\*|\+\+|\*)([0-9]{1,3}[.)])\1\s*/, '$2 ')
  const rozpakowane = rozpakujPelneFormatowanieLinii(bezFormatowaniaSamegoPrefiksu)
  const prefiks = pobierzPrefiksStruktury(rozpakowane.tresc)

  if (!prefiks || !rozpakowane.znaczniki.length) {
    return bezFormatowaniaSamegoPrefiksu
  }

  const reszta = prefiks.reszta.trim()

  return reszta ? `${prefiks.prefiks} ${opakujTrescZnacznikami(reszta, rozpakowane.znaczniki)}` : prefiks.prefiks
}

function przygotujTresc(wiersz: string) {
  const tresc = wiersz
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalizujFormatowanieZnacznikaStruktury(tresc)
}

function czyTytulTechniczny(tresc: string) {
  return wzorzecTytuluTechnicznego.test(tresc.trim())
}

function przygotujWiersze(tresc: string) {
  return tresc
    .split(/\r?\n/)
    .map((surowy, indeks) => ({
      indeks,
      surowy,
      tresc: przygotujTresc(surowy),
      poziom: policzPoziomWciecia(pobierzWciecie(surowy)),
    }))
    .filter((wiersz) => wiersz.tresc)
}

function zbudujEtykieteDnia(dzien: RegExpMatchArray) {
  return `Dzień ${dzien[1]}`
}

function zbudujTytulModulu(modul: RegExpMatchArray, tresc: string) {
  const rodzaj = modul[1]
  const numer = modul[2]?.trim()
  const dopisek = modul[3]?.trim()
  const etykieta = numer ? `${rodzaj} ${numer}` : rodzaj

  if (!dopisek) {
    return tresc.replace(/[:.\-–—\s]+$/, '').trim()
  }

  return `${etykieta}: ${dopisek}`
}

function rozpoznajTypElementu(tresc: string): TypElementuProgramu | undefined {
  const tekst = tresc.toLowerCase()

  if (tekst.includes('studium przypadku') || tekst.includes('przykład') || tekst.includes('przyklad')) {
    return 'przyklad'
  }

  if (tekst.includes('warsztat')) {
    return 'warsztat'
  }

  if (
    tekst.includes('ćwiczenie') ||
    tekst.includes('ćwiczenia') ||
    tekst.includes('cwiczenie') ||
    tekst.includes('cwiczenia') ||
    tekst.includes('analiza') ||
    tekst.includes('dyskusja') ||
    tekst.includes('praca w grupach') ||
    tekst.includes('omówienie rezultatów') ||
    tekst.includes('omowienie rezultatow')
  ) {
    return 'cwiczenie'
  }

  return undefined
}

function czyKonczySieSkrotem(tresc: string) {
  const tekst = tresc.trim().toLowerCase()

  return skrotyChronione.some((skrot) => tekst.endsWith(skrot))
}

function czyZamykaMysl(tresc: string) {
  const tekst = tresc.trim()

  return wzorzecZakonczeniaZdania.test(tekst) && !czyKonczySieSkrotem(tekst)
}

function czyScalicZPoprzednim(ostatniElement: OstatniElement | null) {
  if (!ostatniElement) {
    return false
  }

  const poprzedniaTresc = ostatniElement.pobierzTresc().trim()

  if (czyZamykaMysl(poprzedniaTresc)) {
    return false
  }

  return /[,/-]$/.test(poprzedniaTresc) || czyKonczySieSkrotem(poprzedniaTresc) || poprzedniaTresc.length >= 70
}

function polaczTekst(pierwszy: string, drugi: string) {
  return `${pierwszy.replace(/\s+$/, '')} ${drugi.trim()}`.trim()
}

function czyZnacznikProgramu(wiersz: WierszProgramu) {
  return Boolean(
    wiersz.tresc.match(wzorzecDnia) ||
      wiersz.tresc.match(wzorzecModulu) ||
      wiersz.tresc.match(wzorzecNaglowkaMarkdown) ||
      wiersz.tresc.match(wzorzecRzymski) ||
      wiersz.tresc.match(wzorzecArabski) ||
      wiersz.surowy.match(wzorzecPunktora),
  )
}

function czyZaczynaSieMalaLitera(tresc: string) {
  return /^[a-ząćęłńóśźż]/.test(tresc.trim())
}

function czyKandydatNaNaglowek(wiersz: WierszProgramu, nastepny?: WierszProgramu) {
  return Boolean(
    nastepny &&
      !czyZnacznikProgramu(wiersz) &&
      czyZnacznikProgramu(nastepny) &&
      wiersz.tresc.length <= 120 &&
      !czyZaczynaSieMalaLitera(wiersz.tresc) &&
      (!czyZamykaMysl(wiersz.tresc) || wiersz.tresc.endsWith(';')) &&
      !rozpoznajTypElementu(wiersz.tresc),
  )
}

function utworzProgram(): Omit<ProgramSzkolenia, 'dokumentBlokowy'> {
  return {
    dni: [],
    listaProsta: [],
    blokiStandardowe: {
      notatkaOnline: false,
      programPartnerski: false,
      informacjeOrganizacyjne: false,
    },
    ostrzezenia: [],
  }
}

export function parsujTekstProgramu(tresc: string): ProgramSzkolenia {
  const wiersze = przygotujWiersze(tresc)
  const program = utworzProgram()

  let aktualnyDzien: DzienProgramu | null = null
  let aktualnyModul: ModulProgramu | null = null
  let ostatniElement: OstatniElement | null = null
  let zrodloAktualnegoModulu: ZrodloModulu | null = null
  let licznikDni = 0
  let licznikModulow = 0
  let licznikPodpunktow = 0
  let licznikOstrzezen = 0
  let czyWykrytoRzymskie = false
  let czyWykrytoArabskie = false

  function dodajOstrzezenie(trescOstrzezenia: string, indeksWiersza?: number) {
    licznikOstrzezen += 1
    program.ostrzezenia.push({
      id: utworzId('ostrzezenie', licznikOstrzezen),
      tresc: trescOstrzezenia,
      indeksWiersza,
    })
  }

  function dodajDzien(tytul: string, tytulDnia?: string, czyDomyslny = false) {
    licznikDni += 1
    aktualnyDzien = {
      id: utworzId('dzien', licznikDni),
      tytul,
      tytulDnia,
      czyDomyslny,
      moduly: [],
    }
    aktualnyModul = null
    ostatniElement = null
    zrodloAktualnegoModulu = null
    program.dni.push(aktualnyDzien)
  }

  function zapewnijDzien() {
    if (!aktualnyDzien) {
      dodajDzien('Program', undefined, true)
    }
  }

  function ustawOstatniModul(modul: ModulProgramu) {
    ostatniElement = {
      rodzaj: 'modul',
      poziom: 0,
      pobierzTresc: () => modul.tytul,
      ustawTresc: (nowaTresc) => {
        modul.tytul = nowaTresc
      },
    }
  }

  function ustawOstatniPodpunkt(podpunkt: PodpunktProgramu, rodzaj: RodzajOstatniegoElementu) {
    ostatniElement = {
      rodzaj,
      poziom: podpunkt.poziom,
      pobierzTresc: () => podpunkt.tresc,
      ustawTresc: (nowaTresc) => {
        podpunkt.tresc = nowaTresc
        podpunkt.typ = podpunkt.typ ?? rozpoznajTypElementu(nowaTresc)
      },
    }
  }

  function dodajModul(tytul: string, zrodlo: ZrodloModulu, czyNiepewne = false) {
    zapewnijDzien()
    licznikModulow += 1
    aktualnyModul = {
      id: utworzId('modul', licznikModulow),
      tytul: tytul.trim(),
      podpunkty: [],
      typ: rozpoznajTypElementu(tytul),
      czyNiepewne,
    }
    zrodloAktualnegoModulu = zrodlo
    aktualnyDzien?.moduly.push(aktualnyModul)
    ustawOstatniModul(aktualnyModul)
  }

  function dodajPodpunkt(trescPodpunktu: string, poziom: number, czyNiepewne = false, rodzaj: RodzajOstatniegoElementu = 'podpunkt') {
    if (!aktualnyModul) {
      dodajModul('Zakres tematyczny', 'techniczny')
    }

    licznikPodpunktow += 1

    const podpunkt: PodpunktProgramu = {
      id: utworzId('podpunkt', licznikPodpunktow),
      tresc: trescPodpunktu.trim(),
      poziom,
      typ: rozpoznajTypElementu(trescPodpunktu),
      czyNiepewne,
    }

    aktualnyModul?.podpunkty.push(podpunkt)
    ustawOstatniPodpunkt(podpunkt, rodzaj)
  }

  function dodajNiepewnyPodpunkt(wiersz: WierszProgramu) {
    dodajOstrzezenie('Nie rozpoznano, czy linia jest tytułem, czy podpunktem.', wiersz.indeks)
    dodajPodpunkt(wiersz.tresc, ostatniElement?.rodzaj === 'modul' ? 0 : ostatniElement?.poziom ?? 0, true)
  }

  if (!wiersze.length) {
    return zakonczProgram(program)
  }

  for (let indeks = 0; indeks < wiersze.length; indeks += 1) {
    const wiersz = wiersze[indeks]
    const nastepny = wiersze[indeks + 1]

    if (czyTytulTechniczny(wiersz.tresc)) {
      continue
    }

    if (wzorzecInformacjiOrganizacyjnych.test(wiersz.tresc)) {
      program.blokiStandardowe.informacjeOrganizacyjne = true
      dodajOstrzezenie('Wykryto blok "Informacje organizacyjne" - pominięto dalszą treść.', wiersz.indeks)
      break
    }

    if (wzorzecNotatkiOnline.test(wiersz.tresc)) {
      program.blokiStandardowe.notatkaOnline = true
      dodajOstrzezenie('Wykryto standardową notatkę online - przeniesiono do bloków szablonu.', wiersz.indeks)
      continue
    }

    if (wzorzecProgramuPartnerskiego.test(wiersz.tresc)) {
      program.blokiStandardowe.programPartnerski = true
      dodajOstrzezenie('Wykryto program partnerski - przeniesiono do bloków dokumentu.', wiersz.indeks)
      continue
    }

    const dzien = wiersz.tresc.match(wzorzecDnia)

    if (dzien) {
      dodajDzien(zbudujEtykieteDnia(dzien), dzien[2]?.trim() || undefined)
      continue
    }

    const modul = wiersz.tresc.match(wzorzecModulu)
      ?? wiersz.surowy.match(wzorzecPunktora)?.[2].match(wzorzecModulu)

    if (modul) {
      dodajModul(zbudujTytulModulu(modul, wiersz.tresc), 'techniczny')
      continue
    }

    const naglowekMarkdown = wiersz.tresc.match(wzorzecNaglowkaMarkdown)

    if (naglowekMarkdown) {
      dodajModul(naglowekMarkdown[1].trim(), 'nienumerowany')
      continue
    }

    const rzymski = wiersz.tresc.match(wzorzecRzymski)

    if (rzymski) {
      czyWykrytoRzymskie = true
      dodajModul(`${rzymski[1]}. ${rzymski[2].trim()}`, 'rzymski')
      continue
    }

    const arabski = wiersz.tresc.match(wzorzecArabski)

    if (arabski) {
      czyWykrytoArabskie = true

      if (zrodloAktualnegoModulu === 'rzymski' || zrodloAktualnegoModulu === 'nienumerowany') {
        dodajPodpunkt(arabski[2], 0, false, 'punkt-arabski')
      } else {
        dodajModul(`${arabski[1]}. ${arabski[2].trim()}`, 'arabski')
      }

      continue
    }

    const punktor = wiersz.surowy.match(wzorzecPunktora)

    if (punktor) {
      const ostatni = ostatniElement as OstatniElement | null
      const poziomPoPunkcieArabskim = ostatni?.rodzaj === 'punkt-arabski' ? ostatni.poziom + 1 : undefined
      const poziomPoprzedniegoPunktora = ostatni?.rodzaj === 'podpunkt' ? ostatni.poziom : undefined
      const poziom = Math.max(wiersz.poziom, poziomPoPunkcieArabskim ?? poziomPoprzedniegoPunktora ?? 0)

      dodajPodpunkt(punktor[2], poziom)
      continue
    }

    const elementDoScalenia = ostatniElement as OstatniElement | null

    if (czyScalicZPoprzednim(elementDoScalenia)) {
      elementDoScalenia?.ustawTresc(polaczTekst(elementDoScalenia.pobierzTresc(), wiersz.tresc))
      continue
    }

    if (czyKandydatNaNaglowek(wiersz, nastepny)) {
      dodajModul(wiersz.tresc, 'nienumerowany')
      continue
    }

    const dzienDoUzupelnienia = aktualnyDzien as DzienProgramu | null
    const modulDoSprawdzenia = aktualnyModul as ModulProgramu | null

    if (dzienDoUzupelnienia && !dzienDoUzupelnienia.czyDomyslny && !dzienDoUzupelnienia.tytulDnia && !modulDoSprawdzenia) {
      dzienDoUzupelnienia.tytulDnia = wiersz.tresc
      continue
    }

    const modulDlaPodpunktu = aktualnyModul as ModulProgramu | null

    if (modulDlaPodpunktu) {
      const ostatni = ostatniElement as OstatniElement | null

      dodajPodpunkt(wiersz.tresc, ostatni?.rodzaj === 'modul' ? 0 : ostatni?.poziom ?? 0)
      continue
    }

    dodajNiepewnyPodpunkt(wiersz)
  }

  for (const dzien of program.dni) {
    if (!dzien.moduly.length) {
      dodajOstrzezenie(`Wykryto dzień bez punktów programu: ${dzien.tytul}.`)
    }
  }

  if (czyWykrytoArabskie && czyWykrytoRzymskie) {
    dodajOstrzezenie('Wykryto numerację mieszaną: arabska + rzymska.')
  }

  return zakonczProgram(program)
}
