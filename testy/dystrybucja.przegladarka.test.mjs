import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = 'http://127.0.0.1:5191'
const suma = 'a'.repeat(64)
function wydanie(wersja, platforma, identyfikator) {
  const typ = platforma === 'android' ? 'apk' : 'exe'
  const nazwa = `Pomagier_${wersja}.${typ}`
  const manifest = { schemat: 1, wersja, commit: 'b'.repeat(40), kanal: 'stabilna', pliki: [{ platforma, architektura: 'aarch64', typ, nazwa, rozmiar: 100,
    sha256: suma, identyfikator: 'pl.ultimatepomagier.desktop', versionCode: 4000001,
    podpis: platforma === 'android' ? { rodzaj: 'android', certyfikatSha256: 'c'.repeat(64) } : { rodzaj: 'tauri', sha256: suma } }] }
  const plik = { name: nazwa, size: 100, state: 'uploaded', digest: `sha256:${suma}`, browser_download_url: `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/v${wersja}/${nazwa}` }
  return { id: identyfikator, draft: false, prerelease: false, tag_name: `v${wersja}`, published_at: '2026-10-25T10:00:00Z', body: `Zmiany wydania ${wersja}.\n\n\`\`\`pomagier-wydanie\n${JSON.stringify(manifest)}\n\`\`\``, assets: [plik, ...(platforma === 'windows' ? [{ name: `${nazwa}.sig`, state: 'uploaded', size: 500, digest: `sha256:${suma}` }] : [])] }
}

test('centrum wersji w prawdziwej przeglądarce: telefon, Windows, historia, pobranie, offline i wycofanie', { timeout: 90000 }, async () => {
  const serwer = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5191', '--strictPort'], { cwd: resolve('.'), windowsHide: true, stdio: 'ignore' })
  let przegladarka
  try {
    przegladarka = await chromium.launch({ channel: process.env.POMAGIER_PRZEGLADARKA || 'msedge', headless: true })
    let gotowy = false
    for (let proba = 0; proba < 60; proba++) {
      try { if ((await fetch(adres)).ok) { gotowy = true; break } } catch { /* Serwer uruchamia się w tle. */ }
      await new Promise((zakoncz) => setTimeout(zakoncz, 500))
    }
    assert.ok(gotowy, 'Uruchomienie Vite')
    const kontekst = await przegladarka.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36', isMobile: true, hasTouch: true })
    const strona = await kontekst.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    let wycofane = false
    const wydania = [wydanie('4.0.1', 'android', 1), wydanie('4.0.0', 'android', 2), wydanie('4.0.1', 'windows', 3)]
    await strona.route('https://api.github.com/repos/kapi1944/Ultimate_Pomagier_3_5/releases**', async (trasa) => {
      const numer = /releases\/(\d+)$/.exec(trasa.request().url())?.[1]
      await trasa.fulfill({ json: numer ? { ...wydania.find((element) => element.id === Number(numer)), ...(wycofane ? { draft: true } : {}) } : wydania })
    })
    await strona.route('https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/**', (trasa) => trasa.fulfill({ body: 'artefakt testowy przeglądarki', headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="test.apk"' } }))
    await strona.goto(adres)
    await strona.getByRole('button', { name: 'Pobierz aplikację — aktualizacje i wersje' }).click()
    const okno = strona.getByRole('dialog')
    await okno.getByRole('button', { name: 'Pobierz na Android', exact: true }).waitFor()
    assert.match(await okno.locator('.wersje__platforma').first().innerText(), /Android/)
    await okno.getByText('Opublikowane wersje (3)', { exact: true }).click()
    assert.equal(await okno.getByText(/Instalacja starszej wersji jest zablokowana/).count(), 1)
    const pobranie = strona.waitForEvent('download')
    await okno.getByRole('button', { name: 'Pobierz na Android', exact: true }).click()
    assert.equal((await pobranie).suggestedFilename(), 'test.apk')
    await okno.getByText(/Przekazano pobieranie APK/).waitFor()
    wycofane = true
    await okno.getByRole('button', { name: 'Pobierz na Android', exact: true }).click()
    await okno.getByText('Instalator został wycofany lub zmieniony. Odśwież listę wydań.').waitFor()
    await mkdir('.desktop-tools/dystrybucja-testy', { recursive: true })
    await strona.screenshot({ path: '.desktop-tools/dystrybucja-testy/telefon.png', fullPage: true })
    assert.ok(await okno.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), 'Brak przewijania okna w poziomie')
    await kontekst.setOffline(true)
    await okno.getByText('Brak połączenia z internetem. Lista wydań i pobieranie są niedostępne.').waitFor()
    assert.equal(await okno.getByRole('button', { name: 'Pobierz na Android', exact: true }).count(), 0)
    assert.deepEqual(bledy, [])
    await kontekst.close()

    const pulpit = await przegladarka.newContext({ viewport: { width: 1440, height: 1000 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36' })
    const druga = await pulpit.newPage()
    await druga.route('https://api.github.com/**', (trasa) => trasa.fulfill({ json: wydania }))
    await druga.goto(adres)
    await druga.getByRole('button', { name: 'Pobierz aplikację — aktualizacje i wersje' }).click()
    await druga.getByRole('button', { name: 'Pobierz na Windows', exact: true }).waitFor()
    await druga.screenshot({ path: '.desktop-tools/dystrybucja-testy/windows.png', fullPage: true })
    await pulpit.close()
  } finally { if (przegladarka) await przegladarka.close(); serwer.kill() }
})
