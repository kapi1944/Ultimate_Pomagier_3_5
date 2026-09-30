import { cloneElement, Fragment, isValidElement, type ReactNode, type ReactElement } from 'react'
import type { ElementScenyPdf, ScenaPdf, StylTekstuPdf } from './scenaPdf'

type WlasciwosciElementu = { children?: ReactNode; src?: string; ref?: unknown }
type OpisElementu = { teksty: string[]; zrodloObrazu?: string }
const opisyElementow = new WeakMap<Element, OpisElementu>()

/** Treść pochodzi z modelu przekazanego rendererowi, nigdy z innerText/textContent DOM.
 * Adapter obejmuje wyłącznie czyste komponenty prezentacji, bez hooków i stanu.
 * DOM dostarcza geometrię oraz wyliczone style, tak jak pomiary paginatora.
 */
export function oznaczSemantykePdf(wezel: ReactNode): ReactNode {
  if (Array.isArray(wezel)) return wezel.map((dziecko, indeks) => {
    const wynik = oznaczSemantykePdf(dziecko)
    return isValidElement(wynik) ? cloneElement(wynik, { key: isValidElement(dziecko) ? dziecko.key ?? `pdf-${indeks}` : `pdf-${indeks}` }) : wynik
  })
  if (!isValidElement<WlasciwosciElementu>(wezel)) return wezel
  if (wezel.type === Fragment) return oznaczSemantykePdf(wezel.props.children)
  if (typeof wezel.type === 'function') {
    const renderuj = wezel.type as (wlasciwosci: WlasciwosciElementu) => ReactNode
    const wynik = oznaczSemantykePdf(renderuj(wezel.props))
    return isValidElement(wynik) ? cloneElement(wynik, { key: wezel.key }) : wynik
  }
  if (typeof wezel.type !== 'string') throw new Error('Nieobsługiwany element sceny PDF.')
  if (wezel.props.ref) throw new Error('Element sceny PDF ma własny ref.')
  const dzieci = oznaczSemantykePdf(wezel.props.children)
  const teksty: string[] = []
  function zbierzTeksty(element: ReactNode) {
    if (Array.isArray(element)) element.forEach(zbierzTeksty)
    else if (typeof element === 'string' || typeof element === 'number') {
      if (String(element)) teksty.push(String(element))
    }
  }
  zbierzTeksty(dzieci)
  return cloneElement(wezel as ReactElement<WlasciwosciElementu & { ref: (element: Element | null) => void }>, {
    children: dzieci,
    ref: (element: Element | null) => {
      if (element) opisyElementow.set(element, { teksty, zrodloObrazu: wezel.props.src })
    },
  })
}

function kolorPdf(kolor: string) {
  const liczby = kolor.match(/[\d.]+/g)?.map(Number)
  if (!liczby || liczby.length < 3 || liczby[3] === 0) return null
  const alfa = liczby[3] ?? 1
  return `#${liczby.slice(0, 3).map((liczba) => Math.round(liczba * alfa + 255 * (1 - alfa)).toString(16).padStart(2, '0')).join('')}`
}

export function zmierzScenePdf(strony: HTMLElement[]): ScenaPdf {
  if (!strony.length) throw new Error('Brak finalnych stron PDF.')
  return { strony: strony.map((strona) => {
    const granice = strona.getBoundingClientRect()
    const skala = 210 / granice.width
    const elementy: ElementScenyPdf[] = []
    if (!opisyElementow.has(strona)) throw new Error('Strona nie ma modelu semantycznego PDF.')
    function odwiedz(element: Element, podkreslenieRodzica = false) {
      const opis = opisyElementow.get(element)
      if (!opis) throw new Error('Brak semantyki elementu PDF.')
      const styl = window.getComputedStyle(element)
      if (styl.display === 'none' || styl.visibility === 'hidden') return
      const prostokat = element.getBoundingClientRect()
      const x = (prostokat.left - granice.left) * skala
      const y = (prostokat.top - granice.top) * skala
      const szerokosc = prostokat.width * skala
      const wysokosc = prostokat.height * skala
      const krycie = parseFloat(styl.opacity)
      const czyPrzycinac = styl.overflowX === 'hidden' || styl.overflowY === 'hidden'
      const czyGrupa = krycie < 1 || czyPrzycinac
      if (czyGrupa) elementy.push({ rodzaj: 'poczatek_grupy', krycie, przyciecie: czyPrzycinac ? { x, y, szerokosc, wysokosc } : undefined })
      const tlo = kolorPdf(styl.backgroundColor)
      if (tlo) elementy.push({ rodzaj: 'prostokat', x, y, szerokosc, wysokosc, kolor: tlo })
      const boki = [
        [styl.borderTopWidth, styl.borderTopColor, styl.borderTopStyle, x, y, x + szerokosc, y],
        [styl.borderRightWidth, styl.borderRightColor, styl.borderRightStyle, x + szerokosc, y, x + szerokosc, y + wysokosc],
        [styl.borderBottomWidth, styl.borderBottomColor, styl.borderBottomStyle, x, y + wysokosc, x + szerokosc, y + wysokosc],
        [styl.borderLeftWidth, styl.borderLeftColor, styl.borderLeftStyle, x, y, x, y + wysokosc],
      ] as const
      for (const [gruboscCss, kolorCss, stylLinii, x, y, koniecX, koniecY] of boki) {
        const grubosc = parseFloat(gruboscCss) * skala
        const kolor = kolorPdf(kolorCss)
        if (grubosc && kolor && stylLinii !== 'none') elementy.push({ rodzaj: 'linia', x, y, koniecX, koniecY, grubosc, kolor, kreski: stylLinii === 'dashed' ? [grubosc * 3, grubosc * 2] : stylLinii === 'dotted' ? [grubosc, grubosc] : undefined })
      }
      if (opis.zrodloObrazu && element instanceof HTMLImageElement) {
        if (!element.complete || !element.naturalWidth) throw new Error('Obraz PDF nie został wczytany.')
        const mnoznik = styl.objectFit === 'cover' ? Math.max(prostokat.width / element.naturalWidth, prostokat.height / element.naturalHeight) : Math.min(prostokat.width / element.naturalWidth, prostokat.height / element.naturalHeight)
        const dopasowanie = styl.objectFit === 'contain' || styl.objectFit === 'cover'
        const szerokoscObrazu = dopasowanie ? element.naturalWidth * mnoznik * skala : szerokosc
        const wysokoscObrazu = dopasowanie ? element.naturalHeight * mnoznik * skala : wysokosc
        elementy.push({ rodzaj: 'obraz', zrodlo: opis.zrodloObrazu, x: x + (szerokosc - szerokoscObrazu) / 2, y: y + (wysokosc - wysokoscObrazu) / 2, szerokosc: szerokoscObrazu, wysokosc: wysokoscObrazu, przyciecie: { x, y, szerokosc, wysokosc } })
      }
      let indeksTekstu = 0
      const dzieci = Array.from(element.childNodes).sort((pierwsze, drugie) => {
        const warstwa = (wezel: Node) => wezel instanceof Element ? parseInt(window.getComputedStyle(wezel).zIndex) || 0 : 0
        return warstwa(pierwsze) - warstwa(drugie)
      })
      for (const dziecko of dzieci) {
        if (dziecko.nodeType === Node.ELEMENT_NODE) odwiedz(dziecko as Element, podkreslenieRodzica || styl.textDecorationLine.includes('underline'))
        else if (dziecko.nodeType === Node.TEXT_NODE) {
          const tekst = opis.teksty[indeksTekstu++]
          if (tekst === undefined || tekst.length !== (dziecko as Text).length) throw new Error('Model tekstu PDF nie odpowiada pomiarowi.')
          const zakres = document.createRange()
          const rozmiar = parseFloat(styl.fontSize) * skala * 72 / 25.4
          const pogrubienie = parseInt(styl.fontWeight) >= 600 || styl.fontWeight === 'bold'
          const kursywa = styl.fontStyle === 'italic'
          const stylPdf: StylTekstuPdf = pogrubienie ? kursywa ? 'bolditalic' : 'bold' : kursywa ? 'italic' : 'normal'
          const kolor = kolorPdf(styl.color) ?? '#000000'
          const podkreslenie = podkreslenieRodzica || styl.textDecorationLine.includes('underline')
          let fragment = ''
          let poczatek = 0
          let poprzedniaGora = Number.NaN
          function dodajFragment(koniec: number) {
            if (!fragment || !fragment.trim()) return
            const odcinki = styl.textAlign === 'justify'
              ? [...fragment.matchAll(/\S+/g)].map((dopasowanie) => ({ tekst: dopasowanie[0], od: poczatek + dopasowanie.index, do: poczatek + dopasowanie.index + dopasowanie[0].length }))
              : [{ tekst: fragment, od: poczatek, do: koniec }]
            for (const odcinek of odcinki) {
              zakres.setStart(dziecko, odcinek.od)
              zakres.setEnd(dziecko, odcinek.do)
              const pomiar = zakres.getBoundingClientRect()
              const tresc = odcinek.tekst.replace(/[\r\n]/g, '').replace(/\u00a0/g, ' ')
              elementy.push({ rodzaj: 'tekst', tekst: tresc, x: (pomiar.left - granice.left) * skala, y: (pomiar.top - granice.top) * skala, szerokosc: pomiar.width * skala, rozmiar, styl: stylPdf, kolor, podkreslenie })
            }
          }
          for (let indeks = 0; indeks < tekst.length; indeks++) {
            zakres.setStart(dziecko, indeks)
            zakres.setEnd(dziecko, indeks + 1)
            const pomiar = zakres.getBoundingClientRect()
            if (fragment && Math.abs(pomiar.top - poprzedniaGora) > 0.5) {
              dodajFragment(indeks)
              fragment = ''
              poczatek = indeks
            }
            fragment += tekst[indeks]
            poprzedniaGora = pomiar.top
          }
          dodajFragment(tekst.length)
        }
      }
      if (czyGrupa) elementy.push({ rodzaj: 'koniec_grupy' })
    }
    odwiedz(strona)
    return { elementy }
  }) }
}
