import { normalizujBlokiSwobodneDokumentu } from '../src/wspolne/dokumenty/modelSwobodnychBlokow.ts'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { zmienWygladTytuluListy, deserializujDaneListyObecnosci, podzielListeObecnosciNaStrony, serializujDaneListyObecnosci, utworzDomyslneDaneListyObecnosci } from '../src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci.ts'
import { domyslnyWygladTabeliListy, minimalnaWysokoscWierszaMm, normalizujWygladTabeliListy, pobierzBladPrzepelnieniaListy, pobierzStylTabeliListy, przesunWygladTabeliListy, zmienWygladTabeliListy } from '../src/moduly/dokumenty/generatory/listy_obecnosci/wygladTabeliListy.ts'
import { pobierzLogoOrganizatora } from '../src/wspolne/dokumenty/logoOrganizatora.ts'
import { pobierzSzablonDokumentuPoId, zapiszKopieUkladuSwobodnychBlokow } from '../src/wspolne/dokumenty/szablonyDokumentow.ts'
import { zapiszDokumentRoboczyGeneratora } from '../src/wspolne/dokumenty/zapisDokumentuGeneratora.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'

// JSX renderujemy rzeczywistym Reactem; pozostałe testy korzystają nadal z dotychczasowego loadera TS.
registerHooks({
  resolve(sciezka, kontekst, dalej) {
    if (sciezka.startsWith('.') && kontekst.parentURL) {
      const adres = new URL(`${sciezka}.tsx`, kontekst.parentURL)
      if (existsSync(adres)) return { url: adres.href, shortCircuit: true }
    }
    return dalej(sciezka, kontekst)
  },
  load(adres, kontekst, dalej) {
    if (adres.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
    if (adres.endsWith('.tsx')) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(adres), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    }
    return dalej(adres, kontekst)
  },
})

const domyslne = utworzDomyslneDaneListyObecnosci()
const zmienione = zmienWygladTabeliListy(domyslne.wygladTabeli, 'wysokoscWierszaMm', 12)
assert.equal(zmienione.wysokoscWierszaMm, 12)
const niskie = zmienWygladTabeliListy(domyslne.wygladTabeli, 'wysokoscWierszaMm', 0)
assert.equal(niskie.wysokoscWierszaMm, minimalnaWysokoscWierszaMm(niskie.rozmiarTekstuPt))
const duzyFont = zmienWygladTabeliListy(niskie, 'rozmiarTekstuPt', 14)
assert.equal(duzyFont.wysokoscWierszaMm, 8.1)
assert.ok(duzyFont.wysokoscWierszaMm > niskie.wysokoscWierszaMm)
assert.equal(zmienWygladTabeliListy(duzyFont, 'rozmiarTekstuPt', 7).wysokoscWierszaMm, 8.1)
assert.equal(normalizujWygladTabeliListy({ rozmiarTekstuPt: Infinity, wysokoscWierszaMm: NaN }).rozmiarTekstuPt, domyslne.wygladTabeli.rozmiarTekstuPt)
for (const pole of ['rozmiarTekstuPt', 'rozmiarNaglowkowPt'] as const) {
  const wyglad = { ...zmienione, [pole]: 10 }
  assert.equal(przesunWygladTabeliListy(wyglad, pole, 1)[pole], 10.5)
  assert.equal(przesunWygladTabeliListy(wyglad, pole, -1)[pole], 9.5)
  assert.equal(przesunWygladTabeliListy({ ...wyglad, [pole]: 14 }, pole, 1)[pole], 14)
  assert.equal(przesunWygladTabeliListy({ ...wyglad, [pole]: 7 }, pole, -1)[pole], 7)
}
assert.equal(przesunWygladTabeliListy(zmienione, 'wysokoscWierszaMm', 1).wysokoscWierszaMm, 12.1)
assert.equal(przesunWygladTabeliListy(niskie, 'wysokoscWierszaMm', -1).wysokoscWierszaMm, niskie.wysokoscWierszaMm)
assert.equal(przesunWygladTabeliListy({ ...zmienione, wysokoscWierszaMm: 20 }, 'wysokoscWierszaMm', 1).wysokoscWierszaMm, 20)

assert.deepEqual(deserializujDaneListyObecnosci('{}').wygladTabeli, domyslnyWygladTabeliListy)
assert.deepEqual(deserializujDaneListyObecnosci('Tryb listy: pusta').wygladTabeli, domyslnyWygladTabeliListy)
const dane = { ...domyslne, trybListy: 'PUSTA' as const, liczbaPustychWierszy: 12, wygladTabeli: { ...duzyFont, rozmiarNaglowkowPt: 13 } }
assert.deepEqual(deserializujDaneListyObecnosci(serializujDaneListyObecnosci(dane)).wygladTabeli, dane.wygladTabeli)
for (const liczba of [10, 12, 15, 20, 200]) {
  for (const wysokosc of [6.346, 12, 20]) {
    const lista = { ...dane, liczbaPustychWierszy: liczba, wygladTabeli: normalizujWygladTabeliListy({ ...duzyFont, wysokoscWierszaMm: wysokosc }) }
    const strony = podzielListeObecnosciNaStrony(lista)
    assert.equal(strony.flatMap((strona) => strona.uczestnicy).length, liczba)
    assert.ok(strony.every((strona) => strona.uczestnicy.length * lista.wygladTabeli.wysokoscWierszaMm <= 28 * domyslnyWygladTabeliListy.wysokoscWierszaMm))
  }
}
const osoby = { ...dane, trybListy: 'WYPELNIONA' as const, uczestnicy: Array.from({ length: 20 }, (_, indeks) => ({ id: `osoba-${indeks}`, imieINazwisko: 'Anna Kowalska' })) }
assert.equal(podzielListeObecnosciNaStrony(osoby).flatMap((strona) => strona.uczestnicy).length, 20)

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz) => magazyn.get(klucz) ?? null,
  setItem: (klucz, wartosc) => { magazyn.set(klucz, wartosc) },
  removeItem: (klucz) => { magazyn.delete(klucz) }, clear: () => magazyn.clear(),
  key: (indeks) => [...magazyn.keys()][indeks] ?? null, get length() { return magazyn.size },
}
const szablon = zapiszKopieUkladuSwobodnychBlokow({ nazwa: 'Test wyglądu listy', typDokumentu: 'Lista obecności', organizator: 'SEMPER', autor: 'Test', bloki: dane.blokiSwobodne, konfiguracjaGeneratora: { wygladTabeli: dane.wygladTabeli } })
assert.deepEqual(normalizujWygladTabeliListy(pobierzSzablonDokumentuPoId(szablon.id)?.dokumentBlokowy.dane.konfiguracjaGeneratora?.wygladTabeli), dane.wygladTabeli)
const zapis = { typ: 'LISTA_OBECNOSCI' as const, generatorId: 'listy_obecnosci', tytul: 'Test', daneDokumentu: { tekst: serializujDaneListyObecnosci(dane), listaObecnosci: dane }, ustawieniaDokumentu: {} }
const dokument = zapiszDokumentRoboczyGeneratora(zapis)
assert.ok(dokument)
assert.deepEqual(repozytoriumWspolnychDokumentow.pobierzPoId(dokument.id)?.daneDokumentu, zapis.daneDokumentu)
const poZmianie = { ...dane, wygladTabeli: zmienione }
zapiszDokumentRoboczyGeneratora({ ...zapis, id: dokument.id, daneDokumentu: { tekst: serializujDaneListyObecnosci(poZmianie), listaObecnosci: poZmianie } })
assert.deepEqual(repozytoriumWspolnychDokumentow.pobierzPoId(dokument.id)?.daneDokumentu, { tekst: serializujDaneListyObecnosci(poZmianie), listaObecnosci: poZmianie })

const { default: Renderer } = await import('../src/moduly/dokumenty/generatory/listy_obecnosci/RendererListyObecnosci.tsx')
const { default: Kontrolki } = await import('../src/moduly/dokumenty/generatory/listy_obecnosci/UstawieniaTabeliListy.tsx')
const html = renderToStaticMarkup(createElement(Renderer, { dane }))
for (const [klucz, wartosc] of Object.entries(pobierzStylTabeliListy(dane.wygladTabeli))) assert.ok(html.includes(`${klucz}:${wartosc}`))
assert.ok(html.includes(`src="${pobierzLogoOrganizatora('SEMPER')}"`))
assert.ok(html.includes('object-fit:contain'))
assert.ok(html.includes('data-strona-dokumentu'))
const kontrolki = renderToStaticMarkup(createElement(Kontrolki, { dane, ustawDane: () => {} }))
assert.equal((kontrolki.match(/type="range"/g) ?? []).length, 3)
assert.equal((kontrolki.match(/aria-label="Zmniejsz:/g) ?? []).length, 3)
assert.equal((kontrolki.match(/aria-label="Zwiększ:/g) ?? []).length, 3)
const odczytaj = (sciezka: string) => readFileSync(fileURLToPath(new URL(sciezka, import.meta.url)), 'utf8')
assert.ok(odczytaj('../src/moduly/dokumenty/generatory/programy_szkolen/RendererStronProgramu.tsx').includes("pobierzLogoOrganizatora('SEMPER')"))
assert.ok(existsSync(new URL(`../public${pobierzLogoOrganizatora('SEMPER')}`, import.meta.url)))
const css = odczytaj('../src/moduly/dokumenty/generatory/listy_obecnosci/widokListObecnosci.css')
assert.ok(css.includes('height: var(--wysokosc-wiersza)'))
assert.ok(css.includes('font-size: var(--font-tabeli)'))
const druk = css.split('@media print')[1].split('@media')[0]
assert.ok(!druk.includes('font-size') && !druk.includes('--wysokosc-wiersza'))
assert.ok(odczytaj('../src/wspolne/dokumenty/eksportPdfLegacy.ts').includes('html2canvas(stronaDokumentu'))
assert.equal(pobierzBladPrzepelnieniaListy(null), null)
console.log('OK: wygląd List obecności — minimum, font, przyciski, normalizacja, zapis, szablon, paginacja, wspólny renderer i logo')

const tytulZmieniony = zmienWygladTytuluListy(zmienWygladTytuluListy(dane, 'rozmiarCzcionkiPt', 12), 'marginesMm', 10)
const blokTytulu = tytulZmieniony.blokiSwobodne.find((blok) => blok.id === 'lista-szkolenie')!
assert.equal(blokTytulu.xMm, 10)
assert.equal(blokTytulu.szerokoscMm, 190)
assert.equal(210 - blokTytulu.xMm - blokTytulu.szerokoscMm, blokTytulu.xMm)
assert.ok(blokTytulu.typ === 'tekst')
assert.equal(blokTytulu.dane.rozmiarCzcionkiPt, 12)
assert.deepEqual(tytulZmieniony.blokiSwobodne.filter((blok) => blok.id !== 'lista-szkolenie'), dane.blokiSwobodne.filter((blok) => blok.id !== 'lista-szkolenie'))
assert.deepEqual(deserializujDaneListyObecnosci(serializujDaneListyObecnosci(tytulZmieniony)).blokiSwobodne, normalizujBlokiSwobodneDokumentu(tytulZmieniony.blokiSwobodne))
assert.equal(zmienWygladTytuluListy(dane, 'marginesMm', NaN), dane)
assert.equal(zmienWygladTytuluListy(dane, 'marginesMm', 100).blokiSwobodne.find((blok) => blok.id === 'lista-szkolenie')!.xMm, 55)
const htmlTytulu = renderToStaticMarkup(createElement(Renderer, { dane: tytulZmieniony }))
assert.ok(htmlTytulu.includes('font-size:2.016cqw'))
assert.ok(htmlTytulu.includes(`width:${190 * 100 / 210}%`))
const { default: KontrolkiTytulu } = await import('../src/moduly/dokumenty/generatory/listy_obecnosci/UstawieniaTytuluListy.tsx')
assert.equal((renderToStaticMarkup(createElement(KontrolkiTytulu, { dane, ustawDane: () => {} })).match(/type="range"/g) ?? []).length, 2)
const szablonTytulu = zapiszKopieUkladuSwobodnychBlokow({ nazwa: 'Test tytułu listy', typDokumentu: 'Lista obecności', organizator: 'SEMPER', autor: 'Test', bloki: tytulZmieniony.blokiSwobodne })
assert.deepEqual(pobierzSzablonDokumentuPoId(szablonTytulu.id)?.dokumentBlokowy.blokiSwobodne, tytulZmieniony.blokiSwobodne)

const widokListy = odczytaj('../src/moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci.tsx')
const formularzListy = widokListy.split('export function FormularzListyObecnosci')[1].split('export function UstawieniaUkladuListy')[0]
const ustawieniaUkladu = widokListy.split('export function UstawieniaUkladuListy')[1].split('export default function')[0]
assert.ok(formularzListy.includes('<KalendarzDatListy'))
for (const kontrolka of ['<UstawieniaTytuluListy', '<UstawieniaTabeliListy', '<fieldset', 'Podpis trenera', 'Podpis organizatora', 'Zastosuj sugerowany wariant']) {
  assert.ok(!formularzListy.includes(kontrolka))
  assert.ok(ustawieniaUkladu.includes(kontrolka))
}
for (const widok of [widokListy, odczytaj('../src/moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu.tsx')]) {
  const panel = widok.split('<PanelBocznyGeneratora>')[1].split('</PanelBocznyGeneratora>')[0]
  assert.ok(panel.includes('<UstawieniaUkladuListy'))
  assert.ok(!panel.includes('<FormularzEdycjiListy'))
}
