import { useEffect, useRef, useState } from 'react'
import './regulacjaSzerokosci.css'

type Wlasciwosci = {
  panel: string
  obszar: string
  zmienna: string
  strona: 'lewa' | 'prawa'
  minimum: number
  maksimum: number
  kluczZapisu?: string
  zapisz?: (szerokosc: number) => boolean
}

export function RegulacjaSzerokosci({ panel, obszar, zmienna, strona, minimum, maksimum, kluczZapisu, zapisz }: Wlasciwosci) {
  const uchwyt = useRef<HTMLDivElement>(null)
  const gest = useRef<{ x: number; szerokosc: number; skala: number } | null>(null)
  const [szerokosc, ustawSzerokosc] = useState(minimum)
  const [blad, ustawBlad] = useState(false)

  useEffect(() => {
    const element = uchwyt.current?.closest<HTMLElement>(obszar)
    return () => {
      if (gest.current) element?.removeAttribute('data-regulacja-szerokosci')
    }
  }, [obszar])

  useEffect(() => {
    if (!kluczZapisu) return
    try {
      const zapis = localStorage.getItem(kluczZapisu)
      const wartosc = Number(zapis)
      if (zapis !== null && Number.isFinite(wartosc) && wartosc >= minimum && wartosc <= maksimum) {
        uchwyt.current?.closest<HTMLElement>(obszar)?.style.setProperty(zmienna, `${wartosc}px`)
      }
    } catch {
      // Niedostępny magazyn nie blokuje regulacji w bieżącej sesji.
    }
  }, [kluczZapisu, maksimum, minimum, obszar, zmienna])

  function zmien(wartosc: number) {
    const wynik = Math.round(Math.min(maksimum, Math.max(minimum, wartosc)))
    uchwyt.current?.closest<HTMLElement>(obszar)?.style.setProperty(zmienna, `${wynik}px`)
    ustawSzerokosc(wynik)
    return wynik
  }

  function utrwal(wartosc: number) {
    try {
      if (kluczZapisu) localStorage.setItem(kluczZapisu, String(wartosc))
      const czyZapisano = zapisz ? zapisz(wartosc) : true
      if (zapisz && czyZapisano) uchwyt.current?.closest<HTMLElement>(obszar)?.style.removeProperty(zmienna)
      ustawBlad(!czyZapisano)
    } catch {
      ustawBlad(true)
    }
  }

  function zakoncz() {
    if (!gest.current) return
    gest.current = null
    uchwyt.current?.closest<HTMLElement>(obszar)?.removeAttribute('data-regulacja-szerokosci')
    utrwal(szerokosc)
  }

  return <>
    <div ref={uchwyt} role="separator" tabIndex={0} aria-label="Zmień szerokość panelu" aria-orientation="vertical" aria-valuemin={minimum} aria-valuemax={maksimum} aria-valuenow={szerokosc}
      className={`regulacja-szerokosci regulacja-szerokosci--${strona}`}
      onPointerDown={(zdarzenie) => {
        if (zdarzenie.button !== 0) return
        const element = zdarzenie.currentTarget.closest<HTMLElement>(panel)
        if (!element) return
        zdarzenie.preventDefault()
        zdarzenie.currentTarget.focus()
        const wartosc = parseFloat(getComputedStyle(element).width)
        gest.current = { x: zdarzenie.clientX, szerokosc: wartosc, skala: element.getBoundingClientRect().width / wartosc }
        ustawSzerokosc(wartosc)
        zdarzenie.currentTarget.setPointerCapture(zdarzenie.pointerId)
        zdarzenie.currentTarget.closest<HTMLElement>(obszar)?.setAttribute('data-regulacja-szerokosci', 'true')
      }}
      onPointerMove={(zdarzenie) => {
        if (gest.current) zmien(gest.current.szerokosc + (zdarzenie.clientX - gest.current.x) / gest.current.skala * (strona === 'prawa' ? 1 : -1))
      }}
      onPointerUp={zakoncz} onPointerCancel={zakoncz} onLostPointerCapture={zakoncz}
      onFocus={() => {
        const element = uchwyt.current?.closest<HTMLElement>(panel)
        ustawSzerokosc(element ? parseFloat(getComputedStyle(element).width) : minimum)
      }}
      onKeyDown={(zdarzenie) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(zdarzenie.key)) return
        zdarzenie.preventDefault()
        const wartosc = zdarzenie.key === 'Home' ? minimum : zdarzenie.key === 'End' ? maksimum
          : szerokosc + (zdarzenie.key === 'ArrowRight' ? 10 : -10) * (strona === 'prawa' ? 1 : -1)
        utrwal(zmien(wartosc))
      }} />
    {blad && <span role="status">Nie udało się zapisać szerokości panelu.</span>}
  </>
}
