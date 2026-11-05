import { ocenDzienPracy, type KalendarzPracy } from '../../../../wspolne/czas/kalendarzPracy'

export type ZakresDniaPracy = {
  osCzasu?: KonfiguracjaOsiCzasu
  kalendarzPracy?: KalendarzPracy
  uzytkownikId?: string
  dniPracy?: number[]
  poczatek: string
  koniec: string
}

export const domyslnyZakresDniaPracy: ZakresDniaPracy = {
  poczatek: '07:45',
  koniec: '16:00',
}

export type KonfiguracjaOsiCzasu = { poczatek: string; koniec: string; skalaPozaPraca: number }
export const domyslnaOsCzasu: KonfiguracjaOsiCzasu = { poczatek: '06:00', koniec: '18:00', skalaPozaPraca: 25 }

export function walidujOsCzasu(dane: unknown, praca: Pick<ZakresDniaPracy, 'poczatek' | 'koniec'>): string[] {
  if (!dane || typeof dane !== 'object') return ['Podaj konfigurację osi czasu.']
  const os = dane as Record<string, unknown>
  if (!czyGodzina(os.poczatek) || !czyGodzina(os.koniec) || !czyGodzina(praca.poczatek) || !czyGodzina(praca.koniec) || praca.poczatek >= praca.koniec) return ['Podaj poprawne godziny osi i pracy (początek przed końcem).']
  const bledy: string[] = []
  if (os.poczatek >= os.koniec || os.poczatek > praca.poczatek || os.koniec < praca.koniec) bledy.push('Zakres osi musi obejmować cały przedział pracy, a początek musi być wcześniejszy niż koniec.')
  if (typeof os.skalaPozaPraca !== 'number' || !Number.isInteger(os.skalaPozaPraca) || os.skalaPozaPraca < 10 || os.skalaPozaPraca > 100 || os.skalaPozaPraca % 5 !== 0) bledy.push('Skala poza pracą musi wynosić od 10% do 100%, co 5%.')
  return bledy
}

function czyGodzina(wartosc: unknown): wartosc is string {
  return typeof wartosc === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(wartosc)
}

export function normalizujOsCzasu(dane: unknown, praca: Pick<ZakresDniaPracy, 'poczatek' | 'koniec'> = domyslnyZakresDniaPracy): KonfiguracjaOsiCzasu {
  const os = dane && typeof dane === 'object' ? dane as Record<string, unknown> : {}
  const zakres = normalizujZakres(praca)
  const poczatek = czyGodzina(os.poczatek) ? os.poczatek : domyslnaOsCzasu.poczatek
  const koniec = czyGodzina(os.koniec) && os.koniec > poczatek ? os.koniec : domyslnaOsCzasu.koniec
  const skala = typeof os.skalaPozaPraca === 'number' && Number.isFinite(os.skalaPozaPraca) ? os.skalaPozaPraca : 25
  return {
    poczatek: godzinaZMinut(Math.min(minutyZGodziny(poczatek), zakres.poczatek)),
    koniec: godzinaZMinut(Math.max(minutyZGodziny(koniec), zakres.koniec)),
    skalaPozaPraca: Math.max(10, Math.min(100, Math.round(skala / 5) * 5)),
  }
}

function godzinaZMinut(minuty: number): string {
  return `${String(Math.floor(minuty / 60)).padStart(2, '0')}:${String(minuty % 60).padStart(2, '0')}`
}

export type StanWskaznikaCzasu = {
  etykieta: 'PREFAJRANT' | 'TERAZ' | 'FAJRANT' | 'DZIEŃ WOLNY'
  pozycja: number
  wyrownanieEtykiety: 'POCZATEK' | 'SRODEK' | 'KONIEC'
}

function pobierzMinuty(data: Date, zakres: ZakresDniaPracy) {
  if (zakres.kalendarzPracy) {
    const czesci = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(data)
    const wartosc = (typ: string) => Number(czesci.find((czesc) => czesc.type === typ)?.value ?? 0)
    return wartosc('hour') * 60 + wartosc('minute') + wartosc('second') / 60
  }
  return data.getHours() * 60 + data.getMinutes() + data.getSeconds() / 60
}

function minutyZGodziny(godzina: string) {
  if (!czyGodzina(godzina)) return NaN
  const [godziny, minuty] = godzina.split(':').map(Number)
  return godziny * 60 + minuty
}

function normalizujZakres(zakres: ZakresDniaPracy = domyslnyZakresDniaPracy) {
  const poczatek = minutyZGodziny(zakres.poczatek)
  const koniec = minutyZGodziny(zakres.koniec)

  if (!Number.isFinite(poczatek) || !Number.isFinite(koniec) || poczatek >= koniec) {
    return {
      poczatek: minutyZGodziny(domyslnyZakresDniaPracy.poczatek),
      koniec: minutyZGodziny(domyslnyZakresDniaPracy.koniec),
    }
  }

  return { poczatek, koniec }
}

function pozycjaMinutNaOsi(
  minuty: number,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  const os = normalizujOsCzasu(zakres.osCzasu, zakres)
  const poczatekOsi = minutyZGodziny(os.poczatek)
  const koniecOsi = minutyZGodziny(os.koniec)
  const ograniczoneMinuty = Number.isFinite(minuty) ? Math.min(koniecOsi, Math.max(poczatekOsi, minuty)) : poczatekOsi
  const skalaCzasuPozaPraca = os.skalaPozaPraca / 100
  const { poczatek, koniec } = normalizujZakres(zakres)
  const dlugoscPrzedPraca = (poczatek - poczatekOsi) * skalaCzasuPozaPraca
  const dlugoscPracy = koniec - poczatek
  const dlugoscPoPracy = (koniecOsi - koniec) * skalaCzasuPozaPraca
  const dlugoscOsi = dlugoscPrzedPraca + dlugoscPracy + dlugoscPoPracy

  const pozycja = ograniczoneMinuty <= poczatek
    ? (ograniczoneMinuty - poczatekOsi) * skalaCzasuPozaPraca
    : ograniczoneMinuty <= koniec
      ? dlugoscPrzedPraca + ograniczoneMinuty - poczatek
      : dlugoscPrzedPraca + dlugoscPracy + (ograniczoneMinuty - koniec) * skalaCzasuPozaPraca

  return (pozycja / dlugoscOsi) * 100
}

export function obliczPostepCzasuDnia(
  teraz: Date,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  return pozycjaMinutNaOsi(pobierzMinuty(teraz, zakres), zakres)
}

export function pobierzStanWskaznikaCzasu(
  teraz: Date,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
): StanWskaznikaCzasu {
  const minuty = pobierzMinuty(teraz, zakres)
  const { poczatek, koniec } = normalizujZakres(zakres)
  const pozycja = obliczPostepCzasuDnia(teraz, zakres)
  const wyrownanieEtykiety = pozycja <= 5
    ? 'POCZATEK'
    : pozycja >= 95
      ? 'KONIEC'
      : 'SRODEK'

  if (!czyDzienPracy(teraz, zakres)) {
    return { etykieta: 'DZIEŃ WOLNY', pozycja, wyrownanieEtykiety }
  }

  if (minuty < poczatek) {
    return { etykieta: 'PREFAJRANT', pozycja, wyrownanieEtykiety }
  }

  if (minuty >= koniec) {
    return { etykieta: 'FAJRANT', pozycja, wyrownanieEtykiety }
  }

  return { etykieta: 'TERAZ', pozycja, wyrownanieEtykiety }
}

export function czyGodzinaMiesciSieWDniuPracy(
  godzina: string,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  const wartosc = minutyZGodziny(godzina)
  const { poczatek, koniec } = normalizujZakres(zakres)

  return Number.isFinite(wartosc) && wartosc >= poczatek && wartosc <= koniec
}

export function pozycjaGodzinyNaOsi(
  godzina: string,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  return pozycjaMinutNaOsi(minutyZGodziny(godzina), zakres)
}

export function pobierzGraniceDniaPracyNaOsi(
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  const { poczatek, koniec } = normalizujZakres(zakres)
  return {
    poczatek: pozycjaMinutNaOsi(poczatek, zakres),
    koniec: pozycjaMinutNaOsi(koniec, zakres),
  }
}

export function pobierzEtykietyOsiCzasu(
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
  szerokosc = 900,
) {
  const os = normalizujOsCzasu(zakres.osCzasu, zakres)
  const etykiety = [os.poczatek, os.koniec]
  const odstep = 76 / Math.max(1, szerokosc) * 100
  for (let minuta = Math.ceil(minutyZGodziny(os.poczatek) / 60) * 60; minuta < minutyZGodziny(os.koniec); minuta += 60) {
    const godzina = godzinaZMinut(minuta)
    const pozycja = pozycjaGodzinyNaOsi(godzina, zakres)
    if (etykiety.every((inna) => Math.abs(pozycja - pozycjaGodzinyNaOsi(inna, zakres)) >= odstep)) etykiety.push(godzina)
  }
  return [...new Set(etykiety)].sort()
}

export function czyGodzinaWOsi(godzina: string, zakres: ZakresDniaPracy): boolean {
  const os = normalizujOsCzasu(zakres.osCzasu, zakres)
  return czyGodzina(godzina) && godzina >= os.poczatek && godzina <= os.koniec
}

export function czyTerazWOsi(teraz: Date, zakres: ZakresDniaPracy): boolean {
  const minuty = pobierzMinuty(teraz, zakres)
  const os = normalizujOsCzasu(zakres.osCzasu, zakres)
  return minuty >= minutyZGodziny(os.poczatek) && minuty <= minutyZGodziny(os.koniec)
}

export function czyDzienPracy(data: Date | string, zakres: ZakresDniaPracy = domyslnyZakresDniaPracy) {
  return ocenDzienPracy(data, zakres.uzytkownikId ?? '', zakres.kalendarzPracy ?? { dniPracy: zakres.dniPracy ?? [1, 2, 3, 4, 5], wyjatki: [] }).roboczy
}
