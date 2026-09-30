import { GState, jsPDF } from 'jspdf'
import type { ScenaPdf, StylTekstuPdf } from './scenaPdf'

export type FontyPdf = Record<StylTekstuPdf, string>
const odmianyFontu: Record<StylTekstuPdf, string> = { normal: 'Regular', bold: 'Bold', italic: 'Italic', bolditalic: 'BoldItalic' }

export async function wczytajFontyPdf(): Promise<FontyPdf> {
  const fonty = {} as FontyPdf
  await Promise.all(Object.entries(odmianyFontu).map(async ([styl, odmiana]) => {
    const odpowiedz = await fetch(`${import.meta.env.BASE_URL}fonty-pdf/LiberationSans-${odmiana}.ttf`)
    if (!odpowiedz.ok) throw new Error('Nie udało się wczytać fontu PDF.')
    const bajty = new Uint8Array(await odpowiedz.arrayBuffer())
    let tekst = ''
    for (let indeks = 0; indeks < bajty.length; indeks += 8192) tekst += String.fromCharCode(...bajty.subarray(indeks, indeks + 8192))
    fonty[styl as StylTekstuPdf] = btoa(tekst)
  }))
  return fonty
}

/** Jedna strona sceny jest jedną fizyczną stroną; renderer nigdy nie paginuje ponownie. */
export function renderujScenePdf(scena: ScenaPdf, fonty: FontyPdf, obrazy: Record<string, string> = {}) {
  if (!scena.strony.length) throw new Error('Brak stron PDF.')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true })
  for (const styl of Object.keys(odmianyFontu) as StylTekstuPdf[]) {
    const nazwa = `LiberationSans-${odmianyFontu[styl]}.ttf`
    pdf.addFileToVFS(nazwa, fonty[styl])
    pdf.addFont(nazwa, 'LiberationSans', styl)
  }
  scena.strony.forEach((strona, indeks) => {
    if (indeks) pdf.addPage('a4', 'portrait')
    for (const element of strona.elementy) {
      if (element.rodzaj === 'poczatek_grupy') {
        pdf.saveGraphicsState()
        if (element.krycie !== undefined) pdf.setGState(new GState({ opacity: element.krycie, 'stroke-opacity': element.krycie }))
        if (element.przyciecie) {
          const { x, y, szerokosc, wysokosc } = element.przyciecie
          pdf.rect(x, y, szerokosc, wysokosc, null)
          pdf.clip()
          pdf.discardPath()
        }
      } else if (element.rodzaj === 'koniec_grupy') {
        pdf.restoreGraphicsState()
      } else if (element.rodzaj === 'tekst') {
        pdf.setFont('LiberationSans', element.styl)
        pdf.setFontSize(element.rozmiar)
        pdf.setTextColor(element.kolor)
        pdf.setCharSpace(0)
        const szerokosc = pdf.getTextWidth(element.tekst)
        const odstep = element.tekst.length > 1 ? (element.szerokosc - szerokosc) / (element.tekst.length - 1) : 0
        pdf.text(element.tekst, element.x, element.y, { baseline: 'top', charSpace: odstep })
        if (element.podkreslenie) {
          pdf.setDrawColor(element.kolor)
          pdf.setLineWidth(0.18)
          pdf.line(element.x, element.y + element.rozmiar * 25.4 / 72, element.x + element.szerokosc, element.y + element.rozmiar * 25.4 / 72)
        }
      } else if (element.rodzaj === 'prostokat') {
        pdf.setFillColor(element.kolor)
        pdf.rect(element.x, element.y, element.szerokosc, element.wysokosc, 'F')
      } else if (element.rodzaj === 'linia') {
        pdf.setDrawColor(element.kolor)
        pdf.setLineWidth(element.grubosc)
        pdf.setLineDashPattern(element.kreski ?? [], 0)
        pdf.line(element.x, element.y, element.koniecX, element.koniecY)
        pdf.setLineDashPattern([], 0)
      } else {
        const obraz = obrazy[element.zrodlo]
        if (!obraz) throw new Error('Brak grafiki PDF.')
        pdf.saveGraphicsState()
        if (element.przyciecie) {
          const { x, y, szerokosc, wysokosc } = element.przyciecie
          pdf.rect(x, y, szerokosc, wysokosc, null)
          pdf.clip()
          pdf.discardPath()
        }
        pdf.addImage(obraz, element.x, element.y, element.szerokosc, element.wysokosc)
        pdf.restoreGraphicsState()
      }
    }
  })
  return pdf
}

export async function wczytajObrazyPdf(scena: ScenaPdf) {
  const zrodla = [...new Set(scena.strony.flatMap((strona) => strona.elementy.flatMap((element) => element.rodzaj === 'obraz' ? [element.zrodlo] : [])))]
  const obrazy: Record<string, string> = {}
  await Promise.all(zrodla.map(async (zrodlo) => {
    const odpowiedz = await fetch(zrodlo)
    if (!odpowiedz.ok) throw new Error('Nie udało się wczytać grafiki PDF.')
    const plik = await odpowiedz.blob()
    // jsPDF nie odczytuje SVG przez addImage. Konwertujemy wyłącznie tę grafikę,
    // w jej naturalnym rozmiarze; treść i fizyczne strony pozostają wektorowe.
    if (plik.type.includes('svg')) {
      const adres = URL.createObjectURL(plik)
      try {
        const obraz = new Image()
        obraz.src = adres
        await obraz.decode()
        const kanwaGrafiki = document.createElement('canvas')
        kanwaGrafiki.width = obraz.naturalWidth
        kanwaGrafiki.height = obraz.naturalHeight
        const kontekst = kanwaGrafiki.getContext('2d')
        if (!kontekst) throw new Error('Nie udało się przygotować grafiki SVG.')
        kontekst.drawImage(obraz, 0, 0)
        obrazy[zrodlo] = kanwaGrafiki.toDataURL('image/png')
      } finally { URL.revokeObjectURL(adres) }
      return
    }
    obrazy[zrodlo] = await new Promise<string>((resolve, reject) => {
      const czytnik = new FileReader()
      czytnik.onload = () => typeof czytnik.result === 'string' ? resolve(czytnik.result) : reject(new Error('Nieprawidłowa grafika PDF.'))
      czytnik.onerror = () => reject(new Error('Nie udało się odczytać grafiki PDF.'))
      czytnik.readAsDataURL(plik)
    })
  }))
  return obrazy
}
