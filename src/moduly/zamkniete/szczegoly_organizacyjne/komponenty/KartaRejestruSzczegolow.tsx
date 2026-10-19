import type { ReactNode } from 'react'
import { Komunikat, OdznakaStatusu } from '../../../../wspolne/komponenty/ElementyInterfejsu'
import type { OpublikowaneSzczegolyOrganizacyjne, WersjaRoboczaGeneratora } from '../typy'
import { pobierzKolorTlaOpiekuna, pobierzNazweOpiekuna } from '../uzytkownicySzczegolow'
import { formatujDateRejestru, oznaczeniaStatusowSzczegolow, oznaczeniaStatusowSzkolenia } from '../prezentacjaRejestruSzczegolow'

type WlasciwosciKarty = {
  children: ReactNode
  czyPodglad: boolean
} & (
  | { rodzaj: 'opublikowany'; rekord: OpublikowaneSzczegolyOrganizacyjne }
  | { rodzaj: 'kopia'; rekord: WersjaRoboczaGeneratora; aktualnaWersjaOpublikowana?: number }
)

export function KartaRejestruSzczegolow(wlasciwosci: WlasciwosciKarty) {
  const { rekord, czyPodglad, children } = wlasciwosci
  const dane = rekord.dane
  const czyOpublikowany = wlasciwosci.rodzaj === 'opublikowany'
  const opiekunId = czyOpublikowany ? wlasciwosci.rekord.opiekunId : dane.opiekunId
  const statusSzczegolow = czyOpublikowany ? wlasciwosci.rekord.status : dane.status
  const oznaczenie = oznaczeniaStatusowSzczegolow[statusSzczegolow] ?? { etykieta: statusSzczegolow || 'Brak statusu', status: 'warning' }
  const statusSzkolenia = czyOpublikowany ? wlasciwosci.rekord.statusSzkolenia ?? dane.statusSzkolenia : dane.statusSzkolenia
  const liczbaTrenerow = new Set(rekord.grupy.flatMap((grupa) => grupa.trenerzy).filter((trener) => trener.imieNazwisko).map((trener) => trener.id || trener.imieNazwisko.trim())).size
  const czyHistorycznaBaza = wlasciwosci.rodzaj === 'kopia' && wlasciwosci.rekord.bazowaWersjaOpublikowana !== undefined && wlasciwosci.aktualnaWersjaOpublikowana !== undefined && wlasciwosci.rekord.bazowaWersjaOpublikowana < wlasciwosci.aktualnaWersjaOpublikowana
  const czyDaneDoWeryfikacji = Object.values(rekord.statusyPol).some((status) => status === 'brak' || status === 'niepewne')

  return (
    <article className="ui-karta rejestr-szczegolow__karta" data-status={oznaczenie.status} style={{ borderInlineStartColor: pobierzKolorTlaOpiekuna(opiekunId) }}>
      <header className="rejestr-szczegolow__naglowek-karty">
        <div>
          <h2>{dane.tytulSzkolenia || rekord.nazwa || 'Bez tytułu'}</h2>
          <p className="rejestr-szczegolow__klient">{dane.nazwaKlienta || 'Bez klienta'}</p>
        </div>
        <div className="rejestr-szczegolow__statusy">
          <OdznakaStatusu status={czyOpublikowany ? 'info' : 'draft'}>{czyOpublikowany ? 'Dokument opublikowany' : 'Szkic'}</OdznakaStatusu>
          <OdznakaStatusu status={oznaczenie.status}>Szczegóły: {oznaczenie.etykieta}</OdznakaStatusu>
          <OdznakaStatusu status={oznaczeniaStatusowSzkolenia[statusSzkolenia]}>Szkolenie: {statusSzkolenia}</OdznakaStatusu>
          {czyDaneDoWeryfikacji && <OdznakaStatusu status="warning">Dane do weryfikacji</OdznakaStatusu>}
        </div>
      </header>
      <dl className="rejestr-szczegolow__metadane">
        <div><dt>Organizator</dt><dd>{dane.organizator || 'Bez organizatora'}</dd></div>
        <div><dt>Opiekun</dt><dd>{pobierzNazweOpiekuna(opiekunId)}</dd></div>
        <div><dt>Autor</dt><dd>{rekord.autorNazwa || 'Nieznany autor'}</dd></div>
        <div><dt>{czyOpublikowany ? 'Publikacja' : 'Zapis kopii'}</dt><dd>{formatujDateRejestru(czyOpublikowany ? wlasciwosci.rekord.dataPublikacji : wlasciwosci.rekord.dataZapisu)}</dd></div>
        <div><dt>Grupy</dt><dd>{rekord.grupy.length}</dd></div>
        <div><dt>Liczba trenerów</dt><dd>{liczbaTrenerow}</dd></div>
        {wlasciwosci.rodzaj === 'opublikowany' ? <div><dt>Wersja opublikowana</dt><dd>{wlasciwosci.rekord.numerWersji}</dd></div> : <>
          <div><dt>Wersja robocza</dt><dd>{wlasciwosci.rekord.etykietaWersji || 'Bez oznaczenia'}</dd></div>
          {wlasciwosci.rekord.bazowaWersjaOpublikowana !== undefined && <div><dt>Bazowa wersja opublikowana</dt><dd>{wlasciwosci.rekord.bazowaWersjaOpublikowana}{czyHistorycznaBaza ? ' — historyczna' : ''}</dd></div>}
          <div className="rejestr-szczegolow__pelna-szerokosc"><dt>Nazwa kopii</dt><dd>{rekord.nazwa || 'Bez nazwy'}</dd></div>
        </>}
        <div className="rejestr-szczegolow__pelna-szerokosc"><dt>Trenerzy według grup</dt><dd>{rekord.grupy.length ? <ul>{rekord.grupy.map((grupa) => <li key={grupa.id}>{grupa.nazwa}: {grupa.trenerzy.map((trener) => trener.imieNazwisko).filter(Boolean).join(', ') || 'Bez trenera'}</li>)}</ul> : 'Brak grup'}</dd></div>
      </dl>
      {czyHistorycznaBaza && <Komunikat status="warning">Szkic opiera się na historycznej wersji opublikowanej. Aktualna wersja dokumentu: {wlasciwosci.aktualnaWersjaOpublikowana}. Sprawdź podstawę aktualizacji przed publikacją.</Komunikat>}
      <div className="rejestr-szczegolow__akcje">{children}</div>
      {czyPodglad && <Komunikat>Podgląd: {dane.tytulSzkolenia || rekord.nazwa} · {rekord.grupy.length} grup. {czyOpublikowany ? 'Dokument opublikowany.' : 'Kopia robocza — zapisane wartości pozostają niezmienione.'}</Komunikat>}
    </article>
  )
}
