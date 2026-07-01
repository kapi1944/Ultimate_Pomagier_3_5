import type { KeyboardEvent } from 'react'
import '../widoki/widokNowychSzczegolowOrganizacyjnych.css'

type WariantPrzelacznika = 'tak-nie' | 'aktywny-nieaktywny' | 'druk-online' | 'potwierdzony-niepotwierdzony'

type WlasciwosciPrzelacznika = {
  etykieta: string
  wlaczony: boolean
  ustawWlaczony: (wartosc: boolean) => void
  disabled?: boolean
  wariant?: WariantPrzelacznika
}

const etykietyWariantow: Record<WariantPrzelacznika, { wlaczony: string; wylaczony: string; klasa: string }> = {
  'tak-nie': { wlaczony: 'TAK', wylaczony: 'NIE', klasa: '' },
  'aktywny-nieaktywny': { wlaczony: 'Aktywny', wylaczony: 'Nieaktywny', klasa: 'szczegoly-przelacznik-Aktywny-Nieaktywny' },
  'druk-online': { wlaczony: 'Druk', wylaczony: 'Online', klasa: 'szczegoly-przelacznik-Druk-Online' },
  'potwierdzony-niepotwierdzony': { wlaczony: '✓ Potwierdzony', wylaczony: '✕ Niepotwierdzony', klasa: 'szczegoly-przelacznik-Potwierdzony-Niepotwierdzony' },
}

export default function PrzelacznikTakNie({ etykieta, wlaczony, ustawWlaczony, disabled, wariant = 'tak-nie' }: WlasciwosciPrzelacznika) {
  const ustawieniaWariantu = etykietyWariantow[wariant]

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
