import assert from 'node:assert/strict'
import test from 'node:test'
import { czyMoznaRozpoczacEksport, pobierzPodzialStronA4, pobierzStronyDokumentu, utworzNazwePlikuPdf } from '../src/wspolne/dokumenty/eksportPdf.ts'
import { geometriaStronyProgramu, pobierzWymiaryStronyProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/geometriaStronyProgramu.ts'

test('nazwa PDF usuwa znaki niedozwolone i zachowuje polskie znaki', () => {
  assert.equal(utworzNazwePlikuPdf('Program: szkolenie "Zażółć"?.pdf'), 'Program szkolenie Zażółć.pdf')
})

test('podzial A4 tworzy przewidywalne strony dla krótkiego i długiego podglądu', () => {
  assert.equal(pobierzPodzialStronA4(500, 1000).length, 1)
  const strony = pobierzPodzialStronA4(5000, 1000)
  assert.ok(strony.length > 1)
  assert.equal(strony.reduce((suma, strona) => suma + strona.wysokosc, 0), 5000)
})


test('blokada nie pozwala rozpoczac drugiego eksportu podczas generowania', () => {
  assert.equal(czyMoznaRozpoczacEksport(false), true)
  assert.equal(czyMoznaRozpoczacEksport(true), false)
})

test('program szkolenia używa pełnej geometrii A4 bez dodatkowego marginesu PDF', () => {
  assert.deepEqual(pobierzWymiaryStronyProgramu(), { szerokosc: '210mm', wysokosc: '297mm' })
  assert.equal(geometriaStronyProgramu.marginesDrukuMm, 0)
  assert.ok(geometriaStronyProgramu.wysokoscStopkiMm > 0)
})

test('eksport rozpoznaje fizyczne strony dokumentu zamiast kroić cały podgląd', () => {
  const stronaPierwsza = {} as HTMLElement
  const stronaDruga = {} as HTMLElement
  const obszar = {
    querySelectorAll: () => [stronaPierwsza, stronaDruga],
  } as unknown as HTMLElement

  assert.deepEqual(pobierzStronyDokumentu(obszar), [stronaPierwsza, stronaDruga])
})
