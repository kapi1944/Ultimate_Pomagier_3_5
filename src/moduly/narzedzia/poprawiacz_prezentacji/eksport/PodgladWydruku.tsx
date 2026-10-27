import { useEffect, useRef, useState } from 'react'
import type { DokumentDruku } from './planDruku'
import { zaleceniaDruku } from './planDruku'
import { otworzPdfPrezentacji } from './renderowaniePdf'
import { zlozStroneDruku } from './eksportMaterialow'

export default function PodgladWydruku({ bufor, plan }: { bufor: ArrayBuffer; plan: DokumentDruku[] }) {
  const plotno = useRef<HTMLCanvasElement>(null)
  const [indeksPliku, ustawIndeksPliku] = useState(0)
  const [indeksStrony, ustawIndeksStrony] = useState(0)
  const [blad, ustawBlad] = useState('')
  const wybrany = plan[Math.min(indeksPliku, plan.length - 1)]
  const strona = Math.min(indeksStrony, wybrany.strony.length - 1)
  useEffect(() => {
    let anulowano = false
    const zadanie = otworzPdfPrezentacji(bufor)
    void (async () => {
      const dokument = await zadanie
      try {
        const obraz = await zlozStroneDruku(dokument, wybrany, strona, 1100)
        if (!anulowano && plotno.current) {
          plotno.current.width = obraz.width; plotno.current.height = obraz.height
          plotno.current.getContext('2d')?.drawImage(obraz, 0, 0)
          ustawBlad('')
        }
      } finally { await dokument.loadingTask.destroy() }
    })().catch((bladRenderowania) => { if (!anulowano) ustawBlad(bladRenderowania instanceof Error ? bladRenderowania.message : 'Nie udało się wyświetlić podglądu.') })
    return () => { anulowano = true }
  }, [bufor, wybrany, strona])
  return <section className="narzedzia__panel" aria-label="Podgląd rzeczywistego układu druku">
    <h2>Podgląd wydruku</h2>
    <label>Plik<select value={Math.min(indeksPliku, plan.length - 1)} onChange={(zdarzenie) => { ustawIndeksPliku(Number(zdarzenie.target.value)); ustawIndeksStrony(0) }}>{plan.map((pozycja, indeks) => <option key={pozycja.nazwa} value={indeks}>{pozycja.nazwa}.pdf ({pozycja.strony.length} stron)</option>)}</select></label>
    <div className="poprawiacz-prezentacji__akcje"><button type="button" disabled={!strona} onClick={() => ustawIndeksStrony(strona - 1)}>‹ poprzednia strona</button><span aria-live="polite">Strona {strona + 1} / {wybrany.strony.length}. Slajdy: {wybrany.strony[strona].join(', ') || 'pusta strona'}.</span><button type="button" disabled={strona >= wybrany.strony.length - 1} onClick={() => ustawIndeksStrony(strona + 1)}>następna strona ›</button></div>
    {blad && <p role="alert">{blad}</p>}
    <canvas ref={plotno} className="poprawiacz-prezentacji__wydruk" aria-label={`Podgląd strony ${strona + 1} pliku ${wybrany.nazwa}`} />
    <p className="narzedzia__opis">{zaleceniaDruku(wybrany.ustawienia)}</p>
  </section>
}
