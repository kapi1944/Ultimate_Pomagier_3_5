import './panelLogowania.css'

type WlasciwosciEkranuInicjalizacji = { etap: string }

export default function EkranInicjalizacji({ etap }: WlasciwosciEkranuInicjalizacji) {
  return <main className="ekran-inicjalizacji" aria-live="polite" aria-busy="true">
    <img className="ekran-inicjalizacji__logo" src="/logo-ultimate-pomagier-tabliczka.png" alt="Ultimate Pomagier" />
    <h1>Ultimate Pomagier 4.0</h1>
    <p className="ekran-inicjalizacji__etap">{etap}</p>
    <div className="ekran-inicjalizacji__animacja" aria-hidden="true"><span /><span /><span /></div>
    <div className="ekran-inicjalizacji__postep">
      <div className="ekran-inicjalizacji__opis"><span>Uruchamianie aplikacji</span></div>
      <div className="ekran-inicjalizacji__tor" role="progressbar" aria-label="Postęp inicjalizacji"><span /></div>
    </div>
  </main>
}
