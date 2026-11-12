import { useState, type ChangeEvent } from 'react'
import type { LokalizacjaMapy } from '../modele/zakupy'
import { pobierzSciezkeLokalizacji, typyLokalizacji } from '../logika/mapaMagazynu'
import SelektorLokalizacji from './SelektorLokalizacji'

export default function EdytorLokalizacji({ lokalizacja, lokalizacje, zmien, wczytajZdjecie, czyWczytywanie, ustawNiezapisanePola }: {
  lokalizacja: LokalizacjaMapy
  lokalizacje: LokalizacjaMapy[]
  zmien: (lokalizacja: LokalizacjaMapy) => boolean
  ustawNiezapisanePola: (wartosc: boolean) => void
  wczytajZdjecie: (zdarzenie: ChangeEvent<HTMLInputElement>) => void
  czyWczytywanie: boolean
}) {
  const [pola, ustawPola] = useState({ kod: lokalizacja.kod, nazwa: lokalizacja.nazwa, typ: lokalizacja.typ, nadrzednaLokalizacjaId: lokalizacja.nadrzednaLokalizacjaId, kolejnosc: lokalizacja.kolejnosc, opis: lokalizacja.opis, czyAktywna: lokalizacja.czyAktywna })
  function zmienPola(nowe: typeof pola) { ustawPola(nowe); ustawNiezapisanePola(true) }
  return <fieldset className="mapa-magazynu__formularz" disabled={czyWczytywanie}>
    <legend>Edycja lokalizacji</legend>
    <form onSubmit={(zdarzenie) => { zdarzenie.preventDefault(); if (zmien({ ...lokalizacja, ...pola })) ustawNiezapisanePola(false) }}>
      <label>Kod<input required value={pola.kod} onChange={(zdarzenie) => zmienPola({ ...pola, kod: zdarzenie.target.value })} /></label>
      <label>Nazwa<input required value={pola.nazwa} onChange={(zdarzenie) => zmienPola({ ...pola, nazwa: zdarzenie.target.value })} /></label>
      <label>Typ<select value={pola.typ} onChange={(zdarzenie) => {
        const wybrany = typyLokalizacji.find(({ typ }) => typ === zdarzenie.target.value)
        if (wybrany) zmienPola({ ...pola, typ: wybrany.typ })
      }}>{typyLokalizacji.map(({ typ, etykieta }) => <option key={typ} value={typ}>{etykieta}</option>)}</select></label>
      <SelektorLokalizacji etykieta="Lokalizacja nadrzędna" lokalizacje={lokalizacje.filter((obecna) => !pobierzSciezkeLokalizacji(lokalizacje, obecna.id).includes(lokalizacja.id))} wartosc={pola.nadrzednaLokalizacjaId ?? ''} wybierz={(id) => zmienPola({ ...pola, nadrzednaLokalizacjaId: id || undefined })} />
      <label>Kolejność<input required type="number" min={0} step={1} value={pola.kolejnosc} onChange={(zdarzenie) => zmienPola({ ...pola, kolejnosc: zdarzenie.target.valueAsNumber })} /></label>
      <label>Opis<textarea value={pola.opis ?? ''} onChange={(zdarzenie) => zmienPola({ ...pola, opis: zdarzenie.target.value })} /></label>
      <label><input type="checkbox" role="switch" checked={pola.czyAktywna} onChange={(zdarzenie) => zmienPola({ ...pola, czyAktywna: zdarzenie.target.checked })} /> Lokalizacja aktywna</label>
      <button type="submit">Zastosuj edycję lokalizacji</button>
    </form>
    <label><input type="checkbox" role="switch" checked={Boolean(lokalizacja.polozenieNaMapie)} onChange={(zdarzenie) => zmien({ ...lokalizacja, polozenieNaMapie: zdarzenie.target.checked ? { x: 5, y: 5, szerokosc: 25, wysokosc: 20 } : undefined })} /> Pokaż na mapie</label>
    {lokalizacja.polozenieNaMapie && <div className="mapa-magazynu__wymiary">
      {([{ klucz: 'x', etykieta: 'X (%)' }, { klucz: 'y', etykieta: 'Y (%)' }, { klucz: 'szerokosc', etykieta: 'Szerokość (%)' }, { klucz: 'wysokosc', etykieta: 'Wysokość (%)' }] as const).map(({ klucz, etykieta }) => <label key={klucz}>{etykieta}<input type="number" min={klucz === 'x' || klucz === 'y' ? 0 : 5} max={100} step="any" value={lokalizacja.polozenieNaMapie![klucz]} onChange={(zdarzenie) => {
        const liczba = zdarzenie.target.valueAsNumber
        if (Number.isFinite(liczba) && lokalizacja.polozenieNaMapie) zmien({ ...lokalizacja, polozenieNaMapie: { ...lokalizacja.polozenieNaMapie, [klucz]: liczba } })
      }} /></label>)}
    </div>}
    <label>Zdjęcie referencyjne (PNG, JPEG lub WebP do 512 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={wczytajZdjecie} /></label>
    {lokalizacja.zdjecie && <button type="button" onClick={() => zmien({ ...lokalizacja, zdjecie: undefined })}>Usuń zdjęcie</button>}
  </fieldset>
}
