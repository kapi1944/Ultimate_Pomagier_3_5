import { daneStartoweUzytkownikow } from '../src/kartoteki/uzytkownicy/daneUzytkownikow'
import { czyJestZamawiaczem } from '../src/kartoteki/uzytkownicy/uprawnienia'
import { normalizujZapotrzebowanieZakupowe, pobierzLinkiProduktu, pobierzStanPulpitu, zapiszZakupPrzezUzytkownika } from '../src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu'
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

const zakup = { id: 'papier', nazwa: 'Papier', ilosc: 2, status: 'ZGLOSZONE' as const, utworzonePrzezId: 'autor', utworzonoAt: '2026-10-08' }
const obraz = { id: 'obraz', nazwa: 'oferta.png', daneUrl: 'data:image/png;base64,aGVsbG8=' }

test('stare zgłoszenia i nowe załączniki są normalizowane bez utraty treści', () => {
  assert.deepEqual(normalizujZapotrzebowanieZakupowe(zakup), { ...zakup, uwagi: undefined, linkiProduktow: [], zalaczniki: [] })
  const wynik = normalizujZapotrzebowanieZakupowe({ ...zakup, linkiProduktow: ['https://allegro.pl/oferta', 'javascript:alert(1)', 1], zalaczniki: [obraz, { ...obraz, daneUrl: 'data:text/html;base64,aGVsbG8=' }] })
  assert.deepEqual(wynik?.linkiProduktow, ['https://allegro.pl/oferta'])
  assert.deepEqual(wynik?.zalaczniki, [obraz])
})

test('linki produktu czytają tylko aktywni Zamawiacze Kacper i Paweł', () => {
  const zLinkami = { ...zakup, linkiProduktow: ['https://allegro.pl/oferta'] }
  for (const uzytkownik of daneStartoweUzytkownikow) {
    const czyZamawiacz = ['administrator-kacper-madej', 'pracownik-pawel-kwiecinski'].includes(uzytkownik.id)
    assert.equal(czyJestZamawiaczem(uzytkownik), czyZamawiacz)
    assert.deepEqual(pobierzLinkiProduktu(zLinkami, uzytkownik), czyZamawiacz ? zLinkami.linkiProduktow : [])
    assert.deepEqual(pobierzLinkiProduktu(zLinkami, { ...uzytkownik, status: 'ZABLOKOWANY' }), [])
  }
  assert.deepEqual(pobierzLinkiProduktu(zLinkami, null), [])
})

test('edycja zachowuje ID i linki przed nieuprawnioną zmianą; duplikat ma osobny zapis', () => {
  let zapis = JSON.stringify({ zadaniaReczne: [], wyslanePaczki: {}, zapotrzebowaniaZakupowe: [{ ...zakup, linkiProduktow: ['https://allegro.pl/oferta'], zalaczniki: [obraz] }] })
  let czyBrakMiejsca = false
  const poprzedni = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => zapis,
    setItem: (_klucz: string, wartosc: string) => { if (czyBrakMiejsca) throw new Error('quota'); zapis = wartosc },
  } })
  try {
    const kacper = daneStartoweUzytkownikow.find((osoba) => osoba.id === 'administrator-kacper-madej')!
    const pracownik = daneStartoweUzytkownikow.find((osoba) => osoba.id === 'pracownik-tomasz-czekaj')!
    assert.equal(zapiszZakupPrzezUzytkownika({ ...zakup, nazwa: 'Papier A4', linkiProduktow: ['https://obca.pl'], zalaczniki: [obraz] }, pracownik), true)
    assert.deepEqual(pobierzStanPulpitu().zapotrzebowaniaZakupowe[0].linkiProduktow, ['https://allegro.pl/oferta'])
    assert.equal(pobierzStanPulpitu().zapotrzebowaniaZakupowe[0].utworzonePrzezId, 'autor')
    assert.equal(zapiszZakupPrzezUzytkownika({ ...zakup, linkiProduktow: ['https://sklep.pl/produkt'], zalaczniki: [obraz] }, kacper), true)
    assert.equal(zapiszZakupPrzezUzytkownika({ ...zakup, id: 'kopia', utworzonePrzezId: pracownik.id, zalaczniki: [obraz], linkiProduktow: ['https://ukryty.pl'] }, pracownik), true)
    assert.deepEqual(pobierzStanPulpitu().zapotrzebowaniaZakupowe[1].linkiProduktow, [])
    assert.deepEqual(pobierzStanPulpitu().zapotrzebowaniaZakupowe[1].zalaczniki, [obraz])
    assert.equal(zapiszZakupPrzezUzytkownika({ ...zakup, linkiProduktow: ['javascript:alert(1)'] }, kacper), false)
    assert.equal(zapiszZakupPrzezUzytkownika({ ...zakup, ilosc: 0 }, kacper), false)
    assert.equal(zapiszZakupPrzezUzytkownika(zakup, { ...kacper, status: 'NIEAKTYWNY' }), false)
    assert.equal(zapiszZakupPrzezUzytkownika({ ...zakup, zalaczniki: Array(6).fill(obraz) }, kacper), false)
    const przed = zapis
    czyBrakMiejsca = true
    assert.equal(zapiszZakupPrzezUzytkownika({ ...zakup, status: 'KUPIONE' }, kacper), false)
    assert.equal(zapis, przed)
    czyBrakMiejsca = false
    assert.equal(zapiszZakupPrzezUzytkownika({ ...pobierzStanPulpitu().zapotrzebowaniaZakupowe[0], status: 'ANULOWANE' }, kacper), true)
    assert.equal(pobierzStanPulpitu().zapotrzebowaniaZakupowe[0].status, 'ANULOWANE')
    assert.deepEqual(pobierzStanPulpitu().zapotrzebowaniaZakupowe[0].zalaczniki, [obraz])
  } finally {
    if (poprzedni) Object.defineProperty(globalThis, 'localStorage', poprzedni)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
