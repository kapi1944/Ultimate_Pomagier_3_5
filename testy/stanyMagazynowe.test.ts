import assert from 'node:assert/strict'
import test from 'node:test'
import { obliczMiarkeStanu, wyliczStanyMagazynowe, czyWierszPasujeDoFiltra, filtryStanow } from '../src/moduly/zakupy/logika/stanyMagazynowe'
import { pobierzStanZakupow } from '../src/moduly/zakupy/uslugi/stanZakupow'
import { pobierzWidokZakupowZeSciezki } from '../src/aplikacja/nawigacja/konfiguracjaZakupow'
import { pobierzIdRozwijalnychPozycji, pobierzSciezkeMenuDlaWidoku } from '../src/aplikacja/menu/pozycjeMenu'
import type { StanZakupow } from '../src/moduly/zakupy/modele/zakupy'

for (const [procent, segmenty, kolor] of [
  [0, 0, 'neutralny'], [1, 1, 'czerwony'], [30, 3, 'czerwony'],
  [31, 4, 'pomaranczowy'], [60, 6, 'pomaranczowy'], [61, 7, 'zielony'],
  [100, 10, 'zielony'], [117, 10, 'zielony'],
] as const) {
  test(`miarka dla ${procent}% ma ${segmenty} segmentów i kolor ${kolor}`, () => {
    assert.deepEqual(obliczMiarkeStanu(procent, 100), { procent, aktywneSegmenty: segmenty, kolor })
  })
}

test('brak celu, zerowy i błędny cel nie powodują dzielenia przez zero ani NaN', () => {
  for (const cel of [undefined, 0, -1, NaN, Infinity]) {
    assert.deepEqual(obliczMiarkeStanu(20, cel), { procent: null, aktywneSegmenty: 0, kolor: 'neutralny' })
    assert.deepEqual(obliczMiarkeStanu(0, cel), { procent: null, aktywneSegmenty: 0, kolor: 'neutralny' })
  }
  assert.equal(obliczMiarkeStanu(0.001, 100).aktywneSegmenty, 1)
})

function przygotujDane(): StanZakupow {
  return {
    ...pobierzStanZakupow(),
    produkty: [{ id: 'papier', nazwa: 'Papier', rodzaj: 'MATERIAL_ZUZYWALNY', sposobEwidencji: 'ILOSCIOWY', jednostkaMiary: 'ryza', czyAktywny: true, stanMinimalny: 4, stanDocelowy: 10 }],
    wariantyProduktow: [
      { id: 'bialy', produktId: 'papier', nazwa: 'Biały', cechy: {}, czyAktywny: true, stanDocelowy: 5 },
      { id: 'kolorowy', produktId: 'papier', nazwa: 'Kolorowy', cechy: {}, czyAktywny: true },
      { id: 'pusty', produktId: 'papier', nazwa: 'Pusty', cechy: {}, czyAktywny: true },
    ],
    lokalizacjeMagazynowe: [{ id: 'biuro', nazwa: 'Biuro', czyAktywna: true }, { id: 'sala', nazwa: 'Sala', czyAktywna: true }],
    stanyWLokalizacjach: [
      { id: 's1', produktId: 'papier', wariantProduktuId: 'bialy', lokalizacjaId: 'biuro', ilosc: 2 },
      { id: 's2', produktId: 'papier', wariantProduktuId: 'bialy', lokalizacjaId: 'sala', ilosc: 3 },
      { id: 's3', produktId: 'papier', wariantProduktuId: 'kolorowy', lokalizacjaId: 'biuro', ilosc: 7 },
      { id: 's4', produktId: 'papier', lokalizacjaId: 'biuro', ilosc: 1 },
    ],
  }
}

test('sumy produktu i wariantów pochodzą tylko z lokalizacji; lokalizacje nie są dublowane', () => {
  const dane = przygotujDane()
  const kopia = structuredClone(dane)
  const [produkt, bialy, kolorowy, pusty] = wyliczStanyMagazynowe(dane)
  assert.equal(produkt.stan, 13)
  assert.equal(produkt.lokalizacje.length, 2)
  assert.equal(produkt.lokalizacje.find((lokalizacja) => lokalizacja.id === 'biuro')?.ilosc, 10)
  assert.equal(bialy.stan, 5)
  assert.equal(kolorowy.stan, 7)
  assert.equal(pusty.stan, 0)
  assert.equal(produkt.cel, 10)
  assert.equal(bialy.cel, 5)
  assert.equal(kolorowy.cel, undefined)
  assert.deepEqual(dane, kopia)
  dane.stanyWLokalizacjach[0].ilosc = 8
  assert.equal(wyliczStanyMagazynowe(dane)[0].stan, 19)
  assert.equal(wyliczStanyMagazynowe(dane)[1].stan, 11)
})

test('inwentaryzacja uwzględnia zamknięte przeliczenia danego wariantu we wszystkich lokalizacjach', () => {
  const dane = przygotujDane()
  dane.inwentaryzacje = [
    { id: 'i1', lokalizacjaId: 'biuro', status: 'ZAMKNIETA', rozpoczeto: '2026-10-01', zakonczono: '2026-10-02' },
    { id: 'i2', lokalizacjaId: 'sala', status: 'ZAMKNIETA', rozpoczeto: '2026-10-03', zakonczono: '2026-10-04' },
  ]
  dane.pozycjeInwentaryzacji = [
    { id: 'p1', produktId: 'papier', wariantProduktuId: 'bialy', inwentaryzacjaId: 'i1', iloscOczekiwana: 2, iloscStwierdzona: 2 },
    { id: 'p2', produktId: 'papier', wariantProduktuId: 'bialy', inwentaryzacjaId: 'i2', iloscOczekiwana: 3, iloscStwierdzona: 0 },
  ]
  let wiersze = wyliczStanyMagazynowe(dane)
  assert.equal(wiersze[1].ostatniaInwentaryzacja, '2026-10-04')
  assert.equal(wiersze[1].czyDoPrzeliczenia, false)
  assert.equal(wiersze[0].czyDoPrzeliczenia, true)
  assert.equal(wiersze[2].ostatniaInwentaryzacja, undefined)
  dane.inwentaryzacje[1].status = 'W_TRAKCIE'
  wiersze = wyliczStanyMagazynowe(dane)
  assert.equal(wiersze[1].czyDoPrzeliczenia, true)
  assert.equal(wiersze[1].ostatniaInwentaryzacja, '2026-10-02')
})

test('filtry obejmują braki, minimum, segmenty, przeliczenie i rodzaj produktu', () => {
  const [produkt] = wyliczStanyMagazynowe(przygotujDane())
  assert.equal(filtryStanow.length, 8)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'wszystkie'), true)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'prawidlowy'), true)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'niski'), false)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'do_zamowienia'), false)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'brak'), false)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'do_przeliczenia'), true)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'materialy'), true)
  assert.equal(czyWierszPasujeDoFiltra(produkt, 'sprzet'), false)
  assert.equal(czyWierszPasujeDoFiltra({ ...produkt, produkt: { ...produkt.produkt, rodzaj: 'SPRZET' } }, 'sprzet'), true)
  assert.equal(czyWierszPasujeDoFiltra({ ...produkt, stan: 3 }, 'do_zamowienia'), true)
  assert.equal(czyWierszPasujeDoFiltra({ ...produkt, stan: 4 }, 'do_zamowienia'), false)
  assert.equal(czyWierszPasujeDoFiltra({ ...produkt, stan: 3 }, 'niski'), true)
  assert.equal(czyWierszPasujeDoFiltra({ ...produkt, stan: 0 }, 'brak'), true)
  assert.equal(czyWierszPasujeDoFiltra({ ...produkt, stan: 0, minimum: undefined }, 'do_zamowienia'), true)
  for (const filtr of ['niski', 'prawidlowy'] as const) {
    assert.equal(czyWierszPasujeDoFiltra({ ...produkt, cel: undefined }, filtr), false)
  }
})

test('starsze produkty bez progów i egzemplarze sprzętu zachowują poprawne sumy', () => {
  const dane = przygotujDane()
  dane.produkty = [{ id: 'sprzet', nazwa: 'Projektor', rodzaj: 'SPRZET', sposobEwidencji: 'EGZEMPLARZOWY', jednostkaMiary: 'szt.', czyAktywny: true }]
  dane.wariantyProduktow = []
  dane.stanyWLokalizacjach = [
    { id: 'a', produktId: 'sprzet', lokalizacjaId: 'biuro', egzemplarzProduktuId: 'e1', ilosc: 1 },
    { id: 'b', produktId: 'sprzet', lokalizacjaId: 'biuro', egzemplarzProduktuId: 'e2', ilosc: 1 },
  ]
  const [wiersz] = wyliczStanyMagazynowe(dane)
  assert.equal(wiersz.stan, 2)
  assert.equal(wiersz.lokalizacje.length, 1)
  assert.equal(wiersz.minimum, undefined)
  assert.equal(wiersz.cel, undefined)
  assert.deepEqual(wyliczStanyMagazynowe({ ...dane, produkty: [] }), [])
})

test('Stan magazynowy jest zagnieżdżony w Magazynie, a stary adres pozostaje dostępny', () => {
  assert.equal(pobierzWidokZakupowZeSciezki('/zakupy/magazyn/stan-magazynowy'), 'zakupy_magazyn')
  assert.equal(pobierzWidokZakupowZeSciezki('/zakupy/magazyn'), 'zakupy_magazyn')
  assert.deepEqual(pobierzSciezkeMenuDlaWidoku('zakupy_magazyn'), ['zakupy', 'zakupy_magazyn_grupa', 'zakupy_magazyn'])
  assert.ok(pobierzIdRozwijalnychPozycji().includes('zakupy_magazyn_grupa'))
})
