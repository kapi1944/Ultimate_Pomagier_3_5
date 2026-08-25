import { czytajZip } from '../../../../wspolne/import/czytnikZip'
import { importujTekstProgramu, utworzWynikImportuProgramu, type WynikImportuProgramu } from './pipelineImportuProgramu'

const przestrzenNazwWorda = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function czyPusta(wartosc: string) {
  return !wartosc.trim()
}

function tekstAkapitu(akapit: Element) {
  const fragmenty: string[] = []

  Array.from(akapit.getElementsByTagNameNS(przestrzenNazwWorda, 'r')).forEach((run) => {
    fragmenty.push(Array.from(run.getElementsByTagNameNS(przestrzenNazwWorda, 't')).map((tekst) => tekst.textContent ?? '').join(''))
    if (run.getElementsByTagNameNS(przestrzenNazwWorda, 'br').length) {
      fragmenty.push('\n')
    }
    if (run.getElementsByTagNameNS(przestrzenNazwWorda, 'tab').length) {
      fragmenty.push('\t')
    }
  })

  return fragmenty.join('').replace(/\s+([:,.])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
}

function wyodrebnijTekstZDokumentuXml(xml: string) {
  const dokument = new DOMParser().parseFromString(xml, 'application/xml')
  const bladParsera = dokument.getElementsByTagName('parsererror')[0]
  const tresc = dokument.getElementsByTagNameNS(przestrzenNazwWorda, 'body')[0]

  if (bladParsera || !tresc) {
    throw new Error('DOCX nie zawiera poprawnej treści dokumentu.')
  }

  return Array.from(tresc.children).flatMap((dziecko) => {
    if (dziecko.localName === 'p') {
      const tekst = tekstAkapitu(dziecko)
      const czyLista = dziecko.getElementsByTagNameNS(przestrzenNazwWorda, 'numPr').length > 0
      return tekst ? [`${czyLista ? '- ' : ''}${tekst}`] : []
    }

    if (dziecko.localName === 'tbl') {
      return Array.from(dziecko.getElementsByTagNameNS(przestrzenNazwWorda, 'p'))
        .map(tekstAkapitu)
        .filter(Boolean)
    }

    return []
  }).join('\n').trim()
}

export function utworzWynikImportuProgramuZTekstuDocx(tekst: string): WynikImportuProgramu {
  const wynikTekstu = importujTekstProgramu(tekst)

  return utworzWynikImportuProgramu({
    zrodlo: 'DOCX',
    propozycje: wynikTekstu.propozycje,
    ostrzezenia: wynikTekstu.ostrzezenia,
    bledy: czyPusta(tekst) ? ['Nie znaleziono treści programu do importu z DOCX.'] : wynikTekstu.bledy,
  })
}

export async function importujDocxProgramu(plik: File): Promise<WynikImportuProgramu> {
  if (!/\.docx$/i.test(plik.name)) {
    return utworzWynikImportuProgramu({
      zrodlo: 'DOCX', propozycje: [], ostrzezenia: [], bledy: ['Wybierz plik DOCX z rozszerzeniem .docx.'],
    })
  }

  if (plik.size === 0) {
    return utworzWynikImportuProgramu({
      zrodlo: 'DOCX', propozycje: [], ostrzezenia: [], bledy: ['Plik DOCX jest pusty.'],
    })
  }

  try {
    const zip = await czytajZip(await plik.arrayBuffer())
    const xml = await zip.tekst('word/document.xml')
    const tekst = wyodrebnijTekstZDokumentuXml(xml)

    return utworzWynikImportuProgramuZTekstuDocx(tekst)
  } catch {
    return utworzWynikImportuProgramu({
      zrodlo: 'DOCX', propozycje: [], ostrzezenia: [], bledy: ['Nie udało się odczytać poprawnej treści z pliku DOCX.'],
    })
  }
}
