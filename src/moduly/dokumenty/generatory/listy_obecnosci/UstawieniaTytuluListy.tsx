import { useId, type Dispatch, type SetStateAction } from 'react'
import { zmienOdstepyBlokuListy, zmienWygladTytuluListy, type DaneListyObecnosci } from './modelListyObecnosci'

export default function UstawieniaTytuluListy({ dane, ustawDane }: { dane: DaneListyObecnosci; ustawDane: Dispatch<SetStateAction<DaneListyObecnosci>> }) {
  const prefiks = useId()
  const blok = dane.blokiSwobodne.find((pozycja) => pozycja.id === 'lista-szkolenie' && pozycja.typ === 'tekst')
  if (!blok || blok.typ !== 'tekst') return <p>Dodaj blok „Tytuł szkolenia” przez przywrócenie oryginalnego układu, aby regulować tytuł.</p>
  const kontrolki: Array<{ pole: string; etykieta: string; wartosc: number; minimum: number; maksimum: number; krok: number; jednostka: string; zmien: (obecne: DaneListyObecnosci, wartosc: number) => DaneListyObecnosci }> = [
    { pole: 'rozmiarCzcionkiPt' as const, etykieta: 'Rozmiar czcionki tytułu', wartosc: blok.dane.rozmiarCzcionkiPt, minimum: 8, maksimum: 20, krok: 0.5, jednostka: 'pt', zmien: (obecne, wartosc) => zmienWygladTytuluListy(obecne, 'rozmiarCzcionkiPt', wartosc) },
    { pole: 'szerokoscMm', etykieta: 'Szerokość tytułu szkolenia', wartosc: blok.szerokoscMm, minimum: 100, maksimum: 200, krok: 1, jednostka: 'mm', zmien: (obecne, wartosc) => zmienWygladTytuluListy(obecne, 'szerokoscMm', wartosc) },
  ]
  for (const [id, nazwa] of [['lista-szkolenie', 'tytułu szkolenia'], ['lista-miejsce', 'terminu i miejsca'], ['lista-tytul', 'nagłówka „Lista obecności”']]) {
    const pozycja = dane.blokiSwobodne.find((element) => element.id === id)
    if (!pozycja || pozycja.typ !== 'tekst') continue
    for (const pole of ['wysokoscMm', 'marginesWewnetrznyMm'] as const) {
      kontrolki.push({ pole: id + '-' + pole, etykieta: (pole === 'wysokoscMm' ? 'Wysokość bloku ' : 'Padding ') + nazwa, wartosc: pole === 'wysokoscMm' ? pozycja.wysokoscMm : pozycja.dane.marginesWewnetrznyMm ?? 0, minimum: pole === 'wysokoscMm' ? 4 : 0, maksimum: pole === 'wysokoscMm' ? 30 : 5, krok: 0.5, jednostka: 'mm', zmien: (obecne, wartosc) => zmienOdstepyBlokuListy(obecne, id, pole, wartosc) })
    }
  }
  return <>
    {kontrolki.map(({ pole, etykieta, wartosc, minimum, maksimum, krok, jednostka, zmien: zastosuj }) => {
      const zmien = (nowaWartosc: number) => ustawDane((obecne) => zastosuj(obecne, nowaWartosc))
      return <div key={pole}>
        <label htmlFor={`${prefiks}-${pole}`}>{etykieta}</label>
        <div className="generator-list-obecnosci__regulacja">
          <button type="button" aria-label={`Zmniejsz: ${etykieta}`} disabled={wartosc <= minimum} onClick={() => zmien(wartosc - krok)}>−</button>
          <input id={`${prefiks}-${pole}`} type="range" min={minimum} max={maksimum} step={krok} value={wartosc} onChange={(zdarzenie) => zmien(Number(zdarzenie.target.value))} />
          <output htmlFor={`${prefiks}-${pole}`}>{wartosc.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} {jednostka}</output>
          <button type="button" aria-label={`Zwiększ: ${etykieta}`} disabled={wartosc >= maksimum} onClick={() => zmien(wartosc + krok)}>+</button>
        </div>
      </div>
    })}
    <p className="generator-list-obecnosci__opis">Przesunięcie suwaka szerokości w prawo poszerza wyśrodkowany tytuł. Wysokość bloku reguluje pustą przestrzeń pod tekstem, a padding odstęp wewnętrzny z każdej strony. Sprawdź, czy cały tekst mieści się w bloku. Pozycje pozostałych bloków nie przesuwają się automatycznie.</p>
  </>
}
