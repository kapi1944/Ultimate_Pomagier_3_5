import assert from 'node:assert/strict'
import { rozpoznajOznaczenieProgramu, wyznaczOznaczeniaProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/oznaczeniaProgramu'
import { normalizujProgramSzkolenia, parsujProgramZModelu, utworzDokumentProgramuSzkolenia, pobierzSeparatorTytuluDnia, type SeparatorTytuluDniaProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia'
import { zapiszProgramWRejestrze, pobierzProgramPoId } from '../src/moduly/dokumenty/generatory/programy_szkolen/rejestrProgramowSzkolen'
import { konwertujTekstProgramuNaHtml } from '../src/moduly/dokumenty/generatory/programy_szkolen/komponenty/konwersjaProgramuWysiwyg'
import { utworzModelPaginacjiProgramu, paginujProgram } from '../src/moduly/dokumenty/generatory/programy_szkolen/paginatorProgramu'
import { pobierzGruboscTekstuPozycjiListyProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/stylPozycjiListyProgramu.ts'

assert.equal(pobierzGruboscTekstuPozycjiListyProgramu(0, true), 700, 'poziom glowny powinien byc pogrubiony')
assert.equal(pobierzGruboscTekstuPozycjiListyProgramu(1, true), 400, 'podpunkt poziomu 2 powinien pozostac zwykly')
assert.equal(pobierzGruboscTekstuPozycjiListyProgramu(2, true), 400, 'podpunkt poziomu 3 powinien pozostac zwykly')

console.log('OK: pogrubienie obejmuje wylacznie glowny poziom listy programu')

for (const prefiks of ['1.', '7)', 'I.', 'IV)', 'a)', 'b.', '•', '◦', '▪', '-']) {
  assert.equal(rozpoznajOznaczenieProgramu(`${prefiks} Treść`)?.oznaczenie.zapis, prefiks)
  assert.equal(rozpoznajOznaczenieProgramu(`${prefiks} Treść`)?.tresc, 'Treść')
}
assert.equal(rozpoznajOznaczenieProgramu('2026 rok szkolenia'), null)
assert.equal(rozpoznajOznaczenieProgramu('art. 1 ustawy'), null)
assert.equal(rozpoznajOznaczenieProgramu('c) Trzeci podpunkt')?.oznaczenie.rodzaj, 'literowe')
assert.equal(rozpoznajOznaczenieProgramu('d) Czwarty podpunkt')?.oznaczenie.wartosc, 4)
assert.deepEqual(parsujProgramZModelu(normalizujProgramSzkolenia({ trescProgramu: 'I. Pierwszy\n1) Drugi\na) Trzeci' })).listaProsta.map((pozycja) => pozycja.poziom), [0, 0, 1], 'podpunkt literowy należy do poprzedniego punktu numerowanego')

const trescHierarchii = '1. Organizacja\na. Cykl\nb. Odpowiedzialność\n• Wymagania\n\t1. Zagnieżdżony\n2. Analiza\na. Rynek'
for (const czyPogrubiac of [false, true]) {
  const modelHierarchii = normalizujProgramSzkolenia({ trescProgramu: trescHierarchii })
  const pozycje = parsujProgramZModelu(modelHierarchii).listaProsta
  assert.deepEqual(pozycje.map((pozycja) => pozycja.poziom), [0, 1, 1, 1, 1, 0, 1])
  assert.deepEqual(pozycje.map((pozycja) => pobierzGruboscTekstuPozycjiListyProgramu(pozycja.poziom, czyPogrubiac)), czyPogrubiac ? [700, 400, 400, 400, 400, 700, 400] : Array(7).fill(400))
  modelHierarchii.ustawieniaWierszyProgramu = [{ poziom: 1 }, { poziom: 0 }]
  const dokumentHierarchii = utworzDokumentProgramuSzkolenia(modelHierarchii)
  const blokiHierarchii = dokumentHierarchii.struktura.filter((blok) => blok.typ === 'Punkt' || blok.typ === 'Podpunkt')
  assert.deepEqual(blokiHierarchii.slice(0, 2).map((blok) => pobierzGruboscTekstuPozycjiListyProgramu(blok.stylLokalny.wciecie ?? 0, czyPogrubiac)), czyPogrubiac ? [400, 700] : [400, 400])
}
const naglowki = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const programZeZrzutu = parsujProgramZModelu(normalizujProgramSzkolenia({ trescProgramu: naglowki.map((numer) => `**${numer}. Nagłówek programu**\nPierwszy akapit\nDrugi akapit`).join('\n\n') }))
assert.equal(programZeZrzutu.listaProsta.length, 21)
assert.deepEqual(programZeZrzutu.listaProsta.filter((pozycja) => pozycja.poziom === 0).map((pozycja) => pozycja.oznaczenie?.zapis), naglowki.map((numer) => `${numer}.`))

const model = normalizujProgramSzkolenia({ trescProgramu: '**I. Wprowadzenie do zmian w Prawie budowlanym 2026**\nPierwszy osobny wiersz bez kropki\nDrugi osobny wiersz\nII. Obowiązki inwestora\n1) Dokumentacja\n\ta) Wzór\n\tb) Kontrola\n2) Zmiany\n\ta) Kolejny wzór' })
const program = parsujProgramZModelu(model)
assert.equal(program.listaProsta.length, 9)
assert.deepEqual(program.listaProsta.slice(0, 4).map((pozycja) => pozycja.poziom), [0, 1, 1, 0])
assert.equal(program.listaProsta[0].oznaczenie?.zapis, 'I.')
assert.equal(program.listaProsta[1].tresc, 'Pierwszy osobny wiersz bez kropki')
const dokument = utworzDokumentProgramuSzkolenia(model)
assert.equal(dokument.struktura[1].dane?.oznaczenieWyswietlane, 'I.')
assert.equal(dokument.struktura[1].tresc, '**Wprowadzenie do zmian w Prawie budowlanym 2026**')
assert.equal(dokument.struktura[2].dane?.oznaczenieWyswietlane, '◦')

assert.deepEqual(wyznaczOznaczeniaProgramu([
  { poziom: 0, oryginalne: '7)', wartosc: 7 }, { poziom: 1, oryginalne: 'a)', wartosc: 1 },
  { poziom: 1, oryginalne: 'b)', wartosc: 2, styl: 'brak' }, { poziom: 0, oryginalne: '8)', wartosc: 8 },
  { poziom: 1, oryginalne: 'a)', wartosc: 1 },
], ['rzymskie.', 'literowe)'], '•'), ['I.', 'a)', '', 'II.', 'a)'])
assert.deepEqual(wyznaczOznaczeniaProgramu([{ poziom: 0, oryginalne: '7)', wartosc: 7 }, { poziom: 0 }], [], 'arabskie.'), ['7)', '8.'])

const html = konwertujTekstProgramuNaHtml('7) Pierwszy\n\ta) Podpunkt\n8) Drugi')
assert.match(html, /<ol type="1" start="7">/)
assert.match(html, /<ol type="a" start="1">/)
assert.equal((html.match(/<li /g) ?? []).length, (html.match(/<\/li>/g) ?? []).length)
assert.match(konwertujTekstProgramuNaHtml('a) Treść', [{ styl: 'brak' }]), /data-styl-oznaczenia="brak"/)

const zmieniony = normalizujProgramSzkolenia({ ...model, ustawieniaWierszyProgramu: [{ styl: 'brak' }], ustawienia: { ...model.ustawienia, oznaczeniaPoziomow: ['arabskie)', 'literowe)'] } })
const zmienionyDokument = utworzDokumentProgramuSzkolenia(zmieniony)
assert.equal(zmienionyDokument.struktura[1].dane?.oznaczenieWyswietlane, '')
assert.equal(zmienionyDokument.struktura[2].dane?.oznaczenieWyswietlane, 'a)')
assert.deepEqual(normalizujProgramSzkolenia(JSON.parse(JSON.stringify(zmieniony))), zmieniony)

const modelPaginacji = utworzModelPaginacjiProgramu(zmienionyDokument)
assert.equal(modelPaginacji.dni[0].moduly[0].grupyPunktow[0].bloki[0].dane?.oznaczenieWyswietlane, '')
const modul = modelPaginacji.dni[0].moduly[0]
const strony = paginujProgram(modelPaginacji, {
  pojemnoscPierwszejStrony: 70, pojemnoscKolejnychStron: 70, wysokosciNaglowkowDni: {},
  wysokoscOdstepuMiedzyDniami: 0, wysokoscOdstepuMiedzyModulami: 0, wysokoscOdstepuMiedzyPunktami: 0,
  moduly: { [modul.id]: { wysokoscCalego: 180, wysokoscBazyZTytulem: 0, wysokoscBazyBezTytulu: 0, wysokosciGrup: Object.fromEntries(modul.grupyPunktow.map((grupa) => [grupa.id, 60])) } },
}).strony
assert.ok(strony.length > 1)
assert.deepEqual(strony.flatMap((strona) => strona.fragmentyDni.flatMap((dzien) => dzien.moduly.flatMap((fragment) => fragment.grupyPunktow.flatMap((grupa) => grupa.bloki.map((blok) => blok.dane?.oznaczenieWyswietlane))))), zmienionyDokument.struktura.slice(1).map((blok) => blok.dane?.oznaczenieWyswietlane))
console.log('OK: oryginalne oznaczenia, poziomy, zmiana stylu i zgodność zapisu programu')

const tytulDnia = 'VAT – zasady rozliczania: art. 1.'
for (const etykieta of ['DZIEŃ I', 'DZIEŃ II', 'DZIEŃ III', 'DZIEŃ 1', 'Dzień 2']) {
  for (const separatorWejscia of [' – ', ' - ', ' — ', ': ', '. ', '\n']) {
    const wczytany = parsujProgramZModelu(normalizujProgramSzkolenia({ trescProgramu: `${etykieta}${separatorWejscia}${tytulDnia}\n1. Zasady` }))
    assert.equal(wczytany.dni[0].tytulDnia, tytulDnia, `${etykieta}${separatorWejscia} nie może zmieniać interpunkcji tytułu`)
  }
}
const programDnia = normalizujProgramSzkolenia({ trescProgramu: `DZIEŃ I – ${tytulDnia}\n1. Zasady` })
assert.equal(programDnia.ustawienia.separatorTytuluDnia, 'myslnik', 'starszy zapis otrzymuje domyślną półpauzę')
assert.equal(normalizujProgramSzkolenia({ ustawienia: { separatorTytuluDnia: 'nieznany' } }).ustawienia.separatorTytuluDnia, 'myslnik')
const warianty: [SeparatorTytuluDniaProgramu, string][] = [
  ['myslnik', ' – '], ['dwukropek', ': '], ['kropka', '. '], ['nowa-linia', '\n'], ['myslnik', ' – '],
]
const trescZrodlowa = programDnia.trescProgramu
const blokiZrodlowe = utworzDokumentProgramuSzkolenia(programDnia).struktura
const magazynSeparatora = new Map<string, string>()
globalThis.localStorage = {
  getItem: (klucz: string) => magazynSeparatora.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => { magazynSeparatora.set(klucz, wartosc) },
  removeItem: (klucz: string) => { magazynSeparatora.delete(klucz) },
  clear: () => magazynSeparatora.clear(),
  key: (indeks: number) => [...magazynSeparatora.keys()][indeks] ?? null,
  get length() { return magazynSeparatora.size },
}
for (const [separatorTytuluDnia, separator] of warianty) {
  const wariant = normalizujProgramSzkolenia({ ...programDnia, ustawienia: { ...programDnia.ustawienia, separatorTytuluDnia } })
  const dzien = parsujProgramZModelu(wariant).dni[0]
  assert.equal(`${dzien.tytul}${pobierzSeparatorTytuluDnia(separatorTytuluDnia)}${dzien.tytulDnia}`, `Dzień I${separator}${tytulDnia}`)
  assert.equal(wariant.trescProgramu, trescZrodlowa)
  assert.deepEqual(utworzDokumentProgramuSzkolenia(wariant).struktura, blokiZrodlowe, 'zmiana stylu nie zmienia bloków treści')
  const zapisany = zapiszProgramWRejestrze({
    tryb: 'zapisz', tytul: 'Separator dnia', statusBiznesowy: 'robocza', daneDokumentu: wariant,
    metadane: { organizator: 'SEMPER', liczbaDni: 1, liczbaModulow: 1, czyWynikParsowaniaZatwierdzony: false },
  })
  assert.equal(pobierzProgramPoId(zapisany.id)?.daneDokumentu.ustawienia.separatorTytuluDnia, separatorTytuluDnia)
  assert.equal(pobierzProgramPoId(zapisany.id)?.daneDokumentu.trescProgramu, trescZrodlowa)
}
console.log('OK: separatory dnia, interpunkcja tytułu, fallback i zapis w rejestrze dokumentów')
