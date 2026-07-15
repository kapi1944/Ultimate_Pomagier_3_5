import assert from 'node:assert/strict'
import test from 'node:test'
import {
  pobierzIstniejacaKopieListyObecnosci,
  pobierzListyObecnosciPowiazane,
  pobierzListeObecnosciPoId,
  utworzListeObecnosciZeSzczegolow,
  zapiszKorektyListyObecnosci,
} from '../src/moduly/dokumenty/generatory/listy_obecnosci/rejestrListObecnosci.ts'
import {
  przygotujPlanGenerowania,
  walidujKontekstListyObecnosci,
  type KontekstDokumentuSzkolenia,
} from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'
import { pobierzKopieRoboczeGeneratora } from '../src/wspolne/dokumenty/magazynKopiiRoboczych.ts'
import { repozytoriumDokumentow } from '../src/wspolne/dokumenty/repozytoriumDokumentow.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

function utworzKontekst(): KontekstDokumentuSzkolenia {
  return {
    zrodlo: {
      szczegolyOrganizacyjneId: 'szczegoly-1',
      wersjaSzczegolowId: 'wersja-1',
      zmodyfikowano: '2026-07-15T10:00:00.000Z',
      odciskDanych: 'odcisk-1',
    },
    szkolenie: { id: 'szkolenie-1', tytul: 'Bezpieczna praca', typ: null, tryb: 'stacjonarny', liczbaGodzin: 8 },
    organizator: { id: 'organizator-1', nazwa: 'Pomagier', marka: null, logoId: 'logo-1', logoNazwaPliku: 'logo.svg', logoPodglad: null },
    klient: { id: 'klient-1', nazwa: 'Klient', nip: null, adres: null, osobaKontaktowa: null },
    trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Trener' }],
    grupy: [
      {
        id: 'grupa-a',
        nazwa: 'Grupa A',
        daty: ['2026-08-01', '2026-08-02'],
        lokalizacje: [{ data: '2026-08-01', lokalizacjaId: 'lok-1', nazwa: 'Sala A', adres: 'Warszawa', sala: '1', trybOnline: false }],
        uczestnicy: [
          { id: 'a-1', imie: 'Anna', nazwisko: 'Nowak', nazwaPelna: 'Anna Nowak', email: null, stanowisko: null },
          { id: 'a-2', imie: 'Adam', nazwisko: 'Nowak', nazwaPelna: 'Adam Nowak', email: 'adam@example.com', stanowisko: null },
        ],
        liczbaUczestnikow: 2,
        trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Trener' }],
        tryb: 'stacjonarny',
        wysylkaMaterialow: { wymagana: false, odbiorca: null, adres: null, uwagi: null },
      },
      {
        id: 'grupa-b',
        nazwa: 'Grupa B',
        daty: ['2026-08-03'],
        lokalizacje: [{ data: '2026-08-03', lokalizacjaId: null, nazwa: 'Sala B', adres: null, sala: null, trybOnline: false }],
        uczestnicy: [{ id: 'b-1', imie: 'Beata', nazwisko: 'Kowalska', nazwaPelna: 'Beata Kowalska', email: null, stanowisko: null }],
        liczbaUczestnikow: 1,
        trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Trener' }],
        tryb: 'stacjonarny',
        wysylkaMaterialow: { wymagana: false, odbiorca: null, adres: null, uwagi: null },
      },
      {
        id: 'grupa-c',
        nazwa: 'Grupa C',
        daty: ['2026-08-04'],
        lokalizacje: [{ data: '2026-08-04', lokalizacjaId: null, nazwa: 'Sala C', adres: null, sala: null, trybOnline: false }],
        uczestnicy: [{ id: 'c-1', imie: 'Celina', nazwisko: 'Lis', nazwaPelna: 'Celina Lis', email: null, stanowisko: null }],
        liczbaUczestnikow: 1,
        trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Trener' }],
        tryb: 'stacjonarny',
        wysylkaMaterialow: { wymagana: false, odbiorca: null, adres: null, uwagi: null },
      },
    ],
    uwagi: null,
  }
}

function wyczyscRepozytorium() {
  magazyn.clear()
}

test('jedna grupa tworzy jedna Liste obecnosci z wszystkimi terminami i tylko jej uczestnikami', () => {
  wyczyscRepozytorium()
  const wynik = utworzListeObecnosciZeSzczegolow(utworzKontekst(), 'grupa-a')

  assert.equal(wynik.status, 'utworzono')
  assert.equal(wynik.dokument?.stanCyklu, 'kopia_robocza')
  assert.equal(wynik.dokument?.statusBiznesowy, 'ROBOCZY')
  assert.match(wynik.dokument?.tytul ?? '', /Bezpieczna praca.*Grupa A.*2026-08-01, 2026-08-02/)
  assert.deepEqual(wynik.dokument?.daneDokumentu.daneZrodlowe.daty, ['2026-08-01', '2026-08-02'])
  assert.deepEqual(wynik.dokument?.daneDokumentu.daneZrodlowe.uczestnicy.map((uczestnik) => uczestnik.id), ['a-1', 'a-2'])
  assert.equal(wynik.dokument?.metadaneGeneratora.grupaId, 'grupa-a')
  assert.equal(wynik.dokument?.metadaneGeneratora.odciskDanych, 'odcisk-1')
})

test('trzy wybrane grupy strategii JEDEN_NA_GRUPE tworza trzy dokumenty', () => {
  wyczyscRepozytorium()
  const kontekst = utworzKontekst()
  const plan = przygotujPlanGenerowania({ kontekst, typDokumentu: 'LISTA_OBECNOSCI', strategia: 'JEDEN_NA_GRUPE', wybraneGrupyId: ['grupa-a', 'grupa-b', 'grupa-c'] })

  const wyniki = plan.pozycje.map((pozycja) => utworzListeObecnosciZeSzczegolow(kontekst, pozycja.grupaId ?? ''))

  assert.equal(plan.pozycje.length, 3)
  assert.equal(wyniki.filter((wynik) => wynik.status === 'utworzono').length, 3)
  assert.equal(repozytoriumDokumentow.pobierz({ typGeneratora: 'listy_obecnosci' }).length, 3)
})

test('bledna grupa nie blokuje poprawnej grupy', () => {
  wyczyscRepozytorium()
  const kontekst = utworzKontekst()
  const grupaBledna = kontekst.grupy.find((grupa) => grupa.id === 'grupa-b')!
  grupaBledna.daty = []
  grupaBledna.uczestnicy = []
  grupaBledna.liczbaUczestnikow = 0

  const walidacjaBlednej = walidujKontekstListyObecnosci(kontekst, 'grupa-b')
  const walidacjaPoprawnej = walidujKontekstListyObecnosci(kontekst, 'grupa-a')
  const wynikPoprawnej = walidacjaPoprawnej.poprawny ? utworzListeObecnosciZeSzczegolow(kontekst, 'grupa-a') : null

  assert.equal(walidacjaBlednej.poprawny, false)
  assert.equal(walidacjaPoprawnej.poprawny, true)
  assert.equal(wynikPoprawnej?.status, 'utworzono')
  assert.equal(repozytoriumDokumentow.pobierz({ typGeneratora: 'listy_obecnosci' }).length, 1)
})

test('wykrywa istniejaca kopie robocza i chroni przed podwojnym utworzeniem', () => {
  wyczyscRepozytorium()
  const kontekst = utworzKontekst()
  const pierwszy = utworzListeObecnosciZeSzczegolow(kontekst, 'grupa-a')
  const drugi = utworzListeObecnosciZeSzczegolow(kontekst, 'grupa-a')

  assert.equal(pierwszy.status, 'utworzono')
  assert.equal(drugi.status, 'istnieje')
  assert.equal(pobierzIstniejacaKopieListyObecnosci('szczegoly-1', 'grupa-a')?.id, pierwszy.dokument?.id)
  assert.equal(repozytoriumDokumentow.pobierz({ typGeneratora: 'listy_obecnosci' }).length, 1)
})

test('dokument jest widoczny w globalnym i typowanym rejestrze oraz w Dokumentach powiazanych', () => {
  wyczyscRepozytorium()
  const wynik = utworzListeObecnosciZeSzczegolow(utworzKontekst(), 'grupa-a')

  assert.equal(repozytoriumDokumentow.pobierz().length, 1)
  assert.equal(pobierzKopieRoboczeGeneratora('listy_obecnosci').length, 1)
  assert.equal(pobierzListyObecnosciPowiazane('szczegoly-1').length, 1)
  assert.equal(pobierzListyObecnosciPowiazane('inne-szczegoly').length, 0)
  assert.equal(pobierzListeObecnosciPoId(wynik.dokument?.id ?? '')?.id, wynik.dokument?.id)
})

test('zapis korekt recznych zachowuje dane zrodlowe i powiazanie ze Szczegolami', () => {
  wyczyscRepozytorium()
  const utworzony = utworzListeObecnosciZeSzczegolow(utworzKontekst(), 'grupa-a')
  assert.equal(utworzony.status, 'utworzono')

  const zaktualizowany = zapiszKorektyListyObecnosci(utworzony.dokument!.id, 'Nazwa po korekcie', { tytulSzkolenia: 'Ręczna nazwa' })

  assert.equal(zaktualizowany?.tytul, 'Nazwa po korekcie')
  assert.equal(zaktualizowany?.daneDokumentu.daneZrodlowe.tytulSzkolenia, 'Bezpieczna praca')
  assert.equal(zaktualizowany?.daneDokumentu.korektyReczne.tytulSzkolenia, 'Ręczna nazwa')
  assert.equal(zaktualizowany?.daneDokumentu.powiazanieZeZrodlem.szczegolyOrganizacyjneId, 'szczegoly-1')
})
