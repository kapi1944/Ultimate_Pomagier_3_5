import { useMemo, useState, type ReactNode } from 'react'
import type { StanPrawegoPaneluGeneratora } from '../haki/usePrawyPanelGeneratora'

export type PoziomKontroliJakosci = 'krytyczne' | 'ostrzezenie' | 'sugestia' | 'podpowiedz' | 'poprawne'

export type PozycjaKontroliJakosci = {
  id: string
  tytul: string
  opis?: string
  poziom: PoziomKontroliJakosci
  grupa: string
  zakladka?: string
  idPola?: string
  czyBlokujePublikacje: boolean
  czyBlokujeEksport: boolean
  kolejnosc?: number
}

export type SekcjaPrawegoPanelu = {
  tytul: string
  opis?: string
  zawartosc: ReactNode
}

type TrybFiltraJakosci = 'calosc' | 'aktywna'

type WlasciwosciPrawegoPanelu = {
  tytul: string
  status?: ReactNode
  statusJakosci?: string
  licznikProblemow?: number
  komunikaty?: ReactNode
  akcjeGlowne?: ReactNode
  sekcje?: SekcjaPrawegoPanelu[]
  pozycjeJakosci?: PozycjaKontroliJakosci[]
  aktywnaGrupaJakosci?: string
  etykietaAktywnejGrupy?: string
  onZmienGrupeJakosci?: (grupa: string) => void
  children?: ReactNode
  stanPanelu: StanPrawegoPaneluGeneratora
}

const etykietyPoziomow: Record<PoziomKontroliJakosci, string> = {
  krytyczne: 'Krytyczne',
  ostrzezenie: 'Ostrzeżenia',
  sugestia: 'Sugestie',
  podpowiedz: 'Podpowiedzi',
  poprawne: 'Poprawne',
}

const kolejnoscPoziomow: PoziomKontroliJakosci[] = ['krytyczne', 'ostrzezenie', 'sugestia', 'podpowiedz', 'poprawne']

function policzPozycje(pozycje: PozycjaKontroliJakosci[], poziom: PoziomKontroliJakosci) {
  return pozycje.filter((pozycja) => pozycja.poziom === poziom).length
}

function pogrupujPozycje(pozycje: PozycjaKontroliJakosci[]) {
  return pozycje.reduce<Record<string, PozycjaKontroliJakosci[]>>((grupy, pozycja) => {
    const nazwaGrupy = pozycja.zakladka ?? pozycja.grupa
    grupy[nazwaGrupy] = [...(grupy[nazwaGrupy] ?? []), pozycja]
    return grupy
  }, {})
}

function posortujPozycje(pozycje: PozycjaKontroliJakosci[]) {
  return [...pozycje].sort((pierwsza, druga) => {
    const roznicaPoziomu = kolejnoscPoziomow.indexOf(pierwsza.poziom) - kolejnoscPoziomow.indexOf(druga.poziom)

    if (roznicaPoziomu !== 0) {
      return roznicaPoziomu
    }

    return (pierwsza.kolejnosc ?? 0) - (druga.kolejnosc ?? 0)
  })
}

function podswietlElement(element: HTMLElement) {
  element.classList.add('prawy-panel-generatora__cel--aktywny')
  window.setTimeout(() => element.classList.remove('prawy-panel-generatora__cel--aktywny'), 2600)
}

function przewinDoPozycji(pozycja: PozycjaKontroliJakosci) {
  if (!pozycja.idPola) {
    return
  }

  window.setTimeout(() => {
    const element = document.getElementById(pozycja.idPola)

    if (!element) {
      return
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    podswietlElement(element)
  }, pozycja.zakladka ? 80 : 0)
}

export default function PrawyPanelGeneratora({
  tytul,
  status,
  statusJakosci,
  licznikProblemow = 0,
  komunikaty,
  akcjeGlowne,
  sekcje = [],
  pozycjeJakosci = [],
  aktywnaGrupaJakosci,
  etykietaAktywnejGrupy = 'Aktywna sekcja',
  onZmienGrupeJakosci,
  children,
  stanPanelu,
}: WlasciwosciPrawegoPanelu) {
  const [trybFiltra, ustawTrybFiltra] = useState<TrybFiltraJakosci>('calosc')
  const posortowanePozycje = useMemo(() => posortujPozycje(pozycjeJakosci), [pozycjeJakosci])
  const pozycjeWidoczne = trybFiltra === 'aktywna' && aktywnaGrupaJakosci
    ? posortowanePozycje.filter((pozycja) => (pozycja.zakladka ?? pozycja.grupa) === aktywnaGrupaJakosci)
    : posortowanePozycje
  const grupyJakosci = pogrupujPozycje(pozycjeWidoczne)
  const nazwyGrup = Object.keys(grupyJakosci).sort((pierwsza, druga) => {
    if (pierwsza === aktywnaGrupaJakosci) return -1
    if (druga === aktywnaGrupaJakosci) return 1
    return pierwsza.localeCompare(druga, 'pl')
  })
  const czyPublikacjaZablokowana = pozycjeJakosci.some((pozycja) => pozycja.czyBlokujePublikacje)
  const czyEksportZablokowany = pozycjeJakosci.some((pozycja) => pozycja.czyBlokujeEksport)
  const statusOperacyjny = statusJakosci ?? (czyPublikacjaZablokowana || czyEksportZablokowany ? 'NIEPEŁNE' : 'GOTOWE')

  function obsluzKlikPozycji(pozycja: PozycjaKontroliJakosci) {
    if (pozycja.zakladka && onZmienGrupeJakosci) {
      onZmienGrupeJakosci(pozycja.zakladka)
    }

    przewinDoPozycji(pozycja)
  }

  return (
    <aside className="prawy-panel-generatora" aria-label={tytul}>
      <header className="prawy-panel-generatora__naglowek">
        <div>
          <h2>{tytul}</h2>
          {status && <div className="prawy-panel-generatora__status">{status}</div>}
        </div>
        {licznikProblemow > 0 && <span className="prawy-panel-generatora__licznik">{licznikProblemow}</span>}
      </header>

      <div className="prawy-panel-generatora__sterowanie" aria-label="Sterowanie prawym panelem">
        <button type="button" onClick={stanPanelu.przelaczZwiniecie}>
          {stanPanelu.czyZwiniety ? 'Rozwiń' : 'Zwiń'}
        </button>
        <button type="button" onClick={stanPanelu.przelaczPrzypiecie}>
          {stanPanelu.czyPrzypiety ? 'Odepnij' : 'Przypnij'}
        </button>
        <button type="button" onClick={stanPanelu.przelaczBlokadeWysuwania}>
          {stanPanelu.czyBlokadaWysuwania ? 'Odblokuj wysuwanie' : 'Zablokuj wysuwanie'}
        </button>
        <button type="button" onClick={stanPanelu.schowajPanel}>
          Schowaj
        </button>
      </div>

      <label className="prawy-panel-generatora__szerokosc">
        Szerokość panelu: {stanPanelu.szerokoscPanelu}px
        <input
          max={460}
          min={320}
          onChange={(zdarzenie) => stanPanelu.ustawSzerokoscPanelu(Number(zdarzenie.target.value))}
          type="range"
          value={stanPanelu.szerokoscPanelu}
        />
      </label>

      <section className="prawy-panel-generatora__podsumowanie" aria-label="Podsumowanie kontroli jakości">
        <div className="prawy-panel-generatora__status-jakosci">
          <span>Status</span>
          <strong>{statusOperacyjny}</strong>
        </div>
        <dl>
          {kolejnoscPoziomow.map((poziom) => (
            <div className={`prawy-panel-generatora__metryka prawy-panel-generatora__metryka--${poziom}`} key={poziom}>
              <dt>{etykietyPoziomow[poziom]}</dt>
              <dd>{policzPozycje(pozycjeJakosci, poziom)}</dd>
            </div>
          ))}
        </dl>
        <p className="prawy-panel-generatora__blokady">
          Publikacja: {czyPublikacjaZablokowana ? 'zablokowana' : 'dostępna'} | Eksport: {czyEksportZablokowany ? 'zablokowany' : 'dostępny'}
        </p>
      </section>

      <div className="prawy-panel-generatora__filtry" aria-label="Filtr kontroli jakości">
        <button className={trybFiltra === 'calosc' ? 'prawy-panel-generatora__filtr--aktywny' : ''} type="button" onClick={() => ustawTrybFiltra('calosc')}>
          Cały dokument
        </button>
        <button
          className={trybFiltra === 'aktywna' ? 'prawy-panel-generatora__filtr--aktywny' : ''}
          disabled={!aktywnaGrupaJakosci}
          type="button"
          onClick={() => ustawTrybFiltra('aktywna')}
        >
          {etykietaAktywnejGrupy}
        </button>
      </div>

      {pozycjeJakosci.length > 0 && (
        <div className="prawy-panel-generatora__lista-jakosci">
          {nazwyGrup.map((grupa) => (
            <section className="prawy-panel-generatora__grupa" key={grupa}>
              <h3>{grupa}</h3>
              <ul>
                {grupyJakosci[grupa].map((pozycja) => (
                  <li className={`prawy-panel-generatora__pozycja prawy-panel-generatora__pozycja--${pozycja.poziom}`} key={pozycja.id}>
                    <button type="button" onClick={() => obsluzKlikPozycji(pozycja)}>
                      <span className="prawy-panel-generatora__badge">{etykietyPoziomow[pozycja.poziom]}</span>
                      <strong>{pozycja.tytul}</strong>
                      {pozycja.opis && <span>{pozycja.opis}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {komunikaty && <div className="prawy-panel-generatora__komunikaty">{komunikaty}</div>}

      {akcjeGlowne && <div className="prawy-panel-generatora__akcje">{akcjeGlowne}</div>}

      {sekcje.map((sekcja) => (
        <section className="prawy-panel-generatora__sekcja" key={sekcja.tytul}>
          <h3>{sekcja.tytul}</h3>
          {sekcja.opis && <p>{sekcja.opis}</p>}
          {sekcja.zawartosc}
        </section>
      ))}

      {children}
    </aside>
  )
}
