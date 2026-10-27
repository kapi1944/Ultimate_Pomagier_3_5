import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { DokumentDruku } from './planDruku'
import { dopasujProporcjonalnie, obszaryNaStronie, rozmiarPapieru, zaleceniaDruku } from './planDruku'
import { otworzPdfPrezentacji, renderujStronePdf } from './renderowaniePdf'

export type PlikMaterialow = { nazwa: string; plik: Blob }

async function* obrazyStronyDruku(dokument: PDFDocumentProxy, plan: DokumentDruku, indeks: number, pikseliNaMm: number) {
  const obszary = obszaryNaStronie(plan.ustawienia)
  for (const [miejsce, numer] of plan.strony[indeks].entries()) {
    const strona = await dokument.getPage(numer)
    const rozmiar = strona.getViewport({ scale: 1 })
    const obszar = dopasujProporcjonalnie(rozmiar.width, rozmiar.height, obszary[miejsce])
    const obraz = await renderujStronePdf(dokument, numer, Math.max(1, Math.round(obszar.szerokosc * pikseliNaMm)), plan.ustawienia.kolor === 'szary')
    try { yield { obraz, obszar } }
    finally { obraz.width = 0; obraz.height = 0 }
  }
}

export function pobierzPlikMaterialow(plik: Blob, nazwa: string) {
  const adres = URL.createObjectURL(plik)
  const odnosnik = document.createElement('a')
  odnosnik.href = adres; odnosnik.download = nazwa
  try { document.body.appendChild(odnosnik); odnosnik.click() }
  finally { odnosnik.remove(); window.setTimeout(() => URL.revokeObjectURL(adres), 1000) }
}

export async function zlozStroneDruku(dokument: PDFDocumentProxy, plan: DokumentDruku, indeks: number, szerokoscPikseli: number) {
  const papier = rozmiarPapieru(plan.ustawienia)
  const plotno = document.createElement('canvas')
  plotno.width = Math.round(szerokoscPikseli); plotno.height = Math.round(szerokoscPikseli * papier.wysokosc / papier.szerokosc)
  const kontekst = plotno.getContext('2d')
  if (!kontekst) throw new Error('Nie można przygotować strony druku.')
  kontekst.fillStyle = '#ffffff'; kontekst.fillRect(0, 0, plotno.width, plotno.height)
  const skala = plotno.width / papier.szerokosc
  for await (const { obraz, obszar } of obrazyStronyDruku(dokument, plan, indeks, skala)) {
    kontekst.drawImage(obraz, obszar.x * skala, obszar.y * skala, obszar.szerokosc * skala, obszar.wysokosc * skala)
  }
  return plotno
}

export async function wygenerujPdfDruku(bufor: ArrayBuffer, plan: DokumentDruku[], postep?: (opis: string) => void): Promise<PlikMaterialow[]> {
  const dokument = await otworzPdfPrezentacji(bufor)
  try {
    const pliki: PlikMaterialow[] = []
    for (const pozycja of plan) {
      const rozmiar = rozmiarPapieru(pozycja.ustawienia)
      const pdf = new jsPDF({ unit: 'mm', format: [rozmiar.szerokosc, rozmiar.wysokosc], orientation: pozycja.ustawienia.orientacja === 'pozioma' ? 'landscape' : 'portrait', compress: true })
      pdf.setProperties({ title: pozycja.nazwa, subject: zaleceniaDruku(pozycja.ustawienia), creator: 'Ultimate Pomagier — SEMPER' })
      for (let indeks = 0; indeks < pozycja.strony.length; indeks++) {
        postep?.(`${pozycja.nazwa}: strona ${indeks + 1}/${pozycja.strony.length}`)
        if (indeks) pdf.addPage()
        for await (const { obraz, obszar } of obrazyStronyDruku(dokument, pozycja, indeks, 300 / 25.4)) {
          pdf.addImage(obraz.toDataURL('image/png'), 'PNG', obszar.x, obszar.y, obszar.szerokosc, obszar.wysokosc, undefined, 'FAST')
        }
        await new Promise<void>((rozwiaz) => window.setTimeout(rozwiaz, 0))
      }
      pliki.push({ nazwa: `${pozycja.nazwa}.pdf`, plik: pdf.output('blob') })
    }
    return pliki
  } finally { await dokument.loadingTask.destroy() }
}

export async function wygenerujKompletZip(pliki: PlikMaterialow[], instrukcja: string) {
  const archiwum = new JSZip()
  for (const pozycja of pliki) {
    if (archiwum.file(pozycja.nazwa)) throw new Error('Powtórzona nazwa pliku w komplecie materiałów.')
    archiwum.file(pozycja.nazwa, await pozycja.plik.arrayBuffer())
  }
  archiwum.file('USTAWIENIA_DRUKU.txt', instrukcja)
  return archiwum.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' })
}

export async function wygenerujPngOkladki(bufor: ArrayBuffer) {
  const dokument = await otworzPdfPrezentacji(bufor)
  try {
    const plotno = await renderujStronePdf(dokument, 1, 2480)
    return await new Promise<Blob>((rozwiaz, odrzuc) => plotno.toBlob((plik) => plik ? rozwiaz(plik) : odrzuc(new Error('Nie udało się wygenerować PNG.')), 'image/png'))
  } finally { await dokument.loadingTask.destroy() }
}
