import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

for (const rozmiar of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`dni robocze: formularz, kalendarz, historia i offline (${rozmiar.width}px)`, { timeout: 120000 }, async () => {
    const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
    try {
      const kontekst = await przegladarka.newContext({ viewport: rozmiar, timezoneId: rozmiar.width === 390 ? 'America/Los_Angeles' : 'Europe/Warsaw', hasTouch: true })
      const strona = await kontekst.newPage()
      const bledy = []
      strona.on('pageerror', (blad) => bledy.push(blad.message))
      await strona.clock.install({ time: new Date(rozmiar.width === 390 ? '2026-11-02T00:30:00Z' : '2026-11-02T11:00:00Z') })
      await strona.goto(process.env.POMAGIER_ADRES || 'http://127.0.0.1:5194')
      await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
      const karta = strona.getByRole('region', { name: 'Daily Routines' })
      const os = strona.locator('.pulpit-os-czasu')
      await os.waitFor()
      assert.equal(await strona.getByLabel('Wybierz datę planu').inputValue(), '2026-11-02')
      const uzytkownikId = await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.sesjaUzytkownika.v1')).uzytkownikId)
      assert.ok(uzytkownikId)
      await karta.getByRole('button', { name: 'Zobacz wszystkie', exact: true }).click()
      await karta.getByRole('button', { name: 'Zarządzaj rutynami', exact: true }).click()
      await karta.getByRole('button', { name: 'Dodaj rutynę', exact: true }).click()
      assert.equal(await karta.getByLabel('Częstotliwość').inputValue(), 'DNI_ROBOCZE')
      assert.equal(await karta.getByRole('group', { name: 'Dni tygodnia', exact: true }).count(), 0)
      await karta.getByText('Rutyna wykonywana w zaplanowane dni pracy, z pominięciem świąt, urlopów i innych dni wolnych', { exact: true }).waitFor()
      await karta.getByLabel('Nazwa', { exact: true }).fill('Rutyna robocza')
      await karta.getByLabel('Planowany czas wykonania').selectOption('BLOK')
      await karta.getByLabel('Blok pracy', { exact: true }).selectOption('paczkowanie')
      await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
      await karta.locator('.rutyny-formularz').waitFor({ state: 'detached' })
      await os.getByRole('checkbox', { name: 'Rutyna : Rutyna robocza', exact: true }).check()
      const historiaPrzed = await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.pulpit.v1')).rutyny)
      assert.equal(historiaPrzed.wykonania[0].wykonane, true)

      // Istniejąca częstotliwość pozostaje wybrana przy edycji i zwykłym zapisie.
      await karta.getByRole('button', { name: 'Dodaj rutynę', exact: true }).click()
      await karta.getByLabel('Nazwa', { exact: true }).fill('Rutyna codzienna')
      await karta.getByLabel('Częstotliwość').selectOption('CODZIENNIE')
      await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
      await karta.locator('.rutyny-formularz').waitFor({ state: 'detached' })
      await karta.locator('.rutyny-zarzadzanie').filter({ hasText: 'Rutyna codzienna' }).getByRole('button', { name: 'Edytuj', exact: true }).click()
      assert.equal(await karta.getByLabel('Częstotliwość').inputValue(), 'CODZIENNIE')
      await karta.getByRole('button', { name: 'Zapisz', exact: true }).click()
      await karta.locator('.rutyny-formularz').waitFor({ state: 'detached' })

      await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).click()
      await strona.getByRole('button', { name: 'USTAWIENIA', exact: true }).click()
      await strona.getByRole('tab', { name: 'Pulpit', exact: true }).click()
      const kalendarz = strona.getByRole('group', { name: 'Dodaj wyjątek kalendarza pracy', exact: true })
      await kalendarz.getByRole('button', { name: 'Dodaj wyjątek kalendarza', exact: true }).click()
      await kalendarz.getByRole('alert').waitFor()
      for (const [osoba, od, doDnia, rodzaj, powod] of [
        [uzytkownikId, '2026-11-02', '2026-11-06', 'URLOP', 'Urlop testowy'],
        ['', '2026-08-14', '2026-08-14', 'WOLNE', 'Dzień za sobotnie święto'],
        [uzytkownikId, '2026-11-07', '2026-11-07', 'PRACA', 'Pracująca sobota'],
      ]) {
        await kalendarz.getByLabel('Zakres wyjątku').selectOption(osoba)
        await kalendarz.getByLabel('Od dnia', { exact: true }).fill(od)
        await kalendarz.getByLabel('Do dnia włącznie', { exact: true }).fill(doDnia)
        await kalendarz.getByLabel('Rodzaj wyjątku').selectOption(rodzaj)
        await kalendarz.getByLabel('Powód', { exact: true }).fill(powod)
        await kalendarz.getByRole('button', { name: 'Dodaj wyjątek kalendarza', exact: true }).click()
      }
      assert.equal(await kalendarz.getByRole('alert').count(), 0)
      await strona.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click()
      assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.ustawieniaAplikacji.v1')).pulpit.harmonogramPracy.wyjatkiKalendarza.length), 3)
      assert.ok(await strona.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Ustawienia kalendarza mieszczą się w szerokości ekranu')
      await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).click()
      await strona.getByRole('navigation', { name: 'Moduły aplikacji' }).getByRole('button', { name: 'PULPIT', exact: true }).click()
      await os.waitFor()
      assert.equal(await os.getByRole('checkbox', { name: 'Rutyna : Rutyna robocza', exact: true }).count(), 0)
      assert.equal(await os.locator('.pulpit-blok-pracy').count(), 0)
      assert.match(await os.getAttribute('aria-label'), /dzień wolny/)
      assert.equal(await karta.locator('.rutyny-szybkie').getByRole('checkbox', { name: 'Rutyna codzienna', exact: true }).count(), 1)
      await karta.getByRole('button', { name: 'Zobacz wszystkie', exact: true }).click()
      await karta.getByRole('button', { name: 'Historia', exact: true }).click()
      await karta.getByRole('heading', { name: 'Wykonane wystąpienia', exact: true }).waitFor()
      assert.equal(await karta.locator('.rutyny-lista').getByRole('checkbox', { checked: true }).count(), 1)
      await karta.getByRole('button', { name: 'Dzisiaj', exact: true }).click()
      await karta.getByLabel('Filtr').selectOption('ZALEGLE')
      assert.equal(await karta.locator('.rutyny-lista').count(), 0)
      for (const [data, liczba, liczbaBlokow] of [['2026-11-06', 0, 0], ['2026-11-07', 1, 5], ['2026-11-08', 0, 0], ['2026-11-09', 1, 5], ['2026-11-11', 0, 0], ['2026-12-24', 0, 0]]) {
        await strona.getByLabel('Wybierz datę planu').fill(data)
        assert.equal(await os.getByRole('checkbox', { name: 'Rutyna : Rutyna robocza', exact: true }).count(), liczba, data)
        assert.equal(await os.locator('.pulpit-blok-pracy').count(), liczbaBlokow, data)
      }
      await strona.getByLabel('Wybierz datę planu').fill('2026-11-02')
      await strona.reload()
      await os.waitFor()
      assert.equal(await os.getByRole('checkbox', { name: 'Rutyna : Rutyna robocza', exact: true }).count(), 0)
      assert.deepEqual(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.pulpit.v1')).rutyny.wykonania), historiaPrzed.wykonania)

      // Najpierw ładujemy moduł kalendarza, później odcinamy sieć i zmieniamy daty.
      await strona.evaluate(async () => { await import('/src/wspolne/czas/serwisKalendarzaPracy.ts') })
      await kontekst.setOffline(true)
      assert.equal(await strona.evaluate(async (osoba) => (await import('/src/wspolne/czas/serwisKalendarzaPracy.ts')).isWorkingDay('2026-11-07', osoba), uzytkownikId), true)
      await strona.getByLabel('Wybierz datę planu').fill('2026-11-09')
      assert.equal(await os.getByRole('checkbox', { name: 'Rutyna : Rutyna robocza', exact: true }).count(), 1)
      await strona.evaluate(async () => {
        const { pobierzUstawieniaAplikacji, zapiszUstawieniaAplikacji } = await import('/src/aplikacja/ustawienia/magazynUstawienAplikacji.ts')
        const ustawienia = pobierzUstawieniaAplikacji()
        ustawienia.pulpit.harmonogramPracy.wyjatkiKalendarza = ustawienia.pulpit.harmonogramPracy.wyjatkiKalendarza.filter((wpis) => wpis.rodzaj !== 'URLOP')
        if (!zapiszUstawieniaAplikacji(ustawienia)) throw new Error('Nie zapisano zmiany kalendarza offline')
      })
      await strona.getByLabel('Wybierz datę planu').fill('2026-11-02')
      await os.getByRole('checkbox', { name: 'Rutyna : Rutyna robocza', exact: true }).waitFor()
      assert.equal(await os.getByRole('checkbox', { name: 'Rutyna : Rutyna robocza', exact: true }).isChecked(), true)
      assert.deepEqual(bledy, [])
      assert.ok(await strona.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
    } finally { await przegladarka.close() }
  })
}
