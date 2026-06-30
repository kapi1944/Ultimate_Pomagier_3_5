type WlasciwosciPaneluImportuEksportu = {
  trescMaila: string
  komunikat: string
  ustawTrescMaila: (wartosc: string) => void
  obsluzImportMaila: () => void
  importujJson: (zawartosc: string) => void
  eksportujJson: () => void
  eksportujDoc: () => void
  drukujPdf: () => void
  pokazKomunikatImportuDokumentow: () => void
}

export default function PanelImportuEksportu({
  trescMaila,
  komunikat,
  ustawTrescMaila,
  obsluzImportMaila,
  importujJson,
  eksportujJson,
  eksportujDoc,
  drukujPdf,
  pokazKomunikatImportuDokumentow,
}: WlasciwosciPaneluImportuEksportu) {
  function obsluzPlik(plik: File | undefined) {
    if (!plik) {
      return
    }

    if (/\.(pdf|docx?)$/i.test(plik.name)) {
      pokazKomunikatImportuDokumentow()
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => {
      const zawartosc = String(czytnik.result ?? '')

      if (/\.json$/i.test(plik.name)) {
        importujJson(zawartosc)
        return
      }

      ustawTrescMaila(zawartosc)
    }
    czytnik.readAsText(plik)
  }

  return (
    <section className="szczegoly-panel">
      <h2>Import i eksport</h2>
      <label className="szczegoly-pole">
        <span className="szczegoly-pole__naglowek">Import z maila</span>
        <textarea value={trescMaila} onChange={(zdarzenie) => ustawTrescMaila(zdarzenie.target.value)} />
      </label>
      <div className="szczegoly-akcje szczegoly-akcje--pelne">
        <button type="button" onClick={obsluzImportMaila}>
          Importuj maila
        </button>
        <label className="szczegoly-przycisk-pliku">
          Import TXT/JSON
          <input accept=".txt,.json,.doc,.docx,.pdf,text/plain,application/json" type="file" onChange={(zdarzenie) => obsluzPlik(zdarzenie.target.files?.[0])} />
        </label>
      </div>
      <div className="szczegoly-akcje szczegoly-akcje--pelne">
        <button type="button" onClick={eksportujDoc}>
          Eksport szczegółów
        </button>
        <button type="button" onClick={eksportujJson}>
          Eksport JSON
        </button>
        <button type="button" onClick={drukujPdf}>
          Drukuj/PDF
        </button>
      </div>
      <p className="szczegoly-komunikat">{komunikat}</p>
    </section>
  )
}
