import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  kluczAutosaveProgramu,
  pobierzAutosaveProgramu,
  pobierzHistorieProgramu,
  pobierzKopieRoboczeProgramu,
  ustawAktywnaKopieProgramu,
  usunAutosaveProgramu,
  zapiszAutosaveProgramu,
  zapiszJawnaKopieProgramu,
} from '../src/moduly/dokumenty/generatory/programy_szkolen/magazynKopiiRoboczychProgramu.ts'
import { czyDokumentMaNiezapisaneZmiany, ustawObslugeNiezapisanegoDokumentu } from '../src/moduly/dokumenty/wspolne/strzeznikNiezapisanegoDokumentu.ts'
import { czyStanDokumentuZmieniony, utworzOdciskStanuDokumentu } from '../src/moduly/dokumenty/wspolne/useStanDokumentu.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = { getItem: (klucz: string) => magazyn.get(klucz) ?? null, setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc), removeItem: (klucz: string) => magazyn.delete(klucz), clear: () => magazyn.clear(), key: () => null, length: 0 } as Storage

function dane(tresc = 'Treść programu') { return { tytulSzkolenia: 'Program testowy', trescProgramu: tresc, czyWynikParsowaniaZatwierdzony: false } }
function metadane() { return { organizator: 'SEMPER' as const, liczbaDni: 1, liczbaModulow: 2, czyWynikParsowaniaZatwierdzony: false } }
function zapiszPierwsza() { return zapiszJawnaKopieProgramu({ tryb: 'zapisz', tytul: 'Program testowy', statusBiznesowy: 'robocza', daneDokumentu: dane(), metadane: metadane() }) }
function odczytajZrodlo(sciezka: string) { return readFileSync(new URL(sciezka, import.meta.url), 'utf8') }

test('autosave nie pojawia się na liście kopii roboczych i można go przywrócić', () => {
  magazyn.clear()
  zapiszAutosaveProgramu({ idSesji: 'sesja-1', daneDokumentu: dane('Do odzyskania') })
  assert.equal(pobierzAutosaveProgramu<ReturnType<typeof dane>>()?.daneDokumentu.trescProgramu, 'Do odzyskania')
  assert.deepEqual(pobierzKopieRoboczeProgramu(), [])
})

test('odrzucenie usuwa autosave', () => {
  magazyn.clear()
  zapiszAutosaveProgramu({ idSesji: 'sesja-2', daneDokumentu: dane() })
  usunAutosaveProgramu()
  assert.equal(pobierzAutosaveProgramu(), null)
  assert.equal(magazyn.has(kluczAutosaveProgramu), false)
})

test('pierwszy zapis i aktualizacja zachowują stabilne ID', () => {
  magazyn.clear()
  const pierwsza = zapiszPierwsza()
  const aktualizacja = zapiszJawnaKopieProgramu({ idAktywnejKopii: pierwsza.id, tryb: 'aktualizuj', tytul: 'Program po korekcie', statusBiznesowy: 'robocza', daneDokumentu: dane('Po korekcie'), metadane: metadane() })
  assert.equal(aktualizacja.id, pierwsza.id)
  assert.equal(pobierzKopieRoboczeProgramu().length, 1)
})

test('nowa kopia ma inne ID i pozostawia starą bez zmian', () => {
  magazyn.clear()
  const pierwsza = zapiszPierwsza()
  const druga = zapiszJawnaKopieProgramu({ idAktywnejKopii: pierwsza.id, tryb: 'utworz_nowa', tytul: 'Nowa kopia', statusBiznesowy: 'robocza', daneDokumentu: dane('Nowa treść'), metadane: metadane() })
  assert.notEqual(druga.id, pierwsza.id)
  assert.equal(pobierzKopieRoboczeProgramu().find((kopia) => kopia.id === pierwsza.id)?.daneDokumentu.trescProgramu, 'Treść programu')
})

test('pusty stan po wyczyszczeniu pozostaje wyłącznie autosave', () => {
  magazyn.clear()
  const kopia = zapiszPierwsza()
  ustawAktywnaKopieProgramu(kopia.id)
  zapiszAutosaveProgramu({ idSesji: 'sesja-pusta', aktywnaKopiaId: kopia.id, daneDokumentu: dane('') })
  assert.equal(pobierzKopieRoboczeProgramu()[0].daneDokumentu.trescProgramu, 'Treść programu')
  assert.equal(pobierzAutosaveProgramu<ReturnType<typeof dane>>()?.daneDokumentu.trescProgramu, '')
})

test('wykrywa niezapisane zmiany', () => {
  let czyNiezapisane = true
  const wyczysc = ustawObslugeNiezapisanegoDokumentu({ czySaNiezapisaneZmiany: () => czyNiezapisane, zapiszPrzedWyjsciem: () => { czyNiezapisane = false } })
  assert.equal(czyDokumentMaNiezapisaneZmiany(), true)
  czyNiezapisane = false
  assert.equal(czyDokumentMaNiezapisaneZmiany(), false)
  wyczysc()
})

test('wspólny odcisk rozpoznaje zmianę względem zapisanego dokumentu', () => {
  const zapisany = utworzOdciskStanuDokumentu({ tytul: 'Program', liczbaDni: 2 })
  assert.equal(czyStanDokumentuZmieniony(utworzOdciskStanuDokumentu({ tytul: 'Program', liczbaDni: 2 }), zapisany), false)
  assert.equal(czyStanDokumentuZmieniony(utworzOdciskStanuDokumentu({ tytul: 'Program', liczbaDni: 3 }), zapisany), true)
})

test('sześć generatorów korzysta ze wspólnego stanu i statusu zapisu', () => {
  const wspolnyHook = odczytajZrodlo('../src/moduly/dokumenty/wspolne/useStanDokumentu.ts')
  const stanProstegoGeneratora = odczytajZrodlo('../src/moduly/dokumenty/wspolne/useStanProstegoGeneratora.ts')
  const prostyGenerator = odczytajZrodlo('../src/moduly/dokumenty/wspolne/ProstyGeneratorDokumentu.tsx')
  const programy = odczytajZrodlo('../src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx')
  const dyplomy = odczytajZrodlo('../src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx')
  const listy = odczytajZrodlo('../src/moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu.tsx')
  const checklisty = odczytajZrodlo('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx')
  const aplikacja = odczytajZrodlo('../src/aplikacja/layout/UkladAplikacji.tsx')

  assert.match(wspolnyHook, /opoznienieAutosave/)
  assert.match(wspolnyHook, /window\.setTimeout/)
  assert.match(wspolnyHook, /beforeunload/)
  for (const zrodlo of [stanProstegoGeneratora, programy, dyplomy, listy, checklisty]) assert.match(zrodlo, /useStanDokumentu/)
  for (const zrodlo of [prostyGenerator, programy, dyplomy, listy, checklisty]) assert.match(zrodlo, /StatusZapisuDokumentu/)
  assert.match(aplikacja, /czyDokumentMaNiezapisaneZmiany/)
  assert.doesNotMatch(programy, /ostrzezPrzedOdswiezeniem/)
})

test('każdy jawny zapis dodaje historię z migawką', () => {
  magazyn.clear()
  const pierwsza = zapiszPierwsza()
  zapiszJawnaKopieProgramu({ idAktywnejKopii: pierwsza.id, tryb: 'aktualizuj', tytul: 'Program testowy', statusBiznesowy: 'robocza', daneDokumentu: dane('Aktualizacja'), metadane: metadane() })
  const druga = zapiszJawnaKopieProgramu({ idAktywnejKopii: pierwsza.id, tryb: 'utworz_nowa', tytul: 'Nowa kopia', statusBiznesowy: 'robocza', daneDokumentu: dane('Kopia'), metadane: metadane() })
  assert.equal(pobierzHistorieProgramu(pierwsza.id).length, 2)
  assert.equal(pobierzHistorieProgramu(druga.id)[0].typOperacji, 'utworzenie_nowej_kopii')
})

test('jawny zapis programu tworzy rekord wspólnego modelu z rozdzielonymi ustawieniami', () => {
  magazyn.clear()
  const rekord = zapiszJawnaKopieProgramu({
    tryb: 'zapisz',
    tytul: 'Program w rejestrze',
    statusBiznesowy: 'robocza',
    daneDokumentu: { ...dane(), ustawienia: { kolorAkcentuProgramu: '#DE1914' } },
    metadane: metadane(),
  })

  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(rekord.id)
  assert.equal(dokument?.typ, 'PROGRAM_SZKOLENIA')
  assert.equal(dokument?.status, 'ROBOCZY')
  assert.equal(dokument?.daneDokumentu.ustawienia, undefined)
  assert.equal(dokument?.ustawieniaDokumentu.ustawienia.kolorAkcentuProgramu, '#DE1914')
  assert.equal(dokument?.ustawieniaDokumentu.ustawienia.szerokoscLogotypu, 90)
})
