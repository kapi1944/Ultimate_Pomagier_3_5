import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile } from 'node:fs/promises'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

async function otworzUstawienia(strona) {
  await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).click()
  await strona.getByRole('button', { name: 'USTAWIENIA', exact: true }).click()
  await strona.getByRole('tab', { name: 'Wygląd', exact: true }).click()
}

async function oczekujSkali(strona, skala) {
  await strona.waitForFunction((wartosc) => Number(getComputedStyle(document.documentElement).zoom) === wartosc / 100, skala)
  assert.equal(await strona.getByRole('slider', { name: 'Skala interfejsu', exact: true }).inputValue(), String(skala))
  assert.equal(await strona.locator('.ustawienia__skala output').innerText(), `${skala}%`)
}

test('skala UI: kontrolki, skróty, podgląd, reset sekcji i trwały zapis', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 960 } })
    strona.setDefaultTimeout(8000)
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await otworzUstawienia(strona)
    await oczekujSkali(strona, 100)
    const suwak = strona.getByRole('slider', { name: 'Skala interfejsu', exact: true })
    for (const skala of [70, 85, 100, 115, 130]) {
      await suwak.fill(String(skala))
      await oczekujSkali(strona, skala)
      const przycisk = strona.getByRole('button', { name: 'Zapisz ustawienia', exact: true })
      await przycisk.scrollIntoViewIfNeeded()
      assert.equal(await przycisk.isVisible(), true)
      const graniceZapisu = await przycisk.boundingBox()
      assert.ok(graniceZapisu.y >= 0 && graniceZapisu.y + graniceZapisu.height <= 961, `Zapis poza oknem przy ${skala}%`)
      const dock = await strona.locator('.dock-aplikacji').boundingBox()
      assert.ok(dock.y >= 0 && dock.y + dock.height <= 961, `Dock poza oknem przy ${skala}%`)
      assert.ok(await strona.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Poziome przepełnienie przy ${skala}%`)
    }
    assert.equal(await strona.getByRole('button', { name: 'Zwiększ skalę interfejsu' }).isDisabled(), true)
    await strona.getByRole('button', { name: 'Zmniejsz skalę interfejsu' }).click()
    await oczekujSkali(strona, 125)
    await strona.getByRole('button', { name: 'Przywróć 100%', exact: true }).click()
    await strona.getByRole('button', { name: 'Zwiększ skalę interfejsu' }).click()
    await oczekujSkali(strona, 105)
    await strona.keyboard.press('Control+-')
    await oczekujSkali(strona, 100)
    await strona.keyboard.press('Control+=')
    await oczekujSkali(strona, 105)
    await strona.keyboard.press('Control+0')
    await oczekujSkali(strona, 100)
    await suwak.fill('70')
    await strona.keyboard.press('Control+-')
    await oczekujSkali(strona, 70)
    assert.equal(await strona.getByRole('button', { name: 'Zmniejsz skalę interfejsu' }).isDisabled(), true)
    assert.equal(await strona.evaluate(() => localStorage.getItem('ultimatePomagier.ustawieniaAplikacji.v1')), null)
    await strona.getByRole('button', { name: 'Przywróć tę sekcję', exact: true }).click()
    await oczekujSkali(strona, 100)
    await suwak.fill('85')
    await strona.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click()
    await strona.reload()
    await strona.waitForFunction(() => getComputedStyle(document.documentElement).zoom === '0.85')
    await otworzUstawienia(strona)
    await oczekujSkali(strona, 85)
    await suwak.fill('130')
    await strona.reload()
    await otworzUstawienia(strona)
    await oczekujSkali(strona, 85)
    await strona.getByRole('button', { name: 'Przywróć domyślne', exact: true }).click()
    await oczekujSkali(strona, 100)
    await mkdir('tmp', { recursive: true })
    await strona.screenshot({ path: 'tmp/skala-ustawienia.png', fullPage: true })
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('skala UI: formularze, menu, panele, A4 i niezależne style eksportu PDF', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 960 } })
    strona.setDefaultTimeout(8000)
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(`${adres}/dokumenty/checklisty-paczek`)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Regresja skali UI')
    for (const skala of [70, 85, 100, 115, 130]) {
      await strona.evaluate(async (skala) => {
        const { zastosujSkaleInterfejsu } = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')
        await zastosujSkaleInterfejsu(skala)
      }, skala)
      assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), 'Regresja skali UI')
      const otworzMenu = strona.getByRole('button', { name: 'Otwórz menu', exact: true })
      if (await otworzMenu.count()) await otworzMenu.click()
      const menu = strona.locator('.menu-boczne')
      await menu.waitFor({ state: 'visible' })
      const granice = await menu.boundingBox()
      assert.ok(granice.x >= -1 && granice.y >= -1 && granice.x + granice.width <= 1441)
      await menu.getByRole('button').first().press('Escape')
      const uchwyt = strona.getByRole('separator', { name: 'Zmień szerokość panelu' }).last()
      if (await uchwyt.count()) {
        await uchwyt.focus()
        await uchwyt.press('Home')
        await uchwyt.press('ArrowRight')
        assert.ok(Number(await uchwyt.getAttribute('aria-valuenow')) >= Number(await uchwyt.getAttribute('aria-valuemin')))
      }
      await strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).scrollIntoViewIfNeeded()
      assert.equal(await strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).isVisible(), true)
    }
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const wymiaryPdf = []
    for (const skala of [70, 100, 130]) {
      await strona.evaluate(async (skala) => (await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')).zastosujSkaleInterfejsu(skala), skala)
      const pobieranie = strona.waitForEvent('download')
      await strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click()
      const plik = await pobieranie
      const pdf = await getDocument({ data: new Uint8Array(await readFile(await plik.path())) }).promise
      const pierwsza = await pdf.getPage(1)
      const widok = pierwsza.getViewport({ scale: 1 })
      wymiaryPdf.push([pdf.numPages, widok.width, widok.height])
      assert.ok(Math.abs(widok.width * 25.4 / 72 - 210) < 0.01)
      assert.ok(Math.abs(widok.height * 25.4 / 72 - 297) < 0.01)
      await pdf.cleanup()
    }
    assert.deepEqual(wymiaryPdf[0], wymiaryPdf[1])
    assert.deepEqual(wymiaryPdf[1], wymiaryPdf[2])
    await strona.emulateMedia({ media: 'print' })
    assert.equal(await strona.evaluate(() => getComputedStyle(document.documentElement).zoom), '1')
    await strona.emulateMedia({ media: 'screen' })
    // Rzeczywisty adapter semantyczny: zoom zmienia geometrię ekranu, ale nie fonty PDF.
    const sceny = await strona.evaluate(async () => {
      const zasoby = performance.getEntriesByType('resource').map((wpis) => wpis.name)
      const React = (await import(zasoby.find((adres) => /\/react\.js(?:\?|$)/.test(adres)))).default
      const { createRoot } = (await import(zasoby.find((adres) => /\/react-dom_client\.js(?:\?|$)/.test(adres)))).default
      const { oznaczSemantykePdf, zmierzScenePdf } = await import('/src/wspolne/dokumenty/semantykaPdf.ts')
      const { zastosujSkaleInterfejsu } = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')
      const kontener = document.createElement('div')
      document.body.append(kontener)
      const korzen = createRoot(kontener)
      await new Promise((rozwiaz) => {
        const obserwator = new MutationObserver(() => { if (kontener.firstElementChild) { obserwator.disconnect(); rozwiaz() } })
        obserwator.observe(kontener, { childList: true })
        korzen.render(oznaczSemantykePdf(React.createElement('article', { style: { width: '210mm', height: '297mm', color: '#000', fontSize: '16px', border: '1px solid #000' } }, 'Treść dokumentu A4')))
      })
      const wyniki = []
      for (const skala of [70, 85, 100, 115, 130]) {
        await zastosujSkaleInterfejsu(skala)
        wyniki.push(zmierzScenePdf([kontener.firstElementChild]))
      }
      korzen.unmount()
      kontener.remove()
      return wyniki
    })
    const rozmiary = sceny.map((scena) => scena.strony[0].elementy.find((element) => element.rodzaj === 'tekst').rozmiar)
    assert.ok(rozmiary.every((rozmiar) => Math.abs(rozmiar - rozmiary[0]) < 0.001))
    for (const sciezka of ['/dokumenty/programy-szkolen', '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe']) {
      await strona.goto(`${adres}${sciezka}`)
      await strona.locator('main input').first().waitFor()
      for (const skala of [70, 85, 100, 115, 130]) {
        await strona.evaluate(async (skala) => (await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')).zastosujSkaleInterfejsu(skala), skala)
        assert.equal(await strona.locator('main input').first().isVisible(), true)
        assert.ok(await strona.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${sciezka}: przepełnienie przy ${skala}%`)
      }
    }
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('skala UI: najmniejsze okno Windows, dock i przewijane okno dialogowe', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1024, height: 700 } })
    strona.setDefaultTimeout(8000)
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await otworzUstawienia(strona)
    for (const skala of [70, 85, 100, 115, 130]) {
      await strona.getByRole('slider', { name: 'Skala interfejsu', exact: true }).fill(String(skala))
      const zapis = strona.getByRole('button', { name: 'Zapisz ustawienia', exact: true })
      await zapis.scrollIntoViewIfNeeded()
      const granice = await zapis.boundingBox()
      assert.ok(granice.y >= 0 && granice.y + granice.height <= 701, `Zapis poza małym oknem przy ${skala}%`)
      await strona.getByRole('button', { name: 'Skróty', exact: true }).click()
      const dialog = strona.getByRole('dialog', { name: 'Skróty docka' })
      const graniceDialogu = await dialog.boundingBox()
      assert.ok(graniceDialogu.y >= 0 && graniceDialogu.y + graniceDialogu.height <= 701, `Dialog poza oknem przy ${skala}%`)
      await dialog.getByRole('button', { name: 'Zamknij', exact: true }).click()
    }
  } finally { await przegladarka.close() }
})

test('skala UI: panel kontroli jakości zachowuje szerokość i prawidłowo obsługuje przeciąganie', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 960 } })
    strona.setDefaultTimeout(8000)
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    const panel = strona.getByRole('complementary', { name: 'Panel kontroli jakosci' })
    let zapisanaSzerokosc = null
    for (const skala of [70, 85, 100, 115, 130]) {
      await strona.evaluate(async (skala) => (await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')).zastosujSkaleInterfejsu(skala), skala)
      if (!(await strona.locator('.szczegoly-panel-jakosci').getAttribute('class')).includes('szczegoly-panel-jakosci--otwarty')) await strona.getByRole('button', { name: 'Kontrola jakości', exact: true }).click()
      await panel.waitFor()
      if (zapisanaSzerokosc !== null) assert.equal(await strona.evaluate(() => Number(localStorage.getItem('ultimatePomagier.panelJakosci.szerokosc'))), zapisanaSzerokosc)
      const szerokosc = await panel.evaluate((element) => parseFloat(getComputedStyle(element).width))
      const docelowa = szerokosc >= 580 ? szerokosc - 20 : szerokosc + 20
      const uchwyt = panel.getByRole('separator', { name: 'Zmień szerokość panelu' })
      const granice = await uchwyt.boundingBox()
      await strona.mouse.move(granice.x + granice.width / 2, granice.y + 40)
      await strona.mouse.down()
      await strona.mouse.move(granice.x + granice.width / 2 - (docelowa - szerokosc) * skala / 100, granice.y + 40, { steps: 4 })
      await strona.mouse.up()
      zapisanaSzerokosc = await strona.evaluate(() => Number(localStorage.getItem('ultimatePomagier.panelJakosci.szerokosc')))
      assert.ok(Math.abs(zapisanaSzerokosc - docelowa) <= 1, `Nieprawidłowe przeciąganie przy ${skala}%`)
      const obrys = await panel.boundingBox()
      if (skala === 130) await strona.screenshot({ path: 'tmp/skala-panel-jakosci.png' })
      assert.ok(obrys.x >= 0 && obrys.y >= 0 && obrys.x + obrys.width <= 1441 && obrys.y + obrys.height <= 961, `Panel poza oknem przy ${skala}%: ${JSON.stringify(obrys)}`)
    }
  } finally { await przegladarka.close() }
})
