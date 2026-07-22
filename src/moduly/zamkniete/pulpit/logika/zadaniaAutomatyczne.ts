import type { ZadaniePulpitu } from '../modele/pulpit'

export type ZrodloZadaniaAutomatycznego = {
  id: string
  tytul: string
  wlascicielId: string
  data: string
  czyMaTrenera: boolean
  czyHotelWymagany?: boolean
  czyHotelZarezerwowany?: boolean
  czyDaneKlientaKompletne: boolean
  czyMaterialyOdTreneraGotowe?: boolean
}

function utworzZadanie(zrodlo: ZrodloZadaniaAutomatycznego, typZadania: string, tytul: string): ZadaniePulpitu {
  return {
    id: 'automatyczne-' + typZadania + '-' + zrodlo.id,
    tytul,
    data: zrodlo.data,
    utworzono: zrodlo.data + 'T00:00:00.000Z',
    status: 'OTWARTE',
    priorytet: 'PILNE',
    typZrodla: 'SZKOLENIE',
    typZadania,
    wlascicielId: zrodlo.wlascicielId,
    zadaniodawcaId: zrodlo.wlascicielId,
    zadaniobiorcaId: zrodlo.wlascicielId,
    przypomnienia: [],
    powiazaneSzkolenieId: zrodlo.id,
    powiazanyTypEncji: 'SZCZEGOLY_ORGANIZACYJNE',
    powiazanaEncjaId: zrodlo.id,
    czyAutomatyczne: true,
    czyTerminKrytyczny: true,
  }
}

export function generujZadaniaAutomatyczne(zrodla: ZrodloZadaniaAutomatycznego[]) {
  return zrodla.flatMap((zrodlo) => {
    const zadania: ZadaniePulpitu[] = []
    if (!zrodlo.czyMaTrenera) zadania.push(utworzZadanie(zrodlo, 'BRAK_TRENERA', 'Brak trenera — ' + zrodlo.tytul))
    if (zrodlo.czyHotelWymagany && !zrodlo.czyHotelZarezerwowany) zadania.push(utworzZadanie(zrodlo, 'BRAK_HOTELU', 'Brak hotelu — ' + zrodlo.tytul))
    if (!zrodlo.czyDaneKlientaKompletne) zadania.push(utworzZadanie(zrodlo, 'BRAK_DANYCH_KLIENTA', 'Brak danych klienta — ' + zrodlo.tytul))
    if (zrodlo.czyMaterialyOdTreneraGotowe === false) zadania.push(utworzZadanie(zrodlo, 'BRAK_MATERIALOW_TRENERA', 'Brak materiałów od trenera — ' + zrodlo.tytul))
    return zadania
  })
}
