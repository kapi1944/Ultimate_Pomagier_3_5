import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

for (const [motywKoloru, szerokoscOkna, czyPodpis] of [['semper', 1280, false], ['iist', 1600, false], ['semper', 1600, true]]) {
test(`dyplomy: proporcje logo ${motywKoloru}, podpis ${czyPodpis} w PDF odpowiadają podglądowi`, { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: szerokoscOkna, height: 1100 }, acceptDownloads: true })
    await strona.goto(`${adres}/dokumenty/dyplomy`)
    await strona.evaluate((motywKoloru) => localStorage.setItem('ultimate-pomagier.dyplomy.generator-pawla', JSON.stringify({
      motywKoloru,
      tytulSzkolenia: 'Proporcje logo', wybraneDaty: ['2026-10-16'], liczbaGodzin: '8', trener: 'Jan Nowak', trybSzkolenia: 'online',
      uczestnicy: [{ id: 'anna', imieNazwisko: 'Anna Kowalska', numerRejestru: 'D/001/2026', idDodatkuGornego: '', idDodatkuDolnego: '', drugaStrona: false }],
    })), motywKoloru)
    await strona.reload()
    if (await strona.getByRole('button', { name: 'Zaloguj', exact: true }).isVisible()) await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await strona.getByRole('heading', { name: 'Generator Dyplomów', exact: true }).waitFor()
    const przelacznikPodpisu = strona.getByRole('switch', { name: 'Gotowy podpis organizatora (SEMPER)', exact: true })
    assert.equal(await przelacznikPodpisu.isChecked(), false)
    assert.equal(await przelacznikPodpisu.isDisabled(), motywKoloru === 'iist')
    if (czyPodpis) {
      await przelacznikPodpisu.check()
      await strona.waitForFunction(() => JSON.parse(localStorage.getItem('ultimate-pomagier.dyplomy.generator-pawla')).czyGotowyPodpisOrganizatora === true)
      await strona.reload()
      assert.equal(await przelacznikPodpisu.isChecked(), true)
      assert.equal(await strona.locator('.dyplomy__podglad-kartki .dyplom-kartka__logo-semper').count(), 0)
    }
    const kartka = strona.locator('.dyplomy__podglad-kartki .dyplom-kartka').first()
    const selektorLogo = czyPodpis ? '.dyplom-kartka__organizator-z-podpisem' : '.dyplom-kartka__logo-semper'
    const logo = kartka.locator(selektorLogo)
    await logo.locator('img').evaluate((obraz) => obraz.decode())
    const zrzut = (await strona.screenshot({ fullPage: true })).toString('base64')
    const geometria = await logo.evaluate((element) => {
      const ramka = element.getBoundingClientRect()
      const kartka = element.closest('.dyplom-kartka').getBoundingClientRect()
      return { x: (ramka.x - kartka.x) / kartka.width, y: (ramka.y - kartka.y) / kartka.height, szerokosc: ramka.width / kartka.width, wysokosc: ramka.height / kartka.height,
        zrzutX: ramka.x + window.scrollX, zrzutY: ramka.y + window.scrollY, zrzutSzerokosc: ramka.width, zrzutWysokosc: ramka.height }
    })
    const pobranie = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'PDF wszystkich uczestników (1)', exact: true }).click()
    const plik = await pobranie
    const bajty = [...await readFile(await plik.path())]
    const proporcje = await strona.evaluate(async ({ bajty, zrzut, geometria, selektorLogo }) => {
      const { getDocument, GlobalWorkerOptions } = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
      GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs'
      const dokument = await getDocument({ data: new Uint8Array(bajty) }).promise
      const strona = await dokument.getPage(1)
      const widok = strona.getViewport({ scale: 2 })
      const kanwaPdf = document.createElement('canvas')
      kanwaPdf.width = Math.ceil(widok.width)
      kanwaPdf.height = Math.ceil(widok.height)
      await strona.render({ canvas: kanwaPdf, canvasContext: kanwaPdf.getContext('2d'), viewport: widok }).promise
      const obraz = new Image()
      obraz.src = `data:image/png;base64,${zrzut}`
      await obraz.decode()
      const kanwaPodgladu = document.createElement('canvas')
      kanwaPodgladu.width = obraz.width
      kanwaPodgladu.height = obraz.height
      kanwaPodgladu.getContext('2d').drawImage(obraz, 0, 0)
      function zmierzProporcje(kanwa, x, y, szerokosc, wysokosc) {
        const dane = kanwa.getContext('2d').getImageData(Math.round(x), Math.round(y), Math.round(szerokosc), Math.round(wysokosc))
        let lewo = dane.width, prawo = 0, gora = dane.height, dol = 0
        for (let wiersz = 0; wiersz < dane.height; wiersz++) for (let kolumna = 0; kolumna < dane.width; kolumna++) {
          const indeks = (wiersz * dane.width + kolumna) * 4
          if (dane.data[indeks + 3] > 128 && Math.min(...dane.data.slice(indeks, indeks + 3)) < 150) {
            lewo = Math.min(lewo, kolumna); prawo = Math.max(prawo, kolumna)
            gora = Math.min(gora, wiersz); dol = Math.max(dol, wiersz)
          }
        }
        return {
          proporcje: (prawo - lewo + 1) / (dol - gora + 1),
          szerokosc: (prawo - lewo + 1) / dane.width,
          wysokosc: (dol - gora + 1) / dane.height,
        }
      }
      const wynik = {
        podglad: zmierzProporcje(kanwaPodgladu, geometria.zrzutX, geometria.zrzutY, geometria.zrzutSzerokosc, geometria.zrzutWysokosc),
        pdf: zmierzProporcje(kanwaPdf, geometria.x * widok.width, geometria.y * widok.height, geometria.szerokosc * widok.width, geometria.wysokosc * widok.height),
      }
      const oryginal = document.querySelector(`.dyplomy__podglad-kartki ${selektorLogo} img`)
      const kanwaOryginalu = document.createElement('canvas')
      kanwaOryginalu.width = oryginal.naturalWidth
      kanwaOryginalu.height = oryginal.naturalHeight
      kanwaOryginalu.getContext('2d').drawImage(oryginal, 0, 0)
      wynik.oryginal = zmierzProporcje(kanwaOryginalu, 0, 0, kanwaOryginalu.width, kanwaOryginalu.height)
      await dokument.cleanup()
      return wynik
    }, { bajty, zrzut, geometria, selektorLogo })
    assert.ok(Math.abs(proporcje.pdf.proporcje / proporcje.oryginal.proporcje - 1) < 0.05, `PDF zmienia proporcje źródła: ${JSON.stringify(proporcje)}`)
    assert.ok(Math.abs(proporcje.pdf.proporcje / proporcje.podglad.proporcje - 1) < 0.05, `Spłaszczone logo: ${JSON.stringify(proporcje)}`)
    for (const wymiar of ['szerokosc', 'wysokosc']) {
      assert.ok(Math.abs(proporcje.pdf[wymiar] - proporcje.podglad[wymiar]) < 0.04, `PDF zmienia rozmiar logo: ${JSON.stringify(proporcje)}`)
    }
    if (czyPodpis) {
      await przelacznikPodpisu.uncheck()
      await kartka.locator('.dyplom-kartka__logo-semper img').waitFor()
      assert.equal(await kartka.locator('.dyplom-kartka__organizator-z-podpisem').count(), 0)
    }
  } finally { await przegladarka.close() }
})
}

test('dyplomy: puste pozycje, przesunięcie logotypów, odczyt szkicu i eksport', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1600, height: 1100 }, acceptDownloads: true })
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(`${adres}/dokumenty/dyplomy`)
    await strona.evaluate(() => localStorage.setItem('ultimate-pomagier.dyplomy.generator-pawla', JSON.stringify({
      tytulSzkolenia: 'Test dyplomów', wybraneDaty: ['2026-10-16'], liczbaGodzin: '8', trener: 'Jan Nowak', trybSzkolenia: 'online',
      poczatkowyNumerRejestru: 'D/001/2026', indeksZmiennegoBloku: 1, uczestnicyTekst: 'Anna Kowalska',
      uczestnicy: [{ id: 'anna', imieNazwisko: 'Anna Kowalska', numerRejestru: 'D/001/2026', idDodatkuGornego: 'gora', idDodatkuDolnego: 'dol', drugaStrona: true }],
      dodatki: [{ id: 'gora', typ: 'tekst', tekst: 'GÓRNE LOGO', nazwa: 'Góra' }, { id: 'dol', typ: 'tekst', tekst: 'DOLNE LOGO', nazwa: 'Dół' }],
    })))
    await strona.reload()
    if (await strona.getByRole('button', { name: 'Zaloguj', exact: true }).isVisible()) await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await strona.getByRole('heading', { name: 'Generator Dyplomów', exact: true }).waitFor()
    await strona.getByLabel('Liczba pustych dyplomów', { exact: true }).fill('3')
    await strona.getByRole('button', { name: '+ Dodaj puste dyplomy', exact: true }).click()
    await strona.getByRole('button', { name: 'PDF wszystkich uczestników (4)', exact: true }).waitFor()
    const gora = strona.getByLabel(/^Przesunięcie górnego logo/)
    const dol = strona.getByLabel(/^Przesunięcie dolnego logo/)
    const logoDolne = strona.locator('.dyplomy__podglad-kartki .dyplom-kartka__dodatek--dol').first()
    const logoGorne = strona.locator('.dyplomy__podglad-kartki .dyplom-kartka__dodatek--gora').first()
    const przedDolne = await logoDolne.boundingBox()
    const przedGorne = await logoGorne.boundingBox()
    await dol.fill('5')
    await gora.fill('2')
    assert.ok((await logoDolne.boundingBox()).y < przedDolne.y)
    assert.ok((await logoGorne.boundingBox()).y < przedGorne.y)
    await strona.getByRole('button', { name: 'Ustawienia dyplomu', exact: true }).click()
    const pogrubienieGorne = strona.getByRole('switch', { name: 'Pogrubiony tekst górnych dodatków', exact: true })
    const pogrubienieDolne = strona.getByRole('switch', { name: 'Pogrubiony tekst dolnych dodatków', exact: true })
    assert.equal(await pogrubienieGorne.isChecked(), true)
    assert.equal(await pogrubienieDolne.isChecked(), true)
    await pogrubienieGorne.uncheck()
    const tekstGorny = strona.locator('.dyplomy__podglad-kartki .dyplom-kartka__dodatek--gora .dyplom-kartka__dodatek-tekst').first()
    const tekstDolny = strona.locator('.dyplomy__podglad-kartki .dyplom-kartka__dodatek--dol .dyplom-kartka__dodatek-tekst').first()
    assert.equal(await tekstGorny.evaluate((element) => getComputedStyle(element).fontWeight), '400')
    assert.equal(await tekstDolny.evaluate((element) => getComputedStyle(element).fontWeight), '700')
    await pogrubienieGorne.check()
    await pogrubienieDolne.uncheck()
    assert.equal(await tekstGorny.evaluate((element) => getComputedStyle(element).fontWeight), '700')
    assert.equal(await tekstDolny.evaluate((element) => getComputedStyle(element).fontWeight), '400')
    await strona.getByRole('button', { name: 'Ustawienia dyplomu', exact: true }).click()
    await strona.getByLabel(/^Lista uczestników/).fill('Anna Kowalska\nPiotr Nowak')
    await strona.getByRole('button', { name: 'PDF wszystkich uczestników (5)', exact: true }).waitFor()
    await strona.waitForFunction(() => JSON.parse(localStorage.getItem('ultimate-pomagier.dyplomy.generator-pawla')).uczestnicy.length === 5)
    await strona.reload()
    await strona.getByRole('button', { name: 'PDF wszystkich uczestników (5)', exact: true }).waitFor()
    const stan = await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimate-pomagier.dyplomy.generator-pawla')))
    assert.equal(stan.uczestnicy.filter((osoba) => osoba.czyPustyDyplom).length, 3)
    assert.equal(new Set(stan.uczestnicy.map((osoba) => osoba.numerRejestru)).size, 5)
    assert.equal(stan.przesuniecieLogotypuDolnego, 5)
    assert.equal(stan.przesuniecieLogotypuGornego, 2)
    assert.equal(stan.czyPogrubionyDodatekGorny, true)
    assert.equal(stan.czyPogrubionyDodatekDolny, false)
    assert.equal(await tekstGorny.evaluate((element) => getComputedStyle(element).fontWeight), '700')
    assert.equal(await tekstDolny.evaluate((element) => getComputedStyle(element).fontWeight), '400')
    assert.equal(await strona.locator('.dyplomy__druk .dyplom-kartka__dodatek--dol .dyplom-kartka__dodatek-tekst').first().evaluate((element) => getComputedStyle(element).fontWeight), '400')
    assert.equal(await strona.locator('.dyplomy__druk .dyplom-kartka__miejsce-na-nazwisko').count(), 3)
    const pobranie = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'PDF wszystkich uczestników (5)', exact: true }).click()
    const plik = await pobranie
    assert.equal(await plik.failure(), null)
    assert.match(plik.suggestedFilename(), /\.pdf$/)
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})
