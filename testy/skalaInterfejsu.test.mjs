import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mockIPC, mockWindows, clearMocks } from '@tauri-apps/api/mocks'
import { domyslneUstawieniaAplikacji, normalizujUstawieniaAplikacji, normalizujSkaleInterfejsu, paletyInterfejsu, gestosciInterfejsu } from '../src/aplikacja/ustawienia/modelUstawienAplikacji.ts'
import { zastosujSkaleInterfejsu, pobierzSkaleInterfejsu, pobierzBladSkalowania, obliczSkalePoSkrocie, zarejestrujSkrotySkaliInterfejsu } from '../src/aplikacja/ustawienia/skalaInterfejsu.ts'
import { pobierzUstawieniaAplikacji, zapiszUstawieniaAplikacji, zastosujUstawieniaAplikacji, kluczUstawienAplikacji, eksportujUstawieniaAplikacji, importujUstawieniaAplikacji } from '../src/aplikacja/ustawienia/magazynUstawienAplikacji.ts'

const magazyn = new Map()
const style = new Map()
globalThis.window = new EventTarget()
globalThis.document = { documentElement: { dataset: {}, style: { setProperty: (klucz, wartosc) => style.set(klucz, wartosc) } } }
globalThis.localStorage = { getItem: (klucz) => magazyn.get(klucz) ?? null, setItem: (klucz, wartosc) => magazyn.set(klucz, wartosc) }
assert.equal(domyslneUstawieniaAplikacji.wyglad.skalaInterfejsu, 100)
assert.equal(JSON.stringify(normalizujUstawieniaAplikacji(domyslneUstawieniaAplikacji)), JSON.stringify(domyslneUstawieniaAplikacji), 'Reset nie tworzy pozornych niezapisanych zmian')
assert.equal(normalizujUstawieniaAplikacji({ wyglad: { paleta: 'CRM', promienKart: 17 } }).wyglad.skalaInterfejsu, 100)
for (const [wejscie, wynik] of [[undefined, 100], [NaN, 100], [Infinity, 100], ['85', 100], [0, 70], [999, 130], [83, 85], [86, 85]]) assert.equal(normalizujSkaleInterfejsu(wejscie), wynik)

for (const paleta of paletyInterfejsu) for (const gestosc of gestosciInterfejsu) for (const skala of [70, 85, 100, 115, 130]) {
  const ustawienia = normalizujUstawieniaAplikacji({ wyglad: { paleta, gestosc, skalaInterfejsu: skala }, nawigacja: { szerokoscMenu: 320 } })
  zastosujUstawieniaAplikacji(ustawienia)
  assert.equal(magazyn.has(kluczUstawienAplikacji), false, 'Podgląd nie zapisuje danych')
  assert.equal(style.get('--ui-skala-przegladarki'), String(skala / 100))
  assert.equal(document.documentElement.dataset.uiPaleta, paleta)
  assert.equal(document.documentElement.dataset.uiGestosc, gestosc)
  assert.equal(style.get('--ui-menu-width'), '320px')
}
const ustawienia = normalizujUstawieniaAplikacji({ wyglad: { skalaInterfejsu: 85 } })
assert.equal(zapiszUstawieniaAplikacji(ustawienia), true)
assert.deepEqual(pobierzUstawieniaAplikacji(), ustawienia)
assert.deepEqual(importujUstawieniaAplikacji(eksportujUstawieniaAplikacji()), { ok: true, ustawienia })
await zastosujSkaleInterfejsu(130)
zastosujUstawieniaAplikacji(pobierzUstawieniaAplikacji())
assert.equal(pobierzSkaleInterfejsu(), 85)

const zdarzenie = { key: '', code: '', ctrlKey: true, altKey: false, metaKey: false, isComposing: false, defaultPrevented: false }
for (const klawisz of ['+', '=']) assert.equal(obliczSkalePoSkrocie({ ...zdarzenie, key: klawisz }, 100), 105)
for (const klawisz of ['-', '_', '−']) assert.equal(obliczSkalePoSkrocie({ ...zdarzenie, key: klawisz }, 100), 95)
for (const [kod, wynik] of [['NumpadAdd', 105], ['NumpadSubtract', 95], ['Numpad0', 100]]) assert.equal(obliczSkalePoSkrocie({ ...zdarzenie, code: kod }, 100), wynik)
assert.equal(obliczSkalePoSkrocie({ ...zdarzenie, key: '0' }, 70), 100)
assert.equal(obliczSkalePoSkrocie({ ...zdarzenie, key: '+' }, 130), 130)
assert.equal(obliczSkalePoSkrocie({ ...zdarzenie, key: '-' }, 70), 70)
for (const zmiana of [{ ctrlKey: false }, { altKey: true }, { metaKey: true }, { isComposing: true }, { defaultPrevented: true }, { key: 's' }, { key: 'p' }]) assert.equal(obliczSkalePoSkrocie({ ...zdarzenie, key: '+', ...zmiana }, 100), null)
const usunSkroty = zarejestrujSkrotySkaliInterfejsu()
const skrot = new Event('keydown', { cancelable: true })
Object.assign(skrot, { ctrlKey: true, key: '+' })
window.dispatchEvent(skrot)
assert.equal(skrot.defaultPrevented, true)
assert.equal(pobierzSkaleInterfejsu(), 90)
usunSkroty()
window.dispatchEvent(skrot)
assert.equal(pobierzSkaleInterfejsu(), 90)

globalThis.isTauri = true
mockWindows('main')
const wywolania = []
mockIPC(async (komenda, dane) => { wywolania.push([komenda, dane]); await Promise.resolve() })
await Promise.all([zastosujSkaleInterfejsu(70), zastosujSkaleInterfejsu(85), zastosujSkaleInterfejsu(130), zastosujSkaleInterfejsu(130)])
assert.deepEqual(wywolania, [0.7, 0.85, 1.3].map((wartosc) => ['plugin:webview|set_webview_zoom', { label: 'main', value: wartosc }]))
assert.equal(style.get('--ui-skala-interfejsu'), '1.3')
assert.equal(style.get('--ui-skala-przegladarki'), '1', 'Brak podwójnego zoomu desktopowego')
assert.equal(pobierzBladSkalowania(), '')
mockIPC(() => { throw new Error('Test odmowy IPC') })
const poprzedniBlad = console.error
console.error = () => {}
try { await zastosujSkaleInterfejsu(100) } finally { console.error = poprzedniBlad }
assert.match(pobierzBladSkalowania(), /Nie udało się/)
mockIPC(() => {})
await zastosujSkaleInterfejsu(100)
assert.equal(pobierzBladSkalowania(), '')
clearMocks()
delete globalThis.isTauri

const odczytaj = (plik) => JSON.parse(readFileSync(new URL(`../src-tauri/${plik}`, import.meta.url), 'utf8'))
assert.ok(odczytaj('capabilities/desktop.json').permissions.includes('core:webview:allow-set-webview-zoom'))
assert.equal(odczytaj('tauri.conf.json').app.windows[0].zoomHotkeysEnabled, false)
console.log('Skala UI: normalizacja, podgląd, zapis, motywy, gęstość, skróty i most Tauri — OK.')
