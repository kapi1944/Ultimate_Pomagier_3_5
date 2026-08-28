import assert from 'node:assert/strict'
import {
  deserializujDaneAnkiety,
  formatujZakresDatAnkiety,
  podzielAnkieteNaStrony,
  serializujDaneAnkiety,
  utworzDaneAnkietyZKontekstu,
  utworzDomyslneDaneAnkiety,
  zastosujPresetAnkiety,
} from '../src/moduly/dokumenty/generatory/ankiety/modelAnkiety.ts'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'

const pelna = utworzDomyslneDaneAnkiety()
assert.equal(pelna.wersjaSchematu, 2)
assert.equal(pelna.preset, 'ORYGINALNA_SEMPER_PELNA')
assert.equal(pelna.sekcje.length, 6)
assert.equal(pelna.sekcje.flatMap((sekcja) => sekcja.pytania).filter((pytanie) => pytanie.typ === 'OCENA_4').length, 9)
assert.equal(pelna.blokiSwobodne.length, 6)
assert.equal(pelna.wersjaSchematuBlokow, 1)
assert.deepEqual(podzielAnkieteNaStrony(pelna).map((strona) => strona.sekcje.length), [3, 3])

const skrocona = zastosujPresetAnkiety(pelna, 'ORYGINALNA_SKROCONA')
assert.equal(skrocona.wariantSzablonu, 'ORYGINALNA_SKROCONA')
assert.equal(skrocona.sekcje.find((sekcja) => sekcja.id === 'uwagi')?.widoczna, false)

const nowoczesna = zastosujPresetAnkiety(pelna, 'NOWOCZESNA_IIST')
assert.equal(nowoczesna.organizator, 'IIST')
assert.equal(nowoczesna.wariantSzablonu, 'NOWOCZESNA')
assert.equal(nowoczesna.blokiSwobodne.length, 3)
assert.equal(podzielAnkieteNaStrony(nowoczesna).length, 2)

const wlasna = zastosujPresetAnkiety(nowoczesna, 'WLASNA')
const rozbudowana = {
  ...wlasna,
  sekcje: [...wlasna.sekcje, { id: 'duza-sekcja', nazwa: 'Dodatkowe pytania', widoczna: true, pytania: Array.from({ length: 12 }, (_, indeks) => ({ id: `duze-${indeks}`, typ: 'POLE_TEKSTOWE' as const, tekst: `Pytanie ${indeks + 1}` })) }],
}
assert.ok(podzielAnkieteNaStrony(rozbudowana).length >= 3)
assert.ok(podzielAnkieteNaStrony(rozbudowana).every((strona, indeks) => strona.numer === indeks + 1))

const zapis = serializujDaneAnkiety({ ...wlasna, trener: 'Bardzo długie imię i nazwisko eksperta' })
const poOdczycie = deserializujDaneAnkiety(zapis)
assert.equal(poOdczycie.preset, 'WLASNA')
assert.equal(poOdczycie.trener, 'Bardzo długie imię i nazwisko eksperta')
assert.deepEqual(poOdczycie.sekcje, wlasna.sekcje)

const poMigracjiJsonLegacy = deserializujDaneAnkiety(JSON.stringify({
  wersjaSchematu: 1, organizator: 'IIST', wariantSzablonu: 'ORYGINALNA_PELNA', tytulSzkolenia: 'Zamówienia publiczne',
  widocznoscSekcji: { uwagiISugestie: true },
  pytaniaOceniane: [{ id: 'legacy-a', sekcja: 'A', tekst: 'Ocena legacy' }],
  pytaniaOtwarte: [{ id: 'legacy-open', tekst: 'Pytanie legacy' }],
}))
assert.equal(poMigracjiJsonLegacy.organizator, 'IIST')
assert.equal(poMigracjiJsonLegacy.sekcje[0].pytania[0].tekst, 'Ocena legacy')
assert.equal(poMigracjiJsonLegacy.sekcje[3].pytania[0].tekst, 'Pytanie legacy')

const poMigracjiTekstuLegacy = deserializujDaneAnkiety('Marka: IIST\nTytuł szkolenia: Zamówienia publiczne')
assert.equal(poMigracjiTekstuLegacy.organizator, 'IIST')
assert.equal(poMigracjiTekstuLegacy.tytulSzkolenia, 'Zamówienia publiczne')

const kontekst: KontekstDokumentuSzkolenia = {
  zrodlo: { szczegolyOrganizacyjneId: 'szczegoly-1', wersjaSzczegolowId: 'wersja-1', zmodyfikowano: '2026-08-27T08:00:00.000Z', odciskDanych: 'odcisk' },
  szkolenie: { id: 'szkolenie-1', tytul: 'Długie szkolenie specjalistyczne', typ: null, tryb: null, liczbaGodzin: null },
  organizator: { id: 'iist', nazwa: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST', marka: 'IIST', logoId: null, logoNazwaPliku: null, logoPodglad: null },
  klient: { id: null, nazwa: null, nip: null, adres: null, osobaKontaktowa: null },
  trenerzy: [{ id: 'trener-1', imieINazwisko: 'Anna Kowalska' }],
  grupy: [{ id: 'grupa-1', nazwa: 'Grupa 1', daty: ['2026-09-03', '2026-09-04'], tryb: 'Stacjonarne', liczbaGodzin: 16, lokalizacje: [{ data: '2026-09-03', lokalizacjaId: null, nazwa: 'Poznań', adres: null, sala: null, trybOnline: false }], trenerzy: [{ id: 'trener-2', imieINazwisko: 'Jan Nowak' }], uczestnicy: [], liczbaUczestnikow: 0, wysylkaMaterialow: { wymagana: null, odbiorca: null, adres: null, uwagi: null } }],
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

console.log('OK: presety, personalizacja, migracja i paginacja ankiet')
