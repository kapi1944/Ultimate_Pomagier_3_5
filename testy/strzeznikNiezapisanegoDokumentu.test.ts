import assert from 'node:assert/strict'
import test from 'node:test'
import { czyDokumentMaNiezapisaneZmiany, odrzucZmianyDokumentu, ustawObslugeNiezapisanegoDokumentu, zapiszDokumentPrzedWyjsciem } from '../src/moduly/dokumenty/wspolne/strzeznikNiezapisanegoDokumentu.ts'

function zarejestruj({ zapis, czyZajety = () => false, odrzuc = () => {} }: {
  zapis: () => boolean | void | Promise<boolean | void>
  czyZajety?: () => boolean
  odrzuc?: () => void
}) {
  return ustawObslugeNiezapisanegoDokumentu({
    identyfikatorInstancji: 'formularz-testowy',
    czySaNiezapisaneZmiany: () => true,
    czyTrwaZapis: czyZajety,
    zapiszPrzedWyjsciem: zapis,
    odrzucZmiany: odrzuc,
  })
}

test('czysty formularz B nie zasłania zmian w A, również po odmontowaniu B', (kontekst) => {
  const usunA = zarejestruj({ zapis: () => true })
  kontekst.after(usunA)
  assert.equal(czyDokumentMaNiezapisaneZmiany(), true)
  const usunB = ustawObslugeNiezapisanegoDokumentu({
    identyfikatorInstancji: 'formularz-testowy',
    czySaNiezapisaneZmiany: () => false,
    zapiszPrzedWyjsciem: () => true,
  })
  kontekst.after(usunB)
  const chronionyPoDodaniuB = czyDokumentMaNiezapisaneZmiany()
  usunB()
  assert.deepEqual([chronionyPoDodaniuB, czyDokumentMaNiezapisaneZmiany()], [true, true])
  usunA()
  assert.equal(czyDokumentMaNiezapisaneZmiany(), false)
})

test('cleanup A zachowuje B, a cleanup starej rejestracji nie usuwa nowej', async (kontekst) => {
  let liczbaZapisow = 0
  const obsluga = { czySaNiezapisaneZmiany: () => true, zapiszPrzedWyjsciem: () => { liczbaZapisow++ } }
  const usunA = ustawObslugeNiezapisanegoDokumentu(obsluga)
  const usunB = ustawObslugeNiezapisanegoDokumentu(obsluga)
  kontekst.after(usunA)
  kontekst.after(usunB)
  usunA()
  const usunNoweA = ustawObslugeNiezapisanegoDokumentu(obsluga)
  kontekst.after(usunNoweA)
  usunA()
  assert.equal(await zapiszDokumentPrzedWyjsciem(), true)
  assert.equal(liczbaZapisow, 2)
  usunNoweA()
  assert.equal(czyDokumentMaNiezapisaneZmiany(), true)
  usunB()
  assert.equal(czyDokumentMaNiezapisaneZmiany(), false)
})

test('beforeunload sprawdza wszystkie formularze i odłącza listener po ostatnim cleanupie', (kontekst) => {
  const okno = new EventTarget()
  const dodaj = kontekst.mock.method(okno, 'addEventListener')
  const usun = kontekst.mock.method(okno, 'removeEventListener')
  Object.defineProperty(globalThis, 'window', { value: okno, configurable: true })
  kontekst.after(() => Reflect.deleteProperty(globalThis, 'window'))
  let czyA = true
  let czyB = false
  const usunA = ustawObslugeNiezapisanegoDokumentu({ czySaNiezapisaneZmiany: () => czyA, zapiszPrzedWyjsciem: () => true })
  const usunB = ustawObslugeNiezapisanegoDokumentu({ czySaNiezapisaneZmiany: () => czyB, zapiszPrzedWyjsciem: () => true })
  kontekst.after(usunA)
  kontekst.after(usunB)
  const czyOdswiezenieDozwolone = () => okno.dispatchEvent(new Event('beforeunload', { cancelable: true }))
  assert.equal(dodaj.mock.callCount(), 1)
  assert.equal(czyOdswiezenieDozwolone(), false)
  czyA = false
  assert.equal(czyOdswiezenieDozwolone(), true)
  czyB = true
  usunA()
  assert.equal(czyOdswiezenieDozwolone(), false)
  assert.equal(usun.mock.callCount(), 0)
  usunB()
  assert.equal(usun.mock.callCount(), 1)
  assert.equal(czyOdswiezenieDozwolone(), true)
})

test('stróż zapisuje oba formularze po kolei i odmawia równoległego zapisu', async (kontekst) => {
  let zakonczZapis!: (wynik: boolean) => void
  const zakonczono = new Promise<boolean>((rozwiaz) => { zakonczZapis = rozwiaz })
  const kolejnosc: string[] = []
  kontekst.after(zarejestruj({ zapis: () => { kolejnosc.push('A'); return zakonczono } }))
  kontekst.after(zarejestruj({ zapis: () => { kolejnosc.push('B'); return true } }))

  const wynikZapisu = zapiszDokumentPrzedWyjsciem()
  assert.deepEqual(kolejnosc, ['A'])
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  zakonczZapis(true)
  assert.equal(await wynikZapisu, true)
  assert.deepEqual(kolejnosc, ['A', 'B'])
})

test('błąd B zatrzymuje wyjście, zachowuje jego zmiany i nie powtarza udanego zapisu A', async (kontekst) => {
  let czyA = true
  let czyB = true
  let czyBladB = true
  const kolejnosc: string[] = []
  kontekst.after(ustawObslugeNiezapisanegoDokumentu({
    czySaNiezapisaneZmiany: () => czyA,
    zapiszPrzedWyjsciem: () => { kolejnosc.push('A'); czyA = false; return true },
  }))
  kontekst.after(ustawObslugeNiezapisanegoDokumentu({
    czySaNiezapisaneZmiany: () => czyB,
    zapiszPrzedWyjsciem: () => { kolejnosc.push('B'); if (czyBladB) return false; czyB = false; return true },
  }))
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  assert.equal(czyDokumentMaNiezapisaneZmiany(), true)
  czyBladB = false
  assert.equal(await zapiszDokumentPrzedWyjsciem(), true)
  assert.equal(czyDokumentMaNiezapisaneZmiany(), false)
  assert.deepEqual(kolejnosc, ['A', 'B', 'B'])
})

test('strażnik nie wywołuje odmontowanego formularza i blokuje wyjście przy nowej niezapisanej rejestracji', async (kontekst) => {
  let zakonczA!: (wynik: boolean) => void
  kontekst.after(zarejestruj({ zapis: () => new Promise((rozwiaz) => { zakonczA = rozwiaz }) }))
  const zapisB = kontekst.mock.fn(() => true)
  const usunB = zarejestruj({ zapis: zapisB })
  kontekst.after(usunB)
  const wynik = zapiszDokumentPrzedWyjsciem()
  usunB()
  kontekst.after(zarejestruj({ zapis: () => true }))
  zakonczA(true)
  assert.equal(await wynik, false)
  assert.equal(zapisB.mock.callCount(), 0)
})

test('stróż zatrzymuje nawigację przy błędzie lub równoczesnym zapisie', async () => {
  const wyrejestrujPoBledzie = zarejestruj({ zapis: async () => false })
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  wyrejestrujPoBledzie()

  let wywolanoZapis = false
  const wyrejestrujA = zarejestruj({ zapis: () => { wywolanoZapis = true } })
  const wyrejestrujPodczasZapisu = zarejestruj({ zapis: () => { wywolanoZapis = true }, czyZajety: () => true })
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  assert.equal(wywolanoZapis, false)
  wyrejestrujA()
  wyrejestrujPodczasZapisu()

  const wyrejestrujPoWyjatku = zarejestruj({ zapis: () => { throw new Error('Brak miejsca') } })
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  wyrejestrujPoWyjatku()
})

test('stróż odrzuca wyłącznie bieżące zmiany wszystkich aktywnych formularzy', (kontekst) => {
  const odrzucone: string[] = []
  kontekst.after(zarejestruj({ zapis: () => true, odrzuc: () => odrzucone.push('A') }))
  kontekst.after(zarejestruj({ zapis: () => true, odrzuc: () => odrzucone.push('B') }))
  kontekst.after(ustawObslugeNiezapisanegoDokumentu({
    czySaNiezapisaneZmiany: () => false,
    zapiszPrzedWyjsciem: () => true,
    odrzucZmiany: () => odrzucone.push('C'),
  }))
  odrzucZmianyDokumentu()
  assert.deepEqual(odrzucone, ['A', 'B'])
})
