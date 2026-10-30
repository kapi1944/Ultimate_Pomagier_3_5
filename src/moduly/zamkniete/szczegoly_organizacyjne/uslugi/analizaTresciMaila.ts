import type { RodzajGodzin } from '../typy'

export const etykietyPolMaila = {
  trener: ['Trener', 'Prowadzący', 'Prowadząca', 'Trener prowadzący', 'Prowadzący szkolenie', 'Prowadząca szkolenie'],
  klient: ['Nazwa klienta', 'Klient', 'Nazwa firmy', 'Zamawiający'],
  uczestnicy: ['Liczba uczestników', 'Liczba osób', 'Uczestników', 'Uczestnicy', 'Ilość uczestników'],
  godziny: ['Liczba godzin', 'Godziny szkolenia'],
  rodzajGodzin: ['Rodzaj godzin', 'Typ godzin'],
  harmonogram: ['Godziny', 'Harmonogram szkolenia', 'Godziny zajęć'],
}

const etykietyDzielone = [...Object.values(etykietyPolMaila).flat(),
  'Materiały na adres', 'Materiały wysłać na adres', 'Adres wysyłki', 'Adres dostawy', 'Adres do wysyłki', 'Wysyłka materiałów', 'Materiały szkoleniowe wysłać do', 'Przesyłka na adres', 'Paczka na adres', 'Adres odbiorcy',
  'Dane osoby kontaktowej', 'Kontakt po stronie klienta', 'Osoba do kontaktu', 'Opiekun szkolenia', 'Opiekun projektu', 'Osoba odpowiedzialna',
  'Materiały szkoleniowe', 'Lista obecności', 'Materiały dodatkowe', 'Nazwa odbiorcy', 'Osoba kontaktowa',
  'Miejsce szkolenia', 'Miejsce szkolenia zapewnione przez Zamawiającego', 'Sala szkoleniowa zapewniona przez Zamawiającego',
  'Cena netto', 'Cena brutto', 'Wartość netto', 'Oświadczenie VAT', 'Termin płatności', 'Tytuł szkolenia', 'Program szkolenia',
]

function scalPodzieloneEtykiety(tresc: string) {
  const wiersze = tresc.split('\n')
  const wynik: string[] = []
  for (let indeks = 0; indeks < wiersze.length; indeks += 1) {
    let wiersz = wiersze[indeks]
    for (let koniec = indeks + 1; wiersz && !czyWierszJestEtykieta(wiersz) && koniec < Math.min(indeks + 6, wiersze.length); koniec += 1) {
      const poczatek = normalizujTekst(wiersz).trim()
      if (!etykietyDzielone.some((etykieta) => normalizujTekst(etykieta).startsWith(`${poczatek} `))) break
      wiersz += ` ${wiersze[koniec]}`
      if (czyWierszJestEtykieta(wiersz)) { indeks = koniec; break }
    }
    wynik.push(czyWierszJestEtykieta(wiersz) ? wiersz.replace(/\s+/g, ' ').trim() : wiersze[indeks])
  }
  return wynik.join('\n')
}

export function normalizujTekst(tekst: string) {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
}

function zabezpieczWyrazenie(tekst: string) {
  return tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Granice sekcji są wspólne dla ekstrakcji wartości i bloków wielowierszowych.
export function znajdzSekcjeMaila(tresc: string, etykiety: readonly string[]) {
  const wzor = new RegExp(`^(?:${etykiety.map((etykieta) => zabezpieczWyrazenie(normalizujTekst(etykieta))).join('|')})\\s*[:–—-]\\s*(.*)$`, 'i')
  const wiersze = tresc.split('\n')
  const sekcje: { wartosc: string; fragment: string }[] = []
  for (let indeks = 0; indeks < wiersze.length; indeks += 1) {
    const dopasowanie = normalizujTekst(wiersze[indeks]).match(wzor)
    if (!dopasowanie) continue
    const wartosci = [wiersze[indeks].slice(dopasowanie[0].length - dopasowanie[1].length).trim()]
    let koniec = indeks + 1
    while (koniec < wiersze.length && !czyWierszJestEtykieta(wiersze[koniec])) {
      if (wiersze[koniec].trim()) wartosci.push(wiersze[koniec].trim())
      koniec += 1
    }
    sekcje.push({ wartosc: wartosci.filter(Boolean).join('\n'), fragment: wiersze.slice(indeks, koniec).join('\n').trim() })
    indeks = koniec - 1
  }
  return sekcje
}

export function parsujLiczbeUczestnikow(wartosc: string) {
  const dopasowanie = normalizujTekst(wartosc).match(/^(\d+)(?:\s*(?:osob(?:y|a)?|uczestni(?:kow|cy|k)))?[. ]*$/)
  const liczba = dopasowanie ? Number(dopasowanie[1]) : NaN
  return Number.isSafeInteger(liczba) && liczba > 0 ? liczba : undefined
}

export function parsujGodzinySzkolenia(wartosc: string) {
  const tekst = normalizujTekst(wartosc).replace(/\n/g, ' ')
  const liczba = tekst.match(/^(\d+(?:[.,]\d+)?)\s*(?:h\b|h(?=[a-z])|godzin\w*|godz\.?\b)?/)
  const liczbaGodzin = liczba ? Number(liczba[1].replace(',', '.')) : undefined
  const zegarowe = /zegarow|60\s*min/.test(tekst)
  const dydaktyczne = /dydaktyczn|lekcyjn|45\s*min/.test(tekst)
  const rodzajGodzin: RodzajGodzin | undefined = zegarowe !== dydaktyczne ? zegarowe ? 'Zegarowe (60 min)' : 'Dydaktyczne (45 min)' : undefined
  return { liczbaGodzin: liczbaGodzin && Number.isFinite(liczbaGodzin) && !/^\d{1,2}:/.test(tekst) ? liczbaGodzin : undefined, rodzajGodzin }
}

export function parsujKwoteMaila(wartosc: string) {
  const kwota = wartosc.replace(/[\u00a0\u202f]/g, ' ').trim().match(/^(\d{1,3}(?:[ .]\d{3})+|\d+)(?:([,.])(\d{1,2}))?(?=\s*(?:zł|PLN|netto|brutto|ZW\b|VAT\b|\d+\s*%|$))/i)
  if (!kwota) return undefined
  const tekst = `${kwota[1].replace(/[ .]/g, '')}${kwota[3] ? `.${kwota[3]}` : ''}`
  // Konwersja dziesiętna bez działań zmiennoprzecinkowych na kwocie.
  const [zlote, grosze = ''] = tekst.split('.')
  const liczbaGroszy = BigInt(`${zlote}${grosze.padEnd(2, '0')}`)
  return liczbaGroszy <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(tekst) : undefined
}

export function normalizujTrescMaila(tresc: string, zachowajFormatowanie = false) {
  const encje: Record<string, string> = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    ensp: ' ', emsp: ' ', thinsp: ' ', ndash: '–', mdash: '—',
    colon: ':', tab: ' ', newline: '\n', laquo: '„', raquo: '”',
    ldquo: '„', rdquo: '”', shy: '', zwj: '', zwnj: '',
  }
  const listy: { numer: number; numerowana: boolean }[] = []
  const trescZListami = zachowajFormatowanie ? tresc.replace(/<(ol|ul)\b([^>]*)>|<\/(ol|ul)>|<li\b[^>]*>|<\/li>/gi, (znacznik, otwarcie: string | undefined, atrybuty: string | undefined, zamkniecie: string | undefined) => {
    if (otwarcie) {
      listy.push({ numer: Number(atrybuty?.match(/\bstart=["']?(\d+)/i)?.[1] ?? 1) - 1, numerowana: otwarcie.toLowerCase() === 'ol' })
      return '\n'
    }
    if (zamkniecie) { listy.pop(); return '\n' }
    const lista = listy.at(-1)
    if (/^<li\b/i.test(znacznik) && lista) {
      lista.numer += 1
      return `\n${'   '.repeat(listy.length - 1)}${lista.numerowana ? `${lista.numer}.` : '-'} `
    }
    return '\n'
  }) : tresc
  const tekst = trescZListami
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/<!--[\s\S]*?-->|<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:br|hr)\b[^>]*>|<\/?(?:p|div|tr|td|th|table|li|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<\/?[a-z][a-z\d:-]*(?:\s[^<>]*)?\s*\/?>/gi, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (calosc, encja: string) => {
      if (!encja.startsWith('#')) return encje[encja.toLowerCase()] ?? calosc
      const kod = encja[1].toLowerCase() === 'x' ? parseInt(encja.slice(2), 16) : Number(encja.slice(1))
      return kod > 0 && kod <= 0x10ffff ? String.fromCodePoint(kod) : calosc
    })
    .replace(/[\u200b\uFEFF\u00ad]|\u200c|\u200d/g, '')
  if (zachowajFormatowanie) return tekst
  return scalPodzieloneEtykiety(tekst
    .replace(/\*\*|__/g, '')
    .replace(/\|/g, '\t')
    .split('\n')
    .map((wiersz) => wiersz.replace(/[^\S\n]+/g, ' ').trim().replace(/^(?:>\s*|#{1,6}\s+|[-*•–—]\s*(?=\p{L}))/gu, ''))
    .join('\n'))
}
export function czyWierszJestEtykieta(wiersz: string) {
  return /^(?:grupa(?: szkoleniowa)?\s+\S|program szkolenia\b|harmonogram szkolenia\b)/i.test(wiersz.trim()) || /^[\p{L}][\p{L}\d .()/-]*\s*(?::|\s[-–—]\s)/u.test(wiersz.trim())
}

