import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

test('menu: hierarchia, zawijanie, aktywność, klawiatura i zwijanie', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const menu = strona.getByRole('complementary', { name: 'Menu główne' })
    await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).click()
    await menu.getByRole('button', { name: /Przypnij Menu/ }).click()
    await menu.getByRole('button', { name: 'DOKUMENTY', exact: true }).click()
    const dokumenty = menu.getByRole('button', { name: 'DOKUMENTY', exact: true })
    const panel = strona.locator('#' + await dokumenty.getAttribute('aria-controls'))
    const ankiety = panel.getByRole('button', { name: 'Ankiety', exact: true })
    await ankiety.click()
    const podstrony = strona.locator('#' + await ankiety.getAttribute('aria-controls'))
    const kopie = podstrony.getByRole('button', { name: 'Kopie robocze', exact: true })
    await strona.mouse.move(800, 400)

    const geometria = await Promise.all([dokumenty, ankiety, kopie].map((przycisk) => przycisk.evaluate((element) => {
      const styl = getComputedStyle(element)
      const prostokat = element.getBoundingClientRect()
      return { lewo: prostokat.left, prawo: prostokat.right, grubosc: parseFloat(styl.borderLeftWidth), waga: styl.fontWeight, tlo: styl.backgroundColor }
    })))
    assert.equal(geometria[1].lewo - geometria[0].lewo, 10)
    assert.equal(geometria[2].lewo - geometria[0].lewo, 22)
    for (const wymiar of geometria) assert.ok(Math.abs(wymiar.prawo - geometria[0].prawo) < 1)
    assert.deepEqual(geometria.map((wymiar) => wymiar.waga), ['600', '500', '400'])
    assert.ok(geometria[0].grubosc >= geometria[2].grubosc)
    assert.equal(new Set(geometria.map((wymiar) => wymiar.tlo)).size, 3)
    const linia = await podstrony.evaluate((element) => getComputedStyle(element, '::before').width)
    assert.equal(linia, '1px')

    await kopie.click()
    assert.equal(await kopie.getAttribute('aria-current'), 'page')
    assert.match(await kopie.getAttribute('class'), /--aktywny/)
    assert.notEqual(await kopie.evaluate((element) => getComputedStyle(element).boxShadow), 'none')
    await ankiety.focus()
    await strona.keyboard.press('Enter')
    assert.equal(await ankiety.getAttribute('aria-expanded'), 'false')
    await strona.keyboard.press('Space')
    assert.equal(await ankiety.getAttribute('aria-expanded'), 'true')
    assert.equal(await ankiety.evaluate((element) => element.matches(':focus-visible')), true)
    assert.notEqual(await ankiety.evaluate((element) => getComputedStyle(element).outlineStyle), 'none')
    await ankiety.hover()
    await strona.waitForTimeout(300)
    assert.notEqual(await ankiety.evaluate((element) => getComputedStyle(element).backgroundColor), geometria[1].tlo)

    for (const szerokosc of [1440, 800, 375]) {
      await strona.setViewportSize({ width: szerokosc, height: 900 })
      await strona.waitForTimeout(350)
      const otworz = strona.getByRole('button', { name: 'Otwórz menu', exact: true })
      if (await otworz.isVisible()) await otworz.click()
      await menu.getByRole('button', { name: 'Pełne', exact: true }).click()
      // Długa etykieta wyłącznie w izolowanym DOM testu, bez zmiany danych menu.
      await kopie.locator('.menu-boczne__etykieta').evaluate((element) => {
        element.textContent = 'Bardzo długa nazwa podstrony do weryfikacji zawijania ' + 'NieprzerwanaNazwa'.repeat(8)
      })
      const wymiary = await kopie.evaluate((element) => {
        const etykieta = element.querySelector('.menu-boczne__etykieta').getBoundingClientRect()
        const ikona = element.querySelector('.menu-boczne__ikona').getBoundingClientRect()
        const przycisk = element.getBoundingClientRect()
        return { zawija: etykieta.height > parseFloat(getComputedStyle(element).lineHeight), bezKolizji: etykieta.left >= ikona.right, miesci: etykieta.right < przycisk.right, bezPrzepelnienia: element.scrollWidth <= element.clientWidth }
      })
      assert.deepEqual(wymiary, { zawija: true, bezKolizji: true, miesci: true, bezPrzepelnienia: true })
      assert.equal(await menu.evaluate((element) => element.scrollWidth <= element.clientWidth), true)
    }
    await strona.setViewportSize({ width: 1440, height: 900 })
    await strona.waitForTimeout(350)
    await menu.getByRole('button', { name: 'Pełne', exact: true }).click()
    if (process.env.POMAGIER_ZRZUT_MENU) {
      await dokumenty.scrollIntoViewIfNeeded()
      await strona.screenshot({ path: process.env.POMAGIER_ZRZUT_MENU })
    }
    const przewijanie = await menu.evaluate((element) => {
      element.scrollTop = element.scrollHeight
      return { pionowe: element.scrollHeight > element.clientHeight && element.scrollTop > 0, bezPoziomego: element.scrollWidth <= element.clientWidth }
    })
    assert.deepEqual(przewijanie, { pionowe: true, bezPoziomego: true })
    await menu.getByRole('button', { name: /Odepnij Menu/ }).click()
    await strona.keyboard.press('Escape')
    await strona.mouse.move(800, 400)
    await strona.waitForTimeout(350)
    assert.equal(await menu.evaluate((element) => element.classList.contains('menu-boczne--otwarte')), false)
    assert.equal(await menu.locator('.menu-boczne__etykieta:visible').count(), 0)
    assert.equal(await menu.locator('.menu-boczne__lista--dzieci:visible').count(), 0)
    assert.equal(await menu.evaluate((element) => element.scrollWidth <= element.clientWidth), true)
    assert.equal(await dokumenty.evaluate((element) => element.getBoundingClientRect().width), 44)
    await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).focus()
    await strona.keyboard.press('Enter')
    assert.equal(await menu.evaluate((element) => element.classList.contains('menu-boczne--otwarte')), true)
    assert.equal(await kopie.getAttribute('aria-current'), 'page')
  } finally {
    await przegladarka.close()
  }
})
