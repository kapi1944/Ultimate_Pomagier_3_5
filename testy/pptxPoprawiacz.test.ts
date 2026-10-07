import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { analizujPrezentacje, wykryjReguleSemper } from '../src/moduly/narzedzia/poprawiacz_prezentacji/analiza/analizujPrezentacje'
import { otworzPptx } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/otworzPptx'
import { cmNaEmu, emuNaCm, emuNaMm, emuNaProcent, mmNaEmu, procentNaEmu } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/geometriaPptx'
import { parsujXmlPptx } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/xmlPptx'
import { odczytajObiektySlajdu } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/slajdyPptx'
import { zastosujPoprawki } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/zastosujPoprawki'
import { nazwaPoprawionejPrezentacji, pobierzKopiePptx, zapiszPptx } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/zapiszPptx'
import { poczatkowyStanPoprawiacza, zmienStanPoprawiacza } from '../src/moduly/narzedzia/poprawiacz_prezentacji/modele/stanPoprawiacza'
import { ksztaltTestowy, utworzFixturePptx, xmlSlajdu } from './fixturePptx'

Object.defineProperty(globalThis, 'DOMParser', { value: DOMParser, configurable: true })
Object.defineProperty(globalThis, 'XMLSerializer', { value: XMLSerializer, configurable: true })

test('kolejnosc slajdow wynika z presentation.xml i rels, nie nazw plikow', async () => {
  const model = await otworzPptx(await utworzFixturePptx())
  assert.deepEqual(model.slajdy.map((slajd) => slajd.czesc), ['ppt/slides/slide3.xml', 'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml'])
  assert.deepEqual(model.slajdy.map((slajd) => slajd.numer), [1, 2, 3])
  assert.equal(model.slajdy[0].szerokosc, 10000000)
  assert.equal(model.slajdy[0].wysokosc, 6000000)
  assert.ok(model.czesciXml.has('ppt/slideLayouts/slideLayout1.xml'))
  assert.ok(model.czesciXml.has('ppt/slideMasters/slideMaster1.xml'))
  assert.ok(model.czesciXml.has('ppt/theme/theme1.xml'))
  assert.ok(model.czesciXml.has('ppt/slides/_rels/slide1.xml.rels'))
})

test('konwersje EMU cm mm procent zachowuja jednostki i zaokraglaja do EMU', () => {
  assert.equal(cmNaEmu(2.54), 914400)
  assert.equal(emuNaCm(914400), 2.54)
  assert.equal(mmNaEmu(10), 360000)
  assert.equal(emuNaMm(360000), 10)
  assert.equal(emuNaProcent(2500000, 10000000), 25)
  assert.equal(procentNaEmu(25, 10000000), 2500000)
  assert.equal(emuNaProcent(10, 0), 0)
})

test('detektor wykrywa wylacznie pasek o wskazanym kolorze i geometrii', async () => {
  const slajd = (await otworzPptx(await utworzFixturePptx())).slajdy[0]
  const pasek = slajd.obiekty[0]
  assert.equal(wykryjReguleSemper(pasek, slajd), 'GÓRNY_PASEK')
  assert.equal(wykryjReguleSemper(slajd.obiekty[2], slajd), null)
  for (const zmiana of [{ x: 300000 }, { y: 200000 }, { cx: 9300000 }, { cy: 220000 }, { x: -10 }]) {
    assert.equal(wykryjReguleSemper({ ...pasek, geometria: { ...pasek.geometria!, ...zmiana } }, slajd), null)
  }
  assert.equal(wykryjReguleSemper({ ...pasek, wypelnienie: '#087F8D' }, slajd), null)
  assert.equal(wykryjReguleSemper({ ...pasek, ksztalt: 'ellipse' }, slajd), null)
  assert.equal(wykryjReguleSemper({ ...pasek, czyProstaGeometria: false }, slajd), null)
  const przezroczysty = xmlSlajdu(ksztaltTestowy(2, 0, 0, 10000000, 120000).replace('val="087F8C"/>', 'val="087F8C"><a:alpha val="50000"/></a:srgbClr>'))
  assert.equal(wykryjReguleSemper(odczytajObiektySlajdu(parsujXmlPptx(przezroczysty, 'test'))[0], slajd), null)
})

test('detektor numeracji wymaga malego pola w prawym dolnym rogu z 1–3 cyframi', async () => {
  const slajd = (await otworzPptx(await utworzFixturePptx())).slajdy[0]
  const numer = slajd.obiekty[1]
  assert.equal(wykryjReguleSemper(numer, slajd), 'NUMERACJA')
  for (const tekst of ['Rok 2026', '3 / 12', '1000', '1.2', '12\n34', '']) {
    assert.equal(wykryjReguleSemper({ ...numer, tekst }, slajd), null)
  }
  assert.equal(wykryjReguleSemper({ ...numer, tekst: ' 123 ' }, slajd), 'NUMERACJA')
  assert.equal(wykryjReguleSemper({ ...numer, geometria: { ...numer.geometria!, x: 5000000 } }, slajd), null)
  assert.equal(wykryjReguleSemper({ ...numer, geometria: { ...numer.geometria!, y: 3000000 } }, slajd), null)
  assert.equal(wykryjReguleSemper({ ...numer, geometria: { ...numer.geometria!, cx: 1300000 } }, slajd), null)
  const dwaWiersze = xmlSlajdu(ksztaltTestowy(2, 8800000, 5400000, 600000, 300000, '1').replace('<a:t>1</a:t></a:r>', '<a:t>1</a:t></a:r><a:br/><a:r><a:t>2</a:t></a:r>'))
  const pole = odczytajObiektySlajdu(parsujXmlPptx(dwaWiersze, 'test'))[0]
  assert.equal(pole.tekst, '1\n2')
  assert.equal(wykryjReguleSemper(pole, slajd), null)
})

test('analiza zlicza powtarzalne obiekty slajdow, pomijajac master i layout', async () => {
  const model = await otworzPptx(await utworzFixturePptx())
  const wynik = analizujPrezentacje(model)
  assert.equal(wynik.problemy.length, 4)
  assert.deepEqual(wynik.problemy.map((problem) => problem.numerSlajdu), [1, 1, 2, 2])
  assert.ok(wynik.powtarzalne.some((grupa) => grupa.liczba === 2 && grupa.opis === 'prostokąt – górna krawędź'))
  assert.ok(wynik.powtarzalne.some((grupa) => grupa.liczba === 2 && grupa.opis === 'małe pole numeryczne – prawy dolny róg'))
})

test('model odczytuje obrazy tabele grupy i przelicza wspolrzedne dzieci grupy', () => {
  const obraz = '<p:pic><p:nvPicPr><p:cNvPr id="8" name="Zdjęcie"/></p:nvPicPr><p:spPr><a:xfrm><a:off x="100" y="200"/><a:ext cx="300" cy="400"/></a:xfrm></p:spPr></p:pic>'
  const tabela = '<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="9" name="Tabela"/></p:nvGraphicFramePr><p:xfrm><a:off x="10" y="20"/><a:ext cx="300" cy="400"/></p:xfrm><a:graphic><a:graphicData><a:tbl><a:tblGrid><a:gridCol w="100"/></a:tblGrid><a:tr h="50"><a:tc/></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>'
  const grupa = `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="10" name="Grupa"/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="1000" y="2000"/><a:ext cx="200" cy="400"/><a:chOff x="10" y="20"/><a:chExt cx="100" cy="200"/></a:xfrm></p:grpSpPr>${ksztaltTestowy(11, 10, 20, 50, 50, 'Tekst')}</p:grpSp>`
  const obiekty = odczytajObiektySlajdu(parsujXmlPptx(xmlSlajdu(obraz + tabela + grupa), 'test'))
  assert.deepEqual(obiekty.map((obiekt) => obiekt.typ), ['obraz', 'ramka', 'grupa', 'ksztalt'])
  assert.deepEqual(obiekty[1].tabela, { wiersze: 1, kolumny: 1 })
  assert.deepEqual(obiekty[3].geometria, { x: 1000, y: 2000, cx: 100, cy: 100 })
  assert.equal(obiekty[3].tekst, 'Tekst')
  assert.equal(obiekty[3].linia, '#000000')
})

test('poprawki usuwaja konkretne shape DOM i zachowuja wszystkie pozostale czesci ZIP', async () => {
  const bufor = await utworzFixturePptx()
  const oryginal = new Uint8Array(bufor.slice(0))
  const model = await otworzPptx(bufor)
  const wynik = await zastosujPoprawki(model, ['GÓRNY_PASEK', 'NUMERACJA'])
  assert.deepEqual(wynik.raport, { paski: 2, numery: 2, slajdy: [1, 2] })
  assert.equal(analizujPrezentacje(wynik.model).problemy.length, 0)
  assert.equal(analizujPrezentacje(model).problemy.length, 4)
  assert.deepEqual(new Uint8Array(bufor), oryginal)
  assert.deepEqual(wynik.model.slajdy[0].obiekty.map((obiekt) => obiekt.id), ['4', '5'])
  assert.equal(wynik.model.slajdy[0].obiekty[0].wypelnienie, '#087F8C')
  assert.equal(wynik.model.slajdy[0].obiekty[1].tekst, 'Rok 2026')
  assert.deepEqual(Object.keys(wynik.model.archiwum.files).sort(), Object.keys(model.archiwum.files).sort())
  assert.equal(wynik.model.archiwum.comment, model.archiwum.comment)
  for (const plik of Object.values(model.archiwum.files)) {
    if (!plik.dir && !['ppt/slides/slide1.xml', 'ppt/slides/slide3.xml'].includes(plik.name)) {
      assert.deepEqual(await wynik.model.archiwum.file(plik.name)!.async('uint8array'), await plik.async('uint8array'), plik.name)
    }
  }
})

test('wybor tylko jednej operacji zachowuje pozostale trafienia i umozliwia kolejna poprawke', async () => {
  const model = await otworzPptx(await utworzFixturePptx())
  const paski = await zastosujPoprawki(model, ['GÓRNY_PASEK'])
  assert.deepEqual(paski.raport, { paski: 2, numery: 0, slajdy: [1, 2] })
  assert.deepEqual(analizujPrezentacje(paski.model).problemy.map((problem) => problem.typ), ['NUMERACJA', 'NUMERACJA'])
  const numery = await zastosujPoprawki(paski.model, ['NUMERACJA'])
  assert.equal(numery.raport.numery, 2)
  await assert.rejects(zastosujPoprawki(numery.model, ['NUMERACJA']), /Brak zaznaczonych/)
  await assert.rejects(zastosujPoprawki(model, []), /Brak zaznaczonych/)
})

test('obiekt powiazany z animacja nie jest usuwany i nie zmienia oryginalnego archiwum', async () => {
  const model = await otworzPptx(await utworzFixturePptx('<p:timing><p:tnLst><p:spTgt spid="2"/></p:tnLst></p:timing>'))
  await assert.rejects(zastosujPoprawki(model, ['GÓRNY_PASEK']), /animację lub połączenie/)
  assert.equal(analizujPrezentacje(model).problemy.length, 4)
})

test('uszkodzony ZIP, brak slajdu i niepoprawne wymiary zatrzymuja analize', async () => {
  await assert.rejects(otworzPptx(new Uint8Array([1, 2, 3]).buffer))
  const archiwum = await JSZip.loadAsync(await utworzFixturePptx())
  archiwum.remove('ppt/slides/slide3.xml')
  await assert.rejects(otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer' })), /Brak części slajdu/)
  const bezWymiarow = await JSZip.loadAsync(await utworzFixturePptx())
  bezWymiarow.file('ppt/presentation.xml', (await bezWymiarow.file('ppt/presentation.xml')!.async('string')).replace('cx="10000000"', 'cx="0"'))
  await assert.rejects(otworzPptx(await bezWymiarow.generateAsync({ type: 'arraybuffer' })), /wymiarów/)
  assert.throws(() => parsujXmlPptx('<!DOCTYPE xml><xml/>', 'test'), /DTD/)
})

test('pobieranie nowej kopii usuwa link i zwalnia URL takze przy bledzie klikniecia', (kontekst) => {
  const oryginalnyDokument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const oryginalneOkno = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const odroczone: (() => void)[] = []
  let czyUsuniety = false
  let czyBlad = false
  const link = { href: '', download: '', click() { if (czyBlad) throw new Error('Błąd pobierania') }, remove() { czyUsuniety = true } }
  Object.defineProperty(globalThis, 'document', { value: { createElement: () => link, body: { appendChild: () => undefined } }, configurable: true })
  Object.defineProperty(globalThis, 'window', { value: { setTimeout: (funkcja: () => void) => { odroczone.push(funkcja) } }, configurable: true })
  kontekst.mock.method(URL, 'createObjectURL', () => 'blob:kopia-testowa')
  const zwolnij = kontekst.mock.method(URL, 'revokeObjectURL', () => undefined)
  try {
    pobierzKopiePptx(new Blob(['pptx']), 'Oryginał.pptx')
    assert.equal(link.download, 'Oryginał_POPRAWIONA.pptx')
    assert.equal(czyUsuniety, true)
    assert.equal(zwolnij.mock.callCount(), 0)
    odroczone.shift()!()
    assert.deepEqual(zwolnij.mock.calls[0].arguments, ['blob:kopia-testowa'])
    czyBlad = true
    assert.throws(() => pobierzKopiePptx(new Blob(['pptx']), 'Oryginał.pptx'), /Błąd pobierania/)
    odroczone.shift()!()
    assert.equal(zwolnij.mock.callCount(), 2)
  } finally {
    if (oryginalnyDokument) Object.defineProperty(globalThis, 'document', oryginalnyDokument)
    else Reflect.deleteProperty(globalThis, 'document')
    if (oryginalneOkno) Object.defineProperty(globalThis, 'window', oryginalneOkno)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

test('eksport ma poprawny MIME i nowa nazwe a stan blokuje wymiane pliku podczas operacji', async () => {
  const model = await otworzPptx(await utworzFixturePptx())
  assert.equal(nazwaPoprawionejPrezentacji('Szkolenie.PPTX'), 'Szkolenie_POPRAWIONA.pptx')
  const blob = await zapiszPptx(model)
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  assert.equal((await otworzPptx(await blob.arrayBuffer())).slajdy.length, 3)
  const wczytany = zmienStanPoprawiacza(poczatkowyStanPoprawiacza, { typ: 'WYBIERZ_PLIK', pliki: [new File(['pptx'], 'test.pptx')] })
  const zajety = zmienStanPoprawiacza(wczytany, { typ: 'ROZPOCZNIJ_ANALIZE' })
  assert.equal(zmienStanPoprawiacza(zajety, { typ: 'USUN_PLIK' }), zajety)
  const wynik = zmienStanPoprawiacza(zajety, { typ: 'ZAKONCZ_ANALIZE', model, analiza: analizujPrezentacje(model) })
  assert.equal(wynik.stan, 'PRZEANALIZOWANO')
  assert.equal(wynik.model, model)
  const kolejny = zmienStanPoprawiacza(wynik, { typ: 'WYBIERZ_PLIK', pliki: [new File(['pptx'], 'kolejny.pptx')] })
  assert.equal(kolejny.model, null)
  assert.equal(kolejny.analiza, null)
})
