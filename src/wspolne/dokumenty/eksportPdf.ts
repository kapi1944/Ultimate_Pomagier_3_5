import { oczyscNazwePliku } from './nazwyDokumentow'
import { zmierzScenePdf } from './semantykaPdf'

export type UstawieniaEksportuPdf = {
  silnikPdf?: 'semantyczny' | 'raster_legacy'
  obszarDokumentu: HTMLElement
  nazwaPliku: string
  format?: 'a4'
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

export function pobierzPodzialStronA4(wysokoscObrazuPx: number, szerokoscObrazuPx: number, marginesMm = 12, orientacja: 'pionowa' | 'pozioma' = 'pionowa') {
  const wymiaryStrony = pobierzWymiaryStronyPdf(orientacja)
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

export function pobierzWymiaryStronyPdf(orientacja: 'pionowa' | 'pozioma' = 'pionowa') {
  return orientacja === 'pozioma'
    ? { szerokoscMm: 297, wysokoscMm: 210, orientacjaJsPdf: 'landscape' as const }
    : { szerokoscMm: 210, wysokoscMm: 297, orientacjaJsPdf: 'portrait' as const }
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

export function drukujDokument() {
  window.print()
}
