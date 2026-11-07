import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

function uruchomPrzegladarke() {
  const sciezkaChrome = process.env.POMAGIER_CHROME
  return chromium.launch({ executablePath: sciezkaChrome, channel: sciezkaChrome ? undefined : 'chrome', headless: true })
}

test('kontrolka liczbowa zachowuje kroki dziesiętne, granice i edycję z klawiatury', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(`${adres}/testy/kontrolkaLiczbowaSzczegolow.przegladarka.html`)
    const pole = strona.getByRole('spinbutton', { name: 'Dziesiętne', exact: true })
    const plus = strona.getByRole('button', { name: 'Zwiększ: Dziesiętne', exact: true })
    const minus = strona.getByRole('button', { name: 'Zmniejsz: Dziesiętne', exact: true })
    await plus.click()
    assert.equal(await pole.inputValue(), '0.3')
    assert.equal(await plus.isDisabled(), true)
    assert.equal(await plus.evaluate((element) => element === document.activeElement), true)
    await plus.press('Enter')
    assert.equal(await pole.inputValue(), '0.3')
    await minus.press('Space')
    assert.equal(await pole.inputValue(), '0.2')
    await pole.press('ArrowDown')
    assert.equal(await pole.inputValue(), '0.1')
    await pole.fill('-0.2')
    await pole.press('ArrowDown')
    assert.equal(await pole.inputValue(), '-0.3')
    assert.equal(await minus.isDisabled(), true)
    assert.equal(await pole.getAttribute('step'), '0.1')
    assert.equal(await pole.getAttribute('min'), '-0.3')
    assert.equal(await pole.getAttribute('max'), '0.3')

    await pole.fill('')
    assert.equal(await pole.inputValue(), '')
    assert.equal(await strona.locator('#dziesietne-model').textContent(), '-0.3')
    await pole.press('Tab')
    assert.equal(await plus.evaluate((element) => element === document.activeElement), true)
    await plus.press('Tab')
    assert.equal(await pole.inputValue(), '-0.3')
    await pole.fill('')
    await plus.click()
    assert.equal(await pole.inputValue(), '0.1')
    await pole.fill('0.4')
    assert.equal(await pole.getAttribute('aria-invalid'), 'true')
    await pole.blur()
    assert.equal(await pole.inputValue(), '0.1')

    const puste = strona.getByRole('spinbutton', { name: 'Od trzech', exact: true })
    assert.equal(await puste.inputValue(), '')
    assert.equal(await strona.getByRole('button', { name: 'Zmniejsz: Od trzech', exact: true }).isDisabled(), true)
    await strona.getByRole('button', { name: 'Zwiększ: Od trzech', exact: true }).click()
    assert.equal(await puste.inputValue(), '3')
    await puste.press('ArrowUp')
    assert.equal(await puste.inputValue(), '5')
    await puste.fill('-2')
    assert.equal(await strona.locator('#puste-model').textContent(), '5')
    await puste.blur()
    assert.equal(await puste.inputValue(), '5')
    assert.equal(await strona.getByRole('spinbutton', { name: 'Wyłączone', exact: true }).isDisabled(), true)
    assert.equal(await strona.getByRole('button', { name: 'Zwiększ: Wyłączone', exact: true }).isDisabled(), true)
    assert.equal(await strona.getByRole('button', { name: 'Zmniejsz: Wyłączone', exact: true }).isDisabled(), true)
  } finally { await przegladarka.close() }
})

test('pola liczbowe zachowują fokus checklisty, opisy ARIA i przewijanie kółkiem', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const pole = strona.getByRole('spinbutton', { name: 'Liczba uczestników', exact: true })
    await strona.getByRole('button', { name: 'Zwiń grupę', exact: true }).click()
    await strona.getByRole('button', { name: 'Kontrola jakości', exact: true }).click()
    await strona.getByRole('button', { name: /Grupy szkoleniowe.*Rozwiń listę błędów/ }).click()
    await strona.getByRole('button', { name: 'Grupa 1: wpisz liczbę uczestników minimum 1', exact: true }).click()
    await strona.waitForFunction(() => document.activeElement?.id.endsWith('liczbaUczestnikow'))
    assert.equal(await pole.getAttribute('aria-invalid'), 'true')
    const lista = strona.getByRole('textbox', { name: /^Uczestnicy/ })
    const opisy = [await pole.getAttribute('aria-describedby'), await lista.getAttribute('aria-describedby')]
    assert.ok(opisy.every(Boolean))
    assert.notEqual(opisy[0], opisy[1])
    for (const id of opisy) assert.equal(await strona.locator(`[id="${id}"]`).count(), 1)
    await pole.press('ArrowUp')
    assert.equal(await pole.inputValue(), '1')
    assert.equal(await pole.getAttribute('aria-invalid'), 'false')
    await pole.hover()
    const obszar = strona.locator('.uklad-aplikacji__obszar-roboczy')
    const przewiniecie = await obszar.evaluate((element) => element.scrollTop)
    await strona.mouse.wheel(0, 240)
    await strona.waitForFunction((wartosc) => document.querySelector('.uklad-aplikacji__obszar-roboczy').scrollTop > wartosc, przewiniecie)
    assert.equal(await pole.inputValue(), '1')
    assert.equal(await pole.evaluate((element) => element === document.activeElement), true)
  } finally { await przegladarka.close() }
})

test('kroki w dwóch grupach zachowują ID, statusy importu i zapis kopii', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const wersja = await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { wersjaEksportuSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return {
        id: 'test-kroki-grup', wersja: wersjaEksportuSzczegolow,
        dane: { ...poczatkoweDaneFormularza, tytulSzkolenia: 'Test pól liczbowych' },
        grupy: [
          { ...poczatkowaGrupa, id: 'test-grupa-a', liczbaUczestnikow: 4, liczbaGodzin: 7.5, terminPlatnosci: 14 },
          { ...poczatkowaGrupa, id: 'test-grupa-b', liczbaUczestnikow: 8, liczbaGodzin: 5, terminPlatnosci: 30 },
        ],
        adresaci: poczatkowiAdresaci,
        statusyPol: { 'grupy.0.liczbaUczestnikow': 'zaimportowane', 'grupy.1.liczbaUczestnikow': 'niepewne', 'grupy.0.liczbaGodzin': 'zaimportowane', 'grupy.1.terminPlatnosci': 'zaimportowane' },
      }
    })
    await strona.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'grupy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wersja)) })
    const uczestnicy = strona.getByRole('spinbutton', { name: 'Liczba uczestników', exact: true })
    await uczestnicy.nth(1).waitFor()
    assert.equal(await uczestnicy.nth(0).inputValue(), '4')
    assert.equal(await uczestnicy.nth(1).inputValue(), '8')
    const godziny = strona.getByRole('spinbutton', { name: 'Liczba godzin', exact: true })
    const opisy = [await godziny.nth(0).getAttribute('aria-describedby'), await godziny.nth(2).getAttribute('aria-describedby')]
    assert.ok(opisy.every(Boolean))
    assert.notEqual(opisy[0], opisy[1])
    for (const id of opisy) assert.equal(await strona.locator(`[id="${id}"]`).count(), 1)
    await godziny.first().press('ArrowUp')
    assert.equal(await godziny.nth(2).inputValue(), '8.5')

    await uczestnicy.first().fill('')
    await uczestnicy.first().blur()
    assert.equal(await uczestnicy.first().inputValue(), '4')
    const pierwszyLicznik = uczestnicy.first().locator('..')
    await pierwszyLicznik.getByRole('button', { name: 'Zwiększ: Liczba uczestników' }).click()
    assert.equal(await uczestnicy.nth(1).inputValue(), '8')
    assert.equal(await strona.getByRole('button', { name: 'Zatwierdź: grupy.1.liczbaUczestnikow', exact: true }).count(), 1)
    await uczestnicy.nth(1).press('ArrowDown')
    await strona.getByRole('button', { name: 'Dodaj grupę', exact: true }).click()
    await strona.getByRole('button', { name: 'Duplikuj grupę', exact: true }).first().click()

    const pobierzStan = () => strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja')))
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    const zapisana = await pobierzStan()
    assert.deepEqual(zapisana.grupy.map((grupa) => grupa.liczbaUczestnikow), [5, 5, 7, 0])
    assert.equal(new Set(zapisana.grupy.map((grupa) => grupa.id)).size, 4)
    assert.deepEqual([zapisana.grupy[0], zapisana.grupy[2]].map(({ id, liczbaGodzin, terminPlatnosci }) => [id, liczbaGodzin, terminPlatnosci]), [['test-grupa-a', 8.5, 14], ['test-grupa-b', 5, 30]])
    assert.equal(zapisana.statusyPol['grupy.0.liczbaUczestnikow'], 'reczne')
    assert.equal(zapisana.statusyPol['grupy.1.liczbaUczestnikow'], undefined)
    assert.equal(zapisana.statusyPol['grupy.2.liczbaUczestnikow'], 'reczne')
    assert.equal(zapisana.statusyPol['grupy.1.terminPlatnosci'], undefined)
    assert.equal(zapisana.statusyPol['grupy.2.terminPlatnosci'], 'zaimportowane')
    assert.equal(zapisana.statusyPol['grupy.3.terminPlatnosci'], undefined)
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze`)
    await strona.getByRole('button', { name: 'Edytuj', exact: true }).first().click()
    await uczestnicy.nth(3).waitFor()
    assert.deepEqual(await uczestnicy.evaluateAll((pola) => pola.map((pole) => pole.value)), ['5', '5', '7', '0'])
    assert.equal(await uczestnicy.nth(3).getAttribute('aria-invalid'), 'true')
    assert.deepEqual((await pobierzStan()).statusyPol, zapisana.statusyPol)
  } finally { await przegladarka.close() }
})

test('kontrolki liczbowe mieszczą się w dużym i wąskim oknie przy trzech skalach', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    await strona.addInitScript(() => localStorage.setItem('ultimatePomagier.panelJakosciWysuwanieZKrawedzi', 'false'))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    await strona.getByRole('combobox', { name: 'Rodzaj godzin', exact: true }).first().selectOption('Niestandardowe')
    const kontrolki = strona.locator('.szczegoly-kontrolka-liczbowa')
    assert.equal(await kontrolki.count(), 6)
    const minuty = strona.getByRole('spinbutton', { name: 'Ile minut:', exact: true })
    const wartoscMinut = Number(await minuty.inputValue())
    await strona.getByRole('button', { name: 'Zwiększ: Minuty wcześniejszego przyjazdu', exact: true }).click()
    assert.equal(await minuty.inputValue(), String(wartoscMinut + 1))
    mkdirSync('tmp/ux-1a', { recursive: true })

    for (const szerokosc of [1440, 390]) {
      await strona.setViewportSize({ width: szerokosc, height: 1000 })
      for (const skala of [75, 85, 100]) {
        await strona.evaluate(async (wartosc) => {
          const { zastosujSkaleInterfejsu } = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')
          await zastosujSkaleInterfejsu(wartosc)
        }, skala)
        const zamknijPanel = strona.getByRole('button', { name: 'Schowaj panel', exact: true })
        if (await zamknijPanel.isVisible()) await zamknijPanel.click()
        const geometria = await kontrolki.evaluateAll((elementy) => elementy.map((kontrolka) => {
          const [minus, pole, plus] = Array.from(kontrolka.children).map((element) => element.getBoundingClientRect())
          return {
            przepelnienie: kontrolka.scrollWidth - kontrolka.clientWidth,
            wKontenerze: kontrolka.getBoundingClientRect().right <= kontrolka.parentElement.getBoundingClientRect().right + 1,
            kolejnosc: minus.right <= pole.left && pole.right <= plus.left,
            cel: Math.min(minus.width, minus.height, plus.width, plus.height),
            roznicaBokow: Math.max(Math.abs(minus.width - minus.height), Math.abs(plus.width - plus.height)),
            pole: pole.width,
          }
        }))
        for (const pomiar of geometria) {
          const opis = `${szerokosc}px, ${skala}%: ${JSON.stringify(pomiar)}`
          assert.equal(pomiar.przepelnienie, 0, opis)
          assert.ok(pomiar.wKontenerze && pomiar.kolejnosc && pomiar.cel >= 32 && pomiar.roznicaBokow < 1 && pomiar.pole >= 32, opis)
        }
        const liczbaGodzin = strona.getByRole('spinbutton', { name: 'Liczba godzin', exact: true }).first()
        await liczbaGodzin.evaluate((element) => element.scrollIntoView({ block: 'center' }))
        await liczbaGodzin.press('Tab')
        const fokus = await strona.getByRole('button', { name: 'Zwiększ: Liczba godzin', exact: true }).first().evaluate((element) => ({
          jestAktywny: element === document.activeElement,
          obrys: getComputedStyle(element).outlineStyle,
        }))
        assert.deepEqual(fokus, { jestAktywny: true, obrys: 'solid' })
        assert.equal(await zamknijPanel.isVisible(), false)
        await strona.screenshot({ path: `tmp/ux-1a/pola-${szerokosc}-${skala}.png` })
      }
    }
  } finally { await przegladarka.close() }
})

test('segmenty udostępniają fokus, opisy i wybór z klawiatury, a przełącznik aktywuje się raz na klawisz', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(`${adres}/testy/poleSegmentoweSzczegolow.przegladarka.html`)
    const wybor = strona.getByRole('group', { name: 'Wybór', exact: true })
    const pierwsza = wybor.getByRole('button', { name: 'Pierwsza' })
    const druga = wybor.getByRole('button', { name: 'Druga' })
    const trzecia = wybor.getByRole('button', { name: 'Trzecia' })
    const czyMaFokus = (kontrolka) => kontrolka.evaluate((element) => element === document.activeElement)

    await pierwsza.waitFor()
    assert.equal(await wybor.getByRole('button', { pressed: true }).count(), 0)
    assert.equal(await pierwsza.getAttribute('id'), 'szczegoly-pole-wybor')
    assert.equal(await pierwsza.getAttribute('aria-invalid'), 'true')
    assert.equal(await strona.locator('#szczegoly-blad-wybor').textContent(), 'Wybierz opcję.')
    assert.equal(await pierwsza.getAttribute('aria-describedby'), 'szczegoly-blad-wybor')

    await strona.getByRole('button', { name: 'Początek' }).press('Tab')
    assert.equal(await czyMaFokus(pierwsza), true)
    assert.equal(await pierwsza.evaluate((element) => getComputedStyle(element).outlineStyle), 'solid')
    await strona.keyboard.press('Tab')
    assert.equal(await czyMaFokus(druga), true)
    await strona.keyboard.press('Enter')
    assert.equal(await druga.getAttribute('aria-pressed'), 'true')
    assert.equal(await druga.getAttribute('id'), 'szczegoly-pole-wybor')
    assert.equal(await druga.getAttribute('aria-invalid'), 'false')
    assert.equal(await strona.locator('#szczegoly-blad-wybor').textContent(), 'Sprawdź tę wartość przed wprowadzeniem szkolenia.')
    await strona.keyboard.press('Shift+Tab')
    assert.equal(await czyMaFokus(pierwsza), true)
    await strona.keyboard.press('Space')
    assert.equal(await pierwsza.getAttribute('aria-pressed'), 'true')
    await trzecia.press('Space')
    assert.equal(await strona.locator('#wybor-model').textContent(), 'Trzecia')

    const wylaczone = await strona.getByRole('group', { name: 'Wyłączony wybór' }).getByRole('button').all()
    assert.equal(wylaczone.length, 3)
    for (const opcja of wylaczone) assert.equal(await opcja.isDisabled(), true)
    await wylaczone[0].evaluate((element) => element.click())
    assert.equal(await strona.locator('#wybor-model').textContent(), 'Trzecia')

    const przelacznik = strona.getByRole('switch', { name: 'Przełącznik' })
    await strona.keyboard.press('Tab')
    assert.equal(await czyMaFokus(przelacznik), true)
    await strona.keyboard.press('Enter')
    assert.equal(await przelacznik.getAttribute('aria-checked'), 'true')
    assert.equal(await strona.locator('#aktywacje').textContent(), '1')
    await strona.keyboard.press('Space')
    assert.equal(await przelacznik.getAttribute('aria-checked'), 'false')
    assert.equal(await strona.locator('#aktywacje').textContent(), '2')
    assert.equal(await strona.locator('#wyslania').textContent(), '0')
  } finally { await przegladarka.close() }
})

test('segmenty grup zachowują rozliczenia, statusy importu i wartości zapisane w kopii', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const wersja = await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { wersjaEksportuSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return {
        id: 'test-segmenty-grup', wersja: wersjaEksportuSzczegolow,
        dane: { ...poczatkoweDaneFormularza, tytulSzkolenia: 'Test segmentów grup' },
        grupy: [
          { ...poczatkowaGrupa, id: 'segmenty-a', formaSzkolenia: 'Stacjonarne', miejsce: 'Sala klienta', ktoZapewniaSale: 'Klient', liczbaUczestnikow: 3, cenaNetto: 5000.01, trybCeny: 'za grupę', vat: 'Nie – 23%' },
          { ...poczatkowaGrupa, id: 'segmenty-b', formaSzkolenia: 'Online', miejsce: 'Online', trybCeny: 'za osobę', vat: 'Min. 70%' },
          { ...poczatkowaGrupa, id: 'segmenty-c', formaSzkolenia: 'Stacjonarne', trybCeny: 'za grupę', vat: 'ZW – 100%' },
        ],
        adresaci: poczatkowiAdresaci,
        statusyPol: { 'grupy.0.vat': 'zaimportowane', 'grupy.1.vat': 'niepewne', 'grupy.2.vat': 'zaimportowane' },
      }
    })
    await strona.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'grupy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wersja)) })
    const grupy = strona.locator('.szczegoly-karta-grupy')
    await grupy.nth(2).waitFor()
    const pierwsza = grupy.first()
    const forma = pierwsza.getByRole('group', { name: 'Forma szkolenia', exact: true })
    const tryb = pierwsza.getByRole('group', { name: 'Sposób naliczania ceny', exact: true })
    const vat = pierwsza.getByRole('group', { name: 'Oświadczenie VAT', exact: true })
    const miejsce = pierwsza.getByRole('combobox', { name: 'Miejsce', exact: true })
    const mpp = pierwsza.getByRole('switch', { name: 'Mechanizm podzielonej płatności (MPP)', exact: true })
    const zaznaczone = (grupa) => grupa.getByRole('button', { pressed: true }).textContent()

    assert.equal(await zaznaczone(forma), 'Stacjonarne')
    assert.equal(await miejsce.inputValue(), 'Sala klienta')
    assert.equal(await pierwsza.getByRole('textbox', { name: 'Kto zapewnia salę' }).inputValue(), 'Klient')
    await forma.getByRole('button', { name: 'Online' }).click()
    assert.equal(await miejsce.inputValue(), 'Online')
    assert.equal(await miejsce.isDisabled(), true)
    assert.equal(await pierwsza.getByRole('textbox', { name: 'Kto zapewnia łącze' }).inputValue(), 'Klient')
    await forma.getByRole('button', { name: 'Stacjonarne' }).click()
    assert.equal(await miejsce.inputValue(), '')
    assert.equal(await miejsce.isEnabled(), true)
    assert.equal(await pierwsza.getByRole('textbox', { name: 'Kto zapewnia salę' }).inputValue(), 'Klient')

    assert.equal(await zaznaczone(tryb), 'za grupę')
    assert.equal(await mpp.isDisabled(), true)
    assert.equal(await mpp.getAttribute('aria-checked'), 'false')
    const suma = pierwsza.getByRole('textbox', { name: /^Cena za grupę/ })
    await tryb.getByRole('button', { name: 'za osobę' }).click()
    assert.equal((await suma.inputValue()).replace(/\s/g, ''), '15000,03')
    assert.equal(await mpp.getAttribute('aria-checked'), 'true')
    await suma.fill('15000,01')
    await suma.blur()
    assert.equal((await suma.inputValue()).replace(/\s/g, ''), '15000,01')
    await tryb.getByRole('button', { name: 'za grupę' }).click()
    assert.equal(await suma.count(), 0)
    assert.equal(await mpp.getAttribute('aria-checked'), 'false')
    await tryb.getByRole('button', { name: 'za osobę' }).click()
    assert.equal((await suma.inputValue()).replace(/\s/g, ''), '15000,01')

    assert.equal(await zaznaczone(vat), 'Nie – 23%')
    const opisy = await grupy.getByRole('group', { name: 'Oświadczenie VAT' }).getByRole('button', { pressed: true }).evaluateAll((przyciski) => przyciski.map((przycisk) => przycisk.getAttribute('aria-describedby')))
    assert.ok(opisy.every(Boolean))
    assert.equal(new Set(opisy).size, 3)
    for (const id of opisy) assert.equal(await strona.locator(`[id="${id}"]`).count(), 1)
    for (const opcja of ['Min. 70%', 'ZW – 100%', 'Min. 70%', 'Nie – 23%']) {
      await vat.getByRole('button', { name: opcja, exact: true }).click()
      assert.equal(await zaznaczone(vat), opcja)
      assert.equal(await vat.getByRole('button', { pressed: true }).count(), 1)
    }
    assert.equal(await grupy.nth(1).getByRole('button', { name: 'Zatwierdź: grupy.1.vat', exact: true }).count(), 1)

    const pobierzMigawke = (klucz) => strona.evaluate((klucz) => JSON.parse(localStorage.getItem(`ultimatePomagier.szczegolyOrganizacyjne.${klucz}`)), klucz)
    await strona.waitForFunction(() => JSON.parse(localStorage.getItem('ultimatePomagier.szczegolyOrganizacyjne.autosave'))?.grupy[0].cenaNetto === 15000.01 / 3)
    const autosave = await pobierzMigawke('autosave')
    assert.deepEqual(autosave.grupy.map(({ id, formaSzkolenia, trybCeny, vat }) => [id, formaSzkolenia, trybCeny, vat]), [
      ['segmenty-a', 'Stacjonarne', 'za osobę', 'Nie – 23%'],
      ['segmenty-b', 'Online', 'za osobę', 'Min. 70%'],
      ['segmenty-c', 'Stacjonarne', 'za grupę', 'ZW – 100%'],
    ])
    assert.equal(autosave.grupy[0].mechanizmPodzielonejPlatnosci, true)
    assert.deepEqual(autosave.statusyPol, {
      ...wersja.statusyPol, 'grupy.0.vat': 'reczne', 'grupy.0.formaSzkolenia': 'reczne', 'grupy.0.trybCeny': 'reczne', 'grupy.0.cenaNetto': 'reczne',
    })

    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze`)
    await strona.getByRole('button', { name: 'Edytuj', exact: true }).first().click()
    await grupy.nth(2).waitFor()
    const zapisana = await pobierzMigawke('aktualnaWersja')
    assert.deepEqual(zapisana.grupy, autosave.grupy)
    assert.deepEqual(zapisana.statusyPol, autosave.statusyPol)
    for (const [indeks, grupa] of zapisana.grupy.entries()) {
      for (const [nazwa, wartosc] of [['Forma szkolenia', grupa.formaSzkolenia], ['Sposób naliczania ceny', grupa.trybCeny], ['Oświadczenie VAT', grupa.vat]]) {
        assert.equal(await zaznaczone(grupy.nth(indeks).getByRole('group', { name: nazwa, exact: true })), wartosc)
      }
    }
  } finally { await przegladarka.close() }
})

test('segmenty grup mieszczą się przy 1440 i 390 px oraz trzech skalach', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage()
    await strona.addInitScript(() => localStorage.setItem('ultimatePomagier.panelJakosciWysuwanieZKrawedzi', 'false'))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const segmenty = strona.locator('.szczegoly-pole-segmentowe')
    await segmenty.first().waitFor()
    assert.equal(await segmenty.count(), 3)
    mkdirSync('tmp/ux-1b', { recursive: true })
    for (const szerokosc of [1440, 390]) {
      await strona.setViewportSize({ width: szerokosc, height: 1000 })
      for (const skala of [75, 85, 100]) {
        await strona.evaluate(async (wartosc) => {
          const { zastosujSkaleInterfejsu } = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')
          await zastosujSkaleInterfejsu(wartosc)
        }, skala)
        const zamknijPanel = strona.getByRole('button', { name: 'Schowaj panel', exact: true })
        if (await zamknijPanel.isVisible()) await zamknijPanel.click()
        const pomiary = await segmenty.evaluateAll((elementy) => elementy.map((element) => ({
          przepelnienie: element.scrollWidth - element.clientWidth,
          miesciSie: element.getBoundingClientRect().right <= element.parentElement.getBoundingClientRect().right + 1,
          przyciski: Array.from(element.children, (przycisk) => ({
            wysokosc: przycisk.getBoundingClientRect().height,
            przepelnienie: przycisk.scrollWidth - przycisk.clientWidth,
          })),
        })))
        for (const pomiar of pomiary) {
          assert.equal(pomiar.przepelnienie, 0, `${szerokosc}px, ${skala}%`)
          assert.ok(pomiar.miesciSie && pomiar.przyciski.every(({ wysokosc, przepelnienie }) => wysokosc >= 32 && przepelnienie === 0), JSON.stringify(pomiar))
        }
        await strona.getByRole('group', { name: 'Oświadczenie VAT' }).evaluate((element) => element.scrollIntoView({ block: 'center' }))
        await strona.screenshot({ path: `tmp/ux-1b/segmenty-${szerokosc}-${skala}.png` })
      }
    }
  } finally { await przegladarka.close() }
})

test('pakiet podstawowy mieści kontrolki w jednym rzędzie i zachowuje zapisane wybory', { timeout: 60000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const kafelki = strona.locator('#pakiet-podstawowy .szczegoly-wiersz-wymogu')
    await kafelki.first().waitFor()
    assert.equal(await kafelki.count(), 5)

    for (const szerokosc of [1440, 390]) {
      await strona.setViewportSize({ width: szerokosc, height: 1000 })
      for (const skala of [75, 85, 100]) {
        await strona.evaluate(async (wartosc) => {
          const { zastosujSkaleInterfejsu } = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')
          await zastosujSkaleInterfejsu(wartosc)
        }, skala)
        const pomiary = await kafelki.evaluateAll((elementy) => elementy.map((kafelek) => {
          const nazwa = kafelek.firstElementChild.getBoundingClientRect()
          const pole = kafelek.querySelector('input[type="checkbox"]')
          const etykieta = pole.closest('label').getBoundingClientRect()
          const przelacznik = kafelek.querySelector('[role="switch"]').getBoundingClientRect()
          const srodek = (prostokat) => prostokat.top + prostokat.height / 2
          return {
            rozmiar: pole.offsetWidth,
            wysokosc: kafelek.offsetHeight,
            kontrolkiWRzedzie: Math.abs(srodek(etykieta) - srodek(przelacznik)) < 1 && etykieta.right < przelacznik.left,
            nazwaWRzedzie: Math.abs(srodek(nazwa) - srodek(etykieta)) < 1 && nazwa.right <= etykieta.left,
            nazwaNadKontrolkami: nazwa.bottom <= etykieta.top + 1,
            bezPrzepelnienia: kafelek.scrollWidth <= kafelek.clientWidth,
          }
        }))
        for (const pomiar of pomiary) {
          const kontekst = `${szerokosc} px, ${skala}%: ${JSON.stringify(pomiar)}`
          assert.equal(pomiar.rozmiar, 18, kontekst)
          assert.ok(pomiar.kontrolkiWRzedzie && pomiar.bezPrzepelnienia, kontekst)
          if (szerokosc === 1440) {
            assert.ok(pomiar.nazwaWRzedzie && pomiar.wysokosc >= 52 && pomiar.wysokosc <= 60, kontekst)
          } else {
            assert.ok(pomiar.nazwaWRzedzie || pomiar.nazwaNadKontrolkami, kontekst)
          }
        }
      }
    }

    await strona.setViewportSize({ width: 1440, height: 1000 })
    const schowajPanel = strona.getByRole('button', { name: 'Schowaj panel', exact: true })
    if (await schowajPanel.isVisible()) await schowajPanel.click()
    const pierwszyKafelek = kafelki.first()
    const checkbox = pierwszyKafelek.getByRole('checkbox', { name: 'Wzór klienta' })
    const przelacznik = pierwszyKafelek.getByRole('switch')
    const poprzedniWzor = await checkbox.isChecked()
    const poprzedniTryb = await przelacznik.getAttribute('aria-checked')
    await pierwszyKafelek.getByText('Wzór klienta', { exact: true }).click()
    assert.equal(await checkbox.isChecked(), !poprzedniWzor)
    await checkbox.press('Space')
    assert.equal(await checkbox.isChecked(), poprzedniWzor)
    await checkbox.press('Space')
    await przelacznik.press('Enter')
    assert.notEqual(await przelacznik.getAttribute('aria-checked'), poprzedniTryb)
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze`)
    await strona.getByRole('button', { name: 'Edytuj', exact: true }).first().click()
    assert.equal(await checkbox.isChecked(), !poprzedniWzor)
    assert.notEqual(await przelacznik.getAttribute('aria-checked'), poprzedniTryb)
  } finally { await przegladarka.close() }
})

test('płynna edycja szczegółów z wieloma grupami i zachowanie bieżących danych', { timeout: 240000 }, async () => {
  const przegladarka = await uruchomPrzegladarke()
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
  const przegladarka = await uruchomPrzegladarke()
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
