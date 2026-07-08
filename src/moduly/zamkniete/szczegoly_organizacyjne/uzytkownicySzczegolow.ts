import type { RolaUzytkownika } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import type { OpublikowaneSzczegolyOrganizacyjne, WersjaRoboczaGeneratora } from './typy'

export type KontoSzczegolow = {
  id: string
  nazwa: string
  rola: RolaUzytkownika
  kolorOpiekuna?: string
}

export const kontaSzczegolow: KontoSzczegolow[] = [
  { id: 'architekt', nazwa: 'Architekt', rola: 'Architekt' },
  { id: 'Iza', nazwa: 'Iza', rola: 'Opiekun', kolorOpiekuna: '#ffe599' },
  { id: 'Kamila', nazwa: 'Kamila', rola: 'Opiekun', kolorOpiekuna: '#6fa8dc' },
  { id: 'Dawid', nazwa: 'Dawid', rola: 'Opiekun', kolorOpiekuna: '#f6b26b' },
  { id: 'Kasia RB', nazwa: 'Kasia RB', rola: 'Opiekun', kolorOpiekuna: '#fce4d6' },
]

export const opiekunowieSzczegolow = kontaSzczegolow.filter((konto) => konto.rola === 'Opiekun')

function normalizujNazwe(wartosc: unknown) {
  return String(wartosc ?? '')
    .trim()
    .toLocaleLowerCase('pl')
}

function znajdzKontoPoNazwie(wartosc: unknown) {
  const nazwa = normalizujNazwe(wartosc)

  return kontaSzczegolow.find(
    (konto) =>
      normalizujNazwe(konto.id) === nazwa ||
      normalizujNazwe(konto.nazwa) === nazwa,
  )
}

export function pobierzKontoSzczegolow(id: string) {
  return kontaSzczegolow.find((konto) => konto.id === id)
}

export function pobierzNazweOpiekuna(id: string) {
  return pobierzKontoSzczegolow(id)?.nazwa || 'Bez opiekuna'
}

export function pobierzKolorTlaOpiekuna(id: string) {
  const kolor = pobierzKontoSzczegolow(id)?.kolorOpiekuna || '#d9ead3'

  return `${kolor}cc`
}

export function pobierzAktywneKontoSzczegolow(): KontoSzczegolow {
  try {
    const zapisSesji = localStorage.getItem('ultimate-pomagier.zalogowany-uzytkownik')
    const daneSesji = zapisSesji ? JSON.parse(zapisSesji) : null
    const zapisRoli = localStorage.getItem('ultimate-pomagier.aktywna-rola')
    const rola = typeof daneSesji?.rola === 'string' ? daneSesji.rola : zapisRoli

    if (rola === 'Architekt') {
      return kontaSzczegolow[0]
    }

    const konto =
      znajdzKontoPoNazwie(daneSesji?.id) ||
      znajdzKontoPoNazwie(daneSesji?.pseudonim) ||
      znajdzKontoPoNazwie(daneSesji?.imie) ||
      znajdzKontoPoNazwie(daneSesji?.login)

    return konto ?? kontaSzczegolow[0]
  } catch {
    return kontaSzczegolow[0]
  }
}

export function czyKontoArchitekta(konto: KontoSzczegolow) {
  return konto.rola === 'Architekt'
}

export function czyKontoMozeWidziecKopie(konto: KontoSzczegolow, kopia: WersjaRoboczaGeneratora) {
  return czyKontoArchitekta(konto) || kopia.autorId === konto.id
}

export function czyKontoMozeEdytowacKopie(konto: KontoSzczegolow, kopia: WersjaRoboczaGeneratora) {
  return czyKontoMozeWidziecKopie(konto, kopia)
}

export function czyKontoMozeZaakceptowacSzczegoly(konto: KontoSzczegolow, rekord: OpublikowaneSzczegolyOrganizacyjne) {
  return czyKontoArchitekta(konto) || rekord.opiekunId === konto.id
}