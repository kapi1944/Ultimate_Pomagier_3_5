import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { pobierzStronyDokumentu, pobierzWymiaryStronyPdf, pobierzPodzialStronA4, utworzNazwePlikuPdf, type UstawieniaEksportuPdf } from './eksportPdf'

export async function pobierzRasterPdfLegacy({ obszarDokumentu, nazwaPliku, orientacja = 'pionowa', format = 'a4', marginesMm = 12 }: UstawieniaEksportuPdf) {
  await document.fonts?.ready
  await Promise.all(Array.from(obszarDokumentu.querySelectorAll('img')).map((obraz) => obraz.decode()))
  const stronyDokumentu = pobierzStronyDokumentu(obszarDokumentu)
  const wymiaryStrony = pobierzWymiaryStronyPdf(orientacja, format)
  const pdf = new jsPDF({ orientation: wymiaryStrony.orientacjaJsPdf, unit: 'mm', format, compress: true })

  if (stronyDokumentu.length) {
    for (const [indeks, stronaDokumentu] of stronyDokumentu.entries()) {
      const kanwaStrony = await html2canvas(stronaDokumentu, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        ignoreElements: (element) => element.hasAttribute('data-pomin-w-eksporcie'),
      })

      if (indeks > 0) pdf.addPage(format, wymiaryStrony.orientacjaJsPdf)
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
  const strony = pobierzPodzialStronA4(kanwa.height, kanwa.width, marginesMm, orientacja, format)

  strony.forEach((strona, indeks) => {
    if (indeks > 0) pdf.addPage(format, wymiaryStrony.orientacjaJsPdf)
    const fragment = document.createElement('canvas')
    fragment.width = kanwa.width
    fragment.height = strona.wysokosc
    fragment.getContext('2d')?.drawImage(kanwa, 0, strona.poczatek, kanwa.width, strona.wysokosc, 0, 0, kanwa.width, strona.wysokosc)
    pdf.addImage(fragment.toDataURL('image/png'), 'PNG', marginesMm, marginesMm, szerokoscDrukuMm, (strona.wysokosc / kanwa.width) * szerokoscDrukuMm, undefined, 'FAST')
  })

  pdf.save(utworzNazwePlikuPdf(nazwaPliku))
}
