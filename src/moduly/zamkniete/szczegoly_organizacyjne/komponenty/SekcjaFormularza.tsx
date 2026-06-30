import type { ReactNode } from 'react'

type WlasciwosciSekcjiFormularza = {
  id: string
  tytul: string
  opis?: string
  akcje?: ReactNode
  dzieci?: ReactNode
  children?: ReactNode
}

export default function SekcjaFormularza({ id, tytul, opis, akcje, dzieci, children }: WlasciwosciSekcjiFormularza) {
  const zawartosc = dzieci ?? children

  return (
    <section className="szczegoly-sekcja" id={id}>
      <header className="szczegoly-sekcja__naglowek">
        <div>
          <h2>{tytul}</h2>
          {opis && <p>{opis}</p>}
        </div>
        {akcje && <div className="szczegoly-sekcja__akcje">{akcje}</div>}
      </header>
      <div className="szczegoly-sekcja__tresc">{zawartosc}</div>
    </section>
  )
}
