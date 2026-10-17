import { register } from 'node:module'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
register('./loaderKomponentow.mjs', import.meta.url)
const magazyn = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (klucz) => magazyn.get(klucz) ?? null, setItem: (klucz, wartosc) => magazyn.set(klucz, wartosc), removeItem: (klucz) => magazyn.delete(klucz) } })
const { default: WidokPulpitu } = await import('../src/moduly/zamkniete/pulpit/WidokPulpitu.tsx')
const { KontekstUzytkownika } = await import('../src/aplikacja/logowanie/stanKontekstuUzytkownika.ts')
const { pobierzUzytkownikow } = await import('../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
const konta = pobierzUzytkownikow()
const wartosc = { zalogowanyUzytkownik: konta[0], aktywniUzytkownicy: konta, zaloguj: () => false, wyloguj: () => {}, odswiezUzytkownika: () => {} }
const wynik = renderToStaticMarkup(createElement(KontekstUzytkownika.Provider, { value: wartosc }, createElement(WidokPulpitu)))
assert.match(wynik, /aria-label="Podsumowanie"/)
assert.match(wynik, /aria-label="Oś dnia — przewijanie poziome"/)
assert.equal((wynik.match(/class="pulpit-kafelek__ikona"/g) ?? []).length, 5)
assert.match(wynik, /data-status="warning"/)
assert.match(wynik, /data-status="error"/)
assert.match(wynik, /Brak zadań bez przypisanej godziny/)
assert.match(wynik, /Brak paczek w oknie wysyłki/)
const { default: FormularzZakupu } = await import('../src/moduly/zamkniete/pulpit/FormularzZakupu.tsx')
const formularz = { nazwa: '', ilosc: '1', uwagi: '', linkiProduktow: [''], zalaczniki: [] }
for (const czyZamawiacz of [false, true]) {
  const html = renderToStaticMarkup(createElement(FormularzZakupu, { formularz, ustawFormularz: () => {}, blad: 'Niepoprawne dane', zapisz: () => {}, anuluj: () => {}, czyZamawiacz }))
  assert.match(html, /role="alert"/)
  assert.match(html, /Niepoprawne dane/)
  assert.equal(html.includes('Link do produktu 1'), czyZamawiacz, 'Dostępność linków nadal zależy od istniejącego uprawnienia')
  assert.match(html, /type="submit"/)
}
console.log('V4-04: rzeczywiste kafelki, semantyka, oś, puste stany i formularz zakupu — OK.')
