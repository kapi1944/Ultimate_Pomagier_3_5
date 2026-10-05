import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { pobierzStanDanych, sprawdzSerwer, pobierzKonfiguracjeSerwera } from '../launcher/sprawdzStan.mjs'

test('brak dostępu do danych przeglądarki nie jest raportowany jako brak operacji', () => {
  const stan = pobierzStanDanych()
  assert.equal(stan.pending, null)
  assert.equal(stan.status, 'niedostepny')
  assert.equal(stan.synchronizacjaZdalna, false)
  assert.equal(stan.warnings.length, 2)
})

test('rozpoznaje rzeczywistego Vite, odrzuca inną instalację i zatrzymany serwer', async () => {
  const konfiguracja = await pobierzKonfiguracjeSerwera()
  const serwer = await createServer({ logLevel: 'silent', server: { port: 0, host: 'localhost', open: false } })
  try {
    await serwer.listen()
    const adres = serwer.resolvedUrls.local[0]
    const stan = { ...konfiguracja, adres }
    assert.equal(await sprawdzSerwer(stan), true)
    assert.equal(await sprawdzSerwer({ ...stan, identyfikator: 'inna-instalacja' }), false)
    await serwer.close()
    assert.equal(await sprawdzSerwer(stan), false)
  } finally { await serwer.close() }
})
