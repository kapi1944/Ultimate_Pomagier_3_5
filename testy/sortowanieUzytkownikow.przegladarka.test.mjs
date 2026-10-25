import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

function luminancja(kolor) {
  const kanaly = kolor.match(/[\d.]+/g).slice(0, 3).map(Number).map((kanal) => kolor.startsWith('color(srgb ') ? kanal : kanal / 255).map((kanal) => kanal <= .04045 ? kanal / 12.92 : ((kanal + .055) / 1.055) ** 2.4)
  return kanaly[0] * .2126 + kanaly[1] * .7152 + kanaly[2] * .0722
}
function kontrast(pierwszy, drugi) {
  const a = luminancja(pierwszy)
  const b = luminancja(drugi)
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}

test('sortowanie kont: wyróżnienie, kierunek, filtry, zaznaczenie, motywy i klawiatura', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    // Osobny kontekst nie modyfikuje danych użytkownika w zwykłej przeglądarce.
    const kontekst = await przegladarka.newContext({ viewport: { width: 1440, height: 1000 } })
    const strona = await kontekst.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).click()
    await strona.getByRole('button', { name: 'Pełne', exact: true }).click()
    await strona.getByRole('button', { name: 'Użytkownicy', exact: true }).click()
    const tabela = strona.getByRole('region', { name: 'Tabela kont' })
    const pierwszy = tabela.getByRole('button', { name: 'Użytkownik', exact: true })
    const login = tabela.getByRole('button', { name: 'Login', exact: true })
    const aktywny = tabela.locator('th:is([aria-sort="ascending"], [aria-sort="descending"])')
    async function sprawdzStan(nazwa, kierunek) {
      await strona.waitForFunction(() => {
        const przycisk = document.querySelector('.uzytkownicy th:is([aria-sort="ascending"], [aria-sort="descending"]) button')
        return przycisk && getComputedStyle(przycisk).backgroundColor === 'rgb(242, 201, 76)'
      })
      assert.equal(await aktywny.count(), 1)
      assert.equal(await aktywny.getAttribute('aria-sort'), kierunek)
      assert.equal(await aktywny.innerText(), nazwa + (kierunek === 'ascending' ? ' ↑' : ' ↓'))
      assert.equal(await aktywny.locator('button').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(242, 201, 76)')
    }
    async function sprawdzKolejnosc(kierunek) {
      const loginy = await tabela.locator('tbody tr td:nth-child(4)').allTextContents()
      assert.ok(loginy.length > 1)
      assert.deepEqual(loginy, [...loginy].sort((a, b) => kierunek * a.localeCompare(b, 'pl', { numeric: true })))
    }
    await sprawdzStan('Użytkownik', 'ascending')
    await pierwszy.click()
    await strona.mouse.move(strona.viewportSize().width + 100, -100)
    await sprawdzStan('Użytkownik', 'descending')
    const szerokosci = await tabela.locator('th').evaluateAll((elementy) => elementy.map((element) => element.getBoundingClientRect().width))
    await login.click()
    await strona.mouse.move(strona.viewportSize().width + 100, -100)
    await sprawdzStan('Login', 'ascending')
    await sprawdzKolejnosc(1)
    assert.equal(await pierwszy.locator('..').getAttribute('aria-sort'), 'none')
    assert.notEqual(await pierwszy.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(242, 201, 76)')
    assert.deepEqual(await tabela.locator('th').evaluateAll((elementy) => elementy.map((element) => element.getBoundingClientRect().width)), szerokosci)
    await login.focus()
    await strona.keyboard.press('Enter')
    await sprawdzStan('Login', 'descending')
    await sprawdzKolejnosc(-1)
    await strona.keyboard.press('Space')
    await sprawdzStan('Login', 'ascending')
    await strona.getByLabel('Szukaj', { exact: true }).fill('a')
    await sprawdzKolejnosc(1)
    const wiersz = tabela.locator('tbody tr').filter({ hasText: 'Pracownik' }).first()
    const komorki = await wiersz.locator('td').allTextContents()
    await wiersz.getByRole('checkbox').check()
    for (const [filtr, wartosc, kolumna] of [['Filtr organizacji', komorki[5], 6], ['Filtr statusu', komorki[7], 8]]) {
      await strona.getByLabel(filtr, { exact: true }).selectOption(wartosc)
      assert.ok((await tabela.locator(`tbody tr td:nth-child(${kolumna})`).allTextContents()).every((tekst) => tekst === wartosc))
    }
    const rola = await wiersz.locator('td:nth-child(7)').innerText()
    const opcjeRol = await strona.getByLabel('Filtr roli', { exact: true }).locator('option').evaluateAll((opcje) => opcje.map((opcja) => ({ wartosc: opcja.value, tekst: opcja.textContent })))
    const pasujacaRola = opcjeRol.find((opcja) => opcja.wartosc && opcja.wartosc.toLocaleLowerCase('pl') === rola.toLocaleLowerCase('pl'))
    assert.ok(pasujacaRola, 'Rola wiersza ma odpowiednik w filtrze')
    await strona.getByLabel('Filtr roli', { exact: true }).selectOption(pasujacaRola.wartosc)
    assert.ok((await tabela.locator('tbody tr td:nth-child(7)').allTextContents()).every((tekst) => tekst === rola))
    await login.click()
    await strona.mouse.move(strona.viewportSize().width + 100, -100)
    await sprawdzStan('Login', 'descending')
    assert.equal(await tabela.locator('tbody input:checked').count(), 1)
    await strona.getByLabel('Kolor zbiorczy').fill('#123456')
    await strona.getByRole('button', { name: 'Podgląd zmian zbiorczych', exact: true }).click()
    await strona.getByRole('heading', { name: 'Krok 4 — Podgląd różnic', exact: true }).waitFor()
    const palety = await strona.evaluate(async () => (await import('/src/aplikacja/ustawienia/modelUstawienAplikacji.ts')).paletyInterfejsu)
    for (const paleta of palety) {
      await strona.evaluate((wartosc) => document.documentElement.dataset.uiPaleta = wartosc, paleta)
      for (const szerokosc of [1440, 768, 390]) {
        await strona.setViewportSize({ width: szerokosc, height: 1000 })
        await login.focus()
        await strona.keyboard.press('Tab')
        await strona.keyboard.press('Shift+Tab')
        await login.evaluate(async (element) => { await Promise.all(element.getAnimations().map((animacja) => animacja.finished)) })
        const styl = await login.evaluate((element) => {
          const styl = getComputedStyle(element)
          return { tlo: styl.backgroundColor, tekst: styl.color, fokus: styl.outlineColor, grubosc: styl.outlineWidth, widoczny: element.matches(':focus-visible'), panel: getComputedStyle(element.closest('th')).backgroundColor }
        })
        assert.ok(kontrast(styl.tlo, styl.tekst) >= 4.5, `${paleta}: kontrast aktywnego przycisku`)
        assert.ok(styl.widoczny && styl.grubosc === '3px')
        assert.ok(kontrast(styl.fokus, styl.panel) >= 3, `${paleta}: kontrast fokusu ${JSON.stringify(styl)}`)
        assert.notEqual(styl.tlo, styl.panel, 'Wyróżnienie obejmuje wyłącznie przycisk')
        await login.hover()
        const polozenie = await login.boundingBox()
        await strona.mouse.move(polozenie.x + polozenie.width / 2, polozenie.y + polozenie.height / 2)
        if (process.env.POMAGIER_ZRZUT) await strona.screenshot({ path: `${process.env.POMAGIER_ZRZUT}-${paleta}-${szerokosc}.png` })
        await strona.waitForFunction(() => {
          const przycisk = document.querySelector('.uzytkownicy th:is([aria-sort="ascending"], [aria-sort="descending"]) button')
          return przycisk && przycisk.matches(':hover') && getComputedStyle(przycisk).backgroundColor !== 'rgb(242, 201, 76)' && przycisk.getAnimations().length === 0
        })
        await login.evaluate(async (element) => { await Promise.all(element.getAnimations().map((animacja) => animacja.finished)) })
        const tloHover = await login.evaluate((element) => getComputedStyle(element).backgroundColor)
        assert.notEqual(tloHover, styl.tlo)
        assert.ok(kontrast(tloHover, styl.tekst) >= 4.5)
        await strona.mouse.move(strona.viewportSize().width + 100, -100)
        await sprawdzStan('Login', 'descending')
      }
    }
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})
