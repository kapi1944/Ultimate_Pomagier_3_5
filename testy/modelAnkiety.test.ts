import assert from 'node:assert/strict'
import {
  deserializujDaneAnkiety,
  domyslnePytaniaOceniane,
  domyslnePytaniaOtwarte,
  formatujZakresDatAnkiety,
  serializujDaneAnkiety,
  zastosujWariantSzablonu,
  utworzDaneAnkietyZKontekstu,
  utworzDomyslneDaneAnkiety,
} from '../src/moduly/dokumenty/generatory/ankiety/modelAnkiety.ts'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'

const pelna = utworzDomyslneDaneAnkiety()
assert.equal(pelna.wariantSzablonu, 'ORYGINALNA_PELNA')
assert.equal(pelna.widocznoscSekcji.uwagiISugestie, true)
assert.equal(pelna.pytaniaOceniane.length, 9)
assert.equal(pelna.pytaniaOtwarte.length, 3)
assert.deepEqual(pelna.pytaniaOceniane.map((pytanie) => pytanie.sekcja), ['A', 'B', 'B', 'B', 'B', 'B', 'B', 'C', 'C'])
assert.equal(pelna.pytaniaOceniane[0].tekst, 'Proszę ocenić ogólny poziom Pani/Pana zadowolenia ze szkolenia.')
assert.equal(pelna.pytaniaOtwarte[2].tekst, 'Jakim tematem/terminem szkolenia jest Pani/Pan zainteresowana/y w przyszłości?')

const skrocona = zastosujWariantSzablonu(pelna, 'ORYGINALNA_SKROCONA')
assert.equal(skrocona.widocznoscSekcji.uwagiISugestie, false)
assert.equal(skrocona.pytaniaOceniane.length, domyslnePytaniaOceniane.length)
assert.equal(skrocona.pytaniaOtwarte.length, domyslnePytaniaOtwarte.length)

const poPonownymOdczycie = deserializujDaneAnkiety(serializujDaneAnkiety({ ...skrocona, organizator: 'IIST', trener: 'Bardzo długie imię i nazwisko eksperta' }))
assert.equal(poPonownymOdczycie.organizator, 'IIST')
assert.equal(poPonownymOdczycie.trener, 'Bardzo długie imię i nazwisko eksperta')
assert.equal(poPonownymOdczycie.wariantSzablonu, 'ORYGINALNA_SKROCONA')

const poMigracjiLegacy = deserializujDaneAnkiety('Marka: IIST\nTytuł szkolenia: Zamówienia publiczne')
assert.equal(poMigracjiLegacy.organizator, 'IIST')
assert.equal(poMigracjiLegacy.tytulSzkolenia, 'Zamówienia publiczne')
assert.equal(poMigracjiLegacy.pytaniaOceniane.length, 9)

const kontekst: KontekstDokumentuSzkolenia = {
  zrodlo: { szczegolyOrganizacyjneId: 'szczegoly-1', wersjaSzczegolowId: 'wersja-1', zmodyfikowano: '2026-08-27T08:00:00.000Z', odciskDanych: 'odcisk' },
  szkolenie: { id: 'szkolenie-1', tytul: 'Długie szkolenie specjalistyczne', typ: null, tryb: null, liczbaGodzin: null },
  organizator: { id: 'iist', nazwa: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST', marka: 'IIST', logoId: null, logoNazwaPliku: null, logoPodglad: null },
  klient: { id: null, nazwa: null, nip: null, adres: null, osobaKontaktowa: null },
  trenerzy: [{ id: 'trener-1', imieINazwisko: 'Anna Kowalska' }],
  grupy: [{
    id: 'grupa-1', nazwa: 'Grupa 1', daty: ['2026-09-03', '2026-09-04'], tryb: 'Stacjonarne', liczbaGodzin: 16,
    lokalizacje: [{ data: '2026-09-03', lokalizacjaId: null, nazwa: 'Poznań', adres: null, sala: null, trybOnline: false }],
    trenerzy: [{ id: 'trener-2', imieINazwisko: 'Jan Nowak' }], uczestnicy: [], liczbaUczestnikow: 0,
    wysylkaMaterialow: { wymagana: null, odbiorca: null, adres: null, uwagi: null },
  }],
  uwagi: null,
}
const zKontekstu = utworzDaneAnkietyZKontekstu(kontekst, 'grupa-1')
assert.equal(zKontekstu.tytulSzkolenia, 'Długie szkolenie specjalistyczne')
assert.equal(zKontekstu.dataOd, '2026-09-03')
assert.equal(zKontekstu.dataDo, '2026-09-04')
assert.equal(zKontekstu.miejsce, 'Poznań')
assert.equal(zKontekstu.trener, 'Jan Nowak')
assert.equal(zKontekstu.organizator, 'IIST')
assert.equal(formatujZakresDatAnkiety(zKontekstu.dataOd, zKontekstu.dataDo), '2026-09-03 do 2026-09-04')

console.log('OK: model i warianty oryginalnych ankiet ewaluacyjnych')
