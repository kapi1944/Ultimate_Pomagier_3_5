export type Lokalizacja = {
  klucz_lokalizacji: string
  nazwa: string
  wojewodztwo: string
  rodzaj: string
  gmina: string
  powiat: string
  miejscownik_pelny_auto: string
  status_odmiany: boolean
}

export type BladImportuLokalizacji = {
  wiersz: number
  komunikat: string
}

export type WynikImportuLokalizacji = {
  lokalizacje: Lokalizacja[]
  bledy: BladImportuLokalizacji[]
}
