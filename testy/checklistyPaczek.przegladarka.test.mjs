import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile } from 'node:fs/promises'
import test from 'node:test'

// Playwright może pochodzić z lokalnego środowiska testowego lub pakietu Codex.
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

test('checklisty: routing, formularz, zapis, stare dane, eksport i izolacja awarii', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const kontekst = await przegladarka.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } })
    const strona = await kontekst.newPage()
    const bledy = []
    const bledySieci = []
    let oczekiwanaAwaria = false
    strona.on('pageerror', (blad) => { if (!oczekiwanaAwaria) bledy.push(blad.message) })
    strona.on('console', (wpis) => { if (wpis.type() === 'error' && !oczekiwanaAwaria) bledy.push(wpis.text()) })
    strona.on('requestfailed', (zadanie) => { if (!zadanie.failure()?.errorText.includes('ERR_ABORTED')) bledySieci.push(zadanie.url()) })
    strona.on('response', (odpowiedz) => { if (odpowiedz.status() >= 400) bledySieci.push(`${odpowiedz.status()} ${odpowiedz.url()}`) })
    await strona.goto(`${adres}/dokumenty/checklisty-paczek`)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).waitFor()
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), '')
    assert.match(strona.url(), /checklisty-paczek\/[^/]+$/)
    const adresDokumentu = strona.url()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Test regresji checklisty')
    await strona.getByLabel('Liczba uczestników', { exact: true }).fill('12')
    await strona.getByLabel('Odbiorca', { exact: true }).fill('Odbiorca testowy')
    await strona.getByLabel('przewoznik', { exact: true }).fill('Kurier testowy')
    await strona.getByLabel('numerPrzesylki', { exact: true }).fill('TEST-123')
    await strona.getByLabel('Nowa pozycja', { exact: true }).fill('Pozycja testowa')
    await strona.getByRole('button', { name: 'Dodaj pozycję', exact: true }).click()
    const polaPozycji = strona.getByRole('textbox', { name: 'Materiał lub element', exact: true })
    await strona.locator('input[value="Pozycja testowa"]').fill('Pozycja po edycji')
    assert.equal(await polaPozycji.count(), 12)
    await strona.getByRole('button', { name: 'Usuń: Pozycja po edycji', exact: true }).click()
    assert.equal(await strona.getByRole('button', { name: 'Usuń: Pozycja po edycji', exact: true }).count(), 0)
    await strona.getByRole('button', { name: 'Zapisz jako roboczą', exact: true }).click()
    await strona.reload()
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), 'Test regresji checklisty')
    assert.equal(await strona.getByLabel('przewoznik', { exact: true }).inputValue(), 'Kurier testowy')
    const podglad = strona.locator('#wydruk-checklisty')
    assert.match(await podglad.innerText(), /Test regresji checklisty/)
    assert.match(await podglad.innerText(), /Kurier testowy/)
    assert.equal(await podglad.getByRole('columnheader', { name: 'Kategoria', exact: true }).count(), 1)
    assert.equal(await podglad.locator('th[scope="rowgroup"]').count(), 4)
    const pobieranie = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click()
    const plik = await pobieranie
    assert.match(plik.suggestedFilename(), /\.pdf$/i)
    const bajty = await readFile(await plik.path())
    assert.equal(bajty.subarray(0, 4).toString(), '%PDF')

    // Symulacja pełnego magazynu wyłącznie w odizolowanym kontekście.
    await strona.evaluate(() => {
      window.oryginalnyZapisTestowy = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz === 'ultimatePomagier.rejestrDokumentow.v1') throw new DOMException('Test quota', 'QuotaExceededError')
        return window.oryginalnyZapisTestowy.call(this, klucz, wartosc)
      }
    })
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Zachowaj niezapisane dane')
    await strona.getByRole('button', { name: 'Ponów zapis', exact: true }).waitFor()
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), 'Zachowaj niezapisane dane')
    assert.equal(await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).count(), 1)
    await strona.evaluate(() => { Storage.prototype.setItem = window.oryginalnyZapisTestowy })
    await strona.getByRole('button', { name: 'Ponów zapis', exact: true }).click()
    await strona.reload()
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), 'Zachowaj niezapisane dane')

    await strona.evaluate(async () => {
      const rejestr = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const stan = rejestr.pobierzStanRejestruDokumentow()
      const dokument = stan.dokumenty.find((wpis) => wpis.id === decodeURIComponent(location.pathname.split('/').at(-1)))
      for (const pole of ['paczki', 'daneSzkolenia', 'daneOdbiorcy', 'historia', 'wersjeWydruku', 'zalaczniki', 'prosbyOWeryfikacje']) delete dokument.daneDokumentu[pole]
      dokument.daneDokumentu.przewoznik = 'Starszy przewoźnik'
      rejestr.zapiszStanRejestruDokumentow(stan)
    })
    await strona.reload()
    assert.equal(await strona.getByLabel('przewoznik', { exact: true }).inputValue(), 'Starszy przewoźnik')
    assert.equal(await strona.getByLabel('Odbiorca', { exact: true }).inputValue(), '')
    await strona.getByRole('button', { name: 'Zapisz jako roboczą', exact: true }).click()
    await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).press('Enter')
    const dokumentyMenu = strona.getByRole('button', { name: 'DOKUMENTY', exact: true })
    if (await dokumentyMenu.getAttribute('aria-expanded') !== 'true') await dokumentyMenu.click()
    const checklistyMenu = strona.getByRole('button', { name: 'Checklisty paczek', exact: true })
    if (await checklistyMenu.getAttribute('aria-expanded') !== 'true') await checklistyMenu.click()
    await strona.evaluate(() => {
      const zapisz = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz === 'ultimatePomagier.rejestrDokumentow.v1' && JSON.parse(wartosc).wersja !== 4) throw new DOMException('Test quota', 'QuotaExceededError')
        return zapisz.call(this, klucz, wartosc)
      }
    })
    await strona.getByRole('button', { name: 'Nowa checklista paczki', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).waitFor()
    assert.notEqual(strona.url(), adresDokumentu)
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.rejestrDokumentow.v1')).wersja), 4)
    await strona.reload()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).waitFor()

    // Wyjątek montowania nie może usunąć nagłówka ani menu.
    oczekiwanaAwaria = true
    await strona.addInitScript(() => {
      const zapisz = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz === 'ultimatePomagier.rejestrDokumentow.v1' && !sessionStorage.getItem('zezwolTestowyZapis')) throw new DOMException('Test quota', 'QuotaExceededError')
        return zapisz.call(this, klucz, wartosc)
      }
    })
    await strona.goto(`${adres}/dokumenty/checklisty-paczek`)
    await strona.getByRole('button', { name: 'Ponów próbę', exact: true }).waitFor()
    assert.equal(await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).count(), 1)
    assert.match(await strona.getByRole('alert').innerText(), /Checklisty paczek/)
    assert.doesNotMatch(await strona.getByRole('alert').innerText(), /QuotaExceeded|ultimatePomagier|Test quota/)
    await strona.evaluate(() => sessionStorage.setItem('zezwolTestowyZapis', '1'))
    await strona.getByRole('button', { name: 'Ponów próbę', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).waitFor()
    const adresPoPonowieniu = strona.url()
    await strona.evaluate(() => sessionStorage.removeItem('zezwolTestowyZapis'))
    await strona.goto(`${adres}/dokumenty/checklisty-paczek`)
    await strona.getByRole('button', { name: 'Wróć do Dokumentów', exact: true }).click()
    await strona.getByRole('heading', { name: 'Wszystkie dokumenty', exact: true }).waitFor()
    await strona.evaluate(() => sessionStorage.setItem('zezwolTestowyZapis', '1'))
    await strona.goto(adresPoPonowieniu)
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).waitFor()
    oczekiwanaAwaria = false
    await strona.setViewportSize({ width: 390, height: 844 })
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).isVisible(), true)
    await strona.setViewportSize({ width: 1440, height: 1000 })
    await mkdir('tmp', { recursive: true })
    await strona.screenshot({ path: 'tmp/checklisty-paczek.png', fullPage: true })
    await strona.screenshot({ path: 'tmp/checklisty-paczek-widok.png' })
    for (const [sciezka, etykieta] of [
      ['/dokumenty/listy-obecnosci', 'Lista obecności'], ['/dokumenty/ankiety', 'Ankieta'],
      ['/dokumenty/karta-na-drzwi', 'Karty na drzwi'], ['/dokumenty/dyplomy', 'Certyfikat'],
      ['/dokumenty/programy-szkolen', 'Program'],
    ]) {
      await strona.goto(adres + sciezka)
      await strona.locator('main.uklad-aplikacji__obszar-roboczy').waitFor()
      assert.match(await strona.locator('main.uklad-aplikacji__obszar-roboczy').innerText(), new RegExp(etykieta, 'i'))
      assert.equal(await strona.getByRole('button', { name: 'Ponów próbę', exact: true }).count(), 0)
    }
    assert.deepEqual(bledy, [], 'Nieoczekiwane błędy JS lub konsoli')
    assert.deepEqual(bledySieci, [], 'Błędy ładowania modułów lub zasobów')
  } finally { await przegladarka.close() }
})
