import type { KeyboardEvent } from 'react'

type WlasciwosciPrzelacznika = {
  etykieta: string
  wlaczony: boolean
  ustawWlaczony: (wartosc: boolean) => void
  disabled?: boolean
}

export default function PrzelacznikTakNie({ etykieta, wlaczony, ustawWlaczony, disabled }: WlasciwosciPrzelacznika) {
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
      className={`szczegoly-przelacznik-tak-nie ${wlaczony ? 'szczegoly-przelacznik-tak-nie--tak' : 'szczegoly-przelacznik-tak-nie--nie'}`}
      disabled={disabled}
      role="switch"
      type="button"
      onClick={przelacz}
      onKeyDown={obsluzKlawisz}
    >
      <span className="szczegoly-przelacznik-tak-nie__tor">
        <span className="szczegoly-przelacznik-tak-nie__uchwyt" />
      </span>
      <span className="szczegoly-przelacznik-tak-nie__tekst">{wlaczony ? 'TAK' : 'NIE'}</span>
    </button>
  )
}
