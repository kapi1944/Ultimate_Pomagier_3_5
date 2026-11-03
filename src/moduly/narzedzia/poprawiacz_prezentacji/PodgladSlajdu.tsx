import { useEffect, useRef, useState } from 'react'
import type { GeometriaPptx, SlajdPptx } from './pptx/modelPptx'
import type { ProblemPrezentacji } from './modele/modelPrezentacji'
import PodgladStrukturalny from './PodgladStrukturalny'
import { otworzPdfPrezentacji, renderujStronePdf } from './eksport/renderowaniePdf'

export type PamiecPodgladu = Map<string, HTMLCanvasElement>

export default function PodgladSlajdu({ slajd, problemy, pdf, kluczRenderu, pamiec, zaznaczenie = [], podswietlenia = [], kolor, kontury, marginesy, siatka, wybierz, przesun }: {
  slajd: SlajdPptx; problemy: ProblemPrezentacji[]; pdf?: ArrayBuffer; kluczRenderu: string; pamiec: PamiecPodgladu
  zaznaczenie?: string[]; podswietlenia?: string[]; kolor: string; kontury: boolean; marginesy: boolean; siatka?: boolean
  wybierz?: (id: string, wiele: boolean) => void; przesun?: (id: string, geometria: GeometriaPptx) => void
}) {
  const plotno = useRef<HTMLCanvasElement>(null)
  const [blad, ustawBlad] = useState('')
  const [gotowy, ustawGotowy] = useState('')
  useEffect(() => {
    if (!pdf) return
    const kontroler = new AbortController()
    const klucz = `${kluczRenderu}:${slajd.numer}`
    function pokaz(obraz: HTMLCanvasElement) {
      if (kontroler.signal.aborted || !plotno.current) return
      plotno.current.width = obraz.width; plotno.current.height = obraz.height
      plotno.current.getContext('2d')?.drawImage(obraz, 0, 0)
      ustawGotowy(klucz); ustawBlad('')
    }
    const dostepny = pamiec.get(klucz)
    if (dostepny) { pokaz(dostepny); return () => kontroler.abort() }
    const zadanie = otworzPdfPrezentacji(pdf)
    void (async () => {
      const dokument = await zadanie
      try {
        const obraz = await renderujStronePdf(dokument, slajd.numer, 1600, false, kontroler.signal)
        if (kontroler.signal.aborted) return
        pamiec.set(klucz, obraz)
        while (pamiec.size > 6) {
          const stary = pamiec.keys().next().value!
          const obrazStary = pamiec.get(stary)!
          obrazStary.width = 0; obrazStary.height = 0; pamiec.delete(stary)
        }
        pokaz(obraz)
      } finally { await dokument.loadingTask.destroy() }
    })().catch((przyczyna: unknown) => { if (!kontroler.signal.aborted) ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Błąd podglądu PDF.') })
    return () => {
      kontroler.abort()
      void zadanie.then((dokument) => dokument.loadingTask.destroy()).catch(() => undefined)
    }
  }, [pdf, kluczRenderu, slajd.numer, pamiec])
  return <div className="prezentacja-podglad" style={{ aspectRatio: `${slajd.szerokosc}/${slajd.wysokosc}` }}>
    {pdf && <canvas ref={plotno} hidden={gotowy !== `${kluczRenderu}:${slajd.numer}`} aria-label={`Wierny podgląd slajdu ${slajd.numer}`} />}
    {blad && <p role="alert">{blad}</p>}
    {pdf && gotowy !== `${kluczRenderu}:${slajd.numer}` && !blad && <p role="status">Renderowanie slajdu…</p>}
    <PodgladStrukturalny slajd={slajd} problemy={problemy} czyNakladka={Boolean(pdf)} zaznaczenie={zaznaczenie}
      podswietlenia={podswietlenia} kolor={kolor} kontury={kontury} marginesy={marginesy} siatka={siatka} wybierz={wybierz} przesun={przesun} />
  </div>
}
