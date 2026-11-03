import type { GeometriaPptx, ModelPptx, ObiektSlajdu, SlajdPptx } from '../pptx/modelPptx'
import { odczytajObiektySlajdu } from '../pptx/slajdyPptx'
import { dzieciXml, potomkowieXml, przestrzeniePptx } from '../pptx/xmlPptx'
import { czyObiektPowiazany, ustawGeometrie, zapiszZmianyPptx } from '../pptx/zmianyPptx'
import { mapaTozsamosci, tozsamoscObiektu } from './porownaniePrezentacji'

export function czyEdytowalny(obiekt: ObiektSlajdu) {
  return obiekt.czyProstaGeometria && Boolean(obiekt.geometria)
    && ['ksztalt', 'obraz', 'linia'].includes(obiekt.typ)
    && obiekt.element.parentNode?.nodeName.endsWith('spTree')
    && !potomkowieXml(obiekt.element, 'AlternateContent').length
}

export type ZmianaObiektu = {
  id: string; geometria?: GeometriaPptx; fragment?: { indeks: number; tekst: string }
  czcionka?: string; rozmiar?: number; kolor?: string; wyrownanie?: 'l' | 'ctr' | 'r' | 'just'
  odstep?: number; warstwa?: 'przod' | 'tyl'; przywroc?: boolean
}

export async function edytujSlajd(model: ModelPptx, slajd: SlajdPptx, zmiany: ZmianaObiektu[], oryginal?: SlajdPptx, modelOryginalny?: ModelPptx) {
  if (modelOryginalny && zmiany.some((zmiana) => zmiana.przywroc)) {
    const relacje = slajd.czesc.replace(/([^/]+)$/, '_rels/$1.rels')
    const [przed, po] = await Promise.all([modelOryginalny.archiwum.file(relacje)?.async('string'), model.archiwum.file(relacje)?.async('string')])
    if (przed !== po) throw new Error('Relacje slajdu uległy zmianie. Przywrócenie wymaga kontroli w PowerPoint.')
  }
  const dokument = slajd.dokument.cloneNode(true) as Document
  const kopia = { ...slajd, dokument, obiekty: odczytajObiektySlajdu(dokument) }
  const mapa = mapaTozsamosci(kopia)
  const staraMapa = oryginal ? mapaTozsamosci(oryginal) : new Map<string, ObiektSlajdu[]>()
  for (const zmiana of zmiany) {
    const pasujace = mapa.get(zmiana.id) ?? []
    if (pasujace.length > 1) throw new Error('Niejednoznaczna tożsamość obiektu. Nie zmieniono PPTX.')
    const obiekt = pasujace[0]
    if (zmiana.przywroc) {
      const stare = staraMapa.get(zmiana.id) ?? []
      if (stare.length > 1) throw new Error('Niejednoznaczny oryginał.')
      const stary = stare[0]
      if (!stary) {
        if (obiekt && czyObiektPowiazany(dokument, obiekt.id)) throw new Error('Obiekt jest używany przez animację lub połączenie. Nie usunięto obiektu.')
        obiekt?.element.parentNode?.removeChild(obiekt.element); continue
      }
      const rodzicOryginalu = stary.element.parentNode
      const grupa = oryginal?.obiekty.find((element) => element.element === rodzicOryginalu)
      const idGrupy = grupa && oryginal ? tozsamoscObiektu(oryginal, grupa) : null
      const rodzic = obiekt?.element.parentNode ?? (idGrupy ? mapa.get(idGrupy)?.[0]?.element : potomkowieXml(dokument, 'spTree')[0])
      if (!rodzic) throw new Error('Przywróć najpierw grupę nadrzędną.')
      const nowy = dokument.importNode(stary.element, true)
      if (obiekt) rodzic.removeChild(obiekt.element)
      {
        const rodzenstwo = rodzicOryginalu ? dzieciXml(rodzicOryginalu) : []
        const nastepny = rodzenstwo.slice(rodzenstwo.indexOf(stary.element) + 1).map((element) => oryginal?.obiekty.find((kandydat) => kandydat.element === element))
          .map((element) => element && oryginal ? tozsamoscObiektu(oryginal, element) : null).map((id) => id ? mapa.get(id)?.[0]?.element : null).find(Boolean)
        rodzic.insertBefore(nowy, nastepny ?? dzieciXml(rodzic, 'extLst')[0] ?? null)
      }
      continue
    }
    if (!obiekt || !czyEdytowalny(obiekt)) throw new Error('Ten obiekt jest tylko do odczytu. Grupy, wzorce, tabele, wykresy i obroty wymagają edycji w PowerPoint.')
    if (zmiana.geometria) {
      if (Object.values(zmiana.geometria).some((liczba) => !Number.isFinite(liczba)) || zmiana.geometria.cx <= 0 || zmiana.geometria.cy <= 0) throw new Error('Nieprawidłowe wymiary obiektu.')
      ustawGeometrie(obiekt, zmiana.geometria)
    }
    if (zmiana.fragment) {
      const tekst = potomkowieXml(obiekt.element, 't')[zmiana.fragment.indeks]
      if (!tekst) throw new Error('Nie odnaleziono fragmentu tekstu.')
      // Zmieniamy wyłącznie treść a:t; akapity, rPr, hiperłącza i numeracja pozostają.
      tekst.textContent = zmiana.fragment.tekst
      tekst.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve')
    }
    if (zmiana.czcionka || zmiana.rozmiar !== undefined || zmiana.kolor) {
      if (zmiana.rozmiar !== undefined && (!Number.isFinite(zmiana.rozmiar) || zmiana.rozmiar < 1 || zmiana.rozmiar > 400)) throw new Error('Rozmiar czcionki: 1–400 pkt.')
      if (zmiana.kolor && !/^#[0-9a-f]{6}$/i.test(zmiana.kolor)) throw new Error('Nieprawidłowy kolor HEX.')
      for (const fragment of potomkowieXml(obiekt.element, 'r')) {
        let styl = dzieciXml(fragment, 'rPr')[0]
        if (!styl) { styl = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:rPr'); fragment.insertBefore(styl, fragment.firstChild) }
        if (zmiana.rozmiar !== undefined) styl.setAttribute('sz', String(Math.round(zmiana.rozmiar * 100)))
        if (zmiana.czcionka) {
          let czcionka = dzieciXml(styl, 'latin')[0]
          if (!czcionka) { czcionka = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:latin'); styl.insertBefore(czcionka, dzieciXml(styl).find((element) => ['ea', 'cs', 'sym', 'hlinkClick', 'hlinkMouseOver', 'rtl', 'extLst'].includes(element.localName)) ?? null) }
          czcionka.setAttribute('typeface', zmiana.czcionka)
        }
        if (zmiana.kolor) {
          for (const wypelnienie of dzieciXml(styl).filter((element) => ['solidFill', 'gradFill', 'noFill', 'pattFill', 'blipFill', 'grpFill'].includes(element.localName))) styl.removeChild(wypelnienie)
          const wypelnienie = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:solidFill')
          const kolor = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:srgbClr')
          kolor.setAttribute('val', zmiana.kolor.slice(1)); wypelnienie.appendChild(kolor)
          styl.insertBefore(wypelnienie, dzieciXml(styl).find((element) => element.localName !== 'ln') ?? null)
        }
      }
    }
    if (zmiana.wyrownanie || zmiana.odstep !== undefined) for (const akapit of potomkowieXml(obiekt.element, 'p')) {
      let styl = dzieciXml(akapit, 'pPr')[0]
      if (!styl) { styl = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:pPr'); akapit.insertBefore(styl, akapit.firstChild) }
      if (zmiana.wyrownanie) styl.setAttribute('algn', zmiana.wyrownanie)
      if (zmiana.odstep !== undefined) {
        if (!Number.isFinite(zmiana.odstep) || zmiana.odstep < 0 || zmiana.odstep > 400) throw new Error('Odstęp: 0–400 pkt.')
        for (const stary of dzieciXml(styl, 'spcAft')) styl.removeChild(stary)
        const odstep = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:spcAft')
        const punkty = dokument.createElementNS(przestrzeniePptx.rysunek[0], 'a:spcPts')
        punkty.setAttribute('val', String(Math.round(zmiana.odstep * 100))); odstep.appendChild(punkty)
        styl.insertBefore(odstep, dzieciXml(styl).find((element) => !['lnSpc', 'spcBef'].includes(element.localName)) ?? null)
      }
    }
    if (zmiana.warstwa) {
      const rodzic = obiekt.element.parentNode!
      if (zmiana.warstwa === 'przod') rodzic.insertBefore(obiekt.element, dzieciXml(rodzic, 'extLst')[0] ?? null)
      else rodzic.insertBefore(obiekt.element, dzieciXml(rodzic).find((element) => !['nvGrpSpPr', 'grpSpPr'].includes(element.localName)) ?? null)
    }
  }
  return zapiszZmianyPptx(model, new Map([[slajd.czesc, dokument]]))
}
