import { useState } from 'react'
import type { LokalizacjaMapy, StanWLokalizacji } from '../modele/zakupy'
import { pobierzSciezkeLokalizacji, uporzadkujLokalizacje, wyszukajLokalizacje } from '../logika/mapaMagazynu'

export default function DrzewoLokalizacji({ lokalizacje, stany, wybranaId, fraza, ustawFraze, wybierz, dodaj, czyEdycja }: {
  lokalizacje: LokalizacjaMapy[]; stany: StanWLokalizacji[]; wybranaId: string | null; fraza: string; ustawFraze: (fraza: string) => void; wybierz: (id: string) => void; dodaj: (id: string) => void; czyEdycja: boolean
}) {
  const [zwiniete, ustawZwiniete] = useState(new Set<string>())
  const trafienia = wyszukajLokalizacje(lokalizacje, fraza)
  const widoczne = new Set(trafienia.flatMap((lokalizacja) => pobierzSciezkeLokalizacji(lokalizacje, lokalizacja.id)))
  function galaz(rodzicId?: string) {
    return <ul>{uporzadkujLokalizacje(lokalizacje).filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === rodzicId && widoczne.has(lokalizacja.id)).map((lokalizacja) => {
      const dzieci = lokalizacje.some((obecna) => obecna.nadrzednaLokalizacjaId === lokalizacja.id)
      const rozwinieta = Boolean(fraza) || !zwiniete.has(lokalizacja.id)
      const zawartosc = stany.filter((stan) => pobierzSciezkeLokalizacji(lokalizacje, stan.lokalizacjaId).includes(lokalizacja.id))
      return <li key={lokalizacja.id}>
        <div className="mapa-magazynu__wezel">
          {dzieci && <button type="button" aria-expanded={rozwinieta} aria-label={`${rozwinieta ? 'Zwiń' : 'Rozwiń'} ${lokalizacja.pelnyKod}`} onClick={() => ustawZwiniete((obecne) => { const nowe = new Set(obecne); if (nowe.has(lokalizacja.id)) nowe.delete(lokalizacja.id); else nowe.add(lokalizacja.id); return nowe })}>{rozwinieta ? '▾' : '▸'}</button>}
          <button type="button" aria-current={wybranaId === lokalizacja.id ? 'location' : undefined} onClick={() => wybierz(lokalizacja.id)} title={lokalizacja.pelnyKod}><strong>{lokalizacja.kod}</strong> — {lokalizacja.nazwa}<small>{lokalizacja.pelnyKod}{!lokalizacja.czyAktywna && ' · Nieaktywna'}{!lokalizacja.polozenieNaMapie && ' · Bez pozycji na mapie'}<br />Produkty: {new Set(zawartosc.map((stan) => stan.produktId)).size} · Pozycje stanów: {zawartosc.length}</small></button>
          {czyEdycja && <button type="button" aria-label={`Dodaj element podrzędny: ${lokalizacja.pelnyKod}`} onClick={() => dodaj(lokalizacja.id)}>+</button>}
        </div>
        {dzieci && rozwinieta && galaz(lokalizacja.id)}
      </li>
    })}</ul>
  }
  return <nav className="mapa-magazynu__drzewo" aria-label="Drzewo lokalizacji">
    <h3>Lokalizacje</h3>
    <label>Szukaj lokalizacji<input type="search" value={fraza} onChange={(zdarzenie) => ustawFraze(zdarzenie.target.value)} placeholder="Nazwa lub adres" /></label>
    {!trafienia.length && <p>Brak pasujących lokalizacji.</p>}
    {galaz()}
  </nav>
}
