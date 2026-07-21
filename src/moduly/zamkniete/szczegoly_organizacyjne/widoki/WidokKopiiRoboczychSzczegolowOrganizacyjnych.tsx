import { useMemo, useState } from 'react'
import type { WersjaRoboczaGeneratora } from '../typy'
import { AkcjeRekordu } from '../../../../wspolne/komponenty/AkcjeRekordu'
import {
  czyKontoMozeEdytowacKopie,
  czyKontoMozeWidziecKopie,
  pobierzAktywneKontoSzczegolow,
  pobierzKolorTlaOpiekuna,
  pobierzNazweOpiekuna,
} from '../uzytkownicySzczegolow'
import { duplikujKopieRobocza, pobierzAktualnaWersjeRobocza, pobierzKopieRobocze, ustawAktualnaWersjeRobocza, usunKopieRobocza } from '../uslugi/magazynWersjiRoboczych'
import './widokNowychSzczegolowOrganizacyjnych.css'

type WlasciwosciWidokuKopii = {
  otworzNoweSzczegoly: () => void
}

function formatujDate(data: string) {
  return new Date(data).toLocaleString('pl-PL')
}

function pobierzTrenerow(grupy: { trenerzy: { imieNazwisko: string }[] }[]) {
  const trenerzy = grupy.flatMap((grupa) => grupa.trenerzy.map((trener) => trener.imieNazwisko).filter(Boolean))
  return trenerzy.length ? trenerzy.join(', ') : 'Bez trenera'
}

export default function WidokKopiiRoboczychSzczegolowOrganizacyjnych({ otworzNoweSzczegoly }: WlasciwosciWidokuKopii) {
  const konto = useMemo(() => pobierzAktywneKontoSzczegolow(), [])
  const [kopie, ustawKopie] = useState(() => pobierzKopieRobocze())
  const [podgladKopiiId, ustawPodgladKopiiId] = useState<string | null>(null)
  const aktualnaKopia = pobierzAktualnaWersjeRobocza()
  const widoczneKopie = kopie.filter((kopia) => kopia.id === aktualnaKopia?.id || czyKontoMozeWidziecKopie(konto, kopia))

  function duplikujKopie(kopia: WersjaRoboczaGeneratora) {
    if (!czyKontoMozeEdytowacKopie(konto, kopia)) return
    duplikujKopieRobocza(kopia, konto)
    ustawKopie(pobierzKopieRobocze())
  }
  function usunKopie(kopia: WersjaRoboczaGeneratora) {
    if (!czyKontoMozeEdytowacKopie(konto, kopia)) {
      return
    }

    usunKopieRobocza(kopia.id)
    ustawKopie((obecne) => obecne.filter((istniejaca) => istniejaca.id !== kopia.id))
  }

  function edytujKopie(kopia: WersjaRoboczaGeneratora) {
    if (!czyKontoMozeEdytowacKopie(konto, kopia)) {
      return
    }

    ustawAktualnaWersjeRobocza(kopia)
    otworzNoweSzczegoly()
  }

  return (
    <section className="widok szczegoly-organizacyjne">
      <div className="szczegoly-obszar-roboczy">
        <header className="szczegoly-widok-naglowek">
          <h1>Kopie robocze szczegĂłĹ‚Ăłw organizacyjnych</h1>
        </header>

        <div className="szczegoly-lista-rekordow">
          {widoczneKopie.length === 0 && <p className="szczegoly-komunikat">Brak dostÄ™pnych kopii roboczych.</p>}
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
                <span>Nazwa kopii: {kopia.nazwa}</span>
                <span>Opiekun: {pobierzNazweOpiekuna(kopia.dane.opiekunId)}</span>
                <span>Autor: {kopia.autorNazwa}</span>
                <span>Zapis: {formatujDate(kopia.dataZapisu)}</span>
                <span>Grupy: {kopia.grupy.length}</span>
                <span>Trenerzy: {pobierzTrenerow(kopia.grupy)}</span>
              </div>
              <div className="szczegoly-rekord__akcje">
                <AkcjeRekordu podglad={() => ustawPodgladKopiiId(kopia.id)} edytuj={() => edytujKopie(kopia)} duplikuj={() => duplikujKopie(kopia)} usun={() => usunKopie(kopia)} />
              </div>
            {podgladKopiiId === kopia.id && <p className="szczegoly-komunikat">Podglad: {kopia.dane.tytulSzkolenia || kopia.nazwa} · {kopia.grupy.length} grup.</p>}            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
