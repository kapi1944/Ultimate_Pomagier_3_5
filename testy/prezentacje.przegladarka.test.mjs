import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import { utworzFixturePptx } from './fixturePptx.ts'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5180'
const katalog = fileURLToPath(new URL('../tmp/prezentacje/', import.meta.url))

function utworzPdf(liczba, orientacja = 'landscape') {
  const pdf = new jsPDF({ orientation: orientacja, unit: 'mm', format: 'a4' })
  for (let numer = 1; numer <= liczba; numer++) {
    if (numer > 1) pdf.addPage()
    pdf.setFontSize(28); pdf.text(`Slajd ${numer}`, 20, 30)
    pdf.setFillColor(numer % 2 ? '#087F8C' : '#BC3A3A'); pdf.rect(20, 50, 50, 30, 'F')
  }
  return Buffer.from(pdf.output('arraybuffer'))
}

async function otworzNarzedzie(strona) {
  await strona.goto(adres)
  await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
  await strona.goto(`${adres}/narzedzia/poprawiacz-prezentacji`)
  await strona.getByRole('heading', { name: 'Poprawiacz prezentacji', exact: true }).waitFor()
}

test('Poprawiacz: niezalezne okladki, import, mapowanie, druk PDF, ZIP i uniewaznianie podgladu', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    const bledy = []; strona.on('pageerror', (blad) => bledy.push(blad.message))
    await otworzNarzedzie(strona)
    await mkdir(katalog, { recursive: true })
    await strona.getByLabel('Nazwa szkolenia', { exact: true }).fill('Szkolenie regresyjne SEMPER')
    await strona.getByLabel('Data szkolenia', { exact: true }).fill('30 października 2026 r.')
    await strona.getByLabel('Miejscowość', { exact: true }).fill('Warszawa')
    await strona.getByLabel('Trener', { exact: true }).fill('Anna Kowalska')
    await strona.getByLabel('E-mail trenera', { exact: true }).fill('anna@example.test')
    for (const orientacja of ['pionowa', 'pozioma']) {
      const pobranie = strona.waitForEvent('download')
      await strona.getByRole('group', { name: `Okładka ${orientacja}`, exact: true }).getByRole('button', { name: 'Pobierz edytowalną okładkę PPTX' }).click()
      const plik = await pobranie
      const folder = `${katalog}/wypelniona-${orientacja}`
      await mkdir(folder, { recursive: true }); await plik.saveAs(`${folder}/zrodlo.pptx`)
    }
    await strona.getByLabel('Wybierz plik prezentacji PPTX').setInputFiles(fileURLToPath(new URL('../public/szablony/prezentacje/semper-poziom.pptx', import.meta.url)))
    await strona.getByRole('button', { name: 'Analizuj prezentację', exact: true }).click()
    await strona.getByRole('heading', { name: 'EKSPORT I DRUK' }).waitFor()
    await strona.getByRole('button', { name: 'Profil SEMPER: wysokość 20,5 cm' }).click()
    await strona.getByRole('button', { name: 'Zastosuj wymiary i korektę', exact: true }).click()
    await strona.getByText(/Zastosowano wymiary/).waitFor()
    await strona.getByLabel('Nazwa szkolenia', { exact: true }).fill('Szkolenie regresyjne SEMPER')
    await strona.getByLabel('Trener', { exact: true }).fill('Anna Kowalska')
    await strona.getByLabel('E-mail trenera', { exact: true }).fill('anna@example.test')
    await strona.getByText(/Zatwierdź mapowanie pól/).click()
    await strona.getByRole('button', { name: 'Zastosuj zatwierdzone mapowanie', exact: true }).click()
    await strona.getByText('Uzupełniono wyłącznie zatwierdzone pola pierwszego slajdu.').waitFor()
    const zlyPdf = utworzPdf(1)
    await strona.getByLabel('Wczytaj PDF aktualnego PPTX (wszystkie slajdy)').setInputFiles({ name: 'zly.pdf', mimeType: 'application/pdf', buffer: zlyPdf })
    await strona.getByRole('alert').filter({ hasText: /PDF ma 1 stron/ }).waitFor()
    await strona.getByLabel('Wczytaj PDF aktualnego PPTX (wszystkie slajdy)').setInputFiles({ name: 'zgodny.pdf', mimeType: 'application/pdf', buffer: utworzPdf(3) })
    await strona.getByRole('heading', { name: 'Podgląd wydruku' }).waitFor()
    await strona.waitForFunction(() => document.querySelector('.poprawiacz-prezentacji__wydruk')?.width === 1100)
    const druk = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'Pobierz PDF do druku', exact: true }).click()
    const plikDruku = await druk; await plikDruku.saveAs(`${katalog}/druk-ui.pdf`)
    for (const orientacja of ['pionowa', 'pozioma']) {
      await strona.getByRole('group', { name: `Okładka ${orientacja}`, exact: true }).getByLabel('Wczytaj PDF tej okładki po eksporcie z PowerPoint').setInputFiles({ name: 'okladka.pdf', mimeType: 'application/pdf', buffer: utworzPdf(1, orientacja === 'pionowa' ? 'portrait' : 'landscape') })
      await strona.waitForFunction(() => document.querySelector('.poprawiacz-prezentacji')?.getAttribute('aria-busy') === 'false')
      assert.equal(await strona.getByRole('alert').count(), 0, await strona.getByRole('alert').allTextContents())
    }
    const komplet = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'Pobierz komplet ZIP', exact: true }).click()
    const plikKompletu = await komplet; await plikKompletu.saveAs(`${katalog}/komplet-ui.zip`)
    const zip = await JSZip.loadAsync(await readFile(`${katalog}/komplet-ui.zip`))
    assert.ok(zip.file('okladka_pionowa.pdf')); assert.ok(zip.file('okladka_pozioma.png')); assert.ok(zip.file('USTAWIENIA_DRUKU.txt'))
    assert.equal(Object.keys(zip.files).filter((nazwa) => nazwa.endsWith('.pptx')).length, 1)
    await strona.locator('.poprawiacz-prezentacji__wydruk').screenshot({ path: `${katalog}/podglad-ui.png` })
    await strona.getByRole('button', { name: 'Zastosuj wymiary i korektę', exact: true }).click()
    await strona.getByText(/Zastosowano wymiary/).waitFor()
    assert.equal(await strona.getByRole('heading', { name: 'Podgląd wydruku' }).count(), 0)
    await strona.setViewportSize({ width: 390, height: 844 })
    assert.ok(await strona.locator('.poprawiacz-prezentacji').evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    assert.deepEqual(bledy, [])
  } catch (blad) { console.error(blad); throw blad }
  finally { await przegladarka.close() }
})

test('rzeczywiste PDF: 1, 10, 99, 100, 101 i 292 slajdy oraz dokladny podzial stron', { timeout: 900000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    await otworzNarzedzie(strona)
    for (const liczba of [1, 10, 99, 100, 101, 292]) {
      const wynik = await strona.evaluate(async ({ bajty, liczba }) => {
        const { wygenerujPdfDruku } = await import('/src/moduly/narzedzia/poprawiacz_prezentacji/eksport/eksportMaterialow.ts')
        const { domyslneUstawieniaDruku, przygotujPlanDruku } = await import('/src/moduly/narzedzia/poprawiacz_prezentacji/eksport/planDruku.ts')
        const { otworzPdfPrezentacji, renderujStronePdf } = await import('/src/moduly/narzedzia/poprawiacz_prezentacji/eksport/renderowaniePdf.ts')
        const pliki = await wygenerujPdfDruku(new Uint8Array(bajty).buffer, przygotujPlanDruku(liczba, domyslneUstawieniaDruku()))
        const strony = []
        for (const plik of pliki) {
          const dokument = await otworzPdfPrezentacji(await plik.plik.arrayBuffer())
          try {
            const widok = (await dokument.getPage(1)).getViewport({ scale: 1 })
            const wynik = { liczba: dokument.numPages, pozioma: widok.width > widok.height }
            if (liczba === 101 && plik.nazwa === 'materialy_do_druku.pdf') {
              const obraz = await renderujStronePdf(dokument, 1, 1100)
              const piksele = obraz.getContext('2d').getImageData(0, 0, obraz.width, obraz.height).data
              let czerwoneNaGorze = 0, turkusoweNaDole = 0
              for (let indeks = 0; indeks < piksele.length; indeks += 4) {
                const czyGora = indeks / 4 / obraz.width < obraz.height / 2
                if (czyGora && piksele[indeks] > 150 && piksele[indeks + 1] < 90 && piksele[indeks + 2] < 90) czerwoneNaGorze++
                if (!czyGora && piksele[indeks] < 50 && piksele[indeks + 1] > 80 && piksele[indeks + 1] < 170 && piksele[indeks + 2] > 80) turkusoweNaDole++
              }
              if (czerwoneNaGorze < 1000 || turkusoweNaDole < 1000) throw new Error('Render PDF nie zachował kolejności dwóch slajdów na stronie.')
              wynik.obraz = obraz.toDataURL('image/png').split(',')[1]
            }
            strony.push(wynik)
          }
          finally { await dokument.loadingTask.destroy() }
        }
        return strony
      }, { bajty: [...utworzPdf(liczba)], liczba })
      for (const plik of wynik) { if (plik.obraz) { await mkdir(katalog, { recursive: true }); await writeFile(`${katalog}/dwa-slajdy-w-pdf.png`, Buffer.from(plik.obraz, 'base64')); delete plik.obraz } }
      assert.deepEqual(wynik, liczba > 100 ? [{ liczba: 1, pozioma: false }, { liczba: Math.ceil((liczba - 1) / 2), pozioma: true }] : [{ liczba, pozioma: true }])
      console.log(`PDF ${liczba} slajdów: ${wynik.map((plik) => plik.liczba).join(' + ')} stron`)
    }
  } catch (blad) { console.error(blad); throw blad }
  finally { await przegladarka.close() }
})

test('trzy tryby: edycja, historia, zsynchronizowane porownanie, klawiatura i skala 75/85%', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1600, height: 1000 } })
    const bledy = []; strona.on('pageerror', (blad) => bledy.push(blad.message))
    await otworzNarzedzie(strona)
    await strona.getByLabel('Wybierz plik prezentacji PPTX').setInputFiles({ name: 'tryby.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: Buffer.from(await utworzFixturePptx()) })
    await strona.getByRole('button', { name: 'Analizuj prezentację', exact: true }).click()
    const tryby = strona.getByRole('region', { name: 'Tryby prezentacji' })
    await tryby.waitFor()
    await tryby.locator('.prezentacja-lista-obiektow').getByRole('button', { name: 'Obiekt 5', exact: true }).click()
    await tryby.getByLabel('Fragment tekstu 1', { exact: true }).fill('Ręczna zmiana żółć')
    await tryby.getByRole('button', { name: 'Zastosuj właściwości', exact: true }).click()
    await tryby.getByText('Historia zmian (1)', { exact: true }).waitFor()
    await tryby.getByRole('button', { name: 'Porównawczy', exact: true }).click()
    assert.equal(await tryby.getByText('ORYGINAŁ', { exact: true }).count(), 1)
    assert.equal(await tryby.getByText('PO POPRAWKACH', { exact: true }).count(), 1)
    await tryby.locator('summary').filter({ hasText: 'WYKRYTE ZMIANY' }).click()
    await tryby.getByRole('button', { name: 'Zielony', exact: true }).click()
    assert.ok(await tryby.locator('[data-tozsamosc]').evaluateAll((elementy) => elementy.some((element) => element.style.borderColor === 'rgb(67, 160, 71)')))
    await tryby.locator('summary').filter({ hasText: 'WYKRYTE ZMIANY' }).click()
    await tryby.getByRole('button', { name: '200%', exact: true }).click()
    assert.match(await tryby.locator('.prezentacja-porownanie').getAttribute('style'), /scale\(2\)/)
    await tryby.getByLabel('Wariant', { exact: true }).selectOption('przezroczystosc')
    assert.equal(await tryby.locator('.prezentacja-nakladka__oryginal').evaluate((element) => getComputedStyle(element).opacity), '0.5')
    await tryby.getByLabel('Wariant', { exact: true }).selectOption('odslanianie')
    assert.match(await tryby.locator('.prezentacja-nakladka__oryginal').getAttribute('style'), /inset/)
    await tryby.getByRole('button', { name: 'Cofnij', exact: true }).click()
    await tryby.getByText('WYKRYTE ZMIANY (0)', { exact: true }).waitFor()
    await tryby.getByRole('button', { name: 'Ponów', exact: true }).click()
    await tryby.getByText('WYKRYTE ZMIANY (1)', { exact: true }).waitFor()
    await tryby.getByRole('button', { name: 'Dopasuj do okna', exact: true }).click()
    await tryby.getByRole('button', { name: 'Pełnoekranowy', exact: true }).click()
    await strona.locator('.prezentacja-tryby--pelny').waitFor()
    await strona.keyboard.press('End'); assert.equal(await tryby.getByLabel('Numer slajdu').inputValue(), '3')
    await strona.keyboard.press('Home'); assert.equal(await tryby.getByLabel('Numer slajdu').inputValue(), '1')
    await strona.keyboard.press('ArrowRight'); assert.equal(await tryby.getByLabel('Numer slajdu').inputValue(), '2')
    await strona.keyboard.press('Escape')
    await tryby.getByRole('button', { name: 'Roboczy', exact: true }).waitFor()
    assert.equal(await tryby.getByLabel('Numer slajdu').inputValue(), '2')
    await tryby.getByLabel('Numer slajdu').fill('1')
    for (const skala of [75, 85]) {
      await strona.evaluate(async (wartosc) => { const modul = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts'); await modul.zastosujSkaleInterfejsu(wartosc) }, skala)
      await tryby.getByRole('button', { name: 'Dopasuj do okna', exact: true }).click()
      const obiekt = tryby.locator('.prezentacja-scena [data-tozsamosc$="#5"]')
      await obiekt.scrollIntoViewIfNeeded()
      const prostokat = await obiekt.boundingBox()
      await strona.mouse.move(prostokat.x + prostokat.width / 2, prostokat.y + prostokat.height / 2)
      await strona.mouse.down()
      await strona.mouse.move(prostokat.x + prostokat.width / 2 - 30, prostokat.y + prostokat.height / 2 - 20, { steps: 10 })
      assert.equal(await tryby.getByText(`Historia zmian (${skala === 75 ? 1 : 2})`, { exact: true }).count(), 1, 'ruch nie zapisuje historii przed puszczeniem')
      await strona.mouse.up()
      await tryby.getByText(`Historia zmian (${skala === 75 ? 2 : 3})`, { exact: true }).waitFor()
    }
    await mkdir(katalog, { recursive: true })
    await tryby.screenshot({ path: `${katalog}/tryb-roboczy.png` })
    await tryby.getByRole('button', { name: 'Porównawczy', exact: true }).click()
    await tryby.getByLabel('Wariant', { exact: true }).selectOption('obok')
    await tryby.screenshot({ path: `${katalog}/tryb-porownawczy.png` })
    await strona.setViewportSize({ width: 390, height: 844 })
    assert.ok(await tryby.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('dotyk: zaznaczenie nie otwiera klawiatury, a tryby nie gubia slajdu', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    await otworzNarzedzie(strona)
    await strona.getByLabel('Wybierz plik prezentacji PPTX').setInputFiles({ name: 'dotyk.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: Buffer.from(await utworzFixturePptx()) })
    await strona.getByRole('button', { name: 'Analizuj prezentację', exact: true }).tap()
    const tryby = strona.getByRole('region', { name: 'Tryby prezentacji' })
    await tryby.waitFor()
    await tryby.locator('.prezentacja-lista-obiektow').getByRole('button', { name: 'Obiekt 5', exact: true }).tap()
    assert.equal(await strona.evaluate(() => ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)), false)
    const sesja = await strona.context().newCDPSession(strona)
    const obiekt = tryby.locator('.prezentacja-scena [data-tozsamosc$="#5"]')
    await obiekt.scrollIntoViewIfNeeded()
    const prostokat = await obiekt.boundingBox()
    const x = prostokat.x + prostokat.width / 2, y = prostokat.y + prostokat.height / 2
    await sesja.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await sesja.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 20, y: y - 15 }] })
    await sesja.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await tryby.getByText('Historia zmian (1)', { exact: true }).waitFor()
    for (let indeks = 0; indeks < 10; indeks++) {
      await tryby.getByRole('button', { name: 'Porównawczy', exact: true }).tap()
      await tryby.getByRole('button', { name: 'Roboczy', exact: true }).tap()
    }
    assert.equal(await tryby.getByLabel('Numer slajdu').inputValue(), '1')
    assert.ok(await tryby.locator('canvas').count() <= 2)
    await tryby.screenshot({ path: `${katalog}/tryb-dotyk.png` })
  } finally { await przegladarka.close() }
})

test('wierne PDF: wspolna metoda renderowania, odswiezanie cache i brak renderowania calej prezentacji przy zmianie trybu', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1600, height: 1200 } })
    await otworzNarzedzie(strona)
    await strona.getByLabel('Wybierz plik prezentacji PPTX').setInputFiles({ name: 'render.pptx', mimeType: 'application/octet-stream', buffer: Buffer.from(await utworzFixturePptx()) })
    await strona.getByRole('button', { name: 'Analizuj prezentację', exact: true }).click()
    const tryby = strona.getByRole('region', { name: 'Tryby prezentacji' })
    await tryby.locator('.prezentacja-lista-obiektow').getByRole('button', { name: 'Obiekt 5', exact: true }).click()
    await tryby.getByLabel('Fragment tekstu 1', { exact: true }).fill('Zmieniona wersja')
    await tryby.getByRole('button', { name: 'Zastosuj właściwości', exact: true }).click()
    await tryby.getByText('Historia zmian (1)', { exact: true }).waitFor()
    await tryby.getByRole('button', { name: 'Porównawczy', exact: true }).click()
    await tryby.getByText('Renderowanie podglądu', { exact: true }).click()
    const bufor = utworzPdf(3)
    await tryby.getByLabel('PDF oryginału', { exact: true }).setInputFiles({ name: 'oryginal.pdf', mimeType: 'application/pdf', buffer: bufor })
    await strona.waitForFunction(() => document.querySelector('.poprawiacz-prezentacji').getAttribute('aria-busy') === 'false')
    await tryby.getByLabel('PDF aktualnej wersji', { exact: true }).setInputFiles({ name: 'aktualny.pdf', mimeType: 'application/pdf', buffer: bufor })
    await strona.waitForFunction(() => [...document.querySelectorAll('.prezentacja-podglad canvas')].filter((plotno) => !plotno.hidden && plotno.width === 1600).length === 2)
    const sesja = await strona.context().newCDPSession(strona)
    await sesja.send('HeapProfiler.collectGarbage')
    const przed = await sesja.send('Runtime.getHeapUsage')
    for (let indeks = 0; indeks < 12; indeks++) {
      await tryby.getByRole('button', { name: 'Roboczy', exact: true }).click()
      await tryby.getByRole('button', { name: 'Porównawczy', exact: true }).click()
    }
    await sesja.send('HeapProfiler.collectGarbage')
    const po = await sesja.send('Runtime.getHeapUsage')
    assert.ok(po.usedSize - przed.usedSize < 32 * 1024 * 1024, 'przelaczanie nie moze zatrzymywac kolejnych kopii PDF i modeli')
    console.log('Pamięć po 24 przełączeniach: ' + Math.round((po.usedSize - przed.usedSize) / 1024) + ' KiB')
    await tryby.getByRole('button', { name: 'Porównaj piksele', exact: true }).click()
    await tryby.getByText(/Różnice wizualne: 0.00%/).waitFor()
    const inny = new jsPDF({ orientation: 'landscape', format: 'a4' })
    for (let numer = 1; numer <= 3; numer++) { if (numer > 1) inny.addPage(); inny.setFillColor('#00ff00'); inny.rect(0, 0, 297, 210, 'F') }
    await tryby.getByLabel('PDF aktualnej wersji', { exact: true }).setInputFiles({ name: 'inny.pdf', mimeType: 'application/pdf', buffer: Buffer.from(inny.output('arraybuffer')) })
    await strona.waitForFunction(() => {
      const plotno = document.querySelectorAll('.prezentacja-podglad canvas')[1]
      return plotno && !plotno.hidden && plotno.getContext('2d').getImageData(10, 10, 1, 1).data[1] > 240 && plotno.getContext('2d').getImageData(10, 10, 1, 1).data[0] < 20
    })
    assert.equal(await tryby.getByText(/Różnice wizualne: 0.00%/).count(), 0, 'wynik starego PDF musi byc uniewazniony')
    await tryby.getByText('Renderowanie podglądu', { exact: true }).click()
    await tryby.screenshot({ path: `${katalog}/porownanie-pdf.png` })
    await tryby.getByRole('button', { name: 'Pełnoekranowy', exact: true }).click()
    await strona.locator('.prezentacja-tryby--pelny canvas:not([hidden])').waitFor()
    await strona.screenshot({ path: `${katalog}/pelnoekranowy-pdf.png` })
    await strona.keyboard.press('Escape')
    await tryby.getByRole('button', { name: 'Roboczy', exact: true }).click()
    await tryby.locator('.prezentacja-podglad canvas:not([hidden])').waitFor()
    await tryby.locator('.prezentacja-lista-obiektow').getByRole('button', { name: 'Obiekt 5', exact: true }).click()
    await tryby.getByLabel('Fragment tekstu 1', { exact: true }).fill('Nowa rewizja')
    await tryby.getByRole('button', { name: 'Zastosuj właściwości', exact: true }).click()
    await tryby.getByText('Historia zmian (2)', { exact: true }).waitFor()
    assert.equal(await tryby.locator('.prezentacja-podglad canvas').count(), 0, 'PDF poprzedniej rewizji nie jest pokazywany')
  } finally { await przegladarka.close() }
})
