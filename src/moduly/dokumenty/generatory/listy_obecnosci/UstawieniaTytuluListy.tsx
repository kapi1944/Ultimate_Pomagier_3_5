import { useId, type Dispatch, type SetStateAction } from 'react'
import { zmienOdstepyBlokuListy, zmienWygladTytuluListy, type DaneListyObecnosci } from './modelListyObecnosci'

export default function UstawieniaTytuluListy({ dane, ustawDane }: { dane: DaneListyObecnosci; ustawDane: Dispatch<SetStateAction<DaneListyObecnosci>> }) {
  const prefiks = useId()
  return <>
    {([['lista-tytul', 'Nagłówek'], ['lista-szkolenie', 'Tytuł'], ['lista-miejsce', 'Termin i miejsce']] as const).map(([id, nazwa]) => {
      const blok = dane.blokiSwobodne.find((pozycja) => pozycja.id === id)
      if (!blok || blok.typ !== 'tekst') return null
      const kontrolki = [
        { pole: 'rozmiarCzcionkiPt', etykieta: '🔤 Rozmiar czcionki', wartosc: blok.dane.rozmiarCzcionkiPt, minimum: 8, maksimum: 20, jednostka: 'pt' },
        { pole: 'wysokoscMm', etykieta: '↕️ Wysokość bloku', wartosc: blok.wysokoscMm, minimum: 4, maksimum: 30, jednostka: 'mm' },
        ...(id === 'lista-szkolenie' ? [{ pole: 'szerokoscMm' as const, etykieta: '↔️ Szerokość bloku', wartosc: blok.szerokoscMm, minimum: 100, maksimum: 200, jednostka: 'mm' }] : []),
        { pole: 'marginesWewnetrznyMm', etykieta: '⤵️ Padding bloku', wartosc: blok.dane.marginesWewnetrznyMm ?? 0, minimum: 0, maksimum: 5, jednostka: 'mm' },
      ] as const
      return <fieldset className="generator-list-obecnosci__ustawienia-bloku" key={id}>
        <legend>{nazwa}:</legend>
        {kontrolki.map(({ pole, etykieta, wartosc, minimum, maksimum, jednostka }) => {
          const krok = pole === 'szerokoscMm' ? 1 : 0.5
          const identyfikator = prefiks + '-' + id + '-' + pole
          const zmien = (nowaWartosc: number) => ustawDane((obecne) => pole === 'szerokoscMm'
            ? zmienWygladTytuluListy(obecne, pole, nowaWartosc)
            : zmienOdstepyBlokuListy(obecne, id, pole, nowaWartosc))
          return <div key={pole}>
            <label htmlFor={identyfikator}>{etykieta}</label>
            <div className="generator-list-obecnosci__regulacja">
              <button type="button" aria-label={'Zmniejsz: ' + nazwa + ' — ' + etykieta} disabled={wartosc <= minimum} onClick={() => zmien(wartosc - krok)}>−</button>
              <input id={identyfikator} type="range" aria-label={nazwa + ' — ' + etykieta} min={minimum} max={maksimum} step={krok} value={wartosc} onChange={(zdarzenie) => zmien(Number(zdarzenie.target.value))} />
              <output htmlFor={identyfikator}>{wartosc.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} {jednostka}</output>
              <button type="button" aria-label={'Zwiększ: ' + nazwa + ' — ' + etykieta} disabled={wartosc >= maksimum} onClick={() => zmien(wartosc + krok)}>+</button>
            </div>
          </div>
        })}
      </fieldset>
    })}
    <p className="generator-list-obecnosci__opis">Przesunięcie suwaka szerokości w prawo poszerza wyśrodkowany tytuł. Wysokość bloku reguluje pustą przestrzeń pod tekstem, a padding odstęp wewnętrzny z każdej strony. Sprawdź, czy cały tekst mieści się w bloku. Pozycje pozostałych bloków nie przesuwają się automatycznie.</p>
  </>
}
