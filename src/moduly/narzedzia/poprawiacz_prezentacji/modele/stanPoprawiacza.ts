import type { PlikPrezentacji, StanPoprawiacza, WynikAnalizyPrezentacji } from './modelPrezentacji'
import type { ModelPptx } from '../pptx/modelPptx'
import type { RaportPoprawek } from '../operacje/zastosujPoprawki'
import { ograniczHistorie, type TransakcjaPrezentacji } from '../operacje/historiaPrezentacji'

export type TrybPrezentacji = 'ROBOCZY' | 'PEŁNOEKRANOWY' | 'PORÓWNAWCZY'
export type WidokSlajdu = { zoom: number; x: number; y: number }

export type DanePoprawiacza = {
  oryginal: ModelPptx | null
  punktKontrolny: ModelPptx | null
  historia: TransakcjaPrezentacji[]
  ponawianie: TransakcjaPrezentacji[]
  indeksSlajdu: number
  tryb: TrybPrezentacji
  zaznaczenie: string[]
  widok: WidokSlajdu
  rewizja: number
  rewizjaRenderu: number | null
  stan: StanPoprawiacza
  prezentacja: PlikPrezentacji | null
  blad: string | null
  model: ModelPptx | null
  analiza: WynikAnalizyPrezentacji | null
  raport: RaportPoprawek | null
}

export type AkcjaPoprawiacza =
  | { typ: 'PUNKT_KONTROLNY' }
  | { typ: 'TRYB'; tryb: TrybPrezentacji }
  | { typ: 'SLAJD'; indeks: number }
  | { typ: 'ZAZNACZENIE'; identyfikatory: string[] }
  | { typ: 'WIDOK'; widok: WidokSlajdu }
  | { typ: 'RENDER'; rewizja: number }
  | { typ: 'ZAPISZ_OPERACJE'; model: ModelPptx; analiza: WynikAnalizyPrezentacji; transakcja: TransakcjaPrezentacji; raport?: RaportPoprawek }
  | { typ: 'HISTORIA'; model: ModelPptx; analiza: WynikAnalizyPrezentacji; kierunek: 'przed' | 'po' }
  | { typ: 'WYBIERZ_PLIK'; pliki: File[] }
  | { typ: 'USUN_PLIK' }
  | { typ: 'ROZPOCZNIJ_ANALIZE' }
  | { typ: 'ZAKONCZ_ANALIZE'; model: ModelPptx; analiza: WynikAnalizyPrezentacji }
  | { typ: 'ROZPOCZNIJ_POPRAWKI' }
  | { typ: 'ZAKONCZ_POPRAWKI'; model: ModelPptx; analiza: WynikAnalizyPrezentacji; raport: RaportPoprawek }
  | { typ: 'BLAD'; blad: string }

export const poczatkowyStanPoprawiacza: DanePoprawiacza = {
  oryginal: null, punktKontrolny: null, historia: [], ponawianie: [], indeksSlajdu: 0, tryb: 'ROBOCZY', zaznaczenie: [],
  widok: { zoom: 1, x: 0, y: 0 }, rewizja: 0, rewizjaRenderu: null,
  stan: 'BRAK_PLIKU', prezentacja: null, blad: null,
  model: null, analiza: null, raport: null,
}

export function zmienStanPoprawiacza(dane: DanePoprawiacza, akcja: AkcjaPoprawiacza): DanePoprawiacza {
  if (akcja.typ === 'PUNKT_KONTROLNY') return { ...dane, punktKontrolny: dane.model }
  if (akcja.typ === 'TRYB') return { ...dane, tryb: akcja.tryb }
  if (akcja.typ === 'SLAJD') return { ...dane, indeksSlajdu: Math.max(0, Math.min((dane.model?.slajdy.length ?? 1) - 1, akcja.indeks)), zaznaczenie: [] }
  if (akcja.typ === 'ZAZNACZENIE') return { ...dane, zaznaczenie: akcja.identyfikatory }
  if (akcja.typ === 'WIDOK') return { ...dane, widok: akcja.widok }
  if (akcja.typ === 'RENDER') return akcja.rewizja === dane.rewizja ? { ...dane, rewizjaRenderu: akcja.rewizja } : dane
  if (akcja.typ === 'ZAPISZ_OPERACJE') return { ...dane, stan: 'GOTOWE', model: akcja.model, analiza: akcja.analiza,
    raport: akcja.raport ?? null, historia: akcja.transakcja.czesci.length ? ograniczHistorie([...dane.historia, akcja.transakcja]) : dane.historia, ponawianie: akcja.transakcja.czesci.length ? [] : dane.ponawianie, rewizja: dane.rewizja + 1, blad: null }
  if (akcja.typ === 'HISTORIA') {
    const cofanie = akcja.kierunek === 'przed'
    const transakcja = (cofanie ? dane.historia : dane.ponawianie).at(-1)
    if (!transakcja) return dane
    return { ...dane, stan: 'GOTOWE', model: akcja.model, analiza: akcja.analiza, raport: null, blad: null, rewizja: dane.rewizja + 1,
      historia: cofanie ? dane.historia.slice(0, -1) : [...dane.historia, transakcja],
      ponawianie: cofanie ? [...dane.ponawianie, transakcja] : dane.ponawianie.slice(0, -1) }
  }
  if (akcja.typ === 'BLAD') return { ...dane, stan: 'BLAD', blad: akcja.blad }
  if (akcja.typ === 'ROZPOCZNIJ_ANALIZE') return { ...dane, stan: 'ANALIZOWANIE', blad: null }
  if (akcja.typ === 'ROZPOCZNIJ_POPRAWKI') return { ...dane, stan: 'MODYFIKOWANIE', blad: null }
  if (akcja.typ === 'ZAKONCZ_ANALIZE') return { ...dane, stan: 'PRZEANALIZOWANO', oryginal: dane.oryginal ?? akcja.model, model: akcja.model, analiza: akcja.analiza, raport: null, blad: null }
  if (akcja.typ === 'ZAKONCZ_POPRAWKI') return { ...dane, stan: 'GOTOWE', model: akcja.model, analiza: akcja.analiza, raport: akcja.raport, blad: null }
  if (dane.stan === 'ANALIZOWANIE' || dane.stan === 'MODYFIKOWANIE') return dane
  if (akcja.typ === 'USUN_PLIK') return poczatkowyStanPoprawiacza
  const plik = akcja.pliki[0]
  const blad = akcja.pliki.length !== 1
    ? 'Wybierz jeden plik PPTX.'
    : !/\.pptx$/i.test(plik.name)
      ? 'Wybierz plik z rozszerzeniem .pptx.'
      : plik.size === 0 ? 'Wybrany plik jest pusty. Wybierz inną prezentację.' : null

  if (blad) return { ...dane, stan: dane.prezentacja ? dane.stan : 'BLAD', blad }
  return {
    ...poczatkowyStanPoprawiacza,
    stan: 'PLIK_WCZYTANY',
    prezentacja: { plik, nazwa: plik.name, rozmiar: plik.size },
    blad: null,
  }
}
