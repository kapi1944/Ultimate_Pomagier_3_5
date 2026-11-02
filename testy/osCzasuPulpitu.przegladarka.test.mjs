import assert from 'node:assert/strict'
import { createRequire, register } from 'node:module'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import './srodowiskoDemoKont.mjs'

register('./loaderKomponentow.mjs', import.meta.url)
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const magazyn = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (klucz) => magazyn.get(klucz) ?? null,
  setItem: (klucz, wartosc) => magazyn.set(klucz, wartosc),
  removeItem: (klucz) => magazyn.delete(klucz),
} })
const { default: WidokPulpitu } = await import('../src/moduly/zamkniete/pulpit/WidokPulpitu.tsx')
const { KontekstUzytkownika } = await import('../src/aplikacja/logowanie/stanKontekstuUzytkownika.ts')
const { pobierzUzytkownikow } = await import('../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
const { zapiszStanPulpitu } = await import('../src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts')
const konta = pobierzUzytkownikow()
const wartosc = { zalogowanyUzytkownik: konta[0], aktywniUzytkownicy: konta, zaloguj: () => false, wyloguj: () => {}, odswiezUzytkownika: () => {} }
const style = ['src/index.css', 'src/wspolne/komponenty/tokeny.css', 'src/wspolne/komponenty/elementyInterfejsu.css', 'src/moduly/zamkniete/pulpit/pulpit.css'].map((plik) => readFileSync(plik, 'utf8')).join('\n')
const dzisiaj = new Date()
const data = [dzisiaj.getFullYear(), String(dzisiaj.getMonth() + 1).padStart(2, '0'), String(dzisiaj.getDate()).padStart(2, '0')].join('-')

test('oś Pulpitu: kompaktowy pusty stan, rosnące etykiety i miniatury bez kolizji przy skali 85%', { timeout: 60000 }, async () => {
  const przegladarka = await chromium.launch(process.env.POMAGIER_CHROME ? { executablePath: process.env.POMAGIER_CHROME, headless: true } : { channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    // Rzeczywisty komponent i arkusze, bez serwera, sieci ani danych przeglądarki użytkownika.
    for (const szerokosc of [1440, 800, 390]) {
      await strona.setViewportSize({ width: szerokosc, height: 1000 })
      const wysokosci = []
      for (const liczba of [0, 1, 6]) {
        zapiszStanPulpitu({ zadaniaReczne: Array.from({ length: liczba }, (_, indeks) => ({
          id: 'os-' + indeks, tytul: 'Długa etykieta zadania wymagająca kilku wierszy '.repeat(indeks + 1),
          data, godzina: indeks === 0 ? '00:00' : indeks === 5 ? '23:59' : '12:00',
          utworzono: dzisiaj.toISOString(), status: 'OTWARTE', priorytet: 'ASAP', typZrodla: 'RECZNE', typZadania: 'INNE',
          wlascicielId: konta[0].id, zadaniodawcaId: konta[0].id, zadaniobiorcaId: konta[0].id,
          przypomnienia: [], czyAutomatyczne: false, czyTerminKrytyczny: false,
          miniatura: { daneUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', nazwaPliku: 'test.png', szerokosc: 1, wysokosc: 1 },
        })), wyslanePaczki: {}, zapotrzebowaniaZakupowe: [] })
        const html = renderToStaticMarkup(createElement(KontekstUzytkownika.Provider, { value: wartosc }, createElement(WidokPulpitu)))
        await strona.setContent(html)
        const os = await strona.locator('.pulpit-os-czasu__przewijanie').evaluate((element) => element.outerHTML)
        await strona.setContent(`<style>${style}\nhtml { zoom: .85; } body { margin: 0; } .pulpit { padding: 12px; min-width: 0; }</style><main class="pulpit">${os}</main>`)
        const pomiar = await strona.evaluate(() => {
          const kontener = document.querySelector('.pulpit-os-czasu__przewijanie')
          const prostokat = (element) => { const { x, y, width, height, bottom, right } = element.getBoundingClientRect(); return { x, y, width, height, bottom, right } }
          return {
            kontener: prostokat(kontener), linia: prostokat(document.querySelector('.pulpit-os-czasu__linia')),
            etykiety: prostokat(document.querySelector('.pulpit-os-czasu__etykiety')),
            zadania: [...document.querySelectorAll('.pulpit-deadline__przycisk')].map(prostokat),
            miniatury: [...document.querySelectorAll('.pulpit-os-czasu__miniatura')].map(prostokat),
            wysokosc: kontener.offsetHeight, przewijanie: kontener.scrollHeight - kontener.clientHeight,
            nadmiarStrony: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        })
        assert.equal(pomiar.zadania.length, liczba)
        assert.equal(pomiar.miniatury.length, liczba)
        assert.deepEqual(await strona.locator('.pulpit-os-czasu__etykieta').allTextContents(), ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '23:59'])
        assert.equal(await strona.locator('.pulpit-os-czasu__etykieta-teraz').count(), 1)
        wysokosci.push(pomiar.wysokosc)
        assert.ok(pomiar.nadmiarStrony <= 1, JSON.stringify(pomiar))
        assert.ok(pomiar.przewijanie <= 1, JSON.stringify(pomiar))
        if (!liczba) {
          assert.ok(pomiar.wysokosc >= 110 && pomiar.wysokosc <= 130, JSON.stringify(pomiar))
          assert.ok(Math.abs(pomiar.linia.y + pomiar.linia.height / 2 - (pomiar.kontener.y + pomiar.kontener.height / 2)) < 12)
        }
        for (const [indeks, zadanie] of pomiar.zadania.entries()) {
          assert.ok(zadanie.y >= pomiar.etykiety.bottom)
          assert.ok(zadanie.bottom <= pomiar.kontener.bottom)
          if (indeks) assert.ok(zadanie.y >= pomiar.zadania[indeks - 1].bottom)
        }
        for (const [indeks, miniatura] of pomiar.miniatury.entries()) {
          assert.ok(miniatura.bottom < pomiar.linia.y - 25)
          if (indeks) assert.ok(miniatura.y >= pomiar.miniatury[indeks - 1].bottom)
        }
      }
      assert.ok(wysokosci[0] < wysokosci[1] && wysokosci[1] < wysokosci[2])
      console.log(`Oś ${szerokosc}px przy 85%: wysokości dla 0/1/6 zadań = ${wysokosci.join('/')}px`)
    }
  } finally { await przegladarka.close() }
})
