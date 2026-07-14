import assert from 'node:assert/strict'
import test from 'node:test'
import {
  kluczRepozytoriumDokumentow,
  repozytoriumDokumentow,
  type DaneNowegoDokumentu,
  type TypGeneratoraDokumentu,
} from '../src/wspolne/dokumenty/repozytoriumDokumentow.ts'
import { pobierzKopieRoboczeGeneratora } from '../src/wspolne/dokumenty/magazynKopiiRoboczych.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

function daneNowegoDokumentu(typGeneratora: TypGeneratoraDokumentu, tytul = 'Dokument'): DaneNowegoDokumentu<{ tresc: string }> {
  return {
    typGeneratora,
    tytul,
    stanCyklu: 'kopia_robocza',
    statusBiznesowy: 'robocza',
    widocznosc: 'prywatny',
    zrodlo: 'nowy',
    daneDokumentu: { tresc: 'pierwsza' },
    metadaneGeneratora: {},
  }
}

test('zapisuje nowy rekord wspólnego repozytorium', () => {
  magazyn.clear()
  const rekord = repozytoriumDokumentow.zapiszNowy(daneNowegoDokumentu('programy_szkolen', 'Program A'))

  assert.ok(rekord.id)
  assert.equal(rekord.stanCyklu, 'kopia_robocza')
  assert.equal(repozytoriumDokumentow.pobierz({ typGeneratora: 'programy_szkolen' }).length, 1)
})

test('aktualizuje rekord po stabilnym ID', () => {
  magazyn.clear()
  const utworzony = repozytoriumDokumentow.zapiszNowy(daneNowegoDokumentu('programy_szkolen'))
  const zaktualizowany = repozytoriumDokumentow.aktualizuj('programy_szkolen', utworzony.id, { tytul: 'Po korekcie', daneDokumentu: { tresc: 'druga' } })

  assert.equal(zaktualizowany?.id, utworzony.id)
  assert.equal(zaktualizowany?.utworzono, utworzony.utworzono)
  assert.equal(zaktualizowany?.daneDokumentu.tresc, 'druga')
})

test('izoluje typy generatorow', () => {
  magazyn.clear()
  repozytoriumDokumentow.zapiszNowy(daneNowegoDokumentu('programy_szkolen'))
  repozytoriumDokumentow.zapiszNowy(daneNowegoDokumentu('szczegoly_organizacyjne'))

  assert.equal(repozytoriumDokumentow.pobierz({ typGeneratora: 'programy_szkolen' }).length, 1)
  assert.equal(repozytoriumDokumentow.pobierz({ typGeneratora: 'szczegoly_organizacyjne' }).length, 1)
})

test('obsluguje stany cyklu dokumentu', () => {
  magazyn.clear()
  const rekord = repozytoriumDokumentow.zapiszNowy(daneNowegoDokumentu('programy_szkolen'))

  assert.equal(repozytoriumDokumentow.opublikuj('programy_szkolen', rekord.id)?.stanCyklu, 'opublikowany')
  assert.equal(repozytoriumDokumentow.archiwizuj('programy_szkolen', rekord.id)?.stanCyklu, 'archiwalny')
  assert.equal(repozytoriumDokumentow.przeniesDoKosza('programy_szkolen', rekord.id)?.stanCyklu, 'kosz')
  assert.equal(repozytoriumDokumentow.przywrocZKosza('programy_szkolen', rekord.id, 'archiwalny')?.stanCyklu, 'archiwalny')
})

test('tworzy kopie z nowym ID i powiazaniem ze zrodlem', () => {
  magazyn.clear()
  const zrodlo = repozytoriumDokumentow.zapiszNowy(daneNowegoDokumentu('szczegoly_organizacyjne'))
  const kopia = repozytoriumDokumentow.utworzKopie('szczegoly_organizacyjne', zrodlo.id)

  assert.notEqual(kopia?.id, zrodlo.id)
  assert.equal(kopia?.rekordZrodlowyId, zrodlo.id)
  assert.equal(kopia?.zrodlo, 'duplikat')
})

test('przechowuje historie wersji oddzielnie od dokumentu', () => {
  magazyn.clear()
  const rekord = repozytoriumDokumentow.zapiszNowy(daneNowegoDokumentu('programy_szkolen'))
  repozytoriumDokumentow.dodajWersjeHistorii({ typGeneratora: 'programy_szkolen', dokumentId: rekord.id, dane: { opis: 'pierwszy zapis' } })

  assert.equal(repozytoriumDokumentow.pobierzHistorie('programy_szkolen', rekord.id).length, 1)
})

test('ignoruje bledne dane localStorage i niepelne rekordy', () => {
  magazyn.clear()
  magazyn.set(kluczRepozytoriumDokumentow, '{bledny json')
  assert.deepEqual(repozytoriumDokumentow.pobierz(), [])

  magazyn.set(kluczRepozytoriumDokumentow, JSON.stringify({ dokumenty: [{ id: 'bez-typu' }, { id: 'niepelny', typGeneratora: 'programy_szkolen' }], historia: {} }))
  const rekordy = repozytoriumDokumentow.pobierz()

  assert.equal(rekordy.length, 1)
  assert.deepEqual(rekordy[0].daneDokumentu, {})
})

test('migruje zgodny stary rekord kopii bez usuwania starego klucza', () => {
  magazyn.clear()
  magazyn.set('ultimatePomagier.kopieRobocze', JSON.stringify([{ id: 'stary-program', typGeneratora: 'programy_szkolen', tytul: 'Stary program', status: 'robocza', daneDokumentu: { tresc: 'zachowana' } }, { id: 'bez-typu', daneDokumentu: {} }]))

  const kopie = pobierzKopieRoboczeGeneratora<{ tresc: string }>('programy_szkolen')

  assert.equal(kopie.length, 1)
  assert.equal(kopie[0].daneDokumentu.tresc, 'zachowana')
  assert.ok(magazyn.has('ultimatePomagier.kopieRobocze'))
})

test('kolizja ID nie nadpisuje rekordu innego generatora', () => {
  magazyn.clear()
  const program = repozytoriumDokumentow.zapiszNowy({ ...daneNowegoDokumentu('programy_szkolen'), id: 'wspolne-id' })
  const szczegoly = repozytoriumDokumentow.zapiszNowy({ ...daneNowegoDokumentu('szczegoly_organizacyjne'), id: 'wspolne-id', daneDokumentu: { tresc: 'szczegoly' } })
  repozytoriumDokumentow.aktualizuj('programy_szkolen', program.id, { daneDokumentu: { tresc: 'program po korekcie' } })

  assert.equal(szczegoly.id, 'wspolne-id')
  assert.equal(repozytoriumDokumentow.pobierzPoId('szczegoly_organizacyjne', 'wspolne-id')?.daneDokumentu.tresc, 'szczegoly')
})
