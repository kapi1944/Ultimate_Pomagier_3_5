import assert from 'node:assert/strict'
import { walidujHaslo } from '../src/wspolne/walidacja/walidatoryDanych.ts'
import test from 'node:test'
import { daneStartoweUzytkownikow } from '../src/kartoteki/uzytkownicy/daneUzytkownikow.ts'
import { czyMozeResetowacHaslo, uprawnienieResetowaniaHasla } from '../src/kartoteki/uzytkownicy/uprawnienia.ts'
import { wykonajOperacjeTozsamosci } from '../src/aplikacja/logowanie/klientTozsamosci.ts'
import { czyTrybDemonstracyjny } from '../src/aplikacja/logowanie/uwierzytelnianie.ts'
import { eksportujCsvKont, eksportujXlsxKont } from '../src/kartoteki/uzytkownicy/importEksportUzytkownikow.ts'
import { unzipSync, strFromU8 } from 'fflate'

const architekt = daneStartoweUzytkownikow.find((konto) => konto.rola === 'ARCHITEKT')!
const administrator = daneStartoweUzytkownikow.find((konto) => konto.rola === 'ADMINISTRATOR')!
const pracownik = daneStartoweUzytkownikow.find((konto) => konto.rola === 'PRACOWNIK')!

test('walidacja nowych haseł: długość, spacje, polskie litery i bajty UTF-8', () => {
  for (const [haslo, poprawne] of [
    ['abcdefg', false], ['abcdefgh', true], ['abcdefghij', true],
    ['abcd efgh', false], [' abcdefgh', false], ['abcdefgh ', false],
    ['zażółćgę', true], ['😀'.repeat(7), false], ['😀'.repeat(8), true],
    ['a'.repeat(1024), true], ['a'.repeat(1025), false],
    ['ą'.repeat(512), true], ['ą'.repeat(513), false],
    ['abcd\tefgh', false], ['abcd\nefgh', false],
    ['abcd\u0085efgh', false], ['abcd\ufeffefgh', false],
  ] as const) assert.equal(walidujHaslo(haslo), poprawne)
})

test('widoczność users.password.reset respektuje hierarchię i zakaz resetu własnego konta', () => {
  assert.equal(uprawnienieResetowaniaHasla, 'users.password.reset')
  assert.equal(czyMozeResetowacHaslo(architekt, administrator), true)
  assert.equal(czyMozeResetowacHaslo(administrator, pracownik), true)
  for (const [wykonujacy, cel] of [[architekt, architekt], [administrator, administrator], [administrator, architekt], [pracownik, administrator], [{ ...administrator, status: 'ZABLOKOWANY' as const }, pracownik]]) assert.equal(czyMozeResetowacHaslo(wykonujacy, cel), false)
})
test('DEMO lub brak zaufanego transportu nie otwiera resetu ani sesji', async () => {
  await assert.rejects(wykonajOperacjeTozsamosci('resetuj', { identyfikatory: [pracownik.id] }), czyTrybDemonstracyjny ? /DEMO/ : /niedostępna/)
})
test('standardowy CSV i XLSX nie eksportuje sekretów ani ograniczonej zgody', async () => {
  const konto = { ...pracownik, kod: 'POUFNY_KOD_TESTOWY', haslo: 'POUFNE_HASLO_TESTOWE', zgoda: 'POUFNA_ZGODA_TESTOWA', token: 'POUFNY_TOKEN_TESTOWY' }
  const csv = eksportujCsvKont([konto])
  const xlsx = unzipSync(new Uint8Array(await eksportujXlsxKont([konto])))
  const zawartosc = csv + Object.values(xlsx).map((dane) => strFromU8(dane)).join('')
  assert.doesNotMatch(zawartosc, /POUFN[YAE_]/)
})
