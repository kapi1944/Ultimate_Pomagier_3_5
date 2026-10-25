import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { tmpdir, homedir } from 'node:os'
import { join, resolve, delimiter } from 'node:path'
import { setTimeout as odczekaj } from 'node:timers/promises'
import { createRequire } from 'node:module'
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

test('natywne desktop:demo używa wyłącznie demonstracyjnego profilu i odrzuca rzeczywiste uwierzytelnianie', { timeout: 240000, skip: process.platform !== 'win32' }, async () => {
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-demo-natywne-'))
  const katalogNormalny = join(katalog, 'pl.ultimatepomagier.desktop')
  await mkdir(katalogNormalny)
  const znacznik = join(katalogNormalny, 'dane-chronione.txt')
  await writeFile(znacznik, 'NIE ZMIENIAJ DANYCH NORMALNEJ APLIKACJI')
  const proces = spawn(process.execPath, [resolve('skrypty/uruchomDemoDesktop.mjs'), '--no-watch'], { windowsHide: true, env: { ...process.env, CARGO_TARGET_DIR: resolve('src-tauri/target/demo-testy'), PATH: `${join(homedir(), '.cargo', 'bin')}${delimiter}${process.env.PATH}`, POMAGIER_KATALOG_TESTOWY: katalog, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=0' }, stdio: ['ignore', 'pipe', 'pipe'] })
  // Zapisujemy wyłącznie kompilację i uruchomienie, nigdy dane formularzy czy odpowiedzi uwierzytelniania.
  let bladStartu = ''
  proces.stderr.on('data', (dane) => { bladStartu = (bladStartu + dane.toString()).slice(-3000) })
  let polaczenie
  try {
    const koniec = Date.now() + 180000
    let strona
    while (Date.now() < koniec && !strona) {
      if (proces.exitCode !== null) throw new Error(`Nie uruchomiono natywnej demonstracji. ${bladStartu}`)
      const pliki = await readdir(katalog, { recursive: true }).catch(() => [])
      for (const plik of pliki.filter((plik) => plik.endsWith('DevToolsActivePort'))) {
        const port = Number((await readFile(join(katalog, plik), 'utf8').catch(() => '')).split('\n')[0])
        if (!port) continue
        try {
          polaczenie ??= await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1000 })
          for (const kontekst of polaczenie.contexts()) for (const kandydat of kontekst.pages()) {
            if (await kandydat.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).isVisible()) strona = kandydat
          }
        } catch { /* WebView2 może jeszcze inicjalizować stronę demonstracji. */ }
      }
      if (!strona) await odczekaj(300)
    }
    assert.ok(strona, 'Nie odnaleziono natywnej demonstracji.')
    await strona.getByRole('button', { name: 'Otwórz demonstrację Architekta', exact: true }).click()
    await strona.getByRole('heading', { name: 'Pulpit', exact: true }).waitFor()
    assert.match(await strona.locator('.naglowek-aplikacji').innerText(), /Demonstracja lokalna/)
    const odmowa = await strona.evaluate(async () => { try { await window.__TAURI_INTERNALS__.invoke('operacja_konta', { operacja: 'sesja', dane: {} }); return false } catch (blad) { return String(blad).includes('demonstracja') } })
    assert.equal(odmowa, true)
    assert.equal(await readFile(znacznik, 'utf8'), 'NIE ZMIENIAJ DANYCH NORMALNEJ APLIKACJI')
    assert.equal(await access(join(katalog, 'pl.ultimatepomagier.desktop.demo', 'konta', 'konta.sqlite3')).then(() => true).catch(() => false), false)
    await mkdir('tmp/konta-desktop', { recursive: true })
    await strona.screenshot({ path: 'tmp/konta-desktop/demo-natywne.png' })
    await strona.evaluate(() => window.__TAURI_INTERNALS__.invoke('plugin:window|close', { label: 'main' })).catch(() => undefined)
  } finally {
    await polaczenie?.close().catch(() => undefined)
    if (proces.exitCode === null) {
      try { execFileSync('taskkill', ['/PID', String(proces.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }) } catch { /* Proces mógł już zakończyć się po zamknięciu okna. */ }
    }
  }
})
