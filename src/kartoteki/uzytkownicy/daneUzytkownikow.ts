import { normalizujTelefon } from '../../wspolne/telefon/telefon'
import type { FormularzUzytkownika, OrganizacjaUzytkownika, RolaUzytkownika, TytulNaukowy, Uzytkownik, Zwrot } from './typyUzytkownikow'

const dataStartowa = '2026-07-17T00:00:00.000Z'

export const zwroty: Exclude<Zwrot, ''>[] = ['Pan', 'Pani']
export const tytulyNaukowe: TytulNaukowy[] = ['', 'dr', 'dr hab.', 'mgr', 'inż.', 'mgr inż.', 'prof.']
export const roleUzytkownikow: RolaUzytkownika[] = ['ARCHITEKT', 'ADMINISTRATOR', 'MODERATOR', 'OPIEKUN', 'PRACOWNIK', 'TRENER', 'KOORDYNATOR_KLIENTA', 'GOSC']

function utworzUzytkownika(dane: Omit<Uzytkownik, 'email' | 'ostatnieLogowanie' | 'utworzono' | 'zaktualizowano' | 'wersjaUprawnien' | 'wymagaZmianyHasla'>): Uzytkownik {
  return { ...dane, email: dane.emaile[0] ?? '', telefony: dane.telefony.map(normalizujTelefon), wymagaZmianyHasla: false, wersjaUprawnien: 1, ostatnieLogowanie: null, utworzono: dataStartowa, zaktualizowano: dataStartowa }
}

export const daneStartoweUzytkownikow: Uzytkownik[] = [
  utworzUzytkownika({ id: 'architekt-systemu', zwrot: 'Pan', tytulNaukowy: '', imie: 'Architekt', nazwisko: 'Systemu', pseudonim: 'Architekt systemu', emaile: ['a.systemu@pomagier.local'], telefony: [{ prefiks: '+48', numer: '792 059 669' }], login: 'architekt', rola: 'ADMINISTRATOR', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: ['architekt', 'Architekt'] }),
  utworzUzytkownika({ id: 'administrator-kacper-madej', zwrot: 'Pan', tytulNaukowy: '', imie: 'Kacper', nazwisko: 'Madej', pseudonim: 'Kacper', emaile: ['k.madej@szkolenia-semper.pl', 'administrator@pomagier.local'], telefony: [{ prefiks: '+48', numer: '792 059 669' }], login: 'kacper.madej', rola: 'ARCHITEKT', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#cc0000', aliasyHistoryczne: ['Kacper', 'administrator'] }),
  utworzUzytkownika({ id: 'Iza', zwrot: 'Pani', tytulNaukowy: '', imie: 'Izabela', nazwisko: 'Czugała', pseudonim: 'Iza Cz', emaile: ['i.czugala@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '796 230 982' }], login: 'i.czugala', rola: 'OPIEKUN', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#ffe599', aliasyHistoryczne: ['iza'] }),
  utworzUzytkownika({ id: 'Kamila', zwrot: 'Pani', tytulNaukowy: '', imie: 'Kamila', nazwisko: 'Zaremba', pseudonim: 'Kamila', emaile: ['k.zaremba@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '575 174 727' }], login: 'k.zaremba', rola: 'OPIEKUN', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#6fa8dc', aliasyHistoryczne: ['kamila'] }),
  utworzUzytkownika({ id: 'Dawid', zwrot: 'Pan', tytulNaukowy: '', imie: 'Dawid', nazwisko: 'Chyła', pseudonim: 'Dawid', emaile: ['d.chyla@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '576 634 319' }], login: 'd.chyla', rola: 'OPIEKUN', organizacja: 'IIST', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#f6b26b', aliasyHistoryczne: ['dawid'] }),
  utworzUzytkownika({ id: 'Kasia RB', zwrot: 'Pani', tytulNaukowy: '', imie: 'Katarzyna', nazwisko: 'Rohde-Buraczek', pseudonim: 'Kasia RB', emaile: ['k.buraczek@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '570 932 700' }], login: 'k.buraczek', rola: 'OPIEKUN', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#fce4d6', aliasyHistoryczne: ['kasia rb', 'Kasia'] }),
  utworzUzytkownika({ id: 'konto-zablokowane', zwrot: 'Pan', tytulNaukowy: '', imie: 'Konto', nazwisko: 'Zablokowane', pseudonim: '[Zablokowane]', emaile: ['zablokowane@pomagier.local'], telefony: [], login: 'zablokowane', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'ZABLOKOWANY', kolorProfilu: '#999999', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'konto-nieaktywne', zwrot: 'Pani', tytulNaukowy: '', imie: 'Konto', nazwisko: 'Nieaktywne', pseudonim: '[Nieaktywne]', emaile: ['nieaktywne@pomagier.local'], telefony: [], login: 'nieaktywne', rola: 'GOSC', organizacja: 'ZEWNETRZNY', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'NIEAKTYWNY', kolorProfilu: '#999999', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-pawel-kwiecinski', zwrot: 'Pan', tytulNaukowy: '', imie: 'Paweł', nazwisko: 'Kwieciński', pseudonim: 'Paweł', emaile: ['p.kwiecinski@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '731 111 391' }], login: 'p.kwiecinski', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-tomasz-czekaj', zwrot: 'Pan', tytulNaukowy: '', imie: 'Tomasz', nazwisko: 'Czekaj', pseudonim: 'Tomek', emaile: ['t.czekaj@szkolenia-semper.pl'], telefony: [], login: 't.czekaj', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-angelika-poznanska', zwrot: 'Pani', tytulNaukowy: '', imie: 'Angelika', nazwisko: 'Poznańska', pseudonim: 'Angie', emaile: ['a.poznanska@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '570 590 060' }], login: 'a.poznanska', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-agata-pelc', zwrot: 'Pani', tytulNaukowy: '', imie: 'Agata', nazwisko: 'Pelc', pseudonim: 'Agata', emaile: ['a.pelc@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '570 445 485' }], login: 'a.pelc', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-alicja-krysinska', zwrot: 'Pani', tytulNaukowy: '', imie: 'Alicja', nazwisko: 'Krysińska', pseudonim: 'Ala', emaile: ['a.krysinska@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '570 963 700' }], login: 'a.krysinska', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-paulina-kazmierczak', zwrot: 'Pani', tytulNaukowy: '', imie: 'Paulina', nazwisko: 'Kaźmierczak', pseudonim: 'Paulinka', emaile: ['p.kazmierczak@szkolenia-semper.pl'], telefony: [{ prefiks: '+48', numer: '790 666 908' }], login: 'p.kazmierczak', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-izabela-szoc', zwrot: 'Pani', tytulNaukowy: '', imie: 'Izabela', nazwisko: 'Szoć', pseudonim: 'Iza Sz', emaile: ['i.szoc@szkolenia-semper.pl'], telefony: [], login: 'i.szoc', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-ewelina-kostecka', zwrot: 'Pani', tytulNaukowy: '', imie: 'Ewelina', nazwisko: 'Kostecka', pseudonim: 'Ewelina', emaile: ['e.kostecka@szkolenia-semper.pl'], telefony: [], login: 'e.kostecka', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
  utworzUzytkownika({ id: 'pracownik-ewa-niziol', zwrot: 'Pani', tytulNaukowy: '', imie: 'Ewa', nazwisko: 'Nizioł', pseudonim: 'Ewa', emaile: ['e.niziol@szkolenia-semper.pl'], telefony: [], login: 'e.niziol', rola: 'PRACOWNIK', organizacja: 'IIST', odznaki: ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [] }),
]

export function utworzPustyFormularz(): FormularzUzytkownika {
  return { zwrot: '', tytulNaukowy: '', imie: '', nazwisko: '', pseudonim: '', emaile: [''], telefony: [normalizujTelefon({ prefiks: '+48', numer: '', krajIso2: 'PL' })], login: '', rola: 'PRACOWNIK', organizacja: 'SEMPER' as OrganizacjaUzytkownika, odznaki: [], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [], wymagaZmianyHasla: false }
}

export function mapujUzytkownikaNaFormularz(uzytkownik: Uzytkownik): FormularzUzytkownika {
  const formularz = { ...uzytkownik, emaile: [...uzytkownik.emaile], telefony: uzytkownik.telefony.map(normalizujTelefon), odznaki: [...uzytkownik.odznaki], aliasyHistoryczne: [...uzytkownik.aliasyHistoryczne] }
  Reflect.deleteProperty(formularz, 'id')
  Reflect.deleteProperty(formularz, 'ostatnieLogowanie')
  Reflect.deleteProperty(formularz, 'email')
  Reflect.deleteProperty(formularz, 'utworzono')
  Reflect.deleteProperty(formularz, 'zaktualizowano')
  Reflect.deleteProperty(formularz, 'wersjaUprawnien')
  return formularz as FormularzUzytkownika
}

export function przygotujDaneDoZapisu(formularz: FormularzUzytkownika): Omit<Uzytkownik, 'id' | 'email' | 'ostatnieLogowanie' | 'utworzono' | 'zaktualizowano' | 'wersjaUprawnien'> {
  return { ...formularz, imie: formularz.imie.trim(), nazwisko: formularz.nazwisko.trim(), pseudonim: formularz.pseudonim.trim(), emaile: formularz.emaile.map((email) => email.trim()), telefony: formularz.telefony.map(normalizujTelefon), login: formularz.login.trim(), aliasyHistoryczne: formularz.aliasyHistoryczne.map((alias) => alias.trim()).filter(Boolean) }
}

export function utworzIdUzytkownika(formularz: FormularzUzytkownika) {
  const rdzen = `${formularz.rola}-${formularz.imie}-${formularz.nazwisko}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${rdzen}-${Date.now()}`
}
