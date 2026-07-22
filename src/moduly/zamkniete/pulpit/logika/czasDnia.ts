export type ZakresDniaPracy = {
  poczatek: string
  koniec: string
}

export const domyslnyZakresDniaPracy: ZakresDniaPracy = {
  poczatek: '07:45',
  koniec: '16:00',
}

export const etykietyOsiCzasu = ['07:45', '09:00', '10:30', '12:00', '13:30', '15:00', '16:00']

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

function formatujMinuty(minuty: number) {
  const bezpieczneMinuty = Math.max(0, Math.min(23 * 60 + 59, Math.round(minuty)))
  const godzina = Math.floor(bezpieczneMinuty / 60)
  const minuta = bezpieczneMinuty % 60
  return String(godzina).padStart(2, '0') + ':' + String(minuta).padStart(2, '0')
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
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  const minuty = pobierzMinuty(teraz)
  const { poczatek, koniec } = normalizujZakres(zakres)

  if (minuty <= poczatek) return 0
  if (minuty >= koniec) return 100

  return ((minuty - poczatek) / (koniec - poczatek)) * 100
}

export function pobierzStanWskaznikaCzasu(
  teraz: Date,
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
): StanWskaznikaCzasu {
  const minuty = pobierzMinuty(teraz)
  const { poczatek, koniec } = normalizujZakres(zakres)

  if (minuty < poczatek) {
    return { etykieta: 'PREFAJRANT', pozycja: 0, wyrownanieEtykiety: 'POCZATEK' }
  }

  if (minuty >= koniec) {
    return { etykieta: 'FAJRANT', pozycja: 100, wyrownanieEtykiety: 'KONIEC' }
  }

  return {
    etykieta: 'TERAZ',
    pozycja: obliczPostepCzasuDnia(teraz, zakres),
    wyrownanieEtykiety: 'SRODEK',
  }
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
  const wartosc = minutyZGodziny(godzina)
  const { poczatek, koniec } = normalizujZakres(zakres)

  return Math.min(
    100,
    Math.max(0, ((wartosc - poczatek) / (koniec - poczatek)) * 100),
  )
}

export function pobierzEtykietyOsiCzasu(
  zakres: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  if (
    zakres.poczatek === domyslnyZakresDniaPracy.poczatek
    && zakres.koniec === domyslnyZakresDniaPracy.koniec
  ) {
    return [...etykietyOsiCzasu]
  }

  const { poczatek, koniec } = normalizujZakres(zakres)
  const liczbaPrzedzialow = 6

  return Array.from({ length: liczbaPrzedzialow + 1 }, (_, indeks) => {
    if (indeks === 0) return formatujMinuty(poczatek)
    if (indeks === liczbaPrzedzialow) return formatujMinuty(koniec)

    const surowe = poczatek + ((koniec - poczatek) * indeks) / liczbaPrzedzialow
    const zaokraglone = Math.round(surowe / 5) * 5
    return formatujMinuty(zaokraglone)
  })
}
