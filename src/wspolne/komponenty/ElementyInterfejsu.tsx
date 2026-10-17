import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import './elementyInterfejsu.css'

export type StatusInterfejsu = 'success' | 'warning' | 'error' | 'info' | 'draft'

export function Karta({ tytul, children }: { tytul: string; children: ReactNode }) {
  return <section className="ui-karta"><h3>{tytul}</h3>{children}</section>
}

export function Przycisk({ className = '', type = 'button', ...wlasciwosci }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...wlasciwosci} type={type} className={`ui-przycisk ${className}`} />
}

export function OdznakaStatusu({ status, children }: { status: StatusInterfejsu; children: ReactNode }) {
  return <span className="ui-odznaka" data-status={status}>{children}</span>
}

export function PoleFormularza({ etykieta, blad, id, ...wlasciwosci }: InputHTMLAttributes<HTMLInputElement> & { etykieta: string; blad?: string }) {
  const identyfikator = useId()
  const poleId = id ?? identyfikator
  const opis = [wlasciwosci['aria-describedby'], blad ? `${poleId}-blad` : ''].filter(Boolean).join(' ') || undefined
  return <div className="ui-pole"><label htmlFor={poleId}>{etykieta}</label><input {...wlasciwosci} id={poleId} aria-invalid={blad ? true : wlasciwosci['aria-invalid']} aria-describedby={opis} />{blad && <span id={`${poleId}-blad`} data-status="error">{blad}</span>}</div>
}

export function Zakladki({ pozycje, aktywna, wybierz, children }: { pozycje: readonly string[]; aktywna: string; wybierz: (pozycja: string) => void; children: ReactNode }) {
  const identyfikator = useId()
  return <div className="ui-zakladki"><div role="tablist" aria-label="Zakładki">{pozycje.map((pozycja, indeks) => <button type="button" role="tab" key={pozycja} id={`${identyfikator}-${indeks}`} aria-controls={`${identyfikator}-panel`} aria-selected={aktywna === pozycja} tabIndex={aktywna === pozycja ? 0 : -1} onClick={() => wybierz(pozycja)} onKeyDown={(zdarzenie) => {
    const przesuniecie = zdarzenie.key === 'ArrowRight' ? 1 : zdarzenie.key === 'ArrowLeft' ? -1 : 0
    const nowyIndeks = zdarzenie.key === 'Home' ? 0 : zdarzenie.key === 'End' ? pozycje.length - 1 : (indeks + przesuniecie + pozycje.length) % pozycje.length
    if (!przesuniecie && zdarzenie.key !== 'Home' && zdarzenie.key !== 'End') return
    zdarzenie.preventDefault()
    wybierz(pozycje[nowyIndeks])
    document.getElementById(`${identyfikator}-${nowyIndeks}`)?.focus()
  }}>{pozycja}</button>)}</div><div role="tabpanel" tabIndex={0} id={`${identyfikator}-panel`} aria-labelledby={`${identyfikator}-${pozycje.indexOf(aktywna)}`}>{children}</div></div>
}

export function PustyStan({ children }: { children: ReactNode }) {
  return <p className="ui-pusty-stan">{children}</p>
}

export function Komunikat({ status = 'info', children }: { status?: StatusInterfejsu; children: ReactNode }) {
  return <div className="ui-komunikat" data-status={status} role={status === 'error' ? 'alert' : 'status'}>{children}</div>
}

type WlasciwosciDialogu = { otwarty: boolean; zamknij: () => void; tytul: string; children: ReactNode }

export function OknoDialogowe({ otwarty, zamknij, tytul, children, wariant = 'dialog', etykietaZamkniecia = 'Zamknij' }: WlasciwosciDialogu & { wariant?: 'dialog' | 'panel'; etykietaZamkniecia?: string }) {
  const panel = useRef<HTMLDialogElement>(null)
  const identyfikator = useId()
  useEffect(() => {
    const element = panel.current
    const poprzedniFokus = document.activeElement
    if (otwarty && element && !element.open) element.showModal()
    if (!otwarty && element?.open) element.close()
    return () => {
      if (element?.open) element.close()
      if (otwarty && poprzedniFokus instanceof HTMLElement) poprzedniFokus.focus()
    }
  }, [otwarty])
  return <dialog ref={panel} className={wariant === 'panel' ? 'ui-panel' : 'ui-dialog'} aria-labelledby={identyfikator} onCancel={(zdarzenie) => { zdarzenie.preventDefault(); zamknij() }}><h2 id={identyfikator}>{tytul}</h2><Przycisk onClick={zamknij} autoFocus>{etykietaZamkniecia}</Przycisk>{children}</dialog>
}

export function PanelWysuwany(wlasciwosci: WlasciwosciDialogu) {
  return <OknoDialogowe {...wlasciwosci} wariant="panel" etykietaZamkniecia="Zamknij panel" />
}
