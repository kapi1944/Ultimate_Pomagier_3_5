import { useMemo, useState } from 'react'
import type { ProblemDokumentu } from './modelBlokowy'
import './panelKontroliJakosciDokumentu.css'

type RaportReplikacjiPanelu = {
  procentZgodnosci: number
  poziomZgodnosci: string
  odtworzono: string[]
  nieOdtworzono: string[]
  wymagaPoprawy: string[]
  ograniczenia: string[]
}

type WlasciwosciPaneluKontroliJakosciDokumentu = {
  problemy: ProblemDokumentu[]
  czyZatwierdzony: boolean
  liczbaBlokow: number
  liczbaDni?: number
  liczbaModulow?: number
  liczbaPunktow?: number
  pokazDiagnostykeParsera?: boolean
  diagnostykaParsera?: string[]
  statusSzablonu?: string
  raportReplikacji?: RaportReplikacjiPanelu
  onPrzejdzDoProblemu?: (problem: ProblemDokumentu) => void
}

function pobierzEtykietePoziomu(poziom: ProblemDokumentu['poziom']) {
  if (poziom === 'blad_krytyczny') {
    return 'Błąd krytyczny'
  }

  if (poziom === 'ostrzezenie') {
    return 'Ostrzeżenie'
  }

  return 'Informacja'
}

export default function PanelKontroliJakosciDokumentu({
  problemy,
  czyZatwierdzony,
  liczbaBlokow,
  liczbaDni = 0,
  liczbaModulow = 0,
  liczbaPunktow = 0,
  pokazDiagnostykeParsera = false,
  diagnostykaParsera = [],
  statusSzablonu,
  raportReplikacji,
  onPrzejdzDoProblemu,
}: WlasciwosciPaneluKontroliJakosciDokumentu) {
  const [czyRozwiniety, ustawCzyRozwiniety] = useState(true)
  const problemyWedlugKategorii = useMemo(() => {
    return problemy.reduce<Record<string, ProblemDokumentu[]>>((grupy, problem) => {
      grupy[problem.kategoria] = [...(grupy[problem.kategoria] ?? []), problem]
      return grupy
    }, {})
  }, [problemy])
  const liczbaBledow = problemy.filter((problem) => problem.poziom === 'blad_krytyczny').length
  const liczbaOstrzezen = problemy.filter((problem) => problem.poziom === 'ostrzezenie').length

  return (
    <aside className={`panel-jakosci-dokumentu${liczbaBledow ? ' panel-jakosci-dokumentu--blad' : ''}`}>
      <div className="panel-jakosci-dokumentu__naglowek">
        <div>
          <strong>Panel kontroli jakości</strong>
          <span>
            {liczbaBledow
              ? `${liczbaBledow} blokuje eksport`
              : liczbaOstrzezen
                ? `${liczbaOstrzezen} ostrzeżeń`
                : 'Dokument bez błędów krytycznych'}
          </span>
        </div>
        <button className="panel-jakosci-dokumentu__przycisk" onClick={() => ustawCzyRozwiniety((obecnie) => !obecnie)} type="button">
          {czyRozwiniety ? 'Zwiń' : 'Rozwiń'}
        </button>
      </div>

      {czyRozwiniety && (
        <div className="panel-jakosci-dokumentu__tresc">
          <section>
            <h3>Status dokumentu</h3>
            <ul>
              <li className={czyZatwierdzony ? 'panel-jakosci-dokumentu__stan--ok' : 'panel-jakosci-dokumentu__stan--ostrzezenie'}>
                {czyZatwierdzony ? 'Wynik parsowania zatwierdzony.' : 'Wynik parsowania czeka na zatwierdzenie.'}
              </li>
              <li>Bloki: {liczbaBlokow}</li>
              <li>Dni: {liczbaDni}</li>
              <li>Moduły: {liczbaModulow}</li>
              <li>Punkty i podpunkty: {liczbaPunktow}</li>
              {statusSzablonu && <li>Status szablonu: {statusSzablonu}</li>}
            </ul>
          </section>

          {raportReplikacji && (
            <section>
              <h3>Raport replikacji</h3>
              <ul>
                <li>Zgodność: {raportReplikacji.procentZgodnosci}% ({raportReplikacji.poziomZgodnosci})</li>
                <li>Odtworzono: {raportReplikacji.odtworzono.join(', ') || '-'}</li>
                <li>Nie odtworzono: {raportReplikacji.nieOdtworzono.join(', ') || '-'}</li>
                <li>Do poprawy: {raportReplikacji.wymagaPoprawy.join(', ') || '-'}</li>
                <li>Ograniczenia: {raportReplikacji.ograniczenia.join(', ') || '-'}</li>
              </ul>
            </section>
          )}

          {Object.entries(problemyWedlugKategorii).map(([kategoria, pozycje]) => (
            <section key={kategoria}>
              <h3>{kategoria.replaceAll('_', ' ')}</h3>
              <ul>
                {pozycje.map((problem) => (
                  <li className={`panel-jakosci-dokumentu__problem panel-jakosci-dokumentu__problem--${problem.poziom}`} key={problem.id}>
                    <strong>{pobierzEtykietePoziomu(problem.poziom)}:</strong> {problem.komunikat}
                    {onPrzejdzDoProblemu && (
                      <button className="panel-jakosci-dokumentu__link" type="button" onClick={() => onPrzejdzDoProblemu(problem)}>
                        Pokaż
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {!problemy.length && <p>Gotowe do eksportu PDF. DOCX użyje tej samej struktury blokowej.</p>}

          {pokazDiagnostykeParsera && diagnostykaParsera.length > 0 && (
            <section>
              <h3>Diagnostyka parsera</h3>
              <ul>
                {diagnostykaParsera.map((komunikat) => (
                  <li className="panel-jakosci-dokumentu__problem panel-jakosci-dokumentu__problem--informacja" key={komunikat}>
                    {komunikat}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </aside>
  )
}
