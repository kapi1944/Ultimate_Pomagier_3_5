import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'

test('zbiorcze wcięcia w edytorze, zaznaczeniu, kopii i eksporcie PDF', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1050 } })
    await strona.goto((process.env.POMAGIER_ADRES || 'http://localhost:5173') + '/dokumenty/programy-szkolen')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Program z wcięciami')
    const edytor = strona.locator('.program-szkolen__tiptap')
    const tekst = '1. Moduł\n1.1 **Punkt A**\n1.2 Punkt B\n1.2.1 Szczegół\n• Lista punktowana\n2. Moduł B\n2.1 Punkt C'
    async function wklejProgram(trescProgramu) {
      await edytor.evaluate((element, tresc) => {
        const schowek = new DataTransfer()
        schowek.setData('text/plain', tresc)
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: schowek, bubbles: true, cancelable: true }))
      }, trescProgramu)
    }
    await wklejProgram(tekst)
    const panel = strona.getByRole('group', { name: 'Formatowanie zbiorcze' })
    const zwieksz = panel.getByRole('button', { name: 'Zwiększ wcięcie o 5 mm' })
    const zmniejsz = panel.getByRole('button', { name: 'Zmniejsz wcięcie o 5 mm' })
    const pozycje = edytor.locator('[data-wciecie-mm="5"]')
    await zwieksz.click()
    assert.deepEqual(await pozycje.allTextContents(), ['Punkt A', 'Punkt B', 'Punkt C'])
    assert.equal(await pozycje.locator('strong').innerText(), 'Punkt A')
    await zmniejsz.click()
    assert.equal(await pozycje.count(), 0)
    await edytor.press('Control+z')
    assert.equal(await pozycje.count(), 3)
    await edytor.press('Control+Shift+z')
    assert.equal(await pozycje.count(), 0)
    await panel.getByLabel('Zakres').selectOption('zaznaczenie')
    await edytor.locator('li[data-oznaczenie="1.2"] > p').evaluate((element) => {
      element.closest('[contenteditable]').focus()
      const zakres = document.createRange()
      zakres.selectNodeContents(element)
      window.getSelection().removeAllRanges()
      window.getSelection().addRange(zakres)
    })
    await zwieksz.click()
    assert.deepEqual(await pozycje.allTextContents(), ['Punkt B'])
    const podglad = strona.locator('.program-szkolen__podglad [data-strona-dokumentu]')
    const punkt = podglad.locator('.program-kartka-a4__pozycja').filter({ hasText: 'Punkt B' })
    await punkt.waitFor()
    const wciecie = await punkt.evaluate((element) => parseFloat(getComputedStyle(element).marginLeft))
    const baza = await podglad.locator('.program-kartka-a4__pozycja').filter({ hasText: 'Punkt A' }).evaluate((element) => parseFloat(getComputedStyle(element).marginLeft))
    assert.ok(Math.abs(wciecie - baza - 5 * 96 / 25.4) < 0.1)
    await strona.getByRole('button', { name: 'Zatwierdź wynik parsowania' }).click()
    await strona.getByRole('button', { name: 'Zapisz kopię roboczą', exact: true }).click()
    await strona.reload()
    await pozycje.waitFor()
    assert.deepEqual(await pozycje.allTextContents(), ['Punkt B'])
    const [plik] = await Promise.all([
      strona.waitForEvent('download'),
      strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click(),
    ])
    assert.ok((await PDFDocument.load(await readFile(await plik.path()))).getPageCount() > 0)

    await edytor.press('Control+a')
    const dlugiProgram = Array.from({ length: 12 }, (_, indeksDnia) => {
      const dzien = indeksDnia + 1
      return [`Dzień ${dzien}`, '1. Moduł szkolenia', ...Array.from({ length: 65 }, (_, indeksPunktu) =>
        `1.${indeksPunktu + 1} Dzień roboczy ${dzien}, punkt ${indeksPunktu + 1}. ${'Ćwiczenia praktyczne i omówienie wyników. '.repeat(6)}`,
      )].join('\n')
    }).join('\n')
    await wklejProgram(dlugiProgram)
    await panel.getByLabel('Wcięcie (mm)').fill('25')
    await panel.getByRole('button', { name: 'Zastosuj' }).click()
    assert.equal(await edytor.locator('[data-wciecie-mm="25"]').count(), 780)
    await podglad.nth(23).waitFor()
    await podglad.getByText('Dzień roboczy 12, punkt 65.', { exact: false }).first().waitFor()
    assert.equal(await podglad.evaluateAll((strony) => strony.every((kartka) =>
      Array.from(kartka.querySelectorAll('.program-kartka-a4__pozycja')).every((wiersz) => wiersz.scrollWidth <= wiersz.clientWidth + 1),
    )), true)
  } finally {
    await przegladarka.close()
  }
})
