import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

test('logo i szerokości paneli: przeciąganie, zapis, klawiatura i responsywność', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1920, height: 1080 } })
    await strona.goto(`${adres}/dokumenty/programy-szkolen`)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.locator('.menu-boczne').hover()
    await strona.getByRole('button', { name: 'Przypnij Menu', exact: false }).click()
    const menu = strona.locator('.menu-boczne')
    const logo = menu.locator('img')
    await logo.evaluate((obraz) => obraz.decode())
    assert.ok(await logo.evaluate((obraz) => obraz.naturalWidth > 0 && Math.abs(obraz.width / obraz.height - obraz.naturalWidth / obraz.naturalHeight) < 0.02))

    async function przeciagnij(panel, roznica) {
      const uchwyt = panel.getByRole('separator')
      await uchwyt.scrollIntoViewIfNeeded()
      const prostokat = await uchwyt.boundingBox()
      await strona.mouse.move(prostokat.x + prostokat.width / 2, prostokat.y + 60)
      await strona.mouse.down()
      await strona.mouse.move(prostokat.x + prostokat.width / 2 + roznica, prostokat.y + 60, { steps: 12 })
      await strona.mouse.up()
    }
    await przeciagnij(menu, 80)
    assert.ok(Math.abs((await menu.boundingBox()).width - 360) < 2)
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.ustawieniaAplikacji.v1')).nawigacja.szerokoscMenu), 360)
    await strona.reload()
    assert.ok(Math.abs((await menu.boundingBox()).width - 360) < 2)
    await strona.getByRole('button', { name: 'Ustawienia programu', exact: true }).click()
    const panel = strona.locator('.generator-panel-ustawien')
    await panel.getByTitle('Przypnij panel ustawień').click()
    await strona.waitForTimeout(250)
    const przed = (await panel.boundingBox()).width
    await przeciagnij(panel, -60)
    assert.ok((await panel.boundingBox()).width > przed + 50)
    const zapisana = await strona.evaluate(() => localStorage.getItem('ultimatePomagier.panel.panel-ustawien-programu-szkolenia.szerokosc'))
    assert.equal(Number(zapisana), Math.round(przed + 60))
    await strona.reload()
    await strona.waitForTimeout(300)
    assert.ok(Math.abs((await panel.boundingBox()).width - Number(zapisana)) < 2)

    for (const rozmiar of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 900, height: 768 }]) {
      await strona.setViewportSize(rozmiar)
      await strona.waitForTimeout(300)
      const menuProstokat = await menu.boundingBox()
      const glowna = await strona.locator('.uklad-aplikacji__kolumna-glowna').boundingBox()
      assert.ok(glowna.x >= menuProstokat.x + menuProstokat.width - 1)
      const tresc = await strona.locator('.generator-z-panelem__tresc').evaluate((element) => {
        const prostokat = element.getBoundingClientRect()
        return { koniec: prostokat.right - parseFloat(getComputedStyle(element).paddingRight), szerokosc: element.clientWidth - parseFloat(getComputedStyle(element).paddingRight) }
      })
      assert.ok(tresc.koniec <= (await panel.boundingBox()).x + 1)
      assert.ok(tresc.szerokosc >= 180)
      assert.ok(await logo.evaluate((obraz) => Math.abs(obraz.width / obraz.height - obraz.naturalWidth / obraz.naturalHeight) < 0.02))
      if (process.env.POMAGIER_ZRZUT) await strona.screenshot({ path: `${process.env.POMAGIER_ZRZUT}-${rozmiar.width}.png` })
    }
    await menu.getByRole('separator').focus()
    await strona.keyboard.press('Home')
    await strona.waitForTimeout(300)
    assert.ok(Math.abs((await menu.boundingBox()).width - 190) < 2)
    await strona.getByRole('button', { name: 'Odepnij Menu', exact: false }).click()
    await strona.mouse.move(700, 100)
    await strona.locator('.generator-z-panelem__tresc').click({ position: { x: 10, y: 10 } })
    await strona.waitForTimeout(350)
    assert.ok((await menu.boundingBox()).width <= 73)
    await strona.setViewportSize({ width: 600, height: 768 })
    assert.equal(await menu.getByRole('separator').count(), 0)
    await strona.setViewportSize({ width: 1920, height: 1080 })
    await strona.goto(adres + '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe')
    await strona.getByRole('button', { name: 'Kontrola jakości', exact: true }).click()
    const jakosc = strona.locator('.szczegoly-panel-jakosci')
    const przypnijJakosc = jakosc.getByRole('button', { name: 'Przypnij panel kontroli jakosci' })
    if (await przypnijJakosc.count()) await przypnijJakosc.click()
    await strona.waitForTimeout(300)
    const przedJakosc = (await jakosc.boundingBox()).width
    await przeciagnij(jakosc, -50)
    assert.ok(Math.abs((await jakosc.boundingBox()).width - przedJakosc - 50) < 2)
    const zapisJakosci = await strona.evaluate(() => localStorage.getItem('ultimatePomagier.panelJakosci.szerokosc'))
    await strona.reload()
    await strona.waitForTimeout(300)
    assert.ok(Math.abs((await jakosc.boundingBox()).width - Number(zapisJakosci)) < 2)
    for (const szerokoscOkna of [1366, 900]) {
      await strona.setViewportSize({ width: szerokoscOkna, height: 768 })
      await strona.waitForTimeout(300)
      const obszar = await strona.locator('.szczegoly-obszar-roboczy').boundingBox()
      assert.ok(obszar.x + obszar.width <= (await jakosc.boundingBox()).x + 1)
    }
  } finally {
    await przegladarka.close()
  }
})
