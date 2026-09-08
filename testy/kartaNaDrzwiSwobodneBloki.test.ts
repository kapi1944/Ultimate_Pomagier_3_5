import assert from 'node:assert/strict'
import { deserializujDaneKartyNaDrzwi, obliczRozmiarTytuluKarty, przywrocPoleKartyZeZrodla, serializujDaneKartyNaDrzwi, utworzDaneKartyNaDrzwiZKontekstu, utworzDomyslneDaneKartyNaDrzwi, utworzKarteNaDrzwi, utworzKartyZGrupISal, utworzUstawieniaBazowegoSzablonu, uporzadkujKarty, zduplikujKarteNaDrzwi, zmienPoleKartyLokalnie } from '../src/moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi.ts'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'

const domyslne = utworzDomyslneDaneKartyNaDrzwi()
assert.equal(domyslne.wersjaSchematu, 3)
assert.equal(domyslne.karty.length, 1)
assert.equal(domyslne.ustawieniaSzablonu.nazwa, 'Oryginalny')
assert.equal(utworzUstawieniaBazowegoSzablonu('nowoczesny').nazwa, 'Nowoczesny')
assert.equal(utworzUstawieniaBazowegoSzablonu('oryginalny').id, 'bazowy-oryginalny')
const poZapisie = deserializujDaneKartyNaDrzwi(serializujDaneKartyNaDrzwi(domyslne))
assert.equal(poZapisie.karty[0].id, domyslne.karty[0].id)
const starszy = deserializujDaneKartyNaDrzwi(JSON.stringify({ wersjaSchematu: 2, daneWejsciowe: 'Tytuł szkolenia: Stara karta\nData: 2026-10-01\nMiejsce: Sala A', orientacja: 'pionowa', grupaId: 'g1', szczegolyOrganizacyjneId: 's1', blokiSwobodne: [] }))
assert.equal(starszy.karty.length, 1)
assert.equal(starszy.karty[0].tytulSzkolenia, 'Stara karta')
assert.equal(starszy.ustawieniaSzablonu.orientacja, 'pionowa')
const karta = utworzKarteNaDrzwi({ tytulSzkolenia: 'A', zrodlaPol: { sala: 'Źródłowa sala' } })
const lokalna = zmienPoleKartyLokalnie(karta, 'sala', 'Sala lokalna')
assert.equal(lokalna.nadpisaniaLokalne.sala, true)
assert.equal(przywrocPoleKartyZeZrodla(lokalna, 'sala').sala, 'Źródłowa sala')
const duplikat = zduplikujKarteNaDrzwi(karta)
assert.notEqual(duplikat.id, karta.id)
assert.deepEqual(uporzadkujKarty([duplikat, karta]).map((pozycja) => pozycja.kolejnosc), [1, 2])
assert.equal(obliczRozmiarTytuluKarty('x'.repeat(400), 28, 12), 12)

const kontekst: KontekstDokumentuSzkolenia = { zrodlo: { szczegolyOrganizacyjneId: 's1', wersjaSzczegolowId: null, zmodyfikowano: '2026-09-04', odciskDanych: 'test' }, szkolenie: { id: 'szkolenie-1', tytul: 'Prawo pracy', typ: null, tryb: null, liczbaGodzin: 8 }, organizator: { id: 'iist', nazwa: 'IIST', marka: 'IIST', logoId: null, logoNazwaPliku: null, logoPodglad: null }, klient: { id: null, nazwa: 'Klient', nip: null, adres: null, osobaKontaktowa: null }, trenerzy: [], grupy: [{ id: 'g1', nazwa: 'Grupa A', daty: ['2026-10-01'], tryb: 'Stacjonarne', liczbaGodzin: 8, lokalizacje: [{ data: '2026-10-01', lokalizacjaId: null, nazwa: 'Hotel', adres: 'Poznań', sala: 'Sala A', trybOnline: false }, { data: '2026-10-02', lokalizacjaId: null, nazwa: 'Hotel', adres: 'Poznań', sala: 'Sala B', trybOnline: false }], trenerzy: [{ id: 't1', imieINazwisko: 'Jan Nowak' }], uczestnicy: [], liczbaUczestnikow: 0, wysylkaMaterialow: { wymagana: null, odbiorca: null, adres: null, uwagi: null } }], uwagi: null }
const zestaw = utworzDaneKartyNaDrzwiZKontekstu(kontekst, 'g1')
assert.equal(zestaw?.karty[0].sala, 'Sala A')
const automatyczne = utworzKartyZGrupISal(kontekst)
assert.equal(automatyczne.length, 2)
assert.deepEqual(automatyczne.map((pozycja) => pozycja.sala), ['Sala A', 'Sala B'])
console.log('OK: Karty na drzwi obsługują zestawy, migrację, źródła i szablony')
