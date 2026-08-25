import assert from 'node:assert/strict'
import test from 'node:test'
import {
  pobierzAutosaveProgramu,
  usunAutosaveProgramu,
  zapiszAutosaveProgramu,
  zapiszJawnaKopieProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/magazynKopiiRoboczychProgramu.ts'
import {
  normalizujProgramSzkolenia,
  pobierzHtmlProgramuSzkolenia,
  utworzDokumentProgramuSzkolenia,
  walidujProgramSzkolenia,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia.ts'
import { pobierzProgramPoId } from '../src/moduly/dokumenty/generatory/programy_szkolen/rejestrProgramowSzkolen.ts'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import { kluczRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, String(wartosc)),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: (indeks: number) => [...magazyn.keys()][indeks] ?? null,
  get length() { return magazyn.size },
} as Storage

function metadane() {
  return { organizator: 'SEMPER' as const, liczbaDni: 1, liczbaModulow: 1, czyWynikParsowaniaZatwierdzony: true }
}

function przykladowyProgram() {
  return normalizujProgramSzkolenia({
    tytulSzkolenia: 'Bezpieczna komunikacja',
    trescProgramu: '1. Wprowadzenie\n- Zasady komunikacji',
    czyWynikParsowaniaZatwierdzony: true,
    ustawienia: { profilFirmy: 'semper', kolorAkcentuProgramu: '#DE1914' },
  })
}

test('kanoniczny Program zachowuje logiczne dane po zapisie i odczycie', () => {
  magazyn.clear()
  const program = przykladowyProgram()
  const dokument = zapiszJawnaKopieProgramu({
    tryb: 'zapisz',
    tytul: program.tytulSzkolenia,
    statusBiznesowy: 'zatwierdzona',
    daneDokumentu: program,
    metadane: metadane(),
    uzytkownikId: 'uzytkownik-1',
  })

  assert.deepEqual(pobierzProgramPoId(dokument.id)?.daneDokumentu, program)
  assert.equal(dokument.autorId, 'uzytkownik-1')
  assert.equal(dokument.wlascicielId, 'uzytkownik-1')
})

test('autosave przechowuje kanoniczny Program we wspolnym rejestrze', () => {
  magazyn.clear()
  const program = przykladowyProgram()
  zapiszAutosaveProgramu({ idSesji: 'sesja-1', aktywnaKopiaId: 'program-1', uzytkownikId: 'uzytkownik-1', daneDokumentu: program })

  assert.deepEqual(pobierzAutosaveProgramu('uzytkownik-1')?.daneDokumentu, program)
  assert.equal(pobierzAutosaveProgramu('uzytkownik-2'), null)
  assert.equal(magazyn.has('ultimatePomagier.programySzkolen.autosave.v1'), false)
  const rejestr = JSON.parse(magazyn.get(kluczRejestruDokumentow) ?? '{}') as { autosave?: unknown[] }
  assert.equal(rejestr.autosave?.length, 1)

  usunAutosaveProgramu('uzytkownik-1')
  assert.equal(pobierzAutosaveProgramu('uzytkownik-1'), null)
})

test('stary niepelny zapis jest migrowany w pamieci do aktualnego modelu', () => {
  magazyn.clear()
  const staryDokument = utworzNowyDokument({
    id: 'stary-program',
    typ: 'PROGRAM_SZKOLENIA',
    tytul: 'Stary program',
    generatorId: 'programy_szkolen',
    daneDokumentu: { tytulSzkolenia: 'Stary program', trescProgramu: '1. Dawna treść', trescProgramuHtml: '<p>Rozbieżna kopia HTML</p>' },
    ustawieniaDokumentu: { ustawienia: { profilFirmy: 'iist' } },
  })
  repozytoriumWspolnychDokumentow.utworz(staryDokument)

  const odczytany = pobierzProgramPoId(staryDokument.id)?.daneDokumentu
  assert.equal(odczytany?.ustawienia.profilFirmy, 'iist')
  assert.equal(odczytany?.ustawienia.kolorAkcentuProgramu, '#DE1914')
  assert.match(odczytany ? pobierzHtmlProgramuSzkolenia(odczytany) : '', /Dawna treść/)
  assert.equal('trescProgramuHtml' in (odczytany ?? {}), false)
  assert.deepEqual(staryDokument.daneDokumentu, { tytulSzkolenia: 'Stary program', trescProgramu: '1. Dawna treść', trescProgramuHtml: '<p>Rozbieżna kopia HTML</p>' })
})

test('legacy autosave jest odczytywany bez destrukcyjnego przepisywania klucza', () => {
  magazyn.clear()
  const kluczLegacy = 'ultimate-pomagier-program-szkolenia-roboczy'
  const zapisLegacy = JSON.stringify({ tytulSzkolenia: 'Legacy', trescProgramu: '1. Treść legacy' })
  magazyn.set(kluczLegacy, zapisLegacy)

  const odczytany = pobierzAutosaveProgramu()?.daneDokumentu
  assert.equal(odczytany?.tytulSzkolenia, 'Legacy')
  assert.equal(odczytany?.ustawienia.stylePoziomowListy.length, 3)
  assert.equal(magazyn.get(kluczLegacy), zapisLegacy)
})

test('brak opcjonalnych danych daje kompletny model i poprawny adapter dokumentu', () => {
  magazyn.clear()
  const program = normalizujProgramSzkolenia({ tytulSzkolenia: 'Minimalny', trescProgramu: '' })
  const dokument = utworzDokumentProgramuSzkolenia(program)

  assert.equal(program.logotypProgramu, '')
  assert.equal(program.ustawienia.szerokoscLogotypu, 90)
  assert.equal(dokument.dane.tytulSzkolenia, 'Minimalny')
  assert.doesNotThrow(() => walidujProgramSzkolenia(program, dokument))
})

test('podglad i eksportowy DokumentBlokowy sa pochodna aktualnego Programu', () => {
  magazyn.clear()
  const pierwszy = przykladowyProgram()
  const drugi = normalizujProgramSzkolenia({ ...pierwszy, tytulSzkolenia: 'Aktualny tytuł', trescProgramu: '1. Aktualna treść' })
  const dokument = utworzDokumentProgramuSzkolenia(drugi)
  const tekstBlokow = JSON.stringify(dokument.struktura)

  assert.equal(dokument.dane.tytulSzkolenia, 'Aktualny tytuł')
  assert.match(tekstBlokow, /Aktualna treść/)
  assert.doesNotMatch(tekstBlokow, /Zasady komunikacji/)
})
