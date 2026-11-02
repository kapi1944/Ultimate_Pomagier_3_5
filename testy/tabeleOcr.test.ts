import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import { dodajUczestnikowBezDuplikatow, ocenObecnoscGrafikiPodpisu, pobierzUczestnikowOcr, zbudujTabeleOcr, type SlowoOcr } from '../src/wspolne/ocr/modelTabeliOcr.ts'
import { csvTabeliOcr, czyPoprawnySzkicOcr, tekstTabeliOcr, xlsxTabeliOcr } from '../src/wspolne/ocr/eksportTabeliOcr.ts'

function tabelaTestowa() {
  const naglowki = ['Lp.', 'Nazwisko', 'Imię', 'Zespół', 'Podpis 28.10', 'Podpis 29.10']
  const slowa: SlowoOcr[] = []
  const dodaj = (tekst: string, wiersz: number, kolumna: number, pewnosc = 95) => slowa.push({ tekst, x: kolumna * 150 + 10, y: wiersz * 40 + 10, szerokosc: 100, wysokosc: 20, pewnosc })
  naglowki.forEach((nazwa, kolumna) => dodaj(nazwa, 0, kolumna))
  for (let wiersz = 1; wiersz <= 22; wiersz++) ['' + wiersz, wiersz === 1 ? 'Próbna-Testowa' : 'Przykładowy', wiersz === 1 ? 'Żaneta' : 'Łukasz', 'Zespół A', 'NIE TRANSKRYBUJ', ''].forEach((tekst, kolumna) => dodaj(tekst, wiersz, kolumna))
  return zbudujTabeleOcr(slowa, Array.from({ length: 7 }, (_, indeks) => indeks * 150), Array.from({ length: 24 }, (_, indeks) => indeks * 40), 1)
}
test('22 osoby, sześć kolumn, dwa dni, polskie znaki, podpisy i pozycje źródłowe', () => {
  const tabela = tabelaTestowa()
  assert.equal(tabela.wiersze.length, 22)
  assert.equal(tabela.naglowki.length, 6)
  assert.equal(tabela.wiersze[0][1].tekst, 'Próbna-Testowa')
  assert.equal(tabela.wiersze[0][2].tekst, 'Żaneta')
  assert.equal(tabela.wiersze[0][4].podpis, true)
  assert.ok(!tekstTabeliOcr([tabela]).includes('NIE TRANSKRYBUJ'))
  assert.deepEqual(tabela.wiersze[0][2].obszar, { x: 300, y: 40, szerokosc: 150, wysokosc: 40 })
  tabela.zaznaczone = [0]
  assert.throws(() => pobierzUczestnikowOcr([tabela]), /Zweryfikuj/)
  tabela.wiersze[0] = tabela.wiersze[0].map((pole) => ({ ...pole, zweryfikowana: true }))
  assert.deepEqual(pobierzUczestnikowOcr([tabela]), [{ imieINazwisko: 'Żaneta Próbna-Testowa', firma: 'Zespół A' }])
})
test('duplikaty zachowują ID i dane istniejących osób; brak fikcyjnych wierszy', () => {
  const obecny = { id: 'stale-id', imieINazwisko: 'Żaneta Próbna-Testowa', email: 'syntetyczny@example.invalid' }
  const wynik = dodajUczestnikowBezDuplikatow([obecny], [{ imieINazwisko: ' żaneta  próbna-testowa ' }, { imieINazwisko: 'Alicja Przykładowa' }, { imieINazwisko: 'Alicja Przykładowa' }])
  assert.equal(wynik.length, 2)
  assert.equal(wynik[0], obecny)
  assert.ok(wynik[1].id !== 'stale-id')
  assert.equal(zbudujTabeleOcr([], [], [], 1).wiersze.length, 0)
})
test('weryfikacja, wiele stron, niepewny odczyt i przywracanie wyników', () => {
  const pierwsza = tabelaTestowa(), druga = tabelaTestowa()
  pierwsza.zaznaczone = [0]; druga.zaznaczone = [1]
  for (const tabela of [pierwsza, druga]) for (const indeks of tabela.zaznaczone) tabela.wiersze[indeks] = tabela.wiersze[indeks].map((pole) => ({ ...pole, zweryfikowana: true }))
  assert.equal(pobierzUczestnikowOcr([pierwsza, druga]).length, 2)
  assert.ok(czyPoprawnySzkicOcr(JSON.parse(JSON.stringify({ wersja: 1, tabele: [pierwsza, druga] }))))
  assert.equal(czyPoprawnySzkicOcr({ wersja: 2, tabele: [] }), false)
  assert.equal(czyPoprawnySzkicOcr({ wersja: 1, tabele: [{ ...pierwsza, wiersze: [[{}]] }] }), false)
})
test('CSV chroni przed formułami; XLSX zawiera tekst Unicode, bez formuł i grafiki podpisu', async () => {
  const tabela = tabelaTestowa()
  tabela.wiersze[0][1].tekst = '=HYPERLINK("x")'
  assert.match(csvTabeliOcr([tabela]), /'=HYPERLINK/)
  const plik = await JSZip.loadAsync(await xlsxTabeliOcr([tabela]))
  const arkusz = await plik.file('xl/worksheets/sheet1.xml')!.async('string')
  assert.ok(arkusz.includes('Żaneta'))
  assert.ok(arkusz.includes('inlineStr'))
  assert.ok(!arkusz.includes('<f>'))
  assert.ok(!arkusz.includes('NIE TRANSKRYBUJ'))
})

test('brak grafiki, niejednoznaczny ślad i grafika podpisu nie identyfikują osoby', () => {
  const piksele = new Uint8ClampedArray(40000).fill(255)
  assert.equal(ocenObecnoscGrafikiPodpisu(piksele), 'Nie wykryto grafiki')
  piksele[0] = piksele[1] = piksele[2] = 0
  assert.equal(ocenObecnoscGrafikiPodpisu(piksele), 'Niejednoznaczna grafika')
  piksele.fill(0, 0, 4000)
  assert.equal(ocenObecnoscGrafikiPodpisu(piksele), 'Grafika — sprawdź oryginał')
})
