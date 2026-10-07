import type { PlikPrezentacji, StanPoprawiacza } from './modelPrezentacji'

type DanePoprawiacza = {
  stan: StanPoprawiacza
  prezentacja: PlikPrezentacji | null
  blad: string | null
}

type AkcjaPoprawiacza =
  | { typ: 'WYBIERZ_PLIK'; pliki: File[] }
  | { typ: 'USUN_PLIK' }

export const poczatkowyStanPoprawiacza: DanePoprawiacza = {
  stan: 'BRAK_PLIKU', prezentacja: null, blad: null,
}

export function zmienStanPoprawiacza(dane: DanePoprawiacza, akcja: AkcjaPoprawiacza): DanePoprawiacza {
  if (akcja.typ === 'USUN_PLIK') return poczatkowyStanPoprawiacza
  const plik = akcja.pliki[0]
  const blad = akcja.pliki.length !== 1
    ? 'Wybierz jeden plik PPTX.'
    : !/\.pptx$/i.test(plik.name)
      ? 'Wybierz plik z rozszerzeniem .pptx.'
      : plik.size === 0 ? 'Wybrany plik jest pusty. Wybierz inną prezentację.' : null

  if (blad) return { ...dane, stan: dane.prezentacja ? dane.stan : 'BLAD', blad }
  return {
    stan: 'PLIK_WCZYTANY',
    prezentacja: { plik, nazwa: plik.name, rozmiar: plik.size },
    blad: null,
  }
}
