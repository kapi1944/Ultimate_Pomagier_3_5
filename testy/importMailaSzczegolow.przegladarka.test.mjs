import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'
const mail = readFileSync(new URL('./fixtures/mailOrganizacyjnyV4.txt', import.meta.url), 'utf8')

test('kontakty i odbiorca: dynamiczne błędy, ARIA, kontrola jakości, import, niezależne wartości i kopia', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1600, height: 1100 } })
    await strona.goto(adres)
    await strona.evaluate(async () => (await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')).rozpocznijSesje('architekt-systemu'))
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const pole = (nazwa) => strona.locator(`#szczegoly-pole-${nazwa.replaceAll('.', '-')}`)
    await pole('odbiorca.imieNazwiskoOdbiorcy').fill('Własny odbiorca')
    await pole('nabywca.osobaKontaktowa').fill('Anna Nowak')
    await pole('czyNabywcaJestOdbiorca').check()
    assert.equal(await pole('odbiorca.imieNazwiskoOdbiorcy').inputValue(), 'Anna Nowak')
    await pole('nabywca.osobaKontaktowa').fill('Piotr Kowalski')
    assert.equal(await pole('odbiorca.imieNazwiskoOdbiorcy').inputValue(), 'Piotr Kowalski')
    for (const [nazwa, bledne, poprawne] of [
      ['nabywca.email', ['kontakt@', 'kontakt@firma', 'kontakt@@firma.pl', 'kontakt@firma.pl12345', 'E-mail:kontakt@firma.pl'], ['kontakt@firma.pl', 'anna.nowak@firma.com', 'kontakt+szkolenia@firma.pl']],
      ['nabywca.telefon', ['785 660 226dsf', '123', '785ABC226'], ['785 660 226', '785660226', '+48 785 660 226', '+49 151 23456789', '+45 12 34 56 78']],
    ]) {
      for (const wartosc of bledne) {
        await pole(nazwa).fill(wartosc)
        assert.equal(await pole(nazwa).getAttribute('aria-invalid'), 'true')
        const idBledu = await pole(nazwa).getAttribute('aria-describedby')
        assert.ok(idBledu)
        assert.match(await strona.locator(`#${idBledu}`).innerText(), /Nieprawidłowy/)
        assert.equal(await pole(nazwa).inputValue(), wartosc)
        assert.equal(await pole(nazwa).locator('..').locator('.szczegoly-pole__pomoc').count(), 0)
      }
      for (const wartosc of poprawne) {
        await pole(nazwa).fill(wartosc)
        assert.equal(await pole(nazwa).getAttribute('aria-invalid'), 'false')
      }
    }
    await pole('nabywca.telefon').fill('')
    assert.equal(await pole('nabywca.telefon').getAttribute('aria-invalid'), 'false')
    await pole('nabywca.email').fill('')
    assert.match(await strona.locator('#szczegoly-blad-nabywca-email').innerText(), /wpisz adres/)
    await pole('nabywca.email').fill('kontakt@')
    await strona.getByRole('button', { name: 'Kontrola jakości', exact: true }).click()
    const problem = strona.locator('.szczegoly-panel-jakosci').getByRole('button', { name: /Nabywca: Nieprawidłowy adres e-mail/ }).first()
    if (!await problem.isVisible()) await strona.getByRole('button', { name: 'Rozwiń wszystkie', exact: true }).click()
    await problem.click()
    await strona.waitForFunction(() => document.activeElement?.id === 'szczegoly-pole-nabywca-email')
    await strona.getByRole('button', { name: 'Schowaj panel', exact: true }).click()
    await pole('nabywca.email').fill('')
    const tresc = 'Email nabywcy:\nAdres e-mail:\n<a href="mailto:kontakt+szkolenia@firma.pl">Kontakt</a>\nTelefon nabywcy: 785 660 226dsf\nRaport na adres: [raport@firma.pl](mailto:raport@firma.pl)'
    await strona.locator('.szczegoly-import-maila textarea').fill(tresc)
    await strona.getByRole('button', { name: 'Zastosuj treść maila', exact: true }).click()
    // Ręcznie wyczyszczony email jest chroniony; nowy formularz daje importowi czyste pola.
    strona.once('dialog', (okno) => okno.accept())
    await strona.getByRole('button', { name: 'Nowy formularz', exact: true }).click()
    await strona.locator('.szczegoly-import-maila textarea').fill(tresc)
    await strona.getByRole('button', { name: 'Zastosuj treść maila', exact: true }).click()
    assert.equal(await pole('nabywca.email').inputValue(), 'kontakt+szkolenia@firma.pl')
    assert.equal(await pole('nabywca.sposobWysylkiRaportu').inputValue(), 'raport@firma.pl')
    assert.equal(await pole('nabywca.telefon').inputValue(), '785 660 226dsf')
    assert.equal(await pole('nabywca.telefon').getAttribute('aria-invalid'), 'true')
    await pole('odbiorca.imieNazwiskoOdbiorcy').fill('Własny odbiorca')
    await pole('nabywca.osobaKontaktowa').fill('Osoba nabywcy')
    await pole('czyNabywcaJestOdbiorca').check()
    await pole('opiekunId').selectOption({ value: 'Kamila' })
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    const zapis = await strona.evaluate(async () => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')).pobierzAktualnaWersjeRobocza())
    assert.equal(zapis.dane.zrodloImportuMaila, tresc)
    assert.equal(zapis.statusyPol['nabywca.telefon'], 'niepewne')
    assert.equal(zapis.dane.nabywca.telefon, '785 660 226dsf')
    assert.equal(zapis.dane.odbiorca.imieNazwiskoOdbiorcy, 'Własny odbiorca')
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze`)
    await strona.getByRole('button', { name: /Podgl[aą]d/, exact: true }).click()
    assert.equal(await strona.locator('[data-pole="odbiorca.imieNazwiskoOdbiorcy"] dd').innerText(), 'Osoba nabywcy')
    await strona.getByRole('button', { name: 'Zamknij', exact: true }).click()
    await strona.getByRole('button', { name: 'Edytuj', exact: true }).click()
    assert.equal(await pole('odbiorca.imieNazwiskoOdbiorcy').inputValue(), 'Osoba nabywcy')
    await pole('czyNabywcaJestOdbiorca').uncheck()
    assert.equal(await pole('odbiorca.imieNazwiskoOdbiorcy').inputValue(), 'Własny odbiorca')
    assert.equal(await pole('nabywca.telefon').getAttribute('aria-invalid'), 'true')
    const kompletna = await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { wersjaEksportuSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return { id: 'test-kontaktow-kompletny', wersja: wersjaEksportuSzczegolow, dane: { ...poczatkoweDaneFormularza, status: 'PEŁNE', tytulSzkolenia: 'Test kontaktów', nazwaKlienta: 'Klient', opiekunId: 'Kamila', czyNabywcaJestOdbiorca: true, nabywca: { ...poczatkoweDaneFormularza.nabywca, nazwa: 'Klient', email: 'kontakt@firma.pl' } }, grupy: [{ ...poczatkowaGrupa, formaSzkolenia: 'Online', miejsce: 'Online', dataOd: '2026-11-06', dataDo: '2026-11-06', liczbaUczestnikow: 5, liczbaGodzin: 8, cenaNetto: 1000, trenerzy: [{ id: 'trener-testowy', imieNazwisko: 'Jan Kowalski', email: '', telefon: '' }] }], adresaci: poczatkowiAdresaci, statusyPol: {} }
    })
    await strona.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'test-kontaktow.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(kompletna)) })
    const publikuj = strona.getByRole('button', { name: 'Opublikuj', exact: true })
    assert.equal(await publikuj.isEnabled(), true)
    await pole('nabywca.email').fill('kontakt@')
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).waitFor()
    assert.equal(await publikuj.count(), 0)
    await pole('nabywca.email').fill('kontakt@firma.pl')
    await pole('nabywca.telefon').fill('785ABC226')
    assert.equal(await publikuj.count(), 0)
    await pole('nabywca.telefon').fill('+45 12 34 56 78')
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    assert.equal(await publikuj.isEnabled(), true)
    await pole('nabywca.telefon').fill('')
    assert.equal(await publikuj.isEnabled(), true, 'Pusty opcjonalny telefon nie blokuje publikacji')
  } finally { await przegladarka.close() }
})

test('Grid czterech sekcji: niezależne kolumny, menu, panel jakości, 85%, wąskie okno i dotyk', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1920, height: 1200 }, hasTouch: true })
    await strona.goto(adres)
    await strona.evaluate(async () => {
      const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
      rozpocznijSesje('architekt-systemu')
      localStorage.setItem('ultimatePomagier.panelJakosciWysuwanieZKrawedzi', 'false')
    })
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    await strona.evaluate(async () => (await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')).zastosujSkaleInterfejsu(85))
    await strona.locator('[aria-controls="menu-glowne"]').click()
    const przypnij = strona.getByRole('button', { name: /Przypnij Menu/ })
    if (await przypnij.isVisible()) await przypnij.click()
    for (const szerokosc of [1920, 1440, 1000, 768, 390]) {
      await strona.setViewportSize({ width: szerokosc, height: 1200 })
      for (const otwarty of [false, true]) {
        if (otwarty) await strona.getByRole('button', { name: 'Kontrola jakości', exact: true }).tap()
        else if (await strona.locator('.szczegoly-panel-jakosci--otwarty').count()) await strona.getByRole('button', { name: 'Schowaj panel', exact: true }).tap()
        await strona.waitForTimeout(300)
        const geometria = await strona.evaluate(() => {
          const obszar = document.querySelector('.szczegoly-formularz')
          const siatka = document.querySelector('.szczegoly-uklad-sekcji')
          const prostokat = (id) => { const { x, y, width, height, bottom } = document.getElementById(id).getBoundingClientRect(); return { x, y, width, height, bottom } }
          return { szerokosc: parseFloat(getComputedStyle(obszar).width), skala: getComputedStyle(document.documentElement).getPropertyValue('--ui-skala-przegladarki'), liczba: document.querySelectorAll('.szczegoly-uklad-sekcji').length, kolumny: siatka.children.length, pakiet: prostokat('pakiet-podstawowy'), materialy: prostokat('materialy-szkoleniowe'), dodatkowe: prostokat('dodatkowe-wymogi'), wymogi: prostokat('wymogi-materialow') }
        })
        assert.equal(geometria.skala.trim(), '0.85')
        assert.equal(geometria.liczba, 1)
        assert.equal(geometria.kolumny, 2)
        if (szerokosc === 1920) assert.ok(geometria.szerokosc > 760)
        if (szerokosc === 390) assert.ok(geometria.szerokosc <= 760)
        assert.ok(geometria.materialy.y >= geometria.pakiet.bottom)
        assert.ok(geometria.wymogi.y >= geometria.dodatkowe.bottom)
        if (geometria.szerokosc > 760) {
          assert.ok(Math.abs(geometria.pakiet.y - geometria.dodatkowe.y) < 2, JSON.stringify(geometria))
          assert.ok(geometria.dodatkowe.x > geometria.pakiet.x + geometria.pakiet.width)
          assert.ok(Math.abs(geometria.materialy.x - geometria.pakiet.x) < 2)
          assert.ok(Math.abs(geometria.wymogi.x - geometria.dodatkowe.x) < 2)
          assert.ok(geometria.materialy.y > geometria.wymogi.y, 'Krótka prawa kolumna nie rozciąga swoich sekcji do lewej')
        } else {
          assert.ok(Math.abs(geometria.pakiet.x - geometria.dodatkowe.x) < 2)
          assert.ok(geometria.dodatkowe.y >= geometria.materialy.bottom)
        }
        if ([1920, 390].includes(szerokosc)) {
          await strona.locator('#pakiet-podstawowy').scrollIntoViewIfNeeded()
          await strona.screenshot({ path: `tmp/szczegoly-${szerokosc}-${otwarty ? 'panel' : 'bez-panelu'}.png` })
        }
      }
    }
  } finally { await przegladarka.close() }
})

test('produkcja: późna projekcja kont, czterej opiekunowie z rzeczywistym ID, kopie, zmiana kont i ponowne logowanie', { timeout: 90000 }, async () => {
  const adresProdukcyjny = process.env.POMAGIER_ADRES_PRODUKCYJNY || 'http://127.0.0.1:47831'
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1600, height: 1100 } })
    let konta = []
    let aktywnaSesja = false
    await strona.route('**/api/konta', async (trasa) => {
      const { operacja } = trasa.request().postDataJSON()
      if (operacja === 'logowanie') aktywnaSesja = true
      if (operacja === 'wyloguj') aktywnaSesja = false
      const wynik = operacja === 'wyloguj' ? { dane: true } : !aktywnaSesja ? { blad: 'Brak testowej sesji' }
        : { dane: operacja === 'katalog' ? konta : operacja === 'historia' ? [] : konta.find((konto) => konto.rola === 'ARCHITEKT') }
      await trasa.fulfill({ json: wynik })
    })
    await strona.goto(adresProdukcyjny)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).waitFor()
    konta = await strona.evaluate(async () => {
      const { pobierzOpiekunowSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow.ts')
      if (pobierzOpiekunowSzczegolow().length) throw new Error('Projekcja przed logowaniem musi być pusta')
      const { daneStartoweUzytkownikow } = await import('/src/kartoteki/uzytkownicy/daneUzytkownikow.ts')
      return daneStartoweUzytkownikow.map((konto, indeks) => ({ ...konto, id: `testowe-konto-${indeks}` }))
    })
    const zaloguj = async () => {
      await strona.getByLabel('Login lub adres e-mail').fill('architekt-testowy')
      await strona.getByLabel('Hasło', { exact: true }).fill('haslo-wylacznie-testowe')
      await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
      await strona.locator('.naglowek-aplikacji').waitFor()
    }
    await zaloguj()
    await strona.goto(`${adresProdukcyjny}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const selektor = strona.locator('select[id$="opiekunId"]')
    for (const nazwa of ['Kasia RB', 'Iza Cz', 'Kamila', 'Dawid']) {
      const konto = konta.find((konto) => konto.pseudonim === nazwa)
      await selektor.selectOption({ value: konto.id })
      assert.equal(await selektor.inputValue(), konto.id)
      assert.notEqual(konto.id, nazwa)
      await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
      const zapis = await strona.evaluate(async () => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')).pobierzAktualnaWersjeRobocza())
      assert.equal(zapis.dane.opiekunId, konto.id)
      await strona.goto(`${adresProdukcyjny}/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze`)
      await strona.getByRole('button', { name: 'Edytuj', exact: true }).click()
      assert.equal(await selektor.inputValue(), konto.id)
    }
    const wybranyId = await selektor.inputValue()
    const zablokowanyId = konta.find((konto) => konto.pseudonim === 'Iza Cz').id
    const zmienione = konta.map((konto) => konto.id === wybranyId ? { ...konto, status: 'NIEAKTYWNY' } : konto.id === zablokowanyId ? { ...konto, status: 'ZABLOKOWANY' } : konto)
    await strona.evaluate(async (konta) => {
      const { ustawProjekcjeKont } = await import('/src/aplikacja/logowanie/projekcjaKont.ts')
      ustawProjekcjeKont(konta, [], konta.find((konto) => konto.rola === 'ARCHITEKT'))
    }, zmienione)
    await selektor.locator(`option[value="${wybranyId}"]:disabled`).waitFor({ state: 'attached' })
    assert.equal(await selektor.inputValue(), wybranyId)
    assert.equal(await selektor.locator(`option[value="${zablokowanyId}"]`).count(), 0)
    await strona.getByRole('button', { name: 'Wyloguj', exact: true }).click()
    await zaloguj()
    await strona.goto(`${adresProdukcyjny}/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze`)
    await strona.getByRole('button', { name: 'Edytuj', exact: true }).click()
    assert.equal(await selektor.inputValue(), wybranyId)
    assert.equal(await selektor.locator('option:not(:disabled)').count(), 5)
  } finally { await przegladarka.close() }
})

test('import V4 w formularzu: kartoteki, lokalizacja, rozliczenia, jakość i ochrona ręcznych zmian', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const kontekst = await przegladarka.newContext({ viewport: { width: 1440, height: 1000 } })
    const strona = await kontekst.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    // Kartoteki i sesja istnieją wyłącznie w izolowanym kontekście testowym.
    await strona.evaluate(async () => {
      const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
      const { pobierzLokalizacjeZMagazynu, znajdzLokalizacjeDlaMiejsca, ustawPotwierdzonyMiejscownikLokalizacji } = await import('/src/kartoteki/lokalizacje/magazynLokalizacji.ts')
      localStorage.setItem('ultimate-pomagier.kartoteki.trenerzy', JSON.stringify([{ id: 'trener-test-17', imie: 'Renata', nazwisko: 'Stefaniuk', email: 'trener@example.org', telefon: '', status: 'Aktywny' }]))
      const lokalizacja = znajdzLokalizacjeDlaMiejsca('Mielec', pobierzLokalizacjeZMagazynu())
      if (!lokalizacja) throw new Error('Brak jednoznacznego Mielca w kartotece testowej')
      if (znajdzLokalizacjeDlaMiejsca('Hotel Bulwary, ul. Rzeczna 8, 39-300 Mielec', [lokalizacja])?.klucz_lokalizacji !== lokalizacja.klucz_lokalizacji) throw new Error('Pełny adres nie trafił do mechanizmu lokalizacji')
      if (znajdzLokalizacjeDlaMiejsca('Mielec', [lokalizacja, { ...lokalizacja, klucz_lokalizacji: 'duplikat' }])) throw new Error('Niejednoznaczna miejscowość nie może być dopasowana automatycznie')
      if (znajdzLokalizacjeDlaMiejsca('Mielcu', [lokalizacja])) throw new Error('Nie wolno odgadywać mianownika miejscowości')
      ustawPotwierdzonyMiejscownikLokalizacji(lokalizacja.klucz_lokalizacji, 'Mielcu')
      if (!rozpocznijSesje('architekt-systemu')) throw new Error('Nie udało się rozpocząć sesji testowej')
    })
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const importuj = strona.getByRole('button', { name: 'Zastosuj treść maila', exact: true })
    await strona.locator('.szczegoly-import-maila textarea').fill(mail)
    await importuj.click()
    const pole = (nazwa) => strona.locator(`input[id$="${nazwa}"], select[id$="${nazwa}"]`).filter({ visible: true })
    assert.equal(await pole('nazwaKlienta').inputValue(), 'Polskie Zakłady Lotnicze Sp. z o.o.')
    assert.equal(await pole('opiekunId').inputValue(), '')
    assert.equal(await pole('tytulSzkolenia').inputValue(), 'Lean management i kaizen - system ciągłego doskonalenia w organizacji')
    const rozwin = strona.getByRole('button', { name: 'Rozwiń grupę', exact: true })
    if (await rozwin.count()) await rozwin.click()
    assert.equal(await pole('dataOd').inputValue(), '2026-10-28')
    assert.equal(await pole('dataDo').inputValue(), '2026-10-29')
    assert.equal(await strona.locator('input[aria-label="Miejsce"]').inputValue(), 'Hotel Bulwary, ul. Rzeczna 8, 39-300 Mielec')
    assert.equal((await pole('cenaNetto').inputValue()).replace(/\s/g, ''), '8700,00')
    assert.equal(await pole('vat').inputValue(), 'Nie – 23%')
    assert.equal(await pole('liczbaUczestnikow').inputValue(), '19')
    assert.equal(await pole('terminPlatnosci').inputValue(), '60')
    assert.equal(await strona.locator('input[list^="trenerzy-"]').inputValue(), 'Renata Stefaniuk')
    const stan = await strona.evaluate(async () => {
      const { pobierzAutosaveSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAutosaveSzczegolow()
    })
    assert.equal(stan.grupy[0].trenerzy[0].id, 'trener-test-17')
    assert.equal(stan.statusyPol['grupy.0.trenerzy'], 'zaimportowane')
    assert.deepEqual(Object.entries(stan.statusyPol).filter(([, status]) => status === 'niepewne').map(([pole]) => pole), ['grupy.0.rodzajGodzin'])
    assert.equal(await strona.getByRole('heading', { name: 'Pola niepewne po imporcie' }).count(), 1)
    await pole('nazwaKlienta').fill('Nazwa poprawiona ręcznie')
    await pole('cenaNetto').fill('9200')
    await pole('dataOd').fill('2026-10-27')
    await pole('tytulSzkolenia').fill('')
    await importuj.click()
    assert.equal(await pole('nazwaKlienta').inputValue(), 'Nazwa poprawiona ręcznie')
    assert.equal((await pole('cenaNetto').inputValue()).replace(/\s/g, ''), '9200,00')
    assert.equal(await pole('dataOd').inputValue(), '2026-10-27')
    assert.equal(await pole('tytulSzkolenia').inputValue(), '')
    assert.equal(await pole('dataDo').inputValue(), '2026-10-29')
    const dwieGrupy = mail.replace('Harmonogram szkolenia:', 'Grupa 2\nData: 30-31.10.2026\nTrener: Renata Stefaniuk\nCena netto: 2000\nForma szkolenia: Online\nHarmonogram szkolenia:')
    await strona.locator('.szczegoly-import-maila textarea').fill(dwieGrupy)
    await importuj.click()
    const stanGrup = await strona.evaluate(async () => {
      const { pobierzAutosaveSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAutosaveSzczegolow().grupy
    })
    assert.equal(stanGrup.length, 2, JSON.stringify(stanGrup.map((grupa) => ({ id: grupa.id, nazwa: grupa.nazwa }))))
    assert.equal(stanGrup[0].cenaNetto, 9200)
    assert.equal(stanGrup[1].cenaNetto, 2000)
    assert.equal(stanGrup[1].dataOd, '2026-10-30')
    assert.equal(stanGrup[1].trenerzy[0].id, 'trener-test-17')
    await strona.evaluate(() => {
      const trenerzy = JSON.parse(localStorage.getItem('ultimate-pomagier.kartoteki.trenerzy'))
      localStorage.setItem('ultimate-pomagier.kartoteki.trenerzy', JSON.stringify([...trenerzy, { ...trenerzy[0], id: 'trener-test-18', email: 'inny@example.org' }]))
    })
    await strona.getByRole('button', { name: 'Odśwież trenerów z kartoteki', exact: true }).click()
    await importuj.click()
    const trener = strona.locator('input[list^="trenerzy-"]').first()
    await trener.focus()
    await trener.blur()
    const pobierzStan = () => strona.evaluate(async () => {
      const { pobierzAutosaveSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAutosaveSzczegolow()
    })
    assert.equal((await pobierzStan()).statusyPol['grupy.0.trenerzy'], 'niepewne', 'Sam fokus nie rozstrzyga dwóch pasujących rekordów')
    await trener.fill('Renata Stefaniuk (inny@example.org)')
    await trener.blur()
    assert.equal((await pobierzStan()).grupy[0].trenerzy[0].id, 'trener-test-18')
    assert.equal((await pobierzStan()).statusyPol['grupy.0.trenerzy'], 'reczne')
    assert.deepEqual(bledy, [])
  } finally {
    await przegladarka.close()
  }
})

const mailOze = readFileSync(new URL('./fixtures/mailOrganizacyjnyOze.txt', import.meta.url), 'utf8')

test('import OZE w formularzu: wartości A–G, statusy, ręczne 48 osób i ponowne otwarcie zapisanej kopii', { timeout: 90000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 } })
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    await strona.evaluate(async () => {
      const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
      const { pobierzLokalizacjeZMagazynu, zapiszLokalizacjeWMagazynie, ustawPotwierdzonyMiejscownikLokalizacji } = await import('/src/kartoteki/lokalizacje/magazynLokalizacji.ts')
      const lokalizacje = pobierzLokalizacjeZMagazynu()
      const lokalizacja = lokalizacje.find((pozycja) => pozycja.nazwa === 'Łódź' && pozycja.rodzaj === 'miasto')
      if (!lokalizacja) throw new Error('Brak miasta Łódź w kartotece testowej')
      // Fixture rozróżnia miejscowości o tej samej nazwie w izolowanym kontekście.
      zapiszLokalizacjeWMagazynie(lokalizacje.map((pozycja) => pozycja.nazwa === 'Łódź' && pozycja !== lokalizacja ? { ...pozycja, nazwa: `${pozycja.nazwa} (${pozycja.gmina})` } : pozycja))
      ustawPotwierdzonyMiejscownikLokalizacji(lokalizacja.klucz_lokalizacji, 'Łodzi')
      localStorage.setItem('ultimate-pomagier.kartoteki.trenerzy', JSON.stringify([{ id: 'trener-rafal-test', imie: 'Rafał', nazwisko: 'Wojtaszek', email: 'rafal@example.org', telefon: '', status: 'Aktywny' }]))
      localStorage.setItem('ultimate-pomagier.kartoteki.klienci', JSON.stringify([{ id: 'klient-oze-test', nazwa: 'Wojewódzki Fundusz Ochrony Środowiska i Gospodarki Wodnej w Łodzi', nip: '7272755012', ulica: 'Dubois', nrBudynku: '118', nrLokalu: '', kodPocztowy: '93-465', miasto: 'Łódź', kraj: 'Polska', koordynator: '', telefonKoordynatora: '', emailKoordynatora: '' }]))
      if (!rozpocznijSesje('architekt-systemu')) throw new Error('Nie udało się rozpocząć sesji testowej')
    })
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const pole = (nazwa) => strona.locator(`input[id$="${nazwa}"], select[id$="${nazwa}"], textarea[id$="${nazwa}"]`).filter({ visible: true }).first()
    const importuj = strona.getByRole('button', { name: 'Zastosuj treść maila', exact: true })
    const sprawdzPola = async (liczbaUczestnikow) => {
      const rozwin = strona.getByRole('button', { name: 'Rozwiń grupę', exact: true })
      if (await rozwin.count()) await rozwin.first().click()
      for (const [nazwa, wartosc] of Object.entries({ nazwaKlienta: 'Wojewódzki Fundusz Ochrony Środowiska i Gospodarki Wodnej w Łodzi', liczbaUczestnikow, liczbaGodzin: '6', rodzajGodzin: 'Zegarowe (60 min)', vat: 'ZW – 100%', dataOd: '2026-11-06', dataDo: '2026-11-06', terminPlatnosci: '14' })) {
        assert.equal(await pole(nazwa).inputValue(), wartosc, nazwa)
      }
      assert.equal((await pole('cenaNetto').inputValue()).replace(/\s/g, ''), '7500,00')
      assert.equal(await strona.locator('input[list^="trenerzy-"]').inputValue(), 'Rafał Wojtaszek')
      assert.match(await pole('programSzkolenia').inputValue(), /1\. Pompy ciepła\n   - Dobór urządzeń/)
    }
    for (const tresc of [mailOze, mailOze.replace(/^(-?[^\n:]+):/gm, '**$1:**').replace(/: /g, ':\n\n'), mailOze.replace(/ /g, '\u00a0  ')]) {
      await strona.locator('.szczegoly-import-maila textarea').fill(tresc)
      await importuj.click()
      await sprawdzPola('50')
    }
    const pobierzStan = () => strona.evaluate(async () => {
      const { pobierzAutosaveSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAutosaveSzczegolow()
    })
    const stan = await pobierzStan()
    assert.equal(stan.grupy.length, 1)
    assert.equal(stan.grupy[0].id, 'grupa-1')
    assert.equal(stan.grupy[0].trenerzy[0].id, 'trener-rafal-test')
    assert.equal(stan.grupy[0].uczestnicy.length, 0)
    for (const nazwa of ['liczbaUczestnikow', 'liczbaGodzin', 'rodzajGodzin', 'trenerzy', 'cenaNetto', 'vat', 'dataOd', 'dataDo']) assert.equal(stan.statusyPol[`grupy.0.${nazwa}`], 'zaimportowane', nazwa)
    assert.equal(stan.dane.nabywca.ulica, 'Dubois')
    assert.equal(stan.dane.nabywca.nrBudynku, '118')
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimate-pomagier.kartoteki.klienci')).length), 1)
    await pole('liczbaUczestnikow').fill('48')
    await importuj.click()
    await sprawdzPola('48')
    assert.equal((await pobierzStan()).statusyPol['grupy.0.liczbaUczestnikow'], 'reczne')
    await strona.getByLabel('Szukaj opiekuna po imieniu, nazwisku lub pseudonimie').fill('Rohde')
    assert.equal(await pole('opiekunId').locator('option[value="Kasia RB"]').count(), 1)
    assert.equal(await pole('opiekunId').locator('option[value="Dawid"]').count(), 0)
    await strona.getByLabel('Szukaj opiekuna po imieniu, nazwisku lub pseudonimie').fill('')
    for (const [nazwa, id] of [['Kasia RB', 'Kasia RB'], ['Iza Cz', 'Iza'], ['Dawid', 'Dawid'], ['Kamila', 'Kamila']]) {
      await pole('opiekunId').selectOption({ value: id })
      assert.equal(await pole('opiekunId').inputValue(), id)
    }
    await strona.locator('.szczegoly-import-maila textarea').fill('Temat: 06.11.2026\nDane osoby kontaktowej:\nRyszard Przybył\ntel. 42 663 41 86\nadres e-mail: rprzybyl@wfosigw.lodz.pl')
    await importuj.click()
    assert.equal((await pobierzStan()).dane.nabywca.email, 'rprzybyl@wfosigw.lodz.pl')
    const znacznik = strona.getByRole('button', { name: 'Zatwierdź: grupy.0.dataOd', exact: true }).first()
    await znacznik.click()
    assert.equal((await pobierzStan()).statusyPol['grupy.0.dataOd'], 'zatwierdzone')
    assert.equal((await pobierzStan()).statusyPol['grupy.0.dataDo'], 'niepewne')
    await importuj.click()
    assert.equal((await pobierzStan()).statusyPol['grupy.0.dataOd'], 'zatwierdzone')
    await strona.getByRole('button', { name: 'Cofnij zatwierdzenie: grupy.0.dataOd', exact: true }).first().click()
    assert.equal((await pobierzStan()).statusyPol['grupy.0.dataOd'], 'niepewne')
    await pole('dataOd').locator('..').getByRole('button', { name: '✓ Zatwierdź', exact: true }).click()
    await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
    const kopia = await strona.evaluate(async () => {
      const { pobierzAktualnaWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return pobierzAktualnaWersjeRobocza()
    })
    assert.ok(kopia?.id, await strona.locator('.szczegoly-komunikat').innerText())
    assert.equal(kopia.grupy[0].liczbaUczestnikow, 48)
    await strona.goto(`${adres}/`)
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze`)
    await strona.getByRole('button', { name: 'Edytuj', exact: true }).click()
    await sprawdzPola('48')
    const kontrola = await strona.evaluate(async () => {
      const { pobierzAutosaveSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      const { zbudujProblemyWalidacji } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/hooki/useGeneratorSzczegolow.ts')
      const { przelaczZatwierdzenie } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/zatwierdzaniePol.ts')
      const stan = pobierzAutosaveSzczegolow()
      stan.grupy[0].liczbaUczestnikow = -5
      stan.dane.nabywca.email = 'niepoprawny-adres'
      const przed = zbudujProblemyWalidacji(stan.dane, stan.grupy)
      const zatwierdzone = przelaczZatwierdzenie({ 'grupy.0.liczbaUczestnikow': 'niepewne' }, stan.grupy, 'grupy.0.liczbaUczestnikow', stan.grupy[0].id)
      return { przed, po: zbudujProblemyWalidacji(stan.dane, stan.grupy), zatwierdzone }
    })
    assert.deepEqual(kontrola.po, kontrola.przed)
    assert.ok(kontrola.po.some((blad) => blad.pole === 'nabywca.email'))
    assert.ok(kontrola.po.some((blad) => blad.pole === 'grupy.0.liczbaUczestnikow'))
    strona.once('dialog', (okno) => okno.accept())
    await strona.getByRole('button', { name: 'Nowy formularz', exact: true }).click()
    await strona.locator('.szczegoly-import-maila textarea').fill('Tytuł szkolenia: Szkolenie bez danych\nLista uczestników: po szkoleniu')
    await importuj.click()
    const rozwin = strona.getByRole('button', { name: 'Rozwiń grupę', exact: true })
    if (await rozwin.count()) await rozwin.first().click()
    assert.equal(await pole('liczbaUczestnikow').inputValue(), '')
    assert.equal((await pobierzStan()).statusyPol['grupy.0.liczbaUczestnikow'], 'brak')
    assert.deepEqual(bledy, [])
  } finally {
    await przegladarka.close()
  }
})

test('paczka: import, siedziba, ręczny kontakt, synchronizacja, dotyk i zapis', { timeout: 90000 }, async () => {
 const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
 try {
  const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true })
  await strona.goto(adres)
  await strona.evaluate(async () => { const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts'); rozpocznijSesje('architekt-systemu') })
  await strona.goto(adres + '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe')
  await strona.evaluate(() => { document.body.style.zoom = '0.85' })
  const tekst = readFileSync(new URL('./fixtures/mailWysylkaSiedziba.txt', import.meta.url), 'utf8')
  const importuj = strona.getByRole('button', { name: 'Zastosuj treść maila', exact: true })
  await strona.locator('.szczegoly-import-maila textarea').fill(tekst)
  await importuj.click()
  const stan = () => strona.evaluate(async () => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')).pobierzAutosaveSzczegolow())
  const przelacznik = strona.getByRole('switch', { name: 'Wysyłka paczki na siedzibę odbiorcy', exact: true })
  assert.equal(await przelacznik.getAttribute('aria-checked'), 'true')
  assert.equal((await stan()).dane.odbiorcaPaczki.informacjaNaEtykiecie, 'MATERIAŁY SZKOLENIOWE')
  assert.equal((await stan()).dane.odbiorcaPaczki.imieNazwisko, 'Ryszard Przybył')
  const telefon = strona.locator('#' + await strona.evaluate(async () => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/identyfikatoryPol.ts')).pobierzIdPola('odbiorcaPaczki.telefon')))
  await telefon.fill('500 600 700')
  await importuj.click()
  assert.equal((await stan()).dane.odbiorcaPaczki.telefon, '500 600 700')
  await przelacznik.tap()
  assert.equal(await przelacznik.getAttribute('aria-checked'), 'false')
  assert.equal((await stan()).dane.odbiorcaPaczki.ulica, 'Dubois')
  await przelacznik.focus()
  await przelacznik.press('Space')
  assert.equal(await przelacznik.getAttribute('aria-checked'), 'true')
  assert.equal((await stan()).dane.odbiorcaPaczki.telefon, '500 600 700')
  const ulicaKlienta = strona.locator('#' + await strona.evaluate(async () => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/identyfikatoryPol.ts')).pobierzIdPola('nabywca.ulica')))
  await ulicaKlienta.fill('Nowa')
  assert.equal((await stan()).dane.odbiorcaPaczki.ulica, 'Nowa')
  await strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true }).click()
  await strona.goto(adres + '/szkolenia-zamkniete/szczegoly-organizacyjne/kopie-robocze')
  await strona.getByRole('button', { name: 'Edytuj', exact: true }).click()
  assert.equal(await przelacznik.getAttribute('aria-checked'), 'true')
  assert.equal((await stan()).dane.odbiorcaPaczki.ulica, 'Nowa')
  assert.equal((await stan()).dane.odbiorcaPaczki.telefon, '500 600 700')
 } finally { await przegladarka.close() }
})
