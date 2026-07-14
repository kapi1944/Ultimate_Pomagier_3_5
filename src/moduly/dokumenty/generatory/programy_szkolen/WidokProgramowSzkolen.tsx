import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import PanelKontroliJakosciDokumentu from '../../../../wspolne/dokumenty/PanelKontroliJakosciDokumentu'
import {
  pobierzAktywnaKopieProgramu,
  pobierzAutosaveProgramu,
  pobierzIdAktywnejKopiiProgramu,
  ustawAktywnaKopieProgramu,
  usunAutosaveProgramu,
  zapiszAutosaveProgramu,
  zapiszJawnaKopieProgramu,
} from './magazynKopiiRoboczychProgramu'
import { pobierzProgramPoId } from './rejestrProgramowSzkolen'
import { ustawObslugeNiezapisanychProgramow } from './strzeznikNiezapisanychProgramow'
import {
  przygotujRaportEksportuDokumentu,
  sprawdzDokumentBlokowy,
  type BlokDokumentu,
  type DokumentBlokowy,
  type ProblemDokumentu,
} from '../../../../wspolne/dokumenty/modelBlokowy'
import { parsujTekstProgramu } from './ParserTekstu'
import RendererPodgladuProgramu from './RendererPodgladuProgramu'
import { EdytorProgramuWysiwyg } from './komponenty/EdytorProgramuWysiwyg'
import {
  konwertujHtmlNaTekstProgramu,
  konwertujTekstProgramuNaHtml,
  oczyscHtmlProgramu,
} from './komponenty/konwersjaProgramuWysiwyg'

type ProfilFirmy = 'semper' | 'iist'
type StylDni = 'pasek' | 'naglowek'
type SeparacjaModulow = 'brak' | 'ramka' | 'linia' | 'separator-pytan'
type StylPodpunktow = 'punktory' | 'numeracja'
type StylListyGlownej = 'numeracja' | 'punktory'
type FormatCudzyslowu = 'dolny-gorny' | 'gorny-gorny'

type UstawieniaProgramu = {
  profilFirmy: ProfilFirmy
  kolorAkcentuProgramu: string
  kolorReczny: boolean
  formatowanieSkryptowe: boolean
  stylDni: StylDni
  separacjaModulow: SeparacjaModulow
  stylPodpunktow: StylPodpunktow
  stylListyGlownej: StylListyGlownej
  stylePoziomowListy: string[]
  gruboscObramowaniaTytulu: number
  formatCudzyslowu: FormatCudzyslowu
  szerokoscLogotypu: number
  czyPogrubiacNaglowkiListyProgramu: boolean
}

type ZapisProgramuRoboczego = {
  tytulSzkolenia: string
  trescProgramu: string
  trescProgramuHtml: string
  czyWynikParsowaniaZatwierdzony: boolean
  ustawienia: UstawieniaProgramu
  logotypProgramu: string
  linkLogotypu: string
}

type DaneProfiluFirmy = {
  nazwa: string
  kolor: string
  kontakt: string
  stopka: string
}

const wzorzecHex = /^#[0-9a-f]{6}$/i
const punktoryDoWyboru = ['•', '◦', '▪', '-', '–', '*']
const etykietaNumeracjiListyGlownej = '1,2,3'

const daneProfilowFirmy: Record<ProfilFirmy, DaneProfiluFirmy> = {
  semper: {
    nazwa: 'SEMPER',
    kolor: '#DE1914',
    kontakt: 'Centrum Organizacji Szkoleń i Konferencji SEMPER',
    stopka:
      'Centrum Organizacji Szkoleń i Konferencji SEMPER | ul. Libelta 1a/2, 61-706 Poznań | NIP 7772616176 | REGON 301265926 | biuro@szkolenia-semper.pl',
  },
  iist: {
    nazwa: 'IIST',
    kolor: '#2E89BE',
    kontakt: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST',
    stopka: 'IIST - robocza stopka dokumentu programu szkolenia',
  },
}

const domyslneUstawienia: UstawieniaProgramu = {
  profilFirmy: 'semper',
  kolorAkcentuProgramu: daneProfilowFirmy.semper.kolor,
  kolorReczny: false,
  formatowanieSkryptowe: true,
  stylDni: 'pasek',
  separacjaModulow: 'ramka',
  stylPodpunktow: 'punktory',
  stylListyGlownej: 'numeracja',
  stylePoziomowListy: ['•', '◦', '▪'],
  gruboscObramowaniaTytulu: 1,
  formatCudzyslowu: 'dolny-gorny',
  szerokoscLogotypu: 90,
  czyPogrubiacNaglowkiListyProgramu: true,
}

const domyslnyZapisProgramu: ZapisProgramuRoboczego = {
  tytulSzkolenia: '',
  trescProgramu: '',
  trescProgramuHtml: '',
  czyWynikParsowaniaZatwierdzony: false,
  ustawienia: domyslneUstawienia,
  logotypProgramu: '',
  linkLogotypu: '',
}

const styleProgramuSzkolenia = `
.program-szkolen {
  display: grid;
  gap: 18px;
  color: #f4fff7;
}

.program-szkolen *,
.program-szkolen *::before,
.program-szkolen *::after {
  box-sizing: border-box;
}

.program-szkolen__naglowek {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.program-szkolen__naglowek h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
}

.program-szkolen__akcje,
.program-szkolen__przyciski,
.program-szkolen__wiersz-przyciskow {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.program-szkolen__przycisk {
  min-height: 38px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  border-radius: 6px;
  padding: 8px 12px;
  background: #041f0f;
  color: #f4fff7;
  cursor: pointer;
  font: inherit;
}

.program-szkolen__przycisk:hover,
.program-szkolen__przycisk--aktywny {
  border-color: #4ade80;
  background: #4ade80;
  color: #052e12;
}

.program-szkolen__komunikat {
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 6px;
  padding: 10px 12px;
  background: #082b14;
  color: #c7ead0;
  font-size: 0.92rem;
}

.program-szkolen__uklad {
  display: grid;
  grid-template-columns: minmax(710px, 1fr) minmax(800px, 800px) minmax(260px, 420px);
  justify-content: stretch;
  gap: 20px;
  align-items: start;
  min-width: 0;
}

.program-szkolen__panel {
  display: contents;
}

.program-szkolen__sekcja {
  border: 1px solid rgba(74, 222, 128, 0.25);
  border-radius: 8px;
  padding: 16px;
  background: #082b14;
}

.program-szkolen__sekcja--import {
  grid-column: 1;
  grid-row: 1;
  order: 1;
}

.program-szkolen__sekcja--edycja {
  grid-column: 1;
  grid-row: 1 / span 2;
  order: 2;
}

.program-szkolen__sekcja--logotypy {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  width: min(100%, 800px);
  order: 3;
}

.program-szkolen__sekcja--ustawienia {
  grid-column: 3;
  grid-row: 1 / span 2;
  order: 5;
}

.program-szkolen__sekcja h2 {
  margin: 0 0 14px;
  color: #e7fff0;
  font-size: 1rem;
  letter-spacing: 0;
}

.program-szkolen__akcje-parsowania {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.program-szkolen__siatka {
  display: grid;
  gap: 12px;
}

.program-szkolen__siatka--dwie {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.program-szkolen__siatka--logotypy {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 24px;
}

.program-szkolen__blok-logotypu {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.program-szkolen__blok-logotypu--link {
  border-left: 1px solid rgba(74, 222, 128, 0.22);
  padding-left: 24px;
}

.program-szkolen__separator {
  height: 1px;
  margin: 2px 0;
  background: rgba(74, 222, 128, 0.22);
}

.program-szkolen__srodtytul {
  margin: 4px 0 0;
  border-top: 1px solid rgba(74, 222, 128, 0.18);
  padding-top: 12px;
  color: #e7fff0;
  font-size: 0.95rem;
  font-weight: 700;
}

.program-szkolen__etykieta {
  display: grid;
  gap: 6px;
  color: #e7fff0;
  font-size: 0.92rem;
  font-weight: 700;
}

.program-szkolen__etykieta--poziom {
  grid-template-columns: 1fr 108px;
  align-items: center;
}

.program-szkolen__dopisek-etykiety {
  font-weight: 400;
}

.program-szkolen__pole,
.program-szkolen__lista {
  width: 100%;
  border: 1px solid rgba(74, 222, 128, 0.35);
  border-radius: 6px;
  padding: 9px 10px;
  background: #03180c;
  color: #f4fff7;
  font: inherit;
}

.program-szkolen__edytor-wysiwyg {
  display: grid;
  gap: 8px;
}

.program-szkolen__pasek-edytora {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  border: 1px solid rgba(74, 222, 128, 0.25);
  border-radius: 6px;
  padding: 8px;
  background: #03180c;
}

.program-szkolen__obszar-edytora {
  border: 1px solid rgba(74, 222, 128, 0.35);
  border-radius: 6px;
  background: #03180c;
  color: #f4fff7;
}

.program-szkolen__pole[type='color'] {
  min-height: 40px;
  padding: 3px;
}

.program-szkolen__pole[type='range'] {
  padding: 0;
}

.program-szkolen__pole:focus,
.program-szkolen__lista:focus {
  outline: 2px solid rgba(74, 222, 128, 0.55);
  outline-offset: 2px;
}

.program-szkolen__obszar-edytora:focus-within {
  outline: 2px solid rgba(74, 222, 128, 0.55);
  outline-offset: 2px;
}

.program-szkolen__tiptap {
  min-height: 620px;
  padding: 14px;
  color: #f4fff7;
  font: inherit;
  line-height: 1.55;
}

.program-szkolen__tiptap:focus {
  outline: none;
}

.program-szkolen__tiptap p,
.program-szkolen__tiptap h2,
.program-szkolen__tiptap h3,
.program-szkolen__tiptap ul,
.program-szkolen__tiptap ol {
  margin-top: 0;
}

.program-szkolen__tiptap h2,
.program-szkolen__tiptap h3 {
  color: #e7fff0;
}

.program-szkolen__tiptap ul,
.program-szkolen__tiptap ol {
  padding-left: 24px;
}

.program-szkolen__tiptap hr {
  border: 0;
  border-top: 1px solid rgba(74, 222, 128, 0.35);
  margin: 18px 0;
}

.program-szkolen__tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #86a891;
  pointer-events: none;
  height: 0;
}

.program-szkolen__lista--punktor-poziomu {
  font-size: 1.25rem;
  line-height: 1.2;
}

.program-szkolen__wybor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.program-szkolen__wybor--trzy {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.program-szkolen__wybor-profilu {
  border: 1px solid rgba(74, 222, 128, 0.35);
  border-radius: 6px;
  padding: 3px;
  background: #03180c;
}

.program-szkolen__przycisk-profilu {
  border-color: transparent;
  background: transparent;
}

.program-szkolen__blad {
  color: #fecaca;
  font-size: 0.82rem;
}

.program-szkolen__opis {
  margin: 0;
  color: #c7ead0;
  font-size: 0.82rem;
  font-weight: 400;
  line-height: 1.45;
}

.program-szkolen__podglad {
  display: flex;
  grid-column: 2;
  grid-row: 2;
  justify-content: center;
  overflow: visible;
  order: 4;
  padding-bottom: 24px;
}

.program-kartka-a4 {
  width: min(100%, 800px);
  aspect-ratio: 210 / 297;
  min-height: auto;
  margin: 0 auto;
  padding: 52px 56px;
  background: #ffffff;
  color: #1f2933;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  font-family: Arial, sans-serif;
}

.program-kartka-a4__naglowek {
  border-bottom: 4px solid currentColor;
  padding-bottom: 22px;
}

.program-kartka-a4__meta {
  display: flex;
  justify-content: space-between;
  gap: 32px;
}

.program-kartka-a4__profil {
  color: #111827;
  font-size: 1.45rem;
  font-weight: 700;
}

.program-kartka-a4__kontakt {
  max-width: 310px;
  color: #4b5563;
  font-size: 0.75rem;
  line-height: 1.45;
  text-align: right;
}

.program-kartka-a4__logotyp {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

.program-kartka-a4__logotyp img {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.program-kartka-a4__etykieta {
  margin-top: 30px;
  color: #111827;
  font-size: 1.08rem;
  font-weight: 700;
  text-align: center;
}

.program-kartka-a4__tytul {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18cm;
  max-width: 100%;
  min-height: 52px;
  margin: 12px auto 0;
  padding: 10px 16px;
  background: #d9d9d9;
  border: 1px solid #a6a6a6;
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
}

.program-kartka-a4__tresc {
  margin-top: 34px;
}

.program-kartka-a4__pusty {
  border: 1px dashed #cbd5e1;
  padding: 28px;
  color: #64748b;
  font-size: 0.92rem;
  text-align: center;
}

.program-kartka-a4__surowy {
  white-space: pre-wrap;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.7;
}

.program-kartka-a4__dzien {
  break-inside: avoid-page;
  margin-bottom: 28px;
}

.program-kartka-a4__dzien-tytul {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
}

.program-kartka-a4__dzien-tytul--pasek {
  padding: 8px 14px;
  color: #ffffff;
}

.program-kartka-a4__dzien-tytul--naglowek {
  border-bottom: 2px solid currentColor;
  padding-bottom: 8px;
  color: #111827;
}

.program-kartka-a4__temat-dnia {
  display: block;
  margin-top: 4px;
  font-size: 0.92rem;
  text-transform: none;
}

.program-kartka-a4__moduly {
  display: grid;
  gap: 14px;
}

.program-kartka-a4__modul {
  break-inside: avoid-page;
}

.program-kartka-a4__modul--ramka {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 13px 14px;
}

.program-kartka-a4__modul--separator-pytan {
  border-top: 2px solid currentColor;
  padding-top: 16px;
}

.program-kartka-a4__modul-tytul {
  margin: 0 0 10px;
  color: #1f2937;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
}

.program-kartka-a4__modul-tytul--linia {
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 7px;
}

.program-kartka-a4__lista {
  display: grid;
  gap: 7px;
}

.program-kartka-a4__pozycja {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 8px;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.program-kartka-a4__pozycja--niepewna,
.program-kartka-a4__modul--niepewny {
  outline: 1px dashed #f59e0b;
  outline-offset: 3px;
}

.program-kartka-a4__marker {
  color: #1f2937;
  text-align: right;
}

.program-kartka-a4__stopka {
  margin-top: 42px;
  border-top: 1px solid #d1d5db;
  padding-top: 12px;
  color: #6b7280;
  font-size: 0.7rem;
  line-height: 1.45;
  text-align: center;
}

@media (max-width: 1860px) {
  .program-szkolen__uklad {
    grid-template-columns: minmax(420px, 1fr) minmax(0, 800px);
  }

  .program-szkolen__sekcja--ustawienia {
    grid-column: 1 / -1;
    grid-row: 3;
  }
}

@media (max-width: 760px) {
  .program-szkolen__uklad {
    grid-template-columns: 1fr;
  }

  .program-szkolen__sekcja--import,
  .program-szkolen__sekcja--edycja,
  .program-szkolen__sekcja--logotypy,
  .program-szkolen__sekcja--ustawienia,
  .program-szkolen__podglad {
    grid-column: 1;
    grid-row: auto;
  }

  .program-szkolen__siatka--dwie,
  .program-szkolen__siatka--logotypy,
  .program-szkolen__wybor,
  .program-szkolen__wybor--trzy {
    grid-template-columns: 1fr;
  }

  .program-szkolen__blok-logotypu--link {
    border-left: 0;
    border-top: 1px solid rgba(74, 222, 128, 0.22);
    padding-top: 14px;
    padding-left: 0;
  }

  .program-kartka-a4 {
    padding: 28px 20px;
  }

  .program-kartka-a4__meta {
    flex-wrap: wrap;
  }

  .program-kartka-a4__kontakt {
    max-width: none;
    text-align: left;
  }

  .program-kartka-a4__tytul {
    width: 100%;
  }
}

@page {
  size: A4 portrait;
  margin: 14mm;
}

@media print {
  body {
    background: #ffffff !important;
  }

  .program-panel-roboczy,
  .menu-boczne {
    display: none !important;
  }

  .uklad-aplikacji {
    display: block !important;
    min-height: auto !important;
    background: #ffffff !important;
  }

  .uklad-aplikacji__obszar-roboczy {
    padding: 0 !important;
  }

  .program-szkolen__uklad {
    display: block !important;
  }

  .program-szkolen__podglad {
    overflow: visible !important;
  }

  .program-kartka-a4 {
    box-shadow: none !important;
    margin: 0 !important;
    width: 100% !important;
    min-height: auto !important;
    page-break-after: always;
  }
}
`

function sprawdzHex(kolor: string) {
  return wzorzecHex.test(kolor)
}

function pobierzKolorAkcentu(ustawienia: UstawieniaProgramu) {
  return sprawdzHex(ustawienia.kolorAkcentuProgramu)
    ? ustawienia.kolorAkcentuProgramu
    : daneProfilowFirmy[ustawienia.profilFirmy].kolor
}

function formatujTytulSzkolenia(tytul: string, formatCudzyslowu: FormatCudzyslowu) {
  const tekst = tytul.trim()

  if (!tekst) {
    return tekst
  }

  return formatCudzyslowu === 'gorny-gorny' ? `"${tekst}"` : `„${tekst}”`
}

function renderujMarkdownInline(tekst: string): ReactNode[] {
  const elementy: ReactNode[] = []
  const wzorzec = /(\*\*([^*]+)\*\*|\+\+([^+]+)\+\+|\*([^*\n]+)\*)/g
  let ostatniIndeks = 0
  let dopasowanie: RegExpExecArray | null = wzorzec.exec(tekst)

  while (dopasowanie) {
    if (dopasowanie.index > ostatniIndeks) {
      elementy.push(tekst.slice(ostatniIndeks, dopasowanie.index))
    }

    const klucz = `${dopasowanie.index}-${dopasowanie[0]}`

    if (dopasowanie[2]) {
      elementy.push(<strong key={klucz}>{dopasowanie[2]}</strong>)
    } else if (dopasowanie[3]) {
      elementy.push(<u key={klucz}>{dopasowanie[3]}</u>)
    } else if (dopasowanie[4]) {
      elementy.push(<em key={klucz}>{dopasowanie[4]}</em>)
    }

    ostatniIndeks = dopasowanie.index + dopasowanie[0].length
    dopasowanie = wzorzec.exec(tekst)
  }

  if (ostatniIndeks < tekst.length) {
    elementy.push(tekst.slice(ostatniIndeks))
  }

  return elementy.length ? elementy : [tekst]
}

function normalizujZapisProgramu(zapis: unknown): ZapisProgramuRoboczego {
  const dane = zapis && typeof zapis === 'object' ? (zapis as Partial<ZapisProgramuRoboczego>) : {}
  const trescProgramu = dane.trescProgramu ?? ''

  return {
    tytulSzkolenia: dane.tytulSzkolenia ?? '',
    trescProgramu,
    trescProgramuHtml: dane.trescProgramuHtml ?? konwertujTekstProgramuNaHtml(trescProgramu),
    czyWynikParsowaniaZatwierdzony: dane.czyWynikParsowaniaZatwierdzony ?? false,
    ustawienia: {
      ...domyslneUstawienia,
      ...dane.ustawienia,
      stylePoziomowListy: dane.ustawienia?.stylePoziomowListy?.length
        ? dane.ustawienia.stylePoziomowListy
        : domyslneUstawienia.stylePoziomowListy,
    },
    logotypProgramu: dane.logotypProgramu ?? '',
    linkLogotypu: dane.linkLogotypu ?? '',
  }
}
function czyPlikTekstowy(plik: File) {
  return plik.type.startsWith('text/') || /\.(txt|md|csv|html?)$/i.test(plik.name)
}

function splaszczBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
  return bloki.flatMap((blok) => [blok, ...splaszczBloki(blok.dzieci)])
}

function czyUzytkownikJestArchitektem() {
  try {
    const rola = localStorage.getItem('ultimate-pomagier-rola-uzytkownika') ?? localStorage.getItem('rolaUzytkownika')

    return rola === 'Architekt'
  } catch {
    return false
  }
}

function zapiszLogWymuszeniaEksportu(raport: ReturnType<typeof przygotujRaportEksportuDokumentu>) {
  try {
    const klucz = 'ultimate-pomagier.log-wymuszen-eksportu'
    const obecnyLog = JSON.parse(localStorage.getItem(klucz) ?? '[]') as unknown[]

    localStorage.setItem(
      klucz,
      JSON.stringify([
        ...obecnyLog,
        {
          data: new Date().toISOString(),
          format: raport.format,
          problemy: raport.problemy.map((problem) => problem.komunikat),
        },
      ]),
    )
  } catch {
    return
  }
}

type WlasciwosciWidokuProgramowSzkolen = {
  dokumentIdZTrasy?: string | null
}

export function WidokProgramowSzkolen({ dokumentIdZTrasy = null }: WlasciwosciWidokuProgramowSzkolen) {
  const [stanOdczytu, ustawStanOdczytu] = useState<'ladowanie' | 'gotowy' | 'blad'>(() => dokumentIdZTrasy ? 'ladowanie' : 'gotowy')
  const [bladOdczytu, ustawBladOdczytu] = useState('')
  const [aktywnaKopiaId, ustawAktywnaKopiaId] = useState<string | null>(() => dokumentIdZTrasy ? null : pobierzIdAktywnejKopiiProgramu())
  const [daneProgramu, ustawDaneProgramu] = useState<ZapisProgramuRoboczego>(() => normalizujZapisProgramu(dokumentIdZTrasy ? undefined : pobierzAktywnaKopieProgramu<ZapisProgramuRoboczego>()?.daneDokumentu))
  const [ostatniJawnyZapis, ustawOstatniJawnyZapis] = useState(() => JSON.stringify(daneProgramu))
  const [idSesjiAutosave] = useState(() => `program-autosave-${crypto.randomUUID()}`)
  const [autosaveDoDecyzji, ustawAutosaveDoDecyzji] = useState(() => pobierzAutosaveProgramu<ZapisProgramuRoboczego>())
  const [komunikat, ustawKomunikat] = useState('')
  const [stanZapisu, ustawStanZapisu] = useState<'zapisano' | 'zapisywanie' | 'blad'>('zapisano')

  useEffect(() => {
    if (!dokumentIdZTrasy) {
      return
    }

    const odroczonyOdczyt = window.setTimeout(() => {
      try {
        const kopia = pobierzProgramPoId<ZapisProgramuRoboczego>(dokumentIdZTrasy)

        if (!kopia) {
          ustawBladOdczytu('Nie znaleziono programu o wskazanym identyfikatorze lub ma niewłaściwy typ.')
          ustawStanOdczytu('blad')
          return
        }

        const dane = normalizujZapisProgramu(kopia.daneDokumentu)
        ustawAktywnaKopiaId(kopia.id)
        ustawDaneProgramu(dane)
        ustawOstatniJawnyZapis(JSON.stringify(dane))
        ustawStanOdczytu('gotowy')
      } catch {
        ustawBladOdczytu('Nie udało się odczytać wskazanego programu.')
        ustawStanOdczytu('blad')
      }
    }, 0)

    return () => window.clearTimeout(odroczonyOdczyt)
  }, [dokumentIdZTrasy])
  const { tytulSzkolenia, trescProgramu, trescProgramuHtml, czyWynikParsowaniaZatwierdzony, ustawienia, logotypProgramu, linkLogotypu } = daneProgramu

  const program = useMemo(() => parsujTekstProgramu(trescProgramu), [trescProgramu])
  const tytulDokumentu = tytulSzkolenia.trim() || program.tytul
  const kolorNiepoprawny = !sprawdzHex(ustawienia.kolorAkcentuProgramu)
  const dokumentProgramu = useMemo<DokumentBlokowy>(() => {
    const organizator = ustawienia.profilFirmy === 'iist' ? 'IIST' : 'SEMPER'

    return {
      ...program.dokumentBlokowy,
      dane: {
        ...program.dokumentBlokowy.dane,
        tytulSzkolenia: tytulDokumentu,
        organizator,
      },
      strona: {
        ...program.dokumentBlokowy.strona,
        naglowek: {
          ...program.dokumentBlokowy.strona.naglowek,
          organizator,
        },
        stopka: {
          ...program.dokumentBlokowy.strona.stopka,
          organizator,
        },
        logotyp: {
          ...program.dokumentBlokowy.strona.logotyp,
          aktywny: Boolean(logotypProgramu),
          zrodlo: logotypProgramu || undefined,
          szerokoscProcent: ustawienia.szerokoscLogotypu,
        },
      },
      metadane: {
        ...program.dokumentBlokowy.metadane,
        zatwierdzonyPrzezUzytkownika: czyWynikParsowaniaZatwierdzony,
      },
    }
  }, [czyWynikParsowaniaZatwierdzony, logotypProgramu, program.dokumentBlokowy, tytulDokumentu, ustawienia.profilFirmy, ustawienia.szerokoscLogotypu])
  const problemyDokumentu = useMemo<ProblemDokumentu[]>(() => {
    const problemy = [
      ...sprawdzDokumentBlokowy(dokumentProgramu),
      ...program.dokumentBlokowy.problemy,
    ]

    if (!czyWynikParsowaniaZatwierdzony && trescProgramu.trim()) {
      problemy.push({
        id: 'wynik-parsowania-niezatwierdzony',
        poziom: 'ostrzezenie',
        kategoria: 'parser',
        komunikat: 'Wynik parsowania nie został jeszcze zatwierdzony.',
        czyBlokujeEksport: false,
      })
    }

    if (kolorNiepoprawny) {
      problemy.push({
        id: 'kolor-akcentu-niepoprawny',
        poziom: 'ostrzezenie',
        kategoria: 'formatowanie',
        komunikat: 'Kolor akcentu ma niepoprawny format i zostanie zastąpiony kolorem profilu.',
        czyBlokujeEksport: false,
      })
    }

    const unikalne = new Map<string, ProblemDokumentu>()
    problemy.forEach((problem) => unikalne.set(`${problem.kategoria}-${problem.blokId ?? ''}-${problem.komunikat}`, problem))

    return Array.from(unikalne.values())
  }, [czyWynikParsowaniaZatwierdzony, dokumentProgramu, kolorNiepoprawny, program.dokumentBlokowy.problemy, trescProgramu])
  const tytulZCudzyslowem = formatujTytulSzkolenia(tytulDokumentu, ustawienia.formatCudzyslowu)
  const kolorAkcentu = pobierzKolorAkcentu(ustawienia)
  const profil = daneProfilowFirmy[ustawienia.profilFirmy]
  const blokiDokumentu = useMemo(() => splaszczBloki(dokumentProgramu.struktura), [dokumentProgramu.struktura])
  const diagnostykaParsera = useMemo(
    () =>
      blokiDokumentu.map((blok) => {
        const opis = blok.metadane.opisDiagnostyczny ? ` - ${blok.metadane.opisDiagnostyczny}` : ''

        return `${blok.typ}: ${blok.tresc ?? '(bez treści)'}${opis}`
      }),
    [blokiDokumentu],
  )
  const liczbaModulow = blokiDokumentu.filter((blok) => blok.typ === 'Modul').length
  const liczbaPunktow = blokiDokumentu.filter((blok) => blok.typ === 'Punkt' || blok.typ === 'Podpunkt').length
  const czyArchitekt = czyUzytkownikJestArchitektem()
  const gruboscObramowaniaTytulu = Number.isFinite(ustawienia.gruboscObramowaniaTytulu)
    ? Math.min(10, Math.max(0, ustawienia.gruboscObramowaniaTytulu))
    : domyslneUstawienia.gruboscObramowaniaTytulu
  const etykietaGrubosciObramowaniaTytulu = gruboscObramowaniaTytulu.toFixed(1).replace('.', ',')
  const czyListaGlownaNumerowana = ustawienia.stylListyGlownej === 'numeracja'
  const czyPokazacPoziomyPodpunktow = ustawienia.stylPodpunktow === 'punktory'
  const widoczneStylePoziomowListy = ustawienia.stylePoziomowListy
    .map((styl, indeks) => ({ styl, indeks }))
    .filter(({ indeks }) => indeks === 0 || czyPokazacPoziomyPodpunktow)

  const czyNiezapisaneZmiany = JSON.stringify(daneProgramu) !== ostatniJawnyZapis

  useEffect(() => {
    if (!czyNiezapisaneZmiany || autosaveDoDecyzji) {
      return
    }

    const odroczonyZapis = window.setTimeout(() => {
      ustawStanZapisu('zapisywanie')

      try {
        zapiszAutosaveProgramu({
          idSesji: idSesjiAutosave,
          aktywnaKopiaId: aktywnaKopiaId ?? undefined,
          daneDokumentu: daneProgramu,
        })
        ustawStanZapisu('zapisano')
      } catch {
        ustawStanZapisu('blad')
      }
    }, 500)

    return () => window.clearTimeout(odroczonyZapis)
  }, [aktywnaKopiaId, autosaveDoDecyzji, czyNiezapisaneZmiany, daneProgramu, idSesjiAutosave])

  useEffect(() => {
    function ostrzezPrzedOdswiezeniem(zdarzenie: BeforeUnloadEvent) {
      if (!czyNiezapisaneZmiany) {
        return
      }

      zdarzenie.preventDefault()
      zdarzenie.returnValue = ''
    }

    window.addEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
    return () => window.removeEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
  }, [czyNiezapisaneZmiany])

  function zmienDane<Nazwa extends keyof ZapisProgramuRoboczego>(nazwa: Nazwa, wartosc: ZapisProgramuRoboczego[Nazwa]) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      [nazwa]: wartosc,
    }))
  }

  function zmienTrescProgramuHtml(html: string, tekst = konwertujHtmlNaTekstProgramu(html)) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      trescProgramuHtml: html,
      trescProgramu: tekst,
      czyWynikParsowaniaZatwierdzony: false,
    }))
  }

  function zatwierdzWynikParsowania() {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      czyWynikParsowaniaZatwierdzony: true,
    }))
    ustawKomunikat('Wynik parsowania programu zatwierdzony.')
  }

  function zmienUstawienie<Nazwa extends keyof UstawieniaProgramu>(nazwa: Nazwa, wartosc: UstawieniaProgramu[Nazwa]) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      ustawienia: {
        ...aktualne.ustawienia,
        [nazwa]: wartosc,
      },
    }))
  }

  const zapiszRoboczo = useCallback((tryb: 'zapisz' | 'aktualizuj' | 'utworz_nowa') => {
    ustawStanZapisu('zapisywanie')

    try {
      const rekord = zapiszJawnaKopieProgramu({
        idAktywnejKopii: aktywnaKopiaId,
        tryb,
        tytul: daneProgramu.tytulSzkolenia,
        statusBiznesowy: daneProgramu.czyWynikParsowaniaZatwierdzony ? 'zatwierdzona' : 'robocza',
        daneDokumentu: daneProgramu,
        metadane: {
          organizator: ustawienia.profilFirmy === 'iist' ? 'IIST' : 'SEMPER',
          liczbaDni: program.dni.length,
          liczbaModulow,
          autor: undefined,
          klient: undefined,
          dataSzkolenia: undefined,
          zrodloProgramu: undefined,
          czyWynikParsowaniaZatwierdzony: daneProgramu.czyWynikParsowaniaZatwierdzony,
        },
      })
      ustawAktywnaKopiaId(rekord.id)
      ustawAktywnaKopieProgramu(rekord.id)
      ustawOstatniJawnyZapis(JSON.stringify(daneProgramu))
      ustawAutosaveDoDecyzji(null)
      ustawStanZapisu('zapisano')
      ustawKomunikat(tryb === 'utworz_nowa' ? 'Utworzono nową kopię roboczą.' : tryb === 'aktualizuj' ? 'Zaktualizowano kopię roboczą.' : 'Program zapisany jako kopia robocza.')
    } catch {
      ustawStanZapisu('blad')
      ustawKomunikat('Nie udało się zapisać programu roboczo.')
    }
  }, [aktywnaKopiaId, daneProgramu, liczbaModulow, program.dni.length, ustawienia.profilFirmy])

  function wyczyscProgram() {
    ustawDaneProgramu(domyslnyZapisProgramu)
    ustawKomunikat('Program wyczyszczony. Pusty stan pozostaje wyłącznie autosave.')
  }

  function przywrocAutosave() {
    if (!autosaveDoDecyzji) {
      return
    }

    ustawDaneProgramu(normalizujZapisProgramu(autosaveDoDecyzji.daneDokumentu))
    ustawAktywnaKopiaId(autosaveDoDecyzji.aktywnaKopiaId ?? null)
    if (autosaveDoDecyzji.aktywnaKopiaId) {
      ustawAktywnaKopieProgramu(autosaveDoDecyzji.aktywnaKopiaId)
    }
    ustawAutosaveDoDecyzji(null)
    ustawKomunikat('Przywrócono niezapisany draft.')
  }

  function odrzucAutosave() {
    usunAutosaveProgramu()
    ustawAutosaveDoDecyzji(null)
    ustawKomunikat('Odrzucono niezapisany draft.')
  }

  function anulujOdzyskiwanieAutosave() {
    window.history.back()
  }

  function drukujProgram() {
    const raport = przygotujRaportEksportuDokumentu(dokumentProgramu, 'PDF')

    if (!raport.czyDozwolony) {
      if (!czyArchitekt) {
        ustawKomunikat(`Eksport zablokowany: ${raport.problemy.filter((problem) => problem.czyBlokujeEksport).map((problem) => problem.komunikat).join(' ')}`)
        return
      }

      const czyPotwierdzono = window.confirm('Dokument ma błędy krytyczne. Czy jako Architekt wymuszasz eksport PDF?')

      if (!czyPotwierdzono) {
        ustawKomunikat('Eksport przerwany.')
        return
      }

      const raportWymuszony = przygotujRaportEksportuDokumentu(dokumentProgramu, 'PDF', true)

      zapiszLogWymuszeniaEksportu(raportWymuszony)
      ustawKomunikat('Architekt wymusił eksport mimo błędów krytycznych. Zapisano wpis w logu lokalnym.')
      window.print()
      return
    }

    ustawKomunikat('Otwieram drukowanie. PDF jest formatem referencyjnym.')
    window.print()
  }

  function zmienProfilFirmy(profilFirmy: ProfilFirmy) {
    ustawDaneProgramu((aktualne) => {
      const poprzedniKolor = daneProfilowFirmy[aktualne.ustawienia.profilFirmy].kolor
      const czyKolorProfilu = !aktualne.ustawienia.kolorReczny || aktualne.ustawienia.kolorAkcentuProgramu === poprzedniKolor

      return {
        ...aktualne,
        ustawienia: {
          ...aktualne.ustawienia,
          profilFirmy,
          kolorAkcentuProgramu: czyKolorProfilu
            ? daneProfilowFirmy[profilFirmy].kolor
            : aktualne.ustawienia.kolorAkcentuProgramu,
          kolorReczny: czyKolorProfilu ? false : aktualne.ustawienia.kolorReczny,
        },
      }
    })
  }

  function zmienKolor(kolor: string, kolorReczny = true) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      ustawienia: {
        ...aktualne.ustawienia,
        kolorAkcentuProgramu: kolor.toUpperCase(),
        kolorReczny,
      },
    }))
  }

  function przywrocKolorProfilu() {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      ustawienia: {
        ...aktualne.ustawienia,
        kolorAkcentuProgramu: daneProfilowFirmy[aktualne.ustawienia.profilFirmy].kolor,
        kolorReczny: false,
      },
    }))
  }

  function dodajPoziomListy() {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      ustawienia: {
        ...aktualne.ustawienia,
        stylePoziomowListy: [
          ...aktualne.ustawienia.stylePoziomowListy,
          punktoryDoWyboru[aktualne.ustawienia.stylePoziomowListy.length % punktoryDoWyboru.length],
        ],
      },
    }))
  }

  function zmienStylPoziomu(indeks: number, wartosc: string) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      ustawienia: {
        ...aktualne.ustawienia,
        stylePoziomowListy: aktualne.ustawienia.stylePoziomowListy.map((styl, pozycja) =>
          pozycja === indeks ? wartosc : styl,
        ),
      },
    }))
  }

  function importujProgramZPliku(plik?: File) {
    if (!plik) {
      return
    }

    if (!czyPlikTekstowy(plik)) {
      ustawKomunikat('DOC/DOCX/PDF wymagają wcześniejszej konwersji treści.')
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => {
      const zawartosc = String(czytnik.result ?? '')
      const czyHtml = plik.type === 'text/html' || /\.html?$/i.test(plik.name)
      const tekstProgramu = czyHtml ? konwertujHtmlNaTekstProgramu(zawartosc) : zawartosc
      const htmlProgramu = czyHtml ? oczyscHtmlProgramu(zawartosc) : konwertujTekstProgramuNaHtml(zawartosc)

      zmienTrescProgramuHtml(htmlProgramu, tekstProgramu)
      ustawKomunikat(`Zaimportowano program z pliku: ${plik.name}.`)
    }
    czytnik.onerror = () => ustawKomunikat('Nie udało się odczytać pliku programu.')
    czytnik.readAsText(plik)
  }

  function importujLogotypZPliku(plik?: File) {
    if (!plik) {
      return
    }

    if (!plik.type.startsWith('image/')) {
      ustawKomunikat('Wybierz plik graficzny logotypu.')
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => {
      zmienDane('logotypProgramu', String(czytnik.result ?? ''))
      ustawKomunikat(`Dodano logotyp z pliku: ${plik.name}.`)
    }
    czytnik.onerror = () => ustawKomunikat('Nie udało się odczytać pliku logotypu.')
    czytnik.readAsDataURL(plik)
  }

  function zastosujLinkLogotypu() {
    const link = linkLogotypu.trim()

    if (!link) {
      return
    }

    zmienDane('logotypProgramu', link)
    ustawKomunikat('Dodano logotyp z linku.')
  }

  function otworzDyskGoogle() {
    window.open('https://drive.google.com', '_blank', 'noopener,noreferrer')
  }

  function renderujProgramSkryptowy() {
    return (
      <RendererPodgladuProgramu
        czyPogrubiacNaglowkiListyProgramu={ustawienia.czyPogrubiacNaglowkiListyProgramu}
        dokument={dokumentProgramu}
        kolorAkcentu={kolorAkcentu}
        separacjaModulow={ustawienia.separacjaModulow}
        stylDni={ustawienia.stylDni}
        stylListyGlownej={ustawienia.stylListyGlownej}
        stylPodpunktow={ustawienia.stylPodpunktow}
        stylePoziomowListy={ustawienia.stylePoziomowListy}
      />
    )
  }

  function renderujProgramZachowawczy() {
    if (!trescProgramu.trim()) {
      return <div className="program-kartka-a4__pusty">Brak treści programu.</div>
    }

    const wierszeProgramu = trescProgramu.split('\n')

    return (
      <div className="program-kartka-a4__surowy">
        {wierszeProgramu.map((wiersz, indeks) => (
          <span key={`${indeks}-${wiersz}`}>
            {renderujMarkdownInline(wiersz)}
            {indeks < wierszeProgramu.length - 1 && <br />}
          </span>
        ))}
      </div>
    )
  }

  useEffect(() => {
    return ustawObslugeNiezapisanychProgramow({
      czySaNiezapisaneZmiany: () => JSON.stringify(daneProgramu) !== ostatniJawnyZapis,
      zapiszPrzedWyjsciem: () => zapiszRoboczo(aktywnaKopiaId ? 'aktualizuj' : 'zapisz'),
    })
  }, [aktywnaKopiaId, daneProgramu, ostatniJawnyZapis, zapiszRoboczo])

  if (stanOdczytu === 'ladowanie') {
    return (
      <section className="widok program-szkolen" role="status">
        <p>Ładowanie programu...</p>
      </section>
    )
  }

  if (stanOdczytu === 'blad') {
    return (
      <section className="widok program-szkolen" role="alert">
        <h1>Nie można otworzyć programu</h1>
        <p>{bladOdczytu}</p>
      </section>
    )
  }
  return (
    <section className="widok program-szkolen">
      <style>{styleProgramuSzkolenia}</style>

      <header className="program-panel-roboczy program-szkolen__naglowek">
        <h1>Programy szkoleń</h1>
        <div className="program-szkolen__akcje">
          <span role="status">{stanZapisu === 'zapisywanie' ? 'Zapisywanie...' : stanZapisu === 'blad' ? 'Błąd zapisu' : 'Zapisano'}</span>
          <button className="program-szkolen__przycisk" onClick={drukujProgram} type="button">
            Drukuj
          </button>
          {aktywnaKopiaId ? (
            <>
              <button className="program-szkolen__przycisk" onClick={() => zapiszRoboczo('aktualizuj')} type="button">
                Aktualizuj kopię
              </button>
              <button className="program-szkolen__przycisk" onClick={() => zapiszRoboczo('utworz_nowa')} type="button">
                Utwórz nową kopię
              </button>
            </>
          ) : (
            <button className="program-szkolen__przycisk" onClick={() => zapiszRoboczo('zapisz')} type="button">
              Zapisz kopię roboczą
            </button>
          )}
          <button className="program-szkolen__przycisk" onClick={wyczyscProgram} type="button">
            Wyczyść program
          </button>
        </div>
      </header>

      {komunikat && <div className="program-panel-roboczy program-szkolen__komunikat">{komunikat}</div>}
      {autosaveDoDecyzji && (
        <section className="program-panel-roboczy program-szkolen__komunikat" role="dialog" aria-modal="true" aria-label="Odzyskiwanie niezapisanego draftu">
          <strong>Wykryto niezapisany draft.</strong>
          <div className="program-szkolen__akcje">
            <button className="program-szkolen__przycisk" type="button" onClick={przywrocAutosave}>Przywróć</button>
            <button className="program-szkolen__przycisk" type="button" onClick={odrzucAutosave}>Odrzuć</button>
            <button className="program-szkolen__przycisk" type="button" onClick={anulujOdzyskiwanieAutosave}>Anuluj i wróć</button>
          </div>
        </section>
      )}

      <div className="program-szkolen__uklad">
        <div className="program-panel-roboczy program-szkolen__panel">
          <section className="program-szkolen__sekcja program-szkolen__sekcja--ustawienia">
            <h2>USTAWIENIA</h2>
            <div className="program-szkolen__siatka">
              <PanelKontroliJakosciDokumentu
                czyZatwierdzony={czyWynikParsowaniaZatwierdzony}
                diagnostykaParsera={diagnostykaParsera}
                liczbaBlokow={blokiDokumentu.length}
                liczbaDni={program.dni.length}
                liczbaModulow={liczbaModulow}
                liczbaPunktow={liczbaPunktow}
                pokazDiagnostykeParsera={czyArchitekt}
                problemy={problemyDokumentu}
              />

              <div className="program-szkolen__etykieta">
                Profil firmy
                <div className="program-szkolen__wybor program-szkolen__wybor-profilu">
                  {(['semper', 'iist'] as ProfilFirmy[]).map((profilFirmy) => (
                    <button
                      className="program-szkolen__przycisk program-szkolen__przycisk-profilu"
                      key={profilFirmy}
                      onClick={() => zmienProfilFirmy(profilFirmy)}
                      style={
                        ustawienia.profilFirmy === profilFirmy
                          ? {
                              backgroundColor: daneProfilowFirmy[profilFirmy].kolor,
                              borderColor: daneProfilowFirmy[profilFirmy].kolor,
                              color: '#ffffff',
                            }
                          : undefined
                      }
                      type="button"
                    >
                      {daneProfilowFirmy[profilFirmy].nazwa}
                    </button>
                  ))}
                </div>
              </div>

              <div className="program-szkolen__siatka program-szkolen__siatka--dwie">
                <label className="program-szkolen__etykieta">
                  Kolor separatora
                  <input
                    className="program-szkolen__pole"
                    onChange={(zdarzenie) => zmienKolor(zdarzenie.target.value)}
                    type="color"
                    value={kolorAkcentu}
                  />
                </label>
                <label className="program-szkolen__etykieta">
                  HEX
                  <input
                    className="program-szkolen__pole"
                    onChange={(zdarzenie) => zmienKolor(zdarzenie.target.value)}
                    pattern="^#[0-9a-fA-F]{6}$"
                    type="text"
                    value={ustawienia.kolorAkcentuProgramu}
                  />
                </label>
              </div>
              {kolorNiepoprawny && <div className="program-szkolen__blad">Wpisz kolor w formacie #RRGGBB.</div>}
              <button className="program-szkolen__przycisk" onClick={przywrocKolorProfilu} type="button">
                Przywróć kolor profilu
              </button>

              <div className="program-szkolen__srodtytul">Tytuł</div>

              <label className="program-szkolen__etykieta">
                Grubość obramowania tytułu: {etykietaGrubosciObramowaniaTytulu}
                <input
                  className="program-szkolen__pole"
                  min={0}
                  max={10}
                  onChange={(zdarzenie) => zmienUstawienie('gruboscObramowaniaTytulu', Number(zdarzenie.target.value))}
                  step={0.1}
                  type="range"
                  value={gruboscObramowaniaTytulu}
                />
              </label>

              <label className="program-szkolen__etykieta">
                Format cudzysłowu
                <select
                  className="program-szkolen__lista"
                  onChange={(zdarzenie) => zmienUstawienie('formatCudzyslowu', zdarzenie.target.value as FormatCudzyslowu)}
                  value={ustawienia.formatCudzyslowu}
                >
                  <option value="dolny-gorny">„Tytuł”</option>
                  <option value="gorny-gorny">"Tytuł"</option>
                </select>
              </label>

              <div className="program-szkolen__srodtytul">Treść programu</div>

              <label className="program-szkolen__etykieta">
                <span>
                  <input
                    checked={ustawienia.formatowanieSkryptowe}
                    onChange={(zdarzenie) => zmienUstawienie('formatowanieSkryptowe', zdarzenie.target.checked)}
                    type="checkbox"
                  />{' '}
                  Formatowanie skryptowe
                </span>
              </label>

              <label className="program-szkolen__etykieta">
                <span>
                  <input
                    checked={ustawienia.czyPogrubiacNaglowkiListyProgramu}
                    onChange={(zdarzenie) =>
                      zmienUstawienie('czyPogrubiacNaglowkiListyProgramu', zdarzenie.target.checked)
                    }
                    type="checkbox"
                  />{' '}
                  Pogrubiaj nagłówki listy programu
                </span>
                <p className="program-szkolen__opis">
                  Po włączeniu pogrubiane są tylko główne linie programu. Podpunkty i niższe poziomy listy pozostają
                  zwykłe.
                </p>
              </label>

              <label className="program-szkolen__etykieta">
                Styl dni
                <select
                  className="program-szkolen__lista"
                  onChange={(zdarzenie) => zmienUstawienie('stylDni', zdarzenie.target.value as StylDni)}
                  value={ustawienia.stylDni}
                >
                  <option value="pasek">Pasek</option>
                  <option value="naglowek">Nagłówek tekstowy</option>
                </select>
              </label>

              <label className="program-szkolen__etykieta">
                Separacja modułów
                <select
                  className="program-szkolen__lista"
                  onChange={(zdarzenie) => zmienUstawienie('separacjaModulow', zdarzenie.target.value as SeparacjaModulow)}
                  value={ustawienia.separacjaModulow}
                >
                  <option value="brak">Brak</option>
                  <option value="ramka">Ramka</option>
                  <option value="linia">Linia pod tytułem</option>
                  <option value="separator-pytan">Separator kolejnych pytań</option>
                </select>
              </label>

              <div className="program-szkolen__siatka program-szkolen__siatka--dwie">
                <label className="program-szkolen__etykieta">
                  Styl listy głównej
                  <select
                    className="program-szkolen__lista"
                    onChange={(zdarzenie) => zmienUstawienie('stylListyGlownej', zdarzenie.target.value as StylListyGlownej)}
                    value={ustawienia.stylListyGlownej}
                  >
                    <option value="numeracja">Numeracja</option>
                    <option value="punktory">Punktory</option>
                  </select>
                </label>
                <label className="program-szkolen__etykieta">
                  Styl podpunktów
                  <select
                    className="program-szkolen__lista"
                    onChange={(zdarzenie) => zmienUstawienie('stylPodpunktow', zdarzenie.target.value as StylPodpunktow)}
                    value={ustawienia.stylPodpunktow}
                  >
                    <option value="punktory">Punktory</option>
                    <option value="numeracja">Numeracja</option>
                  </select>
                </label>
              </div>

              <div className="program-szkolen__siatka">
                {widoczneStylePoziomowListy.map(({ styl, indeks }) => {
                  const czyPoziomListyGlownejNumerowany = indeks === 0 && czyListaGlownaNumerowana

                  return (
                    <Fragment key={indeks}>
                      <label className="program-szkolen__etykieta program-szkolen__etykieta--poziom">
                        <span>
                          Poziom {indeks + 1}
                          {indeks === 0 && (
                            <>
                              {' '}
                              <span className="program-szkolen__dopisek-etykiety">(nagłówek)</span>
                            </>
                          )}
                        </span>
                        <select
                          className="program-szkolen__lista program-szkolen__lista--punktor-poziomu"
                          disabled={czyPoziomListyGlownejNumerowany}
                          onChange={(zdarzenie) => zmienStylPoziomu(indeks, zdarzenie.target.value)}
                          value={czyPoziomListyGlownejNumerowany ? etykietaNumeracjiListyGlownej : styl}
                        >
                          {czyPoziomListyGlownejNumerowany ? (
                            <option value={etykietaNumeracjiListyGlownej}>{etykietaNumeracjiListyGlownej}</option>
                          ) : (
                            punktoryDoWyboru.map((punktor) => (
                              <option key={punktor} value={punktor}>
                                {punktor}
                              </option>
                            ))
                          )}
                        </select>
                      </label>
                      {indeks === 0 && <div className="program-szkolen__separator" />}
                    </Fragment>
                  )
                })}
                {czyPokazacPoziomyPodpunktow && (
                  <button className="program-szkolen__przycisk" onClick={dodajPoziomListy} type="button">
                    Dodaj poziom
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="program-szkolen__sekcja program-szkolen__sekcja--logotypy">
            <h2>LOGOTYPY</h2>
            <div className="program-szkolen__siatka">
              <div className="program-szkolen__siatka program-szkolen__siatka--logotypy">
                <div className="program-szkolen__blok-logotypu">
                  <label className="program-szkolen__etykieta">
                    Logotyp z pliku graficznego
                    <input
                      accept="image/*"
                      className="program-szkolen__pole"
                      onChange={(zdarzenie) => importujLogotypZPliku(zdarzenie.target.files?.[0])}
                      type="file"
                    />
                  </label>
                </div>

                <div className="program-szkolen__blok-logotypu program-szkolen__blok-logotypu--link">
                  <label className="program-szkolen__etykieta">
                    Publiczny link do logotypu
                    <input
                      className="program-szkolen__pole"
                      onChange={(zdarzenie) => zmienDane('linkLogotypu', zdarzenie.target.value)}
                      type="url"
                      value={linkLogotypu}
                    />
                  </label>

                  <div className="program-szkolen__wiersz-przyciskow">
                    <button className="program-szkolen__przycisk" onClick={zastosujLinkLogotypu} type="button">
                      Użyj linku
                    </button>
                    <button className="program-szkolen__przycisk" onClick={otworzDyskGoogle} type="button">
                      Otwórz Dysk Google
                    </button>
                  </div>
                </div>
              </div>

              <div className="program-szkolen__separator" />

              <label className="program-szkolen__etykieta">
                Szerokość logotypu: {ustawienia.szerokoscLogotypu}%
                <input
                  className="program-szkolen__pole"
                  max={100}
                  min={10}
                  onChange={(zdarzenie) => zmienUstawienie('szerokoscLogotypu', Number(zdarzenie.target.value))}
                  step={5}
                  type="range"
                  value={ustawienia.szerokoscLogotypu}
                />
              </label>
            </div>
          </section>

          <section className="program-szkolen__sekcja program-szkolen__sekcja--edycja">
            <h2>EDYCJA</h2>
            <div className="program-szkolen__siatka">
              <label className="program-szkolen__etykieta">
                Tytuł szkolenia
                <input
                  className="program-szkolen__pole"
                  onChange={(zdarzenie) => zmienDane('tytulSzkolenia', zdarzenie.target.value)}
                  type="text"
                  value={tytulSzkolenia}
                />
              </label>

              <label className="program-szkolen__etykieta">
                Program z pliku
                <input
                  accept=".txt,.md,.csv,.html,.htm,text/*"
                  className="program-szkolen__pole"
                  onChange={(zdarzenie) => importujProgramZPliku(zdarzenie.target.files?.[0])}
                  type="file"
                />
              </label>

              <div className="program-szkolen__srodtytul">Treść programu</div>

              <div className="program-szkolen__akcje-parsowania">
                <button className="program-szkolen__przycisk" disabled={!trescProgramu.trim()} onClick={zatwierdzWynikParsowania} type="button">
                  Zatwierdź wynik parsowania
                </button>
              </div>

              <EdytorProgramuWysiwyg
                onZmianaHtml={(html) => zmienTrescProgramuHtml(html)}
                onZmianaTekstuProgramu={() => undefined}
                wartoscHtml={trescProgramuHtml}
              />
            </div>
          </section>
        </div>

        <section className="program-szkolen__podglad">
          <div className="program-kartka-a4">
            <header className="program-kartka-a4__naglowek" style={{ borderColor: kolorAkcentu }}>
              <div className="program-kartka-a4__meta">
                <div className="program-kartka-a4__profil">{profil.nazwa}</div>
                <div className="program-kartka-a4__kontakt">{profil.kontakt}</div>
              </div>

              {logotypProgramu && (
                <div className="program-kartka-a4__logotyp">
                  <img alt="Logotyp" src={logotypProgramu} style={{ width: `${ustawienia.szerokoscLogotypu}%` }} />
                </div>
              )}

              <div className="program-kartka-a4__etykieta">Program szkolenia</div>
              <div
                className="program-kartka-a4__tytul"
                style={{
                  borderWidth: `${gruboscObramowaniaTytulu}px`,
                  color: kolorAkcentu,
                }}
              >
                {tytulZCudzyslowem || '„Program szkolenia”'}
              </div>
            </header>

            <main className="program-kartka-a4__tresc">
              {ustawienia.formatowanieSkryptowe ? renderujProgramSkryptowy() : renderujProgramZachowawczy()}
            </main>

            <footer className="program-kartka-a4__stopka">{profil.stopka}</footer>
          </div>
        </section>
      </div>
    </section>
  )
}

export default WidokProgramowSzkolen
