import assert from 'node:assert/strict'
import test from 'node:test'
import { czyMoznaRozpoczacEksport, pobierzPodzialStronA4, utworzNazwePlikuPdf } from '../src/wspolne/dokumenty/eksportPdf.ts'

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
