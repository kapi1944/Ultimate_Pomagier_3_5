import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'
import { utworzIdentyfikatorDokumentu } from '../src/wspolne/dokumenty/nazwyDokumentow.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import {
  czyMoznaFinalizowacCheckliste,
  czyPozycjaJestAktywna,
  formatujIloscPozycji,
  formatujTerminyZPrzerwami,
  obliczIloscAutomatyczna,
  pobierzEtykieteStatusuGotowosci,
  pobierzIloscPozycji,
  przeniesPozycjeWObrebieKategorii,
  zastosujWariantMaterialowOnline,
  utworzDomyslneDaneChecklisty,
  utworzNowaKategorieChecklisty,
  utworzNowaPozycjeChecklisty,
  type StatusGotowosciPozycji,
} from '../src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts'
import {
  dodajZalacznikChecklisty,
  odswiezStanZrodlaChecklisty,
  otworzPonownieCheckliste,
  pobierzChecklistePaczki,
  pobierzChecklistyPaczek,
  ustawStatusChecklisty,
  utworzChecklistePaczkiZeZrodla,
  zarejestrujWydrukChecklisty,
  zapiszChecklistePaczki,
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
  return {
    opiekunId: 'opiekun-1',
    finansowanie: 'Dofinansowanie',
    logotypy: [{ nazwa: 'logo-klienta.png', podglad: 'dane-logo-klienta' }],
    uwagiZeSzczegolow: [{ etykieta: 'Certyfikaty', tresc: 'Podpis dyrektora.' }],
    wzoryKlienta: { certyfikaty: 'Wzór NFZ' },
    odbiorca: { nazwaFirmy: 'Klient', imieNazwisko: 'Anna', ulica: 'Testowa', nrBudynku: '1', nrLokalu: '', kodPocztowy: '00-001', miasto: 'Warszawa', kraj: 'Polska', telefon: '', email: '', zrodloPropozycji: null },
  }
}

function pobierzPozycje(dane: ReturnType<typeof utworzDomyslneDaneChecklisty>, nazwa: string) {
  const pozycja = dane.pozycje.find((obecna) => obecna.nazwa === nazwa)
  assert.ok(pozycja, `Brak pozycji: ${nazwa}`)
  return pozycja
}

test('wspólna nazwa rozdziela numer dzienny od wersji', () => {
  const data = new Date('2027-01-27T12:00:00')
  assert.equal(utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', 3, 1, data), '2027-01-27_Checklista-paczki_03v01')
  assert.equal(utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', 3, 2, data), '2027-01-27_Checklista-paczki_03v02')
})

test('nowa Checklista ma kategorie i pozycje zgodne z papierowym wzorem', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  assert.deepEqual(dane.kategorie.map((kategoria) => kategoria.nazwa), ['Materiały', 'Teczki', 'Pakiet CRM', 'Gadżety', 'Inne'])
  for (const nazwa of ['Prezentacje', 'Podręczniki / materiały szkoleniowe', 'Materiały dodatkowe', 'Pre/Post-testy', 'Teczki', 'Lista obecności', 'Ankiety', 'Certyfikaty / Dyplomy', 'Karta na drzwi', 'Długopisy', 'Torby']) assert.ok(dane.pozycje.some((pozycja) => pozycja.nazwa === nazwa), `Brak domyślnej pozycji: ${nazwa}`)
  assert.match(pobierzPozycje(dane, 'Teczki').uwagiDrukowane, /Program szkolenia/)
})

test('reguły ilości pokazują wynik biznesowy oraz zachowują ręczne nadpisanie', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  const dlugopisy = pobierzPozycje(dane, 'Długopisy')
  assert.equal(pobierzIloscPozycji(dlugopisy, 16, 1).koncowa, 16)
  dlugopisy.dodatkoweEgzemplarze = [{ wartosc: 4, opis: 'zapasowe' }]
  assert.equal(obliczIloscAutomatyczna(dlugopisy, 16, 1), 20)
  assert.equal(formatujIloscPozycji(dlugopisy, 16, 1), '16 + 4 zapasowe')
  dlugopisy.nadpisanieReczne = 25
  assert.deepEqual(pobierzIloscPozycji(dlugopisy, 18, 1), { automatyczna: 22, koncowa: 25, czyNadpisanaRecznie: true })
  assert.equal(formatujIloscPozycji(dlugopisy, 18, 1), '25')
  dlugopisy.nadpisanieReczne = null
  assert.equal(pobierzIloscPozycji(dlugopisy, 18, 1).koncowa, 22)
  assert.equal(pobierzPozycje(dane, 'Lista obecności').regulaIlosci.wartoscStala, 1)
  assert.equal(pobierzPozycje(dane, 'Karta na drzwi').regulaIlosci.wartoscStala, 2)
})

test('certyfikaty i Pre/Post zachowują opis dodatkowych egzemplarzy zamiast surowej sumy', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  const certyfikaty = pobierzPozycje(dane, 'Certyfikaty / Dyplomy')
  certyfikaty.dodatkoweEgzemplarze = [{ wartosc: 5, opis: 'pustych' }]
  assert.equal(formatujIloscPozycji(certyfikaty, 16, 1), '16 + 5 pustych')
  const testy = pobierzPozycje(dane, 'Pre/Post-testy')
  testy.trybPrePost = 'PRE_I_POST'
  assert.equal(formatujIloscPozycji(testy, 16, 1), '2x 16')
  testy.trybPrePost = 'PRE'
  assert.equal(formatujIloscPozycji(testy, 16, 1), '16')
})

test('nie dotyczy i online nie blokują gotowości, a wariant online pozostawia dokumenty do druku', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  dane.daneOdbiorcy = daneZrodla().odbiorca
  dane.pozycje.forEach((pozycja) => { pozycja.czyOpcjonalna = true })
  const materialyDodatkowe = pobierzPozycje(dane, 'Materiały dodatkowe')
  materialyDodatkowe.czyOpcjonalna = false
  materialyDodatkowe.czyNieDotyczy = true
  assert.equal(czyPozycjaJestAktywna(materialyDodatkowe), false)
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, true)
  materialyDodatkowe.czyNieDotyczy = false
  materialyDodatkowe.czyOnline = true
  assert.equal(formatujIloscPozycji(materialyDodatkowe, 16, 1), 'Online')
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, true)
  const wariant = zastosujWariantMaterialowOnline(dane)
  assert.equal(pobierzPozycje(wariant, 'Podręczniki / materiały szkoleniowe').czyOnline, true)
  assert.equal(pobierzPozycje(wariant, 'Materiały dodatkowe').czyOnline, true)
  assert.equal(pobierzPozycje(wariant, 'Lista obecności').czyOnline, false)
  assert.equal(pobierzPozycje(wariant, 'Ankiety').czyOnline, false)
  assert.equal(pobierzPozycje(wariant, 'Certyfikaty / Dyplomy').czyOnline, false)
})

test('statusy gotowości mają tekstowe etykiety i można przejść przez pełny cykl', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  const pozycja = pobierzPozycje(dane, 'Torby')
  const statusy: StatusGotowosciPozycji[] = ['NIEGOTOWE', 'W_TOKU_LUB_PROBLEM', 'CZESCIOWO_GOTOWE', 'GOTOWE']
  assert.deepEqual(statusy.map(pobierzEtykieteStatusuGotowosci), ['Niegotowe', 'W toku / problem', 'Częściowo gotowe', 'Gotowe'])
  statusy.forEach((status) => { pozycja.statusGotowosci = status; assert.equal(pozycja.statusGotowosci, status) })
})

test('użytkownik może dodać kategorię i pozycję oraz zmienić kolejność', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  const kategoria = utworzNowaKategorieChecklisty(dane.kategorie, 'Materiały klienta')
  assert.ok(kategoria)
  const pozycja = utworzNowaPozycjeChecklisty(kategoria.id, 'Plakat', dane.pozycje)
  assert.ok(pozycja)
  const gadzety = dane.kategorie.find((obecna) => obecna.nazwa === 'Gadżety')!
  const dlugopisy = pobierzPozycje(dane, 'Długopisy')
  const torby = pobierzPozycje(dane, 'Torby')
  const poPrzeniesieniu = przeniesPozycjeWObrebieKategorii(dane, torby.id, -1)
  assert.equal(poPrzeniesieniu.pozycje.find((obecna) => obecna.id === torby.id)?.kolejnosc, 0)
  assert.equal(poPrzeniesieniu.pozycje.find((obecna) => obecna.id === dlugopisy.id)?.kolejnosc, 1)
  assert.equal(pozycja.kategoriaId, kategoria.id)
  assert.equal(gadzety.nazwa, 'Gadżety')
})

test('format terminów nie maskuje przerw', () => {
  assert.equal(formatujTerminyZPrzerwami(['2027-06-18', '2027-06-19', '2027-06-22']), '18–19.06.2027, 22.06.2027')
})

test('wybrana grupa tworzy checklistę z migawką danych szkolenia i wzorem klienta', () => {
  magazyn.clear()
  const pierwsza = utworzChecklistePaczkiZeZrodla(utworzKontekst(), 'grupa-1', daneZrodla(), 'autor-1')!
  const druga = utworzChecklistePaczkiZeZrodla(utworzKontekst(), 'grupa-1', daneZrodla(), 'autor-1')!
  assert.equal(pierwsza.daneDokumentu.grupaId, 'grupa-1')
  assert.equal(pierwsza.daneDokumentu.migawkaZrodla?.nazwaGrupy, 'Grupa 1')
  assert.equal(pierwsza.daneDokumentu.migawkaZrodla?.liczbaUczestnikow, 16)
  assert.equal(pierwsza.daneDokumentu.migawkaZrodla?.miejsce, 'Sala A')
  assert.equal(pierwsza.daneDokumentu.migawkaZrodla?.terminy.join(','), '2027-06-18,2027-06-19,2027-06-22')
  assert.equal(pierwsza.daneDokumentu.pozycje.find((pozycja) => pozycja.nazwa === 'Certyfikaty / Dyplomy')?.wzorKlienta, 'Wzór NFZ')
  assert.equal(pierwsza.daneDokumentu.migawkaZrodla?.uwagiZeSzczegolow[0]?.tresc, 'Podpis dyrektora.')
  assert.notEqual(pierwsza.id, druga.id)
  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => dokument.typ === 'CHECKLISTA_PACZKI').length, 2)
})

test('zapis kopii roboczej pozostaje widoczny w globalnym rejestrze', () => {
  magazyn.clear()
  const utworzona = utworzChecklistePaczkiZeZrodla(utworzKontekst(), 'grupa-1', daneZrodla(), 'autor-1')!
  const zapisana = zapiszChecklistePaczki(utworzona.id, { ...utworzona.daneDokumentu, statusChecklisty: 'KOPIA_ROBOCZA', waga: '12 kg' }, 'autor-1', 'Zapisano kopię roboczą.')!
  assert.equal(zapisana.status, 'ROBOCZY')
  assert.equal(pobierzChecklistePaczki(utworzona.id)?.daneDokumentu.waga, '12 kg')
  assert.ok(pobierzChecklistyPaczek().some((dokument) => dokument.id === utworzona.id && dokument.daneDokumentu.statusChecklisty === 'KOPIA_ROBOCZA'))
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

test('waga i wysokość nie blokują finalizacji', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  dane.pozycje.forEach((pozycja) => { pozycja.czyOpcjonalna = true })
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyBrakujeDanychWysylkowych, true)
  dane.daneOdbiorcy = daneZrodla().odbiorca
  dane.waga = ''
  dane.wysokosc = ''
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, true)
})

test('widok wymaga grupy, przekierowuje do edycji i drukuje tylko dane przeznaczone do druku', () => {
  const widok = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx', import.meta.url), 'utf8')
  assert.match(widok, /Krok 2\. Grupa szkoleniowa/)
  assert.match(widok, /disabled=\{!wybraneSzczegoly \|\| !wybranaGrupa\}/)
  assert.match(widok, /otworzCheckliste\(wynik\.id\)/)
  const poczatekDruku = widok.indexOf('function DrukChecklisty')
  const koniecDruku = widok.indexOf('export default function WidokChecklistPaczek')
  const druk = widok.slice(poczatekDruku, koniecDruku)
  assert.match(druk, /id="wydruk-checklisty"/)
  assert.match(druk, /Podpis Opiekuna/)
  assert.match(druk, /Array\.from\(\{ length: 2 \}/)
  assert.match(druk, /uwagiDrukowane/)
  assert.doesNotMatch(druk, /notatkiWewnetrzne/)
})
