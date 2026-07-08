import { useMemo, useState } from 'react'
import type { OpublikowaneSzczegolyOrganizacyjne, StatusOpublikowanychSzczegolow } from '../typy'
import {
  czyKontoMozeZaakceptowacSzczegoly,
  pobierzAktywneKontoSzczegolow,
  pobierzKolorTlaOpiekuna,
  pobierzNazweOpiekuna,
} from '../uzytkownicySzczegolow'
import {
  pobierzOpublikowaneSzczegoly,
  ustawStatusOpublikowanychSzczegolow,
  utworzKopieRoboczaZOpublikowanychSzczegolow,
} from '../uslugi/magazynWersjiRoboczych'
import './widokNowychSzczegolowOrganizacyjnych.css'

const statusyOpublikowane: StatusOpublikowanychSzczegolow[] = [
  'OCZEKUJĄCE',
  'ZAAKCEPTOWANE',
  'GOTOWE',
  'ZREALIZOWANE',
  'NIEZREALIZOWANE',
  'ROZLICZONE',
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

    ustawRekordy(ustawStatusOpublikowanychSzczegolow(rekord.id, 'ZAAKCEPTOWANE'))
  }

  function utworzAktualizacje(rekord: OpublikowaneSzczegolyOrganizacyjne) {
    utworzKopieRoboczaZOpublikowanychSzczegolow(rekord, konto)
    otworzNoweSzczegoly()
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
            </div>
            <div className="szczegoly-rekord__akcje">
              {rekord.status === 'OCZEKUJĄCE' && czyKontoMozeZaakceptowacSzczegoly(konto, rekord) && (
                <button type="button" onClick={() => zaakceptujSzczegoly(rekord)}>
                  Oznacz jako zaakceptowane
                </button>
              )}
              <button type="button" onClick={() => utworzAktualizacje(rekord)}>
                Utwórz aktualizację
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}