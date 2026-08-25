import assert from 'node:assert/strict'
import test from 'node:test'
import { przywrocBackup, sprawdzBackup, utworzBackup, utworzKopieLokalnaPrzedOperacja } from '../src/wspolne/dane/backupDanych.ts'
import { wykonajMigracjeStarszychDokumentow } from '../src/wspolne/dokumenty/migracjaStarszychDokumentow.ts'
import { kluczRejestruDokumentow, pobierzStanRejestruDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { kluczRepozytoriumDokumentow } from '../src/wspolne/dokumenty/repozytoriumDokumentow.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: (indeks: number) => [...magazyn.keys()][indeks] ?? null,
  get length() { return magazyn.size },
} as Storage

function ustawDane() {
  magazyn.set('ultimatePomagier.rejestrDokumentow.v1', JSON.stringify({ wersja: 3, dokumenty: [], kopieRobocze: [], autosave: [], historia: [], migracje: [] }))
  magazyn.set('ultimatePomagier.uzytkownicy.v1', JSON.stringify([{ id: 'uzytkownik-testowy' }]))
  magazyn.set('ultimatePomagier.ustawieniaAplikacji.v1', JSON.stringify({ kontrast: 'wysoki' }))
}

test('pełny i częściowy backup mają manifest oraz nie obejmują sesji', () => {
  magazyn.clear(); ustawDane(); magazyn.set('ultimatePomagier.sesjaUzytkownika.v1', JSON.stringify({ id: 'sesja' }))
  const pelny = utworzBackup()
  const czesciowy = utworzBackup(['DOKUMENTY'])
  assert.equal(pelny.manifest.wersjaFormatu, 1)
  assert.ok(pelny.manifest.sumaKontrolna)
  assert.ok(pelny.dane['ultimatePomagier.uzytkownicy.v1'])
  assert.equal(pelny.dane['ultimatePomagier.sesjaUzytkownika.v1'], undefined)
  assert.ok(czesciowy.dane[kluczRejestruDokumentow])
  assert.equal(czesciowy.dane['ultimatePomagier.uzytkownicy.v1'], undefined)
})

test('walidacja odrzuca uszkodzony backup i nieobsługiwaną wersję', () => {
  magazyn.clear(); ustawDane(); const backup = utworzBackup()
  assert.equal(sprawdzBackup('{uszkodzony').poprawny, false)
  assert.equal(sprawdzBackup(JSON.stringify({ ...backup, manifest: { ...backup.manifest, wersjaFormatu: 99 } })).poprawny, false)
  assert.equal(sprawdzBackup(JSON.stringify({ ...backup, manifest: { ...backup.manifest, sumaKontrolna: '00000000' } })).poprawny, false)
})

test('lokalna rotacja zachowuje tylko trzy ostatnie kopie', () => {
  magazyn.clear(); ustawDane()
  for (let indeks = 0; indeks < 4; indeks += 1) utworzKopieLokalnaPrzedOperacja('AUTOMATYCZNA')
  const indeks = JSON.parse(magazyn.get('ultimatePomagier.backup.lokalny.v1.indeks') ?? '[]') as unknown[]
  assert.equal(indeks.length, 3)
})

test('restore pełny i częściowy tworzy kopię przed zmianą oraz weryfikuje wynik', () => {
  magazyn.clear(); ustawDane(); const backup = utworzBackup()
  magazyn.set('ultimatePomagier.uzytkownicy.v1', JSON.stringify([{ id: 'zmieniony' }]))
  const wynikPelny = przywrocBackup(backup)
  assert.ok(magazyn.get(wynikPelny.kopiaPrzedRestore.klucz))
  assert.equal(magazyn.get('ultimatePomagier.uzytkownicy.v1'), JSON.stringify([{ id: 'uzytkownik-testowy' }]))
  const dokumenty = utworzBackup(['DOKUMENTY'])
  magazyn.set('ultimatePomagier.ustawieniaAplikacji.v1', JSON.stringify({ kontrast: 'niski' }))
  przywrocBackup(dokumenty, ['DOKUMENTY'])
  assert.equal(magazyn.get('ultimatePomagier.ustawieniaAplikacji.v1'), JSON.stringify({ kontrast: 'niski' }))
})

test('błąd restore przywraca pełny poprzedni stan transakcyjny', () => {
  magazyn.clear(); ustawDane(); const backup = utworzBackup()
  magazyn.set('ultimatePomagier.uzytkownicy.v1', JSON.stringify([{ id: 'stan-przed-restore' }]))
  const zapiszOryginalnie = localStorage.setItem
  let czyPierwszyBlad = true
  localStorage.setItem = ((klucz: string, wartosc: string) => {
    if (klucz === 'ultimatePomagier.uzytkownicy.v1' && czyPierwszyBlad) { czyPierwszyBlad = false; throw new Error('Brak miejsca') }
    magazyn.set(klucz, wartosc)
  }) as Storage['setItem']
  assert.throws(() => przywrocBackup(backup), /Brak miejsca/)
  localStorage.setItem = zapiszOryginalnie
  assert.equal(magazyn.get('ultimatePomagier.uzytkownicy.v1'), JSON.stringify([{ id: 'stan-przed-restore' }]))
})

test('migracja wykonuje backup przed zapisem i zachowuje fixture historii, autosave oraz cyklu życia', () => {
  magazyn.clear(); ustawDane()
  magazyn.set(kluczRepozytoriumDokumentow, JSON.stringify({
    dokumenty: [
      { id: 'program-1', typGeneratora: 'programy_szkolen', tytul: 'Program opublikowany', stanCyklu: 'opublikowany', statusBiznesowy: 'GOTOWY', utworzono: '2026-08-01T10:00:00.000Z', zaktualizowano: '2026-08-02T10:00:00.000Z', opublikowano: '2026-08-02T10:00:00.000Z', daneDokumentu: { moduly: [1, 2] }, metadaneGeneratora: {} },
      { id: 'lista-1', typGeneratora: 'listy_obecnosci', tytul: 'Lista z korektą', stanCyklu: 'kosz', statusBiznesowy: 'ROBOCZY', utworzono: '2026-08-01T10:00:00.000Z', zaktualizowano: '2026-08-02T10:00:00.000Z', usunieto: '2026-08-03T10:00:00.000Z', daneDokumentu: { korektyReczne: { tytul: 'Ręczny' } }, metadaneGeneratora: { szczegolyOrganizacyjneId: 'szczegoly-1', grupaId: 'grupa-1', odciskDanych: 'odcisk' } },
    ],
    historia: [{ id: 'historia-programu', typGeneratora: 'programy_szkolen', dokumentId: 'program-1', data: '2026-08-02T10:00:00.000Z', dane: { migawkaDokumentu: { moduly: [1] } } }],
  }))
  magazyn.set('ultimatePomagier.programySzkolen.autosave.v1', JSON.stringify({ idSesji: 'sesja-1', daneDokumentu: { tekst: 'autosave' }, zapisano: '2026-08-03T10:00:00.000Z' }))
  const raport = wykonajMigracjeStarszychDokumentow()
  const stan = pobierzStanRejestruDokumentow()
  assert.equal(raport.wykonano, true)
  assert.equal(stan.dokumenty.length, 2)
  assert.equal(stan.dokumenty.find((dokument) => dokument.id === 'lista-1')?.czyUsunietyMiekko, true)
  assert.equal(stan.historia.some((wpis) => wpis.typ === 'migracja_historii'), true)
  assert.equal(stan.autosave.length, 1)
  assert.ok(magazyn.get('ultimatePomagier.backup.lokalny.v1.indeks'))
})
