import { useState, type RefObject } from 'react'
import { czyMoznaRozpoczacEksport, drukujDokument, pobierzPdfDokumentu } from './eksportPdf'
import './eksportPdf.css'

type WlasciwosciAkcjiEksportuPdf = {
  obszarDokumentu: RefObject<HTMLElement | null>
  nazwaPliku: string
  czyMoznaEksportowac?: () => boolean
  className?: string
}

export default function AkcjeEksportuPdf({ obszarDokumentu, nazwaPliku, czyMoznaEksportowac = () => true, className }: WlasciwosciAkcjiEksportuPdf) {
  const [czyGenerowanie, ustawCzyGenerowanie] = useState(false)
  const [blad, ustawBlad] = useState<string | null>(null)

  async function pobierzPdf() {
    if (!czyMoznaRozpoczacEksport(czyGenerowanie) || !czyMoznaEksportowac()) return
    if (!obszarDokumentu.current) {
      ustawBlad('Nie znaleziono aktualnego podgladu dokumentu do eksportu.')
      return
    }

    ustawBlad(null)
    ustawCzyGenerowanie(true)
    try {
      await pobierzPdfDokumentu({ obszarDokumentu: obszarDokumentu.current, nazwaPliku, format: 'a4' })
    } catch {
      ustawBlad('Nie udalo sie utworzyc pliku PDF. Sprawdz obrazy w podgladzie i sprobuj ponownie.')
    } finally {
      ustawCzyGenerowanie(false)
    }
  }

  function drukuj() {
    if (czyMoznaRozpoczacEksport(czyGenerowanie) && czyMoznaEksportowac()) drukujDokument()
  }

  return <div className={`akcje-eksportu-pdf ${className ?? ''}`} data-pomin-w-eksporcie>
    <button className="program-szkolen__przycisk" disabled={czyGenerowanie} onClick={pobierzPdf} type="button">
      {czyGenerowanie ? 'Generowanie PDF...' : 'Pobierz PDF'}
    </button>
    <button className="program-szkolen__przycisk" disabled={czyGenerowanie} onClick={drukuj} type="button">Drukuj</button>
    {blad && <p className="akcje-eksportu-pdf__blad" role="alert">{blad}</p>}
  </div>
}
