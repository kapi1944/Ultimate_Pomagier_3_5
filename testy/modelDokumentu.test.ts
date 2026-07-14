import assert from 'node:assert/strict'
import test from 'node:test'
import { pobierzSciezkeGeneratoraDokumentu } from '../src/wspolne/dokumenty/konfiguracjaDokumentow.ts'
import { utworzNowyDokument, walidujDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'

test('tworzy nowy dokument roboczy z wymaganymi metadanymi', () => {
  const dokument = utworzNowyDokument({
    id: 'program-1',
    typ: 'PROGRAM_SZKOLENIA',
    tytul: ' Program szkolenia ',
    generatorId: 'programy_szkolen',
    daneDokumentu: { moduly: [] },
    ustawieniaDokumentu: { orientacja: 'pionowa' },
  })

  assert.equal(dokument.id, 'program-1')
  assert.equal(dokument.tytul, 'Program szkolenia')
  assert.equal(dokument.status, 'ROBOCZY')
  assert.equal(dokument.wersja, 1)
  assert.equal(dokument.wersjaSchematu, 1)
  assert.equal(dokument.autorId, null)
  assert.equal(dokument.czyUsunietyMiekko, false)
  assert.equal(walidujDokument(dokument).czyPoprawny, true)
})

test('wykrywa niespojna publikacje i archiwizacje', () => {
  const dokument = utworzNowyDokument({
    typ: 'ANKIETA',
    tytul: 'Ankieta',
    generatorId: 'ankiety',
    daneDokumentu: {},
    ustawieniaDokumentu: {},
  })

  const wynik = walidujDokument({ ...dokument, status: 'OPUBLIKOWANY', czyZarchiwizowany: true })

  assert.equal(wynik.czyPoprawny, false)
  assert.ok(wynik.bledy.some((blad) => blad.includes('date publikacji')))
  assert.ok(wynik.bledy.some((blad) => blad.includes('archiwizacji')))
})

test('udostepnia centralna trase generatora dla wykrytego typu', () => {
  assert.equal(pobierzSciezkeGeneratoraDokumentu('KARTA_NA_DRZWI'), '/dokumenty/karta-na-drzwi')
  assert.equal(pobierzSciezkeGeneratoraDokumentu('PROTOKOL'), null)
})
