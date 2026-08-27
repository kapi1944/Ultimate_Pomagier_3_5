import { useState, type RefObject } from 'react'
import { czyMoznaRozpoczacEksport, drukujDokument, pobierzPdfDokumentu } from './eksportPdf'
import { wykonajEksportPoPrzygotowaniu } from './przygotowanieEksportu'
import './eksportPdf.css'

type WlasciwosciAkcjiEksportuPdf = {
  obszarDokumentu: RefObject<HTMLElement | null>
  nazwaPliku: string
  czyMoznaEksportowac?: () => boolean
  className?: string
  classNamePrzycisku?: string
  przygotujEksport?: () => void | Promise<void>
  zakonczEksport?: () => void
}

export default function AkcjeEksportuPdf({ obszarDokumentu, nazwaPliku, czyMoznaEksportowac = () => true, className, classNamePrzycisku = 'akcje-eksportu-pdf__przycisk', przygotujEksport, zakonczEksport }: WlasciwosciAkcjiEksportuPdf) {
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
      await wykonajEksportPoPrzygotowaniu({
        przygotuj: przygotujEksport,
        wykonaj: () => pobierzPdfDokumentu({ obszarDokumentu: obszarDokumentu.current!, nazwaPliku, format: 'a4' }),
        zakoncz: zakonczEksport,
      })
    } catch {
      ustawBlad('Nie udalo sie utworzyc pliku PDF. Sprawdz obrazy w podgladzie i sprobuj ponownie.')
    } finally {
      ustawCzyGenerowanie(false)
    }
  }

  async function drukuj() {
    if (!czyMoznaRozpoczacEksport(czyGenerowanie) || !czyMoznaEksportowac()) return
    ustawBlad(null)
    try {
      await wykonajEksportPoPrzygotowaniu({ przygotuj: przygotujEksport, wykonaj: drukujDokument, zakoncz: zakonczEksport })
    } catch {
      ustawBlad('Nie udało się przygotować dokumentu do druku.')
    }
  }

  return <div className={`akcje-eksportu-pdf ${className ?? ''}`} data-pomin-w-eksporcie>
    <button className={classNamePrzycisku} disabled={czyGenerowanie} onClick={pobierzPdf} type="button">
      {czyGenerowanie ? 'Generowanie PDF...' : 'Pobierz PDF'}
    </button>
    <button className={classNamePrzycisku} disabled={czyGenerowanie} onClick={drukuj} type="button">Drukuj</button>
    {blad && <p className="akcje-eksportu-pdf__blad" role="alert">{blad}</p>}
  </div>
}
