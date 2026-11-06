import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { PDFArray, PDFDocument, PDFRawStream, type PDFPage } from 'pdf-lib'
import { scalPakietPdf } from '../src/wspolne/dokumenty/pakietyDoZatwierdzenia/scalPakietPdf.ts'
import { utworzDomyslnaKonfiguracje, type KonfiguracjaPakietu } from '../src/wspolne/dokumenty/pakietyDoZatwierdzenia/modelPakietu.ts'
import type { WynikEksportuDokumentu } from '../src/wspolne/dokumenty/pakietyDoZatwierdzenia/renderujDokumentPakietu.tsx'
import type { FontyPdf } from '../src/wspolne/dokumenty/rendererPdf.ts'
const fonty = Object.fromEntries(Object.entries({ normal: 'Regular', bold: 'Bold', italic: 'Italic', bolditalic: 'BoldItalic' }).map(([styl, odmiana]) => [styl, readFileSync('public/fonty-pdf/LiberationSans-' + odmiana + '.ttf').toString('base64')])) as FontyPdf
const metadane = { szkolenieId: 's', tytul: 'Pomoc publiczna ą ć ę ł ń ó ś ź ż', klient: 'Klient', termin: '28–29.10.2026', organizator: 'SEMPER', opiekun: 'Anna Opiekun', wersja: '1' }
const bezWstepu: KonfiguracjaPakietu = { ...utworzDomyslnaKonfiguracje([]), stronaTytulowa: false, spisDokumentow: false, podzialNaGrupy: false }
function dokument(id: string, rozmiary: Array<[number, number]> = [[210, 297]], grupaId: string | null = null): WynikEksportuDokumentu {
  const pdf = new jsPDF({ unit: 'mm', format: rozmiary[0], orientation: rozmiary[0][0] > rozmiary[0][1] ? 'landscape' : 'portrait', compress: true })
  pdf.addFileToVFS('font.ttf', fonty.normal)
  pdf.addFont('font.ttf', 'Polski', 'normal')
  pdf.setFont('Polski')
  rozmiary.forEach(([szerokosc, wysokosc], indeks) => {
    if (indeks) pdf.addPage([szerokosc, wysokosc], szerokosc > wysokosc ? 'landscape' : 'portrait')
    pdf.text(id + ' strona ' + (indeks + 1) + ' ą ć ę ł ń ó ś ź ż', 12, 20)
    pdf.text('KONIEC ' + id + ' ' + (indeks + 1), 12, wysokosc - 15)
  })
  return { dokumentId: id, wersja: 1, nazwa: 'Dokument ' + id, pdfBytes: new Uint8Array(pdf.output('arraybuffer')), liczbaStron: rozmiary.length, grupaId }
}
const scal = (dokumenty: WynikEksportuDokumentu[], konfiguracja = bezWstepu, sygnal = new AbortController().signal) => scalPakietPdf(dokumenty, konfiguracja, metadane, { A: 'Grupa A', B: 'Grupa B' }, fonty, sygnal, '05.11.2026 12:00')
async function odczytaj(bajty: Uint8Array) {
  const pdf = await getDocument({ data: new Uint8Array(bajty), useSystemFonts: false }).promise
  const teksty: string[] = []
  for (let numer = 1; numer <= pdf.numPages; numer++) {
    const strona = await pdf.getPage(numer)
    const tresc = await strona.getTextContent()
    teksty.push(tresc.items.flatMap((element) => 'str' in element ? [element.str] : []).join(' '))
  }
  await pdf.loadingTask.destroy()
  return teksty
}
test('jeden dokument zachowuje pierwszą i ostatnią stronę oraz polskie znaki jako wektory', async () => {
  const zrodlo = dokument('A', [[210, 297], [210, 297], [210, 297]])
  const wynik = await scal([zrodlo])
  assert.equal(wynik.liczbaStron, 3)
  const teksty = await odczytaj(wynik.pdfBytes)
  assert.match(teksty[0], /A strona 1 ą ć ę ł ń ó ś ź ż/)
  assert.match(teksty[2], /KONIEC A 3/)
  const pdf = await getDocument({ data: new Uint8Array(wynik.pdfBytes) }).promise
  const operacje = await (await pdf.getPage(1)).getOperatorList()
  assert.ok(operacje.fnArray.includes(OPS.showText))
  assert.ok(!operacje.fnArray.includes(OPS.paintImageXObject))
  await pdf.loadingTask.destroy()
})
test('dwa różne dokumenty zaczynają się na nowych stronach we wskazanej kolejności', async () => {
  const wynik = await scal([dokument('B'), dokument('A', [[210, 297], [210, 297]])])
  assert.equal(wynik.liczbaStron, 3)
  assert.deepEqual(wynik.spis.map((pozycja) => [pozycja.dokumentId, pozycja.strona, pozycja.liczbaStron]), [['B', 1, 1], ['A', 2, 2]])
  const teksty = await odczytaj(wynik.pdfBytes)
  assert.match(teksty[0], /B strona 1/)
  assert.match(teksty[1], /A strona 1/)
})
test('A4 pion i poziom, A5 oraz A6 zachowują niezależne rozmiary i pełną liczbę stron', async () => {
  const rozmiary: Array<[number, number]> = [[210, 297], [297, 210], [148, 210], [148, 105]]
  const wynik = await scal(rozmiary.map((rozmiar, indeks) => dokument(String(indeks), [rozmiar])))
  const pdf = await PDFDocument.load(wynik.pdfBytes)
  assert.equal(pdf.getPageCount(), 4)
  pdf.getPages().forEach((strona, indeks) => {
    assert.ok(Math.abs(strona.getWidth() * 25.4 / 72 - rozmiary[indeks][0]) < 0.01)
    assert.ok(Math.abs(strona.getHeight() * 25.4 / 72 - rozmiary[indeks][1]) < 0.01)
  })
})
test('pełny pakiet i kilka grup mają rzeczywiste początki dokumentów w spisie', async () => {
  const dokumenty = [dokument('PROGRAM'), dokument('LISTA A', [[210, 297], [210, 297]], 'A'), dokument('ANKIETA A', [[210, 297]], 'A'), dokument('LISTA B', [[297, 210]], 'B')]
  const wynik = await scal(dokumenty, utworzDomyslnaKonfiguracje([]))
  assert.equal(wynik.liczbaStron, 9)
  assert.deepEqual(wynik.spis.map((pozycja) => pozycja.strona), [3, 5, 7, 9])
  const teksty = await odczytaj(wynik.pdfBytes)
  assert.match(teksty[0], /DOKUMENTACJA SZKOLENIOWA/)
  assert.match(teksty[0], /ą ć ę ł ń ó ś ź ż/)
  assert.match(teksty[1], /SPIS DOKUMENTÓW/)
  for (const pozycja of wynik.spis) {
    assert.match(teksty[pozycja.strona - 1], new RegExp(pozycja.dokumentId + ' strona 1'))
    assert.ok(teksty[1].includes(pozycja.nazwa))
    assert.ok(teksty[1].includes(String(pozycja.strona)))
  }
})
test('spis wielostronicowy zachowuje paginację i kompletność ponad 60 dokumentów', async () => {
  const dokumenty = Array.from({ length: 61 }, (_, indeks) => ({ ...dokument('D' + indeks), nazwa: 'Dokument ' + indeks + ' — długa nazwa dokumentu szkoleniowego do zatwierdzenia' }))
  const wynik = await scal(dokumenty, { ...bezWstepu, spisDokumentow: true })
  const wstep = wynik.liczbaStron - 61
  assert.ok(wstep > 1)
  assert.equal(wynik.spis[0].strona, wstep + 1)
  assert.equal(wynik.spis[60].strona, wynik.liczbaStron)
  const teksty = await odczytaj(wynik.pdfBytes)
  assert.match(teksty.at(-1)!, /D60 strona 1/)
  for (let indeks = 0; indeks < wstep; indeks++) assert.match(teksty[indeks], /SPIS DOKUMENTÓW/)
})
test('uszkodzony, pusty lub niekompletny eksport blokuje cały pakiet, tak samo anulowanie', async () => {
  const poprawny = dokument('A')
  await assert.rejects(() => scal([]), /unikalne/)
  await assert.rejects(() => scal([poprawny, poprawny]), /unikalne/)
  await assert.rejects(() => scal([{ ...poprawny, liczbaStron: 2 }]), /Niepełny/)
  await assert.rejects(() => scal([poprawny, { ...dokument('B'), pdfBytes: new Uint8Array([1, 2, 3]) }]))
  const kontroler = new AbortController()
  kontroler.abort()
  await assert.rejects(() => scal([poprawny], bezWstepu, kontroler.signal), { name: 'AbortError' })
})
test('opcjonalne oznaczenie nie zmienia danych źródłowych i liczby stron', async () => {
  const zrodlo = dokument('A')
  const bajtyPrzed = new Uint8Array(zrodlo.pdfBytes)
  const wynik = await scal([zrodlo], { ...bezWstepu, oznaczenie: true })
  assert.deepEqual(zrodlo.pdfBytes, bajtyPrzed)
  assert.equal(wynik.liczbaStron, 1)
  assert.match((await odczytaj(wynik.pdfBytes))[0], /DO ZATWIERDZENIA/)
})


test('bezstratne scalanie zachowuje bajt w bajt wszystkie źródłowe strumienie zawartości stron', async () => {
  const zrodla = [dokument('A', [[210, 297], [297, 210]]), dokument('B', [[148, 210], [105, 148]])]
  const wynik = await PDFDocument.load((await scal(zrodla)).pdfBytes)
  const strumienie = (strona: PDFPage) => {
    const zawartosc = strona.node.Contents()
    if (zawartosc instanceof PDFArray) return zawartosc.asArray().map((odnosnik) => strona.doc.context.lookup(odnosnik, PDFRawStream).getContents())
    assert.ok(zawartosc instanceof PDFRawStream)
    return [zawartosc.getContents()]
  }
  let indeks = 0
  for (const zrodlo of zrodla) {
    const pdf = await PDFDocument.load(zrodlo.pdfBytes)
    for (const strona of pdf.getPages()) assert.deepEqual(strumienie(wynik.getPage(indeks++)), strumienie(strona))
  }
  assert.equal(indeks, wynik.getPageCount())
})
