import assert from 'node:assert/strict'
import test from 'node:test'
import {
  konfiguracjePresetowProgramu,
  domyslnyPresetNowegoProgramu,
  normalizujPresetWygladuProgramu,
  pobierzElementyIdentyfikacjiProgramu,
  zasugerujPresetProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/presetyProgramu.ts'
import {
  domyslnyProgramSzkolenia,
  normalizujProgramSzkolenia,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia.ts'

test('nowy Program i reset korzystaja z dotychczasowego wygladu i separatora pytan', () => {
  assert.equal(domyslnyPresetNowegoProgramu, 'DOTYCHCZASOWY')
  for (const program of [domyslnyProgramSzkolenia, normalizujProgramSzkolenia(undefined), normalizujProgramSzkolenia({ ustawienia: {} })]) {
    assert.equal(program.ustawienia.presetWygladu, 'DOTYCHCZASOWY')
    assert.equal(program.ustawienia.separacjaModulow, 'separator-pytan')
  }
  assert.equal(konfiguracjePresetowProgramu.DOTYCHCZASOWY.separacjaModulow, 'separator-pytan')
})

test('zapisane presety i separatory zachowuja wszystkie ustawienia po ponownym odczycie', () => {
  for (const presetWygladu of Object.keys(konfiguracjePresetowProgramu)) {
    for (const separacjaModulow of ['brak', 'ramka', 'linia', 'separator-pytan']) {
      const zapisany = normalizujProgramSzkolenia({
        ...domyslnyProgramSzkolenia,
        tytulSzkolenia: 'Istniejący program',
        ustawienia: {
          ...domyslnyProgramSzkolenia.ustawienia,
          presetWygladu,
          separacjaModulow,
          czyWyborPresetySwiadomy: true,
          czyJustowac: false,
          formatowanieSkryptowe: false,
          kolorAkcentuProgramu: '#123456',
          elementyIdentyfikacji: { mapaPolski: false },
        },
      })
      assert.equal(zapisany.ustawienia.presetWygladu, presetWygladu)
      assert.equal(zapisany.ustawienia.separacjaModulow, separacjaModulow)
      assert.deepEqual(normalizujProgramSzkolenia(JSON.parse(JSON.stringify(zapisany))), zapisany)
    }
  }
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
