import type { BlokDokumentu, DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'

export type PresetWygladuProgramu = 'DOTYCHCZASOWY' | 'SEMPER_KOMPAKTOWY' | 'SEMPER_SZCZEGOLOWY' | 'SEMPER_WEDLUG_DNI'
export const domyslnyPresetNowegoProgramu: PresetWygladuProgramu = 'SEMPER_WEDLUG_DNI'
export type ElementyIdentyfikacjiProgramu = {
  naglowekKontaktowy: boolean
  gornySzaryPas: boolean
  logoOrganizatora: boolean
  etykietaProgramu: boolean
  panelTytulu: boolean
  stopkaFirmowa: boolean
  hasloMarki: boolean
  mapaPolski: boolean
  numerStrony: boolean
}

export type KonfiguracjaPresetyProgramu = {
  etykieta: string
  elementyIdentyfikacji: ElementyIdentyfikacjiProgramu
  stylDni: 'pasek' | 'naglowek'
  separacjaModulow: 'brak' | 'ramka' | 'linia' | 'separator-pytan'
  stylPodpunktow: 'punktory' | 'numeracja'
  stylListyGlownej: 'numeracja' | 'punktory'
  justowanie: boolean
  czyPokazywacDni: boolean
}

export type ProfilOrganizatoraProgramu = {
  nazwa: string
  kolor: string
  strona: string
  email: string
  telefon: string
  fax: string
  nip: string
  regon: string
  adres: string
  haslo: string
}

const elementySemper: ElementyIdentyfikacjiProgramu = {
  naglowekKontaktowy: true,
  gornySzaryPas: true,
  logoOrganizatora: true,
  etykietaProgramu: true,
  panelTytulu: true,
  stopkaFirmowa: true,
  hasloMarki: true,
  mapaPolski: true,
  numerStrony: true,
}

export const konfiguracjePresetowProgramu: Record<PresetWygladuProgramu, KonfiguracjaPresetyProgramu> = {
  DOTYCHCZASOWY: {
    etykieta: 'Dotychczasowy wyglad',
    elementyIdentyfikacji: { ...elementySemper, naglowekKontaktowy: false, gornySzaryPas: false, logoOrganizatora: false, etykietaProgramu: false, panelTytulu: false, stopkaFirmowa: false, hasloMarki: false, mapaPolski: false, numerStrony: false },
    stylDni: 'pasek', separacjaModulow: 'ramka', stylPodpunktow: 'punktory', stylListyGlownej: 'numeracja', justowanie: false, czyPokazywacDni: true,
  },
  SEMPER_KOMPAKTOWY: {
    etykieta: 'SEMPER — kompaktowy',
    elementyIdentyfikacji: elementySemper,
    stylDni: 'naglowek', separacjaModulow: 'brak', stylPodpunktow: 'numeracja', stylListyGlownej: 'numeracja', justowanie: false, czyPokazywacDni: false,
  },
  SEMPER_SZCZEGOLOWY: {
    etykieta: 'SEMPER — szczegolowy',
    elementyIdentyfikacji: { ...elementySemper, mapaPolski: false },
    stylDni: 'naglowek', separacjaModulow: 'brak', stylPodpunktow: 'numeracja', stylListyGlownej: 'numeracja', justowanie: false, czyPokazywacDni: true,
  },
  SEMPER_WEDLUG_DNI: {
    etykieta: 'SEMPER — wedlug dni',
    elementyIdentyfikacji: elementySemper,
    stylDni: 'naglowek', separacjaModulow: 'brak', stylPodpunktow: 'numeracja', stylListyGlownej: 'numeracja', justowanie: true, czyPokazywacDni: true,
  },
}

export const profileOrganizatorowProgramu = {
  semper: {
    nazwa: 'Centrum Organizacji Szkoleń i Konferencji SEMPER', kolor: '#DE1914', strona: 'www.szkolenia-semper.pl', email: 'info@szkolenia-semper.pl', telefon: '61/ 8 102 194', fax: '61/ 6 247 936', nip: '7772616176', regon: '301265926', adres: 'ul. Libelta 1a/2, 61-706 Poznań', haslo: 'Szkolenia | Inspiracje | Rozwój Osobisty',
  },
  iist: {
    nazwa: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST', kolor: '#2E89BE', strona: '', email: '', telefon: '', fax: '', nip: '', regon: '', adres: '', haslo: '',
  },
} satisfies Record<'semper' | 'iist', ProfilOrganizatoraProgramu>

export function normalizujPresetWygladuProgramu(preset: unknown): PresetWygladuProgramu {
  return typeof preset === 'string' && preset in konfiguracjePresetowProgramu ? preset as PresetWygladuProgramu : 'DOTYCHCZASOWY'
}

export function pobierzElementyIdentyfikacjiProgramu(preset: PresetWygladuProgramu, nadpisania?: Partial<ElementyIdentyfikacjiProgramu>) {
  return { ...konfiguracjePresetowProgramu[preset].elementyIdentyfikacji, ...nadpisania }
}

function splaszczBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
  return bloki.flatMap((blok) => [blok, ...splaszczBloki(blok.dzieci)])
}

export function zasugerujPresetProgramu(dokument: DokumentBlokowy): PresetWygladuProgramu {
  const bloki = splaszczBloki(dokument.struktura)
  if (bloki.some((blok) => blok.typ === 'Dzien')) return 'SEMPER_WEDLUG_DNI'
  if (bloki.some((blok) => (blok.stylLokalny.wciecie ?? blok.metadane.poziom ?? 0) > 0)) return 'SEMPER_SZCZEGOLOWY'
  return 'SEMPER_KOMPAKTOWY'
}
