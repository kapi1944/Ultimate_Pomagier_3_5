import assert from 'node:assert/strict'
import test from 'node:test'
import { czyMoznaRozpoczacEksport, pobierzPodzialStronA4, pobierzStronyDokumentu, utworzNazwePlikuPdf } from '../src/wspolne/dokumenty/eksportPdf.ts'
import { formatujTerminyDoNazwy, sanityzujSegmentNazwy, zbudujNazweBazowaEksportowanegoDokumentu, zbudujNazweEksportowanegoDokumentu } from '../src/wspolne/dokumenty/nazwyDokumentow.ts'
import { geometriaStronyProgramu, pobierzWymiaryStronyProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/geometriaStronyProgramu.ts'

test('nazwa PDF usuwa znaki niedozwolone', () => {
  assert.equal(utworzNazwePlikuPdf('Program: szkolenie "Zażółć"?.pdf'), 'Program szkolenie Zażółć.pdf')
  assert.equal(sanityzujSegmentNazwy('Zażółć / projekt: test?'), 'Zazolc_projekt_test')
})

test('wspólna nazwa eksportu składa wyłącznie dostępne dane szkolenia', () => {
  const dane = { typDokumentu: 'PROGRAM_SZKOLENIA' as const, organizator: 'Centrum Organizacji Szkoleń i Konferencji SEMPER', terminy: ['2026-09-14', '2026-09-15', '2026-09-16'], klient: { skrot: 'PKN ORLEN', nazwa: 'Pomijana nazwa' }, miejsce: 'Poznań', tytulSzkolenia: 'Zarządzanie projektami', wersja: 12 }
  assert.equal(zbudujNazweEksportowanegoDokumentu(dane), 'SEMPER_2026.09.14-16_PKN_ORLEN_Poznan_Zarzadzanie_projektami_Program_szkolenia_(v12).pdf')
  assert.equal(zbudujNazweEksportowanegoDokumentu({ ...dane, organizator: 'IIST', czyOnline: true, rozszerzenie: 'DOCX' }), 'IIST_2026.09.14-16_PKN_ORLEN_online_Zarzadzanie_projektami_Program_szkolenia_(v12).docx')
  assert.equal(zbudujNazweBazowaEksportowanegoDokumentu(dane), zbudujNazweBazowaEksportowanegoDokumentu({ ...dane, rozszerzenie: 'docx' }))
  assert.equal(zbudujNazweEksportowanegoDokumentu({ ...dane, organizator: null, klient: { nazwa: 'Urząd Miasta Poznań' }, miejsce: '' }), '2026.09.14-16_Urzad_Miasta_Poznan_Zarzadzanie_projektami_Program_szkolenia_(v12).pdf')
})

test('terminy ciągłe i rozłączne mają wspólną deterministyczną semantykę', () => {
  assert.equal(formatujTerminyDoNazwy(['2026-09-14']), '2026.09.14')
  assert.equal(formatujTerminyDoNazwy(['2026-09-14', '2026-09-15', '2026-10-01']), '2026.09.14-15+2026.10.01')
  assert.equal(formatujTerminyDoNazwy(['2026-12-31', '2027-01-01']), '2026.12.31-2027.01.01')
})

test('brak segmentów nie tworzy separatorów, wartości technicznych ani blokady eksportu', () => {
  assert.equal(zbudujNazweEksportowanegoDokumentu({ typDokumentu: 'LISTA_OBECNOSCI', terminy: ['2026-09-14'], tytulSzkolenia: 'Cyberbezpieczeństwo', czyOnline: true }), '2026.09.14_online_Cyberbezpieczenstwo_Lista_obecnosci_(v1).pdf')
  assert.equal(zbudujNazweEksportowanegoDokumentu({ typDokumentu: 'DYPLOM', dataUtworzenia: '2026-08-27T12:00:00.000Z', nazwaUzytkownika: 'Rozliczenie projektu' }), '2026.08.27_Rozliczenie_projektu_Dyplom_(v1).pdf')
  const nazwa = zbudujNazweEksportowanegoDokumentu({ typDokumentu: 'ANKIETA', organizator: 'undefined', klient: 'null', miejsce: 'brak', tytulSzkolenia: 'Zażółć: <>?' })
  assert.equal(nazwa, 'Zazolc_Ankieta_(v1).pdf')
  assert.ok(!nazwa.includes('__'))
})

test('podzial A4 tworzy przewidywalne strony dla krótkiego i długiego podglądu', () => {
  assert.equal(pobierzPodzialStronA4(500, 1000).length, 1)
  const strony = pobierzPodzialStronA4(5000, 1000)
  assert.ok(strony.length > 1)
  assert.equal(strony.reduce((suma, strona) => suma + strona.wysokosc, 0), 5000)
})


test('blokada nie pozwala rozpoczac drugiego eksportu podczas generowania', () => {
  assert.equal(czyMoznaRozpoczacEksport(false), true)
  assert.equal(czyMoznaRozpoczacEksport(true), false)
})

test('program szkolenia używa pełnej geometrii A4 bez dodatkowego marginesu PDF', () => {
  assert.deepEqual(pobierzWymiaryStronyProgramu(), { szerokosc: '210mm', wysokosc: '297mm' })
  assert.equal(geometriaStronyProgramu.marginesDrukuMm, 0)
  assert.ok(geometriaStronyProgramu.wysokoscStopkiMm > 0)
})

test('eksport rozpoznaje fizyczne strony dokumentu zamiast kroić cały podgląd', () => {
  const stronaPierwsza = {} as HTMLElement
  const stronaDruga = {} as HTMLElement
  const obszar = {
    querySelectorAll: () => [stronaPierwsza, stronaDruga],
  } as unknown as HTMLElement

  assert.deepEqual(pobierzStronyDokumentu(obszar), [stronaPierwsza, stronaDruga])
})
