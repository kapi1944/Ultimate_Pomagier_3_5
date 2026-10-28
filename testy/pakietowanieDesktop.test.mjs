import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { mkdtemp, writeFile, rm, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import Ajv from 'ajv'
import { przygotujKonfiguracjeWydania, nazwaInstalatora, adresKanalowWydan } from '../skrypty/budujDesktop.mjs'
import { okreslTrybFrontendu, sprawdzManifestProdukcyjny, sprawdzFrontendDesktop } from '../skrypty/kontrolaTrybuFrontendu.mjs'

const odczytaj = (sciezka) => JSON.parse(readFileSync(new URL(`../${sciezka}`, import.meta.url), 'utf8'))
const konfiguracja = odczytaj('src-tauri/tauri.conf.json')
const pakiet = odczytaj('package.json')
const schemat = odczytaj('node_modules/@tauri-apps/cli/config.schema.json')
// Schemat Tauri zawiera wzorce regex bez zgodności z trybem Unicode JavaScript.
const walidator = new Ajv({ strict: false, allErrors: true, unicodeRegExp: false })
walidator.addFormat('uri', (wartosc) => URL.canParse(wartosc))
walidator.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
walidator.addFormat('double', { type: 'number', validate: Number.isFinite })
for (const [nazwa, minimum, maksimum] of [['uint8', 0, 255], ['uint32', 0, 4294967295], ['int32', -2147483648, 2147483647], ['int64', -9223372036854775808, 9223372036854775807]]) {
  walidator.addFormat(nazwa, { type: 'number', validate: (wartosc) => Number.isInteger(wartosc) && wartosc >= minimum && wartosc <= maksimum })
}
const waliduj = walidator.compile(schemat)
const kluczPubliczny = Buffer.from(`untrusted comment: test\n${Buffer.alloc(42).toString('base64')}\n`).toString('base64')

test('konfiguracja NSIS odpowiada schematowi zainstalowanego Tauri 2', () => {
  assert.equal(waliduj(konfiguracja), true, JSON.stringify(waliduj.errors))
  assert.equal(konfiguracja.version, '../package.json')
  assert.match(readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8'), new RegExp(`version = "${pakiet.version.replaceAll('.', '\\.')}"`))
  assert.equal(nazwaInstalatora(pakiet.version), `Ultimate_Pomagier_${pakiet.version === '4.0.0' ? '4.0' : pakiet.version}_Setup.exe`)
  for (const ikona of konfiguracja.bundle.icon) assert.ok(existsSync(new URL(`../src-tauri/${ikona}`, import.meta.url)))
})

test('instalacja per użytkownik, język polski, runtime offline i statyczny frontend bez Node/Git', () => {
  assert.deepEqual(konfiguracja.bundle.targets, ['nsis'])
  assert.equal(konfiguracja.bundle.windows.nsis.installMode, 'currentUser')
  assert.deepEqual(konfiguracja.bundle.windows.nsis.languages, ['Polish'])
  assert.equal(konfiguracja.bundle.windows.nsis.startMenuFolder, 'Ultimate Pomagier')
  const tlumaczenia = readFileSync(new URL(`../src-tauri/${konfiguracja.bundle.windows.nsis.customLanguageFiles.Polish}`, import.meta.url), 'utf8')
  assert.equal([...tlumaczenia.matchAll(/^LangString \w+ \$\{LANG_POLISH\}/gm)].length, 27)
  for (const etykieta of ['createDesktop', 'deleteAppData', 'webview2AbortError', 'appRunning']) assert.match(tlumaczenia, new RegExp(`LangString ${etykieta} `))
  assert.equal(konfiguracja.bundle.windows.webviewInstallMode.type, 'offlineInstaller')
  assert.equal(konfiguracja.build.frontendDist, '../dist')
  assert.equal(konfiguracja.bundle.externalBin, undefined)
  assert.equal(konfiguracja.bundle.windows.nsis.template, undefined)
})

test('stała tożsamość magazynu, osobny profil development i brak dostępu zdalnego do IPC', () => {
  assert.equal(konfiguracja.identifier, 'pl.ultimatepomagier.desktop')
  assert.equal(konfiguracja.app.windows[0].useHttpsScheme, true)
  assert.equal(konfiguracja.app.windows[0].dataDirectory, undefined)
  assert.equal(konfiguracja.app.appDirectoriesOverride, undefined)
  const rozwojowa = odczytaj('src-tauri/tauri.dev.conf.json')
  assert.notEqual(rozwojowa.identifier, konfiguracja.identifier)
  assert.equal(waliduj({ ...konfiguracja, ...rozwojowa }), true, JSON.stringify(waliduj.errors))
  const uprawnienia = odczytaj('src-tauri/capabilities/desktop.json')
  assert.deepEqual(uprawnienia.windows, ['main', 'obszar'])
  assert.equal(uprawnienia.remote, undefined)
  assert.ok(!uprawnienia.permissions.some((wpis) => /fs:|shell:|http:|process:/.test(wpis)))
})

test('pakiet testowy nie ma aktywnych aktualizacji', () => {
  const wynik = przygotujKonfiguracjeWydania(pakiet, konfiguracja, { podpisane: false })
  assert.equal(wynik.bundle.createUpdaterArtifacts, false)
  assert.deepEqual(wynik.plugins.updater.endpoints, [])
  assert.equal(wynik.plugins.updater.pubkey, '')
  assert.equal(konfiguracja.plugins.updater.requireSignedVersion, true)
  assert.equal(wynik.plugins.updater.requireSignedVersion, true)
})

test('podpisany build odrzuca brak kluczy, zły klucz, rozjazd wersji i źródła rozwojowe', () => {
  const opcje = { podpisane: true, tag: `v${pakiet.version}`, czysteZrodla: true, kluczPubliczny, kluczPrywatny: 'testowy-klucz' }
  for (const zmiany of [{ czysteZrodla: false }, { kluczPubliczny: '' }, { kluczPrywatny: '' }, { kluczPubliczny: 'placeholder' }, { tag: 'main' }, { tag: `v${pakiet.version}-rc.1` }, { tag: 'v999.0.0' }, { kanal: 'nieznany' }]) {
    assert.throws(() => przygotujKonfiguracjeWydania(pakiet, konfiguracja, { ...opcje, ...zmiany }))
  }
  assert.throws(() => przygotujKonfiguracjeWydania({ version: '999.0.0' }, konfiguracja, opcje))
  const wynik = przygotujKonfiguracjeWydania(pakiet, konfiguracja, opcje)
  assert.equal(wynik.bundle.createUpdaterArtifacts, true)
  assert.equal(wynik.plugins.updater.pubkey, kluczPubliczny)
  assert.equal(wynik.plugins.updater.requireSignedVersion, true)
  assert.deepEqual(wynik.plugins.updater.endpoints, [adresKanalowWydan])
  const testowy = przygotujKonfiguracjeWydania(pakiet, konfiguracja, { ...opcje, kanal: 'testowy' })
  assert.equal(testowy.plugins.updater.pubkey, kluczPubliczny)
  assert.equal(testowy.plugins.updater.requireSignedVersion, true)
  assert.equal(waliduj({ ...konfiguracja, bundle: { ...konfiguracja.bundle, ...wynik.bundle }, plugins: wynik.plugins }), true, JSON.stringify(waliduj.errors))
})

test('tryb demo nie może zostać wstrzyknięty do zwykłego buildu ani uruchomienia', () => {
  assert.equal(okreslTrybFrontendu('production', {}).tryb, 'produkcyjny')
  assert.equal(okreslTrybFrontendu('development', {}).tryb, 'programistyczny')
  assert.equal(okreslTrybFrontendu('demonstracyjny', { VITE_TRYB_DEMONSTRACYJNY: 'true' }).tryb, 'demonstracyjny')
  for (const tryb of ['production', 'development']) assert.throws(() => okreslTrybFrontendu(tryb, { VITE_TRYB_DEMONSTRACYJNY: 'true' }), /Demonstracja/)
  assert.throws(() => okreslTrybFrontendu('demonstracyjny', {}), /Demonstracja/)
  assert.throws(() => okreslTrybFrontendu('production', { VITE_TRYB_DEMONSTRACYJNY: 'TRUE' }), /true albo false/)
})

test('rzeczywista konfiguracja Vite odrzuca flagę demo z procesu i pliku env', async () => {
  const katalog = fileURLToPath(new URL('../', import.meta.url))
  const sprawdz = (tryb, flaga) => spawnSync(process.execPath, ['--input-type=module', '-e', `import { resolveConfig } from 'vite'; await resolveConfig({ mode: ${JSON.stringify(tryb)} }, 'build');`], {
    cwd: katalog, encoding: 'utf8', env: { ...process.env, VITE_TRYB_DEMONSTRACYJNY: flaga }, windowsHide: true,
  })
  assert.equal(sprawdz('production', 'false').status, 0)
  // Brak zmiennej procesu pozwala Vite odczytać jawną flagę z .env.demonstracyjny.
  const zmienne = { ...process.env }
  delete zmienne.VITE_TRYB_DEMONSTRACYJNY
  const demonstracja = spawnSync(process.execPath, ['--input-type=module', '-e', "import { resolveConfig } from 'vite'; await resolveConfig({ mode: 'demonstracyjny' }, 'build');"], { cwd: katalog, encoding: 'utf8', env: zmienne, windowsHide: true })
  assert.notEqual(demonstracja.status, 0)
  assert.match(demonstracja.stderr, /wyłącznie w serwerze deweloperskim/)
  const serwerDemo = spawnSync(process.execPath, ['--input-type=module', '-e', "import { resolveConfig } from 'vite'; await resolveConfig({ mode: 'demonstracyjny' }, 'serve');"], { cwd: katalog, encoding: 'utf8', env: zmienne, windowsHide: true })
  assert.equal(serwerDemo.status, 0, serwerDemo.stderr)
  for (const tryb of ['production', 'development']) {
    const wynik = sprawdz(tryb, 'true')
    assert.notEqual(wynik.status, 0)
    assert.match(wynik.stderr, /Demonstracja wymaga/)
  }
  const katalogEnv = await mkdtemp(join(tmpdir(), 'pomagier-konfiguracja-trybu-'))
  try {
    await writeFile(join(katalogEnv, '.env.production.local'), 'VITE_TRYB_DEMONSTRACYJNY=true\n')
    const adresKontroli = new URL('../skrypty/kontrolaTrybuFrontendu.mjs', import.meta.url).href
    const wynik = spawnSync(process.execPath, ['--input-type=module', '-e', `import { loadEnv } from 'vite'; import { okreslTrybFrontendu } from ${JSON.stringify(adresKontroli)}; okreslTrybFrontendu('production', loadEnv('production', ${JSON.stringify(katalogEnv)}, 'VITE_'));`], { cwd: katalog, encoding: 'utf8', env: zmienne, windowsHide: true })
    assert.notEqual(wynik.status, 0)
    assert.match(wynik.stderr, /Demonstracja wymaga/)
  } finally {
    await rm(join(katalogEnv, '.env.production.local'), { force: true })
    await rmdir(katalogEnv)
  }
})

test('instalator produkcyjny odrzuca demo także po zmianie komendy lub podmianie dist', async () => {
  for (const polecenie of ['npm run build:demo', 'npm run build', { script: 'npm run build:demo' }]) {
    assert.throws(() => przygotujKonfiguracjeWydania(pakiet, { ...konfiguracja, build: { ...konfiguracja.build, beforeBuildCommand: polecenie } }, { podpisane: false }), /przed pakowaniem/)
  }
  assert.throws(() => sprawdzManifestProdukcyjny(okreslTrybFrontendu('demonstracyjny', { VITE_TRYB_DEMONSTRACYJNY: 'true' })), /Odrzucono/)
  assert.throws(() => sprawdzManifestProdukcyjny(okreslTrybFrontendu('development', {})), /Odrzucono/)
  assert.throws(() => sprawdzManifestProdukcyjny(null), /Odrzucono/)
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-kontrola-trybu-'))
  try {
    await assert.rejects(() => sprawdzFrontendDesktop(katalog), /ENOENT/)
    await writeFile(join(katalog, 'tryb-frontendu.json'), JSON.stringify(okreslTrybFrontendu('demonstracyjny', { VITE_TRYB_DEMONSTRACYJNY: 'true' })))
    await assert.rejects(() => sprawdzFrontendDesktop(katalog), /Odrzucono/)
    await writeFile(join(katalog, 'tryb-frontendu.json'), JSON.stringify(okreslTrybFrontendu('production', {})))
    await sprawdzFrontendDesktop(katalog)
  } finally {
    // Usuwamy wyłącznie utworzony wyżej plik i pusty katalog testowy.
    await rm(join(katalog, 'tryb-frontendu.json'), { force: true })
    await rmdir(katalog)
  }
})
