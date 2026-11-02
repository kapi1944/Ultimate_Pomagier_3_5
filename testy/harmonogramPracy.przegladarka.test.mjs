import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

test('harmonogram: formularze, wspólne wykonania, czas i bloki, daty, kurier, motywy i skale', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ executablePath: process.env.POMAGIER_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1500, height: 900 }, timezoneId: 'Europe/Warsaw', hasTouch: true })
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.clock.install({ time: new Date('2026-11-02T11:00:00Z') })
    await strona.goto(process.env.POMAGIER_ADRES || 'http://127.0.0.1:5188')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const os = strona.locator('.pulpit-os-czasu')
    await os.waitFor()
    assert.equal(await os.locator('.pulpit-blok-pracy').count(), 5)
    assert.equal(await strona.locator('.pulpit-os-czasu__przewijanie').evaluate((element) => element.offsetHeight), 126)
    assert.match(await os.locator('.pulpit-okno-kuriera').getAttribute('aria-label'), /13:30–16:00/)
    await os.locator('.pulpit-okno-kuriera').tap()
    assert.equal(await os.locator('.pulpit-okno-kuriera__podpowiedz').isVisible(), true)

    const karta = strona.getByRole('region', { name: 'Daily Routines' })
    await karta.getByRole('button', { name: 'Zobacz wszystkie', exact: true }).click()
    await karta.getByRole('button', { name: 'Zarządzaj rutynami', exact: true }).click()
    for (const [tytul, tryb] of [['Przygotuj etykiety kurierskie', 'BLOK'], ['Kontrola o godzinie — długa treść rutyny wymagająca zawijania etykiety. '.repeat(6), 'GODZINA'], ['Porządek bez godziny', 'BEZ_CZASU']]) {
      await karta.getByRole('button', { name: 'Dodaj rutynę', exact: true }).click()
      await karta.getByLabel('Nazwa', { exact: true }).fill(tytul)
      await karta.getByLabel('Planowany czas wykonania').selectOption(tryb)
      if (tryb === 'BLOK') await karta.getByLabel('Blok pracy', { exact: true }).selectOption('paczkowanie')
      if (tryb === 'GODZINA') await karta.getByLabel('Planowana godzina', { exact: true }).fill('10:45')
      await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
      await karta.locator('.rutyny-formularz').waitFor({ state: 'detached' })
    }
    assert.equal(await os.locator('.pulpit-rutyna__przedzial').count(), 1)
    assert.equal(await os.locator('.pulpit-rutyna__punkt').count(), 1)
    assert.match(await os.innerText(), /Paczkowanie \(10:00–13:00\)/)
    const rutyna = os.getByRole('checkbox', { name: 'Rutyna : Przygotuj etykiety kurierskie', exact: true })
    await rutyna.check()
    assert.equal(await karta.locator('.rutyny-szybkie').getByRole('checkbox', { name: 'Przygotuj etykiety kurierskie', exact: true }).isChecked(), true)
    await karta.locator('.rutyny-szybkie').getByRole('checkbox', { name: 'Przygotuj etykiety kurierskie', exact: true }).uncheck()
    assert.equal(await rutyna.isChecked(), false)
    await rutyna.check()
    // Zmiana samego planowanego czasu działa od dziś i zachowuje wykonanie.
    await karta.locator('.rutyny-zarzadzanie').filter({ hasText: 'Przygotuj etykiety kurierskie' }).getByRole('button', { name: 'Edytuj', exact: true }).click()
    await karta.getByLabel('Planowany czas wykonania').selectOption('GODZINA')
    await karta.getByLabel('Planowana godzina', { exact: true }).fill('12:15')
    await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await os.getByRole('checkbox', { name: 'Rutyna 12:15: Przygotuj etykiety kurierskie', exact: true }).waitFor()
    assert.equal(await os.locator('.pulpit-rutyna__przedzial').count(), 0)
    assert.equal(await os.getByRole('checkbox', { name: 'Rutyna 12:15: Przygotuj etykiety kurierskie', exact: true }).isChecked(), true)
    await karta.locator('.rutyny-zarzadzanie').filter({ hasText: 'Przygotuj etykiety kurierskie' }).getByRole('button', { name: 'Edytuj', exact: true }).click()
    await karta.getByLabel('Planowany czas wykonania').selectOption('BLOK')
    await karta.getByLabel('Blok pracy', { exact: true }).selectOption('paczkowanie')
    await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await os.locator('.pulpit-rutyna__przedzial').waitFor()
    await strona.reload()
    await os.waitFor()
    assert.equal(await rutyna.isChecked(), true)
    const datownik = strona.getByLabel('Wybierz datę planu', { exact: true })
    for (const [data, okno] of [['2026-11-02', '13:30–16:00'], ['2026-11-03', '14:30–16:00'], ['2026-11-04', '14:30–16:00'], ['2026-11-05', '14:30–16:00'], ['2026-11-06', '13:30–16:00'], ['2026-11-07', null], ['2026-11-08', null]]) {
      await datownik.fill(data)
      if (okno) assert.ok((await os.locator('.pulpit-okno-kuriera').getAttribute('aria-label')).includes(okno))
      else { assert.equal(await os.locator('.pulpit-okno-kuriera').count(), 0); assert.equal(await os.locator('.pulpit-blok-pracy').count(), 0) }
    }
    await datownik.fill('2026-11-02')

    for (const paleta of ['EMERALD_DARK', 'SOFT_GREY', 'DARK_GRAY', 'DOMYSLNA', 'CRM', 'DDP', 'SEMPER', 'EVENTIS', 'ARKUSZE_GOOGLE']) for (const skala of [75, 85]) {
      await strona.evaluate(async ({ paleta, skala }) => { document.documentElement.dataset.uiPaleta = paleta; await (await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')).zastosujSkaleInterfejsu(skala) }, { paleta, skala })
      for (const rozmiar of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await strona.setViewportSize(rozmiar)
        const pomiar = await os.evaluate((element) => {
          const prostokaty = [...element.querySelectorAll('.pulpit-rutyna__kontrolki')].map((wpis) => wpis.getBoundingClientRect())
          const linia = element.querySelector('.pulpit-os-czasu__linia').getBoundingClientRect()
          const kurier = element.querySelector('.pulpit-okno-kuriera').getBoundingClientRect()
          return { kolizja: prostokaty.some((wpis, indeks) => indeks > 0 && wpis.top < prostokaty[indeks - 1].bottom), nadmiar: document.documentElement.scrollWidth - document.documentElement.clientWidth, kurier: { lewo: (kurier.left - linia.left) / linia.width, prawo: (kurier.right - linia.left) / linia.width }, obciete: [...element.querySelectorAll('.pulpit-rutyna__kontrolki label')].some((wpis) => wpis.scrollHeight > wpis.clientHeight + 1) }
        })
        assert.equal(pomiar.kolizja, false)
        assert.equal(pomiar.obciete, false)
        assert.ok(pomiar.nadmiar <= 1, JSON.stringify({ paleta, skala, rozmiar, pomiar }))
        const granice = await strona.evaluate(async () => { const { pozycjaGodzinyNaOsi } = await import('/src/moduly/zamkniete/pulpit/logika/czasDnia.ts'); return [pozycjaGodzinyNaOsi('13:30') / 100, pozycjaGodzinyNaOsi('16:00') / 100] })
        assert.ok(Math.abs(pomiar.kurier.lewo - granice[0]) < .001)
        assert.ok(Math.abs(pomiar.kurier.prawo - granice[1]) < .001)
      }
    }

    await strona.setViewportSize({ width: 1500, height: 900 })
    await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).click()
    await strona.getByRole('button', { name: 'USTAWIENIA', exact: true }).click()
    await strona.getByRole('tab', { name: 'Pulpit', exact: true }).click()
    const harmonogram = strona.locator('.ustawienia-harmonogram')
    const przygotowania = harmonogram.getByRole('group', { name: 'Przygotowania', exact: true })
    await przygotowania.getByLabel('Od', { exact: true }).fill('08:00')
    await strona.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click()
    assert.match(await harmonogram.getByRole('alert').innerText(), /nakładać/)
    assert.equal(await strona.evaluate(() => localStorage.getItem('ultimatePomagier.ustawieniaAplikacji.v1')), null)
    await przygotowania.getByLabel('Od', { exact: true }).fill('08:30')
    const paczkowanie = harmonogram.getByRole('group', { name: 'Paczkowanie', exact: true })
    await paczkowanie.getByLabel('Od', { exact: true }).fill('10:15')
    await harmonogram.getByRole('button', { name: 'Przesuń w górę: Paczkowanie', exact: true }).click()
    await paczkowanie.getByLabel('Nazwa', { exact: true }).fill('Pakowanie paczek')
    await harmonogram.getByRole('group', { name: 'Rozruch', exact: true }).getByRole('switch', { name: 'Włączony', exact: true }).uncheck()
    await harmonogram.getByRole('button', { name: 'Dodaj blok pracy', exact: true }).click()
    await harmonogram.getByRole('button', { name: 'Usuń blok Nowy blok', exact: true }).click()
    await harmonogram.getByLabel('Data wyjątku').fill('2026-11-02')
    await harmonogram.getByRole('button', { name: 'Dodaj wyjątek (brak odbioru)', exact: true }).click()
    await strona.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click()
    await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).click()
    await strona.getByRole('navigation', { name: 'Moduły aplikacji' }).getByRole('button', { name: 'PULPIT', exact: true }).click()
    await os.waitFor()
    assert.equal(await os.locator('.pulpit-okno-kuriera').count(), 0)
    assert.equal(await os.locator('.pulpit-blok-pracy').count(), 4)
    assert.match(await os.innerText(), /Pakowanie paczek \(10:15–13:00\)/)
    await strona.reload()
    assert.equal(await os.locator('.pulpit-okno-kuriera').count(), 0)
    assert.equal(await rutyna.isChecked(), true)
    assert.deepEqual(bledy, [])
    if (process.env.POMAGIER_ZRZUT) await strona.screenshot({ path: process.env.POMAGIER_ZRZUT, fullPage: true })
  } finally { await przegladarka.close() }
})
