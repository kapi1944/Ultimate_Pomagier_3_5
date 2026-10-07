import type { OperacjaPrezentacji, WynikAnalizyPrezentacji } from '../modele/modelPrezentacji'

type WlasciwosciPanelu = {
  analiza: WynikAnalizyPrezentacji
  operacje: OperacjaPrezentacji[]
  ustawOperacje: (operacje: OperacjaPrezentacji[]) => void
  czyZajety: boolean
  otworzSlajd: (numer: number) => void
  potwierdzPoprawki: () => void
}

export default function PanelAnalizy({ analiza, operacje, ustawOperacje, czyZajety, otworzSlajd, potwierdzPoprawki }: WlasciwosciPanelu) {
  const wybrane = operacje.filter((operacja) => operacja.czyWybrana).map((operacja) => operacja.id)
  const trafienia = analiza.problemy.filter((problem) => wybrane.includes(problem.typ))
  const numerySlajdow = [...new Set(trafienia.map((problem) => problem.numerSlajdu))]
  return (
    <>
      <section className="narzedzia__panel" aria-labelledby="poprawiacz-operacje">
        <h2 id="poprawiacz-operacje">SEMPER – oczyszczenie prezentacji trenera</h2>
        <p>Znaleziono: górne paski: {analiza.problemy.filter((problem) => problem.typ === 'GÓRNY_PASEK').length}; numery w prawym dolnym rogu: {analiza.problemy.filter((problem) => problem.typ === 'NUMERACJA').length}.</p>
        {operacje.map((operacja) => <div key={operacja.id}>
          <label className="poprawiacz-prezentacji__wybor"><input type="checkbox" checked={operacja.czyWybrana} disabled={czyZajety}
            onChange={(zdarzenie) => ustawOperacje(operacje.map((pozycja) => pozycja.id === operacja.id ? { ...pozycja, czyWybrana: zdarzenie.target.checked } : pozycja))} />{operacja.nazwa}</label>
          <ul className="poprawiacz-prezentacji__trafienia">
            {analiza.problemy.filter((problem) => problem.typ === operacja.id).slice(0, 5).map((problem) =>
              <li key={problem.id}><button type="button" onClick={() => otworzSlajd(problem.numerSlajdu)}>Slajd {problem.numerSlajdu}: {problem.opis}</button></li>)}
          </ul>
        </div>)}
        <div className="poprawiacz-prezentacji__akcje">
          <button type="button" disabled={czyZajety} onClick={() => ustawOperacje(operacje.map((operacja) => ({ ...operacja, czyWybrana: true })))}>Zaznacz wszystkie</button>
          <button type="button" disabled={czyZajety} onClick={() => ustawOperacje(operacje.map((operacja) => ({ ...operacja, czyWybrana: false })))}>Odznacz wszystkie</button>
        </div>
        <p>Zmodyfikowanych zostanie {numerySlajdow.length} slajdów.</p>
        <p className="poprawiacz-prezentacji__numery">Slajdy: {numerySlajdow.join(', ') || 'brak'}</p>
        <button type="button" disabled={czyZajety || !trafienia.length} onClick={potwierdzPoprawki}>Zastosuj poprawki</button>
      </section>
      <section className="narzedzia__panel" aria-labelledby="poprawiacz-analiza">
        <h2 id="poprawiacz-analiza">Wyniki analizy</h2>
        <p>Slajdy: {analiza.liczbaSlajdow}. Powtarzalne elementy slajdowe:</p>
        <ul className="poprawiacz-prezentacji__lista">
          {analiza.powtarzalne.map((grupa, indeks) => <li key={indeks}>{grupa.liczba} × {grupa.opis}</li>)}
        </ul>
        {!analiza.powtarzalne.length && <p>Brak powtarzalnych grup na różnych slajdach.</p>}
        <details><summary>Wszystkie wykryte problemy ({analiza.problemy.length})</summary>
          <ul className="poprawiacz-prezentacji__lista">{analiza.problemy.map((problem) => <li key={problem.id}>
            <button type="button" onClick={() => otworzSlajd(problem.numerSlajdu)}>Slajd {problem.numerSlajdu}: {problem.opis}</button>
          </li>)}</ul>
        </details>
      </section>
    </>
  )
}
