import assert from 'node:assert/strict'
import { normalizujBlokiSwobodneDokumentu, ograniczBlokDoStrony, type BlokSwobodnyDokumentu } from '../src/wspolne/dokumenty/modelSwobodnychBlokow.ts'
import { normalizujUstawieniaUkladuDokumentu, utworzUstawieniaUkladuDokumentu } from '../src/wspolne/dokumenty/ustawieniaUkladuDokumentu.ts'
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
assert.equal(normalizujUstawieniaUkladuDokumentu({ blokiSwobodne: [tekst], zoom: 0.25 }, []).zoom, 0.5)
assert.equal(utworzDomyslneDaneListyObecnosci().blokiSwobodne.length, 4)
const starszaLista = deserializujDaneListyObecnosci(JSON.stringify({ tytulSzkolenia: 'Starszy dokument', uczestnicy: [] }))
assert.equal(starszaLista.tytulSzkolenia, 'Starszy dokument')
assert.equal(starszaLista.blokiSwobodne.length, 4)

const staraChecklista = { statusChecklisty: 'KOPIA_ROBOCZA', pozycje: [], kategorie: [], daneOdbiorcy: {} } as never
const znormalizowana = normalizujDaneChecklisty(staraChecklista)
assert.equal(znormalizowana.blokiSwobodne.length, utworzBlokiSzablonuChecklistyPaczki().length)
assert.equal('daneDokumentu' in ustawienia, false)
