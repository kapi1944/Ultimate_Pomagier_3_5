import assert from 'node:assert/strict'
import test from 'node:test'
import { migrujStarszeDokumenty } from '../src/wspolne/dokumenty/migracjaStarszychDokumentow.ts'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import { kluczRejestruDokumentow, pobierzStanRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { kluczRepozytoriumDokumentow } from '../src/wspolne/dokumenty/repozytoriumDokumentow.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

function ustawLegacy(dokumenty: unknown[], historia: unknown[] = []) {
  magazyn.set(kluczRepozytoriumDokumentow, JSON.stringify({ dokumenty, historia }))
}

function legacyLista(id = 'lista-legacy') {
  return {
    id,
    typGeneratora: 'listy_obecnosci',
    tytul: 'Lista obecności legacy',
    stanCyklu: 'kopia_robocza',
    statusBiznesowy: 'ROBOCZY',
    utworzono: '2026-08-01T10:00:00.000Z',
    zaktualizowano: '2026-08-01T10:00:00.000Z',
    widocznosc: 'zespol',
    zrodlo: 'nowy',
    rekordZrodlowyId: 'szczegoly-1',
    wersjaFormatu: 'lista-obecnosci-z-integracji-v1',
    daneDokumentu: {
      daneZrodlowe: { tytulSzkolenia: 'Bezpieczna praca', uczestnicy: [{ id: 'uczestnik-1' }] },
      powiazanieZeZrodlem: { szczegolyOrganizacyjneId: 'szczegoly-1', grupaId: 'grupa-1', odciskDanych: 'odcisk-1' },
      korektyReczne: { tytulSzkolenia: 'Ręczna korekta' },
    },
    metadaneGeneratora: {
      szczegolyOrganizacyjneId: 'szczegoly-1',
      wersjaSzczegolowId: 'wersja-1',
      odciskDanych: 'odcisk-1',
      grupaId: 'grupa-1',
      typDokumentu: 'LISTA_OBECNOSCI',
      wersja: 1,
    },
  }
}

test('ponowna migracja legacy nie tworzy dodatkowego dokumentu', () => {
  magazyn.clear()
  ustawLegacy([legacyLista()])

  migrujStarszeDokumenty()
  migrujStarszeDokumenty()

  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => dokument.typ === 'LISTA_OBECNOSCI').length, 1)
})

test('migracja przenosi Listę obecności z legacy do nowego rejestru', () => {
  magazyn.clear()
  ustawLegacy([legacyLista()])

  migrujStarszeDokumenty()

  assert.equal(repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => dokument.typ === 'LISTA_OBECNOSCI').length, 1)
})

test('historia Programów i Szczegółów trafia do nowego rejestru', () => {
  magazyn.clear()
  ustawLegacy([legacyLista()], [
    { id: 'historia-programu', typGeneratora: 'programy_szkolen', dokumentId: 'program-1', data: '2026-08-01T10:00:00.000Z', dane: { typOperacji: 'utworzenie_kopii' } },
    { id: 'historia-szczegolow', typGeneratora: 'szczegoly_organizacyjne', dokumentId: 'szczegoly-1', data: '2026-08-01T10:00:00.000Z', dane: { typ: 'wersja' } },
  ])

  migrujStarszeDokumenty()

  const stan = JSON.parse(magazyn.get(kluczRejestruDokumentow) ?? '{}') as { historia?: Array<{ typ?: string }> }
  assert.equal(stan.historia?.filter((wpis) => wpis.typ === 'migracja_historii').length, 2)
})

test('trzy przebiegi zachowują dokumenty, historię, autosave, kopie, ID i mapowanie bez duplikatów', () => {
  magazyn.clear()
  const dokumentKolizyjny = utworzNowyDokument({ id: 'program-1', typ: 'ANKIETA', tytul: 'Istniejący dokument', generatorId: 'ankiety', daneDokumentu: {}, ustawieniaDokumentu: {} })
  magazyn.set(kluczRejestruDokumentow, JSON.stringify({ wersja: 3, dokumenty: [dokumentKolizyjny], kopieRobocze: [], autosave: [], historia: [], migracje: [] }))
  ustawLegacy([
    { id: 'program-1', typGeneratora: 'programy_szkolen', tytul: 'Program opublikowany', stanCyklu: 'opublikowany', opublikowano: '2026-08-02T10:00:00.000Z', daneDokumentu: { moduly: ['modul-1'] }, metadaneGeneratora: {} },
    { id: 'szczegoly-1', typGeneratora: 'szczegoly_organizacyjne', tytul: 'Szczegóły archiwalne', stanCyklu: 'archiwalny', daneDokumentu: { tytulSzkolenia: 'Szkolenie' }, metadaneGeneratora: {} },
    { ...legacyLista('lista-1'), stanCyklu: 'kosz', usunieto: '2026-08-03T10:00:00.000Z', daneDokumentu: { ...legacyLista('lista-1').daneDokumentu, szkolenieId: 'szkolenie-1' } },
  ], [
    { id: 'historia-programu', typGeneratora: 'programy_szkolen', dokumentId: 'program-1', data: '2026-08-03T10:00:00.000Z', dane: { moduly: [] } },
    { id: 'historia-szczegolow', typGeneratora: 'szczegoly_organizacyjne', dokumentId: 'szczegoly-1', data: '2026-08-03T10:00:00.000Z', dane: { status: 'wersja' } },
  ])
  magazyn.set('ultimatePomagier.programySzkolen.autosave.v1', JSON.stringify({ aktywnaKopiaId: 'program-1', daneDokumentu: { roboczy: true }, zapisano: '2026-08-04T10:00:00.000Z' }))
  magazyn.set('ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze', JSON.stringify([{ id: 'kopia-szczegolow-1', dataZapisu: '2026-08-04T10:00:00.000Z', dane: { tytulSzkolenia: 'Kopia szczegółów' } }]))

  const pierwszyRaport = migrujStarszeDokumenty()
  const pierwszyStan = pobierzStanRejestruDokumentow()
  const migawka = { dokumenty: pierwszyStan.dokumenty.length, historia: pierwszyStan.historia.length, autosave: pierwszyStan.autosave.length, kopieRobocze: pierwszyStan.kopieRobocze.length, id: pierwszyStan.dokumenty.map((dokument) => dokument.id).sort(), mapowanie: pierwszyRaport.mapowanieId }
  const drugiRaport = migrujStarszeDokumenty()
  const drugiStan = pobierzStanRejestruDokumentow()
  const trzeciRaport = migrujStarszeDokumenty()
  const trzeciStan = pobierzStanRejestruDokumentow()
  const migawkaStanu = (stan: typeof pierwszyStan) => ({ dokumenty: stan.dokumenty.length, historia: stan.historia.length, autosave: stan.autosave.length, kopieRobocze: stan.kopieRobocze.length, id: stan.dokumenty.map((dokument) => dokument.id).sort() })
  const oczekiwanaMigawka = { dokumenty: migawka.dokumenty, historia: migawka.historia, autosave: migawka.autosave, kopieRobocze: migawka.kopieRobocze, id: migawka.id }

  assert.deepEqual(migawkaStanu(drugiStan), oczekiwanaMigawka)
  assert.deepEqual(migawkaStanu(trzeciStan), oczekiwanaMigawka)
  assert.deepEqual(drugiRaport.mapowanieId, pierwszyRaport.mapowanieId)
  assert.deepEqual(trzeciRaport.mapowanieId, pierwszyRaport.mapowanieId)
  assert.equal(drugiRaport.dokumenty + drugiRaport.historia + drugiRaport.autosave, 0)
  assert.equal(trzeciRaport.dokumenty + trzeciRaport.historia + trzeciRaport.autosave, 0)
  const programId = pierwszyRaport.mapowanieId['legacy:programy_szkolen:program-1']
  assert.notEqual(programId, 'program-1')
  assert.equal(pierwszyStan.dokumenty.find((dokument) => dokument.id === programId)?.status, 'OPUBLIKOWANY')
  assert.equal(pierwszyStan.dokumenty.find((dokument) => dokument.id === 'szczegoly-1')?.czyZarchiwizowany, true)
  const lista = pierwszyStan.dokumenty.find((dokument) => dokument.id === 'lista-1')
  assert.equal(lista?.czyUsunietyMiekko, true)
  assert.equal(lista?.powiazania.grupaId, 'grupa-1')
  assert.equal(lista?.powiazania.szczegolyOrganizacyjneId, 'szczegoly-1')
  assert.equal(lista?.szkolenieId, 'szkolenie-1')
  assert.deepEqual(lista?.integralnosc.reczneNadpisania, { tytulSzkolenia: 'Ręczna korekta' })
  assert.equal(pierwszyStan.historia.some((wpis) => wpis.dokumentId === programId), true)
})
