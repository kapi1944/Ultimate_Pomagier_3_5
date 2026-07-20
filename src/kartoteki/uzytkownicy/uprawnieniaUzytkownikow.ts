import type { TrybFormularza, Uzytkownik } from './typyUzytkownikow'

export function czyUzytkownikMozeDodac(zalogowanyUzytkownik: Uzytkownik) {
  return zalogowanyUzytkownik.rola === 'ADMINISTRATOR'
}

export function czyUzytkownikMozeEdytowac(zalogowanyUzytkownik: Uzytkownik, edytowanyUzytkownik: Uzytkownik) {
  return zalogowanyUzytkownik.rola === 'ADMINISTRATOR' || edytowanyUzytkownik.id === zalogowanyUzytkownik.id
}

export function czyLogowaniePowinnoBycZablokowane(
  trybFormularza: TrybFormularza,
  zalogowanyUzytkownik: Uzytkownik,
  edytowanyUzytkownik: Uzytkownik | undefined,
) {
  return (
    trybFormularza === 'edycja' &&
    edytowanyUzytkownik?.rola === 'ADMINISTRATOR' &&
    edytowanyUzytkownik.id !== zalogowanyUzytkownik.id &&
    zalogowanyUzytkownik.rola !== 'ADMINISTRATOR'
  )
}
