import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { otworzPptx } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/otworzPptx'
import { korygujUklad } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/korygujUklad'
import { zastosujMapowanie, zaproponujMapowanie, pusteDaneOkladki } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/mapowanieDanych'
import { wypelnijSzablonOkladki } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/okladkiSemper'
import { przygotujPlanDruku, domyslneUstawieniaDruku, dopasujProporcjonalnie, obszaryNaStronie, odczytajZakresSlajdow } from '../src/moduly/narzedzia/poprawiacz_prezentacji/eksport/planDruku'
import { wygenerujKompletZip } from '../src/moduly/narzedzia/poprawiacz_prezentacji/eksport/eksportMaterialow'
import { potomkowieXml } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/xmlPptx'
import { ksztaltTestowy, utworzFixturePptx, xmlSlajdu, przestrzenRelacji, przestrzenPrezentacji } from './fixturePptx'

Object.defineProperty(globalThis, 'DOMParser', { value: DOMParser, configurable: true })
Object.defineProperty(globalThis, 'XMLSerializer', { value: XMLSerializer, configurable: true })

async function utworzLiczbeSlajdow(liczba: number) {
  const archiwum = await JSZip.loadAsync(await utworzFixturePptx())
  archiwum.file('ppt/presentation.xml', `<p:presentation xmlns:p="${przestrzenPrezentacji}" xmlns:r="${przestrzenRelacji}"><p:sldIdLst>${Array.from({ length: liczba }, (_, indeks) => `<p:sldId id="${indeks + 256}" r:id="rId${indeks + 1}"/>`).join('')}</p:sldIdLst><p:sldSz cx="10000000" cy="6000000"/></p:presentation>`)
  archiwum.file('ppt/_rels/presentation.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({ length: liczba }, (_, indeks) => `<Relationship Id="rId${indeks + 1}" Type="${przestrzenRelacji}/slide" Target="slides/slide${indeks + 1}.xml"/>`).join('')}</Relationships>`)
  for (let numer = 1; numer <= liczba; numer++) archiwum.file(`ppt/slides/slide${numer}.xml`, xmlSlajdu(ksztaltTestowy(2, 500000, 800000, 2000000, 400000, `Slajd ${numer}`, 'FFFFFF')))
  return otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer' }))
}

for (const liczba of [1, 10, 99, 100, 101, 292]) {
  test(`prezentacja ${liczba} slajdow: kolejnosc, wymiary, wzorce, edytowalnosc i liczba stron druku`, async () => {
    const model = await utworzLiczbeSlajdow(liczba)
    const oryginal = new Uint8Array(model.buforZrodlowy.slice(0))
    const wynik = await korygujUklad(model, { szerokoscCm: 30, wysokoscCm: 20.5, czyKorygowacUklad: true, czyUsuwacDuplikaty: true })
    assert.equal(wynik.model.slajdy.length, liczba)
    assert.deepEqual(wynik.model.slajdy.map((slajd) => slajd.czesc), model.slajdy.map((slajd) => slajd.czesc))
    assert.ok(wynik.model.slajdy.every((slajd) => slajd.szerokosc === 10800000 && slajd.wysokosc === 7380000))
    assert.deepEqual(wynik.model.slajdy.map((slajd) => slajd.obiekty[0].tekst), Array.from({ length: liczba }, (_, indeks) => `Slajd ${indeks + 1}`))
    assert.deepEqual(new Uint8Array(model.buforZrodlowy), oryginal)
    assert.equal(wynik.model.archiwum.comment, model.archiwum.comment)
    assert.ok(wynik.model.archiwum.file('ppt/slideMasters/slideMaster1.xml'))
    assert.deepEqual(await wynik.model.archiwum.file('ppt/media/image1.bin')!.async('uint8array'), await model.archiwum.file('ppt/media/image1.bin')!.async('uint8array'))
    const plan = przygotujPlanDruku(liczba, domyslneUstawieniaDruku())
    assert.deepEqual(plan.flatMap((dokument) => dokument.strony.flat()), Array.from({ length: liczba }, (_, indeks) => indeks + 1))
    assert.equal(plan.length, liczba > 100 ? 2 : 1)
    if (liczba > 100) {
      assert.deepEqual(plan[0].strony, [[1]])
      assert.equal(plan[0].ustawienia.dwustronnie, false)
      assert.equal(plan[0].ustawienia.orientacja, 'pionowa')
      assert.equal(plan[1].strony.length, Math.ceil((liczba - 1) / 2))
      assert.ok(plan[1].strony.every((strona) => strona.length <= 2))
      assert.deepEqual(plan[1].strony[0], [2, 3])
    } else assert.equal(plan[0].strony.length, liczba)
  })
}

test('zakres, marginesy, puste strony i proporcjonalne dopasowanie nie obcinaja slajdow', () => {
  assert.deepEqual(odczytajZakresSlajdow('5, 1-3, 3', 10), [1, 2, 3, 5])
  for (const zakres of ['0', '11', '5-2', '1,,2', '1-x', '-1', '1-999999999']) assert.throws(() => odczytajZakresSlajdow(zakres, 10))
  for (const liczba of [1, 2] as const) {
    const ustawienia = { ...domyslneUstawieniaDruku(), profil: 'reczny' as const, slajdowNaStronie: liczba }
    for (const obszar of obszaryNaStronie(ustawienia)) {
      const wynik = dopasujProporcjonalnie(1600, 900, obszar)
      assert.ok(Math.abs(wynik.szerokosc / wynik.wysokosc - 16 / 9) < .0001)
      assert.ok(wynik.x >= obszar.x && wynik.y >= obszar.y)
      assert.ok(wynik.szerokosc <= obszar.szerokosc && wynik.wysokosc <= obszar.wysokosc)
    }
  }
  assert.deepEqual(przygotujPlanDruku(3, { ...domyslneUstawieniaDruku(), pustaStronaNaKoncu: true })[0].strony, [[1], [2], [3], []])
  assert.throws(() => przygotujPlanDruku(3, { ...domyslneUstawieniaDruku(), marginesMm: NaN }))
})

test('separator pod wielowierszowym naglowkiem i tresc sa przesuwane bez kolizji kaskadowej', async () => {
  const archiwum = await JSZip.loadAsync(await utworzFixturePptx())
  const naglowek = ksztaltTestowy(20, 500000, 400000, 9000000, 1000000, 'Nagłówek pierwszy\nNagłówek drugi', 'FFFFFF').replace('<p:nvPr/>', '<p:nvPr><p:ph type="title"/></p:nvPr>')
  const separator = '<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="21" name="Separator"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="500000" y="950000"/><a:ext cx="9000000" cy="0"/></a:xfrm></p:spPr></p:cxnSp>'
  const tresc = ksztaltTestowy(22, 500000, 1100000, 6000000, 1000000, 'Treść', 'FFFFFF')
  archiwum.file('ppt/slides/slide3.xml', xmlSlajdu(naglowek + separator + tresc))
  const model = await otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer' }))
  const wynik = await korygujUklad(model, { szerokoscCm: 10000000 / 360000, wysokoscCm: 6000000 / 360000, czyKorygowacUklad: true, czyUsuwacDuplikaty: false })
  const [tytul, linia, tekst] = wynik.model.slajdy[0].obiekty
  assert.equal(linia.typ, 'linia')
  assert.ok(linia.geometria!.y > tytul.geometria!.y + tytul.geometria!.cy)
  assert.ok(tekst.geometria!.y > linia.geometria!.y)
  assert.ok(tekst.geometria!.y + tekst.geometria!.cy <= wynik.model.slajdy[0].wysokosc)
  assert.equal(wynik.uwagi.filter((uwaga) => uwaga.numerSlajdu === 1).length, 0)
})

test('szablon SEMPER: dziedziczony wzorzec chroni paski, logo i numeracje', async () => {
  const dane = await readFile(new URL('../public/szablony/prezentacje/semper-poziom.pptx', import.meta.url))
  const model = await otworzPptx(dane.buffer.slice(dane.byteOffset, dane.byteOffset + dane.byteLength))
  const slajd = model.slajdy[1]
  assert.equal(slajd.czescWzorca, 'ppt/slideMasters/slideMaster2.xml')
  assert.ok(slajd.elementyWzorca.some((obiekt) => obiekt.tekst.includes('SEMPER')))
  assert.ok(slajd.elementyWzorca.some((obiekt) => obiekt.tekst.includes('‹#›')))
  const archiwum = await JSZip.loadAsync(model.buforZrodlowy)
  const xml = await archiwum.file(slajd.czesc)!.async('string')
  archiwum.file(slajd.czesc, xml.replace('</p:spTree>', `${ksztaltTestowy(100, 1000000, 20000, 2000000, 400000, 'Treść pod paskiem', 'FFFFFF')}${ksztaltTestowy(101, 10000000, 6500000, 400000, 250000, '2', 'FFFFFF')}</p:spTree>`))
  const zDuplikatem = await otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer' }))
  const wynik = await korygujUklad(zDuplikatem, { szerokoscCm: 12192000 / 360000, wysokoscCm: 6858000 / 360000, czyKorygowacUklad: true, czyUsuwacDuplikaty: true })
  assert.equal(wynik.duplikaty, 1)
  assert.ok(!wynik.model.slajdy[1].obiekty.some((obiekt) => obiekt.id === '101'))
  assert.ok(wynik.model.slajdy[1].obiekty[0].geometria!.y > 600000)
  assert.equal(await wynik.model.archiwum.file(slajd.czescWzorca!)!.async('string'), await zDuplikatem.archiwum.file(slajd.czescWzorca!)!.async('string'))
})

test('mapowanie zmienia tylko zatwierdzone pole i zachowuje nieznane dane', async () => {
  const model = await otworzPptx(await utworzFixturePptx())
  const wynik = await zastosujMapowanie(model, { ...pusteDaneOkladki, tytul: 'Nowy tytuł < & >' }, [{ idObiektu: '5', pole: 'tytul' }])
  assert.equal(wynik.slajdy[0].obiekty.find((obiekt) => obiekt.id === '5')!.tekst, 'Nowy tytuł < & >')
  assert.equal(wynik.slajdy[0].obiekty.find((obiekt) => obiekt.id === '3')!.tekst, '3')
  assert.equal(await wynik.archiwum.file(model.slajdy[1].czesc)!.async('string'), await model.archiwum.file(model.slajdy[1].czesc)!.async('string'))
  assert.equal(zaproponujMapowanie(model.slajdy[0].obiekty[3]), '')
  await assert.rejects(() => zastosujMapowanie(model, pusteDaneOkladki, [{ idObiektu: '5', pole: 'tytul' }]), /Brak wartości/)
})

test('dolny tytul sekcji Kontakt nie jest naglowkiem calego slajdu i nie przestawia firmowej kompozycji', async () => {
  const dane = await readFile(new URL('../public/szablony/prezentacje/semper-poziom.pptx', import.meta.url))
  const model = await otworzPptx(dane.buffer.slice(dane.byteOffset, dane.byteOffset + dane.byteLength))
  const wynik = await korygujUklad(model, { szerokoscCm: 12192000 / 360000, wysokoscCm: 20.5, czyKorygowacUklad: true, czyUsuwacDuplikaty: true })
  for (const id of ['7', '11', '6', '47', '38', '18', '16']) {
    const przed = model.slajdy[2].obiekty.find((obiekt) => obiekt.id === id)!.geometria!
    const po = wynik.model.slajdy[2].obiekty.find((obiekt) => obiekt.id === id)!.geometria!
    assert.ok(Math.abs(po.y - przed.y * 7380000 / 6858000) <= 1, `Nie przestawiaj elementu kompozycji ${id}`)
  }
})

for (const orientacja of ['pionowa', 'pozioma'] as const) {
  test(`okladka ${orientacja}: jeden slajd, pola edytowalne, oryginalne media i QR`, async () => {
    const dane = await readFile(new URL(`../public/szablony/prezentacje/semper-${orientacja === 'pionowa' ? 'pion' : 'poziom'}.pptx`, import.meta.url))
    const bufor = dane.buffer.slice(dane.byteOffset, dane.byteOffset + dane.byteLength)
    const wynik = await wypelnijSzablonOkladki(bufor, orientacja, { ...pusteDaneOkladki, tytul: 'Szkolenie regresyjne', data: '30 października 2026 r.', miejscowosc: 'Warszawa', trener: 'Anna Kowalska', emailTrenera: 'anna@example.test' })
    assert.equal(wynik.slajdy.length, 1)
    assert.ok(wynik.slajdy[0].obiekty.some((obiekt) => obiekt.tekst === 'Szkolenie regresyjne'))
    assert.ok(!wynik.slajdy[0].obiekty.some((obiekt) => /Pawełek|xxx@/.test(obiekt.tekst)))
    const oryginal = await JSZip.loadAsync(bufor)
    for (const plik of Object.values(oryginal.files).filter((plik) => plik.name.startsWith('ppt/media/') && !plik.dir)) assert.deepEqual(await wynik.archiwum.file(plik.name)!.async('uint8array'), await plik.async('uint8array'))
    assert.equal(potomkowieXml(wynik.czesciXml.get('ppt/presentation.xml')!, 'sldId').length, 1)
  })
}

test('komplet ZIP zawiera poprawne pliki, instrukcje druku i odrzuca duplikaty nazw', async () => {
  const pliki = [{ nazwa: 'prezentacja.pptx', plik: new Blob(['PPTX']) }, { nazwa: 'druk.pdf', plik: new Blob(['PDF']) }]
  const wynik = await wygenerujKompletZip(pliki, 'A4, dwustronnie, dłuższa krawędź')
  const archiwum = await JSZip.loadAsync(await wynik.arrayBuffer())
  assert.deepEqual(Object.keys(archiwum.files), ['prezentacja.pptx', 'druk.pdf', 'USTAWIENIA_DRUKU.txt'])
  assert.equal(await archiwum.file('druk.pdf')!.async('string'), 'PDF')
  assert.match(await archiwum.file('USTAWIENIA_DRUKU.txt')!.async('string'), /dwustronnie/)
  await assert.rejects(() => wygenerujKompletZip([pliki[0], pliki[0]], ''), /Powtórzona nazwa/)
})
