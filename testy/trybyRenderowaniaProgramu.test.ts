import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { wykonajEksportPoPrzygotowaniu } from '../src/wspolne/dokumenty/przygotowanieEksportu.ts'
import { czyBlokWidocznyNaStronie, normalizujBlokiSwobodneDokumentu } from '../src/wspolne/dokumenty/modelSwobodnychBlokow.ts'
import { czyPokazacElementyPomocniczeEdytora } from '../src/wspolne/dokumenty/trybRenderowaniaDokumentu.ts'
import { utworzModelPaginacjiProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/paginatorProgramu.ts'
import type { DokumentBlokowy } from '../src/wspolne/dokumenty/modelBlokowy.ts'

const rendererProgramu = readFileSync(new URL('../src/moduly/dokumenty/generatory/programy_szkolen/RendererPodgladuProgramu.tsx', import.meta.url), 'utf8')
const rendererStron = readFileSync(new URL('../src/moduly/dokumenty/generatory/programy_szkolen/RendererStronProgramu.tsx', import.meta.url), 'utf8')
const widokProgramow = readFileSync(new URL('../src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx', import.meta.url), 'utf8')

test('tryb roboczy udostępnia placeholder pustych podpunktów jako element pomocniczy edytora', () => {
  assert.equal(czyPokazacElementyPomocniczeEdytora('roboczy'), true)
  assert.match(rendererProgramu, /<ElementPomocniczyEdytora trybRenderowania=\{trybRenderowania\}>\s*<div className="program-kartka-a4__pusty">Brak podpunktów\.<\/div>/)
})

test('tryb finalny usuwa element pomocniczy razem z jego wysokością', () => {
  assert.equal(czyPokazacElementyPomocniczeEdytora('finalny'), false)
  assert.match(rendererProgramu, /ElementPomocniczyEdytora/)
  assert.doesNotMatch(rendererProgramu, /trybRenderowania === 'finalny'.*program-kartka-a4__pusty/)
  assert.match(rendererStron, /trybRenderowania="finalny"/)
})

test('PDF i druk wykonują akcję dopiero po przygotowaniu finalnego renderera', async () => {
  for (const rodzajEksportu of ['PDF', 'druk']) {
    let tryb: 'roboczy' | 'finalny' = 'roboczy'
    let trybPodczasEksportu = ''

    await wykonajEksportPoPrzygotowaniu({
      przygotuj: () => { tryb = 'finalny' },
      wykonaj: () => { trybPodczasEksportu = tryb },
      zakoncz: () => { tryb = 'roboczy' },
    })

    assert.equal(trybPodczasEksportu, 'finalny', rodzajEksportu)
    assert.equal(tryb, 'roboczy', rodzajEksportu)
  }

  assert.match(widokProgramow, /przygotujEksport=\{przygotujFinalnyRenderer\}/)
  assert.match(widokProgramow, /zakonczEksport=\{zakonczFinalnyRenderer\}/)
})

test('zwykłe podpunkty pozostają częścią modelu renderowania', () => {
  const dokument: DokumentBlokowy = {
    id: 'program',
    typDokumentu: 'PROGRAM_SZKOLENIA',
    tytul: 'Program',
    metadane: { utworzono: '', zaktualizowano: '', wersja: 1, status: 'ROBOCZY' },
    struktura: [{
      id: 'dzien', typ: 'Dzien', tresc: 'Dzień 1', metadane: {}, stylLokalny: {}, statusDiagnostyczny: 'poprawny',
      dzieci: [{
        id: 'modul', typ: 'Modul', tresc: 'Moduł', metadane: {}, stylLokalny: {}, statusDiagnostyczny: 'poprawny',
        dzieci: [{ id: 'punkt', typ: 'Punkt', tresc: 'Treść punktu', dzieci: [], metadane: { poziom: 0 }, stylLokalny: { wciecie: 0 }, statusDiagnostyczny: 'poprawny' }],
      }],
    }],
  }

  assert.equal(utworzModelPaginacjiProgramu(dokument).dni[0].moduly[0].grupyPunktow[0].bloki[0].tresc, 'Treść punktu')
})

test('swobodne bloki dokumentu pozostają widoczne w finalnym rendererze', () => {
  const [blok] = normalizujBlokiSwobodneDokumentu([{
    id: 'tekst', typ: 'tekst', xMm: 10, yMm: 10, szerokoscMm: 30, wysokoscMm: 10,
    przypisanieDoStrony: { rodzaj: 'pierwsza' }, widoczny: true, indeksWarstwy: 1,
    dane: { zrodlo: { rodzaj: 'statyczne', tekst: 'Treść' }, rozmiarCzcionkiPt: 10, gruboscCzcionki: 400, wyrownanie: 'lewo', interlinia: 1.2 },
  }])

  assert.equal(czyBlokWidocznyNaStronie(blok, 1), true)
  assert.match(rendererStron, /<RendererSwobodnychBlokow[^>]+trybRenderowania=\{trybRenderowania\}/)
  assert.match(rendererStron, /<EdytowalnaWarstwaSwobodnychBlokow/)
  assert.match(widokProgramow, /<PanelEdycjiSwobodnychBlokow/)
  assert.match(widokProgramow, /zapiszZasobObrazuDokumentu/)
})
