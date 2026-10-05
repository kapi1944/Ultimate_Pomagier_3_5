import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { jsPDF } from 'jspdf'
import { renderujScenePdf, type FontyPdf } from '../src/wspolne/dokumenty/rendererPdf.ts'
import type { ElementScenyPdf, ScenaPdf, StylTekstuPdf } from '../src/wspolne/dokumenty/scenaPdf.ts'
import { paginujProgram, utworzModelPaginacjiProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/paginatorProgramu.ts'
import { utworzModelStronyA4, type DokumentBlokowy } from '../src/wspolne/dokumenty/modelBlokowy.ts'
import { drukujDokument } from '../src/wspolne/dokumenty/eksportPdf.ts'

const tytul = 'Wprowadzenie do zmian w Prawie budowlanym 2026'
const polskieZnaki = 'ą ć ę ł ń ó ś ź ż Ą Ć Ę Ł Ń Ó Ś Ź Ż'
const fonty = Object.fromEntries(Object.entries({ normal: 'Regular', bold: 'Bold', italic: 'Italic', bolditalic: 'BoldItalic' }).map(([styl, odmiana]) => [styl, readFileSync(`public/fonty-pdf/LiberationSans-${odmiana}.ttf`).toString('base64')])) as FontyPdf
function tekst(tekst: string, y: number, styl: StylTekstuPdf = 'normal'): ElementScenyPdf {
  const pomiar = new jsPDF()
  pomiar.addFileToVFS('font.ttf', fonty[styl])
  pomiar.addFont('font.ttf', 'pomiar', styl)
  pomiar.setFont('pomiar', styl)
  pomiar.setFontSize(12)
  return { rodzaj: 'tekst', tekst, x: 14, y, szerokosc: pomiar.getTextWidth(tekst), rozmiar: 12, styl, kolor: '#123456', podkreslenie: styl === 'italic' }
}

test('PDF zawiera prawdziwą warstwę tekstową, polskie znaki, fonty, wektory oraz wyłącznie rzeczywisty obraz', async () => {
  const scena: ScenaPdf = { strony: [{ elementy: [tekst(tytul, 20), ...(['normal', 'bold', 'italic', 'bolditalic'] as const).map((styl, indeks) => tekst(polskieZnaki, 40 + indeks * 12, styl)), { rodzaj: 'prostokat', x: 10, y: 10, szerokosc: 170, wysokosc: 7, kolor: '#eeeeee' }, { rodzaj: 'linia', x: 10, y: 100, koniecX: 180, koniecY: 100, grubosc: 0.3, kolor: '#ff0000' }, { rodzaj: 'obraz', zrodlo: 'logo', x: 170, y: 250, szerokosc: 15, wysokosc: 10 }] }] }
  const logo = readFileSync('public/logo-semper.png').toString('base64')
  const pdf = renderujScenePdf(scena, fonty, { logo: `data:image/png;base64,${logo}` })
  const dokument = await getDocument({ data: new Uint8Array(pdf.output('arraybuffer')), useSystemFonts: false }).promise
  try {
    const strona = await dokument.getPage(1)
    const tresc = await strona.getTextContent()
    const teksty = tresc.items.flatMap((element) => 'str' in element ? [element.str] : [])
    assert.ok(teksty.includes(tytul))
    assert.equal(teksty.filter((tekst) => tekst === polskieZnaki).length, 4)
    assert.equal(Object.keys(tresc.styles).length, 4)
    const operacje = await strona.getOperatorList()
    assert.ok(operacje.fnArray.includes(OPS.showText))
    assert.ok(operacje.fnArray.includes(OPS.constructPath))
    assert.equal(operacje.fnArray.filter((operacja) => operacja === OPS.paintImageXObject).length, 1)
    const widok = strona.getViewport({ scale: 1 })
    assert.ok(Math.abs(widok.width * 25.4 / 72 - 210) < 0.01)
    assert.ok(Math.abs(widok.height * 25.4 / 72 - 297) < 0.01)
  } finally { await dokument.cleanup() }
})

test('liczba i kolejność fizycznych stron PDF wynika z istniejącego paginatora', async () => {
  const strona = utworzModelStronyA4('SEMPER')
  const dokument: DokumentBlokowy = { id: 'test', typ: 'program_szkolenia', dane: { tytulSzkolenia: tytul }, strona, wyglad: { marginesy: strona.marginesy, styleBlokow: {} }, problemy: [], raportyEksportu: [], metadane: { wersjaModelu: 1, zrodlo: 'uzytkownik', zatwierdzonyPrzezUzytkownika: true }, struktura: Array.from({ length: 9 }, (_, indeks) => ({ id: `punkt-${indeks}`, typ: 'Punkt', tresc: `Pozycja ${indeks + 1}`, dzieci: [], metadane: {}, stylLokalny: {}, statusDiagnostyczny: 'poprawny' })) }
  const model = utworzModelPaginacjiProgramu(dokument)
  const modul = model.dni[0].moduly[0]
  const wynik = paginujProgram(model, { pojemnoscPierwszejStrony: 70, pojemnoscKolejnychStron: 70, wysokosciNaglowkowDni: {}, wysokoscOdstepuMiedzyDniami: 0, wysokoscOdstepuMiedzyModulami: 0, wysokoscOdstepuMiedzyPunktami: 0, moduly: { [modul.id]: { wysokoscCalego: 270, wysokoscBazyZTytulem: 0, wysokoscBazyBezTytulu: 0, wysokosciGrup: Object.fromEntries(modul.grupyPunktow.map((grupa) => [grupa.id, 30])) } } })
  const scena: ScenaPdf = { strony: wynik.strony.map((strona) => ({ elementy: strona.fragmentyDni.flatMap((dzien) => dzien.moduly.flatMap((modul) => modul.grupyPunktow.flatMap((grupa, indeks) => grupa.bloki.map((blok) => tekst(blok.tresc!, 30 + indeks * 30))))) })) }
  const pdf = renderujScenePdf(scena, fonty)
  const odczyt = await getDocument({ data: new Uint8Array(pdf.output('arraybuffer')) }).promise
  try {
    assert.equal(odczyt.numPages, wynik.strony.length)
    assert.ok(odczyt.numPages > 1)
    for (let indeks = 0; indeks < odczyt.numPages; indeks++) {
      const tresc = await (await odczyt.getPage(indeks + 1)).getTextContent()
      assert.deepEqual(tresc.items.flatMap((element) => 'str' in element ? [element.str] : []), scena.strony[indeks].elementy.flatMap((element) => element.rodzaj === 'tekst' ? [element.tekst] : []))
    }
  } finally { await odczyt.cleanup() }
})

test('Programy zachowują wygląd przez eksport rastrowy; silnik semantyczny pozostaje niezależny', () => {
  const wspolny = readFileSync('src/wspolne/dokumenty/eksportPdf.ts', 'utf8')
  const renderer = readFileSync('src/wspolne/dokumenty/rendererPdf.ts', 'utf8')
  const semantyka = readFileSync('src/wspolne/dokumenty/semantykaPdf.ts', 'utf8')
  const program = readFileSync('src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx', 'utf8')
  assert.match(program, /silnikPdf="raster_legacy"/)
  assert.ok(!/html2canvas|toDataURL|addImage/.test(wspolny))
  assert.ok(!/html2canvas/.test(renderer))
  assert.ok(!/\.(innerText|textContent|innerHTML)/.test(semantyka))
  assert.throws(() => renderujScenePdf({ strony: [] }, fonty), /Brak stron/)
})

test('druk wywołuje natywne window.print', () => {
  const poprzednieOkno = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let liczbaWywolan = 0
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { print: () => { liczbaWywolan++ } } })
  try { drukujDokument(); assert.equal(liczbaWywolan, 1) }
  finally { if (poprzednieOkno) Object.defineProperty(globalThis, 'window', poprzednieOkno); else Reflect.deleteProperty(globalThis, 'window') }
})
