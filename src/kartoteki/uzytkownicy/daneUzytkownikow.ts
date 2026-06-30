import type {
  FormularzUzytkownika,
  RolaUzytkownika,
  TytulNaukowy,
  Uzytkownik,
  Zwrot,
} from './typyUzytkownikow'

export const zwroty: Exclude<Zwrot, ''>[] = ['Pan', 'Pani']
export const tytulyNaukowe: TytulNaukowy[] = ['', 'dr', 'dr hab.', 'mgr', 'inż.', 'mgr inż.', 'prof.']
export const roleUzytkownikow: RolaUzytkownika[] = ['Opiekun', 'Administrator', 'Architekt']
export const hasloTymczasowe = 'Reset123!'

export const daneStartoweUzytkownikow: Uzytkownik[] = [
  {
    id: 'architekt-systemu',
    zwrot: 'Pan',
    tytulNaukowy: '',
    imie: 'Architekt',
    nazwisko: 'Systemu',
    pseudonim: 'Architekt',
    emaile: ['architekt@pomagier.local'],
    telefony: [{ prefiks: '+48', numer: '500 000 001' }],
    login: 'architekt',
    haslo: 'Architekt123!',
    rola: 'Architekt',
  },
  {
    id: 'administrator-kacper-madej',
    zwrot: 'Pan',
    tytulNaukowy: 'mgr inż.',
    imie: 'Kacper',
    nazwisko: 'Madej',
    pseudonim: 'Kacper',
    emaile: ['kacper.madej@pomagier.local', 'administrator@pomagier.local'],
    telefony: [{ prefiks: '+48', numer: '501 234 567' }],
    login: 'kacper.madej',
    haslo: 'Admin123!',
    rola: 'Administrator',
  },
  {
    id: 'opiekun-anna-nowak',
    zwrot: 'Pani',
    tytulNaukowy: 'mgr',
    imie: 'Anna',
    nazwisko: 'Nowak',
    pseudonim: 'Ania',
    emaile: ['anna.nowak@pomagier.local'],
    telefony: [{ prefiks: '+48', numer: '502 345 678' }],
    login: 'anna.nowak',
    haslo: 'Opiekun1!',
    rola: 'Opiekun',
  },
  {
    id: 'opiekun-piotr-zielinski',
    zwrot: 'Pan',
    tytulNaukowy: 'dr',
    imie: 'Piotr',
    nazwisko: 'Zieliński',
    pseudonim: 'Piotr',
    emaile: ['piotr.zielinski@pomagier.local'],
    telefony: [{ prefiks: '+48', numer: '503 456 789' }],
    login: 'piotr.zielinski',
    haslo: 'Opiekun2!',
    rola: 'Opiekun',
  },
]

export function utworzPustyFormularz(): FormularzUzytkownika {
  return {
    zwrot: '',
    tytulNaukowy: '',
    imie: '',
    nazwisko: '',
    pseudonim: '',
    emaile: [''],
    telefony: [{ prefiks: '+48', numer: '' }],
    login: '',
    haslo: '',
    rola: 'Opiekun',
  }
}

export function mapujUzytkownikaNaFormularz(uzytkownik: Uzytkownik): FormularzUzytkownika {
  return {
    zwrot: uzytkownik.zwrot,
    tytulNaukowy: uzytkownik.tytulNaukowy,
    imie: uzytkownik.imie,
    nazwisko: uzytkownik.nazwisko,
    pseudonim: uzytkownik.pseudonim,
    emaile: [...uzytkownik.emaile],
    telefony: uzytkownik.telefony.map((telefon) => ({ ...telefon })),
    login: uzytkownik.login,
    haslo: uzytkownik.haslo,
    rola: uzytkownik.rola,
  }
}

export function przygotujDaneDoZapisu(
  formularz: FormularzUzytkownika,
  poprzedniUzytkownik: Uzytkownik | undefined,
  czyPolaLogowaniaZablokowane: boolean,
): Omit<Uzytkownik, 'id'> {
  const dane = {
    zwrot: formularz.zwrot,
    tytulNaukowy: formularz.tytulNaukowy,
    imie: formularz.imie.trim(),
    nazwisko: formularz.nazwisko.trim(),
    pseudonim: formularz.pseudonim.trim(),
    emaile: formularz.emaile.map((email) => email.trim()),
    telefony: formularz.telefony.map((telefon) => ({
      prefiks: telefon.prefiks,
      numer: telefon.numer.trim(),
    })),
    login: formularz.login.trim(),
    haslo: formularz.haslo,
    rola: formularz.rola,
  }

  if (czyPolaLogowaniaZablokowane && poprzedniUzytkownik) {
    return {
      ...dane,
      login: poprzedniUzytkownik.login,
      haslo: poprzedniUzytkownik.haslo,
    }
  }

  return dane
}

export function utworzIdUzytkownika(formularz: FormularzUzytkownika) {
  const rdzen = `${formularz.rola}-${formularz.imie}-${formularz.nazwisko}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${rdzen}-${Date.now()}`
}
