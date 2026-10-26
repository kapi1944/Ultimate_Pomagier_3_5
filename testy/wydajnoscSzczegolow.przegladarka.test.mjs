import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

test('płynna edycja szczegółów z wieloma grupami i zachowanie bieżących danych', { timeout: 240000 }, async () => {
  const przegladarka = await chromium.launch({ executablePath: process.env.POMAGIER_CHROME, channel: process.env.POMAGIER_CHROME ? undefined : 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    strona.on('console', (wpis) => { if (wpis.type() === 'error') bledy.push(wpis.text()) })
    await strona.addInitScript(() => {
      window.pomiary = { rendery: {}, czasy: {}, zadania: [], wpisywanie: [], interakcje: [], zapisy: 0 }
      new PerformanceObserver((lista) => window.pomiary.zadania.push(...lista.getEntries().map((wpis) => wpis.duration))).observe({ type: 'longtask' })
      new PerformanceObserver((lista) => window.pomiary.interakcje.push(...lista.getEntries().filter((wpis) => wpis.interactionId).map((wpis) => ({ czas: wpis.duration, opoznienie: wpis.processingStart - wpis.startTime, id: wpis.interactionId })))).observe({ type: 'event', durationThreshold: 16 })
      const zapisz = Storage.prototype.setItem
      Storage.prototype.setItem = function (klucz, wartosc) {
        if (klucz === 'ultimatePomagier.szczegolyOrganizacyjne.autosave') window.pomiary.zapisy++
        return zapisz.call(this, klucz, wartosc)
      }
      document.addEventListener('input', () => {
        const poczatek = performance.now()
        requestAnimationFrame(() => window.pomiary.wpisywanie.push(performance.now() - poczatek))
      }, true)
    })
    // Instrumentacja wyłącznie odpowiedzi serwera testowego, bez kodu pomiarowego w aplikacji.
    await strona.route('**/src/**/*.ts*', async (trasa) => {
      const odpowiedz = await trasa.fetch()
      let kod = await odpowiedz.text()
      for (const nazwa of ['KartaGrupySzkoleniowej', 'ZawartoscKartyGrupy', 'WidokNowychSzczegolowOrganizacyjnych']) {
        kod = kod.replace(new RegExp(`function ${nazwa}\\(([^]*?)\\) \\{`), (calosc) => `${calosc}\nwindow.pomiary.rendery['${nazwa}'] = (window.pomiary.rendery['${nazwa}'] || 0) + 1;`)
      }
      for (const nazwa of ['zbudujProblemyWalidacji', 'zbudujProblemyWalidacjiDanych', 'zbudujProblemyWalidacjiGrupy', 'znajdzLokalizacjeDlaMiejsca', 'pobierzLokalizacjeZMagazynu', 'wybierzPodpowiedziMiejscowosci']) {
        const wzorzec = new RegExp(`function ${nazwa}\\(`)
        if (wzorzec.test(kod)) {
          const prefiksEksportu = kod.includes(`export function ${nazwa}(`) ? 'export ' : ''
          kod = kod.replace(wzorzec, `function pomiar_${nazwa}(`)
          kod += `\n${prefiksEksportu}function ${nazwa}(...argumenty) { const poczatek = performance.now(); try { return pomiar_${nazwa}(...argumenty); } finally { (window.pomiary.czasy['${nazwa}'] ??= []).push(performance.now() - poczatek); } }`
        }
      }
      if (kod.includes('export function zbudujIndeksLokalizacjiSzczegolow(')) {
        kod = kod.replace('export function zbudujIndeksLokalizacjiSzczegolow(', 'function pomiar_zbudujIndeksLokalizacjiSzczegolow(')
        kod += `\nexport function zbudujIndeksLokalizacjiSzczegolow(...argumenty) {
          const indeks = pomiar_zbudujIndeksLokalizacjiSzczegolow(...argumenty);
          for (const nazwa of ['znajdz', 'podpowiedz']) {
            const wykonaj = indeks[nazwa];
            indeks[nazwa] = (...argumenty) => { const poczatek = performance.now(); try { return wykonaj(...argumenty); } finally { (window.pomiary.czasy['indeks.' + nazwa] ??= []).push(performance.now() - poczatek); } };
          }
          return indeks;
        }`
      }
      await trasa.fulfill({ response: odpowiedz, body: kod })
    })
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const wersjaPomiarowa = await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { wersjaEksportuSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      localStorage.setItem('ultimate-pomagier.kartoteki.trenerzy', JSON.stringify(Array.from({ length: 300 }, (_, indeks) => ({ id: `trener-${indeks}`, imie: 'Łukasz', nazwisko: `Żółkiewski ${indeks}`, email: `trener${indeks}@example.org`, telefon: '', status: 'Aktywny' }))))
      const wersja = { id: 'pomiar-szczegolow', wersja: wersjaEksportuSzczegolow, dane: { ...poczatkoweDaneFormularza, tytulSzkolenia: 'Szkolenie pomiarowe', opiekunId: 'Dawid' }, grupy: Array.from({ length: 6 }, (_, indeks) => ({ ...poczatkowaGrupa, id: `grupa-pomiar-${indeks}`, nazwa: `Grupa ${indeks + 1}`, miejsce: 'Warszawa' })), adresaci: poczatkowiAdresaci, statusyPol: { 'grupy.5.dataDo': 'niepewne' } }
      return wersja
    })
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    await strona.locator('input[aria-label="Miejsce"]').first().waitFor()
    await strona.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'pomiar.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wersjaPomiarowa)) })
    await strona.waitForFunction(() => document.querySelectorAll('input[aria-label="Miejsce"]').length === 6)
    const profilowanie = process.env.POMAGIER_PROFIL ? await strona.context().newCDPSession(strona) : null
    if (profilowanie) { await profilowanie.send('Profiler.enable'); await profilowanie.send('Profiler.start') }
    const wyniki = {}
    async function zmierz(nazwa, akcja) {
      await strona.evaluate(() => { window.pomiary = { rendery: {}, czasy: {}, zadania: [], wpisywanie: [], interakcje: [], zapisy: 0 } })
      const poczatek = performance.now()
      await akcja()
      await strona.waitForTimeout(100)
      wyniki[nazwa] = await strona.evaluate(() => structuredClone(window.pomiary))
      wyniki[nazwa].czasScenariusza = performance.now() - poczatek
    }
    await zmierz('dlugiTekst', () => strona.locator('input[id$="tytulSzkolenia"]').pressSequentially(' — długi tekst ćwiczenia szybkiej edycji', { delay: 10 }))
    await zmierz('lokalizacja', async () => {
      const pole = strona.locator('input[aria-label="Miejsce"]').first()
      await pole.fill('')
      await pole.pressSequentially('Łódź', { delay: 10 })
      assert.equal(await pole.inputValue(), 'Łódź')
    })
    await zmierz('trener', async () => {
      const pole = strona.locator('input[list^="trenerzy-"]').first()
      await pole.pressSequentially('Łukasz Żółkiewski 17', { delay: 10 })
      await pole.blur()
    })
    await zmierz('uczestnicy', async () => {
      const pole = strona.locator('input[id$="liczbaUczestnikow"]').first()
      await pole.fill('25')
      assert.equal(await pole.inputValue(), '25')
      assert.equal(await pole.getAttribute('aria-invalid'), 'false')
      assert.equal(await strona.locator('input[id$="liczbaUczestnikow"]').nth(1).getAttribute('aria-invalid'), 'true')
    })
    await zmierz('polaZalezne', async () => {
      const pole = strona.locator('select[id$="rodzajGodzin"]').first()
      await pole.selectOption('Niestandardowe')
      await strona.locator('input[id$="nazwaNiestandardowychGodzin"]').first().fill('Warsztatowe')
    })
    await zmierz('kontrolaJakosci', () => strona.getByRole('button', { name: 'Kontrola jakości', exact: true }).click())
    await strona.locator('input[aria-label="Miejsce"]').first().fill('Sala klienta')
    const autosave = await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.autosave')))
    assert.equal(autosave.grupy.length, 6)
    assert.equal(autosave.grupy[0].miejsce, 'Sala klienta')
    assert.equal(autosave.grupy[0].liczbaUczestnikow, 25)
    assert.equal(autosave.statusyPol['grupy.5.dataDo'], 'niepewne')
    await zmierz('zapisReczny', () => strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click())
    const stan = await strona.evaluate(async () => {
      const { pobierzAktualnaWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAktualnaWersjeRobocza()
    })
    assert.equal(stan.grupy.length, 6)
    assert.equal(stan.grupy[0].liczbaUczestnikow, 25)
    assert.equal(stan.grupy[0].miejsce, 'Sala klienta')
    assert.equal(stan.grupy[0].trenerzy[0].id, 'trener-17')
    assert.equal(stan.grupy[0].nazwaNiestandardowychGodzin, 'Warsztatowe')
    assert.equal(stan.statusyPol['grupy.5.dataDo'], 'niepewne')
    assert.ok(wyniki.zapisReczny.rendery.KartaGrupySzkoleniowej >= 6, 'Instrumentacja musi rejestrować rzeczywiste renderowanie kart')
    assert.ok((wyniki.dlugiTekst.rendery.ZawartoscKartyGrupy ?? wyniki.dlugiTekst.rendery.KartaGrupySzkoleniowej ?? 0) <= 12, 'Edycja tekstu nie powinna renderować wszystkich grup po każdym znaku')

    // Zmiana kartoteki w tym samym oknie nie wysyła zdarzenia storage.
    const zapisPrzedKontrola = await strona.evaluate(() => localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja'))
    const miejsce = strona.locator('input[aria-label="Miejsce"]').first()
    await miejsce.fill('Miejscowość testowa 431')
    await strona.evaluate(async () => {
      const { pobierzLokalizacjeZMagazynu, zapiszLokalizacjeWMagazynie } = await import('/src/kartoteki/lokalizacje/magazynLokalizacji.ts')
      zapiszLokalizacjeWMagazynie([...pobierzLokalizacjeZMagazynu(), {
        klucz_lokalizacji: 'test-431', nazwa: 'Miejscowość testowa 431', wojewodztwo: '', rodzaj: '', gmina: '', powiat: '',
        miejscownik_pelny_auto: 'Miejscowości testowej 431', status_odmiany: false,
      }])
    })
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    await strona.locator('.szczegoly-komunikat').filter({ hasText: 'Potwierdź odmianę lokalizacji przed zapisaniem formularza.' }).waitFor()
    assert.equal(await miejsce.getAttribute('aria-invalid'), 'true')
    assert.equal(await strona.evaluate(() => localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja')), zapisPrzedKontrola)
    await strona.evaluate(async () => {
      const { ustawPotwierdzonyMiejscownikLokalizacji } = await import('/src/kartoteki/lokalizacje/magazynLokalizacji.ts')
      ustawPotwierdzonyMiejscownikLokalizacji('test-431', 'Miejscowości testowej 431')
      window.dispatchEvent(new Event('focus'))
    })
    await strona.waitForFunction(() => document.querySelector('input[aria-label="Miejsce"]').getAttribute('aria-invalid') === 'false')
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja')).grupy[0].miejsce), 'Miejscowość testowa 431')

    const daty = strona.locator('input[id$="dataDo"]')
    await daty.nth(1).fill('2026-11-02')
    assert.equal(await daty.nth(1).getAttribute('aria-invalid'), 'false')
    assert.equal(await daty.nth(2).getAttribute('aria-invalid'), 'true')
    await daty.nth(1).fill('')
    assert.equal(await daty.nth(1).getAttribute('aria-invalid'), 'true')
    await strona.getByRole('button', { name: 'Duplikuj grupę', exact: true }).first().click()
    assert.equal(await strona.locator('input[aria-label="Miejsce"]').count(), 7)
    strona.once('dialog', (oknoDialogowe) => oknoDialogowe.accept())
    await strona.getByRole('button', { name: 'Usuń grupę', exact: true }).nth(1).click()
    assert.equal(await strona.locator('input[aria-label="Miejsce"]').count(), 6)
    assert.equal(await strona.locator('input[id$="liczbaUczestnikow"]').nth(1).getAttribute('aria-invalid'), 'true')
    const poUsunieciu = await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.autosave')))
    assert.deepEqual(poUsunieciu.grupy.map((grupa) => grupa.id), stan.grupy.map((grupa) => grupa.id))
    assert.equal(poUsunieciu.grupy[0].liczbaUczestnikow, 25)
    assert.deepEqual(bledy, [])
    if (profilowanie) writeFileSync(process.env.POMAGIER_PROFIL, JSON.stringify((await profilowanie.send('Profiler.stop')).profile))
    if (process.env.POMAGIER_POMIARY) writeFileSync(process.env.POMAGIER_POMIARY, JSON.stringify(wyniki, null, 2))
    console.log(JSON.stringify(Object.fromEntries(Object.entries(wyniki).map(([nazwa, pomiar]) => [nazwa, { reakcjaMax: Math.max(0, ...pomiar.wpisywanie), zadanieMax: Math.max(0, ...pomiar.zadania), rendery: pomiar.rendery, walidacjaMax: Math.max(0, ...(pomiar.czasy.zbudujProblemyWalidacji ?? [])), lokalizacjaMax: Math.max(0, ...(pomiar.czasy.znajdzLokalizacjeDlaMiejsca ?? [])), zapisy: pomiar.zapisy }])), null, 2))
  } finally {
    await przegladarka.close()
  }
})

test('walidacja po edycji kompletnej grupy cofa status i chroni eksport', { timeout: 60000 }, async () => {
  const przegladarka = await chromium.launch({ executablePath: process.env.POMAGIER_CHROME, channel: process.env.POMAGIER_CHROME ? undefined : 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const wersja = await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { wersjaEksportuSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return {
        id: 'kompletna-grupa-431', wersja: wersjaEksportuSzczegolow, adresaci: poczatkowiAdresaci, statusyPol: {},
        dane: { ...poczatkoweDaneFormularza, status: 'NIEPEŁNE', tytulSzkolenia: 'Regresja statusu', nazwaKlienta: 'Klient testowy', opiekunId: 'administrator-kacper-madej', czyNabywcaJestOdbiorca: true,
          nabywca: { ...poczatkoweDaneFormularza.nabywca, nazwa: 'Klient testowy', email: 'klient@example.org' } },
        grupy: [{ ...poczatkowaGrupa, id: 'stabilna-grupa-431', miejsce: 'Sala klienta', dataOd: '2026-11-02', dataDo: '2026-11-03', liczbaUczestnikow: 12, liczbaGodzin: 8, cenaNetto: 2000,
          trenerzy: [{ id: 'trener-431', imieNazwisko: 'Trener testowy', email: '', telefon: '' }] }],
      }
    })
    await strona.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'kompletne.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wersja)) })
    await strona.waitForFunction(() => document.querySelector('input[id$="tytulSzkolenia"]').value === 'Regresja statusu')
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja')).dane.status), 'PEŁNE')
    const uczestnicy = strona.locator('input[id$="liczbaUczestnikow"]').first()
    await uczestnicy.fill('0')
    assert.equal(await uczestnicy.getAttribute('aria-invalid'), 'true')
    await strona.waitForFunction(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.autosave'))?.dane.status === 'NIEPEŁNE')
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.autosave')).dane.status), 'NIEPEŁNE')
    await strona.getByRole('button', { name: 'Eksportuj JSON', exact: true }).click()
    await strona.locator('.szczegoly-komunikat').filter({ hasText: 'Eksport zablokowany:' }).waitFor()
    await uczestnicy.fill('15')
    assert.equal(await uczestnicy.getAttribute('aria-invalid'), 'false')
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    const pobieranie = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'Eksportuj JSON', exact: true }).click()
    const plik = await pobieranie
    const { readFile } = await import('node:fs/promises')
    const wyeksportowane = JSON.parse(await readFile(await plik.path(), 'utf8'))
    assert.equal(wyeksportowane.dane.status, 'PEŁNE')
    assert.equal(wyeksportowane.grupy[0].id, 'stabilna-grupa-431')
    assert.equal(wyeksportowane.grupy[0].liczbaUczestnikow, 15)
  } finally { await przegladarka.close() }
})
