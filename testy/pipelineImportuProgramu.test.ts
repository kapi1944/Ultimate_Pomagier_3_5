import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizujProgramSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia.ts'
import {
  importujTekstProgramu,
  przygotujZmianyImportuProgramu,
  zastosujZaakceptowaneZmianyImportuProgramu,
  utworzWynikImportuProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/pipelineImportuProgramu.ts'

function utworzProgram(dane: Partial<{ tytulSzkolenia: string; trescProgramu: string }> = {}) {
  return normalizujProgramSzkolenia({
    tytulSzkolenia: dane.tytulSzkolenia ?? '',
    trescProgramu: dane.trescProgramu ?? '',
  })
}

function utworzWynik(propozycje: Parameters<typeof utworzWynikImportuProgramu>[0]['propozycje']) {
  return utworzWynikImportuProgramu({ zrodlo: 'TEKST', propozycje, ostrzezenia: [], bledy: [] })
}

test('parser tekstu nie zmienia kanonicznego modelu ani storage', () => {
  const program = utworzProgram({ tytulSzkolenia: 'Program A', trescProgramu: '1. Własna treść' })
  const przed = JSON.stringify(program)
  let liczbaZapisow = 0
  globalThis.localStorage = { setItem: () => { liczbaZapisow += 1 } } as Storage

  const wynik = importujTekstProgramu('1. Program importowany\n- Zakres')

  assert.equal(wynik.propozycje[0].pole, 'trescProgramu')
  assert.equal(JSON.stringify(program), przed)
  assert.equal(liczbaZapisow, 0)
})

test('anulowanie importu pozostawia dokument bez zmian', () => {
  const program = utworzProgram({ tytulSzkolenia: 'Program A', trescProgramu: '1. Treść A' })
  const przed = JSON.stringify(program)
  importujTekstProgramu('1. Program B\n- Treść B')

  assert.equal(JSON.stringify(program), przed)
})

test('uzupełnianie wpisuje importowaną wartość wyłącznie do pustego pola', () => {
  const wynik = utworzWynik([{ pole: 'tytulSzkolenia', wartosc: 'Excel', pewnosc: 'PEWNE', wymagaDecyzjiUzytkownika: false }])
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram(), wynik)

  assert.equal(zastosowanie.model.tytulSzkolenia, 'Excel')
  assert.deepEqual(zastosowanie.zastosowanePola, ['tytulSzkolenia'])
})

test('uzupełnianie nie nadpisuje konfliktu', () => {
  const wynik = utworzWynik([{ pole: 'tytulSzkolenia', wartosc: 'Excel', pewnosc: 'PEWNE', wymagaDecyzjiUzytkownika: false }])
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram({ tytulSzkolenia: 'Excel zaawansowany' }), wynik)

  assert.equal(zastosowanie.model.tytulSzkolenia, 'Excel zaawansowany')
  assert.equal(zastosowanie.zmiany[0].stan, 'KONFLIKT')
  assert.deepEqual(zastosowanie.zastosowanePola, [])
})

test('świadome zastąpienie stosuje konflikt', () => {
  const wynik = utworzWynik([{ pole: 'tytulSzkolenia', wartosc: 'Excel', pewnosc: 'PEWNE', wymagaDecyzjiUzytkownika: false }])
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram({ tytulSzkolenia: 'Excel zaawansowany' }), wynik, 'ZASTAP')

  assert.equal(zastosowanie.model.tytulSzkolenia, 'Excel')
  assert.deepEqual(zastosowanie.zastosowanePola, ['tytulSzkolenia'])
})

test('niepewna propozycja zachowuje stan wymagający sprawdzenia do decyzji użytkownika', () => {
  const wynik = utworzWynik([{ pole: 'tytulSzkolenia', wartosc: 'Excel?', pewnosc: 'NIEPEWNE', wymagaDecyzjiUzytkownika: true }])
  const zmiany = przygotujZmianyImportuProgramu(utworzProgram(), wynik)

  assert.deepEqual(wynik.daneWymagajaceDecyzji, ['tytulSzkolenia'])
  assert.equal(zmiany[0].stan, 'WYMAGA_SPRAWDZENIA')
})

test('po zastosowaniu import korzysta z centralnej walidacji Programu', () => {
  const wynik = importujTekstProgramu('1. Wprowadzenie\n- Zakres')
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram(), wynik)

  assert.equal(zastosowanie.model.czyWynikParsowaniaZatwierdzony, false)
  assert.equal(zastosowanie.problemyWalidacji.some((problem) => problem.id === 'wynik-parsowania-niezatwierdzony'), true)
})

test('pipeline nie uruchamia autosave przed zastosowaniem kanonicznego modelu', () => {
  const wynik = importujTekstProgramu('1. Wprowadzenie\n- Zakres')
  let liczbaZapisow = 0
  globalThis.localStorage = { setItem: () => { liczbaZapisow += 1 } } as Storage

  zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram(), wynik)

  assert.equal(liczbaZapisow, 0)
})
