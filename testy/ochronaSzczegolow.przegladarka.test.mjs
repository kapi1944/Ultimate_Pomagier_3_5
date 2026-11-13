import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'
const sciezkaNowychSzczegolow = '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe'
const sciezkaDokumentow = '/dokumenty/wszystkie'

async function otworzWszystkieDokumenty(strona) {
  await strona.locator('button[title="DOKUMENTY / Wszystkie dokumenty"]').click()
}

async function czekajNaNiezapisaneZmiany(strona) {
  await strona.waitForFunction(async () => {
    const { czyDokumentMaNiezapisaneZmiany } = await import('/src/moduly/dokumenty/wspolne/strzeznikNiezapisanegoDokumentu.ts')
    return czyDokumentMaNiezapisaneZmiany()
  })
}

function uruchomPrzegladarke() {
  const sciezkaChrome = process.env.POMAGIER_CHROME
  return chromium.launch({ executablePath: sciezkaChrome, channel: sciezkaChrome ? undefined : 'chrome', headless: true })
}

test('w Strict Mode dwa formularze zachowują ochronę, a zamknięcie Tauri czeka na oba zapisy', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres)
    await strona.evaluate(async () => {
      const { mockIPC, mockWindows } = await import('/node_modules/@tauri-apps/api/mocks.js')
      const { zamontujFormularze } = await import('/testy/formularzeStraznika.przegladarka.mjs')
      const zdarzenieZamkniecia = 'tauri://close-requested'
      const nasluchy = new Set()
      const operacje = []
      mockWindows('main')
      mockIPC((polecenie, dane) => {
        if (polecenie === 'plugin:event|listen' && dane.event === zdarzenieZamkniecia) {
          nasluchy.add(dane.handler)
          return dane.handler
        }
        if (polecenie === 'plugin:event|unlisten' && dane.event === zdarzenieZamkniecia) nasluchy.delete(dane.eventId)
        if (polecenie === 'plugin:window|destroy') operacje.push('zamknij')
      })
      window.isTauri = true
      const element = document.body.appendChild(document.createElement('aside'))
      const formularze = zamontujFormularze(element)
      let zakonczA
      let czyBladB = true
      function renderuj(daneA, daneB) {
        formularze.renderuj({
          ...(daneA !== null && { A: { dane: daneA, zapisz: (dane) => { operacje.push(dane); return new Promise((rozwiaz) => { zakonczA = () => { renderuj('', daneB); rozwiaz(true) } }) }, odrzuc: () => operacje.push('porzuć A') } }),
          ...(daneB !== null && { B: { dane: daneB, zapisz: (dane) => { operacje.push(dane); return !czyBladB }, odrzuc: () => operacje.push('porzuć B') } }),
        })
      }
      window.probaStraznika = {
        operacje, renderuj, odmontuj: formularze.odmontuj,
        zakonczA: () => zakonczA(),
        pozwolZapisacB: () => { czyBladB = false },
        liczbaNasluchow: () => nasluchy.size,
        wyslijZamkniecie: () => nasluchy.forEach((id) => window.__TAURI_INTERNALS__.runCallback(id, { event: zdarzenieZamkniecia, id })),
        czyBlokujeOdswiezenie: () => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })),
      }
      renderuj('Zmiana A', 'Zmiana B')
    })
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.waitForFunction(() => window.probaStraznika.liczbaNasluchow() === 1)
    await strona.getByText('Zmiana B', { exact: true }).waitFor()
    assert.equal(await strona.evaluate(() => window.probaStraznika.czyBlokujeOdswiezenie()), true)

    await strona.evaluate(() => window.probaStraznika.renderuj('Najnowsza zmiana A', null))
    await strona.getByText('Najnowsza zmiana A', { exact: true }).waitFor()
    assert.equal(await strona.evaluate(() => window.probaStraznika.czyBlokujeOdswiezenie()), true)
    await strona.evaluate(() => window.probaStraznika.wyslijZamkniecie())
    const dialog = strona.getByRole('dialog', { name: 'Masz niezapisane zmiany' })
    await dialog.getByRole('button', { name: 'ANULUJ', exact: true }).click()
    assert.deepEqual(await strona.evaluate(() => window.probaStraznika.operacje), [])
    assert.equal(await strona.getByText('Najnowsza zmiana A', { exact: true }).count(), 1)

    await strona.evaluate(() => window.probaStraznika.renderuj('Najnowsza zmiana A', 'Ponowna zmiana B'))
    await strona.getByText('Ponowna zmiana B', { exact: true }).waitFor()
    await strona.evaluate(() => window.probaStraznika.wyslijZamkniecie())
    const zapisz = dialog.getByRole('button', { name: 'ZAPISZ I PRZEJDŹ', exact: true })
    await zapisz.click()
    await strona.evaluate(() => {
      window.probaStraznika.wyslijZamkniecie()
      window.probaStraznika.wyslijZamkniecie()
      document.querySelector('button[title="DOKUMENTY / Wszystkie dokumenty"]').click()
    })
    await strona.keyboard.press('Escape')
    assert.equal(await dialog.isVisible(), true)
    assert.deepEqual(await strona.evaluate(() => window.probaStraznika.operacje), ['Najnowsza zmiana A'])
    await strona.evaluate(() => window.probaStraznika.zakonczA())
    await dialog.getByRole('alert').waitFor()
    assert.equal(await strona.getByText('Ponowna zmiana B', { exact: true }).count(), 1)
    assert.deepEqual(await strona.evaluate(() => window.probaStraznika.operacje), ['Najnowsza zmiana A', 'Ponowna zmiana B'])
    await strona.evaluate(() => window.probaStraznika.pozwolZapisacB())
    await zapisz.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(await strona.evaluate(() => window.probaStraznika.operacje), ['Najnowsza zmiana A', 'Ponowna zmiana B', 'Ponowna zmiana B', 'zamknij'])
    assert.equal(strona.url(), `${adres}/`)
    await strona.evaluate(() => window.probaStraznika.odmontuj())
    assert.equal(await strona.evaluate(() => window.probaStraznika.czyBlokujeOdswiezenie()), false)
  } finally {
    await przegladarka.close()
  }
})

test('nowy formularz izoluje historię, anuluje nawigację, zapisuje szkic i odrzuca tylko bieżące zmiany', { timeout: 90000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.evaluate(async () => {
      const [{ poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci }, { wersjaEksportuSzczegolow, zapiszWersjeRobocza }] = await Promise.all([
        import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'),
        import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts'),
      ])
      zapiszWersjeRobocza({
        id: 'szkolenie-historii-test',
        dokumentId: 'szkolenie-historii-test',
        wersja: wersjaEksportuSzczegolow,
        etykietaWersji: 'Wersja testowa',
        nazwa: '[Kopia robocza] Istniejące szkolenie',
        dataZapisu: new Date().toISOString(),
        autorId: 'autor-testowy',
        autorNazwa: 'Autor testowy',
        dane: { ...poczatkoweDaneFormularza, tytulSzkolenia: 'Istniejące szkolenie' },
        grupy: [poczatkowaGrupa],
        adresaci: poczatkowiAdresaci,
        statusyPol: {},
      })
    })

    await strona.goto(`${adres}${sciezkaNowychSzczegolow}`)
    const tytul = strona.locator('input[id$="tytulSzkolenia"]').first()
    await tytul.waitFor()
    assert.equal(await tytul.inputValue(), '')
    await strona.getByText('Brak historii — formularz nie został jeszcze zapisany', { exact: true }).waitFor()
    assert.equal(await strona.getByText('Istniejące szkolenie', { exact: true }).count(), 0)

    await tytul.fill('Nieukończone szkolenie testowe')
    await czekajNaNiezapisaneZmiany(strona)
    await strona.evaluate((sciezka) => {
      const stanBiezacy = window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
      window.history.replaceState({ widok: 'dokumenty_wszystkie' }, '', sciezka)
      window.history.pushState(stanBiezacy, '', '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe')
      window.history.back()
    }, sciezkaDokumentow)
    await strona.getByText('Wprowadzone zmiany nie zostały zapisane. Co chcesz zrobić?', { exact: true }).waitFor({ timeout: 5000 })
    assert.equal(strona.url().endsWith(sciezkaNowychSzczegolow), true)
    await strona.keyboard.press('Escape')
    assert.equal(await strona.getByRole('dialog').count(), 0)
    assert.equal(await tytul.inputValue(), 'Nieukończone szkolenie testowe')

    await otworzWszystkieDokumenty(strona)
    await strona.getByRole('button', { name: 'ANULUJ', exact: true }).click()
    assert.equal(await strona.evaluate(() => document.activeElement?.getAttribute('title')), 'DOKUMENTY / Wszystkie dokumenty')
    assert.equal(await tytul.inputValue(), 'Nieukończone szkolenie testowe')
    await otworzWszystkieDokumenty(strona)
    await strona.getByRole('button', { name: 'ZAPISZ I PRZEJDŹ', exact: true }).click()
    await strona.waitForURL(`**${sciezkaDokumentow}`)
    const kopiePoZapisie = await strona.evaluate(async () => {
      const { pobierzKopieRobocze } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzKopieRobocze().map((kopia) => kopia.dane.tytulSzkolenia)
    })
    assert.ok(kopiePoZapisie.includes('Nieukończone szkolenie testowe'))
    assert.ok(kopiePoZapisie.includes('Istniejące szkolenie'))

    await strona.goto(`${adres}${sciezkaNowychSzczegolow}`)
    const nowyTytul = strona.locator('input[id$="tytulSzkolenia"]').first()
    await nowyTytul.waitFor()
    assert.equal(await nowyTytul.inputValue(), '')
    await nowyTytul.fill('Zmiany do porzucenia')
    await czekajNaNiezapisaneZmiany(strona)
    await otworzWszystkieDokumenty(strona)
    await strona.getByRole('button', { name: 'PORZUĆ ZMIANY', exact: true }).click()
    await strona.waitForURL(`**${sciezkaDokumentow}`)
    const kopiePoPorzuceniu = await strona.evaluate(async () => {
      const { pobierzKopieRobocze } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzKopieRobocze().map((kopia) => kopia.dane.tytulSzkolenia)
    })
    assert.ok(kopiePoPorzuceniu.includes('Nieukończone szkolenie testowe'))
    assert.ok(kopiePoPorzuceniu.includes('Istniejące szkolenie'))
    assert.equal(kopiePoPorzuceniu.includes('Zmiany do porzucenia'), false)

    await strona.goto(`${adres}${sciezkaNowychSzczegolow}`)
    await strona.locator('input[id$="tytulSzkolenia"]').first().waitFor()
    await otworzWszystkieDokumenty(strona)
    await strona.waitForURL(`**${sciezkaDokumentow}`)
    assert.equal(await strona.getByRole('dialog', { name: 'Masz niezapisane zmiany' }).count(), 0)
  } finally {
    await przegladarka.close()
  }
})

test('edycja profilu korzysta ze wspólnego strażnika nawigacji', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.getByRole('button', { name: 'Profil', exact: true }).click()
    await strona.getByRole('button', { name: 'Edytuj profil', exact: true }).click()
    const pseudonim = strona.getByLabel('Pseudonim', { exact: true })
    await pseudonim.fill('Profil zapisany przez strażnika')
    await czekajNaNiezapisaneZmiany(strona)

    await otworzWszystkieDokumenty(strona)
    const dialog = strona.getByRole('dialog', { name: 'Masz niezapisane zmiany' })
    await dialog.waitFor()
    assert.equal(await dialog.getByRole('button', { name: 'ANULUJ', exact: true }).count(), 1)
    assert.equal(await dialog.getByRole('button', { name: 'ZAPISZ I PRZEJDŹ', exact: true }).count(), 1)
    assert.equal(await dialog.getByRole('button', { name: 'PORZUĆ ZMIANY', exact: true }).count(), 1)
    await dialog.getByRole('button', { name: 'ANULUJ', exact: true }).click()
    assert.equal(await pseudonim.inputValue(), 'Profil zapisany przez strażnika')

    await otworzWszystkieDokumenty(strona)
    await strona.getByRole('button', { name: 'ZAPISZ I PRZEJDŹ', exact: true }).click()
    await strona.waitForURL(`**${sciezkaDokumentow}`)

    await strona.getByRole('button', { name: 'Profil', exact: true }).click()
    await strona.getByRole('button', { name: 'Edytuj profil', exact: true }).click()
    const zapisanyPseudonim = strona.getByLabel('Pseudonim', { exact: true })
    assert.equal(await zapisanyPseudonim.inputValue(), 'Profil zapisany przez strażnika')
    await zapisanyPseudonim.fill('Profil do odrzucenia')
    await czekajNaNiezapisaneZmiany(strona)
    await otworzWszystkieDokumenty(strona)
    await strona.getByRole('button', { name: 'PORZUĆ ZMIANY', exact: true }).click()
    await strona.waitForURL(`**${sciezkaDokumentow}`)

    await strona.getByRole('button', { name: 'Profil', exact: true }).click()
    await strona.getByRole('button', { name: 'Edytuj profil', exact: true }).click()
    assert.equal(await strona.getByLabel('Pseudonim', { exact: true }).inputValue(), 'Profil zapisany przez strażnika')
  } finally {
    await przegladarka.close()
  }
})

test('dwie karty tworzą niezależne instancje szczegółów', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  const kontekst = await przegladarka.newContext()
  try {
    const pierwszaKarta = await kontekst.newPage()
    await pierwszaKarta.goto(adres)
    await pierwszaKarta.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await pierwszaKarta.goto(`${adres}${sciezkaNowychSzczegolow}`)
    const pierwszePole = pierwszaKarta.locator('input[id$="tytulSzkolenia"]').first()
    await pierwszePole.waitFor()

    const drugaKarta = await kontekst.newPage()
    await drugaKarta.goto(adres)
    const przyciskDemonstracji = drugaKarta.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true })
    if (await przyciskDemonstracji.count()) await przyciskDemonstracji.click()
    await drugaKarta.goto(`${adres}${sciezkaNowychSzczegolow}`)
    const drugiePole = drugaKarta.locator('input[id$="tytulSzkolenia"]').first()
    await drugiePole.waitFor()

    const idPierwszejInstancji = await pierwszaKarta.evaluate(() => sessionStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.instancjaFormularza'))
    const idDrugiejInstancji = await drugaKarta.evaluate(() => sessionStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.instancjaFormularza'))
    assert.ok(idPierwszejInstancji)
    assert.ok(idDrugiejInstancji)
    assert.notEqual(idPierwszejInstancji, idDrugiejInstancji)

    await pierwszePole.fill('Szkolenie z pierwszej karty')
    await czekajNaNiezapisaneZmiany(pierwszaKarta)
    assert.equal(await drugiePole.inputValue(), '')
    await drugiePole.fill('Szkolenie z drugiej karty')
    await czekajNaNiezapisaneZmiany(drugaKarta)
    assert.equal(await pierwszePole.inputValue(), 'Szkolenie z pierwszej karty')

    await otworzWszystkieDokumenty(pierwszaKarta)
    await pierwszaKarta.getByRole('button', { name: 'ZAPISZ I PRZEJDŹ', exact: true }).click()
    await pierwszaKarta.waitForURL(`**${sciezkaDokumentow}`)
    const wersjaPierwszejKarty = await pierwszaKarta.evaluate(async () => {
      const { pobierzAktualnaWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAktualnaWersjeRobocza()?.dane.tytulSzkolenia
    })
    const wersjaDrugiejKarty = await drugaKarta.evaluate(async () => {
      const { pobierzAktualnaWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAktualnaWersjeRobocza()?.dane.tytulSzkolenia
    })
    assert.equal(wersjaPierwszejKarty, 'Szkolenie z pierwszej karty')
    assert.equal(wersjaDrugiejKarty, undefined)
    assert.equal(await drugiePole.inputValue(), 'Szkolenie z drugiej karty')
    assert.equal(await drugaKarta.getByText('Szkolenie z pierwszej karty', { exact: true }).count(), 0)
  } finally {
    await przegladarka.close()
  }
})

test('błąd zapisu blokuje nawigację i zachowuje formularz do ponowienia', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}${sciezkaNowychSzczegolow}`)
    const tytul = strona.locator('input[id$="tytulSzkolenia"]').first()
    await tytul.waitFor()
    await tytul.fill('Szkic do ponowienia po błędzie')
    await czekajNaNiezapisaneZmiany(strona)
    await otworzWszystkieDokumenty(strona)
    await strona.evaluate(() => {
      const zapisz = Storage.prototype.setItem
      window.przywrocZapisStorage = zapisz
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz === 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja') throw new DOMException('Brak miejsca', 'QuotaExceededError')
        return zapisz.call(this, klucz, wartosc)
      }
    })

    await strona.getByRole('button', { name: 'ZAPISZ I PRZEJDŹ', exact: true }).click()
    await strona.getByText('Nie udało się zapisać wersji roboczej. Dane pozostały w formularzu; ponów zapis albo anuluj przejście.', { exact: true }).waitFor()
    assert.equal(strona.url().endsWith(sciezkaNowychSzczegolow), true)
    assert.equal(await tytul.inputValue(), 'Szkic do ponowienia po błędzie')

    await strona.evaluate(() => { Storage.prototype.setItem = window.przywrocZapisStorage; delete window.przywrocZapisStorage })
    await strona.getByRole('button', { name: 'ZAPISZ I PRZEJDŹ', exact: true }).click()
    await strona.waitForURL(`**${sciezkaDokumentow}`)
    const liczbaZapisanychKopii = await strona.evaluate(async () => {
      const { pobierzKopieRobocze } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzKopieRobocze().filter((kopia) => kopia.dane.tytulSzkolenia === 'Szkic do ponowienia po błędzie').length
    })
    assert.equal(liczbaZapisanychKopii, 1)
  } finally {
    await przegladarka.close()
  }
})
