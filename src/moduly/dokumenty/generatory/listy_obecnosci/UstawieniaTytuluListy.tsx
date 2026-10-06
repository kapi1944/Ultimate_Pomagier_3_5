import { useId, type Dispatch, type SetStateAction } from 'react'
import { zmienWygladTytuluListy, type DaneListyObecnosci } from './modelListyObecnosci'

export default function UstawieniaTytuluListy({ dane, ustawDane }: { dane: DaneListyObecnosci; ustawDane: Dispatch<SetStateAction<DaneListyObecnosci>> }) {
  const prefiks = useId()
  const blok = dane.blokiSwobodne.find((pozycja) => pozycja.id === 'lista-szkolenie' && pozycja.typ === 'tekst')
  if (!blok || blok.typ !== 'tekst') return <p>Dodaj blok „Tytuł szkolenia” przez przywrócenie oryginalnego układu, aby regulować tytuł.</p>
  const kontrolki = [
    { pole: 'rozmiarCzcionkiPt' as const, etykieta: 'Rozmiar czcionki tytułu szkolenia', wartosc: blok.dane.rozmiarCzcionkiPt, minimum: 8, maksimum: 20, krok: 0.5, jednostka: 'pt' },
    { pole: 'marginesMm' as const, etykieta: 'Symetryczne marginesy tytułu', wartosc: blok.xMm, minimum: 5, maksimum: 55, krok: 1, jednostka: 'mm' },
  ]
  return <>
    {kontrolki.map(({ pole, etykieta, wartosc, minimum, maksimum, krok, jednostka }) => {
      const zmien = (nowaWartosc: number) => ustawDane((obecne) => zmienWygladTytuluListy(obecne, pole, nowaWartosc))
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
    <p className="generator-list-obecnosci__opis">Margines liczony od krawędzi A4 z każdej strony. Mniejsze marginesy poszerzają tytuł i ograniczają zawijanie. Sprawdź, czy cały tytuł mieści się nad miejscem i terminem.</p>
  </>
}
