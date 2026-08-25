import type { DokumentBlokowy, ProblemDokumentu } from '../../../../wspolne/dokumenty/modelBlokowy'
import { sprawdzDokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'
import { konwertujTekstProgramuNaHtml } from './komponenty/konwersjaProgramuWysiwyg'
import { parsujTekstProgramu, type ProgramSzkolenia } from './ParserTekstu'
import {
  konfiguracjePresetowProgramu,
  domyslnyPresetNowegoProgramu,
  normalizujPresetWygladuProgramu,
  type ElementyIdentyfikacjiProgramu,
  type PresetWygladuProgramu,
} from './presetyProgramu'

export type ProfilFirmyProgramu = 'semper' | 'iist'
export type StylDniProgramu = 'pasek' | 'naglowek'
export type SeparacjaModulowProgramu = 'brak' | 'ramka' | 'linia' | 'separator-pytan'
export type StylPodpunktowProgramu = 'punktory' | 'numeracja'
export type StylListyGlownejProgramu = 'numeracja' | 'punktory'
export type FormatCudzyslowuProgramu = 'dolny-gorny' | 'gorny-gorny'

export type UstawieniaProgramuSzkolenia = {
  presetWygladu: PresetWygladuProgramu
  czyWyborPresetySwiadomy: boolean
  czyJustowac: boolean
  elementyIdentyfikacji: Partial<ElementyIdentyfikacjiProgramu>
  profilFirmy: ProfilFirmyProgramu
  kolorAkcentuProgramu: string
  kolorReczny: boolean
  formatowanieSkryptowe: boolean
  stylDni: StylDniProgramu
  separacjaModulow: SeparacjaModulowProgramu
  stylPodpunktow: StylPodpunktowProgramu
  stylListyGlownej: StylListyGlownejProgramu
  stylePoziomowListy: string[]
  gruboscObramowaniaTytulu: number
  formatCudzyslowu: FormatCudzyslowuProgramu
  szerokoscLogotypu: number
  czyPogrubiacNaglowkiListyProgramu: boolean
}

export type ModelProgramuSzkolenia = {
  tytulSzkolenia: string
  trescProgramu: string
  czyWynikParsowaniaZatwierdzony: boolean
  ustawienia: UstawieniaProgramuSzkolenia
  logotypProgramu: string
  linkLogotypu: string
}

export type MetadaneProgramuSzkolenia = {
  organizator: 'SEMPER' | 'IIST'
  liczbaDni: number
  liczbaModulow: number
  autor?: string
  klient?: string
  szkolenieId?: string
  dataSzkolenia?: string
  zrodloProgramu?: string
  czyWynikParsowaniaZatwierdzony: boolean
}

const wzorzecHex = /^#[0-9a-f]{6}$/i

export const domyslneUstawieniaProgramu: UstawieniaProgramuSzkolenia = {
  presetWygladu: domyslnyPresetNowegoProgramu,
  czyWyborPresetySwiadomy: false,
  czyJustowac: true,
  elementyIdentyfikacji: {},
  profilFirmy: 'semper',
  kolorAkcentuProgramu: '#DE1914',
  kolorReczny: false,
  formatowanieSkryptowe: true,
  stylDni: 'pasek',
  separacjaModulow: 'separator-pytan',
  stylPodpunktow: 'punktory',
  stylListyGlownej: 'numeracja',
  stylePoziomowListy: ['•', '◦', '▪'],
  gruboscObramowaniaTytulu: 1,
  formatCudzyslowu: 'gorny-gorny',
  szerokoscLogotypu: 90,
  czyPogrubiacNaglowkiListyProgramu: true,
}

export const domyslnyProgramSzkolenia: ModelProgramuSzkolenia = {
  tytulSzkolenia: '',
  trescProgramu: '',
  czyWynikParsowaniaZatwierdzony: false,
  ustawienia: domyslneUstawieniaProgramu,
  logotypProgramu: '',
  linkLogotypu: '',
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc))
}

function tekstLubDomyslny(wartosc: unknown, domyslna = '') {
  return typeof wartosc === 'string' ? wartosc : domyslna
}

function liczbaLubDomyslna(wartosc: unknown, domyslna: number) {
  return typeof wartosc === 'number' && Number.isFinite(wartosc) ? wartosc : domyslna
}

export function czyKolorProgramuPoprawny(kolor: string) {
  return wzorzecHex.test(kolor)
}

export function normalizujProgramSzkolenia(zapis: unknown): ModelProgramuSzkolenia {
  const dane = czyObiekt(zapis) ? zapis : {}
  const ustawienia = czyObiekt(dane.ustawienia) ? dane.ustawienia : {}
  const trescProgramu = tekstLubDomyslny(dane.trescProgramu)
  const presetWygladu = normalizujPresetWygladuProgramu(ustawienia.presetWygladu)
  const stylePoziomowListy = Array.isArray(ustawienia.stylePoziomowListy)
    ? ustawienia.stylePoziomowListy.filter((styl): styl is string => typeof styl === 'string')
    : []

  return {
    tytulSzkolenia: tekstLubDomyslny(dane.tytulSzkolenia),
    trescProgramu,
    czyWynikParsowaniaZatwierdzony: dane.czyWynikParsowaniaZatwierdzony === true,
    ustawienia: {
      ...domyslneUstawieniaProgramu,
      ...ustawienia,
      presetWygladu,
      czyWyborPresetySwiadomy: ustawienia.czyWyborPresetySwiadomy === true,
      czyJustowac: typeof ustawienia.czyJustowac === 'boolean'
        ? ustawienia.czyJustowac
        : konfiguracjePresetowProgramu[presetWygladu].justowanie,
      elementyIdentyfikacji: czyObiekt(ustawienia.elementyIdentyfikacji) ? ustawienia.elementyIdentyfikacji : {},
      profilFirmy: ustawienia.profilFirmy === 'iist' ? 'iist' : 'semper',
      kolorAkcentuProgramu: tekstLubDomyslny(ustawienia.kolorAkcentuProgramu, domyslneUstawieniaProgramu.kolorAkcentuProgramu),
      kolorReczny: ustawienia.kolorReczny === true,
      formatowanieSkryptowe: typeof ustawienia.formatowanieSkryptowe === 'boolean' ? ustawienia.formatowanieSkryptowe : domyslneUstawieniaProgramu.formatowanieSkryptowe,
      stylDni: ustawienia.stylDni === 'naglowek' ? 'naglowek' : 'pasek',
      separacjaModulow: ustawienia.separacjaModulow === 'brak' || ustawienia.separacjaModulow === 'ramka' || ustawienia.separacjaModulow === 'linia' ? ustawienia.separacjaModulow : 'separator-pytan',
      stylPodpunktow: ustawienia.stylPodpunktow === 'numeracja' ? 'numeracja' : 'punktory',
      stylListyGlownej: ustawienia.stylListyGlownej === 'punktory' ? 'punktory' : 'numeracja',
      stylePoziomowListy: stylePoziomowListy.length ? stylePoziomowListy : [...domyslneUstawieniaProgramu.stylePoziomowListy],
      gruboscObramowaniaTytulu: liczbaLubDomyslna(ustawienia.gruboscObramowaniaTytulu, domyslneUstawieniaProgramu.gruboscObramowaniaTytulu),
      formatCudzyslowu: ustawienia.formatCudzyslowu === 'dolny-gorny' ? 'dolny-gorny' : 'gorny-gorny',
      szerokoscLogotypu: liczbaLubDomyslna(ustawienia.szerokoscLogotypu, domyslneUstawieniaProgramu.szerokoscLogotypu),
      czyPogrubiacNaglowkiListyProgramu: typeof ustawienia.czyPogrubiacNaglowkiListyProgramu === 'boolean' ? ustawienia.czyPogrubiacNaglowkiListyProgramu : domyslneUstawieniaProgramu.czyPogrubiacNaglowkiListyProgramu,
    },
    logotypProgramu: tekstLubDomyslny(dane.logotypProgramu),
    linkLogotypu: tekstLubDomyslny(dane.linkLogotypu),
  }
}

export function pobierzHtmlProgramuSzkolenia(dane: Pick<ModelProgramuSzkolenia, 'trescProgramu'>) {
  return konwertujTekstProgramuNaHtml(dane.trescProgramu)
}

export function utworzDokumentProgramuSzkolenia(
  dane: ModelProgramuSzkolenia,
  wynikParsowania: ProgramSzkolenia = parsujTekstProgramu(dane.trescProgramu),
): DokumentBlokowy {
  const organizator = dane.ustawienia.profilFirmy === 'iist' ? 'IIST' : 'SEMPER'

  return {
    ...wynikParsowania.dokumentBlokowy,
    dane: {
      ...wynikParsowania.dokumentBlokowy.dane,
      tytulSzkolenia: dane.tytulSzkolenia.trim() || 'Program szkolenia',
      organizator,
    },
    strona: {
      ...wynikParsowania.dokumentBlokowy.strona,
      naglowek: { ...wynikParsowania.dokumentBlokowy.strona.naglowek, organizator },
      stopka: { ...wynikParsowania.dokumentBlokowy.strona.stopka, organizator },
      logotyp: {
        ...wynikParsowania.dokumentBlokowy.strona.logotyp,
        aktywny: Boolean(dane.logotypProgramu),
        zrodlo: dane.logotypProgramu || undefined,
        szerokoscProcent: dane.ustawienia.szerokoscLogotypu,
      },
    },
    metadane: {
      ...wynikParsowania.dokumentBlokowy.metadane,
      zatwierdzonyPrzezUzytkownika: dane.czyWynikParsowaniaZatwierdzony,
    },
  }
}

export function walidujProgramSzkolenia(
  dane: ModelProgramuSzkolenia,
  dokument: DokumentBlokowy = utworzDokumentProgramuSzkolenia(dane),
): ProblemDokumentu[] {
  const problemy = [...sprawdzDokumentBlokowy(dokument), ...dokument.problemy]

  if (!dane.czyWynikParsowaniaZatwierdzony && dane.trescProgramu.trim()) {
    problemy.push({ id: 'wynik-parsowania-niezatwierdzony', poziom: 'ostrzezenie', kategoria: 'parser', komunikat: 'Wynik parsowania nie został jeszcze zatwierdzony.', czyBlokujeEksport: false })
  }

  if (!czyKolorProgramuPoprawny(dane.ustawienia.kolorAkcentuProgramu)) {
    problemy.push({ id: 'kolor-akcentu-niepoprawny', poziom: 'ostrzezenie', kategoria: 'formatowanie', komunikat: 'Kolor akcentu ma niepoprawny format i zostanie zastąpiony kolorem profilu.', czyBlokujeEksport: false })
  }

  const unikalne = new Map<string, ProblemDokumentu>()
  problemy.forEach((problem) => unikalne.set(`${problem.kategoria}-${problem.blokId ?? ''}-${problem.komunikat}`, problem))
  return Array.from(unikalne.values())
}
