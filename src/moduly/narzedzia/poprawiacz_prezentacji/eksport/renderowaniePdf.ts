import { invoke, isTauri } from '@tauri-apps/api/core'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { ModelPptx } from '../pptx/modelPptx'

export async function otworzPdfPrezentacji(bufor: ArrayBuffer) {
  const biblioteka = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { default: adresPracownikaPdf } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  biblioteka.GlobalWorkerOptions.workerSrc = adresPracownikaPdf
  const zadanie = biblioteka.getDocument({ data: new Uint8Array(bufor.slice(0)) })
  try { return await zadanie.promise }
  catch (blad) { await zadanie.destroy(); throw blad }
}

export async function sprawdzPdfPrezentacji(bufor: ArrayBuffer, liczbaSlajdow: number) {
  const dokument = await otworzPdfPrezentacji(bufor)
  try {
    if (dokument.numPages !== liczbaSlajdow) throw new Error(`PDF ma ${dokument.numPages} stron, a prezentacja ${liczbaSlajdow} slajdów. Wczytaj PDF ze wszystkimi slajdami, także ukrytymi.`)
  } finally { await dokument.loadingTask.destroy() }
}

export async function renderujPptxDoPdf(model: ModelPptx) {
  if (!isTauri()) throw new Error('Automatyczne renderowanie PPTX jest dostępne w aplikacji desktop. W przeglądarce i Androidzie wczytaj PDF zapisany z aktualnej kopii PPTX.')
  const platforma = await invoke<{ system: string }>('informacje_o_platformie')
  if (!['windows', 'linux'].includes(platforma.system)) throw new Error('Na tym urządzeniu wczytaj PDF zapisany z aktualnej kopii PPTX. Automatyczne renderowanie wymaga aplikacji desktop Windows lub Linux.')
  let wynik: { pdf: number[]; uwagi: string[] }
  try { wynik = await invoke('renderuj_prezentacje', { dane: Array.from(new Uint8Array(model.buforZrodlowy)) }) }
  catch (blad) { throw new Error(typeof blad === 'string' ? blad : 'Nie udało się wyrenderować PPTX lokalnie.', { cause: blad }) }
  const bufor = new Uint8Array(wynik.pdf).buffer
  await sprawdzPdfPrezentacji(bufor, model.slajdy.length)
  return { bufor, uwagi: wynik.uwagi }
}

export async function renderujStronePdf(dokument: PDFDocumentProxy, numer: number, szerokoscPikseli: number, czySzara = false) {
  const strona = await dokument.getPage(numer)
  const oryginal = strona.getViewport({ scale: 1 })
  const widok = strona.getViewport({ scale: szerokoscPikseli / oryginal.width })
  const plotno = document.createElement('canvas')
  plotno.width = Math.ceil(widok.width); plotno.height = Math.ceil(widok.height)
  const kontekst = plotno.getContext('2d')
  if (!kontekst) throw new Error('Nie można utworzyć podglądu PDF.')
  await strona.render({ canvasContext: kontekst, canvas: plotno, viewport: widok, background: '#ffffff' }).promise
  if (czySzara) {
    const obraz = kontekst.getImageData(0, 0, plotno.width, plotno.height)
    for (let indeks = 0; indeks < obraz.data.length; indeks += 4) {
      const szarosc = Math.round(.2126 * obraz.data[indeks] + .7152 * obraz.data[indeks + 1] + .0722 * obraz.data[indeks + 2])
      obraz.data[indeks] = szarosc; obraz.data[indeks + 1] = szarosc; obraz.data[indeks + 2] = szarosc
    }
    kontekst.putImageData(obraz, 0, 0)
  }
  strona.cleanup()
  return plotno
}
