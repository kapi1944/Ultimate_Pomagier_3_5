import { register } from 'node:module'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { utworzDaneRejestrowV4 } from './daneRejestrowSzczegolowV4.mjs'
register('./loaderKomponentow.mjs', import.meta.url)

const magazyn = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (klucz) => magazyn.get(klucz) ?? null, setItem: (klucz, wartosc) => magazyn.set(klucz, wartosc), removeItem: (klucz) => magazyn.delete(klucz),
} })
const { default: Lista } = await import('../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych.tsx')
const { default: Kopie } = await import('../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych.tsx')
const { pobierzUzytkownikow } = await import('../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
const { rozpocznijSesje } = await import('../src/aplikacja/logowanie/sesjaUzytkownika.ts')
const { repozytoriumWspolnychDokumentow, kluczRejestruDokumentow } = await import('../src/wspolne/dokumenty/rejestrDokumentow.ts')
const { utworzNowyDokument } = await import('../src/wspolne/dokumenty/modelDokumentu.ts')
const { pobierzKopieRobocze, pobierzOpublikowaneSzczegoly } = await import('../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych.ts')
const konta = pobierzUzytkownikow().filter((konto) => konto.status === 'AKTYWNY')
const administrator = konta.find((konto) => konto.rola === 'ADMINISTRATOR')
const opiekun = konta.find((konto) => konto.rola === 'OPIEKUN' && konto.odznaki.includes('AKCEPTUJACY'))
const autor = konta.find((konto) => konto.rola === 'PRACOWNIK')
const obcy = konta.find((konto) => konto.rola === 'OPIEKUN' && konto.id !== opiekun.id)
const dane = utworzDaneRejestrowV4(opiekun.id, autor.id)

function zapiszDane(kopie, opublikowane) {
  magazyn.delete(kluczRejestruDokumentow)
  for (const [rekordy, status] of [[kopie, 'ROBOCZY'], [opublikowane, 'OPUBLIKOWANY']]) {
    for (const rekord of rekordy) repozytoriumWspolnychDokumentow.utworz({ ...utworzNowyDokument({ id: rekord.id, typ: 'SZCZEGOLY_ORGANIZACYJNE', tytul: rekord.dane.tytulSzkolenia, generatorId: 'szczegoly_organizacyjne', daneDokumentu: structuredClone(rekord), ustawieniaDokumentu: {} }), status, opublikowano: status === 'OPUBLIKOWANY' ? rekord.dataPublikacji : null })
  }
}
function renderuj(Widok, konto) {
  assert.equal(rozpocznijSesje(konto.id), true)
  const przed = [...magazyn]
  const wynik = renderToStaticMarkup(createElement(Widok, { otworzNoweSzczegoly: () => {} }))
  assert.deepEqual([...magazyn], przed, 'Samo wyświetlenie rejestru nie zmienia zapisanych wartości ani historii.')
  return wynik
}
zapiszDane([], [])
assert.match(renderuj(Lista, administrator), /Brak opublikowanych szczegółów/)
assert.match(renderuj(Kopie, administrator), /Brak dostępnych kopii/)
zapiszDane(dane.kopie, dane.opublikowane)
const zapisane = { kopie: pobierzKopieRobocze(), opublikowane: pobierzOpublikowaneSzczegoly() }
for (const konto of [administrator, opiekun, autor, obcy]) {
  const lista = renderuj(Lista, konto)
  assert.equal((lista.match(/<article/g) ?? []).length, 5)
  assert.match(lista, /Dokument opublikowany/)
  assert.doesNotMatch(lista, /Nazwa kopii|Szkic testowy V4/)
  assert.match(lista, /border-inline-start-color:/)
  assert.doesNotMatch(lista, /background-color:/)
  for (const etykieta of ['Organizator', 'Opiekun', 'Autor', 'Publikacja', 'Grupy', 'Wersja opublikowana', 'Trenerzy według grup']) assert.ok(lista.includes(etykieta), etykieta)
  assert.match(lista, /data-status="warning"/)
  assert.match(lista, /data-status="success"/)
  assert.match(lista, /data-status="error"/)
  assert.equal(lista.includes('Oznacz jako zaakceptowane'), konto === administrator || konto === opiekun)
  assert.equal(lista.includes('Oznacz jako gotowe'), konto === administrator || konto === opiekun)
  assert.equal(lista.includes('Cofnij status'), konto === administrator || konto === opiekun)
  const rozliczony = lista.match(/<article\b[\s\S]*?<\/article>/g).find((karta) => karta.includes('<h2>Szkolenie opublikowane V4 5</h2>'))
  assert.doesNotMatch(rozliczony, /Utwórz aktualizację|>Edytuj</)
  assert.match(rozliczony, /Duplikuj/)
  assert.match(rozliczony, /Usun/)
  const kopie = renderuj(Kopie, konto)
  const czyMozeEdytowac = konto === administrator || konto === opiekun
  assert.equal((kopie.match(/<article/g) ?? []).length, konto === obcy ? 0 : 2)
  assert.equal(kopie.includes('>Edytuj<'), czyMozeEdytowac)
  assert.equal(kopie.includes('>Duplikuj<'), czyMozeEdytowac)
  assert.equal(kopie.includes('>Usun<'), czyMozeEdytowac)
  if (konto !== obcy) {
    assert.match(kopie, /Szkic/)
    assert.match(kopie, /Niepełne — do uzupełnienia/)
    assert.match(kopie, /1 — historyczna/)
    assert.match(kopie, /Aktualna wersja dokumentu: 3/)
    assert.match(kopie, /Dane do weryfikacji/)
    assert.doesNotMatch(kopie, /Dokument opublikowany/)
  }
  if (konto === autor) assert.match(kopie, /Kopia tylko do odczytu/)
}
assert.deepEqual({ kopie: pobierzKopieRobocze(), opublikowane: pobierzOpublikowaneSzczegoly() }, zapisane)
const dlugaNazwa = 'BardzoDługaNazwaSzkolenia'.repeat(30)
const wiele = Array.from({ length: 40 }, (_, indeks) => ({ ...structuredClone(dane.opublikowane[0]), id: `rekord-${indeks}`, numerWersji: indeks + 1, dane: { ...dane.opublikowane[0].dane, tytulSzkolenia: dlugaNazwa } }))
zapiszDane([], [wiele[0]])
assert.equal((renderuj(Lista, administrator).match(/<article/g) ?? []).length, 1)
zapiszDane([], wiele)
const lista = renderuj(Lista, administrator)
assert.equal((lista.match(/<article/g) ?? []).length, 40)
assert.ok(lista.includes(dlugaNazwa))
zapiszDane([dane.kopie[0]], [])
assert.equal((renderuj(Kopie, administrator).match(/<article/g) ?? []).length, 1)
zapiszDane(wiele.map((rekord, indeks) => ({ ...structuredClone(dane.kopie[0]), id: `kopia-${indeks}`, dane: rekord.dane })), [])
assert.equal((renderuj(Kopie, administrator).match(/<article/g) ?? []).length, 40)
console.log('V4-06: lista i kopie osobno; 0/1/40 rekordów, długie nazwy, role, statusy, wersje i brak mutacji danych — OK.')
