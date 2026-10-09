import type { StatusZapotrzebowaniaZakupowego, ZapotrzebowanieZakupowe, ZalacznikZakupu } from '../modele/pulpit'

export const maksymalnaLiczbaZalacznikowZakupu = 5
export const maksymalnyRozmiarZalacznikaZakupu = 1024 * 1024

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

export function czyPoprawnyLinkProduktu(link: string) {
  try { return ['https:', 'http:'].includes(new URL(link).protocol) } catch { return false }
}

export function normalizujDodatkiZakupu(dane: Record<string, unknown>) {
  const linkiProduktow = (Array.isArray(dane.linkiProduktow) ? dane.linkiProduktow : []).filter((link): link is string => typeof link === 'string' && czyPoprawnyLinkProduktu(link)).map((link) => link.trim())
  const zalaczniki = (Array.isArray(dane.zalaczniki) ? dane.zalaczniki : []).filter((zalacznik): zalacznik is ZalacznikZakupu => {
    if (!zalacznik || typeof zalacznik !== 'object') return false
    const dane = zalacznik as Record<string, unknown>
    return typeof dane.id === 'string' && typeof dane.nazwa === 'string' && typeof dane.daneUrl === 'string' && /^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/.test(dane.daneUrl) && dane.daneUrl.length <= 4 * Math.ceil(maksymalnyRozmiarZalacznikaZakupu / 3) + 64
  }).slice(0, maksymalnaLiczbaZalacznikowZakupu)
  return { linkiProduktow, zalaczniki }
}
