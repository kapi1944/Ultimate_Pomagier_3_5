import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'
import { przygotujZrodloZWersjiRoboczej, zbudujKontekstZeSzczegolow } from '../src/wspolne/integracje/szczegolyDoDokumentow/zbudujKontekstZeSzczegolow.ts'
import { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { parsujMailaSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts'
import { zapiszWersjeRobocza, opublikujWersjeRobocza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts'
import type { WersjaRoboczaGeneratora } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'
import { zastosujDyspozycjeMaterialoweChecklisty, potwierdzIloscDyspozycji } from '../src/moduly/dokumenty/generatory/checklisty_paczek/dyspozycjeChecklistyPaczki.ts'
import { zbudujNazweEksportowanegoDokumentu, utworzIdentyfikatorDokumentu } from '../src/wspolne/dokumenty/nazwyDokumentow.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import {
  czyMoznaEksportowacCheckliste,
  pobierzDaneSzkoleniaChecklisty,
  czyMoznaFinalizowacCheckliste,
  pobierzPostepKompletowaniaPaczki,
  pobierzStanKompletowaniaPozycji,
  zmienIloscPrzygotowanaPozycji,
  ustawPotwierdzenieKompletuPozycji,
  ustawStatusOperacyjnyPaczki,
  duplikujPaczkeChecklisty,
  czyPozycjaJestAktywna,
  formatujDateDoWydruku,
  formatujIloscPozycji,
  formatujTerminyZPrzerwami,
  obliczIloscAutomatyczna,
  pobierzEtykieteStatusuGotowosci,
  pobierzIloscPozycji,
  przeniesPozycjeWObrebieKategorii,
  zastosujWariantMaterialowOnline,
  utworzDomyslneDaneChecklisty,
  utworzNowaPaczkeChecklisty,
  utworzSzablonChecklistyPaczki,
  zastosujSzablonChecklistyPaczki,
  normalizujDaneChecklisty,
  utworzNowaKategorieChecklisty,
  utworzNowaPozycjeChecklisty,
  type StatusGotowosciPozycji,
} from '../src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts'
import {
  utworzRecznaChecklistePaczki,
  powiazChecklisteZeSzkoleniem,
  odlaczChecklisteOdSzkolenia,
  dodajZalacznikChecklisty,
  odswiezStanZrodlaChecklisty,
  otworzPonownieCheckliste,
  pobierzChecklistePaczki,
  pobierzChecklistyPaczek,
  ustawStatusChecklisty,
  utworzChecklistePaczkiZeZrodla,
  zarejestrujWydrukChecklisty,
  zapiszChecklistePaczki,
  aktualizujDyspozycjeChecklisty,
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
  assert.equal(pobierzPozycje(dane, 'Teczki').uwagiDrukowane, '')
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

test('ilość przygotowana wykrywa brak i pozostawia ręczną korektę', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  dane.daneOdbiorcy = daneZrodla().odbiorca
  dane.pozycje.forEach((pozycja) => { pozycja.czyOpcjonalna = true })
  const dlugopisy = pobierzPozycje(dane, 'Długopisy')
  dlugopisy.czyOpcjonalna = false
  dlugopisy.nadpisanieReczne = 16
  dlugopisy.statusGotowosci = 'GOTOWE'
  dlugopisy.iloscPrzygotowana = 15
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, false)
  assert.ok(czyMoznaFinalizowacCheckliste(dane).brakujacePozycje.some((pozycja) => pozycja.nazwa === 'Długopisy'))
  dlugopisy.iloscPrzygotowana = 16
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, true)
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

test('data wysłania ma na wydruku format zgodny ze wzorcem SEMPER', () => {
  assert.equal(formatujDateDoWydruku('2026-08-27'), '27.08.2026')
  assert.equal(formatujDateDoWydruku(''), '')
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

test('starsza checklista normalizuje się do jednej paczki z przypisanymi pozycjami', () => {
  const starsza = utworzDomyslneDaneChecklisty({ identyfikator: 'stara', numerDzienny: 1 })
  const bezPaczek = { ...starsza } as { paczki?: unknown }
  delete bezPaczek.paczki
  const znormalizowana = normalizujDaneChecklisty(bezPaczek as never)
  assert.equal(znormalizowana.paczki.length, 1)
  assert.ok(znormalizowana.pozycje.every((pozycja) => pozycja.paczkaId === znormalizowana.paczki[0].id))
})

test('paczka jest duplikowana z nowymi identyfikatorami i bez stanu operacyjnego', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  const druga = utworzNowaPaczkeChecklisty(dane.paczki, 'Druga')
  const zDruga = { ...dane, paczki: [...dane.paczki, druga] }
  const poDuplikacji = duplikujPaczkeChecklisty(zDruga, dane.paczki[0].id)
  assert.equal(poDuplikacji.paczki.length, 3)
  const kopia = poDuplikacji.paczki.at(-1)!
  const pozycjeKopii = poDuplikacji.pozycje.filter((pozycja) => pozycja.paczkaId === kopia.id)
  assert.equal(new Set(pozycjeKopii.map((pozycja) => pozycja.id)).size, pozycjeKopii.length)
  assert.ok(pozycjeKopii.every((pozycja) => pozycja.statusGotowosci === 'NIEGOTOWE' && pozycja.iloscPrzygotowana === null))
})

test('szablon nie przenosi stanów operacyjnych', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  dane.pozycje[0].statusGotowosci = 'GOTOWE'
  dane.pozycje[0].iloscPrzygotowana = 3
  const szablon = utworzSzablonChecklistyPaczki(dane, 'Wysyłka standardowa')!
  const odtworzona = zastosujSzablonChecklistyPaczki(dane, szablon)
  assert.ok(odtworzona.pozycje.every((pozycja) => pozycja.statusGotowosci === 'NIEGOTOWE' && pozycja.iloscPrzygotowana === null))
})

test.skip('historyczny kontrakt poprzedniego widoku checklisty', () => {
  const widok = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx', import.meta.url), 'utf8')
  assert.match(widok, /Krok 2\. Grupa szkoleniowa/)
  assert.match(widok, /disabled=\{!wybraneSzczegoly \|\| !wybranaGrupa\}/)
  assert.match(widok, /otworzCheckliste\(wynik\.id\)/)
  const poczatekDruku = widok.indexOf('function DrukChecklisty')
  const koniecDruku = widok.indexOf('export default function WidokChecklistPaczek')
  const druk = widok.slice(poczatekDruku, koniecDruku)
  assert.match(druk, /id=\{id\}/)
  assert.match(widok, /<DrukChecklisty[^>]+id="wydruk-checklisty"/)
  assert.match(druk, /Podpis opiekuna/)
  assert.match(druk, /checklista-paczki__wydruk-sklad-teczki/)
  assert.match(druk, /Program szkolenia/)
  assert.match(druk, /Notatnik/)
  assert.match(druk, /Wizytówka/)
  assert.match(druk, /SZKOLENIE ZAMKNIĘTE - CHECKLISTA/)
  assert.match(druk, /checklista-paczki__wydruk-tabela-materialow/)
  assert.match(druk, /rowSpan=\{wiersze\.length\}/)
  assert.match(druk, /Waga paczki:/)
  assert.match(druk, /Wysokość paczki:/)
  assert.match(druk, /formatujDateDoWydruku\(dane\.dataWyslania\)/)
  assert.match(druk, /checklista-paczki__wydruk-tabela-wysylki/)
  for (const klasaKoloru of ['materialy', 'teczki', 'pakiet-crm', 'gadzety', 'inne']) assert.match(widok, new RegExp(`checklista-paczki__wydruk-tabela--${klasaKoloru}`))
  assert.match(druk, /kategoria\.nazwa === 'Inne' \? 2 : 1/)
  assert.match(druk, /uwagiDrukowane/)
  assert.doesNotMatch(druk, /notatkiWewnetrzne/)
})

test.skip('historyczny kontrakt poprzedniego formularza checklisty', () => {
  const widok = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx', import.meta.url), 'utf8')
  const style = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/widokChecklistPaczek.css', import.meta.url), 'utf8')
  const poczatekDruku = widok.indexOf('function DrukChecklisty')
  const koniecDruku = widok.indexOf('export default function WidokChecklistPaczek')
  const druk = widok.slice(poczatekDruku, koniecDruku)

  assert.match(widok, /useState<Set<string>>\(\(\) => new Set\(\)\)/)
  assert.match(widok, /zwinieteKategorieIds\.has\(kategoria\.id\)/)
  assert.match(widok, /przelaczKategorie\(kategoria\.id\)/)
  assert.match(widok, /aria-expanded=\{czyRozwinieta\}/)
  assert.match(widok, /aria-controls=\{idZawartosci\}/)
  assert.match(widok, /id=\{idZawartosci\}/)
  assert.match(widok, /nastepne\.delete\(pozycja\.kategoriaId\)/)
  assert.match(widok, /kategorie\.map\(\(kategoria\) => \{/)
  assert.match(style, /grid-template-rows: 1fr/)
  assert.match(style, /grid-template-rows: 0fr/)
  assert.match(style, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(style, /writing-mode: vertical-rl/)
  assert.match(druk, /kategoria\.nazwa === 'Inne' \? 2 : 1/)
})

test('widok checklisty zachowuje workflow źródła, panel układu i operację wielu paczek', () => {
  const widok = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx', import.meta.url), 'utf8')
  assert.match(widok, /pobierzSzczegolyDoChecklisty/)
  assert.match(widok, /powiazChecklisteZeSzkoleniem/)
  assert.match(widok, /utworzRecznaChecklistePaczki/)
  assert.match(widok, /PanelBocznyGeneratora/)
  assert.match(widok, /PanelEdycjiSwobodnychBlokow/)
  assert.match(widok, /duplikujPaczkeChecklisty/)
  assert.match(widok, /utworzNowaPozycjeChecklisty\([^)]*paczka\.id/)
  assert.match(widok, /dodajZalacznikChecklisty/)
  assert.match(widok, /ustawStatusChecklisty/)
  assert.match(widok, /otworzPonownieCheckliste/)
})


test('samodzielna checklista zapisuje dane, pozycje i kopię roboczą bez szkolenia', () => {
  magazyn.clear()
  const nowa = utworzRecznaChecklistePaczki('autor')
  assert.equal(nowa.szkolenieId, null)
  assert.equal(nowa.daneDokumentu.szczegolyOrganizacyjneId, null)
  assert.equal(pobierzDaneSzkoleniaChecklisty(nowa.daneDokumentu).tytulSzkolenia, '')
  const pozycja = utworzNowaPozycjeChecklisty(nowa.daneDokumentu.kategorie[0].id, 'Ręczny materiał', nowa.daneDokumentu.pozycje)!
  const dane = { ...nowa.daneDokumentu, daneSzkolenia: { ...pobierzDaneSzkoleniaChecklisty(nowa.daneDokumentu), tytulSzkolenia: 'Szybkie szkolenie', miejsce: 'Sala ręczna', nazwaGrupy: 'Moja grupa' }, pozycje: [...nowa.daneDokumentu.pozycje, pozycja] }
  const zapis = zapiszChecklistePaczki(nowa.id, dane, 'autor')!
  assert.equal(zapis.status, 'ROBOCZY')
  assert.ok(pobierzChecklistyPaczek().some((dokument) => dokument.id === nowa.id && dokument.status === 'ROBOCZY'))
  assert.deepEqual(pobierzChecklistePaczki(nowa.id)?.daneDokumentu.pozycje, dane.pozycje)
  assert.equal(pobierzChecklistePaczki(nowa.id)?.daneDokumentu.daneSzkolenia?.tytulSzkolenia, 'Szybkie szkolenie')
  assert.equal(czyMoznaEksportowacCheckliste(zapis.daneDokumentu), true)
  assert.equal(czyMoznaFinalizowacCheckliste(zapis.daneDokumentu).czyMozna, false)
  assert.equal(zarejestrujWydrukChecklisty(nowa.id, 'autor')?.daneDokumentu.wersjeWydruku.length, 1)
})

test('późniejsze powiązanie zachowuje ręczne pola i pozycje, odłączenie zachowuje całą treść', () => {
  magazyn.clear()
  const nowa = utworzRecznaChecklistePaczki('autor')
  const lokalne = { ...nowa.daneDokumentu, daneSzkolenia: { ...pobierzDaneSzkoleniaChecklisty(nowa.daneDokumentu), tytulSzkolenia: 'Skrócony tytuł', miejsce: 'Inna sala' }, klient: 'Ręczna firma' }
  zapiszChecklistePaczki(nowa.id, lokalne, 'autor')
  const kontekst = utworzKontekst()
  const przed = JSON.stringify(kontekst)
  const powiazana = powiazChecklisteZeSzkoleniem(nowa.id, kontekst, 'grupa-1', daneZrodla(), 'autor')!
  assert.equal(powiazana.szkolenieId, 'szkolenie-1')
  assert.equal(powiazana.powiazania.szczegolyOrganizacyjneId, 'szczegoly-1')
  assert.equal(powiazana.integralnosc.powiazanieZeSzczegolami, 'POWIAZANY_ZE_SZCZEGOLAMI')
  assert.equal(powiazana.daneDokumentu.daneSzkolenia?.tytulSzkolenia, 'Skrócony tytuł')
  assert.equal(powiazana.daneDokumentu.daneSzkolenia?.miejsce, 'Inna sala')
  assert.equal(powiazana.daneDokumentu.daneSzkolenia?.liczbaUczestnikow, 16)
  assert.equal(powiazana.daneDokumentu.klient, 'Ręczna firma')
  assert.equal(powiazana.integralnosc.reczneNadpisania.tytulSzkolenia, 'Skrócony tytuł')
  assert.deepEqual(powiazana.daneDokumentu.pozycje, lokalne.pozycje)
  assert.equal(JSON.stringify(kontekst), przed)
  const odlaczona = odlaczChecklisteOdSzkolenia(nowa.id, 'autor')!
  assert.equal(odlaczona.szkolenieId, null)
  assert.ok(Object.values(odlaczona.powiazania).every((wartosc) => wartosc === null))
  assert.equal(odlaczona.daneDokumentu.migawkaZrodla, null)
  assert.deepEqual(odlaczona.daneDokumentu.daneSzkolenia, powiazana.daneDokumentu.daneSzkolenia)
  assert.deepEqual(odlaczona.daneDokumentu.pozycje, lokalne.pozycje)
  assert.deepEqual(odlaczona.daneDokumentu.paczki, lokalne.paczki)
  assert.ok(pobierzChecklistePaczki(nowa.id))
})

test('puste pola pobierają dane szkolenia, a stare checklisty zachowują migawkę', () => {
  magazyn.clear()
  const nowa = utworzRecznaChecklistePaczki(null)
  const powiazana = powiazChecklisteZeSzkoleniem(nowa.id, utworzKontekst(), 'grupa-1', daneZrodla(), null)!
  assert.equal(powiazana.daneDokumentu.daneSzkolenia?.tytulSzkolenia, 'Bezpieczna praca')
  assert.equal(powiazana.daneDokumentu.daneSzkolenia?.organizator, 'Semper')
  const stara = utworzChecklistePaczkiZeZrodla(utworzKontekst(), 'grupa-1', daneZrodla(), null)!
  const { daneSzkolenia: pominiete, ...stareDane } = stara.daneDokumentu
  assert.ok(pominiete)
  assert.equal(normalizujDaneChecklisty(stareDane).daneSzkolenia?.tytulSzkolenia, 'Bezpieczna praca')
  assert.equal(normalizujDaneChecklisty(stareDane).szczegolyOrganizacyjneId, 'szczegoly-1')
})

test('eksport i druk samodzielnego dokumentu nie wymagają finalizacji ani opisów', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  assert.equal(czyMoznaEksportowacCheckliste(dane), true)
  const nazwa = zbudujNazweEksportowanegoDokumentu({ typDokumentu: 'CHECKLISTA_PACZKI', ...pobierzDaneSzkoleniaChecklisty(dane) })
  assert.doesNotMatch(nazwa, /undefined|null|__/)
  const widok = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx', import.meta.url), 'utf8')
  const druk = widok.slice(widok.indexOf('function Druk('), widok.indexOf('export default function'))
  assert.doesNotMatch(druk, /Brak szkolenia|Nie znaleziono szczegółów|trainingId/)
  assert.match(widok, /czyMoznaEksportowac=\{\(\) => !daneDoPonowienia && czyMoznaEksportowacCheckliste\(dane\)\}/)
})


test('wydruk grupuje aktywne pozycje kategorii i zachowuje pionową checklistę z tabelą wysyłki', () => {
  const widok = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx', import.meta.url), 'utf8')
  const style = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/widokChecklistPaczek.css', import.meta.url), 'utf8')
  const druk = widok.slice(widok.indexOf('function Druk('), widok.indexOf('export default function'))
  assert.match(druk, /czyPozycjaJestAktywna\(pozycja\)/)
  assert.match(druk, /if \(!aktywnePozycje.length\) return null/)
  assert.match(druk, /<tbody key=\{kategoria.id\} className=\{pobierzKlaseKoloruKategorii\(kategoria.nazwa\)\}/)
  assert.match(druk, /indeks === 0 && <th scope="rowgroup" rowSpan=\{aktywnePozycje.length\}/)
  assert.equal(druk.match(/\{kategoria.nazwa\}/g)?.length, 1)
  assert.doesNotMatch(druk, /<td>\{kategoria.nazwa\}<\/td>|Przewoźnik:/)
  assert.match(druk, /<table className="checklista-paczki__wydruk-tabela-wysylki"/)
  for (const naglowek of ['Przewoźnik', 'Numer przesyłki', 'Waga', 'Wysłano']) assert.ok(druk.includes('>' + naglowek + '</th>'))
  for (const pole of ['przewoznik', 'numerPrzesylki', 'waga']) assert.ok(druk.includes('paczka.parametryLogistyczne.' + pole + " || '—'"))
  assert.ok(druk.includes("formatujDateDoWydruku(paczka.parametryLogistyczne.dataWyslania) || '—'"))
  assert.doesNotMatch(druk, /wysokosc|notatkiWewnetrzne/)
  assert.match(druk, /checklista-paczki__wydruk-paczka/)
  assert.match(widok, /toLocaleLowerCase\('pl'\)/)
  for (const kolor of ['materialy', 'teczki', 'pakiet-crm', 'gadzety', 'inne', 'niestandardowa']) {
    assert.ok(widok.includes('checklista-paczki__wydruk-tabela--' + kolor))
    assert.ok(style.includes('checklista-paczki__wydruk-tabela--' + kolor))
  }
  assert.match(style, /@page\s*\{\s*size: A4 portrait;/)
  assert.doesNotMatch(style, /landscape|writing-mode: vertical|rotate\(180deg\)/)
  assert.match(style, /print-color-adjust: exact/)
  assert.match(style, /wydruk-paczka h2 \{ break-after: avoid/)
})


test('checklista prezentuje faktyczną ilość przed oczekiwaną i tabelę danych szkolenia', () => {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'test', numerDzienny: 1 })
  const certyfikaty = pobierzPozycje(dane, 'Certyfikaty / Dyplomy')
  certyfikaty.iloscPrzygotowana = 10
  assert.equal(pobierzIloscPozycji(certyfikaty, 12, 1).koncowa, 12)
  assert.equal(certyfikaty.iloscPrzygotowana, 10)
  const widok = readFileSync(new URL('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx', import.meta.url), 'utf8')
  assert.match(widok, /<strong>\{pozycja.iloscPrzygotowana \?\? '—'\}<\/strong><small>\/ z /)
  assert.match(widok, /Przygotowane \/ wymagane/)
  assert.equal(widok.match(/<IlosciPozycji /g)?.length, 2)
  assert.match(widok, /aria-label="Dane szkolenia"/)
  for (const etykieta of ['Nazwa szkolenia:', 'Liczba osób:', 'Klient:', 'Termin:', 'Lokalizacja:', 'Opiekun:', 'Podpis opiekuna:']) assert.ok(widok.includes(etykieta))
  assert.match(widok, /ikona="termin"/)
  assert.match(widok, /className="checklista-paczki__pola-szczegolow"/)
})

function utworzWersjeZMailem(): WersjaRoboczaGeneratora {
  const tekst = readFileSync(new URL('./fixtures/mailDyspozycjeMaterialowe.txt', import.meta.url), 'utf8')
  const wynik = parsujMailaSzczegolow(tekst)
  return {
    id: 'szczegoly-maila', dokumentId: 'szczegoly-maila', wersja: 'test', etykietaWersji: 'test',
    nazwa: 'Test dyspozycji', dataZapisu: '2026-10-20T08:00:00.000Z', autorId: 'opiekun-1', autorNazwa: 'Opiekun',
    dane: { ...structuredClone(poczatkoweDaneFormularza), ...wynik.daneFormularza },
    grupy: [{ ...structuredClone(poczatkowaGrupa), ...wynik.pierwszaGrupa, id: 'grupa-1' }],
    adresaci: { ...poczatkowiAdresaci }, statusyPol: {},
  }
}

function kontekstWersji(wersja: WersjaRoboczaGeneratora) {
  return zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja))
}

test('1.2.1: mail → Szczegóły → checklista: online, brak dokumentów klienta i propozycja 30 wydruków', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const przed = JSON.stringify(wersja)
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'opiekun-1')!
  const dane = dokument.daneDokumentu
  assert.equal(wersja.grupy[0].formaSzkolenia, 'Stacjonarne')
  assert.equal(JSON.stringify(wersja), przed)
  assert.equal(pobierzPozycje(dane, 'Podręczniki / materiały szkoleniowe').czyOnline, true)
  for (const nazwa of ['Lista obecności', 'Ankiety', 'Certyfikaty / Dyplomy']) {
    const pozycja = pobierzPozycje(dane, nazwa)
    assert.equal(pozycja.czyNieDotyczy, true)
    assert.equal(pozycja.czyWymagana, false)
    assert.equal(pobierzIloscPozycji(pozycja, 30, 1).koncowa, 0)
    assert.equal(czyPozycjaJestAktywna(pozycja), false)
  }
  const dodatkowe = pobierzPozycje(dane, 'Materiały dodatkowe')
  assert.equal(dodatkowe.czyWymagana, true)
  assert.equal(dodatkowe.czyOnline, false)
  assert.deepEqual(dodatkowe.regulaIlosci, { typ: 'UCZESTNICY' })
  assert.equal(pobierzIloscPozycji(dodatkowe, 30, 1).koncowa, 30)
  assert.equal(dodatkowe.importDyspozycji?.propozycjaIlosci, 30)
  assert.equal(dodatkowe.importDyspozycji?.czyIloscWymagaPotwierdzenia, true)
  assert.match(dodatkowe.uwagiDrukowane, /30.*potwierdzenia/)
  assert.equal(dodatkowe.nadpisanieReczne, null)
  assert.equal(dodatkowe.iloscPrzygotowana, null)
  assert.ok(dane.pozycje.every((pozycja) => pozycja.statusGotowosci === 'NIEGOTOWE'))
  const domyslne = utworzDomyslneDaneChecklisty({ identyfikator: 'porownanie', numerDzienny: 1 })
  for (const nazwa of ['Prezentacje', 'Pre/Post-testy', 'Teczki', 'Karta na drzwi', 'Długopisy', 'Torby']) {
    const { id: pierwszyId, kategoriaId: pierwszaKategoria, ...pierwsza } = pobierzPozycje(dane, nazwa)
    const { id: drugiId, kategoriaId: drugaKategoria, ...druga } = pobierzPozycje(domyslne, nazwa)
    assert.ok(pierwszyId && drugiId && pierwszaKategoria && drugaKategoria)
    assert.deepEqual(pierwsza, druga)
  }
  assert.equal(dane.historia.at(-1)?.zrodloDyspozycji?.zrodloImportuMaila, wersja.dane.zrodloImportuMaila)
  assert.equal(dane.historia.at(-1)?.zmianyDyspozycji?.length, 5)
  assert.deepEqual(pobierzChecklistePaczki(dokument.id)?.daneDokumentu.pozycje, dane.pozycje)
})

test('potwierdzenie propozycji jest jawne, blokuje finalizację do decyzji i nie oznacza wydruku jako gotowego', () => {
  magazyn.clear()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(utworzWersjeZMailem()), 'grupa-1', daneZrodla(), 'autor')!
  const dane = structuredClone(dokument.daneDokumentu)
  dane.pozycje.forEach((pozycja) => { pozycja.statusGotowosci = 'GOTOWE' })
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, false)
  const dodatkowe = pobierzPozycje(dane, 'Materiały dodatkowe')
  dodatkowe.statusGotowosci = 'NIEGOTOWE'
  const potwierdzone = potwierdzIloscDyspozycji(dane, dodatkowe.id)
  const pozycja = pobierzPozycje(potwierdzone, 'Materiały dodatkowe')
  assert.equal(pozycja.nadpisanieReczne, 30)
  assert.equal(pozycja.importDyspozycji?.czyIloscWymagaPotwierdzenia, false)
  assert.doesNotMatch(pozycja.uwagiDrukowane, /wymaga potwierdzenia/)
  assert.equal(pozycja.statusGotowosci, 'NIEGOTOWE')
  assert.equal(pozycja.iloscPrzygotowana, null)
})

test('ponowny zapis poprawionego maila automatycznie zmienia roboczą checklistę bez duplikacji', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  zapiszWersjeRobocza(wersja)
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  const poprawiony = parsujMailaSzczegolow('Materiały dodatkowe: online\nAnkiety: drukuje organizator')
  wersja.dane.dyspozycjeMaterialowe = { ...wersja.dane.dyspozycjeMaterialowe, ...poprawiony.daneFormularza.dyspozycjeMaterialowe }
  wersja.dane.zrodloImportuMaila = poprawiony.daneFormularza.zrodloImportuMaila
  zapiszWersjeRobocza(wersja)
  const poImporcie = pobierzChecklistePaczki(dokument.id)!.daneDokumentu
  assert.equal(pobierzPozycje(poImporcie, 'Materiały dodatkowe').czyOnline, true)
  assert.equal(pobierzPozycje(poImporcie, 'Ankiety').czyNieDotyczy, false)
  assert.equal(pobierzPozycje(poImporcie, 'Ankiety').importDyspozycji?.czyIloscWymagaPotwierdzenia, true)
  assert.deepEqual(poImporcie.pozycje.map((pozycja) => pozycja.id), dokument.daneDokumentu.pozycje.map((pozycja) => pozycja.id))
  assert.equal(poImporcie.historia.at(-1)?.zrodloDyspozycji?.zrodloImportuMaila, poprawiony.daneFormularza.zrodloImportuMaila)
  const serializacja = JSON.stringify(poImporcie)
  zapiszWersjeRobocza(wersja)
  assert.equal(JSON.stringify(pobierzChecklistePaczki(dokument.id)!.daneDokumentu), serializacja)
  assert.equal(pobierzChecklistyPaczek().length, 1)
  const zmiany = poImporcie.historia.at(-1)?.zmianyDyspozycji
  assert.ok(zmiany?.some((zmiana) => zmiana.przed.czyOnline === false && zmiana.po.czyOnline === true))
})

test('ręczne uwagi, reguły, ilości i stan przygotowania pozostają chronione; nadpisanie wymaga osobnej zgody', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  const dane = structuredClone(dokument.daneDokumentu)
  const dodatkowe = pobierzPozycje(dane, 'Materiały dodatkowe')
  dodatkowe.nadpisanieReczne = 7
  dodatkowe.uwagiDrukowane = 'Ręczna uwaga do paczki'
  dodatkowe.statusGotowosci = 'CZESCIOWO_GOTOWE'
  dodatkowe.iloscPrzygotowana = 3
  const ankiety = pobierzPozycje(dane, 'Ankiety')
  ankiety.czyNieDotyczy = false
  ankiety.regulaIlosci = { typ: 'RECZNA', wartoscReczna: 5 }
  zapiszChecklistePaczki(dokument.id, dane, 'autor')
  wersja.dane.dyspozycjeMaterialowe = parsujMailaSzczegolow('Materiały dodatkowe: online\nAnkiety: drukuje organizator').daneFormularza.dyspozycjeMaterialowe
  const wynik = aktualizujDyspozycjeChecklisty(dokument.id, kontekstWersji(wersja), 'autor')!.daneDokumentu
  const po = pobierzPozycje(wynik, 'Materiały dodatkowe')
  assert.equal(po.czyOnline, false)
  assert.equal(po.nadpisanieReczne, 7)
  assert.equal(po.uwagiDrukowane, 'Ręczna uwaga do paczki')
  assert.equal(po.iloscPrzygotowana, 3)
  assert.equal(po.statusGotowosci, 'CZESCIOWO_GOTOWE')
  assert.equal(po.importDyspozycji?.czyKonfliktReczny, true)
  assert.deepEqual(pobierzPozycje(wynik, 'Ankiety').regulaIlosci, { typ: 'RECZNA', wartoscReczna: 5 })
  const zgoda = aktualizujDyspozycjeChecklisty(dokument.id, kontekstWersji(wersja), 'autor', { pozycjeZeZgoda: [po.id] })!.daneDokumentu
  assert.equal(pobierzPozycje(zgoda, 'Materiały dodatkowe').czyOnline, true)
  assert.equal(pobierzPozycje(zgoda, 'Materiały dodatkowe').nadpisanieReczne, 7)
  assert.equal(pobierzPozycje(zgoda, 'Materiały dodatkowe').uwagiDrukowane, 'Ręczna uwaga do paczki')
  assert.deepEqual(pobierzPozycje(zgoda, 'Ankiety').regulaIlosci, { typ: 'RECZNA', wartoscReczna: 5 })
})

test('zatwierdzona ilość pozostaje stała po zmianie liczby uczestników', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  const idPozycji = pobierzPozycje(dokument.daneDokumentu, 'Materiały dodatkowe').id
  zapiszChecklistePaczki(dokument.id, potwierdzIloscDyspozycji(dokument.daneDokumentu, idPozycji), 'autor')
  wersja.grupy[0].liczbaUczestnikow = 40
  const wynik = aktualizujDyspozycjeChecklisty(dokument.id, kontekstWersji(wersja), 'autor')!
  assert.equal(pobierzPozycje(wynik.daneDokumentu, 'Materiały dodatkowe').nadpisanieReczne, 30)
  assert.equal(pobierzPozycje(wynik.daneDokumentu, 'Materiały dodatkowe').importDyspozycji?.czyIloscWymagaPotwierdzenia, false)
})

test('grupy i paczki mają niezależne dyspozycje, a ponowne zastosowanie nie dodaje pozycji', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const drugaDyspozycja = parsujMailaSzczegolow('Materiały dodatkowe: online')
  wersja.grupy[0].dyspozycjeMaterialowe = wersja.dane.dyspozycjeMaterialowe
  wersja.grupy.push({ ...structuredClone(poczatkowaGrupa), id: 'grupa-2', liczbaUczestnikow: 12,
    dyspozycjeMaterialowe: drugaDyspozycja.daneFormularza.dyspozycjeMaterialowe })
  const kontekst = kontekstWersji(wersja)
  const pierwsza = utworzChecklistePaczkiZeZrodla(kontekst, 'grupa-1', daneZrodla(), 'autor')!
  const druga = utworzChecklistePaczkiZeZrodla(kontekst, 'grupa-2', daneZrodla(), 'autor')!
  const drugaPrzed = pobierzChecklistePaczki(druga.id)!.daneDokumentu
  assert.equal(pobierzPozycje(druga.daneDokumentu, 'Materiały dodatkowe').czyOnline, true)
  const zPaczka = duplikujPaczkeChecklisty(pierwsza.daneDokumentu, pierwsza.daneDokumentu.paczki[0].id)
  zPaczka.paczki[0].statusOperacyjny = 'WYSŁANA'
  zapiszChecklistePaczki(pierwsza.id, zPaczka, 'autor')
  wersja.grupy[0].dyspozycjeMaterialowe = drugaDyspozycja.daneFormularza.dyspozycjeMaterialowe
  const wynik = aktualizujDyspozycjeChecklisty(pierwsza.id, kontekstWersji(wersja), 'autor')!
  assert.equal(wynik.daneDokumentu.pozycje.length, zPaczka.pozycje.length)
  assert.deepEqual(wynik.daneDokumentu.pozycje.filter((pozycja) => pozycja.paczkaId === zPaczka.paczki[0].id), zPaczka.pozycje.filter((pozycja) => pozycja.paczkaId === zPaczka.paczki[0].id))
  assert.equal(wynik.daneDokumentu.pozycje.find((pozycja) => pozycja.paczkaId === zPaczka.paczki[1].id && pozycja.nazwa === 'Materiały dodatkowe')?.czyOnline, true)
  assert.deepEqual(pobierzChecklistePaczki(druga.id)?.daneDokumentu, drugaPrzed)
  wersja.grupy.reverse()
  assert.deepEqual(kontekstWersji(wersja).grupy.find((grupa) => grupa.id === 'grupa-1')?.dyspozycjeMaterialowe, drugaDyspozycja.daneFormularza.dyspozycjeMaterialowe)
})

test('stare dyspozycje 1.2.0 dotyczą pierwszej grupy, bez rozlewania na kolejne', () => {
  const wersja = utworzWersjeZMailem()
  wersja.grupy.push({ ...structuredClone(poczatkowaGrupa), id: 'grupa-2' })
  const kontekst = kontekstWersji(wersja)
  assert.ok(kontekst.grupy[0].dyspozycjeMaterialowe)
  assert.equal(kontekst.grupy[1].dyspozycjeMaterialowe, undefined)
})

for (const status of ['WYDRUKOWANA', 'KOMPLETNA', 'ZARCHIWIZOWANA'] as const) {
  test(`automatyczny import nie zmienia dokumentu ${status} ani historycznych wydruków`, () => {
    magazyn.clear()
    const wersja = utworzWersjeZMailem()
    const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
    zarejestrujWydrukChecklisty(dokument.id, 'autor')
    ustawStatusChecklisty(dokument.id, status, 'autor', 'Ustawiono status testowy')
    const przed = JSON.stringify(pobierzChecklistePaczki(dokument.id))
    wersja.dane.dyspozycjeMaterialowe = parsujMailaSzczegolow('Materiały dodatkowe: online').daneFormularza.dyspozycjeMaterialowe
    zapiszWersjeRobocza(wersja)
    assert.equal(JSON.stringify(pobierzChecklistePaczki(dokument.id)), przed)
    assert.equal(aktualizujDyspozycjeChecklisty(dokument.id, kontekstWersji(wersja), 'autor'), null)
  })
}

test('niepewna dyspozycja nie wyłącza wydruków i wymaga decyzji', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  wersja.dane.dyspozycjeMaterialowe = parsujMailaSzczegolow('Ankiety: online lub druk').daneFormularza.dyspozycjeMaterialowe
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  assert.equal(pobierzPozycje(dokument.daneDokumentu, 'Ankiety').czyOnline, false)
  assert.equal(pobierzPozycje(dokument.daneDokumentu, 'Ankiety').czyNieDotyczy, false)
  assert.equal(pobierzPozycje(dokument.daneDokumentu, 'Ankiety').importDyspozycji?.dyspozycja.status, 'niepewne')
  assert.equal(czyMoznaFinalizowacCheckliste(dokument.daneDokumentu).czyMozna, false)
})

test('publikacja Szczegółów stosuje poprawiony mail do istniejącej roboczej checklisty', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  wersja.dane.dyspozycjeMaterialowe = parsujMailaSzczegolow('Materiały dodatkowe: online').daneFormularza.dyspozycjeMaterialowe
  wersja.dane.status = 'PEŁNE'
  opublikujWersjeRobocza(wersja)
  assert.equal(pobierzPozycje(pobierzChecklistePaczki(dokument.id)!.daneDokumentu, 'Materiały dodatkowe').czyOnline, true)
})

test('import do jednej paczki pozostawia pozostałe bez zmian', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  const dane = duplikujPaczkeChecklisty(dokument.daneDokumentu, dokument.daneDokumentu.paczki[0].id)
  const migawka = { ...dane.migawkaZrodla!, dyspozycjeMaterialowe: parsujMailaSzczegolow('Materiały dodatkowe: online').daneFormularza.dyspozycjeMaterialowe }
  const wynik = zastosujDyspozycjeMaterialoweChecklisty(dane, migawka, { paczkaId: dane.paczki[1].id })
  assert.deepEqual(wynik.dane.pozycje.filter((pozycja) => pozycja.paczkaId === dane.paczki[0].id), dane.pozycje.filter((pozycja) => pozycja.paczkaId === dane.paczki[0].id))
  assert.equal(wynik.porownania.length, 1)
})

test('zmiana liczby uczestników aktualizuje tylko niezatwierdzoną propozycję ilości', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  wersja.grupy[0].liczbaUczestnikow = 35
  zapiszWersjeRobocza(wersja)
  const dane = pobierzChecklistePaczki(dokument.id)!.daneDokumentu
  const pozycja = pobierzPozycje(dane, 'Materiały dodatkowe')
  assert.equal(pobierzDaneSzkoleniaChecklisty(dane).liczbaUczestnikow, 35)
  assert.equal(pozycja.importDyspozycji?.propozycjaIlosci, 35)
  assert.equal(pozycja.importDyspozycji?.czyIloscWymagaPotwierdzenia, true)
  assert.equal(pozycja.nadpisanieReczne, null)
  assert.equal(pozycja.statusGotowosci, 'NIEGOTOWE')
})

test('pierwsze powiązanie chroni ilości i uwagi ręcznej checklisty bez metadanych importu', () => {
  magazyn.clear()
  const dokument = utworzRecznaChecklistePaczki('autor')
  const dane = structuredClone(dokument.daneDokumentu)
  const pozycja = pobierzPozycje(dane, 'Materiały dodatkowe')
  pozycja.regulaIlosci = { typ: 'STALA', wartoscStala: 13 }
  pozycja.uwagiDrukowane = 'Własna instrukcja'
  zapiszChecklistePaczki(dokument.id, dane, 'autor')
  const wynik = powiazChecklisteZeSzkoleniem(dokument.id, kontekstWersji(utworzWersjeZMailem()), 'grupa-1', daneZrodla(), 'autor')!
  const zachowana = pobierzPozycje(wynik.daneDokumentu, 'Materiały dodatkowe')
  assert.deepEqual(zachowana.regulaIlosci, pozycja.regulaIlosci)
  assert.equal(zachowana.uwagiDrukowane, pozycja.uwagiDrukowane)
  assert.equal(zachowana.importDyspozycji?.czyKonfliktReczny, true)
})

test('ponowne otwarcie dokumentu z wydrukiem nie zezwala na automatyczną zmianę historii', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  zarejestrujWydrukChecklisty(dokument.id, 'autor')
  otworzPonownieCheckliste(dokument.id, 'ADMINISTRATOR', 'admin')
  const przed = JSON.stringify(pobierzChecklistePaczki(dokument.id))
  wersja.dane.dyspozycjeMaterialowe = parsujMailaSzczegolow('Materiały dodatkowe: online').daneFormularza.dyspozycjeMaterialowe
  zapiszWersjeRobocza(wersja)
  assert.equal(JSON.stringify(pobierzChecklistePaczki(dokument.id)), przed)
})

test('identyczny mail po potwierdzeniu ilości nie zmienia dokumentu ani nie dopisuje historii importu', () => {
  magazyn.clear()
  const wersja = utworzWersjeZMailem()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(wersja), 'grupa-1', daneZrodla(), 'autor')!
  const pozycja = pobierzPozycje(dokument.daneDokumentu, 'Materiały dodatkowe')
  zapiszChecklistePaczki(dokument.id, potwierdzIloscDyspozycji(dokument.daneDokumentu, pozycja.id), 'autor')
  const przed = JSON.stringify(pobierzChecklistePaczki(dokument.id))
  aktualizujDyspozycjeChecklisty(dokument.id, kontekstWersji(wersja), 'autor')
  assert.equal(JSON.stringify(pobierzChecklistePaczki(dokument.id)), przed)
})

test('pusty model dyspozycji nie zmienia odcisku kontekstu starszego szkolenia', () => {
  const wersja = utworzWersjeZMailem()
  delete wersja.dane.dyspozycjeMaterialowe
  const przed = kontekstWersji(wersja)
  wersja.dane.dyspozycjeMaterialowe = {}
  assert.deepEqual(kontekstWersji(wersja), przed)
})

test('1.2.3: 0/30, 12/30 i 30/30 wymagają policzenia, potwierdzenia ilości i osobnego potwierdzenia kompletu', () => {
  magazyn.clear()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(utworzWersjeZMailem()), 'grupa-1', daneZrodla(), 'autor')!
  let dane = { ...dokument.daneDokumentu, pozycje: dokument.daneDokumentu.pozycje.filter((pozycja) => pozycja.importDyspozycji) }
  const paczkaId = dane.paczki[0].id
  const pozycjaId = pobierzPozycje(dane, 'Materiały dodatkowe').id
  assert.equal(pobierzPostepKompletowaniaPaczki(dane, paczkaId).liczbaWymaganych, 1)
  for (const ilosc of [0, 12, 30]) {
    dane = zmienIloscPrzygotowanaPozycji(dane, pozycjaId, ilosc)
    const pozycja = pobierzPozycje(dane, 'Materiały dodatkowe')
    assert.equal(pozycja.iloscPrzygotowana, ilosc)
    assert.equal(pobierzStanKompletowaniaPozycji(dane, pozycja).brakujacaIlosc, 30 - ilosc)
    assert.equal(pobierzPostepKompletowaniaPaczki(dane, paczkaId).liczbaGotowych, 0)
    assert.deepEqual(ustawPotwierdzenieKompletuPozycji(dane, pozycjaId, true), dane)
  }
  dane = potwierdzIloscDyspozycji(dane, pozycjaId)
  assert.equal(pobierzPostepKompletowaniaPaczki(dane, paczkaId).procent, 0)
  dane = ustawPotwierdzenieKompletuPozycji(dane, pozycjaId, true)
  const postep = pobierzPostepKompletowaniaPaczki(dane, paczkaId)
  assert.equal(postep.liczbaGotowych, 1)
  assert.equal(postep.procent, 100)
  assert.equal(postep.czyMozna, true)
  assert.equal(pobierzPozycje(dane, 'Podręczniki / materiały szkoleniowe').czyOnline, true)
  for (const nazwa of ['Ankiety', 'Lista obecności', 'Certyfikaty / Dyplomy']) assert.equal(pobierzPozycje(dane, nazwa).czyNieDotyczy, true)

  dane = ustawStatusOperacyjnyPaczki(dane, paczkaId, 'GOTOWA')
  assert.equal(dane.paczki[0].statusOperacyjny, 'GOTOWA')
  assert.equal(dane.statusChecklisty, 'KOPIA_ROBOCZA')
  dane = zmienIloscPrzygotowanaPozycji(dane, pozycjaId, 29)
  assert.equal(dane.paczki[0].statusOperacyjny, 'W_PRZYGOTOWANIU')
  assert.equal(pobierzPozycje(dane, 'Materiały dodatkowe').statusGotowosci, 'CZESCIOWO_GOTOWE')
  assert.equal(pobierzPostepKompletowaniaPaczki(dane, paczkaId).procent, 0)
  dane = zmienIloscPrzygotowanaPozycji(dane, pozycjaId, 30)
  assert.equal(pobierzPostepKompletowaniaPaczki(dane, paczkaId).procent, 0)
})

test('1.2.3: gotowość jednej paczki nie zależy od drugiej, zapis zachowuje logistykę i przypisuje historię po ID', () => {
  magazyn.clear()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(utworzWersjeZMailem()), 'grupa-1', daneZrodla(), 'autor')!
  let dane = { ...dokument.daneDokumentu, pozycje: dokument.daneDokumentu.pozycje.filter((pozycja) => pozycja.importDyspozycji) }
  const paczkaId = dane.paczki[0].id
  const pozycjaId = pobierzPozycje(dane, 'Materiały dodatkowe').id
  dane = potwierdzIloscDyspozycji(dane, pozycjaId)
  dane = duplikujPaczkeChecklisty(dane, paczkaId)
  dane.paczki[1].parametryLogistyczne.numerPrzesylki = 'ZACHOWAJ'
  const drugaPrzed = structuredClone({ paczka: dane.paczki[1], pozycje: dane.pozycje.filter((pozycja) => pozycja.paczkaId === dane.paczki[1].id) })
  zapiszChecklistePaczki(dokument.id, dane, 'autor')
  dane = ustawPotwierdzenieKompletuPozycji(zmienIloscPrzygotowanaPozycji(dane, pozycjaId, 30), pozycjaId, true)
  const historiaPrzed = structuredClone(pobierzChecklistePaczki(dokument.id)!.daneDokumentu.historia)
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, false)
  assert.equal(czyMoznaFinalizowacCheckliste(dane, paczkaId).czyMozna, true)
  assert.equal(czyMoznaFinalizowacCheckliste(dane, 'nieistniejaca').czyMozna, false)
  dane = ustawStatusOperacyjnyPaczki(dane, paczkaId, 'GOTOWA')
  zapiszChecklistePaczki(dokument.id, dane, 'autor', 'Skompletowano wybraną paczkę.')
  const zapisane = pobierzChecklistePaczki(dokument.id)!.daneDokumentu
  assert.deepEqual(zapisane.historia.slice(0, historiaPrzed.length), historiaPrzed)
  assert.equal(zapisane.historia.at(-1)?.paczkaId, paczkaId)
  assert.deepEqual({ paczka: zapisane.paczki[1], pozycje: zapisane.pozycje.filter((pozycja) => pozycja.paczkaId === zapisane.paczki[1].id) }, drugaPrzed)
  assert.equal(pobierzPostepKompletowaniaPaczki(zapisane, paczkaId).procent, 100)
  assert.equal(pobierzPostepKompletowaniaPaczki(zapisane, zapisane.paczki[1].id).procent, 0)
  zapisane.paczki[0].nazwa = 'Nowa nazwa paczki'
  zapiszChecklistePaczki(dokument.id, zapisane, 'autor')
  assert.ok(pobierzChecklistePaczki(dokument.id)!.daneDokumentu.historia.some((wpis) => wpis.opis === 'Skompletowano wybraną paczkę.' && wpis.paczkaId === paczkaId))
})

test('1.2.3: konflikty, niepełny adres i braki blokują gotową paczkę także przy zapisie poza UI', () => {
  magazyn.clear()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(utworzWersjeZMailem()), 'grupa-1', daneZrodla(), 'autor')!
  const dane = dokument.daneDokumentu
  const paczkaId = dane.paczki[0].id
  const przed = pobierzChecklistePaczki(dokument.id)
  assert.deepEqual(ustawStatusOperacyjnyPaczki(dane, paczkaId, 'GOTOWA'), dane)
  assert.equal(zapiszChecklistePaczki(dokument.id, { ...dane, paczki: dane.paczki.map((paczka) => ({ ...paczka, statusOperacyjny: 'GOTOWA' })) }, 'autor'), null)
  assert.deepEqual(pobierzChecklistePaczki(dokument.id), przed)
  const pozycja = pobierzPozycje(dane, 'Materiały dodatkowe')
  pozycja.iloscPrzygotowana = 30
  pozycja.importDyspozycji!.czyKonfliktReczny = true
  assert.equal(pobierzStanKompletowaniaPozycji(dane, pozycja).czyMoznaPotwierdzic, false)
  assert.deepEqual(ustawPotwierdzenieKompletuPozycji(dane, pozycja.id, true), dane)
  dane.daneOdbiorcy.ulica = ''
  assert.equal(pobierzPostepKompletowaniaPaczki(dane, paczkaId).czyBrakujeDanychWysylkowych, true)
})

test('1.2.3: archiwum i wysłana paczka nie przyjmują zmian kompletowania, a wydruk zachowuje wersję', () => {
  magazyn.clear()
  const dokument = utworzChecklistePaczkiZeZrodla(kontekstWersji(utworzWersjeZMailem()), 'grupa-1', daneZrodla(), 'autor')!
  zarejestrujWydrukChecklisty(dokument.id, 'autor')
  const dane = pobierzChecklistePaczki(dokument.id)!.daneDokumentu
  const wydruki = structuredClone(dane.wersjeWydruku)
  const pozycja = pobierzPozycje(dane, 'Materiały dodatkowe')
  const zmienione = zmienIloscPrzygotowanaPozycji(dane, pozycja.id, 12)
  zapiszChecklistePaczki(dokument.id, zmienione, 'autor')
  assert.deepEqual(pobierzChecklistePaczki(dokument.id)!.daneDokumentu.wersjeWydruku, wydruki)
  for (const zablokowane of [{ ...dane, statusChecklisty: 'ZARCHIWIZOWANA' as const }, { ...dane, paczki: dane.paczki.map((paczka) => ({ ...paczka, statusOperacyjny: 'WYSŁANA' as const })) }]) {
    assert.deepEqual(zmienIloscPrzygotowanaPozycji(zablokowane, pozycja.id, 30), zablokowane)
    assert.deepEqual(ustawPotwierdzenieKompletuPozycji(zablokowane, pozycja.id, true), zablokowane)
  }
  assert.deepEqual(zmienIloscPrzygotowanaPozycji(dane, pozycja.id, Number.NaN), dane)
})
