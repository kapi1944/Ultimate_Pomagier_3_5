import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium: silnikChromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://localhost:5173'

async function przygotujStrone(przegladarka) {
  const kontekst = await przegladarka.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, timezoneId: 'Europe/Warsaw' })
  const strona = await kontekst.newPage()
  const bledy = []
  strona.on('pageerror', (blad) => bledy.push(blad.message))
  await strona.goto(adres)
  await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
  // Dane i operacje dotyczą wyłącznie odizolowanego profilu testowego.
  const identyfikatory = await strona.evaluate(async () => {
    const { poczatkoweDaneFormularza, poczatkowaGrupa, poczatkowiAdresaci } = await import('/src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts')
    const { utworzNowyDokument } = await import('/src/wspolne/dokumenty/modelDokumentu.ts')
    const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
    const { utworzDokumentZeSzczegolow } = await import('/src/wspolne/integracje/szczegolyDoDokumentow/fabrykiDokumentowZeSzczegolow.ts')
    const { utworzNowaPaczkeChecklisty } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts')
    const { pobierzUstawieniaAplikacji, zapiszUstawieniaAplikacji } = await import('/src/aplikacja/ustawienia/magazynUstawienAplikacji.ts')
    const ustawienia = pobierzUstawieniaAplikacji()
    zapiszUstawieniaAplikacji({ ...ustawienia, wyglad: { ...ustawienia.wyglad, skalaInterfejsu: 85 } })
    const dane = { ...structuredClone(poczatkoweDaneFormularza), tytulSzkolenia: 'Dokumenty monitora', nazwaKlienta: 'Klient testowy', wysylkaPaczkiDotyczy: true, opiekunId: '' }
    const grupy = ['A', 'B'].map((litera) => ({ ...structuredClone(poczatkowaGrupa), id: `grupa-${litera}`, nazwa: `Grupa ${litera}`, liczbaUczestnikow: 10, dataOd: '2026-11-10', dataDo: '2026-11-10', miejsce: 'Poznań' }))
    const wersja = { id: 'szczegoly-dokumentow', dokumentId: 'szczegoly-dokumentow', wersja: '1', etykietaWersji: 'Test', nazwa: dane.tytulSzkolenia, dataZapisu: '2026-11-05T10:00:00Z', autorId: 'administrator-kacper-madej', autorNazwa: 'Architekt', dane, grupy, adresaci: poczatkowiAdresaci, statusyPol: {} }
    repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: wersja.id, typ: 'SZCZEGOLY_ORGANIZACYJNE', generatorId: 'szczegoly_organizacyjne', tytul: dane.tytulSzkolenia, daneDokumentu: wersja, ustawieniaDokumentu: {} }))
    const ankieta = utworzDokumentZeSzczegolow(wersja, 'ankieta', 'grupa-A', wersja.autorId).dokument
    const lista = utworzDokumentZeSzczegolow(wersja, 'lista', 'grupa-B', wersja.autorId).dokument
    const checklista = utworzDokumentZeSzczegolow(wersja, 'checklista', 'grupa-A', wersja.autorId).dokument
    const druga = utworzNowaPaczkeChecklisty(checklista.daneDokumentu.paczki, 'Druga paczka')
    repozytoriumWspolnychDokumentow.aktualizuj(checklista.id, { daneDokumentu: { ...checklista.daneDokumentu,
      paczki: [{ ...checklista.daneDokumentu.paczki[0], nazwa: 'Pierwsza paczka' }, druga] } })
    return { ankietaId: ankieta.id, listaId: lista.id, checklistaId: checklista.id }
  })
  await strona.reload()
  const monitor = strona.getByRole('region', { name: 'Paczki do wysłania' })
  await monitor.waitFor()
  return { kontekst, strona, monitor, bledy, ...identyfikatory }
}

function kafelek(rekord, nazwa) { return rekord.locator('.monitor-dokument__kafelek').filter({ hasText: nazwa }) }
async function sprawdzStan(element, stan) { await element.locator(`xpath=self::*[@data-stan="${stan}"]`).waitFor() }

async function potwierdz(panel, ilosc) {
  await panel.getByLabel('Liczba nowych wydrukowanych egzemplarzy', { exact: true }).fill(String(ilosc))
  await panel.getByLabel('Potwierdzam odbiór wskazanej liczby egzemplarzy aktualnej wersji.', { exact: true }).check()
  await panel.getByRole('button', { name: 'Potwierdź wydruk', exact: true }).click()
  await panel.getByText('Zapisano potwierdzenie wydruku.', { exact: true }).waitFor()
}

test('dokumenty monitora: statusy, ilości, korekty, grupy, paczki, wersje i dotyk przy skali 85%', { timeout: 90000 }, async () => {
  const przegladarka = await silnikChromium.launch({ channel: 'chrome', headless: true })
  try {
    const { strona, monitor, bledy, ankietaId, checklistaId } = await przygotujStrone(przegladarka)
    const rekord = monitor.locator('.monitor-wysylek__rekord').filter({ hasText: 'Pierwsza paczka' })
    const drugaPaczka = monitor.locator('.monitor-wysylek__rekord').filter({ hasText: 'Druga paczka' })
    const bezChecklisty = monitor.locator('.monitor-wysylek__rekord').filter({ hasText: 'Grupa B' })
    assert.equal(await rekord.locator('.monitor-dokument__kafelek').count(), 6)
    const ankieta = kafelek(rekord, 'Ankieta')
    await sprawdzStan(kafelek(rekord, 'Program szkolenia'), 'brak')
    await sprawdzStan(ankieta, 'przygotowany')
    await sprawdzStan(kafelek(rekord, 'Lista obecności'), 'brak')
    await sprawdzStan(kafelek(bezChecklisty, 'Lista obecności'), 'przygotowany')
    const kolorBraku = await kafelek(rekord, 'Program szkolenia').evaluate((element) => getComputedStyle(element).borderLeftColor)
    const kolorCzesci = await ankieta.evaluate((element) => getComputedStyle(element).borderLeftColor)
    assert.notEqual(kolorBraku, kolorCzesci)
    await ankieta.focus()
    await strona.keyboard.press('Enter')
    const panel = rekord.locator('.monitor-dokument__panel')
    assert.equal(await ankieta.getAttribute('aria-expanded'), 'true')
    assert.equal(await panel.getByRole('button', { name: 'Potwierdź wydruk', exact: true }).isDisabled(), true)
    await potwierdz(panel, 4)
    await sprawdzStan(ankieta, 'przygotowany')
    assert.match(await ankieta.innerText(), /4 \/ 10/)
    await potwierdz(panel, 6)
    await sprawdzStan(ankieta, 'wydrukowany')
    const kolorPelnego = await ankieta.evaluate((element) => getComputedStyle(element).borderLeftColor)
    assert.notEqual(kolorPelnego, kolorCzesci)
    assert.notEqual(kolorPelnego, kolorBraku)
    assert.match(await kafelek(drugaPaczka, 'Ankieta').innerText(), /0 \/ 10/)
    await sprawdzStan(kafelek(bezChecklisty, 'Ankieta'), 'brak')
    await panel.getByLabel('Wymagana liczba egzemplarzy', { exact: true }).fill('12')
    await panel.getByRole('button', { name: 'Zatwierdź wymagania', exact: true }).click()
    await sprawdzStan(ankieta, 'przygotowany')
    assert.match(await ankieta.innerText(), /Brakuje: 2 egz/)
    await panel.locator('summary').click()
    await panel.getByRole('button', { name: 'Skoryguj ilość', exact: true }).first().click()
    await panel.getByLabel('Poprawna liczba egzemplarzy', { exact: true }).fill('2')
    await panel.getByLabel('Powód korekty', { exact: true }).fill('Dwa egzemplarze poprawne, pozostałe uszkodzone')
    await panel.getByRole('button', { name: 'Zapisz korektę', exact: true }).click()
    await panel.getByText('Zapisano korektę z zachowaniem poprzedniego wpisu.', { exact: true }).waitFor()
    assert.match(await ankieta.innerText(), /6 \/ 12/)
    assert.equal(await panel.locator('.monitor-dokument__historia li').count(), 3)
    await strona.reload()
    await rekord.waitFor()
    assert.match(await ankieta.innerText(), /6 \/ 12/)
    await ankieta.tap()
    await panel.locator('summary').tap()
    assert.equal(await panel.locator('.monitor-dokument__historia li').count(), 3)
    const liczbaPrzed = await strona.evaluate(async () => {
      const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      return repozytoriumWspolnychDokumentow.pobierzHistorie().filter((wpis) => wpis.typ === 'operacja_wydruku').length
    })
    // Ta sama operacja z dwóch kart musi pozostawić jeden wpis.
    const drugaKarta = await strona.context().newPage()
    await drugaKarta.goto(adres)
    async function dopiszRaz(karta) {
      return karta.evaluate(async () => {
        const { pobierzSzczegolyDoChecklisty, pobierzChecklistyPaczek } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
        const { zbudujWysylkiMonitora } = await import('/src/moduly/zamkniete/pulpit/logika/monitorWysylek.ts')
        const { pobierzDokumentyMonitora, zarejestrujWydrukMonitora } = await import('/src/moduly/zamkniete/pulpit/uslugi/dokumentyMonitora.ts')
        const wysylka = zbudujWysylkiMonitora(pobierzSzczegolyDoChecklisty(), pobierzChecklistyPaczek(), {}).find((rekord) => rekord.nazwaPaczki === 'Pierwsza paczka')
        const stan = pobierzDokumentyMonitora([wysylka]).get(wysylka.id).find((dokument) => dokument.rodzaj === 'ankieta')
        await zarejestrujWydrukMonitora(wysylka, stan, { status: 'POTWIERDZONY', liczbaEgzemplarzy: 1, operacjaId: 'test-dwie-karty' }, 'administrator-kacper-madej')
      })
    }
    await Promise.all([dopiszRaz(strona), dopiszRaz(drugaKarta)])
    await drugaKarta.close()
    await ankieta.locator('b').filter({ hasText: '7 / 12' }).waitFor()
    assert.match(await ankieta.innerText(), /7 \/ 12/)
    const liczbaPo = await strona.evaluate(async () => (await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')).repozytoriumWspolnychDokumentow.pobierzHistorie().filter((wpis) => wpis.typ === 'operacja_wydruku').length)
    assert.equal(liczbaPo, liczbaPrzed + 1)
    await strona.evaluate(async (id) => {
      const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(id)
      repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: { ...dokument.daneDokumentu, tekst: dokument.daneDokumentu.tekst + '\nZmieniona treść' } })
    }, ankietaId)
    await sprawdzStan(ankieta, 'przygotowany')
    assert.match(await ankieta.innerText(), /0 \/ 12/)
    await panel.getByRole('button', { name: 'Przywróć dyspozycje', exact: true }).click()
    await ankieta.locator('b').filter({ hasText: '0 / 10' }).waitFor()
    assert.equal(await panel.getByLabel('Wymagana liczba egzemplarzy', { exact: true }).inputValue(), '10')
    await kafelek(rekord, 'Program szkolenia').tap()
    await panel.getByRole('switch', { name: 'Nie dotyczy: nie', exact: true }).tap()
    await panel.getByRole('button', { name: 'Zatwierdź wymagania', exact: true }).tap()
    await sprawdzStan(kafelek(rekord, 'Program szkolenia'), 'nie_dotyczy')
    assert.match(await rekord.innerText(), /DOKUMENTY GOTOWE: 0\/5/)
    await kafelek(bezChecklisty, 'Lista obecności').tap()
    const panelBezChecklisty = bezChecklisty.locator('.monitor-dokument__panel')
    assert.match(await panelBezChecklisty.innerText(), /Najpierw utwórz checklistę paczki/)
    assert.equal(await panelBezChecklisty.getByRole('button', { name: 'Zatwierdź wymagania', exact: true }).isDisabled(), true)
    assert.equal(await panelBezChecklisty.getByRole('button', { name: 'Drukuj brakujące egzemplarze (1)', exact: true }).isDisabled(), true)
    await strona.setViewportSize({ width: 390, height: 844 })
    const geometria = await strona.evaluate(() => ({ skala: getComputedStyle(document.documentElement).getPropertyValue('--ui-skala-interfejsu').trim(), szerokosc: document.documentElement.clientWidth, przewijanie: document.documentElement.scrollWidth }))
    assert.equal(geometria.skala, '0.85')
    assert.ok(geometria.przewijanie <= geometria.szerokosc + 1, 'Strona bez poziomego przewijania przy 390 px i 85%')
    await kafelek(rekord, 'Ankieta').tap()
    assert.equal(await ankieta.getAttribute('aria-expanded'), 'true')
    const zapisChecklisty = await strona.evaluate(async (id) => (await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')).repozytoriumWspolnychDokumentow.pobierzPoId(id).daneDokumentu.paczki.map((paczka) => paczka.statusOperacyjny), checklistaId)
    assert.deepEqual(zapisChecklisty, ['ROBOCZA', 'ROBOCZA'], 'Potwierdzenia dokumentów nie nadają paczki')
    mkdirSync('tmp/monitor-dokumentow', { recursive: true })
    await kafelek(rekord, 'Program szkolenia').scrollIntoViewIfNeeded()
    await strona.screenshot({ path: 'tmp/monitor-dokumentow/telefon-85.png' })
    await strona.setViewportSize({ width: 1440, height: 1000 })
    await rekord.screenshot({ path: 'tmp/monitor-dokumentow/pulpit-85.png' })
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})

test('dodruk otwiera istniejący generator, nie potwierdza druku i respektuje nieaktualność oraz uprawnienia', { timeout: 90000 }, async () => {
  const przegladarka = await silnikChromium.launch({ channel: 'chrome', headless: true })
  try {
    const { strona, monitor, bledy, ankietaId, checklistaId } = await przygotujStrone(przegladarka)
    const rekord = monitor.locator('.monitor-wysylek__rekord').filter({ hasText: 'Pierwsza paczka' })
    const ankieta = kafelek(rekord, 'Ankieta')
    await ankieta.tap()
    await rekord.getByRole('button', { name: 'Drukuj brakujące egzemplarze (10)', exact: true }).click()
    await strona.getByRole('heading', { name: 'Ankiety', exact: true }).waitFor()
    await strona.getByText(/Dodruk z Monitora paczek: 10 egz/).waitFor()
    await strona.evaluate(() => { window.wywolaniaDruku = 0; window.print = () => { window.wywolaniaDruku++; window.dispatchEvent(new Event('afterprint')) } })
    await strona.getByRole('button', { name: 'Drukuj brakujące (10)', exact: true }).click()
    await strona.waitForFunction(() => window.wywolaniaDruku === 1)
    await strona.goto(adres)
    await rekord.waitFor()
    await sprawdzStan(ankieta, 'przygotowany')
    assert.match(await ankieta.innerText(), /0 \/ 10/)
    await ankieta.tap()
    await rekord.locator('.monitor-dokument__historia summary').tap()
    assert.match(await rekord.locator('.monitor-dokument__historia').innerText(), /Zlecenie: 10 egz/)
    await strona.evaluate(async () => {
      const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const dokument = repozytoriumWspolnychDokumentow.pobierzPoId('szczegoly-dokumentow')
      const wersja = dokument.daneDokumentu
      repozytoriumWspolnychDokumentow.aktualizuj(dokument.id, { daneDokumentu: { ...wersja, grupy: wersja.grupy.map((grupa) => ({ ...grupa, liczbaUczestnikow: 15 })) } })
    })
    await ankieta.getByText('⚠ Wymaga aktualizacji', { exact: true }).waitFor()
    const panel = rekord.locator('.monitor-dokument__panel')
    assert.equal(await panel.getByRole('button', { name: 'Drukuj brakujące egzemplarze (15)', exact: true }).isDisabled(), true)
    const wynikBezUprawnien = await strona.evaluate(async () => {
      const { pobierzSzczegolyDoChecklisty, pobierzChecklistyPaczek } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
      const { zbudujWysylkiMonitora } = await import('/src/moduly/zamkniete/pulpit/logika/monitorWysylek.ts')
      const { pobierzDokumentyMonitora, zarejestrujWydrukMonitora } = await import('/src/moduly/zamkniete/pulpit/uslugi/dokumentyMonitora.ts')
      const wysylka = zbudujWysylkiMonitora(pobierzSzczegolyDoChecklisty(), pobierzChecklistyPaczek(), {}).find((rekord) => rekord.nazwaPaczki === 'Pierwsza paczka')
      const stan = pobierzDokumentyMonitora([wysylka]).get(wysylka.id).find((dokument) => dokument.rodzaj === 'ankieta')
      try { await zarejestrujWydrukMonitora(wysylka, stan, { status: 'POTWIERDZONY', liczbaEgzemplarzy: 15, operacjaId: 'bez-uprawnien' }, null); return '' }
      catch (blad) { return blad.message }
    })
    assert.match(wynikBezUprawnien, /Brak uprawnienia/)
    await panel.getByLabel('Sprawdziłem treść w generatorze i jej zgodność z aktualnymi Szczegółami organizacyjnymi.', { exact: true }).check()
    await panel.getByRole('button', { name: 'Potwierdź sprawdzenie aktualności', exact: true }).click()
    await ankieta.getByText('⚠ Wymaga aktualizacji', { exact: true }).waitFor({ state: 'detached' })
    assert.match(await ankieta.innerText(), /0 \/ 15/)
    const odczyt = await strona.evaluate(async (id) => {
      const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      return repozytoriumWspolnychDokumentow.pobierzHistorie(id).filter((wpis) => wpis.typ === 'operacja_wydruku').map((wpis) => wpis.dane.status)
    }, ankietaId)
    assert.deepEqual(odczyt, ['ZLECONY'])
    const zmienionoSesje = await strona.evaluate(async (id) => {
      const { pobierzUzytkownikow, zapiszUzytkownikow } = await import('/src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
      const { rozpocznijSesje } = await import('/src/aplikacja/logowanie/sesjaUzytkownika.ts')
      const { repozytoriumWspolnychDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const konta = pobierzUzytkownikow()
      const konto = konta.find((osoba) => osoba.rola === 'PRACOWNIK' && osoba.status === 'AKTYWNY')
      zapiszUzytkownikow(konta.map((osoba) => osoba.id === konto.id ? { ...osoba, odznaki: [] } : osoba))
      repozytoriumWspolnychDokumentow.aktualizuj(id, { wlascicielId: null })
      return rozpocznijSesje(konto.id)
    }, checklistaId)
    assert.equal(zmienionoSesje, true)
    await strona.reload()
    await rekord.waitFor()
    await ankieta.click()
    assert.equal(await panel.getByRole('button', { name: 'Drukuj brakujące egzemplarze (15)', exact: true }).isDisabled(), true)
    assert.equal(await panel.getByRole('button', { name: 'Zatwierdź wymagania', exact: true }).isDisabled(), true)
    assert.equal(await panel.getByRole('button', { name: 'Potwierdź wydruk', exact: true }).isDisabled(), true)
    await panel.getByText('Druk wymaga uprawnienia eksportu.', { exact: true }).waitFor()
    assert.deepEqual(bledy, [])
  } finally { await przegladarka.close() }
})
