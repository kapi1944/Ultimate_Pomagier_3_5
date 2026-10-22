import { rozpocznijSesje } from '../src/aplikacja/logowanie/sesjaUzytkownika.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import { daneStartoweUzytkownikow, mapujUzytkownikaNaFormularz } from '../src/kartoteki/uzytkownicy/daneUzytkownikow.ts'
import { kluczMagazynuUzytkownikow, kluczKopiiMigracjiUzytkownikow, pobierzUzytkownikow, pobierzHistorieKont, zatwierdzZmianyKont, eksportujKopieKont, przywrocKopieKont } from '../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts'
const pamiec = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => pamiec.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => { pamiec.set(klucz, wartosc) }, removeItem: (klucz: string) => { pamiec.delete(klucz) }, clear: () => pamiec.clear(), key: () => null, length: 0 } as Storage
function odnow() { pamiec.clear(); pobierzUzytkownikow(); rozpocznijSesje('administrator-kacper-madej'); return pobierzUzytkownikow() }

test('migracja zachowuje 17 ID, ręczne dane, historię i jest idempotentna', () => {
  const konta = odnow()
  konta[1] = { ...konta[1], login: 'reczny.login', statusUwierzytelniania: undefined, telefony: [], pseudonim: 'Ręcznie' }
  const zapis = JSON.stringify(konta)
  pamiec.set(kluczMagazynuUzytkownikow, zapis)
  const po = pobierzUzytkownikow()
  assert.deepEqual(po.map((konto) => konto.id), daneStartoweUzytkownikow.map((konto) => konto.id))
  assert.equal(po[1].login, 'reczny.login')
  assert.equal(po[1].pseudonim, 'Ręcznie')
  assert.deepEqual(po[1].telefony, [])
  assert.equal(pamiec.get(kluczKopiiMigracjiUzytkownikow), zapis)
  const poPierwszym = pamiec.get(kluczMagazynuUzytkownikow)
  pobierzUzytkownikow()
  assert.equal(pamiec.get(kluczMagazynuUzytkownikow), poPierwszym)
  assert.equal(pobierzHistorieKont().length, 17)
  assert.deepEqual(pobierzHistorieKont().find((wpis) => wpis.uzytkownikId === konta[1].id)?.pola, ['statusUwierzytelniania'])
  assert.ok(pobierzHistorieKont().filter((wpis) => wpis.uzytkownikId !== konta[1].id).every((wpis) => wpis.pola.length === 0))
})
test('uszkodzony magazyn pozostaje nietknięty', () => {
  pamiec.set(kluczMagazynuUzytkownikow, '{błąd')
  assert.throws(pobierzUzytkownikow)
  assert.equal(pamiec.get(kluczMagazynuUzytkownikow), '{błąd')
})
test('operacja zbiorcza jest atomowa, sprawdza rolę, status, wersję i chroni Architekta', () => {
  const konta = odnow(), architekt = konta[1], administrator = konta[0], pracownik = konta[8]
  const stan = JSON.stringify(konta)
  assert.ok(zatwierdzZmianyKont(pracownik, [{ id: konta[2].id, dane: { rola: 'ADMINISTRATOR' } }], stan).blad)
  assert.ok(zatwierdzZmianyKont({ ...pracownik, rola: 'ARCHITEKT' }, [], stan).blad)
  assert.ok(zatwierdzZmianyKont(administrator, [{ id: architekt.id, dane: { pseudonim: 'X' } }], stan).blad)
  assert.ok(zatwierdzZmianyKont(architekt, [{ id: konta[2].id, dane: { pseudonim: 'Nowy' } }, { id: architekt.id, dane: { status: 'ZABLOKOWANY' } }], stan).blad)
  assert.equal(JSON.stringify(pobierzUzytkownikow()), stan)
  assert.ok(zatwierdzZmianyKont(architekt, [], 'stary').blad)
  assert.equal(zatwierdzZmianyKont(architekt, [{ id: administrator.id, dane: { pseudonim: 'Zmieniony' } }], stan).liczba, 1)
  assert.equal(pobierzHistorieKont().length, 2)
})
test('zmiana loginu zachowuje alias, kopia przywraca stan i zachowuje historię', () => {
  const konta = odnow(), architekt = konta[1]
  const kopia = eksportujKopieKont()
  assert.equal(zatwierdzZmianyKont(architekt, [{ id: konta[8].id, dane: { login: 'nowy.login' } }], JSON.stringify(konta)).liczba, 1)
  assert.ok(pobierzUzytkownikow()[8].aliasyHistoryczne.includes(konta[8].login))
  assert.equal(przywrocKopieKont(architekt, kopia, JSON.stringify(pobierzUzytkownikow())).liczba, 17)
  assert.equal(pobierzUzytkownikow()[8].login, konta[8].login)
  assert.equal(pobierzHistorieKont().length, 19)
  assert.equal(mapujUzytkownikaNaFormularz(konta[8]).login, konta[8].login)
})
import { DOMParser } from '@xmldom/xmldom'
import JSZip from 'jszip'
import { eksportujCsvKont, eksportujXlsxKont, odczytajCsvKont, odczytajXlsxKont, porownajImportKont, rozpoznajKolumnyKont } from '../src/kartoteki/uzytkownicy/importEksportUzytkownikow.ts'
import { walidujKonto, walidujUnikalnosc } from '../src/kartoteki/uzytkownicy/walidacjaUzytkownikow.ts'
import { czyMozeZarzadzacUzytkownikami, czyMozeEksportowac } from '../src/kartoteki/uzytkownicy/uprawnienia.ts'
import { ustawPodgladUzytkownika } from '../src/kartoteki/uzytkownicy/stanPodgladuUzytkownika.ts'
import { zarejestrujPodgladKonta } from '../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts'
Object.defineProperty(globalThis, 'DOMParser', { value: DOMParser })
function porownajCsv(tekst: string, konta = pobierzUzytkownikow(), dopasowania = {}) {
  const tabela = odczytajCsvKont(tekst)
  return porownajImportKont(tabela, rozpoznajKolumnyKont(tabela.naglowki), konta, dopasowania)
}
function zatwierdzWiersze(wiersze: ReturnType<typeof porownajCsv>) {
  const konta = pobierzUzytkownikow()
  return zatwierdzZmianyKont(konta[1], wiersze.filter((wiersz) => ['NOWE KONTO', 'AKTUALIZACJA'].includes(wiersz.status)).map((wiersz) => ({ id: wiersz.id, nowe: wiersz.nowe, dane: Object.fromEntries(wiersz.roznice.map((roznica) => [roznica.pole, roznica.po])) })), JSON.stringify(konta))
}
test('CSV UTF-8, polskie znaki, cytowanie, nieznane kolumny i ręczne mapowanie', () => {
  odnow()
  const tabela = odczytajCsvKont('\uFEFFLogin;Nazwisko;Nieznane\r\ni.czugala;"Nowa;Czugała";"a""b"\r\n')
  assert.deepEqual(rozpoznajKolumnyKont(tabela.naglowki), ['login', 'nazwisko', ''])
  assert.equal(tabela.wiersze[0][1], 'Nowa;Czugała')
  assert.equal(porownajImportKont(tabela, ['login', 'nazwisko', ''], pobierzUzytkownikow())[0].status, 'AKTUALIZACJA')
  assert.throws(() => odczytajCsvKont('Login;Nazwisko\nx;"otwarte'))
  assert.throws(() => porownajImportKont(tabela, ['login', 'login', ''], pobierzUzytkownikow()))
})
test('XLSX zachowuje dane, filtry, zamrożenie, daty i tekst telefonów; formuły są odrzucane', async () => {
  const konta = odnow()
  const plik = await eksportujXlsxKont(konta)
  const tabela = await odczytajXlsxKont(plik)
  const wyniki = porownajImportKont(tabela, rozpoznajKolumnyKont(tabela.naglowki), konta)
  assert.deepEqual(wyniki.map((wiersz) => wiersz.status), Array(17).fill('BEZ ZMIAN'))
  const archiwum = await JSZip.loadAsync(plik)
  const arkusz = await archiwum.file('xl/worksheets/sheet1.xml')!.async('string')
  assert.match(arkusz, /state="frozen"/)
  assert.match(arkusz, /autoFilter/)
  assert.match(arkusz, /t="d" s="1"/)
  assert.ok(archiwum.file('xl/worksheets/sheet2.xml'))
  assert.match(arkusz, /t="inlineStr"><is><t xml:space="preserve">\+48792059669/)
  archiwum.file('xl/worksheets/sheet1.xml', arkusz.replace('<v>', '<f>1+1</f><v>'))
  await assert.rejects(() => archiwum.generateAsync({ type: 'arraybuffer' }).then(odczytajXlsxKont), /formuły/)
})
test('powtórzony import CSV i anulowanie nie zapisują danych ani historii', () => {
  const konta = odnow(), zapis = pamiec.get(kluczMagazynuUzytkownikow)
  const wyniki = porownajCsv(eksportujCsvKont(konta))
  assert.ok(wyniki.every((wiersz) => wiersz.status === 'BEZ ZMIAN'))
  assert.equal(pamiec.get(kluczMagazynuUzytkownikow), zapis)
})
test('ID ma pierwszeństwo; zmiana loginu i nazwiska aktualizuje jedno konto i zachowuje stary login', () => {
  odnow()
  const wiersze = porownajCsv('ID;Login;Nazwisko\nadministrator-kacper-madej;k.madej;Madej-Nowy')
  assert.equal(wiersze[0].status, 'AKTUALIZACJA')
  assert.equal(zatwierdzWiersze(wiersze).liczba, 1)
  const konta = pobierzUzytkownikow()
  assert.equal(konta.length, 17)
  assert.equal(konta[1].login, 'k.madej')
  assert.ok(konta[1].aliasyHistoryczne.includes('kacper.madej'))
  assert.equal(porownajCsv('Login;Nazwisko\nkacper.madej;Madej-Nowy')[0].id, konta[1].id)
  assert.equal(porownajCsv('ID;Login;Nazwisko\nadministrator-kacper-madej;k.madej;Madej-Nowy')[0].status, 'BEZ ZMIAN')
})
test('konflikt ID, loginu i e-maila wymaga decyzji, nie scala automatycznie', () => {
  odnow()
  assert.equal(porownajCsv('ID;Login\nIza;k.zaremba')[0].status, 'KONFLIKT')
  assert.equal(porownajCsv('ID;Login\npawel-kwiecinski;p.kwiecinski')[0].status, 'KONFLIKT')
  const potwierdzony = porownajCsv('ID;Login\npawel-kwiecinski;p.kwiecinski', pobierzUzytkownikow(), { 2: 'pracownik-pawel-kwiecinski' })[0]
  assert.equal(potwierdzony.id, 'pracownik-pawel-kwiecinski')
})
test('dwie Izabele pozostają osobnymi kontami; imię i nazwisko są tylko propozycją', () => {
  odnow()
  const wynik = porownajCsv('Imię;Nazwisko;Login;E-mail\nIzabela;Czugała;nowa.izabela;nowa.izabela@example.test')[0]
  assert.equal(wynik.status, 'KONFLIKT')
  assert.ok(wynik.propozycje.includes('Iza'))
  assert.ok(wynik.propozycje.includes('pracownik-izabela-szoc'))
})
test('rola WYSYŁACZ jest interpretowana jako odznaka bez zmiany roli', () => {
  const konta = odnow()
  const wynik = porownajCsv('Login;Rola\np.kwiecinski;WYSYŁACZ')[0]
  assert.equal(wynik.dane.rola, 'PRACOWNIK')
  assert.ok(wynik.dane.odznaki?.includes('WYSYLACZ'))
  assert.match(wynik.bledy.join(' '), /Konflikt semantyczny/)
  assert.equal(pobierzUzytkownikow()[8].rola, konta[8].rola)
})
test('nowe konto, niekompletne dane, nieprawidłowe enumy, e-maile i telefony', () => {
  odnow()
  assert.equal(porownajCsv('Imię;Nazwisko;Login;E-mail;Telefon\nTestowa;Osoba;test.osoba;test.osoba@example.test;+48 512 345 678')[0].status, 'NOWE KONTO')
  assert.equal(porownajCsv('Imię;Login\nTestowa;test.osoba')[0].status, 'BŁĄD')
  assert.equal(porownajCsv('Login;Rola\ni.czugala;SUPERADMIN')[0].status, 'BŁĄD')
  assert.equal(porownajCsv('Login;E-mail\ni.czugala;nie-email')[0].status, 'BŁĄD')
  assert.equal(porownajCsv('Login;Telefon\ni.czugala;123')[0].status, 'BŁĄD')
  assert.equal(porownajCsv('Login;Status\ni.czugala;INNY')[0].status, 'BŁĄD')
})
test('duplikaty w pliku oraz zmiana na zajętą tożsamość są odrzucane', () => {
  odnow()
  assert.ok(porownajCsv('Login;Nazwisko\ni.czugala;A\ni.czugala;B').every((wiersz) => wiersz.status === 'BŁĄD'))
  assert.ok(porownajCsv('Imię;Nazwisko;Login;E-mail\nTest;Nowy;test1;test@example.test\nDrugi;Nowy;test2;test@example.test').every((wiersz) => wiersz.status === 'BŁĄD'))
  assert.equal(walidujUnikalnosc([...daneStartoweUzytkownikow, daneStartoweUzytkownikow[0]]).length > 0, true)
})
test('puste komórki zachowują dane; świadome czyszczenie jest osobną operacją', () => {
  odnow()
  const pusty = porownajCsv('Login;Telefon;E-mail\ni.czugala;;')[0]
  assert.equal(pusty.status, 'BEZ ZMIAN')
  const czyszczenie = porownajCsv('Login;Wyczyść pola\ni.czugala;telefony')[0]
  assert.deepEqual(czyszczenie.dane.telefony, [])
  assert.equal(zatwierdzWiersze([czyszczenie]).liczba, 1)
  assert.deepEqual(pobierzUzytkownikow()[2].telefony, [])
  assert.equal(porownajCsv('Login;Wyczyść pola\ni.czugala;id')[0].status, 'BŁĄD')
})
test('CSV chroni przed formułami i zachowuje telefony w ponownym imporcie', () => {
  const konta = odnow()
  const csv = eksportujCsvKont([{ ...konta[8], pseudonim: '=HYPERLINK("test")' }])
  assert.match(csv, /'=HYPERLINK/)
  assert.match(csv, /'\+48731111391/)
  assert.equal(porownajCsv(csv)[0].dane.pseudonim, '=HYPERLINK("test")')
})
test('błąd zapisu lub kopii nie zapisuje części kont ani historii', () => {
  const konta = odnow(), zapis = pamiec.get(kluczMagazynuUzytkownikow), ustaw = localStorage.setItem
  localStorage.setItem = () => { throw new Error('Brak miejsca') }
  try { assert.ok(zatwierdzZmianyKont(konta[1], [{ id: konta[8].id, dane: { pseudonim: 'Zmiana' } }], JSON.stringify(konta)).blad) } finally { localStorage.setItem = ustaw }
  assert.equal(pamiec.get(kluczMagazynuUzytkownikow), zapis)
})
test('nie eksportuje obcych właściwości, sekretów ani danych zagnieżdżonych w telefonach', () => {
  const konta = odnow()
  const rozszerzone = konta.map((konto) => ({ ...konto, password: 'SEKRET_TESTOWY', token: 'SEKRET_TESTOWY', telefony: konto.telefony.map((telefon) => ({ ...telefon, token: 'SEKRET_TESTOWY' })) }))
  const baza = JSON.parse(pamiec.get(kluczMagazynuUzytkownikow)!)
  pamiec.set(kluczMagazynuUzytkownikow, JSON.stringify({ ...baza, uzytkownicy: rozszerzone }))
  assert.doesNotMatch(eksportujKopieKont(), /SEKRET_TESTOWY|password|token/)
  assert.doesNotMatch(eksportujCsvKont(rozszerzone), /SEKRET_TESTOWY/)
})
test('kontrola ról i statusów nie daje AUDYTOROWI administracji; brak sesji blokuje zapis', () => {
  const konta = odnow()
  assert.equal(czyMozeZarzadzacUzytkownikami(konta[1]), true)
  assert.equal(czyMozeZarzadzacUzytkownikami(konta[0]), true)
  assert.equal(czyMozeZarzadzacUzytkownikami(konta[2]), false)
  assert.equal(czyMozeZarzadzacUzytkownikami(konta[8]), false)
  assert.equal(czyMozeZarzadzacUzytkownikami({ ...konta[1], status: 'ZABLOKOWANY' }), false)
  assert.equal(czyMozeEksportowac(konta[6]), false)
  assert.equal(czyMozeEksportowac(konta[7]), false)
  assert.equal(walidujKonto({ ...konta[8], status: 1 }).length > 0, true)
  assert.ok(walidujKonto({ ...konta[8], statusUwierzytelniania: ['SKONFIGUROWANE'] }).length)
  assert.ok(walidujKonto({ ...konta[8], telefony: [{ prefiks: '+48', numer: '512345678', krajIso2: [] }] }).length)
  pamiec.delete('ultimatePomagier.sesjaUzytkownika.v1')
  assert.ok(zatwierdzZmianyKont(konta[1], [], JSON.stringify(konta)).blad)
})
test('podgląd zachowuje rzeczywistą sesję, blokuje zapis i rejestruje początek oraz koniec', () => {
  const konta = odnow(), sesja = pamiec.get('ultimatePomagier.sesjaUzytkownika.v1')
  assert.equal(zarejestrujPodgladKonta(konta[8].id, 'POCZATEK_PODGLADU').liczba, 1)
  ustawPodgladUzytkownika(konta[8])
  try {
    assert.ok(zatwierdzZmianyKont(konta[1], [{ id: konta[8].id, dane: { pseudonim: 'X' } }], JSON.stringify(konta)).blad)
    assert.ok(przywrocKopieKont(konta[1], eksportujKopieKont(), JSON.stringify(konta)).blad)
  } finally { ustawPodgladUzytkownika(null) }
  assert.equal(zarejestrujPodgladKonta(konta[8].id, 'KONIEC_PODGLADU').liczba, 1)
  assert.equal(pamiec.get('ultimatePomagier.sesjaUzytkownika.v1'), sesja)
  assert.deepEqual(pobierzHistorieKont().map((wpis) => wpis.operacja), ['LOGOWANIE_DEMONSTRACYJNE', 'POCZATEK_PODGLADU', 'KONIEC_PODGLADU'])
})

test('logowanie po restarcie nie nadpisuje kopii sprzed importu', () => {
  const konta = odnow()
  assert.equal(zatwierdzZmianyKont(konta[1], [{ id: konta[8].id, dane: { pseudonim: 'Zmieniony' } }], JSON.stringify(konta)).liczba, 1)
  const kopia = pamiec.get('ultimatePomagier.uzytkownicy.kopiaPrzedZmiana.v2')
  rozpocznijSesje(konta[1].id)
  assert.equal(pamiec.get('ultimatePomagier.uzytkownicy.kopiaPrzedZmiana.v2'), kopia)
  assert.equal(pobierzUzytkownikow()[8].pseudonim, 'Zmieniony')
})
test('metadane kont nie przyjmują podniesionej wersji uprawnień, dat ani konfiguracji haseł z importu', () => {
  const konta = odnow()
  const wynik = porownajCsv('Login;Wersja uprawnień;Konfiguracja uwierzytelniania;Data utworzenia\np.kwiecinski;999;SKONFIGUROWANE;1990-01-01')[0]
  assert.equal(wynik.status, 'BEZ ZMIAN')
  assert.ok(zatwierdzZmianyKont(konta[1], [{ id: konta[8].id, dane: { statusUwierzytelniania: 'SKONFIGUROWANE' } }], JSON.stringify(konta)).blad)
})

import { wykonajMigracjeBazyUzytkownikow, odzyskajUszkodzonaKartoteke } from '../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts'
test('migracja nie interpretuje ponownie ręcznych telefonów, uprawnień, aliasów ani dat', () => {
  const konta = structuredClone(daneStartoweUzytkownikow)
  konta[8].telefony = [{ prefiks: '+48', numer: '731111391', krajIso2: 'DE' }]
  konta[8].wersjaUprawnien = 9
  konta[8].zaktualizowano = '2026-10-21T11:00:00Z'
  konta[8].aliasyHistoryczne = ['stary.pawel']
  konta[8].status = 'NIEAKTYWNY'
  const po = wykonajMigracjeBazyUzytkownikow(konta).uzytkownicy
  assert.deepEqual(po.map(({ statusUwierzytelniania: status, ...konto }) => { void status; return konto }), konta)
})
test('odzyskiwanie uszkodzenia zachowuje oryginał i nie omija autoryzacji poprawnej kartoteki', () => {
  odnow()
  const kopia = eksportujKopieKont(), oryginal = pamiec.get(kluczMagazynuUzytkownikow)!
  pamiec.delete('ultimatePomagier.sesjaUzytkownika.v1')
  assert.ok(odzyskajUszkodzonaKartoteke(kopia, oryginal).blad)
  pamiec.set(kluczMagazynuUzytkownikow, '{uszkodzony')
  assert.equal(odzyskajUszkodzonaKartoteke(kopia, '{uszkodzony').liczba, 17)
  assert.ok([...pamiec].some(([klucz, zapis]) => klucz.startsWith('ultimatePomagier.uzytkownicy.uszkodzona.') && zapis === '{uszkodzony'))
  assert.equal(pobierzUzytkownikow().length, 17)
})

test('cofnięcie importu nowych kont zachowuje ich ID i powiązania, odbierając aktywność', () => {
  const konta = odnow(), kopia = eksportujKopieKont()
  const wiersze = porownajCsv('Imię;Nazwisko;Login;E-mail\nSyntetyczna;Nowa;syntetyczna.nowa;syntetyczna@example.test')
  assert.equal(wiersze[0].status, 'NOWE KONTO')
  assert.equal(zatwierdzWiersze(wiersze).liczba, 1)
  assert.equal(pobierzUzytkownikow().length, 18)
  assert.equal(przywrocKopieKont(konta[1], kopia, JSON.stringify(pobierzUzytkownikow())).liczba, 18)
  const nowe = pobierzUzytkownikow().find((konto) => konto.id === wiersze[0].id)
  assert.equal(nowe?.status, 'NIEAKTYWNY')
  assert.equal(nowe?.login, 'syntetyczna.nowa')
})

test('arkusz przyjmuje polskie etykiety słowników i odznak bez tworzenia nowych ról', () => {
  odnow()
  const wynik = porownajCsv('Login;Rola;Status;Organizacja;Uprawnienia\np.kwiecinski;Pracownik;Aktywny;Semper;Wysyłacz | Audytor')[0]
  assert.equal(wynik.status, 'AKTUALIZACJA')
  assert.deepEqual(wynik.dane.odznaki, ['WYSYLACZ', 'AUDYTOR'])
  assert.equal(wynik.dane.rola, 'PRACOWNIK')
})
