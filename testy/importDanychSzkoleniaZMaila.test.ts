import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { analizujDaneSzkoleniaZMaila, sprawdzWartosciImportuSzkolenia } from '../src/wspolne/parsery/importDanychSzkoleniaZMaila.ts'
import { przygotujCofniecieImportu, przygotujZmianyDyplomuZMaila } from '../src/moduly/dokumenty/generatory/dyplomy/importMailaDoDyplomu.ts'

const mailNbp = readFileSync(new URL('./fixtures/mailSzkolenieNbp.txt', import.meta.url), 'utf8')

test('NBP: role osób i adresów, sprzeczne daty, limit, wniosek o trybie i harmonogram', () => {
  const wynik = analizujDaneSzkoleniaZMaila(mailNbp)
  const pole = (nazwa: string) => wynik.pola.find((pole) => pole.pole === nazwa)!
  assert.equal(wynik.blokada, undefined)
  assert.equal(pole('tytulSzkolenia').warianty[0].wartosc, 'Równoważny czas pracy')
  assert.equal(pole('dataOd').warianty[0].wartosc, '2026-11-05')
  assert.equal(pole('dataDo').konflikt, true)
  assert.deepEqual(new Set(pole('dataDo').warianty.map((wariant) => wariant.wartosc)), new Set(['2026-11-07', '2026-11-06']))
  assert.equal(pole('trener').warianty[0].wartosc, 'Maria Sobieska')
  assert.equal(pole('miejsce').warianty[0].wartosc, 'Ośrodek Szkoleniowy NBP w Starejwsi, ul. Węgrowska 26, 07-100 Węgrów')
  assert.equal(pole('formaSzkolenia').warianty[0].wartosc, 'Stacjonarne')
  assert.equal(pole('formaSzkolenia').status, 'niepewne')
  assert.equal(pole('liczbaGodzin').warianty[0].wartosc, '9')
  assert.equal(pole('rodzajGodzin').warianty[0].wartosc, 'Zegarowe (60 min)')
  assert.equal(pole('nazwaKlienta').warianty[0].wartosc, 'Narodowy Bank Polski')
  assert.equal(pole('limitUczestnikow').warianty[0].wartosc, '30')
  assert.match(pole('programSzkolenia').warianty[0].wartosc, /1\. Organizacja/)
  assert.match(wynik.ostrzezenia.join(' '), /Harmonogram obejmuje 10.*deklaracja to 9/)
  for (const dane of wynik.pola) for (const wariant of dane.warianty) assert.ok(wariant.fragment.length > 0)
})

for (const [nazwa, tekst] of [
  ['Outlook HTML', mailNbp.split('\n').map((wiersz) => `<div>${wiersz.replaceAll(' ', '&nbsp;')}</div>`).join('')],
  ['Markdown', mailNbp.replace(/^(Tytuł szkolenia|Trener prowadzący|Liczba godzin):/gm, '**$1:**')],
  ['nieregularne odstępy', mailNbp.replaceAll(' ', '\u00a0  ').replaceAll('\n', '\r\n')],
  ['podzielona etykieta', mailNbp.replace('Trener prowadzący:', 'Trener\nprowadzący:')],
]) test(`NBP: normalizacja ${nazwa}`, () => {
  const wynik = analizujDaneSzkoleniaZMaila(tekst)
  assert.equal(wynik.pola.find((pole) => pole.pole === 'trener')?.warianty[0].wartosc, 'Maria Sobieska')
  assert.equal(wynik.pola.find((pole) => pole.pole === 'liczbaGodzin')?.warianty[0].wartosc, '9')
})

test('rozpoznaje zdania, słowny termin i jawny tryb bez używania nadawcy', () => {
  const wynik = analizujDaneSzkoleniaZMaila('Od: Adam Kowalski <adam@example.org>\nSzkolenie „Bezpieczna praca” odbędzie się online w dniach 5–6 listopada 2026.\nSzkolenie poprowadzi Maria Sobieska.\nSzkolenie potrwa 9 godzin zegarowych.')
  const wartosc = (nazwa: string) => wynik.pola.find((pole) => pole.pole === nazwa)?.warianty[0]?.wartosc
  assert.equal(wartosc('tytulSzkolenia'), 'Bezpieczna praca')
  assert.equal(wartosc('dataOd'), '2026-11-05')
  assert.equal(wartosc('dataDo'), '2026-11-06')
  assert.equal(wartosc('trener'), 'Maria Sobieska')
  assert.equal(wartosc('formaSzkolenia'), 'Online')
  assert.equal(wartosc('liczbaGodzin'), '9')
})

test('konflikty trenerów i godzin zachowują wszystkie warianty', () => {
  const wynik = analizujDaneSzkoleniaZMaila('Ekspert: Maria Sobieska\nWykładowca: Anna Nowak\nLiczba godzin: 8 dydaktycznych\nCzas trwania: 9 zegarowych')
  for (const nazwa of ['trener', 'liczbaGodzin', 'rodzajGodzin']) {
    const pole = wynik.pola.find((pole) => pole.pole === nazwa)!
    assert.equal(pole.konflikt, true)
    assert.equal(pole.warianty.length, 2)
  }
})

for (const [nazwa, tekst] of [
  ['HTML', '<table><tr><td>Tytuł szkolenia</td><td>Bezpieczna praca</td></tr><tr><td>Termin realizacji</td><td>5–6.11.2026</td></tr><tr><td>Ekspert</td><td>Maria Sobieska</td></tr></table>'],
  ['Markdown', '| Tytuł szkolenia | Bezpieczna praca |\n| Termin realizacji | 5–6.11.2026 |\n| Ekspert | Maria Sobieska |'],
  ['Outlook/Gmail', 'Tytuł szkolenia\tBezpieczna praca\nTermin realizacji\t5–6.11.2026\nEkspert\tMaria Sobieska'],
]) test(`tabela ${nazwa} bez dwukropków`, () => {
  const wynik = analizujDaneSzkoleniaZMaila(tekst)
  assert.equal(wynik.pola.find((pole) => pole.pole === 'tytulSzkolenia')?.warianty[0].wartosc, 'Bezpieczna praca')
  assert.equal(wynik.pola.find((pole) => pole.pole === 'dataDo')?.warianty[0].wartosc, '2026-11-06')
  assert.equal(wynik.pola.find((pole) => pole.pole === 'trener')?.warianty[0].wartosc, 'Maria Sobieska')
})

test('nie wnioskuje online z materiałów ani trenera z kontaktu i stopki', () => {
  const wynik = analizujDaneSzkoleniaZMaila('Materiały szkoleniowe: online\nKontakt: Katarzyna Rohde-Buraczek\nAdres do wysyłki: ul. Pocztowa 1, Warszawa\nPozdrawiam\nTrener: Osoba Ze Stopki')
  for (const nazwa of ['formaSzkolenia', 'trener', 'miejsce']) assert.equal(wynik.pola.find((pole) => pole.pole === nazwa)?.status, 'brak')
})

test('pusta wiadomość, brak danych, błędne daty, wiele szkoleń i tryb hybrydowy', () => {
  assert.throws(() => analizujDaneSzkoleniaZMaila('  '), /Wklej treść/)
  assert.ok(analizujDaneSzkoleniaZMaila('Dzień dobry').pola.every((pole) => pole.status === 'brak'))
  assert.match(analizujDaneSzkoleniaZMaila('Termin: 31.02.2026').ostrzezenia.join(' '), /nieprawidłowy termin/)
  assert.match(analizujDaneSzkoleniaZMaila('Tytuł szkolenia: A\nTytuł szkolenia: B').blokada ?? '', /kilka szkoleń/)
  assert.equal(analizujDaneSzkoleniaZMaila('Tryb: Hybrydowo').pola.find((pole) => pole.pole === 'formaSzkolenia')?.warianty[0].wartosc, 'Hybrydowe')
  assert.throws(() => przygotujZmianyDyplomuZMaila({ formaSzkolenia: 'Hybrydowe' }), /nie obsługuje/)
})

test('adapter uzupełnia tylko obsługiwane pola i cofa import z zachowaniem pozostałych ustawień', () => {
  const przed = { tytulSzkolenia: 'Poprzedni tytuł', wybraneDaty: ['2026-10-01'], liczbaGodzin: '2', rodzajGodzin: 'dydaktycznych', trener: 'Jan Nowak', miejsceSzkolenia: 'Warszawa', trybSzkolenia: 'online', miesiacKalendarza: '2026-10', uczestnicy: [{ id: 'stale-id', imieNazwisko: 'Anna Nowak' }], logo: 'logo', podpis: true, szablon: 'IIST_BLUE_PASY' }
  const zmiany = przygotujZmianyDyplomuZMaila({ tytulSzkolenia: 'Równoważny czas pracy', dataOd: '2026-11-05', dataDo: '2026-11-06', trener: 'Maria Sobieska', formaSzkolenia: 'Stacjonarne', miejsce: 'Starewieś', liczbaGodzin: '9', rodzajGodzin: 'Zegarowe (60 min)', limitUczestnikow: '30', nazwaKlienta: 'NBP', programSzkolenia: 'Program' })
  const cofniecie = przygotujCofniecieImportu(przed, zmiany)
  const po = { ...przed, ...zmiany }
  assert.deepEqual(po.wybraneDaty, ['2026-11-05', '2026-11-06'])
  assert.equal(po.rodzajGodzin, 'zegarowych')
  assert.equal(po.trybSzkolenia, 'stacjonarne')
  assert.equal(po.tytulSzkolenia, 'Równoważny czas pracy')
  assert.equal(po.uczestnicy, przed.uczestnicy)
  assert.equal(po.logo, przed.logo)
  assert.equal(po.podpis, przed.podpis)
  assert.equal(po.szablon, przed.szablon)
  assert.deepEqual({ ...po, ...cofniecie }, przed)
  assert.deepEqual({ ...po, podpis: false, ...cofniecie }, { ...przed, podpis: false })
  assert.equal(sprawdzWartosciImportuSzkolenia({ dataOd: '2026-11-06', dataDo: '2026-11-05' })?.includes('rosnący'), true)
  assert.ok(sprawdzWartosciImportuSzkolenia({ dataOd: '2026-11-05' }))
  assert.ok(sprawdzWartosciImportuSzkolenia({ liczbaGodzin: '-1' }))
  assert.deepEqual(przygotujZmianyDyplomuZMaila({ trener: 'Maria Sobieska' }), { trener: 'Maria Sobieska' })
})
