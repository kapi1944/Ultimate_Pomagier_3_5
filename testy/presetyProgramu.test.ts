import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizujProgramSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia.ts'
import {
  konfiguracjePresetowProgramu,
  domyslnyPresetNowegoProgramu,
  normalizujPresetWygladuProgramu,
  pobierzElementyIdentyfikacjiProgramu,
  zasugerujPresetProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/presetyProgramu.ts'

test('nowy Program używa dotychczasowego wyglądu i separatora pytań', () => {
  assert.equal(domyslnyPresetNowegoProgramu, 'DOTYCHCZASOWY')
  const { ustawienia } = normalizujProgramSzkolenia(undefined)
  assert.equal(ustawienia.presetWygladu, 'DOTYCHCZASOWY')
  assert.equal(ustawienia.separacjaModulow, 'separator-pytan')
})

test('zapisany preset i separacja mają pierwszeństwo przed domyślnymi', () => {
  const { ustawienia } = normalizujProgramSzkolenia({ ustawienia: { presetWygladu: 'SEMPER_WEDLUG_DNI', separacjaModulow: 'ramka' } })
  assert.equal(ustawienia.presetWygladu, 'SEMPER_WEDLUG_DNI')
  assert.equal(ustawienia.separacjaModulow, 'ramka')
})

test('starszy Program bez presetu zachowuje wyglad dotychczasowy', () => {
  assert.equal(normalizujPresetWygladuProgramu(undefined), 'DOTYCHCZASOWY')
})

test('presety SEMPER maja oczekiwana domyslna widocznosc mapy', () => {
  assert.equal(konfiguracjePresetowProgramu.SEMPER_KOMPAKTOWY.elementyIdentyfikacji.mapaPolski, true)
  assert.equal(konfiguracjePresetowProgramu.SEMPER_SZCZEGOLOWY.elementyIdentyfikacji.mapaPolski, false)
  assert.equal(konfiguracjePresetowProgramu.SEMPER_WEDLUG_DNI.elementyIdentyfikacji.mapaPolski, true)
})

test('reczne nadpisanie mapy ma pierwszenstwo przed presetem', () => {
  assert.equal(pobierzElementyIdentyfikacjiProgramu('SEMPER_SZCZEGOLOWY', { mapaPolski: true }).mapaPolski, true)
})

test('sugestia rozpoznaje dni i wielopoziomowa liste bez zmiany wyboru uzytkownika', () => {
  const dokumentZDniami = { struktura: [{ typ: 'Dzien', dzieci: [], stylLokalny: {}, metadane: {} }] } as never
  const dokumentZWcieciem = { struktura: [{ typ: 'Punkt', dzieci: [], stylLokalny: { wciecie: 1 }, metadane: {} }] } as never
  assert.equal(zasugerujPresetProgramu(dokumentZDniami), 'SEMPER_WEDLUG_DNI')
  assert.equal(zasugerujPresetProgramu(dokumentZWcieciem), 'SEMPER_SZCZEGOLOWY')
})
