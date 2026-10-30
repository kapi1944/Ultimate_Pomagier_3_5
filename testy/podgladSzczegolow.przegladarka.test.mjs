import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

test('pełny podgląd zapisanych Szczegółów organizacyjnych', { timeout: 120000 }, async (zestaw) => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 900 } })
    strona.setDefaultTimeout(5000)
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const program = '1. Wprowadzenie\n   a) Cele\n   b) Zakres\n\n2. Warsztaty\n• Ćwiczenia\n' + Array.from({ length: 200 }, (_, indeks) => `${indeks + 3}. Pełny punkt programu ${indeks}`).join('\n')
    await strona.evaluate(async (program) => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { repozytoriumWspolnychDokumentow: repozytorium } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const { utworzNowyDokument } = await import('/src/wspolne/dokumenty/modelDokumentu.ts')
      const magazyn = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      const firma = { nazwa: 'Pełna nazwa nabywcy', nip: '1234567890', adres: 'Pełny adres historyczny', ulica: 'Kliencka', nrBudynku: '10', nrLokalu: '2', kodPocztowy: '00-001', miasto: 'Warszawa', kraj: 'Polska', osobaKontaktowa: 'Kontakt klienta', imieNazwiskoOdbiorcy: 'Odbiorca faktury', telefon: '111222333', email: 'klient@example.pl', sposobWysylkiRaportu: 'Raport pocztą elektroniczną' }
      const dane = { ...structuredClone(poczatkoweDaneFormularza), tytulSzkolenia: 'Podgląd wersji pierwszej', nazwaKlienta: 'Klient podglądu', opiekunId: 'architekt-systemu', status: 'OCZEKUJĄCE', nabywca: firma, odbiorca: { ...firma, nazwa: 'Odbiorca faktury firma' }, programSzkolenia: program, wysylkaPaczkiDotyczy: true, wysylkaNaSiedzibeOdbiorcy: false,
        odbiorcaPaczki: { nazwaFirmy: 'Adresat przesyłki', ulica: 'Wysyłkowa', nrBudynku: '22', nrLokalu: '3', kodPocztowy: '90-001', miasto: 'Łódź', kraj: 'Polska', imieNazwisko: 'Kontakt paczki', telefon: '999888777', email: 'paczka@example.pl', informacjaNaEtykiecie: 'Do recepcji' },
        uwagi: { wewnetrzne: 'Ustalenia wewnętrzne', informacjeNiepewne: 'Wymaga potwierdzenia', opiekuna: 'Uwagi opiekuna test', dlaKlienta: 'Wymogi klienta test', dlaTrenera: 'Nocleg i dojazd według ustaleń', dlaWysylaczy: 'Dostarczyć dzień wcześniej' },
        dyspozycjeMaterialowe: { materialySzkoleniowe: { formaPrzekazania: 'online', sposobPrzygotowania: 'drukuje_klient', terminPrzekazania: 'przed_szkoleniem', tekstZrodlowy: 'Materiały przesłać klientowi', status: 'zaimportowane' } } }
      dane.dokumentacja.szczegolyWzorowKlienta.listaObecnosci = { nazwaPliku: 'lista-klienta.docx', uwagi: 'Wzór obowiązkowy' }
      dane.dodatkoweWymogi.opisKarZaNieterminowosc = 'Kara według umowy'
      const grupy = [1, 2].map((numer) => ({ ...structuredClone(poczatkowaGrupa), id: `grupa-podgladu-${numer}`, nazwa: `Zespół ${numer}`, dataOd: `2026-11-0${numer}`, dataDo: `2026-11-0${numer}`, miejsce: `Sala ${numer}, ul. Szkoleniowa ${numer}`, cenaNetto: numer * 7500, liczbaUczestnikow: numer * 10, liczbaGodzin: numer * 6, nazwaNiestandardowychGodzin: `09:00 Etap ${numer}\n10:30 Przerwa ${numer}\n10:45 Warsztaty ${numer}`, trenerzy: [{ id: `trener-${numer}`, imieNazwisko: `Trener ${numer}`, telefon: `55500000${numer}`, email: `trener${numer}@example.pl` }], uczestnicy: [{ id: `osoba-${numer}`, imie: `Uczestnik ${numer}`, nazwisko: 'Testowy', email: `uczestnik${numer}@example.pl` }] }))
      for (const liczbaGrup of [2, 1]) {
        const id = `podglad-${liczbaGrup}`
        const rekord = { id, wersja: magazyn.wersjaEksportuSzczegolow, nazwa: dane.tytulSzkolenia, dataPublikacji: '2026-10-29T12:00:00Z', dataPierwszejPublikacji: '2026-10-29T12:00:00Z', dataOstatniejPublikacji: '2026-10-29T12:00:00Z', numerWersji: 1, autorId: 'architekt-systemu', autorNazwa: 'Autor podglądu', opiekunId: dane.opiekunId, status: 'OCZEKUJĄCE', statusSzkolenia: dane.statusSzkolenia, dane, grupy: grupy.slice(0, liczbaGrup), adresaci: { ...poczatkowiAdresaci, wiadomoscWlasna: 'Wiadomość organizacyjna' }, statusyPol: { 'nabywca.nip': 'zatwierdzone', 'grupy.0.miejsce': 'niepewne', programSzkolenia: 'zaimportowane', 'odbiorcaPaczki.telefon': 'reczne' }, zrodloKopiiRoboczejId: 'kopia-podgladu' }
        repozytorium.utworz({ ...utworzNowyDokument({ id, typ: 'SZCZEGOLY_ORGANIZACYJNE', generatorId: 'szczegoly_organizacyjne', tytul: dane.tytulSzkolenia, daneDokumentu: rekord }), status: 'OPUBLIKOWANY', opublikowano: rekord.dataPublikacji })
        const kopia = magazyn.utworzKopieRoboczaZOpublikowanychSzczegolow(rekord, { id: 'architekt-systemu', nazwa: 'Autor podglądu' })
        kopia.dane.tytulSzkolenia = 'NOWSZY SZKIC — NIE POKAZUJ'
        kopia.dane.programSzkolenia = 'Zmieniony program wersji roboczej'
        magazyn.zapiszWersjeRobocza(kopia)
        magazyn.zapiszAutosaveSzczegolow({ ...kopia, dataZapisu: kopia.dataZapisu, aktywnaKopiaId: kopia.id })
      }
    }, program)
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne`)
    const karty = strona.locator('.rejestr-szczegolow__karta')
    await karty.first().waitFor()
    const kartaWieluGrup = karty.filter({ hasText: 'Zespół 2' })
    const kartaJednejGrupy = karty.filter({ hasNotText: 'Zespół 2' })
    const otwierajacy = kartaWieluGrup.getByRole('button', { name: /Podgl[aą]d/, exact: true })
    const okno = strona.getByRole('dialog')
    const zapis = () => strona.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))))
    const przed = await zapis()

    await zestaw.test('T1 — przycisk otwiera modal z rzeczywistą treścią', async () => {
      await otwierajacy.click()
      assert.deepEqual(bledy, [])
      await okno.waitFor()
      assert.match(await okno.innerText(), /Pełna nazwa nabywcy/)
      assert.equal(await okno.locator('input, textarea, select, [contenteditable=true]').count(), 0)
    })
    await zestaw.test('T2 — wszystkie sekcje formularza i oznaczenia pewności', async () => {
      await okno.getByRole('button', { name: 'Rozwiń wszystkie' }).click()
      const tekst = await okno.innerText()
      for (const wartosc of ['Informacje podstawowe', 'Dane klienta', 'Autor podglądu', 'Materiały i dokumentacja', 'Wysyłka paczki', 'Program szkolenia', 'Uwagi i informacje dodatkowe', 'Raport pocztą elektroniczną', 'lista-klienta.docx', 'Wzór obowiązkowy', 'Kara według umowy', 'Do recepcji', 'Kontakt klienta', 'Kontakt paczki', 'Dostarczyć dzień wcześniej', 'Nocleg i dojazd według ustaleń', 'Drukuje klient', 'Przed szkoleniem', 'Wiadomość organizacyjna', 'Zatwierdzone', 'Niepewne', 'Zaimportowane', 'Ręcznie uzupełnione']) assert.ok(tekst.includes(wartosc), wartosc)
      assert.doesNotMatch(tekst, /grupa-podgladu|architekt-systemu|trener-1/)
    })
    await zestaw.test('T4 — wiele grup zachowuje własne dane', async () => {
      for (const numer of [1, 2]) {
        const grupa = okno.locator('details').filter({ has: strona.locator(':scope > summary', { hasText: `Grupa ${numer} — Zespół ${numer}` }) })
        const tekst = await grupa.innerText()
        for (const wartosc of [`Sala ${numer}`, `Trener ${numer}`, `Uczestnik ${numer}`, `Przerwa ${numer}`]) assert.ok(tekst.includes(wartosc), wartosc)
        assert.equal((await grupa.locator(`[data-pole="grupy.${numer - 1}.cenaNetto"] > dd`).textContent()).replace(/\s/g, ''), `${numer * 7500},00zł`)
        assert.ok(!tekst.includes(`Trener ${3 - numer}`))
      }
    })
    await zestaw.test('T5 — pełny program zachowuje treść, akapity i numerację', async () => {
      const tresc = okno.locator('[data-pole="programSzkolenia"] > dd')
      assert.equal(await tresc.textContent(), program)
      assert.equal(await tresc.evaluate((element) => getComputedStyle(element).whiteSpace), 'pre-wrap')
    })
    await zestaw.test('T6 — harmonogram zachowuje godziny, przerwy i kolejność', async () => {
      for (const indeks of [0, 1]) assert.equal(await okno.locator(`[data-pole="grupy.${indeks}.nazwaNiestandardowychGodzin"] > dd`).textContent(), `09:00 Etap ${indeks + 1}\n10:30 Przerwa ${indeks + 1}\n10:45 Warsztaty ${indeks + 1}`)
    })
    await zestaw.test('T7 — pusta umowa nie blokuje podglądu', async () => {
      for (const klucz of ['dataUmowy', 'numerUmowy']) assert.equal(await okno.locator(`[data-pole="grupy.0.${klucz}"] > dd`).textContent(), '—')
    })
    await zestaw.test('T8 — opublikowana wersja jest niezależna od szkicu i autosave', async () => {
      assert.match(await okno.getByRole('heading', { level: 2 }).textContent(), /Wersja 1/)
      assert.doesNotMatch(await okno.innerText(), /NOWSZY SZKIC|Zmieniony program/)
    })
    await zestaw.test('T9 — zwijanie, rozwijanie i przewijanie nie zapisuje danych', async () => {
      await okno.getByRole('button', { name: 'Zwiń wszystkie', exact: true }).click()
      assert.equal(await okno.locator('details[open]').count(), 0)
      await okno.getByRole('button', { name: 'Rozwiń wszystkie' }).click()
      assert.equal(await okno.locator('details[open]').count(), await okno.locator('details').count())
      await okno.locator('.podglad-szczegolow__tresc').evaluate((element) => { element.scrollTop = element.scrollHeight })
      assert.equal(await zapis(), przed)
    })
    await zestaw.test('T10 — desktop, telefon i ekran poziomy nie przepełniają modala', async () => {
      for (const [szerokosc, wysokosc] of [[1440, 900], [360, 800], [800, 360], [800, 480]]) {
        await strona.setViewportSize({ width: szerokosc, height: wysokosc })
        const geometria = await okno.evaluate((element) => { const prostokat = element.getBoundingClientRect(); const naglowek = element.querySelector('h2').getBoundingClientRect(); return { szerokosc: prostokat.width, wysokosc: prostokat.height, lewo: prostokat.left, przewijanie: element.scrollWidth > element.clientWidth, naglowekWidoczny: naglowek.top >= prostokat.top && naglowek.bottom <= prostokat.bottom, trescPrzepelniona: element.querySelector('.podglad-szczegolow__tresc').scrollWidth > element.querySelector('.podglad-szczegolow__tresc').clientWidth } })
        assert.ok(geometria.szerokosc <= Math.min(1180, szerokosc), JSON.stringify(geometria))
        assert.ok(geometria.wysokosc <= wysokosc * .9 + 1, JSON.stringify(geometria))
        assert.ok(geometria.lewo >= 0 && geometria.naglowekWidoczny)
        assert.equal(geometria.przewijanie || geometria.trescPrzepelniona, false)
      }
      await strona.setViewportSize({ width: 1440, height: 900 })
      await okno.locator('.podglad-szczegolow__tresc').evaluate((element) => { element.scrollTop = 0 })
      if (process.env.POMAGIER_ZRZUT_PODGLADU) await strona.screenshot({ path: process.env.POMAGIER_ZRZUT_PODGLADU })
    })
    await zestaw.test('T11 — klawiatura, Escape, Zamknij i powrót fokusu', async () => {
      const zamknij = okno.getByRole('button', { name: 'Zamknij', exact: true })
      await zamknij.focus()
      await strona.keyboard.press('Shift+Tab')
      assert.equal(await okno.evaluate((element) => element.contains(document.activeElement)), true)
      await strona.keyboard.press('Escape')
      await okno.waitFor({ state: 'hidden' })
      assert.equal(await otwierajacy.evaluate((element) => document.activeElement === element), true)
      await otwierajacy.click()
      await okno.getByRole('button', { name: 'Zamknij', exact: true }).click()
      assert.equal(await otwierajacy.evaluate((element) => document.activeElement === element), true)
      assert.equal(await zapis(), przed)
    })
    await zestaw.test('T12 — ponowne otwarcie i odczyt po przeładowaniu są spójne', async () => {
      await strona.reload()
      await otwierajacy.click()
      await okno.getByRole('button', { name: 'Rozwiń wszystkie' }).click()
      assert.equal(await okno.locator('[data-pole="programSzkolenia"] > dd').textContent(), program)
      await strona.keyboard.press('Escape')
    })
    await zestaw.test('T3 — jeden rekord z jedną grupą', async () => {
      await kartaJednejGrupy.getByRole('button', { name: /Podgl[aą]d/, exact: true }).click()
      await okno.getByRole('button', { name: 'Rozwiń wszystkie' }).click()
      assert.match(await okno.innerText(), /Grupa 1 — Zespół 1/)
      assert.doesNotMatch(await okno.innerText(), /Zespół 2|Trener 2|Przerwa 2/)
      await strona.keyboard.press('Escape')
    })
    assert.deepEqual(bledy, [])
  } finally {
    await przegladarka.close()
  }
})
