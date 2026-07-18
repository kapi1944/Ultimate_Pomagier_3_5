import assert from 'node:assert/strict'
import { kluczRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { zapiszDokumentRoboczyGeneratora } from '../src/wspolne/dokumenty/zapisDokumentuGeneratora.ts'
import type { TypDokumentu } from '../src/wspolne/dokumenty/modelDokumentu.ts'

const magazyn = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (klucz: string) => magazyn.get(klucz) ?? null,
    setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, String(wartosc)),
    removeItem: (klucz: string) => magazyn.delete(klucz),
    clear: () => magazyn.clear(),
    key: (indeks: number) => [...magazyn.keys()][indeks] ?? null,
    get length() { return magazyn.size },
  },
})

localStorage.removeItem(kluczRejestruDokumentow)

const przypadki: Array<{ typ: TypDokumentu; generatorId: string }> = [
  { typ: 'LISTA_OBECNOSCI', generatorId: 'listy_obecnosci' },
  { typ: 'ANKIETA', generatorId: 'ankiety' },
  { typ: 'DYPLOM', generatorId: 'dyplomy' },
  { typ: 'KARTA_NA_DRZWI', generatorId: 'karta_na_drzwi' },
]

for (const przypadek of przypadki) {
  const dokument = zapiszDokumentRoboczyGeneratora({
    ...przypadek,
    tytul: `Test ${przypadek.generatorId}`,
    daneDokumentu: { tekst: przypadek.generatorId },
    ustawieniaDokumentu: {},
    autorId: 'test',
    wlascicielId: 'test',
  })
  assert.equal(dokument.status, 'ROBOCZY')
  assert.equal(dokument.typ, przypadek.typ)

  const ponowny = zapiszDokumentRoboczyGeneratora({
    id: dokument.id,
    ...przypadek,
    tytul: `Aktualizacja ${przypadek.generatorId}`,
    daneDokumentu: { tekst: 'zmiana' },
    ustawieniaDokumentu: {},
  })
  assert.equal(ponowny.id, dokument.id)
}

const wszystkie = repozytoriumWspolnychDokumentow.pobierzWszystkie()
assert.equal(wszystkie.length, przypadki.length)
for (const przypadek of przypadki) {
  assert.equal(wszystkie.filter((dokument) => dokument.typ === przypadek.typ && dokument.status === 'ROBOCZY').length, 1)
}

console.log('OK: wspólny rejestr kopii roboczych wszystkich generatorów')
