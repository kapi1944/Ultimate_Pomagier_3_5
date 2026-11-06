import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = process.env.POMAGIER_ADRES || 'http://127.0.0.1:5173'

test('kopia E4 zachowuje dane i zdjęcia, odrzuca zmiany i analizuje plik bez zapisu', { timeout: 60000 }, async () => {
  const przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const strona = await przegladarka.newPage()
    await strona.goto(adres)
    const wynik = await strona.evaluate(async () => {
      const { utworzBackupMigracjiE4, sprawdzBackupMigracjiE4 } = await import('/src/wspolne/dane/backupMigracjiE4.ts')
      const { zapiszPlikZdjeciaPaczki } = await import('/src/moduly/dokumenty/generatory/checklisty_paczek/zdjeciaPaczek.ts')
      const { kluczRejestruDokumentow } = await import('/src/wspolne/dokumenty/rejestrDokumentow.ts')
      const nazwaBazy = 'ultimatePomagier.zdjeciaPaczek'
      await utworzBackupMigracjiE4()
      const czyPustaBazaPowstala = (await indexedDB.databases()).some((baza) => baza.name === nazwaBazy)
      const zapis = JSON.stringify({ wersja: 3, dokumenty: [{ id: 'checklista-1', typ: 'CHECKLISTA_PACZKI', daneDokumentu: {
        paczki: [{ id: 'paczka-1' }], zalaczniki: [{ id: 'zdjecie-1', typ: 'ZDJECIE_PACZKI', weryfikacjaPaczki: { paczkaId: 'paczka-1', odcisk: 'zawartosc-1' } }],
      } }], historia: [{ id: 'historia-1' }] })
      const kluczSesji = 'ultimatePomagier.sesjaUzytkownika.v1'
      localStorage.setItem(kluczRejestruDokumentow, zapis)
      localStorage.setItem('test-E4-inny-modul', 'dane modułu')
      localStorage.setItem(kluczSesji, 'sesja-nie-do-eksportu')
      const bajty = atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGOUWBDAwMDAxAAGAAxSAQw3k/N7AAAAAElFTkSuQmCC')
      const plik = new File([Uint8Array.from(bajty, (znak) => znak.charCodeAt(0))], 'paczka.png', { type: 'image/png' })
      await zapiszPlikZdjeciaPaczki(['checklista-1', 'paczka-1', 'zdjecie-1'], plik, 'zawartosc-1')
      await zapiszPlikZdjeciaPaczki(['checklista-1', 'paczka-1', 'zdjecie-archiwalne'], plik, 'starsza-zawartosc')
      const kopia = await utworzBackupMigracjiE4()
      const raport = await sprawdzBackupMigracjiE4(kopia)
      let czyOdrzuconoUszkodzenie = false
      try { await sprawdzBackupMigracjiE4(kopia.replace('dane modułu', 'dane zmienione')) }
      catch (blad) { czyOdrzuconoUszkodzenie = blad.message.includes('suma kontrolna') }

      localStorage.clear()
      const raportPoWyczyszczeniu = await sprawdzBackupMigracjiE4(kopia)
      return {
        czyPustaBazaPowstala, raport, raportPoWyczyszczeniu, czyOdrzuconoUszkodzenie,
        czyKopiaZawieraSesje: kopia.includes('sesja-nie-do-eksportu'),
        czyKopiaZawieraInnyModul: kopia.includes('dane modułu'),
        liczbaKluczyPoAnalizie: localStorage.length,
      }
    })
    assert.equal(wynik.czyPustaBazaPowstala, false)
    assert.deepEqual(wynik.raport, { dokumenty: 1, historia: 1, zdjecia: 2, brakZdjec: 0, zdjeciaArchiwalneLubBezPowiazania: 1 })
    assert.deepEqual(wynik.raportPoWyczyszczeniu, wynik.raport)
    assert.equal(wynik.czyOdrzuconoUszkodzenie, true)
    assert.equal(wynik.czyKopiaZawieraSesje, false)
    assert.equal(wynik.czyKopiaZawieraInnyModul, true)
    assert.equal(wynik.liczbaKluczyPoAnalizie, 0)
  } finally {
    await przegladarka.close()
  }
})
