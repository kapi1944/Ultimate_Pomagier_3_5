import { useState } from 'react'
import type { LokalizacjaMapy } from '../modele/zakupy'
import { uporzadkujLokalizacje, wyszukajLokalizacje } from '../logika/mapaMagazynu'

export default function SelektorLokalizacji({ lokalizacje, wartosc, wybierz, etykieta, utworz, wymagany = false }: {
  lokalizacje: LokalizacjaMapy[]; wartosc: string; wybierz: (id: string) => void; etykieta: string; utworz?: () => void; wymagany?: boolean
}) {
  const [fraza, ustawFraze] = useState('')
  const wyniki = new Set(wyszukajLokalizacje(lokalizacje, fraza).map((lokalizacja) => lokalizacja.id))
  return <div className="mapa-magazynu__selektor">
    <label>Szukaj: {etykieta}<input type="search" value={fraza} placeholder="Nazwa, kod lub pełny adres" onChange={(zdarzenie) => ustawFraze(zdarzenie.target.value)} /></label>
    <label>{etykieta}<select required={wymagany} value={wartosc} onChange={(zdarzenie) => wybierz(zdarzenie.target.value)}>
      <option value="">{wymagany ? 'Wybierz lokalizację' : 'Brak'}</option>
      {uporzadkujLokalizacje(lokalizacje).filter((lokalizacja) => wyniki.has(lokalizacja.id) || lokalizacja.id === wartosc).map((lokalizacja) => <option key={lokalizacja.id} value={lokalizacja.id}>{lokalizacja.pelnyKod} — {lokalizacja.nazwa}{!lokalizacja.czyAktywna ? ' (nieaktywna)' : ''}</option>)}
    </select></label>
    {!wyniki.size && <p>Brak pasujących lokalizacji.</p>}
    {utworz && <button type="button" onClick={utworz}>Utwórz brakującą lokalizację</button>}
  </div>
}
