import assert from 'node:assert/strict'
import test from 'node:test'
import { wybierzMiejsceZapisuPakietu } from '../src/wspolne/dokumenty/pakietyDoZatwierdzenia/zapisPakietu.ts'

test('zapis w wybranej lokalizacji przekazuje dokładnie podgląd i zatwierdza dopiero cały plik', async () => {
  const kroki: string[] = []
  const blob = new Blob(['%PDF-1.7 podgląd'], { type: 'application/pdf' })
  const okno = { showSaveFilePicker: async (opcje: unknown) => {
    assert.deepEqual(opcje, { suggestedName: 'pakiet.pdf', types: [{ description: 'Dokument PDF', accept: { 'application/pdf': ['.pdf'] } }] })
    return { createWritable: async () => ({
      write: async (dane: Blob) => { assert.equal(dane, blob); kroki.push('zapis') },
      close: async () => { kroki.push('zatwierdzenie') },
      abort: async () => { kroki.push('anulowanie') },
    }) }
  } }
  const poprzednie = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: okno })
  try {
    assert.match(await wybierzMiejsceZapisuPakietu('pakiet.pdf', blob, () => { kroki.push('kontrola') }), /Zapisano/)
    assert.deepEqual(kroki, ['kontrola', 'zapis', 'kontrola', 'zatwierdzenie'])
  } finally { if (poprzednie) Object.defineProperty(globalThis, 'window', poprzednie); else Reflect.deleteProperty(globalThis, 'window') }
})

test('anulowanie, brak obsługi, brak uprawnień, zmiana źródeł i błąd dysku nie zatwierdzają PDF', async () => {
  const poprzednie = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const blob = new Blob(['%PDF-1.7'])
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
    await assert.rejects(() => wybierzMiejsceZapisuPakietu('p.pdf', blob, () => undefined), /nie obsługuje/)
    for (const powod of ['anulowanie', 'uprawnienia', 'zrodla', 'dysk', 'zmianaWTrakcie', 'zamkniecie']) {
      let otwarto = false
      let zatwierdzono = false
      let anulowano = false
      let kontrole = 0
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { showSaveFilePicker: async () => {
        if (powod === 'anulowanie') throw new DOMException('Anulowano', 'AbortError')
        if (powod === 'uprawnienia') throw new DOMException('Brak uprawnień', 'NotAllowedError')
        return { createWritable: async () => {
          otwarto = true
          return {
            write: async () => { if (powod === 'dysk') throw new Error('Błąd dysku') },
            close: async () => { if (powod === 'zamkniecie') throw new Error('Błąd zamknięcia'); zatwierdzono = true },
            abort: async () => { anulowano = true },
          }
        } }
      } } })
      const zapis = () => wybierzMiejsceZapisuPakietu('p.pdf', blob, () => {
        kontrole++
        if (powod === 'zrodla' || (powod === 'zmianaWTrakcie' && kontrole === 2)) throw new Error('Źródła zmieniły się')
      })
      if (powod === 'anulowanie') assert.match(await zapis(), /Anulowano/)
      else await assert.rejects(zapis, /uprawnień|Źródła|dysku|zamknięcia/)
      assert.equal(zatwierdzono, false)
      assert.equal(otwarto, ['dysk', 'zmianaWTrakcie', 'zamkniecie'].includes(powod))
      assert.equal(anulowano, otwarto)
    }
  } finally { if (poprzednie) Object.defineProperty(globalThis, 'window', poprzednie); else Reflect.deleteProperty(globalThis, 'window') }
})
