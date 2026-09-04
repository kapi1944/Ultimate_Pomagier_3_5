import assert from 'node:assert/strict'
import test from 'node:test'
import {
  czyBlokWidocznyNaStronie,
  deserializujKonfiguracjeSwobodnychBlokow,
  duplikujBlokSwobodny,
  normalizujBlokiSwobodneDokumentu,
  pobierzTekstBloku,
  pobierzZrodloObrazuBloku,
  przesunBlokSwobodny,
  serializujKonfiguracjeSwobodnychBlokow,
  zmienRozmiarBlokuSwobodnego,
} from '../src/wspolne/dokumenty/modelSwobodnychBlokow.ts'
import { normalizujProgramSzkolenia, utworzDokumentProgramuSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia.ts'
import { utworzKontekstSwobodnychBlokowProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/adapterSwobodnychBlokowProgramu.ts'

const bloki = normalizujBlokiSwobodneDokumentu([
  {
    id: 'dodatkowy-naglowek', typ: 'tekst', xMm: 20, yMm: 30, szerokoscMm: 170, wysokoscMm: 12,
    przypisanieDoStrony: { rodzaj: 'pierwsza' }, widoczny: true, indeksWarstwy: 4,
    dane: {
      zrodlo: { rodzaj: 'pole_danych', sciezka: 'szkolenie.tytul', tekstZastepczy: 'Program szkolenia' },
      rozmiarCzcionkiPt: 14, gruboscCzcionki: 700, rodzinaCzcionki: 'Arial', wyrownanie: 'srodek', interlinia: 1.3, kolor: '#222222',
    },
  },
  {
    id: 'logo', typ: 'obraz', xMm: 170, yMm: 8, szerokoscMm: 25, wysokoscMm: 14,
    przypisanieDoStrony: { rodzaj: 'kazda' }, widoczny: true, indeksWarstwy: 5,
    dane: { zrodlo: { rodzaj: 'zasob_organizatora', klucz: 'logo' }, tekstAlternatywny: 'Logo', zachowajProporcje: true, trybDopasowania: 'contain' },
  },
])

test('wspolny model normalizuje kompletna konfiguracje tekstu i obrazu', () => {
  assert.equal(bloki.length, 2)
  assert.deepEqual(bloki.map((blok) => [blok.id, blok.typ, blok.xMm, blok.yMm, blok.szerokoscMm, blok.wysokoscMm, blok.indeksWarstwy]), [
    ['dodatkowy-naglowek', 'tekst', 20, 30, 170, 12, 4],
    ['logo', 'obraz', 170, 8, 25, 14, 5],
  ])
  assert.equal(bloki[0]?.typ === 'tekst' ? bloki[0].dane.rodzinaCzcionki : undefined, 'Arial')
  assert.deepEqual(bloki.map((blok) => blok.rola), ['pole_tekstowe', 'logo'])
})

test('przypisanie do strony oraz dynamiczne zrodla sa rozstrzygane przez wspolny model', () => {
  const tekst = bloki[0]
  const obraz = bloki[1]
  assert.ok(tekst?.typ === 'tekst')
  assert.ok(obraz?.typ === 'obraz')
  assert.equal(czyBlokWidocznyNaStronie(tekst, 1), true)
  assert.equal(czyBlokWidocznyNaStronie(tekst, 2), false)
  assert.equal(czyBlokWidocznyNaStronie(obraz, 2), true)
  assert.equal(pobierzTekstBloku(tekst, { dane: { szkolenie: { tytul: 'Excel zaawansowany' } } }), 'Excel zaawansowany')
  assert.equal(pobierzZrodloObrazuBloku(obraz, { dane: {}, zasobyObrazow: { logo: 'data:image/png;base64,abc' } }), 'data:image/png;base64,abc')
})

test('Program przechowuje wspolna konfiguracje, a brak konfiguracji zachowuje dotychczasowy model', () => {
  const programZBlokami = normalizujProgramSzkolenia({
    tytulSzkolenia: 'Program z nakladka',
    trescProgramu: '1. Tresc strukturalna',
    ustawienia: { blokiSwobodne: bloki },
  })
  const dokumentZBlokami = utworzDokumentProgramuSzkolenia(programZBlokami)
  const programLegacy = normalizujProgramSzkolenia({ tytulSzkolenia: 'Program legacy', trescProgramu: '1. Dawna tresc' })
  const dokumentLegacy = utworzDokumentProgramuSzkolenia(programLegacy)

  assert.deepEqual(dokumentZBlokami.blokiSwobodne, bloki)
  assert.match(JSON.stringify(dokumentZBlokami.struktura), /Tresc strukturalna/)
  assert.equal(programLegacy.ustawienia.blokiSwobodne, undefined)
  assert.equal(dokumentLegacy.blokiSwobodne, undefined)
})

test('adapter Programu udostepnia wspolnemu modelowi pola i logotypy organizatora', () => {
  const program = normalizujProgramSzkolenia({ tytulSzkolenia: 'Program adaptera', logotypProgramu: 'data:logo-programu' })
  const kontekst = utworzKontekstSwobodnychBlokowProgramu(program, {
    nazwaOrganizatora: 'SEMPER',
    kontaktOrganizatora: 'Kontakt',
    stopkaOrganizatora: 'Stopka',
    logotypOrganizatora: 'data:logo-semper',
    mapaOrganizatora: 'data:mapa-semper',
  })

  assert.equal(kontekst.dane.tytulSzkolenia, 'Program adaptera')
  assert.equal(kontekst.zasobyObrazow?.logotyp_programu, 'data:logo-programu')
  assert.equal(kontekst.zasobyObrazow?.logotyp_organizatora, 'data:logo-semper')
  assert.equal(kontekst.zasobyObrazow?.mapa_organizatora, 'data:mapa-semper')
})

test('geometria jest zapisana w milimetrach, ograniczana do A4 i przyciagana do osi', () => {
  const blok = bloki[0]!
  const przyOsi = przesunBlokSwobodny(blok, 105 - (blok.xMm + blok.szerokoscMm / 2) + 1, 0, 2)
  assert.equal(przyOsi.blok.xMm + przyOsi.blok.szerokoscMm / 2, 105)
  assert.equal(przyOsi.prowadnice.pionowa, 105)
  const pozaStrona = przesunBlokSwobodny(blok, 500, 500, 0).blok
  assert.equal(pozaStrona.xMm + pozaStrona.szerokoscMm, 210)
  assert.equal(pozaStrona.yMm + pozaStrona.wysokoscMm, 297)
  const rozmiar = zmienRozmiarBlokuSwobodnego(blok, 80, 5, true)
  assert.equal(rozmiar.szerokoscMm / rozmiar.wysokoscMm, blok.szerokoscMm / blok.wysokoscMm)
})

test('konfiguracja ma wersje schematu, czyta zapis legacy i duplikuje bez dzielenia tozsamosci', () => {
  const zapis = serializujKonfiguracjeSwobodnychBlokow(bloki)
  assert.match(zapis, /"wersjaSchematu":2/)
  assert.deepEqual(deserializujKonfiguracjeSwobodnychBlokow(zapis), bloki)
  assert.deepEqual(deserializujKonfiguracjeSwobodnychBlokow(JSON.stringify(bloki)), bloki)
  const kopia = duplikujBlokSwobodny(bloki[0]!, 'kopia-1')
  assert.equal(kopia.id, 'kopia-1')
  assert.equal(kopia.pochodzenie, 'uzytkownik')
  assert.equal(kopia.zablokowany, false)
  assert.equal(kopia.rola, 'element_opcjonalny_uzytkownika')
})

test('normalizacja nadaje powielonym identyfikatorom stabilne unikalne wartosci', () => {
  const zDuplikatem = normalizujBlokiSwobodneDokumentu([bloki[0], bloki[0], { ...bloki[0], id: 'dodatkowy-naglowek-2' }])
  assert.deepEqual(zDuplikatem.map((blok) => blok.id), ['dodatkowy-naglowek', 'dodatkowy-naglowek-2', 'dodatkowy-naglowek-2-2'])
})
