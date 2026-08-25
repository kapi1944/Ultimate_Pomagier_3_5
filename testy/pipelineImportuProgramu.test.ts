import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizujProgramSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia.ts'
import {
  importujTekstProgramu,
  pobierzDomyslnieZaakceptowanePolaImportuProgramu,
  przygotujZmianyImportuProgramu,
  zastosujZaakceptowaneZmianyImportuProgramu,
  utworzWynikImportuProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/pipelineImportuProgramu.ts'
import { importujDocxProgramu, utworzWynikImportuProgramuZTekstuDocx } from '../src/moduly/dokumenty/generatory/programy_szkolen/adapterDocxProgramu.ts'
import { importujPdfProgramu, normalizujTekstPdf, utworzWynikImportuProgramuZTekstuPdf, wyodrebnijTekstPdf } from '../src/moduly/dokumenty/generatory/programy_szkolen/adapterPdfProgramu.ts'

function utworzProgram(dane: Partial<{ tytulSzkolenia: string; trescProgramu: string }> = {}) {
  return normalizujProgramSzkolenia({
    tytulSzkolenia: dane.tytulSzkolenia ?? '',
    trescProgramu: dane.trescProgramu ?? '',
  })
}

function utworzWynik(propozycje: Parameters<typeof utworzWynikImportuProgramu>[0]['propozycje']) {
  return utworzWynikImportuProgramu({ zrodlo: 'TEKST', propozycje, ostrzezenia: [], bledy: [] })
}

function utworzDocxBezKompresji(xml: string) {
  const dane = new TextEncoder().encode(xml)
  const nazwa = new TextEncoder().encode('word/document.xml')
  const lokalny = new Uint8Array(30 + nazwa.length + dane.length)
  const widokLokalny = new DataView(lokalny.buffer)
  widokLokalny.setUint32(0, 0x04034b50, true)
  widokLokalny.setUint16(8, 0, true)
  widokLokalny.setUint32(18, dane.length, true)
  widokLokalny.setUint32(22, dane.length, true)
  widokLokalny.setUint16(26, nazwa.length, true)
  lokalny.set(nazwa, 30)
  lokalny.set(dane, 30 + nazwa.length)

  const katalog = new Uint8Array(46 + nazwa.length)
  const widokKatalogu = new DataView(katalog.buffer)
  widokKatalogu.setUint32(0, 0x02014b50, true)
  widokKatalogu.setUint16(10, 0, true)
  widokKatalogu.setUint32(20, dane.length, true)
  widokKatalogu.setUint32(24, dane.length, true)
  widokKatalogu.setUint16(28, nazwa.length, true)
  katalog.set(nazwa, 46)

  const koniec = new Uint8Array(22)
  const widokKonca = new DataView(koniec.buffer)
  widokKonca.setUint32(0, 0x06054b50, true)
  widokKonca.setUint16(8, 1, true)
  widokKonca.setUint16(10, 1, true)
  widokKonca.setUint32(12, katalog.length, true)
  widokKonca.setUint32(16, lokalny.length, true)

  const wynik = new Uint8Array(lokalny.length + katalog.length + koniec.length)
  wynik.set(lokalny)
  wynik.set(katalog, lokalny.length)
  wynik.set(koniec, lokalny.length + katalog.length)
  return wynik.buffer
}

function utworzPdfTekstowy(strony: string[]) {
  const numerCzcionki = 3 + strony.length * 2
  const obiekty = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${strony.map((_, indeks) => `${3 + indeks * 2} 0 R`).join(' ')}] /Count ${strony.length} >>`,
    ...strony.flatMap((tekst, indeks) => {
      const numerStrony = 3 + indeks * 2
      const numerToku = numerStrony + 1
      const tok = `BT\n/F1 12 Tf\n72 720 Td\n(${tekst.replace(/[\\()]/g, '\\$&')}) Tj\nET`

      return [
        `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${numerCzcionki} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${numerToku} 0 R >>`,
        `<< /Length ${tok.length} >>\nstream\n${tok}\nendstream`,
      ]
    }),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  const fragmenty = ['%PDF-1.4\n']
  const pozycje = [0]
  let dlugosc = fragmenty[0].length

  obiekty.forEach((obiekt, indeks) => {
    pozycje.push(dlugosc)
    const zapis = `${indeks + 1} 0 obj\n${obiekt}\nendobj\n`
    fragmenty.push(zapis)
    dlugosc += zapis.length
  })

  const pozycjaXref = dlugosc
  fragmenty.push(`xref\n0 ${obiekty.length + 1}\n0000000000 65535 f \n`)
  pozycje.slice(1).forEach((pozycja) => fragmenty.push(`${String(pozycja).padStart(10, '0')} 00000 n \n`))
  fragmenty.push(`trailer\n<< /Size ${obiekty.length + 1} /Root 1 0 R >>\nstartxref\n${pozycjaXref}\n%%EOF`)

  return new TextEncoder().encode(fragmenty.join('')).buffer
}

function utworzPlikPdf(nazwa: string, zawartosc: ArrayBuffer) {
  return { name: nazwa, size: zawartosc.byteLength, arrayBuffer: async () => zawartosc } as File
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
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram(), wynik, 'UZUPELNIJ', ['tytulSzkolenia'])

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
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram({ tytulSzkolenia: 'Excel zaawansowany' }), wynik, 'ZASTAP', ['tytulSzkolenia'])

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
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram(), wynik, 'UZUPELNIJ', ['trescProgramu'])

  assert.equal(zastosowanie.model.czyWynikParsowaniaZatwierdzony, false)
  assert.equal(zastosowanie.problemyWalidacji.some((problem) => problem.id === 'wynik-parsowania-niezatwierdzony'), true)
})

test('pipeline nie uruchamia autosave przed zastosowaniem kanonicznego modelu', () => {
  const wynik = importujTekstProgramu('1. Wprowadzenie\n- Zakres')
  let liczbaZapisow = 0
  globalThis.localStorage = { setItem: () => { liczbaZapisow += 1 } } as Storage

  zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram(), wynik, 'UZUPELNIJ', ['trescProgramu'])

  assert.equal(liczbaZapisow, 0)
})

test('adapter DOCX przekazuje treść do tego samego kontraktu wyniku importu bez zmiany programu ani storage', () => {
  const program = utworzProgram({ trescProgramu: 'Treść przed importem' })
  const przed = JSON.stringify(program)
  let liczbaZapisow = 0
  globalThis.localStorage = { setItem: () => { liczbaZapisow += 1 } } as Storage

  const wynik = utworzWynikImportuProgramuZTekstuDocx('1. Wprowadzenie\n- Zakres')

  assert.equal(wynik.zrodlo, 'DOCX')
  assert.equal(wynik.propozycje[0].pole, 'trescProgramu')
  assert.equal(JSON.stringify(program), przed)
  assert.equal(liczbaZapisow, 0)
})

test('poprawny DOCX przechodzi przez adapter i tworzy staging', async () => {
  const domParserPrzedTestem = globalThis.DOMParser
  const tekst = { textContent: '1. Wprowadzenie' }
  const run = { getElementsByTagNameNS: (_przestrzen: string, nazwa: string) => nazwa === 't' ? [tekst] : [] }
  const akapit = { localName: 'p', getElementsByTagNameNS: (_przestrzen: string, nazwa: string) => nazwa === 'r' ? [run] : [] }
  const body = { children: [akapit] }
  globalThis.DOMParser = class {
    parseFromString() {
      return {
        getElementsByTagName: () => [],
        getElementsByTagNameNS: (_przestrzen: string, nazwa: string) => nazwa === 'body' ? [body] : [],
      }
    }
  } as typeof DOMParser

  try {
    const plik = {
      name: 'program.docx',
      size: 128,
      arrayBuffer: async () => utworzDocxBezKompresji('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>1. Wprowadzenie</w:t></w:r></w:p></w:body></w:document>'),
    } as File
    const wynik = await importujDocxProgramu(plik)

    assert.equal(wynik.zrodlo, 'DOCX')
    assert.equal(wynik.propozycje[0].wartosc, '1. Wprowadzenie')
  } finally {
    globalThis.DOMParser = domParserPrzedTestem
  }
})

test('uszkodzony DOCX nie tworzy zmian programu ani zapisu storage', async () => {
  const program = utworzProgram({ trescProgramu: 'Treść przed importem' })
  const przed = JSON.stringify(program)
  let liczbaZapisow = 0
  globalThis.localStorage = { setItem: () => { liczbaZapisow += 1 } } as Storage
  const plik = { name: 'uszkodzony.docx', size: 4, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer } as File

  const wynik = await importujDocxProgramu(plik)

  assert.equal(wynik.bledy.length, 1)
  assert.equal(JSON.stringify(program), przed)
  assert.equal(liczbaZapisow, 0)
})

test('pusty plik i niewłaściwe rozszerzenie zwracają kontrolowany błąd importu DOCX', async () => {
  const pusty = await importujDocxProgramu({ name: 'pusty.docx', size: 0, arrayBuffer: async () => new ArrayBuffer(0) } as File)
  const doc = await importujDocxProgramu({ name: 'stary.doc', size: 1, arrayBuffer: async () => new ArrayBuffer(1) } as File)

  assert.match(pusty.bledy[0], /pusty/i)
  assert.match(doc.bledy[0], /DOCX/i)
})

test('odznaczone pole nie jest stosowane także w trybie zastąpienia', () => {
  const wynik = utworzWynik([{ pole: 'tytulSzkolenia', wartosc: 'Excel', pewnosc: 'PEWNE', wymagaDecyzjiUzytkownika: false }])
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(
    utworzProgram({ tytulSzkolenia: 'Excel zaawansowany' }), wynik, 'ZASTAP', [],
  )

  assert.equal(zastosowanie.model.tytulSzkolenia, 'Excel zaawansowany')
  assert.deepEqual(zastosowanie.zastosowanePola, [])
})

test('niepewne i konfliktowe zmiany są domyślnie odznaczone, a pewne puste pole zaznaczone', () => {
  const wynik = utworzWynik([
    { pole: 'tytulSzkolenia', wartosc: 'Excel', pewnosc: 'PEWNE', wymagaDecyzjiUzytkownika: false },
    { pole: 'trescProgramu', wartosc: 'Zakres?', pewnosc: 'NIEPEWNE', wymagaDecyzjiUzytkownika: true },
  ])

  assert.deepEqual(pobierzDomyslnieZaakceptowanePolaImportuProgramu(utworzProgram(), wynik), ['tytulSzkolenia'])
  assert.deepEqual(
    pobierzDomyslnieZaakceptowanePolaImportuProgramu(utworzProgram({ tytulSzkolenia: 'Istniejący' }), wynik),
    [],
  )
})

test('brak wartości nie czyści istniejącego pola', () => {
  const wynik = utworzWynik([{ pole: 'tytulSzkolenia', wartosc: '', pewnosc: 'BRAK', wymagaDecyzjiUzytkownika: true }])
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(
    utworzProgram({ tytulSzkolenia: 'Istniejący' }), wynik, 'ZASTAP', ['tytulSzkolenia'],
  )

  assert.equal(zastosowanie.model.tytulSzkolenia, 'Istniejący')
})

test('adapter PDF odczytuje warstwę tekstową i przekazuje ją do wspólnego wyniku importu', async () => {
  const program = utworzProgram({ trescProgramu: 'Treść przed importem' })
  const przed = JSON.stringify(program)
  let liczbaZapisow = 0
  globalThis.localStorage = { setItem: () => { liczbaZapisow += 1 } } as Storage

  const wynik = await importujPdfProgramu(utworzPlikPdf('program.pdf', utworzPdfTekstowy(['1. Wprowadzenie'])))

  assert.equal(wynik.zrodlo, 'PDF')
  assert.equal(wynik.propozycje[0].wartosc, '1. Wprowadzenie')
  assert.equal(JSON.stringify(program), przed)
  assert.equal(liczbaZapisow, 0)
})

test('adapter PDF zachowuje kolejność stron oraz oddziela ich tekst', async () => {
  const tekst = await wyodrebnijTekstPdf(utworzPlikPdf('program.pdf', utworzPdfTekstowy(['1. Pierwsza strona', '2. Druga strona'])))

  assert.equal(tekst, '1. Pierwsza strona\n2. Druga strona')
})

test('normalizacja PDF usuwa wyłącznie techniczne odstępy bez interpretacji pól programu', () => {
  assert.equal(normalizujTekstPdf('  Moduł   1 :  \n\n\u00a0 Zakres  '), 'Moduł 1:\nZakres')
})

test('tekst PDF kończy w tym samym parserze, stagingu i centralnej walidacji', () => {
  const wynik = utworzWynikImportuProgramuZTekstuPdf('1. Wprowadzenie\n- Zakres')
  const zmiany = przygotujZmianyImportuProgramu(utworzProgram(), wynik)
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(utworzProgram(), wynik, 'UZUPELNIJ', ['trescProgramu'])

  assert.equal(wynik.zrodlo, 'PDF')
  assert.equal(zmiany[0].stan, 'GOTOWA_DO_ZASTOSOWANIA')
  assert.equal(zastosowanie.problemyWalidacji.some((problem) => problem.id === 'wynik-parsowania-niezatwierdzony'), true)
})

test('PDF bez użytecznej warstwy tekstowej kończy kontrolowanym błędem bez propozycji', async () => {
  const wynik = await importujPdfProgramu(utworzPlikPdf('skan.pdf', utworzPdfTekstowy(['  '])))

  assert.equal(wynik.propozycje.length, 0)
  assert.match(wynik.bledy[0], /skanem/i)
})

test('uszkodzony PDF zwraca kontrolowany błąd bez propozycji', async () => {
  const wynik = await importujPdfProgramu(utworzPlikPdf('uszkodzony.pdf', new Uint8Array([1, 2, 3, 4]).buffer))

  assert.equal(wynik.propozycje.length, 0)
  assert.match(wynik.bledy[0], /PDF/i)
})

test('pusty PDF oraz PDF bez stron zwracają kontrolowane błędy', async () => {
  const pusty = await importujPdfProgramu({ name: 'pusty.pdf', size: 0, arrayBuffer: async () => new ArrayBuffer(0) } as File)
  const bezStron = await importujPdfProgramu(
    utworzPlikPdf('bez-stron.pdf', new ArrayBuffer(1)),
    async () => ({
      GlobalWorkerOptions: { workerSrc: '' },
      getDocument: () => ({ promise: Promise.resolve({ numPages: 0, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }) }),
    }),
  )

  assert.match(pusty.bledy[0], /pusty/i)
  assert.match(bezStron.bledy[0], /nie zawiera stron/i)
})

test('błąd biblioteki PDF i zabezpieczenie hasłem są bezpiecznymi niepowodzeniami importu', async () => {
  const bladOdczytu = await importujPdfProgramu(
    utworzPlikPdf('blad.pdf', new ArrayBuffer(1)),
    async () => ({ GlobalWorkerOptions: { workerSrc: '' }, getDocument: () => ({ promise: Promise.reject(new Error('Błąd odczytu')) }) }),
  )
  const bladHasla = new Error('Hasło')
  bladHasla.name = 'PasswordException'
  const zabezpieczony = await importujPdfProgramu(
    utworzPlikPdf('haslo.pdf', new ArrayBuffer(1)),
    async () => ({ GlobalWorkerOptions: { workerSrc: '' }, getDocument: () => ({ promise: Promise.reject(bladHasla) }) }),
  )

  assert.match(bladOdczytu.bledy[0], /PDF/i)
  assert.match(zabezpieczony.bledy[0], /zabezpieczony/i)
})

test('PDF respektuje odznaczenie konfliktu także w trybie zastąpienia i anulowanie nie zmienia modelu', () => {
  const program = utworzProgram({ trescProgramu: 'Własna treść' })
  const wynik = utworzWynikImportuProgramuZTekstuPdf('1. Treść z PDF')
  const zastosowanie = zastosujZaakceptowaneZmianyImportuProgramu(program, wynik, 'ZASTAP', [])

  assert.equal(zastosowanie.zmiany[0].stan, 'KONFLIKT')
  assert.equal(zastosowanie.model.trescProgramu, 'Własna treść')
  assert.equal(JSON.stringify(program), JSON.stringify(utworzProgram({ trescProgramu: 'Własna treść' })))
})
