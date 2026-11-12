import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

test('rutyny dziedziczą kolory bloków przy edycji, wykonaniu, zmianie skali i szerokości', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1800, height: 1000 }, timezoneId: 'Europe/Warsaw' })
    await strona.clock.setFixedTime(new Date('2026-11-02T12:30:00Z'))
    await strona.goto(process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const os = strona.locator('.pulpit-os-czasu')
    await os.waitFor()
    const rutynyPrzed = await strona.evaluate(async () => {
      const { pobierzStanPulpitu, zapiszStanPulpitu } = await import('/src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts')
      const { domyslnyHarmonogramPracy } = await import('/src/moduly/zamkniete/pulpit/logika/harmonogramPracy.ts')
      const wlascicielId = JSON.parse(localStorage.getItem('ultimatePomagier.sesjaUzytkownika.v1')).uzytkownikId
      const wpis = (tytul, plan) => ({ id: tytul, tytul, wlascicielId, wersje: [{ od: '2026-11-02', aktywna: true, harmonogram: { rodzaj: 'DNI_ROBOCZE' }, ...plan }] })
      const rutyny = domyslnyHarmonogramPracy.blokiPracy.flatMap((blok) => [wpis('Blok ' + blok.id, { blokPracyId: blok.id }), wpis('Godzina ' + blok.id, { godzina: blok.poczatek })])
      rutyny.push(wpis('Bez godziny', {}), wpis('Po pracy', { godzina: '16:00' }), wpis('Poza osią', { godzina: '20:00' }), wpis('Niedostępny', { blokPracyId: 'usuniety' }))
      const stan = { rutyny, wykonania: [], historia: [] }
      zapiszStanPulpitu({ ...pobierzStanPulpitu(), rutyny: stan })
      window.dispatchEvent(new Event('storage'))
      return stan
    })
    const karta = (tytul) => os.locator('.pulpit-rutyna__kontrolki').filter({ has: strona.getByRole('button', { name: 'Szczegóły rutyny: ' + tytul, exact: true, includeHidden: true }) })
    const barwa = (element) => element.evaluate((wpis) => getComputedStyle(wpis).getPropertyValue('--pulpit-kolor-bloku').trim())
    const tlo = (element) => element.evaluate((wpis) => getComputedStyle(wpis).backgroundColor)
    const kolory = { rozruch: '#f97316', przygotowania: '#22c55e', paczkowanie: '#ef4444', multitasking: '#3b82f6', podsumowania: '#a855f7' }
    await karta('Godzina paczkowanie').waitFor()
    for (const [blok, kolor] of Object.entries(kolory)) {
      assert.equal(await barwa(karta('Blok ' + blok)), kolor)
      assert.equal(await barwa(karta('Godzina ' + blok)), kolor)
    }
    for (const tytul of ['Bez godziny', 'Po pracy', 'Poza osią', 'Niedostępny']) assert.equal(await barwa(karta(tytul)), '')

    const paczkowanie = karta('Blok paczkowanie')
    const tloPrzed = await tlo(paczkowanie)
    await paczkowanie.getByRole('checkbox').check()
    assert.equal(await paczkowanie.getByRole('checkbox').isChecked(), true)
    assert.equal(await barwa(paczkowanie), kolory.paczkowanie)
    assert.notEqual(await tlo(paczkowanie), tloPrzed)
    assert.match(await paczkowanie.locator('button span').evaluate((wpis) => getComputedStyle(wpis).textDecorationLine), /line-through/)
    const tloWykonanej = await tlo(paczkowanie)
    await paczkowanie.getByRole('button').hover()
    assert.equal(await tlo(paczkowanie), tloWykonanej)
    assert.equal(await tlo(paczkowanie.getByRole('button')), 'rgba(0, 0, 0, 0)')
    await paczkowanie.getByRole('checkbox').focus()
    await paczkowanie.getByRole('checkbox').press('Tab')
    assert.notEqual(await paczkowanie.getByRole('button').evaluate((wpis) => getComputedStyle(wpis).outlineStyle), 'none')
    assert.equal(await tlo(paczkowanie.getByRole('button')), 'rgba(0, 0, 0, 0)')

    const panel = strona.getByRole('form', { name: 'Dostosuj oś', exact: true })
    await strona.getByRole('button', { name: /Dostosuj oś/ }).click()
    await panel.getByRole('group', { name: 'Rozruch', exact: true }).getByLabel('Kolor', { exact: true }).fill('#dd7700')
    assert.equal(await barwa(karta('Godzina rozruch')), '#dd7700')
    await panel.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await panel.waitFor({ state: 'detached' })
    await strona.reload()
    await os.waitFor()
    assert.equal(await barwa(karta('Godzina rozruch')), '#dd7700')
    assert.equal(await barwa(os.locator('.pulpit-blok-pracy').filter({ hasText: /^Rozruch$/ })), '#dd7700')
    assert.equal(await paczkowanie.getByRole('checkbox').isChecked(), true)

    for (const skala of [.75, .85, 1]) {
      await strona.evaluate((skala) => document.documentElement.style.zoom = String(skala), skala)
      for (const szerokosc of [1800, 390]) {
        await strona.setViewportSize({ width: szerokosc, height: 1000 })
        const licznik = os.getByRole('button', { name: 'Rozruch: pokaż rutyny (1)', exact: true })
        if (szerokosc === 390) {
          await licznik.waitFor()
          assert.equal(await barwa(licznik), '#dd7700')
          const tloLicznika = await tlo(licznik)
          await licznik.hover()
          assert.equal(await tlo(licznik), tloLicznika)
          await licznik.press('Enter')
          const lista = os.locator('details').filter({ has: strona.locator('summary', { hasText: 'Rozruch · Rutyny (1)' }) })
          assert.equal(await lista.getByRole('checkbox').isVisible(), true)
          assert.equal(await barwa(karta('Blok rozruch')), '#dd7700')
        } else {
          await karta('Blok rozruch').waitFor()
        }
        for (const [blok, kolor] of Object.entries(kolory)) assert.equal(await barwa(karta('Godzina ' + blok)), blok === 'rozruch' ? '#dd7700' : kolor)
        const geometria = await os.evaluate((element) => {
          const przedzialy = [...element.querySelectorAll('.pulpit-rutyna__przedzial')]
          return przedzialy.every((przedzial) => {
            const granice = przedzial.getBoundingClientRect()
            return [...przedzial.querySelectorAll('.pulpit-rutyna__kontrolki, .pulpit-rutyna__licznik')].every((karta) => {
              const prostokat = karta.getBoundingClientRect()
              return prostokat.left >= granice.left - 1 && prostokat.right <= granice.right + 1
            })
          })
        })
        assert.ok(geometria, `Karty w blokach: skala ${skala}, szerokość ${szerokosc}`)
      }
    }

    // Kontrast tekstu sprawdzany na rzeczywistym wypełnieniu w obu wariantach motywu.
    for (const paleta of ['EMERALD_DARK', 'SOFT_GREY', 'DARK_GRAY']) {
      await strona.evaluate(async (paleta) => {
        document.documentElement.dataset.uiPaleta = paleta
        await new Promise(requestAnimationFrame)
        await Promise.all(document.getAnimations().filter((animacja) => animacja instanceof CSSTransition).map((animacja) => animacja.finished))
      }, paleta)
      for (const [blok] of Object.entries(kolory)) {
        const kontrast = await karta('Godzina ' + blok).evaluate((element) => {
          const kontekst = document.createElement('canvas').getContext('2d')
          const kanaly = (kolor) => {
            kontekst.fillStyle = kolor
            kontekst.fillRect(0, 0, 1, 1)
            return [...kontekst.getImageData(0, 0, 1, 1).data].slice(0, 3).map((kanal) => {
              const wartosc = kanal / 255
              return wartosc <= .04045 ? wartosc / 12.92 : ((wartosc + .055) / 1.055) ** 2.4
            })
          }
          const jasnosc = (kolor) => kanaly(kolor).reduce((suma, kanal, indeks) => suma + kanal * [.2126, .7152, .0722][indeks], 0)
          const tekst = jasnosc(getComputedStyle(element.querySelector('button')).color)
          const tlo = jasnosc(getComputedStyle(element).backgroundColor)
          const checkbox = element.querySelector('input').getBoundingClientRect()
          return { tekst: (Math.max(tekst, tlo) + .05) / (Math.min(tekst, tlo) + .05), checkbox: checkbox.width, barwaTekstu: getComputedStyle(element.querySelector('button')).color, tlo: getComputedStyle(element).backgroundColor, panel: getComputedStyle(element).getPropertyValue('--ui-panel') }
        })
        assert.ok(kontrast.tekst >= 4.5, JSON.stringify({ paleta, blok, kontrast }))
        assert.ok(kontrast.checkbox >= 18)
      }
    }
    const rutynyPo = await strona.evaluate(async () => (await import('/src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts')).pobierzStanPulpitu().rutyny)
    assert.deepEqual(rutynyPo.rutyny, rutynyPrzed.rutyny)
    assert.equal(rutynyPo.wykonania.filter((wpis) => wpis.wykonane && wpis.rutynaId === 'Blok paczkowanie').length, 1)
    await strona.setViewportSize({ width: 1800, height: 1000 })
    await strona.evaluate(() => { document.documentElement.style.zoom = '.85' })
    if (process.env.POMAGIER_ZRZUT) await os.screenshot({ path: process.env.POMAGIER_ZRZUT })
    await strona.getByRole('button', { name: /Dostosuj oś/ }).click()
    await panel.getByRole('checkbox', { name: /Przesuwaj wspólne granice/ }).uncheck()
    await panel.getByRole('group', { name: 'Rozruch', exact: true }).getByLabel('Do', { exact: true }).fill('07:46')
    await panel.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await panel.waitFor({ state: 'detached' })
    await strona.setViewportSize({ width: 390, height: 1000 })
    const skrot = os.locator('.pulpit-rutyna__skrot')
    await skrot.waitFor()
    assert.equal(await barwa(skrot), '#dd7700')
  } finally { await przegladarka.close() }
})
