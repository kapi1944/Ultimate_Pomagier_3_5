import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizujProgramSzkolenia, parsujProgramZModelu, utworzDokumentProgramuSzkolenia, walidujProgramSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia.ts'
import type { BlokDokumentu } from '../src/wspolne/dokumenty/modelBlokowy.ts'
import {
  paginujProgram,
  utworzModelPaginacjiProgramu,
  type DzienPaginacjiProgramu,
  type ModelPaginacjiProgramu,
  type PomiaryPaginacjiProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/paginatorProgramu.ts'

const trescWartosciowania = `Dyrektywa UE dotycząca równości wynagrodzeń – podstawy prawne i obowiązki pracodawcy
• Założenia regulacji dotyczących równości i przejrzystości wynagrodzeń.
• Obowiązki pracodawców wynikające z przepisów unijnych.
• Dyrektywa UE a obowiązujące przepisy Kodeksu pracy oraz kierunki zmian w polskim prawie.
• Ryzyka prawne związane z nierównym wynagradzaniem pracowników.

Kryteria i metody wartościowania stanowisk pracy
• Kryteria wartościowania stanowisk wynikające z Dyrektywy UE oraz stosowane w praktyce organizacyjnej.
• Projektowanie obiektywnych, neutralnych i przejrzystych kryteriów wartościowania.
• Przegląd najczęściej stosowanych metod wartościowania stanowisk.
• Dobór odpowiedniej metody do specyfiki organizacji i struktury zatrudnienia.
• Zalety, ograniczenia oraz zgodność poszczególnych metod z wymaganiami Dyrektywy UE.

Przygotowanie procesu wartościowania stanowisk pracy
• Znaczenie opisów stanowisk pracy i zakresów obowiązków w procesie wartościowania.
• Wykorzystanie struktury organizacyjnej, regulaminów i innych źródeł informacji.
• Postępowanie w przypadku niepełnej lub nieaktualnej dokumentacji.
• Najważniejsze elementy przygotowania i planowania procesu wartościowania.

Praktyczne przeprowadzenie wartościowania stanowisk
• Role i odpowiedzialność HR, osób wartościujących oraz osób odpowiedzialnych za koordynację procesu.
• Ocena stanowisk, porównywanie wyników i kalibracja ocen.
• Dokumentowanie procesu wartościowania.
• Zapewnienie spójności, porównywalności i transparentności wyników.
• Uproszczone wartościowanie wybranych stanowisk – praktyczne podejście do procesu.

Wartościowanie stanowiska a system wynagrodzeń i zarządzanie organizacją
• Wartościowanie stanowisk a system wynagrodzeń i zarządzanie organizacją.
• Powiązanie wartościowania stanowisk z systemem wynagrodzeń.
• Znaczenie gradacji stanowisk i budowania struktury wynagrodzeń.`

test('Wartościowanie stanowisk pracy: API generatora zachowuje pięć modułów i wszystkie 21 punktów', () => {
  const model = normalizujProgramSzkolenia({ trescProgramu: trescWartosciowania })
  const program = parsujProgramZModelu(model)
  const sekcje = trescWartosciowania.split('\n\n').map((sekcja) => sekcja.split('\n'))
  const moduly = program.dni.flatMap((dzien) => dzien.moduly)
  assert.equal(program.listaProsta.length, 0)
  assert.equal(moduly.length, 5)
  assert.deepEqual(moduly.map((modul) => modul.tytul), sekcje.map(([tytul]) => tytul))
  assert.deepEqual(moduly.map((modul) => modul.podpunkty.map((punkt) => punkt.tresc)), sekcje.map(([, ...punkty]) => punkty.map((punkt) => punkt.slice(2))))
  assert.equal(moduly.flatMap((modul) => modul.podpunkty).length, 21)
  const blokiModulow = program.dokumentBlokowy.struktura.filter((blok) => blok.typ === 'Dzien').flatMap((dzien) => dzien.dzieci.filter((blok) => blok.typ === 'Modul'))
  assert.deepEqual(blokiModulow.map((blok) => [blok.id, blok.tresc, blok.dzieci.map((punkt) => [punkt.id, punkt.tresc])]), moduly.map((modul) => [modul.id, modul.tytul, modul.podpunkty.map((punkt) => [punkt.id, punkt.tresc])]))
  const dokument = utworzDokumentProgramuSzkolenia(model, program)
  const modelPaginacji = utworzModelPaginacjiProgramu(dokument)
  assert.equal(modelPaginacji.dni.flatMap((dzien) => dzien.moduly).length, 5)
  assert.ok(modelPaginacji.dni.flatMap((dzien) => dzien.moduly).every((modul, indeks) => modul.grupyPunktow.length === sekcje[indeks].length - 1))
  const punktyPaginacji = modelPaginacji.dni.flatMap((dzien) => dzien.moduly.flatMap((modul) => modul.grupyPunktow.flatMap((grupa) => grupa.bloki)))
  assert.deepEqual(punktyPaginacji.map((blok) => blok.tresc), moduly.flatMap((modul) => modul.podpunkty.map((punkt) => punkt.tresc)))
  const wynik = paginujProgram(modelPaginacji, utworzPomiary(modelPaginacji, 100, 35))
  assert.ok(wynik.strony.length > 1)
  assert.ok(wynik.strony.every((strona) => strona.fragmentyDni.length))
  assert.deepEqual(wynik.strony.flatMap((strona) => strona.fragmentyDni.flatMap((dzien) => dzien.moduly.flatMap((modul) => modul.grupyPunktow.flatMap((grupa) => grupa.bloki.map((blok) => blok.id))))), punktyPaginacji.map((blok) => blok.id))
})

test('awaryjna paginacja dużej grupy zachowuje każdy blok w kolejności', () => {
  const modul = utworzModul('duza-grupa', 30)
  const bloki = modul.grupyPunktow.flatMap((grupa) => grupa.bloki)
  modul.grupyPunktow = [{ id: 'duza-grupa-punktow', bloki }]
  const model = { dni: [utworzDzien('dzien', [modul])] }
  const wynik = paginujProgram(model, utworzPomiary(model, 100, 900))
  assert.ok(wynik.strony.length > 1)
  assert.deepEqual(wynik.strony.flatMap((strona) => strona.fragmentyDni.flatMap((dzien) => dzien.moduly.flatMap((fragment) => fragment.grupyPunktow.flatMap((grupa) => grupa.bloki.map((blok) => blok.id))))), bloki.map((blok) => blok.id))
  assert.ok(wynik.problemy.some((problem) => /awaryjn/i.test(problem.komunikat)))
})

test('kontrakt wykrywa bloki poza strukturą paginacji i zachowuje treść bez ponownego parsowania', () => {
  const dane = normalizujProgramSzkolenia({ trescProgramu: trescWartosciowania, czyWynikParsowaniaZatwierdzony: true })
  const dokument = utworzDokumentProgramuSzkolenia(dane)
  dokument.struktura = dokument.struktura.flatMap((blok) => blok.typ === 'Dzien' ? blok.dzieci : [blok])
  const model = utworzModelPaginacjiProgramu(dokument, dane.trescProgramu)
  assert.equal(model.problemy?.[0].id, 'niespojna-paginacja-programu')
  assert.ok(walidujProgramSzkolenia(dane, dokument).some((problem) => problem.id === 'niespojna-paginacja-programu'))
  const wynik = paginujProgram(model, utworzPomiary(model))
  assert.deepEqual(wynik.strony.flatMap((strona) => strona.fragmentyDni.flatMap((dzien) => dzien.moduly.flatMap((modul) => modul.grupyPunktow.flatMap((grupa) => grupa.bloki.map((blok) => blok.tresc))))), trescWartosciowania.split('\n').filter(Boolean).map((wiersz) => wiersz.replace(/^• /, '')))
})

test('ręczne poziomy i oznaczenia nadpisują listę, zachowując mieszane moduły', () => {
  const dane = normalizujProgramSzkolenia({
    trescProgramu: 'Moduł 1: Wprowadzenie\n• Pierwszy punkt\n  - Zagnieżdżony punkt\n\nPraktyczne zastosowanie\n• Drugi punkt\n\nRęcznie ustawiony podpunkt\n• Trzeci punkt',
    ustawieniaWierszyProgramu: [ {}, { poziom: 0, styl: 'brak' }, { poziom: 2, styl: 'literowe)' }, {}, {}, { poziom: 1 }, {}, { poziom: 2 } ],
  })
  const program = parsujProgramZModelu(dane)
  const moduly = program.dni.flatMap((dzien) => dzien.moduly)
  assert.deepEqual(moduly.map((modul) => modul.tytul), ['Moduł 1: Wprowadzenie', 'Praktyczne zastosowanie'])
  assert.deepEqual(moduly[0].podpunkty.map((punkt) => punkt.poziom), [0, 2])
  assert.deepEqual(moduly[1].podpunkty.map((punkt) => punkt.tresc), ['Drugi punkt', 'Ręcznie ustawiony podpunkt', 'Trzeci punkt'])
  assert.equal(moduly[1].podpunkty[1].poziom, 2)
  const dokument = utworzDokumentProgramuSzkolenia(dane, program)
  assert.equal(dokument.struktura[1].dzieci[0].dzieci[0].dane?.oznaczenieWyswietlane, '')
  assert.equal(dokument.struktura[1].dzieci[0].dzieci[1].dane?.oznaczenieWyswietlane, 'a)')
})

test('granice akapitów chronią nagłówki przed scaleniem z niedokończonym punktem', () => {
  const dane = normalizujProgramSzkolenia({ trescProgramu: 'Pierwsza sekcja\n• Długi punkt bez kropki wymagający dalszego omówienia i szczegółowego wyjaśnienia\n\nDruga sekcja\n• Kolejny punkt' })
  assert.deepEqual(parsujProgramZModelu(dane).dni[0].moduly.map((modul) => modul.tytul), ['Pierwsza sekcja', 'Druga sekcja'])
})

test('API generatora obsługuje jawne, numerowane i mieszane nagłówki oraz punktory', () => {
  for (const naglowek of ['Moduł 1: Pierwsza sekcja', 'Blok 1: Pierwsza sekcja', 'Rozdział 1: Pierwsza sekcja', '1. Pierwsza sekcja', '1) Pierwsza sekcja', 'I. Pierwsza sekcja', '## Pierwsza sekcja']) {
    for (const punktor of ['•', '-', '–', '*', '◦']) {
      const dane = normalizujProgramSzkolenia({ trescProgramu: `${naglowek}\n${punktor} Pierwszy punkt\n\nDruga sekcja\n${punktor} Drugi punkt\n\n2) Trzecia sekcja\n${punktor} Trzeci punkt` })
      const moduly = parsujProgramZModelu(dane).dni.flatMap((dzien) => dzien.moduly)
      assert.equal(moduly.length, 3, `${naglowek}, ${punktor}`)
      assert.deepEqual(moduly.map((modul) => modul.podpunkty.map((punkt) => punkt.tresc)), [['Pierwszy punkt'], ['Drugi punkt'], ['Trzeci punkt']])
      assert.ok(moduly.every((modul) => modul.podpunkty[0].oznaczenie?.zapis === punktor))
    }
  }
  for (const liczbaDni of [1, 2, 3]) {
    const trescProgramu = Array.from({ length: liczbaDni }, (_, indeks) => `Dzień ${indeks + 1}\nPierwsza sekcja\n• Punkt\n\nDruga sekcja\n• Kolejny punkt`).join('\n\n')
    assert.deepEqual(parsujProgramZModelu(normalizujProgramSzkolenia({ trescProgramu })).dni.map((dzien) => dzien.moduly.length), Array(liczbaDni).fill(2))
  }
})

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
  assert.equal(wynik.strony[0].fragmentyDni[0].moduly[0].grupyPunktow[0].bloki[0].id, 'modul-1-punkt-1')
})

test('reprezentatywne modele dają 1, 2 oraz co najmniej 3 strony', () => {
  const jeden: ModelPaginacjiProgramu = { dni: [utworzDzien('jeden', [utworzModul('jeden-modul', 2)])] }
  const dwa: ModelPaginacjiProgramu = { dni: [utworzDzien('dwa', [utworzModul('dwa-modul', 5)])] }
  const trzy: ModelPaginacjiProgramu = { dni: [utworzDzien('trzy', [utworzModul('trzy-modul', 9)])] }

  assert.equal(paginujProgram(jeden, utworzPomiary(jeden, 100, 20)).strony.length, 1)
  assert.equal(paginujProgram(dwa, utworzPomiary(dwa, 100, 30)).strony.length, 2)
  assert.ok(paginujProgram(trzy, utworzPomiary(trzy, 100, 30)).strony.length >= 3)
})
