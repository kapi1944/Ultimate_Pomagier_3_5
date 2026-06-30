export type TypZrodlaDokumentu = 'tekst' | 'docx' | 'pdf' | 'obraz' | 'ocr' | 'nieznany'

export type FormatStronyDokumentu = 'A4'

export type WyrownanieTekstuDokumentu = 'lewo' | 'srodek' | 'prawo' | 'wyjustuj'

export type PozycjaElementuDokumentu = {
  x: number
  y: number
  szerokosc: number
  wysokosc: number
}

export type StylTekstuDokumentu = {
  krojCzcionki: string
  rozmiarCzcionki: number
  pogrubienie: boolean
  kursywa: boolean
  podkreslenie: boolean
  kolor: string
  wyrownanie: WyrownanieTekstuDokumentu
}

export type ZrodloDokumentu = {
  typ: TypZrodlaDokumentu
  nazwaPliku?: string
}

export type ElementTekstowyDokumentu = {
  id: string
  rodzaj: 'tekst' | 'naglowek' | 'stopka'
  tekst: string
  pozycja: PozycjaElementuDokumentu
  styl: StylTekstuDokumentu
}

export type ElementObrazuDokumentu = {
  id: string
  rodzaj: 'obraz'
  nazwa: string
  zrodlo?: string
  pozycja: PozycjaElementuDokumentu
}

export type ElementOsadzonegoPlikuDokumentu = {
  id: string
  rodzaj: 'plik_osadzony'
  nazwa: string
  zrodlo: string
  typMime: string
  pozycja: PozycjaElementuDokumentu
}

export type ElementTabeliDokumentu = {
  id: string
  rodzaj: 'tabela'
  wiersze: string[][]
  pozycja: PozycjaElementuDokumentu
  styl: StylTekstuDokumentu
}

export type ElementLiniiDokumentu = {
  id: string
  rodzaj: 'linia'
  pozycja: PozycjaElementuDokumentu
}

export type ElementBlokuDokumentu = {
  id: string
  rodzaj: 'blok'
  pozycja: PozycjaElementuDokumentu
  elementy: ElementDokumentu[]
}

export type ElementDokumentu =
  | ElementTekstowyDokumentu
  | ElementObrazuDokumentu
  | ElementOsadzonegoPlikuDokumentu
  | ElementTabeliDokumentu
  | ElementLiniiDokumentu
  | ElementBlokuDokumentu

export type StronaDokumentu = {
  id: string
  numer: number
  format: FormatStronyDokumentu
  szerokoscMm: number
  wysokoscMm: number
  elementy: ElementDokumentu[]
}

export type PoleDynamiczneDokumentu = {
  id: string
  nazwa: string
  etykieta: string
  elementId: string
  wartoscPrzykladowa: string
}

export type StyleDokumentu = {
  domyslnyTekst: StylTekstuDokumentu
}

export type MetadaneDokumentu = {
  utworzono: string
  emaile: string[]
  telefony: string[]
}

export type DokumentPomagiera = {
  id: string
  nazwa: string
  zrodlo: ZrodloDokumentu
  strony: StronaDokumentu[]
  style: StyleDokumentu
  polaDynamiczne: PoleDynamiczneDokumentu[]
  metadane: MetadaneDokumentu
}
