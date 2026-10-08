import assert from 'node:assert/strict'
import test from 'node:test'
import { podsekcjeZakupow, pobierzSciezkeZakupow, pobierzWidokZakupowZeSciezki } from '../src/aplikacja/nawigacja/konfiguracjaZakupow'
import { pozycjeMenu, pobierzSciezkeMenuDlaWidoku, pobierzIdRozwijalnychPozycji } from '../src/aplikacja/menu/pozycjeMenu'
import { pobierzStanZakupow } from '../src/moduly/zakupy/uslugi/stanZakupow'

test('ZAKUPY są zwijane pomiędzy narzędziami i kartotekami; siedem podsekcji ma trasy', () => {
  const indeks = pozycjeMenu.findIndex((pozycja) => pozycja.id === 'zakupy')
  assert.equal(pozycjeMenu[indeks - 1].id, 'narzedzia')
  assert.equal(pozycjeMenu[indeks + 1].id, 'kartoteki')
  assert.ok(pobierzIdRozwijalnychPozycji().includes('zakupy'))
  assert.equal(pozycjeMenu[indeks].dzieci?.length, 7)
  for (const podsekcja of podsekcjeZakupow) {
    assert.equal(pobierzSciezkeZakupow(podsekcja.widok), podsekcja.sciezka)
    assert.equal(pobierzWidokZakupowZeSciezki(podsekcja.sciezka), podsekcja.widok)
    assert.deepEqual(pobierzSciezkeMenuDlaWidoku(podsekcja.widok), podsekcja.widok === 'zakupy_magazyn' ? ['zakupy', 'zakupy_magazyn_grupa', 'zakupy_magazyn'] : ['zakupy', podsekcja.widok])
  }
  assert.equal(pobierzSciezkeZakupow('pulpit'), undefined)
  assert.equal(pobierzWidokZakupowZeSciezki('/zakupy/nieznane'), undefined)
})

test('odczyt zakupów zachowuje dane Pulpitu i nie tworzy drugiego magazynu', () => {
  const zgloszenie = { id: 'potrzeba-1', nazwa: 'Papier', ilosc: 5, status: 'ZGLOSZONE', utworzonePrzezId: 'u1', utworzonoAt: '2026-10-08', uwagi: 'A4' }
  const zapis = JSON.stringify({ zadaniaReczne: [], wyslanePaczki: {}, zapotrzebowaniaZakupowe: [zgloszenie] })
  const poprzedni = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (klucz: string) => klucz === 'ultimatePomagier.pulpit.v1' ? zapis : null,
    setItem: () => assert.fail('Odczyt zakupów nie może zapisywać danych'),
    removeItem: () => assert.fail('Odczyt zakupów nie może usuwać danych'),
  } })
  try {
    const stan = pobierzStanZakupow()
    assert.equal(stan.wersjaSchematu, 1)
    assert.equal(stan.zapotrzebowania[0].id, zgloszenie.id)
    assert.equal(stan.zapotrzebowania[0].uwagi, 'A4')
    assert.equal(stan.zapotrzebowania[0].status, 'ZGLOSZONE')
    assert.equal(stan.pozycjeZapotrzebowan[0].ilosc, 5)
    assert.equal(stan.pozycjeZapotrzebowan[0].zapotrzebowanieId, zgloszenie.id)
    assert.equal(stan.pozycjeZapotrzebowan[0].produkt, undefined)
    assert.deepEqual(pobierzStanZakupow(), stan)
    assert.deepEqual(stan.produkty, [])
    assert.deepEqual(stan.stanyWLokalizacjach, [])
    stan.produkty.push({ id: 'p1', nazwa: 'Papier', rodzaj: 'MATERIAL_ZUZYWALNY', sposobEwidencji: 'ILOSCIOWY', jednostkaMiary: 'ryza', czyAktywny: true })
    assert.deepEqual(pobierzStanZakupow().produkty, [])
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } })
    assert.deepEqual(pobierzStanZakupow().zapotrzebowania, [])
  } finally {
    if (poprzedni) Object.defineProperty(globalThis, 'localStorage', poprzedni)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
