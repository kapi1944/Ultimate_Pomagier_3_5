import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

test('program: ustawienia domyślne, zachowanie zapisanych wartości, białe uchwyty i PDF', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({
    ...(process.env.POMAGIER_PRZEGLADARKA ? { executablePath: process.env.POMAGIER_PRZEGLADARKA } : { channel: 'chrome' }),
    headless: true,
  })
  try {
    const strona = await przegladarka.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1050 } })
    strona.setDefaultTimeout(15000)
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres + '/dokumenty/programy-szkolen')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()

    async function otworzUstawienia() {
      const przycisk = strona.getByRole('button', { name: 'Ustawienia programu', exact: true })
      if (await przycisk.getAttribute('aria-expanded') !== 'true') await przycisk.click()
      const przypnij = strona.getByRole('button', { name: '📌 Przypnij panel', exact: true })
      if (await przypnij.isVisible()) await przypnij.click()
    }
    const wyglad = strona.getByLabel('Wygląd dokumentu')
    const separacja = strona.getByLabel('Separacja modułów')
    async function sprawdzDomyslne() {
      assert.equal(await wyglad.inputValue(), 'DOTYCHCZASOWY')
      assert.equal(await wyglad.locator('option:checked').innerText(), 'Dotychczasowy wygląd')
      assert.equal(await separacja.inputValue(), 'separator-pytan')
    }
    await otworzUstawienia()
    await sprawdzDomyslne()

    const przelaczniki = strona.locator('.program-szkolen__przelacznik')
    assert.equal(await przelaczniki.count(), 4)
    await mkdir('tmp/programy-szkolen', { recursive: true })
    for (const skala of [75, 85, 100]) {
      await strona.evaluate(async (wartosc) => {
        const { zastosujSkaleInterfejsu } = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')
        await zastosujSkaleInterfejsu(wartosc)
      }, skala)
      for (let indeks = 0; indeks < await przelaczniki.count(); indeks += 1) {
        const przelacznik = przelaczniki.nth(indeks)
        await przelacznik.scrollIntoViewIfNeeded()
        const rozmiarPrzed = await przelacznik.boundingBox()
        for (const czyTak of [false, true]) {
          await przelacznik.setChecked(czyTak)
          await przelacznik.hover()
          await przelacznik.focus()
          const klatki = await przelacznik.evaluate(async (pole) => {
            const wynik = []
            for (let klatka = 0; klatka < 12; klatka += 1) {
              await new Promise(requestAnimationFrame)
              const styl = getComputedStyle(pole)
              const uchwyt = getComputedStyle(pole, '::before')
              wynik.push({ kolor: uchwyt.backgroundColor, pozycja: uchwyt.transform,
                szerokosc: styl.width, wysokosc: styl.height })
            }
            return wynik
          })
          for (const klatka of klatki) {
            assert.equal(klatka.kolor, 'rgb(255, 255, 255)')
            assert.equal(klatka.pozycja, czyTak ? 'matrix(1, 0, 0, 1, 16, 0)' : 'none')
            assert.ok(Math.abs(parseFloat(klatka.szerokosc) - 38) < 0.05)
            assert.ok(Math.abs(parseFloat(klatka.wysokosc) - 22) < 0.05)
          }
          assert.equal(await przelacznik.evaluate((pole) => {
            const probka = document.createElement('span')
            probka.style.background = getComputedStyle(pole).getPropertyValue(pole.checked ? '--ui-success-tlo' : '--ui-error-tlo')
            pole.parentElement.append(probka)
            const zgodne = getComputedStyle(probka).backgroundColor === getComputedStyle(pole).backgroundColor
            probka.remove()
            return zgodne
          }), true, 'Tło zachowuje istniejący zielony/czerwony token')
          const rozmiarPo = await przelacznik.boundingBox()
          assert.equal(rozmiarPo.width, rozmiarPrzed.width)
          assert.equal(rozmiarPo.height, rozmiarPrzed.height)
          assert.equal(rozmiarPo.x, rozmiarPrzed.x)
          assert.equal(rozmiarPo.y, rozmiarPrzed.y)
          if (indeks === 0) await przelacznik.locator('..').screenshot({ path: `tmp/programy-szkolen/przelacznik-${skala}-${czyTak ? 'tak' : 'nie'}.png` })
          assert.equal(await przelacznik.evaluate((pole) => {
            pole.disabled = true
            const kolor = getComputedStyle(pole, '::before').backgroundColor
            pole.disabled = false
            return kolor
          }), 'rgb(255, 255, 255)')
        }
      }
    }

    await wyglad.selectOption('SEMPER_WEDLUG_DNI')
    await separacja.selectOption('ramka')
    await strona.getByRole('switch', { name: 'Formatowanie skryptowe', exact: true }).uncheck()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Zachowane preferencje programu')
    await strona.getByRole('button', { name: 'Zapisz kopię roboczą', exact: true }).click()
    const zapisany = await strona.evaluate(async () => {
      const { pobierzAktywnaKopieProgramu } = await import('/src/moduly/dokumenty/generatory/programy_szkolen/magazynKopiiRoboczychProgramu.ts')
      return pobierzAktywnaKopieProgramu()
    })
    await strona.reload()
    await otworzUstawienia()
    assert.equal(await wyglad.inputValue(), 'SEMPER_WEDLUG_DNI')
    assert.equal(await separacja.inputValue(), 'ramka')
    assert.equal(await strona.getByRole('switch', { name: 'Formatowanie skryptowe', exact: true }).isChecked(), false)
    assert.deepEqual(await strona.evaluate(async () => {
      const { pobierzAktywnaKopieProgramu } = await import('/src/moduly/dokumenty/generatory/programy_szkolen/magazynKopiiRoboczychProgramu.ts')
      return pobierzAktywnaKopieProgramu()
    }), zapisany)

    await strona.getByRole('button', { name: 'Wyczyść program', exact: true }).click()
    await sprawdzDomyslne()
    await separacja.selectOption('linia')
    await strona.getByRole('button', { name: 'Przywróć ustawienia presetu', exact: true }).click()
    await sprawdzDomyslne()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Regresja domyślnych ustawień')
    await strona.locator('.program-szkolen__tiptap').fill('1. Wprowadzenie do szkolenia\n2. Ćwiczenia praktyczne')
    await strona.getByRole('button', { name: 'Zatwierdź wynik parsowania', exact: true }).click()
    const podglad = strona.locator('.program-szkolen__podglad [data-strona-dokumentu]').first()
    await podglad.getByText('Wprowadzenie do szkolenia', { exact: false }).waitFor()
    assert.match(await podglad.innerText(), /Regresja domyślnych ustawień/)
    await strona.getByRole('button', { name: 'Ustawienia programu', exact: true }).click()
    await podglad.scrollIntoViewIfNeeded()
    await podglad.screenshot({ path: 'tmp/programy-szkolen/podglad-domyslny.png' })
    await strona.getByRole('button', { name: 'Aktualizuj kopię', exact: true }).click()
    const [pobrany] = await Promise.all([
      strona.waitForEvent('download'),
      strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click(),
    ])
    const bajty = await readFile(await pobrany.path())
    const pdf = await PDFDocument.load(bajty)
    assert.equal(pdf.getPageCount(), 1)
    assert.ok(Math.abs(pdf.getPage(0).getWidth() - 595.28) < 1)
    await pobrany.saveAs('tmp/programy-szkolen/program-domyslny.pdf')
    const obrazPdf = await strona.evaluate(async (dane) => {
      const { getDocument, GlobalWorkerOptions } = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
      GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs'
      const zadanie = getDocument({ data: new Uint8Array(dane) })
      const dokument = await zadanie.promise
      const stronaPdf = await dokument.getPage(1)
      const widok = stronaPdf.getViewport({ scale: 1 })
      const obraz = document.createElement('canvas')
      obraz.width = Math.ceil(widok.width)
      obraz.height = Math.ceil(widok.height)
      await stronaPdf.render({ canvasContext: obraz.getContext('2d'), viewport: widok }).promise
      const wynik = obraz.toDataURL()
      await zadanie.destroy()
      return wynik
    }, Array.from(bajty))
    await writeFile('tmp/programy-szkolen/pdf-domyslny.png', Buffer.from(obrazPdf.split(',')[1], 'base64'))
    await strona.goto(adres + '/dokumenty/programy-szkolen/' + zapisany.id)
    await otworzUstawienia()
    await sprawdzDomyslne()
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), 'Regresja domyślnych ustawień')
    assert.deepEqual(bledy, [])
  } finally {
    await przegladarka.close()
  }
})
