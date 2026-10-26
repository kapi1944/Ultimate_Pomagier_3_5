import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

test('edytor po aktualizacji zachowuje formatowanie i odrzuca wykonywalny HTML ze schowka', { timeout: 60000 }, async () => {
  const przegladarka = await chromium.launch({ executablePath: process.env.POMAGIER_CHROME, channel: process.env.POMAGIER_CHROME ? undefined : 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(`${adres}/testy/oznaczeniaProgramu.przegladarka.html`)
    await strona.waitForFunction(() => document.body.dataset.wynik === 'OK')
    const edytor = strona.locator('#edytor .tiptap')
    await edytor.waitFor()
    await edytor.click()
    await edytor.press('Control+A')
    await edytor.evaluate((element) => {
      window.uruchomionoLadunek = false
      const schowek = new DataTransfer()
      schowek.setData('text/plain', 'Tekst ze schowka Łódź')
      schowek.setData('text/html', '<img src="data:invalid" onerror="window.uruchomionoLadunek=true"><script>window.uruchomionoLadunek=true</script>')
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: schowek, bubbles: true, cancelable: true }))
    })
    await strona.waitForFunction(() => document.querySelector('#edytor .tiptap').textContent.includes('Tekst ze schowka Łódź'))
    const tekst = await edytor.innerText()
    await edytor.evaluate((element) => {
      const schowek = new DataTransfer()
      schowek.setData('text/html', '<svg onload="window.uruchomionoLadunek=true"></svg>')
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: schowek, bubbles: true, cancelable: true }))
    })
    assert.equal(await edytor.innerText(), tekst)
    assert.equal(await edytor.locator('img, script, svg, [onerror], [onload]').count(), 0)
    assert.equal(await strona.evaluate(() => window.uruchomionoLadunek), false)
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})
