export type PrzypisanieBlokuDoStrony =
  | { rodzaj: 'pierwsza' }
  | { rodzaj: 'kazda' }
  | { rodzaj: 'strona'; numer: number }

export type WyrownanieTekstuBloku = 'lewo' | 'srodek' | 'prawo' | 'wyjustuj'
export type GruboscCzcionkiBloku = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type TrybDopasowaniaObrazu = 'contain' | 'cover'
export type PochodzenieBlokuSwobodnego = 'szablon' | 'uzytkownik'
export type RolaBlokuSwobodnego = 'logo' | 'pole_tekstowe' | 'element_staly_szablonu' | 'element_opcjonalny_uzytkownika'
export type RodzinaCzcionkiBloku = 'Arial' | 'Georgia' | 'Times New Roman' | 'Verdana'

export const WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW = 2 as const
export const SZEROKOSC_STRONY_A4_MM = 210
export const WYSOKOSC_STRONY_A4_MM = 297
export const RODZINY_CZCIONEK_BLOKU: RodzinaCzcionkiBloku[] = ['Arial', 'Georgia', 'Times New Roman', 'Verdana']

export type ZrodloTekstuBloku =
  | { rodzaj: 'statyczne'; tekst: string }
  | { rodzaj: 'pole_danych'; sciezka: string; tekstZastepczy?: string }

export type ZrodloObrazuBloku =
  | { rodzaj: 'adres'; adres: string }
  | { rodzaj: 'zasob_organizatora'; klucz: string }
  | { rodzaj: 'zasob_uzytkownika'; klucz: string }

type PodstawaBlokuSwobodnego = {
  id: string
  rola: RolaBlokuSwobodnego
  xMm: number
  yMm: number
  szerokoscMm: number
  wysokoscMm: number
  przypisanieDoStrony: PrzypisanieBlokuDoStrony
  widoczny: boolean
  indeksWarstwy: number
  nazwa?: string
  zablokowany?: boolean
  pochodzenie?: PochodzenieBlokuSwobodnego
  idBlokuSzablonu?: string
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
    kursywa?: boolean
    podkreslenie?: boolean
    marginesWewnetrznyMm?: number
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

export type KonfiguracjaSwobodnychBlokow = {
  wersjaSchematu: typeof WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW
  bloki: BlokSwobodnyDokumentu[]
}

export type ProwadniceBloku = {
  pionowa?: number
  pozioma?: number
}

export type WynikGeometriiBloku = {
  blok: BlokSwobodnyDokumentu
  prowadnice: ProwadniceBloku
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

function normalizujRoleBloku(wartosc: unknown, typ: 'tekst' | 'obraz', pochodzenie: PochodzenieBlokuSwobodnego): RolaBlokuSwobodnego {
  if (wartosc === 'logo' || wartosc === 'pole_tekstowe' || wartosc === 'element_staly_szablonu' || wartosc === 'element_opcjonalny_uzytkownika') return wartosc
  if (typ === 'obraz') return 'logo'
  return pochodzenie === 'szablon' ? 'element_staly_szablonu' : 'pole_tekstowe'
}

function normalizujPodstaweBloku(dane: Record<string, unknown>, typ: 'tekst' | 'obraz') {
  const pochodzenie = dane.pochodzenie === 'szablon' ? 'szablon' as const : 'uzytkownik' as const
  return {
    id: tekstLubDomyslny(dane.id).trim(),
    rola: normalizujRoleBloku(dane.rola, typ, pochodzenie),
    xMm: liczbaLubDomyslna(dane.xMm, 0),
    yMm: liczbaLubDomyslna(dane.yMm, 0),
    szerokoscMm: Math.max(0, liczbaLubDomyslna(dane.szerokoscMm, 20)),
    wysokoscMm: Math.max(0, liczbaLubDomyslna(dane.wysokoscMm, 10)),
    przypisanieDoStrony: normalizujPrzypisanieDoStrony(dane.przypisanieDoStrony),
    widoczny: dane.widoczny !== false,
    indeksWarstwy: Math.trunc(liczbaLubDomyslna(dane.indeksWarstwy, 0)),
    ...(typeof dane.nazwa === 'string' && dane.nazwa.trim() ? { nazwa: dane.nazwa.trim() } : {}),
    zablokowany: dane.zablokowany === true,
    pochodzenie,
    ...(typeof dane.idBlokuSzablonu === 'string' && dane.idBlokuSzablonu ? { idBlokuSzablonu: dane.idBlokuSzablonu } : {}),
  }
}

function normalizujBlokTekstowy(dane: Record<string, unknown>): BlokTekstowySwobodny | null {
  const podstawa = normalizujPodstaweBloku(dane, 'tekst')
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
      kursywa: ustawienia.kursywa === true,
      podkreslenie: ustawienia.podkreslenie === true,
      marginesWewnetrznyMm: Math.max(0, liczbaLubDomyslna(ustawienia.marginesWewnetrznyMm, 0)),
    },
  }
}

function normalizujBlokObrazu(dane: Record<string, unknown>): BlokObrazuSwobodny | null {
  const podstawa = normalizujPodstaweBloku(dane, 'obraz')
  const ustawienia = czyObiekt(dane.dane) ? dane.dane : {}
  const zrodlo = czyObiekt(ustawienia.zrodlo) ? ustawienia.zrodlo : {}

  if (!podstawa.id) return null

  return {
    ...podstawa,
    typ: 'obraz',
    dane: {
      zrodlo: zrodlo.rodzaj === 'zasob_organizatora' || zrodlo.rodzaj === 'zasob_uzytkownika'
        ? { rodzaj: zrodlo.rodzaj, klucz: tekstLubDomyslny(zrodlo.klucz) }
        : { rodzaj: 'adres', adres: tekstLubDomyslny(zrodlo.adres) },
      tekstAlternatywny: tekstLubDomyslny(ustawienia.tekstAlternatywny),
      zachowajProporcje: ustawienia.zachowajProporcje !== false,
      trybDopasowania: ustawienia.trybDopasowania === 'cover' ? 'cover' : 'contain',
    },
  }
}

export function normalizujBlokiSwobodneDokumentu(wartosc: unknown): BlokSwobodnyDokumentu[] {
  const lista = czyObiekt(wartosc) && Array.isArray(wartosc.bloki) ? wartosc.bloki : wartosc
  if (!Array.isArray(lista)) return []

  const wykorzystaneId = new Set<string>()
  return lista.flatMap((blok) => {
    if (!czyObiekt(blok)) return []
    const znormalizowany = blok.typ === 'tekst'
      ? normalizujBlokTekstowy(blok)
      : blok.typ === 'obraz' ? normalizujBlokObrazu(blok) : null
    if (!znormalizowany) return []
    let unikalneId = znormalizowany.id
    let numerWystapienia = 2
    while (wykorzystaneId.has(unikalneId)) {
      unikalneId = `${znormalizowany.id}-${numerWystapienia}`
      numerWystapienia += 1
    }
    wykorzystaneId.add(unikalneId)
    return [{ ...znormalizowany, id: unikalneId }]
  })
}

export function serializujKonfiguracjeSwobodnychBlokow(bloki: BlokSwobodnyDokumentu[]) {
  const konfiguracja: KonfiguracjaSwobodnychBlokow = {
    wersjaSchematu: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW,
    bloki: normalizujBlokiSwobodneDokumentu(bloki),
  }
  return JSON.stringify(konfiguracja)
}

export function deserializujKonfiguracjeSwobodnychBlokow(tekst: string | null) {
  if (!tekst?.trim()) return []
  try {
    return normalizujBlokiSwobodneDokumentu(JSON.parse(tekst) as unknown)
  } catch {
    return []
  }
}

function ogranicz(wartosc: number, minimum: number, maksimum: number) {
  return Math.min(Math.max(wartosc, minimum), maksimum)
}

function znajdzPrzyciagniecie(wartosci: number[], cele: number[], prog: number) {
  let najlepsze: { roznica: number; cel: number } | null = null
  for (const wartosc of wartosci) {
    for (const cel of cele) {
      const roznica = cel - wartosc
      if (Math.abs(roznica) <= prog && (!najlepsze || Math.abs(roznica) < Math.abs(najlepsze.roznica))) najlepsze = { roznica, cel }
    }
  }
  return najlepsze
}

export function ograniczBlokDoStrony(blok: BlokSwobodnyDokumentu): BlokSwobodnyDokumentu {
  const szerokoscMm = ogranicz(blok.szerokoscMm, 4, SZEROKOSC_STRONY_A4_MM)
  const wysokoscMm = ogranicz(blok.wysokoscMm, 4, WYSOKOSC_STRONY_A4_MM)
  return {
    ...blok,
    szerokoscMm,
    wysokoscMm,
    xMm: ogranicz(blok.xMm, 0, SZEROKOSC_STRONY_A4_MM - szerokoscMm),
    yMm: ogranicz(blok.yMm, 0, WYSOKOSC_STRONY_A4_MM - wysokoscMm),
  }
}

export function przesunBlokSwobodny(blok: BlokSwobodnyDokumentu, przesuniecieX: number, przesuniecieY: number, progPrzyciaganiaMm = 2): WynikGeometriiBloku {
  let wynik = ograniczBlokDoStrony({ ...blok, xMm: blok.xMm + przesuniecieX, yMm: blok.yMm + przesuniecieY })
  const pionowe = [wynik.xMm, wynik.xMm + wynik.szerokoscMm / 2, wynik.xMm + wynik.szerokoscMm]
  const poziome = [wynik.yMm, wynik.yMm + wynik.wysokoscMm / 2, wynik.yMm + wynik.wysokoscMm]
  const przyciagniecieX = znajdzPrzyciagniecie(pionowe, [0, SZEROKOSC_STRONY_A4_MM / 2, SZEROKOSC_STRONY_A4_MM], progPrzyciaganiaMm)
  const przyciagniecieY = znajdzPrzyciagniecie(poziome, [0, WYSOKOSC_STRONY_A4_MM / 2, WYSOKOSC_STRONY_A4_MM], progPrzyciaganiaMm)
  if (przyciagniecieX) wynik = ograniczBlokDoStrony({ ...wynik, xMm: wynik.xMm + przyciagniecieX.roznica })
  if (przyciagniecieY) wynik = ograniczBlokDoStrony({ ...wynik, yMm: wynik.yMm + przyciagniecieY.roznica })
  return { blok: wynik, prowadnice: { pionowa: przyciagniecieX?.cel, pozioma: przyciagniecieY?.cel } }
}

export function zmienRozmiarBlokuSwobodnego(blok: BlokSwobodnyDokumentu, szerokoscMm: number, wysokoscMm: number, zachowajProporcje = false) {
  const proporcja = blok.szerokoscMm / Math.max(blok.wysokoscMm, 1)
  const wysokoscPoProporcji = zachowajProporcje ? szerokoscMm / proporcja : wysokoscMm
  return ograniczBlokDoStrony({ ...blok, szerokoscMm, wysokoscMm: wysokoscPoProporcji })
}

export function duplikujBlokSwobodny(blok: BlokSwobodnyDokumentu, id: string): BlokSwobodnyDokumentu {
  return ograniczBlokDoStrony({
    ...blok,
    id,
    nazwa: `${blok.nazwa ?? (blok.typ === 'tekst' ? 'Tekst' : 'Obraz')} — kopia`,
    pochodzenie: 'uzytkownik',
    rola: 'element_opcjonalny_uzytkownika',
    idBlokuSzablonu: undefined,
    zablokowany: false,
    xMm: blok.xMm + 4,
    yMm: blok.yMm + 4,
  })
}

export function przywrocBlokSzablonu(blok: BlokSwobodnyDokumentu, blokiSzablonu: BlokSwobodnyDokumentu[]) {
  const idSzablonu = blok.idBlokuSzablonu ?? blok.id
  return blokiSzablonu.find((domyslny) => domyslny.id === idSzablonu) ?? blok
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
