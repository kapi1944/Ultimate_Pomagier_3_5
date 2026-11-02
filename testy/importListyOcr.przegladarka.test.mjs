import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync } from 'node:fs'
import { jsPDF as DokumentPdf } from 'jspdf'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5185'
async function przygotujStrone(przegladarka, szerokosc = 1440) {
  const strona = await przegladarka.newPage({ viewport: { width: szerokosc, height: 1000 }, acceptDownloads: true })
  await strona.goto(adres)
  await strona.evaluate(async () => { const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts'); if (!rozpocznijSesje('architekt-systemu')) throw new Error('Brak sesji') })
  await strona.goto(`${adres}/dokumenty/listy-obecnosci`)
  await strona.getByRole('button', { name: 'Importuj listę ze skanu (OCR)', exact: true }).click()
  return strona
}
async function obrazListy(strona, odreczna = false) {
  return strona.evaluate((odreczna) => {
    const kanwa = document.createElement('canvas'); kanwa.width = 1500; kanwa.height = 1600
    const kontekst = kanwa.getContext('2d'); kontekst.fillStyle = '#fff'; kontekst.fillRect(0, 0, 1500, 1600)
    kontekst.fillStyle = '#000'; kontekst.font = '28px Arial'; kontekst.fillText('Syntetyczna lista testowa 28–29.10.2026', 50, 60)
    const granice = [50, 130, 470, 730, 950, 1200, 1450]
    kontekst.strokeStyle = '#000'; kontekst.lineWidth = 2
    for (const x of granice) { kontekst.beginPath(); kontekst.moveTo(x, 100); kontekst.lineTo(x, 1480); kontekst.stroke() }
    for (let i = 0; i < 24; i++) { kontekst.beginPath(); kontekst.moveTo(50, 100 + i * 60); kontekst.lineTo(1450, 100 + i * 60); kontekst.stroke() }
    kontekst.font = '24px Arial'
    const naglowki = ['Lp.', 'Nazwisko', 'Imię', 'Zespół', 'Podpis 28.10', 'Podpis 29.10']
    naglowki.forEach((nazwa, i) => kontekst.fillText(nazwa, granice[i] + 8, 138))
    if (odreczna) kontekst.font = '23px "Segoe Script", cursive'
    const imiona = ['Żaneta', 'Alicja', 'Łukasz', 'Michał', 'Anna', 'Piotr', 'Zofia', 'Jan', 'Maria', 'Paweł', 'Ewa', 'Adam', 'Olga', 'Tomasz', 'Iga', 'Karol', 'Beata', 'Filip', 'Eliza', 'Jakub', 'Urszula', 'Wojciech']
    for (let i = 1; i <= 22; i++) {
      const dane = ['' + i, i === 1 ? 'Próbna-Testowa' : 'Przykładowa', imiona[i - 1], 'Zespół A', 'XYZ', 'XYZ']
      dane.forEach((wartosc, k) => kontekst.fillText(wartosc, granice[k] + 8, 138 + i * 60))
    }
    return kanwa.toDataURL('image/png')
  }, odreczna)
}
const font = readFileSync('public/fonty-pdf/LiberationSans-Regular.ttf').toString('base64')
function pdfTekstowy() {
  const pdf = new DokumentPdf(); pdf.addFileToVFS('font.ttf', font); pdf.addFont('font.ttf', 'polski', 'normal'); pdf.setFont('polski'); pdf.setFontSize(12)
  for (let strona = 0; strona < 2; strona++) {
    if (strona) pdf.addPage()
    for (const [tekst, x] of [['Lp.', 10], ['Nazwisko', 30], ['Imię', 85], ['Zespół', 120], ['Podpis 28.10', 155]]) pdf.text(tekst, x, 30)
    for (const [tekst, x] of [['1', 10], ['Próbna-Testowa', 30], [strona ? 'Łukasz' : 'Żaneta', 85], ['TEST', 120]]) pdf.text(tekst, x, 45)
  }
  return Buffer.from(pdf.output('arraybuffer'))
}

test('lokalny OCR: 22 wiersze i sześć kolumn, korekta, eksport, podpisy, szkic i import do generatora', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przygotujStrone(przegladarka)
    const bledy = [], zewnetrzne = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.route('**/*', (trasa) => { if (/^https?:/.test(trasa.request().url()) && !trasa.request().url().startsWith(adres)) { zewnetrzne.push(trasa.request().url()); return trasa.abort() } return trasa.continue() })
    const grafika = await obrazListy(strona)
    await strona.locator('.importer-ocr').evaluate(async (element, grafika) => {
      const blob = await (await fetch(grafika)).blob()
      const dane = new DataTransfer(); dane.items.add(new File([blob], 'wklejona.png', { type: 'image/png' }))
      element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: dane }))
    }, grafika)
    assert.match(await strona.locator('.importer-ocr [role=status]').innerText(), /schowek.png/)
    await strona.locator('.importer-ocr').evaluate(async (element, grafika) => {
      const blob = await (await fetch(grafika)).blob()
      const dane = new DataTransfer(); dane.items.add(new File([blob], 'przeciagnieta.png', { type: 'image/png' }))
      element.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dane }))
    }, grafika)
    assert.match(await strona.locator('.importer-ocr [role=status]').innerText(), /przeciagnieta.png/)
    await strona.locator('.importer-ocr input[type=file]').setInputFiles({ name: 'syntetyczna-lista.png', mimeType: 'image/png', buffer: Buffer.from(grafika.split(',')[1], 'base64') })
    await strona.getByRole('button', { name: 'Rozpocznij analizę', exact: true }).click()
    await strona.locator('.importer-ocr [role=status]').filter({ hasText: 'Odczyt zakończony' }).waitFor({ timeout: 150000 })
    assert.equal(await strona.locator('.importer-ocr tbody tr').count(), 22)
    assert.equal(await strona.getByLabel('Nagłówek kolumny 6').count(), 1)
    const wynik = await strona.locator('.importer-ocr table').innerText()
    assert.ok(!wynik.includes('XYZ'), 'Podpisy nie mogą być transkrybowane')
    const pola = strona.locator('.importer-ocr tbody tr').first().locator('td input:not([type=checkbox])')
    await pola.nth(1).fill('Próbna-Testowa'); await pola.nth(2).fill('Żaneta')
    assert.equal(await strona.locator('.importer-ocr__zaznaczenie').count(), 1)
    await strona.getByRole('button', { name: 'Zweryfikuj wiersz 1', exact: true }).click()
    await strona.getByLabel('Wybierz wiersz 1', { exact: true }).check()
    await strona.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: adres })
    await strona.getByRole('button', { name: 'Kopiuj tabelę', exact: true }).click()
    const skopiowanaTabela = await strona.evaluate(() => navigator.clipboard.readText())
    assert.ok(skopiowanaTabela.includes('\t') && skopiowanaTabela.includes('Żaneta'))
    await strona.getByRole('button', { name: 'Kopiuj zaznaczone wiersze', exact: true }).click()
    assert.equal((await strona.evaluate(() => navigator.clipboard.readText())).split('\n').length, 2)
    await strona.getByRole('button', { name: 'Zapisz wynik roboczy', exact: true }).click()
    const pobranie = strona.waitForEvent('download'); await strona.getByRole('button', { name: 'Eksport XLSX', exact: true }).click(); assert.equal(await (await pobranie).failure(), null)
    await strona.getByRole('button', { name: 'Tabela', exact: true }).click()
    const zastosuj = strona.getByRole('button', { name: 'Zastosuj uczestników', exact: true })
    assert.equal(await zastosuj.isDisabled(), true)
    await strona.getByLabel(/Zweryfikowałem przyporządkowanie osób/).check()
    assert.equal(await zastosuj.isEnabled(), true)
    mkdirSync('tmp', { recursive: true }); await strona.screenshot({ path: 'tmp/importer-ocr-desktop.png' })
    await zastosuj.click()
    assert.match(await strona.locator('.generator-list-obecnosci__uczestnicy').innerText(), /Imię i nazwisko/)
    assert.equal(await strona.locator('.generator-list-obecnosci__uczestnicy input').first().inputValue(), 'Żaneta Próbna-Testowa')
    assert.deepEqual(zewnetrzne, []); assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('cyfrowy PDF: dwie strony bez OCR, mały ekran, zachowanie korekt, anulowanie i ponowne otwarcie szkicu', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przygotujStrone(przegladarka, 390)
    const zasobyOcr = []
    strona.on('request', (zadanie) => { if (zadanie.url().includes('/ocr/')) zasobyOcr.push(zadanie.url()) })
    await strona.locator('.importer-ocr input[type=file]').setInputFiles({ name: 'lista.pdf', mimeType: 'application/pdf', buffer: pdfTekstowy() })
    await strona.getByRole('button', { name: 'Rozpocznij analizę', exact: true }).click()
    await strona.locator('.importer-ocr [role=status]').filter({ hasText: 'Odczyt zakończony' }).waitFor()
    assert.deepEqual(zasobyOcr, [], 'Cyfrowy PDF nie uruchamia OCR')
    assert.equal(await strona.locator('.importer-ocr__akcje select').last().locator('option').count(), 2)
    assert.equal(await strona.locator('.importer-ocr tbody tr').count(), 1)
    await strona.getByRole('button', { name: 'Zweryfikuj wiersz 1', exact: true }).click()
    await strona.getByRole('button', { name: 'Zapisz wynik roboczy', exact: true }).click()
    assert.equal(await strona.getByRole('button', { name: 'Rozpocznij analizę', exact: true }).isDisabled(), true)
    await strona.getByRole('button', { name: 'Zamknij importer', exact: true }).click()
    await strona.getByRole('button', { name: 'Importuj listę ze skanu (OCR)', exact: true }).click()
    await strona.getByRole('button', { name: 'Przywróć wynik roboczy', exact: true }).click()
    assert.match(await strona.locator('.importer-ocr tbody').innerText(), /Zweryfikowano/)
    const ramka = await strona.getByRole('dialog').boundingBox(); assert.ok(ramka.x >= 0 && ramka.x + ramka.width <= 391)
    const rozmiary = await strona.getByRole('dialog').evaluate((element) => ({ szerokosc: element.clientWidth, zawartosc: element.scrollWidth }))
    assert.ok(rozmiary.zawartosc <= rozmiary.szerokosc + 1, JSON.stringify(rozmiary))
    mkdirSync('tmp', { recursive: true }); await strona.screenshot({ path: 'tmp/importer-ocr-mobile.png' })
  } finally { await przegladarka.close() }
})

test('skan PDF: dwie strony, jeden silnik, ochrona podpisów, obrót i kontrolowany nieczytelny obraz', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przygotujStrone(przegladarka)
    const grafika = await obrazListy(strona)
    const pdf = new DokumentPdf()
    for (let numer = 0; numer < 2; numer++) { if (numer) pdf.addPage(); pdf.addImage(grafika, 'PNG', 5, 5, 200, 213) }
    const wynik = await strona.evaluate(async (bajty) => {
      const { importujDokumentOcr } = await import('/src/wspolne/ocr/importDokumentuOcr.ts')
      const wynik = await importujDokumentOcr(new File([new Uint8Array(bajty)], 'skan.pdf', { type: 'application/pdf' }), { sygnal: new AbortController().signal, postep: () => {}, obrot: 0, odreczna: false, binarnie: false, podpisyOd: 70 })
      return wynik.map((strona) => ({ liczba: strona.tabela.wiersze.length, podpisy: strona.tabela.wiersze.every((wiersz) => wiersz.slice(-2).every((pole) => pole.podpis)), strona: strona.tabela.strona }))
    }, [...new Uint8Array(pdf.output('arraybuffer'))])
    assert.deepEqual(wynik, [{ liczba: 22, podpisy: true, strona: 1 }, { liczba: 22, podpisy: true, strona: 2 }])
    const obrocony = await strona.evaluate(async (grafika) => {
      const obraz = new Image(); obraz.src = grafika; await obraz.decode()
      const kanwa = document.createElement('canvas'); kanwa.width = obraz.height; kanwa.height = obraz.width
      const kontekst = kanwa.getContext('2d'); kontekst.translate(kanwa.width, 0); kontekst.rotate(Math.PI / 2); kontekst.drawImage(obraz, 0, 0)
      const blob = await new Promise((rozwiaz) => kanwa.toBlob(rozwiaz, 'image/jpeg', 0.8))
      const { importujDokumentOcr } = await import('/src/wspolne/ocr/importDokumentuOcr.ts')
      const [wynik] = await importujDokumentOcr(new File([blob], 'obrocona.jpg', { type: 'image/jpeg' }), { sygnal: new AbortController().signal, postep: () => {}, obrot: 270, odreczna: false, binarnie: true, podpisyOd: 70 })
      return { wiersze: wynik.tabela.wiersze.length, kolumny: wynik.tabela.naglowki.length }
    }, grafika)
    assert.deepEqual(obrocony, { wiersze: 22, kolumny: 6 })
    const nieczytelny = await strona.evaluate(async () => {
      const kanwa = document.createElement('canvas'); kanwa.width = 600; kanwa.height = 800
      const kontekst = kanwa.getContext('2d'); kontekst.fillStyle = '#fff'; kontekst.fillRect(0, 0, 600, 800)
      const blob = await new Promise((rozwiaz) => kanwa.toBlob(rozwiaz, 'image/webp'))
      const { importujDokumentOcr } = await import('/src/wspolne/ocr/importDokumentuOcr.ts')
      let zablokowano = false
      try { await importujDokumentOcr(new File([blob], 'pusty.webp', { type: 'image/webp' }), { sygnal: new AbortController().signal, postep: () => {}, obrot: 0, odreczna: true, binarnie: false, podpisyOd: 70 }) }
      catch (blad) { zablokowano = blad.message.includes('obszar podpisów') }
      if (!zablokowano) throw new Error('Brak potwierdzonego obszaru podpisów musi zatrzymać odczyt niepewnego układu.')
      const [wynik] = await importujDokumentOcr(new File([blob], 'pusty.webp', { type: 'image/webp' }), { sygnal: new AbortController().signal, postep: () => {}, obrot: 0, odreczna: true, binarnie: false, podpisyOd: 70, podpisyPotwierdzone: true })
      return wynik.tabela.wiersze.length
    })
    assert.equal(nieczytelny, 0, 'Nie wolno dopisywać uczestników do nieczytelnego obrazu')
  } finally { await przegladarka.close() }
})

test('anulowanie i uszkodzony plik zachowują wcześniejsze wyniki', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przygotujStrone(przegladarka)
    await strona.locator('.importer-ocr input[type=file]').setInputFiles({ name: 'lista.pdf', mimeType: 'application/pdf', buffer: pdfTekstowy() })
    await strona.getByRole('button', { name: 'Rozpocznij analizę', exact: true }).click()
    await strona.locator('.importer-ocr [role=status]').filter({ hasText: 'Odczyt zakończony' }).waitFor()
    const przed = await strona.locator('.importer-ocr table').innerText()
    await strona.locator('.importer-ocr input[type=file]').setInputFiles({ name: 'uszkodzony.png', mimeType: 'image/png', buffer: Buffer.from('niepoprawny obraz') })
    await strona.getByLabel(/Zezwalam na zastąpienie bieżącego wyniku/).check()
    await strona.getByRole('button', { name: 'Rozpocznij analizę', exact: true }).click()
    await strona.locator('.importer-ocr [role=status]').filter({ hasText: 'Nie można odczytać obrazu' }).waitFor()
    assert.equal(await strona.locator('.importer-ocr table').innerText(), przed)
    const grafika = await obrazListy(strona)
    await strona.locator('.importer-ocr input[type=file]').setInputFiles({ name: 'anulowanie.png', mimeType: 'image/png', buffer: Buffer.from(grafika.split(',')[1], 'base64') })
    await strona.getByLabel(/Zezwalam na zastąpienie bieżącego wyniku/).check()
    await strona.getByRole('button', { name: 'Rozpocznij analizę', exact: true }).click()
    await strona.getByRole('button', { name: 'Anuluj przetwarzanie', exact: true }).click()
    await strona.locator('.importer-ocr [role=status]').filter({ hasText: 'Anulowano' }).waitFor()
    assert.equal(await strona.locator('.importer-ocr table').innerText(), przed)
  } finally { await przegladarka.close() }
})

test('import do źródłowej grupy szkolenia korzysta z aktualnego formularza i zachowuje istniejące osoby', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przygotujStrone(przegladarka)
    await strona.getByRole('button', { name: 'Zamknij importer', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const rozwin = strona.getByRole('button', { name: 'Rozwiń grupę', exact: true })
    if (await rozwin.count()) await rozwin.first().click()
    await strona.getByRole('button', { name: 'Importuj listę ze skanu (OCR)', exact: true }).first().click()
    await strona.locator('.importer-ocr input[type=file]').setInputFiles({ name: 'lista.pdf', mimeType: 'application/pdf', buffer: pdfTekstowy() })
    await strona.getByRole('button', { name: 'Rozpocznij analizę', exact: true }).click()
    await strona.locator('.importer-ocr [role=status]').filter({ hasText: 'Odczyt zakończony' }).waitFor()
    await strona.getByRole('button', { name: 'Zweryfikuj wiersz 1', exact: true }).click()
    await strona.getByLabel('Wybierz wiersz 1', { exact: true }).check()
    await strona.getByLabel(/Zweryfikowałem przyporządkowanie osób/).check()
    await strona.getByRole('button', { name: 'Zastosuj uczestników', exact: true }).click()
    assert.match(await strona.getByPlaceholder('Jedna osoba w każdym wierszu').first().inputValue(), /Żaneta Próbna-Testowa/)
  } finally { await przegladarka.close() }
})

test('syntetyczne pismo kursywne: wynik pozostaje niepewny i wymaga ręcznego potwierdzenia', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przygotujStrone(przegladarka)
    const grafika = await obrazListy(strona, true)
    const wynik = await strona.evaluate(async (grafika) => {
      const blob = await (await fetch(grafika)).blob()
      const { importujDokumentOcr } = await import('/src/wspolne/ocr/importDokumentuOcr.ts')
      const [wynik] = await importujDokumentOcr(new File([blob], 'kursywa.jpeg', { type: 'image/png' }), { sygnal: new AbortController().signal, postep: () => {}, obrot: 0, odreczna: true, binarnie: false, podpisyOd: 70 })
      return { wiersze: wynik.tabela.wiersze.length, niepewne: wynik.tabela.wiersze.every((wiersz) => wiersz.every((pole) => !pole.zweryfikowana && pole.pewnosc <= 60)) }
    }, grafika)
    assert.deepEqual(wynik, { wiersze: 22, niepewne: true })
    const wspolnyImport = await strona.evaluate(async (grafika) => {
      const blob = await (await fetch(grafika)).blob()
      const { importujPlikDoDokumentu } = await import('/src/wspolne/import/importujPlikDoDokumentu.ts')
      const wynik = await importujPlikDoDokumentu(new File([blob], 'wspolny-import.png', { type: 'image/png' }))
      URL.revokeObjectURL(wynik.dokument.zrodlo.podgladOryginalu)
      return { tekst: wynik.tekstZrodlowy.length, wymagaOcr: wynik.dokument.zrodlo.wymagaOcr }
    }, grafika)
    assert.ok(wspolnyImport.tekst > 0)
    assert.equal(wspolnyImport.wymagaOcr, false)
  } finally { await przegladarka.close() }
})
