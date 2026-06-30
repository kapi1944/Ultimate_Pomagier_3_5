import type { WersjaRoboczaGeneratora } from '../typy'

type WlasciwosciPaneluPodgladu = {
  podgladSzczegolow: string
  rozpoznaneObszary: string[]
  kopieRobocze: WersjaRoboczaGeneratora[]
  wczytajWersje: (wersja: WersjaRoboczaGeneratora) => void
}

export default function PanelPodgladuSzczegolow({ podgladSzczegolow, rozpoznaneObszary, kopieRobocze, wczytajWersje }: WlasciwosciPaneluPodgladu) {
  return (
    <section className="szczegoly-panel">
      <h2>Podgląd</h2>
      <div className="szczegoly-rozpoznane">
        {rozpoznaneObszary.length ? (
          rozpoznaneObszary.map((obszar) => <span key={obszar}>{obszar}</span>)
        ) : (
          <span>Brak importu</span>
        )}
      </div>
      <pre className="szczegoly-podglad">{podgladSzczegolow}</pre>

      <h3>Kopie robocze</h3>
      <div className="szczegoly-kopie">
        {kopieRobocze.map((wersja) => (
          <button key={wersja.id} type="button" onClick={() => wczytajWersje(wersja)}>
            {wersja.nazwa}
          </button>
        ))}
      </div>
    </section>
  )
}
