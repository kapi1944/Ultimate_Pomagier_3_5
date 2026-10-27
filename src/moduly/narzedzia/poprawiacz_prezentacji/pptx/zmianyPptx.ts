import JSZip from 'jszip'
import type { GeometriaPptx, ModelPptx, ObiektSlajdu } from './modelPptx'
import { otworzPptx } from './otworzPptx'
import { dzieckoXml, dzieciXml, potomkowieXml, przestrzeniePptx } from './xmlPptx'

export function czyObiektPowiazany(dokument: Document, id: string) {
  return Boolean(id) && Array.from(dokument.getElementsByTagName('*')).some((element) => Array.from(element.attributes).some((atrybut) =>
    (['spid', 'spId'].includes(atrybut.localName) || (['stCxn', 'endCxn'].includes(element.localName) && atrybut.localName === 'id')) && atrybut.value === id))
}

export function dopasujTekstDoPola(obiekt: ObiektSlajdu, tekst = obiekt.tekst) {
  const wlasciwosci = potomkowieXml(obiekt.element, 'bodyPr')[0]
  if (!wlasciwosci || !tekst.trim() || !obiekt.geometria) return
  const rozmiary = [...potomkowieXml(obiekt.element, 'rPr'), ...potomkowieXml(obiekt.element, 'defRPr')].map((element) => Number(element.getAttribute('sz'))).filter((rozmiar) => rozmiar > 0)
  const czcionka = Math.max(...(rozmiary.length ? rozmiary : [1800])) / 100 * 12700
  const dostepnaSzerokosc = Math.max(1, obiekt.geometria.cx - Number(wlasciwosci.getAttribute('lIns') || 91440) - Number(wlasciwosci.getAttribute('rIns') || 91440))
  const dostepnaWysokosc = Math.max(1, obiekt.geometria.cy - Number(wlasciwosci.getAttribute('tIns') || 45720) - Number(wlasciwosci.getAttribute('bIns') || 45720))
  let skala = 1
  for (let proba = 0; proba < 15; proba++) {
    const wiersze = tekst.split('\n').reduce((suma, wiersz) => suma + Math.max(1, Math.ceil(wiersz.length * czcionka * .55 * skala / dostepnaSzerokosc)), 0)
    if (wiersze * czcionka * skala * 1.15 <= dostepnaWysokosc || skala <= .5) break
    skala = Math.max(.5, skala * .95)
  }
  for (const nazwa of ['noAutofit', 'spAutoFit', 'normAutofit']) {
    const stary = dzieckoXml(wlasciwosci, nazwa)
    if (stary) wlasciwosci.removeChild(stary)
  }
  const dopasowanie = obiekt.element.ownerDocument.createElementNS(przestrzeniePptx.rysunek[0], 'a:normAutofit')
  dopasowanie.setAttribute('fontScale', String(Math.round(skala * 100000)))
  wlasciwosci.insertBefore(dopasowanie, dzieciXml(wlasciwosci).find((element) => ['scene3d', 'sp3d', 'flatTx', 'extLst'].includes(element.localName)) ?? null)
}

export function ustawGeometrie(obiekt: ObiektSlajdu, geometria: GeometriaPptx) {
  const dokument = obiekt.element.ownerDocument
  let wlasciwosci = dzieckoXml(obiekt.element, obiekt.typ === 'grupa' ? 'grpSpPr' : 'spPr')
  if (!wlasciwosci && obiekt.typ !== 'ramka') {
    wlasciwosci = dokument.createElementNS(obiekt.element.namespaceURI, 'p:spPr')
    obiekt.element.insertBefore(wlasciwosci, dzieciXml(obiekt.element)[1] ?? null)
  }
  const rodzic = obiekt.typ === 'ramka' ? obiekt.element : wlasciwosci!
  let transformacja = dzieckoXml(rodzic, 'xfrm')
  const przestrzen = obiekt.typ === 'ramka' ? obiekt.element.namespaceURI : przestrzeniePptx.rysunek[0]
  if (!transformacja) {
    transformacja = dokument.createElementNS(przestrzen, obiekt.typ === 'ramka' ? 'p:xfrm' : 'a:xfrm')
    rodzic.insertBefore(transformacja, rodzic.firstChild)
  }
  for (const [nazwa, wartosci] of [['off', { x: geometria.x, y: geometria.y }], ['ext', { cx: geometria.cx, cy: geometria.cy }]] as const) {
    let element = dzieckoXml(transformacja, nazwa)
    if (!element) { element = dokument.createElementNS(przestrzeniePptx.rysunek[0], `a:${nazwa}`); transformacja.appendChild(element) }
    for (const [klucz, wartosc] of Object.entries(wartosci)) element.setAttribute(klucz, String(Math.round(wartosc)))
  }
  obiekt.geometria = { ...geometria }
}

export async function zapiszZmianyPptx(model: ModelPptx, zmiany: Map<string, Document>) {
  const archiwum = await JSZip.loadAsync(model.buforZrodlowy)
  for (const [czesc, dokument] of zmiany) archiwum.file(czesc, new XMLSerializer().serializeToString(dokument))
  return otworzPptx(await archiwum.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }))
}
