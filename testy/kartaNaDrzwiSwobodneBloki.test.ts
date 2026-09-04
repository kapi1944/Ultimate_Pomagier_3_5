import assert from 'node:assert/strict'
import { deserializujDaneKartyNaDrzwi, pobierzDaneKartyNaDrzwi, serializujDaneKartyNaDrzwi, utworzDaneKartyNaDrzwiZKontekstu, utworzDomyslneDaneKartyNaDrzwi } from '../src/moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi.ts'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'
const karta=utworzDomyslneDaneKartyNaDrzwi()
assert.deepEqual(karta.blokiSwobodne.map(blok=>blok.id),['logo','tytul','termin','miejsce','dodatkowy-tekst','organizator'])
const poZapisie=deserializujDaneKartyNaDrzwi(serializujDaneKartyNaDrzwi({...karta,blokiSwobodne:karta.blokiSwobodne.map(blok=>blok.id==='tytul'?{...blok,xMm:44,zablokowany:true}:blok)}))
assert.equal(poZapisie.blokiSwobodne.find(blok=>blok.id==='tytul')?.xMm,44)
assert.equal(poZapisie.blokiSwobodne.find(blok=>blok.id==='tytul')?.zablokowany,true)
const pionowa={...poZapisie,orientacja:'pionowa' as const}
assert.equal(pionowa.blokiSwobodne.find(blok=>blok.id==='tytul')?.xMm,44)
const kontekst: KontekstDokumentuSzkolenia = { zrodlo: { szczegolyOrganizacyjneId: 'szczegoly-1', wersjaSzczegolowId: null, zmodyfikowano: '2026-09-04', odciskDanych: 'test' }, szkolenie: { id: 'szkolenie-1', tytul: 'Prawo pracy', typ: null, tryb: null, liczbaGodzin: 8 }, organizator: { id: 'iist', nazwa: 'IIST', marka: 'IIST', logoId: null, logoNazwaPliku: null, logoPodglad: null }, klient: { id: null, nazwa: 'Klient', nip: null, adres: null, osobaKontaktowa: null }, trenerzy: [], grupy: [{ id: 'grupa-1', nazwa: 'Grupa A', daty: ['2026-10-01'], tryb: 'Stacjonarne', liczbaGodzin: 8, lokalizacje: [{ data: '2026-10-01', lokalizacjaId: null, nazwa: 'Hotel', adres: 'Poznań', sala: 'Sala A', trybOnline: false }], trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Nowak' }], uczestnicy: [], liczbaUczestnikow: 0, wysylkaMaterialow: { wymagana: null, odbiorca: null, adres: null, uwagi: null } }], uwagi: null }
const automatyczna = utworzDaneKartyNaDrzwiZKontekstu(kontekst, 'grupa-1', 'Anna Kowalska')
assert.ok(automatyczna)
assert.equal(automatyczna.grupaId, 'grupa-1')
assert.deepEqual(pobierzDaneKartyNaDrzwi(automatyczna.daneWejsciowe), { tytulSzkolenia: 'Prawo pracy', termin: '2026-10-01', miejsce: 'Hotel, Sala A, Poznań', dodatkowyTekst: 'Ekspert: Jan Nowak', organizator: 'IIST', marka: 'IIST' })
console.log('OK: Karta na drzwi zachowuje wspólne bloki i orientację')
