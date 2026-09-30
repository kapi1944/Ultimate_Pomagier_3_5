import { DOMParser as ParserWezlowEdytora } from '@tiptap/pm/model'
import type { EditorView as WidokEdytora } from '@tiptap/pm/view'
import { czyStylOznaczeniaPoprawny, liczbaRzymska, rozpoznajOznaczenieProgramu, type UstawienieWierszaProgramu } from '../oznaczeniaProgramu'
const dozwoloneTagi = new Set(['div', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'hr'])
const tagiList = new Set(['ul', 'ol'])
const znacznikiFormatowaniaLinii = ['**', '++', '*']

export function obsluzWklejenieProgramu(widok: WidokEdytora, zdarzenie: ClipboardEvent) {
  const tekst = zdarzenie.clipboardData?.getData('text/plain')
  // Obce listy HTML nie są źródłem oznaczeń ani poziomów programu.
  if (!tekst) return Boolean(zdarzenie.clipboardData?.getData('text/html'))
  const element = document.createElement('div')
  element.innerHTML = konwertujTekstProgramuNaHtml(tekst.replace(/\r\n?/g, '\n'))
  const fragment = ParserWezlowEdytora.fromSchema(widok.state.schema).parseSlice(element)
  widok.dispatch(widok.state.tr.replaceSelection(fragment).scrollIntoView())
  return true
}

function oczyscWezelHtml(wezel: ChildNode, dokument: Document): ChildNode | DocumentFragment | null {
  if (wezel.nodeType === Node.TEXT_NODE) {
    return dokument.createTextNode(wezel.textContent ?? '')
  }

  if (!(wezel instanceof HTMLElement)) {
    return null
  }

  const nazwa = wezel.tagName.toLowerCase()

  if (!dozwoloneTagi.has(nazwa)) {
    const fragment = dokument.createDocumentFragment()

    wezel.childNodes.forEach((dziecko) => {
      const oczyszczone = oczyscWezelHtml(dziecko, dokument)

      if (oczyszczone) {
        fragment.appendChild(oczyszczone)
      }
    })

    return fragment
  }

  const nazwaDocelowa = nazwa === 'div' && !wezel.querySelector('div,p,ul,ol') ? 'p' : nazwa === 'b' ? 'strong' : nazwa === 'i' ? 'em' : nazwa === 'h1' ? 'h2' : nazwa
  const element = dokument.createElement(nazwaDocelowa)
  for (const atrybut of ['start', 'type', 'data-oznaczenie', 'data-styl-oznaczenia', 'data-poziom']) {
    const wartosc = wezel.getAttribute(atrybut)
    if (wartosc !== null && (atrybut !== 'data-styl-oznaczenia' || czyStylOznaczeniaPoprawny(wartosc))) element.setAttribute(atrybut, wartosc)
  }

  wezel.childNodes.forEach((dziecko) => {
    const oczyszczone = oczyscWezelHtml(dziecko, dokument)

    if (oczyszczone) {
      element.appendChild(oczyszczone)
    }
  })

  return element
}

export function oczyscHtmlProgramu(html: string) {
  const dokument = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const wynik = document.createElement('div')

  dokument.body.firstElementChild?.childNodes.forEach((wezel) => {
    const oczyszczony = oczyscWezelHtml(wezel, document)

    if (oczyszczony) {
      wynik.appendChild(oczyszczony)
    }
  })

  return wynik.innerHTML
}

function pobierzTekstInline(wezel: ChildNode): string {
  if (wezel.nodeType === Node.TEXT_NODE) {
    return wezel.textContent ?? ''
  }

  if (!(wezel instanceof HTMLElement)) {
    return ''
  }

  const nazwa = wezel.tagName.toLowerCase()

  if (nazwa === 'br') {
    return '\n'
  }

  if (tagiList.has(nazwa)) {
    return ''
  }

  const tekst = Array.from(wezel.childNodes).map(pobierzTekstInline).join('')

  if (!tekst.trim()) {
    return tekst
  }

  if (nazwa === 'strong' || nazwa === 'b') {
    return `**${tekst.trim()}**`
  }

  if (nazwa === 'em' || nazwa === 'i') {
    return `*${tekst.trim()}*`
  }

  if (nazwa === 'u') {
    return `++${tekst.trim()}++`
  }

  return tekst
}

function pobierzTekstBezListZagniezdzonych(element: HTMLElement) {
  return Array.from(element.childNodes)
    .filter((wezel) => !(wezel instanceof HTMLElement && tagiList.has(wezel.tagName.toLowerCase())))
    .map((wezel) => wezel instanceof HTMLElement && ['p', 'div'].includes(wezel.tagName.toLowerCase()) ? `${pobierzTekstInline(wezel)}\n` : pobierzTekstInline(wezel))
    .join('')
    .trim()
}

function rozpakujPelneFormatowanieLinii(tresc: string) {
  const znaczniki: string[] = []
  let wynik = tresc.trim()
  let czyZmieniono = true

  while (czyZmieniono) {
    czyZmieniono = false

    for (const znacznik of znacznikiFormatowaniaLinii) {
      if (wynik.startsWith(znacznik) && wynik.endsWith(znacznik) && wynik.length > znacznik.length * 2) {
        znaczniki.push(znacznik)
        wynik = wynik.slice(znacznik.length, -znacznik.length).trim()
        czyZmieniono = true
        break
      }
    }
  }

  return { tresc: wynik, znaczniki }
}

function opakujTrescZnacznikami(tresc: string, znaczniki: string[]) {
  return znaczniki.reduceRight((wynik, znacznik) => `${znacznik}${wynik}${znacznik}`, tresc)
}

function pobierzPrefiksStruktury(tresc: string) {
  const dzien = tresc.match(/^(Dzie(?:ń|n)\s+(?:[0-9]+|[ivxlcdm]+))[.:)]?\s*(.*)$/i)

  if (dzien) {
    return { prefiks: dzien[1], reszta: dzien[2] ?? '' }
  }

  const naglowek = tresc.match(/^(#{2,3}\s+)(.+)$/)

  if (naglowek) {
    return { prefiks: naglowek[1].trimEnd(), reszta: naglowek[2] ?? '' }
  }

  const oznaczenie = rozpoznajOznaczenieProgramu(tresc)
  if (oznaczenie) return { prefiks: oznaczenie.oznaczenie.zapis, reszta: oznaczenie.tresc }

  const numer = tresc.match(/^([0-9]{1,3}(?:[.)]|\s*[-–—]|\s+))\s*(.+)$/)

  if (numer) {
    return { prefiks: numer[1].trimEnd(), reszta: numer[2] ?? '' }
  }

  return null
}

function normalizujWierszProgramu(wiersz: string) {
  const przyciety = wiersz.trim()
  const bezFormatowaniaSamegoPrefiksu = przyciety
    .replace(/^(\*\*|\+\+|\*)(Dzie(?:ń|n)\s+(?:[0-9]+|[ivxlcdm]+))\1\s*/i, '$2 ')
    .replace(/^(\*\*|\+\+|\*)([0-9]+[.)]|[IVXLCDMivxlcdm]+[.)]|[a-zA-Z][.)])\1\s*/, '$2 ')
  const rozpakowane = rozpakujPelneFormatowanieLinii(bezFormatowaniaSamegoPrefiksu)
  const prefiks = pobierzPrefiksStruktury(rozpakowane.tresc)

  if (!prefiks || !rozpakowane.znaczniki.length) {
    return bezFormatowaniaSamegoPrefiksu
  }

  const reszta = prefiks.reszta.trim()

  return reszta ? `${prefiks.prefiks} ${opakujTrescZnacznikami(reszta, rozpakowane.znaczniki)}` : prefiks.prefiks
}

function czyWierszStrukturalny(wiersz: string) {
  return Boolean(pobierzPrefiksStruktury(rozpakujPelneFormatowanieLinii(wiersz.trim()).tresc))
}

export function konwertujHtmlNaWierszeProgramu(html: string) {
  const dokument = new DOMParser().parseFromString(`<div>${oczyscHtmlProgramu(html)}</div>`, 'text/html')
  const wiersze: string[] = []
  const ustawienia: UstawienieWierszaProgramu[] = []
  function dodajTekst(tekst: string, element?: HTMLElement, poziom = 0, prefiks = '') {
    const styl = element?.getAttribute('data-styl-oznaczenia') ?? undefined
    const wciecie = Number(element?.getAttribute('data-poziom') ?? poziom)
    tekst.split('\n').forEach((wiersz, indeks) => {
      const tresc = normalizujWierszProgramu(wiersz)
      if (!tresc) return
      const oznaczenie = rozpoznajOznaczenieProgramu(rozpakujPelneFormatowanieLinii(tresc).tresc)
      wiersze.push(`${'\t'.repeat(Math.max(0, Math.min(8, wciecie)))}${indeks === 0 && prefiks && !oznaczenie && !czyWierszStrukturalny(tresc) ? `${prefiks} ` : ''}${tresc}`)
      ustawienia.push({ styl, poziom: element?.hasAttribute('data-poziom') ? wciecie : undefined })
    })
  }
  function dodajWezel(wezel: ChildNode, poziom = 0) {
    if (wezel.nodeType === Node.TEXT_NODE) { dodajTekst(wezel.textContent ?? ''); return }
    if (!(wezel instanceof HTMLElement)) return
    const nazwa = wezel.tagName.toLowerCase()
    if (tagiList.has(nazwa)) {
      const poczatek = Number(wezel.getAttribute('start') ?? 1)
      Array.from(wezel.children).filter((dziecko) => dziecko.tagName.toLowerCase() === 'li').forEach((dziecko, indeks) => {
        const element = dziecko as HTMLElement
        const typ = wezel.getAttribute('type')
        const liczba = poczatek + indeks
        const prefiks = element.getAttribute('data-oznaczenie') ?? (nazwa === 'ol' ? typ === 'a' ? `${String.fromCharCode(96 + liczba)})` : typ === 'I' ? `${liczbaRzymska(liczba)}.` : `${liczba}.` : '-')
        dodajTekst(pobierzTekstBezListZagniezdzonych(element), element, poziom, prefiks)
        Array.from(element.children).filter((lista) => tagiList.has(lista.tagName.toLowerCase())).forEach((lista) => dodajWezel(lista, poziom + 1))
      })
      return
    }
    if (['h1', 'h2', 'h3'].includes(nazwa)) { dodajTekst(`## ${pobierzTekstInline(wezel)}`, wezel); return }
    if (nazwa === 'p' || nazwa === 'div') {
      if (Array.from(wezel.children).some((dziecko) => ['p', 'div', 'ul', 'ol'].includes(dziecko.tagName.toLowerCase()))) {
        let tekstInline = ''
        wezel.childNodes.forEach((dziecko) => {
          if (dziecko instanceof HTMLElement && ['p', 'div', 'ul', 'ol'].includes(dziecko.tagName.toLowerCase())) {
            dodajTekst(tekstInline, wezel, poziom)
            tekstInline = ''
            dodajWezel(dziecko, poziom)
          } else tekstInline += pobierzTekstInline(dziecko)
        })
        dodajTekst(tekstInline, wezel, poziom)
      } else dodajTekst(pobierzTekstInline(wezel), wezel, poziom, wezel.getAttribute('data-oznaczenie') ?? '')
      return
    }
    if (nazwa === 'hr') { wiersze.push(''); ustawienia.push({}); return }
    wezel.childNodes.forEach((dziecko) => dodajWezel(dziecko, poziom))
  }
  dokument.body.firstElementChild?.childNodes.forEach((wezel) => dodajWezel(wezel))
  return { tekst: wiersze.join('\n').replace(/^\n+|\n+$/g, ''), ustawienia }
}

export function konwertujHtmlNaTekstProgramu(html: string) {
  return konwertujHtmlNaWierszeProgramu(html).tekst
}

function zabezpieczHtml(tekst: string) {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function konwertujZnacznikiInlineNaHtml(tekst: string) {
  return zabezpieczHtml(tekst)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

export function konwertujTekstProgramuNaHtml(tekst: string, ustawienia: UstawienieWierszaProgramu[] = []) {
  const fragmenty: string[] = []
  const listy: { tag: string; typ: string }[] = []
  function zamknijDo(glebokosc: number) {
    while (listy.length > glebokosc) { const lista = listy.pop(); fragmenty.push(`</li></${lista?.tag}>`) }
  }
  tekst.split(/\r?\n/).forEach((wiersz, indeksWiersza) => {
    const ustawienie = ustawienia[indeksWiersza]
    const atrybuty = `${ustawienie?.styl ? ` data-styl-oznaczenia="${zabezpieczHtml(ustawienie.styl)}"` : ''}${ustawienie?.poziom !== undefined ? ` data-poziom="${ustawienie.poziom}"` : ''}`
    const tresc = normalizujWierszProgramu(wiersz)
    if (!tresc) { zamknijDo(0); return }
    const pozycja = rozpoznajOznaczenieProgramu(tresc)
    const wciecie = wiersz.match(/^\s*/)?.[0] ?? ''
    const poziom = (wciecie.match(/\t/g) ?? []).length + Math.floor(wciecie.replace(/\t/g, '').length / 2)
    if (pozycja) {
      const tag = pozycja.oznaczenie.rodzaj === 'punktor' ? 'ul' : 'ol'
      const typ = pozycja.oznaczenie.rodzaj === 'rzymskie' ? 'I' : pozycja.oznaczenie.rodzaj === 'literowe' ? 'a' : '1'
      const docelowy = Math.min(poziom, listy.length)
      zamknijDo(docelowy + 1)
      if (listy[docelowy] && (listy[docelowy].tag !== tag || listy[docelowy].typ !== typ)) zamknijDo(docelowy)
      if (listy.length === docelowy) {
        fragmenty.push(`<${tag}${tag === 'ol' ? ` type="${typ}" start="${pozycja.oznaczenie.wartosc ?? 1}"` : ''}>`)
        listy.push({ tag, typ })
      } else fragmenty.push('</li>')
      fragmenty.push(`<li${atrybuty}${ustawienie?.poziom === undefined && docelowy !== poziom ? ` data-poziom="${poziom}"` : ''} data-oznaczenie="${zabezpieczHtml(pozycja.oznaczenie.zapis)}"><p>${konwertujZnacznikiInlineNaHtml(pozycja.tresc)}</p>`)
      return
    }
    zamknijDo(0)
    if (/^#{2,3}\s+/.test(tresc)) fragmenty.push(`<h2${atrybuty}>${konwertujZnacznikiInlineNaHtml(tresc.replace(/^#{2,3}\s+/, ''))}</h2>`)
    else if (/^-{3,}$/.test(tresc)) fragmenty.push('<hr>')
    else fragmenty.push(`<p${atrybuty}${ustawienie?.poziom === undefined && poziom > 0 ? ` data-poziom="${poziom}"` : ''}>${konwertujZnacznikiInlineNaHtml(tresc)}</p>`)
  })
  zamknijDo(0)
  return fragmenty.join('') || '<p></p>'
}
