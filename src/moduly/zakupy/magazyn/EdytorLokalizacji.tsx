import type { ChangeEvent } from 'react'
import type { LokalizacjaMapy } from '../modele/zakupy'
import { typyLokalizacji } from '../logika/mapaMagazynu'

export default function EdytorLokalizacji({ lokalizacja, lokalizacje, zmien, wczytajZdjecie, czyWczytywanie }: {
  lokalizacja: LokalizacjaMapy
  lokalizacje: LokalizacjaMapy[]
  zmien: (lokalizacja: LokalizacjaMapy) => void
  wczytajZdjecie: (zdarzenie: ChangeEvent<HTMLInputElement>) => void
  czyWczytywanie: boolean
}) {
  const poziom = typyLokalizacji.findIndex(({ typ }) => typ === lokalizacja.typ)
  return <fieldset className="mapa-magazynu__formularz" disabled={czyWczytywanie}>
    <legend>Edycja lokalizacji</legend>
    <label>Kod<input value={lokalizacja.kod} onChange={(zdarzenie) => zmien({ ...lokalizacja, kod: zdarzenie.target.value })} /></label>
    <label>Nazwa<input value={lokalizacja.nazwa} onChange={(zdarzenie) => zmien({ ...lokalizacja, nazwa: zdarzenie.target.value })} /></label>
    <label>Typ<select value={lokalizacja.typ} onChange={(zdarzenie) => {
      const wybrany = typyLokalizacji.find(({ typ }) => typ === zdarzenie.target.value)
      if (wybrany) zmien({ ...lokalizacja, typ: wybrany.typ, nadrzednaLokalizacjaId: wybrany.typ === 'OBIEKT' ? undefined : lokalizacja.nadrzednaLokalizacjaId })
    }}>{typyLokalizacji.map(({ typ, etykieta }) => <option key={typ} value={typ}>{etykieta}</option>)}</select></label>
    <label>Lokalizacja nadrzędna<select value={lokalizacja.nadrzednaLokalizacjaId ?? ''} disabled={poziom === 0} onChange={(zdarzenie) => zmien({ ...lokalizacja, nadrzednaLokalizacjaId: zdarzenie.target.value || undefined })}>
      <option value="">Brak</option>
      {lokalizacje.filter((obecna) => obecna.typ === typyLokalizacji[poziom - 1]?.typ && obecna.id !== lokalizacja.id).map((obecna) => <option key={obecna.id} value={obecna.id}>{obecna.kod} — {obecna.nazwa}</option>)}
    </select></label>
    <label>Opis<textarea value={lokalizacja.opis ?? ''} onChange={(zdarzenie) => zmien({ ...lokalizacja, opis: zdarzenie.target.value })} /></label>
    <label><input type="checkbox" role="switch" checked={lokalizacja.czyAktywna} onChange={(zdarzenie) => zmien({ ...lokalizacja, czyAktywna: zdarzenie.target.checked })} /> Lokalizacja aktywna</label>
    <div className="mapa-magazynu__wymiary">
      {([{ klucz: 'x', etykieta: 'X (%)' }, { klucz: 'y', etykieta: 'Y (%)' }, { klucz: 'szerokosc', etykieta: 'Szerokość (%)' }, { klucz: 'wysokosc', etykieta: 'Wysokość (%)' }] as const).map(({ klucz, etykieta }) => <label key={klucz}>{etykieta}<input type="number" min={klucz === 'x' || klucz === 'y' ? 0 : 5} max={100} step="any" value={lokalizacja.polozenieNaMapie[klucz]} onChange={(zdarzenie) => {
        const liczba = zdarzenie.target.valueAsNumber
        if (Number.isFinite(liczba)) zmien({ ...lokalizacja, polozenieNaMapie: { ...lokalizacja.polozenieNaMapie, [klucz]: liczba } })
      }} /></label>)}
    </div>
    <label>Zdjęcie referencyjne (PNG, JPEG lub WebP do 512 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={wczytajZdjecie} /></label>
    {lokalizacja.zdjecie && <button type="button" onClick={() => zmien({ ...lokalizacja, zdjecie: undefined })}>Usuń zdjęcie</button>}
  </fieldset>
}
