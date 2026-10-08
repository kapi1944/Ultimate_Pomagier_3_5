import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizujLokalizacjeMapy, ograniczProstokat, pobierzProblemyLokalizacji, pobierzSciezkeLokalizacji, walidujLokalizacjeMapy, znajdzMiejscaProduktu } from '../src/moduly/zakupy/logika/mapaMagazynu'
import { kluczLokalizacjiMagazynowych, pobierzLokalizacjeMagazynowe, zapiszLokalizacjeMagazynowe } from '../src/moduly/zakupy/uslugi/magazynLokalizacji'
import { pobierzStanZakupow } from '../src/moduly/zakupy/uslugi/stanZakupow'
import { pobierzSciezkeZakupow, pobierzWidokZakupowZeSciezki } from '../src/aplikacja/nawigacja/konfiguracjaZakupow'
import { pobierzSciezkeMenuDlaWidoku } from '../src/aplikacja/menu/pozycjeMenu'
import { czyDokumentMaNiezapisaneZmiany, ustawObslugeNiezapisanegoDokumentu, zapiszDokumentPrzedWyjsciem } from '../src/moduly/dokumenty/wspolne/strzeznikNiezapisanegoDokumentu'
import { pobierzKluczeKategorii } from '../src/wspolne/dane/backupDanych'
import type { Uzytkownik } from '../src/kartoteki/uzytkownicy/typyUzytkownikow'

const pracownik: Uzytkownik = {
  id: 'u1', zwrot: '', tytulNaukowy: '', imie: 'Jan', nazwisko: 'Testowy', pseudonim: '', email: 'test@example.com', emaile: [], telefony: [], login: 'test',
  rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: [], status: 'AKTYWNY', kolorProfilu: '', aliasyHistoryczne: [], wymagaZmianyHasla: false,
  wersjaUprawnien: 1, ostatnieLogowanie: null, utworzono: '', zaktualizowano: '',
}

function przygotujLokalizacje() {
  return normalizujLokalizacjeMapy([
    { id: 'mag', kod: 'MAGAZYN', nazwa: 'Magazyn', czyAktywna: true },
    { id: 'tyl', kod: 'TYL', nazwa: 'Tylna ściana', nadrzednaLokalizacjaId: 'mag', czyAktywna: true },
    { id: 'centrum', kod: 'CENTRUM', nazwa: 'Centrum', nadrzednaLokalizacjaId: 'mag', czyAktywna: true },
    { id: 't02', kod: 'T02', nazwa: 'Regał T02', nadrzednaLokalizacjaId: 'tyl', czyAktywna: true },
    { id: 't03', kod: 'T03', nazwa: 'Regał T03', nadrzednaLokalizacjaId: 'tyl', czyAktywna: true },
    { id: 'c02', kod: 'C02', nazwa: 'Regał C02', nadrzednaLokalizacjaId: 'centrum', czyAktywna: true },
    { id: 't02-3', kod: 'T02-3', nazwa: 'Półka 3', nadrzednaLokalizacjaId: 't02', czyAktywna: true },
    { id: 't03-1', kod: 'T03-1', nazwa: 'Półka 1', nadrzednaLokalizacjaId: 't03', czyAktywna: true },
    { id: 'pozycja', nazwa: 'Pozycja 1', nadrzednaLokalizacjaId: 't02-3', czyAktywna: false },
  ])
}

function przygotujDane() {
  const dane = pobierzStanZakupow()
  dane.lokalizacjeMagazynowe = przygotujLokalizacje()
  dane.produkty = [{ id: 'papier', nazwa: 'Papier A4', rodzaj: 'MATERIAL_ZUZYWALNY', sposobEwidencji: 'ILOSCIOWY', jednostkaMiary: 'ryza', czyAktywny: true, stanMinimalny: 20, stanDocelowy: 80 }]
  dane.stanyWLokalizacjach = [
    { id: 's1', produktId: 'papier', lokalizacjaId: 't02-3', ilosc: 12 },
    { id: 's2', produktId: 'papier', lokalizacjaId: 't03-1', ilosc: 18 },
    { id: 's3', produktId: 'papier', lokalizacjaId: 'c02', ilosc: 40 },
  ]
  return dane
}

test('lokalizacje zachowują ID i rodzica; starsze rekordy otrzymują kod, typ i geometrię bez zapisu', () => {
  const lokalizacje = przygotujLokalizacje()
  assert.deepEqual(lokalizacje.map((lokalizacja) => lokalizacja.typ), ['OBIEKT', 'STREFA', 'STREFA', 'REGAL', 'REGAL', 'REGAL', 'POLKA', 'POLKA', 'POZYCJA'])
  assert.equal(lokalizacje[8].czyAktywna, false)
  assert.deepEqual(pobierzSciezkeLokalizacji(lokalizacje, 'pozycja'), ['mag', 'tyl', 't02', 't02-3', 'pozycja'])
  assert.deepEqual(normalizujLokalizacjeMapy(lokalizacje), lokalizacje)
  assert.equal(walidujLokalizacjeMapy(lokalizacje), null)
})

test('walidacja odrzuca cykle, brak rodzica, złe poziomy, duplikaty i błędną geometrię', () => {
  const lokalizacje = przygotujLokalizacje()
  for (const zmieniona of [
    { ...lokalizacje[0], nadrzednaLokalizacjaId: 'pozycja' },
    { ...lokalizacje[0], typ: 'POLKA' },
    { ...lokalizacje[0], id: 'tyl' },
    { ...lokalizacje[0], kod: ' tyl ' },
    { ...lokalizacje[0], nazwa: '' },
    { ...lokalizacje[0], polozenieNaMapie: { x: 95, y: 0, szerokosc: 20, wysokosc: 10 } },
    { ...lokalizacje[0], polozenieNaMapie: { x: NaN, y: 0, szerokosc: 20, wysokosc: 10 } },
    { ...lokalizacje[0], polozenieNaMapie: { x: 0, y: 0, szerokosc: 1, wysokosc: 10 } },
  ]) assert.throws(() => normalizujLokalizacjeMapy([zmieniona, ...lokalizacje.slice(1)]))
  assert.throws(() => normalizujLokalizacjeMapy(lokalizacje.slice(1)))
})

test('przesuwanie i skalowanie utrzymuje element w granicach planu', () => {
  assert.deepEqual(ograniczProstokat({ x: -20, y: 120, szerokosc: 25, wysokosc: 20 }), { x: 0, y: 80, szerokosc: 25, wysokosc: 20 })
  assert.deepEqual(ograniczProstokat({ x: 90, y: -1, szerokosc: 120, wysokosc: 0 }), { x: 0, y: 0, szerokosc: 100, wysokosc: 5 })
})

test('Gdzie to leży? pokazuje 12 + 18 + 40 = 70 oraz podświetla regały i strefy nadrzędne', () => {
  const dane = przygotujDane()
  const wynik = znajdzMiejscaProduktu(dane, 'papier')
  assert.equal(wynik.razem, 70)
  assert.equal(wynik.miejsca.length, 3)
  assert.ok(wynik.podswietloneId.has('t02'))
  assert.ok(wynik.podswietloneId.has('tyl'))
  assert.ok(wynik.podswietloneId.has('centrum'))
  assert.equal(wynik.podswietloneId.has('pozycja'), false)
  dane.stanyWLokalizacjach[0].ilosc = 0
  assert.equal(znajdzMiejscaProduktu(dane, 'papier').razem, 58)
  assert.equal(znajdzMiejscaProduktu(dane, 'papier').podswietloneId.has('t02'), false)
  assert.equal(znajdzMiejscaProduktu(dane, 'nieznany').miejsca.length, 0)
})

test('sygnały lokalizacji nie porównują części zapasu z celem całego produktu', () => {
  const dane = przygotujDane()
  assert.deepEqual(pobierzProblemyLokalizacji(dane, 't02'), ['inwentaryzacja'])
  dane.stanyWLokalizacjach[0].ilosc = 0
  assert.ok(pobierzProblemyLokalizacji(dane, 't02').includes('wyczerpany'))
  dane.stanyWLokalizacjach[1].ilosc = 1
  dane.stanyWLokalizacjach[2].ilosc = 1
  assert.ok(pobierzProblemyLokalizacji(dane, 'centrum').includes('niski'))
  assert.deepEqual(pobierzProblemyLokalizacji(dane, 'pozycja'), ['prawidlowy'])
})

test('zakończone przeliczenie innej strefy nie ukrywa braku lokalnej inwentaryzacji', () => {
  const dane = przygotujDane()
  dane.inwentaryzacje = [{ id: 'i1', lokalizacjaId: 't02-3', status: 'ZAMKNIETA', rozpoczeto: '2026-10-01', zakonczono: '2026-10-02' }, { id: 'i2', lokalizacjaId: 'c02', status: 'W_TRAKCIE', rozpoczeto: '2026-10-03' }]
  dane.pozycjeInwentaryzacji = [{ id: 'pi1', produktId: 'papier', inwentaryzacjaId: 'i1', iloscOczekiwana: 12, iloscStwierdzona: 12 }, { id: 'pi2', produktId: 'papier', inwentaryzacjaId: 'i2', iloscOczekiwana: 40 }]
  assert.deepEqual(pobierzProblemyLokalizacji(dane, 't02'), ['prawidlowy'])
  assert.ok(pobierzProblemyLokalizacji(dane, 'centrum').includes('inwentaryzacja'))
})

test('zdjęcia referencyjne są opcjonalne i nie przyjmują zewnętrznych adresów ani zbyt dużych danych', () => {
  const lokalizacje = przygotujLokalizacje()
  lokalizacje[1].zdjecie = 'data:image/png;base64,aGVsbG8='
  assert.equal(walidujLokalizacjeMapy(lokalizacje), null)
  for (const zdjecie of ['https://example.com/zdjecie.png', 'data:image/svg+xml;base64,aA==', 'data:image/png;base64,' + 'a'.repeat(710_000)]) {
    lokalizacje[1].zdjecie = zdjecie
    assert.ok(walidujLokalizacjeMapy(lokalizacje))
  }
})

test('serwis zapisuje tylko lokalizacje, odtwarza plan i udostępnia go wspólnemu stanowi oraz backupowi', () => {
  const poprzedni = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const dane = new Map<string, string>([['ultimatePomagier.pulpit.v1', '{"zapotrzebowaniaZakupowe":[]}']])
  let czyBladZapisu = false
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (klucz: string) => dane.get(klucz) ?? null,
    setItem: (klucz: string, wartosc: string) => { if (czyBladZapisu) throw new Error('QuotaExceededError'); dane.set(klucz, wartosc) },
    key: (indeks: number) => [...dane.keys()][indeks] ?? null,
    get length() { return dane.size },
  } })
  try {
    const lokalizacje = przygotujLokalizacje()
    assert.equal(pobierzLokalizacjeMagazynowe().blad, null)
    assert.equal(dane.size, 1)
    for (const aktor of [null, { ...pracownik, status: 'ZABLOKOWANY' as const }, { ...pracownik, rola: 'GOSC' as const }, { ...pracownik, organizacja: 'KLIENT' as const }]) {
      assert.ok(zapiszLokalizacjeMagazynowe(lokalizacje, null, aktor).blad)
      assert.equal(dane.size, 1)
    }
    const zapisany = zapiszLokalizacjeMagazynowe(lokalizacje, null, pracownik)
    assert.equal(zapisany.blad, null)
    assert.deepEqual(pobierzLokalizacjeMagazynowe().lokalizacje, lokalizacje)
    assert.deepEqual(pobierzStanZakupow().lokalizacjeMagazynowe, lokalizacje)
    assert.ok(pobierzKluczeKategorii('WSZYSTKO').includes(kluczLokalizacjiMagazynowych))
    assert.equal(dane.get('ultimatePomagier.pulpit.v1'), '{"zapotrzebowaniaZakupowe":[]}')
    assert.ok(zapiszLokalizacjeMagazynowe(lokalizacje, null, pracownik).blad)
    assert.equal(dane.get(kluczLokalizacjiMagazynowych), zapisany.zapisBazowy)
    assert.ok(zapiszLokalizacjeMagazynowe([], zapisany.zapisBazowy, pracownik).blad)
    czyBladZapisu = true
    const nieudany = zapiszLokalizacjeMagazynowe(lokalizacje, zapisany.zapisBazowy, pracownik)
    assert.match(nieudany.blad ?? '', /QuotaExceededError/)
    assert.deepEqual(nieudany.lokalizacje, lokalizacje)
    assert.equal(dane.get(kluczLokalizacjiMagazynowych), zapisany.zapisBazowy)
    czyBladZapisu = false
    for (const surowy of ['uszkodzony JSON', '{"wersja":99,"lokalizacje":[]}', '{"wersja":1,"lokalizacje":[{}]}']) {
      dane.set(kluczLokalizacjiMagazynowych, surowy)
      assert.ok(pobierzLokalizacjeMagazynowe().blad)
      assert.ok(zapiszLokalizacjeMagazynowe(lokalizacje, null, pracownik).blad)
      assert.equal(dane.get(kluczLokalizacjiMagazynowych), surowy)
    }
  } finally {
    if (poprzedni) Object.defineProperty(globalThis, 'localStorage', poprzedni)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('nieudany zapis blokuje wyjście z mapy, a dotychczasowe zapisy void pozostają zgodne', () => {
  let wyrejestruj = ustawObslugeNiezapisanegoDokumentu({ czySaNiezapisaneZmiany: () => true, zapiszPrzedWyjsciem: () => false })
  assert.equal(czyDokumentMaNiezapisaneZmiany(), true)
  assert.equal(zapiszDokumentPrzedWyjsciem(), false)
  wyrejestruj()
  wyrejestruj = ustawObslugeNiezapisanegoDokumentu({ czySaNiezapisaneZmiany: () => false, zapiszPrzedWyjsciem: () => {} })
  assert.equal(zapiszDokumentPrzedWyjsciem(), true)
  wyrejestruj()
  assert.equal(czyDokumentMaNiezapisaneZmiany(), false)
})

test('Mapa magazynu ma trasę i znajduje się w podmenu Magazyn', () => {
  assert.equal(pobierzSciezkeZakupow('zakupy_mapa_magazynu'), '/zakupy/magazyn/mapa')
  assert.equal(pobierzWidokZakupowZeSciezki('/zakupy/magazyn/mapa'), 'zakupy_mapa_magazynu')
  assert.deepEqual(pobierzSciezkeMenuDlaWidoku('zakupy_mapa_magazynu'), ['zakupy', 'zakupy_magazyn_grupa', 'zakupy_mapa_magazynu'])
})
