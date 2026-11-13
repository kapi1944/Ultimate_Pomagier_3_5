import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Playwright może pochodzić z lokalnego środowiska testowego lub pakietu Codex.
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const opcjePrzegladarki = process.env.POMAGIER_CHROME ? { executablePath: process.env.POMAGIER_CHROME } : { channel: 'chrome' }
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'
const zdjecieTestowe = { name: 'paczka.png', mimeType: 'image/png', buffer: Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGOUWBDAwMDAxAAGAAxSAQw3k/N7AAAAAElFTkSuQmCC', 'base64',
) }

test('ergonomia checklist: tabela, klawiatura, przeciąganie, korekty i macierz rozmiarów', { timeout: 180000 }, async () => {
  const przegladarka = await chromium.launch({ ...opcjePrzegladarki, headless: true })
  try {
    const strona = await przegladarka.newPage({ viewport: { width: 1440, height: 900 } })
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres + '/dokumenty/checklisty-paczek')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Zarządzanie projektami — warsztaty')
    await strona.getByLabel('Liczba uczestników', { exact: true }).fill('6')
    await strona.getByRole('button', { name: 'Zapisz jako roboczą', exact: true }).click()
    const sciezka = strona.url()
    const tabela = strona.getByRole('table', { name: 'Materiały: Materiały', exact: true })
    const pierwsza = tabela.getByRole('textbox').first()
    await pierwsza.fill('')
    await pierwsza.pressSequentially('Prezentacje do szkolenia')
    assert.equal(await pierwsza.inputValue(), 'Prezentacje do szkolenia')
    assert.equal(await pierwsza.evaluate((pole) => document.activeElement === pole), true)
    const ilosc = tabela.getByLabel('Ilość wymagana: Prezentacje do szkolenia', { exact: true })
    await ilosc.fill('8')
    await ilosc.fill('')
    assert.equal(await ilosc.inputValue(), '')
    assert.equal(await ilosc.getAttribute('placeholder'), '6')
    const szczegoly = tabela.getByRole('button', { name: 'Szczegóły: Prezentacje do szkolenia', exact: true })
    assert.equal(await szczegoly.getAttribute('aria-expanded'), 'false')
    await szczegoly.press('Space')
    await tabela.getByLabel('Notatki wewnętrzne', { exact: true }).first().fill('Zachowaj szczegóły podczas edycji')
    assert.equal(await szczegoly.getAttribute('aria-expanded'), 'true')
    await szczegoly.press('Enter')
    const uchwyt = tabela.getByRole('button', { name: 'Zmień kolejność: Prezentacje do szkolenia', exact: true })
    await uchwyt.focus()
    await uchwyt.press('Alt+ArrowDown')
    assert.equal(await tabela.getByRole('textbox').nth(1).inputValue(), 'Prezentacje do szkolenia')
    assert.equal(await uchwyt.evaluate((pole) => document.activeElement === pole), true)
    await uchwyt.dragTo(tabela.getByRole('button', { name: 'Zmień kolejność: Materiały dodatkowe', exact: true }))
    assert.equal(await tabela.getByRole('textbox').nth(2).inputValue(), 'Prezentacje do szkolenia')
    await strona.getByRole('button', { name: 'Dodaj materiał: Teczki', exact: true }).click()
    await strona.getByLabel('Nowa pozycja w kategorii Teczki', { exact: true }).fill('Dodatkowa teczka')
    await strona.getByLabel('Nowa pozycja w kategorii Teczki', { exact: true }).press('Enter')
    const teczki = strona.getByRole('table', { name: 'Materiały: Teczki', exact: true })
    assert.equal(await teczki.getByRole('textbox').count(), 2)
    await teczki.getByRole('button', { name: 'Akcje: Dodatkowa teczka', exact: true }).click()
    await teczki.getByRole('button', { name: 'Usuń: Dodatkowa teczka', exact: true }).click()
    assert.equal(await teczki.getByRole('textbox').count(), 1)
    await strona.getByRole('button', { name: 'Zapisz jako roboczą', exact: true }).click()
    await strona.reload()
    assert.equal(strona.url(), sciezka)
    assert.equal(await tabela.getByRole('textbox').nth(2).inputValue(), 'Prezentacje do szkolenia')
    await strona.getByRole('button', { name: 'Etykiety paczek', exact: true }).click()
    const korekta = strona.getByRole('table', { name: 'Korekta materiałów na etykiecie', exact: true })
    const nazwaEtykiety = korekta.getByRole('textbox').first()
    const nazwaZrodla = await nazwaEtykiety.inputValue()
    await nazwaEtykiety.fill('Treść tylko na etykiecie')
    await nazwaEtykiety.press('Tab')
    await korekta.getByRole('spinbutton').first().fill('9')
    await korekta.getByRole('spinbutton').first().press('Tab')
    await strona.getByRole('button', { name: 'Edycja checklisty', exact: true }).click()
    assert.equal(await strona.getByRole('textbox', { name: 'Materiał lub element', exact: true }).first().inputValue(), nazwaZrodla)
    await strona.getByRole('button', { name: 'Etykiety paczek', exact: true }).click()
    assert.equal(await korekta.getByRole('textbox').first().inputValue(), 'Treść tylko na etykiecie')
    assert.equal(await korekta.getByRole('spinbutton').first().inputValue(), '9')
    await strona.getByRole('button', { name: 'Cała strona', exact: true }).click()
    await strona.getByRole('button', { name: 'Powiększ: Podgląd etykiety', exact: true }).click()
    await strona.getByRole('button', { name: 'Pomniejsz: Podgląd etykiety', exact: true }).click()

    await strona.getByRole('button', { name: 'Edycja checklisty', exact: true }).click()
    const dlugaNazwa = 'Materiały szkoleniowe — '.repeat(8).trim()
    const poleNazwy = tabela.getByRole('textbox').nth(2)
    await poleNazwy.fill(dlugaNazwa)
    await poleNazwy.press('End')
    assert.equal(await poleNazwy.inputValue(), dlugaNazwa)
    assert.equal(await poleNazwy.evaluate((pole) => pole.selectionStart), dlugaNazwa.length)
    const wyniki = []
    await mkdir('tmp/checklisty-ux', { recursive: true })
    for (const [szerokosc, wysokosc] of [[1920,1080], [1440,900], [1366,768], [1280,720], [1024,768], [768,1024], [390,844]]) {
      await strona.setViewportSize({ width: szerokosc, height: wysokosc })
      for (const skala of [75,85,100,125,150]) {
        await strona.evaluate(async (skala) => {
          const { zastosujSkaleInterfejsu } = await import('/src/aplikacja/ustawienia/skalaInterfejsu.ts')
          await zastosujSkaleInterfejsu(Math.min(skala, 125))
          // Aplikacja ogranicza skalę do 130%; 150% sprawdzamy jako symulację CSS zoom.
          if (skala === 150) {
            document.documentElement.style.setProperty('--ui-skala-przegladarki', '1.5')
            document.documentElement.style.setProperty('--ui-skala-interfejsu', '1.5')
          }
        }, skala)
        for (const [etap, przycisk] of [['edycja', 'Edycja checklisty'], ['kompletowanie', 'Kompletowanie paczki'], ['etykiety', 'Etykiety paczek']]) {
          await strona.getByRole('button', { name: przycisk, exact: true }).click()
          await strona.locator('.checklista-paczki > header').evaluate((element) => element.scrollIntoView({ block: 'start' }))
          await strona.getByRole('button', { name: etap === 'etykiety' ? 'Cała strona' : 'Do szerokości', exact: true }).click()
          await strona.waitForTimeout(80)
          const geometria = await strona.locator('.checklista-paczki').evaluate((element) => ({
            szerokosc: element.clientWidth, przewijanie: element.scrollWidth,
            szerokoscStrony: document.documentElement.clientWidth, przewijanieStrony: document.documentElement.scrollWidth,
          }))
          assert.ok(geometria.przewijanie <= geometria.szerokosc + 2, `${etap}: ${szerokosc}px, ${skala}% — przepełnienie modułu ${JSON.stringify(geometria)}`)
          if (etap === 'edycja') {
            geometria.tabele = await strona.locator('.checklista-paczki__kontener-tabeli').evaluateAll((kontenery) => kontenery.map((kontener) => {
              const tabela = kontener.querySelector('table')
              const wiersz = tabela.querySelector('.checklista-paczki__material')
              const granice = kontener.getBoundingClientRect()
              return {
                przewijanie: kontener.scrollWidth - kontener.clientWidth,
                kolumny: tabela.querySelectorAll('th').length,
                uklad: wiersz ? getComputedStyle(wiersz).display : null,
                nazwa: tabela.querySelector('th:nth-child(2)').offsetWidth,
                mieszczaSie: [...(wiersz?.cells ?? [])].every((komorka) => komorka.getBoundingClientRect().right <= granice.right + 1),
              }
            }))
            for (const pomiar of geometria.tabele) {
              const kontekst = `${szerokosc}px, ${skala}% — ${JSON.stringify(pomiar)}`
              assert.ok(pomiar.przewijanie <= 1 && pomiar.mieszczaSie, kontekst)
              assert.equal(pomiar.kolumny, 6, kontekst)
              if (pomiar.uklad === 'table-row') assert.ok(pomiar.nazwa >= 200 && pomiar.nazwa <= 280, kontekst)
              if (szerokosc >= 1280 && skala === 100 && pomiar.uklad) assert.equal(pomiar.uklad, 'table-row', kontekst)
            }
          }
          if (geometria.przewijanieStrony > geometria.szerokoscStrony + 2) {
            geometria.przewijanieSamejPowloki = await strona.locator('.checklista-paczki').evaluate((element) => {
              const poprzedni = element.style.display
              element.style.display = 'none'
              const szerokosc = document.documentElement.scrollWidth
              element.style.display = poprzedni
              return szerokosc
            })
            assert.ok(geometria.przewijanieStrony <= geometria.przewijanieSamejPowloki + 2, `${etap}: moduł poszerza całą stronę ${JSON.stringify(geometria)}`)
          }
          const etykieta = strona.locator('[data-wybrana="true"] [data-etykieta]')
          if (etap === 'etykiety') {
            const proporcje = await etykieta.evaluate((element) => { const granice = element.getBoundingClientRect(); return granice.width / granice.height })
            assert.ok(Math.abs(proporcje - 2 / 3) < .005)
          }
          const zrzut = `tmp/checklisty-ux/${szerokosc}-${skala}-${etap}.png`
          await strona.screenshot({ path: zrzut })
          wyniki.push({ szerokosc, wysokosc, skala, etap, ...geometria, zrzut })
        }
      }
    }
    await writeFile('tmp/checklisty-ux/wyniki.json', JSON.stringify(wyniki, null, 2))
    assert.equal(wyniki.length, 105)
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('etykiety: format PDF, trzy paczki, trzy cele, logowanie i ponowny druk', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ ...opcjePrzegladarki, headless: true })
  try {
    const strona = await przegladarka.newPage({ acceptDownloads: true, viewport: { width: 1366, height: 950 } })
    strona.setDefaultTimeout(12000)
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    const dane = await strona.evaluate(async () => {
      const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
      const { zapiszWersjeRobocza } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
      const { utworzDokumentZeSzczegolow } = await import('/src/wspolne/integracje/szczegolyDoDokumentow/fabrykiDokumentowZeSzczegolow.ts')
      const { pobierzChecklistePaczki, zapiszChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      const { duplikujPaczkeChecklisty } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts')
      const tytul = 'Zarządzanie projektami i bezpieczeństwo procesów — warsztaty dla zespołów operacyjnych i administracji'
      const wersja = { id: 'szczegoly-etykiet', dokumentId: 'szczegoly-etykiet', wersja: 'test', etykietaWersji: 'Test', nazwa: tytul, dataZapisu: new Date().toISOString(), autorId: 'administrator-kacper-madej', autorNazwa: 'Architekt',
        dane: { ...structuredClone(poczatkoweDaneFormularza), tytulSzkolenia: tytul, kodSzkolenia: 'IIST-311', organizator: 'IIST', wysylkaPaczkiDotyczy: true,
          odbiorcaPaczki: { ...poczatkoweDaneFormularza.odbiorcaPaczki, informacjaNaEtykiecie: 'Otwierać ostrożnie.' } },
        grupy: ['Alfa', 'Beta'].map((nazwa, indeks) => ({ ...structuredClone(poczatkowaGrupa), id: 'grupa-' + nazwa, nazwa: 'Grupa ' + nazwa, miejsce: 'Poznań', dataOd: '2026-11-09', dataDo: '2026-11-10', liczbaUczestnikow: 12 + indeks })),
        adresaci: poczatkowiAdresaci, statusyPol: {} }
      zapiszWersjeRobocza(wersja)
      const ankieta = utworzDokumentZeSzczegolow(wersja, 'ankieta', 'grupa-Beta', wersja.autorId).dokument
      const innaGrupa = utworzDokumentZeSzczegolow(wersja, 'lista', 'grupa-Alfa', wersja.autorId).dokument
      const checklista = utworzDokumentZeSzczegolow(wersja, 'checklista', 'grupa-Beta', wersja.autorId).dokument
      const dokument = pobierzChecklistePaczki(checklista.id)
      const pierwotne = { ...dokument.daneDokumentu,
        pozycje: dokument.daneDokumentu.pozycje.filter((pozycja) => ['Ankiety', 'Karta na drzwi'].includes(pozycja.nazwa)) }
      const paczkaId = pierwotne.paczki[0].id
      const dwie = duplikujPaczkeChecklisty(pierwotne, paczkaId)
      const trzy = duplikujPaczkeChecklisty(dwie, paczkaId)
      trzy.paczki[1].nazwa = 'Druga paczka szkoleniowa'
      trzy.paczki[2].nazwa = 'Trzecia paczka szkoleniowa'
      zapiszChecklistePaczki(dokument.id, trzy, wersja.autorId)
      return { dokumentId: dokument.id, drugaId: trzy.paczki[1].id, ankietaId: ankieta.id, innaGrupaId: innaGrupa.id, tytul }
    })
    const sciezka = '/dokumenty/checklisty-paczek/' + dane.dokumentId
    await strona.goto(adres + sciezka)
    await strona.getByRole('button', { name: 'Etykiety paczek', exact: true }).click()
    const panel = strona.getByRole('region', { name: 'Etykiety paczek', exact: true })
    const strony = panel.locator('[data-etykieta]')
    assert.equal(await strony.count(), 3)
    assert.match(await strony.nth(1).innerText(), /2 \/ 3[\s\S]*Grupa Beta[\s\S]*Uczestnicy: 13/)
    assert.match(await strony.first().innerText(), /13 szt\.[\s\S]*2 szt\./)
    assert.match(await strony.first().innerText(), /IIST-311/)
    assert.equal(await strony.first().getAttribute('data-tryb'), 'termiczny')
    assert.equal(await strony.first().getByRole('img', { name: 'IIST' }).count(), 1)
    await panel.getByLabel('Tryb druku', { exact: true }).selectOption('kolorowy')
    assert.equal(await strony.first().getAttribute('data-tryb'), 'kolorowy')
    await panel.getByLabel('Tryb druku', { exact: true }).selectOption('termiczny')
    await panel.getByLabel('Dodaj testowe QR w lokalnej przeglądarce', { exact: true }).check()
    assert.equal(await strony.nth(1).locator('.etykieta-paczki__qr').count(), 3)
    assert.equal(await strony.nth(1).locator('.etykieta-paczki__qr').evaluateAll((pola) => {
      const geometria = pola.map((pole) => pole.getBoundingClientRect())
      return geometria.every((pole) => pole.y === geometria[0].y && Math.abs(pole.width / geometria[0].width - 1) < 0.001)
    }), true)

    async function pobierzPdf(nazwa, szerokosc, wysokosc, liczbaStron) {
      const [pobrany] = await Promise.all([strona.waitForEvent('download'), panel.getByRole('button', { name: nazwa, exact: true }).click()]).catch(async (blad) => {
        throw new Error(`Eksport ${szerokosc} × ${wysokosc}: ${(await panel.getByRole('alert').allTextContents()).join(' ')}`, { cause: blad })
      })
      const bajty = await readFile(await pobrany.path())
      const pdf = await PDFDocument.load(bajty)
      assert.equal(pdf.getPageCount(), liczbaStron)
      for (const stronaPdf of pdf.getPages()) {
        assert.ok(Math.abs(stronaPdf.getWidth() * 25.4 / 72 - szerokosc) < 0.01)
        assert.ok(Math.abs(stronaPdf.getHeight() * 25.4 / 72 - wysokosc) < 0.01)
      }
      return bajty
    }
    const pdf = await pobierzPdf('Pobierz PDF wszystkich etykiet', 100, 150, 3)
    await mkdir('tmp/pdfs', { recursive: true })
    await writeFile('tmp/pdfs/etykiety-test.pdf', pdf)
    await panel.getByLabel('Format etykiety', { exact: true }).selectOption('100')
    await pobierzPdf('Pobierz PDF etykiety', 100, 100, 1)
    await panel.getByLabel('Format etykiety', { exact: true }).selectOption('wlasny')
    await panel.getByLabel('Szerokość (mm)', { exact: true }).fill('125')
    await panel.getByLabel('Wysokość (mm)', { exact: true }).fill('90')
    await pobierzPdf('Pobierz PDF etykiety', 125, 90, 1)
    if (!await panel.locator('.etykiety-paczek__korekta').getAttribute('open').then((wartosc) => wartosc !== null)) await panel.getByText('Korekta treści do wydruku', { exact: true }).click()
    await panel.getByLabel('Kod szkolenia', { exact: true }).fill('POZ-311')
    await panel.getByLabel('Kod szkolenia', { exact: true }).press('Tab')
    await panel.getByRole('alert').filter({ hasText: 'Nieaktualna etykieta' }).waitFor()
    assert.match(await strony.first().innerText(), /POZ-311/)
    await panel.getByLabel('Uwagi etykiety', { exact: true }).fill('Bardzo długie uwagi do wydruku. '.repeat(120))
    await panel.getByLabel('Uwagi etykiety', { exact: true }).press('Tab')
    await panel.getByRole('alert').filter({ hasText: 'Wybierz wyższy format dla paczek' }).waitFor()
    assert.equal(await panel.getByRole('button', { name: 'Pobierz PDF etykiety', exact: true }).isDisabled(), true)
    await panel.getByLabel('Paczka', { exact: true }).selectOption(dane.drugaId)
    const cele = Object.fromEntries(await panel.getByRole('navigation', { name: 'Cele etykiety' }).getByRole('link').evaluateAll((linki) =>
      linki.map((link) => [link.textContent, link.href])))
    assert.equal(new Set(Object.values(cele)).size, 3)

    await strona.evaluate(() => localStorage.removeItem('ultimatePomagier.sesjaUzytkownika.v1'))
    await strona.goto(cele.Kompletowanie)
    const logowanie = strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true })
    await logowanie.waitFor()
    assert.equal(await strona.getByRole('region', { name: 'Panel kompletowania', exact: true }).count(), 0)
    await logowanie.click()
    await strona.getByRole('region', { name: 'Kompletowanie: Druga paczka szkoleniowa', exact: true }).waitFor()
    assert.equal(strona.url(), cele.Kompletowanie)
    await strona.goto(cele.Szczegóły)
    const szczegoly = strona.getByRole('dialog')
    await szczegoly.waitFor()
    assert.match(await szczegoly.innerText(), /Grupa Beta/)
    assert.doesNotMatch(await szczegoly.innerText(), /Grupa Alfa/)
    await strona.goto(cele.Materiały)
    await strona.getByRole('heading', { name: 'Materiały paczki', exact: true }).waitFor()
    await strona.getByRole('button', { name: 'Przygotuj zestaw dokumentów', exact: true }).click()
    const pakiet = strona.getByRole('region', { name: 'Dokumenty do zatwierdzenia' })
    await pakiet.getByText('Grupa z etykiety: Grupa Beta', { exact: true }).waitFor()
    assert.doesNotMatch(await pakiet.innerText(), /Grupa Alfa/)
    await pakiet.getByText(/Brakujące dokumenty/).waitFor()
    const materialy = strona.getByRole('region', { name: 'Dokumenty i wydruki', exact: true })
    await materialy.getByRole('button', { name: /Ankieta/ }).click()
    await materialy.getByLabel('Liczba egzemplarzy do druku', { exact: true }).fill('3')
    await materialy.getByRole('button', { name: 'Drukuj ponownie', exact: true }).click()
    const operacja = await strona.waitForFunction(async (id) => {
      const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      return repozytoriumWspolnychDokumentow.pobierzHistorie(id).find((wpis) => wpis.typ === 'operacja_wydruku')?.dane
    }, dane.ankietaId)
    assert.equal((await operacja.jsonValue()).liczbaEgzemplarzy, 3)

    await strona.goto(cele.Kompletowanie.replace(dane.drugaId, 'brakujaca'))
    await strona.getByText('Nie znaleziono paczki wskazanej na etykiecie.', { exact: true }).waitFor()
    const inneUrzadzenie = await przegladarka.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await inneUrzadzenie.goto(cele.Materiały)
    await inneUrzadzenie.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await inneUrzadzenie.getByText('Nie znaleziono checklisty w tym profilu przeglądarki.', { exact: true }).waitFor()
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('checklisty: bezpośrednie wejście przy quota zachowuje formularz, shell i istniejący dokument', { timeout: 30000 }, async () => {
  const przegladarka = await chromium.launch({ ...opcjePrzegladarki, headless: true })
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
  const przegladarka = await chromium.launch({ ...opcjePrzegladarki, headless: true })
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
    await strona.getByText('Parametry logistyczne', { exact: true }).click()
    await strona.getByLabel('przewoznik', { exact: true }).fill('Kurier testowy')
    await strona.getByLabel('numerPrzesylki', { exact: true }).fill('TEST-123')
    await strona.getByLabel('Nowa pozycja', { exact: true }).fill('Pozycja testowa')
    await strona.getByRole('button', { name: 'Dodaj pozycję', exact: true }).click()
    const polaPozycji = strona.getByRole('textbox', { name: 'Materiał lub element', exact: true })
    await strona.locator('input[value="Pozycja testowa"]').fill('Pozycja po edycji')
    assert.equal(await polaPozycji.count(), 12)
    await strona.getByRole('button', { name: 'Akcje: Pozycja po edycji', exact: true }).click()
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
  const przegladarka = await chromium.launch({ ...opcjePrzegladarki, headless: true })
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
    await pozycja.getByText('Szczegóły dyspozycji', { exact: true }).click()
    await pozycja.getByRole('button', { name: 'Potwierdź ilość: 30', exact: true }).click()
    assert.equal(await potwierdzenie.isEnabled(), true)
    await potwierdzenie.click()
    assert.equal(await panel.getByRole('progressbar').getAttribute('value'), '100')
    assert.equal(await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).isDisabled(), true)
    await panel.getByLabel('Zdjęcie gotowej paczki', { exact: true }).setInputFiles(zdjecieTestowe)
    await panel.getByRole('link', { name: 'Otwórz zapisane zdjęcie paczki' }).waitFor()
    const gotowaBezPliku = await strona.evaluate(async ({ dokumentId, pierwsza }) => {
      const { pobierzChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      const { usunPlikZdjeciaPaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/zdjeciaPaczek.ts')
      const { zatwierdzGotowoscPaczki } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const zdjecie = pobierzChecklistePaczki(dokumentId).daneDokumentu.zalaczniki.at(-1)
      await usunPlikZdjeciaPaczki([dokumentId, pierwsza, zdjecie.id])
      return await zatwierdzGotowoscPaczki(dokumentId, pierwsza)
    }, identyfikatory)
    assert.equal(gotowaBezPliku, null)
    await panel.getByLabel('Zdjęcie gotowej paczki', { exact: true }).setInputFiles(zdjecieTestowe)
    await panel.getByRole('link', { name: 'Otwórz zapisane zdjęcie paczki' }).waitFor()
    await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).click()
    await panel.getByText('Status operacyjny: Gotowa', { exact: true }).waitFor()
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
    assert.equal(await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).isDisabled(), true)
    await panel.getByLabel('Zdjęcie gotowej paczki', { exact: true }).setInputFiles(zdjecieTestowe)
    await panel.getByRole('link', { name: 'Otwórz zapisane zdjęcie paczki' }).waitFor()
    await panel.getByRole('button', { name: 'Oznacz paczkę jako gotową', exact: true }).click()
    await panel.getByText('Status operacyjny: Gotowa', { exact: true }).waitFor()
    const stan = await strona.evaluate(async (id) => {
      const { pobierzChecklistePaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      return pobierzChecklistePaczki(id).daneDokumentu
    }, identyfikatory.dokumentId)
    assert.equal(stan.statusChecklisty, 'KOPIA_ROBOCZA')
    assert.equal(stan.paczki[1].statusOperacyjny, 'ROBOCZA')
    assert.equal(stan.paczki[1].parametryLogistyczne.numerPrzesylki, 'ZACHOWAJ-123')
    assert.equal(stan.historia.at(-1).paczkaId, identyfikatory.pierwsza)
    assert.equal(stan.historia.filter((wpis) => wpis.potwierdzeniePaczki).length, 2)
    assert.equal(new Set(stan.historia.filter((wpis) => wpis.potwierdzeniePaczki).map((wpis) => wpis.potwierdzeniePaczki.zdjecieId)).size, 2)
    assert.equal(stan.historia.at(-1).uzytkownikId, 'administrator-kacper-madej')
    assert.ok(stan.zalaczniki.every((zalacznik) => zalacznik.dane === '' && zalacznik.weryfikacjaPaczki.paczkaId === identyfikatory.pierwsza))
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
  const przegladarka = await chromium.launch({ ...opcjePrzegladarki, headless: true })
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

test('checklista A4: bezpośredni druk, anulowanie, wersje i niezależny PDF', { timeout: 120000 }, async () => {
  const przegladarka = await chromium.launch({ ...opcjePrzegladarki, headless: true })
  try {
    const strona = await przegladarka.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
    await strona.addInitScript(() => {
      window.liczbaDrukow = 0
      window.print = () => {
        if (window.bladDruku) throw new Error('Testowy błąd drukowania')
        window.liczbaDrukow++
      }
      window.potwierdzeniaDruku = 0
      window.confirm = () => { window.potwierdzeniaDruku++; return window.potwierdzonoDruk === true }
      window.addEventListener('afterprint', (zdarzenie) => {
        if (window.tworzenieProbkiPdf) zdarzenie.stopImmediatePropagation()
      }, true)
    })
    let pobrania = 0
    strona.on('download', () => pobrania++)
    await strona.goto(adres + '/dokumenty/checklisty-paczek')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.getByLabel('Tytuł szkolenia', { exact: true }).fill('Test wydruku A4')
    await strona.getByLabel('Liczba uczestników', { exact: true }).fill('6')
    await strona.getByRole('button', { name: 'Zapisz jako roboczą', exact: true }).click()
    const drukuj = strona.getByRole('button', { name: 'Drukuj', exact: true })
    const podglad = strona.locator('#wydruk-checklisty')
    const stan = () => strona.evaluate(() => localStorage.getItem('ultimatePomagier.rejestrDokumentow.v1'))
    const odczytajPdf = async (bajty) => {
      const dokument = await PDFDocument.load(bajty)
      for (const kartka of dokument.getPages()) {
        assert.ok(Math.abs(kartka.getWidth() - 595.28) < 2 && Math.abs(kartka.getHeight() - 841.89) < 2)
      }
      return dokument.getPageCount()
    }
    const drukujDoPdf = async (numer, nazwa) => {
      await drukuj.click()
      await strona.waitForFunction((wartosc) => window.liczbaDrukow === wartosc, numer)
      assert.equal(await drukuj.isDisabled(), true)
      await strona.emulateMedia({ media: 'print' })
      assert.equal(await podglad.getAttribute('data-cel-druku-dokumentu'), '')
      assert.equal(await strona.getByText('Edycja checklisty', { exact: true }).isVisible(), false)
      assert.deepEqual(await podglad.evaluate((element) => [
        getComputedStyle(element).fontSize,
        getComputedStyle(element.querySelector('table')).fontSize,
      ]), ['14px', '12.6667px'])
      await strona.evaluate(() => { window.tworzenieProbkiPdf = true })
      const bajty = await strona.pdf({ preferCSSPageSize: true, printBackground: true })
      await strona.evaluate(() => { window.tworzenieProbkiPdf = false })
      await mkdir('tmp/checklisty-ux', { recursive: true })
      await writeFile('tmp/checklisty-ux/' + nazwa + '.pdf', bajty)
      await strona.emulateMedia({ media: 'screen' })
      const liczbaStron = await odczytajPdf(bajty)
      const odczyt = getDocument({ data: new Uint8Array(bajty) })
      const dokument = await odczyt.promise
      const strony = []
      try {
        for (let numer = 1; numer <= liczbaStron; numer++) {
          const kartka = await dokument.getPage(numer)
          const { items: tekst } = await kartka.getTextContent()
          assert.ok(tekst.some((element) => element.str?.trim()), `Pusta strona ${numer}`)
          strony.push(tekst)
        }
      } finally { await odczyt.destroy() }
      const pola = strony.flat()
      const tytul = pola.find((element) => element.str === 'Test wydruku A4')
      assert.ok(Math.abs(tytul.transform[3] - 9.5) < 0.1)
      assert.ok(pola.find((element) => element.str === 'Nazwa szkolenia:').transform[4] >= 9 * 72 / 25.4 - 1)
      assert.ok(!pola.some((element) => /Pobierz PDF|Edycja checklisty|Kompletowanie paczki/.test(element.str)))
      return strony.map((tekst) => tekst.map((element) => element.str).join(' '))
    }
    const zamknijDruk = async (potwierdz) => {
      await strona.evaluate((potwierdzenie) => {
        window.potwierdzonoDruk = potwierdzenie
        window.dispatchEvent(new Event('afterprint'))
      }, potwierdz)
      await strona.waitForFunction(() => window.potwierdzeniaDruku === window.liczbaDrukow && !document.querySelector('[data-cel-druku-dokumentu]'))
      assert.equal(await drukuj.isEnabled(), true)
    }

    const stanPrzed = await stan()
    assert.ok(stanPrzed)
    await strona.evaluate(() => { window.bladDruku = true })
    await drukuj.click()
    await strona.getByRole('alert').filter({ hasText: 'Testowy błąd drukowania' }).waitFor()
    assert.equal(await podglad.getAttribute('data-cel-druku-dokumentu'), null)
    assert.equal(await stan(), stanPrzed)
    await strona.evaluate(() => { window.bladDruku = false })
    assert.equal((await drukujDoPdf(1, 'druk-jednej-paczki')).length, 1)
    await zamknijDruk(false)
    assert.equal(await stan(), stanPrzed)
    assert.equal(pobrania, 0)

    await strona.getByLabel('Nowa paczka', { exact: true }).fill('Druga paczka')
    await strona.getByRole('button', { name: 'Dodaj paczkę', exact: true }).click()
    assert.equal(await podglad.getByRole('heading', { name: 'Druga paczka' }).count(), 1)
    const dwiePaczki = await drukujDoPdf(2, 'druk-dwoch-paczek')
    assert.match(dwiePaczki.join(' '), /Druga paczka/)
    await zamknijDruk(false)

    const paczka = strona.locator('.checklista-paczki__paczka').first()
    for (let numer = 1; numer <= 24; numer++) {
      await paczka.getByLabel('Nowa pozycja', { exact: true }).fill('Materiał dodatkowy ' + numer)
      await paczka.getByRole('button', { name: 'Dodaj pozycję', exact: true }).click()
    }
    await paczka.getByRole('button', { name: 'Szczegóły: Materiał dodatkowy 24', exact: true }).click()
    await paczka.getByLabel('Uwagi drukowane', { exact: true }).filter({ visible: true }).fill('Długa uwaga do materiału. '.repeat(30) + 'Koniec uwag.')
    const dlugaChecklista = await drukujDoPdf(3, 'druk-dlugiej-checklisty')
    assert.ok(dlugaChecklista.length > 1)
    assert.match(dlugaChecklista[0], /Materiał dodatkowy 1\b/)
    assert.match(dlugaChecklista.join(' '), /Materiał dodatkowy 24\b.*Koniec uwag\./)
    await zamknijDruk(true)
    assert.match(await strona.locator('.checklista-paczki__status-checklisty').innerText(), /WYDRUKOWANA/)
    assert.equal(pobrania, 0)

    const pobieranie = strona.waitForEvent('download')
    await strona.getByRole('button', { name: 'Pobierz PDF', exact: true }).click()
    const bajty = await readFile(await (await pobieranie).path())
    assert.ok(await odczytajPdf(bajty) > 1)
    await writeFile('tmp/checklisty-ux/pobrana-dluga-checklista.pdf', bajty)
    await strona.getByText('Załączniki i historia', { exact: true }).click()
    assert.equal(await strona.getByText(/^Wydruk v1:/).count(), 1)
    assert.equal(await strona.getByText(/Wydruk v2:/).count(), 0)
    assert.equal(await strona.getByText(/Utworzono PDF w wersji v01/).count(), 1)
  } finally { await przegladarka.close() }
})
