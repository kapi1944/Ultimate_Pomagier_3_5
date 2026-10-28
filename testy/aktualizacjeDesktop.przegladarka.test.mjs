import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = 'http://127.0.0.1:5193'
const sciezka = '.desktop-tools/test-aktualizacje.html'

test('panel aktualizacji: oba kanały, podpis, pobranie, zgoda, błędy i zachowanie lokalnych danych', { timeout: 90000 }, async () => {
  await mkdir('.desktop-tools', { recursive: true })
  await writeFile(sciezka, `<!doctype html><html lang="pl"><meta charset="utf-8"><div id="panel"></div><script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { mockIPC } from '@tauri-apps/api/mocks';
    import Panel from '/src/aplikacja/desktop/PanelAktualizacji.tsx';
    window.isTauri = true;
    window.stanTestu = { tryb: 'nowa', instalacje: 0, kanaly: [] };
    mockIPC(async (polecenie, dane) => {
      const stan = window.stanTestu;
      if (polecenie === 'plugin:app|version') return '4.0.0';
      if (polecenie === 'czy_aktualizacje_dostepne') return true;
      if (polecenie === 'plugin:updater|check') {
        stan.kanaly.push(dane.target);
        if (stan.tryb === 'aktualna') return null;
        if (stan.tryb === 'siec') throw new Error('Brak sieci');
        return { rid: 1, currentVersion: '4.0.0', version: '4.0.1', body: 'Poprawiono aktualizacje Windows.', rawJson: {
          kanal: dane.target.replace('windows-', ''), zgodnoscDanych: stan.tryb === 'niezgodna' ? 2 : 1, commit: 'a'.repeat(40)
        } };
      }
      if (polecenie === 'plugin:updater|download') {
        dane.onEvent.onmessage({ event: 'Started', data: { contentLength: 1024 } });
        dane.onEvent.onmessage({ event: 'Progress', data: { chunkLength: 1024 } });
        dane.onEvent.onmessage({ event: 'Finished' });
        if (stan.tryb === 'podpis') throw new Error('Nieprawidłowy podpis');
        return 2;
      }
      if (polecenie === 'plugin:updater|install') {
        stan.instalacje++;
        if (!dane.restartAfterInstall) throw new Error('Brak restartu');
        throw new Error('Test błędu instalatora');
      }
      if (polecenie === 'plugin:resources|close') return;
      throw new Error('Nieoczekiwane IPC: ' + polecenie);
    });
    createRoot(document.getElementById('panel')).render(React.createElement(Panel));
  </script></html>`)
  const serwer = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5193', '--strictPort'], { cwd: resolve('.'), windowsHide: true, stdio: 'ignore' })
  let przegladarka
  try {
    for (let proba = 0; proba < 60; proba++) {
      try { if ((await fetch(adres)).ok) break } catch { /* Oczekiwanie na start Vite. */ }
      await new Promise((zakoncz) => setTimeout(zakoncz, 500))
    }
    przegladarka = await chromium.launch({ channel: process.env.POMAGIER_PRZEGLADARKA || 'msedge', headless: true })
    const strona = await przegladarka.newPage()
    const bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(`${adres}/${sciezka}`)
    const sprawdz = strona.getByRole('button', { name: 'Sprawdź aktualizacje', exact: true })
    await sprawdz.waitFor()
    await strona.evaluate(() => {
      localStorage.setItem('test-aktualizacji-konto', '{"konto":"testowe"}')
      localStorage.setItem('test-aktualizacji-dokument', '{"historia":[1,2],"szkic":"zachowaj"}')
    })
    const danePrzed = await strona.evaluate(() => JSON.stringify({ ...localStorage }))
    await sprawdz.click()
    await strona.getByText(/Dostępna wersja 4.0.1/).waitFor()
    await strona.getByText('Informacje o zmianach — 4.0.1', { exact: true }).click()
    await strona.getByText('Poprawiono aktualizacje Windows.', { exact: true }).waitFor()
    const instaluj = strona.getByRole('button', { name: 'Zainstaluj aktualizację', exact: true })
    const pobierz = strona.getByRole('button', { name: 'Pobierz aktualizację', exact: true })
    assert.equal(await instaluj.isDisabled(), true)
    await strona.evaluate(() => { window.stanTestu.tryb = 'podpis' })
    await pobierz.click()
    await strona.getByText(/Pobieranie lub weryfikacja podpisu nie powiodły się/).waitFor()
    assert.equal(await instaluj.isDisabled(), true)
    assert.equal(await strona.evaluate(() => window.stanTestu.instalacje), 0)
    await strona.evaluate(() => { window.stanTestu.tryb = 'nowa' })
    await pobierz.click()
    await strona.getByText(/Podpis zweryfikowany/).waitFor()
    assert.equal(await instaluj.isEnabled(), true)
    assert.equal(await strona.getByRole('progressbar').getAttribute('value'), '1024')
    strona.once('dialog', (okno) => okno.dismiss())
    await instaluj.click()
    assert.equal(await strona.evaluate(() => window.stanTestu.instalacje), 0)
    strona.once('dialog', (okno) => okno.accept())
    await instaluj.click()
    await strona.getByText(/Nie udało się uruchomić instalatora/).waitFor()
    assert.equal(await instaluj.isDisabled(), true)
    await strona.getByRole('button', { name: 'Później', exact: true }).click()
    await strona.getByRole('combobox', { name: 'Kanał aktualizacji' }).selectOption('testowy')
    await strona.getByText(/Wersje eksperymentalne/).waitFor()
    await sprawdz.click()
    await strona.getByText(/Dostępna wersja 4.0.1/).waitFor()
    assert.deepEqual(await strona.evaluate(() => window.stanTestu.kanaly), ['windows-stabilny', 'windows-testowy'])
    await strona.getByRole('button', { name: 'Później', exact: true }).click()
    for (const [tryb, komunikat] of [['aktualna', /Brak nowszego wydania/], ['niezgodna', /Wydanie odrzucono/], ['siec', /Nie udało się sprawdzić wydania/]]) {
      await strona.evaluate((wartosc) => { window.stanTestu.tryb = wartosc }, tryb)
      await sprawdz.click()
      await strona.getByText(komunikat).waitFor()
    }
    assert.equal(await strona.evaluate(() => JSON.stringify({ ...localStorage })), danePrzed)
    assert.deepEqual(bledy, [])
  } finally {
    if (przegladarka) await przegladarka.close()
    serwer.kill()
    await rm(sciezka, { force: true })
  }
})
