import type { StatusZapotrzebowaniaZakupowego, ZapotrzebowanieZakupowe } from '../modele/pulpit'

const statusyAktywne: StatusZapotrzebowaniaZakupowego[] = ['ZGLOSZONE', 'DO_ZAKUPU', 'W_REALIZACJI']

export function czyZapotrzebowanieZakupoweJestAktywne(status: StatusZapotrzebowaniaZakupowego) {
  return statusyAktywne.includes(status)
}

export function pobierzAktywneZapotrzebowaniaZakupowe(zapotrzebowania: ZapotrzebowanieZakupowe[]) {
  return zapotrzebowania.filter((zapotrzebowanie) => czyZapotrzebowanieZakupoweJestAktywne(zapotrzebowanie.status))
}

export function obliczLiczbeAktywnychZapotrzebowanZakupowych(zapotrzebowania: ZapotrzebowanieZakupowe[]) {
  return pobierzAktywneZapotrzebowaniaZakupowe(zapotrzebowania).length
}

export function odmienRzeczDoZakupu(liczba: number) {
  const ostatnieDwieCyfry = liczba % 100
  const ostatniaCyfra = liczba % 10
  if (liczba === 1) return 'rzecz do zakupu'
  if ((ostatnieDwieCyfry < 12 || ostatnieDwieCyfry > 14) && ostatniaCyfra >= 2 && ostatniaCyfra <= 4) return 'rzeczy do zakupu'
  return 'rzeczy do zakupu'
}

export function pobierzTekstLicznikaZakupow(liczba: number) {
  return liczba > 999 ? '999+' : String(liczba)
}

export function walidujNoweZapotrzebowanieZakupowe(nazwa: string, ilosc: number) {
  if (!nazwa.trim()) return 'Nazwa zapotrzebowania jest wymagana.'
  if (!Number.isFinite(ilosc) || ilosc <= 0) return 'Ilość musi być liczbą większą od zera.'
  return null
}
