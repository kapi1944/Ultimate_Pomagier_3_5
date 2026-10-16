import assert from 'node:assert/strict'
import { odczytaj } from './inwentaryzacjaV4.mjs'
import { domyslneUstawieniaAplikacji, normalizujUstawieniaAplikacji, paletyInterfejsu } from '../src/aplikacja/ustawienia/modelUstawienAplikacji.ts'
import { pobierzUstawieniaAplikacji, zapiszUstawieniaAplikacji, importujUstawieniaAplikacji, eksportujUstawieniaAplikacji, kluczUstawienAplikacji } from '../src/aplikacja/ustawienia/magazynUstawienAplikacji.ts'

const magazyn = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (klucz) => magazyn.get(klucz) ?? null, setItem: (klucz, wartosc) => magazyn.set(klucz, wartosc) } })
assert.equal(pobierzUstawieniaAplikacji().wyglad.paleta, 'EMERALD_DARK')
for (const paleta of paletyInterfejsu) {
  const ustawienia = structuredClone(domyslneUstawieniaAplikacji)
  ustawienia.wyglad.paleta = paleta
  ustawienia.wyglad.promienKart = 17
  ustawienia.nawigacja.szerokoscMenu = 320
  ustawienia.pulpit.widoczneKafelki.paczki = false
  ustawienia.zadania.domyslnePrzypomnienia.godzina = true
  ustawienia.dostepnosc.ograniczAnimacje = true
  const tekst = JSON.stringify(ustawienia)
  magazyn.set(kluczUstawienAplikacji, tekst)
  assert.deepEqual(pobierzUstawieniaAplikacji(), ustawienia, `Odczyt starej/nowej palety ${paleta} bez utraty preferencji`)
  assert.equal(magazyn.get(kluczUstawienAplikacji), tekst, 'Odczyt nie przepisuje danych')
  assert.equal(zapiszUstawieniaAplikacji(ustawienia), true)
  assert.deepEqual(importujUstawieniaAplikacji(eksportujUstawieniaAplikacji()), { ok: true, ustawienia })
}
assert.equal(normalizujUstawieniaAplikacji({ wersja: 1, wyglad: { paleta: 'CRM' } }).wyglad.paleta, 'CRM')
assert.equal(normalizujUstawieniaAplikacji({ wyglad: { paleta: 'nieznana' } }).wyglad.paleta, 'EMERALD_DARK')
magazyn.set(kluczUstawienAplikacji, '{uszkodzony')
assert.equal(pobierzUstawieniaAplikacji().wyglad.paleta, 'EMERALD_DARK')
assert.equal(magazyn.get(kluczUstawienAplikacji), '{uszkodzony')
assert.equal(importujUstawieniaAplikacji('{"wersja":2}').ok, false)

const css = odczytaj('src/wspolne/komponenty/tokeny.css')
function tokeny(tekst) { return Object.fromEntries([...tekst.matchAll(/(--[\w-]+):\s*(#[\da-f]{6});/gi)].map((wpis) => [wpis[1], wpis[2]])) }
const wspolne = tokeny(css.slice(0, css.indexOf('html:not')))
function luminancja(kolor) {
  const skladowe = kolor.slice(1).match(/../g).map((kanal) => parseInt(kanal, 16) / 255).map((kanal) => kanal <= .04045 ? kanal / 12.92 : ((kanal + .055) / 1.055) ** 2.4)
  return skladowe[0] * .2126 + skladowe[1] * .7152 + skladowe[2] * .0722
}
function kontrast(pierwszy, drugi) { const a = luminancja(pierwszy); const b = luminancja(drugi); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }
for (const motyw of ['EMERALD_DARK', 'SOFT_GREY', 'DARK_GRAY']) {
  const blok = css.match(new RegExp(`\\[data-ui-paleta="${motyw}"\\] \\{([^}]+)`))[1]
  const wartosci = { ...wspolne, ...tokeny(blok) }
  for (const tlo of ['--ui-tlo', '--ui-panel', '--ui-powierzchnia', '--ui-pole']) {
    assert.notEqual(wartosci[tlo], '#ffffff')
    for (const tekst of ['--ui-tekst', '--ui-tekst-drugi']) assert.ok(kontrast(wartosci[tekst], wartosci[tlo]) >= 4.5, `${motyw}: ${tekst} / ${tlo}`)
    assert.ok(kontrast(wartosci['--ui-focus'], wartosci[tlo]) >= 3, `${motyw}: fokus / ${tlo}`)
    assert.ok(kontrast(wartosci['--ui-obramowanie'], wartosci[tlo]) >= 3, `${motyw}: obramowanie / ${tlo}`)
  }
  assert.ok(kontrast(wartosci['--ui-tekst-na-akcencie'], wartosci['--ui-akcent']) >= 4.5)
  assert.ok(kontrast(wartosci['--ui-tekst'], wartosci['--ui-akcent-mocny']) >= 4.5)
  for (const status of ['success', 'warning', 'error', 'info', 'draft']) {
    assert.ok(kontrast(wartosci[`--ui-${status}`], wartosci[`--ui-${status}-tlo`]) >= 4.5, `${motyw}: ${status}`)
    assert.ok(kontrast(wartosci[`--ui-${status}`], wartosci['--ui-panel']) >= 4.5, `${motyw}: ${status} na panelu`)
  }
  assert.notEqual(wartosci['--ui-draft'], wartosci['--ui-error'])
}
console.log('V4: stare/nowe ustawienia, zapis/odczyt/import/eksport oraz kontrast AA tokenów w trzech motywach — OK.')
