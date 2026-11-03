import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { utworzFixturePptx, ksztaltTestowy, xmlSlajdu } from './fixturePptx'
import { otworzPptx } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/otworzPptx'
import { zapiszPptx } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/zapiszPptx'
import { zapiszZmianyPptx } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/zmianyPptx'
import { odczytajObiektySlajdu } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/slajdyPptx'
import { parsujXmlPptx, potomkowieXml } from '../src/moduly/narzedzia/poprawiacz_prezentacji/pptx/xmlPptx'
import { czyEdytowalny, edytujSlajd } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/edycjaPrezentacji'
import { porownajPrezentacje, tozsamoscObiektu } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/porownaniePrezentacji'
import { ograniczHistorie, odtworzTransakcje, utworzTransakcje } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/historiaPrezentacji'
import { poczatkowyStanPoprawiacza, zmienStanPoprawiacza } from '../src/moduly/narzedzia/poprawiacz_prezentacji/modele/stanPoprawiacza'
import { analizujPrezentacje } from '../src/moduly/narzedzia/poprawiacz_prezentacji/analiza/analizujPrezentacje'

Object.defineProperty(globalThis, 'DOMParser', { value: DOMParser, configurable: true })
Object.defineProperty(globalThis, 'XMLSerializer', { value: XMLSerializer, configurable: true })

async function przygotuj() {
  const model = await otworzPptx(await utworzFixturePptx())
  const slajd = model.slajdy[0]
  return { model, slajd, id: tozsamoscObiektu(slajd, slajd.obiekty[3])! }
}
const serializuj = (dokument: Node) => new XMLSerializer().serializeToString(dokument)

test('oryginal pozostaje identyczny po edycji, a eksport daje sie ponownie odczytac', async () => {
  const { model, slajd, id } = await przygotuj()
  const przed = serializuj(slajd.dokument), bajty = new Uint8Array(model.buforZrodlowy.slice(0))
  const po = await edytujSlajd(model, slajd, [{ id, fragment: { indeks: 0, tekst: 'Żółć i źdźbło' } }])
  assert.equal(serializuj(slajd.dokument), przed)
  assert.deepEqual(new Uint8Array(model.buforZrodlowy), bajty)
  const wczytany = await otworzPptx(await (await zapiszPptx(po)).arrayBuffer())
  assert.equal(wczytany.slajdy[0].obiekty[3].tekst, 'Żółć i źdźbło')
})

test('tryby, nawigacja oraz wspolny zoom i przesuniecie zachowuja model i historie', async () => {
  const { model, slajd, id } = await przygotuj()
  const po = await edytujSlajd(model, slajd, [{ id, fragment: { indeks: 0, tekst: 'Po zmianie' } }])
  let stan = zmienStanPoprawiacza(poczatkowyStanPoprawiacza, { typ: 'ZAKONCZ_ANALIZE', model, analiza: analizujPrezentacje(model) })
  const transakcja = await utworzTransakcje(model, po, 'Tekst')
  stan = zmienStanPoprawiacza(stan, { typ: 'ZAPISZ_OPERACJE', model: po, analiza: analizujPrezentacje(po), transakcja })
  stan = zmienStanPoprawiacza(stan, { typ: 'PUNKT_KONTROLNY' })
  assert.equal(stan.punktKontrolny, po)
  stan = zmienStanPoprawiacza(stan, { typ: 'WIDOK', widok: { zoom: 2, x: 31, y: -22 } })
  for (const tryb of ['ROBOCZY', 'PEŁNOEKRANOWY', 'PORÓWNAWCZY'] as const) {
    stan = zmienStanPoprawiacza(stan, { typ: 'TRYB', tryb })
    stan = zmienStanPoprawiacza(stan, { typ: 'SLAJD', indeks: 2 })
    assert.equal(stan.model, po); assert.equal(stan.oryginal, model)
    assert.deepEqual(stan.widok, { zoom: 2, x: 31, y: -22 })
    assert.equal(stan.historia.length, 1)
  }
  const cofniety = await odtworzTransakcje(po, transakcja, 'przed')
  stan = zmienStanPoprawiacza(stan, { typ: 'HISTORIA', model: cofniety, analiza: analizujPrezentacje(cofniety), kierunek: 'przed' })
  assert.equal(stan.ponawianie.length, 1); assert.equal(stan.indeksSlajdu, 2)
  const ponowiony = await odtworzTransakcje(cofniety, transakcja, 'po')
  stan = zmienStanPoprawiacza(stan, { typ: 'HISTORIA', model: ponowiony, analiza: analizujPrezentacje(ponowiony), kierunek: 'po' })
  assert.equal(stan.historia.length, 1); assert.equal(stan.ponawianie.length, 0)
  assert.equal(ponowiony.slajdy[0].obiekty[3].tekst, 'Po zmianie')
})

test('cofniecie jednej transakcji nie usuwa poprzedniej zmiany ani innych slajdow', async () => {
  const { model, slajd, id } = await przygotuj()
  const pierwszy = await edytujSlajd(model, slajd, [{ id, fragment: { indeks: 0, tekst: 'Pierwsza' } }])
  const drugi = await edytujSlajd(pierwszy, pierwszy.slajdy[0], [{ id, geometria: { ...slajd.obiekty[3].geometria!, x: 500 } }])
  const transakcja = await utworzTransakcje(pierwszy, drugi, 'Ruch')
  assert.equal(transakcja.czesci.length, 1)
  const cofniecie = await odtworzTransakcje(drugi, transakcja, 'przed')
  assert.equal(cofniecie.slajdy[0].obiekty[3].tekst, 'Pierwsza')
  assert.deepEqual(cofniecie.slajdy[0].obiekty[3].geometria, slajd.obiekty[3].geometria)
  for (const czesc of ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/media/image1.bin', 'ppt/embeddings/oleObject1.bin', 'ppt/slideMasters/slideMaster1.xml', 'ppt/slides/_rels/slide3.xml.rels']) {
    assert.deepEqual(await cofniecie.archiwum.file(czesc)!.async('uint8array'), await model.archiwum.file(czesc)!.async('uint8array'))
  }
})

test('stabilne ID po usunieciu wczesniejszego elementu oraz przywrocenie zachowujace inne poprawki', async () => {
  const { model, slajd, id } = await przygotuj()
  const dokument = slajd.dokument.cloneNode(true) as Document
  const pierwszy = odczytajObiektySlajdu(dokument)[0].element
  pierwszy.parentNode!.removeChild(pierwszy)
  const usuniety = await zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
  assert.equal(tozsamoscObiektu(usuniety.slajdy[0], usuniety.slajdy[0].obiekty[2]), id)
  const edytowany = await edytujSlajd(usuniety, usuniety.slajdy[0], [{ id, fragment: { indeks: 0, tekst: 'Zachowaj mnie' } }])
  const odtworzony = await edytujSlajd(edytowany, edytowany.slajdy[0], [{ id: tozsamoscObiektu(slajd, slajd.obiekty[0])!, przywroc: true }], slajd)
  assert.equal(odtworzony.slajdy[0].obiekty.length, slajd.obiekty.length)
  assert.equal(odtworzony.slajdy[0].obiekty[3].tekst, 'Zachowaj mnie')
  const transakcja = await utworzTransakcje(edytowany, odtworzony, 'Przywróć')
  const cofniecie = await odtworzTransakcje(odtworzony, transakcja, 'przed')
  assert.equal(cofniecie.slajdy[0].obiekty.length, 3)
})

for (const [nazwa, zmiana, typ] of [
  ['tekstu', { fragment: { indeks: 0, tekst: 'Inny tekst' } }, 'Tekst'],
  ['polozenia', { geometria: { x: 2e6, y: 2e6, cx: 6e5, cy: 3e5 } }, 'Położenie'],
  ['rozmiaru', { geometria: { x: 88e5, y: 54e5, cx: 8e5, cy: 4e5 } }, 'Rozmiar'],
  ['czcionki', { czcionka: 'Book Antiqua' }, 'Czcionka'],
  ['formatowania', { rozmiar: 27 }, 'Formatowanie'],
  ['koloru', { kolor: '#fedcba' }, 'Kolor'],
] as const) test(`porownanie wykrywa zmiane ${nazwa}`, async () => {
  const { model, slajd, id } = await przygotuj()
  const po = await edytujSlajd(model, slajd, [{ id, ...zmiana }])
  assert.ok(porownajPrezentacje(model, po).some((roznica) => roznica.typ === typ && roznica.tozsamosc === id))
})

test('dodane, usuniete i niejednoznaczne obiekty nie sa dopasowywane tekstem ani pozycja', async () => {
  const { model, slajd } = await przygotuj()
  const dokument = slajd.dokument.cloneNode(true) as Document
  const obiekty = odczytajObiektySlajdu(dokument)
  const kopia = obiekty[0].element.cloneNode(true) as Element
  potomkowieXml(kopia, 'cNvPr')[0].setAttribute('id', '77')
  obiekty[0].element.parentNode!.replaceChild(kopia, obiekty[0].element)
  const po = await zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
  const typy = porownajPrezentacje(model, po).map((roznica) => roznica.typ)
  assert.ok(typy.includes('Dodany')); assert.ok(typy.includes('Usunięty'))
  const duplikat = kopia.cloneNode(true)
  kopia.parentNode!.appendChild(duplikat)
  const brakId = kopia.cloneNode(true) as Element
  potomkowieXml(brakId, 'cNvPr')[0].removeAttribute('id'); kopia.parentNode!.appendChild(brakId)
  const niepewny = await zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
  assert.equal(porownajPrezentacje(model, niepewny).filter((roznica) => roznica.typ === 'Niejednoznaczny').length, 3)
  await assert.rejects(edytujSlajd(niepewny, niepewny.slajdy[0], [{ id: `${slajd.czesc}#77`, fragment: { indeks: 0, tekst: 'Nie' } }]))
})

test('grupy sa dopasowywane kontekstem rodzica i pozostaja tylko do odczytu', async () => {
  const { model, slajd } = await przygotuj()
  const grupa = '<p:grpSp><p:nvGrpSpPr><p:cNvPr id="80" name="Grupa"/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="1000000"/><a:chOff x="0" y="0"/><a:chExt cx="1000000" cy="1000000"/></a:xfrm></p:grpSpPr>' + ksztaltTestowy(81, 0, 0, 500000, 500000, 'Dziecko') + '</p:grpSp>'
  const dokument = parsujXmlPptx(xmlSlajdu(grupa), 'grupa')
  const grupowy = await zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
  assert.equal(tozsamoscObiektu(grupowy.slajdy[0], grupowy.slajdy[0].obiekty[1]), `${slajd.czesc}#80/81`)
  assert.ok(grupowy.slajdy[0].obiekty.every((obiekt) => !czyEdytowalny(obiekt)))
  assert.equal(porownajPrezentacje(grupowy, grupowy).length, 0)
})

test('wielostylowy tekst zachowuje numeracje, hiperlink, kursywe, kolor i polskie znaki', async () => {
  const { model, slajd } = await przygotuj()
  const ksztalt = ksztaltTestowy(88, 0, 0, 1000000, 1000000, 'Pierwszy').replace('<a:p><a:r>', '<a:p><a:pPr><a:buAutoNum type="arabicPeriod" startAt="4"/></a:pPr><a:r><a:rPr b="1" sz="2400"><a:hlinkClick r:id="rId9"/></a:rPr>').replace('</a:r></a:p>', '</a:r><a:r><a:rPr i="1" sz="1800"><a:solidFill><a:srgbClr val="CC0000"/></a:solidFill></a:rPr><a:t>Drugi</a:t></a:r></a:p>')
  const dokument = parsujXmlPptx(xmlSlajdu(ksztalt), 'tekst')
  const baza = await zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
  const obiekt = baza.slajdy[0].obiekty[0], id = tozsamoscObiektu(baza.slajdy[0], obiekt)!
  const style = potomkowieXml(obiekt.element, 'rPr').map(serializuj)
  const po = await edytujSlajd(baza, baza.slajdy[0], [{ id, fragment: { indeks: 1, tekst: 'Zażółć gęślą jaźń' } }])
  const nowy = po.slajdy[0].obiekty[0]
  assert.deepEqual(potomkowieXml(nowy.element, 'rPr').map(serializuj), style)
  assert.equal(potomkowieXml(nowy.element, 'buAutoNum')[0].getAttribute('startAt'), '4')
  assert.equal(potomkowieXml(nowy.element, 'hlinkClick')[0].getAttribute('r:id'), 'rId9')
  assert.equal(nowy.tekst, 'PierwszyZażółć gęślą jaźń')
})

test('nieobslugiwany i obrocony obiekt nie pozwala na pozorna edycje', async () => {
  const { model, slajd } = await przygotuj()
  const dokument = slajd.dokument.cloneNode(true) as Document
  potomkowieXml(dokument, 'xfrm')[0].setAttribute('rot', '600000')
  const obrocony = await zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
  assert.equal(czyEdytowalny(obrocony.slajdy[0].obiekty[0]), false)
  await assert.rejects(edytujSlajd(obrocony, obrocony.slajdy[0], [{ id: tozsamoscObiektu(obrocony.slajdy[0], obrocony.slajdy[0].obiekty[0])!, geometria: { x: 1, y: 1, cx: 1, cy: 1 } }]))
})

test('tolerancja 2 EMU ignoruje zaokraglenia; struktura nie zalezy od antyaliasingu renderera', async () => {
  const { model, slajd, id } = await przygotuj()
  const po = await edytujSlajd(model, slajd, [{ id, geometria: { ...slajd.obiekty[3].geometria!, x: slajd.obiekty[3].geometria!.x + 2 } }])
  assert.equal(porownajPrezentacje(model, po).length, 0)
})

test('historia ma limit, a przestarzaly render nie zmienia statusu aktualnosci', () => {
  assert.equal(ograniczHistorie(Array.from({ length: 100 }, (_, indeks) => ({ nazwa: String(indeks), czesci: [] }))).length, 30)
  const stan = { ...poczatkowyStanPoprawiacza, rewizja: 4 }
  assert.equal(zmienStanPoprawiacza(stan, { typ: 'RENDER', rewizja: 3 }), stan)
  assert.equal(zmienStanPoprawiacza(stan, { typ: 'RENDER', rewizja: 4 }).rewizjaRenderu, 4)
})

test('zmienione bajty obrazu pod ta sama relacja sa wykrywane', async () => {
  const { model, slajd } = await przygotuj()
  const archiwum = await JSZip.loadAsync(model.buforZrodlowy)
  archiwum.file(slajd.czesc, xmlSlajdu('<p:pic><p:nvPicPr><p:cNvPr id="95" name="Obraz"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId8"/></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></a:xfrm></p:spPr></p:pic>'))
  const relacje = await archiwum.file('ppt/slides/_rels/slide3.xml.rels')!.async('string')
  archiwum.file('ppt/slides/_rels/slide3.xml.rels', relacje.replace('</Relationships>', '<Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.bin"/></Relationships>'))
  const przed = await otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer' }))
  archiwum.file('ppt/media/image1.bin', new Uint8Array([1, 2, 3]))
  const po = await otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer' }))
  assert.ok(porownajPrezentacje(przed, po).some((roznica) => roznica.typ === 'Obraz'))
})
import { porownajPiksele } from '../src/moduly/narzedzia/poprawiacz_prezentacji/operacje/porownaniePikseli'
import { normalizujKolorRoznic } from '../src/moduly/narzedzia/poprawiacz_prezentacji/modele/preferencjePodgladu'

test('porownanie pikselowe toleruje antyaliasing i drobne przesuniecie krawedzi', () => {
  const przed = new Uint8ClampedArray(5 * 5 * 4).fill(255)
  const po = przed.slice()
  for (let kanal = 0; kanal < 3; kanal++) { przed[(2 * 5 + 2) * 4 + kanal] = 0; po[(2 * 5 + 3) * 4 + kanal] = 20 }
  assert.equal(porownajPiksele(przed, po, 5, 5).zmienione, 0)
  po.fill(0)
  assert.ok(porownajPiksele(przed, po, 5, 5).procent > 50)
})

test('kolory HEX i RGB sa normalizowane i walidowane', () => {
  assert.equal(normalizujKolorRoznic('rgb(255, 0, 128)'), '#ff0080')
  assert.equal(normalizujKolorRoznic('#ABCDEF'), '#abcdef')
  assert.equal(normalizujKolorRoznic('rgb(256, 0, 0)'), null)
  assert.equal(normalizujKolorRoznic('nie kolor'), null)
})

test('przywracanie odrzuca zmienione relacje i nie narusza pozostalych danych', async () => {
  const { model, slajd, id } = await przygotuj()
  const archiwum = await JSZip.loadAsync(model.buforZrodlowy)
  const sciezka = 'ppt/slides/_rels/slide3.xml.rels'
  archiwum.file(sciezka, (await archiwum.file(sciezka)!.async('string')).replace('rId1', 'rId88'))
  const po = await otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer' }))
  await assert.rejects(edytujSlajd(po, po.slajdy[0], [{ id, przywroc: true }], slajd, model), /Relacje/)
})

test('kolejnosc warstw daje roznice i moze byc przywrocona bez zmian tekstu innego obiektu', async () => {
  const { model, slajd, id } = await przygotuj()
  const po = await edytujSlajd(model, slajd, [{ id, warstwa: 'tyl' }])
  assert.ok(porownajPrezentacje(model, po).some((roznica) => roznica.przed.startsWith('Warstwa:')))
  const przywrocony = await edytujSlajd(po, po.slajdy[0], [{ id, przywroc: true }], slajd, model)
  assert.equal(przywrocony.slajdy[0].obiekty[3].id, slajd.obiekty[3].id)
})

test('nieznane obiekty SmartArt i wykresy pozostaja nietkniete podczas edycji zwyklego pola', async () => {
  const { model, slajd, id } = await przygotuj()
  const dokument = slajd.dokument.cloneNode(true) as Document
  const rozszerzenie = dokument.createElementNS('urn:test:nieznany', 'test:SmartArt')
  rozszerzenie.setAttribute('dane', 'zachowaj')
  dokument.documentElement.appendChild(rozszerzenie)
  const baza = await zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
  const po = await edytujSlajd(baza, baza.slajdy[0], [{ id, fragment: { indeks: 0, tekst: 'Edytowane' } }])
  assert.equal(serializuj(potomkowieXml(po.slajdy[0].dokument, 'SmartArt')[0]), serializuj(potomkowieXml(baza.slajdy[0].dokument, 'SmartArt')[0]))
})
