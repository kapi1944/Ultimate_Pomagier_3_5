import type { ModelPptx, ObiektSlajdu, SlajdPptx } from '../pptx/modelPptx'
import { dzieciXml, potomkowieXml } from '../pptx/xmlPptx'

export type TypRoznicy = 'Tekst' | 'Położenie' | 'Rozmiar' | 'Czcionka' | 'Formatowanie' | 'Kolor' | 'Obraz' | 'Dodany' | 'Usunięty' | 'Niejednoznaczny'
export type RoznicaPrezentacji = {
  id: string; slajd: number; czesc: string; tozsamosc: string | null; nazwa: string; typ: TypRoznicy
  przed: string; po: string; oryginal?: ObiektSlajdu; aktualny?: ObiektSlajdu
}

/** Ścieżka części slajdu i identyfikatory cNvPr, nigdy pozycje w drzewie. */
export function tozsamoscObiektu(slajd: SlajdPptx, obiekt: ObiektSlajdu): string | null {
  const identyfikatory: string[] = []
  let element: Element | null = obiekt.element
  while (element && element.localName !== 'spTree') {
    const dane = dzieciXml(element).find((dziecko) => /^nv/.test(dziecko.localName))
    const id = dane && potomkowieXml(dane, 'cNvPr')[0]?.getAttribute('id')
    if (!id || id === '0') return null
    const rodzic: ParentNode | null = element.parentNode as ParentNode | null
    if (rodzic && dzieciXml(rodzic).filter((sasiad) => {
      const wlasciwosci = dzieciXml(sasiad).find((dziecko) => /^nv/.test(dziecko.localName))
      return wlasciwosci && potomkowieXml(wlasciwosci, 'cNvPr')[0]?.getAttribute('id') === id
    }).length > 1) return null
    identyfikatory.unshift(id)
    element = element.parentNode?.nodeType === 1 ? element.parentNode as Element : null
  }
  return element ? `${slajd.czesc}#${identyfikatory.join('/')}` : null
}

export function mapaTozsamosci(slajd: SlajdPptx) {
  const mapa = new Map<string, ObiektSlajdu[]>()
  for (const obiekt of slajd.obiekty) {
    const id = tozsamoscObiektu(slajd, obiekt)
    if (id) mapa.set(id, [...(mapa.get(id) ?? []), obiekt])
  }
  return mapa
}

function podpis(obiekt: ObiektSlajdu, nazwy: string[]) {
  return nazwy.flatMap((nazwa) => potomkowieXml(obiekt.element, nazwa).map((element) => new XMLSerializer().serializeToString(element))).join('|')
}

export function porownajSlajdy(oryginal: SlajdPptx | undefined, aktualny: SlajdPptx): RoznicaPrezentacji[] {
  const wynik: RoznicaPrezentacji[] = []
  const stare = oryginal ? mapaTozsamosci(oryginal) : new Map<string, ObiektSlajdu[]>()
  const nowe = mapaTozsamosci(aktualny)
  const wspolne = (slajd: SlajdPptx | undefined) => (slajd?.obiekty ?? []).map((obiekt) => tozsamoscObiektu(slajd!, obiekt)).filter((id): id is string => Boolean(id && stare.has(id) && nowe.has(id)))
  const kolejnoscPrzed = wspolne(oryginal), kolejnoscPo = wspolne(aktualny)
  function dodaj(typ: TypRoznicy, id: string | null, przed: string, po: string, stary?: ObiektSlajdu, nowy?: ObiektSlajdu) {
    wynik.push({ id: `${aktualny.czesc}:${wynik.length}`, slajd: aktualny.numer, czesc: aktualny.czesc, tozsamosc: id,
      nazwa: nowy?.nazwa || stary?.nazwa || 'Obiekt', typ, przed, po, oryginal: stary, aktualny: nowy })
  }
  for (const id of new Set([...stare.keys(), ...nowe.keys()])) {
    const przed = stare.get(id) ?? [], po = nowe.get(id) ?? []
    if (przed.length > 1 || po.length > 1) { dodaj('Niejednoznaczny', null, 'Powielony identyfikator', 'Wymagana kontrola', przed[0], po[0]); continue }
    const stary = przed[0], nowy = po[0]
    if (!stary) { dodaj('Dodany', id, 'Brak', 'Obiekt', undefined, nowy); continue }
    if (!nowy) { dodaj('Usunięty', id, 'Obiekt', 'Brak', stary); continue }
    if (kolejnoscPrzed.indexOf(id) !== kolejnoscPo.indexOf(id)) dodaj('Formatowanie', id, `Warstwa: ${kolejnoscPrzed.indexOf(id) + 1}`, `Warstwa: ${kolejnoscPo.indexOf(id) + 1}`, stary, nowy)
    if (stary.tekst !== nowy.tekst) dodaj('Tekst', id, stary.tekst, nowy.tekst, stary, nowy)
    for (const [typ, pola] of [['Położenie', ['x', 'y']], ['Rozmiar', ['cx', 'cy']]] as const) {
      if (pola.some((pole) => Math.abs((stary.geometria?.[pole] ?? 0) - (nowy.geometria?.[pole] ?? 0)) > 2))
        dodaj(typ, id, JSON.stringify(stary.geometria), JSON.stringify(nowy.geometria), stary, nowy)
    }
    for (const [typ, nazwy] of [['Czcionka', ['latin', 'ea', 'cs']], ['Formatowanie', ['rPr', 'defRPr', 'pPr', 'bodyPr']], ['Kolor', ['solidFill', 'gradFill']], ['Obraz', ['blip']]] as [TypRoznicy, string[]][]) {
      const a = podpis(stary, nazwy) + (typ === 'Obraz' ? stary.podpisObrazu ?? '' : ''), b = podpis(nowy, nazwy) + (typ === 'Obraz' ? nowy.podpisObrazu ?? '' : '')
      if (a !== b) dodaj(typ, id, a || 'Domyślne', b || 'Domyślne', stary, nowy)
    }
  }
  for (const [slajd, czyStary] of [[oryginal, true], [aktualny, false]] as const) {
    for (const obiekt of slajd?.obiekty ?? []) if (!tozsamoscObiektu(slajd!, obiekt))
      dodaj('Niejednoznaczny', null, czyStary ? obiekt.tekst : 'Brak pewnego ID', czyStary ? 'Brak pewnego ID' : obiekt.tekst, czyStary ? obiekt : undefined, czyStary ? undefined : obiekt)
  }
  return wynik
}

export function porownajPrezentacje(oryginal: ModelPptx, aktualny: ModelPptx) {
  return aktualny.slajdy.flatMap((slajd) => porownajSlajdy(oryginal.slajdy.find((stary) => stary.czesc === slajd.czesc), slajd))
}
