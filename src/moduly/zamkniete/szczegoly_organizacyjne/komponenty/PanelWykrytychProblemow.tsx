import { useMemo, useState } from 'react'
import type { ModelSekcyjnySzczegolow, ProblemWalidacji } from '../typy'

type WlasciwosciPaneluProblemow = {
  problemy: ProblemWalidacji[]
  modelSekcyjny?: ModelSekcyjnySzczegolow
  polaNiepewne?: string[]
  ostatniAutosave?: string
  komunikatySystemowe?: string[]
  zaakceptujPolaNiepewne?: () => void
}

function formatujDate(data?: string) {
  return data ? new Date(data).toLocaleString('pl-PL') : 'Brak autosave'
}

export default function PanelWykrytychProblemow({
  problemy,
  modelSekcyjny,
  polaNiepewne = [],
  ostatniAutosave,
  komunikatySystemowe = [],
  zaakceptujPolaNiepewne,
}: WlasciwosciPaneluProblemow) {
  const [czyRozwiniety, ustawCzyRozwiniety] = useState(true)
  const problemyWedlugSekcji = useMemo(() => {
    return problemy.reduce<Record<string, ProblemWalidacji[]>>((grupy, problem) => {
      grupy[problem.sekcja] = [...(grupy[problem.sekcja] ?? []), problem]
      return grupy
    }, {})
  }, [problemy])

  const liczbaBlokujacych = problemy.filter((problem) => problem.czyBlokuje).length
  const sekcje = modelSekcyjny ? Object.values(modelSekcyjny) : []
  const wymaganeSekcje = sekcje.filter((sekcja) => sekcja.wymaganaDoPublikacji)

  return (
    <div className={`szczegoly-problemy ${liczbaBlokujacych ? 'szczegoly-problemy--blad' : 'szczegoly-problemy--ok'}`}>
      <div className="szczegoly-problemy__naglowek">
        <div>
          <strong>Panel kontroli jakości</strong>
          <span>{liczbaBlokujacych ? `${liczbaBlokujacych} blokuje publikację lub eksport` : 'Formularz nie ma błędów blokujących'}</span>
        </div>
        <button type="button" onClick={() => ustawCzyRozwiniety((obecnie) => !obecnie)}>
          {czyRozwiniety ? 'Zwiń' : 'Rozwiń'}
        </button>
      </div>

      {czyRozwiniety && (
        <div className="szczegoly-problemy__lista">
          <section className="szczegoly-problemy__sekcja">
            <h3>Autosave</h3>
            <p>Ostatni zapis techniczny: {formatujDate(ostatniAutosave)}</p>
          </section>

          {komunikatySystemowe.length > 0 && (
            <section className="szczegoly-problemy__sekcja">
              <h3>Komunikaty systemowe</h3>
              <ul>
                {komunikatySystemowe.map((komunikat) => (
                  <li className="szczegoly-problem szczegoly-problem--informacja" key={komunikat}>
                    {komunikat}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {wymaganeSekcje.length > 0 && (
            <section className="szczegoly-problemy__sekcja">
              <h3>Checklista publikacji</h3>
              <ul>
                {wymaganeSekcje.map((sekcja) => (
                  <li className={sekcja.statusKompletnosci === 'kompletna' ? 'szczegoly-problem--informacja' : 'szczegoly-problem--blad'} key={sekcja.klucz}>
                    <a href={`#${sekcja.klucz === 'podstawoweInformacje' ? 'podstawowe-informacje' : sekcja.klucz === 'grupySzkoleniowe' ? 'grupy-szkoleniowe' : 'wykryte-problemy'}`}>
                      {sekcja.statusKompletnosci === 'kompletna' ? '✓' : '⚠'} {sekcja.etykieta}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {polaNiepewne.length > 0 && (
            <section className="szczegoly-problemy__sekcja szczegoly-problemy__sekcja--niepewne">
              <h3>Pola niepewne po imporcie</h3>
              <ul>
                {polaNiepewne.map((pole) => (
                  <li className="szczegoly-problem szczegoly-problem--blad" key={pole}>
                    ⚠ {pole}
                  </li>
                ))}
              </ul>
              {zaakceptujPolaNiepewne && (
                <button type="button" onClick={zaakceptujPolaNiepewne}>
                  Akceptuję wszystkie widoczne dane
                </button>
              )}
            </section>
          )}

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
