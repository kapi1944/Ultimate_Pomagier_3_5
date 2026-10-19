import { useMemo, useState } from 'react'
import type { WersjaRoboczaGeneratora } from '../typy'
import { AkcjeRekordu } from '../../../../wspolne/komponenty/AkcjeRekordu'
import {
  czyKontoMozeEdytowacKopie,
  czyKontoMozeWidziecKopie,
  pobierzAktywneKontoSzczegolow,
} from '../uzytkownicySzczegolow'
import { duplikujKopieRobocza, pobierzOpublikowaneSzczegoly, pobierzAktualnaWersjeRobocza, pobierzKopieRobocze, ustawAktualnaWersjeRobocza, usunKopieRobocza } from '../uslugi/magazynWersjiRoboczych'
import { Komunikat, Przycisk, PustyStan } from '../../../../wspolne/komponenty/ElementyInterfejsu'
import IkonaMenu from '../../../../aplikacja/menu/IkonaMenu'
import { KartaRejestruSzczegolow } from '../komponenty/KartaRejestruSzczegolow'
import './rejestrySzczegolowV4.css'

type WlasciwosciWidokuKopii = {
  otworzNoweSzczegoly: () => void
}

export default function WidokKopiiRoboczychSzczegolowOrganizacyjnych({ otworzNoweSzczegoly }: WlasciwosciWidokuKopii) {
  const konto = useMemo(() => pobierzAktywneKontoSzczegolow(), [])
  const [kopie, ustawKopie] = useState(() => pobierzKopieRobocze())
  const [podgladKopiiId, ustawPodgladKopiiId] = useState<string | null>(null)
  const opublikowane = useMemo(() => pobierzOpublikowaneSzczegoly(), [])
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
    <section className="widok rejestr-szczegolow" aria-labelledby="kopie-szczegolow-tytul">
      <div className="szczegoly-obszar-roboczy">
        <header className="rejestr-szczegolow__naglowek">
          <span className="rejestr-szczegolow__ikona"><IkonaMenu typ="kopie" /></span>
          <div>
            <h1 id="kopie-szczegolow-tytul">Kopie robocze szczegółów organizacyjnych</h1>
            <p>Zapisane szkice i rozpoczęte aktualizacje. Wznowienie edycji zachowuje zapisane dane oraz powiązania dokumentu.</p>
          </div>
          <Przycisk onClick={otworzNoweSzczegoly}>Otwórz formularz szczegółów</Przycisk>
        </header>

        <div className="rejestr-szczegolow__lista">
          {widoczneKopie.length === 0 && <PustyStan>Brak dostępnych kopii roboczych. Opublikowane dokumenty znajdziesz na liście szczegółów organizacyjnych.</PustyStan>}
          {widoczneKopie.map((kopia) => (
            <KartaRejestruSzczegolow
              key={kopia.id} rodzaj="kopia" rekord={kopia} czyPodglad={podgladKopiiId === kopia.id}
              aktualnaWersjaOpublikowana={opublikowane.find((rekord) => rekord.id === kopia.zrodloOpublikowanegoId)?.numerWersji}
            >
              <AkcjeRekordu
                podglad={() => ustawPodgladKopiiId((obecny) => obecny === kopia.id ? null : kopia.id)}
                edytuj={czyKontoMozeEdytowacKopie(konto, kopia) ? () => edytujKopie(kopia) : undefined}
                duplikuj={czyKontoMozeEdytowacKopie(konto, kopia) ? () => duplikujKopie(kopia) : undefined}
                usun={czyKontoMozeEdytowacKopie(konto, kopia) ? () => usunKopie(kopia) : undefined}
              />
              {!czyKontoMozeEdytowacKopie(konto, kopia) && <Komunikat>Kopia tylko do odczytu. Zmiany może wprowadzać jej opiekun lub administrator.</Komunikat>}
            </KartaRejestruSzczegolow>
          ))}
        </div>
      </div>
    </section>
  )
}
