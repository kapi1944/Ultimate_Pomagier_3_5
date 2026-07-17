import { daneStartoweUzytkownikow } from './daneUzytkownikow'
import type { RolaUzytkownika, Uzytkownik } from './typyUzytkownikow'

export const kluczMagazynuUzytkownikow = 'ultimatePomagier.uzytkownicy.v1'

function skopiujUzytkownika(uzytkownik: Uzytkownik): Uzytkownik {
  return { ...uzytkownik, emaile: [...uzytkownik.emaile], telefony: uzytkownik.telefony.map((telefon) => ({ ...telefon })), odznaki: [...uzytkownik.odznaki], aliasyHistoryczne: [...uzytkownik.aliasyHistoryczne] }
}

function czyPoprawnyUzytkownik(wartosc: unknown): wartosc is Uzytkownik {
  if (!wartosc || typeof wartosc !== 'object') return false
  const uzytkownik = wartosc as Partial<Uzytkownik>
  return typeof uzytkownik.id === 'string' && typeof uzytkownik.login === 'string' && typeof uzytkownik.rola === 'string' && typeof uzytkownik.status === 'string' && Array.isArray(uzytkownik.emaile) && Array.isArray(uzytkownik.telefony) && Array.isArray(uzytkownik.odznaki) && Array.isArray(uzytkownik.aliasyHistoryczne)
}

function odczytajMagazyn(): Uzytkownik[] | null {
  try {
    const zapis = localStorage.getItem(kluczMagazynuUzytkownikow)
    if (zapis === null) return null
    const dane: unknown = JSON.parse(zapis)
    return Array.isArray(dane) ? dane.filter(czyPoprawnyUzytkownik) : []
  } catch {
    return []
  }
}

export function zainicjalizujMagazynUzytkownikow() {
  const istniejacyMagazyn = odczytajMagazyn()
  if (istniejacyMagazyn !== null) return istniejacyMagazyn.map(skopiujUzytkownika)

  const daneStartowe = daneStartoweUzytkownikow.map(skopiujUzytkownika)
  try { localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify(daneStartowe)) } catch { return [] }
  return daneStartowe.map(skopiujUzytkownika)
}

export function pobierzUzytkownikow() { return zainicjalizujMagazynUzytkownikow().map(skopiujUzytkownika) }

function normalizuj(wartosc: unknown) { return String(wartosc ?? '').trim().toLocaleLowerCase('pl') }

export function pobierzUzytkownika(wartosc: string | null | undefined) {
  const szukanaWartosc = normalizuj(wartosc)
  if (!szukanaWartosc) return undefined
  return pobierzUzytkownikow().find((uzytkownik) => [uzytkownik.id, uzytkownik.login, uzytkownik.pseudonim, ...uzytkownik.emaile, ...uzytkownik.aliasyHistoryczne].some((pole) => normalizuj(pole) === szukanaWartosc))
}

export function pobierzAktywnychUzytkownikowWedlugRoli(rola?: RolaUzytkownika) {
  return pobierzUzytkownikow().filter((uzytkownik) => uzytkownik.status === 'AKTYWNY' && (!rola || uzytkownik.rola === rola))
}

export function zapiszUzytkownikow(uzytkownicy: Uzytkownik[]) {
  try { localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify(uzytkownicy.map(skopiujUzytkownika))) } catch { return false }
  return true
}
