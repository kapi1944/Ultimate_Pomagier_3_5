import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'
const katalog = join(tmpdir(), 'pomagier-karty-regresja')

test('karty na drzwi: typografia, zapis, izolacja kart, szablony, druk i PDF', { timeout: 180000 }, async () => {
  await mkdir(katalog, { recursive: true })
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const kontekst = await przegladarka.newContext({ viewport: { width: 1500, height: 1100 }, acceptDownloads: true })
    const strona = await kontekst.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(`${adres}/dokumenty/karta-na-drzwi`)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    const poleTytulu = strona.getByRole('textbox', { name: 'Tytuł szkolenia', exact: true })
    await poleTytulu.waitFor()
    const podglad = strona.locator('.karta-na-drzwi__podglad-wybranej')
    const tytul = podglad.locator('[data-blok-swobodny="tytul"]')
    const odczytaj = () => podglad.evaluate((obszar) => {
      const strona = obszar.querySelector('.karta-na-drzwi__strona')
      const tytul = obszar.querySelector('[data-blok-swobodny="tytul"]')
      const organizator = obszar.querySelector('[data-blok-swobodny="organizator"]')
      const zakres = document.createRange()
      zakres.selectNodeContents(tytul)
      const ramka = strona.getBoundingClientRect()
      const blok = tytul.getBoundingClientRect()
      const tresc = zakres.getBoundingClientRect()
      return {
        tekst: tytul.textContent, rozmiar: Number(tytul.dataset.rozmiarPt), przepelnienie: tytul.dataset.przepelnienie,
        szerokosc: blok.width / ramka.width, x: (blok.x - ramka.x) / ramka.width,
        wysokoscTekstu: tresc.height / ramka.width, dolTytulu: (tresc.bottom - ramka.top) / ramka.height,
        organizatorY: (organizator.getBoundingClientRect().y - ramka.y) / ramka.height,
        szerokoscStrony: ramka.width, tekstWBloku: tresc.left >= blok.left - 1 && tresc.right <= blok.right + 1,
      }
    })
    assert.match(await strona.locator('.karta-na-drzwi__pola label').last().innerText(), /^Organizator/)
    const stopka = (await odczytaj()).organizatorY
    assert.ok(stopka > 0.9)
    for (const tresc of ['Krótki tytuł', ...[100, 200, 350].map((dlugosc) => 'Zażółć gęślą jaźń — szkolenie praktyczne '.repeat(20).slice(0, dlugosc)), 'Ź'.repeat(350), 'Ćwiczenia: ąęćłńóśźż ĄĘĆŁŃÓŚŹŻ', 'Prawo & finanse <2026> „Nowe” / 50% + § 2']) {
      await poleTytulu.fill(tresc)
      const wynik = await odczytaj()
      assert.equal(wynik.tekst, tresc)
      assert.equal(wynik.przepelnienie, 'false', JSON.stringify(wynik))
      assert.ok(wynik.tekstWBloku)
      assert.ok(wynik.rozmiar >= 14 && wynik.rozmiar <= 24)
      assert.equal(wynik.organizatorY, stopka)
    }
    await poleTytulu.fill('Zażółć gęślą jaźń — zarządzanie zespołem '.repeat(9).slice(0, 350))
    await strona.getByRole('button', { name: 'Edytuj układ', exact: true }).click()
    const szerokosc = strona.getByRole('slider', { name: 'Szerokość tekstu', exact: true })
    const czcionka = strona.getByRole('slider', { name: 'Rozmiar czcionki tytułu', exact: true })
    await szerokosc.fill('100')
    const szeroki = await odczytaj()
    await szerokosc.fill('40')
    const waski = await odczytaj()
    assert.ok(waski.szerokosc < szeroki.szerokosc / 2)
    assert.ok(Math.abs(waski.x - (1 - waski.szerokosc) / 2) < 0.001)
    assert.equal(waski.szerokoscStrony, szeroki.szerokoscStrony)
    assert.ok(waski.wysokoscTekstu > szeroki.wysokoscTekstu || waski.rozmiar < szeroki.rozmiar)
    await czcionka.fill('48')
    await strona.getByRole('switch', { name: 'Automatycznie dopasuj tekst' }).uncheck()
    assert.equal((await odczytaj()).rozmiar, 48)
    assert.equal((await odczytaj()).przepelnienie, 'true')
    assert.equal(await podglad.getByRole('status').isVisible(), true)
    await strona.getByRole('switch', { name: 'Automatycznie dopasuj tekst' }).check()
    assert.ok((await odczytaj()).rozmiar < 48)
    await szerokosc.fill('80')
    await czcionka.fill('24')
    await strona.getByRole('button', { name: 'Zapisz', exact: true }).click()
    const zapisany = await odczytaj()
    await strona.reload()
    await poleTytulu.waitFor()
    assert.deepEqual(await odczytaj(), zapisany)
    await strona.getByRole('button', { name: 'Duplikuj', exact: true }).click()
    await strona.getByRole('button', { name: 'Edytuj układ', exact: true }).click()
    await szerokosc.fill('60')
    await strona.locator('.karta-na-drzwi__lista button').first().click()
    assert.equal(await szerokosc.inputValue(), '80')
    await strona.locator('.karta-na-drzwi__lista button').last().click()
    assert.equal(await szerokosc.inputValue(), '60')
    await strona.getByRole('switch', { name: 'Edytuj układ szablonu', exact: true }).check()
    await podglad.locator('[data-blok-edytowalny="organizator"]').click()
    await strona.getByLabel('Y (mm)', { exact: true }).fill('185')
    const przesuniety = (await odczytaj()).organizatorY
    await poleTytulu.fill('Inny tytuł po przesunięciu')
    assert.equal((await odczytaj()).organizatorY, przesuniety)
    strona.once('dialog', (okno) => okno.accept('Regresja typografii'))
    await strona.getByRole('button', { name: 'Zapisz jako nowy szablon', exact: true }).click()
    await strona.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await strona.reload()
    await poleTytulu.waitFor()
    assert.equal((await odczytaj()).organizatorY, przesuniety)
    await strona.getByRole('button', { name: 'Edytuj układ', exact: true }).click()
    const szablony = strona.getByLabel('Szablon', { exact: true })
    await szablony.selectOption('bazowy-oryginalny')
    assert.equal((await odczytaj()).organizatorY, stopka)
    await szablony.selectOption({ label: 'Regresja typografii' })
    assert.equal((await odczytaj()).organizatorY, przesuniety)
    assert.equal(await szerokosc.inputValue(), '60')
    await podglad.locator('[data-blok-edytowalny="tytul"]').click()
    await strona.getByLabel('Rozmiar (pt)', { exact: true }).fill('26')
    assert.equal(await czcionka.inputValue(), '26')
    strona.once('dialog', (okno) => okno.accept())
    await strona.getByRole('button', { name: 'Resetuj cały układ', exact: true }).click()
    assert.equal(await szerokosc.inputValue(), '80')
    assert.equal((await odczytaj()).organizatorY, stopka)
    await poleTytulu.fill('Zażółć gęślą jaźń — zarządzanie zespołem '.repeat(9).slice(0, 350))
    await strona.getByRole('textbox', { name: 'Organizator', exact: true }).fill('Centrum Organizacji Szkoleń i Konferencji SEMPER')
    await strona.getByRole('textbox', { name: 'Dodatkowy tekst', exact: true }).fill('Zapraszamy uczestników szkolenia')
    await strona.getByRole('button', { name: 'Edytuj układ', exact: true }).click()
    await podglad.screenshot({ path: join(katalog, 'podglad.png') })
    const porownanie = await strona.evaluate(() => {
      const odczytaj = (strona) => {
        const szerokosc = strona.getBoundingClientRect().width
        return [...strona.querySelectorAll('[data-blok-swobodny]')].map((blok) => {
          const styl = getComputedStyle(blok)
          return [blok.dataset.blokSwobodny, parseFloat(styl.fontSize) / szerokosc, parseFloat(styl.width) / szerokosc, blok.style.top]
        })
      }
      return [odczytaj(document.querySelector('.karta-na-drzwi__podglad-wybranej section')), odczytaj([...document.querySelectorAll('.karta-na-drzwi__eksport-zestawu section')].at(-1))]
    })
    for (let i = 0; i < porownanie[0].length; i++) {
      assert.equal(porownanie[0][i][0], porownanie[1][i][0])
      assert.ok(Math.abs(porownanie[0][i][1] - porownanie[1][i][1]) < 0.0001)
      assert.ok(Math.abs(porownanie[0][i][2] - porownanie[1][i][2]) < 0.0001)
      assert.equal(porownanie[0][i][3], porownanie[1][i][3])
    }
    for (const [przycisk, nazwa] of [['PDF wybranej karty', 'pojedyncza.pdf'], ['PDF zestawu (2 kart)', 'zestaw.pdf']]) {
      const pobieranie = strona.waitForEvent('download')
      await strona.getByRole('button', { name: przycisk, exact: true }).click()
      const plik = await pobieranie
      await plik.saveAs(join(katalog, nazwa))
      assert.equal((await readFile(await plik.path())).subarray(0, 4).toString(), '%PDF')
    }
    await strona.evaluate(() => {
      window.wydrukiTestowe = []
      window.print = () => {
        const cel = document.querySelector('[data-cel-druku-dokumentu]')
        window.wydrukiTestowe.push(cel.querySelectorAll('[data-strona-dokumentu]').length)
        window.dispatchEvent(new Event('afterprint'))
      }
    })
    await strona.getByRole('button', { name: 'Drukuj wybraną kartę', exact: true }).click()
    await strona.getByRole('button', { name: 'Drukuj zestaw', exact: true }).click()
    assert.deepEqual(await strona.evaluate(() => window.wydrukiTestowe), [1, 2])
    assert.equal(await tytul.textContent(), await poleTytulu.inputValue())
    assert.deepEqual(bledy, [])
    console.log(`Podgląd i pliki PDF: ${katalog}`)
  } finally { await przegladarka.close() }
})
