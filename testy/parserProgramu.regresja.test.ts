import assert from 'node:assert/strict'
import { parsujTekstProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/ParserTekstu.ts'

function policzPunkty(program: ReturnType<typeof parsujTekstProgramu>) {
  return program.dni.reduce(
    (suma, dzien) => suma + dzien.moduly.reduce((sumaModulow, modul) => sumaModulow + modul.podpunkty.length, 0),
    0,
  )
}

function sprawdz(nazwa: string, testRegresji: () => void) {
  testRegresji()
  console.log(`OK: ${nazwa}`)
}

sprawdz('program 1-dniowy bez nagłówka dnia i z ramkową separacją modułów zachowuje moduły', () => {
  const program = parsujTekstProgramu(`
Program szkolenia
1. Wprowadzenie do kontroli dokumentów
- Cel szkolenia
- Zakres odpowiedzialności
2. Warsztat rozpoznawania ryzyk
- Studium przypadku
- Omówienie rezultatów
`)

  assert.equal(program.dni.length, 1)
  assert.equal(program.dni[0].czyDomyslny, true)
  assert.equal(program.dni[0].moduly.length, 2)
  assert.equal(policzPunkty(program), 4)
  assert.equal(program.dni[0].moduly[0].tytul, '1. Wprowadzenie do kontroli dokumentów')
})

sprawdz('program 1-dniowy z nagłówkiem dnia nie myli dnia z punktem programu', () => {
  const program = parsujTekstProgramu(`
Dzień 1: Podstawy procesu
Moduł 1: Otwarcie szkolenia
- Cele dnia
- Mapa procesu
Moduł 2: Ćwiczenia praktyczne
- Praca w grupach
`)

  assert.equal(program.dni.length, 1)
  assert.equal(program.dni[0].czyDomyslny, false)
  assert.equal(program.dni[0].tytul, 'Dzień 1')
  assert.equal(program.dni[0].tytulDnia, 'Podstawy procesu')
  assert.equal(program.dni[0].moduly.length, 2)
  assert.equal(policzPunkty(program), 3)
})

sprawdz('program 2-dniowy z separatorem kolejnych pytań zachowuje dni i moduły', () => {
  const program = parsujTekstProgramu(`
Dzień 1: Analiza potrzeb
1. Jak rozpoznać wymagania klienta
- Pytania kontrolne
- Dane wejściowe
Dzień 2: Projektowanie rozwiązania
1. Jak dobrać dokumenty
- Lista decyzji
- Ryzyka eksportu
2. Jak zatwierdzić wynik
- Checklista jakości
`)

  assert.equal(program.dni.length, 2)
  assert.equal(program.dni[0].moduly.length, 1)
  assert.equal(program.dni[1].moduly.length, 2)
  assert.equal(policzPunkty(program), 5)
  assert.equal(program.dni[1].moduly[1].podpunkty[0].tresc, 'Checklista jakości')
})

sprawdz('program 3-dniowy bez separacji modułów nie spłaszcza list zagnieżdżonych', () => {
  const program = parsujTekstProgramu(`
Dzień 1: Fundamenty
## Moduł otwierający
- Kontekst
  - Definicje
Dzień 2: Praktyka
## Moduł warsztatowy
- Ćwiczenie
  - Omówienie rezultatów
Dzień 3: Podsumowanie
## Moduł zamykający
- Plan wdrożenia
`)

  assert.equal(program.dni.length, 3)
  assert.equal(program.dni.every((dzien) => dzien.moduly.length === 1), true)
  assert.equal(policzPunkty(program), 5)
  assert.equal(program.dni[0].moduly[0].podpunkty[1].poziom, 1)
  assert.equal(program.dni[1].moduly[0].podpunkty[1].tresc, 'Omówienie rezultatów')
})
