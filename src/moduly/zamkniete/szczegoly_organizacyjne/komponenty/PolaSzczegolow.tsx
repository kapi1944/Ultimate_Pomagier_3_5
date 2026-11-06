import { KontekstZatwierdzania } from './zatwierdzaniePol'
import { useContext, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
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
  dopuszczajZero?: boolean
  wariantOpisu?: string
}

type WlasciwosciPolaWyboru = WspolneWlasciwosciPola & {
  wartosc: string
  ustawWartosc: (wartosc: string) => void
  opcje: string[]
  etykietyOpcji?: Record<string, string>
  niedostepneOpcje?: string[]
}

type WlasciwosciPolaCheckbox = WspolneWlasciwosciPola & {
  zaznaczone: boolean
  ustawZaznaczone: (wartosc: boolean) => void
}

export function ZnacznikStatusu({ pole, statusyPol }: { pole: string; statusyPol: StatusyPolImportu }) {
  const status = statusyPol[pole]
  const kontekst = useContext(KontekstZatwierdzania)
  const indeks = pole.match(/^grupy\.(\d+)\./)?.[1]
  const idGrupy = indeks === undefined ? undefined : kontekst?.grupy[Number(indeks)]?.id

  if (!status) {
    return null
  }

  if (kontekst && (status === 'niepewne' || status === 'zatwierdzone')) {
    const zmien = (zdarzenie: React.MouseEvent<HTMLButtonElement>) => { zdarzenie.preventDefault(); zdarzenie.stopPropagation(); kontekst.zmien(pole, idGrupy) }
    return <span><button type="button" className={`szczegoly-pole__status ${klasyStatusowPol[status]}`} aria-label={`${status === 'niepewne' ? 'Zatwierdź' : 'Cofnij zatwierdzenie'}: ${pole}`} onClick={zmien}>{etykietyStatusowPol[status]}</button>{status === 'niepewne' && <button type="button" onClick={zmien}>✓ Zatwierdź</button>}</span>
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

function OpakowaniePola({ etykieta, pole, statusyPol, blad, disabled, dzieci, children, idKontrolki, idOpisu = pobierzIdBleduPola(pole) }: WspolneWlasciwosciPola & { idKontrolki?: string; idOpisu?: string }) {
  const status = statusyPol[pole]
  const zawartosc = dzieci ?? children
  const komunikatStatusu = pobierzKomunikatStatusu(pole, statusyPol)
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji
  const Opakowanie = idKontrolki ? 'div' : 'label'
  const Etykieta = idKontrolki ? 'label' : 'span'

  return (
    <Opakowanie className={`szczegoly-pole ${status ? klasyStatusowPol[status] : ''} ${disabled ? 'szczegoly-pole--disabled' : ''}`}>
      <span className="szczegoly-pole__naglowek">
        <Etykieta className="szczegoly-pole__etykieta" htmlFor={idKontrolki}>{etykieta}<ZnacznikBleduPola blad={komunikatBledu} /></Etykieta>
        <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
      </span>
      {zawartosc}
      {komunikatBledu && <span className="szczegoly-pole__blad" id={idOpisu}>{komunikatBledu}</span>}
      {!komunikatBledu && komunikatStatusu && <span className="szczegoly-pole__pomoc" id={idOpisu}>{komunikatStatusu}</span>}
    </Opakowanie>
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
        aria-describedby={komunikatBledu || pobierzKomunikatStatusu(pole, statusyPol) ? pobierzIdBleduPola(pole) : undefined}
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

type WlasciwosciKontrolkiLiczbowej = Pick<ComponentPropsWithoutRef<'input'>, 'id' | 'disabled' | 'aria-describedby' | 'aria-invalid'> & {
  etykieta: string
  wartosc: number | ''
  ustawWartosc: (wartosc: number) => void
  min?: number
  max?: number
  krok?: number
  dopuszczajZero?: boolean
}

function rozlozLiczbeDziesietna(liczba: number) {
  const [mantysa, wykladnik = '0'] = String(liczba).split('e')
  const [calkowita, ulamkowa = ''] = mantysa.split('.')
  return { cyfry: BigInt(calkowita + ulamkowa), wykladnik: Number(wykladnik) - ulamkowa.length }
}

function dodajKrokDziesietny(wartosc: number, krok: number) {
  const baza = rozlozLiczbeDziesietna(wartosc)
  const zmiana = rozlozLiczbeDziesietna(krok)
  const wykladnik = Math.min(baza.wykladnik, zmiana.wykladnik)
  const suma = baza.cyfry * 10n ** BigInt(baza.wykladnik - wykladnik) + zmiana.cyfry * 10n ** BigInt(zmiana.wykladnik - wykladnik)
  return Number(`${suma}e${wykladnik}`)
}

export function KontrolkaLiczbowa({ etykieta, wartosc, ustawWartosc, min, max, krok = 1, dopuszczajZero, ...atrybuty }: WlasciwosciKontrolkiLiczbowej) {
  const [wartoscRobocza, ustawWartoscRobocza] = useState<string | null>(null)
  const widocznaWartosc = wartoscRobocza ?? wartosc
  const liczba = widocznaWartosc === '' ? 0 : Number(widocznaWartosc)
  const dolnaGranica = min ?? -Infinity
  const gornaGranica = max ?? Infinity

  function obliczZmiane(kierunek: -1 | 1) {
    if (atrybuty.disabled || !Number.isFinite(liczba)) return null
    if (kierunek < 0 ? liczba <= dolnaGranica : liczba >= gornaGranica) return null

    // Puste pole zaczyna od zera. Pierwszy krok w dozwoloną stronę wchodzi w zakres pola.
    const wynik = Math.max(dolnaGranica, Math.min(gornaGranica, dodajKrokDziesietny(liczba, kierunek * krok)))
    return Number.isFinite(wynik) && wynik !== liczba ? wynik : null
  }

  function zastosujWartosc(wynik: number | null) {
    if (wynik === null) return
    ustawWartoscRobocza(null)
    ustawWartosc(wynik)
  }

  const mniejszaWartosc = obliczZmiane(-1)
  const wiekszaWartosc = obliczZmiane(1)

  return (
    <span className="szczegoly-kontrolka-liczbowa" onBlur={(zdarzenie) => {
      if (!zdarzenie.currentTarget.contains(zdarzenie.relatedTarget)) ustawWartoscRobocza(null)
    }}>
      <button aria-disabled={mniejszaWartosc === null} aria-label={`Zmniejsz: ${etykieta}`} className="szczegoly-kontrolka-liczbowa__minus" disabled={atrybuty.disabled} type="button" onClick={() => zastosujWartosc(mniejszaWartosc)}>−</button>
      <input
        {...atrybuty}
        aria-invalid={atrybuty['aria-invalid'] || (wartoscRobocza !== null && wartoscRobocza !== '')}
        max={max}
        min={min}
        step={krok}
        type="number"
        value={widocznaWartosc}
        onChange={(zdarzenie) => {
          const { value, valueAsNumber } = zdarzenie.currentTarget
          const miesciSieWZakresie = valueAsNumber >= dolnaGranica && valueAsNumber <= gornaGranica
          if (Number.isFinite(valueAsNumber) && (miesciSieWZakresie || (dopuszczajZero && valueAsNumber === 0))) {
            zastosujWartosc(valueAsNumber)
          } else {
            ustawWartoscRobocza(value)
          }
        }}
        onKeyDown={(zdarzenie) => {
          if (zdarzenie.key !== 'ArrowDown' && zdarzenie.key !== 'ArrowUp') return
          zdarzenie.preventDefault()
          zastosujWartosc(zdarzenie.key === 'ArrowUp' ? wiekszaWartosc : mniejszaWartosc)
        }}
      />
      <button aria-disabled={wiekszaWartosc === null} aria-label={`Zwiększ: ${etykieta}`} className="szczegoly-kontrolka-liczbowa__plus" disabled={atrybuty.disabled} type="button" onClick={() => zastosujWartosc(wiekszaWartosc)}>+</button>
    </span>
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
  dopuszczajZero,
  wariantOpisu,
}: WlasciwosciPolaLiczbowego) {
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji
  const idKontrolki = pobierzIdPola(pole, idGrupy)
  const idOpisu = pobierzIdBleduPola(wariantOpisu ? `${pole}.${wariantOpisu}` : pole)
  return (
    <OpakowaniePola blad={komunikatBledu} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol} idKontrolki={idKontrolki} idOpisu={idOpisu}>
      <KontrolkaLiczbowa
        aria-describedby={komunikatBledu || pobierzKomunikatStatusu(pole, statusyPol) ? idOpisu : undefined}
        aria-invalid={Boolean(komunikatBledu)}
        disabled={disabled}
        dopuszczajZero={dopuszczajZero}
        etykieta={etykieta}
        id={idKontrolki}
        max={max}
        min={min}
        krok={krok}
        wartosc={statusyPol[pole] === 'brak' && wartosc === 0 ? '' : wartosc}
        ustawWartosc={ustawWartosc}
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

export function PoleWyboru({ etykieta, pole, statusyPol, wartosc, ustawWartosc, opcje, etykietyOpcji, niedostepneOpcje, blad, disabled, idGrupy }: WlasciwosciPolaWyboru) {
  const bladZWalidacji = useBladPola(pole, disabled)
  const komunikatBledu = blad ?? bladZWalidacji
  return (
    <OpakowaniePola blad={komunikatBledu} disabled={disabled} etykieta={etykieta} pole={pole} statusyPol={statusyPol}>
      <select aria-describedby={komunikatBledu ? pobierzIdBleduPola(pole) : undefined} aria-invalid={Boolean(komunikatBledu)} disabled={disabled} id={pobierzIdPola(pole, idGrupy)} value={wartosc} onChange={(zdarzenie) => ustawWartosc(zdarzenie.target.value)}>
        {opcje.map((opcja) => (
          <option disabled={niedostepneOpcje?.includes(opcja)} key={opcja} value={opcja}>
            {etykietyOpcji?.[opcja] ?? opcja}
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
