import type { ReactNode } from 'react'
import { etykietyStatusowPol, klasyStatusowPol } from '../stale'
import type { StatusyPolImportu } from '../typy'

type WspolneWlasciwosciPola = {
  etykieta: string
  pole: string
  statusyPol: StatusyPolImportu
  blad?: string
  disabled?: boolean
  dzieci?: ReactNode
  children?: ReactNode
}

type WlasciwosciPolaTekstowego = WspolneWlasciwosciPola & {
  wartosc: string
  ustawWartosc: (wartosc: string) => void
  typ?: 'text' | 'email' | 'tel' | 'date' | 'time' | 'url'
  placeholder?: string
}

type WlasciwosciPolaLiczbowego = WspolneWlasciwosciPola & {
  wartosc: number
  ustawWartosc: (wartosc: number) => void
  min?: number
  max?: number
  krok?: number
}

type WlasciwosciPolaWyboru = WspolneWlasciwosciPola & {
  wartosc: string
  ustawWartosc: (wartosc: string) => void
  opcje: string[]
}

type WlasciwosciPolaCheckbox = WspolneWlasciwosciPola & {
  zaznaczone: boolean
  ustawZaznaczone: (wartosc: boolean) => void
}

function ZnacznikStatusu({ pole, statusyPol }: { pole: string; statusyPol: StatusyPolImportu }) {
  const status = statusyPol[pole]

  if (!status) {
    return null
  }

  return <span className={`szczegoly-pole__status ${klasyStatusowPol[status]}`}>{etykietyStatusowPol[status]}</span>
}

function pobierzKomunikatStatusu(pole: string, statusyPol: StatusyPolImportu) {
  const status = statusyPol[pole]

  if (status === 'brak') {
    return 'Nie odnaleziono informacji.'
  }

  if (status === 'niepewne') {
    return 'Sprawdź tę wartość przed wprowadzeniem szkolenia.'
  }

  if (status === 'zaimportowane') {
    return 'Dane zaimportowane z treści maila.'
  }

  if (status === 'reczne') {
    return 'Dane wpisane lub poprawione ręcznie.'
  }

  return ''
}

function OpakowaniePola({ etykieta, pole, statusyPol, blad, disabled, dzieci, children }: WspolneWlasciwosciPola) {
  const status = statusyPol[pole]
  const zawartosc = dzieci ?? children
  const komunikatStatusu = pobierzKomunikatStatusu(pole, statusyPol)

  return (
    <label className={`szczegoly-pole ${status ? klasyStatusowPol[status] : ''} ${disabled ? 'szczegoly-pole--disabled' : ''}`}>
      <span className="szczegoly-pole__naglowek">
        <span>{etykieta}</span>
        <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
      </span>
      {zawartosc}
      {blad && <span className="szczegoly-pole__blad">{blad}</span>}
      {!blad && komunikatStatusu && <span className="szczegoly-pole__pomoc">{komunikatStatusu}</span>}
    </label>
  )
}

export function PoleTekstowe({
  etykieta,
  pole,
  statusyPol,
  wartosc,
  ustawWartosc,
  typ = 'text',
  placeholder,
  blad,
  disabled,
}: WlasciwosciPolaTekstowego) {
  return (
    <OpakowaniePola blad={blad} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <input
        aria-invalid={Boolean(blad)}
        disabled={disabled}
        placeholder={placeholder}
        type={typ}
        value={wartosc}
        onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)}
      />
    </OpakowaniePola>
  )
}

export function PoleLiczbowe({
  etykieta,
  pole,
  statusyPol,
  wartosc,
  ustawWartosc,
  min,
  max,
  krok = 1,
  blad,
  disabled,
}: WlasciwosciPolaLiczbowego) {
  return (
    <OpakowaniePola blad={blad} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <input
        aria-invalid={Boolean(blad)}
        disabled={disabled}
        max={max}
        min={min}
        step={krok}
        type="number"
        value={wartosc}
        onChange={(zdarzenie) => ustawWartosc(Number(zdarzenie.target.value))}
      />
    </OpakowaniePola>
  )
}

export function PoleSuwak({
  etykieta,
  pole,
  statusyPol,
  wartosc,
  ustawWartosc,
  min = 0,
  max = 40,
}: WlasciwosciPolaLiczbowego) {
  return (
    <OpakowaniePola etykieta={`${etykieta}: ${wartosc}`} pole={pole} statusyPol={statusyPol}>
      <input
        max={max}
        min={min}
        type="range"
        value={wartosc}
        onChange={(zdarzenie) => ustawWartosc(Number(zdarzenie.target.value))}
      />
    </OpakowaniePola>
  )
}

export function PoleWyboru({ etykieta, pole, statusyPol, wartosc, ustawWartosc, opcje, blad, disabled }: WlasciwosciPolaWyboru) {
  return (
    <OpakowaniePola blad={blad} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <select aria-invalid={Boolean(blad)} disabled={disabled} value={wartosc} onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)}>
        {opcje.map((opcja) => (
          <option key={opcja} value={opcja}>
            {opcja}
          </option>
        ))}
      </select>
    </OpakowaniePola>
  )
}

export function PoleTekstoweWielowierszowe({
  etykieta,
  pole,
  statusyPol,
  wartosc,
  ustawWartosc,
  placeholder,
  blad,
  disabled,
}: WlasciwosciPolaTekstowego) {
  return (
    <OpakowaniePola blad={blad} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <textarea
        aria-invalid={Boolean(blad)}
        disabled={disabled}
        placeholder={placeholder}
        value={wartosc}
        onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)}
      />
    </OpakowaniePola>
  )
}

export function PoleCheckbox({
  etykieta,
  pole,
  statusyPol,
  zaznaczone,
  ustawZaznaczone,
  disabled,
}: WlasciwosciPolaCheckbox) {
  return (
    <label className={`szczegoly-checkbox ${disabled ? 'szczegoly-checkbox--disabled' : ''}`}>
      <input checked={zaznaczone} disabled={disabled} type="checkbox" onChange={(zdarzenie) => ustawZaznaczone(zdarzenie.target.checked)} />
      <span>{etykieta}</span>
      <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
    </label>
  )
}
