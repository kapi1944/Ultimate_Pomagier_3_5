import { register } from 'node:module'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { odczytaj } from './inwentaryzacjaV4.mjs'
register('./loaderKomponentow.mjs', import.meta.url)

const { default: WidokSzkolenZamknietych } = await import('../src/moduly/zamkniete/szkolenia/WidokSzkolenZamknietych.tsx')
const { default: WidokSzkolenOtwartych } = await import('../src/moduly/otwarte/WidokSzkolenOtwartych.tsx')
const zamkniete = renderToStaticMarkup(createElement(WidokSzkolenZamknietych, { ustawWidok: () => {} }))
const otwarte = renderToStaticMarkup(createElement(WidokSzkolenOtwartych))
for (const [html, rodzaj] of [[zamkniete, 'zamkniete'], [otwarte, 'otwarte']]) {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.match(html, new RegExp(`aria-labelledby="szkolenia-${rodzaj}-tytul"`))
  assert.match(html, /class="ui-karta"/)
  assert.match(html, /class="ui-odznaka"/)
  assert.match(html, /class="ui-komunikat"/)
  assert.match(html, /<svg aria-hidden="true"/)
  assert.doesNotMatch(html, /<table|<input|<form|disabled=/)
}
assert.equal((zamkniete.match(/<button/g) ?? []).length, 3)
assert.equal((zamkniete.match(/type="button"/g) ?? []).length, 3)
assert.match(zamkniete, /Otwórz listę szczegółów/)
assert.match(zamkniete, /Otwórz formularz szczegółów/)
assert.match(zamkniete, /Przejdź do kopii roboczych/)
assert.match(otwarte, /Widok informacyjny/)
assert.match(otwarte, /class="ui-pusty-stan"/)
assert.match(otwarte, /nie są jeszcze dostępne/)
assert.doesNotMatch(otwarte, /<button|<a\b/)
const powloka = odczytaj('src/aplikacja/layout/UkladAplikacji.tsx')
assert.match(powloka, /<WidokSzkolenZamknietych ustawWidok=\{ustawAktywnyWidok\}/)
assert.match(powloka, /renderujWidok\(aktywnyWidok, zmienZakladkeKartotek, ustawWidok,/)
assert.match(odczytaj('src/aplikacja/menu/MenuBoczne.tsx'), /if \(pozycja.widok === 'szkolenia-zamkniete'\) \{\s+ustawAktywnyWidok\(pozycja.widok\)\s+if \(czyMalyEkran\) zamknijMenu\(\)/)
console.log('V4-05: oba rzeczywiste ekrany, istniejące akcje, centralna nawigacja, informacyjny stan otwartych — OK.')
