import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type PropsWithChildren, type ReactNode } from 'react'
import './ukladGeneratoraDokumentu.css'

type WlasciwosciUkladuGeneratoraDokumentu = PropsWithChildren<{
  tytul: string
  opis?: ReactNode
  akcje?: ReactNode
  komunikat?: ReactNode
  className?: string
}>

type WlasciwosciPaskaAkcjiGeneratora = PropsWithChildren<{
  className?: string
}>

type WlasciwosciUkladuFormularzaIPodgladu = PropsWithChildren<{
  className?: string
}>

type WlasciwosciPaneluGeneratora = PropsWithChildren<{
  tytul?: string
  wariant: 'edycja' | 'podglad'
  className?: string
}>

type WlasciwosciPaneluUstawienGeneratora = PropsWithChildren<{
  id: string
  tytul: string
  czyOtwarty: boolean
  zamknij: () => void
  akcjeNaglowka?: ReactNode
  className?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  czyPrzypiety: boolean
  czyWysuwanieWlaczone: boolean
  przelaczPrzypiecie: () => void
  przelaczWysuwanie: () => void
}>

type OpcjePaneluUstawienGeneratora = {
  kluczPrzypiecia?: string
  kluczWysuwania?: string
  czyOtwartyPoczatkowo?: boolean
}

type KontekstPaneluGeneratora = {
  czyOtwarty: boolean
  czyPrzypiety: boolean
  czyWysuwanieWlaczone: boolean
  idPanelu: string
  otworz: () => void
  przelacz: () => void
  przelaczPrzypiecie: () => void
  przelaczWysuwanie: () => void
  schowajJesliOdpiety: () => void
  tytulPanelu: string
  zamknij: () => void
}

type WlasciwosciObszaruZPanelemGeneratora = PropsWithChildren<{
  idPanelu: string
  tytulPanelu: string
  kluczPrzypiecia: string
  kluczWysuwania: string
  className?: string
  szerokoscPanelu?: string
}>

type WlasciwosciPrzyciskuPaneluGeneratora = PropsWithChildren<{
  className?: string
}>

const KontekstPaneluGeneratora = createContext<KontekstPaneluGeneratora | null>(null)

function useKontekstPaneluGeneratora() {
  const kontekst = useContext(KontekstPaneluGeneratora)

  if (!kontekst) {
    throw new Error('Element panelu generatora musi znajdować się w ObszarZPanelemGeneratora.')
  }

  return kontekst
}

function polaczKlasy(...klasy: Array<string | false | undefined>) {
  return klasy.filter(Boolean).join(' ')
}

function pobierzUstawienieLogicznePanelu(klucz: string | undefined, wartoscDomyslna: boolean) {
  if (!klucz) {
    return wartoscDomyslna
  }

  try {
    const wartosc = localStorage.getItem(klucz)
    return wartosc === null ? wartoscDomyslna : wartosc === 'true'
  } catch {
    return wartoscDomyslna
  }
}

export function PasekAkcjiGeneratora({ children, className }: WlasciwosciPaskaAkcjiGeneratora) {
  return <div className={polaczKlasy('generator-dokumentu__akcje', className)}>{children}</div>
}

export function UkladFormularzaIPodgladu({ children, className }: WlasciwosciUkladuFormularzaIPodgladu) {
  return <div className={polaczKlasy('generator-dokumentu__obszar-roboczy', className)}>{children}</div>
}

export const PanelGeneratoraDokumentu = forwardRef<HTMLElement, WlasciwosciPaneluGeneratora>(
  function PanelGeneratoraDokumentu({ children, className, tytul, wariant }, ref) {
    return (
      <section
        className={polaczKlasy('generator-dokumentu__panel', `generator-dokumentu__panel--${wariant}`, className)}
        ref={ref}
      >
        {tytul && <h2>{tytul}</h2>}
        {children}
      </section>
    )
  },
)

function usePanelUstawienGeneratora({
  kluczPrzypiecia,
  kluczWysuwania,
  czyOtwartyPoczatkowo = false,
}: OpcjePaneluUstawienGeneratora = {}) {
  const [czyPrzypiety, ustawCzyPrzypiety] = useState(() => pobierzUstawienieLogicznePanelu(kluczPrzypiecia, false))
  const [czyWysuwanieWlaczone, ustawCzyWysuwanieWlaczone] = useState(() => pobierzUstawienieLogicznePanelu(kluczWysuwania, true))
  const [czyOtwarty, ustawCzyOtwarty] = useState(() => czyOtwartyPoczatkowo || czyPrzypiety)

  useEffect(() => {
    if (!kluczPrzypiecia) {
      return
    }

    try {
      localStorage.setItem(kluczPrzypiecia, String(czyPrzypiety))
    } catch {
      return
    }
  }, [czyPrzypiety, kluczPrzypiecia])

  useEffect(() => {
    if (!kluczWysuwania) {
      return
    }

    try {
      localStorage.setItem(kluczWysuwania, String(czyWysuwanieWlaczone))
    } catch {
      return
    }
  }, [czyWysuwanieWlaczone, kluczWysuwania])

  const otworz = useCallback(() => ustawCzyOtwarty(true), [])
  const zamknij = useCallback(() => {
    ustawCzyPrzypiety(false)
    ustawCzyOtwarty(false)
  }, [])
  const przelacz = useCallback(() => ustawCzyOtwarty((czyPanelJestOtwarty) => !czyPanelJestOtwarty), [])
  const przelaczPrzypiecie = useCallback(() => {
    const czyPrzypiac = !czyPrzypiety
    ustawCzyPrzypiety(czyPrzypiac)
    ustawCzyOtwarty(czyPrzypiac)
  }, [czyPrzypiety])
  const przelaczWysuwanie = useCallback(() => ustawCzyWysuwanieWlaczone((czyWlaczone) => !czyWlaczone), [])
  const otworzZKrawedzi = useCallback(() => {
    if (czyWysuwanieWlaczone) {
      otworz()
    }
  }, [czyWysuwanieWlaczone, otworz])
  const schowajJesliOdpiety = useCallback(() => {
    if (!czyPrzypiety) {
      ustawCzyOtwarty(false)
    }
  }, [czyPrzypiety])

  return {
    czyOtwarty,
    czyPrzypiety,
    czyWysuwanieWlaczone,
    otworz,
    otworzZKrawedzi,
    zamknij,
    przelacz,
    przelaczPrzypiecie,
    przelaczWysuwanie,
    schowajJesliOdpiety,
  }
}

export function PanelUstawienGeneratoraDokumentu({
  akcjeNaglowka,
  children,
  className,
  czyOtwarty,
  id,
  onMouseEnter,
  onMouseLeave,
  czyPrzypiety,
  czyWysuwanieWlaczone,
  przelaczPrzypiecie,
  przelaczWysuwanie,
  tytul,
  zamknij,
}: WlasciwosciPaneluUstawienGeneratora) {
  return (
    <aside
      aria-hidden={!czyOtwarty}
      aria-label={tytul}
      className={polaczKlasy('generator-panel-ustawien', czyOtwarty && 'generator-panel-ustawien--otwarty', className)}
      id={id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <header className="generator-panel-ustawien__naglowek">
        <h2>{tytul}</h2>
        <div className="generator-panel-ustawien__akcje">
          <button aria-pressed={czyWysuwanieWlaczone} className="generator-panel-ustawien__przycisk" onClick={przelaczWysuwanie} title={czyWysuwanieWlaczone ? 'Wyłącz wysuwanie z prawej krawędzi' : 'Włącz wysuwanie z prawej krawędzi'} type="button">
            ↪ {czyWysuwanieWlaczone ? 'Wyłącz wysuwanie' : 'Włącz wysuwanie'}
          </button>
          <button aria-pressed={czyPrzypiety} className="generator-panel-ustawien__przycisk" onClick={przelaczPrzypiecie} title={czyPrzypiety ? 'Odepnij panel ustawień' : 'Przypnij panel ustawień'} type="button">
            📌 {czyPrzypiety ? 'Odepnij panel' : 'Przypnij panel'}
          </button>
          {akcjeNaglowka}
          <button aria-label={`Zamknij: ${tytul}`} className="generator-panel-ustawien__zamknij" onClick={zamknij} type="button">
            Zamknij
          </button>
        </div>
      </header>
      {children}
    </aside>
  )
}

export function ObszarZPanelemGeneratora({
  children,
  className,
  idPanelu,
  kluczPrzypiecia,
  kluczWysuwania,
  szerokoscPanelu,
  tytulPanelu,
}: WlasciwosciObszaruZPanelemGeneratora) {
  const {
    czyOtwarty,
    czyPrzypiety,
    czyWysuwanieWlaczone,
    otworz,
    otworzZKrawedzi,
    przelacz,
    przelaczPrzypiecie,
    przelaczWysuwanie,
    schowajJesliOdpiety,
    zamknij,
  } = usePanelUstawienGeneratora({ kluczPrzypiecia, kluczWysuwania })
  const styl = szerokoscPanelu
    ? ({ '--szerokosc-panelu-generatora': szerokoscPanelu } as CSSProperties)
    : undefined
  const kontekst = useMemo<KontekstPaneluGeneratora>(() => ({
    czyOtwarty,
    czyPrzypiety,
    czyWysuwanieWlaczone,
    idPanelu,
    otworz,
    przelacz,
    przelaczPrzypiecie,
    przelaczWysuwanie,
    schowajJesliOdpiety,
    tytulPanelu,
    zamknij,
  }), [czyOtwarty, czyPrzypiety, czyWysuwanieWlaczone, idPanelu, otworz, przelacz, przelaczPrzypiecie, przelaczWysuwanie, schowajJesliOdpiety, tytulPanelu, zamknij])

  return (
    <KontekstPaneluGeneratora.Provider value={kontekst}>
      <div
        className={polaczKlasy('generator-z-panelem', czyOtwarty && 'generator-z-panelem--otwarty', className)}
        style={styl}
      >
        <div className="generator-z-panelem__tresc">
          {children}
        </div>
        <div aria-hidden="true" className="generator-z-panelem__strefa-aktywacji" onMouseEnter={otworzZKrawedzi} />
      </div>
    </KontekstPaneluGeneratora.Provider>
  )
}

export function PrzyciskPaneluGeneratora({ children, className }: WlasciwosciPrzyciskuPaneluGeneratora) {
  const { czyOtwarty, idPanelu, przelacz } = useKontekstPaneluGeneratora()

  return <button aria-controls={idPanelu} aria-expanded={czyOtwarty} className={className} onClick={przelacz} type="button">{children}</button>
}

export function PanelBocznyGeneratora({ children, className }: PropsWithChildren<{ className?: string }>) {
  const panel = useKontekstPaneluGeneratora()

  return (
    <PanelUstawienGeneratoraDokumentu
      className={className}
      czyOtwarty={panel.czyOtwarty}
      czyPrzypiety={panel.czyPrzypiety}
      czyWysuwanieWlaczone={panel.czyWysuwanieWlaczone}
      id={panel.idPanelu}
      onMouseEnter={panel.otworz}
      onMouseLeave={panel.schowajJesliOdpiety}
      przelaczPrzypiecie={panel.przelaczPrzypiecie}
      przelaczWysuwanie={panel.przelaczWysuwanie}
      tytul={panel.tytulPanelu}
      zamknij={panel.zamknij}
    >
      {children}
    </PanelUstawienGeneratoraDokumentu>
  )
}

export default function UkladGeneratoraDokumentu({
  akcje,
  children,
  className,
  komunikat,
  opis,
  tytul,
}: WlasciwosciUkladuGeneratoraDokumentu) {
  return (
    <section className={polaczKlasy('widok', 'generator-dokumentu', className)}>
      <header className="generator-dokumentu__naglowek">
        <div>
          <h1>{tytul}</h1>
          {opis && <p>{opis}</p>}
        </div>
        {akcje}
        {komunikat && <div aria-live="polite" className="generator-dokumentu__komunikat">{komunikat}</div>}
      </header>
      {children}
    </section>
  )
}
