import type { StatusSzczegolow } from './typy'

export type AkcjaStatusuSzczegolow = 'publikacja' | 'akceptacja' | 'przygotowanie' | 'realizacja' | 'rozliczenie' | 'cofniecie'

export type PrzejscieStatusuSzczegolow = {
  z: StatusSzczegolow
  do: StatusSzczegolow
  akcja: AkcjaStatusuSzczegolow
  automatyczne: boolean
  wymagaPowodu: boolean
  wymagaPrzyszlegoUprawnienia: boolean
  blokujeEdycje: boolean
}

export const macierzPrzejscStatusowSzczegolow: readonly PrzejscieStatusuSzczegolow[] = [
  { z: 'PEŁNE', do: 'OCZEKUJĄCE', akcja: 'publikacja', automatyczne: true, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: false, blokujeEdycje: true },
  { z: 'OCZEKUJĄCE', do: 'ZAAKCEPTOWANE', akcja: 'akceptacja', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true, blokujeEdycje: true },
  { z: 'ZAAKCEPTOWANE', do: 'GOTOWE', akcja: 'przygotowanie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: false, blokujeEdycje: true },
  { z: 'GOTOWE', do: 'ZREALIZOWANE', akcja: 'realizacja', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: false, blokujeEdycje: true },
  { z: 'GOTOWE', do: 'NIEZREALIZOWANE', akcja: 'realizacja', automatyczne: false, wymagaPowodu: true, wymagaPrzyszlegoUprawnienia: false, blokujeEdycje: true },
  { z: 'ZREALIZOWANE', do: 'ROZLICZONE', akcja: 'rozliczenie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true, blokujeEdycje: true },
  { z: 'NIEZREALIZOWANE', do: 'ROZLICZONE', akcja: 'rozliczenie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true, blokujeEdycje: true },
  { z: 'ZAAKCEPTOWANE', do: 'OCZEKUJĄCE', akcja: 'cofniecie', automatyczne: false, wymagaPowodu: false, wymagaPrzyszlegoUprawnienia: true, blokujeEdycje: true },
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

export function czyStatusBlokujeEdycje(status: StatusSzczegolow) {
  return status === 'ROZLICZONE'
}
