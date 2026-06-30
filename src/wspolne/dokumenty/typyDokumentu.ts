export type TypZrodlaDokumentu = 'tekst' | 'docx' | 'pdf' | 'obraz' | 'ocr' | 'csv' | 'nieznany'

export type FormatStronyDokumentu = 'A4'

export type WyrownanieTekstuDokumentu = 'lewo' | 'srodek' | 'prawo' | 'wyjustuj'

export type JednostkaDokumentu = 'mm' | 'pt'

export type StatusElementuDokumentu = 'staly' | 'dynamiczny' | 'niepewny' | 'ignorowany'

export type TypRozpoznanegoDokumentu =
  | 'lista_obecnosci'
  | 'ankieta_ewaluacyjna'
  | 'certyfikat'
  | 'program_szkolenia'
  | 'karta_na_drzwi'
  | 'okladka_materialow'

export type MarkaDokumentu = 'SEMPER' | 'IIST' | 'klient'

export type RolaGrafikiDokumentu =
  | 'logo'
  | 'podpis'
  | 'tlo'
  | 'qr'
  | 'dekoracja'
  | 'znak_wodny'
  | 'logotyp_projektowy'
  | 'inne'

export type TypKsztaltuDokumentu = 'prostokat' | 'linia' | 'elipsa' | 'inne'

export type RolaKsztaltuDokumentu = 'tlo_tytulu' | 'separator' | 'ramka' | 'dekoracja' | 'inne'

export type TrybCheckboxaDokumentu = 'drukowany' | 'elektroniczny'

export type StatusPolaDynamicznego = 'propozycja' | 'zatwierdzone'

export type StatusDanychWyekstrahowanych = 'do_zatwierdzenia' | 'zatwierdzone' | 'odrzucone'

export type RodzajDanychWyekstrahowanych =
  | 'email'
  | 'telefon'
  | 'uczestnik'
  | 'data'
  | 'wartosc_csv'
  | 'tekst'

export type TrybListyObecnosci = 'pusta' | 'wypelniona'

export type OrientacjaListyObecnosci = 'pionowa' | 'pozioma' | 'automatyczna'

export type TypEksportuDyplomu = 'jednostronny' | 'dwustronny'

export type TrybTytuluDyplomu = 'certyfikat' | 'zaswiadczenie' | 'dyplom'

export type TypTresciDrugiejStronyDyplomu = 'cele' | 'korzysci' | 'program' | 'efekty_uczenia' | 'inne'

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
  typMime?: string
  podgladOryginalu?: string
  podgladHtml?: string
  podgladTekst?: string
  wymagaOcr?: boolean
  czyEdytowalnyDocelowo?: boolean
}

export type ElementTekstowyDokumentu = {
  id: string
  rodzaj: 'tekst' | 'naglowek' | 'stopka'
  status: StatusElementuDokumentu
  tekst: string
  pozycja: PozycjaElementuDokumentu
  styl: StylTekstuDokumentu
  poleDynamiczneId?: string
  zIndex?: number
}

export type ElementObrazuDokumentu = {
  id: string
  rodzaj: 'obraz'
  status: StatusElementuDokumentu
  nazwa: string
  zrodlo?: string
  zasobId?: string
  rola: RolaGrafikiDokumentu
  pozycja: PozycjaElementuDokumentu
  zIndex?: number
}

export type ElementOsadzonegoPlikuDokumentu = {
  id: string
  rodzaj: 'plik_osadzony'
  status: StatusElementuDokumentu
  nazwa: string
  zrodlo: string
  typMime: string
  pozycja: PozycjaElementuDokumentu
  zIndex?: number
}

export type KomorkaTabeliDokumentu = {
  tekst: string
  rowSpan: number
  colSpan: number
  obramowanie: boolean
  kolorTla?: string
  wyrownanie?: WyrownanieTekstuDokumentu
}

export type ElementTabeliDokumentu = {
  id: string
  rodzaj: 'tabela'
  status: StatusElementuDokumentu
  komorki: KomorkaTabeliDokumentu[][]
  kolumny: { szerokosc: number }[]
  wiersze: { wysokosc: number }[]
  powtorzNaglowek: boolean
  liczbaKolumnPodpisu?: number
  ostrzezenia?: string[]
  pozycja: PozycjaElementuDokumentu
  styl: StylTekstuDokumentu
  zIndex?: number
}

export type ElementLiniiDokumentu = {
  id: string
  rodzaj: 'linia'
  status: StatusElementuDokumentu
  pozycja: PozycjaElementuDokumentu
  zIndex?: number
}

export type ElementKsztaltuDokumentu = {
  id: string
  rodzaj: 'ksztalt'
  status: StatusElementuDokumentu
  typKsztaltu: TypKsztaltuDokumentu
  rola: RolaKsztaltuDokumentu
  wypelnienie: string
  obramowanie: string
  promienZaokraglenia: number
  pozycja: PozycjaElementuDokumentu
  zIndex?: number
}

export type ElementCheckboxDokumentu = {
  id: string
  rodzaj: 'checkbox'
  status: StatusElementuDokumentu
  tryb: TrybCheckboxaDokumentu
  wartosc?: boolean
  grupa?: string
  pozycja: PozycjaElementuDokumentu
  zIndex?: number
}

export type ElementBlokuDokumentu = {
  id: string
  rodzaj: 'blok'
  status: StatusElementuDokumentu
  pozycja: PozycjaElementuDokumentu
  elementy: ElementDokumentu[]
  zIndex?: number
}

export type ElementDokumentu =
  | ElementTekstowyDokumentu
  | ElementObrazuDokumentu
  | ElementOsadzonegoPlikuDokumentu
  | ElementTabeliDokumentu
  | ElementLiniiDokumentu
  | ElementKsztaltuDokumentu
  | ElementCheckboxDokumentu
  | ElementBlokuDokumentu

export type StronaDokumentu = {
  id: string
  numer: number
  format: FormatStronyDokumentu
  jednostka: JednostkaDokumentu
  szerokoscMm: number
  wysokoscMm: number
  elementy: ElementDokumentu[]
}

export type PoleDynamiczneDokumentu = {
  id: string
  nazwa: string
  etykieta: string
  elementId: string
  status: StatusPolaDynamicznego
  wartoscPrzykladowa: string
  wartoscZrodlowa?: string
  pozycja?: PozycjaElementuDokumentu
}

export type StyleDokumentu = {
  domyslnyTekst: StylTekstuDokumentu
}

export type ZasobDokumentu = {
  id: string
  nazwa: string
  typ: RolaGrafikiDokumentu | 'inne'
  zrodlo: string
  typMime?: string
}

export type DaneWyekstrahowaneDokumentu = {
  id: string
  rodzaj: RodzajDanychWyekstrahowanych
  etykieta: string
  wartosc: string
  status: StatusDanychWyekstrahowanych
  zrodlo: TypZrodlaDokumentu
}

export type RaportImportuDokumentu = {
  liczbaStron: number
  liczbaTekstow: number
  liczbaObrazow: number
  liczbaTabel: number
  liczbaKsztaltow: number
  liczbaCheckboxow: number
  liczbaPolDynamicznych: number
  liczbaNiepewnych: number
  mozliwyTypDokumentu?: TypRozpoznanegoDokumentu
  ostrzezenia: string[]
}

export type UstawieniaListyObecnosci = {
  trybListy: TrybListyObecnosci
  orientacja: OrientacjaListyObecnosci
  pokazLogotypyProjektowe: boolean
  liczbaKolumnPodpisu: number
}

export type BrandingDokumentu = {
  marka: MarkaDokumentu
  kolorGlowny: string
  kolorDodatkowy: string
}

export type MetadaneDokumentu = {
  utworzono: string
  emaile: string[]
  telefony: string[]
  mozliwyTypDokumentu?: TypRozpoznanegoDokumentu
  raportImportu?: RaportImportuDokumentu
  daneWyekstrahowane: DaneWyekstrahowaneDokumentu[]
  branding: BrandingDokumentu
  ustawieniaListyObecnosci?: UstawieniaListyObecnosci
  ostrzezenia: string[]
}

export type DokumentPomagiera = {
  id: string
  nazwa: string
  zrodlo: ZrodloDokumentu
  strony: StronaDokumentu[]
  zasoby: ZasobDokumentu[]
  style: StyleDokumentu
  polaDynamiczne: PoleDynamiczneDokumentu[]
  metadane: MetadaneDokumentu
}

export type DrugaStronaDyplomu = {
  aktywna: boolean
  zawartosc: StronaDokumentu[]
  typZawartosci: TypTresciDrugiejStronyDyplomu
}

export type SzablonDyplomu = {
  stronaGlowna: StronaDokumentu
  drugaStrona?: DrugaStronaDyplomu
  trybTytulu: TrybTytuluDyplomu
  tekstTytulu: string
  typEksportu: TypEksportuDyplomu
}
