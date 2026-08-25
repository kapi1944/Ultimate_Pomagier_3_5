export type StatusZadaniaPulpitu = 'OTWARTE' | 'WYKONANE'
export type PriorytetZadaniaPulpitu = 'ZWYKLE' | 'PILNE' | 'ASAP'
export type TypZrodlaZadania = 'RECZNE' | 'SZKOLENIE' | 'PACZKA'
export type RodzajTerminuZadania = 'KONKRETNA_GODZINA' | 'DO_KONCA_DNIA'

export type JednostkaPrzypomnienia = 'MINUTY' | 'GODZINY' | 'DNI'

export type PrzypomnienieZadania = {
  id: string
  wartosc: number
  jednostka: JednostkaPrzypomnienia
}

export type MiniaturaZadaniaPulpitu = {
  daneUrl: string
  nazwaPliku: string
  szerokosc: number
  wysokosc: number
}

export type ZadaniePulpitu = {
  id: string
  tytul: string
  opis?: string
  data: string
  godzina?: string
  rodzajTerminu?: RodzajTerminuZadania
  utworzono: string
  status: StatusZadaniaPulpitu
  priorytet: PriorytetZadaniaPulpitu
  typZrodla: TypZrodlaZadania
  typZadania: string
  wlascicielId: string
  zadaniodawcaId: string
  zadaniobiorcaId: string
  przypomnienia: PrzypomnienieZadania[]
  miniatura?: MiniaturaZadaniaPulpitu
  powiazaneSzkolenieId?: string
  powiazanyTypEncji?: string
  powiazanaEncjaId?: string
  czyAutomatyczne: boolean
  czyTerminKrytyczny: boolean
  wykonano?: string
  odlozonoDo?: string
}

export type StanPulpitu = {
  zadaniaReczne: ZadaniePulpitu[]
  wyslanePaczki: Record<string, string>
  zapotrzebowaniaZakupowe: ZapotrzebowanieZakupowe[]
}

export type StatusZapotrzebowaniaZakupowego = 'ZGLOSZONE' | 'DO_ZAKUPU' | 'W_REALIZACJI' | 'KUPIONE' | 'ANULOWANE' | 'ZAMKNIETE' | 'ARCHIWALNE'

export type ZapotrzebowanieZakupowe = {
  id: string
  nazwa: string
  ilosc: number
  status: StatusZapotrzebowaniaZakupowego
  uwagi?: string
  utworzonePrzezId: string
  utworzonoAt: string
}

export type PaczkaPulpitu = {
  id: string
  nazwaSzkolenia: string
  miasto: string
  terminySzkolenia: string[]
  trenerzy: string[]
  planowanaDataWysylki: string
  wlascicielId: string
  liczbaGotowych: number
  liczbaWymaganych: number
  brakujaceElementy: string[]
  czyWyslana: boolean
}
