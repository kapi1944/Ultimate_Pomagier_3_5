export type StatusZadaniaPulpitu = 'OTWARTE' | 'WYKONANE'
export type PriorytetZadaniaPulpitu = 'ZWYKLE' | 'PILNE'
export type TypZrodlaZadania = 'RECZNE' | 'SZKOLENIE' | 'PACZKA'

export type ZadaniePulpitu = {
  id: string
  tytul: string
  opis?: string
  data: string
  godzina?: string
  utworzono: string
  status: StatusZadaniaPulpitu
  priorytet: PriorytetZadaniaPulpitu
  typZrodla: TypZrodlaZadania
  typZadania: string
  wlascicielId: string
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
