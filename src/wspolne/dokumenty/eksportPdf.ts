import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { oczyscNazwePliku } from './nazwyDokumentow'

export type UstawieniaEksportuPdf = {
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

export async function pobierzPdfDokumentu({ obszarDokumentu, nazwaPliku, orientacja = 'pionowa', marginesMm = 12 }: UstawieniaEksportuPdf) {
  const stronyDokumentu = pobierzStronyDokumentu(obszarDokumentu)
  const wymiaryStrony = pobierzWymiaryStronyPdf(orientacja)
  const pdf = new jsPDF({ orientation: wymiaryStrony.orientacjaJsPdf, unit: 'mm', format: 'a4', compress: true })

  if (stronyDokumentu.length) {
    for (const [indeks, stronaDokumentu] of stronyDokumentu.entries()) {
      const kanwaStrony = await html2canvas(stronaDokumentu, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        ignoreElements: (element) => element.hasAttribute('data-pomin-w-eksporcie'),
      })

      if (indeks > 0) pdf.addPage('a4', wymiaryStrony.orientacjaJsPdf)
      pdf.addImage(kanwaStrony.toDataURL('image/png'), 'PNG', 0, 0, wymiaryStrony.szerokoscMm, wymiaryStrony.wysokoscMm, undefined, 'FAST')
    }

    pdf.save(utworzNazwePlikuPdf(nazwaPliku))
    return
  }

  const kanwa = await html2canvas(obszarDokumentu, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    ignoreElements: (element) => element.hasAttribute('data-pomin-w-eksporcie'),
  })
  const szerokoscDrukuMm = wymiaryStrony.szerokoscMm - marginesMm * 2
  const strony = pobierzPodzialStronA4(kanwa.height, kanwa.width, marginesMm, orientacja)

  strony.forEach((strona, indeks) => {
    if (indeks > 0) pdf.addPage('a4', wymiaryStrony.orientacjaJsPdf)
    const fragment = document.createElement('canvas')
    fragment.width = kanwa.width
    fragment.height = strona.wysokosc
    fragment.getContext('2d')?.drawImage(kanwa, 0, strona.poczatek, kanwa.width, strona.wysokosc, 0, 0, kanwa.width, strona.wysokosc)
    pdf.addImage(fragment.toDataURL('image/png'), 'PNG', marginesMm, marginesMm, szerokoscDrukuMm, (strona.wysokosc / kanwa.width) * szerokoscDrukuMm, undefined, 'FAST')
  })

  pdf.save(utworzNazwePlikuPdf(nazwaPliku))
}

export function drukujDokument() {
  window.print()
}
