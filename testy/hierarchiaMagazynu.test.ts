import assert from 'node:assert/strict'
import test from 'node:test'
import { dodajPolki, duplikujStruktureLokalizacji, normalizujKodLokalizacji, normalizujLokalizacjeMapy, przeniesLokalizacje, uporzadkujLokalizacje, utworzStruktureLokalizacji, wyszukajLokalizacje, zmienKolejnoscLokalizacji } from '../src/moduly/zakupy/logika/mapaMagazynu'
import { normalizujDaneMagazynowe, pusteDaneMagazynowe, przypiszProduktDoLokalizacji } from '../src/moduly/zakupy/logika/przypisaniaMagazynowe'
import { kluczLokalizacjiMagazynowych, pobierzLokalizacjeMagazynowe, zapiszLokalizacjeMagazynowe } from '../src/moduly/zakupy/uslugi/magazynLokalizacji'
import { pobierzStanZakupow } from '../src/moduly/zakupy/uslugi/stanZakupow'
import { daneStartoweUzytkownikow } from '../src/kartoteki/uzytkownicy/daneUzytkownikow'

const pracownik = daneStartoweUzytkownikow.find((osoba) => osoba.id === 'pracownik-tomasz-czekaj')!
const stare = [
  { id: 'mag', kod: 'MAG', nazwa: 'Magazyn', czyAktywna: true, polozenieNaMapie: { x: 10, y: 12, szerokosc: 30, wysokosc: 25 } },
  { id: 'lewa', kod: 'LEWA', nazwa: 'Lewa strona', nadrzednaLokalizacjaId: 'mag', czyAktywna: true },
  { id: 'prawa', kod: 'PRAWA', nazwa: 'Prawa strona', nadrzednaLokalizacjaId: 'mag', czyAktywna: true },
]
function struktura() {
  return utworzStruktureLokalizacji(normalizujLokalizacjeMapy(stare), { nazwa: 'Kartony', kod: 'kartony', typ: 'REGAL', rodzicId: 'lewa', liczbaPolek: 5, czyNaMapie: false })
}
function zapas() {
  return { ...pusteDaneMagazynowe(), produkty: [{ id: 'papier', nazwa: 'Papier', rodzaj: 'MATERIAL_ZUZYWALNY' as const, sposobEwidencji: 'ILOSCIOWY' as const, jednostkaMiary: 'ryza', czyAktywny: true }] }
}

test('kod lokalny normalizuje polskie znaki i rezerwuje separator adresu', () => {
  assert.equal(normalizujKodLokalizacji('  półka / żółć 3  '), 'POLKA-ZOLC-3')
  assert.equal(normalizujKodLokalizacji('///'), '')
})

test('kreator atomowo tworzy regał i pięć półek z pełnymi adresami bez geometrii', () => {
  const { lokalizacje, id } = struktura()
  assert.equal(lokalizacje.length, 9)
  const polki = lokalizacje.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === id)
  assert.deepEqual(polki.map((lokalizacja) => lokalizacja.pelnyKod), [1, 2, 3, 4, 5].map((numer) => `MAG/LEWA/KARTONY/POLKA-${numer}`))
  assert.ok(polki.every((polka) => !polka.polozenieNaMapie))
  assert.equal(lokalizacje.find((lokalizacja) => lokalizacja.id === id)?.polozenieNaMapie, undefined)
  assert.deepEqual(lokalizacje[0].polozenieNaMapie, stare[0].polozenieNaMapie)
  assert.equal(new Set(lokalizacje.map((lokalizacja) => lokalizacja.id)).size, 9)
})

test('kody są unikalne u rodzica, lecz różne regały mogą mieć POLKA-1', () => {
  const pierwsza = struktura()
  const druga = utworzStruktureLokalizacji(pierwsza.lokalizacje, { nazwa: 'Papier', kod: 'PAPIER', typ: 'REGAL', rodzicId: 'lewa', liczbaPolek: 2, czyNaMapie: true })
  assert.equal(druga.lokalizacje.filter((lokalizacja) => lokalizacja.kod === 'POLKA-1').length, 2)
  const przed = structuredClone(druga.lokalizacje)
  assert.throws(() => utworzStruktureLokalizacji(druga.lokalizacje, { nazwa: 'Duplikat', kod: ' kartony ', typ: 'REGAL', rodzicId: 'lewa', liczbaPolek: 5, czyNaMapie: true }), /unikalny/)
  assert.deepEqual(druga.lokalizacje, przed)
})

test('dodawanie półek kontynuuje numerację, zachowuje kolejność i odrzuca błędną liczbę bez mutacji', () => {
  const { lokalizacje, id } = struktura()
  const przed = structuredClone(lokalizacje)
  const wynik = dodajPolki(lokalizacje, id, 3)
  assert.deepEqual(wynik.slice(-3).map((lokalizacja) => lokalizacja.kod), ['POLKA-6', 'POLKA-7', 'POLKA-8'])
  assert.deepEqual(wynik.slice(-3).map((lokalizacja) => lokalizacja.kolejnosc), [5, 6, 7])
  for (const liczba of [NaN, -1, 0, 0.5, 501]) assert.throws(() => dodajPolki(lokalizacje, id, liczba))
  assert.throws(() => dodajPolki(lokalizacje, 'brak', 3))
  assert.deepEqual(lokalizacje, przed)
})

test('adresowanie nie ma limitu pięciu poziomów i nie jest uzależnione od typu', () => {
  let lokalizacje = normalizujLokalizacjeMapy(stare)
  let rodzicId = 'lewa'
  for (let poziom = 0; poziom < 12; poziom++) {
    const wynik = utworzStruktureLokalizacji(lokalizacje, { nazwa: `Strefa ${poziom}`, kod: `S-${poziom}`, typ: 'STREFA', rodzicId, liczbaPolek: 0, czyNaMapie: false })
    lokalizacje = wynik.lokalizacje; rodzicId = wynik.id
  }
  assert.equal(lokalizacje.at(-1)?.pelnyKod.split('/').length, 14)
})

test('zmiana kolejności zamienia rodzeństwo bez zmiany ID, adresów i innych gałęzi', () => {
  const { lokalizacje, id } = struktura()
  const polki = lokalizacje.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === id)
  const zmienione = zmienKolejnoscLokalizacji(lokalizacje, polki[1].id, -1)
  assert.deepEqual(uporzadkujLokalizacje(zmienione.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === id)).slice(0, 2).map((lokalizacja) => lokalizacja.id), [polki[1].id, polki[0].id])
  assert.deepEqual(zmienione.map((lokalizacja) => lokalizacja.pelnyKod), lokalizacje.map((lokalizacja) => lokalizacja.pelnyKod))
  assert.deepEqual(zmienione.slice(0, 3), lokalizacje.slice(0, 3))
  assert.deepEqual(zmienKolejnoscLokalizacji(zmienione, polki[1].id, 1), lokalizacje)
  assert.equal(zmienKolejnoscLokalizacji(lokalizacje, polki[0].id, -1), lokalizacje)
})

test('przeniesienie i zmiana kodu aktualizują potomków, zachowując ID, geometrię i stany', () => {
  const { lokalizacje, id } = struktura()
  const polkaId = lokalizacje.find((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === id)!.id
  const dane = przypiszProduktDoLokalizacji(zapas(), lokalizacje, { produktId: 'papier', lokalizacjaId: polkaId, ilosc: 12 }, 'u1')
  const przed = structuredClone(dane)
  const przeniesione = przeniesLokalizacje(lokalizacje, id, 'prawa')
  const zmienione = normalizujLokalizacjeMapy(przeniesione.map((lokalizacja) => lokalizacja.id === id ? { ...lokalizacja, kod: 'NOWY' } : lokalizacja), 2)
  assert.equal(zmienione.find((lokalizacja) => lokalizacja.id === polkaId)?.pelnyKod, 'MAG/PRAWA/NOWY/POLKA-1')
  assert.deepEqual(zmienione.map((lokalizacja) => lokalizacja.id), lokalizacje.map((lokalizacja) => lokalizacja.id))
  assert.deepEqual(zmienione.map((lokalizacja) => lokalizacja.polozenieNaMapie), lokalizacje.map((lokalizacja) => lokalizacja.polozenieNaMapie))
  assert.deepEqual(normalizujDaneMagazynowe(dane, zmienione), przed)
})

test('przenoszenie odrzuca cykle, siebie, brak rodzica i kolizję kodu', () => {
  const { lokalizacje, id } = struktura()
  const polka = lokalizacje.find((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === id)!
  const przed = structuredClone(lokalizacje)
  for (const rodzic of [id, polka.id, 'brak']) assert.throws(() => przeniesLokalizacje(lokalizacje, id, rodzic))
  assert.throws(() => przeniesLokalizacje(dodajPolki(lokalizacje, 'prawa', 1), polka.id, 'prawa'), /unikalny/)
  assert.deepEqual(lokalizacje, przed)
})

test('duplikowanie kopiuje strukturę ze świeżymi ID i kodem, bez zmiany starego planu', () => {
  const { lokalizacje, id } = struktura()
  const wynik = duplikujStruktureLokalizacji(lokalizacje, id)
  assert.equal(wynik.lokalizacje.length, 15)
  assert.equal(wynik.lokalizacje.find((lokalizacja) => lokalizacja.id === wynik.id)?.pelnyKod, 'MAG/LEWA/KARTONY-KOPIA-1')
  assert.equal(wynik.lokalizacje.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === wynik.id).length, 5)
  assert.deepEqual(wynik.lokalizacje.slice(0, lokalizacje.length), lokalizacje)
  assert.ok(wynik.lokalizacje.slice(lokalizacje.length).every((lokalizacja) => !lokalizacja.polozenieNaMapie))
})

test('wyszukiwanie obsługuje fragment nazwy, kod i pełny adres bez polskich znaków', () => {
  const { lokalizacje, id } = struktura()
  assert.equal(wyszukajLokalizacje(lokalizacje, 'arton')[0]?.id, id)
  assert.equal(wyszukajLokalizacje(lokalizacje, 'półka 3')[0]?.kod, 'POLKA-3')
  assert.equal(wyszukajLokalizacje(lokalizacje, 'mag/lewa/kartony/polka-5').length, 1)
  assert.equal(wyszukajLokalizacje(lokalizacje, 'NIEISTNIEJACA').length, 0)
})

test('produkt ma wiele lokalizacji, przesunięcie zachowuje ilość i dopisuje historię', () => {
  const { lokalizacje, id } = struktura()
  const polki = lokalizacje.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === id)
  const pierwsze = przypiszProduktDoLokalizacji(zapas(), lokalizacje, { produktId: 'papier', lokalizacjaId: polki[0].id, ilosc: 12 }, 'u1')
  const przed = structuredClone(pierwsze)
  const drugie = przypiszProduktDoLokalizacji(pierwsze, lokalizacje, { produktId: 'papier', lokalizacjaId: polki[1].id, ilosc: 18 }, 'u1')
  const przesuniete = przypiszProduktDoLokalizacji(drugie, lokalizacje, { produktId: 'papier', zrodloId: polki[0].id, lokalizacjaId: polki[1].id, ilosc: 5 }, 'u1')
  assert.deepEqual(przesuniete.stanyWLokalizacjach.map((stan) => stan.ilosc), [7, 23])
  assert.equal(przesuniete.stanyWLokalizacjach.reduce((suma, stan) => suma + stan.ilosc, 0), 30)
  assert.equal(przesuniete.ruchyMagazynowe.at(-1)?.rodzaj, 'PRZESUNIECIE')
  assert.deepEqual(przesuniete.ruchyMagazynowe.slice(0, 2), drugie.ruchyMagazynowe)
  assert.deepEqual(pierwsze, przed)
  assert.equal(przesuniete.stanyWLokalizacjach[0].id, pierwsze.stanyWLokalizacjach[0].id)
})

test('złe przypisania produktu, wariantu, egzemplarza i ilości nie zmieniają danych', () => {
  const { lokalizacje, id } = struktura()
  const dane = { ...zapas(), wariantyProduktow: [{ id: 'wariant', produktId: 'papier', nazwa: 'Biały', cechy: {}, czyAktywny: true }] }
  const przed = structuredClone(dane)
  const operacja = { produktId: 'papier', lokalizacjaId: id, ilosc: 1 }
  for (const zmiana of [{ produktId: 'brak' }, { wariantProduktuId: 'obcy' }, { egzemplarzProduktuId: 'obcy' }, { lokalizacjaId: 'brak' }, { zrodloId: id }, { zrodloId: 'lewa' }, { ilosc: NaN }, { ilosc: 0 }, { ilosc: -1 }]) assert.throws(() => przypiszProduktDoLokalizacji(dane, lokalizacje, { ...operacja, ...zmiana }, 'u1'))
  assert.throws(() => przypiszProduktDoLokalizacji(dane, lokalizacje.map((lokalizacja) => lokalizacja.id === 'lewa' ? { ...lokalizacja, czyAktywna: false } : lokalizacja), operacja, 'u1'), /aktywn/)
  assert.deepEqual(dane, przed)
})

test('egzemplarz nie jest duplikowany, a wariant innego produktu zostaje odrzucony', () => {
  const { lokalizacje, id } = struktura()
  const dane = { ...zapas(), produkty: [...zapas().produkty, { id: 'sprzet', nazwa: 'Laptop', rodzaj: 'SPRZET' as const, sposobEwidencji: 'EGZEMPLARZOWY' as const, jednostkaMiary: 'szt.', czyAktywny: true }], wariantyProduktow: [{ id: 'bialy', produktId: 'papier', nazwa: 'Biały', cechy: {}, czyAktywny: true }], egzemplarzeProduktow: [{ id: 'e1', produktId: 'sprzet', numerEwidencyjny: 'L1' }] }
  const operacja = { produktId: 'sprzet', egzemplarzProduktuId: 'e1', lokalizacjaId: id, ilosc: 1 }
  assert.throws(() => przypiszProduktDoLokalizacji(dane, lokalizacje, { ...operacja, wariantProduktuId: 'bialy' }, 'u1'))
  assert.throws(() => przypiszProduktDoLokalizacji(dane, lokalizacje, { ...operacja, ilosc: 2 }, 'u1'))
  const przyjete = przypiszProduktDoLokalizacji(dane, lokalizacje, operacja, 'u1')
  assert.throws(() => przypiszProduktDoLokalizacji(przyjete, lokalizacje, { ...operacja, lokalizacjaId: 'prawa' }, 'u1'))
  assert.equal(przypiszProduktDoLokalizacji(przyjete, lokalizacje, { ...operacja, zrodloId: id, lokalizacjaId: 'prawa' }, 'u1').stanyWLokalizacjach.at(-1)?.ilosc, 1)
})

test('migracja v1 → v2 jest jawna i idempotentna; restart zachowuje plan, stany i historię', () => {
  const poprzedni = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const surowy = JSON.stringify({ wersja: 1, lokalizacje: stare, opisArchiwalny: 'zachowaj' })
  const pamiec = new Map([[kluczLokalizacjiMagazynowych, surowy]])
  let czyQuota = false
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (klucz: string) => pamiec.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => { if (czyQuota) throw new Error('quota'); pamiec.set(klucz, wartosc) } } })
  try {
    const odczyt = pobierzLokalizacjeMagazynowe()
    assert.equal(odczyt.blad, null)
    assert.equal(pamiec.get(kluczLokalizacjiMagazynowych), surowy)
    const { lokalizacje, id } = utworzStruktureLokalizacji(odczyt.lokalizacje, { nazwa: 'Kartony', kod: 'KARTONY', typ: 'REGAL', rodzicId: 'lewa', liczbaPolek: 5, czyNaMapie: true })
    const dane = przypiszProduktDoLokalizacji(zapas(), lokalizacje, { produktId: 'papier', lokalizacjaId: id, ilosc: 15 }, 'u1')
    assert.ok(zapiszLokalizacjeMagazynowe(lokalizacje, surowy, null, dane).blad)
    const zapis = zapiszLokalizacjeMagazynowe(lokalizacje, surowy, pracownik, dane)
    assert.equal(zapis.blad, null)
    const koperta = JSON.parse(zapis.zapisBazowy!)
    assert.equal(koperta.wersja, 2)
    assert.equal(koperta.zapisPrzedMigracja, surowy)
    assert.equal(koperta.opisArchiwalny, 'zachowaj')
    assert.equal(pamiec.size, 1)
    assert.deepEqual(pobierzLokalizacjeMagazynowe(), zapis)
    assert.deepEqual(pobierzStanZakupow().stanyWLokalizacjach, dane.stanyWLokalizacjach)
    assert.deepEqual(pobierzStanZakupow().ruchyMagazynowe, dane.ruchyMagazynowe)
    assert.equal(zapiszLokalizacjeMagazynowe(lokalizacje, zapis.zapisBazowy, pracownik).zapisBazowy, zapis.zapisBazowy)
    const przeniesione = przeniesLokalizacje(lokalizacje, id, 'prawa')
    const poPrzeniesieniu = zapiszLokalizacjeMagazynowe(przeniesione, zapis.zapisBazowy, pracownik)
    assert.equal(poPrzeniesieniu.blad, null)
    assert.deepEqual(poPrzeniesieniu.daneMagazynowe, zapis.daneMagazynowe)
    assert.ok(zapiszLokalizacjeMagazynowe(lokalizacje, zapis.zapisBazowy, pracownik, dane).blad, 'stara karta nie może nadpisać nowych danych')
    assert.ok(zapiszLokalizacjeMagazynowe(przeniesione, poPrzeniesieniu.zapisBazowy, pracownik, { ...dane, ruchyMagazynowe: [] }).blad)
    assert.ok(zapiszLokalizacjeMagazynowe(przeniesione, poPrzeniesieniu.zapisBazowy, pracownik, { ...dane, stanyWLokalizacjach: [{ ...dane.stanyWLokalizacjach[0], lokalizacjaId: 'lewa' }] }).blad)
    czyQuota = true
    assert.ok(zapiszLokalizacjeMagazynowe(przeniesione, poPrzeniesieniu.zapisBazowy, pracownik).blad)
    assert.equal(pamiec.get(kluczLokalizacjiMagazynowych), poPrzeniesieniu.zapisBazowy)
    czyQuota = false
    for (const bledne of [[{ ...stare[0], kod: 'LEWA' }, ...stare.slice(1)], stare.slice(1), [{ ...stare[0], nadrzednaLokalizacjaId: 'lewa' }, ...stare.slice(1)]]) {
      const konflikt = JSON.stringify({ wersja: 1, lokalizacje: bledne })
      pamiec.set(kluczLokalizacjiMagazynowych, konflikt)
      assert.ok(pobierzLokalizacjeMagazynowe().blad)
      assert.ok(zapiszLokalizacjeMagazynowe(lokalizacje, konflikt, pracownik, dane).blad)
      assert.equal(pamiec.get(kluczLokalizacjiMagazynowych), konflikt)
    }
    const blednePowiazanie = JSON.stringify({ wersja: 2, lokalizacje, daneMagazynowe: { ...dane, stanyWLokalizacjach: [{ ...dane.stanyWLokalizacjach[0], produktId: 'obcy' }] } })
    pamiec.set(kluczLokalizacjiMagazynowych, blednePowiazanie)
    assert.ok(pobierzLokalizacjeMagazynowe().blad)
    assert.equal(pamiec.get(kluczLokalizacjiMagazynowych), blednePowiazanie)
  } finally {
    if (poprzedni) Object.defineProperty(globalThis, 'localStorage', poprzedni)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
