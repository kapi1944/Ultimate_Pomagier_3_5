export type ZakresDniaPracy = {
  poczatek: string
  koniec: string
}

export const domyslnyZakresDniaPracy: ZakresDniaPracy = {
  poczatek: '07:45',
  koniec: '16:00',
}

export const etykietyOsiCzasu = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '23:59']

const skalaCzasuPozaPraca = 0.5
const liczbaMinutDoby = 24 * 60

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
  const ograniczoneMinuty = Math.min(liczbaMinutDoby, Math.max(0, minuty))
  const { poczatek, koniec } = normalizujZakres(zakres)
  const dlugoscPrzedPraca = poczatek * skalaCzasuPozaPraca
  const dlugoscPracy = koniec - poczatek
  const dlugoscPoPracy = (liczbaMinutDoby - koniec) * skalaCzasuPozaPraca
  const dlugoscOsi = dlugoscPrzedPraca + dlugoscPracy + dlugoscPoPracy

  const pozycja = ograniczoneMinuty <= poczatek
    ? ograniczoneMinuty * skalaCzasuPozaPraca
    : ograniczoneMinuty <= koniec
      ? dlugoscPrzedPraca + ograniczoneMinuty - poczatek
      : dlugoscPrzedPraca + dlugoscPracy + (ograniczoneMinuty - koniec) * skalaCzasuPozaPraca

  return (pozycja / dlugoscOsi) * 100
}

export function obliczPostepCzasuDnia(
  teraz: Date,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  return pozycjaMinutNaOsi(pobierzMinuty(teraz), zakres)
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
  _zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  void _zakres
  return [...etykietyOsiCzasu]
}
