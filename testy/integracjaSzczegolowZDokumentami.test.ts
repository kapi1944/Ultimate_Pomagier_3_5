import assert from 'node:assert/strict'
import test from 'node:test'
import { poczatkowaGrupa, poczatkoweDaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import type { DaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'
import {
  adapterListyObecnosci,
  przygotujPlanGenerowania,
  utworzDaneDokumentuZIntegracji,
  walidujKontekstListyObecnosci,
  zaktualizujDaneZrodloweIntegracji,
  zbudujKontekstZeSzczegolow,
  type DaneSzczegolowDoKontekstu,
  type KontekstDokumentuSzkolenia,
} from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'

function klonuj<TDane>(dane: TDane): TDane {
  return JSON.parse(JSON.stringify(dane)) as TDane
}

function utworzZrodlo(): DaneSzczegolowDoKontekstu {
  const dane = klonuj(poczatkoweDaneFormularza) as DaneFormularza
  dane.tytulSzkolenia = 'Prowadzenie spotkań'
  dane.nazwaKlienta = 'Klient Testowy sp. z o.o.'
  dane.nabywca = { ...dane.nabywca, nazwa: 'Klient Testowy sp. z o.o.', nip: '5210000000', ulica: 'Polna', nrBudynku: '1', kodPocztowy: '00-001', miasto: 'Warszawa', osobaKontaktowa: 'Jan Klient' }
  dane.organizator = 'IIST'
  dane.logotypy = { nazwaPliku: 'iist.svg', podglad: 'data:image/svg+xml;base64,AAA' }
  dane.wysylkaPaczkiDotyczy = true
  dane.odbiorcaPaczki = { ...dane.odbiorcaPaczki, imieNazwisko: 'Anna Odbiorca', ulica: 'Magazynowa', nrBudynku: '2', kodPocztowy: '01-001', miasto: 'Warszawa' }
  dane.dodatkoweWymogi = { ...dane.dodatkoweWymogi, uwagi: 'Dostarczyć materiały dzień wcześniej.' }
  dane.uwagi = { ...dane.uwagi, wewnetrzne: 'Uwagi wewnętrzne.' }
  const grupaPierwsza = {
    ...klonuj(poczatkowaGrupa),
    id: 'grupa-a',
    nazwa: 'Grupa A',
    dataOd: '2026-08-10',
    dataDo: '2026-08-12',
    liczbaUczestnikow: 2,
    liczbaGodzin: 16,
    miejsce: 'Warszawa',
    trenerzy: [{ id: 'trener-1', imieNazwisko: 'Ada Trener', telefon: '', email: '' }],
  }
  const grupaDruga = { ...klonuj(grupaPierwsza), id: 'grupa-b', nazwa: 'Grupa B', dataOd: '2026-08-20', dataDo: '2026-08-20', miejsce: '' }

  return {
    szczegolyOrganizacyjneId: 'szczegoly-1',
    wersjaSzczegolowId: 'wersja-1',
    zmodyfikowano: '2026-08-01T10:00:00.000Z',
    dane,
    grupy: [grupaPierwsza, grupaDruga],
  }
}

function utworzPelnyKontekst(): KontekstDokumentuSzkolenia {
  const kontekst = zbudujKontekstZeSzczegolow(utworzZrodlo())
  return {
    ...kontekst,
    grupy: kontekst.grupy.map((grupa) => ({
      ...grupa,
      uczestnicy:
        grupa.id === 'grupa-a'
          ? [
              { id: 'uczestnik-1', imie: 'Anna', nazwisko: 'Kowalska', nazwaPelna: 'Anna Kowalska', email: null, stanowisko: 'Kierownik' },
              { id: 'uczestnik-2', imie: 'Piotr', nazwisko: 'Nowak', nazwaPelna: 'Piotr Nowak', email: 'piotr@example.com', stanowisko: 'Specjalista' },
            ]
          : [{ id: 'uczestnik-3', imie: 'Maria', nazwisko: 'Lis', nazwaPelna: 'Maria Lis', email: 'maria@example.com', stanowisko: 'Analityk' }],
    })),
  }
}

test('mapuje rzeczywiste pola Szczegółów do kontekstu i zachowuje braki jako null lub puste listy', () => {
  const kontekst = zbudujKontekstZeSzczegolow(utworzZrodlo())

  assert.equal(kontekst.szkolenie.tytul, 'Prowadzenie spotkań')
  assert.equal(kontekst.zrodlo.szczegolyOrganizacyjneId, 'szczegoly-1')
  assert.equal(kontekst.zrodlo.wersjaSzczegolowId, 'wersja-1')
  assert.equal(kontekst.organizator.marka, 'IIST')
  assert.equal(kontekst.organizator.logoNazwaPliku, 'iist.svg')
  assert.equal(kontekst.klient.nip, '5210000000')
  assert.equal(kontekst.trenerzy[0]?.imieINazwisko, 'Ada Trener')
  assert.equal(kontekst.grupy.length, 2)
  assert.deepEqual(kontekst.grupy[0]?.daty, ['2026-08-10', '2026-08-12'])
  assert.equal(kontekst.grupy[0]?.lokalizacje[0]?.nazwa, 'Warszawa')
  assert.deepEqual(kontekst.grupy[0]?.uczestnicy, [])
  assert.equal(kontekst.grupy[0]?.liczbaUczestnikow, 2)
  assert.equal(kontekst.grupy[0]?.wysylkaMaterialow.odbiorca, 'Anna Odbiorca')
  assert.equal(kontekst.grupy[1]?.lokalizacje[0]?.nazwa, null)
  assert.equal(kontekst.grupy[1]?.lokalizacje[0]?.adres, null)
})

test('tworzy niemutowalną migawkę i deterministyczny odcisk danych', () => {
  const zrodlo = utworzZrodlo()
  const pierwszy = zbudujKontekstZeSzczegolow(zrodlo)
  const drugi = zbudujKontekstZeSzczegolow(klonuj(zrodlo))

  zrodlo.dane.tytulSzkolenia = 'Zmieniony tytuł'
  zrodlo.grupy[0]!.nazwa = 'Zmieniona grupa'
  const poZmianie = zbudujKontekstZeSzczegolow(zrodlo)

  assert.equal(pierwszy.szkolenie.tytul, 'Prowadzenie spotkań')
  assert.equal(pierwszy.grupy[0]?.nazwa, 'Grupa A')
  assert.equal(pierwszy.zrodlo.odciskDanych, drugi.zrodlo.odciskDanych)
  assert.notEqual(pierwszy.zrodlo.odciskDanych, poZmianie.zrodlo.odciskDanych)
})

test('przygotowuje odrębne pozycje dla grup, uczestników i zestawienia', () => {
  const kontekst = utworzPelnyKontekst()
  const dlaGrup = przygotujPlanGenerowania({ kontekst, typDokumentu: 'LISTA_OBECNOSCI', strategia: 'JEDEN_NA_GRUPE', wybraneGrupyId: ['grupa-a', 'grupa-b', 'grupa-a'] })
  const dlaUczestnikow = przygotujPlanGenerowania({ kontekst, typDokumentu: 'CERTYFIKAT', strategia: 'JEDEN_NA_UCZESTNIKA', wybraneGrupyId: ['grupa-a'] })
  const zbiorczy = przygotujPlanGenerowania({ kontekst, typDokumentu: 'INNY', strategia: 'JEDEN_ZBIORCZY', wybraneGrupyId: ['grupa-a', 'grupa-b'] })

  assert.equal(dlaGrup.pozycje.length, 2)
  assert.equal(dlaGrup.pozycje[0]?.grupaId, 'grupa-a')
  assert.equal(dlaGrup.pozycje[0]?.daneZrodlowe.grupy[0]?.daty.length, 2)
  assert.equal(dlaUczestnikow.pozycje.length, 2)
  assert.equal(dlaUczestnikow.pozycje[0]?.daneZrodlowe.grupy[0]?.uczestnicy.length, 1)
  assert.equal(zbiorczy.pozycje.length, 1)
  assert.equal(zbiorczy.pozycje[0]?.grupaId, null)
})

test('zgłasza niewybraną lub nieistniejącą grupę bez tworzenia pozycji', () => {
  const kontekst = utworzPelnyKontekst()
  const bezWyboru = przygotujPlanGenerowania({ kontekst, typDokumentu: 'LISTA_OBECNOSCI', strategia: 'JEDEN_NA_GRUPE', wybraneGrupyId: [] })
  const nieistniejaca = przygotujPlanGenerowania({ kontekst, typDokumentu: 'LISTA_OBECNOSCI', strategia: 'JEDEN_NA_GRUPE', wybraneGrupyId: ['brak'] })

  assert.equal(bezWyboru.pozycje.length, 0)
  assert.ok(bezWyboru.bledy.some((blad) => blad.kod === 'BRAK_WYBRANYCH_GRUP'))
  assert.equal(nieistniejaca.pozycje.length, 0)
  assert.ok(nieistniejaca.bledy.some((blad) => blad.kod === 'GRUPA_NIEISTNIEJE'))
})

test('adapter Listy obecności przekazuje tylko wybraną grupę ze wszystkimi jej datami i uczestnikami', () => {
  const kontekst = utworzPelnyKontekst()
  const dane = adapterListyObecnosci(kontekst, 'grupa-a')

  assert.ok(dane)
  assert.equal(dane.daneZrodlowe.nazwaGrupy, 'Grupa A')
  assert.deepEqual(dane.daneZrodlowe.daty, ['2026-08-10', '2026-08-12'])
  assert.deepEqual(dane.daneZrodlowe.uczestnicy.map((uczestnik) => uczestnik.id), ['uczestnik-1', 'uczestnik-2'])
  assert.equal(dane.daneZrodlowe.trenerzy[0]?.imieINazwisko, 'Ada Trener')
  assert.equal(dane.powiazanieZeZrodlem.migawkaKontekstu.grupy.length, 2)
})

test('walidacja Listy obecności rozdziela błędy krytyczne od ostrzeżeń', () => {
  const kontekst = utworzPelnyKontekst()
  const bezUczestnikow = { ...kontekst, grupy: kontekst.grupy.map((grupa) => (grupa.id === 'grupa-a' ? { ...grupa, uczestnicy: [], trenerzy: [], lokalizacje: [] } : grupa)) }
  const wynikBraku = walidujKontekstListyObecnosci(bezUczestnikow, 'grupa-a')
  const wynikEmaila = walidujKontekstListyObecnosci(kontekst, 'grupa-a')

  assert.ok(wynikBraku.bledy.some((blad) => blad.kod === 'BRAK_UCZESTNIKOW_GRUPY'))
  assert.ok(wynikBraku.ostrzezenia.some((ostrzezenie) => ostrzezenie.kod === 'BRAK_LOKALIZACJI'))
  assert.ok(wynikBraku.ostrzezenia.some((ostrzezenie) => ostrzezenie.kod === 'BRAK_TRENERA'))
  assert.equal(wynikEmaila.poprawny, true)
  assert.ok(wynikEmaila.ostrzezenia.some((ostrzezenie) => ostrzezenie.kod === 'NIEPELNE_DANE_UCZESTNIKA'))
})

test('aktualizacja danych źródłowych zachowuje korekty ręczne i powiązanie ze Szczegółami', () => {
  const kontekst = utworzPelnyKontekst()
  const dane = adapterListyObecnosci(kontekst, 'grupa-a', { nazwaGrupy: 'Ręczna nazwa' })
  assert.ok(dane)
  const zaktualizowane = zaktualizujDaneZrodloweIntegracji(dane, { ...dane.daneZrodlowe, tytulSzkolenia: 'Nowy tytuł' })
  const ogolne = utworzDaneDokumentuZIntegracji({ nazwa: 'Źródło' }, { nazwa: 'Korekta' }, dane.powiazanieZeZrodlem)

  assert.equal(zaktualizowane.daneZrodlowe.tytulSzkolenia, 'Nowy tytuł')
  assert.equal(zaktualizowane.korektyReczne.nazwaGrupy, 'Ręczna nazwa')
  assert.equal(zaktualizowane.powiazanieZeZrodlem.szczegolyOrganizacyjneId, 'szczegoly-1')
  assert.equal(ogolne.korektyReczne.nazwa, 'Korekta')
})
