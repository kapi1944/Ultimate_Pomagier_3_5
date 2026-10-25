import { register } from 'node:module'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { pobierzInformacjeOWersji } from '../skrypty/informacjeOWersji.mjs'
globalThis.__INFORMACJE_O_WERSJI__ = pobierzInformacjeOWersji()
register('./loaderKomponentow.mjs', import.meta.url)
const { default: PanelLogowania } = await import('../src/aplikacja/logowanie/PanelLogowania.tsx')

const zawartosc = renderToStaticMarkup(createElement(PanelLogowania, { otworzDemonstracje: () => { throw new Error('Render nie otwiera sesji') } }))
assert.match(zawartosc, /Login lub adres e-mail/)
assert.match(zawartosc, /type="password"/)
assert.match(zawartosc, /autoComplete="current-password"/i)
assert.match(zawartosc, /Zapamiętaj login/)
assert.match(zawartosc, /Bez zaufanej warstwy logowanie produkcyjne jest niedostępne/)
assert.match(zawartosc, /Dokończ resetowanie hasła/)
assert.doesNotMatch(zawartosc, /type="radio"|Aktywne konto|Otwórz demonstrację/)
assert.match(zawartosc, /Ultimate Pomagier 4\.0/)
console.log('V4: formularz hasła, brak listy kont, brak pozorowanego uwierzytelniania — OK.')
