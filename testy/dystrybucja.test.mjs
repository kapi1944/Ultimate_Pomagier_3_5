import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { numerWersjiAndroid, opiszPlik, polaczMetadane, zbierzArtefakty } from '../skrypty/dystrybucja.mjs'
import { sprawdzRaportApk, czyBladDowiazaniaAndroid, sprawdzBibliotekiApk, przygotujBibliotekeCppAndroid } from '../skrypty/budujAndroid.mjs'
import { sprawdzSzkicPublikacji, pobierzSzkicWydania } from '../skrypty/zatwierdzWydanie.mjs'

test('versionCode wzrasta i nie dopuszcza kolizji ani przekroczenia zakresu', () => {
  assert.equal(numerWersjiAndroid('4.0.0'), 4000000)
  assert.ok(numerWersjiAndroid('4.0.1') > numerWersjiAndroid('4.0.0'))
  assert.ok(numerWersjiAndroid('4.1.0') > numerWersjiAndroid('4.0.999'))
  for (const wersja of ['4.0.0-rc.1', '04.0.0', '4.0.1000', '4.1000.0', '0.0.0', '2101.0.0']) assert.throws(() => numerWersjiAndroid(wersja))
})

test('pakowanie przez kopiowanie JNI dotyczy wyłącznie odmowy dowiązań Windows', () => {
  const blad = 'Failed to create a symbolic link: Creation symbolic link is not allowed for this system.'
  assert.equal(czyBladDowiazaniaAndroid('win32', blad), true)
  assert.equal(czyBladDowiazaniaAndroid('linux', blad), false)
  assert.equal(czyBladDowiazaniaAndroid('win32', 'error: could not compile ultimate-pomagier'), false)
  assert.equal(czyBladDowiazaniaAndroid('win32', 'Failed to create a symbolic link: file not found'), false)
})

test('pakowanie Androida otrzymuje bibliotekę C++ z właściwego NDK także na Linuxie bez odmowy dowiązań', async () => {
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-biblioteka-cpp-'))
  for (const [system, katalogNarzedzi, architektura, abi] of [
    ['linux', 'linux-x86_64', 'aarch64', 'arm64-v8a'],
    ['win32', 'windows-x86_64', 'aarch64', 'arm64-v8a'],
    ['linux', 'linux-x86_64', 'x86_64', 'x86_64'],
  ]) {
    const katalogNdk = join(katalog, 'ndk')
    const katalogAndroid = join(katalog, `${system}-${architektura}`)
    const katalogZrodla = join(katalogNdk, 'toolchains/llvm/prebuilt', katalogNarzedzi, 'sysroot/usr/lib', `${architektura}-linux-android`)
    await mkdir(katalogZrodla, { recursive: true })
    const biblioteka = `biblioteka NDK ${system} ${architektura}`
    await writeFile(join(katalogZrodla, 'libc++_shared.so'), biblioteka)
    await przygotujBibliotekeCppAndroid(katalogNdk, katalogAndroid, architektura, system)
    assert.equal(await readFile(join(katalogAndroid, 'app/src/main/jniLibs', abi, 'libc++_shared.so'), 'utf8'), biblioteka)
  }
  await assert.rejects(przygotujBibliotekeCppAndroid(join(katalog, 'brak-ndk'), join(katalog, 'niekompletny'), 'aarch64', 'linux'), /ENOENT/)
})

test('zbieranie artefaktów obsługuje podkatalogi upload-artifact i odrzuca kolizje nazw', async () => {
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-artefakty-'))
  const pobrane = join(katalog, 'pobrane'); const cel = join(katalog, 'gotowe')
  await mkdir(join(pobrane, 'podpisane'), { recursive: true })
  await writeFile(join(pobrane, 'podpisane', 'plik.exe'), 'plik')
  await writeFile(join(pobrane, 'podpisane', 'wydanie-windows.json'), '{}')
  await writeFile(join(pobrane, 'plik.apk'), 'apk')
  await writeFile(join(pobrane, 'podpisane', 'windows-stabilny.json'), 'kanal-stabilny')
  await writeFile(join(pobrane, 'podpisane', 'windows-testowy.json'), 'kanal-testowy')
  await zbierzArtefakty(pobrane, cel)
  assert.equal(await readFile(join(cel, 'plik.exe'), 'utf8'), 'plik')
  assert.equal(await readFile(join(cel, 'plik.apk'), 'utf8'), 'apk')
  assert.equal(await readFile(join(cel, 'windows-stabilny.json'), 'utf8'), 'kanal-stabilny')
  assert.equal(await readFile(join(cel, 'windows-testowy.json'), 'utf8'), 'kanal-testowy')
  await writeFile(join(pobrane, 'plik.exe'), 'inny plik')
  await assert.rejects(zbierzArtefakty(pobrane, cel), /powtórzone nazwy/)
})

test('produkcja odrzuca debug APK, obcy certyfikat, pakiet i numer kompilacji', () => {
  const odcisk = 'a'.repeat(64)
  const raport = { identyfikator: 'pl.ultimatepomagier.desktop', wersja: '4.0.0', versionCode: 4000000, debugowalny: false, podpis: `Signer #1 certificate SHA-256 digest: ${odcisk}` }
  assert.equal(sprawdzRaportApk(raport, odcisk, '4.0.0', 4000000), odcisk)
  for (const zmiany of [{ debugowalny: true }, { identyfikator: 'inna.aplikacja' }, { wersja: '3.0.0' }, { versionCode: 1 }, { podpis: '' }, { podpis: `${raport.podpis}\nCN=Android Debug` }]) assert.throws(() => sprawdzRaportApk({ ...raport, ...zmiany }, odcisk, '4.0.0', 4000000))
  assert.throws(() => sprawdzRaportApk(raport, 'b'.repeat(64), '4.0.0', 4000000))
})

test('APK wymaga kompletu bibliotek właściwej architektury i segmentów ELF zgodnych ze stronami 16 KB', () => {
  function biblioteka(wyrownanie = 16384n, architektura = 183) {
    const dane = Buffer.alloc(120)
    dane.writeUInt32BE(0x7f454c46)
    dane[4] = 2; dane[5] = 1
    dane.writeUInt16LE(architektura, 18)
    dane.writeBigUInt64LE(64n, 32)
    dane.writeUInt16LE(56, 54); dane.writeUInt16LE(1, 56)
    dane.writeUInt32LE(1, 64)
    dane.writeBigUInt64LE(wyrownanie, 112)
    return dane
  }
  const pliki = { 'AndroidManifest.xml': new Uint8Array([1]), 'lib/arm64-v8a/libpomagier_aplikacja.so': biblioteka(), 'lib/arm64-v8a/libc++_shared.so': biblioteka() }
  assert.doesNotThrow(() => sprawdzBibliotekiApk(pliki, 'arm64-v8a'))
  for (const nazwa of ['lib/arm64-v8a/libpomagier_aplikacja.so', 'lib/arm64-v8a/libc++_shared.so']) {
    assert.throws(() => sprawdzBibliotekiApk({ ...pliki, [nazwa]: biblioteka(4096n) }, 'arm64-v8a'), /16 KB/)
    const niekompletne = { ...pliki }; delete niekompletne[nazwa]
    assert.throws(() => sprawdzBibliotekiApk(niekompletne, 'arm64-v8a'), /niekompletny/)
  }
  assert.throws(() => sprawdzBibliotekiApk({ ...pliki, 'lib/arm64-v8a/libpomagier_aplikacja.so': biblioteka(16384n, 62) }, 'arm64-v8a'), /architektura/)
  assert.throws(() => sprawdzBibliotekiApk({ ...pliki, 'lib/x86_64/obca.so': biblioteka(16384n, 62) }, 'arm64-v8a'), /architektura/)
  assert.throws(() => sprawdzBibliotekiApk({ ...pliki, 'lib/arm64-v8a/libpomagier_aplikacja.so': Buffer.alloc(1) }, 'arm64-v8a'), /architektura/)
  const uszkodzona = biblioteka(); uszkodzona.writeBigUInt64LE(999999n, 32)
  assert.throws(() => sprawdzBibliotekiApk({ ...pliki, 'lib/arm64-v8a/libpomagier_aplikacja.so': uszkodzona }, 'arm64-v8a'), /nagłówki/)
})

test('odczyt prywatnego szkicu działa, gdy endpoint opublikowanego wydania po tagu zwraca 404', () => {
  const repozytorium = 'kapi1944/Ultimate_Pomagier_3_5'
  const szkic = { id: 123, tag_name: 'v4.0.0', draft: true }
  const wywolania = []
  function wykonaj(program, argumenty) {
    assert.equal(program, 'gh')
    wywolania.push(argumenty)
    if (argumenty[0] === 'release' && argumenty[1] === 'view') return '123\n'
    if (argumenty[0] === 'api' && argumenty[1] === `repos/${repozytorium}/releases/123`) return JSON.stringify(szkic)
    throw new Error('GitHub: Not Found (HTTP 404)')
  }
  assert.deepEqual(pobierzSzkicWydania('v4.0.0', repozytorium, wykonaj), szkic)
  assert.deepEqual(wywolania[0], ['release', 'view', 'v4.0.0', '--repo', repozytorium, '--json', 'databaseId', '--jq', '.databaseId'])
  for (const identyfikator of ['', 'null', '0', 'niepoprawny']) assert.throws(() => pobierzSzkicWydania('v4.0.0', repozytorium, () => identyfikator), /identyfikatora szkicu/)
})

test('manifest powstaje z rzeczywistych trzech plików i odrzuca uszkodzenie lub mieszanie commitów', async () => {
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-dystrybucja-'))
  const wersja = '4.0.0'; const commit = 'b'.repeat(40)
  const typy = { windows: 'exe', android: 'apk', web: 'zip' }
  await writeFile(join(katalog, 'zmiany.md'), 'Zmiany tego wydania.')
  for (const platforma of Object.keys(typy)) {
    const nazwa = `plik.${typy[platforma]}`
    await writeFile(join(katalog, nazwa), `test ${platforma}`)
    let podpis = { rodzaj: 'sha256' }
    if (platforma === 'windows') {
      await writeFile(join(katalog, `${nazwa}.sig`), 'podpis testowy')
      podpis = { rodzaj: 'tauri', sha256: (await opiszPlik(join(katalog, `${nazwa}.sig`), {})).sha256 }
    }
    if (platforma === 'android') podpis = { rodzaj: 'android', certyfikatSha256: 'c'.repeat(64) }
    const plik = await opiszPlik(join(katalog, nazwa), { platforma, typ: typy[platforma], architektura: 'aarch64', podpis, ...(platforma === 'android' ? { identyfikator: 'pl.ultimatepomagier.desktop', versionCode: 4000000 } : {}) })
    await writeFile(join(katalog, `wydanie-${platforma}.json`), JSON.stringify({ wersja, commit, pliki: [plik] }))
  }
  const manifest = await polaczMetadane(katalog, join(katalog, 'zmiany.md'))
  assert.equal(manifest.pliki.length, 3)
  assert.match(await readFile(join(katalog, 'opis-wydania.md'), 'utf8'), /```pomagier-wydanie/)
  const repozytorium = 'kapi1944/Ultimate_Pomagier_3_5'
  const assets = manifest.pliki.map((plik) => ({ name: plik.nazwa, state: 'uploaded', size: plik.rozmiar, digest: `sha256:${plik.sha256}`, browser_download_url: `https://github.com/${repozytorium}/releases/download/v4.0.0/${plik.nazwa}` }))
  assets.push({ name: 'plik.exe.sig', state: 'uploaded', size: 10, digest: `sha256:${manifest.pliki.find((plik) => plik.platforma === 'windows').podpis.sha256}` }, { name: 'latest.json', state: 'uploaded', size: 100 })
  const szkic = { draft: true, prerelease: false, tag_name: 'v4.0.0', assets, body: await readFile(join(katalog, 'opis-wydania.md'), 'utf8') }
  assert.equal(sprawdzSzkicPublikacji(szkic, 'v4.0.0', repozytorium).pliki.length, 3)
  const etykietaSzkicu = 'untagged-' + 'a'.repeat(20)
  const szkicPrywatny = { ...szkic, html_url: `https://github.com/${repozytorium}/releases/tag/${etykietaSzkicu}`,
    assets: assets.map((plik) => ({ ...plik, ...(plik.browser_download_url ? { browser_download_url: plik.browser_download_url.replace('/v4.0.0/', `/${etykietaSzkicu}/`) } : {}) })) }
  assert.equal(sprawdzSzkicPublikacji(szkicPrywatny, 'v4.0.0', repozytorium).pliki.length, 3)
  assert.throws(() => sprawdzSzkicPublikacji({ ...szkicPrywatny, html_url: `https://github.com/obcy/projekt/releases/tag/${etykietaSzkicu}` }, 'v4.0.0', repozytorium), /niekompletne lub zmienione/)
  assert.throws(() => sprawdzSzkicPublikacji({ ...szkicPrywatny, html_url: `https://github.com/${repozytorium}/releases/tag/untagged-bbbbbbbbbbbbbbbbbbbb` }, 'v4.0.0', repozytorium), /niekompletne lub zmienione/)
  assert.throws(() => sprawdzSzkicPublikacji({ ...szkic, assets: assets.slice(1) }, 'v4.0.0', repozytorium), /niekompletne lub zmienione/)
  assert.throws(() => sprawdzSzkicPublikacji({ ...szkic, draft: false }, 'v4.0.0', repozytorium), /Brak przygotowanego/)
  const metadane = JSON.parse(await readFile(join(katalog, 'wydanie-web.json'), 'utf8'))
  await writeFile(join(katalog, 'wydanie-web.json'), JSON.stringify({ ...metadane, commit: 'c'.repeat(40) }))
  await assert.rejects(polaczMetadane(katalog, join(katalog, 'zmiany.md')), /różnych wersji lub commitów/)
  await writeFile(join(katalog, 'wydanie-web.json'), JSON.stringify(metadane))
  await writeFile(join(katalog, 'plik.zip'), 'uszkodzony')
  await assert.rejects(polaczMetadane(katalog, join(katalog, 'zmiany.md')), /Suma lub rozmiar/)
})
