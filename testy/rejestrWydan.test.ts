import { test } from 'node:test'
import assert from 'node:assert/strict'
import { odczytajWydania, rozpoznajPlatforme, wybierzNajnowsze, czyStarszeWydanie, pobierzRejestrWydan, sprawdzPlikPrzedPobraniem } from '../src/aplikacja/desktop/rejestrWydan'

const suma = 'a'.repeat(64)
function wydanie(wersja = '4.0.0', testowe = false) {
  const nazwa = `Pomagier_${wersja}.apk`
  const manifest = { schemat: 1, wersja, commit: 'b'.repeat(40), kanal: testowe ? 'testowa' : 'stabilna', pliki: [
    { platforma: 'android', architektura: 'aarch64', nazwa, typ: 'apk', rozmiar: 100, sha256: suma, identyfikator: 'pl.ultimatepomagier.desktop', versionCode: 4000000, podpis: { rodzaj: 'android', certyfikatSha256: 'c'.repeat(64) } },
  ] }
  return { id: 1, tag_name: `v${wersja}`, draft: false, prerelease: testowe, published_at: '2026-10-25T10:00:00Z',
    body: `Opis zmian.\n\n\`\`\`pomagier-wydanie\n${JSON.stringify(manifest)}\n\`\`\``,
    assets: [{ name: nazwa, size: 100, state: 'uploaded', digest: `sha256:${suma}`, browser_download_url: `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/v${wersja}/${nazwa}` }] }
}

test('rozpoznaje system bez blokowania innych platform', () => {
  assert.equal(rozpoznajPlatforme('Mozilla Android 15'), 'android')
  assert.equal(rozpoznajPlatforme('Windows NT 10.0'), 'windows')
  assert.equal(rozpoznajPlatforme('iPhone OS'), 'ios')
  assert.equal(rozpoznajPlatforme('Macintosh'), 'macos')
  assert.equal(rozpoznajPlatforme('Linux'), 'linux')
  assert.equal(rozpoznajPlatforme('nieznany'), 'web')
})

test('akceptuje opublikowany kompletny APK z zgodnym digestem i certyfikatem', () => {
  const pliki = odczytajWydania([wydanie()])
  assert.equal(pliki.length, 1)
  assert.equal(pliki[0].platforma, 'android')
  assert.equal(pliki[0].opis, 'Opis zmian.')
  assert.equal(pliki[0].sha256, suma)
})

test('odrzuca szkice, obce adresy, uszkodzone i niepełne artefakty', () => {
  const wzorzec = wydanie()
  for (const zmiany of [{ draft: true }, { published_at: null }, { body: 'bez manifestu' }, { body: '```pomagier-wydanie\n{\n```' }, { tag_name: 'v9.0.0' }]) {
    assert.equal(odczytajWydania([{ ...wzorzec, ...zmiany }]).length, 0)
  }
  for (const zmiany of [{ digest: 'sha256:inna' }, { digest: null }, { size: 0 }, { size: 99 }, { state: 'new' }, { browser_download_url: 'https://example.test/plik.apk' }]) {
    assert.equal(odczytajWydania([{ ...wzorzec, assets: [{ ...wzorzec.assets[0], ...zmiany }] }]).length, 0)
  }
  assert.equal(odczytajWydania([{ ...wzorzec, body: wzorzec.body.replace('"rodzaj":"android"', '"rodzaj":"debug"') }]).length, 0)
  assert.throws(() => odczytajWydania({ message: 'Unauthorized' }))
})

test('Windows wymaga dostępnego podpisu zgodnego z manifestem', () => {
  const wzorzec = wydanie()
  const body = wzorzec.body.replace('"platforma":"android"', '"platforma":"windows"').replaceAll('.apk', '.exe').replace('"typ":"apk"', '"typ":"exe"').replace('"rodzaj":"android"', `"rodzaj":"tauri","sha256":"${suma}"`)
  const artefakt = { ...wzorzec.assets[0], name: wzorzec.assets[0].name.replace('.apk', '.exe'), browser_download_url: wzorzec.assets[0].browser_download_url.replace('.apk', '.exe') }
  assert.equal(odczytajWydania([{ ...wzorzec, body, assets: [artefakt] }]).length, 0)
  assert.equal(odczytajWydania([{ ...wzorzec, body, assets: [artefakt, { name: `${artefakt.name}.sig`, size: 500, state: 'uploaded', digest: `sha256:${suma}` }] }]).length, 1)
})

test('najnowsza wersja wynika z numeru, testowa nie jest rekomendowana, starsza jest blokowana', () => {
  const pliki = odczytajWydania([wydanie('4.0.0'), wydanie('4.2.0'), wydanie('4.1.0'), wydanie('5.0.0-rc.1', true)])
  assert.equal(wybierzNajnowsze(pliki, 'android')?.wersja, '4.2.0')
  assert.equal(wybierzNajnowsze(pliki, 'windows'), undefined)
  assert.equal(czyStarszeWydanie(pliki[0], pliki, '4.0.0'), true)
  assert.equal(czyStarszeWydanie(pliki[1], pliki, '4.0.0'), false)
  assert.equal(czyStarszeWydanie(pliki[1], pliki, '4.3.0'), true)
})

test('sieć: brak wydań, limit API, paginacja i wycofanie przed pobraniem', async (kontekst) => {
  const atrapa = kontekst.mock.method(globalThis, 'fetch', async () => new Response('[]'))
  assert.deepEqual(await pobierzRejestrWydan(), [])
  assert.equal(atrapa.mock.calls[0].arguments[1]?.credentials, 'omit')
  atrapa.mock.mockImplementation(async () => new Response('{}', { status: 403 }))
  await assert.rejects(pobierzRejestrWydan(), /liczbę zapytań/)
  atrapa.mock.mockImplementation(async () => { throw new TypeError('offline') })
  await assert.rejects(pobierzRejestrWydan(), /offline/)
  let strona = 0
  atrapa.mock.mockImplementation(async () => new Response(JSON.stringify(strona++ === 0 ? Array.from({ length: 100 }, () => wydanie()) : [])))
  assert.equal((await pobierzRejestrWydan()).length, 100)
  assert.equal(strona, 2)
  const plik = odczytajWydania([wydanie()])[0]
  atrapa.mock.mockImplementation(async () => new Response(JSON.stringify(wydanie())))
  await sprawdzPlikPrzedPobraniem(plik)
  atrapa.mock.mockImplementation(async () => new Response(JSON.stringify({ ...wydanie(), draft: true })))
  await assert.rejects(sprawdzPlikPrzedPobraniem(plik), /wycofany/)
})
