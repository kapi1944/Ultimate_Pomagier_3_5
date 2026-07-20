import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { poczatkoweDaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { zbudujBledyDanychKlienta } from '../src/moduly/zamkniete/szczegoly_organizacyjne/logikaDanychOdbiorcy.ts'
import { czyWszystkieListyBledowRozwiniete, deduplikujBledySekcji, zbudujPozycjeChecklistyPublikacji } from '../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/logikaChecklistyPublikacji.ts'
import { przejdzDoPolaFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/nawigacjaDoPola.ts'
import { pobierzIdPola } from '../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/identyfikatoryPol.ts'
import type { KluczSekcjiSzczegolow, ModelSekcyjnySzczegolow, ProblemWalidacji } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'

function utworzDane() {
  return structuredClone(poczatkoweDaneFormularza)
}

function utworzModelChecklisty(sekcje: Array<{ klucz: KluczSekcjiSzczegolow; etykieta: string; bledy?: ProblemWalidacji[] }>) {
  return Object.fromEntries(sekcje.map(({ klucz, etykieta, bledy = [] }) => [klucz, {
    klucz,
    etykieta,
    dane: {},
    wynikWalidacji: bledy.length === 0,
    statusKompletnosci: bledy.length === 0 ? 'kompletna' : 'niekompletna',
    bledyKrytyczne: bledy,
    ostrzezenia: [],
    polaNiepewne: [],
    wymaganaDoPublikacji: true,
  }])) as ModelSekcyjnySzczegolow
}

test('dane klienta są wspólną pozycją checklisty i korzystają z błędów walidacji formularza', () => {
  const bledy = zbudujBledyDanychKlienta(utworzDane())
  const pozycja = zbudujPozycjeChecklistyPublikacji(utworzModelChecklisty([{ klucz: 'klient', etykieta: 'Dane klienta', bledy }]))[0]

  assert.deepEqual(bledy.map((blad) => blad.pole), ['odbiorca.nazwa', 'odbiorca.email'])
  assert.equal(pozycja.etykieta, 'Dane klienta')
  assert.equal(pozycja.idSekcjiFormularza, 'dane-klienta')
  assert.deepEqual(pozycja.bledy, bledy)
})

test('checklista deduplikuje błąd pola w ramach sekcji i nie tworzy pustej listy dla poprawnej sekcji', () => {
  const blad: ProblemWalidacji = { sekcja: 'Dane klienta', pole: 'odbiorca.email', komunikat: 'Odbiorca: wpisz adres email', poziom: 'blad', czyBlokuje: true }
  const innyBlad: ProblemWalidacji = { ...blad, komunikat: 'Odbiorca: popraw adres email' }
  const model = utworzModelChecklisty([
    { klucz: 'klient', etykieta: 'Dane klienta', bledy: [] },
    { klucz: 'opiekun', etykieta: 'Opiekun', bledy: [blad, blad] },
  ])
  const pozycje = zbudujPozycjeChecklistyPublikacji(model)

  assert.equal(deduplikujBledySekcji('klient', [blad, blad]).length, 1)
  assert.equal(deduplikujBledySekcji('klient', [blad, innyBlad]).length, 2)
  assert.deepEqual(pozycje.find((pozycja) => pozycja.klucz === 'klient')?.bledy, [])
  assert.equal(pozycje.find((pozycja) => pozycja.klucz === 'opiekun')?.bledy.length, 1)
})

test('identyfikatory pól grup wykorzystują stabilne ID grupy i rozróżniają cenę, miejsce oraz trenera', () => {
  const pola = ['cenaNetto', 'miejsce', 'trenerzy'].map((nazwaPola) => `grupy.1.${nazwaPola}`)
  const identyfikatoryPierwszejGrupy = pola.map((pole) => pobierzIdPola(pole, 'grupa-pierwsza'))
  const identyfikatoryDrugiejGrupy = pola.map((pole) => pobierzIdPola(pole, 'grupa-druga'))

  assert.equal(new Set(identyfikatoryPierwszejGrupy).size, 3)
  assert.ok(identyfikatoryPierwszejGrupy.every((id) => id.includes('grupa-grupa-pierwsza')))
  assert.ok(identyfikatoryPierwszejGrupy.every((id, indeks) => id !== identyfikatoryDrugiejGrupy[indeks]))
})

test('nabywca będący odbiorcą waliduje wyłącznie aktywne pola nabywcy, a po rozdzieleniu wraca walidacja odbiorcy', () => {
  const dane = utworzDane()
  dane.czyNabywcaJestOdbiorca = true
  dane.nabywca.nazwa = 'Nabywca'
  dane.nabywca.email = 'nabywca@example.pl'

  assert.deepEqual(zbudujBledyDanychKlienta(dane), [])

  dane.nabywca.email = ''
  const bledyNabywcy = zbudujBledyDanychKlienta(dane)
  assert.deepEqual(bledyNabywcy.map((blad) => blad.pole), ['nabywca.email'])
  assert.match(bledyNabywcy[0].komunikat, /^Nabywca:/)

  dane.czyNabywcaJestOdbiorca = false
  const bledyOdbiorcy = zbudujBledyDanychKlienta(dane)
  assert.deepEqual(bledyOdbiorcy.map((blad) => blad.pole), ['odbiorca.nazwa', 'odbiorca.email'])
})

test('stan zbiorczego rozwijania obejmuje wyłącznie sekcje z błędami', () => {
  const blad: ProblemWalidacji = { sekcja: 'Dane klienta', pole: 'odbiorca.nazwa', komunikat: 'Błąd', poziom: 'blad', czyBlokuje: true }
  const pozycje = zbudujPozycjeChecklistyPublikacji(utworzModelChecklisty([
    { klucz: 'klient', etykieta: 'Dane klienta', bledy: [blad] },
    { klucz: 'opiekun', etykieta: 'Opiekun', bledy: [] },
  ]))

  assert.equal(czyWszystkieListyBledowRozwiniete(pozycje, new Set()), false)
  assert.equal(czyWszystkieListyBledowRozwiniete(pozycje, new Set(['klient'])), true)
})

test('synchronizacja rozwiniętych sekcji usuwa wyłącznie sekcje bez aktualnych błędów', async () => {
  const { synchronizujRozwinieteSekcje } = await import('../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/logikaChecklistyPublikacji.ts')
  const blad: ProblemWalidacji = { sekcja: 'Dane klienta', pole: 'odbiorca.nazwa', komunikat: 'Błąd', poziom: 'blad', czyBlokuje: true }
  const pozycjeZBledami = zbudujPozycjeChecklistyPublikacji(utworzModelChecklisty([
    { klucz: 'klient', etykieta: 'Dane klienta', bledy: [blad] },
    { klucz: 'opiekun', etykieta: 'Opiekun', bledy: [blad] },
  ]))
  const pozycjePoPoprawieKlienta = zbudujPozycjeChecklistyPublikacji(utworzModelChecklisty([
    { klucz: 'klient', etykieta: 'Dane klienta', bledy: [] },
    { klucz: 'opiekun', etykieta: 'Opiekun', bledy: [blad] },
  ]))

  assert.deepEqual([...synchronizujRozwinieteSekcje(pozycjeZBledami, new Set(['klient', 'opiekun']))], ['klient', 'opiekun'])
  assert.deepEqual([...synchronizujRozwinieteSekcje(pozycjePoPoprawieKlienta, new Set(['klient', 'opiekun']))], ['opiekun'])
  assert.deepEqual([...synchronizujRozwinieteSekcje(pozycjeZBledami, new Set(['opiekun']))], ['opiekun'])
})

test('komponent checklisty zachowuje kontrakt rozwijania i dostępności', () => {
  const zrodlo = readFileSync(new URL('../src/moduly/zamkniete/szczegoly_organizacyjne/komponenty/PanelWykrytychProblemow.tsx', import.meta.url), 'utf8')

  assert.match(zrodlo, /aria-controls=\{idListyBledow\}/)
  assert.match(zrodlo, /aria-expanded=\{czyRozwinieta\}/)
  assert.match(zrodlo, /hidden=\{!czyRozwinieta\}/)
  assert.match(zrodlo, /\{czyRozwinieta \? '▲' : '▼'\}/)
  assert.match(zrodlo, /\{wszystkieListyRozwiniete \? 'Zwiń wszystkie' : 'Rozwiń wszystkie'\}/)
  assert.match(zrodlo, /onClick=\{\(\) => przejdzDoPolaFormularza\(blad\.pole, pozycja\.idSekcjiFormularza, blad\.idDocelowy\)\}/)
})

test('kliknięcie błędu przekazuje pole, przewija je i odświeża timer podświetlenia', () => {
  const wywolania: string[] = []
  const timery = new Map<number, () => void>()
  let kolejnyTimer = 1
  const poprzednieGlobalne = {
    CustomEvent: globalThis.CustomEvent,
    HTMLButtonElement: globalThis.HTMLButtonElement,
    HTMLInputElement: globalThis.HTMLInputElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    window: globalThis.window,
  }

  class ZdarzenieWlasne {
    detail: { pole: string }
    type: string

    constructor(typ: string, opcje: { detail: { pole: string } }) {
      this.type = typ
      this.detail = opcje.detail
    }
  }

  class PoleTestowe {
    classList = { add: (nazwa: string) => wywolania.push(`dodaj:${nazwa}`), remove: (nazwa: string) => wywolania.push(`usun:${nazwa}`) }
    focus() { wywolania.push('fokus') }
    scrollIntoView() { wywolania.push('przewin') }
  }

  const poleTestowe = new PoleTestowe()

  Object.assign(globalThis, {
    CustomEvent: ZdarzenieWlasne,
    HTMLButtonElement: class {},
    HTMLInputElement: PoleTestowe,
    HTMLSelectElement: class {},
    HTMLTextAreaElement: class {},
    document: { getElementById: (id: string) => (id === pobierzIdPola('odbiorca.email') ? poleTestowe : null) },
    requestAnimationFrame: (wykonaj: FrameRequestCallback) => { wykonaj(0); return 0 },
    window: {
      dispatchEvent: (zdarzenie: ZdarzenieWlasne) => { wywolania.push(`zdarzenie:${zdarzenie.detail.pole}`); return true },
      clearTimeout: (id: number) => { wywolania.push(`anuluj:${id}`); timery.delete(id) },
      setTimeout: (wykonaj: () => void) => { const id = kolejnyTimer++; timery.set(id, () => { timery.delete(id); wykonaj() }); return id },
    },
  })

  try {
    przejdzDoPolaFormularza('odbiorca.email', 'dane-klienta')
    przejdzDoPolaFormularza('odbiorca.email', 'dane-klienta')
    assert.ok(wywolania.includes('anuluj:1'))
    assert.equal(timery.has(1), false)
    assert.equal(timery.has(2), true)
    timery.get(2)?.()
    assert.equal(timery.size, 0)
    assert.equal(wywolania.filter((wywolanie) => wywolanie === 'usun:szczegoly-pole--wskazane').length, 1)
  } finally {
    Object.assign(globalThis, poprzednieGlobalne)
  }
})
