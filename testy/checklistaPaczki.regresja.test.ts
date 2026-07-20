import assert from 'node:assert/strict'
import test from 'node:test'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'
import { utworzIdentyfikatorDokumentu } from '../src/wspolne/dokumenty/nazwyDokumentow.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import {
  czyMoznaFinalizowacCheckliste,
  formatujIloscPozycji,
  formatujTerminyZPrzerwami,
  obliczIloscAutomatyczna,
  utworzDomyslneDaneChecklisty,
} from '../src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts'
import {
  dodajZalacznikChecklisty,
  odswiezStanZrodlaChecklisty,
  otworzPonownieCheckliste,
  ustawStatusChecklisty,
  utworzChecklistePaczkiZeZrodla,
  zarejestrujWydrukChecklisty,
} from '../src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc), removeItem: (klucz: string) => magazyn.delete(klucz), clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage

function utworzKontekst(): KontekstDokumentuSzkolenia {
  return {
    zrodlo: { szczegolyOrganizacyjneId: 'szczegoly-1', wersjaSzczegolowId: 'wersja-1', zmodyfikowano: '2026-07-20T10:00:00.000Z', odciskDanych: 'odcisk-1' },
    szkolenie: { id: 'szkolenie-1', tytul: 'Bezpieczna praca', typ: null, tryb: 'Stacjonarne', liczbaGodzin: 8 },
    organizator: { id: null, nazwa: 'Semper', marka: 'Semper', logoId: null, logoNazwaPliku: 'logo.png', logoPodglad: 'dane-logo' },
    klient: { id: 'klient-1', nazwa: 'Klient', nip: null, adres: null, osobaKontaktowa: null },
    trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Trener' }],
    grupy: [{ id: 'grupa-1', nazwa: 'Grupa 1', daty: ['2027-06-18', '2027-06-19', '2027-06-22'], tryb: 'Stacjonarne', liczbaGodzin: 8, lokalizacje: [{ data: '2027-06-18', lokalizacjaId: null, nazwa: 'Sala A', adres: null, sala: null, trybOnline: false }], trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Trener' }], uczestnicy: Array.from({ length: 16 }, (_, indeks) => ({ id: `uczestnik-${indeks}`, imie: 'U', nazwisko: String(indeks), nazwaPelna: `U ${indeks}`, email: null, stanowisko: null })), liczbaUczestnikow: 16, wysylkaMaterialow: { wymagana: true, odbiorca: 'Anna', adres: 'Warszawa', uwagi: null } }],
    uwagi: null,
  }
}

function daneZrodla() {
  return { opiekunId: 'opiekun-1', finansowanie: 'Dofinansowanie', odbiorca: { nazwaFirmy: 'Klient', imieNazwisko: 'Anna', ulica: 'Testowa', nrBudynku: '1', nrLokalu: '', kodPocztowy: '00-001', miasto: 'Warszawa', kraj: 'Polska', telefon: '', email: '', zrodloPropozycji: null } }
}

test('wspólna nazwa rozdziela numer dzienny od wersji', () => {
  const data = new Date('2027-01-27T12:00:00')
  assert.equal(utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', 3, 1, data), '2027-01-27_Checklista-paczki_03v01')
  assert.equal(utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', 3, 2, data), '2027-01-27_Checklista-paczki_03v02')
})

test('reguły ilości zachowują dodatek, nadpisanie i zapis Pre/Post', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  const dlugopisy = dane.pozycje.find((pozycja) => pozycja.nazwa === 'Długopisy')!
  dlugopisy.dodatkoweEgzemplarze = [{ wartosc: 4, opis: 'zapasowe' }]
  assert.equal(obliczIloscAutomatyczna(dlugopisy, 16, 1), 20)
  assert.equal(obliczIloscAutomatyczna(dlugopisy, 18, 1), 22)
  dlugopisy.nadpisanieReczne = 25
  assert.equal(formatujIloscPozycji(dlugopisy, 18, 1), '25')
  dlugopisy.nadpisanieReczne = null
  const testy = dane.pozycje.find((pozycja) => pozycja.nazwa === 'Pre-test + Post-test')!
  assert.equal(formatujIloscPozycji(testy, 16, 1), '2x 16')
  assert.equal(dane.pozycje.find((pozycja) => pozycja.nazwa === 'Lista obecności')?.regulaIlosci.wartoscStala, 1)
  assert.equal(dane.pozycje.find((pozycja) => pozycja.nazwa === 'Karta na drzwi')?.regulaIlosci.wartoscStala, 2)
})

test('format terminów nie maskuje przerw', () => {
  assert.equal(formatujTerminyZPrzerwami(['2027-06-18', '2027-06-19', '2027-06-22']), '18.06.2027-19.06.2027, 22.06.2027')
})

test('jedna grupa może mieć wiele checklist i każda trafia do wspólnego rejestru', () => {
  magazyn.clear()
  const kontekst = utworzKontekst()
  const pierwsza = utworzChecklistePaczkiZeZrodla(kontekst, 'grupa-1', daneZrodla(), 'autor-1')!
  const druga = utworzChecklistePaczkiZeZrodla(kontekst, 'grupa-1', daneZrodla(), 'autor-1')!
  assert.equal(pierwsza.daneDokumentu.grupaId, 'grupa-1')
  assert.notEqual(pierwsza.id, druga.id)
  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => dokument.typ === 'CHECKLISTA_PACZKI').length, 2)
})

test('skan ustawia kompletność, archiwum blokuje, a Administrator może otworzyć ponownie', () => {
  magazyn.clear()
  const dokument = utworzChecklistePaczkiZeZrodla(utworzKontekst(), 'grupa-1', daneZrodla(), 'autor-1')!
  const poSkanie = dodajZalacznikChecklisty(dokument.id, { nazwa: 'skan.pdf', typ: 'SKAN_PODPISANEJ_CHECKLISTY', dane: 'dane', typMime: 'application/pdf', autorId: 'autor-1', wersjaWydruku: null }, 'autor-1')!
  assert.equal(poSkanie.daneDokumentu.statusChecklisty, 'KOMPLETNA')
  ustawStatusChecklisty(dokument.id, 'ZARCHIWIZOWANA', 'admin', 'Archiwizacja')
  assert.equal(otworzPonownieCheckliste(dokument.id, 'OPIEKUN', 'opiekun'), null)
  assert.equal(otworzPonownieCheckliste(dokument.id, 'ADMINISTRATOR', 'admin')?.daneDokumentu.statusChecklisty, 'KOPIA_ROBOCZA')
})

test('wydruk nie tworzy nowej wersji przy niezmienionej treści, a zmiana źródła jest tylko oznaczona', () => {
  magazyn.clear()
  const dokument = utworzChecklistePaczkiZeZrodla(utworzKontekst(), 'grupa-1', daneZrodla(), 'autor-1')!
  const pierwszy = zarejestrujWydrukChecklisty(dokument.id, 'autor-1')!
  const drugi = zarejestrujWydrukChecklisty(dokument.id, 'autor-1')!
  assert.equal(pierwszy.daneDokumentu.wersjeWydruku.length, 1)
  assert.equal(drugi.daneDokumentu.wersjeWydruku.length, 1)
  assert.equal(odswiezStanZrodlaChecklisty(dokument.id, 'odcisk-2')?.daneDokumentu.czyDaneZrodloweNowsze, true)
})

test('dane wysyłkowe blokują finalizację, a waga i wysokość nie', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  dane.pozycje.forEach((pozycja) => { pozycja.czyOpcjonalna = true })
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyBrakujeDanychWysylkowych, true)
  dane.daneOdbiorcy = daneZrodla().odbiorca
  dane.waga = ''
  dane.wysokosc = ''
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, true)
})
