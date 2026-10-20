import { pobierzKonfiguracjeTypuDokumentu } from '../../../../wspolne/dokumenty/konfiguracjaDokumentow'
import type { Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { etykietyDokumentowZeSzczegolow, pobierzDokumentyPowiazaneZeSzczegolami, pobierzRodzajDokumentuZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import type { WersjaRoboczaGeneratora } from '../typy'

type WlasciwosciPaneluDokumentowPowiazanych = {
  szczegolyOrganizacyjneId: string | null
  wersja: WersjaRoboczaGeneratora | null
  odswiezacz: number
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
}

function pobierzTermin(wersja: WersjaRoboczaGeneratora | null, grupaId: string | null) {
  if (!wersja) return null
  const grupy = grupaId ? wersja.grupy.filter((grupa) => grupa.id === grupaId) : wersja.grupy
  const daty = [...new Set(grupy.flatMap((grupa) => [grupa.dataOd, grupa.dataDo]).filter(Boolean))]
  return daty.length ? daty.join(' – ') : null
}

export default function PanelDokumentowPowiazanych({ szczegolyOrganizacyjneId, wersja, odswiezacz, otworzDokument }: WlasciwosciPaneluDokumentowPowiazanych) {
  void odswiezacz
  const dokumenty = szczegolyOrganizacyjneId ? pobierzDokumentyPowiazaneZeSzczegolami(szczegolyOrganizacyjneId) : []

  return (
    <details className="szczegoly-sekcja-dokumentow">
      <summary>Dokumenty powiązane ({dokumenty.length})</summary>
      {!szczegolyOrganizacyjneId && <p>Zapisz Szczegóły organizacyjne, aby wyświetlić powiązane dokumenty.</p>}
      {szczegolyOrganizacyjneId && !dokumenty.length && <p>Brak dokumentów powiązanych.</p>}
      <div className="szczegoly-dokumenty-siatka">
        {dokumenty.map((dokument) => {
          const grupa = dokument.powiazania.grupaId ? wersja?.grupy.find((pozycja) => pozycja.id === dokument.powiazania.grupaId) : null
          const termin = pobierzTermin(wersja, dokument.powiazania.grupaId)
          const rodzaj = pobierzRodzajDokumentuZeSzczegolow(dokument.typ)
          const typ = rodzaj ? etykietyDokumentowZeSzczegolow[rodzaj] : pobierzKonfiguracjeTypuDokumentu(dokument.typ)?.etykieta ?? dokument.typ.replaceAll('_', ' ')
          const status = dokument.statusBiznesowy || dokument.status

          return (
            <article key={dokument.id} className="szczegoly-dokument-karta">
              <span className="szczegoly-dokument-karta__typ">{typ}</span>
              <strong>{dokument.tytul}</strong>
              <dl className="szczegoly-dokument-karta__metadane">
                {grupa?.nazwa && <div><dt>Grupa</dt><dd>{grupa.nazwa}</dd></div>}
                {termin && <div><dt>Termin</dt><dd>{termin}</dd></div>}
                {status && <div><dt>Status</dt><dd>{status}</dd></div>}
                <div><dt>Wersja</dt><dd>{dokument.wersja}</dd></div>
                <div><dt>Zmiana</dt><dd>{new Date(dokument.zmodyfikowano).toLocaleString('pl-PL')}</dd></div>
              </dl>
              <button type="button" onClick={() => otworzDokument(dokument)}>Otwórz</button>
            </article>
          )
        })}
      </div>
    </details>
  )
}
