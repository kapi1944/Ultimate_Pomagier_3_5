import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { pobierzInformacjeOWersji } from '../skrypty/informacjeOWersji.mjs'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:15241'

test('produkcyjny frontend ma aktualne źródła i nie otwiera sesji demonstracyjnej', { timeout: 30000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.addInitScript(() => localStorage.setItem('ultimatePomagier.sesjaUzytkownika.v1', JSON.stringify({ uzytkownikId: 'administrator-kacper-madej', wersjaUprawnien: 1, tryb: 'DEMONSTRACYJNY' })))
    await strona.goto(adres)
    const informacje = pobierzInformacjeOWersji()
    assert.equal(await strona.title(), informacje.nazwaProduktu)
    assert.equal(await strona.getByRole('heading', { name: informacje.nazwaProduktu, exact: true }).isVisible(), true)
    assert.equal(await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).count(), 0)
    assert.equal(await strona.getByRole('radio').count(), 0)
    assert.equal(await strona.getByText('Usługa uwierzytelniania nie została skonfigurowana. Logowanie produkcyjne jest niedostępne.', { exact: true }).isVisible(), true)
    const metadane = await (await strona.request.get(`${adres}/wersja.json`)).json()
    assert.deepEqual(metadane, informacje)
    assert.equal((await (await strona.request.get(`${adres}/tryb-frontendu.json`)).json()).tryb, 'produkcyjny')
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})
