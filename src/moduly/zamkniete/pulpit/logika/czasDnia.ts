const poczatekDniaMinuty = 7 * 60 + 45
const koniecDniaMinuty = 16 * 60

function pobierzMinuty(data: Date) {
  return data.getHours() * 60 + data.getMinutes() + data.getSeconds() / 60
}

export function obliczPostepCzasuDnia(teraz: Date) {
  const minuty = pobierzMinuty(teraz)
  if (minuty <= poczatekDniaMinuty) return 0
  if (minuty >= koniecDniaMinuty) return 100
  return ((minuty - poczatekDniaMinuty) / (koniecDniaMinuty - poczatekDniaMinuty)) * 100
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
