import type { OdznakaUzytkownika, RolaUzytkownika, Uzytkownik } from './typyUzytkownikow'
import { czyKontoJestAktywne } from './typyUzytkownikow'

export function czyMaRole(uzytkownik: Uzytkownik | null | undefined, rola: RolaUzytkownika) { return czyKontoJestAktywne(uzytkownik) && uzytkownik?.rola === rola }
export function czyMaOdznake(uzytkownik: Uzytkownik | null | undefined, odznaka: OdznakaUzytkownika) { return czyKontoJestAktywne(uzytkownik) && Boolean(uzytkownik?.odznaki.includes(odznaka)) }
export function czyJestAdministratorem(uzytkownik: Uzytkownik | null | undefined) { return czyMaRole(uzytkownik, 'ADMINISTRATOR') }
export function czyMozeZarzadzacUzytkownikami(uzytkownik: Uzytkownik | null | undefined) { return czyJestAdministratorem(uzytkownik) }
export function czyMozeAkceptowac(uzytkownik: Uzytkownik | null | undefined) { return czyJestAdministratorem(uzytkownik) || czyMaOdznake(uzytkownik, 'AKCEPTUJACY') }
export function czyMozeEksportowac(uzytkownik: Uzytkownik | null | undefined) { return czyJestAdministratorem(uzytkownik) || czyMaOdznake(uzytkownik, 'EKSPORTER') }
export function czyMozeWysylac(uzytkownik: Uzytkownik | null | undefined) { return czyJestAdministratorem(uzytkownik) || czyMaOdznake(uzytkownik, 'WYSYLACZ') }
export function czyMozeRozliczac(uzytkownik: Uzytkownik | null | undefined) { return czyJestAdministratorem(uzytkownik) || czyMaOdznake(uzytkownik, 'ROZLICZAJACY') }
export function czyMozeCzytacAudyt(uzytkownik: Uzytkownik | null | undefined) { return czyJestAdministratorem(uzytkownik) || czyMaOdznake(uzytkownik, 'AUDYTOR') }
