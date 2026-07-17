import type { OdznakaUzytkownika, RolaUzytkownika, Uzytkownik } from './typyUzytkownikow'
import { czyJestArchitektem, czyJestPracownikiemWewnetrznym, czyKontoJestAktywne } from './typyUzytkownikow'

export function czyMaRole(uzytkownik: Uzytkownik | null | undefined, rola: RolaUzytkownika) { return czyKontoJestAktywne(uzytkownik) && uzytkownik?.rola === rola }
export function czyMaOdznake(uzytkownik: Uzytkownik | null | undefined, odznaka: OdznakaUzytkownika) { return czyKontoJestAktywne(uzytkownik) && Boolean(uzytkownik?.odznaki.includes(odznaka)) }
export function czyJestAdministratorem(uzytkownik: Uzytkownik | null | undefined) { return czyMaRole(uzytkownik, 'ADMINISTRATOR') || czyJestArchitektem(uzytkownik) }
export function czyMozeZarzadzacUzytkownikami(uzytkownik: Uzytkownik | null | undefined) { return czyJestArchitektem(uzytkownik) || czyJestAdministratorem(uzytkownik) }
export function czyMozeAkceptowac(uzytkownik: Uzytkownik | null | undefined) { return czyMozeZarzadzacUzytkownikami(uzytkownik) || czyMaOdznake(uzytkownik, 'AKCEPTUJACY') }
export function czyMozeEksportowac(uzytkownik: Uzytkownik | null | undefined) { return czyMozeZarzadzacUzytkownikami(uzytkownik) || czyMaOdznake(uzytkownik, 'EKSPORTER') }
export function czyMozeWysylac(uzytkownik: Uzytkownik | null | undefined) { return czyMozeZarzadzacUzytkownikami(uzytkownik) || czyMaOdznake(uzytkownik, 'WYSYLACZ') }
export function czyMozeRozliczac(uzytkownik: Uzytkownik | null | undefined) { return czyMozeZarzadzacUzytkownikami(uzytkownik) || czyMaOdznake(uzytkownik, 'ROZLICZAJACY') }
export function czyMozeCzytacAudyt(uzytkownik: Uzytkownik | null | undefined) { return czyMozeZarzadzacUzytkownikami(uzytkownik) || czyMaOdznake(uzytkownik, 'AUDYTOR') }

export function czyMozePrzegladacProfil(zalogowanyUzytkownik: Uzytkownik | null | undefined, przegladanyUzytkownik: Uzytkownik | null | undefined) {
  if (!zalogowanyUzytkownik || !przegladanyUzytkownik || !czyKontoJestAktywne(zalogowanyUzytkownik)) return false
  if (zalogowanyUzytkownik.id === przegladanyUzytkownik.id) return true
  if (czyMozeZarzadzacUzytkownikami(zalogowanyUzytkownik)) return true
  return czyJestPracownikiemWewnetrznym(zalogowanyUzytkownik) && czyJestPracownikiemWewnetrznym(przegladanyUzytkownik)
}

export function czyMozeEdytowacProfil(zalogowanyUzytkownik: Uzytkownik | null | undefined, edytowanyUzytkownik: Uzytkownik | null | undefined) {
  if (!zalogowanyUzytkownik || !edytowanyUzytkownik || !czyKontoJestAktywne(zalogowanyUzytkownik)) return false
  if (zalogowanyUzytkownik.id === edytowanyUzytkownik.id) return true
  if (czyJestArchitektem(zalogowanyUzytkownik)) return true
  return czyJestAdministratorem(zalogowanyUzytkownik) && !czyJestArchitektem(edytowanyUzytkownik)
}
