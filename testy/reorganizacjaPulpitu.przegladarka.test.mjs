import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

test('Pulpit: kolejność, rutyny, zapis wykonania, daty, palety i skale', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ executablePath: process.env.POMAGIER_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1500, height: 870 }, timezoneId: 'Europe/Warsaw', hasTouch: true })
    await strona.clock.install({ time: new Date('2026-11-02T11:00:00Z') })
    await strona.goto(process.env.POMAGIER_ADRES || 'http://127.0.0.1:5174')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.locator('.pulpit-os-czasu').waitFor()
    await strona.evaluate(async () => {
      const { pobierzSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
      const { zapiszStanPulpitu } = await import('/src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts')
      const wlascicielId = pobierzSesje().uzytkownikId
      zapiszStanPulpitu({ zadaniaReczne: [{ id: 'zadanie-testowe', tytul: 'Termin zadania', data: '2026-11-02', godzina: '12:00', utworzono: new Date().toISOString(), status: 'OTWARTE', priorytet: 'PILNE', typZrodla: 'RECZNE', typZadania: 'INNE', wlascicielId, zadaniodawcaId: wlascicielId, zadaniobiorcaId: wlascicielId, przypomnienia: [], czyAutomatyczne: false, czyTerminKrytyczny: false }], wyslanePaczki: {}, zapotrzebowaniaZakupowe: [], rutyny: { rutyny: [
        { id: 'bez', tytul: 'Porządek', wlascicielId, wersje: [{ od: '2026-11-02', aktywna: true, harmonogram: { rodzaj: 'CODZIENNIE' } }] },
        ...[1, 2].map((numer) => ({ id: 'godzina-' + numer, tytul: 'Kontrola ' + numer, wlascicielId, opis: 'Opis rutyny', wersje: [{ od: '2026-11-02', godzina: '12:00', aktywna: true, harmonogram: { rodzaj: 'CODZIENNIE' } }] })),
      ], wykonania: [], historia: [] } })
    })
    await strona.reload()
    const os = strona.locator('.pulpit-os-czasu')
    await os.getByText('Rutyny bez godziny', { exact: true }).waitFor()
    assert.equal(await os.locator('.pulpit-rutyna').count(), 2)
    assert.equal(await os.locator('.pulpit-deadline').count(), 1)
    assert.equal(await strona.locator('.pulpit-lista-zadan .pulpit-zadanie').count(), 1)
    const pole = os.getByRole('checkbox', { name: 'Rutyna 12:00: Kontrola 1' })
    await pole.tap()
    assert.equal(await pole.isChecked(), true)
    assert.equal(await strona.locator('.rutyny-szybkie').getByRole('checkbox', { name: 'Kontrola 1', exact: true }).isChecked(), true)
    await strona.reload()
    assert.equal(await pole.isChecked(), true)
    await os.getByRole('button', { name: 'Szczegóły rutyny: Kontrola 1' }).click()
    await strona.locator('#podsumowanie-rutyn').getByRole('heading', { name: 'Kontrola 1', exact: true }).waitFor()
    await strona.getByRole('button', { name: 'Zamknij szczegóły', exact: true }).click()
    const datownik = strona.locator('.pulpit-nawigacja-daty input')
    await datownik.fill('2026-11-01')
    assert.equal(await os.locator('.pulpit-rutyna').count(), 0)
    await datownik.fill('2026-11-02')
    await os.locator('.pulpit-rutyna').first().waitFor()
    const palety = ['EMERALD_DARK', 'SOFT_GREY', 'DARK_GRAY', 'DOMYSLNA', 'CRM', 'DDP', 'SEMPER', 'EVENTIS', 'ARKUSZE_GOOGLE']
    for (const paleta of palety) for (const skala of [75, 85]) {
      await strona.evaluate(({ paleta, skala }) => { document.documentElement.dataset.uiPaleta = paleta; document.documentElement.style.setProperty('--ui-skala-przegladarki', String(skala / 100)) }, { paleta, skala })
      for (const rozmiar of [{ width: 1500, height: 870 }, { width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await strona.setViewportSize(rozmiar)
        if (await strona.getByRole('button', { name: 'Pokaż dock', exact: true }).count()) await strona.getByRole('button', { name: 'Pokaż dock', exact: true }).click()
        const pomiar = await strona.evaluate(() => {
          const rutyny = [...document.querySelectorAll('.pulpit-rutyna__kontrolki')].map((element) => element.getBoundingClientRect())
          const naglowek = document.querySelector('.naglowek-aplikacji'), dock = document.querySelector('.dock-aplikacji'), obszar = document.querySelector('.uklad-aplikacji__obszar-roboczy')
          return { kolizja: rutyny.some((element, indeks) => indeks > 0 && element.top < rutyny[indeks - 1].bottom), nadmiar: document.documentElement.scrollWidth - document.documentElement.clientWidth, naglowek: getComputedStyle(naglowek).backgroundColor, dock: getComputedStyle(dock).backgroundColor, tlo: getComputedStyle(document.body).backgroundColor, zaslania: obszar.getBoundingClientRect().bottom > dock.getBoundingClientRect().top + 1 }
        })
        assert.equal(pomiar.kolizja, false)
        assert.ok(pomiar.nadmiar <= 1, JSON.stringify({ paleta, skala, rozmiar, pomiar }))
        assert.equal(pomiar.zaslania, false)
        assert.notEqual(pomiar.naglowek, pomiar.tlo)
        assert.notEqual(pomiar.dock, pomiar.tlo)
        if (rozmiar.height >= 768 && rozmiar.width >= 1366) {
          await strona.locator('.uklad-aplikacji__obszar-roboczy').evaluate((element) => { element.scrollTop = 0 })
          const zadania = await strona.getByRole('heading', { name: 'Do wykonania dzisiaj', exact: true }).boundingBox()
          const dock = await strona.locator('.dock-aplikacji').boundingBox()
          assert.ok(zadania.y + zadania.height < dock.y, JSON.stringify({ zadania, dock, skala, paleta }))
        }
        if (process.env.POMAGIER_ZRZUT && skala === 85 && rozmiar.width === 1366 && ['EMERALD_DARK', 'SOFT_GREY'].includes(paleta)) await strona.screenshot({ path: process.env.POMAGIER_ZRZUT.replace('.png', '-' + paleta + '.png') })
      }
    }
    // Pusty plan musi odsłaniać początek zadań w standardowym oknie.
    await strona.evaluate(async () => { const { zapiszStanPulpitu } = await import('/src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts'); zapiszStanPulpitu({ zadaniaReczne: [], wyslanePaczki: {}, zapotrzebowaniaZakupowe: [] }) })
    await strona.setViewportSize({ width: 1366, height: 768 })
    await strona.reload()
    const naglowekZadan = strona.getByRole('heading', { name: 'Do wykonania dzisiaj', exact: true })
    assert.ok((await naglowekZadan.boundingBox()).y < 650)
    if (process.env.POMAGIER_ZRZUT) await strona.screenshot({ path: process.env.POMAGIER_ZRZUT })
  } finally { await przegladarka.close() }
})
