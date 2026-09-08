import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizujBlokiSwobodneDokumentu, ograniczBlokDoStrony, type BlokSwobodnyDokumentu } from '../src/wspolne/dokumenty/modelSwobodnychBlokow.ts'
import { WERSJA_UKLADU_DOKUMENTU, normalizujUstawieniaUkladuDokumentu, utworzUstawieniaUkladuDokumentu } from '../src/wspolne/dokumenty/ustawieniaUkladuDokumentu.ts'
import { utworzPoczatkowyStanPaneluGeneratora, zredukujStanPaneluGeneratora } from '../src/moduly/dokumenty/wspolne/stanPaneluGeneratora.ts'
import { deserializujDaneListyObecnosci, utworzDomyslneDaneListyObecnosci } from '../src/moduly/dokumenty/generatory/listy_obecnosci/modelListyObecnosci.ts'
import { normalizujDaneChecklisty, utworzBlokiSzablonuChecklistyPaczki } from '../src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts'

const tekst: BlokSwobodnyDokumentu = {
  id: 'tekst', typ: 'tekst', rola: 'pole_tekstowe', xMm: 12, yMm: 18, szerokoscMm: 50, wysokoscMm: 12,
  przypisanieDoStrony: { rodzaj: 'pierwsza' }, widoczny: true, indeksWarstwy: 2,
  dane: { zrodlo: { rodzaj: 'statyczne', tekst: 'Nagłówek' }, rozmiarCzcionkiPt: 12, gruboscCzcionki: 700, wyrownanie: 'srodek', interlinia: 1.1 },
}

const ograniczony = ograniczBlokDoStrony({ ...tekst, xMm: 205, yMm: 295, szerokoscMm: 20, wysokoscMm: 20 })
assert.equal(ograniczony.xMm, 190)
assert.equal(ograniczony.yMm, 277)
assert.equal(normalizujBlokiSwobodneDokumentu([{ ...tekst, widoczny: false }])[0].widoczny, false)

const ustawienia = utworzUstawieniaUkladuDokumentu([tekst], 4)
assert.equal(ustawienia.zoom, 2)
assert.equal(ustawienia.wersja, WERSJA_UKLADU_DOKUMENTU)
assert.equal(normalizujUstawieniaUkladuDokumentu({ blokiSwobodne: [tekst], zoom: 0.25 }, []).zoom, 0.5)
assert.equal(normalizujUstawieniaUkladuDokumentu({ wersja: 1, bloki: [tekst] }, []).wersja, WERSJA_UKLADU_DOKUMENTU)
assert.equal(normalizujUstawieniaUkladuDokumentu({ ukladDokumentu: { wersja: 1, bloki: [tekst] } }, []).blokiSwobodne.length, 1)
assert.equal(normalizujUstawieniaUkladuDokumentu([tekst], []).blokiSwobodne.length, 1)
assert.deepEqual(normalizujUstawieniaUkladuDokumentu({ blokiSwobodne: [] }, [tekst]).blokiSwobodne, [])
const ustawieniaZBlokada = normalizujUstawieniaUkladuDokumentu({ bloki: [{ ...tekst, zablokowany: true, widoczny: false }] }, [])
assert.equal(ustawieniaZBlokada.blokiSwobodne[0]?.zablokowany, true)
assert.equal(ustawieniaZBlokada.blokiSwobodne[0]?.widoczny, false)
assert.deepEqual(
  ustawieniaZBlokada.blokiSwobodne[0] && {
    xMm: ustawieniaZBlokada.blokiSwobodne[0].xMm,
    yMm: ustawieniaZBlokada.blokiSwobodne[0].yMm,
    szerokoscMm: ustawieniaZBlokada.blokiSwobodne[0].szerokoscMm,
    wysokoscMm: ustawieniaZBlokada.blokiSwobodne[0].wysokoscMm,
  },
  { xMm: 12, yMm: 18, szerokoscMm: 50, wysokoscMm: 12 },
)

const panelPoczatkowy = { czyOtwarty: false, czyPrzypiety: false, czyWysuwanieWlaczone: true }
const panelOtwarty = zredukujStanPaneluGeneratora(panelPoczatkowy, 'OTWORZ')
assert.equal(panelOtwarty.czyOtwarty, true)
assert.deepEqual(zredukujStanPaneluGeneratora(panelOtwarty, 'PRZELACZ'), panelPoczatkowy)
assert.deepEqual(zredukujStanPaneluGeneratora(panelPoczatkowy, 'PRZELACZ'), panelOtwarty)
const panelPrzypiety = zredukujStanPaneluGeneratora(panelPoczatkowy, 'PRZELACZ_PRZYPIECIE')
assert.deepEqual(panelPrzypiety, { czyOtwarty: true, czyPrzypiety: true, czyWysuwanieWlaczone: true })
assert.equal(zredukujStanPaneluGeneratora(panelPrzypiety, 'SCHOWAJ_JESLI_ODPIETY').czyOtwarty, true)
assert.deepEqual(zredukujStanPaneluGeneratora(panelPrzypiety, 'ZAMKNIJ'), panelPoczatkowy)
assert.deepEqual(zredukujStanPaneluGeneratora(panelPrzypiety, 'PRZELACZ'), panelPoczatkowy)
const panelOdpiety = zredukujStanPaneluGeneratora(panelPrzypiety, 'PRZELACZ_PRZYPIECIE')
assert.deepEqual(panelOdpiety, panelPoczatkowy)
assert.equal(zredukujStanPaneluGeneratora(panelOtwarty, 'SCHOWAJ_JESLI_ODPIETY').czyOtwarty, false)
const panelBezWysuwania = zredukujStanPaneluGeneratora(panelPoczatkowy, 'PRZELACZ_WYSUWANIE')
assert.equal(panelBezWysuwania.czyWysuwanieWlaczone, false)
assert.equal(zredukujStanPaneluGeneratora(panelBezWysuwania, 'OTWORZ').czyOtwarty, true)
assert.equal(zredukujStanPaneluGeneratora(panelOtwarty, 'PRZELACZ_WYSUWANIE').czyOtwarty, true)
assert.deepEqual(
  utworzPoczatkowyStanPaneluGeneratora({ czyPrzypiety: true, czyWysuwanieWlaczone: false }),
  { czyOtwarty: true, czyPrzypiety: true, czyWysuwanieWlaczone: false },
)
assert.equal(utworzDomyslneDaneListyObecnosci().blokiSwobodne.length, 4)
const starszaLista = deserializujDaneListyObecnosci(JSON.stringify({ tytulSzkolenia: 'Starszy dokument', uczestnicy: [] }))
assert.equal(starszaLista.tytulSzkolenia, 'Starszy dokument')
assert.equal(starszaLista.blokiSwobodne.length, 4)

const staraChecklista = { statusChecklisty: 'KOPIA_ROBOCZA', pozycje: [], kategorie: [], daneOdbiorcy: {} } as never
const znormalizowana = normalizujDaneChecklisty(staraChecklista)
assert.equal(znormalizowana.blokiSwobodne.length, utworzBlokiSzablonuChecklistyPaczki().length)
assert.equal('daneDokumentu' in ustawienia, false)

const katalogProjektu = fileURLToPath(new URL('..', import.meta.url))
const wczytajPlik = (sciezka: string) => readFileSync(new URL(sciezka, `file:///${katalogProjektu.replaceAll('\\', '/')}/`), 'utf8')
const plikiWidokow = [
  'src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx',
  'src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx',
  'src/moduly/dokumenty/generatory/ankiety/WidokAnkiet.tsx',
  'src/moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci.tsx',
  'src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx',
  'src/moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi.tsx',
]

for (const plik of plikiWidokow) {
  assert.match(wczytajPlik(plik), /<UkladFormularzaIPodgladu(?:\s|>)/)
}

const cssWspolnegoUkladu = wczytajPlik('src/moduly/dokumenty/wspolne/ukladGeneratoraDokumentu.css')
assert.match(cssWspolnegoUkladu, /\.generator-dokumentu__obszar-roboczy\s*\{[^}]*grid-template-columns:\s*minmax\(320px, 1fr\) minmax\(420px, 1fr\)/s)
assert.match(cssWspolnegoUkladu, /@container \(max-width:\s*980px\)\s*\{\s*\.generator-dokumentu__obszar-roboczy\s*\{\s*grid-template-columns:\s*1fr/s)
assert.match(cssWspolnegoUkladu, /\.generator-panel-ustawien\s*\{[^}]*pointer-events:\s*none/s)
assert.match(cssWspolnegoUkladu, /@media print[\s\S]*\.generator-panel-ustawien\s*\{\s*display:\s*none !important/)

for (const [plik, klasaUkladu] of [
  ['src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx', 'program-szkolen__uklad'],
  ['src/moduly/dokumenty/generatory/dyplomy/widokDyplomow.css', 'dyplomy__uklad'],
]) {
  const definicjaUkladu = wczytajPlik(plik).match(new RegExp(`\\.${klasaUkladu}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  assert.doesNotMatch(definicjaUkladu, /grid-template-columns/)
}

const wspolnyKomponent = wczytajPlik('src/moduly/dokumenty/wspolne/UkladGeneratoraDokumentu.tsx')
assert.match(wspolnyKomponent, /aria-hidden=\{!czyOtwarty\}/)
assert.match(wspolnyKomponent, /inert=\{!czyOtwarty\}/)
assert.match(wspolnyKomponent, /data-pomin-w-eksporcie/)
