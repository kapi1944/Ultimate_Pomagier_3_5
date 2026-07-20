import {
  walidujEmail,
  walidujImieLubNazwisko,
  walidujLogin,
  walidujTelefonMiedzynarodowy,
} from '../../wspolne/walidacja/walidatoryDanych'
import { pobierzBladTelefonu } from '../../wspolne/telefon/telefon'
import type { BledyFormularza, FormularzUzytkownika, KluczBledu } from './typyUzytkownikow'

export function walidujFormularz(formularz: FormularzUzytkownika, czyPolaLogowaniaZablokowane: boolean) {
  const bledy: BledyFormularza = {}

  if (!formularz.zwrot) bledy.zwrot = 'Wybierz zwrot.'
  if (!walidujImieLubNazwisko(formularz.imie)) bledy.imie = 'Podaj imię bez końcowej spacji, używając liter i polskich znaków.'
  if (!walidujImieLubNazwisko(formularz.nazwisko)) bledy.nazwisko = 'Podaj nazwisko bez końcowej spacji, używając liter i polskich znaków.'

  if (!formularz.pseudonim.trim()) bledy.pseudonim = 'Podaj pseudonim.'
  else if (formularz.pseudonim.trim().length > 20) bledy.pseudonim = 'Pseudonim może mieć maksymalnie 20 znaków.'

  formularz.emaile.forEach((email, indeks) => {
    const czystyEmail = email.trim()
    const klucz: KluczBledu = `email-${indeks}`
    if (!czystyEmail) bledy[klucz] = indeks === 0 ? 'Pierwszy adres e-mail jest wymagany.' : 'Wpisz adres albo usuń puste pole.'
    else if (czystyEmail !== email || !walidujEmail(czystyEmail)) bledy[klucz] = 'Podaj adres bez spacji i polskich znaków, w formacie nazwa@domena.pl.'
  })

  formularz.telefony.forEach((telefon, indeks) => {
    const klucz: KluczBledu = `telefon-${indeks}`
    if (!telefon.numer.trim()) bledy[klucz] = indeks === 0 ? 'Pierwszy numer telefonu jest wymagany.' : 'Wpisz numer albo usuń puste pole.'
    else if (!walidujTelefonMiedzynarodowy(telefon)) bledy[klucz] = pobierzBladTelefonu(telefon)
  })

  if (!czyPolaLogowaniaZablokowane) {
    if (!formularz.login.trim()) bledy.login = 'Podaj login.'
    else if (!walidujLogin(formularz.login)) bledy.login = 'Login musi mieć minimum 6 znaków i nie może zawierać spacji.'
  }

  return bledy
}
