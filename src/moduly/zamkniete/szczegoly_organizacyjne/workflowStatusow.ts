import type { StatusSzczegolow } from './typy'

export type AkcjaStatusuSzczegolow = 'publikacja' | 'akceptacja' | 'przygotowanie' | 'realizacja' | 'rozliczenie' | 'cofniecie'

export type PrzejscieStatusuSzczegolow = {
  z: StatusSzczegolow
  do: StatusSzczegolow
  akcja: AkcjaStatusuSzczegolow
  automatyczne: boolean
  wymagaPowodu: boolean
  wymagaPrzyszlegoUprawnienia: boolean
}

export const macierzPrzejscStatusowSzczegolow: readonly PrzejscieStatusuSzczegolow[] = [
  { z: 'PEŁNE', do: 'OCZEKUJĄCE', akcja: 'publikacja', automatyczne: true, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: false },
  { z: 'OCZEKUJĄCE', do: 'ZAAKCEPTOWANE', akcja: 'akceptacja', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true },
  { z: 'ZAAKCEPTOWANE', do: 'GOTOWE', akcja: 'przygotowanie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: false },
  { z: 'GOTOWE', do: 'ZREALIZOWANE', akcja: 'realizacja', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: false },
  { z: 'GOTOWE', do: 'NIEZREALIZOWANE', akcja: 'realizacja', automatyczne: false, wymagaPowodu: true, wymagaPrzyszlegoUprawnienia: false },
  { z: 'ZREALIZOWANE', do: 'ROZLICZONE', akcja: 'rozliczenie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true },
  { z: 'NIEZREALIZOWANE', do: 'ROZLICZONE', akcja: 'rozliczenie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true },
  { z: 'ZAAKCEPTOWANE', do: 'OCZEKUJĄCE', akcja: 'cofniecie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true },
]

export function pobierzPrzejscieStatusuSzczegolow(z: StatusSzczegolow, doStatusu: StatusSzczegolow) {
  return macierzPrzejscStatusowSzczegolow.find((przejscie) => przejscie.z === z && przejscie.do === doStatusu) ?? null
}

export function walidujPrzejscieStatusuSzczegolow(z: StatusSzczegolow, doStatusu: StatusSzczegolow, powod = '') {
  const przejscie = pobierzPrzejscieStatusuSzczegolow(z, doStatusu)

  if (!przejscie) {
    return { poprawne: false, komunikat: `Przejście ${z} → ${doStatusu} nie jest dozwolone.` }
  }

  if (przejscie.wymagaPowodu && !powod.trim()) {
    return { poprawne: false, komunikat: 'Podaj przyczynę oznaczenia szkolenia jako niezrealizowane.' }
  }

  return { poprawne: true, przejscie }
}

export function czyMoznaEdytowacBezposrednio(status: StatusSzczegolow) {
  void status
  return false
}

export function czyStatusJestZamkniety(status: StatusSzczegolow) {
  return status === 'ROZLICZONE'
}

export function czyMoznaUtworzycAktualizacje(status: StatusSzczegolow) {
  return !czyStatusJestZamkniety(status)
}
