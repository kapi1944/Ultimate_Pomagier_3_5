import { useState, type SubmitEvent } from 'react'
import type { LokalizacjaMapy } from '../modele/zakupy'
import { normalizujKodLokalizacji, typyLokalizacji, type NowaStrukturaLokalizacji } from '../logika/mapaMagazynu'
import SelektorLokalizacji from './SelektorLokalizacji'

export default function KreatorLokalizacji({ lokalizacje, rodzicId, utworz, zamknij }: {
  lokalizacje: LokalizacjaMapy[]; rodzicId?: string; utworz: (dane: NowaStrukturaLokalizacji) => boolean; zamknij: () => void
}) {
  const [dane, ustawDane] = useState<NowaStrukturaLokalizacji>({ nazwa: '', kod: '', typ: 'REGAL', rodzicId, liczbaPolek: 5, czyNaMapie: false })
  function zatwierdz(zdarzenie: SubmitEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()
    if (utworz(dane)) zamknij()
  }
  return <form onSubmit={zatwierdz} className="mapa-magazynu__formularz" aria-label="Kreator lokalizacji">
    <h3>Utwórz strukturę lokalizacji</h3>
    <label>Typ nowej lokalizacji<select value={dane.typ} onChange={(zdarzenie) => { const wybrany = typyLokalizacji.find(({ typ }) => typ === zdarzenie.target.value); if (wybrany) ustawDane({ ...dane, typ: wybrany.typ }) }}>{typyLokalizacji.map(({ typ, etykieta }) => <option key={typ} value={typ}>{etykieta}</option>)}</select></label>
    <label>Nazwa nowej lokalizacji<input required value={dane.nazwa} onChange={(zdarzenie) => ustawDane({ ...dane, nazwa: zdarzenie.target.value, kod: dane.kod === normalizujKodLokalizacji(dane.nazwa) ? normalizujKodLokalizacji(zdarzenie.target.value) : dane.kod })} /></label>
    <label>Kod lokalny<input required value={dane.kod} onChange={(zdarzenie) => ustawDane({ ...dane, kod: zdarzenie.target.value })} /></label>
    <p>Adres: {[lokalizacje.find((lokalizacja) => lokalizacja.id === dane.rodzicId)?.pelnyKod, normalizujKodLokalizacji(dane.kod)].filter(Boolean).join('/') || 'Podaj kod'}</p>
    <SelektorLokalizacji etykieta="Rodzic nowej lokalizacji" lokalizacje={lokalizacje} wartosc={dane.rodzicId ?? ''} wybierz={(id) => ustawDane({ ...dane, rodzicId: id || undefined })} />
    <label>Liczba półek<input type="number" min={0} max={500} required value={dane.liczbaPolek} onChange={(zdarzenie) => ustawDane({ ...dane, liczbaPolek: zdarzenie.target.valueAsNumber })} /></label>
    <label><input type="checkbox" role="switch" checked={dane.czyNaMapie} onChange={(zdarzenie) => ustawDane({ ...dane, czyNaMapie: zdarzenie.target.checked })} /> Umieść nową lokalizację na mapie</label>
    <p>Półki otrzymają kody POLKA-1, POLKA-2… i pozostaną bez geometrii do czasu umieszczenia na mapie.</p>
    <div className="zakupy__nawigacja"><button type="submit">Utwórz strukturę</button><button type="button" onClick={zamknij}>Zamknij kreator</button></div>
  </form>
}
