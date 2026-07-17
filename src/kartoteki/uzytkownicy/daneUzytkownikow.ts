import type { FormularzUzytkownika, OrganizacjaUzytkownika, RolaUzytkownika, TytulNaukowy, Uzytkownik, Zwrot } from './typyUzytkownikow'

const dataStartowa = '2026-07-17T00:00:00.000Z'

export const zwroty: Exclude<Zwrot, ''>[] = ['Pan', 'Pani']
export const tytulyNaukowe: TytulNaukowy[] = ['', 'dr', 'dr hab.', 'mgr', 'inż.', 'mgr inż.', 'prof.']
export const roleUzytkownikow: RolaUzytkownika[] = ['ARCHITEKT', 'ADMINISTRATOR', 'MODERATOR', 'OPIEKUN', 'PRACOWNIK', 'TRENER', 'KOORDYNATOR_KLIENTA', 'GOSC']

function utworzUzytkownika(dane: Omit<Uzytkownik, 'utworzono' | 'zaktualizowano' | 'wersjaUprawnien' | 'wymagaZmianyHasla'>): Uzytkownik {
  return { ...dane, wymagaZmianyHasla: false, wersjaUprawnien: 1, utworzono: dataStartowa, zaktualizowano: dataStartowa }
}

export const daneStartoweUzytkownikow: Uzytkownik[] = [
  utworzUzytkownika({
    id: 'architekt-systemu', zwrot: 'Pan', tytulNaukowy: '', imie: 'Architekt', nazwisko: 'Systemu', pseudonim: 'Architekt systemu',
    emaile: ['architekt@pomagier.local'], telefony: [{ prefiks: '+48', numer: '500 000 001' }], login: 'architekt', rola: 'ADMINISTRATOR', organizacja: 'SEMPER',
    odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: ['architekt', 'Architekt'],
  }),
  utworzUzytkownika({
    id: 'administrator-kacper-madej', zwrot: 'Pan', tytulNaukowy: 'mgr inż.', imie: 'Kacper', nazwisko: 'Madej', pseudonim: 'Kacper',
    emaile: ['kacper.madej@pomagier.local', 'administrator@pomagier.local'], telefony: [{ prefiks: '+48', numer: '501 234 567' }], login: 'kacper.madej', rola: 'ARCHITEKT', organizacja: 'SEMPER',
    odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#cc0000', aliasyHistoryczne: ['Kacper', 'administrator'],
  }),
  utworzUzytkownika({
    id: 'opiekun-anna-nowak', zwrot: 'Pani', tytulNaukowy: 'mgr', imie: 'Anna', nazwisko: 'Nowak', pseudonim: 'Ania',
    emaile: ['anna.nowak@pomagier.local'], telefony: [{ prefiks: '+48', numer: '502 345 678' }], login: 'anna.nowak', rola: 'OPIEKUN', organizacja: 'SEMPER',
    odznaki: ['AKCEPTUJACY'], status: 'AKTYWNY', kolorProfilu: '#8e7cc3', aliasyHistoryczne: ['Ania'],
  }),
  utworzUzytkownika({
    id: 'opiekun-piotr-zielinski', zwrot: 'Pan', tytulNaukowy: 'dr', imie: 'Piotr', nazwisko: 'Zieliński', pseudonim: 'Piotr',
    emaile: ['piotr.zielinski@pomagier.local'], telefony: [{ prefiks: '+48', numer: '503 456 789' }], login: 'piotr.zielinski', rola: 'OPIEKUN', organizacja: 'IIST',
    odznaki: ['AKCEPTUJACY'], status: 'AKTYWNY', kolorProfilu: '#76a5af', aliasyHistoryczne: [],
  }),
  utworzUzytkownika({ id: 'Iza', zwrot: 'Pani', tytulNaukowy: '', imie: 'Iza', nazwisko: '', pseudonim: 'Iza', emaile: ['iza@pomagier.local'], telefony: [{ prefiks: '+48', numer: '510 000 001' }], login: 'iza', rola: 'OPIEKUN', organizacja: 'SEMPER', odznaki: ['AKCEPTUJACY'], status: 'AKTYWNY', kolorProfilu: '#ffe599', aliasyHistoryczne: ['iza'] }),
  utworzUzytkownika({ id: 'Kamila', zwrot: 'Pani', tytulNaukowy: '', imie: 'Kamila', nazwisko: '', pseudonim: 'Kamila', emaile: ['kamila@pomagier.local'], telefony: [{ prefiks: '+48', numer: '510 000 002' }], login: 'kamila', rola: 'OPIEKUN', organizacja: 'SEMPER', odznaki: ['AKCEPTUJACY'], status: 'AKTYWNY', kolorProfilu: '#6fa8dc', aliasyHistoryczne: ['kamila'] }),
  utworzUzytkownika({ id: 'Dawid', zwrot: 'Pan', tytulNaukowy: '', imie: 'Dawid', nazwisko: '', pseudonim: 'Dawid', emaile: ['dawid@pomagier.local'], telefony: [{ prefiks: '+48', numer: '510 000 003' }], login: 'dawid', rola: 'OPIEKUN', organizacja: 'IIST', odznaki: ['AKCEPTUJACY'], status: 'AKTYWNY', kolorProfilu: '#f6b26b', aliasyHistoryczne: ['dawid'] }),
  utworzUzytkownika({ id: 'Kasia RB', zwrot: 'Pani', tytulNaukowy: '', imie: 'Kasia', nazwisko: 'RB', pseudonim: 'Kasia RB', emaile: ['kasia.rb@pomagier.local'], telefony: [{ prefiks: '+48', numer: '510 000 004' }], login: 'kasia.rb', rola: 'OPIEKUN', organizacja: 'SEMPER', odznaki: ['AKCEPTUJACY'], status: 'AKTYWNY', kolorProfilu: '#fce4d6', aliasyHistoryczne: ['kasia rb', 'Kasia'] }),
  utworzUzytkownika({ id: 'konto-zablokowane', zwrot: 'Pan', tytulNaukowy: '', imie: 'Konto', nazwisko: 'Zablokowane', pseudonim: 'Zablokowane', emaile: ['zablokowane@pomagier.local'], telefony: [{ prefiks: '+48', numer: '510 000 005' }], login: 'zablokowane', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: [], status: 'ZABLOKOWANY', kolorProfilu: '#999999', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'konto-nieaktywne', zwrot: 'Pani', tytulNaukowy: '', imie: 'Konto', nazwisko: 'Nieaktywne', pseudonim: 'Nieaktywne', emaile: ['nieaktywne@pomagier.local'], telefony: [{ prefiks: '+48', numer: '510 000 006' }], login: 'nieaktywne', rola: 'GOSC', organizacja: 'ZEWNĘTRZNY', odznaki: [], status: 'NIEAKTYWNY', kolorProfilu: '#999999', aliasyHistoryczne: [] }),
]

export function utworzPustyFormularz(): FormularzUzytkownika {
  return { zwrot: '', tytulNaukowy: '', imie: '', nazwisko: '', pseudonim: '', emaile: [''], telefony: [{ prefiks: '+48', numer: '' }], login: '', rola: 'PRACOWNIK', organizacja: 'SEMPER' as OrganizacjaUzytkownika, odznaki: [], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [], wymagaZmianyHasla: false }
}

export function mapujUzytkownikaNaFormularz(uzytkownik: Uzytkownik): FormularzUzytkownika {
  const formularz = { ...uzytkownik, emaile: [...uzytkownik.emaile], telefony: uzytkownik.telefony.map((telefon) => ({ ...telefon })), odznaki: [...uzytkownik.odznaki], aliasyHistoryczne: [...uzytkownik.aliasyHistoryczne] }
  Reflect.deleteProperty(formularz, 'id')
  Reflect.deleteProperty(formularz, 'ostatnieLogowanie')
  Reflect.deleteProperty(formularz, 'utworzono')
  Reflect.deleteProperty(formularz, 'zaktualizowano')
  Reflect.deleteProperty(formularz, 'wersjaUprawnien')
  return formularz as FormularzUzytkownika
}

export function przygotujDaneDoZapisu(formularz: FormularzUzytkownika): Omit<Uzytkownik, 'id' | 'ostatnieLogowanie' | 'utworzono' | 'zaktualizowano' | 'wersjaUprawnien'> {
  return { ...formularz, imie: formularz.imie.trim(), nazwisko: formularz.nazwisko.trim(), pseudonim: formularz.pseudonim.trim(), emaile: formularz.emaile.map((email) => email.trim()), telefony: formularz.telefony.map((telefon) => ({ ...telefon, numer: telefon.numer.trim() })), login: formularz.login.trim(), aliasyHistoryczne: formularz.aliasyHistoryczne.map((alias) => alias.trim()).filter(Boolean) }
}

export function utworzIdUzytkownika(formularz: FormularzUzytkownika) {
  const rdzen = `${formularz.rola}-${formularz.imie}-${formularz.nazwisko}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${rdzen}-${Date.now()}`
}
