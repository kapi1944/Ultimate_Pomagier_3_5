import { useMemo, useState } from 'react'
import type { OpublikowaneSzczegolyOrganizacyjne } from '../typy'
import { AkcjeRekordu } from '../../../../wspolne/komponenty/AkcjeRekordu'
import {
  czyKontoMozeCofnacStatus,
  czyKontoMozeZaakceptowacSzczegoly,
  czyKontoArchitekta,
  pobierzAktywneKontoSzczegolow,
} from '../uzytkownicySzczegolow'
import {
  pobierzOpublikowaneSzczegoly,
  duplikujOpublikowaneSzczegoly,
  usunOpublikowaneSzczegoly,
  ustawStatusSzkoleniaOpublikowanychSzczegolow,
  ustawStatusOpublikowanychSzczegolow,
  utworzKopieRoboczaZOpublikowanychSzczegolow,
} from '../uslugi/magazynWersjiRoboczych'
import { statusySzkolenia } from '../stale'
import { czyMoznaUtworzycAktualizacje, pobierzPrzejscieCofnieciaStatusu } from '../workflowStatusow'
import { Komunikat, Przycisk, PustyStan } from '../../../../wspolne/komponenty/ElementyInterfejsu'
import IkonaMenu from '../../../../aplikacja/menu/IkonaMenu'
import { KartaRejestruSzczegolow } from '../komponenty/KartaRejestruSzczegolow'
import './rejestrySzczegolowV4.css'

type WlasciwosciWidokuListy = {
  otworzNoweSzczegoly: () => void
}

function czyStatusOczekujacy(status: string) {
  return status === 'OCZEKUJ' + String.fromCharCode(0x0104) + 'CE'
}
export default function WidokListySzczegolowOrganizacyjnych({ otworzNoweSzczegoly }: WlasciwosciWidokuListy) {
  const konto = useMemo(() => pobierzAktywneKontoSzczegolow(), [])
  const [rekordy, ustawRekordy] = useState(() => pobierzOpublikowaneSzczegoly())
  const [podgladRekorduId, ustawPodgladRekorduId] = useState<string | null>(null)

  function duplikujRekord(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    duplikujOpublikowaneSzczegoly(rekord, konto)
    otworzNoweSzczegoly()
  }

  function usunRekord(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    if (window.confirm('Usunac opublikowane Szczegoly organizacyjne?') && usunOpublikowaneSzczegoly(rekord.id)) {
      ustawRekordy(pobierzOpublikowaneSzczegoly())
    }
  }
  function zaakceptujSzczegoly(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    if (!czyStatusOczekujacy(rekord.status) || !czyKontoMozeZaakceptowacSzczegoly(konto, rekord)) {
      return
    }

    ustawRekordy(ustawStatusOpublikowanychSzczegolow(rekord.id, 'ZAAKCEPTOWANE', { konto, komentarz: 'Zaakceptowano szczegóły organizacyjne.' }))
  }

  function utworzAktualizacje(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    if (!czyMoznaUtworzycAktualizacje(rekord.status)) {
      return
    }

    const czyBezGrup = !czyKontoArchitekta(konto) && rekord.opiekunId !== konto.id
    utworzKopieRoboczaZOpublikowanychSzczegolow(rekord, konto, czyBezGrup)
    otworzNoweSzczegoly()
  }

  function oznaczJakoGotowe(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    if (rekord.status !== 'ZAAKCEPTOWANE' || !czyKontoMozeZaakceptowacSzczegoly(konto, rekord)) {
      return
    }

    ustawRekordy(ustawStatusOpublikowanychSzczegolow(rekord.id, 'GOTOWE', { konto, komentarz: 'Oznaczono szczegóły jako gotowe.' }))
  }

  function cofnijStatus(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    const przejscieCofniecia = pobierzPrzejscieCofnieciaStatusu(rekord.status)
    if (!czyKontoMozeCofnacStatus(konto, rekord) || !przejscieCofniecia) {
      return
    }

    const komentarz = window.prompt('Podaj komentarz cofnięcia statusu:')

    if (!komentarz?.trim()) {
      return
    }

    ustawRekordy(ustawStatusOpublikowanychSzczegolow(rekord.id, przejscieCofniecia.do, { konto, komentarz: komentarz.trim() }))
  }

  function ustawStatusSzkolenia(rekord: OpublikowaneSzczegolyOrganizacyjne, statusSzkolenia: string) {
    if (!statusySzkolenia.includes(statusSzkolenia as (typeof statusySzkolenia)[number])) {
      return
    }

    const komentarz =
      statusSzkolenia === 'NIEZREALIZOWANE'
        ? window.prompt('Podaj powód ustawienia statusu Niezrealizowane:')
        : `Zmieniono status szkolenia na ${statusSzkolenia}.`

    if (statusSzkolenia === 'NIEZREALIZOWANE' && !komentarz?.trim()) {
      return
    }

    ustawRekordy(ustawStatusSzkoleniaOpublikowanychSzczegolow(rekord.id, statusSzkolenia as (typeof statusySzkolenia)[number], konto, String(komentarz).trim()))
  }

  return (
    <section className="widok rejestr-szczegolow" aria-labelledby="lista-szczegolow-tytul">
      <div className="szczegoly-obszar-roboczy">
        <header className="rejestr-szczegolow__naglowek">
          <span className="rejestr-szczegolow__ikona"><IkonaMenu typ="szczegoly" /></span>
          <div>
            <h1 id="lista-szczegolow-tytul">Lista szczegółów organizacyjnych</h1>
            <p>Opublikowane dokumenty, ich wersje i bieżące statusy. Kopie robocze pozostają w osobnym rejestrze.</p>
          </div>
          <Przycisk onClick={otworzNoweSzczegoly}>Otwórz formularz szczegółów</Przycisk>
        </header>

        <div className="rejestr-szczegolow__lista">
          {rekordy.length === 0 && <PustyStan>Brak opublikowanych szczegółów organizacyjnych. Aby przygotować dokument, otwórz formularz szczegółów.</PustyStan>}
          {rekordy.map((rekord) => (
            <KartaRejestruSzczegolow key={rekord.id} rodzaj="opublikowany" rekord={rekord} czyPodglad={podgladRekorduId === rekord.id} zamknijPodglad={() => ustawPodgladRekorduId(null)}>
              <div className="rejestr-szczegolow__workflow">
                {czyStatusOczekujacy(rekord.status) && czyKontoMozeZaakceptowacSzczegoly(konto, rekord) && (
                  <Przycisk onClick={() => zaakceptujSzczegoly(rekord)}>Oznacz jako zaakceptowane</Przycisk>
                )}
                {rekord.status === 'ZAAKCEPTOWANE' && czyKontoMozeZaakceptowacSzczegoly(konto, rekord) && (
                  <Przycisk onClick={() => oznaczJakoGotowe(rekord)}>Oznacz jako gotowe</Przycisk>
                )}
                {pobierzPrzejscieCofnieciaStatusu(rekord.status) && czyKontoMozeCofnacStatus(konto, rekord) && (
                  <Przycisk onClick={() => cofnijStatus(rekord)}>Cofnij status</Przycisk>
                )}
                <label className="rejestr-szczegolow__status-szkolenia">
                  Status szkolenia
                  <select value={rekord.statusSzkolenia ?? rekord.dane.statusSzkolenia} onChange={(zdarzenie) => ustawStatusSzkolenia(rekord, zdarzenie.target.value)}>
                    {statusySzkolenia.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                {czyMoznaUtworzycAktualizacje(rekord.status) && (
                  <Przycisk onClick={() => utworzAktualizacje(rekord)}>
                    {rekord.opiekunId === konto.id || czyKontoArchitekta(konto) ? 'Utwórz aktualizację' : 'Utwórz formularz bez grup'}
                  </Przycisk>
                )}
              </div>
              <AkcjeRekordu
                podglad={() => ustawPodgladRekorduId((obecny) => obecny === rekord.id ? null : rekord.id)}
                edytuj={czyMoznaUtworzycAktualizacje(rekord.status) ? () => utworzAktualizacje(rekord) : undefined}
                duplikuj={() => duplikujRekord(rekord)}
                usun={() => usunRekord(rekord)}
              />
              {!czyMoznaUtworzycAktualizacje(rekord.status) && <Komunikat>Rozliczony dokument nie przyjmuje aktualizacji. Możesz otworzyć podgląd lub utworzyć osobną kopię.</Komunikat>}
            </KartaRejestruSzczegolow>
          ))}
        </div>
      </div>
    </section>
  )
}
