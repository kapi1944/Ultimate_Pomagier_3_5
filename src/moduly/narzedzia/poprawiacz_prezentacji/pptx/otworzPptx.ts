import JSZip from 'jszip'
import type { ModelPptx } from './modelPptx'
import { ustalKolejnoscSlajdow } from './relacjePptx'
import { utworzSlajd } from './slajdyPptx'
import { liczbaXml, parsujXmlPptx, potomkowieXml, przestrzeniePptx } from './xmlPptx'

export async function otworzPptx(bufor: ArrayBuffer): Promise<ModelPptx> {
  const archiwum = await JSZip.loadAsync(bufor, { checkCRC32: true })
  const czesciXml = new Map<string, Document>()
  for (const plik of Object.values(archiwum.files)) {
    if (!plik.dir && (/^ppt\/(presentation\.xml|_rels\/presentation\.xml\.rels)$/.test(plik.name)
      || /^ppt\/(slides|slideLayouts|slideMasters|theme)\/.*\.(xml|rels)$/.test(plik.name))) {
      czesciXml.set(plik.name, parsujXmlPptx(await plik.async('string'), plik.name))
    }
  }
  const prezentacja = czesciXml.get('ppt/presentation.xml')
  const relacje = czesciXml.get('ppt/_rels/presentation.xml.rels')
  if (!prezentacja || !relacje || !przestrzeniePptx.prezentacja.includes(prezentacja.documentElement.namespaceURI ?? '')) {
    throw new Error('Archiwum nie zawiera poprawnej prezentacji PPTX.')
  }
  const rozmiar = potomkowieXml(prezentacja, 'sldSz')[0]
  const szerokosc = liczbaXml(rozmiar, 'cx')
  const wysokosc = liczbaXml(rozmiar, 'cy')
  if (!szerokosc || !wysokosc || szerokosc < 0 || wysokosc < 0) throw new Error('Brak poprawnych wymiarów slajdu w prezentacji.')
  const kolejnosc = ustalKolejnoscSlajdow(prezentacja, relacje)
  if (!kolejnosc.length || new Set(kolejnosc).size !== kolejnosc.length) throw new Error('Pusta lub niejednoznaczna lista slajdów.')
  const slajdy = kolejnosc.map((czesc, indeks) => {
    const dokument = czesciXml.get(czesc)
    if (!dokument) throw new Error(`Brak części slajdu: ${czesc}.`)
    return utworzSlajd(dokument, czesc, indeks + 1, szerokosc, wysokosc)
  })
  return { archiwum, buforZrodlowy: bufor, czesciXml, slajdy }
}
