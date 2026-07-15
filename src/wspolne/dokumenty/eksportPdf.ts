import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export type UstawieniaEksportuPdf = {
  obszarDokumentu: HTMLElement
  nazwaPliku: string
  format?: 'a4'
  marginesMm?: number
}

const znakiNiedozwoloneWNazwie = /[<>:"/\\|?*]/g

export function czyMoznaRozpoczacEksport(czyGenerowanie: boolean) {
  return !czyGenerowanie
}

export function utworzNazwePlikuPdf(nazwa: string) {
  const bezNiedozwolonychZnakow = Array.from(nazwa).filter((znak) => znak.charCodeAt(0) >= 32).join('').replace(znakiNiedozwoloneWNazwie, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '')
  const bezRozszerzenia = bezNiedozwolonychZnakow.replace(/\.pdf$/i, '').trim().replace(/[. ]+$/g, '') || 'Dokument'
  return `${bezRozszerzenia}.pdf`
}

export function pobierzPodzialStronA4(wysokoscObrazuPx: number, szerokoscObrazuPx: number, marginesMm = 12) {
  const wysokoscDrukuMm = 297 - marginesMm * 2
  const szerokoscDrukuMm = 210 - marginesMm * 2
  const wysokoscStronyPx = Math.max(1, Math.floor(wysokoscDrukuMm * (szerokoscObrazuPx / szerokoscDrukuMm)))
  const strony: Array<{ poczatek: number; wysokosc: number }> = []

  for (let poczatek = 0; poczatek < wysokoscObrazuPx; poczatek += wysokoscStronyPx) {
    strony.push({ poczatek, wysokosc: Math.min(wysokoscStronyPx, wysokoscObrazuPx - poczatek) })
  }

  return strony
}

export async function pobierzPdfDokumentu({ obszarDokumentu, nazwaPliku, marginesMm = 12 }: UstawieniaEksportuPdf) {
  const kanwa = await html2canvas(obszarDokumentu, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    ignoreElements: (element) => element.hasAttribute('data-pomin-w-eksporcie'),
  })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const szerokoscDrukuMm = 210 - marginesMm * 2
  const strony = pobierzPodzialStronA4(kanwa.height, kanwa.width, marginesMm)

  strony.forEach((strona, indeks) => {
    if (indeks > 0) pdf.addPage('a4', 'portrait')
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
