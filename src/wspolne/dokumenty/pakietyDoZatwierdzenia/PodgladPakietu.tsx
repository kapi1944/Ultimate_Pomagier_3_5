import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type RenderTask } from 'pdfjs-dist'
import adresWorkera from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { GotowyPakiet } from './przygotujPakiet'

GlobalWorkerOptions.workerSrc = adresWorkera

export default function PodgladPakietu({ pakiet }: { pakiet: GotowyPakiet }) {
  const [skala, ustawSkale] = useState(1)
  const [blad, ustawBlad] = useState('')
  const [wyrenderowano, ustawWyrenderowano] = useState(0)
  const obszar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const kontener = obszar.current!
    const zadanie = getDocument({ data: new Uint8Array(pakiet.pdfBytes) })
    let anulowano = false
    let renderowanie: RenderTask | null = null
    async function pokaz() {
      try {
        ustawBlad('')
        ustawWyrenderowano(0)
        const pdf = await zadanie.promise
        if (anulowano) return
        for (let numer = 1; numer <= pdf.numPages; numer++) {
          if (anulowano) return
          const strona = await pdf.getPage(numer)
          if (anulowano) return
          const widok = strona.getViewport({ scale: skala })
          const kanwa = document.createElement('canvas')
          kanwa.width = Math.ceil(widok.width)
          kanwa.height = Math.ceil(widok.height)
          kanwa.setAttribute('aria-label', 'Strona ' + numer + ' z ' + pdf.numPages)
          const sekcja = document.createElement('section')
          sekcja.dataset.numerStronyPakietu = String(numer)
          const podpis = document.createElement('p')
          podpis.textContent = 'Strona ' + numer + ' z ' + pdf.numPages
          sekcja.append(podpis, kanwa)
          kontener.append(sekcja)
          renderowanie = strona.render({ canvas: kanwa, viewport: widok })
          await renderowanie.promise
          if (anulowano) return
          strona.cleanup()
          ustawWyrenderowano(numer)
        }
      } catch (blad) { if (!anulowano) ustawBlad(blad instanceof Error ? blad.message : 'Nie udało się wyświetlić PDF.') }
    }
    void pokaz()
    return () => {
      anulowano = true
      renderowanie?.cancel()
      void zadanie.destroy()
      kontener.replaceChildren()
    }
  }, [pakiet, skala])
  return <section className="pakiet-pdf__podglad" aria-label="Podgląd kompletnego PDF">
    <div className="pakiet-pdf__akcje">
      <button type="button" disabled={skala <= 0.4} onClick={() => ustawSkale((wartosc) => Math.max(0.4, wartosc - 0.2))} aria-label="Pomniejsz podgląd">−</button>
      <output>{Math.round(skala * 100)}%</output>
      <button type="button" disabled={skala >= 2} onClick={() => ustawSkale((wartosc) => Math.min(2, wartosc + 0.2))} aria-label="Powiększ podgląd">+</button>
      <span>Łącznie: {pakiet.liczbaStron} stron</span>
      <label>Przejdź do dokumentu<select defaultValue="" onChange={(zdarzenie) => obszar.current?.querySelector('[data-numer-strony-pakietu="' + zdarzenie.target.value + '"]')?.scrollIntoView({ block: 'start' })}>
        <option value="" disabled>Wybierz dokument…</option>
        {pakiet.spis.map((pozycja) => <option key={pozycja.dokumentId} value={pozycja.strona} disabled={pozycja.strona > wyrenderowano}>{pozycja.nazwa} — str. {pozycja.strona}</option>)}
      </select></label>
    </div>
    {blad && <p role="alert">Błąd podglądu: {blad}</p>}
    <p aria-live="polite">Wyświetlono {wyrenderowano} z {pakiet.liczbaStron} stron.</p>
    <div className="pakiet-pdf__strony" ref={obszar} tabIndex={0} aria-label="Przewijany podgląd wszystkich stron PDF" />
  </section>
}
