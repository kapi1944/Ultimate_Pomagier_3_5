import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

test('nagłówek zaświadczenia używa jednej czcionki dla polskich liter także w druku', { timeout: 30000 }, async () => {
  const css = await readFile(new URL('../src/moduly/dokumenty/generatory/dyplomy/widokDyplomow.css', import.meta.url), 'utf8')
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    await strona.setContent(`<style>${css}</style><article class="dyplom-kartka dyplom-kartka--zaswiadczenie" style="--czcionka-typu: 'Bradley Hand ITC', cursive"><div class="dyplom-kartka__naglowek-ozdobny"><div class="dyplom-kartka__typ">ZAŚWIADCZENIE</div></div></article>`)
    const naglowek = strona.locator('.dyplom-kartka__typ')
    const sesja = await strona.context().newCDPSession(strona)
    await sesja.send('DOM.enable')
    await sesja.send('CSS.enable')
    const korzen = await sesja.send('DOM.getDocument')
    const { nodeId } = await sesja.send('DOM.querySelector', { nodeId: korzen.root.nodeId, selector: '.dyplom-kartka__typ' })
    async function sprawdzCzcionke(liczbaZnakow) {
      const { fonts } = await sesja.send('CSS.getPlatformFontsForNode', { nodeId })
      assert.equal(fonts.length, 1, JSON.stringify(fonts))
      assert.equal(fonts[0].familyName, 'Segoe Print')
      assert.equal(fonts[0].glyphCount, liczbaZnakow)
    }
    await sprawdzCzcionke(13)
    const wymiary = await naglowek.evaluate((element) => ({ szerokosc: element.clientWidth, tresc: element.scrollWidth }))
    assert.ok(wymiary.tresc <= wymiary.szerokosc, 'Nagłówek powinien mieścić się na stronie')
    await naglowek.evaluate(async (element) => { element.textContent = 'ĄĆĘŁŃÓŚŹŻ'; await new Promise(requestAnimationFrame) })
    await sprawdzCzcionke(9)
    await strona.emulateMedia({ media: 'print' })
    assert.match(await naglowek.evaluate((element) => getComputedStyle(element).fontFamily), /^"?Segoe Print"?/)
    await strona.emulateMedia({ media: 'screen' })
    for (const typ of ['dyplom', 'certyfikat']) {
      await strona.locator('article').evaluate((element, wartosc) => { element.className = `dyplom-kartka dyplom-kartka--${wartosc}` }, typ)
      assert.match(await naglowek.evaluate((element) => getComputedStyle(element).fontFamily), /Bradley Hand ITC/)
    }
  } finally {
    await przegladarka.close()
  }
})
