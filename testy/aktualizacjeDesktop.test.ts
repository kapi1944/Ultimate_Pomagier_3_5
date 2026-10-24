import { test } from 'node:test'
import assert from 'node:assert/strict'
import { czyNowszaWersjaStabilna, pobierzIZainstalujPodpisanaAktualizacje } from '../src/aplikacja/desktop/aktualizacjeDesktop'

test('aktualizuje tylko do wyższej stabilnej wersji, porównując liczby', () => {
  for (const wersja of ['4.0.1', '4.1.0', '4.10.0', '5.0.0']) assert.equal(czyNowszaWersjaStabilna('4.0.0', wersja), true)
  for (const wersja of ['4.0.0', '3.99.99', '4.1.0-rc.1', '4.1.0+dev', 'main', '04.1.0', 'v4.1.0']) assert.equal(czyNowszaWersjaStabilna('4.0.0', wersja), false)
  assert.equal(czyNowszaWersjaStabilna('4.9.0', '4.10.0'), true)
  assert.equal(czyNowszaWersjaStabilna('4.10.0', '4.9.0'), false)
})

test('błąd pobrania lub weryfikacji podpisu uniemożliwia wywołanie instalatora', async () => {
  let wywolanoInstalator = false
  await assert.rejects(pobierzIZainstalujPodpisanaAktualizacje({
    download: async () => { throw new Error('Niepoprawny podpis') },
    install: async () => { wywolanoInstalator = true },
  }), /Niepoprawny podpis/)
  assert.equal(wywolanoInstalator, false)
})

test('instalacja i restart następują dopiero po poprawnym pobraniu z weryfikacją', async () => {
  const kolejnosc: string[] = []
  await pobierzIZainstalujPodpisanaAktualizacje({
    download: async () => { kolejnosc.push('zweryfikowano') },
    install: async (opcje) => { assert.equal(opcje.restartAfterInstall, true); kolejnosc.push('instalacja') },
  })
  assert.deepEqual(kolejnosc, ['zweryfikowano', 'instalacja'])
})
