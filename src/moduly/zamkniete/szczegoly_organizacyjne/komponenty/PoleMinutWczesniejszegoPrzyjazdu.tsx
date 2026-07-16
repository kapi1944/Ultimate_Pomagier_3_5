import { pobierzIdBleduPola } from './identyfikatoryPol'
import { ZnacznikBleduPola } from './PolaSzczegolow'
import { useBladPola } from './stanBledowPol'

type WlasciwosciPolaMinutWczesniejszegoPrzyjazdu = {
  wartosc: number
  ustawWartosc: (wartosc: number) => void
}

const pole = 'dodatkoweWymogi.minutyWczesniej'

export default function PoleMinutWczesniejszegoPrzyjazdu({ wartosc, ustawWartosc }: WlasciwosciPolaMinutWczesniejszegoPrzyjazdu) {
  const blad = useBladPola(pole)

  return (
    <label className="szczegoly-pole-minut">
      <span className="szczegoly-pole__etykieta">Ile minut:<ZnacznikBleduPola blad={blad} /></span>
      <input aria-describedby={blad ? pobierzIdBleduPola(pole) : undefined} aria-invalid={Boolean(blad)} min={0} step={1} type="number" value={wartosc} onChange={(zdarzenie) => ustawWartosc(Number(zdarzenie.target.value))} />
      {blad && <span className="szczegoly-pole__blad" id={pobierzIdBleduPola(pole)}>{blad}</span>}
    </label>
  )
}
