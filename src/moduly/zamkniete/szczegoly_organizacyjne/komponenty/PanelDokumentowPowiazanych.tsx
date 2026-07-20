import { pobierzListyObecnosciPowiazane } from '../../../dokumenty/generatory/listy_obecnosci/rejestrListObecnosci'
import { pobierzChecklistyPowiazane } from '../../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'

type WlasciwosciPaneluDokumentowPowiazanych = {
  szczegolyOrganizacyjneId: string | null
  odswiezacz: number
  otworzDokument: (id: string) => void
  otworzCheckliste: (id: string) => void
}

export default function PanelDokumentowPowiazanych({ szczegolyOrganizacyjneId, otworzDokument, otworzCheckliste }: WlasciwosciPaneluDokumentowPowiazanych) {
  const listyObecnosci = szczegolyOrganizacyjneId ? pobierzListyObecnosciPowiazane(szczegolyOrganizacyjneId) : []
  const checklisty = szczegolyOrganizacyjneId ? pobierzChecklistyPowiazane(szczegolyOrganizacyjneId) : []

  return (
    <details className="szczegoly-sekcja-dokumentow">
      <summary>Dokumenty powiązane ({listyObecnosci.length + checklisty.length})</summary>
      {!szczegolyOrganizacyjneId && <p>Zapisz wersję Szczegółów, aby wyświetlić powiązane dokumenty.</p>}
      {szczegolyOrganizacyjneId && !listyObecnosci.length && !checklisty.length && <p>Brak dokumentów powiązanych.</p>}
      {listyObecnosci.map((dokument) => (
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
      {checklisty.map((dokument) => (
        <article key={dokument.id} className="szczegoly-sekcja-dokumentow__grupa">
          <strong>{dokument.tytul}</strong>
          <span>Typ: Checklista paczki</span>
          <span>Grupa: {dokument.daneDokumentu.grupaId ?? 'brak'}</span>
          <span>Status: {dokument.daneDokumentu.statusChecklisty}</span>
          <span>Skan: {dokument.daneDokumentu.zalaczniki.some((zalacznik) => zalacznik.typ === 'SKAN_PODPISANEJ_CHECKLISTY') ? 'dołączony' : 'brak'}</span>
          <button type="button" onClick={() => otworzCheckliste(dokument.id)}>Otwórz</button>
        </article>
      ))}
    </details>
  )
}
