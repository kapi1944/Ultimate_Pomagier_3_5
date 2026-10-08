import { useId, useState, type SyntheticEvent } from 'react'
import type { StanZakupow } from '../modele/zakupy'
import { czyWierszPasujeDoFiltra, filtryStanow, obliczMiarkeStanu, wyliczStanyMagazynowe, type FiltrStanow } from '../logika/stanyMagazynowe'
import './stanyMagazynowe.css'

function MiarkaStanu({ stan, cel, minimum }: { stan: number; cel?: number; minimum?: number }) {
  const idOpisu = useId()
  const [pozycjaTooltipu, ustawPozycjeTooltipu] = useState<{ left: number; top: number } | null>(null)
  const miarka = obliczMiarkeStanu(stan, cel)
  const poziom = miarka.procent === null ? 'brak celu' : `${miarka.procent.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`
  const opis = `Stan: ${stan}\nDocelowo: ${miarka.procent === null ? 'brak celu' : cel}\nPoziom: ${poziom}\nMinimum: ${minimum ?? 'nie ustawiono'}`

  function pokazTooltip(zdarzenie: SyntheticEvent<HTMLDivElement>) {
    const prostokat = zdarzenie.currentTarget.getBoundingClientRect()
    ustawPozycjeTooltipu({ left: Math.max(8, Math.min(prostokat.left, window.innerWidth - 216)), top: Math.max(8, Math.min(prostokat.bottom + 6, window.innerHeight - 118)) })
  }

  return (
    <div className="miarka-stanu" tabIndex={0} role="img" aria-label={`Poziom zapasu: ${poziom}`} aria-describedby={idOpisu}
      onMouseEnter={pokazTooltip} onFocus={pokazTooltip} onMouseLeave={() => ustawPozycjeTooltipu(null)} onBlur={() => ustawPozycjeTooltipu(null)}
      onKeyDown={(zdarzenie) => { if (zdarzenie.key === 'Escape') ustawPozycjeTooltipu(null) }}>
      <span className={`miarka-stanu__segmenty miarka-stanu__segmenty--${miarka.kolor}`} aria-hidden="true">
        {Array.from({ length: 10 }, (_, indeks) => <span key={indeks} className={`miarka-stanu__segment${indeks < miarka.aktywneSegmenty ? ' miarka-stanu__segment--aktywny' : ''}`} />)}
      </span>
      <span aria-hidden="true">{poziom}</span>
      <span className="miarka-stanu__tooltip" id={idOpisu} role="tooltip" hidden={!pozycjaTooltipu} style={pozycjaTooltipu ?? undefined}>{opis}</span>
    </div>
  )
}

export default function WidokStanowMagazynowych({ dane }: { dane: StanZakupow }) {
  const [filtr, ustawFiltr] = useState<FiltrStanow>('wszystkie')
  const wiersze = wyliczStanyMagazynowe(dane).filter((wiersz) => czyWierszPasujeDoFiltra(wiersz, filtr))

  return (
    <section className="stany-magazynowe" aria-labelledby="stany-magazynowe-tytul">
      <h2 id="stany-magazynowe-tytul">Stan magazynowy</h2>
      <p>Stan produktu łącznie obejmuje wszystkie jego warianty i lokalizacje. Wiersze wariantów pokazują części tej sumy.</p>
      <div className="zakupy__nawigacja" role="group" aria-label="Filtry stanów magazynowych">
        {filtryStanow.map((pozycja) => <button key={pozycja.id} type="button" aria-pressed={filtr === pozycja.id} onClick={() => ustawFiltr(pozycja.id)}>{pozycja.etykieta}</button>)}
      </div>
      <p className="stany-magazynowe__wynik" role="status">Widoczne pozycje: {wiersze.length}</p>
      <div className="stany-magazynowe__tabela" tabIndex={0} role="region" aria-label="Tabela stanów magazynowych, przewijana poziomo">
        <table>
          <caption>Stany produktów i wariantów według lokalizacji</caption>
          <thead><tr>
            {['Produkt', 'Wariant', 'Lokalizacja / liczba lokalizacji', 'Stan', 'Minimum', 'Docelowo', 'Miarka stanu', 'Ostatnia inwentaryzacja', 'Akcje'].map((etykieta) => <th scope="col" key={etykieta}>{etykieta}</th>)}
          </tr></thead>
          <tbody>
            {wiersze.map((wiersz) => <tr key={wiersz.id}>
              <th scope="row">{wiersz.produkt.nazwa}</th>
              <td>{wiersz.wariant?.nazwa ?? 'Produkt łącznie'}</td>
              <td>{wiersz.lokalizacje.length === 1 ? wiersz.lokalizacje[0].nazwa : `Liczba lokalizacji: ${wiersz.lokalizacje.length}`}</td>
              <td>{wiersz.stan.toLocaleString('pl-PL')} {wiersz.produkt.jednostkaMiary}</td>
              <td>{wiersz.minimum ?? 'Nie ustawiono'}</td>
              <td>{wiersz.cel ?? 'Nie ustawiono'}</td>
              <td><MiarkaStanu stan={wiersz.stan} cel={wiersz.cel} minimum={wiersz.minimum} /></td>
              <td>
                {wiersz.ostatniaInwentaryzacja ? <time dateTime={wiersz.ostatniaInwentaryzacja}>{wiersz.ostatniaInwentaryzacja.slice(0, 10)}</time> : 'Brak przeliczenia'}
                {wiersz.czyDoPrzeliczenia && <p>Do przeliczenia</p>}
              </td>
              <td><details>
                <summary>Lokalizacje <span className="stany-magazynowe__etykieta-akcji">— {wiersz.produkt.nazwa}, {wiersz.wariant?.nazwa ?? 'łącznie'}</span></summary>
                {wiersz.lokalizacje.length ? <ul>{wiersz.lokalizacje.map((lokalizacja) => <li key={lokalizacja.id}>{lokalizacja.nazwa}: {lokalizacja.ilosc} {wiersz.produkt.jednostkaMiary}</li>)}</ul> : <p>Brak stanów w lokalizacjach.</p>}
              </details></td>
            </tr>)}
            {!wiersze.length && <tr><td colSpan={9}>{dane.produkty.length ? 'Brak pozycji spełniających wybrany filtr.' : 'Brak produktów w katalogu. Stany pojawią się po uzupełnieniu katalogu i lokalizacji magazynowych.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <p>Do zamówienia: brak zapasu lub stan poniżej minimum. Niski stan: 1–6 segmentów; prawidłowy: 7–10. Brak celu nie określa poziomu zapasu.</p>
    </section>
  )
}
