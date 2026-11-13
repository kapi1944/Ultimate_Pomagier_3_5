import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { pobierzStronyDokumentu, pobierzWymiaryStronyPdf, pobierzPodzialStronA4, type UstawieniaEksportuPdf } from './eksportPdf'

function przywrocSkaleKopii(kopia: Document) {
  kopia.documentElement.style.zoom = '1'
  kopia.documentElement.style.setProperty('--ui-skala-przegladarki', '1')
}

export async function renderujRasterPdfLegacy({ obszarDokumentu, orientacja = 'pionowa', format = 'a4', marginesMm = 12, plynnyUklad = false }: UstawieniaEksportuPdf) {
  await document.fonts?.ready
  await Promise.all(Array.from(obszarDokumentu.querySelectorAll('img')).map((obraz) => obraz.decode()))
  const stronyDokumentu = pobierzStronyDokumentu(obszarDokumentu)
  const wymiaryStrony = pobierzWymiaryStronyPdf(orientacja, format)
  const pdf = new jsPDF({ orientation: wymiaryStrony.orientacjaJsPdf, unit: 'mm', format, compress: true })
  const stylInterfejsu = document.documentElement.style
  const skalaOkna = (Number(stylInterfejsu.getPropertyValue('--ui-skala-interfejsu')) || 1)
    / (Number(stylInterfejsu.getPropertyValue('--ui-skala-przegladarki')) || 1)
  // Odtwarzamy viewport sprzed natywnego zoomu, aby eksport nie zmieniał breakpointów dokumentu.
  const oknoEksportu = {
    windowWidth: obszarDokumentu.ownerDocument !== document ? obszarDokumentu.ownerDocument.defaultView!.innerWidth : Math.round(window.innerWidth * skalaOkna),
    windowHeight: obszarDokumentu.ownerDocument !== document ? obszarDokumentu.ownerDocument.defaultView!.innerHeight : Math.round(window.innerHeight * skalaOkna),
  }

  if (stronyDokumentu.length) {
    for (const [indeks, stronaDokumentu] of stronyDokumentu.entries()) {
      const kanwaStrony = await html2canvas(stronaDokumentu, {
        ...oknoEksportu,
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        onclone: przywrocSkaleKopii,
        ignoreElements: (element) => element.hasAttribute('data-pomin-w-eksporcie'),
      })

      if (indeks > 0) pdf.addPage(format, wymiaryStrony.orientacjaJsPdf)
      pdf.addImage(kanwaStrony.toDataURL('image/png'), 'PNG', 0, 0, wymiaryStrony.szerokoscMm, wymiaryStrony.wysokoscMm, undefined, 'FAST')
    }

    return pdf
  }

  const graniceWierszy: number[] = []
  const szerokoscDrukuMm = wymiaryStrony.szerokoscMm - marginesMm * 2
  const skalaKanwy = 2
  const kanwa = await html2canvas(obszarDokumentu, {
    ...oknoEksportu,
    backgroundColor: '#ffffff',
    scale: skalaKanwy,
    useCORS: true,
    onclone: (kopia, obszarKopii) => {
      przywrocSkaleKopii(kopia)
      if (!plynnyUklad) return
      for (let element = obszarKopii.parentElement; element; element = element.parentElement) element.style.zoom = '1'
      obszarKopii.style.width = `${szerokoscDrukuMm}mm`
      obszarKopii.style.padding = '0'
      const poczatek = obszarKopii.getBoundingClientRect().top
      for (const wiersz of obszarKopii.querySelectorAll('tbody tr')) {
        graniceWierszy.push(Math.round((wiersz.getBoundingClientRect().bottom - poczatek) * skalaKanwy))
      }
    },
    ignoreElements: (element) => element.hasAttribute('data-pomin-w-eksporcie'),
  })
  const strony = pobierzPodzialStronA4(kanwa.height, kanwa.width, marginesMm, orientacja, format)
  if (plynnyUklad && strony.length > 1) {
    const limitStrony = strony[0].wysokosc
    strony.length = 0
    for (let poczatek = 0; poczatek < kanwa.height;) {
      const limit = Math.min(poczatek + limitStrony, kanwa.height)
      const koniec = limit === kanwa.height ? limit : graniceWierszy.findLast((granica) => granica > poczatek && granica <= limit) ?? limit
      strony.push({ poczatek, wysokosc: koniec - poczatek })
      poczatek = koniec
    }
  }

  strony.forEach((strona, indeks) => {
    if (indeks > 0) pdf.addPage(format, wymiaryStrony.orientacjaJsPdf)
    const fragment = document.createElement('canvas')
    fragment.width = kanwa.width
    fragment.height = strona.wysokosc
    fragment.getContext('2d')?.drawImage(kanwa, 0, strona.poczatek, kanwa.width, strona.wysokosc, 0, 0, kanwa.width, strona.wysokosc)
    pdf.addImage(fragment.toDataURL('image/png'), 'PNG', marginesMm, marginesMm, szerokoscDrukuMm, (strona.wysokosc / kanwa.width) * szerokoscDrukuMm, undefined, 'FAST')
  })

  return pdf
}
