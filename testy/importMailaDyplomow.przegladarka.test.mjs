import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { jsPDF as DokumentPdf } from 'jspdf'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'
const mail = readFileSync(new URL('./fixtures/mailSzkolenieNbp.txt', import.meta.url), 'utf8')
const klucz = 'ultimate-pomagier.dyplomy.generator-pawla'

for (const szerokosc of [1440, 390]) test(`import maila do Dyplomów: weryfikacja, podgląd, szkic i cofnięcie przy ${szerokosc}px i skali 85%`, { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: szerokosc, height: 1000 }, hasTouch: szerokosc < 600 })
    const bledy = []
    const wyslane = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    strona.on('request', (zadanie) => { if (zadanie.method() === 'POST') wyslane.push(zadanie.url()) })
    await strona.goto(adres)
    await strona.evaluate(async (klucz) => {
      const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
      sprawdzSesje(rozpocznijSesje('architekt-systemu'))
      function sprawdzSesje(wynik) { if (!wynik) throw new Error('Brak sesji testowej') }
      localStorage.setItem(klucz, JSON.stringify({
        tytulSzkolenia: 'Poprzedni tytuł', wybraneDaty: ['2026-10-01'], liczbaGodzin: '2', trener: 'Jan Nowak', trybSzkolenia: 'online', miejsceSzkolenia: 'Warszawa',
        trybTytulu: 'zaswiadczenie', motywKoloru: 'semper', wariantSzablonu: 'CRM', dodatki: [], trybZapisuDat: 'zakres_pelny', rozmiarTytulu: 23, rodzajGodzin: 'dydaktycznych', czyGotowyPodpisOrganizatora: true,
        uczestnicyTekst: 'Anna Kowalska', uczestnicy: [{ id: 'anna', imieNazwisko: 'Anna Kowalska', numerRejestru: 'D/001', idDodatkuGornego: '', idDodatkuDolnego: '', drugaStrona: false }],
      }))
    }, klucz)
    await strona.goto(`${adres}/dokumenty/dyplomy`)
    await strona.getByRole('heading', { name: 'Generator Dyplomów', exact: true }).waitFor()
    await strona.evaluate(async () => (await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')).zastosujSkaleInterfejsu(85))
    const odczytajSzkic = () => strona.evaluate((klucz) => JSON.parse(localStorage.getItem(klucz)), klucz)
    const przed = await odczytajSzkic()
    const przycisk = strona.getByRole('button', { name: '📩 Importuj dane szkolenia z maila', exact: true })
    await przycisk.scrollIntoViewIfNeeded()
    const ramka = await przycisk.boundingBox()
    assert.ok(ramka.x >= 0 && ramka.x + ramka.width <= szerokosc + 1, 'Przycisk musi mieścić się w ekranie')
    await przycisk.click()
    const modal = strona.getByRole('dialog', { name: 'Import danych szkolenia z wiadomości e-mail' })
    const wiadomosc = modal.getByLabel('Wklej treść wiadomości e-mail zawierającej szczegóły organizacyjne szkolenia')
    await modal.getByRole('button', { name: 'Analizuj wiadomość', exact: true }).click()
    assert.match(await modal.getByRole('alert').innerText(), /Wklej treść/)
    await wiadomosc.fill(mail)
    assert.equal(await modal.getByRole('heading', { name: 'Rozpoznane dane szkolenia' }).count(), 0, 'Wklejenie nie uruchamia analizy')
    await modal.getByRole('button', { name: 'Analizuj wiadomość', exact: true }).click()
    const zastosuj = modal.getByRole('button', { name: 'Zastosuj rozpoznane dane', exact: true })
    assert.equal(await zastosuj.isDisabled(), true)
    assert.equal(await modal.getByLabel('Rozpoznane: Trener', { exact: true }).inputValue(), 'Maria Sobieska')
    assert.equal(await modal.getByLabel('Rozpoznane: Maksymalna liczba uczestników', { exact: true }).inputValue(), '30')
    await modal.getByRole('button', { name: /2026-11-06 \(/ }).click()
    await modal.getByRole('button', { name: 'Potwierdź: Tryb', exact: true }).click()
    await modal.getByLabel('Rozpoznane: Tytuł', { exact: true }).fill('Równoważny czas pracy — sprawdzony')
    await modal.getByText('Fragment wiadomości: Miejsce', { exact: true }).click()
    assert.match(await modal.locator('blockquote').filter({ visible: true }).first().innerText(), /Starejwsi/)
    await modal.getByLabel('Zatwierdzam nadpisanie zaznaczonych pól po porównaniu wartości.', { exact: true }).check()
    assert.equal(await zastosuj.isEnabled(), true)
    const geometria = await modal.evaluate((element) => ({ szerokosc: element.clientWidth, zawartosc: element.scrollWidth, ramka: element.getBoundingClientRect().toJSON() }))
    assert.ok(geometria.zawartosc <= geometria.szerokosc + 1, JSON.stringify(geometria))
    assert.ok(geometria.ramka.x >= 0 && geometria.ramka.right <= szerokosc + 1, JSON.stringify(geometria))
    mkdirSync('tmp', { recursive: true })
    await strona.screenshot({ path: `tmp/import-maila-dyplomy-${szerokosc}.png` })
    await zastosuj.click()
    await modal.waitFor({ state: 'hidden' })
    const podglad = strona.locator('.dyplomy__podglad-kartki').first()
    assert.match(await podglad.innerText(), /Równoważny czas pracy — sprawdzony/)
    assert.match(await podglad.innerText(), /Maria Sobieska/)
    await strona.waitForFunction((klucz) => JSON.parse(localStorage.getItem(klucz)).tytulSzkolenia === 'Równoważny czas pracy — sprawdzony', klucz)
    const po = await odczytajSzkic()
    assert.deepEqual(po.wybraneDaty, ['2026-11-05', '2026-11-06'])
    assert.equal(po.liczbaGodzin, '9')
    assert.equal(po.rodzajGodzin, 'zegarowych')
    assert.equal(po.trybSzkolenia, 'stacjonarne')
    for (const pole of ['trybTytulu', 'motywKoloru', 'wariantSzablonu', 'rozmiarTytulu', 'czyGotowyPodpisOrganizatora', 'uczestnicy', 'dodatki', 'trybZapisuDat']) assert.deepEqual(po[pole], przed[pole], pole)
    await strona.getByRole('button', { name: 'Cofnij import z maila', exact: true }).click()
    await strona.waitForFunction((klucz) => JSON.parse(localStorage.getItem(klucz)).tytulSzkolenia === 'Poprzedni tytuł', klucz)
    assert.match(await podglad.innerText(), /Poprzedni tytuł/)
    const poCofnieciu = await odczytajSzkic()
    for (const pole of ['tytulSzkolenia', 'wybraneDaty', 'liczbaGodzin', 'trener', 'trybSzkolenia', 'rodzajGodzin', 'uczestnicy']) assert.deepEqual(poCofnieciu[pole], przed[pole], pole)
    await przycisk.click()
    await wiadomosc.fill(mail)
    await strona.keyboard.press('Escape')
    assert.deepEqual(await odczytajSzkic(), poCofnieciu)
    assert.equal(await przycisk.evaluate((element) => element === document.activeElement), true, 'Fokus wraca na przycisk')
    assert.deepEqual(bledy, [])
    assert.deepEqual(wyslane, [], 'Treść maila nie jest wysyłana')
  } finally { await przegladarka.close() }
})

test('dotychczasowy import TXT/PDF działa obok maila i nie zmienia danych po anulowaniu', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
    await strona.goto(adres)
    await strona.evaluate(async () => {
      const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
      rozpocznijSesje('architekt-systemu')
    })
    await strona.goto(`${adres}/dokumenty/dyplomy`)
    await strona.getByRole('heading', { name: 'Generator Dyplomów', exact: true }).waitFor()
    const tekst = 'Pan / Pani Anna Kowalska ukończył/a szkolenie: Test starego importu zrealizowane w terminie: 05.11.2026 w wymiarze 8 godzin zegarowych Miejsce szkolenia: online. Ekspert: Maria Sobieska Nr rejestru: D/001'
    await strona.locator('input[type="file"][accept=".pdf,.txt,application/pdf,text/plain"]').setInputFiles({ name: 'dyplom.txt', mimeType: 'text/plain', buffer: Buffer.from(tekst) })
    const sekcja = strona.getByRole('region', { name: 'Dane dyplomu do zatwierdzenia' })
    await sekcja.getByRole('button', { name: 'Zastosuj wybrane dane', exact: true }).click()
    assert.match(await strona.locator('.dyplomy__podglad-kartki').first().innerText(), /Test starego importu/)
    await strona.getByRole('button', { name: '📩 Importuj dane szkolenia z maila', exact: true }).click()
    const modal = strona.getByRole('dialog')
    await modal.getByLabel('Wklej treść wiadomości e-mail zawierającej szczegóły organizacyjne szkolenia').fill('Tytuł szkolenia: Pierwsze\nTytuł szkolenia: Drugie')
    await modal.getByRole('button', { name: 'Analizuj wiadomość', exact: true }).click()
    assert.equal(await modal.getByRole('button', { name: 'Zastosuj rozpoznane dane', exact: true }).isDisabled(), true)
    await modal.getByRole('button', { name: 'Wróć do wiadomości', exact: true }).click()
    await modal.getByRole('button', { name: 'Wyczyść', exact: true }).click()
    assert.equal(await modal.locator('textarea').inputValue(), '')
    await strona.keyboard.press('Escape')
    assert.match(await strona.locator('.dyplomy__podglad-kartki').first().innerText(), /Test starego importu/)
    const pobranie = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'PDF wszystkich uczestników (1)', exact: true }).click()
    const pdf = await pobranie
    assert.equal(await pdf.failure(), null)
    const dokumentPdf = new DokumentPdf()
    dokumentPdf.addFileToVFS('font.ttf', readFileSync('public/fonty-pdf/LiberationSans-Regular.ttf').toString('base64'))
    dokumentPdf.addFont('font.ttf', 'polski', 'normal')
    dokumentPdf.setFont('polski', 'normal')
    dokumentPdf.setFontSize(12)
    dokumentPdf.text(dokumentPdf.splitTextToSize(tekst.replace('Test starego importu', 'Test starego importu PDF'), 180), 15, 20)
    await strona.locator('input[type="file"][accept=".pdf,.txt,application/pdf,text/plain"]').setInputFiles({ name: 'dyplom.pdf', mimeType: 'application/pdf', buffer: Buffer.from(dokumentPdf.output('arraybuffer')) })
    await sekcja.getByRole('heading', { name: 'Import: dyplom.pdf', exact: true }).waitFor()
    assert.match(await sekcja.innerText(), /Test starego importu PDF/)
    await sekcja.getByRole('button', { name: 'Zastosuj wybrane dane', exact: true }).click()
    assert.match(await strona.locator('.dyplomy__podglad-kartki').first().innerText(), /Test starego importu PDF/)
  } finally { await przegladarka.close() }
})
