import { useMemo, useState } from 'react'
import type { OpublikowaneSzczegolyOrganizacyjne, StatusOpublikowanychSzczegolow } from '../typy'
import {
  czyKontoMozeCofnacStatus,
  czyKontoMozeZaakceptowacSzczegoly,
  czyKontoArchitekta,
  pobierzAktywneKontoSzczegolow,
  pobierzKolorTlaOpiekuna,
  pobierzNazweOpiekuna,
} from '../uzytkownicySzczegolow'
import {
  pobierzOpublikowaneSzczegoly,
  ustawStatusSzkoleniaOpublikowanychSzczegolow,
  ustawStatusOpublikowanychSzczegolow,
  utworzKopieRoboczaZOpublikowanychSzczegolow,
} from '../uslugi/magazynWersjiRoboczych'
import { statusySzkolenia } from '../stale'
import { czyMoznaUtworzycAktualizacje } from '../workflowStatusow'
import './widokNowychSzczegolowOrganizacyjnych.css'

const statusyOpublikowane: StatusOpublikowanychSzczegolow[] = [
  'OCZEKUJĄCE',
  'ZAAKCEPTOWANE',
  'GOTOWE',
]

type WlasciwosciWidokuListy = {
  otworzNoweSzczegoly: () => void
}

function formatujDate(data: string) {
  return new Date(data).toLocaleString('pl-PL')
}

function czyStatusOpublikowany(status: string): status is StatusOpublikowanychSzczegolow {
  return statusyOpublikowane.includes(status as StatusOpublikowanychSzczegolow)
}

export default function WidokListySzczegolowOrganizacyjnych({ otworzNoweSzczegoly }: WlasciwosciWidokuListy) {
  const konto = useMemo(() => pobierzAktywneKontoSzczegolow(), [])
  const [rekordy, ustawRekordy] = useState(() => pobierzOpublikowaneSzczegoly())
  const rekordyOpublikowane = rekordy.filter((rekord) => czyStatusOpublikowany(rekord.status))

  function zaakceptujSzczegoly(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    if (rekord.status !== 'OCZEKUJĄCE' || !czyKontoMozeZaakceptowacSzczegoly(konto, rekord)) {
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
    if (!czyKontoMozeCofnacStatus(konto, rekord) || rekord.status === 'OCZEKUJĄCE') {
      return
    }

    const komentarz = window.prompt('Podaj komentarz cofnięcia statusu:')

    if (!komentarz?.trim()) {
      return
    }

    const poprzedniStatus = rekord.status === 'GOTOWE' ? 'ZAAKCEPTOWANE' : 'OCZEKUJĄCE'
    ustawRekordy(ustawStatusOpublikowanychSzczegolow(rekord.id, poprzedniStatus, { konto, komentarz: komentarz.trim() }))
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
    <section className="widok szczegoly-organizacyjne">
      <header className="szczegoly-widok-naglowek">
        <h1>Lista szczegółów organizacyjnych</h1>
      </header>

      <div className="szczegoly-lista-rekordow">
        {rekordyOpublikowane.length === 0 && <p className="szczegoly-komunikat">Brak opublikowanych szczegółów organizacyjnych.</p>}
        {rekordyOpublikowane.map((rekord) => (
          <article className="szczegoly-rekord" key={rekord.id} style={{ backgroundColor: pobierzKolorTlaOpiekuna(rekord.opiekunId) }}>
            <div className="szczegoly-rekord__naglowek">
              <div>
                <h2>{rekord.dane.tytulSzkolenia || rekord.nazwa}</h2>
                <p>{rekord.dane.nazwaKlienta || 'Bez klienta'}</p>
              </div>
              <strong>{rekord.status}</strong>
            </div>
            <div className="szczegoly-rekord__metadane">
              <span>Opiekun: {pobierzNazweOpiekuna(rekord.opiekunId)}</span>
              <span>Autor: {rekord.autorNazwa}</span>
              <span>Publikacja: {formatujDate(rekord.dataPublikacji)}</span>
              <span>Status szkolenia: {rekord.statusSzkolenia ?? rekord.dane.statusSzkolenia}</span>
            </div>
            <div className="szczegoly-rekord__akcje">
              {rekord.status === 'OCZEKUJĄCE' && czyKontoMozeZaakceptowacSzczegoly(konto, rekord) && (
                <button type="button" onClick={() => zaakceptujSzczegoly(rekord)}>
                  Oznacz jako zaakceptowane
                </button>
              )}
              {rekord.status === 'ZAAKCEPTOWANE' && czyKontoMozeZaakceptowacSzczegoly(konto, rekord) && (
                <button type="button" onClick={() => oznaczJakoGotowe(rekord)}>
                  Oznacz jako gotowe
                </button>
              )}
              {rekord.status !== 'OCZEKUJĄCE' && czyKontoMozeCofnacStatus(konto, rekord) && (
                <button type="button" onClick={() => cofnijStatus(rekord)}>
                  Cofnij status
                </button>
              )}
              <label className="szczegoly-rekord__status-szkolenia">
                Status szkolenia
                <select value={rekord.statusSzkolenia ?? rekord.dane.statusSzkolenia} onChange={(zdarzenie) => ustawStatusSzkolenia(rekord, zdarzenie.target.value)}>
                  {statusySzkolenia.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              {czyMoznaUtworzycAktualizacje(rekord.status) && (
                <button type="button" onClick={() => utworzAktualizacje(rekord)}>
                  {rekord.opiekunId === konto.id || czyKontoArchitekta(konto) ? 'Utwórz aktualizację' : 'Utwórz formularz bez grup'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
