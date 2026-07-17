import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: () => null,
  length: 0,
} as Storage

const { daneStartoweUzytkownikow } = await import('../src/kartoteki/uzytkownicy/daneUzytkownikow.ts')
const { kluczMagazynuUzytkownikow, pobierzAktywnychUzytkownikowWedlugRoli, pobierzUzytkownika, pobierzUzytkownikow, zapiszUzytkownikow, zainicjalizujMagazynUzytkownikow } = await import('../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
const { czyJestAdministratorem, czyMozeAkceptowac, czyMozeEksportowac } = await import('../src/kartoteki/uzytkownicy/uprawnienia.ts')
const { kluczSesjiUzytkownika, pobierzSesje, pobierzZalogowanegoUzytkownika, rozpocznijSesje, zakonczSesje } = await import('../src/aplikacja/logowanie/sesjaUzytkownika.ts')
const { czyKontoMozeWidziecKopie, pobierzAktywneKontoSzczegolow, pobierzKolorTlaOpiekuna, pobierzKontoSzczegolow } = await import('../src/moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow.ts')

function wyczyscStan() { magazyn.clear() }

test('magazyn inicjalizuje dane tylko raz, nie nadpisuje danych i bezpiecznie obsługuje uszkodzony JSON', () => {
  wyczyscStan()
  const pierwsze = zainicjalizujMagazynUzytkownikow()
  assert.equal(pierwsze.length, daneStartoweUzytkownikow.length)
  const niestandardowy = [{ ...pierwsze[0], pseudonim: 'Zachowany użytkownik' }]
  magazyn.set(kluczMagazynuUzytkownikow, JSON.stringify(niestandardowy))
  assert.equal(zainicjalizujMagazynUzytkownikow()[0].pseudonim, 'Zachowany użytkownik')
  magazyn.set(kluczMagazynuUzytkownikow, '{uszkodzony')
  assert.deepEqual(pobierzUzytkownikow(), [])
  magazyn.set(kluczMagazynuUzytkownikow, JSON.stringify([{}]))
  assert.deepEqual(pobierzUzytkownikow(), [])
})

test('magazyn wyszukuje bez rozróżniania wielkości liter po loginie, e-mailu i aliasie', () => {
  wyczyscStan()
  zainicjalizujMagazynUzytkownikow()
  assert.equal(pobierzUzytkownika('KACPER.MADEJ')?.id, 'administrator-kacper-madej')
  assert.equal(pobierzUzytkownika('ADMINISTRATOR@POMAGIER.LOCAL')?.id, 'administrator-kacper-madej')
  assert.equal(pobierzUzytkownika('architekt')?.id, 'architekt-systemu')
  assert.equal(pobierzAktywnychUzytkownikowWedlugRoli('OPIEKUN').some((uzytkownik) => uzytkownik.id === 'Iza'), true)
})

test('sesja działa tylko dla aktywnego konta, odtwarza się, unieważnia po zmianie uprawnień i usuwa przy wylogowaniu', () => {
  wyczyscStan()
  zainicjalizujMagazynUzytkownikow()
  assert.equal(rozpocznijSesje('administrator-kacper-madej'), true)
  assert.equal(pobierzZalogowanegoUzytkownika()?.id, 'administrator-kacper-madej')
  assert.equal(rozpocznijSesje('konto-zablokowane'), false)
  assert.equal(rozpocznijSesje('konto-nieaktywne'), false)
  const zmienieniUzytkownicy = pobierzUzytkownikow().map((uzytkownik) => uzytkownik.id === 'administrator-kacper-madej' ? { ...uzytkownik, wersjaUprawnien: uzytkownik.wersjaUprawnien + 1 } : uzytkownik)
  zapiszUzytkownikow(zmienieniUzytkownicy)
  assert.equal(pobierzSesje(), null)
  assert.equal(magazyn.has(kluczSesjiUzytkownika), false)
  zakonczSesje()
  assert.equal(pobierzZalogowanegoUzytkownika(), null)
})

test('brak sesji nie zwraca Administratora, a role i odznaki nie przyznają dostępu przypadkowo', () => {
  wyczyscStan()
  zainicjalizujMagazynUzytkownikow()
  assert.equal(pobierzZalogowanegoUzytkownika(), null)
  const administrator = pobierzUzytkownika('administrator-kacper-madej')
  const iza = pobierzUzytkownika('Iza')
  assert.equal(czyJestAdministratorem(administrator), true)
  assert.equal(czyMozeEksportowac(administrator), true)
  assert.equal(czyMozeAkceptowac(iza), true)
  assert.equal(czyMozeEksportowac(iza), false)
})

test('migracja starej sesji rozpoznaje konto i usuwa oba historyczne klucze', () => {
  wyczyscStan()
  zainicjalizujMagazynUzytkownikow()
  magazyn.set('ultimate-pomagier.zalogowany-uzytkownik', JSON.stringify({ id: 'Iza' }))
  magazyn.set('ultimate-pomagier.aktywna-rola', 'Opiekun')
  assert.equal(pobierzZalogowanegoUzytkownika()?.id, 'Iza')
  assert.equal(magazyn.has('ultimate-pomagier.zalogowany-uzytkownik'), false)
  assert.equal(magazyn.has('ultimate-pomagier.aktywna-rola'), false)
})

test('adapter szczegółów zachowuje historyczne identyfikatory i kolory oraz nie daje nieznanemu dostępu', () => {
  wyczyscStan()
  zainicjalizujMagazynUzytkownikow()
  for (const [id, kolor] of [['Iza', '#ffe599'], ['Kamila', '#6fa8dc'], ['Dawid', '#f6b26b'], ['Kasia RB', '#fce4d6']] as const) {
    assert.equal(pobierzKontoSzczegolow(id)?.id, id)
    assert.equal(pobierzKolorTlaOpiekuna(id), `${kolor}cc`)
  }
  const nieznaneKonto = pobierzAktywneKontoSzczegolow()
  assert.equal(nieznaneKonto.rola, 'GOSC')
  const kopia = { autorId: 'Iza', dane: { opiekunId: 'Iza' } } as never
  assert.equal(czyKontoMozeWidziecKopie(nieznaneKonto, kopia), false)
  rozpocznijSesje('Iza')
  assert.equal(czyKontoMozeWidziecKopie(pobierzAktywneKontoSzczegolow(), kopia), true)
  rozpocznijSesje('administrator-kacper-madej')
  assert.equal(czyKontoMozeWidziecKopie(pobierzAktywneKontoSzczegolow(), { autorId: 'inny', dane: { opiekunId: 'inny' } } as never), true)
})

test('struktura panelu i menu udostępnia lokalne logowanie, profil oraz dostępne odznaki', () => {
  const panel = readFileSync(new URL('../src/aplikacja/logowanie/PanelLogowania.tsx', import.meta.url), 'utf8')
  const menu = readFileSync(new URL('../src/aplikacja/menu/MenuBoczne.tsx', import.meta.url), 'utf8')
  const odznaka = readFileSync(new URL('../src/kartoteki/uzytkownicy/komponenty/OdznakaUzytkownika.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(panel, /type="password"/)
  assert.match(panel, /Lokalny tryb demonstracyjny/)
  assert.match(menu, /Wyloguj/)
  assert.match(menu, /AvatarUzytkownika/)
  assert.match(odznaka, /aria-label/)
})
