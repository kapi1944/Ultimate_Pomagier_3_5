import { pobierzListyObecnosciPowiazane } from '../../../dokumenty/generatory/listy_obecnosci/rejestrListObecnosci'

type WlasciwosciPaneluDokumentowPowiazanych = {
  szczegolyOrganizacyjneId: string | null
  odswiezacz: number
  otworzDokument: (id: string) => void
}

export default function PanelDokumentowPowiazanych({ szczegolyOrganizacyjneId, otworzDokument }: WlasciwosciPaneluDokumentowPowiazanych) {
  const dokumenty = szczegolyOrganizacyjneId ? pobierzListyObecnosciPowiazane(szczegolyOrganizacyjneId) : []

  return (
    <details className="szczegoly-sekcja-dokumentow">
      <summary>Dokumenty powiązane ({dokumenty.length})</summary>
      {!szczegolyOrganizacyjneId && <p>Zapisz wersję Szczegółów, aby wyświetlić powiązane dokumenty.</p>}
      {szczegolyOrganizacyjneId && !dokumenty.length && <p>Brak dokumentów powiązanych.</p>}
      {dokumenty.map((dokument) => (
        <article key={dokument.id} className="szczegoly-sekcja-dokumentow__grupa">
          <strong>{dokument.tytul}</strong>
          <span>Typ: Lista obecności</span>
          <span>Grupa: {dokument.daneDokumentu.daneZrodlowe.nazwaGrupy}</span>
          <span>Status: {dokument.statusBiznesowy ?? dokument.stanCyklu}</span>
          <span>Wersja: {dokument.metadaneGeneratora.wersja}</span>
          <span>Zmodyfikowano: {new Date(dokument.zaktualizowano).toLocaleString('pl-PL')}</span>
          <button type="button" onClick={() => otworzDokument(dokument.id)}>Otwórz</button>
        </article>
      ))}
    </details>
  )
}
