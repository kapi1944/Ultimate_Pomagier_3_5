import { pobierzIdBleduPola, pobierzIdPola } from './identyfikatoryPol'
import { KontrolkaLiczbowa, ZnacznikBleduPola } from './PolaSzczegolow'
import { useBladPola } from './stanBledowPol'

type WlasciwosciPolaMinutWczesniejszegoPrzyjazdu = {
  wartosc: number
  ustawWartosc: (wartosc: number) => void
}

const pole = 'dodatkoweWymogi.minutyWczesniej'
const idKontrolki = pobierzIdPola(pole)

export default function PoleMinutWczesniejszegoPrzyjazdu({ wartosc, ustawWartosc }: WlasciwosciPolaMinutWczesniejszegoPrzyjazdu) {
  const blad = useBladPola(pole)

  return (
    <div className="szczegoly-pole-minut">
      <label className="szczegoly-pole__etykieta" htmlFor={idKontrolki}>Ile minut:<ZnacznikBleduPola blad={blad} /></label>
      <KontrolkaLiczbowa aria-describedby={blad ? pobierzIdBleduPola(pole) : undefined} aria-invalid={Boolean(blad)} etykieta="Minuty wcześniejszego przyjazdu" id={idKontrolki} min={0} wartosc={wartosc} ustawWartosc={ustawWartosc} />
      {blad && <span className="szczegoly-pole__blad" id={pobierzIdBleduPola(pole)}>{blad}</span>}
    </div>
  )
}
