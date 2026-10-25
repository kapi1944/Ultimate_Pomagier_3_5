import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { numerWersjiAndroid, opiszPlik, polaczMetadane, zbierzArtefakty } from '../skrypty/dystrybucja.mjs'
import { sprawdzRaportApk, czyBladDowiazaniaAndroid } from '../skrypty/budujAndroid.mjs'
import { sprawdzSzkicPublikacji } from '../skrypty/zatwierdzWydanie.mjs'

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

test('zbieranie artefaktów obsługuje podkatalogi upload-artifact i odrzuca kolizje nazw', async () => {
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-artefakty-'))
  const pobrane = join(katalog, 'pobrane'); const cel = join(katalog, 'gotowe')
  await mkdir(join(pobrane, 'podpisane'), { recursive: true })
  await writeFile(join(pobrane, 'podpisane', 'plik.exe'), 'plik')
  await writeFile(join(pobrane, 'podpisane', 'wydanie-windows.json'), '{}')
  await writeFile(join(pobrane, 'plik.apk'), 'apk')
  await zbierzArtefakty(pobrane, cel)
  assert.equal(await readFile(join(cel, 'plik.exe'), 'utf8'), 'plik')
  assert.equal(await readFile(join(cel, 'plik.apk'), 'utf8'), 'apk')
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
  assert.throws(() => sprawdzSzkicPublikacji({ ...szkic, assets: assets.slice(1) }, 'v4.0.0', repozytorium), /niekompletne lub zmienione/)
  assert.throws(() => sprawdzSzkicPublikacji({ ...szkic, draft: false }, 'v4.0.0', repozytorium), /Brak przygotowanego/)
  const metadane = JSON.parse(await readFile(join(katalog, 'wydanie-web.json'), 'utf8'))
  await writeFile(join(katalog, 'wydanie-web.json'), JSON.stringify({ ...metadane, commit: 'c'.repeat(40) }))
  await assert.rejects(polaczMetadane(katalog, join(katalog, 'zmiany.md')), /różnych wersji lub commitów/)
  await writeFile(join(katalog, 'wydanie-web.json'), JSON.stringify(metadane))
  await writeFile(join(katalog, 'plik.zip'), 'uszkodzony')
  await assert.rejects(polaczMetadane(katalog, join(katalog, 'zmiany.md')), /Suma lub rozmiar/)
})
