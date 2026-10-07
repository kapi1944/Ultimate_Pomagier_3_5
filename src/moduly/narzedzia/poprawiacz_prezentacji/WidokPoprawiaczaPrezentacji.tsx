import { useEffect, useReducer, useRef, useState } from 'react'
import IkonaMenu from '../../../aplikacja/menu/IkonaMenu'
import { poczatkowyStanPoprawiacza, zmienStanPoprawiacza } from './modele/stanPoprawiacza'
import type { OperacjaPrezentacji } from './modele/modelPrezentacji'
import { otworzPptx } from './pptx/otworzPptx'
import { analizujPrezentacje } from './analiza/analizujPrezentacje'
import { zastosujPoprawki } from './operacje/zastosujPoprawki'
import { pobierzKopiePptx, zapiszPptx } from './pptx/zapiszPptx'
import PodgladStrukturalny from './PodgladStrukturalny'
import PanelAnalizy from './analiza/PanelAnalizy'
import './poprawiaczPrezentacji.css'

const operacjePoczatkowe: OperacjaPrezentacji[] = [
  { id: 'GÓRNY_PASEK', nazwa: 'Usuń obcy górny pasek', czyWybrana: true },
  { id: 'NUMERACJA', nazwa: 'Usuń obcą numerację', czyWybrana: true },
]

export default function WidokPoprawiaczaPrezentacji() {
  const [dane, wyslijAkcje] = useReducer(zmienStanPoprawiacza, poczatkowyStanPoprawiacza)
  const [czyPrzeciagany, ustawCzyPrzeciagany] = useState(false)
  const [operacje, ustawOperacje] = useState(operacjePoczatkowe)
  const [indeksSlajdu, ustawIndeksSlajdu] = useState(0)
  const [czyPotwierdzenie, ustawCzyPotwierdzenie] = useState(false)
  const [kopia, ustawKopie] = useState<{ plik: Blob; nazwa: string } | null>(null)
  const polePliku = useRef<HTMLInputElement>(null)
  const modal = useRef<HTMLDialogElement>(null)
  const operacjaWToku = useRef(false)
  const czyZajety = dane.stan === 'ANALIZOWANIE' || dane.stan === 'MODYFIKOWANIE'
  const wybrane = operacje.filter((operacja) => operacja.czyWybrana).map((operacja) => operacja.id)
  const trafienia = dane.analiza?.problemy.filter((problem) => wybrane.includes(problem.typ)) ?? []
  const numerySlajdow = [...new Set(trafienia.map((problem) => problem.numerSlajdu))]
  const slajd = dane.model?.slajdy[indeksSlajdu]
  const etap = dane.stan === 'GOTOWE' ? 3 : dane.stan === 'ANALIZOWANIE' ? 1 : dane.analiza ? 2 : 0

  useEffect(() => {
    if (czyPotwierdzenie) modal.current?.showModal()
    else modal.current?.close()
  }, [czyPotwierdzenie])

  function wybierzPliki(pliki: File[]) {
    if (operacjaWToku.current) return
    const kolejnyStan = zmienStanPoprawiacza(dane, { typ: 'WYBIERZ_PLIK', pliki })
    wyslijAkcje({ typ: 'WYBIERZ_PLIK', pliki })
    if (!kolejnyStan.blad) {
      ustawIndeksSlajdu(0)
      ustawKopie(null)
      ustawOperacje(operacjePoczatkowe)
    }
  }

  async function analizuj() {
    if (!dane.prezentacja || operacjaWToku.current) return
    operacjaWToku.current = true
    wyslijAkcje({ typ: 'ROZPOCZNIJ_ANALIZE' })
    try {
      const model = await otworzPptx(await dane.prezentacja.plik.arrayBuffer())
      wyslijAkcje({ typ: 'ZAKONCZ_ANALIZE', model, analiza: analizujPrezentacje(model) })
      ustawKopie(null)
      ustawIndeksSlajdu(0)
    } catch (blad) {
      wyslijAkcje({ typ: 'BLAD', blad: blad instanceof Error ? blad.message : 'Nie udało się przeanalizować PPTX.' })
    } finally { operacjaWToku.current = false }
  }

  async function popraw() {
    ustawCzyPotwierdzenie(false)
    if (!dane.model || !dane.prezentacja || operacjaWToku.current) return
    operacjaWToku.current = true
    wyslijAkcje({ typ: 'ROZPOCZNIJ_POPRAWKI' })
    try {
      const wynik = await zastosujPoprawki(dane.model, wybrane)
      const plik = await zapiszPptx(wynik.model)
      ustawKopie({ plik, nazwa: dane.prezentacja.nazwa })
      wyslijAkcje({ typ: 'ZAKONCZ_POPRAWKI', model: wynik.model, analiza: analizujPrezentacje(wynik.model), raport: wynik.raport })
    } catch (blad) {
      wyslijAkcje({ typ: 'BLAD', blad: blad instanceof Error ? blad.message : 'Nie udało się zastosować poprawek.' })
    } finally { operacjaWToku.current = false }
  }

  return (
    <section className="narzedzia poprawiacz-prezentacji" data-stan={dane.stan} aria-busy={czyZajety}>
      <header className="narzedzia__naglowek">
        <h1>Poprawiacz prezentacji</h1>
        <p>Analizuj, poprawiaj i przygotowuj prezentacje PowerPoint zgodnie ze standardami SEMPER.</p>
      </header>
      <ol className="poprawiacz-prezentacji__etapy" aria-label="Etapy pracy z prezentacją">
        {['PLIK', 'ANALIZA', 'POPRAWKI', 'PRZYGOTOWANIE DO DRUKU'].map((nazwa, indeks) => (
          <li key={nazwa} aria-current={indeks === etap ? 'step' : undefined}><span aria-hidden="true">{indeks + 1}.</span> {nazwa}</li>
        ))}
      </ol>
      {dane.blad && <p role="alert">{dane.blad}</p>}
      {czyZajety && <p role="status">{dane.stan === 'ANALIZOWANIE' ? 'Analizowanie prezentacji…' : 'Stosowanie i weryfikacja poprawek…'}</p>}
      <div className="poprawiacz-prezentacji__uklad">
        <div className="poprawiacz-prezentacji__lewy-panel">
          <section className="narzedzia__panel" aria-labelledby="poprawiacz-plik">
            <h2 id="poprawiacz-plik">Plik prezentacji</h2>
            <div className={czyPrzeciagany ? 'poprawiacz-prezentacji__plik poprawiacz-prezentacji__plik--przeciagany' : 'poprawiacz-prezentacji__plik'}
              onDragOver={(zdarzenie) => { zdarzenie.preventDefault(); if (!czyZajety) ustawCzyPrzeciagany(true) }}
              onDragLeave={(zdarzenie) => {
                if (!(zdarzenie.relatedTarget instanceof Node) || !zdarzenie.currentTarget.contains(zdarzenie.relatedTarget)) ustawCzyPrzeciagany(false)
              }}
              onDrop={(zdarzenie) => { zdarzenie.preventDefault(); ustawCzyPrzeciagany(false); wybierzPliki(Array.from(zdarzenie.dataTransfer.files)) }}>
              <IkonaMenu typ="prezentacja" />
              <strong>Przeciągnij tutaj plik PPTX</strong>
              <input ref={polePliku} type="file" accept=".pptx" aria-label="Wybierz plik prezentacji PPTX" hidden disabled={czyZajety}
                onChange={(zdarzenie) => {
                  const pliki = Array.from(zdarzenie.currentTarget.files ?? [])
                  if (pliki.length) wybierzPliki(pliki)
                  zdarzenie.currentTarget.value = ''
                }} />
              <button type="button" disabled={czyZajety} onClick={() => polePliku.current?.click()}>Wybierz PPTX</button>
            </div>
            {dane.prezentacja && <div className="poprawiacz-prezentacji__wybrany-plik" aria-live="polite">
              <strong>{dane.prezentacja.nazwa}</strong><span>{dane.prezentacja.rozmiar.toLocaleString('pl-PL')} B</span>
              <button type="button" disabled={czyZajety} onClick={() => { wyslijAkcje({ typ: 'USUN_PLIK' }); ustawKopie(null); ustawIndeksSlajdu(0) }}>Usuń plik</button>
            </div>}
            <p className="narzedzia__opis">Przetwarzanie odbywa się lokalnie. Oryginalny plik na dysku pozostaje bez zmian.</p>
            <button type="button" disabled={!dane.prezentacja || czyZajety} onClick={analizuj}>Analizuj prezentację</button>
          </section>
          {dane.analiza && <PanelAnalizy analiza={dane.analiza} operacje={operacje} ustawOperacje={ustawOperacje}
            czyZajety={czyZajety} otworzSlajd={(numer) => ustawIndeksSlajdu(numer - 1)} potwierdzPoprawki={() => ustawCzyPotwierdzenie(true)} />}
          {dane.raport && <section className="narzedzia__panel" aria-label="Raport poprawek" role="status">
            <h2>Gotowe</h2><p>Usunięto: {dane.raport.paski} pasków; {dane.raport.numery} numerów.</p>
            <p>Zmodyfikowano: {dane.raport.slajdy.length} slajdów. Ponowna analiza potwierdziła liczbę usuniętych elementów.</p>
            {kopia && <button type="button" onClick={() => pobierzKopiePptx(kopia.plik, kopia.nazwa)}>Pobierz poprawioną kopię PPTX</button>}
            <p className="narzedzia__opis">Kopia może służyć do dalszego przygotowania do druku w PowerPoint. Narzędzie nie zmienia ustawień druku.</p>
          </section>}
        </div>
        <section className="narzedzia__panel" aria-labelledby="poprawiacz-podglad">
          <h2 id="poprawiacz-podglad">Podgląd strukturalny slajdu</h2>
          {slajd ? <>
            <div className="poprawiacz-prezentacji__akcje">
              <button type="button" disabled={indeksSlajdu === 0} onClick={() => ustawIndeksSlajdu((indeks) => indeks - 1)}>‹ poprzedni</button>
              <span aria-live="polite">Slajd {slajd.numer} / {dane.model?.slajdy.length}</span>
              <button type="button" disabled={indeksSlajdu >= (dane.model?.slajdy.length ?? 0) - 1} onClick={() => ustawIndeksSlajdu((indeks) => indeks + 1)}>następny ›</button>
            </div>
            <PodgladStrukturalny slajd={slajd} problemy={dane.analiza?.problemy ?? []} />
          </> : <div className="poprawiacz-prezentacji__podglad"><IkonaMenu typ="prezentacja" /><p>Podgląd pojawi się po przeanalizowaniu prezentacji.</p></div>}
        </section>
      </div>
      <dialog ref={modal} className="poprawiacz-prezentacji__modal" aria-labelledby="poprawiacz-potwierdzenie" onCancel={() => ustawCzyPotwierdzenie(false)}>
        <h2 id="poprawiacz-potwierdzenie">Potwierdź poprawki</h2>
        <p>Zmodyfikowanych zostanie {numerySlajdow.length} slajdów. Oryginalny plik na dysku nie zostanie nadpisany.</p>
        <div className="poprawiacz-prezentacji__akcje"><button type="button" autoFocus onClick={() => ustawCzyPotwierdzenie(false)}>Anuluj</button><button type="button" onClick={popraw}>Zastosuj poprawki</button></div>
      </dialog>
    </section>
  )
}
