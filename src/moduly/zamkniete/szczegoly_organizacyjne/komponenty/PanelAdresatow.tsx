import { grupyAdresatow } from '../stale'
import type { DaneAdresatow } from '../typy'

type WlasciwosciPaneluAdresatow = {
  adresaci: DaneAdresatow
  wszyscyAdresaci: string[]
  ustawAdresaci: (aktualizacja: (adresaci: DaneAdresatow) => DaneAdresatow) => void
  utworzLinkMailto: () => string
}

export default function PanelAdresatow({ adresaci, wszyscyAdresaci, ustawAdresaci, utworzLinkMailto }: WlasciwosciPaneluAdresatow) {
  const wynikiWyszukiwania = wszyscyAdresaci.filter((adres) => adres.toLowerCase().includes(adresaci.wyszukiwarka.toLowerCase()))

  function przelaczGrupe(id: string, czyZaznaczona: boolean) {
    ustawAdresaci((obecne) => ({
      ...obecne,
      wybraneGrupy: czyZaznaczona ? [...obecne.wybraneGrupy, id] : obecne.wybraneGrupy.filter((grupa) => grupa !== id),
    }))
  }

  return (
    <section className="szczegoly-panel">
      <h2>Adresaci</h2>
      <label className="szczegoly-pole">
        <span className="szczegoly-pole__naglowek">Adresaci ręczni</span>
        <textarea value={adresaci.reczniAdresaci} onChange={(zdarzenie) => ustawAdresaci((obecne) => ({ ...obecne, reczniAdresaci: zdarzenie.target.value }))} />
      </label>
      <label className="szczegoly-pole">
        <span className="szczegoly-pole__naglowek">Wyszukiwarka adresatów</span>
        <input value={adresaci.wyszukiwarka} onChange={(zdarzenie) => ustawAdresaci((obecne) => ({ ...obecne, wyszukiwarka: zdarzenie.target.value }))} />
      </label>

      <div className="szczegoly-flagi">
        {grupyAdresatow.map((grupa) => (
          <label className="szczegoly-checkbox" key={grupa.id}>
            <input checked={adresaci.wybraneGrupy.includes(grupa.id)} type="checkbox" onChange={(zdarzenie) => przelaczGrupe(grupa.id, zdarzenie.target.checked)} />
            <span>{grupa.nazwa}</span>
          </label>
        ))}
      </div>

      <label className="szczegoly-pole">
        <span className="szczegoly-pole__naglowek">Tryb treści</span>
        <select value={adresaci.trybTresci} onChange={(zdarzenie) => ustawAdresaci((obecne) => ({ ...obecne, trybTresci: zdarzenie.target.value as DaneAdresatow['trybTresci'] }))}>
          <option value="cała treść">Cała treść</option>
          <option value="tylko zmiany">Tylko zmiany</option>
        </select>
      </label>

      <label className="szczegoly-checkbox">
        <input
          checked={adresaci.czyPodswietlacZmiany}
          type="checkbox"
          onChange={(zdarzenie) => ustawAdresaci((obecne) => ({ ...obecne, czyPodswietlacZmiany: zdarzenie.target.checked }))}
        />
        <span>Podświetl zmiany</span>
      </label>

      <div className="szczegoly-adresaci">
        <strong>{wszyscyAdresaci.length} adresatów</strong>
        {(adresaci.wyszukiwarka ? wynikiWyszukiwania : wszyscyAdresaci).map((adres) => (
          <span key={adres}>{adres}</span>
        ))}
      </div>

      <a className="szczegoly-przycisk-link" href={utworzLinkMailto()}>
        Wyślij maila
      </a>
    </section>
  )
}
