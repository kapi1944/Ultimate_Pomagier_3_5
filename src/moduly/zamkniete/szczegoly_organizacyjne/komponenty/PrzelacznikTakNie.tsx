import type { KeyboardEvent } from 'react'
import { pobierzIdBleduPola } from './identyfikatoryPol'
import { useBladPola } from './stanBledowPol'
import '../widoki/widokNowychSzczegolowOrganizacyjnych.css'

type WariantPrzelacznika = 'tak-nie' | 'aktywny-nieaktywny' | 'druk-online' | 'potwierdzony-niepotwierdzony'

type WlasciwosciPrzelacznika = {
  etykieta: string
  wlaczony: boolean
  ustawWlaczony: (wartosc: boolean) => void
  disabled?: boolean
  pole?: string
  wariant?: WariantPrzelacznika
}

const etykietyWariantow: Record<WariantPrzelacznika, { wlaczony: string; wylaczony: string; klasa: string }> = {
  'tak-nie': { wlaczony: 'TAK', wylaczony: 'NIE', klasa: '' },
  'aktywny-nieaktywny': { wlaczony: 'Aktywny', wylaczony: 'Nieaktywny', klasa: 'szczegoly-przelacznik-Aktywny-Nieaktywny' },
  'druk-online': { wlaczony: 'Druk', wylaczony: 'Online', klasa: 'szczegoly-przelacznik-Druk-Online' },
  'potwierdzony-niepotwierdzony': { wlaczony: '✓ Potwierdzony', wylaczony: '✕ Niepotwierdzony', klasa: 'szczegoly-przelacznik-Potwierdzony-Niepotwierdzony' },
}

export default function PrzelacznikTakNie({ etykieta, wlaczony, ustawWlaczony, disabled, pole, wariant = 'tak-nie' }: WlasciwosciPrzelacznika) {
  const ustawieniaWariantu = etykietyWariantow[wariant]
  const blad = useBladPola(pole ?? '', disabled)

  function przelacz() {
    if (!disabled) {
      ustawWlaczony(!wlaczony)
    }
  }

  function obsluzKlawisz(zdarzenie: KeyboardEvent<HTMLButtonElement>) {
    if (zdarzenie.key === 'Enter' || zdarzenie.key === ' ') {
      zdarzenie.preventDefault()
      przelacz()
    }
  }

  return (
    <button
      aria-checked={wlaczony}
      aria-describedby={blad && pole ? pobierzIdBleduPola(pole) : undefined}
      aria-invalid={Boolean(blad)}
      aria-label={etykieta}
      className={`szczegoly-przelacznik-tak-nie ${ustawieniaWariantu.klasa} ${wlaczony ? 'szczegoly-przelacznik-tak-nie--tak' : 'szczegoly-przelacznik-tak-nie--nie'}`}
      disabled={disabled}
      role="switch"
      type="button"
      onClick={przelacz}
      onKeyDown={obsluzKlawisz}
    >
      <span className="szczegoly-przelacznik-tak-nie__tor">
        <span className="szczegoly-przelacznik-tak-nie__uchwyt" />
      </span>
      <span className="szczegoly-przelacznik-tak-nie__tekst">{wlaczony ? ustawieniaWariantu.wlaczony : ustawieniaWariantu.wylaczony}</span>
    </button>
  )
}
