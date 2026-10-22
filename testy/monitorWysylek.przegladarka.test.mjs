import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

test('monitor na Pulpicie: źródła, filtry, statusy, responsywność, ograniczenie ruchu i zapis nadania', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const kontekst = await przegladarka.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Warsaw' })
    const strona = await kontekst.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    // Dane trafiają wyłącznie do osobnego kontekstu przeglądarki testowej.
    await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { utworzNowyDokument } = await import('/src/wspolne/dokumenty/modelDokumentu.ts')
      const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const { utworzDomyslneDaneChecklisty } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts')
      const dane = { ...structuredClone(poczatkoweDaneFormularza), tytulSzkolenia: 'Szkolenie monitora', nazwaKlienta: 'Klient monitora', wysylkaPaczkiDotyczy: true, opiekunId: '' }
      const daty = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '', '2026-10-10']
      const grupy = daty.map((data, indeks) => ({ ...structuredClone(poczatkowaGrupa), id: 'grupa-' + indeks, nazwa: 'Grupa ' + indeks, miejsce: 'Poznań', dataOd: '2026-10-29', dataDo: '2026-10-30' }))
      repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'szczegoly-monitora', typ: 'SZCZEGOLY_ORGANIZACYJNE', generatorId: 'szczegoly_organizacyjne', tytul: dane.tytulSzkolenia, daneDokumentu: { id: 'wersja-monitora', dokumentId: 'szczegoly-monitora', wersja: '1', etykietaWersji: 'Test', nazwa: dane.tytulSzkolenia, dataZapisu: new Date().toISOString(), autorId: '', autorNazwa: '', dane, grupy, adresaci: poczatkowiAdresaci, statusyPol: {} }, ustawieniaDokumentu: {} }))
      for (const [indeks, data] of daty.entries()) {
        if (!data) continue
        const daneChecklisty = utworzDomyslneDaneChecklisty({ identyfikator: 'test-' + indeks, numerDzienny: indeks + 1 })
        Object.assign(daneChecklisty, { szczegolyOrganizacyjneId: 'szczegoly-monitora', grupaId: 'grupa-' + indeks, dataWyslania: data, daneSzkolenia: { tytulSzkolenia: dane.tytulSzkolenia, miejsce: 'Poznań', terminy: ['2026-10-29'], nazwaGrupy: 'Grupa ' + indeks, organizator: '', trenerzy: [], liczbaUczestnikow: 0 } })
        if (indeks === 7) daneChecklisty.paczki[0].statusOperacyjny = 'WYSŁANA'
        repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'checklista-monitora-' + indeks, typ: 'CHECKLISTA_PACZKI', generatorId: 'checklisty_paczek', tytul: 'Checklista monitora', daneDokumentu: daneChecklisty, ustawieniaDokumentu: {} }))
      }
      repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'online-monitora', typ: 'SZCZEGOLY_ORGANIZACYJNE', generatorId: 'szczegoly_organizacyjne', tytul: 'Online bez paczki', daneDokumentu: { dokumentId: 'online-monitora', dane: { ...dane, wysylkaPaczkiDotyczy: false, tytulSzkolenia: 'Online bez paczki' }, grupy: [{ ...grupy[0], formaSzkolenia: 'Online' }] }, ustawieniaDokumentu: {} }))
    })
    await strona.reload()
    const monitor = strona.getByRole('region', { name: 'Paczki do wysłania' })
    await monitor.waitFor()
    const rekordy = monitor.locator('article')
    assert.equal(await rekordy.count(), 8)
    assert.deepEqual(await rekordy.evaluateAll((elementy) => elementy.map((element) => element.dataset.pilnosc)), ['ZALEGLE', 'DZISIAJ', 'JUTRO', 'ZA_2_3_DNI', 'ZA_2_3_DNI', 'POZOSTALE', 'POZOSTALE', 'WYSŁANE'])
    assert.match(await rekordy.first().innerText(), /Klient monitora/)
    assert.match(await rekordy.first().innerText(), /29.10.2026 – 30.10.2026/)
    assert.equal(await monitor.getByText('Online bez paczki').count(), 0)
    const drugaKarta = await kontekst.newPage()
    await drugaKarta.goto(adres)
    await drugaKarta.evaluate(async () => {
      const { pobierzChecklistePaczki, zapiszChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      const dokument = pobierzChecklistePaczki('checklista-monitora-1')
      const dane = dokument.daneDokumentu
      zapiszChecklistePaczki(dokument.id, { ...dane,
        daneSzkolenia: { ...dane.daneSzkolenia, liczbaUczestnikow: 12 },
        daneOdbiorcy: { ...dane.daneOdbiorcy, nazwaFirmy: 'Klient', ulica: 'Polna', nrBudynku: '1', kodPocztowy: '00-001', miasto: 'Warszawa', kraj: 'Polska' },
        pozycje: [{ ...dane.pozycje[0], statusGotowosci: 'GOTOWE', iloscPrzygotowana: 11 }],
      }, null)
    })
    const kompletowana = rekordy.filter({ hasText: 'Grupa 1' })
    await kompletowana.getByText('W trakcie kompletowania', { exact: true }).waitFor()
    const postep = kompletowana.locator('dl > div').filter({ has: strona.getByText('Przygotowane pozycje', { exact: true }) }).locator('dd')
    assert.equal(await postep.innerText(), '0 / 1')
    await kompletowana.locator('summary').click()
    assert.match(await kompletowana.locator('details ul').innerText(), /Prezentacje/)
    await drugaKarta.evaluate(async () => {
      const { pobierzChecklistePaczki, zapiszChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      const dokument = pobierzChecklistePaczki('checklista-monitora-1')
      zapiszChecklistePaczki(dokument.id, { ...dokument.daneDokumentu,
        pozycje: dokument.daneDokumentu.pozycje.map((pozycja) => ({ ...pozycja, iloscPrzygotowana: 12 })),
      }, null)
    })
    await kompletowana.getByText('Gotowa do wysyłki', { exact: true }).waitFor()
    assert.equal(await postep.innerText(), '1 / 1')
    await drugaKarta.close()
    for (const [etykieta, liczba] of [['Zaległe (1)', 1], ['Dzisiaj (1)', 1], ['Najbliższe 3 dni (3)', 3], ['Wysłane (1)', 1]]) {
      await monitor.getByRole('button', { name: etykieta, exact: true }).click()
      assert.equal(await rekordy.count(), liczba)
      assert.equal(await monitor.getByRole('button', { name: etykieta, exact: true }).getAttribute('aria-pressed'), 'true')
    }
    assert.equal(await monitor.getByRole('button', { name: 'Oznacz jako wysłaną', exact: true }).count(), 0)
    await monitor.getByRole('button', { name: 'Wszystkie (8)', exact: true }).focus()
    await strona.keyboard.press('Enter')
    assert.equal(await rekordy.count(), 8)
    await rekordy.first().locator('summary').click()
    assert.deepEqual(await rekordy.first().locator('ol li').allTextContents(), ['Program', 'Lista obecności', 'Ankieta', 'Dyplomy', 'Karta na drzwi', 'Checklista'])
    const zalegla = monitor.locator('[data-pilnosc="ZALEGLE"]')
    assert.equal(await zalegla.evaluate((element) => getComputedStyle(element).animationName), 'pulsowanie-zaleglej-wysylki')
    await strona.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(await zalegla.evaluate((element) => getComputedStyle(element).animationName), 'none')
    if (process.env.POMAGIER_ZRZUT) {
      await monitor.scrollIntoViewIfNeeded()
      await strona.screenshot({ path: process.env.POMAGIER_ZRZUT + '-desktop.png' })
    }
    await strona.setViewportSize({ width: 390, height: 844 })
    assert.equal(await monitor.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true, 'Monitor mieści się na telefonie')
    if (process.env.POMAGIER_ZRZUT) {
      await monitor.scrollIntoViewIfNeeded()
      await strona.screenshot({ path: process.env.POMAGIER_ZRZUT + '-telefon.png' })
    }
    await monitor.getByRole('button', { name: 'Zaległe (1)', exact: true }).click()
    await zalegla.getByRole('button', { name: 'Oznacz jako wysłaną', exact: true }).click()
    const dialog = strona.getByRole('dialog', { name: 'Potwierdzenie wysyłki' })
    await strona.evaluate(() => {
      const zapisz = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz.startsWith('ultimatePomagier.rejestrDokumentow.')) throw new DOMException('Test braku miejsca', 'QuotaExceededError')
        return zapisz.call(this, klucz, wartosc)
      }
      window.przywrocZapisMonitora = () => { Storage.prototype.setItem = zapisz }
    })
    await dialog.getByRole('button', { name: 'Potwierdzam wysyłkę' }).click()
    assert.match(await dialog.getByRole('alert').innerText(), /Nie udało się zapisać/)
    await strona.evaluate(() => window.przywrocZapisMonitora())
    await dialog.getByRole('button', { name: 'Potwierdzam wysyłkę' }).click()
    await dialog.waitFor({ state: 'detached' })
    assert.equal(await monitor.getByRole('button', { name: 'Zaległe (0)', exact: true }).count(), 1)
    await monitor.getByRole('button', { name: 'Wysłane (2)', exact: true }).click()
    assert.equal(await rekordy.count(), 2)
    await rekordy.first().getByRole('button', { name: 'Otwórz checklistę' }).click()
    await strona.waitForURL(/\/dokumenty\/checklisty-paczek\/checklista-monitora-/)
    assert.match(new URL(strona.url()).hash, /#paczka-/)
    const liczbaPrzed = await strona.evaluate(async () => {
      const { pobierzChecklistyPaczek, zapiszChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      const { utworzNowaPaczkeChecklisty } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts')
      const dokument = pobierzChecklistyPaczek().find((obecna) => obecna.id === 'checklista-monitora-0')
      const druga = utworzNowaPaczkeChecklisty(dokument.daneDokumentu.paczki, 'Druga przesyłka testowa')
      zapiszChecklistePaczki(dokument.id, { ...dokument.daneDokumentu, paczki: [...dokument.daneDokumentu.paczki, druga] }, null)
      return pobierzChecklistyPaczek().length
    })
    await strona.goto(adres)
    await monitor.waitFor()
    assert.equal(await rekordy.count(), 9)
    const drugaPrzesylka = rekordy.filter({ hasText: 'Druga przesyłka testowa' })
    await drugaPrzesylka.getByRole('button', { name: 'Otwórz checklistę', exact: true }).click()
    await strona.waitForURL(/checklista-monitora-0#paczka-/)
    const wskazanaPaczka = strona.locator('[id="' + decodeURIComponent(new URL(strona.url()).hash.slice(1)) + '"]')
    assert.match(await wskazanaPaczka.innerText(), /Druga przesyłka testowa/)
    await strona.goto(adres)
    const brakChecklisty = rekordy.filter({ hasText: 'Grupa 6' })
    await brakChecklisty.getByRole('button', { name: 'Utwórz checklistę', exact: true }).click()
    await strona.waitForURL(/\/dokumenty\/checklisty-paczek\/[^/]+#paczka-/)
    const idNowej = new URL(strona.url()).pathname.split('/').at(-1)
    const noweDane = await strona.evaluate(async (id) => {
      const { pobierzChecklistyPaczek, pobierzChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      return { liczba: pobierzChecklistyPaczek().length, grupaId: pobierzChecklistePaczki(id).daneDokumentu.grupaId }
    }, idNowej)
    assert.equal(noweDane.liczba, liczbaPrzed + 1)
    assert.equal(noweDane.grupaId, 'grupa-6')
    await strona.goto(adres)
    await rekordy.filter({ hasText: 'Grupa 6' }).getByRole('button', { name: 'Otwórz checklistę', exact: true }).click()
    await strona.waitForURL(new RegExp(idNowej))
    assert.deepEqual(bledy, [], 'Pulpit, wiele paczek i utworzenie checklisty bez wyjątków')
  } finally { await przegladarka.close() }
})
