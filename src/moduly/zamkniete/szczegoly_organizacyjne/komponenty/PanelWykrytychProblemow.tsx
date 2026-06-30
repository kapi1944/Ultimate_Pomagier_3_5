import { useMemo, useState } from 'react'
import type { ProblemWalidacji } from '../typy'

type WlasciwosciPaneluProblemow = {
  problemy: ProblemWalidacji[]
}

export default function PanelWykrytychProblemow({ problemy }: WlasciwosciPaneluProblemow) {
  const [czyRozwiniety, ustawCzyRozwiniety] = useState(true)
  const problemyWedlugSekcji = useMemo(() => {
    return problemy.reduce<Record<string, ProblemWalidacji[]>>((grupy, problem) => {
      grupy[problem.sekcja] = [...(grupy[problem.sekcja] ?? []), problem]
      return grupy
    }, {})
  }, [problemy])

  const liczbaBlokujacych = problemy.filter((problem) => problem.czyBlokuje).length

  return (
    <div className={`szczegoly-problemy ${liczbaBlokujacych ? 'szczegoly-problemy--blad' : 'szczegoly-problemy--ok'}`}>
      <div className="szczegoly-problemy__naglowek">
        <div>
          <strong>{problemy.length ? `${problemy.length} wykrytych problemów` : 'Brak wykrytych problemów'}</strong>
          <span>{liczbaBlokujacych ? `${liczbaBlokujacych} blokuje wprowadzenie szkolenia` : 'Formularz nie ma błędów blokujących'}</span>
        </div>
        <button type="button" onClick={() => ustawCzyRozwiniety((obecnie) => !obecnie)}>
          {czyRozwiniety ? 'Zwiń' : 'Rozwiń'}
        </button>
      </div>

      {czyRozwiniety && (
        <div className="szczegoly-problemy__lista">
          {problemy.length ? (
            Object.entries(problemyWedlugSekcji).map(([sekcja, pozycje]) => (
              <section className="szczegoly-problemy__sekcja" key={sekcja}>
                <h3>{sekcja}</h3>
                <ul>
                  {pozycje.map((problem) => (
                    <li className={`szczegoly-problem szczegoly-problem--${problem.poziom}`} key={`${problem.pole}-${problem.komunikat}`}>
                      {problem.komunikat}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p>Wymagane pola są uzupełnione poprawnie.</p>
          )}
        </div>
      )}
    </div>
  )
}
