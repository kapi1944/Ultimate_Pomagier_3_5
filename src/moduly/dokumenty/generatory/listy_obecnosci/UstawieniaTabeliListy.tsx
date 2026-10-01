import { useId, type Dispatch, type SetStateAction } from 'react'
import type { DaneListyObecnosci } from './modelListyObecnosci'
import { maksymalnaWysokoscWierszaMm, minimalnaWysokoscWierszaMm, normalizujWygladTabeliListy, przesunWygladTabeliListy, zakresFontuTabeli, zmienWygladTabeliListy, type WygladTabeliListy } from './wygladTabeliListy'

export default function UstawieniaTabeliListy({ dane, ustawDane }: { dane: DaneListyObecnosci; ustawDane: Dispatch<SetStateAction<DaneListyObecnosci>> }) {
  const prefiks = useId()
  const wyglad = normalizujWygladTabeliListy(dane.wygladTabeli)
  const minimumWiersza = minimalnaWysokoscWierszaMm(wyglad.rozmiarTekstuPt)
  const kontrolki: { pole: keyof WygladTabeliListy; etykieta: string; minimum: number; maksimum: number; krok: number; jednostka: string }[] = [
    { pole: 'wysokoscWierszaMm', etykieta: 'Wysokość wierszy', minimum: minimumWiersza, maksimum: maksymalnaWysokoscWierszaMm, krok: 0.1, jednostka: 'mm' },
    { pole: 'rozmiarTekstuPt', etykieta: 'Rozmiar tekstu tabeli', ...{ minimum: zakresFontuTabeli.minimum, maksimum: zakresFontuTabeli.maksimum, krok: zakresFontuTabeli.krok }, jednostka: 'pt' },
    { pole: 'rozmiarNaglowkowPt', etykieta: 'Rozmiar nagłówków tabeli', ...{ minimum: zakresFontuTabeli.minimum, maksimum: zakresFontuTabeli.maksimum, krok: zakresFontuTabeli.krok }, jednostka: 'pt' },
  ]
  return <>
    {kontrolki.map(({ pole, etykieta, minimum, maksimum, krok, jednostka }) => {
      const zmien = (wartosc: number) => ustawDane((obecne) => ({ ...obecne, wygladTabeli: zmienWygladTabeliListy(normalizujWygladTabeliListy(obecne.wygladTabeli), pole, wartosc) }))
      const przesun = (kierunek: -1 | 1) => ustawDane((obecne) => ({ ...obecne, wygladTabeli: przesunWygladTabeliListy(normalizujWygladTabeliListy(obecne.wygladTabeli), pole, kierunek) }))
      return <div key={pole}>
        <label htmlFor={`${prefiks}-${pole}`}>{etykieta}</label>
        <div className="generator-list-obecnosci__regulacja">
          <button type="button" aria-label={`Zmniejsz: ${etykieta}`} disabled={wyglad[pole] <= minimum} onClick={() => przesun(-1)}>−</button>
          <input id={`${prefiks}-${pole}`} type="range" min={minimum} max={maksimum} step={krok} value={wyglad[pole]} onChange={(zdarzenie) => zmien(Number(zdarzenie.target.value))} />
          <output htmlFor={`${prefiks}-${pole}`}>{wyglad[pole].toLocaleString('pl-PL', { maximumFractionDigits: 1 })} {jednostka}</output>
          <button type="button" aria-label={`Zwiększ: ${etykieta}`} disabled={wyglad[pole] >= maksimum} onClick={() => przesun(1)}>+</button>
        </div>
      </div>
    })}
    <p className="generator-list-obecnosci__opis">Minimalna wysokość wiersza: {minimumWiersza.toLocaleString('pl-PL')} mm. Większy tekst automatycznie podnosi zbyt niski wiersz. Większe wiersze są przenoszone na kolejne strony A4.</p>
  </>
}
