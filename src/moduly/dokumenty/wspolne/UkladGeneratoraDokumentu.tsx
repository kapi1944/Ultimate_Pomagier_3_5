import { forwardRef, type PropsWithChildren, type ReactNode } from 'react'
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

type WlasciwosciUkladuPaneliGeneratora = PropsWithChildren<{
  className?: string
}>

type WlasciwosciPaneluGeneratora = PropsWithChildren<{
  tytul?: string
  wariant: 'edycja' | 'podglad'
  className?: string
}>

function polaczKlasy(...klasy: Array<string | undefined>) {
  return klasy.filter(Boolean).join(' ')
}

export function PasekAkcjiGeneratora({ children, className }: WlasciwosciPaskaAkcjiGeneratora) {
  return <div className={polaczKlasy('generator-dokumentu__akcje', className)}>{children}</div>
}

export function UkladPaneliGeneratora({ children, className }: WlasciwosciUkladuPaneliGeneratora) {
  return <div className={polaczKlasy('generator-dokumentu__panele', className)}>{children}</div>
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
