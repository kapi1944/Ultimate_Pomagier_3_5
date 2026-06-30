import type { GrupaSzkoleniowa, UczestnikGrupy } from '../typy'

function zabezpieczHtml(tekst: string) {
  return tekst.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function parsujListeUczestnikow(tekst: string, czyOdwrocicKolejnosc: boolean): UczestnikGrupy[] {
  return tekst
    .split(/\r?\n|;/)
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
    .map((wiersz, indeks) => {
      const email = wiersz.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? ''
      const bezEmaila = wiersz.replace(email, '').replace(/[,\t]+/g, ' ').trim()
      const czesci = bezEmaila.split(/\s+/).filter(Boolean)
      const imie = czyOdwrocicKolejnosc ? czesci.slice(1).join(' ') : czesci[0] ?? ''
      const nazwisko = czyOdwrocicKolejnosc ? czesci[0] ?? '' : czesci.slice(1).join(' ')

      return {
        id: `uczestnik-${Date.now()}-${indeks}`,
        imie,
        nazwisko,
        email,
      }
    })
}

export function utworzTekstListyObecnosci(grupa: GrupaSzkoleniowa) {
  const wiersze = grupa.pustaListaObecnosci
    ? Array.from({ length: Math.max(1, grupa.liczbaUczestnikow) }, (_, indeks) => `${indeks + 1}. ........................................................`)
    : grupa.uczestnicy.map(
        (uczestnik, indeks) =>
          `${indeks + 1}. ${uczestnik.imie} ${uczestnik.nazwisko} ${uczestnik.email}    ........................................................`,
      )

  return `LISTA OBECNOŚCI

${grupa.nazwa}
Termin: ${grupa.dataOd || '-'} - ${grupa.dataDo || '-'}
Godziny: ${grupa.godzinaRozpoczecia || '-'}-${grupa.godzinaZakonczenia || '-'}
Miejsce: ${grupa.nazwaLokalizacji || grupa.linkOnline || '-'}

${wiersze.join('\n')}`
}

export function pobierzDokumentListyObecnosci(grupa: GrupaSzkoleniowa) {
  const tekst = utworzTekstListyObecnosci(grupa)
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8" /></head><body><pre style="line-height:${grupa.marginesWierszyListy}mm">${zabezpieczHtml(
    tekst,
  )}</pre></body></html>`
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  const adres = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = adres
  link.download = `lista-obecnosci-${grupa.nazwa.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'grupa'}.doc`
  link.click()
  URL.revokeObjectURL(adres)
}
