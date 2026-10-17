import { register } from 'node:module'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
register('./loaderKomponentow.mjs', import.meta.url)
const { default: PanelLogowania } = await import('../src/aplikacja/logowanie/PanelLogowania.tsx')
const { pobierzUzytkownikow } = await import('../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
const pusta = renderToStaticMarkup(createElement(PanelLogowania, { aktywniUzytkownicy: [], zalogujUzytkownika: () => { throw new Error('Render nie powinien logować') } }))
assert.match(pusta, /Brak aktywnych kont/)
assert.match(pusta.match(/<button[^>]*>/)[0], /disabled=""/)
assert.match(pusta.match(/<button[^>]*>/)[0], /type="submit"/)
const konta = pobierzUzytkownikow().filter((konto) => konto.status === 'AKTYWNY').slice(0, 3)
const zawartosc = renderToStaticMarkup(createElement(PanelLogowania, { aktywniUzytkownicy: konta, zalogujUzytkownika: () => { throw new Error('Wybór wymaga wysłania formularza') } }))
assert.equal((zawartosc.match(/type="radio"/g) ?? []).length, konta.length)
assert.equal((zawartosc.match(/checked=""/g) ?? []).length, 1)
assert.match(zawartosc, /<fieldset[^>]*><legend>Aktywne konto<\/legend>/)
assert.match(zawartosc, /aria-label="Rola:/)
assert.match(zawartosc, /Ultimate Pomagier V4/)
assert.doesNotMatch(zawartosc.match(/<button[^>]*>/)[0], /disabled/)
console.log('V4-03: aktywne konta, natywny wybór klawiaturą, role i pusty stan — OK.')
