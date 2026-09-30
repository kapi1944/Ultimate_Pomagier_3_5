import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { drukujProgram } from '../src/wspolne/dokumenty/drukProgramu.ts'
import { wykonajEksportPoPrzygotowaniu } from '../src/wspolne/dokumenty/przygotowanieEksportu.ts'

const css = readFileSync(new URL('../src/wspolne/dokumenty/drukProgramu.css', import.meta.url), 'utf8')
const kodDruku = readFileSync(new URL('../src/wspolne/dokumenty/drukProgramu.ts', import.meta.url), 'utf8')

test('druk czeka na fonty i obrazy oraz korzysta wyłącznie z natywnego DOM', () => {
  assert.match(kodDruku, /await document.fonts\?\.ready/)
  assert.match(kodDruku, /obraz.decode\(\)/)
  assert.match(kodDruku, /window.print\(\)/)
  assert.doesNotMatch(kodDruku, /html2canvas|canvas|pobierzPdf/)
})

test('fizyczne strony mają własne A4 bez marginesów i przełamanie tylko przed kolejną stroną', () => {
  assert.match(css, /@page program-fizyczny-a4 \{ size: A4 portrait; margin: 0; \}/)
  assert.match(css, /page: program-fizyczny-a4/)
  assert.match(css, /width: 210mm !important;\s*height: 297mm !important;/)
  assert.match(css, /break-after: auto;\s*page-break-after: auto;/)
  assert.match(css, /article\[data-strona-dokumentu\]:not\(:last-of-type\) \{\s*break-after: page;\s*page-break-after: always;/)
  assert.match(css, /box-sizing: border-box !important/)
})

test('druk usuwa pomiar, oczekiwanie i interfejs z layoutu, przywracając widoczność tylko celu', () => {
  assert.match(css, /> :not\(article\[data-strona-dokumentu\]\) \{\s*display: none !important/)
  assert.match(css, /data-przodek-druku-programu\] > :not\(\[data-przodek-druku-programu\]\)/)
  assert.match(css, /body \[data-cel-druku-programu\] \* \{\s*visibility: visible !important/)
  assert.match(css, /gap: 0 !important/)
  assert.match(css, /padding: 0 !important/)
})

test('dwie natywne strony pozostają celem do afterprint; anulowanie przywraca tryb i usuwa oznaczenia', async () => {
  const poprzednieOkno = globalThis.window
  const poprzedniDokument = globalThis.document
  const atrybuty = new Set<string>()
  const strony = [{}, {}]
  let zakonczDruk: (() => void) | undefined
  let tryb = 'roboczy'
  let liczbaStronPrzyDruku = 0
  const renderer = {
    parentElement: null,
    querySelector: (selektor: string) => selektor.includes('oczekiwanie') ? null : strony[0],
    querySelectorAll: () => [],
    setAttribute: (nazwa: string) => atrybuty.add(nazwa),
    removeAttribute: (nazwa: string) => atrybuty.delete(nazwa),
  }
  const obszar = { querySelector: () => renderer }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { fonts: { ready: Promise.resolve() } } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    requestAnimationFrame: (funkcja: () => void) => { funkcja(); return 1 },
    addEventListener: (_nazwa: string, funkcja: () => void) => { zakonczDruk = funkcja },
    removeEventListener: () => undefined,
    print: () => { liczbaStronPrzyDruku = strony.length; assert.equal(tryb, 'finalny'); assert.ok(atrybuty.has('data-cel-druku-programu')) },
  } })
  try {
    const zadanie = wykonajEksportPoPrzygotowaniu({
      przygotuj: () => { tryb = 'finalny' },
      wykonaj: () => drukujProgram(obszar as unknown as HTMLElement),
      zakoncz: () => { tryb = 'roboczy' },
    })
    while (!zakonczDruk) await Promise.resolve()
    assert.equal(liczbaStronPrzyDruku, 2)
    assert.equal(tryb, 'finalny')
    zakonczDruk()
    await zadanie
    assert.equal(tryb, 'roboczy')
    assert.equal(atrybuty.size, 0)
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: poprzednieOkno })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: poprzedniDokument })
  }
})
