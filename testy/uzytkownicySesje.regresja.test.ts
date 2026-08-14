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
const { kluczMagazynuUzytkownikow, pobierzAktywnychUzytkownikowWedlugRoli, pobierzUzytkownika, pobierzUzytkownikow, zapiszUzytkownikow, utworzUzytkownikaPrzezAdministratora, wykonajMigracjeRoliArchitekta, zainicjalizujMagazynUzytkownikow, zaktualizujUzytkownikaPrzezAdministratora, zaktualizujUzytkownikaPrzezArchitekta } = await import('../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
const { czyJestAdministratorem, czyMozeAkceptowac, czyMozeEksportowac, czyMozeWysylac } = await import('../src/kartoteki/uzytkownicy/uprawnienia.ts')
const { kluczSesjiUzytkownika, pobierzSesje, pobierzZalogowanegoUzytkownika, rozpocznijSesje, zakonczSesje } = await import('../src/aplikacja/logowanie/sesjaUzytkownika.ts')
const { czyKontoMozeWidziecKopie, pobierzAktywneKontoSzczegolow, pobierzKolorTlaOpiekuna, pobierzKontoSzczegolow } = await import('../src/moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow.ts')

function wyczyscStan() { magazyn.clear() }

test('magazyn inicjalizuje dane tylko raz, nie nadpisuje danych i bezpiecznie obsługuje uszkodzony JSON', () => {
  wyczyscStan()
  const pierwsze = zainicjalizujMagazynUzytkownikow()
  assert.equal(pierwsze.length, daneStartoweUzytkownikow.length)
  const niestandardowy = [{ ...pierwsze[0], id: 'uzytkownik-niestandardowy', login: 'niestandardowy', email: 'niestandardowy@pomagier.local', emaile: ['niestandardowy@pomagier.local'], pseudonim: 'Zachowany użytkownik' }]
  magazyn.set(kluczMagazynuUzytkownikow, JSON.stringify(niestandardowy))
  assert.equal(zainicjalizujMagazynUzytkownikow().find((uzytkownik) => uzytkownik.id === 'uzytkownik-niestandardowy')?.pseudonim, 'Zachowany użytkownik')
  magazyn.set(kluczMagazynuUzytkownikow, '{uszkodzony')
  assert.equal(pobierzUzytkownikow().length, 9)
  magazyn.set(kluczMagazynuUzytkownikow, JSON.stringify([{}]))
  assert.equal(pobierzUzytkownikow().length, 9)
})

test('docelowa baza startowa zawiera dokładnie 17 spójnych i unikalnych użytkowników', () => {
  const noweId = ['pracownik-pawel-kwiecinski', 'pracownik-tomasz-czekaj', 'pracownik-angelika-poznanska', 'pracownik-agata-pelc', 'pracownik-alicja-krysinska', 'pracownik-paulina-kazmierczak', 'pracownik-izabela-szoc', 'pracownik-ewelina-kostecka', 'pracownik-ewa-niziol']
  assert.equal(daneStartoweUzytkownikow.length, 17)
  assert.equal(new Set(daneStartoweUzytkownikow.map((uzytkownik) => uzytkownik.id)).size, 17)
  assert.equal(new Set(daneStartoweUzytkownikow.map((uzytkownik) => uzytkownik.login.toLocaleLowerCase('pl'))).size, 17)
  const wszystkieEmaile = daneStartoweUzytkownikow.flatMap((uzytkownik) => uzytkownik.emaile.map((email) => email.toLocaleLowerCase('pl')))
  assert.equal(new Set(wszystkieEmaile).size, wszystkieEmaile.length)
  assert.equal(daneStartoweUzytkownikow.every((uzytkownik) => uzytkownik.email === uzytkownik.emaile[0]), true)
  assert.equal(daneStartoweUzytkownikow.some((uzytkownik) => uzytkownik.id === 'opiekun-anna-nowak'), false)
  assert.equal(daneStartoweUzytkownikow.some((uzytkownik) => uzytkownik.id === 'opiekun-piotr-zielinski'), false)
  assert.equal(noweId.every((id) => daneStartoweUzytkownikow.some((uzytkownik) => uzytkownik.id === id)), true)
  const architekci = daneStartoweUzytkownikow.filter((uzytkownik) => uzytkownik.rola === 'ARCHITEKT')
  assert.equal(architekci.length, 1)
  assert.equal(architekci[0].id, 'administrator-kacper-madej')
  assert.equal(architekci[0].status, 'AKTYWNY')
  assert.equal(architekci[0].organizacja, 'SEMPER')
  assert.equal(daneStartoweUzytkownikow.find((uzytkownik) => uzytkownik.id === 'architekt-systemu')?.email, 'a.systemu@pomagier.local')
  assert.equal(daneStartoweUzytkownikow.find((uzytkownik) => uzytkownik.id === 'Kasia RB')?.email, 'k.buraczek@szkolenia-semper.pl')
  assert.equal(daneStartoweUzytkownikow.find((uzytkownik) => uzytkownik.id === 'Iza')?.telefony[0]?.numerE164, '+48796230982')
  assert.deepEqual(daneStartoweUzytkownikow.find((uzytkownik) => uzytkownik.id === 'pracownik-pawel-kwiecinski')?.odznaki, ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'])
  assert.deepEqual(daneStartoweUzytkownikow.find((uzytkownik) => uzytkownik.id === 'pracownik-angelika-poznanska')?.odznaki, ['EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'])
  for (const [id, imie, nazwisko, login] of [['Iza', 'Izabela', 'Czugała', 'i.czugala'], ['Kamila', 'Kamila', 'Zaremba', 'k.zaremba'], ['Dawid', 'Dawid', 'Chyła', 'd.chyla'], ['Kasia RB', 'Katarzyna', 'Rohde-Buraczek', 'k.buraczek']] as const) {
    const uzytkownik = daneStartoweUzytkownikow.find((kandydat) => kandydat.id === id)
    assert.deepEqual([uzytkownik?.imie, uzytkownik?.nazwisko, uzytkownik?.login], [imie, nazwisko, login])
  }
})

test('migracja starego magazynu aktualizuje bazę raz, zachowuje metadane i nie tworzy duplikatów', () => {
  wyczyscStan()
  const stareUtworzenie = '2025-01-02T03:04:05.000Z'
  const stareLogowanie = '2026-01-02T03:04:05.000Z'
  const stareRekordy = daneStartoweUzytkownikow.slice(0, 8).map((uzytkownik) => {
    if (uzytkownik.id === 'architekt-systemu') return { ...uzytkownik, email: 'stary-adres@pomagier.local' }
    if (uzytkownik.id === 'Iza') return { ...uzytkownik, imie: 'Iza', nazwisko: '', pseudonim: 'Iza', email: 'iza@pomagier.local', emaile: ['iza@pomagier.local'], login: 'iza', odznaki: ['AKCEPTUJACY'] as typeof uzytkownik.odznaki, utworzono: stareUtworzenie, ostatnieLogowanie: stareLogowanie }
    if (uzytkownik.id === 'Kamila') return { ...uzytkownik, nazwisko: '', email: 'kamila@pomagier.local', emaile: ['kamila@pomagier.local'], login: 'kamila' }
    if (uzytkownik.id === 'Dawid') return { ...uzytkownik, nazwisko: '', email: 'dawid@pomagier.local', emaile: ['dawid@pomagier.local'], login: 'dawid' }
    if (uzytkownik.id === 'Kasia RB') return { ...uzytkownik, imie: 'Kasia', nazwisko: 'RB', email: 'kasia.rb@pomagier.local', emaile: ['kasia.rb@pomagier.local'], login: 'kasia.rb' }
    return uzytkownik
  })
  const wzorzec = daneStartoweUzytkownikow[0]
  stareRekordy.push(
    { ...wzorzec, id: 'opiekun-anna-nowak', imie: 'Anna', nazwisko: 'Nowak', pseudonim: 'Ania', email: 'anna.nowak@pomagier.local', emaile: ['anna.nowak@pomagier.local'], login: 'anna.nowak', rola: 'OPIEKUN' },
    { ...wzorzec, id: 'opiekun-piotr-zielinski', imie: 'Piotr', nazwisko: 'Zieliński', pseudonim: 'Piotr', email: 'piotr.zielinski@pomagier.local', emaile: ['piotr.zielinski@pomagier.local'], login: 'piotr.zielinski', rola: 'OPIEKUN' },
  )
  magazyn.set(kluczMagazynuUzytkownikow, JSON.stringify(stareRekordy))

  const poPierwszejMigracji = zainicjalizujMagazynUzytkownikow()
  const izaPoMigracji = poPierwszejMigracji.find((uzytkownik) => uzytkownik.id === 'Iza')!
  assert.equal(poPierwszejMigracji.length, 17)
  assert.equal(izaPoMigracji.utworzono, stareUtworzenie)
  assert.equal(izaPoMigracji.ostatnieLogowanie, stareLogowanie)
  assert.equal(izaPoMigracji.wersjaUprawnien, 2)
  assert.equal(poPierwszejMigracji.every((uzytkownik) => uzytkownik.email === uzytkownik.emaile[0]), true)
  assert.equal(poPierwszejMigracji.some((uzytkownik) => uzytkownik.id === 'opiekun-anna-nowak' || uzytkownik.id === 'opiekun-piotr-zielinski'), false)
  const zapisPoPierwszejMigracji = magazyn.get(kluczMagazynuUzytkownikow)

  const poDrugiejMigracji = zainicjalizujMagazynUzytkownikow()
  assert.deepEqual(poDrugiejMigracji, poPierwszejMigracji)
  assert.equal(magazyn.get(kluczMagazynuUzytkownikow), zapisPoPierwszejMigracji)
  assert.equal(new Set(poDrugiejMigracji.map((uzytkownik) => uzytkownik.id)).size, poDrugiejMigracji.length)
  assert.equal(poDrugiejMigracji.find((uzytkownik) => uzytkownik.id === 'Iza')?.wersjaUprawnien, 2)
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
  assert.equal(czyMozeEksportowac(iza), true)
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

test('migracja nadaje rolę Architekt wyłącznie Kacprowi i jest idempotentna', () => {
  wyczyscStan()
  const dane = daneStartoweUzytkownikow.map((uzytkownik) => uzytkownik.id === 'architekt-systemu' ? { ...uzytkownik, rola: 'ARCHITEKT' as const } : uzytkownik.id === 'administrator-kacper-madej' ? { ...uzytkownik, rola: 'ADMINISTRATOR' as const } : uzytkownik)
  const pierwszaMigracja = wykonajMigracjeRoliArchitekta(dane)
  assert.equal(pierwszaMigracja.uzytkownicy.filter((uzytkownik) => uzytkownik.rola === 'ARCHITEKT').length, 1)
  assert.equal(pierwszaMigracja.uzytkownicy.find((uzytkownik) => uzytkownik.rola === 'ARCHITEKT')?.id, 'administrator-kacper-madej')
  assert.equal(pierwszaMigracja.uzytkownicy.find((uzytkownik) => uzytkownik.id === 'architekt-systemu')?.rola, 'ADMINISTRATOR')
  assert.equal(wykonajMigracjeRoliArchitekta(pierwszaMigracja.uzytkownicy).czyZmieniono, false)
})

test('Administrator nie edytuje Architekta, a Architekt może edytować Administratora', () => {
  wyczyscStan()
  const uzytkownicy = zainicjalizujMagazynUzytkownikow()
  const architekt = uzytkownicy.find((uzytkownik) => uzytkownik.id === 'administrator-kacper-madej')!
  const administrator = uzytkownicy.find((uzytkownik) => uzytkownik.id === 'architekt-systemu')!
  assert.ok(zaktualizujUzytkownikaPrzezAdministratora(administrator, architekt.id, { pseudonim: 'Niedozwolone' }).blad)
  assert.equal(zaktualizujUzytkownikaPrzezArchitekta(architekt, administrator.id, { pseudonim: 'Dozwolone' }).uzytkownik?.pseudonim, 'Dozwolone')
  assert.ok(zaktualizujUzytkownikaPrzezArchitekta(architekt, architekt.id, { status: 'ZABLOKOWANY' }).blad)
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
  const naglowek = readFileSync(new URL('../src/aplikacja/layout/NaglowekAplikacji.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(menu, /menu-boczne__profil/)
  assert.doesNotMatch(menu, /AvatarUzytkownika/)
  assert.match(naglowek, /Wyloguj/)
  assert.match(naglowek, /AvatarUzytkownika/)
  assert.match(odznaka, /aria-label/)
})

test('administrator tworzy konto w centralnym magazynie, a odznaka Wysyłacz działa po utworzeniu', () => {
  wyczyscStan()
  const uzytkownicy = zainicjalizujMagazynUzytkownikow()
  const administrator = uzytkownicy.find((uzytkownik) => uzytkownik.id === 'architekt-systemu')!
  const pracownik = uzytkownicy.find((uzytkownik) => uzytkownik.id === 'Iza')!
  const dane = { zwrot: 'Pani', tytulNaukowy: '', imie: 'Nowa', nazwisko: 'Osoba', pseudonim: 'Nowa', emaile: ['nowa.osoba@pomagier.local'], telefony: [{ prefiks: '+48', numer: '512 345 678', krajIso2: 'PL', numerE164: '+48512345678' }], login: 'nowa.osoba', rola: 'PRACOWNIK', organizacja: 'SEMPER', odznaki: ['WYSYLACZ'], status: 'AKTYWNY', kolorProfilu: '#38761d', aliasyHistoryczne: [], wymagaZmianyHasla: false } as Parameters<typeof utworzUzytkownikaPrzezAdministratora>[1]
  assert.ok(utworzUzytkownikaPrzezAdministratora(pracownik, dane).blad)
  const wynik = utworzUzytkownikaPrzezAdministratora(administrator, dane)
  assert.equal(wynik.uzytkownik?.email, 'nowa.osoba@pomagier.local')
  assert.equal(czyMozeWysylac(wynik.uzytkownik), true)
  assert.equal(pobierzUzytkownika('nowa.osoba')?.id, wynik.uzytkownik?.id)
  assert.ok(utworzUzytkownikaPrzezAdministratora(administrator, { ...dane, rola: 'ARCHITEKT' }).blad)
})

test('widok użytkowników komunikuje lokalny tryb bez pola hasła', () => {
  const widok = readFileSync(new URL('../src/kartoteki/uzytkownicy/WidokUzytkownikow.tsx', import.meta.url), 'utf8')
  assert.match(widok, /Utwórz konto/)
  assert.doesNotMatch(widok, /type="password"/)
})
