import { oczyscNazwePliku } from './nazwyDokumentow'
import { zmierzScenePdf } from './semantykaPdf'

export type UstawieniaEksportuPdf = {
  silnikPdf?: 'semantyczny' | 'raster_legacy'
  obszarDokumentu: HTMLElement
  nazwaPliku: string
  format?: 'a4' | 'a5' | 'a6'
  orientacja?: 'pionowa' | 'pozioma'
  marginesMm?: number
}

export function czyMoznaRozpoczacEksport(czyGenerowanie: boolean) {
  return !czyGenerowanie
}

export function utworzNazwePlikuPdf(nazwa: string) {
  const bezRozszerzenia = oczyscNazwePliku(nazwa).replace(/\.pdf$/i, '').trim().replace(/[. ]+$/g, '') || 'Dokument'
  return `${bezRozszerzenia}.pdf`
}

export function pobierzPodzialStronA4(wysokoscObrazuPx: number, szerokoscObrazuPx: number, marginesMm = 12, orientacja: 'pionowa' | 'pozioma' = 'pionowa', format: 'a4' | 'a5' | 'a6' = 'a4') {
  const wymiaryStrony = pobierzWymiaryStronyPdf(orientacja, format)
  const wysokoscDrukuMm = wymiaryStrony.wysokoscMm - marginesMm * 2
  const szerokoscDrukuMm = wymiaryStrony.szerokoscMm - marginesMm * 2
  const wysokoscStronyPx = Math.max(1, Math.floor(wysokoscDrukuMm * (szerokoscObrazuPx / szerokoscDrukuMm)))
  const strony: Array<{ poczatek: number; wysokosc: number }> = []

  for (let poczatek = 0; poczatek < wysokoscObrazuPx; poczatek += wysokoscStronyPx) {
    strony.push({ poczatek, wysokosc: Math.min(wysokoscStronyPx, wysokoscObrazuPx - poczatek) })
  }

  return strony
}

export function pobierzStronyDokumentu(obszarDokumentu: HTMLElement) {
  return Array.from(obszarDokumentu.querySelectorAll<HTMLElement>('[data-strona-dokumentu]'))
}

export function pobierzWymiaryStronyPdf(orientacja: 'pionowa' | 'pozioma' = 'pionowa', format: 'a4' | 'a5' | 'a6' = 'a4') {
  const [szerokosc, wysokosc] = { a4: [210, 297], a5: [148, 210], a6: [105, 148] }[format]
  return orientacja === 'pozioma'
    ? { szerokoscMm: wysokosc, wysokoscMm: szerokosc, orientacjaJsPdf: 'landscape' as const }
    : { szerokoscMm: szerokosc, wysokoscMm: wysokosc, orientacjaJsPdf: 'portrait' as const }
}

export async function pobierzPdfDokumentu(ustawienia: UstawieniaEksportuPdf) {
  if (ustawienia.silnikPdf === 'semantyczny') {
    const { renderujScenePdf, wczytajFontyPdf, wczytajObrazyPdf } = await import('./rendererPdf')
    await document.fonts?.ready
    await Promise.all(pobierzStronyDokumentu(ustawienia.obszarDokumentu).flatMap((strona) => Array.from(strona.querySelectorAll('img')).map((obraz) => obraz.decode())))
    await new Promise<void>((rozwiaz) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => rozwiaz())))
    const scena = zmierzScenePdf(pobierzStronyDokumentu(ustawienia.obszarDokumentu))
    const [fonty, obrazy] = await Promise.all([wczytajFontyPdf(), wczytajObrazyPdf(scena)])
    renderujScenePdf(scena, fonty, obrazy).save(utworzNazwePlikuPdf(ustawienia.nazwaPliku))
    return
  }
  const { pobierzRasterPdfLegacy } = await import('./eksportPdfLegacy')
  return pobierzRasterPdfLegacy(ustawienia)
}

export async function drukujDokument(obszar?: HTMLElement, orientacja: 'pionowa' | 'pozioma' = 'pionowa', format: 'a4' | 'a5' | 'a6' = 'a4') {
  if (!obszar) { window.print(); return }
  const strony = pobierzStronyDokumentu(obszar)
  if (!strony.length) throw new Error('Nie znaleziono stron dokumentu do druku.')
  await document.fonts?.ready
  await Promise.all(strony.flatMap((strona) => Array.from(strona.querySelectorAll('img')).map((obraz) => obraz.decode())))
  const przodkowie: HTMLElement[] = []
  for (let element = obszar.parentElement; element; element = element.parentElement) przodkowie.push(element)
  const stylStrony = document.createElement('style')
  stylStrony.textContent = `@page dokument-generatora { size: ${format.toUpperCase()} ${orientacja === 'pozioma' ? 'landscape' : 'portrait'}; margin: 0; }`
  document.head.append(stylStrony)
  obszar.setAttribute('data-cel-druku-dokumentu', '')
  przodkowie.forEach((element) => element.setAttribute('data-przodek-druku-dokumentu', ''))
  try {
    await new Promise<void>((rozwiaz, odrzuc) => {
      function zakoncz() { window.removeEventListener('afterprint', zakoncz); rozwiaz() }
      window.addEventListener('afterprint', zakoncz)
      try { window.print() } catch (blad) { window.removeEventListener('afterprint', zakoncz); odrzuc(blad) }
    })
  } finally {
    obszar.removeAttribute('data-cel-druku-dokumentu')
    przodkowie.forEach((element) => element.removeAttribute('data-przodek-druku-dokumentu'))
    stylStrony.remove()
  }
}
