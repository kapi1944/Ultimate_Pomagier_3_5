import { useReducer, useRef, useState } from 'react'
import IkonaMenu from '../../../aplikacja/menu/IkonaMenu'
import { poczatkowyStanPoprawiacza, zmienStanPoprawiacza } from './modele/stanPoprawiacza'
import './poprawiaczPrezentacji.css'

export default function WidokPoprawiaczaPrezentacji() {
  const [dane, wyslijAkcje] = useReducer(zmienStanPoprawiacza, poczatkowyStanPoprawiacza)
  const [czyPrzeciagany, ustawCzyPrzeciagany] = useState(false)
  const polePliku = useRef<HTMLInputElement>(null)

  return (
    <section className="narzedzia poprawiacz-prezentacji" data-stan={dane.stan}>
      <header className="narzedzia__naglowek">
        <h1>Poprawiacz prezentacji</h1>
        <p>Analizuj, poprawiaj i przygotowuj prezentacje PowerPoint zgodnie ze standardami SEMPER.</p>
      </header>
      <ol className="poprawiacz-prezentacji__etapy" aria-label="Etapy pracy z prezentacją">
        {['PLIK', 'ANALIZA', 'POPRAWKI', 'PRZYGOTOWANIE DO DRUKU'].map((etap, indeks) => (
          <li key={etap} aria-current={indeks === 0 ? 'step' : undefined}>
            <span aria-hidden="true">{indeks + 1}.</span> {etap}
          </li>
        ))}
      </ol>
      <div className="poprawiacz-prezentacji__uklad">
        <div className="poprawiacz-prezentacji__lewy-panel">
          <section className="narzedzia__panel" aria-labelledby="poprawiacz-plik">
            <h2 id="poprawiacz-plik">Plik prezentacji</h2>
            <div
              className={`poprawiacz-prezentacji__plik${czyPrzeciagany ? ' poprawiacz-prezentacji__plik--przeciagany' : ''}`}
              onDragOver={(zdarzenie) => { zdarzenie.preventDefault(); ustawCzyPrzeciagany(true) }}
              onDragLeave={(zdarzenie) => {
                if (!zdarzenie.currentTarget.contains(zdarzenie.relatedTarget as Node | null)) ustawCzyPrzeciagany(false)
              }}
              onDrop={(zdarzenie) => {
                zdarzenie.preventDefault()
                ustawCzyPrzeciagany(false)
                wyslijAkcje({ typ: 'WYBIERZ_PLIK', pliki: Array.from(zdarzenie.dataTransfer.files) })
              }}
            >
              <IkonaMenu typ="prezentacja" />
              <strong>Przeciągnij tutaj plik PPTX</strong>
              <span>lub wybierz prezentację z komputera</span>
              <input
                ref={polePliku}
                type="file"
                accept=".pptx"
                aria-label="Wybierz plik prezentacji PPTX"
                hidden
                onChange={(zdarzenie) => {
                  const pliki = Array.from(zdarzenie.currentTarget.files ?? [])
                  if (pliki.length) wyslijAkcje({ typ: 'WYBIERZ_PLIK', pliki })
                  zdarzenie.currentTarget.value = ''
                }}
              />
              <button type="button" onClick={() => polePliku.current?.click()}>Wybierz PPTX</button>
            </div>
            {dane.blad && <p role="alert">{dane.blad}</p>}
            {dane.prezentacja && (
              <div className="poprawiacz-prezentacji__wybrany-plik" aria-live="polite">
                <strong>{dane.prezentacja.nazwa}</strong>
                <span>{dane.prezentacja.rozmiar.toLocaleString('pl-PL')} B</span>
                <button type="button" onClick={() => wyslijAkcje({ typ: 'USUN_PLIK' })}>Usuń plik</button>
              </div>
            )}
            <p className="narzedzia__opis">Plik pozostaje w pamięci tej sesji narzędzia. Jego zawartość nie jest jeszcze odczytywana.</p>
          </section>
          <section className="narzedzia__panel" aria-labelledby="poprawiacz-analiza">
            <h2 id="poprawiacz-analiza">Analiza prezentacji</h2>
            <p role="status">{dane.prezentacja ? 'Plik gotowy do analizy' : 'Wybierz plik, aby przygotować prezentację do analizy.'}</p>
            <button type="button" disabled aria-describedby="poprawiacz-dostepnosc">Analizuj prezentację</button>
            <p id="poprawiacz-dostepnosc" className="narzedzia__opis">Analiza zawartości PPTX będzie dostępna w kolejnym etapie rozwoju narzędzia.</p>
          </section>
          <section className="narzedzia__panel" aria-labelledby="poprawiacz-operacje">
            <h2 id="poprawiacz-operacje">Poprawki i przygotowanie do druku</h2>
            <p className="narzedzia__opis">Wyniki analizy i dostępne operacje pojawią się po wdrożeniu analizy prezentacji.</p>
          </section>
        </div>
        <section className="narzedzia__panel" aria-labelledby="poprawiacz-podglad">
          <h2 id="poprawiacz-podglad">Podgląd / inspektor slajdu</h2>
          <div className="poprawiacz-prezentacji__podglad">
            <IkonaMenu typ="prezentacja" />
            <p>Podgląd pojawi się po przeanalizowaniu prezentacji.</p>
          </div>
        </section>
      </div>
    </section>
  )
}
