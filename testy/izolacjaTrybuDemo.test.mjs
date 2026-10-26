import assert from 'node:assert/strict'
import test from 'node:test'
import { build, resolveConfig } from 'vite'

test('build odrzuca sesję demonstracyjną mimo nadpisania publicznych flag środowiska', async () => {
  for (const tryb of ['production', 'development']) {
    const wynik = await build({
      mode: tryb,
      logLevel: 'silent',
      define: {
        'import.meta.env.MODE': JSON.stringify('demonstracyjny'),
        'import.meta.env.DEV': 'true',
        'import.meta.env.PROD': 'false',
        'import.meta.env.VITE_TRYB_DEMONSTRACYJNY': JSON.stringify('true'),
      },
      build: { write: false, minify: false, lib: { entry: 'src/aplikacja/logowanie/sesjaUzytkownika.ts', formats: ['es'] } },
    })
    const plik = (Array.isArray(wynik) ? wynik[0] : wynik).output.find((element) => element.type === 'chunk')
    assert.ok(plik)
    const sesja = await import(`data:text/javascript;base64,${Buffer.from(plik.code).toString('base64')}#${tryb}`)
    const poprzedniMagazyn = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: () => JSON.stringify({ uzytkownikId: 'administrator-kacper-madej', wersjaUprawnien: 1, tryb: 'DEMONSTRACYJNY', dataUtworzenia: new Date().toISOString() }),
      setItem: () => assert.fail('Build nie może tworzyć sesji demonstracyjnej'),
      removeItem: () => assert.fail('Odrzucenie demo nie może zmieniać danych'),
    } })
    try {
      assert.equal(sesja.rozpocznijSesje('administrator-kacper-madej'), false, tryb)
      assert.equal(sesja.pobierzSesje(), null, tryb)
      assert.equal(sesja.pobierzZalogowanegoUzytkownika(), null, tryb)
    } finally {
      if (poprzedniMagazyn) Object.defineProperty(globalThis, 'localStorage', poprzedniMagazyn)
      else delete globalThis.localStorage
    }
  }
})

test('znacznik demo dopuszcza wyłącznie jawny serwer demonstracyjny, bez preview i zwykłego DEV', async () => {
  for (const [tryb, czyPodglad, oczekiwany] of [
    ['development', false, false],
    ['production', false, false],
    ['demonstracyjny', false, true],
    ['demonstracyjny', true, false],
  ]) {
    const konfiguracja = await resolveConfig({ mode: tryb }, 'serve', 'development', 'development', czyPodglad)
    assert.equal(konfiguracja.define['import.meta.env.POMAGIER_SERWER_DEMONSTRACYJNY'], JSON.stringify(oczekiwany), `${tryb}, preview=${czyPodglad}`)
  }
})
