import { useMemo, useState } from 'react'
import type { WersjaRoboczaGeneratora } from '../typy'
import {
  czyKontoMozeEdytowacKopie,
  czyKontoMozeWidziecKopie,
  pobierzAktywneKontoSzczegolow,
  pobierzKolorTlaOpiekuna,
  pobierzNazweOpiekuna,
} from '../uzytkownicySzczegolow'
import { pobierzAktualnaWersjeRobocza, pobierzKopieRobocze, ustawAktualnaWersjeRobocza } from '../uslugi/magazynWersjiRoboczych'
import './widokNowychSzczegolowOrganizacyjnych.css'

type WlasciwosciWidokuKopii = {
  otworzNoweSzczegoly: () => void
}

function formatujDate(data: string) {
  return new Date(data).toLocaleString('pl-PL')
}

export default function WidokKopiiRoboczychSzczegolowOrganizacyjnych({ otworzNoweSzczegoly }: WlasciwosciWidokuKopii) {
  const konto = useMemo(() => pobierzAktywneKontoSzczegolow(), [])
  const [kopie] = useState(() => pobierzKopieRobocze())
  const aktualnaKopia = pobierzAktualnaWersjeRobocza()
  const widoczneKopie = kopie.filter((kopia) => kopia.id === aktualnaKopia?.id || czyKontoMozeWidziecKopie(konto, kopia))

  function edytujKopie(kopia: WersjaRoboczaGeneratora) {
    if (!czyKontoMozeEdytowacKopie(konto, kopia)) {
      return
    }

    ustawAktualnaWersjeRobocza(kopia)
    otworzNoweSzczegoly()
  }

  return (
    <section className="widok szczegoly-organizacyjne">
      <header className="szczegoly-widok-naglowek">
        <h1>Kopie robocze szczegółów organizacyjnych</h1>
      </header>

      <div className="szczegoly-lista-rekordow">
        {widoczneKopie.length === 0 && <p className="szczegoly-komunikat">Brak dostępnych kopii roboczych.</p>}
        {widoczneKopie.map((kopia) => (
          <article className="szczegoly-rekord" key={kopia.id} style={{ backgroundColor: pobierzKolorTlaOpiekuna(kopia.dane.opiekunId) }}>
            <div className="szczegoly-rekord__naglowek">
              <div>
                <h2>{kopia.dane.tytulSzkolenia || kopia.nazwa}</h2>
                <p>{kopia.dane.nazwaKlienta || 'Bez klienta'}</p>
              </div>
              <strong>{kopia.dane.status}</strong>
            </div>
            <div className="szczegoly-rekord__metadane">
              <span>Opiekun: {pobierzNazweOpiekuna(kopia.dane.opiekunId)}</span>
              <span>Autor: {kopia.autorNazwa}</span>
              <span>Zapis: {formatujDate(kopia.dataZapisu)}</span>
            </div>
            <div className="szczegoly-rekord__akcje">
              {czyKontoMozeEdytowacKopie(konto, kopia) && (
                <button type="button" onClick={() => edytujKopie(kopia)}>
                  Edytuj
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}