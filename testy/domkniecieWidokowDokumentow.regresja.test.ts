import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { konfiguracjePodmenuGeneratorow, pobierzWidokGeneratoraZeSciezki } from '../src/aplikacja/nawigacja/konfiguracjaGeneratorow.ts'
import { filtrujDokumenty, sortujDokumenty } from '../src/wspolne/dokumenty/filtryDokumentow.ts'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import { repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { pobierzSzczegolyDoChecklisty } from '../src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts'

const magazyn = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, String(wartosc)),
  removeItem: (klucz: string) => magazyn.delete(klucz),
  clear: () => magazyn.clear(),
  key: (indeks: number) => [...magazyn.keys()][indeks] ?? null,
  get length() { return magazyn.size },
} as Storage

function odczytajZrodlo(sciezka: string) {
  return readFileSync(new URL(sciezka, import.meta.url), 'utf8')
}

test('moduły Checklist i Szczegółów nie zawierają mojibake, a etykiety generatora są poprawne', () => {
  const niedozwoloneSekwencje = /[\u00c3\u00c2\u00c4\u00c5\u0102\u0139\u00e2]/
  const pliki = [
    '../src/aplikacja/layout/UkladAplikacji.tsx',
    '../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx',
    '../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych.tsx',
    '../src/moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych.tsx',
  ]

  pliki.forEach((plik) => assert.equal(niedozwoloneSekwencje.test(odczytajZrodlo(plik)), false, `Mojibake w ${plik}`))

  const widokChecklist = odczytajZrodlo('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx')
  assert.match(widokChecklist, /Przygotuj roboczą Checklistę dla konkretnej grupy szkoleniowej\./)
  assert.match(widokChecklist, /Wybierz Szczegóły organizacyjne/)
  assert.match(widokChecklist, /Utwórz Checklistę paczki/)
  assert.match(widokChecklist, /Istniejące checklisty/)
})

test('generator Checklist pobiera także kopię roboczą Szczegółów z kanonicznego rejestru i zachowuje stabilne grupaId', () => {
  magazyn.clear()
  const wersjaRobocza = {
    id: 'wersja-szczegolow-1',
    dokumentId: 'szczegoly-1',
    wersja: 'test',
    etykietaWersji: 'test',
    nazwa: 'Szkolenie robocze',
    dataZapisu: '2026-07-21T10:00:00.000Z',
    autorId: 'autor-1',
    autorNazwa: 'Autor',
    dane: { tytulSzkolenia: 'Szkolenie robocze', opiekunId: 'opiekun-1' },
    grupy: [{ id: 'grupa-stabilna', nazwa: 'Grupa A', liczbaUczestnikow: 12 }],
    adresaci: {},
    statusyPol: {},
  }
  const bezGrup = { ...wersjaRobocza, id: 'wersja-bez-grup', dokumentId: 'szczegoly-2', grupy: [] }

  repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'wersja-szczegolow-1', typ: 'SZCZEGOLY_ORGANIZACYJNE', tytul: 'Szkolenie robocze', generatorId: 'szczegoly_organizacyjne', daneDokumentu: wersjaRobocza, ustawieniaDokumentu: {} }))
  repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'wersja-bez-grup', typ: 'SZCZEGOLY_ORGANIZACYJNE', tytul: 'Bez grup', generatorId: 'szczegoly_organizacyjne', daneDokumentu: bezGrup, ustawieniaDokumentu: {} }))

  const szczegoly = pobierzSzczegolyDoChecklisty()
  assert.deepEqual(szczegoly.map((pozycja) => pozycja.id), ['wersja-szczegolow-1'])
  assert.equal(szczegoly[0]?.czyKopiaRobocza, true)
  assert.equal(szczegoly[0]?.grupy[0]?.id, 'grupa-stabilna')
  assert.equal(szczegoly[0]?.zrodloKontekstu.szczegolyOrganizacyjneId, 'wersja-szczegolow-1')
})

test('pięć modułów ma spójne trasy i pozycje Wszystkie', () => {
  const oczekiwane = [
    ['generator-list-obecnosci', 'Wszystkie listy obecności', '/dokumenty/listy-obecnosci/wszystkie', 'listy_obecnosci_wszystkie'],
    ['generator-ankiet', 'Wszystkie ankiety', '/dokumenty/ankiety/wszystkie', 'ankiety_wszystkie'],
    ['generator-dyplomow', 'Wszystkie dyplomy', '/dokumenty/dyplomy/wszystkie', 'dyplomy_wszystkie'],
    ['generator-kart-na-drzwi', 'Wszystkie karty na drzwi', '/dokumenty/karta-na-drzwi/wszystkie', 'karta_na_drzwi_wszystkie'],
    ['generator-checklist-paczek', 'Wszystkie checklisty paczek', '/dokumenty/checklisty-paczek/wszystkie', 'checklisty_paczek_wszystkie'],
  ] as const

  oczekiwane.forEach(([klucz, etykieta, sciezka, widok]) => {
    const pozycje = konfiguracjePodmenuGeneratorow.find((konfiguracja) => konfiguracja.klucz === klucz)?.pozycje
    assert.ok(pozycje)
    assert.equal(pozycje?.[0]?.etykieta.startsWith('Now'), true)
    assert.equal(pozycje?.[1]?.etykieta, 'Kopie robocze')
    assert.deepEqual(pozycje?.[2], { widok, etykieta, sciezka })
    assert.equal(pozycje?.[3]?.etykieta, 'Kosz')
    assert.equal(pobierzWidokGeneratoraZeSciezki(pozycje?.[3]?.sciezka ?? ''), pozycje?.[3]?.widok)
    assert.equal(pobierzWidokGeneratoraZeSciezki(sciezka), widok)
  })
})

test('generatory korzystają ze wspólnego układu paneli, paska akcji i jawnej konfiguracji zapisu', () => {
  const prostyGenerator = odczytajZrodlo('../src/moduly/dokumenty/wspolne/ProstyGeneratorDokumentu.tsx')
  const wspolnyUklad = odczytajZrodlo('../src/moduly/dokumenty/wspolne/UkladGeneratoraDokumentu.tsx')
  const ukladGeneratora = odczytajZrodlo('../src/moduly/dokumenty/wspolne/ukladGeneratoraDokumentu.css')
  const listaZDokumentu = odczytajZrodlo('../src/moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu.tsx')
  const checklista = odczytajZrodlo('../src/moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek.tsx')
  const stylChecklisty = odczytajZrodlo('../src/moduly/dokumenty/generatory/checklisty_paczek/widokChecklistPaczek.css')
  const dyplom = odczytajZrodlo('../src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx')
  const stylDyplomow = odczytajZrodlo('../src/moduly/dokumenty/generatory/dyplomy/widokDyplomow.css')
  const program = odczytajZrodlo('../src/moduly/dokumenty/generatory/programy_szkolen/WidokProgramowSzkolen.tsx')
  const ankieta = odczytajZrodlo('../src/moduly/dokumenty/generatory/ankiety/WidokAnkiet.tsx')
  const lista = odczytajZrodlo('../src/moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci.tsx')
  const karta = odczytajZrodlo('../src/moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi.tsx')

  assert.match(prostyGenerator, /UkladGeneratoraDokumentu/)
  assert.match(prostyGenerator, /UkladFormularzaIPodgladu/)
  assert.match(listaZDokumentu, /UkladFormularzaIPodgladu/)
  assert.match(listaZDokumentu, /RendererListyObecnosci/)
  assert.match(listaZDokumentu, /AkcjeEksportuPdf/)
  assert.match(checklista, /UkladFormularzaIPodgladu/)
  assert.match(wspolnyUklad, /UkladFormularzaIPodgladu/)
  assert.match(wspolnyUklad, /ObszarZPanelemGeneratora/)
  assert.match(wspolnyUklad, /PanelBocznyGeneratora/)
  assert.match(wspolnyUklad, /usePanelUstawienGeneratora/)
  assert.match(prostyGenerator, /ObszarZPanelemGeneratora/)
  assert.match(listaZDokumentu, /ObszarZPanelemGeneratora/)
  assert.match(checklista, /ObszarZPanelemGeneratora/)
  assert.match(program, /ObszarZPanelemGeneratora/)
  assert.match(dyplom, /ObszarZPanelemGeneratora/)
  assert.match(prostyGenerator, /PasekAkcjiGeneratora/)
  assert.match(checklista, /PasekAkcjiGeneratora/)
  assert.match(program, /PasekAkcjiGeneratora/)
  assert.match(program, /utworzNazwePlikuDokumentu\('PROGRAM_SZKOLENIA'/)
  assert.match(ukladGeneratora, /container-type: inline-size/)
  assert.match(ukladGeneratora, /@container \(max-width: 980px\)/)
  assert.match(ukladGeneratora, /container: panel-generatora \/ inline-size/)
  assert.match(ukladGeneratora, /@container panel-generatora \(max-width: 760px\)/)
  assert.match(ukladGeneratora, /padding-right: min\(var\(--szerokosc-panelu-generatora\)/)
  assert.doesNotMatch(ukladGeneratora, /uklad-aplikacji__kolumna-glowna:has/)
  assert.match(program, /@container \(max-width: 760px\)/)
  assert.match(stylDyplomow, /@container obszar-roboczy \(max-width: 1280px\)/)
  assert.doesNotMatch(stylDyplomow, /\.dyplomy--panel-ustawien-otwarty\s*\{\s*width:/)
  assert.doesNotMatch(stylChecklisty, /checklista-paczki__uklad-roboczy/)

  assert.match(ankieta, /UkladFormularzaIPodgladu/)
  assert.match(ankieta, /PasekAkcjiGeneratora/)
  assert.match(ankieta, /useStanDokumentu\(\{ dane, zapiszAutomatycznie: zapiszDane \}\)/)
  assert.match(ankieta, /zapiszDokumentRoboczyGeneratora\(\{ id: idDokumentu, typ: 'ANKIETA', generatorId: 'ankiety'/)
  assert.match(lista, /typ: 'LISTA_OBECNOSCI'/)
  assert.match(lista, /generatorId: 'listy_obecnosci'/)
  assert.match(lista, /RendererListyObecnosci/)
  assert.match(karta, /typDokumentu="KARTA_NA_DRZWI"/)
  assert.match(karta, /generatorId="karta_na_drzwi"/)
})

test('wspólna lista filtruje typ, status, tekst, datę i sortowanie bez mieszania dokumentów', () => {
  const ankieta = { ...utworzNowyDokument({ id: 'ankieta-1', typ: 'ANKIETA', tytul: 'Ocena szkolenia', generatorId: 'ankiety', daneDokumentu: { tytulSzkolenia: 'Excel', trener: 'Anna Trener' }, ustawieniaDokumentu: {} }), status: 'OPUBLIKOWANY' as const, zmodyfikowano: '2026-07-20T10:00:00.000Z' }
  const dyplom = { ...utworzNowyDokument({ id: 'dyplom-1', typ: 'DYPLOM', tytul: 'Dyplom Excel', generatorId: 'dyplomy', daneDokumentu: { tytulSzkolenia: 'Excel', trener: 'Jan Trener' }, ustawieniaDokumentu: {} }), status: 'ROBOCZY' as const, zmodyfikowano: '2026-07-21T10:00:00.000Z' }

  assert.deepEqual(filtrujDokumenty([ankieta, dyplom], { typ: 'DYPLOM' }).map((dokument) => dokument.id), ['dyplom-1'])
  assert.deepEqual(filtrujDokumenty([ankieta, dyplom], { status: 'OPUBLIKOWANY' }).map((dokument) => dokument.id), ['ankieta-1'])
  assert.deepEqual(filtrujDokumenty([ankieta, dyplom], { tekst: 'Jan Trener' }).map((dokument) => dokument.id), ['dyplom-1'])
  assert.deepEqual(filtrujDokumenty([ankieta, dyplom], { dataOd: '2026-07-21' }).map((dokument) => dokument.id), ['dyplom-1'])
  assert.deepEqual(sortujDokumenty([ankieta, dyplom], 'TYTUL_ROSNACO').map((dokument) => dokument.id), ['dyplom-1', 'ankieta-1'])
})

test('Kopie robocze i Wszystkie Dyplomy korzystają z jednej karty z miniaturą pierwszej strony', () => {
  const lista = odczytajZrodlo('../src/moduly/dokumenty/ListaDokumentow.tsx')
  const karta = odczytajZrodlo('../src/moduly/dokumenty/KartaDokumentuDyplomu.tsx')
  const uklad = odczytajZrodlo('../src/aplikacja/layout/UkladAplikacji.tsx')

  assert.match(lista, /KartaDokumentuDyplomu/)
  assert.match(karta, /lista-dokumentow__miniatura-dyplomu/)
  assert.match(karta, /lista-dokumentow__podglad-pierwszej-strony-dyplomu/)
  assert.match(karta, /Miniatura pierwszej strony/)
  assert.match(karta, /Imię i nazwisko/)
  assert.match(karta, /onError/)
  assert.match(uklad, /Kopie robocze — Dyplomy/)
  assert.match(uklad, /Wszystkie dyplomy/)
})

test('widok Wszystkie dokumenty renderuje sześć kafelków tworzenia przed formularzem filtrów', () => {
  const uklad = odczytajZrodlo('../src/aplikacja/layout/UkladAplikacji.tsx')
  const widokWszystkich = odczytajZrodlo('../src/moduly/dokumenty/WidokWszystkichDokumentow.tsx')
  const lista = odczytajZrodlo('../src/moduly/dokumenty/ListaDokumentow.tsx')
  const nazwyKafelkow = [
    'Program szkolenia',
    'Lista obecności',
    'Ankieta',
    'Dyplom',
    'Karta informacyjna / karta na drzwi',
    'Checklista wysyłki paczek',
  ]

  assert.match(uklad, /case 'dokumenty_wszystkie':[\s\S]*<WidokWszystkichDokumentow[\s\S]*otworzNowyDokument/)
  assert.match(widokWszystkich, /return <ListaDokumentow[\s\S]*otworzNowyDokument=/)

  const indeksFiltrow = lista.indexOf('<form className="lista-dokumentow__filtry"')
  assert.ok(indeksFiltrow > 0)

  nazwyKafelkow.forEach((nazwa) => {
    const indeksKafelka = lista.indexOf(nazwa)
    assert.ok(indeksKafelka >= 0, `Brak kafelka: ${nazwa}`)
    assert.ok(indeksKafelka < indeksFiltrow, `Kafelek ${nazwa} musi być przed filtrami`)
  })
})
