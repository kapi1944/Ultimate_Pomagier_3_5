import assert from 'node:assert/strict'
import { zbudujDaneSeryjnychDyplomow } from '../src/moduly/dokumenty/generatory/dyplomy/modelSeryjnychDyplomow.ts'
import { zbudujNazweEksportowanegoDokumentu } from '../src/wspolne/dokumenty/nazwyDokumentow.ts'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'

const kontekst: KontekstDokumentuSzkolenia = {
  zrodlo: { szczegolyOrganizacyjneId: 'szczegoly-1', wersjaSzczegolowId: null, zmodyfikowano: '2026-09-04', odciskDanych: 'test' },
  szkolenie: { id: 'szkolenie-1', tytul: 'Prawo zamówień', typ: null, tryb: null, liczbaGodzin: 16 },
  organizator: { id: 'iist', nazwa: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST', marka: 'IIST', logoId: null, logoNazwaPliku: null, logoPodglad: null },
  klient: { id: 'klient-1', nazwa: 'Klient', nip: null, adres: null, osobaKontaktowa: null },
  trenerzy: [{ id: 'trener-0', imieINazwisko: 'Trener domyślny' }],
  grupy: [{ id: 'grupa-1', nazwa: 'Grupa A', daty: ['2026-10-01', '2026-10-02'], tryb: 'Stacjonarne', liczbaGodzin: 16, lokalizacje: [{ data: '2026-10-01', lokalizacjaId: null, nazwa: 'Hotel', adres: 'Poznań', sala: 'Sala A', trybOnline: false }], trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Nowak' }], uczestnicy: [{ id: 'u1', imie: 'Anna', nazwisko: 'Kowalska', nazwaPelna: 'Anna Kowalska', email: null, stanowisko: null }, { id: 'u2', imie: 'Piotr', nazwisko: 'Nowak', nazwaPelna: 'Piotr Nowak', email: null, stanowisko: null }], liczbaUczestnikow: 2, wysylkaMaterialow: { wymagana: null, odbiorca: null, adres: null, uwagi: null } }],
  uwagi: null,
}

const dane = zbudujDaneSeryjnychDyplomow(kontekst, 'grupa-1')
assert.ok(dane)
assert.equal(dane.organizator, 'IIST')
assert.equal(dane.tytulSzkolenia, 'Prawo zamówień')
assert.equal(dane.miejsceSzkolenia, 'Hotel, Sala A, Poznań')
assert.equal(dane.trener, 'Jan Nowak')
assert.deepEqual(dane.daty, ['2026-10-01', '2026-10-02'])
assert.deepEqual(dane.uczestnicy, ['Anna Kowalska', 'Piotr Nowak'])
assert.equal(zbudujDaneSeryjnychDyplomow(kontekst, 'brak'), null)
const wspolneDaneNazwy = { typDokumentu: 'DYPLOM' as const, organizator: dane.organizator, terminy: dane.daty, tytulSzkolenia: dane.tytulSzkolenia, grupa: 'Grupa A' }
assert.equal(zbudujNazweEksportowanegoDokumentu({ ...wspolneDaneNazwy, uczestnik: dane.uczestnicy[0] }), 'IIST_2026.10.01-02_Prawo_zamowien_Grupa_A_Anna_Kowalska_Dyplom.pdf')
assert.equal(zbudujNazweEksportowanegoDokumentu(wspolneDaneNazwy), 'IIST_2026.10.01-02_Prawo_zamowien_Grupa_A_Dyplom.pdf')

console.log('OK: wspólny szablon dyplomu otrzymuje seryjne dane uczestników')
