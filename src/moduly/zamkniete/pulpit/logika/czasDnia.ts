const poczatekDniaMinuty = 7 * 60 + 45
const koniecDniaMinuty = 16 * 60

export type StanWskaznikaCzasu = {
  etykieta: 'PREFAJRANT' | 'TERAZ' | 'FAJRANT'
  pozycja: number
  wyrownanieEtykiety: 'POCZATEK' | 'SRODEK' | 'KONIEC'
}

function pobierzMinuty(data: Date) {
  return data.getHours() * 60 + data.getMinutes() + data.getSeconds() / 60
}

export function obliczPostepCzasuDnia(teraz: Date) {
  const minuty = pobierzMinuty(teraz)
  if (minuty <= poczatekDniaMinuty) return 0
  if (minuty >= koniecDniaMinuty) return 100
  return ((minuty - poczatekDniaMinuty) / (koniecDniaMinuty - poczatekDniaMinuty)) * 100
}

export function pobierzStanWskaznikaCzasu(teraz: Date): StanWskaznikaCzasu {
  const minuty = pobierzMinuty(teraz)
  if (minuty < poczatekDniaMinuty) return { etykieta: 'PREFAJRANT', pozycja: 0, wyrownanieEtykiety: 'POCZATEK' }
  if (minuty >= koniecDniaMinuty) return { etykieta: 'FAJRANT', pozycja: 100, wyrownanieEtykiety: 'KONIEC' }
  return { etykieta: 'TERAZ', pozycja: obliczPostepCzasuDnia(teraz), wyrownanieEtykiety: 'SRODEK' }
}

export function czyGodzinaMiesciSieWDniuPracy(godzina: string) {
  const [godziny, minuty] = godzina.split(':').map(Number)
  const wartosc = godziny * 60 + minuty
  return Number.isFinite(wartosc) && wartosc >= poczatekDniaMinuty && wartosc <= koniecDniaMinuty
}

export function pozycjaGodzinyNaOsi(godzina: string) {
  const [godziny, minuty] = godzina.split(':').map(Number)
  const wartosc = godziny * 60 + minuty
  return Math.min(100, Math.max(0, ((wartosc - poczatekDniaMinuty) / (koniecDniaMinuty - poczatekDniaMinuty)) * 100))
}

export const etykietyOsiCzasu = ['07:45', '09:00', '10:30', '12:00', '13:30', '15:00', '16:00']
