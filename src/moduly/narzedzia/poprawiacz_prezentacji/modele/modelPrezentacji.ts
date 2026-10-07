export type StanPoprawiacza =
  | 'BRAK_PLIKU'
  | 'PLIK_WCZYTANY'
  | 'ANALIZOWANIE'
  | 'PRZEANALIZOWANO'
  | 'MODYFIKOWANIE'
  | 'GOTOWE'
  | 'BLAD'

export type PlikPrezentacji = {
  plik: File
  nazwa: string
  rozmiar: number
}

export type TypPoprawki = 'GÓRNY_PASEK' | 'NUMERACJA'

export type ProblemPrezentacji = {
  id: string
  opis: string
  numerSlajdu: number
  czesc: string
  kluczObiektu: string
  typ: TypPoprawki
}

export type WynikAnalizyPrezentacji = {
  liczbaSlajdow: number
  problemy: ProblemPrezentacji[]
  powtarzalne: { opis: string; liczba: number; numerySlajdow: number[] }[]
}

export type OperacjaPrezentacji = {
  id: TypPoprawki
  nazwa: string
  czyWybrana: boolean
}
