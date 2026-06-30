import type { TrybFormularza, Uzytkownik } from './typyUzytkownikow'

export function czyUzytkownikMozeDodac(zalogowanyUzytkownik: Uzytkownik) {
  return zalogowanyUzytkownik.rola !== 'Opiekun'
}

export function czyUzytkownikMozeEdytowac(zalogowanyUzytkownik: Uzytkownik, edytowanyUzytkownik: Uzytkownik) {
  return zalogowanyUzytkownik.rola !== 'Opiekun' || edytowanyUzytkownik.id === zalogowanyUzytkownik.id
}

export function czyLogowaniePowinnoBycZablokowane(
  trybFormularza: TrybFormularza,
  zalogowanyUzytkownik: Uzytkownik,
  edytowanyUzytkownik: Uzytkownik | undefined,
) {
  // Architekt jest kontem technicznym do pełnej edycji, pozostali nie zmieniają danych logowania Administratora.
  return (
    trybFormularza === 'edycja' &&
    edytowanyUzytkownik?.rola === 'Administrator' &&
    edytowanyUzytkownik.id !== zalogowanyUzytkownik.id &&
    zalogowanyUzytkownik.rola !== 'Architekt'
  )
}
