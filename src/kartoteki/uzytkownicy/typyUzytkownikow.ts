export type RolaUzytkownika = 'Opiekun' | 'Administrator' | 'Architekt'
export type Zwrot = '' | 'Pan' | 'Pani'
export type TytulNaukowy = '' | 'dr' | 'dr hab.' | 'mgr' | 'inż.' | 'mgr inż.' | 'prof.'
export type PrefiksTelefonu = '+48'

export type Telefon = {
  prefiks: PrefiksTelefonu
  numer: string
}

export type Uzytkownik = {
  id: string
  zwrot: Zwrot
  tytulNaukowy: TytulNaukowy
  imie: string
  nazwisko: string
  pseudonim: string
  emaile: string[]
  telefony: Telefon[]
  login: string
  haslo: string
  rola: RolaUzytkownika
}

export type FormularzUzytkownika = Omit<Uzytkownik, 'id'>
export type KluczBledu = keyof FormularzUzytkownika | `email-${number}` | `telefon-${number}`
export type BledyFormularza = Partial<Record<KluczBledu, string>>
export type TrybFormularza = 'edycja' | 'nowy'
