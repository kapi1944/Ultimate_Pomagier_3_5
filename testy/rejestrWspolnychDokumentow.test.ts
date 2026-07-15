import assert from 'node:assert/strict'
import test from 'node:test'
import { filtrujDokumenty, sortujDokumenty } from '../src/wspolne/dokumenty/filtryDokumentow.ts'
import { pobierzStanWartosciDokumentu, utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import {
  kluczKopiiBezpieczenstwaRejestruDokumentow,
  kluczRejestruDokumentow,
  repozytoriumWspolnychDokumentow,
} from '../src/wspolne/dokumenty/rejestrDokumentow.ts'

const magazyn = new Map<string, string>()

globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

function utworzDokument(id: string, typ: 'PROGRAM_SZKOLENIA' | 'ANKIETA' = 'PROGRAM_SZKOLENIA') {
  return utworzNowyDokument({
    id,
    typ,
    tytul: `Dokument ${id}`,
    generatorId: typ === 'PROGRAM_SZKOLENIA' ? 'programy_szkolen' : 'ankiety',
    daneDokumentu: {},
    ustawieniaDokumentu: {},
  })
}

test('rejestr tworzy, aktualizuje, archiwizuje i usuwa miekko dokument', () => {
  magazyn.clear()
  const utworzony = repozytoriumWspolnychDokumentow.utworz(utworzDokument('program-1'))

  const zaktualizowany = repozytoriumWspolnychDokumentow.aktualizuj(utworzony.id, { tytul: 'Program po korekcie' })
  assert.equal(zaktualizowany?.tytul, 'Program po korekcie')
  assert.equal(zaktualizowany?.id, utworzony.id)

  const zarchiwizowany = repozytoriumWspolnychDokumentow.archiwizuj(utworzony.id)
  assert.equal(zarchiwizowany?.status, 'ZARCHIWIZOWANY')
  assert.equal(zarchiwizowany?.czyZarchiwizowany, true)

  const przywrocony = repozytoriumWspolnychDokumentow.przywroc(utworzony.id)
  assert.equal(przywrocony?.czyZarchiwizowany, false)
  assert.equal(przywrocony?.status, 'GOTOWY')

  const usuniety = repozytoriumWspolnychDokumentow.usunMiekko(utworzony.id)
  assert.equal(usuniety?.czyUsunietyMiekko, true)
  assert.ok(usuniety?.usunieto)
})

test('rejestr pomija uszkodzony rekord bez utraty pozostalych dokumentow', () => {
  magazyn.clear()
  const poprawny = utworzDokument('poprawny')
  magazyn.set(kluczRejestruDokumentow, JSON.stringify({ wersja: 1, dokumenty: [poprawny, { id: 'uszkodzony' }] }))

  const dokumenty = repozytoriumWspolnychDokumentow.pobierzWszystkie()

  assert.equal(dokumenty.length, 1)
  assert.equal(dokumenty[0].id, 'poprawny')
})

test('migracja tworzy kopie bezpieczenstwa przed zapisem nowej wersji rejestru', () => {
  magazyn.clear()
  const zapisWersjiZero = JSON.stringify({ wersja: 0, dokumenty: [utworzDokument('z-migracji')] })
  magazyn.set(kluczRejestruDokumentow, zapisWersjiZero)

  const dokumenty = repozytoriumWspolnychDokumentow.pobierzWszystkie()

  assert.equal(dokumenty[0]?.id, 'z-migracji')
  assert.equal(magazyn.get(kluczKopiiBezpieczenstwaRejestruDokumentow), zapisWersjiZero)
  assert.match(magazyn.get(kluczRejestruDokumentow) ?? '', /"wersja":1/)
})

test('filtry i sortowanie pozostaja czystymi funkcjami', () => {
  const program = { ...utworzDokument('program'), szkolenieId: 'szkolenie-1', wlascicielId: 'uzytkownik-1', zmodyfikowano: '2026-07-14T10:00:00.000Z' }
  const ankieta = { ...utworzDokument('ankieta', 'ANKIETA'), klientId: 'klient-1', zmodyfikowano: '2026-07-13T10:00:00.000Z' }

  assert.deepEqual(filtrujDokumenty([program, ankieta], { typ: 'PROGRAM_SZKOLENIA', szkolenieId: 'szkolenie-1' }).map((dokument) => dokument.id), ['program'])
  assert.deepEqual(filtrujDokumenty([program, ankieta], { tekst: 'ankieta' }).map((dokument) => dokument.id), ['ankieta'])
  assert.deepEqual(sortujDokumenty([ankieta, program], 'ZMODYFIKOWANO_MALEJACO').map((dokument) => dokument.id), ['program', 'ankieta'])
})

test('kopia robocza zachowuje wlasne dane i nie usuwa dokumentu nadrzednego', () => {
  magazyn.clear()
  const dokument = repozytoriumWspolnychDokumentow.utworz(utworzDokument('dokument-nadrzedny'))
  const kopia = repozytoriumWspolnychDokumentow.utworzKopieRobocza({
    dokumentNadrzednyId: dokument.id,
    czyNowyDokument: false,
    daneDokumentu: { tytul: 'Wersja robocza' },
    reczneNadpisania: { tytul: 'Wersja robocza' },
  })

  const odczytana = repozytoriumWspolnychDokumentow.pobierzKopieRobocza(kopia.id)
  assert.deepEqual(odczytana?.daneDokumentu, { tytul: 'Wersja robocza' })
  assert.deepEqual(odczytana?.reczneNadpisania, { tytul: 'Wersja robocza' })
  assert.equal(repozytoriumWspolnychDokumentow.usunKopieRobocza(kopia.id), true)
  assert.equal(repozytoriumWspolnychDokumentow.pobierzPoId(dokument.id)?.id, dokument.id)
})

test('rozroznia zrodlo, reczne nadpisanie i nowsze dane Szczegolow bez kolizji identyfikatorow', () => {
  magazyn.clear()
  const dokument = repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({
    typ: 'LISTA_OBECNOSCI',
    tytul: 'Lista',
    generatorId: 'listy_obecnosci',
    daneDokumentu: {},
    ustawieniaDokumentu: {},
    integralnosc: {
      powiazanieZeSzczegolami: 'POWIAZANY_ZE_SZCZEGOLAMI',
      idZrodlowychSzczegolow: 'szczegoly-1',
      znacznikDanychZrodlowych: 'wersja-1',
    },
  }))
  const kopiaPierwsza = repozytoriumWspolnychDokumentow.utworzKopieRobocza({ dokumentNadrzednyId: null, czyNowyDokument: true, daneDokumentu: {}, reczneNadpisania: {} })
  const kopiaDruga = repozytoriumWspolnychDokumentow.utworzKopieRobocza({ dokumentNadrzednyId: null, czyNowyDokument: true, daneDokumentu: {}, reczneNadpisania: {} })
  const odswiezony = repozytoriumWspolnychDokumentow.odswiezDostepnoscDanychZrodlowych(dokument.id, 'wersja-2')

  assert.notEqual(kopiaPierwsza.id, kopiaDruga.id)
  assert.notEqual(kopiaPierwsza.id, dokument.id)
  assert.equal(odswiezony?.integralnosc.czyDaneZrodloweNowsze, true)
  assert.equal(pobierzStanWartosciDokumentu(false, false), 'POBRANA_ZE_ZRODLA')
  assert.equal(pobierzStanWartosciDokumentu(true, false), 'RECZNIE_NADPISANA')
  assert.equal(pobierzStanWartosciDokumentu(false, true), 'NIEAKTUALNA_WZGLEM_ZRODLA')
})