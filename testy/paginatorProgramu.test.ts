import assert from 'node:assert/strict'
import test from 'node:test'
import type { BlokDokumentu } from '../src/wspolne/dokumenty/modelBlokowy.ts'
import {
  paginujProgram,
  type DzienPaginacjiProgramu,
  type ModelPaginacjiProgramu,
  type PomiaryPaginacjiProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/paginatorProgramu.ts'

function utworzPunkt(id: string): BlokDokumentu {
  return { id, typ: 'Punkt', tresc: id, dzieci: [], metadane: { poziom: 0 }, stylLokalny: { wciecie: 0 }, statusDiagnostyczny: 'poprawny' }
}

function utworzModul(id: string, liczbaPunktow: number) {
  const punkty = Array.from({ length: liczbaPunktow }, (_, indeks) => utworzPunkt(`${id}-punkt-${indeks + 1}`))
  const blok: BlokDokumentu = { id, typ: 'Modul', tresc: id, dzieci: punkty, metadane: {}, stylLokalny: {}, statusDiagnostyczny: 'poprawny' }

  return {
    id,
    blok,
    grupyPunktow: punkty.map((punkt) => ({ id: `grupa-${punkt.id}`, bloki: [punkt] })),
  }
}

function utworzDzien(id: string, moduly: ReturnType<typeof utworzModul>[], zNaglowkiem = false): DzienPaginacjiProgramu {
  return {
    id,
    blok: zNaglowkiem ? { id: `${id}-blok`, typ: 'Dzien', tresc: id, dzieci: [], metadane: {}, stylLokalny: {}, statusDiagnostyczny: 'poprawny' } : undefined,
    moduly,
  }
}

function utworzPomiary(model: ModelPaginacjiProgramu, pojemnosc = 100, wysokoscPunktu = 20): PomiaryPaginacjiProgramu {
  return {
    pojemnoscPierwszejStrony: pojemnosc,
    pojemnoscKolejnychStron: pojemnosc,
    wysokosciNaglowkowDni: Object.fromEntries(model.dni.map((dzien) => [dzien.id, 20])),
    wysokoscOdstepuMiedzyDniami: 5,
    wysokoscOdstepuMiedzyModulami: 5,
    wysokoscOdstepuMiedzyPunktami: 2,
    moduly: Object.fromEntries(
      model.dni.flatMap((dzien) => dzien.moduly).map((modul) => {
        const wysokosciGrup = Object.fromEntries(modul.grupyPunktow.map((grupa) => [grupa.id, wysokoscPunktu]))
        const wysokoscCalego = 10 + modul.grupyPunktow.length * wysokoscPunktu + Math.max(0, modul.grupyPunktow.length - 1) * 2

        return [modul.id, {
          wysokoscCalego,
          wysokoscBazyZTytulem: 10,
          wysokoscBazyBezTytulu: 2,
          wysokosciGrup,
        }]
      }),
    ),
  }
}

test('paginator pozostawia cały moduł na bieżącej stronie, gdy rzeczywiście się mieści', () => {
  const model: ModelPaginacjiProgramu = { dni: [utworzDzien('dzien-1', [utworzModul('modul-1', 2)])] }
  const wynik = paginujProgram(model, utworzPomiary(model))

  assert.equal(wynik.strony.length, 1)
  assert.equal(wynik.strony[0].fragmentyDni[0].moduly[0].grupyPunktow.length, 2)
})

test('paginator przenosi cały moduł na kolejną pustą stronę', () => {
  const model: ModelPaginacjiProgramu = { dni: [utworzDzien('dzien-1', [utworzModul('modul-1', 2), utworzModul('modul-2', 3)])] }
  const wynik = paginujProgram(model, utworzPomiary(model, 100, 20))

  assert.equal(wynik.strony.length, 2)
  assert.equal(wynik.strony[0].fragmentyDni[0].moduly[0].modul.id, 'modul-1')
  assert.equal(wynik.strony[1].fragmentyDni[0].moduly[0].modul.id, 'modul-2')
})

test('bardzo duży moduł dzieli się wyłącznie pomiędzy grupami punktów', () => {
  const model: ModelPaginacjiProgramu = { dni: [utworzDzien('dzien-1', [utworzModul('modul-1', 4)])] }
  const wynik = paginujProgram(model, utworzPomiary(model, 100, 40))

  assert.equal(wynik.strony.length, 2)
  assert.deepEqual(wynik.strony.map((strona) => strona.fragmentyDni[0].moduly[0].grupyPunktow.length), [2, 2])
  assert.equal(wynik.strony[1].fragmentyDni[0].moduly[0].czyPokazacTytul, false)
})

test('numeracja kontynuuje się po podziale modułu', () => {
  const model: ModelPaginacjiProgramu = { dni: [utworzDzien('dzien-1', [utworzModul('modul-1', 6)])] }
  const wynik = paginujProgram(model, utworzPomiary(model, 90, 25))

  assert.equal(wynik.strony.length, 2)
  assert.deepEqual(wynik.strony.map((strona) => strona.fragmentyDni[0].moduly[0].poczatkowyIndeksNumeracji), [0, 3])
})

test('nagłówek dnia przechodzi razem z pierwszym modułem', () => {
  const model: ModelPaginacjiProgramu = {
    dni: [
      utworzDzien('dzien-1', [utworzModul('modul-1', 2)]),
      utworzDzien('dzien-2', [utworzModul('modul-2', 2)], true),
    ],
  }
  const wynik = paginujProgram(model, utworzPomiary(model, 100, 20))

  assert.equal(wynik.strony.length, 2)
  assert.equal(wynik.strony[1].fragmentyDni[0].czyPokazacNaglowek, true)
  assert.equal(wynik.strony[1].fragmentyDni[0].moduly.length, 1)
})

test('zbyt wysoki pojedynczy punkt zgłasza problem bez pętli', () => {
  const model: ModelPaginacjiProgramu = { dni: [utworzDzien('dzien-1', [utworzModul('modul-1', 1)])] }
  const wynik = paginujProgram(model, utworzPomiary(model, 100, 200))

  assert.equal(wynik.problemy.length, 1)
  assert.match(wynik.problemy[0].komunikat, /Pojedynczy punkt/)
  assert.ok(wynik.strony.length <= 1)
})

test('reprezentatywne modele dają 1, 2 oraz co najmniej 3 strony', () => {
  const jeden: ModelPaginacjiProgramu = { dni: [utworzDzien('jeden', [utworzModul('jeden-modul', 2)])] }
  const dwa: ModelPaginacjiProgramu = { dni: [utworzDzien('dwa', [utworzModul('dwa-modul', 5)])] }
  const trzy: ModelPaginacjiProgramu = { dni: [utworzDzien('trzy', [utworzModul('trzy-modul', 9)])] }

  assert.equal(paginujProgram(jeden, utworzPomiary(jeden, 100, 20)).strony.length, 1)
  assert.equal(paginujProgram(dwa, utworzPomiary(dwa, 100, 30)).strony.length, 2)
  assert.ok(paginujProgram(trzy, utworzPomiary(trzy, 100, 30)).strony.length >= 3)
})
