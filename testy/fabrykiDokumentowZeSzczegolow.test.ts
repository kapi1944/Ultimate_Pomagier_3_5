import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { poczatkowaGrupa, poczatkoweDaneFormularza, poczatkowiAdresaci } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import type { DaneFormularza, WersjaRoboczaGeneratora } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'
import { deserializujDaneAnkiety } from '../src/moduly/dokumenty/generatory/ankiety/modelAnkiety.ts'
import { pobierzChecklistePaczki } from '../src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts'
import { deserializujDaneKartyNaDrzwi } from '../src/moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi.ts'
import { pobierzListeObecnosciPoId } from '../src/moduly/dokumenty/generatory/listy_obecnosci/rejestrListObecnosci.ts'
import { pobierzProgramPoId } from '../src/moduly/dokumenty/generatory/programy_szkolen/rejestrProgramowSzkolen.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import {
  pobierzDokumentyPowiazaneZeSzczegolami,
  pobierzStanDokumentuZeSzczegolow,
  rodzajeDokumentowDodatkowych,
  rodzajePakietuPodstawowego,
  utworzPakietDokumentow,
} from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

function klonuj<TDane>(dane: TDane): TDane {
  return JSON.parse(JSON.stringify(dane)) as TDane
}

function utworzWersje(czyZGrupa = true): WersjaRoboczaGeneratora {
  const dane = klonuj(poczatkoweDaneFormularza) as DaneFormularza
  dane.tytulSzkolenia = 'Bezpieczna praca'
  dane.nazwaKlienta = 'Klient Testowy'
  dane.nabywca.nazwa = 'Klient Testowy'
  dane.opiekunId = 'opiekun-1'
  dane.programSzkolenia = 'Dzień 1\nModuł 1. Wprowadzenie\n- Zasady bezpieczeństwa'
  dane.wysylkaPaczkiDotyczy = true
  dane.odbiorcaPaczki = { ...dane.odbiorcaPaczki, imieNazwisko: 'Anna Odbiorca', ulica: 'Polna', nrBudynku: '1', kodPocztowy: '00-001', miasto: 'Warszawa' }
  const grupa = {
    ...klonuj(poczatkowaGrupa),
    id: 'grupa-a',
    nazwa: 'Grupa A',
    dataOd: '2026-09-15',
    dataDo: '2026-09-16',
    liczbaUczestnikow: 2,
    liczbaGodzin: 16,
    miejsce: 'Sala 7, Warszawa',
    trenerzy: [{ id: 'trener-1', imieNazwisko: 'Jan Trener', telefon: '', email: '' }],
    uczestnicy: [
      { id: 'uczestnik-1', imie: 'Anna', nazwisko: 'Nowak', email: 'anna@example.com' },
      { id: 'uczestnik-2', imie: 'Piotr', nazwisko: 'Lis', email: 'piotr@example.com' },
    ],
  }

  return {
    id: 'szczegoly-1',
    dokumentId: 'szczegoly-1',
    wersja: 'test',
    etykietaWersji: 'v1',
    nazwa: 'Szczegóły testowe',
    dataZapisu: '2026-09-10T10:00:00.000Z',
    autorId: 'uzytkownik-1',
    autorNazwa: 'Użytkownik Testowy',
    dane,
    grupy: czyZGrupa ? [grupa] : [],
    adresaci: klonuj(poczatkowiAdresaci),
    statusyPol: {},
  }
}

test('centralny koordynator tworzy sześć prawdziwych dokumentów powiązanych i pozwala je odczytać', () => {
  magazyn.clear()
  const wersja = utworzWersje()
  const wyniki = utworzPakietDokumentow(wersja, ['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista'], wersja.autorId)
  const dokumenty = wyniki.map((wynik) => wynik.dokument).filter((dokument) => dokument !== null)

  assert.equal(wyniki.length, 6)
  assert.ok(wyniki.every((wynik) => wynik.status === 'utworzono'))
  assert.deepEqual(new Set(dokumenty.map((dokument) => dokument.typ)), new Set(['PROGRAM_SZKOLENIA', 'LISTA_OBECNOSCI', 'ANKIETA', 'CERTYFIKAT', 'KARTA_NA_DRZWI', 'CHECKLISTA_PACZKI']))
  assert.ok(dokumenty.every((dokument) => dokument.powiazania.szczegolyOrganizacyjneId === wersja.id))
  assert.equal(wyniki.find((wynik) => wynik.rodzaj === 'program')?.grupaId, null)
  assert.equal(wyniki.find((wynik) => wynik.rodzaj === 'karty')?.grupaId, null)
  assert.ok(wyniki.filter((wynik) => ['lista', 'ankieta', 'dyplomy', 'checklista'].includes(wynik.rodzaj)).every((wynik) => wynik.grupaId === 'grupa-a'))

  const program = wyniki.find((wynik) => wynik.rodzaj === 'program')?.dokument
  const lista = wyniki.find((wynik) => wynik.rodzaj === 'lista')?.dokument
  const ankieta = wyniki.find((wynik) => wynik.rodzaj === 'ankieta')?.dokument
  const dyplomy = wyniki.find((wynik) => wynik.rodzaj === 'dyplomy')?.dokument
  const karty = wyniki.find((wynik) => wynik.rodzaj === 'karty')?.dokument
  const checklista = wyniki.find((wynik) => wynik.rodzaj === 'checklista')?.dokument
  assert.ok(program && pobierzProgramPoId(program.id))
  assert.ok(lista && pobierzListeObecnosciPoId(lista.id))
  const daneAnkiety = deserializujDaneAnkiety((ankieta?.daneDokumentu as { tekst?: string })?.tekst ?? null)
  assert.equal(daneAnkiety.grupaId, 'grupa-a')
  assert.match(daneAnkiety.wariantSzablonu, /^ORYGINALNA_/)
  assert.match((dyplomy?.daneDokumentu as { uczestnicyTekst?: string })?.uczestnicyTekst ?? '', /Anna Nowak/)
  assert.equal(deserializujDaneKartyNaDrzwi((karty?.daneDokumentu as { tekst?: string })?.tekst ?? null).karty.length, 2)
  assert.ok(checklista && pobierzChecklistePaczki(checklista.id))
  assert.equal(pobierzDokumentyPowiazaneZeSzczegolami(wersja.id).length, 6)
})

test('koordynator chroni pakiety i dokumenty grupowe przed duplikatami', () => {
  magazyn.clear()
  const wersja = utworzWersje()
  utworzPakietDokumentow(wersja, ['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista'], wersja.autorId)
  const powtorzenie = utworzPakietDokumentow(wersja, ['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista'], wersja.autorId)

  assert.ok(powtorzenie.every((wynik) => wynik.status === 'istnieje'))
  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().length, 6)
})

test('pakiet podstawowy, dodatkowy i wszystkie dokumenty mają właściwy zakres', () => {
  magazyn.clear()
  const wersja = utworzWersje()
  const podstawowy = utworzPakietDokumentow(wersja, rodzajePakietuPodstawowego, wersja.autorId)
  const dodatkowy = utworzPakietDokumentow(wersja, rodzajeDokumentowDodatkowych, wersja.autorId)
  const wszystkie = utworzPakietDokumentow(wersja, [...rodzajePakietuPodstawowego, ...rodzajeDokumentowDodatkowych], wersja.autorId)

  assert.deepEqual(podstawowy.map((wynik) => wynik.rodzaj), ['program', 'lista', 'ankieta', 'dyplomy'])
  assert.deepEqual(dodatkowy.map((wynik) => wynik.rodzaj), ['karty', 'checklista'])
  assert.ok(wszystkie.every((wynik) => wynik.status === 'istnieje'))
})

test('brak grupy nie blokuje utworzenia programu i daje trwałe wyniki pominięcia', () => {
  magazyn.clear()
  const wersja = utworzWersje(false)
  const wyniki = utworzPakietDokumentow(wersja, ['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista'], wersja.autorId)

  assert.equal(wyniki.find((wynik) => wynik.rodzaj === 'program')?.status, 'utworzono')
  assert.ok(wyniki.filter((wynik) => wynik.rodzaj !== 'program').every((wynik) => wynik.status === 'pomieto'))
  assert.ok(wyniki.filter((wynik) => wynik.status === 'pomieto').every((wynik) => wynik.komunikat.includes('Brak grupy')))
})

test('błąd jednego dokumentu nie blokuje dalszych pozycji pakietu', () => {
  magazyn.clear()
  const zwyklyMagazyn = globalThis.localStorage
  let czyZablokowanoAnkiete = false
  globalThis.localStorage = {
    ...zwyklyMagazyn,
    getItem: (klucz: string) => magazyn.get(klucz) ?? null,
    setItem: (klucz: string, wartosc: string) => {
      if (!czyZablokowanoAnkiete && klucz.includes('rejestrDokumentow') && wartosc.includes('"typ":"ANKIETA"')) {
        czyZablokowanoAnkiete = true
        throw new Error('Kontrolowany błąd Ankiety')
      }
      magazyn.set(klucz, wartosc)
    },
    removeItem: (klucz: string) => magazyn.delete(klucz),
    clear: () => magazyn.clear(),
    key: () => null,
    length: 0,
  } as Storage

  try {
    const wersja = utworzWersje()
    const wyniki = utworzPakietDokumentow(wersja, rodzajePakietuPodstawowego, wersja.autorId)
    assert.equal(wyniki.find((wynik) => wynik.rodzaj === 'ankieta')?.status, 'blad')
    assert.equal(wyniki.find((wynik) => wynik.rodzaj === 'dyplomy')?.status, 'utworzono')
    assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().length, 3)
  } finally {
    globalThis.localStorage = zwyklyMagazyn
  }
})

test('stan wymaga aktualizacji wynika z odcisku danych źródłowych, a UI nie używa reloadu', () => {
  magazyn.clear()
  const wersja = utworzWersje()
  utworzPakietDokumentow(wersja, ['program'], wersja.autorId)
  assert.equal(pobierzStanDokumentuZeSzczegolow(wersja, 'program', null).stan, 'istnieje')

  const zmieniona = { ...wersja, dane: { ...wersja.dane, tytulSzkolenia: 'Zmieniony tytuł' } }
  assert.equal(pobierzStanDokumentuZeSzczegolow(zmieniona, 'program', null).stan, 'wymaga_aktualizacji')

  const panel = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelPrzygotowaniaDokumentow.tsx', import.meta.url), 'utf8')
  assert.match(panel, /aria-live="polite"/)
  assert.doesNotMatch(panel, /window\.location\.reload/)
})

test('widok udostępnia pojedyncze dokumenty, pakiety, pełne powiązania i istniejący routing', () => {
  const przygotowanie = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelPrzygotowaniaDokumentow.tsx', import.meta.url), 'utf8')
  const powiazane = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelDokumentowPowiazanych.tsx', import.meta.url), 'utf8')
  const widok = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych.tsx', import.meta.url), 'utf8')
  const style = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/widokNowychSzczegolowOrganizacyjnych.css', import.meta.url), 'utf8')
  const uklad = readFileSync(new URL('../src/aplikacja/layout/UkladAplikacji.tsx', import.meta.url), 'utf8')

  assert.match(przygotowanie, /\['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista'\]/)
  assert.match(przygotowanie, /Utwórz pakiet podstawowy/)
  assert.match(przygotowanie, /Utwórz dokumenty dodatkowe/)
  assert.match(przygotowanie, /Utwórz wszystkie dokumenty/)
  assert.match(przygotowanie, /Najpierw zapisz Szczegóły organizacyjne\./)
  assert.match(powiazane, /pobierzDokumentyPowiazaneZeSzczegolami/)
  assert.match(powiazane, /otworzDokument\(dokument\)/)
  assert.doesNotMatch(powiazane, />\{dokument\.id\}</)
  assert.match(widok, /PanelPrzygotowaniaDokumentow/)
  assert.match(uklad, /<WidokNowychSzczegolowOrganizacyjnych[^>]+otworzDokument=\{otworzDokument\}/)
  assert.match(style, /\.szczegoly-dokumenty-siatka\s*\{[^}]*grid-template-columns:\s*1fr/s)
  assert.match(style, /\.szczegoly-sekcja-dokumentow button:focus-visible/)
})
