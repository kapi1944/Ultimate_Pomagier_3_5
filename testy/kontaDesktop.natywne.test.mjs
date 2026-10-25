import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { setTimeout as odczekaj } from 'node:timers/promises'
const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')

test('Windows WebView2: pierwsza konfiguracja offline, profile, trwałość, zmiana hasła i zapamiętana sesja', { timeout: 240000, skip: process.platform !== 'win32' }, async () => {
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-natywne-konta-'))
  const polaczenia = new Map()
  let proces
  async function uruchom() {
    proces = spawn(process.env.POMAGIER_EXE_DESKTOP || resolve('src-tauri/target/konta-testy/debug/ultimate-pomagier.exe'), [], { windowsHide: true, env: { ...process.env, POMAGIER_KATALOG_TESTOWY: katalog, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=0' }, stdio: ['ignore', 'pipe', 'pipe'] })
  }
  async function znajdz(etykieta) {
    const koniec = Date.now() + 45000
    while (Date.now() < koniec) {
      if (proces.exitCode !== null) throw new Error('Testowy proces Tauri zakończył się przed otwarciem widoku.')
      const pliki = await readdir(katalog, { recursive: true }).catch(() => [])
      for (const plik of pliki.filter((plik) => plik.endsWith('DevToolsActivePort'))) {
        const port = Number((await readFile(join(katalog, plik), 'utf8').catch(() => '')).split('\n')[0])
        if (!port) continue
        try {
          let polaczenie = polaczenia.get(port)
          if (!polaczenie?.isConnected()) { polaczenie = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1000 }); polaczenia.set(port, polaczenie) }
          for (const kontekst of polaczenie.contexts()) for (const strona of kontekst.pages()) {
            if (await strona.getByRole('heading', { name: etykieta, exact: true }).isVisible().catch(() => false)) return strona
          }
        } catch { /* Środowisko poprzedniego okna może właśnie kończyć pracę. */ }
      }
      await odczekaj(200)
    }
    throw new Error(`Nie odnaleziono natywnego widoku: ${etykieta}.`)
  }
  async function zamknij(strona) {
    await strona.evaluate(() => window.__TAURI_INTERNALS__.invoke('plugin:window|close', { label: 'obszar' })).catch(() => undefined)
    await Promise.race([new Promise((rozwiaz) => { if (proces.exitCode !== null) rozwiaz(); else proces.once('exit', rozwiaz) }), odczekaj(10000).then(() => { throw new Error('Nie zamknięto aplikacji Windows.') })])
  }
  async function operacja(strona, operacja, dane = {}) { return strona.evaluate(({ operacja, dane }) => window.__TAURI_INTERNALS__.invoke('operacja_konta', { operacja, dane }), { operacja, dane }) }
  const haslo = 'pierwsze-własne-hasło-testowe-123', nowe = 'zmienione-własne-hasło-testowe-456'
  try {
    await uruchom()
    let strona = await znajdz('Pierwsza konfiguracja konta lokalnego')
    await strona.evaluate(() => localStorage.setItem('ultimatePomagier.daneMigracyjneTest', 'ORYGINALNE DANE DO PRZENIESIENIA'))
    await strona.reload()
    await strona.getByRole('heading', { name: 'Pierwsza konfiguracja konta lokalnego', exact: true }).waitFor()
    await strona.context().setOffline(true)
    await strona.getByLabel('Imię', { exact: true }).fill('Osoba')
    await strona.getByLabel('Nazwisko', { exact: true }).fill('Lokalna')
    await strona.getByLabel('Login lub adres e-mail').fill('wlasciciel')
    await strona.getByLabel('Nowe hasło', { exact: true }).fill(haslo)
    await strona.getByLabel('Powtórz nowe hasło', { exact: true }).fill(haslo)
    await strona.getByLabel(/Zapamiętaj sesję/).check()
    await strona.getByLabel(/Przenieś istniejące dane tego urządzenia/).check()
    await strona.getByRole('button', { name: 'Utwórz konto lokalne', exact: true }).click()
    strona = await znajdz('Pulpit')
    assert.deepEqual(await strona.evaluate(() => window.__TAURI_INTERNALS__.invoke('informacje_o_platformie')), { system: 'windows', architektura: 'x86_64' })
    assert.equal(await strona.evaluate(() => window.__TAURI_INTERNALS__.invoke('czy_aktualizacje_dostepne')), false)
    assert.equal(await strona.evaluate(() => localStorage.getItem('ultimatePomagier.daneMigracyjneTest')), 'ORYGINALNE DANE DO PRZENIESIENIA')
    await strona.context().setOffline(true)
    await strona.getByRole('button', { name: '+ Dodaj zadanie', exact: true }).click()
    await strona.getByLabel('Nazwa zadania', { exact: true }).fill('Zadanie zapisane offline przed restartem')
    await strona.locator('#pulpit-rodzaj-terminu-zadania').selectOption('BRAK_GODZINY')
    await strona.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await strona.getByText('Zadanie zapisane offline przed restartem', { exact: true }).first().waitFor()
    await strona.evaluate(() => { localStorage.setItem('ultimatePomagier.testTrwalosci', JSON.stringify({ dokument: 'DANE WŁAŚCICIELA', ustawienie: 73 })) })
    await zamknij(strona)
    await uruchom()
    strona = await znajdz('Pulpit')
    await strona.getByText('Zadanie zapisane offline przed restartem', { exact: true }).waitFor()
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.testTrwalosci')).ustawienie), 73)
    assert.equal(await strona.evaluate(() => window.__TAURI_INTERNALS__.metadata.currentWindow.label), 'obszar')
    await strona.getByRole('button', { name: 'Profil', exact: true }).click()
    await strona.getByRole('button', { name: 'Zmień własne hasło', exact: true }).click()
    await strona.getByLabel('Dotychczasowe hasło', { exact: true }).fill(haslo)
    await strona.getByLabel('Nowe hasło', { exact: true }).fill(nowe)
    await strona.getByLabel('Powtórz nowe hasło', { exact: true }).fill(nowe)
    await strona.getByRole('button', { name: 'Zapisz nowe hasło', exact: true }).click()
    await strona.getByRole('status').filter({ hasText: 'Hasło zostało zmienione.' }).waitFor()
    await operacja(strona, 'utworz-konto', { profil: { zwrot: '', tytulNaukowy: '', imie: 'Druga', nazwisko: 'Osoba', pseudonim: 'Druga', login: 'druga', emaile: ['druga@example.test'], telefony: [], rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: [], status: 'AKTYWNY', kolorProfilu: '#334155', aliasyHistoryczne: [] } })
    const katalogKont = await operacja(strona, 'katalog')
    const druga = katalogKont.find((konto) => konto.login === 'druga')
    const wyniki = await operacja(strona, 'resetuj', { identyfikatory: [druga.id] })
    const kod = wyniki[0].kod
    await strona.getByRole('button', { name: 'Wyloguj', exact: true }).click()
    strona = await znajdz('Logowanie lokalne')
    assert.equal(await strona.evaluate(() => localStorage.getItem('ultimatePomagier.testTrwalosci')), null)
    await strona.getByLabel('Login lub adres e-mail').fill('druga')
    await strona.getByRole('button', { name: 'Dokończ resetowanie hasła', exact: true }).click()
    await strona.getByLabel('Kod jednorazowy', { exact: true }).fill(kod)
    await strona.getByRole('button', { name: 'Zweryfikuj kod', exact: true }).click()
    await strona.getByLabel('Nowe hasło', { exact: true }).fill(haslo)
    await strona.getByLabel('Powtórz nowe hasło', { exact: true }).fill(haslo)
    await strona.getByRole('button', { name: 'Ustaw hasło i zaloguj', exact: true }).click()
    strona = await znajdz('Pulpit')
    assert.equal(await strona.evaluate(() => localStorage.getItem('ultimatePomagier.testTrwalosci')), null)
    await strona.evaluate(() => localStorage.setItem('ultimatePomagier.testTrwalosci', 'DANE DRUGIEJ OSOBY'))
    await strona.getByRole('button', { name: 'Wyloguj', exact: true }).click()
    strona = await znajdz('Logowanie lokalne')
    await strona.getByLabel('Login lub adres e-mail').fill('wlasciciel')
    await strona.getByLabel('Hasło', { exact: true }).fill(haslo)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await strona.getByRole('alert').waitFor()
    await strona.getByLabel('Hasło', { exact: true }).fill(nowe)
    await strona.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    strona = await znajdz('Pulpit')
    assert.equal(await strona.evaluate(() => JSON.parse(localStorage.getItem('ultimatePomagier.testTrwalosci')).ustawienie), 73)
    await mkdir('tmp/konta-desktop', { recursive: true })
    await strona.screenshot({ path: 'tmp/konta-desktop/konto-lokalne.png' })
    await zamknij(strona)
  } finally {
    if (proces?.exitCode === null) proces.kill()
    for (const polaczenie of polaczenia.values()) await polaczenie.close().catch(() => undefined)
  }
})
