export const styleOznaczenProgramu = [
  ['oryginalne', 'Oryginalne'], ['brak', 'Bez oznaczenia'],
  ['•', '•'], ['◦', '◦'], ['▪', '▪'], ['-', '–'],
  ['arabskie.', '1. 2. 3.'], ['arabskie)', '1) 2) 3)'],
  ['rzymskie.', 'I. II. III.'], ['rzymskie)', 'I) II) III)'],
  ['literowe.', 'a. b. c.'], ['literowe)', 'a) b) c)'],
] as const

export type OznaczenieProgramu = { zapis: string; wartosc?: number; rodzaj: 'arabskie' | 'rzymskie' | 'literowe' | 'punktor' }
export type UstawienieWierszaProgramu = { styl?: string; poziom?: number }

export function normalizujWierszWejsciowy(wiersz: string): string {
  const wzorzecBrzegu = /^[\s\uFEFF\u200B-\u200F\u2060\u00AD\u202A-\u202E\u2066-\u2069]+|[\s\uFEFF\u200B-\u200F\u2060\u00AD\u202A-\u202E\u2066-\u2069]+$/gu
  return wiersz.replace(wzorzecBrzegu, (brzeg, indeks: number) => indeks === 0
    ? brzeg.replace(/[^ \t]/g, '')
    : '')
}

export function wyznaczPoziomyProgramu(wiersze: { tresc: string; poziom: number; jawnyPoziom?: number }[]) {
  let poziomPoprzedni = 0
  let czyNaglowek = false
  return wiersze.map((wiersz) => {
    const oznaczenie = rozpoznajOznaczenieProgramu(wiersz.tresc)?.oznaczenie
    let poziom = wiersz.jawnyPoziom
    if (poziom === undefined) {
      poziom = oznaczenie ? wiersz.poziom : czyNaglowek ? poziomPoprzedni + 1 : poziomPoprzedni
      poziom = Math.max(poziom, wiersz.poziom)
    }
    czyNaglowek = oznaczenie?.rodzaj === 'rzymskie' || oznaczenie?.rodzaj === 'arabskie'
    poziomPoprzedni = poziom
    return poziom
  })
}

export function czyStylOznaczeniaPoprawny(styl: unknown): styl is string {
  return typeof styl === 'string' && (styleOznaczenProgramu.some(([wartosc]) => wartosc === styl) || ['–', '*'].includes(styl))
}

export function liczbaRzymska(liczba: number): string {
  if (liczba < 1 || liczba > 3999) return String(liczba)
  let wynik = ''
  for (const [wartosc, zapis] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as const) {
    while (liczba >= wartosc) { wynik += zapis; liczba -= wartosc }
  }
  return wynik
}

export function rozpoznajOznaczenieProgramu(tekst: string): { oznaczenie: OznaczenieProgramu; tresc: string } | null {
  const dopasowanie = tekst.match(/^(\s*)(\d+[.)]|[IVXLCDMivxlcdm]+[.)]|[a-zA-Z][.)]|[•◦▪·*–—-])\s+(.+)$/)
  if (!dopasowanie) return null
  const zapis = dopasowanie[2]
  const rdzen = zapis.slice(0, -1)
  let rodzaj: OznaczenieProgramu['rodzaj'] = 'punktor'
  let wartosc: number | undefined
  if (/^\d/.test(zapis)) { rodzaj = 'arabskie'; wartosc = Number(rdzen) }
  else if (/^[IVXLCDM]+$/.test(rdzen) || (rdzen.length > 1 && /^[ivxlcdm]+$/.test(rdzen))) {
    const wartosci: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
    const cyfry = [...rdzen.toUpperCase()].map((cyfra) => wartosci[cyfra])
    const liczba = cyfry.reduce((suma, cyfra, indeks) => suma + (cyfra < (cyfry[indeks + 1] ?? 0) ? -cyfra : cyfra), 0)
    if (liczbaRzymska(liczba) === rdzen.toUpperCase()) { rodzaj = 'rzymskie'; wartosc = liczba }
  }
  if (rodzaj === 'punktor' && /^[a-z][.)]$/i.test(zapis)) { rodzaj = 'literowe'; wartosc = rdzen.toLowerCase().charCodeAt(0) - 96 }
  return { oznaczenie: { zapis, rodzaj, wartosc }, tresc: dopasowanie[3] }
}

export function formatujOznaczenieProgramu(styl: string, liczba: number): string {
  if (styl === 'brak') return ''
  const zakonczenie = styl.endsWith(')') ? ')' : '.'
  if (styl.startsWith('arabskie')) return `${liczba}${zakonczenie}`
  if (styl.startsWith('rzymskie')) return `${liczbaRzymska(liczba)}${zakonczenie}`
  if (styl.startsWith('literowe')) {
    let wynik = ''
    while (liczba > 0) { liczba -= 1; wynik = String.fromCharCode(97 + liczba % 26) + wynik; liczba = Math.floor(liczba / 26) }
    return `${wynik}${zakonczenie}`
  }
  return styl
}

export function wyznaczOznaczeniaProgramu(pozycje: { poziom: number; oryginalne?: string; styl?: string; wartosc?: number; domyslnyStyl?: string }[], stylePoziomow: string[], domyslnyStyl: string | string[]) {
  const liczniki: number[] = []
  return pozycje.map((pozycja) => {
    const poziom = Math.max(0, pozycja.poziom)
    const styl = pozycja.styl ?? stylePoziomow[poziom] ?? 'oryginalne'
    const czyOryginalne = styl === 'oryginalne'
    liczniki[poziom] = czyOryginalne && pozycja.wartosc !== undefined ? pozycja.wartosc : (liczniki[poziom] ?? 0) + 1
    liczniki.length = poziom + 1
    if (czyOryginalne && pozycja.oryginalne) return pozycja.oryginalne
    const stylDomyslny = pozycja.domyslnyStyl ?? (Array.isArray(domyslnyStyl) ? domyslnyStyl[poziom] ?? domyslnyStyl.at(-1) ?? '•' : domyslnyStyl)
    return formatujOznaczenieProgramu(czyOryginalne ? stylDomyslny : styl, liczniki[poziom])
  })
}
