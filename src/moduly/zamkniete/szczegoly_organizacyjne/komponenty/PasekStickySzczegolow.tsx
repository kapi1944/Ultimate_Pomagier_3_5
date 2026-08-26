import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

type SekcjaKotwicy = {
  id: string
  etykieta: string
}

type WlasciwosciPaskaSticky = {
  tytul: string
  status: string
  sekcje: SekcjaKotwicy[]
  kompletneSekcje: Set<string>
  akcje: ReactNode
}

export default function PasekStickySzczegolow({ tytul, status, sekcje, kompletneSekcje, akcje }: WlasciwosciPaskaSticky) {
  const pasekRef = useRef<HTMLElement>(null)
  const [aktywnaSekcjaId, ustawAktywnaSekcjaId] = useState(() => {
    const idZAdresu = typeof window === 'undefined' ? '' : window.location.hash.slice(1)
    return sekcje.some((sekcja) => sekcja.id === idZAdresu) ? idZAdresu : sekcje[0]?.id ?? ''
  })
  const preferowanaSekcjaRef = useRef(aktywnaSekcjaId)

  useEffect(() => {
    let klatkaAnimacji: number | null = null

    function aktualizujAktywnaSekcje() {
      klatkaAnimacji = null
      const dolPaska = pasekRef.current?.getBoundingClientRect().bottom ?? 0
      const elementySekcji = sekcje
        .map((sekcja) => ({ ...sekcja, element: document.getElementById(sekcja.id) }))
        .filter((sekcja): sekcja is SekcjaKotwicy & { element: HTMLElement } => sekcja.element instanceof HTMLElement)

      if (!elementySekcji.length) {
        return
      }

      const sekcjeNadLiniaPaska = elementySekcji
        .map((sekcja) => ({ ...sekcja, gora: sekcja.element.getBoundingClientRect().top }))
        .filter((sekcja) => sekcja.gora <= dolPaska + 12)
      const najnizszaGora = Math.max(...sekcjeNadLiniaPaska.map((sekcja) => sekcja.gora))
      const sekcjeWBiezacymRzedzie = sekcjeNadLiniaPaska.filter((sekcja) => Math.abs(sekcja.gora - najnizszaGora) < 2)
      let aktywnaSekcja: SekcjaKotwicy = sekcjeWBiezacymRzedzie.find((sekcja) => sekcja.id === preferowanaSekcjaRef.current)
        ?? sekcjeWBiezacymRzedzie[0]
        ?? elementySekcji[0]

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        aktywnaSekcja = elementySekcji[elementySekcji.length - 1]
      }

      preferowanaSekcjaRef.current = aktywnaSekcja.id
      ustawAktywnaSekcjaId((obecna) => obecna === aktywnaSekcja.id ? obecna : aktywnaSekcja.id)
    }

    function zaplanujAktualizacje() {
      if (klatkaAnimacji === null) {
        klatkaAnimacji = window.requestAnimationFrame(aktualizujAktywnaSekcje)
      }
    }

    zaplanujAktualizacje()
    window.addEventListener('scroll', zaplanujAktualizacje, { passive: true })
    window.addEventListener('resize', zaplanujAktualizacje)

    return () => {
      window.removeEventListener('scroll', zaplanujAktualizacje)
      window.removeEventListener('resize', zaplanujAktualizacje)
      if (klatkaAnimacji !== null) {
        window.cancelAnimationFrame(klatkaAnimacji)
      }
    }
  }, [sekcje])

  function przewinDoSekcji(zdarzenie: MouseEvent<HTMLAnchorElement>, idSekcji: string) {
    const sekcja = document.getElementById(idSekcji)

    if (!sekcja) {
      return
    }

    zdarzenie.preventDefault()
    preferowanaSekcjaRef.current = idSekcji
    ustawAktywnaSekcjaId(idSekcji)
    sekcja.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.pushState(null, '', `#${idSekcji}`)
  }

  return (
    <header className="szczegoly-sticky" ref={pasekRef}>
      <div className="szczegoly-sticky__wiersz">
        <div>
          <p className="szczegoly-sticky__etykieta">Szczegóły organizacyjne</p>
          <h1>{tytul}</h1>
        </div>
        <div className="szczegoly-sticky__status">
          <span>Status formularza</span>
          <strong>{status}</strong>
        </div>
        <div className="szczegoly-sticky__akcje">{akcje}</div>
      </div>
      <nav className="szczegoly-sticky__kotwice" aria-label="Sekcje generatora">
        {sekcje.map((sekcja) => {
          const czyAktywna = sekcja.id === aktywnaSekcjaId
          const czyKompletna = kompletneSekcje.has(sekcja.id)
          const klasy = [
            czyAktywna ? 'szczegoly-sticky__kotwica--aktywna' : '',
            czyKompletna ? 'szczegoly-sticky__kotwica--kompletna' : '',
          ].filter(Boolean).join(' ')

          return (
            <a
              aria-current={czyAktywna ? 'location' : undefined}
              className={klasy || undefined}
              href={`#${sekcja.id}`}
              key={sekcja.id}
              onClick={(zdarzenie) => przewinDoSekcji(zdarzenie, sekcja.id)}
              title={czyKompletna ? `${sekcja.etykieta}: wszystkie wymagane pola są uzupełnione` : undefined}
            >
              {sekcja.etykieta}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
