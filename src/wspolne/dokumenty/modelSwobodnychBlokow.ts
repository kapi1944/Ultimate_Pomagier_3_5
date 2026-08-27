export type PrzypisanieBlokuDoStrony =
  | { rodzaj: 'pierwsza' }
  | { rodzaj: 'kazda' }
  | { rodzaj: 'strona'; numer: number }

export type WyrownanieTekstuBloku = 'lewo' | 'srodek' | 'prawo' | 'wyjustuj'
export type GruboscCzcionkiBloku = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type TrybDopasowaniaObrazu = 'contain' | 'cover'

export type ZrodloTekstuBloku =
  | { rodzaj: 'statyczne'; tekst: string }
  | { rodzaj: 'pole_danych'; sciezka: string; tekstZastepczy?: string }

export type ZrodloObrazuBloku =
  | { rodzaj: 'adres'; adres: string }
  | { rodzaj: 'zasob_organizatora'; klucz: string }

type PodstawaBlokuSwobodnego = {
  id: string
  xMm: number
  yMm: number
  szerokoscMm: number
  wysokoscMm: number
  przypisanieDoStrony: PrzypisanieBlokuDoStrony
  widoczny: boolean
  indeksWarstwy: number
}

export type BlokTekstowySwobodny = PodstawaBlokuSwobodnego & {
  typ: 'tekst'
  dane: {
    zrodlo: ZrodloTekstuBloku
    rozmiarCzcionkiPt: number
    gruboscCzcionki: GruboscCzcionkiBloku
    rodzinaCzcionki?: string
    wyrownanie: WyrownanieTekstuBloku
    interlinia: number
    kolor?: string
  }
}

export type BlokObrazuSwobodny = PodstawaBlokuSwobodnego & {
  typ: 'obraz'
  dane: {
    zrodlo: ZrodloObrazuBloku
    tekstAlternatywny: string
    zachowajProporcje: boolean
    trybDopasowania: TrybDopasowaniaObrazu
  }
}

export type BlokSwobodnyDokumentu = BlokTekstowySwobodny | BlokObrazuSwobodny

export type KontekstSwobodnychBlokow = {
  dane: Record<string, unknown>
  zasobyObrazow?: Record<string, string | undefined>
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc))
}

function tekstLubDomyslny(wartosc: unknown, domyslny = '') {
  return typeof wartosc === 'string' ? wartosc : domyslny
}

function liczbaLubDomyslna(wartosc: unknown, domyslna: number) {
  return typeof wartosc === 'number' && Number.isFinite(wartosc) ? wartosc : domyslna
}

function normalizujPrzypisanieDoStrony(wartosc: unknown): PrzypisanieBlokuDoStrony {
  if (!czyObiekt(wartosc)) return { rodzaj: 'pierwsza' }
  if (wartosc.rodzaj === 'kazda') return { rodzaj: 'kazda' }
  if (wartosc.rodzaj === 'strona') {
    return { rodzaj: 'strona', numer: Math.max(1, Math.trunc(liczbaLubDomyslna(wartosc.numer, 1))) }
  }
  return { rodzaj: 'pierwsza' }
}

function normalizujPodstaweBloku(dane: Record<string, unknown>) {
  return {
    id: tekstLubDomyslny(dane.id).trim(),
    xMm: liczbaLubDomyslna(dane.xMm, 0),
    yMm: liczbaLubDomyslna(dane.yMm, 0),
    szerokoscMm: Math.max(0, liczbaLubDomyslna(dane.szerokoscMm, 20)),
    wysokoscMm: Math.max(0, liczbaLubDomyslna(dane.wysokoscMm, 10)),
    przypisanieDoStrony: normalizujPrzypisanieDoStrony(dane.przypisanieDoStrony),
    widoczny: dane.widoczny !== false,
    indeksWarstwy: Math.trunc(liczbaLubDomyslna(dane.indeksWarstwy, 0)),
  }
}

function normalizujBlokTekstowy(dane: Record<string, unknown>): BlokTekstowySwobodny | null {
  const podstawa = normalizujPodstaweBloku(dane)
  const ustawienia = czyObiekt(dane.dane) ? dane.dane : {}
  const zrodlo = czyObiekt(ustawienia.zrodlo) ? ustawienia.zrodlo : {}
  const grubosc = Math.trunc(liczbaLubDomyslna(ustawienia.gruboscCzcionki, 400))

  if (!podstawa.id) return null

  return {
    ...podstawa,
    typ: 'tekst',
    dane: {
      zrodlo: zrodlo.rodzaj === 'pole_danych'
        ? {
            rodzaj: 'pole_danych',
            sciezka: tekstLubDomyslny(zrodlo.sciezka),
            ...(typeof zrodlo.tekstZastepczy === 'string' ? { tekstZastepczy: zrodlo.tekstZastepczy } : {}),
          }
        : { rodzaj: 'statyczne', tekst: tekstLubDomyslny(zrodlo.tekst) },
      rozmiarCzcionkiPt: Math.max(1, liczbaLubDomyslna(ustawienia.rozmiarCzcionkiPt, 10)),
      gruboscCzcionki: ([100, 200, 300, 400, 500, 600, 700, 800, 900].includes(grubosc) ? grubosc : 400) as GruboscCzcionkiBloku,
      ...(typeof ustawienia.rodzinaCzcionki === 'string' && ustawienia.rodzinaCzcionki.trim()
        ? { rodzinaCzcionki: ustawienia.rodzinaCzcionki }
        : {}),
      wyrownanie: ustawienia.wyrownanie === 'srodek' || ustawienia.wyrownanie === 'prawo' || ustawienia.wyrownanie === 'wyjustuj'
        ? ustawienia.wyrownanie
        : 'lewo',
      interlinia: Math.max(0.1, liczbaLubDomyslna(ustawienia.interlinia, 1.2)),
      ...(typeof ustawienia.kolor === 'string' && ustawienia.kolor.trim() ? { kolor: ustawienia.kolor } : {}),
    },
  }
}

function normalizujBlokObrazu(dane: Record<string, unknown>): BlokObrazuSwobodny | null {
  const podstawa = normalizujPodstaweBloku(dane)
  const ustawienia = czyObiekt(dane.dane) ? dane.dane : {}
  const zrodlo = czyObiekt(ustawienia.zrodlo) ? ustawienia.zrodlo : {}

  if (!podstawa.id) return null

  return {
    ...podstawa,
    typ: 'obraz',
    dane: {
      zrodlo: zrodlo.rodzaj === 'zasob_organizatora'
        ? { rodzaj: 'zasob_organizatora', klucz: tekstLubDomyslny(zrodlo.klucz) }
        : { rodzaj: 'adres', adres: tekstLubDomyslny(zrodlo.adres) },
      tekstAlternatywny: tekstLubDomyslny(ustawienia.tekstAlternatywny),
      zachowajProporcje: ustawienia.zachowajProporcje !== false,
      trybDopasowania: ustawienia.trybDopasowania === 'cover' ? 'cover' : 'contain',
    },
  }
}

export function normalizujBlokiSwobodneDokumentu(wartosc: unknown): BlokSwobodnyDokumentu[] {
  if (!Array.isArray(wartosc)) return []

  return wartosc.flatMap((blok) => {
    if (!czyObiekt(blok)) return []
    if (blok.typ === 'tekst') return normalizujBlokTekstowy(blok) ?? []
    if (blok.typ === 'obraz') return normalizujBlokObrazu(blok) ?? []
    return []
  })
}

export function czyBlokWidocznyNaStronie(blok: BlokSwobodnyDokumentu, numerStrony: number) {
  const przypisanie = blok.przypisanieDoStrony
  return blok.widoczny && (
    przypisanie.rodzaj === 'kazda'
    || (przypisanie.rodzaj === 'pierwsza' && numerStrony === 1)
    || (przypisanie.rodzaj === 'strona' && przypisanie.numer === numerStrony)
  )
}

function pobierzWartoscPoSciezce(dane: Record<string, unknown>, sciezka: string): unknown {
  return sciezka.split('.').filter(Boolean).reduce<unknown>((wartosc, klucz) => {
    return czyObiekt(wartosc) ? wartosc[klucz] : undefined
  }, dane)
}

export function pobierzTekstBloku(blok: BlokTekstowySwobodny, kontekst: KontekstSwobodnychBlokow) {
  if (blok.dane.zrodlo.rodzaj === 'statyczne') return blok.dane.zrodlo.tekst
  const wartosc = pobierzWartoscPoSciezce(kontekst.dane, blok.dane.zrodlo.sciezka)
  return typeof wartosc === 'string' || typeof wartosc === 'number' || typeof wartosc === 'boolean'
    ? String(wartosc)
    : blok.dane.zrodlo.tekstZastepczy ?? ''
}

export function pobierzZrodloObrazuBloku(blok: BlokObrazuSwobodny, kontekst: KontekstSwobodnychBlokow) {
  return blok.dane.zrodlo.rodzaj === 'adres'
    ? blok.dane.zrodlo.adres
    : kontekst.zasobyObrazow?.[blok.dane.zrodlo.klucz] ?? ''
}
