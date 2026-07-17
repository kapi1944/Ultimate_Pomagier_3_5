import type { ReactNode } from 'react'
import { etykietyStatusowPol, klasyStatusowPol } from '../stale'
import type { StatusyPolImportu } from '../typy'
import { pobierzIdBleduPola, pobierzIdPola } from './identyfikatoryPol'
import { useBladPola } from './stanBledowPol'

type WspolneWlasciwosciPola = {
  etykieta: string
  pole: string
  statusyPol: StatusyPolImportu
  blad?: string
  disabled?: boolean
  idGrupy?: string
  dzieci?: ReactNode
  children?: ReactNode
}

type WlasciwosciPolaTekstowego = WspolneWlasciwosciPola & {
  wartosc: string
  ustawWartosc: (wartosc: string) => void
  typ?: 'text' | 'email' | 'tel' | 'date' | 'time' | 'url'
  placeholder?: string
  listaPodpowiedziId?: string
  podpowiedzi?: string[]
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

  return ''
}

export function ZnacznikBleduPola({ blad }: { blad?: string }) {
  return blad ? <span aria-hidden="true" className="szczegoly-pole__kropka-bledu" /> : null
}

function OpakowaniePola({ etykieta, pole, statusyPol, blad, disabled, dzieci, children }: WspolneWlasciwosciPola) {
  const status = statusyPol[pole]
  const zawartosc = dzieci ?? children
  const komunikatStatusu = pobierzKomunikatStatusu(pole, statusyPol)
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji

  return (
    <label className={`szczegoly-pole ${status ? klasyStatusowPol[status] : ''} ${disabled ? 'szczegoly-pole--disabled' : ''}`}>
      <span className="szczegoly-pole__naglowek">
        <span className="szczegoly-pole__etykieta">{etykieta}<ZnacznikBleduPola blad={komunikatBledu} /></span>
        <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
      </span>
      {zawartosc}
      {komunikatBledu && <span className="szczegoly-pole__blad" id={pobierzIdBleduPola(pole)}>{komunikatBledu}</span>}
      {!komunikatBledu && komunikatStatusu && <span className="szczegoly-pole__pomoc">{komunikatStatusu}</span>}
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
  listaPodpowiedziId,
  podpowiedzi,
  blad,
  disabled,
  idGrupy,
}: WlasciwosciPolaTekstowego) {
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji
  return (
    <OpakowaniePola blad={komunikatBledu} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <input
        aria-describedby={komunikatBledu ? pobierzIdBleduPola(pole) : undefined}
        aria-invalid={Boolean(komunikatBledu)}
        disabled={disabled}
        id={pobierzIdPola(pole, idGrupy)}
        list={listaPodpowiedziId}
        placeholder={placeholder}
        type={typ}
        value={wartosc}
        onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)}
      />
      {listaPodpowiedziId && podpowiedzi && (
        <datalist id={listaPodpowiedziId}>
          {podpowiedzi.map((podpowiedz) => (
            <option key={podpowiedz} value={podpowiedz} />
          ))}
        </datalist>
      )}
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
  idGrupy,
}: WlasciwosciPolaLiczbowego) {
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji
  return (
    <OpakowaniePola blad={komunikatBledu} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <input
        aria-describedby={komunikatBledu ? pobierzIdBleduPola(pole) : undefined}
        aria-invalid={Boolean(komunikatBledu)}
        disabled={disabled}
        id={pobierzIdPola(pole, idGrupy)}
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
        id={pobierzIdPola(pole)}
        max={max}
        min={min}
        type="range"
        value={wartosc}
        onChange={(zdarzenie) => ustawWartosc(Number(zdarzenie.target.value))}
      />
    </OpakowaniePola>
  )
}

export function PoleWyboru({ etykieta, pole, statusyPol, wartosc, ustawWartosc, opcje, blad, disabled, idGrupy }: WlasciwosciPolaWyboru) {
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji
  return (
    <OpakowaniePola blad={komunikatBledu} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <select aria-describedby={komunikatBledu ? pobierzIdBleduPola(pole) : undefined} aria-invalid={Boolean(komunikatBledu)} disabled={disabled} id={pobierzIdPola(pole, idGrupy)} value={wartosc} onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)}>
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
  idGrupy,
}: WlasciwosciPolaTekstowego) {
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji
  return (
    <OpakowaniePola blad={komunikatBledu} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <textarea
        aria-describedby={komunikatBledu ? pobierzIdBleduPola(pole) : undefined}
        aria-invalid={Boolean(komunikatBledu)}
        disabled={disabled}
        id={pobierzIdPola(pole, idGrupy)}
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
  const blad = useBladPola(pole, disabled)
  return (
    <label className={`szczegoly-checkbox ${disabled ? 'szczegoly-checkbox--disabled' : ''}`}>
      <input aria-describedby={blad ? pobierzIdBleduPola(pole) : undefined} aria-invalid={Boolean(blad)} checked={zaznaczone} disabled={disabled} id={pobierzIdPola(pole)} type="checkbox" onChange={(zdarzenie) => ustawZaznaczone(zdarzenie.target.checked)} />
      <span>{etykieta}<ZnacznikBleduPola blad={blad} /></span>
      <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
      {blad && <span className="szczegoly-pole__blad" id={pobierzIdBleduPola(pole)}>{blad}</span>}
    </label>
  )
}
