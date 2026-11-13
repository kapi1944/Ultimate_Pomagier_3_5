import assert from 'node:assert/strict'
import test from 'node:test'
import { strFromU8, unzipSync } from 'fflate'
import { utworzDocxProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/eksportDocxProgramu'
import { normalizujProgramSzkolenia, pobierzHtmlProgramuSzkolenia, utworzDokumentProgramuSzkolenia } from '../src/moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia'
import { rozpoznajKategorieWcieciaProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/oznaczeniaProgramu'

test('poziom konspektu jest niezależny od wcięcia i rodzaju listy', () => {
  const pozycje = ['1. Moduł', '1.2 Punkt', '1.2.3 Punkt', '1.2.3.4 Punkt', '1.2.3.4.5 Punkt', '• Punkt']
  assert.deepEqual(pozycje.map((tekst) => rozpoznajKategorieWcieciaProgramu(tekst)), ['1', '2', '3', '4', '4', 'punktory'])
  assert.equal(rozpoznajKategorieWcieciaProgramu('Automatyczna pozycja', 2), '3')
  for (const tekst of ['09:30 Przerwa', '09.30–10.00 Przerwa', '13.11.2026 Spotkanie', '1.5 godziny', '45 min', '12 uczestników']) {
    assert.equal(rozpoznajKategorieWcieciaProgramu(tekst), undefined, tekst)
  }
})

test('zapis i DOCX zachowują treść, numerację oraz wcięcie lokalne i wcięcie presetu', () => {
  const dane = normalizujProgramSzkolenia({
    trescProgramu: 'Dzień 1\n1. Moduł\n1.1 **Punkt A**\n1.2 Punkt B\n1.2.1 Szczegół\n• Wypunktowanie',
    ustawieniaWierszyProgramu: [{}, {}, { wciecieMm: 10 }, {}, {}, {}],
    ustawienia: { wcieciaPresetow: { DOTYCHCZASOWY: { 2: 5 }, SEMPER_KOMPAKTOWY: { 2: 15 } } },
  })
  const otwarty = normalizujProgramSzkolenia(JSON.parse(JSON.stringify(dane)))
  assert.match(pobierzHtmlProgramuSzkolenia(otwarty), /data-wciecie-mm="10" data-oznaczenie="1\.1"><p><strong>Punkt A<\/strong>/)
  const dokument = utworzDokumentProgramuSzkolenia(otwarty)
  const punkty = dokument.struktura.flatMap((dzien) => dzien.dzieci.flatMap((modul) => modul.dzieci))
  assert.deepEqual(punkty.map((punkt) => [punkt.dane?.oznaczenieWyswietlane, punkt.dane?.wciecieMm]), [
    ['1.1', 10], ['1.2', 5], ['1.2.1', null], ['•', null],
  ])
  const poZmianiePresetu = utworzDokumentProgramuSzkolenia({ ...otwarty, ustawienia: { ...otwarty.ustawienia, presetWygladu: 'SEMPER_KOMPAKTOWY' } })
  assert.equal(poZmianiePresetu.struktura.find((blok) => blok.typ === 'Dzien')?.dzieci[0].dzieci[1].dane?.wciecieMm, 15)
  const xml = strFromU8(unzipSync(utworzDocxProgramu(dokument, 'Szkolenie & warsztat', true))['word/document.xml'])
  assert.match(xml, /<w:ind w:left="897"\/>.*1\.1 .*<w:b\/>.*Punkt A/)
  assert.match(xml, /Szkolenie &amp; warsztat/)
  assert.doesNotMatch(xml, /<w:tab\b/)
})
