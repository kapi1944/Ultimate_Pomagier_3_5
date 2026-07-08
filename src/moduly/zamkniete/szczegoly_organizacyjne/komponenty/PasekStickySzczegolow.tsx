import type { MouseEvent, ReactNode } from 'react'

type SekcjaKotwicy = {
  id: string
  etykieta: string
}

type WlasciwosciPaskaSticky = {
  tytul: string
  status: string
  sekcje: SekcjaKotwicy[]
  akcje: ReactNode
}

export default function PasekStickySzczegolow({ tytul, status, sekcje, akcje }: WlasciwosciPaskaSticky) {
  function przewinDoSekcji(zdarzenie: MouseEvent<HTMLAnchorElement>, idSekcji: string) {
    const sekcja = document.getElementById(idSekcji)

    if (!sekcja) {
      return
    }

    zdarzenie.preventDefault()
    sekcja.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.pushState(null, '', `#${idSekcji}`)
  }

  return (
    <header className="szczegoly-sticky">
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
        {sekcje.map((sekcja) => (
          <a href={`#${sekcja.id}`} key={sekcja.id} onClick={(zdarzenie) => przewinDoSekcji(zdarzenie, sekcja.id)}>
            {sekcja.etykieta}
          </a>
        ))}
      </nav>
    </header>
  )
}
