import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKontekstUzytkownika } from '../../../../aplikacja/logowanie/useKontekstUzytkownika'
import AkcjeEksportuPdf from '../../../../wspolne/dokumenty/AkcjeEksportuPdf'
import { utworzNazwePlikuDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import PanelKontroliJakosciDokumentu from '../../../../wspolne/dokumenty/PanelKontroliJakosciDokumentu'
import type { TrybRenderowaniaDokumentu } from '../../../../wspolne/dokumenty/trybRenderowaniaDokumentu'
import { ObszarZPanelemGeneratora, PanelBocznyGeneratora, PasekAkcjiGeneratora, PrzyciskPaneluGeneratora } from '../../wspolne/UkladGeneratoraDokumentu'
import StatusZapisuDokumentu from '../../wspolne/StatusZapisuDokumentu'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from '../../wspolne/useStanDokumentu'
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
import {
  przygotujRaportEksportuDokumentu,
  type BlokDokumentu,
} from '../../../../wspolne/dokumenty/modelBlokowy'
import { parsujTekstProgramu } from './ParserTekstu'
import {
  importujTekstProgramu,
  pobierzDomyslnieZaakceptowanePolaImportuProgramu,
  przygotujZmianyImportuProgramu,
  zastosujZaakceptowaneZmianyImportuProgramu,
  type PoleImportuProgramu,
  type TrybZastosowaniaImportuProgramu,
  type WynikImportuProgramu,
} from './pipelineImportuProgramu'
import { importujDocxProgramu } from './adapterDocxProgramu'
import { importujPdfProgramu } from './adapterPdfProgramu'
import { pobierzTytulDokumentuProgramu } from './tytulDokumentuProgramu'
import RendererStronProgramu from './RendererStronProgramu'
import { utworzKontekstSwobodnychBlokowProgramu } from './adapterSwobodnychBlokowProgramu'
import logotypSemper from './zasoby/logotyp-semper.png'
import mapaPolskiSemper from './zasoby/mapa-polski-semper.png'
import {
  konfiguracjePresetowProgramu,
  pobierzElementyIdentyfikacjiProgramu,
  zasugerujPresetProgramu,
  type ElementyIdentyfikacjiProgramu,
  type PresetWygladuProgramu,
} from './presetyProgramu'
import { EdytorProgramuWysiwyg } from './komponenty/EdytorProgramuWysiwyg'
import {
  konwertujHtmlNaTekstProgramu,
} from './komponenty/konwersjaProgramuWysiwyg'
import { czyUzytkownikMozeWymusicEksportProgramu } from './uprawnieniaEksportuProgramu'
import {
  czyKolorProgramuPoprawny as sprawdzHex,
  domyslneUstawieniaProgramu as domyslneUstawienia,
  domyslnyProgramSzkolenia as domyslnyZapisProgramu,
  normalizujProgramSzkolenia as normalizujZapisProgramu,
  pobierzHtmlProgramuSzkolenia,
  utworzDokumentProgramuSzkolenia,
  walidujProgramSzkolenia,
  type FormatCudzyslowuProgramu as FormatCudzyslowu,
  type ModelProgramuSzkolenia as ZapisProgramuRoboczego,
  type ProfilFirmyProgramu as ProfilFirmy,
  type SeparacjaModulowProgramu as SeparacjaModulow,
  type StylDniProgramu as StylDni,
  type StylListyGlownejProgramu as StylListyGlownej,
  type StylPodpunktowProgramu as StylPodpunktow,
  type UstawieniaProgramuSzkolenia as UstawieniaProgramu,
} from './modelProgramuSzkolenia'

type DaneProfiluFirmy = {
  nazwa: string
  kolor: string
  kontakt: string
  stopka: string
}

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

const styleProgramuSzkolenia = `
.program-szkolen {
  display: grid;
  min-width: 0;
  gap: 18px;
  color: var(--ui-tekst);
  container-type: inline-size;
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
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 35%, transparent);
  border-radius: 6px;
  padding: 8px 12px;
  background: var(--ui-panel);
  color: var(--ui-tekst);
  cursor: pointer;
  font: inherit;
}

.program-szkolen__przycisk:hover,
.program-szkolen__przycisk--aktywny {
  border-color: var(--ui-akcent);
  background: var(--ui-akcent);
  color: var(--ui-tekst-na-akcencie);
}

.program-szkolen__komunikat {
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 28%, transparent);
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--ui-powierzchnia);
  color: var(--ui-tekst-drugi);
  font-size: 0.92rem;
}

.program-szkolen__uklad {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(0, 800px);
  justify-content: stretch;
  gap: 20px;
  align-items: start;
  min-width: 0;
}

.program-szkolen__panel {
  display: contents;
}

.program-szkolen__sekcja {
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 25%, transparent);
  border-radius: 8px;
  padding: 16px;
  background: var(--ui-powierzchnia);
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

.program-szkolen__sekcja h2 {
  margin: 0 0 14px;
  color: var(--ui-tekst);
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
  border-left: 1px solid color-mix(in srgb, var(--ui-akcent) 22%, transparent);
  padding-left: 24px;
}

.program-szkolen__separator {
  height: 1px;
  margin: 2px 0;
  background: color-mix(in srgb, var(--ui-akcent) 22%, transparent);
}

.program-szkolen__srodtytul {
  margin: 4px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--ui-akcent) 18%, transparent);
  padding-top: 12px;
  color: var(--ui-tekst);
  font-size: 0.95rem;
  font-weight: 700;
}

.program-szkolen__etykieta {
  display: grid;
  gap: 6px;
  color: var(--ui-tekst);
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
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 35%, transparent);
  border-radius: 6px;
  padding: 9px 10px;
  background: var(--ui-pole);
  color: var(--ui-tekst);
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
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 25%, transparent);
  border-radius: 6px;
  padding: 8px;
  background: var(--ui-pole);
}

.program-szkolen__obszar-edytora {
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 35%, transparent);
  border-radius: 6px;
  background: var(--ui-pole);
  color: var(--ui-tekst);
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
  outline: 2px solid color-mix(in srgb, var(--ui-akcent) 55%, transparent);
  outline-offset: 2px;
}

.program-szkolen__obszar-edytora:focus-within {
  outline: 2px solid color-mix(in srgb, var(--ui-akcent) 55%, transparent);
  outline-offset: 2px;
}

.program-szkolen__tiptap {
  min-height: 620px;
  padding: 14px;
  color: var(--ui-tekst);
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
  color: var(--ui-tekst);
}

.program-szkolen__tiptap ul,
.program-szkolen__tiptap ol {
  padding-left: 24px;
}

.program-szkolen__tiptap hr {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--ui-akcent) 35%, transparent);
  margin: 18px 0;
}

.program-szkolen__tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--ui-tekst-drugi);
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
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 35%, transparent);
  border-radius: 6px;
  padding: 3px;
  background: var(--ui-pole);
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
  color: var(--ui-tekst-drugi);
  font-size: 0.82rem;
  font-weight: 400;
  line-height: 1.45;
}

.program-szkolen__podglad {
  display: flex;
  grid-column: 2;
  grid-row: 2;
  justify-content: center;
  min-width: 0;
  overflow: auto;
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
  display: grid;
  gap: 0;
  white-space: pre-wrap;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.7;
}

.program-kartka-a4__wiersz-surowy {
  min-height: 1.7em;
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

.program-szkolen__identyfikacja {
  display: grid;
  gap: 9px;
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 28%, transparent);
  border-radius: 6px;
  padding: 10px;
}

.program-szkolen__identyfikacja summary {
  cursor: pointer;
  font-weight: 700;
}

.program-strony {
  display: grid;
  gap: 22px;
  width: max-content;
  min-width: var(--program-szerokosc-strony);
  margin: 0 auto;
}

.program-semper__strona {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--program-szerokosc-strony);
  height: var(--program-wysokosc-strony);
  box-sizing: border-box;
  max-width: none;
  padding: var(--program-odstep-gorny) var(--program-odstep-poziomy) calc(var(--program-wysokosc-stopki) + 6mm);
  overflow: hidden;
  background: #fff;
  color: #4f4f4f;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  font-family: Arial, sans-serif;
}

.program-semper__naglowek {
  position: relative;
  display: grid;
  grid-template-columns: .7fr 1.6fr 1.45fr .95fr;
  align-items: center;
  min-height: 18mm;
  margin: calc(-1 * var(--program-odstep-gorny)) calc(-1 * var(--program-odstep-poziomy)) 7mm;
  padding: 3mm var(--program-odstep-poziomy);
  color: #888;
  font-size: 8.5pt;
}

.program-semper__pas {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #efefef;
}

.program-semper__naglowek > :not(.program-semper__pas) {
  position: relative;
  z-index: 1;
}

.program-semper__kontakt-etykieta,
.program-semper__kontakt {
  min-height: 10mm;
  padding: 0 3mm;
  border-right: 1px solid #d2d2d2;
}

.program-semper__kontakt {
  display: grid;
  align-content: center;
  gap: 1.5mm;
  text-align: center;
}

.program-semper__logo {
  max-width: 100%;
  max-height: 12mm;
  margin-left: 3mm;
  object-fit: contain;
}

.program-semper__etykieta {
  margin: 2mm 0 3mm;
  color: #de1914;
  font-size: 11pt;
  font-weight: 700;
  text-align: center;
}

.program-semper__panel-tytulu {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 18mm;
  margin: 0 3mm 7mm;
  padding: 4mm 7mm;
  overflow-wrap: anywhere;
  background: #e7e7e7;
  color: #333;
  font-size: 13pt;
  font-weight: 700;
  line-height: 1.28;
  text-align: center;
}

.program-semper__tresc {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.program-semper__tresc--justowana .program-kartka-a4__pozycja > span:last-child {
  text-align: justify;
}

.program-semper__tresc .program-kartka-a4__dzien {
  break-inside: avoid-page;
  margin-bottom: 5mm;
}

.program-kartka-a4__grupa-punktow {
  display: grid;
  gap: 7px;
}

.program-strony--semper_kompaktowy .program-kartka-a4__lista,
.program-strony--semper_kompaktowy .program-kartka-a4__grupa-punktow { gap: 3px; }
.program-strony--semper_szczegolowy .program-kartka-a4__lista,
.program-strony--semper_szczegolowy .program-kartka-a4__grupa-punktow { gap: 2px; }
.program-strony--semper_szczegolowy .program-kartka-a4__pozycja { font-size: .82rem; line-height: 1.35; }
.program-strony--semper_wedlug_dni .program-kartka-a4__dzien-tytul { break-after: avoid-page; }

.program-semper__stopka {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: var(--program-wysokosc-stopki);
  color: #858585;
  font-size: 7.8pt;
}

.program-semper__numer-strony {
  padding: 1.5mm;
  text-align: center;
}

.program-semper__stopka-pas {
  display: flex;
  min-height: 18mm;
  align-items: center;
  justify-content: space-between;
  gap: 24mm;
  padding: 3mm var(--program-odstep-poziomy);
  background: #efefef;
  line-height: 1.35;
}

.program-semper__stopka-pas > div:last-child {
  max-width: 58mm;
  text-align: right;
}

.program-semper__mapa {
  position: absolute;
  right: 5mm;
  bottom: 4mm;
  width: 22mm;
  max-height: 20mm;
  object-fit: contain;
  opacity: .34;
  pointer-events: none;
}

.program-dotychczasowy__strona {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: var(--program-szerokosc-strony);
  height: var(--program-wysokosc-strony);
  box-sizing: border-box;
  margin: 0;
  padding: var(--program-odstep-gorny) var(--program-odstep-poziomy);
  overflow: hidden;
}

.program-dotychczasowy__tresc {
  min-height: 0;
  overflow: hidden;
}

.program-dotychczasowy__strona .program-kartka-a4__stopka {
  margin-top: 0;
}

.program-strony__oczekiwanie,
.program-strony__problemy {
  width: var(--program-szerokosc-strony);
  box-sizing: border-box;
  padding: 12px;
  background: #ffffff;
  color: #374151;
}

.program-strony__problemy {
  border-left: 4px solid #b45309;
}

.program-strony__problemy p {
  margin: 0;
}

.program-pomiar {
  position: fixed;
  top: 0;
  left: -100000px;
  display: grid;
  gap: 10mm;
  visibility: hidden;
  pointer-events: none;
}
@container (max-width: 1860px) {
  .program-szkolen__uklad {
    grid-template-columns: minmax(420px, 1fr) minmax(0, 800px);
  }

}

@container (max-width: 760px) {
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
    border-top: 1px solid color-mix(in srgb, var(--ui-akcent) 22%, transparent);
    padding-top: 14px;
    padding-left: 0;
  }

  .program-strony {
    display: block !important;
    width: max-content !important;
  }

  .program-semper__strona,
  .program-dotychczasowy__strona {
    width: var(--program-szerokosc-strony) !important;
    height: var(--program-wysokosc-strony) !important;
    max-width: none !important;
    margin: 0 !important;
  }
}

@page {
  size: A4 portrait;
  margin: 0;
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

  .program-pomiar,
  .program-strony__oczekiwanie,
  .program-strony__problemy {
    display: none !important;
  }

  .program-strony {
    display: block !important;
    width: 100% !important;
  }

  .program-semper__strona,
  .program-dotychczasowy__strona {
    width: var(--program-szerokosc-strony) !important;
    height: var(--program-wysokosc-strony) !important;
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    break-after: auto;
    page-break-after: auto;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .program-strony > article[data-strona-dokumentu]:not(:last-of-type) {
    break-after: page;
    page-break-after: always;
  }
}
`

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

function czyPlikTekstowy(plik: File) {
  return plik.type.startsWith('text/') || /\.(txt|md|csv|html?)$/i.test(plik.name)
}

function splaszczBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
  return bloki.flatMap((blok) => [blok, ...splaszczBloki(blok.dzieci)])
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
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const zalogowanyUzytkownikId = zalogowanyUzytkownik?.id
  const obszarPodgladuRef = useRef<HTMLElement>(null)
  const [stanOdczytu, ustawStanOdczytu] = useState<'ladowanie' | 'gotowy' | 'blad'>(() => dokumentIdZTrasy ? 'ladowanie' : 'gotowy')
  const [bladOdczytu, ustawBladOdczytu] = useState('')
  const [aktywnaKopiaId, ustawAktywnaKopiaId] = useState<string | null>(() => dokumentIdZTrasy ? null : pobierzIdAktywnejKopiiProgramu())
  const [daneProgramu, ustawDaneProgramu] = useState<ZapisProgramuRoboczego>(() => normalizujZapisProgramu(dokumentIdZTrasy ? undefined : pobierzAktywnaKopieProgramu()?.daneDokumentu))
  const [idSesjiAutosave] = useState(() => `program-autosave-${crypto.randomUUID()}`)
  const [autosaveDoDecyzji, ustawAutosaveDoDecyzji] = useState(() => pobierzAutosaveProgramu(zalogowanyUzytkownikId))
  const [komunikat, ustawKomunikat] = useState('')
  const [wynikImportu, ustawWynikImportu] = useState<WynikImportuProgramu | null>(null)
  const [trybImportu, ustawTrybImportu] = useState<TrybZastosowaniaImportuProgramu>('UZUPELNIJ')
  const [zaakceptowanePolaImportu, ustawZaakceptowanePolaImportu] = useState<PoleImportuProgramu[]>([])
  const [trybRenderowania, ustawTrybRenderowania] = useState<TrybRenderowaniaDokumentu>('roboczy')
  const trybPrzedEksportemRef = useRef<TrybRenderowaniaDokumentu>('roboczy')
  const zapiszAutosave = useCallback((daneDoZapisu: ZapisProgramuRoboczego) => {
    zapiszAutosaveProgramu({
      idSesji: idSesjiAutosave,
      aktywnaKopiaId: aktywnaKopiaId ?? undefined,
      uzytkownikId: zalogowanyUzytkownikId,
      daneDokumentu: daneDoZapisu,
    })
  }, [aktywnaKopiaId, idSesjiAutosave, zalogowanyUzytkownikId])
  const {
    czyNiezapisaneZmiany,
    oznaczBladZapisu,
    oznaczJakoZapisany,
    rozpocznijZapis,
    stanZapisu,
  } = useStanDokumentu({
    dane: daneProgramu,
    czyAutosaveAktywny: !autosaveDoDecyzji,
    opoznienieAutosave: 500,
    zapiszAutomatycznie: zapiszAutosave,
  })

  useEffect(() => {
    if (!dokumentIdZTrasy) {
      return
    }

    const odroczonyOdczyt = window.setTimeout(() => {
      try {
        const kopia = pobierzProgramPoId(dokumentIdZTrasy)

        if (!kopia) {
          ustawBladOdczytu('Nie znaleziono programu o wskazanym identyfikatorze lub ma niewłaściwy typ.')
          ustawStanOdczytu('blad')
          return
        }

        const dane = normalizujZapisProgramu(kopia.daneDokumentu)
        ustawAktywnaKopiaId(kopia.id)
        ustawDaneProgramu(dane)
        oznaczJakoZapisany(dane)
        ustawStanOdczytu('gotowy')
      } catch {
        ustawBladOdczytu('Nie udało się odczytać wskazanego programu.')
        ustawStanOdczytu('blad')
      }
    }, 0)

    return () => window.clearTimeout(odroczonyOdczyt)
  }, [dokumentIdZTrasy, oznaczJakoZapisany])
  const { tytulSzkolenia, trescProgramu, czyWynikParsowaniaZatwierdzony, ustawienia, logotypProgramu, linkLogotypu } = daneProgramu

  const program = useMemo(() => parsujTekstProgramu(trescProgramu), [trescProgramu])
  const trescProgramuHtml = useMemo(() => pobierzHtmlProgramuSzkolenia(daneProgramu), [daneProgramu])
  const tytulDokumentu = pobierzTytulDokumentuProgramu(tytulSzkolenia)
  const kolorNiepoprawny = !sprawdzHex(ustawienia.kolorAkcentuProgramu)
  const dokumentProgramu = useMemo(() => utworzDokumentProgramuSzkolenia(daneProgramu, program), [daneProgramu, program])
  const problemyDokumentu = useMemo(() => walidujProgramSzkolenia(daneProgramu, dokumentProgramu), [daneProgramu, dokumentProgramu])
  const tytulZCudzyslowem = formatujTytulSzkolenia(tytulDokumentu, ustawienia.formatCudzyslowu)
  const kolorAkcentu = pobierzKolorAkcentu(ustawienia)
  const profil = daneProfilowFirmy[ustawienia.profilFirmy]
  const kontekstSwobodnychBlokow = useMemo(
    () => utworzKontekstSwobodnychBlokowProgramu(daneProgramu, {
      nazwaOrganizatora: profil.nazwa,
      kontaktOrganizatora: profil.kontakt,
      stopkaOrganizatora: profil.stopka,
      logotypOrganizatora: ustawienia.profilFirmy === 'semper' ? logotypSemper : undefined,
      mapaOrganizatora: ustawienia.profilFirmy === 'semper' ? mapaPolskiSemper : undefined,
    }),
    [daneProgramu, profil.kontakt, profil.nazwa, profil.stopka, ustawienia.profilFirmy],
  )
  const presetWygladu = ustawienia.presetWygladu
  const elementyIdentyfikacji = pobierzElementyIdentyfikacjiProgramu(presetWygladu, ustawienia.elementyIdentyfikacji)
  const sugestiaPresety = useMemo(() => zasugerujPresetProgramu(dokumentProgramu), [dokumentProgramu])
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
  const czyArchitekt = czyUzytkownikMozeWymusicEksportProgramu(zalogowanyUzytkownik)
  const gruboscObramowaniaTytulu = Number.isFinite(ustawienia.gruboscObramowaniaTytulu)
    ? Math.min(10, Math.max(0, ustawienia.gruboscObramowaniaTytulu))
    : domyslneUstawienia.gruboscObramowaniaTytulu
  const etykietaGrubosciObramowaniaTytulu = gruboscObramowaniaTytulu.toFixed(1).replace('.', ',')
  const czyListaGlownaNumerowana = ustawienia.stylListyGlownej === 'numeracja'
  const czyPokazacPoziomyPodpunktow = ustawienia.stylPodpunktow === 'punktory'
  const widoczneStylePoziomowListy = ustawienia.stylePoziomowListy
    .map((styl, indeks) => ({ styl, indeks }))
    .filter(({ indeks }) => indeks === 0 || czyPokazacPoziomyPodpunktow)

  const zmianyImportu = useMemo(
    () => wynikImportu ? przygotujZmianyImportuProgramu(daneProgramu, wynikImportu) : [],
    [daneProgramu, wynikImportu],
  )

  async function przygotujFinalnyRenderer() {
    trybPrzedEksportemRef.current = trybRenderowania
    ustawTrybRenderowania('finalny')

    await new Promise<void>((rozwiaz, odrzuc) => {
      let liczbaProb = 0

      function sprawdzGotowosc() {
        const renderer = obszarPodgladuRef.current?.querySelector<HTMLElement>('[data-testid="program-strony"][data-tryb-renderowania="finalny"]')
        const czyGotowy = Boolean(renderer?.querySelector('[data-strona-dokumentu]') && !renderer.querySelector('.program-strony__oczekiwanie'))

        if (czyGotowy) {
          rozwiaz()
          return
        }

        liczbaProb += 1
        if (liczbaProb >= 60) {
          odrzuc(new Error('Finalny renderer dokumentu nie jest gotowy.'))
          return
        }

        window.requestAnimationFrame(sprawdzGotowosc)
      }

      window.requestAnimationFrame(sprawdzGotowosc)
    })
  }

  function zakonczFinalnyRenderer() {
    ustawTrybRenderowania(trybPrzedEksportemRef.current)
  }

  function zmienDane<Nazwa extends keyof ZapisProgramuRoboczego>(nazwa: Nazwa, wartosc: ZapisProgramuRoboczego[Nazwa]) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      [nazwa]: wartosc,
    }))
  }

  function zmienTrescProgramuHtml(html: string, tekst = konwertujHtmlNaTekstProgramu(html)) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
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
    rozpocznijZapis()

    try {
      const rekord = zapiszJawnaKopieProgramu({
        idAktywnejKopii: aktywnaKopiaId,
        tryb,
        tytul: daneProgramu.tytulSzkolenia,
        statusBiznesowy: daneProgramu.czyWynikParsowaniaZatwierdzony ? 'zatwierdzona' : 'robocza',
        daneDokumentu: daneProgramu,
        uzytkownikId: zalogowanyUzytkownikId,
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
      ustawAutosaveDoDecyzji(null)
      oznaczJakoZapisany(daneProgramu)
      ustawKomunikat(tryb === 'utworz_nowa' ? 'Utworzono nową kopię roboczą.' : tryb === 'aktualizuj' ? 'Zaktualizowano kopię roboczą.' : 'Program zapisany jako kopia robocza.')
    } catch {
      oznaczBladZapisu()
      ustawKomunikat('Nie udało się zapisać programu roboczo.')
    }
  }, [aktywnaKopiaId, daneProgramu, liczbaModulow, oznaczBladZapisu, oznaczJakoZapisany, program.dni.length, rozpocznijZapis, ustawienia.profilFirmy, zalogowanyUzytkownikId])

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
    usunAutosaveProgramu(zalogowanyUzytkownikId)
    ustawAutosaveDoDecyzji(null)
    ustawKomunikat('Odrzucono niezapisany draft.')
  }

  function anulujOdzyskiwanieAutosave() {
    window.history.back()
  }

  function czyMoznaEksportowacProgram() {
    const raport = przygotujRaportEksportuDokumentu(dokumentProgramu, 'PDF')
    if (!raport.czyDozwolony) {
      if (!czyArchitekt) {
        ustawKomunikat(`Eksport zablokowany: ${raport.problemy.filter((problem) => problem.czyBlokujeEksport).map((problem) => problem.komunikat).join(' ')}`)
        return false
      }
      if (!window.confirm('Dokument ma b\u0142\u0119dy krytyczne. Czy jako Architekt wymuszasz eksport PDF?')) {
        ustawKomunikat('Eksport przerwany.')
        return false
      }
      zapiszLogWymuszeniaEksportu(przygotujRaportEksportuDokumentu(dokumentProgramu, 'PDF', true))
      ustawKomunikat('Architekt wymusi\u0142 eksport mimo b\u0142\u0119d\u00f3w krytycznych. Zapisano wpis w logu lokalnym.')
      return true
    }
    ustawKomunikat('Dokument jest gotowy do eksportu PDF lub druku.')
    return true
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

  function wybierzPresetWygladu(preset: PresetWygladuProgramu, czyWyborSwiadomy = true) {
    const konfiguracja = konfiguracjePresetowProgramu[preset]
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      ustawienia: {
        ...aktualne.ustawienia,
        presetWygladu: preset,
        czyWyborPresetySwiadomy: czyWyborSwiadomy,
        czyJustowac: konfiguracja.justowanie,
        stylDni: konfiguracja.stylDni,
        separacjaModulow: konfiguracja.separacjaModulow,
        stylPodpunktow: konfiguracja.stylPodpunktow,
        stylListyGlownej: konfiguracja.stylListyGlownej,
        elementyIdentyfikacji: {},
      },
    }))
  }

  function zmienElementIdentyfikacji(nazwa: keyof ElementyIdentyfikacjiProgramu, wartosc: boolean) {
    ustawDaneProgramu((aktualne) => ({
      ...aktualne,
      ustawienia: {
        ...aktualne.ustawienia,
        elementyIdentyfikacji: { ...aktualne.ustawienia.elementyIdentyfikacji, [nazwa]: wartosc },
      },
    }))
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

    const nazwaPliku = plik.name

    function przygotujStagingImportu(wynik: WynikImportuProgramu) {
      ustawZaakceptowanePolaImportu([])
      ustawTrybImportu('UZUPELNIJ')

      if (wynik.bledy.length) {
        ustawWynikImportu(null)
        ustawKomunikat(wynik.bledy[0])
        return
      }

      ustawWynikImportu(wynik)
      ustawZaakceptowanePolaImportu(pobierzDomyslnieZaakceptowanePolaImportuProgramu(daneProgramu, wynik))
      ustawKomunikat(`Przygotowano wynik importu pliku: ${nazwaPliku}. Sprawdź propozycje przed zastosowaniem.`)
    }

    if (/\.docx$/i.test(plik.name)) {
      void importujDocxProgramu(plik).then(przygotujStagingImportu)
      return
    }

    if (/\.pdf$/i.test(plik.name)) {
      void importujPdfProgramu(plik).then(przygotujStagingImportu)
      return
    }

    if (!czyPlikTekstowy(plik)) {
      ustawKomunikat('Obsługiwane są pliki tekstowe, DOCX oraz PDF z warstwą tekstową. Format DOC nie jest obsługiwany.')
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => {
      const zawartosc = String(czytnik.result ?? '')
      const czyHtml = plik.type === 'text/html' || /\.html?$/i.test(plik.name)
      const tekstProgramu = czyHtml ? konwertujHtmlNaTekstProgramu(zawartosc) : zawartosc

      const wynik = importujTekstProgramu(tekstProgramu)
      przygotujStagingImportu(wynik)
    }
    czytnik.onerror = () => ustawKomunikat('Nie udało się odczytać pliku programu.')
    czytnik.readAsText(plik)
  }

  function zaakceptujImportProgramu() {
    if (!wynikImportu) {
      return
    }

    const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(daneProgramu, wynikImportu, trybImportu, zaakceptowanePolaImportu)
    ustawDaneProgramu(zastosowanie.model)
    ustawWynikImportu(null)
    ustawZaakceptowanePolaImportu([])
    ustawKomunikat(zastosowanie.zastosowanePola.length
      ? 'Zastosowano zaakceptowane zmiany z importu. Wynik parsowania wymaga zatwierdzenia.'
      : 'Import nie wprowadził zmian do programu.')
  }

  function anulujImportProgramu() {
    ustawWynikImportu(null)
    ustawZaakceptowanePolaImportu([])
    ustawKomunikat('Anulowano import. Aktualny program nie został zmieniony.')
  }

  function ustawAkceptacjePolaImportu(pole: PoleImportuProgramu, czyZaakceptowane: boolean) {
    ustawZaakceptowanePolaImportu((aktualne) => czyZaakceptowane
      ? Array.from(new Set([...aktualne, pole]))
      : aktualne.filter((zaakceptowanePole) => zaakceptowanePole !== pole))
  }

  function zaznaczPewneZmianyImportu() {
    ustawZaakceptowanePolaImportu(zmianyImportu
      .filter((zmiana) => zmiana.pewnosc === 'PEWNE' && zmiana.stan === 'GOTOWA_DO_ZASTOSOWANIA')
      .map((zmiana) => zmiana.pole))
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

  useOchronaNiezapisanegoDokumentu(czyNiezapisaneZmiany, () => zapiszRoboczo(aktywnaKopiaId ? 'aktualizuj' : 'zapisz'))

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
    <ObszarZPanelemGeneratora
      idPanelu="panel-ustawien-programu-szkolenia"
      kluczPrzypiecia="ultimate-pomagier.panel-generatora.programy-szkolen.przypiety"
      kluczWysuwania="ultimate-pomagier.panel-generatora.programy-szkolen.wysuwanie"
      szerokoscPanelu="520px"
      tytulPanelu="Ustawienia programu szkolenia"
    >
    <section className="widok program-szkolen">
      <style>{styleProgramuSzkolenia}</style>

      <header className="program-panel-roboczy program-szkolen__naglowek">
        <h1>Programy szkoleń</h1>
        <PasekAkcjiGeneratora className="program-szkolen__akcje">
          <PrzyciskPaneluGeneratora className="program-szkolen__przycisk">Ustawienia programu</PrzyciskPaneluGeneratora>
          <StatusZapisuDokumentu stan={stanZapisu} />
          <AkcjeEksportuPdf
            className="program-szkolen__akcje-eksportu"
            classNamePrzycisku="program-szkolen__przycisk"
            czyMoznaEksportowac={czyMoznaEksportowacProgram}
            nazwaPliku={utworzNazwePlikuDokumentu('PROGRAM_SZKOLENIA', tytulDokumentu || 'bez tytułu')}
            obszarDokumentu={obszarPodgladuRef}
            przygotujEksport={przygotujFinalnyRenderer}
            zakonczEksport={zakonczFinalnyRenderer}
          />
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
        </PasekAkcjiGeneratora>
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
          <PanelBocznyGeneratora className="program-szkolen__sekcja program-szkolen__sekcja--ustawienia">
            <div className="program-szkolen__siatka">
              <label className="program-szkolen__etykieta">
                <span><input checked={trybRenderowania === 'roboczy'} onChange={(zdarzenie) => ustawTrybRenderowania(zdarzenie.target.checked ? 'roboczy' : 'finalny')} type="checkbox" /> Podgląd roboczy</span>
              </label>
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

              <label className="program-szkolen__etykieta">
                Wygląd dokumentu
                <select className="program-szkolen__lista" onChange={(zdarzenie) => wybierzPresetWygladu(zdarzenie.target.value as PresetWygladuProgramu)} value={presetWygladu}>
                  {(Object.keys(konfiguracjePresetowProgramu) as PresetWygladuProgramu[]).map((preset) => <option key={preset} value={preset}>{konfiguracjePresetowProgramu[preset].etykieta}</option>)}
                </select>
                {!ustawienia.czyWyborPresetySwiadomy && presetWygladu !== sugestiaPresety && <p className="program-szkolen__opis">Sugestia na podstawie treści: {konfiguracjePresetowProgramu[sugestiaPresety].etykieta}.</p>}
              </label>
              <button className="program-szkolen__przycisk" onClick={() => wybierzPresetWygladu(presetWygladu)} type="button">Przywróć ustawienia presetu</button>

              {presetWygladu !== 'DOTYCHCZASOWY' && (
                <details className="program-szkolen__identyfikacja">
                  <summary>Identyfikacja wizualna</summary>
                  {(Object.entries(elementyIdentyfikacji) as Array<[keyof ElementyIdentyfikacjiProgramu, boolean]>).map(([nazwa, widoczny]) => (
                    <label className="program-szkolen__etykieta" key={nazwa}>
                      <span><input checked={widoczny} onChange={(zdarzenie) => zmienElementIdentyfikacji(nazwa, zdarzenie.target.checked)} type="checkbox" /> {nazwa.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </label>
                  ))}
                  <label className="program-szkolen__etykieta"><span><input checked={ustawienia.czyJustowac} onChange={(zdarzenie) => zmienUstawienie('czyJustowac', zdarzenie.target.checked)} type="checkbox" /> justowanie treści</span></label>
                </details>
              )}

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
          </PanelBocznyGeneratora>

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
                  accept=".docx,.pdf,.txt,.md,.csv,.html,.htm,text/*,application/pdf"
                  className="program-szkolen__pole"
                  onChange={(zdarzenie) => importujProgramZPliku(zdarzenie.target.files?.[0])}
                  type="file"
                />
              </label>

              {wynikImportu && (
                <div className="program-szkolen__komunikat" role="dialog" aria-label="Podgląd importu programu">
                  <strong>Podgląd importu: {wynikImportu.zrodlo}</strong>
                  {wynikImportu.ostrzezenia.map((ostrzezenie) => <p key={ostrzezenie}>Wymaga sprawdzenia: {ostrzezenie}</p>)}
                  {wynikImportu.bledy.map((blad) => <p className="program-szkolen__blad" key={blad}>{blad}</p>)}
                  <ul>
                    {zmianyImportu.map((zmiana) => (
                      <li key={zmiana.pole}>
                        <label>
                          <input
                            checked={zaakceptowanePolaImportu.includes(zmiana.pole)}
                            disabled={zmiana.pewnosc === 'BRAK' || zmiana.stan === 'BEZ_ZMIANY'}
                            onChange={(zdarzenie) => ustawAkceptacjePolaImportu(zmiana.pole, zdarzenie.target.checked)}
                            type="checkbox"
                          />{' '}
                          Zastosuj tę zmianę
                        </label>
                        {zmiana.pole === 'tytulSzkolenia' ? 'Tytuł szkolenia' : 'Treść programu'}: {zmiana.stan === 'KONFLIKT' ? 'konflikt z aktualną wartością' : zmiana.stan === 'WYMAGA_SPRAWDZENIA' ? 'importowane — wymaga sprawdzenia' : zmiana.stan === 'GOTOWA_DO_ZASTOSOWANIA' ? 'importowane' : 'bez zmiany'}
                        <details>
                          <summary>Pokaż proponowaną wartość</summary>
                          <pre>{zmiana.wartosc}</pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                  <label className="program-szkolen__etykieta">
                    Tryb zastosowania
                    <select className="program-szkolen__lista" onChange={(zdarzenie) => ustawTrybImportu(zdarzenie.target.value as TrybZastosowaniaImportuProgramu)} value={trybImportu}>
                      <option value="UZUPELNIJ">Uzupełnij puste pola</option>
                      <option value="ZASTAP">Zastąp istniejące wartości</option>
                    </select>
                  </label>
                  <div className="program-szkolen__akcje">
                    <button className="program-szkolen__przycisk" onClick={zaznaczPewneZmianyImportu} type="button">Zaznacz pewne</button>
                    <button className="program-szkolen__przycisk" onClick={() => ustawZaakceptowanePolaImportu([])} type="button">Odznacz wszystko</button>
                    <button className="program-szkolen__przycisk" disabled={wynikImportu.bledy.length > 0} onClick={zaakceptujImportProgramu} type="button">Zastosuj import</button>
                    <button className="program-szkolen__przycisk" onClick={anulujImportProgramu} type="button">Anuluj import</button>
                  </div>
                </div>
              )}

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

        <section className="program-szkolen__podglad" ref={obszarPodgladuRef}>
          <RendererStronProgramu
            czyFormatowanieSkryptowe={ustawienia.formatowanieSkryptowe}
            czyJustowac={ustawienia.czyJustowac}
            czyPogrubiacNaglowkiListyProgramu={ustawienia.czyPogrubiacNaglowkiListyProgramu}
            dokument={dokumentProgramu}
            elementyIdentyfikacji={ustawienia.elementyIdentyfikacji}
            gruboscObramowaniaTytulu={gruboscObramowaniaTytulu}
            kolorAkcentu={kolorAkcentu}
            kontaktOrganizatora={profil.kontakt}
            kontekstSwobodnychBlokow={kontekstSwobodnychBlokow}
            logotypUzytkownika={logotypProgramu}
            nazwaOrganizatora={profil.nazwa}
            preset={presetWygladu}
            profilFirmy={ustawienia.profilFirmy}
            separacjaModulow={ustawienia.separacjaModulow}
            szerokoscLogotypu={ustawienia.szerokoscLogotypu}
            stopkaOrganizatora={profil.stopka}
            stylDni={ustawienia.stylDni}
            stylListyGlownej={ustawienia.stylListyGlownej}
            stylPodpunktow={ustawienia.stylPodpunktow}
            stylePoziomowListy={ustawienia.stylePoziomowListy}
            tekstSurowy={trescProgramu}
            trybRenderowania={trybRenderowania}
            tytul={tytulZCudzyslowem || 'Program szkolenia'}
          />
        </section>
      </div>
    </section>
    </ObszarZPanelemGeneratora>
  )
}

export default WidokProgramowSzkolen
