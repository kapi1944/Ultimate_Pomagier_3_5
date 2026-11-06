import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { renderujScenePdf, type FontyPdf } from '../rendererPdf'
import type { MetadanePakietu, KonfiguracjaPakietu } from './modelPakietu'
import type { WynikEksportuDokumentu } from './renderujDokumentPakietu'

export type PozycjaSpisuPakietu = { dokumentId: string; nazwa: string; strona: number; liczbaStron: number; grupa: string }
export type ScalonyPakiet = { pdfBytes: Uint8Array; liczbaStron: number; spis: PozycjaSpisuPakietu[] }

function utworzPdf(fonty: FontyPdf, organizator: string) {
  const pdf = renderujScenePdf({ strony: [{ elementy: [] }] }, fonty)
  pdf.setFont('LiberationSans', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor('#182236')
  const naglowek = (tytul: string) => {
    pdf.setFillColor(organizator.toUpperCase() === 'IIST' ? '#2E89BE' : '#c5000b')
    pdf.rect(0, 0, 210, 6, 'F')
    pdf.setFont('LiberationSans', 'bold')
    pdf.setFontSize(17)
    pdf.text(tytul, 18, 25)
    pdf.setFont('LiberationSans', 'normal')
    pdf.setFontSize(11)
  }
  return { pdf, naglowek }
}

function utworzStroneTytulowa(metadane: MetadanePakietu, liczbaDokumentow: number, fonty: FontyPdf, dataPrzygotowania: string) {
  const { pdf, naglowek } = utworzPdf(fonty, metadane.organizator)
  naglowek('DOKUMENTACJA SZKOLENIOWA')
  pdf.setFontSize(14)
  pdf.text('PAKIET DO ZATWIERDZENIA', 18, 39)
  let pozycja = 63
  const wiersz = (etykieta: string, wartosc: string) => {
    const linie: string[] = pdf.splitTextToSize(etykieta + wartosc, 170)
    for (const linia of linie) {
      if (pozycja > 265) { pdf.addPage(); naglowek('DOKUMENTACJA SZKOLENIOWA'); pozycja = 44 }
      pdf.text(linia, 18, pozycja)
      pozycja += 6
    }
    pozycja += 7
  }
  pdf.setFontSize(18)
  wiersz('', metadane.tytul)
  pdf.setFontSize(11)
  wiersz('Termin: ', metadane.termin)
  wiersz('Klient: ', metadane.klient)
  wiersz('Organizator: ', metadane.organizator)
  wiersz('Opiekun: ', metadane.opiekun)
  wiersz('Przygotowano: ', dataPrzygotowania)
  wiersz('Liczba załączonych dokumentów: ', String(liczbaDokumentow))
  if (metadane.wersja) wiersz('Wersja szkolenia: ', metadane.wersja)
  return pdf
}

export async function scalPakietPdf(dokumenty: WynikEksportuDokumentu[], konfiguracja: KonfiguracjaPakietu, metadane: MetadanePakietu, grupy: Record<string, string>, fonty: FontyPdf, sygnal: AbortSignal, dataPrzygotowania = new Date().toLocaleString('pl-PL')): Promise<ScalonyPakiet> {
  if (!dokumenty.length || new Set(dokumenty.map((dokument) => dokument.dokumentId)).size !== dokumenty.length) throw new Error('Pakiet musi zawierać unikalne, wybrane dokumenty.')
  const zrodla = []
  for (const dokument of dokumenty) {
    sygnal.throwIfAborted()
    const pdf = await PDFDocument.load(dokument.pdfBytes)
    if (pdf.getPageCount() < 1 || pdf.getPageCount() !== dokument.liczbaStron) throw new Error('Niepełny eksport dokumentu: ' + dokument.nazwa)
    zrodla.push(pdf)
  }
  const wynik = await PDFDocument.create()
  wynik.setTitle('Pakiet do zatwierdzenia — ' + metadane.tytul)
  wynik.setAuthor(metadane.organizator)
  const tytulowa = konfiguracja.stronaTytulowa ? utworzStroneTytulowa(metadane, dokumenty.length, fonty, dataPrzygotowania) : null
  const liczbaStronTytulowych = tytulowa?.getNumberOfPages() ?? 0
  const spisPdf = konfiguracja.spisDokumentow ? utworzPdf(fonty, metadane.organizator) : null
  const wierszeSpisu: { indeks: number; stronaSpisu: number; y: number; linie: string[] }[] = []
  if (spisPdf) {
    spisPdf.naglowek('SPIS DOKUMENTÓW')
    let y = 43
    let poprzedniaGrupa: string | null | undefined
    dokumenty.forEach((dokument, indeks) => {
      const grupa = dokument.grupaId ? grupy[dokument.grupaId] || 'Grupa niedostępna' : 'Dokumenty wspólne'
      const linie: string[] = spisPdf.pdf.splitTextToSize(String(indeks + 1).padStart(2, '0') + '. ' + dokument.nazwa, 151)
      const naglowekGrupy = konfiguracja.podzialNaGrupy && dokument.grupaId !== poprzedniaGrupa
      const wysokosc = linie.length * 5 + 7 + (naglowekGrupy ? 10 : 0)
      if (wysokosc > 215) throw new Error('Nazwa dokumentu jest za długa dla spisu: ' + dokument.nazwa)
      if (y + wysokosc > 270) { spisPdf.pdf.addPage(); spisPdf.naglowek('SPIS DOKUMENTÓW — ciąg dalszy'); y = 43 }
      if (naglowekGrupy) {
        spisPdf.pdf.setFont('LiberationSans', 'bold')
        spisPdf.pdf.text(grupa, 18, y)
        spisPdf.pdf.setFont('LiberationSans', 'normal')
        y += 10
      }
      wierszeSpisu.push({ indeks, stronaSpisu: spisPdf.pdf.getNumberOfPages(), y, linie })
      y += linie.length * 5 + 7
      poprzedniaGrupa = dokument.grupaId
    })
  }
  let strona = liczbaStronTytulowych + (spisPdf?.pdf.getNumberOfPages() ?? 0) + 1
  let poprzedniaGrupa: string | null = null
  const separatory = new Map<number, Uint8Array>()
  const spis = dokumenty.map((dokument, indeks) => {
    const grupa = dokument.grupaId ? grupy[dokument.grupaId] || 'Grupa niedostępna' : 'Dokumenty wspólne'
    if (konfiguracja.podzialNaGrupy && dokument.grupaId && dokument.grupaId !== poprzedniaGrupa) {
      const separator = utworzPdf(fonty, metadane.organizator)
      separator.naglowek('DOKUMENTY GRUPY SZKOLENIOWEJ')
      const nazwa: string[] = separator.pdf.splitTextToSize(grupa, 170)
      if (nazwa.length > 20) throw new Error('Nazwa grupy jest za długa.')
      separator.pdf.text(nazwa, 18, 55)
      separatory.set(indeks, new Uint8Array(separator.pdf.output('arraybuffer')))
      strona += 1
    }
    const pozycja = { dokumentId: dokument.dokumentId, nazwa: dokument.nazwa, strona, liczbaStron: dokument.liczbaStron, grupa }
    strona += dokument.liczbaStron
    poprzedniaGrupa = dokument.grupaId
    return pozycja
  })
  if (spisPdf) {
    for (const wiersz of wierszeSpisu) {
      spisPdf.pdf.setPage(wiersz.stronaSpisu)
      spisPdf.pdf.text(wiersz.linie, 18, wiersz.y, { lineHeightFactor: 1.29 })
      spisPdf.pdf.text(String(spis[wiersz.indeks].strona), 192, wiersz.y, { align: 'right' })
    }
  }
  const dolacz = async (pdf: PDFDocument) => {
    sygnal.throwIfAborted()
    const strony = await wynik.copyPages(pdf, pdf.getPageIndices())
    strony.forEach((strona) => wynik.addPage(strona))
  }
  if (tytulowa) await dolacz(await PDFDocument.load(tytulowa.output('arraybuffer')))
  if (spisPdf) await dolacz(await PDFDocument.load(spisPdf.pdf.output('arraybuffer')))
  for (const [indeks, pdf] of zrodla.entries()) {
    const separator = separatory.get(indeks)
    if (separator) await dolacz(await PDFDocument.load(separator))
    await dolacz(pdf)
  }
  if (wynik.getPageCount() !== strona - 1) throw new Error('Liczba stron pakietu nie zgadza się z planem.')
  if (konfiguracja.oznaczenie) {
    const font = await wynik.embedFont(StandardFonts.HelveticaBold)
    for (const stronaPdf of wynik.getPages()) stronaPdf.drawText('DO ZATWIERDZENIA', { x: 12, y: 8, font, size: 8, color: rgb(0.65, 0.12, 0.12), opacity: 0.65 })
  }
  sygnal.throwIfAborted()
  return { pdfBytes: await wynik.save(), liczbaStron: wynik.getPageCount(), spis }
}
