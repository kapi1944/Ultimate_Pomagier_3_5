import type { PlikPrezentacji, StanPoprawiacza, WynikAnalizyPrezentacji } from './modelPrezentacji'
import type { ModelPptx } from '../pptx/modelPptx'
import type { RaportPoprawek } from '../operacje/zastosujPoprawki'

type DanePoprawiacza = {
  stan: StanPoprawiacza
  prezentacja: PlikPrezentacji | null
  blad: string | null
  model: ModelPptx | null
  analiza: WynikAnalizyPrezentacji | null
  raport: RaportPoprawek | null
}

type AkcjaPoprawiacza =
  | { typ: 'WYBIERZ_PLIK'; pliki: File[] }
  | { typ: 'USUN_PLIK' }
  | { typ: 'ROZPOCZNIJ_ANALIZE' }
  | { typ: 'ZAKONCZ_ANALIZE'; model: ModelPptx; analiza: WynikAnalizyPrezentacji }
  | { typ: 'ROZPOCZNIJ_POPRAWKI' }
  | { typ: 'ZAKONCZ_POPRAWKI'; model: ModelPptx; analiza: WynikAnalizyPrezentacji; raport: RaportPoprawek }
  | { typ: 'BLAD'; blad: string }

export const poczatkowyStanPoprawiacza: DanePoprawiacza = {
  stan: 'BRAK_PLIKU', prezentacja: null, blad: null,
  model: null, analiza: null, raport: null,
}

export function zmienStanPoprawiacza(dane: DanePoprawiacza, akcja: AkcjaPoprawiacza): DanePoprawiacza {
  if (akcja.typ === 'BLAD') return { ...dane, stan: 'BLAD', blad: akcja.blad }
  if (akcja.typ === 'ROZPOCZNIJ_ANALIZE') return { ...dane, stan: 'ANALIZOWANIE', blad: null }
  if (akcja.typ === 'ROZPOCZNIJ_POPRAWKI') return { ...dane, stan: 'MODYFIKOWANIE', blad: null }
  if (akcja.typ === 'ZAKONCZ_ANALIZE') return { ...dane, stan: 'PRZEANALIZOWANO', model: akcja.model, analiza: akcja.analiza, raport: null, blad: null }
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
