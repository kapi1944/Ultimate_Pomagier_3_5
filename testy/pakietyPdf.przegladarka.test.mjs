import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { utworzWersjeTestowa } from './danePakietuPdf.ts'
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5187'
async function uruchom(liczbaGrup = 1, mobilny = false) {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  const kontekst = await przegladarka.newContext({ viewport: mobilny ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobilny, acceptDownloads: true })
  const strona = await kontekst.newPage()
  strona.setDefaultTimeout(60000)
  const bledy = []
  strona.on('pageerror', (blad) => bledy.push(blad.message))
  strona.on('console', (wpis) => { if (wpis.type() === 'error') bledy.push(wpis.text()) })
  try {
  await strona.goto(adres, { waitUntil: 'domcontentloaded' })
  await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
  await strona.evaluate(async (wersja) => {
    const { pobierzZalogowanegoUzytkownika } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
    const uzytkownik = pobierzZalogowanegoUzytkownika()
    wersja.autorId = uzytkownik.id
    wersja.dane.opiekunId = uzytkownik.id
    const { zapiszWersjeRobocza, pobierzAktualnaWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
    zapiszWersjeRobocza(wersja)
    const zapisana = pobierzAktualnaWersjeRobocza()
    const { utworzPakietDokumentow } = await import('/src/wspolne/integracje/szczegolyDoDokumentow/index.ts')
    const wyniki = utworzPakietDokumentow(zapisana, ['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista'], wersja.autorId)
    if (wyniki.some((wynik) => !wynik.dokument)) throw new Error(JSON.stringify(wyniki))
    const { repozytoriumWspolnychDokumentow: rejestr } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
    for (const { dokument } of wyniki) if (dokument.typ === 'CERTYFIKAT') rejestr.aktualizuj(dokument.id, { daneDokumentu: { ...dokument.daneDokumentu, poczatkowyNumerRejestru: '2026/001' } })
    window.wersjaTestowaPakietu = zapisana
    window.dokumentyTestowePakietu = wyniki.map((wynik) => rejestr.pobierzPoId(wynik.dokument.id))
  }, utworzWersjeTestowa(true, liczbaGrup))
  await strona.goto(adres + '/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze')
  await strona.getByRole('button', { name: 'Edytuj', exact: true }).first().click()
  const schowaj = strona.getByRole('button', { name: 'Schowaj panel', exact: true })
  if (await schowaj.isVisible()) await schowaj.click()
  await strona.getByRole('button', { name: '📄 Przygotuj PDF do zatwierdzenia', exact: true }).click()
  const panel = strona.getByRole('region', { name: 'Dokumenty do zatwierdzenia', exact: true })
  await panel.getByRole('heading', { name: '📄 Dokumenty do zatwierdzenia', exact: true }).waitFor()
  return { przegladarka, kontekst, strona, panel, bledy }
  } catch (blad) {
    console.error('Błąd przygotowania testu:', String(blad), bledy)
    await mkdir('tmp/pakiety-pdf', { recursive: true })
    await strona.screenshot({ path: 'tmp/pakiety-pdf/blad-otwarcia.png' })
    await przegladarka.close()
    throw blad
  }
}
async function czekajNaPakiet(panel) {
  await Promise.race([
    panel.getByText(/Wyświetlono (\d+) z \1 stron\./).waitFor({ timeout: 180000 }),
    panel.locator('.pakiet-pdf__blad').waitFor({ timeout: 180000 }).then(async () => { throw new Error(await panel.locator('.pakiet-pdf__blad').innerText()) }),
  ])
}

test('wybór, kolejność, grupy, ponowne otwarcie i telefon przy skali 85%', { timeout: 120000 }, async () => {
  const { przegladarka, strona, panel, bledy } = await uruchom(2, true)
  try {
    await strona.evaluate(() => { document.documentElement.style.zoom = '.85' })
    assert.equal(await panel.locator('ol input:checked').count(), 7)
    await panel.getByRole('button', { name: 'Odznacz wszystkie', exact: true }).click()
    assert.equal(await panel.locator('ol input:checked').count(), 0)
    await panel.getByRole('button', { name: 'Zaznacz wszystkie', exact: true }).click()
    assert.equal(await panel.locator('ol input:checked').count(), 10)
    const pierwsza = await panel.locator('ol li').first().innerText()
    await panel.locator('ol li').first().getByRole('button', { name: /^Przenieś niżej:/ }).press('Enter')
    assert.notEqual(await panel.locator('ol li').first().innerText(), pierwsza)
    await panel.getByLabel('Grupa B', { exact: true }).uncheck()
    assert.equal(await panel.locator('ol input:checked').count(), 6)
    await strona.goto(adres + '/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze')
    await strona.getByRole('button', { name: 'Edytuj', exact: true }).first().click()
  const schowaj = strona.getByRole('button', { name: 'Schowaj panel', exact: true })
  if (await schowaj.isVisible()) await schowaj.click()
    await strona.getByRole('button', { name: '📄 Przygotuj PDF do zatwierdzenia', exact: true }).click()
    await panel.getByRole('heading', { name: '📄 Dokumenty do zatwierdzenia', exact: true }).waitFor()
    assert.equal(await panel.locator('ol input:checked').count(), 6)
    assert.equal(await panel.getByLabel('Grupa B', { exact: true }).isChecked(), false)
    assert.equal(await panel.getByLabel('Strona tytułowa', { exact: true }).isChecked(), true)
    assert.equal(await strona.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true)
    await mkdir('tmp/pakiety-pdf', { recursive: true })
    await panel.getByRole('heading').scrollIntoViewIfNeeded()
    await strona.screenshot({ path: 'tmp/pakiety-pdf/panel-mobilny.png' })
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('Program szkolenia nadal pobiera pojedynczy PDF z własnego generatora', { timeout: 120000 }, async () => {
  const { przegladarka, strona, panel } = await uruchom()
  try {
    await panel.getByRole('listitem').filter({ hasText: 'Pomoc publiczna' }).first()
      .getByRole('button', { name: 'Otwórz generator', exact: true }).click()
    await strona.getByRole('heading', { name: 'Programy szkoleń', exact: true }).waitFor()
    const [plik] = await Promise.all([
      strona.waitForEvent('download'),
      strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click(),
    ])
    assert.match(plik.suggestedFilename(), /\.pdf$/i)
    const pdf = await PDFDocument.load(await readFile(await plik.path()))
    assert.equal(pdf.getPageCount(), 1)
  } finally { await przegladarka.close() }
})

test('kompletny podgląd i jedno pobranie dokładnie tego pliku; zmiana źródła blokuje pobieranie', { timeout: 240000 }, async () => {
  const { przegladarka, strona, panel, bledy } = await uruchom()
  try {
    await panel.getByRole('button', { name: 'Zaznacz wszystkie', exact: true }).click()
    await panel.getByRole('button', { name: '👁 Podgląd pakietu PDF', exact: true }).click()
    await czekajNaPakiet(panel)
    const liczbaStron = await panel.locator('canvas').count()
    assert.ok(liczbaStron >= 8)
    const zdarzenia = []
    strona.on('download', (pobieranie) => zdarzenia.push(pobieranie))
    const oczekuj = strona.waitForEvent('download')
    await panel.getByRole('button', { name: '⬇ Pobierz zbiorczy PDF', exact: true }).click()
    const pobieranie = await oczekuj
    const bajty = await readFile(await pobieranie.path())
    const pdf = await PDFDocument.load(bajty)
    assert.equal(pdf.getPageCount(), liczbaStron)
    assert.match(pobieranie.suggestedFilename(), /^SEMPER_.*DO_ZATWIERDZENIA.pdf$/)
    await mkdir('tmp/pakiety-pdf', { recursive: true })
    await writeFile('tmp/pakiety-pdf/pakiet-pelny.pdf', bajty)
    for (const [indeks, nazwa] of [[0, 'strona-tytulowa'], [1, 'spis-dokumentow']]) {
      const obraz = await panel.locator('canvas').nth(indeks).evaluate((kanwa) => kanwa.toDataURL('image/png'))
      await writeFile('tmp/pakiety-pdf/' + nazwa + '.png', Buffer.from(obraz.split(',')[1], 'base64'))
    }
    await panel.getByRole('button', { name: 'Powiększ podgląd', exact: true }).click()
    await panel.locator('canvas').nth(liczbaStron - 1).waitFor({ timeout: 180000 })
    await czekajNaPakiet(panel)
    assert.equal(await panel.locator('canvas').count(), liczbaStron)
    await strona.evaluate(async () => {
      const { repozytoriumWspolnychDokumentow: rejestr } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const dokument = rejestr.pobierzWszystkie().find((pozycja) => pozycja.typ === 'PROGRAM_SZKOLENIA')
      rejestr.aktualizuj(dokument.id, { tytul: dokument.tytul + ' zmieniony' })
    })
    await panel.getByRole('button', { name: 'Odśwież dokumenty', exact: true }).click()
    assert.equal(await panel.getByRole('button', { name: '⬇ Pobierz zbiorczy PDF', exact: true }).isDisabled(), true)
    assert.match(await panel.innerText(), /Podgląd jest nieaktualny/)
    assert.equal(zdarzenia.length, 1)
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('rzeczywiste adaptery wszystkich generatorów zachowują każdą stronę, format i obraz po scaleniu', { timeout: 360000 }, async () => {
  const { przegladarka, strona, bledy } = await uruchom(2)
  try {
    const wynik = await strona.evaluate(async () => {
      const { pobierzAktualnaWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      const wersja = pobierzAktualnaWersjeRobocza()
      const model = await import('/src/wspolne/dokumenty/pakietyDoZatwierdzenia/modelPakietu.ts')
      const { renderujDokumentPakietu } = await import('/src/wspolne/dokumenty/pakietyDoZatwierdzenia/renderujDokumentPakietu.tsx')
      const { scalPakietPdf } = await import('/src/wspolne/dokumenty/pakietyDoZatwierdzenia/scalPakietPdf.ts')
      const { wczytajFontyPdf } = await import('/src/wspolne/dokumenty/rendererPdf.ts')
      const { repozytoriumWspolnychDokumentow: rejestr } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const karta = rejestr.pobierzWszystkie().find((dokument) => dokument.typ === 'KARTA_NA_DRZWI')
      const modelKarty = await import('/src/moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi.ts')
      const karty = structuredClone(karta.daneDokumentu.kartaNaDrzwi)
      karty.ustawieniaSzablonu = modelKarty.utworzUstawieniaBazowegoSzablonu('oryginalny', 'pionowa', 'a5')
      rejestr.aktualizuj(karta.id, { daneDokumentu: { kartaNaDrzwi: karty, tekst: modelKarty.serializujDaneKartyNaDrzwi(karty) } })
      const program = rejestr.pobierzWszystkie().find((dokument) => dokument.typ === 'PROGRAM_SZKOLENIA')
      const trescProgramu = 'Dzień 1\n' + Array.from({ length: 14 }, (_, indeks) => 'Moduł ' + (indeks + 1) + '. Zasady pracy\n' + Array.from({ length: 5 }, (_, punkt) => '- Punkt ' + (punkt + 1) + ' zasady, obowiązki oraz ćwiczenia praktyczne').join('\n')).join('\n')
      rejestr.aktualizuj(program.id, { daneDokumentu: { ...program.daneDokumentu, trescProgramu, ustawieniaWierszyProgramu: {} } })
      const przed = JSON.stringify(rejestr.pobierzWszystkie())
      const dokumenty = model.pobierzDokumentyPakietu(wersja)
      const konfiguracja = { ...model.utworzDomyslnaKonfiguracje(dokumenty), wybraneId: dokumenty.map((dokument) => dokument.id), stronaTytulowa: false, spisDokumentow: false, podzialNaGrupy: false }
      const sygnal = new AbortController().signal
      const eksporty = []
      for (const dokument of dokumenty) eksporty.push(await renderujDokumentPakietu(dokument, konfiguracja, sygnal))
      const pakiet = await scalPakietPdf(eksporty, konfiguracja, model.pobierzMetadanePakietu(wersja), {}, await wczytajFontyPdf(), sygnal)
      const biblioteka = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
      biblioteka.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
      const polaczony = biblioteka.getDocument({ data: new Uint8Array(pakiet.pdfBytes) })
      const wynikPdf = await polaczony.promise
      let numerStrony = 1
      const porownania = []
      const diagnostyka = []
      const obrazy = []
      const obrazStrony = async (strona) => {
        const widokBazowy = strona.getViewport({ scale: 1 })
        const widok = strona.getViewport({ scale: Math.round(widokBazowy.width * 0.8) / widokBazowy.width })
        const kanwa = document.createElement('canvas')
        kanwa.width = Math.round(widok.width); kanwa.height = Math.ceil(widok.height)
        await strona.render({ canvas: kanwa, viewport: widok }).promise
        return { obraz: kanwa.toDataURL('image/png'), szerokosc: widok.width, wysokosc: widok.height }
      }
      for (const eksport of eksporty) {
        const zadanie = biblioteka.getDocument({ data: new Uint8Array(eksport.pdfBytes) })
        const pdf = await zadanie.promise
        for (let numer = 1; numer <= pdf.numPages; numer++) {
          const zrodlo = await obrazStrony(await pdf.getPage(numer))
          const cel = await obrazStrony(await wynikPdf.getPage(numerStrony++))
          const zgodne = zrodlo.obraz === cel.obraz && zrodlo.szerokosc === cel.szerokosc && zrodlo.wysokosc === cel.wysokosc
          porownania.push(zgodne)
          if (!zgodne) { diagnostyka.push({ nazwa: eksport.nazwa, numer, szerokoscZrodla: zrodlo.szerokosc, wysokoscZrodla: zrodlo.wysokosc, szerokoscCelu: cel.szerokosc, wysokoscCelu: cel.wysokosc }); obrazy.push({ nazwa: eksport.dokumentId + '-' + numer + '-zrodlo', obraz: zrodlo.obraz }) }
          if (numer === 1 || numer === pdf.numPages) obrazy.push({ nazwa: eksport.dokumentId + '-' + numer, obraz: cel.obraz })
        }
        await zadanie.destroy()
      }
      await polaczony.destroy()
      return { porownania, diagnostyka, obrazy, wielostronicowy: eksporty.find((eksport) => eksport.dokumentId === program.id).liczbaStron, liczbaStron: pakiet.liczbaStron, typy: [...new Set(dokumenty.map((dokument) => dokument.typ))], bezZmian: przed === JSON.stringify(rejestr.pobierzWszystkie()) }
    })
    assert.deepEqual(new Set(wynik.typy), new Set(['PROGRAM_SZKOLENIA', 'LISTA_OBECNOSCI', 'ANKIETA', 'CERTYFIKAT', 'KARTA_NA_DRZWI', 'CHECKLISTA_PACZKI']))
    assert.equal(wynik.porownania.length, wynik.liczbaStron)
    assert.ok(wynik.porownania.every(Boolean), 'Każda strona po scaleniu musi wyglądać dokładnie jak źródłowy PDF: ' + JSON.stringify(wynik.diagnostyka))
    assert.equal(wynik.bezZmian, true)
    assert.ok(wynik.wielostronicowy > 1)
    await mkdir('tmp/pakiety-pdf/strony', { recursive: true })
    for (const obraz of wynik.obrazy) await writeFile('tmp/pakiety-pdf/strony/' + obraz.nazwa + '.png', Buffer.from(obraz.obraz.split(',')[1], 'base64'))
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})


test('certyfikat, zaświadczenie i dyplom: anonimowy wzorzec, pełna seria, druga strona i izolacja grup', { timeout: 240000 }, async () => {
  const { przegladarka, strona, bledy } = await uruchom(2)
  try {
    const wynik = await strona.evaluate(async () => {
      const { repozytoriumWspolnychDokumentow: rejestr } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const { renderujDokumentPakietu } = await import('/src/wspolne/dokumenty/pakietyDoZatwierdzenia/renderujDokumentPakietu.tsx')
      const { utworzDomyslnaKonfiguracje } = await import('/src/wspolne/dokumenty/pakietyDoZatwierdzenia/modelPakietu.ts')
      const konfiguracja = utworzDomyslnaKonfiguracje([])
      const certyfikaty = rejestr.pobierzWszystkie().filter((dokument) => dokument.typ === 'CERTYFIKAT')
      const sygnal = new AbortController().signal
      async function eksportuj(dokument, tryb) {
        const teksty = []
        const pomiar = window.setInterval(() => {
          document.querySelectorAll('iframe[title="Renderowanie eksportowe dokumentu"]').forEach((ramka) => teksty.push(ramka.contentDocument.body.innerText))
        }, 5)
        try {
          const wynik = await renderujDokumentPakietu(dokument, { ...konfiguracja, trybCertyfikatow: tryb }, sygnal)
          return { strony: wynik.liczbaStron, tekst: teksty.join(' ') }
        } finally { window.clearInterval(pomiar) }
      }
      const anonimowe = []
      for (const [trybTytulu, typ] of [['certyfikat', 'CERTYFIKAT'], ['zaswiadczenie', 'ZASWIADCZENIE'], ['dyplom', 'DYPLOM']]) {
        const dokument = { ...certyfikaty[0], typ, daneDokumentu: { ...certyfikaty[0].daneDokumentu, trybTytulu, drugaStronaAktywna: true, trescDrugiejStrony: 'Program szkolenia — ą ć ę ł ń ó ś ź ż' } }
        anonimowe.push(await eksportuj(dokument, 'wzor'))
      }
      const serie = []
      for (const dokument of certyfikaty) serie.push({ grupaId: dokument.powiazania.grupaId, wynik: await eksportuj({ ...dokument, daneDokumentu: { ...dokument.daneDokumentu, drugaStronaAktywna: true, trescDrugiejStrony: 'Program szkolenia — ą ć ę ł ń ó ś ź ż' } }, 'wszyscy') })
      return { anonimowe, serie }
    })
    for (const wzor of wynik.anonimowe) {
      assert.equal(wzor.strony, 2)
      assert.match(wzor.tekst, /WZÓR/)
      assert.ok(!/Anna Nowak|Piotr Lis|Ola Kowalska|Marek Wilk/.test(wzor.tekst))
    }
    assert.equal(wynik.serie.length, 2)
    for (const seria of wynik.serie) {
      assert.equal(seria.wynik.strony, 4)
      if (seria.grupaId === 'grupa-a') {
        assert.match(seria.wynik.tekst, /Anna Nowak/)
        assert.match(seria.wynik.tekst, /Piotr Lis/)
        assert.ok(!/Ola Kowalska|Marek Wilk/.test(seria.wynik.tekst))
      } else {
        assert.match(seria.wynik.tekst, /Ola Kowalska/)
        assert.match(seria.wynik.tekst, /Marek Wilk/)
        assert.ok(!/Anna Nowak|Piotr Lis/.test(seria.wynik.tekst))
      }
    }
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('anulowanie, brak dokumentu i błąd krytyczny nie tworzą częściowego pobrania', { timeout: 90000 }, async () => {
  const { przegladarka, strona, panel, bledy } = await uruchom()
  try {
    const pobrania = []
    strona.on('download', (plik) => pobrania.push(plik))
    await panel.getByRole('button', { name: '👁 Podgląd pakietu PDF', exact: true }).click()
    await panel.getByRole('button', { name: 'Anuluj', exact: true }).click()
    await panel.getByText(/Anulowano przygotowywanie pakietu/).waitFor()
    assert.equal(await panel.getByRole('button', { name: '⬇ Pobierz zbiorczy PDF', exact: true }).isDisabled(), true)
    await strona.evaluate(async () => {
      const { repozytoriumWspolnychDokumentow: rejestr } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const dokument = rejestr.pobierzWszystkie().find((dokument) => dokument.typ === 'PROGRAM_SZKOLENIA')
      rejestr.usunMiekko(dokument.id)
    })
    await panel.getByRole('button', { name: 'Odśwież dokumenty', exact: true }).click()
    await panel.getByRole('button', { name: '👁 Podgląd pakietu PDF', exact: true }).click()
    await panel.locator('.pakiet-pdf__blad').filter({ hasText: 'Brak dokumentu' }).waitFor()
    assert.equal(await panel.getByRole('button', { name: '⬇ Pobierz zbiorczy PDF', exact: true }).isDisabled(), true)
    assert.equal(pobrania.length, 0)
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})
