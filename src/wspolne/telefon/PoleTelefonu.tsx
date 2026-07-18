import { useId } from 'react'
import type { Telefon } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import {
  innyKrajTelefonu,
  krajeTelefonow,
  normalizujPrefiks,
  normalizujTelefon,
  pobierzBladTelefonu,
  pobierzKrajTelefonu,
} from './telefon'
import './poleTelefonu.css'

type WlasciwosciPolaTelefonu = {
  telefon: Telefon
  onChange: (telefon: Telefon) => void
  wymagany?: boolean
}

export default function PoleTelefonu({ telefon, onChange, wymagany = true }: WlasciwosciPolaTelefonu) {
  const id = useId()
  const kraj = pobierzKrajTelefonu(telefon)
  const blad = pobierzBladTelefonu(telefon, wymagany)
  const czyPokazacBlad = Boolean(blad && (wymagany || telefon.numer.trim()))

  return (
    <div className="pole-telefonu">
      <select
        aria-label="Kraj i numer kierunkowy"
        onChange={(zdarzenie) => {
          const wybrany = [...krajeTelefonow, innyKrajTelefonu].find((opcja) => opcja.iso2 === zdarzenie.target.value) ?? innyKrajTelefonu
          onChange(normalizujTelefon({
            ...telefon,
            krajIso2: wybrany.iso2,
            prefiks: wybrany.prefiks,
          }))
        }}
        value={kraj.iso2}
      >
        {[...krajeTelefonow, innyKrajTelefonu].map((opcja) => (
          <option key={opcja.iso2} value={opcja.iso2}>
            {opcja.flaga} {opcja.nazwa} {opcja.prefiks}
          </option>
        ))}
      </select>

      {kraj.iso2 === 'INNY' && (
        <input
          aria-label="Własny prefiks kraju"
          className="pole-telefonu__prefiks"
          inputMode="tel"
          onChange={(zdarzenie) => onChange(normalizujTelefon({
            ...telefon,
            krajIso2: 'INNY',
            prefiks: normalizujPrefiks(zdarzenie.target.value),
          }))}
          value={telefon.prefiks}
        />
      )}

      <input
        aria-describedby={czyPokazacBlad ? `${id}-blad` : undefined}
        aria-invalid={czyPokazacBlad}
        inputMode="numeric"
        onChange={(zdarzenie) => onChange(normalizujTelefon({ ...telefon, numer: zdarzenie.target.value }))}
        placeholder={kraj.iso2 === 'PL' ? '500 000 001' : 'Numer krajowy'}
        required={wymagany}
        type="tel"
        value={telefon.numer}
      />

      {czyPokazacBlad && <small className="pole-telefonu__blad" id={`${id}-blad`}>{blad}</small>}
    </div>
  )
}
