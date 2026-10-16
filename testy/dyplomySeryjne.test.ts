import assert from 'node:assert/strict'
import { czyUczestnikDoDruku, dodajPusteDyplomy, ograniczPrzesuniecieLogotypu, parsujListeUczestnikow, polaczUczestnikowPoNazwie, sprawdzDaneDyplomu, zbudujDaneSeryjnychDyplomow } from '../src/moduly/dokumenty/generatory/dyplomy/modelSeryjnychDyplomow.ts'
import { zbudujNazweEksportowanegoDokumentu } from '../src/wspolne/dokumenty/nazwyDokumentow.ts'
import type { KontekstDokumentuSzkolenia } from '../src/wspolne/integracje/szczegolyDoDokumentow/index.ts'
import { importujPlikDyplomu, parsujTekstDyplomu } from '../src/moduly/dokumenty/generatory/dyplomy/importDyplomu.ts'

const kontekst: KontekstDokumentuSzkolenia = {
  zrodlo: { szczegolyOrganizacyjneId: 'szczegoly-1', wersjaSzczegolowId: null, zmodyfikowano: '2026-09-04', odciskDanych: 'test' },
  szkolenie: { id: 'szkolenie-1', tytul: 'Prawo zamówień', typ: null, tryb: null, liczbaGodzin: 16 },
  organizator: { id: 'iist', nazwa: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST', marka: 'IIST', logoId: null, logoNazwaPliku: null, logoPodglad: null },
  klient: { id: 'klient-1', nazwa: 'Klient', nip: null, adres: null, osobaKontaktowa: null },
  trenerzy: [{ id: 'trener-0', imieINazwisko: 'Trener domyślny' }],
  grupy: [{ id: 'grupa-1', nazwa: 'Grupa A', daty: ['2026-10-01', '2026-10-02'], tryb: 'Stacjonarne', liczbaGodzin: 16, lokalizacje: [{ data: '2026-10-01', lokalizacjaId: null, nazwa: 'Hotel', adres: 'Poznań', sala: 'Sala A', trybOnline: false }], trenerzy: [{ id: 'trener-1', imieINazwisko: 'Jan Nowak' }], uczestnicy: [{ id: 'u1', imie: 'Anna', nazwisko: 'Kowalska', nazwaPelna: 'Anna Kowalska', email: null, stanowisko: null }, { id: 'u2', imie: 'Piotr', nazwisko: 'Nowak', nazwaPelna: 'Piotr Nowak', email: null, stanowisko: null }], liczbaUczestnikow: 2, wysylkaMaterialow: { wymagana: null, odbiorca: null, adres: null, uwagi: null } }],
  uwagi: null,
}

const dane = zbudujDaneSeryjnychDyplomow(kontekst, 'grupa-1')
assert.ok(dane)
assert.equal(dane.organizator, 'IIST')
assert.equal(dane.tytulSzkolenia, 'Prawo zamówień')
assert.equal(dane.miejsceSzkolenia, 'Hotel, Sala A, Poznań')
assert.equal(dane.trener, 'Jan Nowak')
assert.deepEqual(dane.daty, ['2026-10-01', '2026-10-02'])
assert.deepEqual(dane.uczestnicy, ['Anna Kowalska', 'Piotr Nowak'])
assert.equal(zbudujDaneSeryjnychDyplomow(kontekst, 'brak'), null)
const wspolneDaneNazwy = { typDokumentu: 'DYPLOM' as const, organizator: dane.organizator, terminy: dane.daty, tytulSzkolenia: dane.tytulSzkolenia, grupa: 'Grupa A' }
assert.equal(zbudujNazweEksportowanegoDokumentu({ ...wspolneDaneNazwy, uczestnik: dane.uczestnicy[0] }), 'IIST_2026.10.01-02_Prawo_zamowien_Grupa_A_Anna_Kowalska_Dyplom.pdf')
assert.equal(zbudujNazweEksportowanegoDokumentu(wspolneDaneNazwy), 'IIST_2026.10.01-02_Prawo_zamowien_Grupa_A_Dyplom.pdf')

console.log('OK: wspólny szablon dyplomu otrzymuje seryjne dane uczestników')

const uczestnicyIndywidualni = [
  { id: 'a', imieNazwisko: 'Anna Kowalska', numerRejestru: 'A/1', dodatek: 'logo-a', drugaStrona: false },
  { id: 'p', imieNazwisko: 'Piotr Nowak', numerRejestru: 'P/2', dodatek: 'logo-p', drugaStrona: true },
]
const utworz = (nazwa: string, indeks: number) => ({ id: `nowy-${indeks}`, imieNazwisko: nazwa, numerRejestru: '', dodatek: '', drugaStrona: true })
const poZmianieKolejnosci = polaczUczestnikowPoNazwie(parsujListeUczestnikow('Piotr Nowak\nAnna Kowalska\nAnna Kowalska'), uczestnicyIndywidualni, utworz)
assert.deepEqual(poZmianieKolejnosci, [uczestnicyIndywidualni[1], uczestnicyIndywidualni[0]])
assert.deepEqual(parsujListeUczestnikow('Anna Kowalska\n Anna Kowalska ; firma\r\nPiotr Nowak\n'), ['Anna Kowalska', 'Piotr Nowak'])
assert.deepEqual(polaczUczestnikowPoNazwie([], uczestnicyIndywidualni, utworz), [])
assert.deepEqual(polaczUczestnikowPoNazwie(['Anna Kowalska'], uczestnicyIndywidualni, utworz), [uczestnicyIndywidualni[0]])
const kompletne = { uczestnicy: uczestnicyIndywidualni, tytulSzkolenia: 'Zażółć gęślą jaźń', wybraneDaty: ['2026-10-01'], liczbaGodzin: '8', trener: 'Trener', trybSzkolenia: 'online' as const, miejsceSzkolenia: '' }
assert.deepEqual(sprawdzDaneDyplomu(kompletne), [])
const zPustymi = dodajPusteDyplomy(uczestnicyIndywidualni, 12, (nazwa, indeks) => ({ ...utworz(nazwa, indeks), numerRejestru: `A/${indeks + 1}` }))
assert.equal(zPustymi.length, 14)
assert.equal(new Set(zPustymi.map((uczestnik) => uczestnik.id)).size, 14)
assert.deepEqual(zPustymi.slice(0, 2), uczestnicyIndywidualni)
assert.equal(zPustymi[2].numerRejestru, 'A/3')
assert.equal(zPustymi[13].numerRejestru, 'A/14')
assert.ok(zPustymi.slice(2).every((uczestnik) => uczestnik.imieNazwisko === '' && uczestnik.czyPustyDyplom))
assert.equal(zPustymi.filter(czyUczestnikDoDruku).length, 14)
assert.deepEqual(sprawdzDaneDyplomu({ ...kompletne, uczestnicy: zPustymi.slice(2) }), [])
assert.ok(sprawdzDaneDyplomu({ ...kompletne, uczestnicy: [{ ...zPustymi[2], numerRejestru: '' }] }).includes('uzupełnij numer rejestru dla 1 uczestnika'))
assert.equal(czyUczestnikDoDruku({ imieNazwisko: '' }), false)
assert.deepEqual(polaczUczestnikowPoNazwie(['Anna Kowalska'], zPustymi, utworz), [zPustymi[0], ...zPustymi.slice(2)])
assert.deepEqual(polaczUczestnikowPoNazwie([], zPustymi, utworz), zPustymi.slice(2))
assert.deepEqual(JSON.parse(JSON.stringify(zPustymi)), zPustymi)
assert.equal(dodajPusteDyplomy([], 120, utworz).length, 120)
for (const liczba of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => dodajPusteDyplomy([], liczba, utworz), /całkowitą/)
assert.equal(ograniczPrzesuniecieLogotypu(undefined), 0)
assert.equal(ograniczPrzesuniecieLogotypu(null), 0)
assert.equal(ograniczPrzesuniecieLogotypu(NaN), 0)
assert.equal(ograniczPrzesuniecieLogotypu(-10), -5)
assert.equal(ograniczPrzesuniecieLogotypu(20), 15)
assert.equal(ograniczPrzesuniecieLogotypu(2.34), 2.3)
assert.ok(sprawdzDaneDyplomu({ ...kompletne, uczestnicy: [] }).includes('dodaj co najmniej jednego uczestnika'))
assert.ok(sprawdzDaneDyplomu({ ...kompletne, liczbaGodzin: 'abc' }).includes('uzupełnij liczbę godzin'))
assert.ok(sprawdzDaneDyplomu({ ...kompletne, uczestnicy: [{ ...uczestnicyIndywidualni[0], numerRejestru: '' }] }).includes('uzupełnij numer rejestru dla 1 uczestnika'))
for (const typDokumentu of ['CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM'] as const) {
  assert.notEqual(zbudujNazweEksportowanegoDokumentu({ ...wspolneDaneNazwy, typDokumentu, uczestnik: 'Anna Kowalska' }), zbudujNazweEksportowanegoDokumentu({ ...wspolneDaneNazwy, typDokumentu, uczestnik: 'Piotr Nowak' }))
}

const imiennicy = [{ ...uczestnicyIndywidualni[0] }, { ...uczestnicyIndywidualni[0], id: 'inna-anna', numerRejestru: 'A/2' }]
assert.deepEqual(polaczUczestnikowPoNazwie(['Anna Kowalska', 'Anna Kowalska'], imiennicy, utworz), imiennicy)
assert.equal(new Set(polaczUczestnikowPoNazwie(['Anna Kowalska', 'Anna Kowalska'], imiennicy, utworz).map((uczestnik) => uczestnik.id)).size, 2)
assert.deepEqual(zbudujDaneSeryjnychDyplomow({ ...kontekst, grupy: [{ ...kontekst.grupy[0], uczestnicy: [kontekst.grupy[0].uczestnicy[0], kontekst.grupy[0].uczestnicy[0]] }] }, 'grupa-1')?.uczestnicy, ['Anna Kowalska'])

const tekstDyplomu = `Centrum Organizacji Szkoleń i Konferencji SEMPER
Ekspert merytoryczny: Grzegorz Kryjom
Serdecznie gratulujemy i życzymy dalszych sukcesów!
Nr z rejestru: 88754867/114293/2026 Borowa, 13-10-2026
Niniejszym zaświadcza się, że
Pan/Pani Anna Balon
ukończył/a szkolenie:
"Cyfrowe i zrównoważone zarządzanie dostawcami oraz
jakością dostaw w związku z planowanym wdrożeniem
oprogramowania do automatyzacji procesów zakupowych"
zrealizowane w terminie: od 12-10-2026 do 13-10-2026
w wymiarze 16 h zegarowych.
Miejsce szkolenia: Borowa.`
const wynikImportu = parsujTekstDyplomu(tekstDyplomu)
assert.deepEqual(wynikImportu.pola, {
  imieNazwisko: 'Anna Balon', numerRejestru: '88754867/114293/2026',
  tytulSzkolenia: 'Cyfrowe i zrównoważone zarządzanie dostawcami oraz jakością dostaw w związku z planowanym wdrożeniem oprogramowania do automatyzacji procesów zakupowych',
  wybraneDaty: ['2026-10-12', '2026-10-13'], liczbaGodzin: '16', rodzajGodzin: 'zegarowych',
  miejsceSzkolenia: 'Borowa', trybSzkolenia: 'stacjonarne', trener: 'Grzegorz Kryjom', motywKoloru: 'semper',
})
assert.ok(wynikImportu.ostrzezenia[0].includes('Typ dokumentu'))
assert.equal(parsujTekstDyplomu(`CERTYFIKAT ${tekstDyplomu}`).pola.trybTytulu, 'certyfikat')
assert.equal(parsujTekstDyplomu(tekstDyplomu.replace('Borowa.', 'Szkolenie online.')).pola.trybSzkolenia, 'online')
assert.equal(parsujTekstDyplomu(tekstDyplomu.replace('12-10-2026 do 13-10-2026', '31-02-2026 do 13-10-2026')).pola.wybraneDaty, undefined)
assert.deepEqual(parsujTekstDyplomu(tekstDyplomu.replace('12-10-2026 do 13-10-2026', '12-10-2026 do 14-10-2026')).pola.wybraneDaty, ['2026-10-12', '2026-10-13', '2026-10-14'])
assert.deepEqual(parsujTekstDyplomu(tekstDyplomu.replace('od 12-10-2026 do 13-10-2026', '12.10.2026 i 14.10.2026')).pola.wybraneDaty, ['2026-10-12', '2026-10-14'])
assert.throws(() => parsujTekstDyplomu('Nierozpoznany dokument'), /Nie rozpoznano/)
assert.throws(() => parsujTekstDyplomu(`${tekstDyplomu}\n${tekstDyplomu}`), /kilka dyplomów/)
assert.deepEqual((await importujPlikDyplomu(new File([tekstDyplomu], 'dyplom.txt'))).pola, wynikImportu.pola)
await assert.rejects(() => importujPlikDyplomu(new File([''], 'dyplom.png')), /PDF albo TXT/)
console.log('OK: import dyplomu rozpoznaje dane, zakres dat i braki bez zgadywania')
