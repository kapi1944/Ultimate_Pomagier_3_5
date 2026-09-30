import { Extension } from '@tiptap/react'
import type { Node as WezelEdytora } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { czyStylOznaczeniaPoprawny, rozpoznajOznaczenieProgramu, wyznaczOznaczeniaProgramu, wyznaczPoziomyProgramu, formatujOznaczenieProgramu } from '../oznaczeniaProgramu'

export function pobierzPozycjeOznaczenEdytora(dokument: WezelEdytora) {
  const pozycje: { pozycja: number; rozmiar: number; poziom: number; jawnyPoziom?: number; tresc: string; oryginalne?: string; wartosc?: number; styl?: string; domyslnyStyl?: string }[] = []
  dokument.descendants((wezel, pozycja, rodzic) => {
    if (/^Dzie(?:ń|n)\s+(?:\d+|[ivxlcdm]+)/i.test(wezel.textContent)) return
    if (!['listItem', 'paragraph', 'heading'].includes(wezel.type.name) || rodzic?.type.name === 'listItem' || !wezel.textContent.trim()) return
    const sciezka = dokument.resolve(pozycja)
    let poziom = -1
    for (let indeks = 0; indeks <= sciezka.depth; indeks += 1) if (['bulletList', 'orderedList'].includes(sciezka.node(indeks).type.name)) poziom += 1
    let oryginalne = typeof wezel.attrs.oznaczenieOryginalne === 'string' ? wezel.attrs.oznaczenieOryginalne : undefined
    if (!oryginalne && wezel.type.name === 'listItem') {
      const lista = sciezka.parent
      const liczba = (lista.attrs.start ?? 1) + sciezka.index()
      oryginalne = lista.type.name === 'orderedList' ? formatujOznaczenieProgramu(lista.attrs.typNumeracji === 'I' ? 'rzymskie.' : lista.attrs.typNumeracji === 'a' ? 'literowe)' : 'arabskie.', liczba) : '-'
    }
    const tekst = wezel.type.name === 'listItem' ? wezel.firstChild?.textContent ?? '' : wezel.textContent
    const tresc = oryginalne ? `${oryginalne} ${tekst}` : tekst
    pozycje.push({ pozycja, rozmiar: wezel.nodeSize, poziom: Math.max(0, poziom), jawnyPoziom: wezel.attrs.poziomProgramu ?? undefined, tresc, oryginalne,
      wartosc: rozpoznajOznaczenieProgramu(tresc)?.oznaczenie.wartosc,
      styl: wezel.attrs.stylOznaczenia ?? undefined,
      domyslnyStyl: wezel.type.name === 'heading' || /^Modu(?:ł|l)\s/i.test(tekst) ? 'brak' : undefined })
  })
  const poziomy = wyznaczPoziomyProgramu(pozycje)
  return pozycje.map((pozycja, indeks) => ({ ...pozycja, poziom: poziomy[indeks] }))
}

export const RozszerzenieOznaczenProgramu = Extension.create<{ stylePoziomow: string[]; domyslneStyle: string[] }>({
  name: 'oznaczeniaProgramu',
  addOptions() { return { stylePoziomow: [], domyslneStyle: ['arabskie.', '◦', '▪'] } },
  addGlobalAttributes() {
    return [{ types: ['listItem', 'paragraph', 'heading'], attributes: {
      oznaczenieOryginalne: { default: null, keepOnSplit: false, parseHTML: (element) => element.getAttribute('data-oznaczenie'), renderHTML: (atrybuty) => atrybuty.oznaczenieOryginalne ? { 'data-oznaczenie': atrybuty.oznaczenieOryginalne } : {} },
      stylOznaczenia: { default: null, keepOnSplit: false, parseHTML: (element) => czyStylOznaczeniaPoprawny(element.getAttribute('data-styl-oznaczenia')) ? element.getAttribute('data-styl-oznaczenia') : null, renderHTML: (atrybuty) => atrybuty.stylOznaczenia ? { 'data-styl-oznaczenia': atrybuty.stylOznaczenia } : {} },
      poziomProgramu: { default: null, parseHTML: (element) => element.hasAttribute('data-poziom') ? Number(element.getAttribute('data-poziom')) : null, renderHTML: (atrybuty) => atrybuty.poziomProgramu !== null ? { 'data-poziom': atrybuty.poziomProgramu } : {} },
    } }, { types: ['orderedList'], attributes: { typNumeracji: { default: '1', parseHTML: (element) => element.getAttribute('type') ?? '1', renderHTML: (atrybuty) => ({ type: atrybuty.typNumeracji }) } } }]
  },
  addProseMirrorPlugins() {
    const opcje = this.options
    return [new Plugin({ props: { decorations(stan) {
      const pozycje = pobierzPozycjeOznaczenEdytora(stan.doc)
      const oznaczenia = wyznaczOznaczeniaProgramu(pozycje, opcje.stylePoziomow, opcje.domyslneStyle)
      return DecorationSet.create(stan.doc, pozycje.map((pozycja, indeks) => Decoration.node(pozycja.pozycja, pozycja.pozycja + pozycja.rozmiar, {
        'data-wyswietlane-oznaczenie': oznaczenia[indeks],
        style: `margin-left: ${Math.max(0, pozycja.poziom - (pozycje.slice(0, indeks).filter((rodzic) => rodzic.pozycja < pozycja.pozycja && rodzic.pozycja + rodzic.rozmiar > pozycja.pozycja).at(-1)?.poziom ?? 0)) * 22}px`,
      })))
    } } })]
  },
})
