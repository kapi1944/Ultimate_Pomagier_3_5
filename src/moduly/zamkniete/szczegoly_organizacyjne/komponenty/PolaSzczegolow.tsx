import type { ReactNode } from 'react'
import { etykietyStatusowPol, klasyStatusowPol } from '../stale'
import type { StatusyPolImportu } from '../typy'

type WspolneWlasciwosciPola = {
  etykieta: string
  pole: string
  statusyPol: StatusyPolImportu
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

function OpakowaniePola({ etykieta, pole, statusyPol, dzieci, children }: WspolneWlasciwosciPola) {
  const status = statusyPol[pole]
  const zawartosc = dzieci ?? children

  return (
    <label className={`szczegoly-pole ${status ? klasyStatusowPol[status] : ''}`}>
      <span className="szczegoly-pole__naglowek">
        <span>{etykieta}</span>
        <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
      </span>
      {zawartosc}
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
}: WlasciwosciPolaTekstowego) {
  return (
    <OpakowaniePola etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <input placeholder={placeholder} type={typ} value={wartosc} onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)} />
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
}: WlasciwosciPolaLiczbowego) {
  return (
    <OpakowaniePola etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <input
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

export function PoleWyboru({ etykieta, pole, statusyPol, wartosc, ustawWartosc, opcje }: WlasciwosciPolaWyboru) {
  return (
    <OpakowaniePola etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <select value={wartosc} onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)}>
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
}: WlasciwosciPolaTekstowego) {
  return (
    <OpakowaniePola etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <textarea placeholder={placeholder} value={wartosc} onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)} />
    </OpakowaniePola>
  )
}

export function PoleCheckbox({
  etykieta,
  pole,
  statusyPol,
  zaznaczone,
  ustawZaznaczone,
}: WlasciwosciPolaCheckbox) {
  return (
    <label className="szczegoly-checkbox">
      <input checked={zaznaczone} type="checkbox" onChange={(zdarzenie) => ustawZaznaczone(zdarzenie.target.checked)} />
      <span>{etykieta}</span>
      <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
    </label>
  )
}
