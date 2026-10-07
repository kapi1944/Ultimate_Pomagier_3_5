import assert from 'node:assert/strict'
import test from 'node:test'
import { pobierzSciezkeNarzedzia, pobierzWidokNarzedziaZeSciezki } from '../src/aplikacja/nawigacja/konfiguracjaNarzedzi'
import { pobierzSciezkeGeneratora, pobierzWidokGeneratoraZeSciezki } from '../src/aplikacja/nawigacja/konfiguracjaGeneratorow'
import { poczatkowyStanPoprawiacza, zmienStanPoprawiacza } from '../src/moduly/narzedzia/poprawiacz_prezentacji/modele/stanPoprawiacza'

test('trasy narzedzi dzialaja w obu kierunkach poza konfiguracja generatorow', () => {
  for (const [widok, sciezka] of [
    ['narzedzia', '/narzedzia'],
    ['poprawiacz_prezentacji', '/narzedzia/poprawiacz-prezentacji'],
  ] as const) {
    assert.equal(pobierzSciezkeNarzedzia(widok), sciezka)
    assert.equal(pobierzWidokNarzedziaZeSciezki(sciezka), widok)
    assert.equal(pobierzSciezkeGeneratora(widok), undefined)
    assert.equal(pobierzWidokGeneratoraZeSciezki(sciezka), undefined)
  }
  assert.equal(pobierzSciezkeNarzedzia('dokumenty'), undefined)
  assert.equal(pobierzWidokNarzedziaZeSciezki('/narzedzia/nieznane'), undefined)
  assert.equal(pobierzWidokNarzedziaZeSciezki('/dokumenty/programy-szkolen'), undefined)
})

test('wybor, wymiana i usuniecie PPTX zachowuja nazwe, rozmiar i referencje pliku', () => {
  const plik = new File(['prezentacja'], 'szkolenie.PPTX')
  const wczytany = zmienStanPoprawiacza(poczatkowyStanPoprawiacza, { typ: 'WYBIERZ_PLIK', pliki: [plik] })
  assert.equal(wczytany.stan, 'PLIK_WCZYTANY')
  assert.equal(wczytany.prezentacja?.plik, plik)
  assert.equal(wczytany.prezentacja?.nazwa, plik.name)
  assert.equal(wczytany.prezentacja?.rozmiar, plik.size)
  assert.equal(wczytany.blad, null)
  const drugiPlik = new File(['druga'], 'inna.pptx')
  const wymieniony = zmienStanPoprawiacza(wczytany, { typ: 'WYBIERZ_PLIK', pliki: [drugiPlik] })
  assert.equal(wymieniony.prezentacja?.plik, drugiPlik)
  const usuniety = zmienStanPoprawiacza(wymieniony, { typ: 'USUN_PLIK' })
  assert.deepEqual(usuniety, poczatkowyStanPoprawiacza)
  assert.equal(zmienStanPoprawiacza(usuniety, { typ: 'WYBIERZ_PLIK', pliki: [plik] }).stan, 'PLIK_WCZYTANY')
})

test('bledny wybor nie zastepuje wybranej prezentacji i mozna go poprawic', () => {
  const plik = new File(['prezentacja'], 'szkolenie.pptx')
  const poprawny = zmienStanPoprawiacza(poczatkowyStanPoprawiacza, { typ: 'WYBIERZ_PLIK', pliki: [plik] })
  for (const pliki of [[], [new File(['tekst'], 'tekst.txt')], [new File([], 'pusta.pptx')], [plik, plik]]) {
    const bledny = zmienStanPoprawiacza(poczatkowyStanPoprawiacza, { typ: 'WYBIERZ_PLIK', pliki })
    assert.equal(bledny.stan, 'BLAD')
    assert.ok(bledny.blad)
    assert.equal(bledny.prezentacja, null)
    const zachowany = zmienStanPoprawiacza(poprawny, { typ: 'WYBIERZ_PLIK', pliki })
    assert.equal(zachowany.prezentacja, poprawny.prezentacja)
    assert.equal(zachowany.stan, 'PLIK_WCZYTANY')
    assert.ok(zachowany.blad)
    assert.equal(zmienStanPoprawiacza(bledny, { typ: 'WYBIERZ_PLIK', pliki: [plik] }).blad, null)
  }
})
