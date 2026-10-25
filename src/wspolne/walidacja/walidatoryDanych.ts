import { czyTelefonMiedzynarodowyPoprawny, pobierzCyfry } from '../telefon/telefon'

export type DaneTelefonu = {
  prefiks: string
  numer: string
  krajIso2?: string
  numerE164?: string
}

const wzorzecImienia = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+(?:[ -][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)*$/
const wzorzecEmail = /^[^\s@ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+@[^\s@ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\.[^\s@ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+$/
const wzorzecBezSpacji = /^\S+$/

export function normalizujNumerTelefonu(numer: string) {
  return pobierzCyfry(numer)
}

export function walidujImieLubNazwisko(wartosc: string) {
  return wartosc.length > 0 && wartosc === wartosc.trimEnd() && wzorzecImienia.test(wartosc)
}

export function walidujEmail(email: string) {
  return wzorzecEmail.test(email)
}

export function walidujTelefonPolski(telefon: DaneTelefonu) {
  return telefon.prefiks === '+48' && /^\d{9}$/.test(normalizujNumerTelefonu(telefon.numer))
}

export function walidujTelefonMiedzynarodowy(telefon: DaneTelefonu) {
  return czyTelefonMiedzynarodowyPoprawny(telefon)
}

export function walidujLogin(login: string) {
  const czystyLogin = login.trim()
  return czystyLogin.length >= 6 && wzorzecBezSpacji.test(czystyLogin)
}

export function walidujHaslo(haslo: string) {
  return [...haslo].length >= 8 && new TextEncoder().encode(haslo).byteLength <= 1024 && !/[\s\u0085]/u.test(haslo)
}
