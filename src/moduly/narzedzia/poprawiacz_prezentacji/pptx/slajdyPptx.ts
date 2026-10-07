import type { GeometriaPptx, ObiektSlajdu, SlajdPptx } from './modelPptx'
import { odczytajGeometrie } from './geometriaPptx'
import { dzieckoXml, dzieciXml, liczbaXml, potomkowieXml, przestrzeniePptx } from './xmlPptx'

function odczytajKolor(wlasciwosci: Element | undefined): string | null {
  const wypelnienie = dzieckoXml(wlasciwosci, 'solidFill')
  const kolor = dzieckoXml(wypelnienie, 'srgbClr')
  const wartosc = kolor?.getAttribute('val')
  return wartosc && /^[0-9a-f]{6}$/i.test(wartosc) && !dzieciXml(kolor!).length ? `#${wartosc.toUpperCase()}` : null
}

type UkladGrupy = { x: number; y: number; skalaX: number; skalaY: number; czyProsty: boolean }
const ukladSlajdu: UkladGrupy = { x: 0, y: 0, skalaX: 1, skalaY: 1, czyProsty: true }

function przeliczGeometrie(geometria: GeometriaPptx | null, uklad: UkladGrupy): GeometriaPptx | null {
  return geometria ? {
    x: uklad.x + geometria.x * uklad.skalaX,
    y: uklad.y + geometria.y * uklad.skalaY,
    cx: geometria.cx * uklad.skalaX,
    cy: geometria.cy * uklad.skalaY,
  } : null
}

function czyProstaTransformacja(transformacja: Element | undefined) {
  return !transformacja || (!Number(transformacja.getAttribute('rot'))
    && !['1', 'true'].includes(transformacja.getAttribute('flipH') ?? '')
    && !['1', 'true'].includes(transformacja.getAttribute('flipV') ?? ''))
}

function odczytajTekst(element: Element) {
  return potomkowieXml(element, 'p')
    .filter((akapit) => przestrzeniePptx.rysunek.includes(akapit.namespaceURI ?? ''))
    .map((akapit) => dzieciXml(akapit).map((fragment) => fragment.localName === 'br'
      ? '\n' : potomkowieXml(fragment, 't').map((tekst) => tekst.textContent ?? '').join('')).join(''))
    .join('\n')
}

export function odczytajObiektySlajdu(dokument: Document): ObiektSlajdu[] {
  const drzewo = potomkowieXml(dokument, 'spTree')[0]
  if (!drzewo) throw new Error('Slajd nie zawiera drzewa obiektów.')
  const obiekty: ObiektSlajdu[] = []
  function odczytajDzieci(rodzic: Element, sciezka: string, uklad: UkladGrupy) {
    dzieciXml(rodzic).forEach((element, indeks) => {
      if (!przestrzeniePptx.prezentacja.includes(element.namespaceURI ?? '')) return
      const typy: Record<string, ObiektSlajdu['typ']> = { sp: 'ksztalt', pic: 'obraz', graphicFrame: 'ramka', grpSp: 'grupa' }
      const typ = typy[element.localName]
      if (!typ) return
      const klucz = `${sciezka}/${indeks}`
      const wlasciwosci = dzieckoXml(element, typ === 'grupa' ? 'grpSpPr' : 'spPr')
      const transformacja = typ === 'ramka' ? dzieckoXml(element, 'xfrm') : dzieckoXml(wlasciwosci, 'xfrm')
      const geometriaLokalna = odczytajGeometrie(transformacja)
      const dane = potomkowieXml(element, 'cNvPr')[0]
      const tabela = potomkowieXml(element, 'tbl')[0]
      obiekty.push({
        klucz, id: dane?.getAttribute('id') ?? '', nazwa: dane?.getAttribute('name') ?? '', typ,
        geometria: przeliczGeometrie(geometriaLokalna, uklad),
        tekst: typ === 'grupa' ? '' : odczytajTekst(element),
        wypelnienie: odczytajKolor(wlasciwosci), linia: odczytajKolor(dzieckoXml(wlasciwosci, 'ln')),
        ksztalt: dzieckoXml(wlasciwosci, 'prstGeom')?.getAttribute('prst') ?? null,
        tabela: tabela ? { wiersze: dzieciXml(tabela, 'tr').length, kolumny: potomkowieXml(tabela, 'gridCol').length } : null,
        kolejnosc: obiekty.length, element,
        czyProstaGeometria: uklad.czyProsty && czyProstaTransformacja(transformacja),
      })
      if (typ === 'grupa') {
        const poczatekDzieci = dzieckoXml(transformacja, 'chOff')
        const rozmiarDzieci = dzieckoXml(transformacja, 'chExt')
        const cx = liczbaXml(rozmiarDzieci, 'cx')
        const cy = liczbaXml(rozmiarDzieci, 'cy')
        const x = liczbaXml(poczatekDzieci, 'x')
        const y = liczbaXml(poczatekDzieci, 'y')
        const geometria = przeliczGeometrie(geometriaLokalna, uklad)
        const czyZnana = geometria && cx && cy && x !== null && y !== null
        odczytajDzieci(element, klucz, czyZnana ? {
          x: geometria.x - x * geometria.cx / cx,
          y: geometria.y - y * geometria.cy / cy,
          skalaX: geometria.cx / cx, skalaY: geometria.cy / cy,
          czyProsty: uklad.czyProsty && czyProstaTransformacja(transformacja),
        } : { ...uklad, czyProsty: false })
      }
    })
  }
  odczytajDzieci(drzewo, 'slajd', ukladSlajdu)
  return obiekty
}

export function utworzSlajd(dokument: Document, czesc: string, numer: number, szerokosc: number, wysokosc: number): SlajdPptx {
  return { dokument, czesc, numer, szerokosc, wysokosc, obiekty: odczytajObiektySlajdu(dokument) }
}
