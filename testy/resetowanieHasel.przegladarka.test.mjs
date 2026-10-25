import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { createRequire } from 'node:module'
import { request } from 'node:http'

const wymagaj = createRequire(import.meta.url)
const { chromium } = wymagaj(process.env.POMAGIER_PLAYWRIGHT || 'playwright')
const adres = 'http://127.0.0.1:47831'
const haslo = 'pierwsze-hasło-osoby-testowej-123'
const noweHaslo = 'drugie-hasło-osoby-testowej-456'
const program = resolve('src-tauri/konta/target/debug', process.platform === 'win32' ? 'pomagier-konta.exe' : 'pomagier-konta')
function konto(id, login, rola, nazwisko) {
  return { id, login, rola, imie: 'Osoba', nazwisko, pseudonim: login, zwrot: '', tytulNaukowy: '', email: `${login}@example.test`, emaile: [`${login}@example.test`], telefony: [], organizacja: rola === 'GOSC' ? 'ZEWNETRZNY' : 'SEMPER', status: 'AKTYWNY', odznaki: [], aliasyHistoryczne: [], kolorProfilu: '#334155', wymagaZmianyHasla: false, wersjaUprawnien: 1, ostatnieLogowanie: null, utworzono: '2026-10-25T00:00:00Z', zaktualizowano: '2026-10-25T00:00:00Z' }
}
async function resetNaLogowaniu(strona, login, kod, nowe = haslo) {
  await strona.getByLabel('Login lub adres e-mail').fill(login)
  await strona.getByRole('button', { name: 'Dokończ resetowanie hasła', exact: true }).click()
  await strona.getByLabel('Kod jednorazowy', { exact: true }).fill(kod)
  await strona.getByRole('button', { name: 'Zweryfikuj kod', exact: true }).click()
  await strona.getByRole('heading', { name: '🔐 Ustaw nowe hasło', exact: true }).waitFor()
  await strona.getByLabel('Nowe hasło', { exact: true }).fill(nowe)
  await strona.getByLabel('Powtórz nowe hasło', { exact: true }).fill(nowe)
  await strona.getByRole('button', { name: 'Ustaw hasło i zaloguj', exact: true }).click()
  await strona.locator('.naglowek-aplikacji').waitFor()
}
async function administracja(strona) {
  await strona.locator('[aria-controls="menu-glowne"]').click()
  const przypnij = strona.getByRole('button', { name: /Przypnij Menu/ })
  if (await przypnij.isVisible()) await przypnij.click()
  await strona.getByRole('button', { name: 'ADMINISTRACJA', exact: true }).click()
  await strona.getByRole('button', { name: 'Użytkownicy', exact: true }).click()
  await strona.getByRole('region', { name: 'Zbiorcze zarządzanie użytkownikami' }).waitFor()
}
async function api(strona, operacja, dane = {}) {
  return strona.evaluate(async ({ operacja, dane }) => {
    const odpowiedz = await fetch('/api/konta', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Pomagier-Konta': '1' }, body: JSON.stringify({ operacja, dane }) })
    return odpowiedz.json()
  }, { operacja, dane })
}

test('Chrome na Windows: zaufana usługa, reset zbiorczy, formularz właściciela, sesje, audyt i brak sekretów', { timeout: 120000 }, async () => {
  const katalog = await mkdtemp(join(tmpdir(), 'pomagier-reset-test-'))
  const baza = join(katalog, 'konta.sqlite3'), kopia = join(katalog, 'kopia.json')
  await writeFile(kopia, JSON.stringify({ wersja: 2, uzytkownicy: [konto('administrator-kacper-madej', 'architekt', 'ARCHITEKT', 'Projektowa'), konto('admin', 'admin', 'ADMINISTRATOR', 'Administrująca'), konto('pracownik', 'pracownik', 'PRACOWNIK', 'Pracująca'), konto('gosc', 'gosc', 'GOSC', 'Gościnna')], historia: [] }))
  execFileSync(program, [baza, 'importuj', kopia], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const odzyskanie = execFileSync(program, [baza, 'odzyskaj-architekta', 'administrator-kacper-madej', 'POTWIERDZAM'], { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const kodArchitekta = odzyskanie.trim().split(/\r?\n/).at(-1)
  const serwer = spawn(program, [baza, 'serwuj', resolve('dist')], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let przegladarka
  try {
    await new Promise((rozwiaz, odrzuc) => {
      const limit = setTimeout(() => odrzuc(new Error('Nie uruchomiono testowej usługi kont.')), 15000)
      serwer.stdout.on('data', () => { clearTimeout(limit); rozwiaz() })
      serwer.on('error', odrzuc)
      serwer.on('exit', () => { clearTimeout(limit); odrzuc(new Error('Usługa testowa zakończyła się przed uruchomieniem.')) })
    })
    const odmowa = await fetch(`${adres}/api/konta`, { method: 'POST', headers: { Origin: 'https://obca-strona.example', 'Content-Type': 'application/json', 'X-Pomagier-Konta': '1' }, body: JSON.stringify({ operacja: 'sesja', dane: {} }) })
    assert.equal(odmowa.status, 403)
    const bezOchrony = await fetch(`${adres}/api/konta`, { method: 'POST', headers: { Origin: adres, 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(bezOchrony.status, 403)
    const zlyHost = await new Promise((rozwiaz, odrzuc) => { const zadanie = request(`${adres}/api/konta`, { method: 'POST', headers: { Host: 'obca-strona.example', Origin: adres, 'Content-Type': 'application/json', 'X-Pomagier-Konta': '1' } }, (odpowiedz) => { odpowiedz.resume(); rozwiaz(odpowiedz.statusCode) }); zadanie.on('error', odrzuc); zadanie.end('{}') })
    assert.equal(zlyHost, 403)
    przegladarka = await chromium.launch({ channel: 'chrome', headless: true })
    const kontekst = await przegladarka.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Warsaw' })
    const strona = await kontekst.newPage(), bledy = []
    strona.on('pageerror', (blad) => bledy.push(blad.message))
    await strona.goto(adres)
    await resetNaLogowaniu(strona, 'architekt', kodArchitekta)
    const ciasteczka = await kontekst.cookies(`${adres}/api/konta`)
    assert.ok(ciasteczka.some((ciasteczko) => ciasteczko.name === 'pomagier_sesja' && ciasteczko.httpOnly && ciasteczko.sameSite === 'Strict'))
    await administracja(strona)
    const panel = strona.getByRole('region', { name: 'Zbiorcze zarządzanie użytkownikami' })
    await panel.getByLabel('Zaznacz Osoba Pracująca', { exact: true }).check()
    await panel.getByLabel('Zaznacz Osoba Gościnna', { exact: true }).check()
    await panel.getByLabel('Zaznacz Osoba Projektowa', { exact: true }).check()
    await panel.getByRole('button', { name: '🔑 Resetuj hasła zaznaczonych', exact: true }).click()
    const okno = strona.getByRole('dialog')
    await okno.getByRole('button', { name: 'Potwierdź reset', exact: true }).click()
    await okno.getByRole('heading', { name: 'Wynik operacji', exact: true }).waitFor()
    assert.equal(await okno.locator('code').count(), 2)
    assert.match(await okno.innerText(), /Brak uprawnienia users.password.reset/)
    const kodPracownika = await okno.locator('li').filter({ has: strona.getByRole('button', { name: 'Kopiuj kod dla pracownik', exact: true }) }).locator('code').innerText()
    const kodGoscia = await okno.locator('li').filter({ has: strona.getByRole('button', { name: 'Kopiuj kod dla gosc', exact: true }) }).locator('code').innerText()
    assert.ok(kodPracownika !== kodGoscia)
    await okno.getByRole('button', { name: 'Zamknij i ukryj kody', exact: true }).click()
    assert.equal(await strona.locator('code.resetowanie-hasel__kod').count(), 0)
    const drugiKontekst = await przegladarka.newContext({ viewport: { width: 1200, height: 900 } })
    const osoba = await drugiKontekst.newPage()
    osoba.on('pageerror', (blad) => bledy.push(blad.message))
    await osoba.goto(adres)
    await osoba.getByLabel('Login lub adres e-mail').fill('pracownik')
    await osoba.getByRole('button', { name: 'Dokończ resetowanie hasła', exact: true }).click()
    await osoba.getByLabel('Kod jednorazowy', { exact: true }).fill(kodPracownika)
    await osoba.getByRole('button', { name: 'Zweryfikuj kod', exact: true }).click()
    await osoba.getByRole('heading', { name: '🔐 Ustaw nowe hasło', exact: true }).waitFor()
    await osoba.getByText('Minimum 8 znaków, bez spacji. Polskie znaki są dozwolone.', { exact: false }).waitFor()
    const poleHasla = osoba.getByLabel('Nowe hasło', { exact: true })
    assert.equal(await poleHasla.getAttribute('minlength'), '8')
    for (const [proba, poprawne] of [['abcdefg', false], ['abcdefgh', true], ['abcdefghij', true], ['abcd efgh', false], ['zażółćgę', true]]) {
      await poleHasla.fill(proba)
      assert.equal(await poleHasla.evaluate((pole) => pole.checkValidity()), poprawne)
    }
    await poleHasla.fill('ą'.repeat(513))
    await osoba.getByLabel('Powtórz nowe hasło', { exact: true }).fill('ą'.repeat(513))
    await osoba.getByRole('button', { name: 'Ustaw hasło i zaloguj', exact: true }).click()
    await osoba.getByRole('alert').filter({ hasText: 'Maksymalnie 1024 bajty.' }).waitFor()
    await osoba.getByLabel('Nowe hasło', { exact: true }).fill(haslo)
    await osoba.getByLabel('Powtórz nowe hasło', { exact: true }).fill('inne testowe hasło 999')
    await osoba.getByRole('button', { name: 'Ustaw hasło i zaloguj', exact: true }).click()
    await osoba.getByRole('alert').filter({ hasText: 'Podane hasła są różne.' }).waitFor()
    await osoba.getByLabel('Nowe hasło', { exact: true }).fill(haslo)
    await osoba.getByLabel('Powtórz nowe hasło', { exact: true }).fill(haslo)
    await osoba.getByRole('button', { name: 'Pokaż hasło', exact: true }).click()
    assert.equal(await osoba.getByLabel('Nowe hasło', { exact: true }).getAttribute('type'), 'text')
    await osoba.getByRole('button', { name: 'Ukryj hasło', exact: true }).click()
    await osoba.getByRole('button', { name: 'Ustaw hasło i zaloguj', exact: true }).click()
    await osoba.locator('.naglowek-aplikacji').waitFor()
    const katalogGoscia = await api(strona, 'katalog')
    assert.ok(Array.isArray(katalogGoscia.dane))
    const tabela = panel.getByRole('region', { name: 'Tabela kont', exact: true })
    await tabela.getByRole('row').filter({ hasText: 'Osoba Pracująca' }).getByRole('button', { name: 'Otwórz profil', exact: true }).click()
    await strona.getByRole('button', { name: '🔑 Resetuj hasło', exact: true }).click()
    await okno.getByRole('button', { name: 'Potwierdź reset', exact: true }).click()
    await okno.getByRole('heading', { name: 'Wynik operacji', exact: true }).waitFor()
    const nowyKod = await okno.locator('code').innerText()
    await okno.getByRole('button', { name: 'Zamknij i ukryj kody', exact: true }).click()
    const staraSesja = await api(osoba, 'sesja')
    assert.ok(typeof staraSesja.blad === 'string')
    await osoba.reload()
    await osoba.getByRole('button', { name: 'Zaloguj', exact: true }).waitFor()
    await osoba.getByLabel('Login lub adres e-mail').fill('pracownik')
    await osoba.getByLabel('Hasło', { exact: true }).fill(haslo)
    await osoba.getByRole('button', { name: 'Zaloguj', exact: true }).click()
    await osoba.getByRole('alert').waitFor()
    await resetNaLogowaniu(osoba, 'pracownik', nowyKod, noweHaslo)
    const historia = await api(strona, 'historia')
    const raport = JSON.stringify(historia)
    for (const sekret of [haslo, noweHaslo, kodArchitekta, kodPracownika, kodGoscia, nowyKod]) assert.ok(!raport.includes(sekret))
    const zapis = await osoba.evaluate(() => JSON.stringify({ lokalny: { ...localStorage }, sesyjny: { ...sessionStorage } }))
    for (const sekret of [haslo, noweHaslo, kodPracownika, nowyKod]) assert.ok(!zapis.includes(sekret))
    await strona.getByRole('button', { name: '🔑 Resetuj hasło', exact: true }).waitFor()
    await mkdir('tmp/resetowanie-hasel', { recursive: true })
    await strona.screenshot({ path: 'tmp/resetowanie-hasel/profil.png', fullPage: true })
    assert.deepEqual(bledy, [])
    await drugiKontekst.close()
    await kontekst.close()
  } finally {
    await przegladarka?.close()
    serwer.kill()
    await new Promise((rozwiaz) => { if (serwer.exitCode !== null) rozwiaz(); else serwer.once('exit', rozwiaz) })
  }
})
