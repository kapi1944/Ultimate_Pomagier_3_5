export type ZakresDniaPracy = {
  poczatek: string
  koniec: string
}

export const domyslnyZakresDniaPracy: ZakresDniaPracy = {
  poczatek: '07:45',
  koniec: '16:00',
}

export const etykietyOsiCzasu = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '23:59']

export type StanWskaznikaCzasu = {
  etykieta: 'PREFAJRANT' | 'TERAZ' | 'FAJRANT'
  pozycja: number
  wyrownanieEtykiety: 'POCZATEK' | 'SRODEK' | 'KONIEC'
}

function pobierzMinuty(data: Date) {
  return data.getHours() * 60 + data.getMinutes() + data.getSeconds() / 60
}

function minutyZGodziny(godzina: string) {
  const [godziny, minuty] = godzina.split(':').map(Number)
  return godziny * 60 + minuty
}

function pozycjaMinutNaOsi(minuty: number) {
  return Math.min(100, Math.max(0, (minuty / (24 * 60)) * 100))
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

export function obliczPostepCzasuDnia(
  teraz: Date,
  _zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  void _zakres
  return pozycjaMinutNaOsi(pobierzMinuty(teraz))
}

export function pobierzStanWskaznikaCzasu(
  teraz: Date,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
): StanWskaznikaCzasu {
  const minuty = pobierzMinuty(teraz)
  const { poczatek, koniec } = normalizujZakres(zakres)
  const pozycja = obliczPostepCzasuDnia(teraz, zakres)
  const wyrownanieEtykiety = pozycja <= 5
    ? 'POCZATEK'
    : pozycja >= 95
      ? 'KONIEC'
      : 'SRODEK'

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
  _zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  void _zakres
  return pozycjaMinutNaOsi(minutyZGodziny(godzina))
}

export function pobierzGraniceDniaPracyNaOsi(
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  const { poczatek, koniec } = normalizujZakres(zakres)
  return {
    poczatek: pozycjaMinutNaOsi(poczatek),
    koniec: pozycjaMinutNaOsi(koniec),
  }
}

export function pobierzEtykietyOsiCzasu(
  _zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  void _zakres
  return [...etykietyOsiCzasu]
}
