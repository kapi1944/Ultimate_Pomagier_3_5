import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

test('publikacja i aktualizacja szczegółów z opcjonalnymi danymi umowy', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.goto(`${adres}/szkolenia-zamkniete/szczegoly-organizacyjne/nowe`)
    const wersja = await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { wersjaEksportuSzczegolow } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      return { id: 'test-umowy', wersja: wersjaEksportuSzczegolow, dane: { ...poczatkoweDaneFormularza, status: 'PEŁNE', tytulSzkolenia: 'Szkolenie testowe', nazwaKlienta: 'Klient', opiekunId: 'architekt-systemu', odbiorca: { ...poczatkoweDaneFormularza.odbiorca, nazwa: 'Klient', email: 'klient@example.pl' } }, grupy: [{ ...poczatkowaGrupa, formaSzkolenia: 'Online', miejsce: 'Online', dataOd: '2026-11-01', dataDo: '2026-11-02', liczbaUczestnikow: 5, liczbaGodzin: 8, cenaNetto: 1000, trenerzy: [{ id: 'trener', imieNazwisko: 'Jan Kowalski' }] }], adresaci: poczatkowiAdresaci, statusyPol: {} }
    })
    async function zaladuj(dane) {
      await strona.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(dane)) })
    }
    const publikuj = strona.getByRole('button', { name: 'Opublikuj', exact: true })
    strona.on('dialog', (okno) => okno.accept())
    for (const [indeks, [data, numer]] of [['', ''], ['2026-10-01', ''], ['', 'UM/1'], ['2026-10-01', 'UM/1']].entries()) {
      const dane = structuredClone(wersja)
      dane.id = `test-umowy-${indeks}`
      dane.dokumentId = dane.id
      dane.grupy[0].dataUmowy = data
      dane.grupy[0].numerUmowy = numer
      dane.statusyPol = { ...(!data && { 'grupy.0.dataUmowy': 'niepewne' }), ...(!numer && { 'grupy.0.numerUmowy': 'niepewne' }) }
      await zaladuj(dane)
      assert.equal(await publikuj.isEnabled(), true, `Data: ${data}, numer: ${numer}`)
      await strona.getByRole('button', { name: 'Kontrola jakości', exact: true }).click()
      assert.equal(await publikuj.isEnabled(), true)
      assert.doesNotMatch(await strona.getByLabel('Panel kontroli jakosci', { exact: true }).innerText(), /grupy\.0\.(dataUmowy|numerUmowy)/)
      await publikuj.click()
      await strona.getByText('Opublikowano szczegóły organizacyjne ze statusem OCZEKUJĄCE.').first().waitFor()
      const rekord = await strona.evaluate(async (id) => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')).pobierzOpublikowaneSzczegoly().find((pozycja) => pozycja.id === id), dane.id)
      assert.equal(rekord.status, 'OCZEKUJĄCE')
      assert.equal(rekord.grupy[0].dataUmowy, data)
      assert.equal(rekord.grupy[0].numerUmowy, numer)
      if (indeks === 0) {
        const kopia = await strona.evaluate(async (id) => {
          const magazyn = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
          const rekord = magazyn.pobierzOpublikowaneSzczegoly().find((pozycja) => pozycja.id === id)
          return magazyn.utworzKopieRoboczaZOpublikowanychSzczegolow(rekord, { id: 'architekt-systemu', nazwa: 'Architekt', rola: 'Architekt' })
        }, dane.id)
        assert.equal(kopia.grupy[0].dataUmowy, '')
        assert.equal(kopia.grupy[0].numerUmowy, '')
        assert.equal((await strona.evaluate(async (id) => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')).pobierzOpublikowaneSzczegoly().find((pozycja) => pozycja.id === id), dane.id)).status, 'OCZEKUJĄCE')
        await zaladuj(kopia)
        const rozwin = strona.getByRole('button', { name: 'Rozwiń grupę', exact: true })
        if (await rozwin.count()) await rozwin.click()
        await strona.locator('input[id$="dataUmowy"]').fill('2026-10-01')
        await strona.locator('input[id$="numerUmowy"]').fill('UM/1')
        const zapisz = strona.getByRole('button', { name: 'Zapisz wersję roboczą', exact: true })
        if (await zapisz.count()) await zapisz.click()
        assert.equal(await publikuj.isEnabled(), true)
        assert.equal(await strona.locator('input[id$="dataUmowy"]').inputValue(), '2026-10-01')
        assert.equal(await strona.locator('input[id$="numerUmowy"]').inputValue(), 'UM/1')
        const zapisanaKopia = await strona.evaluate(async (id) => (await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')).pobierzKopieRobocze().find((pozycja) => pozycja.id === id), kopia.id)
        assert.equal(zapisanaKopia.grupy[0].dataUmowy, '2026-10-01')
        assert.equal(zapisanaKopia.grupy[0].numerUmowy, 'UM/1')
      }
    }
    const niekompletna = structuredClone(wersja)
    niekompletna.dane.tytulSzkolenia = ''
    await zaladuj(niekompletna)
    assert.equal(await publikuj.isDisabled(), true)
    const niepoprawna = structuredClone(wersja)
    niepoprawna.grupy[0].dataUmowy = '2026-02-30'
    await zaladuj(niepoprawna)
    assert.equal(await publikuj.isDisabled(), true)
    assert.match(await strona.locator('body').innerText(), /poprawną datę umowy/)
  } finally {
    await przegladarka.close()
  }
})

