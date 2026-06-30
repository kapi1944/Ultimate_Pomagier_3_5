export type DaneTelefonu = {
  prefiks: string
  numer: string
}

const wzorzecImienia = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+(?:[ -][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)*$/
const wzorzecEmail = /^[^\s@ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+@[^\s@ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\.[^\s@ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+$/
const wzorzecBezSpacji = /^\S+$/

export function normalizujNumerTelefonu(numer: string) {
  return numer.replace(/[\s-]/g, '')
}

export function walidujImieLubNazwisko(wartosc: string) {
  return wartosc.length > 0 && wartosc === wartosc.trimEnd() && wzorzecImienia.test(wartosc)
}

export function walidujEmail(email: string) {
  return wzorzecEmail.test(email)
}

export function walidujTelefonPolski(telefon: DaneTelefonu) {
  const numer = normalizujNumerTelefonu(telefon.numer)

  return telefon.prefiks === '+48' && /^\d{9}$/.test(numer)
}

export function walidujLogin(login: string) {
  const czystyLogin = login.trim()

  return czystyLogin.length >= 6 && wzorzecBezSpacji.test(czystyLogin)
}

export function walidujHaslo(haslo: string) {
  return haslo.length >= 6 && wzorzecBezSpacji.test(haslo)
}
