import assert from 'node:assert/strict'
import {
  deserializujDaneListyObecnosci,
  podzielListeObecnosciNaStrony,
  podzielWierszeListyObecnosci,
  porownajUczestnikowListyObecnosci,
  serializujDaneListyObecnosci,
  zastosujSynchronizacjeUczestnikow,
  zaproponujWariantWielodniowyListyObecnosci,
  utworzDaneListyObecnosciZIntegracji,
  utworzDomyslneDaneListyObecnosci,
} from '../src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci.ts'
import type { DaneListyObecnosciZIntegracji } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'

const domyslne = utworzDomyslneDaneListyObecnosci()
assert.equal(domyslne.organizator, 'SEMPER')
assert.equal(domyslne.trybListy, 'WYPELNIONA')
assert.equal(domyslne.uczestnicy.length, 0)

const poPonownymOdczycie = deserializujDaneListyObecnosci(serializujDaneListyObecnosci({
  ...domyslne,
  organizator: 'IIST',
  daty: ['2026-09-01', '2026-09-02'],
  uczestnicy: [{ id: 'stabilne-id', imieINazwisko: 'Anna Kowalska' }],
}))
assert.equal(poPonownymOdczycie.organizator, 'IIST')
assert.deepEqual(poPonownymOdczycie.daty, ['2026-09-01', '2026-09-02'])
assert.equal(poPonownymOdczycie.uczestnicy[0]?.id, 'stabilne-id')

const poMigracjiLegacy = deserializujDaneListyObecnosci(`Tytuł szkolenia: Zamówienia publiczne
Data od: 2026-09-01
Data do: 2026-09-03
Miejsce: Poznań
Tryb listy: wypelniona
Marka: IIST

Uczestnicy:
Jan Nowak
Maria Kowalska`)
assert.equal(poMigracjiLegacy.tytulSzkolenia, 'Zamówienia publiczne')
assert.equal(poMigracjiLegacy.miejsce, 'Poznań')
assert.equal(poMigracjiLegacy.organizator, 'IIST')
assert.deepEqual(poMigracjiLegacy.daty, ['2026-09-01', '2026-09-02', '2026-09-03'])
assert.deepEqual(poMigracjiLegacy.uczestnicy.map((uczestnik) => uczestnik.imieINazwisko), ['Jan Nowak', 'Maria Kowalska'])

const daneZIntegracji: DaneListyObecnosciZIntegracji = {
  typDokumentu: 'LISTA_OBECNOSCI',
  tytulSzkolenia: 'Gospodarka odpadami',
  nazwaGrupy: 'Grupa A',
  daty: ['2026-10-01'],
  lokalizacje: [{ data: '2026-10-01', lokalizacjaId: null, nazwa: 'Polańczyk', adres: null, sala: null, trybOnline: false }],
  organizator: { id: 'semper', nazwa: 'Centrum Organizacji Szkoleń i Konferencji SEMPER', marka: 'SEMPER', logoId: null, logoNazwaPliku: null, logoPodglad: null },
  klient: { id: null, nazwa: null, nip: null, adres: null, osobaKontaktowa: null },
  trenerzy: [],
  uczestnicy: Array.from({ length: 46 }, (_, indeks) => ({ id: `uczestnik-${indeks + 1}`, imie: 'Osoba', nazwisko: String(indeks + 1), nazwaPelna: `Osoba ${indeks + 1}`, email: null, stanowisko: null })),
  liczbaUczestnikow: 46,
  trybSzkolenia: 'Stacjonarne',
  daneZrodlowe: { szczegolyOrganizacyjneId: 'szczegoly-1', wersjaSzczegolowId: null, zmodyfikowano: '2026-08-27T10:00:00.000Z', odciskDanych: 'odcisk' },
}
const zIntegracji = utworzDaneListyObecnosciZIntegracji(daneZIntegracji, { tytulSzkolenia: 'Tytuł po korekcie' })
assert.equal(zIntegracji.tytulSzkolenia, 'Tytuł po korekcie')
assert.equal(zIntegracji.miejsce, 'Polańczyk')
assert.equal(zIntegracji.organizator, 'SEMPER')
assert.deepEqual(podzielWierszeListyObecnosci(zIntegracji).map((strona) => strona.length), [28, 18])

const pusta = { ...domyslne, trybListy: 'PUSTA' as const, liczbaPustychWierszy: 57 }
assert.deepEqual(podzielWierszeListyObecnosci(pusta).map((strona) => strona.length), [28, 28, 1])

assert.equal(zaproponujWariantWielodniowyListyObecnosci(['2026-09-01', '2026-09-02']), 'KOLUMNY_PODPISOW')
assert.equal(zaproponujWariantWielodniowyListyObecnosci(['1', '2', '3', '4']), 'OSOBNE_STRONY')
const wielodniowa = { ...domyslne, daty: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'], wariantWielodniowy: 'OSOBNE_STRONY' as const, uczestnicy: Array.from({ length: 29 }, (_, indeks) => ({ id: `osoba-${indeks}`, imieINazwisko: `Osoba ${indeks}` })) }
assert.equal(podzielListeObecnosciNaStrony(wielodniowa).length, 8)
const roznice = porownajUczestnikowListyObecnosci([{ id: 'a', imieINazwisko: 'Anna' }, { id: 'reczny', imieINazwisko: 'Ręczny', czyReczny: true }], [{ id: 'a', imieINazwisko: 'Anna Nowak' }, { id: 'b', imieINazwisko: 'Bartek' }])
assert.equal(roznice.nowi.length, 1)
assert.equal(roznice.zmienieni.length, 1)
assert.equal(zastosujSynchronizacjeUczestnikow({ ...domyslne, uczestnicy: [{ id: 'reczny', imieINazwisko: 'Ręczny', czyReczny: true }] }, [{ id: 'a', imieINazwisko: 'Anna' }]).uczestnicy.length, 2)

console.log('OK: model, migracja i paginacja List obecności')
