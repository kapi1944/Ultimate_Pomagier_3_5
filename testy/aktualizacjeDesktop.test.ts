import { test } from 'node:test'
import assert from 'node:assert/strict'
import { czyNowszaWersjaStabilna, czyZgodnaAktualizacja, pobierzIZainstalujPodpisanaAktualizacje, type KanalAktualizacji } from '../src/aplikacja/desktop/aktualizacjeDesktop'

test('aktualizuje tylko do wyższej stabilnej wersji, porównując liczby', () => {
  for (const wersja of ['4.0.1', '4.1.0', '4.10.0', '5.0.0']) assert.equal(czyNowszaWersjaStabilna('4.0.0', wersja), true)
  for (const wersja of ['4.0.0', '3.99.99', '4.1.0-rc.1', '4.1.0+dev', 'main', '04.1.0', 'v4.1.0']) assert.equal(czyNowszaWersjaStabilna('4.0.0', wersja), false)
  assert.equal(czyNowszaWersjaStabilna('4.9.0', '4.10.0'), true)
  assert.equal(czyNowszaWersjaStabilna('4.10.0', '4.9.0'), false)
})

test('oba kanały wymagają nowszej wersji i jawnej zgodności danych', () => {
  for (const kanal of ['stabilny', 'testowy'] satisfies KanalAktualizacji[]) {
    const metadane = { kanal, zgodnoscDanych: 1, commit: 'a'.repeat(40) }
    assert.equal(czyZgodnaAktualizacja('4.0.0', '4.0.1', metadane, kanal, 1), true)
    for (const wersja of ['4.0.0', '3.99.99', '4.0.1-rc.1']) assert.equal(czyZgodnaAktualizacja('4.0.0', wersja, metadane, kanal, 1), false)
    for (const zmiany of [{ kanal: 'nieznany' }, { kanal: kanal === 'stabilny' ? 'testowy' : 'stabilny' }, { zgodnoscDanych: 2 }, { zgodnoscDanych: undefined }, { commit: '' }]) {
      assert.equal(czyZgodnaAktualizacja('4.0.0', '4.0.1', { ...metadane, ...zmiany }, kanal, 1), false)
    }
  }
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
