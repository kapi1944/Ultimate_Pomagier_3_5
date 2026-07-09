import type { CSSProperties, ReactNode } from 'react'
import { usePrawyPanelGeneratora } from '../haki/usePrawyPanelGeneratora'
import './ukladGeneratoraDokumentu.css'

type WlasciwosciUkladuGeneratora = {
  nazwaKlasy?: string
  naglowek: ReactNode
  pasekAkcji?: ReactNode
  prawyPanel?: (stanPanelu: ReturnType<typeof usePrawyPanelGeneratora>) => ReactNode
  licznikProblemow?: number
  children: ReactNode
}

export default function UkladGeneratoraDokumentu({
  nazwaKlasy = '',
  naglowek,
  pasekAkcji,
  prawyPanel,
  licznikProblemow = 0,
  children,
}: WlasciwosciUkladuGeneratora) {
  const stanPanelu = usePrawyPanelGeneratora()
  const czyPokazacPanelPoNajechaniu = stanPanelu.czyNajechanyUchwyt && !stanPanelu.czyBlokadaWysuwania
  const czyPanelOtwarty = Boolean(prawyPanel) && (stanPanelu.czyPanelOtwarty || czyPokazacPanelPoNajechaniu)
  const czyPanelZajmujeMiejsce = Boolean(prawyPanel) && czyPanelOtwarty && stanPanelu.czyPrzypiety

  return (
    <section
      className={[
        'uklad-generatora-dokumentu',
        czyPanelOtwarty ? 'uklad-generatora-dokumentu--panel-otwarty' : '',
        czyPanelZajmujeMiejsce ? 'uklad-generatora-dokumentu--panel-przypiety' : '',
        nazwaKlasy,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--szerokosc-prawego-panelu': `${stanPanelu.szerokoscPanelu}px` } as CSSProperties}
    >
      <header className="uklad-generatora-dokumentu__naglowek">{naglowek}</header>
      {pasekAkcji && <div className="uklad-generatora-dokumentu__akcje">{pasekAkcji}</div>}

      <div className="uklad-generatora-dokumentu__obszar">
        <main className="uklad-generatora-dokumentu__tresc">{children}</main>
        {prawyPanel && czyPanelOtwarty && (
          <div
            className="uklad-generatora-dokumentu__panel"
            onMouseEnter={() => stanPanelu.ustawCzyNajechanyUchwyt(true)}
            onMouseLeave={() => stanPanelu.ustawCzyNajechanyUchwyt(false)}
          >
            {prawyPanel(stanPanelu)}
          </div>
        )}
      </div>

      {prawyPanel && (
        <button
          aria-label="PokaĹĽ prawy panel generatora"
          className="uklad-generatora-dokumentu__uchwyt"
          onClick={stanPanelu.pokazPanel}
          onMouseEnter={() => stanPanelu.ustawCzyNajechanyUchwyt(true)}
          onMouseLeave={() => stanPanelu.ustawCzyNajechanyUchwyt(false)}
          type="button"
        >
          <span>{licznikProblemow > 0 ? licznikProblemow : 'Panel'}</span>
        </button>
      )}
    </section>
  )
}
