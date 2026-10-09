import assert from 'node:assert/strict'
import test from 'node:test'
import { kluczRejestruDokumentow, pobierzStanRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { odczytajZapisRejestru, skompresujRejestr } from '../src/wspolne/dokumenty/serializacjaRejestruDokumentow.ts'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import { utworzBackup, sprawdzBackup, serializujBackup } from '../src/wspolne/dane/backupDanych.ts'
import { utworzRecznaChecklistePaczki, pobierzChecklistePaczki, zapiszChecklistePaczki, zarejestrujWydrukChecklisty } from '../src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts'

const magazyn = new Map<string, string>()
let limit = Infinity
let bladZapisu: Error | null = null
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => {
    if (bladZapisu) throw bladZapisu
    if (wartosc.length > limit) throw new DOMException('Brak miejsca', 'QuotaExceededError')
    magazyn.set(klucz, wartosc)
  },
  removeItem: (klucz: string) => magazyn.delete(klucz), clear: () => magazyn.clear(), key: () => null, length: 0,
} as Storage

test('kompresja zachowuje pełną treść JSON, Unicode i stare zapisy', () => {
  const dane = { wersja: 3, tekst: 'Zażółć gęślą jaźń 🙂'.repeat(1000), puste: null, liczby: [0, -1, 0.5], dodatkowe: { kodowanie: 'gzip-base64' } }
  const zapis = JSON.stringify(dane)
  const kompresja = skompresujRejestr(zapis)
  assert.ok(kompresja.length < zapis.length / 5)
  assert.deepEqual(odczytajZapisRejestru(kompresja), dane)
  assert.deepEqual(odczytajZapisRejestru(zapis), dane)
  assert.throws(() => odczytajZapisRejestru('{"wersja":4,"dane":"???"}'))
})

test('przepełniony rejestr pozwala utworzyć, zapisać i wydrukować checklistę bez utraty historii i innych dokumentów', () => {
  magazyn.clear(); limit = Infinity
  repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'program', typ: 'PROGRAM_SZKOLENIA', tytul: 'Program', generatorId: 'programy_szkolen', daneDokumentu: { tekst: 'Treść programu'.repeat(2000) }, ustawieniaDokumentu: {} }))
  const stanPrzed = pobierzStanRejestruDokumentow()
  magazyn.set('kopia-historyczna', 'Nie zmieniaj')
  limit = 50000
  const nowa = utworzRecznaChecklistePaczki(null)
  assert.equal(JSON.parse(magazyn.get(kluczRejestruDokumentow)!).wersja, 4)
  assert.deepEqual(repozytoriumWspolnychDokumentow.pobierzPoId('program'), stanPrzed.dokumenty[0])
  assert.deepEqual(pobierzStanRejestruDokumentow().historia.at(-1), stanPrzed.historia[0])
  const dane = { ...nowa.daneDokumentu, klient: 'Żółta firma' }
  zapiszChecklistePaczki(nowa.id, dane, null)
  assert.equal(pobierzChecklistePaczki(nowa.id)?.daneDokumentu.klient, 'Żółta firma')
  assert.equal(zarejestrujWydrukChecklisty(nowa.id, null)?.daneDokumentu.wersjeWydruku.length, 1)
  assert.equal(magazyn.get('kopia-historyczna'), 'Nie zmieniaj')
  const backup = magazyn.get(kluczRejestruDokumentow)!
  const kopia = utworzBackup(['DOKUMENTY'])
  assert.equal(kopia.dane[kluczRejestruDokumentow], backup)
  assert.equal(kopia.manifest.liczbaRekordow.DOKUMENTY, 2)
  assert.equal(sprawdzBackup(serializujBackup(kopia)).poprawny, true)
  magazyn.clear(); magazyn.set(kluczRejestruDokumentow, backup)
  assert.equal(pobierzChecklistePaczki(nowa.id)?.daneDokumentu.klient, 'Żółta firma')
})

test('nieudany zapis obu formatów pozostawia poprzedni rejestr bez zmian', () => {
  const przed = magazyn.get(kluczRejestruDokumentow)
  limit = 1
  assert.throws(() => utworzRecznaChecklistePaczki(null), { name: 'QuotaExceededError' })
  assert.equal(magazyn.get(kluczRejestruDokumentow), przed)
  limit = Infinity
  bladZapisu = new DOMException('Odmowa dostępu', 'SecurityError')
  assert.throws(() => utworzRecznaChecklistePaczki(null), { name: 'SecurityError' })
  assert.equal(magazyn.get(kluczRejestruDokumentow), przed)
  bladZapisu = null
})
