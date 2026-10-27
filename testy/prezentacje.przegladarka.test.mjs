import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'

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
    await strona.waitForFunction(() => document.querySelector('canvas')?.width === 1100)
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
    await strona.locator('canvas').screenshot({ path: `${katalog}/podglad-ui.png` })
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
