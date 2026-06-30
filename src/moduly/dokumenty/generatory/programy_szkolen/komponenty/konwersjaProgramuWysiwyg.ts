const dozwoloneTagi = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'hr'])
const tagiList = new Set(['ul', 'ol'])
const znacznikiFormatowaniaLinii = ['**', '++', '*']

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

  const nazwaDocelowa = nazwa === 'b' ? 'strong' : nazwa === 'i' ? 'em' : nazwa === 'h1' ? 'h2' : nazwa
  const element = dokument.createElement(nazwaDocelowa)

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
    .map(pobierzTekstInline)
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
    .replace(/^(\*\*|\+\+|\*)([0-9]{1,3}[.)])\1\s*/, '$2 ')
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

function dodajWierszeBloku(tekst: string, wiersze: string[]) {
  tekst
    .split('\n')
    .map(normalizujWierszProgramu)
    .filter(Boolean)
    .forEach((wiersz) => wiersze.push(wiersz))
}

function dodajListeDoTekstu(element: HTMLElement, wiersze: string[], poziom = 0) {
  const czyNumerowana = element.tagName.toLowerCase() === 'ol'
  const elementyListy = Array.from(element.children).filter((dziecko) => dziecko.tagName.toLowerCase() === 'li')

  elementyListy.forEach((pozycja, indeks) => {
    const tekst = normalizujWierszProgramu(pobierzTekstBezListZagniezdzonych(pozycja as HTMLElement))
    const znacznik = czyNumerowana ? `${indeks + 1}.` : '-'

    if (tekst) {
      wiersze.push(czyWierszStrukturalny(tekst) ? tekst : `${'\t'.repeat(poziom)}${znacznik} ${tekst}`)
    }

    Array.from(pozycja.children)
      .filter((dziecko) => tagiList.has(dziecko.tagName.toLowerCase()))
      .forEach((lista) => dodajListeDoTekstu(lista as HTMLElement, wiersze, poziom + 1))
  })
}

export function konwertujHtmlNaTekstProgramu(html: string) {
  const dokument = new DOMParser().parseFromString(`<div>${oczyscHtmlProgramu(html)}</div>`, 'text/html')
  const wiersze: string[] = []

  function dodajWezel(wezel: ChildNode) {
    if (wezel.nodeType === Node.TEXT_NODE) {
      const tekst = wezel.textContent?.trim()

      if (tekst) {
        wiersze.push(tekst)
      }

      return
    }

    if (!(wezel instanceof HTMLElement)) {
      return
    }

    const nazwa = wezel.tagName.toLowerCase()

    if (['h1', 'h2', 'h3'].includes(nazwa)) {
      const tekst = normalizujWierszProgramu(pobierzTekstInline(wezel))

      if (tekst) {
        wiersze.push(`## ${tekst}`)
      }

      return
    }

    if (nazwa === 'p') {
      const tekst = pobierzTekstInline(wezel).trim()

      if (tekst) {
        dodajWierszeBloku(tekst, wiersze)
      }

      return
    }

    if (tagiList.has(nazwa)) {
      dodajListeDoTekstu(wezel, wiersze)
      return
    }

    if (nazwa === 'hr') {
      wiersze.push('')
      return
    }

    wezel.childNodes.forEach(dodajWezel)
  }

  dokument.body.firstElementChild?.childNodes.forEach(dodajWezel)

  return wiersze.join('\n').replace(/\n{3,}/g, '\n\n').trim()
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

function pobierzPozycjeListy(wiersz: string) {
  const dopasowanie = wiersz.match(/^(\s*)(?:[-–—*•◦▪]|\d+[.)])\s+(.+)$/)

  if (!dopasowanie) {
    return null
  }

  const poziom = (dopasowanie[1].match(/\t/g) ?? []).length + Math.floor(dopasowanie[1].replace(/\t/g, '').length / 2)

  return {
    poziom,
    tresc: dopasowanie[2],
    czyNumerowana: /\d+[.)]/.test(wiersz.trimStart().split(/\s+/)[0] ?? ''),
  }
}

export function konwertujTekstProgramuNaHtml(tekst: string) {
  const wiersze = tekst.split(/\r?\n/)
  const fragmenty: string[] = []
  let otwarteListy = 0

  function zamknijListyDo(poziom: number) {
    while (otwarteListy > poziom) {
      fragmenty.push('</li></ul>')
      otwarteListy -= 1
    }
  }

  wiersze.forEach((wiersz) => {
    const tresc = wiersz.trim()

    if (!tresc) {
      zamknijListyDo(0)
      return
    }

    const pozycjaListy = pobierzPozycjeListy(wiersz)

    if (pozycjaListy) {
      while (otwarteListy <= pozycjaListy.poziom) {
        fragmenty.push('<ul>')
        otwarteListy += 1
      }

      zamknijListyDo(pozycjaListy.poziom + 1)
      fragmenty.push(`<li>${konwertujZnacznikiInlineNaHtml(pozycjaListy.tresc)}`)
      return
    }

    zamknijListyDo(0)

    if (/^#{2,3}\s+/.test(tresc)) {
      fragmenty.push(`<h2>${konwertujZnacznikiInlineNaHtml(tresc.replace(/^#{2,3}\s+/, ''))}</h2>`)
      return
    }

    if (/^-{3,}$/.test(tresc)) {
      fragmenty.push('<hr>')
      return
    }

    fragmenty.push(`<p>${konwertujZnacznikiInlineNaHtml(tresc)}</p>`)
  })

  zamknijListyDo(0)

  return fragmenty.join('') || '<p></p>'
}
