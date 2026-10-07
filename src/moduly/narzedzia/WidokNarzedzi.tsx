import IkonaMenu from '../../aplikacja/menu/IkonaMenu'
import './poprawiacz_prezentacji/poprawiaczPrezentacji.css'

export default function WidokNarzedzi({ otworzPoprawiacz }: { otworzPoprawiacz: () => void }) {
  return (
    <section className="narzedzia">
      <header className="narzedzia__naglowek">
        <h1>Narzędzia</h1>
        <p>Narzędzia operacyjne do pracy z istniejącymi plikami.</p>
      </header>
      <button className="narzedzia__kafel" type="button" onClick={otworzPoprawiacz}>
        <IkonaMenu typ="prezentacja" />
        <strong>Poprawiacz prezentacji</strong>
        <span>Przygotowanie prezentacji PowerPoint do standardów SEMPER.</span>
      </button>
    </section>
  )
}
