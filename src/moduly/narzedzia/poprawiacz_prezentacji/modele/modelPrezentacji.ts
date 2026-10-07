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

export type ProblemPrezentacji = {
  id: string
  opis: string
  numerSlajdu?: number
}

export type WynikAnalizyPrezentacji = {
  liczbaSlajdow: number
  problemy: ProblemPrezentacji[]
}

export type OperacjaPrezentacji = {
  id: string
  nazwa: string
  czyWybrana: boolean
}
