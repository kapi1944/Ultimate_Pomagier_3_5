import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

test('rutyna na pulpicie: tworzenie, wykonanie, cofnięcie, restart i małe ekrany', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const kontekst = await przegladarka.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/Warsaw' })
    const strona = await kontekst.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const karta = strona.getByRole('region', { name: 'Daily Routines' })
    await karta.getByText('Brak zaplanowanych zadań').first().waitFor()
    await karta.getByRole('button', { name: 'Zobacz wszystkie' }).click()
    await karta.getByRole('button', { name: 'Zarządzaj rutynami' }).click()
    await karta.getByRole('button', { name: 'Dodaj rutynę' }).click()
    await karta.getByLabel('Nazwa', { exact: true }).fill('Test codziennej rutyny')
    await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await karta.getByText('Test codziennej rutyny').first().waitFor()
    await karta.getByLabel('Test codziennej rutyny').first().click()
    assert.match(await karta.innerText(), /Wykonano 1 z 1/)
    assert.match(await karta.innerText(), /Wszystko zrobione!/)
    assert.equal(await karta.getByRole('progressbar').first().getAttribute('aria-valuenow'), '100')
    for (const paleta of ['EMERALD_DARK', 'SOFT_GREY', 'DARK_GRAY']) {
      await strona.evaluate((wartosc) => { document.documentElement.dataset.uiPaleta = wartosc }, paleta)
      const kolory = await karta.evaluate((element) => {
        const styl = getComputedStyle(element)
        function kontrast(kolor, tlo) {
          function jasnosc(wartosc) {
            const skladowe = wartosc.match(/[\d.]+/g).slice(0, 3).map(Number).map((kanal) => { const liczba = kanal / 255; return liczba <= .04045 ? liczba / 12.92 : ((liczba + .055) / 1.055) ** 2.4 })
            return skladowe[0] * .2126 + skladowe[1] * .7152 + skladowe[2] * .0722
          }
          const pierwszy = jasnosc(kolor); const drugi = jasnosc(tlo)
          return (Math.max(pierwszy, drugi) + .05) / (Math.min(pierwszy, drugi) + .05)
        }
        return {
          tlo: styl.backgroundColor,
          panel: styl.getPropertyValue('--ui-panel').trim(),
          kontrasty: ['h2', 'p', '.rutyny-postep__sukces'].map((selektor) => kontrast(getComputedStyle(element.querySelector(selektor)).color, styl.backgroundColor)),
        }
      })
      const oczekiwaneTlo = await strona.evaluate((kolor) => { const element = document.createElement('span'); element.style.color = kolor; document.body.append(element); const wynik = getComputedStyle(element).color; element.remove(); return wynik }, kolory.panel)
      assert.equal(kolory.tlo, oczekiwaneTlo, `Tło karty w motywie ${paleta}`)
      assert.ok(kolory.kontrasty.every((kontrast) => kontrast >= 4.5), `Czytelny tekst i komunikat sukcesu w motywie ${paleta}: ${kolory.kontrasty}`)
      if (process.env.POMAGIER_ZRZUT) await karta.screenshot({ path: `${process.env.POMAGIER_ZRZUT}-${paleta}.png` })
    }
    await strona.reload()
    await karta.getByText('Wykonano 1 z 1').first().waitFor()
    await karta.getByRole('button', { name: 'Zobacz wszystkie' }).click()
    await karta.getByRole('button', { name: 'Dzisiaj', exact: true }).click()
    await karta.getByLabel('Test codziennej rutyny').first().uncheck()
    assert.match(await karta.innerText(), /Wykonano 0 z 1/)
    await karta.getByRole('button', { name: 'Zarządzaj rutynami' }).click()
    await karta.getByRole('button', { name: 'Dodaj rutynę' }).click()
    await karta.getByLabel('Nazwa', { exact: true }).fill('Test celu tygodniowego')
    await karta.getByLabel('Częstotliwość').selectOption('CEL_TYGODNIOWY')
    await karta.getByRole('spinbutton', { name: 'Razy w tygodniu' }).fill('3')
    await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await karta.getByRole('button', { name: 'Ten tydzień' }).click()
    assert.equal(await karta.getByLabel(/Test celu tygodniowego/).count(), 3)
    await karta.getByLabel(/Test celu tygodniowego/).first().click()
    assert.match(await karta.innerText(), /Wykonano 0 z 1/)
    await karta.getByRole('button', { name: 'Zarządzaj rutynami' }).click()
    const cel = karta.locator('.rutyny-zarzadzanie').filter({ hasText: 'Test celu tygodniowego' })
    await cel.getByRole('button', { name: 'Edytuj' }).click()
    await karta.getByRole('spinbutton', { name: 'Razy w tygodniu' }).fill('2')
    await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await karta.getByRole('button', { name: 'Ten tydzień' }).click()
    assert.equal(await karta.getByLabel(/Test celu tygodniowego/).count(), 3)
    for (const viewport of [{ width: 390, height: 844 }, { width: 800, height: 480 }]) {
      await strona.setViewportSize(viewport)
      assert.equal(await karta.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true)
    }
    assert.deepEqual(bledy, [])
    await kontekst.close()
  } finally { await przegladarka.close() }
})
