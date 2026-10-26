import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeAttributes as scalAtrybuty } from '@tiptap/core'

test('atrybut __proto__ pochodzący z JSON nie tworzy dziedziczonych atrybutów DOM', () => {
  for (const atrybut of ['onerror', 'onclick']) {
    const wejscie = JSON.parse(`{"__proto__":{"${atrybut}":"znacznik-ataku","src":"niedozwolone"},"class":"program"}`)
    const wynik = scalAtrybuty(wejscie, { 'data-poziom': '1' })
    assert.equal(Object.getPrototypeOf(wynik), Object.prototype)
    assert.equal(wynik[atrybut], undefined)
    assert.equal(wynik.src, undefined)
    assert.equal(wynik.class, 'program')
    assert.equal(wynik['data-poziom'], '1')
    for (const klucz in wynik) assert.equal(Object.hasOwn(wynik, klucz), true, klucz)
  }
})

test('scalanie poprawnych klas, stylów i oznaczeń edytora nadal działa', () => {
  const wynik = scalAtrybuty({ class: 'program', style: 'color: red', 'data-poziom': '1' }, { class: 'program aktywny', style: 'font-weight: bold', 'data-poziom': '2' })
  assert.equal(wynik.class, 'program aktywny')
  assert.equal(wynik['data-poziom'], '2')
  assert.match(wynik.style, /color: red/)
  assert.match(wynik.style, /font-weight: bold/)
})
