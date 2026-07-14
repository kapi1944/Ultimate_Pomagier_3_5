import { useState } from 'react'
import type { KopiaRobocza, TypGeneratoraKopiiRoboczej } from './magazynKopiiRoboczych'

type WlasciwosciWidokuKopiiRoboczychGeneratora<TypDanych> = {
  typGeneratora: TypGeneratoraKopiiRoboczej
  tytul: string
  pobierzKopie: () => KopiaRobocza<TypDanych>[]
  otworzKopie: (kopia: KopiaRobocza<TypDanych>) => void
  usunKopie: (kopia: KopiaRobocza<TypDanych>) => void
}

function formatujDate(date: string) {
  return new Date(date).toLocaleString('pl-PL')
}

export default function WidokKopiiRoboczychGeneratora<TypDanych>({
  tytul,
  pobierzKopie,
  otworzKopie,
  usunKopie,
}: WlasciwosciWidokuKopiiRoboczychGeneratora<TypDanych>) {
  const [kopie, ustawKopie] = useState(pobierzKopie)

  function obsluzUsuniecie(kopia: KopiaRobocza<TypDanych>) {
    usunKopie(kopia)
    ustawKopie((obecne) => obecne.filter((istniejaca) => istniejaca.id !== kopia.id))
  }

  return (
    <section className="widok">
      <header>
        <h1>Kopie robocze: {tytul}</h1>
      </header>
      {kopie.length === 0 ? (
        <p>Brak kopii roboczych.</p>
      ) : (
        <div className="szczegoly-lista-rekordow">
          {kopie.map((kopia) => (
            <article className="szczegoly-rekord" key={kopia.id}>
              <div className="szczegoly-rekord__naglowek">
                <div>
                  <h2>{kopia.tytul}</h2>
                  <p>Utworzono: {formatujDate(kopia.utworzono)}</p>
                </div>
                <strong>{kopia.status}</strong>
              </div>
              <div className="szczegoly-rekord__metadane">
                <span>Ostatnia aktualizacja: {formatujDate(kopia.zaktualizowano)}</span>
              </div>
              <div className="szczegoly-rekord__akcje">
                <button type="button" onClick={() => otworzKopie(kopia)}>
                  Otwórz
                </button>
                <button type="button" onClick={() => obsluzUsuniecie(kopia)}>
                  Usuń
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
