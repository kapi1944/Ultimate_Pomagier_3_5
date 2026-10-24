import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import test from 'node:test'

// Playwright może pochodzić z lokalnego środowiska testowego lub pakietu Codex.
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

test('checklisty: bezpośrednie wejście przy quota zachowuje formularz, shell i istniejący dokument', { timeout: 30000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const kontekst = await przegladarka.newContext()
    const strona = await kontekst.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.stack || blad.message))
    await strona.goto(`${adres}/dokumenty/checklisty-paczek`)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Istniejąca checklista przed quota')
    await strona.getByRole('button', { name: 'Zapisz jako roboczą', exact: true }).click()
    const adresIstniejacej = strona.url()
    // Odmowa zwykłego JSON odtwarza przyczynę awarii montowania; kompresja może się zmieścić.
    await strona.addInitScript(() => {
      const zapisz = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz === 'ultimatePomagier.rejestrDokumentow.v1' && JSON.parse(wartosc).wersja !== 4) throw new DOMException('Test quota przy otwarciu', 'QuotaExceededError')
        return zapisz.call(this, klucz, wartosc)
      }
    })
    await strona.goto(`${adres}/dokumenty/checklisty-paczek`)
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).waitFor({ timeout: 5000 }).catch((blad) => {
      throw new Error(`Generator nie otworzył się po quota: ${bledy.join('\n')}`, { cause: blad })
    })
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), '')
    assert.equal(await strona.getByRole('button', { name: 'Otwórz menu', exact: true }).isVisible(), true)
    assert.equal(await strona.locator('#wydruk-checklisty').isVisible(), true)
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.rejestrDokumentow.v1')).wersja), 4)
    await strona.reload()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).waitFor()
    await strona.goto(adresIstniejacej)
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).inputValue(), 'Istniejąca checklista przed quota')
    assert.deepEqual(bledy, [], 'Nieoczekiwany wyjątek przy montowaniu generatora')
  } finally { await przegladarka.close() }
})

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
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
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


test('1.2.3: kompletowanie 30 egzemplarzy, dwie paczki, ponowienie zapisu, Pulpit i niezmieniony wydruk', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } })
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const mail = await readFile(new URL('./fixtures/mailDyspozycjeMaterialowe.txt', import.meta.url), 'utf8')
    const identyfikatory = await strona.evaluate(async (tekstMaila) => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { parsujMailaSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts')
      const { zapiszWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      const { przygotujZrodloZWersjiRoboczej, zbudujKontekstZeSzczegolow } = await import('/src/wspolne/integracje/szczegolyDoDokumentow/zbudujKontekstZeSzczegolow.ts')
      const { utworzChecklistePaczkiZeZrodla, zapiszChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      const { duplikujPaczkeChecklisty } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts')
      const importMaila = parsujMailaSzczegolow(tekstMaila)
      const wersja = { id: 'szczegoly-kompletowania', dokumentId: 'szczegoly-kompletowania', wersja: 'test', etykietaWersji: 'Test', nazwa: 'Panel kompletowania', dataZapisu: new Date().toISOString(), autorId: '', autorNazwa: '',
        dane: { ...structuredClone(poczatkoweDaneFormularza), ...importMaila.daneFormularza, tytulSzkolenia: 'Szkolenie kompletowania', opiekunId: '', wysylkaPaczkiDotyczy: true },
        grupy: [{ ...structuredClone(poczatkowaGrupa), ...importMaila.pierwszaGrupa, id: 'grupa-kompletowania', nazwa: 'Grupa operacyjna' }], adresaci: { ...poczatkowiAdresaci }, statusyPol: {} }
      zapiszWersjeRobocza(wersja)
      const dokument = utworzChecklistePaczkiZeZrodla(zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja)), 'grupa-kompletowania', {
        opiekunId: '', odbiorca: { ...wersja.dane.odbiorcaPaczki, zrodloPropozycji: null },
      }, null)
      let dane = { ...dokument.daneDokumentu, pozycje: dokument.daneDokumentu.pozycje.filter((pozycja) => pozycja.importDyspozycji) }
      dane = duplikujPaczkeChecklisty(dane, dane.paczki[0].id)
      dane.paczki[1].nazwa = 'Druga przesyłka'
      dane.paczki[1].parametryLogistyczne.numerPrzesylki = 'ZACHOWAJ-123'
      zapiszChecklistePaczki(dokument.id, dane, null)
      return { dokumentId: dokument.id, pierwsza: dane.paczki[0].id, druga: dane.paczki[1].id }
    }, mail)
    const adresChecklisty = `${adres}/dokumenty/checklisty-paczek/${identyfikatory.dokumentId}`
    await strona.goto(adresChecklisty + '#paczka-' + identyfikatory.druga)
    const podglad = strona.locator('#wydruk-checklisty')
    const trescPrzed = await podglad.innerHTML()
    await strona.getByRole('button', { name: 'Kompletowanie paczki', exact: true }).click()
    const panel = strona.getByRole('region', { name: 'Panel kompletowania', exact: true })
    assert.equal(await panel.getByRole('region', { name: 'Kompletowanie: Druga przesyłka', exact: true }).count(), 1)
    assert.equal(await strona.getByLabel('Tytuł szkolenia', { exact: true }).count(), 0)
    assert.equal(await podglad.innerHTML(), trescPrzed, 'Zmiana trybu nie zmienia dokumentu')
    await panel.getByRole('button', { name: 'Paczka 1 · 0/1', exact: true }).click()
    assert.equal(new URL(strona.url()).hash, '#paczka-' + identyfikatory.pierwsza)
    const pozycja = panel.getByRole('article', { name: 'Materiały dodatkowe', exact: true })
    const ilosc = pozycja.getByRole('spinbutton')
    const potwierdzenie = pozycja.getByRole('button', { name: 'Potwierdź pełny komplet', exact: true })
    for (const wartosc of ['0', '12', '30']) {
      await ilosc.fill(wartosc)
      assert.equal(await potwierdzenie.isDisabled(), true)
      assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '0')
      assert.equal(await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).isDisabled(), true)
      if (wartosc !== '30') assert.match(await pozycja.innerText(), new RegExp(`Brakuje ${30 - Number(wartosc)} egz`))
    }
    await pozycja.getByRole('button', { name: 'Potwierdź ilość: 30', exact: true }).click()
    assert.equal(await potwierdzenie.isEnabled(), true)
    await potwierdzenie.click()
    assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '100')
    await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).click()
    assert.match(await panel.innerText(), /Status operacyjny: Gotowa/)
    assert.match(await panel.innerText(), /Materiały online/)
    assert.match(await panel.innerText(), /Drukuje klient/)
    assert.match(await panel.innerText(), /Certyfikaty po szkoleniu/)
    const materialy = panel.locator('details').filter({ has: strona.locator('summary').filter({ hasText: /^Materiały ·/ }) }).first()
    await materialy.locator('summary').first().press('Enter')
    assert.equal(await pozycja.isVisible(), false)
    await materialy.locator('summary').first().press('Enter')
    await panel.getByRole('button', { name: 'Druga przesyłka · 0/1', exact: true }).click()
    assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '0')
    assert.equal(await panel.getByRole('article', { name: 'Materiały dodatkowe', exact: true }).getByRole('spinbutton').inputValue(), '')
    await panel.getByRole('button', { name: 'Paczka 1 · 1/1', exact: true }).click()
    await pozycja.getByRole('button', { name: 'Zmniejsz ilość: Materiały dodatkowe', exact: true }).press('Enter')
    assert.equal(await ilosc.inputValue(), '29')
    assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '0')
    await pozycja.getByRole('button', { name: 'Zwiększ ilość: Materiały dodatkowe', exact: true }).click()
    assert.equal(await ilosc.inputValue(), '30')
    assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '0')
    await strona.evaluate(() => {
      const zapisz = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz.startsWith('ultimatePomagier.rejestrDokumentow.')) throw new DOMException('Test kompletowania quota', 'QuotaExceededError')
        return zapisz.call(this, klucz, wartosc)
      }
      window.przywrocZapisKompletowania = () => { Storage.prototype.setItem = zapisz }
    })
    await ilosc.fill('12')
    await strona.getByRole('button', { name: 'Ponów zapis', exact: true }).waitFor()
    assert.equal(await ilosc.inputValue(), '12')
    await strona.evaluate(() => window.przywrocZapisKompletowania())
    await strona.getByRole('button', { name: 'Ponów zapis', exact: true }).click()
    await strona.reload()
    await strona.getByRole('button', { name: 'Kompletowanie paczki', exact: true }).click()
    assert.equal(await ilosc.inputValue(), '12')
    await ilosc.fill('30')
    await potwierdzenie.click()
    await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).click()
    const stan = await strona.evaluate(async (id) => {
      const { pobierzChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      return pobierzChecklistePaczki(id).daneDokumentu
    }, identyfikatory.dokumentId)
    assert.equal(stan.statusChecklisty, 'KOPIA_ROBOCZA')
    assert.equal(stan.paczki[1].statusOperacyjny, 'ROBOCZA')
    assert.equal(stan.paczki[1].parametryLogistyczne.numerPrzesylki, 'ZACHOWAJ-123')
    assert.equal(stan.historia.at(-1).paczkaId, identyfikatory.pierwsza)
    const trescPo = await podglad.innerHTML()
    await strona.getByRole('button', { name: 'Edycja checklisty', exact: true }).click()
    assert.equal(await podglad.innerHTML(), trescPo)
    await strona.getByRole('button', { name: 'Kompletowanie paczki', exact: true }).click()
    assert.equal(await podglad.innerHTML(), trescPo)
    await mkdir('tmp', { recursive: true })
    await pozycja.scrollIntoViewIfNeeded()
    await strona.screenshot({ path: 'tmp/kompletowanie-paczki-desktop.png' })
    await strona.setViewportSize({ width: 390, height: 844 })
    assert.equal(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true)
    await pozycja.scrollIntoViewIfNeeded()
    await strona.screenshot({ path: 'tmp/kompletowanie-paczki-telefon.png' })
    await strona.setViewportSize({ width: 1440, height: 1000 })
    const pobieranie = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click()
    const pobrane = await pobieranie
    const bajty = await readFile(await pobrane.path())
    assert.equal(bajty.subarray(0, 4).toString(), '%PDF')
    assert.match(await podglad.innerText(), /30\s*\/ z 30/)
    assert.doesNotMatch(await podglad.innerText(), /Potwierdź pełny komplet|Przygotowane pozycje|Parametry logistyczne i historia paczki/)
    await strona.getByRole('button', { name: 'Edycja checklisty', exact: true }).click()
    const pobieranieZEdycji = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click()
    const bajtyZEdycji = await readFile(await (await pobieranieZEdycji).path())
    const obrazyPdf = await strona.evaluate(async (pliki) => {
      const { getDocument, GlobalWorkerOptions } = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
      GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs'
      const wyniki = []
      const piksele = []
      for (const bajtyPliku of pliki) {
        const zadanieOdczytu = getDocument({ data: new Uint8Array(bajtyPliku) })
        const dokument = await zadanieOdczytu.promise
        const strony = []
        const pikseleStron = []
        for (let numer = 1; numer <= dokument.numPages; numer++) {
          const stronaPdf = await dokument.getPage(numer)
          const widok = stronaPdf.getViewport({ scale: 0.6 })
          const obraz = document.createElement('canvas')
          obraz.width = Math.ceil(widok.width)
          obraz.height = Math.ceil(widok.height)
          await stronaPdf.render({ canvasContext: obraz.getContext('2d'), viewport: widok }).promise
          strony.push(obraz.toDataURL())
          pikseleStron.push(obraz.getContext('2d').getImageData(0, 0, obraz.width, obraz.height))
        }
        wyniki.push(strony)
        piksele.push(pikseleStron)
        await zadanieOdczytu.destroy()
      }
      const roznice = piksele[0].map((pierwszy, indeks) => {
        const drugi = piksele[1][indeks]
        let liczbaRoznic = 0
        for (let piksel = 0; piksel < pierwszy.data.length; piksel += 4) {
          if ([0, 1, 2].some((kanal) => Math.abs(pierwszy.data[piksel + kanal] - drugi.data[piksel + kanal]) > 10)) {
            liczbaRoznic++
          }
        }
        return { liczbaRoznic, liczbaPikseli: pierwszy.width * pierwszy.height }
      })
      return { wyniki, roznice, wymiary: piksele.map((strony) => strony.map((obraz) => [obraz.width, obraz.height])) }
    }, [Array.from(bajty), Array.from(bajtyZEdycji)])
    for (const [indeks, strony] of obrazyPdf.wyniki.entries()) for (const [numer, obraz] of strony.entries()) await writeFile(`tmp/kompletowanie-pdf-${indeks}-${numer}.png`, Buffer.from(obraz.split(',')[1], 'base64'))
    assert.deepEqual(obrazyPdf.wymiary[0], obrazyPdf.wymiary[1], 'Oba tryby zachowują liczbę i wymiary stron PDF')
    // Rasterowy eksport może różnić się antyaliasingiem pojedynczej krawędzi tabeli.
    assert.ok(obrazyPdf.roznice.every((roznica) => roznica.liczbaRoznic / roznica.liczbaPikseli < 0.001), 'Oba tryby zachowują wygląd PDF z tolerancją 0,1% pikseli')
    await strona.goto(adres)
    const wpisDrugiej = strona.getByRole('region', { name: 'Paczki do wysłania' }).locator('article').filter({ hasText: 'Druga przesyłka' })
    await wpisDrugiej.getByRole('button', { name: 'Otwórz checklistę', exact: true }).click()
    await strona.waitForURL(adresChecklisty + '#paczka-' + identyfikatory.druga)
    await strona.getByRole('button', { name: 'Kompletowanie paczki', exact: true }).click()
    assert.equal(await panel.getByRole('region', { name: 'Kompletowanie: Druga przesyłka', exact: true }).count(), 1)
    assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '0')
    await strona.evaluate(async (id) => {
      const { ustawStatusChecklisty } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      ustawStatusChecklisty(id, 'ZARCHIWIZOWANA', null, 'Archiwizacja testowa')
    }, identyfikatory.dokumentId)
    await strona.reload()
    await strona.getByRole('button', { name: 'Kompletowanie paczki', exact: true }).click()
    assert.equal(await panel.getByRole('spinbutton').isDisabled(), true)
    assert.equal(await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).isDisabled(), true)
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('checklisty: pisanie nie zapisuje rejestru co znak, podpowiedzi zachowują własne wartości', { timeout: 60000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres + '/dokumenty/checklisty-paczek')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const tytul = strona.getByLabel('Tytuł szkolenia', { exact: true })
    await tytul.waitFor()
    await strona.evaluate(() => {
      window.zapisyChecklisty = 0
      const zapisz = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz === 'ultimatePomagier.rejestrDokumentow.v1') window.zapisyChecklisty++
        return zapisz.call(this, klucz, wartosc)
      }
    })
    await tytul.pressSequentially('Szybkie wpisywanie formularza', { delay: 1 })
    assert.equal(await tytul.inputValue(), 'Szybkie wpisywanie formularza')
    assert.equal(await strona.evaluate(() => window.zapisyChecklisty), 0)
    await strona.waitForFunction(() => window.zapisyChecklisty === 1)
    // Po zapisie historia nie może uruchamiać kolejnych zapisów bez edycji.
    await strona.waitForTimeout(1000)
    assert.equal(await strona.evaluate(() => window.zapisyChecklisty), 1)
    assert.ok(await strona.locator('#checklista-miejscowosci option').count() > 0)
    assert.ok(await strona.locator('#checklista-trenerzy option').count() > 0)
    const trener = await strona.locator('#checklista-trenerzy option').first().getAttribute('value')
    const trenerzy = strona.getByLabel('Trenerzy (oddziel przecinkiem)', { exact: true })
    await trenerzy.fill('Własny Trener,')
    assert.equal(await strona.locator('#checklista-trenerzy option').first().getAttribute('value'), 'Własny Trener,' + trener)
    await trenerzy.fill('Własny Trener,' + trener)
    const miejsce = strona.getByLabel('Miejsce / tryb', { exact: true })
    await miejsce.fill('Własna miejscowość / online')
    await strona.getByLabel('Miasto', { exact: true }).fill('Dowolne miasto odbiorcy')
    await strona.getByRole('button', { name: 'Zapisz jako roboczą', exact: true }).click()
    await strona.reload()
    assert.equal(await miejsce.inputValue(), 'Własna miejscowość / online')
    assert.equal(await trenerzy.inputValue(), 'Własny Trener,' + trener)
    assert.equal(await strona.getByLabel('Miasto', { exact: true }).inputValue(), 'Dowolne miasto odbiorcy')
    assert.match(await strona.locator('#wydruk-checklisty').innerText(), /Własny Trener/)
  } finally { await przegladarka.close() }
})
