import { useEffect, useMemo, useReducer, useState } from 'react'
import type { KluczSekcjiSzczegolow, ModelSekcyjnySzczegolow, ProblemWalidacji } from '../typy'
import { czyWszystkieListyBledowRozwiniete, synchronizujRozwinieteSekcje, zbudujPozycjeChecklistyPublikacji } from './logikaChecklistyPublikacji'
import { przejdzDoPolaFormularza } from './nawigacjaDoPola'

type WlasciwosciPaneluProblemow = {
  problemy: ProblemWalidacji[]
  modelSekcyjny?: ModelSekcyjnySzczegolow
  polaNiepewne?: string[]
  ostatniAutosave?: string
  komunikatySystemowe?: string[]
  zaakceptujPolaNiepewne?: () => void
}

type AkcjaRozwinietychSekcji =
  | { typ: 'przelacz'; klucz: KluczSekcjiSzczegolow }
  | { typ: 'ustawWszystkie'; klucze: KluczSekcjiSzczegolow[] }
  | { typ: 'synchronizuj'; pozycje: ReturnType<typeof zbudujPozycjeChecklistyPublikacji> }

function zredukujRozwinieteSekcje(obecne: Set<KluczSekcjiSzczegolow>, akcja: AkcjaRozwinietychSekcji) {
  if (akcja.typ === 'synchronizuj') return synchronizujRozwinieteSekcje(akcja.pozycje, obecne)
  if (akcja.typ === 'ustawWszystkie') return new Set(akcja.klucze)

  const kolejne = new Set(obecne)
  if (kolejne.has(akcja.klucz)) kolejne.delete(akcja.klucz)
  else kolejne.add(akcja.klucz)
  return kolejne
}

function formatujDate(data?: string) {
  return data ? new Date(data).toLocaleString('pl-PL') : 'Brak autosave'
}

function liczbaUnikalnychProblemowBlokujacych(problemy: ProblemWalidacji[]) {
  return new Set(problemy.filter((problem) => problem.czyBlokuje).map((problem) => `${problem.sekcja}:${problem.pole}:${problem.kodBledu ?? problem.komunikat}`)).size
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
  const [rozwinieteSekcje, wyslijAkcjeRozwinietychSekcji] = useReducer(zredukujRozwinieteSekcje, new Set<KluczSekcjiSzczegolow>())
  const pozycjeChecklisty = useMemo(() => (modelSekcyjny ? zbudujPozycjeChecklistyPublikacji(modelSekcyjny) : []), [modelSekcyjny])
  const pozycjeZBledami = pozycjeChecklisty.filter((pozycja) => pozycja.bledy.length > 0)
  const wszystkieListyRozwiniete = czyWszystkieListyBledowRozwiniete(pozycjeChecklisty, rozwinieteSekcje)
  const liczbaBlokujacych = liczbaUnikalnychProblemowBlokujacych(problemy)

  useEffect(() => {
    wyslijAkcjeRozwinietychSekcji({ typ: 'synchronizuj', pozycje: pozycjeChecklisty })
  }, [pozycjeChecklisty])

  function przelaczSekcje(klucz: KluczSekcjiSzczegolow) {
    wyslijAkcjeRozwinietychSekcji({ typ: 'przelacz', klucz })
  }

  function przelaczWszystkieSekcje() {
    wyslijAkcjeRozwinietychSekcji({ typ: 'ustawWszystkie', klucze: wszystkieListyRozwiniete ? [] : pozycjeZBledami.map((pozycja) => pozycja.klucz) })
  }

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

          {pozycjeChecklisty.length > 0 && (
            <section className="szczegoly-problemy__sekcja">
              <h3>Checklista publikacji</h3>
              {pozycjeZBledami.length > 0 && (
                <button className="szczegoly-checklista__przycisk-zbiorczy" type="button" onClick={przelaczWszystkieSekcje}>
                  {wszystkieListyRozwiniete ? 'Zwiń wszystkie' : 'Rozwiń wszystkie'}
                </button>
              )}
              <ul className="szczegoly-checklista">
                {pozycjeChecklisty.map((pozycja) => {
                  const czyMaBledy = pozycja.bledy.length > 0
                  const czyRozwinieta = rozwinieteSekcje.has(pozycja.klucz)
                  const idListyBledow = `checklista-bledy-${pozycja.klucz}`

                  return (
                    <li className={`szczegoly-checklista__pozycja ${czyMaBledy ? 'szczegoly-checklista__pozycja--blad' : 'szczegoly-checklista__pozycja--ok'}`} key={pozycja.klucz}>
                      {czyMaBledy ? (
                        <button aria-controls={idListyBledow} aria-expanded={czyRozwinieta} className="szczegoly-checklista__naglowek" type="button" onClick={() => przelaczSekcje(pozycja.klucz)}>
                          <span aria-hidden="true">●</span>
                          <span>{pozycja.etykieta} ({pozycja.bledy.length})</span>
                          <span aria-hidden="true" className="szczegoly-checklista__strzalka">{czyRozwinieta ? '▲' : '▼'}</span>
                          <span className="sr-only">{czyRozwinieta ? 'Zwiń listę błędów' : 'Rozwiń listę błędów'}</span>
                        </button>
                      ) : (
                        <div className="szczegoly-checklista__naglowek">
                          <span aria-hidden="true">✓</span>
                          <span>{pozycja.etykieta}</span>
                          <span className="sr-only">Sekcja poprawna</span>
                        </div>
                      )}
                      {czyMaBledy && (
                        <ul hidden={!czyRozwinieta} id={idListyBledow}>
                          {pozycja.bledy.map((blad) => (
                            <li className={`szczegoly-problem szczegoly-problem--${blad.poziom}`} key={`${pozycja.klucz}-${blad.pole}`}>
                              <button className="szczegoly-checklista__blad" type="button" onClick={() => przejdzDoPolaFormularza(blad.pole, pozycja.idSekcjiFormularza, blad.idDocelowy)}>
                                {blad.komunikat}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
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
        </div>
      )}
    </div>
  )
}
