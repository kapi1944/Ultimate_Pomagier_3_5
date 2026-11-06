import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'
import { utworzWersjeTestowa } from './danePakietuPdf.ts'
import { utworzPakietDokumentow } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { nazwaPlikuPakietu, odczytajKonfiguracjePakietu, pobierzDokumentyPakietu, pobierzMetadanePakietu, przygotujPlanPakietu, przeniesDokument, sprawdzStanDokumentu, sygnaturaZrodel, utworzDomyslnaKonfiguracje, zapiszKonfiguracjePakietu } from '../src/wspolne/dokumenty/pakietyDoZatwierdzenia/modelPakietu.ts'
const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => { magazyn.set(klucz, wartosc) }, removeItem: (klucz: string) => { magazyn.delete(klucz) }, clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage
beforeEach(() => magazyn.clear())
function przygotuj() {
  const wersja = utworzWersjeTestowa(true, 2)
  const wyniki = utworzPakietDokumentow(wersja, ['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista'], wersja.autorId)
  assert.ok(wyniki.every((wynik) => wynik.status === 'utworzono'))
  const dokumenty = pobierzDokumentyPakietu(wersja)
  return { wersja, dokumenty, konfiguracja: utworzDomyslnaKonfiguracje(dokumenty) }
}
test('odnajduje realne ID szkolenia i grup; wybiera podstawowe dokumenty, wspólny program raz', () => {
  const { wersja, dokumenty, konfiguracja } = przygotuj()
  assert.equal(dokumenty.length, 10)
  const plan = przygotujPlanPakietu(wersja, konfiguracja)
  assert.equal(plan.length, 7)
  assert.equal(plan.filter((dokument) => dokument.typ === 'PROGRAM_SZKOLENIA').length, 1)
  assert.deepEqual(new Set(plan.filter((dokument) => dokument.typ === 'LISTA_OBECNOSCI').map((dokument) => dokument.powiazania.grupaId)), new Set(['grupa-a', 'grupa-b']))
  assert.equal(pobierzDokumentyPakietu({ ...wersja, id: 'inne-szkolenie' }).length, 0)
})
test('odznaczenie, zaznaczenie i kolejność odnoszą się do ID, także przy identycznych tytułach', () => {
  const { wersja, dokumenty, konfiguracja } = przygotuj()
  const [pierwszy, drugi] = dokumenty
  repozytoriumWspolnychDokumentow.aktualizuj(drugi.id, { tytul: pierwszy.tytul })
  const kolejnosc = przeniesDokument(konfiguracja.kolejnosc, drugi.id, pierwszy.id)
  assert.deepEqual(przygotujPlanPakietu(wersja, { ...konfiguracja, kolejnosc, wybraneId: [pierwszy.id, drugi.id] }).map((dokument) => dokument.id), kolejnosc.filter((id) => [pierwszy.id, drugi.id].includes(id)))
  assert.throws(() => przygotujPlanPakietu(wersja, { ...konfiguracja, wybraneId: [] }), /Wybierz/)
})
test('zapis i odczyt wyboru, grup, kolejności i ustawień izoluje szkolenia bez zapisu PDF', () => {
  const { wersja, konfiguracja } = przygotuj()
  const wybrana = { ...konfiguracja, kolejnosc: [...konfiguracja.kolejnosc].reverse(), wybraneId: konfiguracja.wybraneId.slice(0, 2), grupyId: ['grupa-a'], stronaTytulowa: false, spisDokumentow: false, podzialNaGrupy: false, oznaczenie: true, trybCertyfikatow: 'wszyscy' as const }
  zapiszKonfiguracjePakietu(wersja.id, wybrana)
  assert.deepEqual(odczytajKonfiguracjePakietu(wersja.id, pobierzDokumentyPakietu(wersja)), wybrana)
  assert.deepEqual(odczytajKonfiguracjePakietu('inne', []), utworzDomyslnaKonfiguracje([]))
  assert.ok(![...magazyn.values()].join('').includes('pdfBytes'))
})
test('usunięty wybrany dokument pozostaje widoczny w konfiguracji i blokuje cały pakiet', () => {
  const { wersja, dokumenty, konfiguracja } = przygotuj()
  const usuwany = dokumenty.find((dokument) => konfiguracja.wybraneId.includes(dokument.id))!
  zapiszKonfiguracjePakietu(wersja.id, konfiguracja)
  repozytoriumWspolnychDokumentow.usunMiekko(usuwany.id)
  const przywrocona = odczytajKonfiguracjePakietu(wersja.id, pobierzDokumentyPakietu(wersja))
  assert.ok(przywrocona.wybraneId.includes(usuwany.id))
  assert.throws(() => przygotujPlanPakietu(wersja, przywrocona), /Brak dokumentu/)
})
test('roboczy jest dozwolony, nieaktualny, archiwalny i nieznana grupa blokują generowanie', () => {
  const { wersja, konfiguracja, dokumenty } = przygotuj()
  assert.ok(przygotujPlanPakietu(wersja, konfiguracja).every((dokument) => dokument.status === 'ROBOCZY'))
  assert.equal(sprawdzStanDokumentu(dokumenty[0], wersja).stan, 'roboczy')
  const nowa = structuredClone(wersja)
  nowa.dane.tytulSzkolenia += ' zmieniony'
  assert.throws(() => przygotujPlanPakietu(nowa, konfiguracja), /Nieaktualny/)
  assert.equal(sprawdzStanDokumentu({ ...dokumenty[0], czyZarchiwizowany: true }, wersja).stan, 'niedostepny')
  assert.equal(sprawdzStanDokumentu({ ...dokumenty[0], powiazania: { ...dokumenty[0].powiazania, grupaId: 'usunieta' } }, wersja).stan, 'bledny')
})
test('nie można po cichu dołączyć dokumentu wyłączonej grupy', () => {
  const { wersja, konfiguracja, dokumenty } = przygotuj()
  const dokument = dokumenty.find((pozycja) => pozycja.powiazania.grupaId === 'grupa-b')!
  assert.throws(() => przygotujPlanPakietu(wersja, { ...konfiguracja, grupyId: ['grupa-a'], wybraneId: [dokument.id] }), /grupy wyłączonej/)
})
test('sygnatura wykrywa zmianę treści bez nowej wersji i nie zmienia źródeł', () => {
  const { wersja, konfiguracja, dokumenty } = przygotuj()
  const dokument = dokumenty.find((pozycja) => konfiguracja.wybraneId.includes(pozycja.id))!
  const stanPrzed = JSON.stringify(repozytoriumWspolnychDokumentow.pobierzWszystkie())
  const sygnatura = sygnaturaZrodel(wersja, konfiguracja)
  assert.equal(JSON.stringify(repozytoriumWspolnychDokumentow.pobierzWszystkie()), stanPrzed)
  repozytoriumWspolnychDokumentow.aktualizuj(dokument.id, { tytul: dokument.tytul + ' korekta' })
  assert.notEqual(sygnaturaZrodel(wersja, konfiguracja), sygnatura)
})
test('nazwa pliku usuwa niedozwolone znaki Windows i zawiera organizatora, tytuł i termin', () => {
  const metadane = pobierzMetadanePakietu(utworzWersjeTestowa())
  const nazwa = nazwaPlikuPakietu({ ...metadane, tytul: 'Prawo <a>: "test" / nowości? * |' })
  assert.match(nazwa, /^SEMPER_/)
  assert.match(nazwa, /15.09.2026/)
  assert.match(nazwa, /_DO_ZATWIERDZENIA.pdf$/)
  assert.ok(!/[<>:"/\\|?*]/.test(nazwa))
})
