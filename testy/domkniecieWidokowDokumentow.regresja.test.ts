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
    assert.equal(pobierzWidokGeneratoraZeSciezki(sciezka), widok)
  })
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
