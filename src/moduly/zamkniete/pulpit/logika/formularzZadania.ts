import type { PrzypomnienieZadania, RodzajTerminuZadania, ZadaniePulpitu } from '../modele/pulpit'
import { czyZadanieDoKoncaDnia } from './zadania'

export type TrybFormularzaZadania = 'create' | 'edit'

export type FormularzZadania = {
  tytul: string
  data: string
  godzina: string
  rodzajTerminu: RodzajTerminuZadania | 'BRAK_GODZINY'
  priorytet: ZadaniePulpitu['priorytet']
  zadaniodawcaId: string
  zadaniobiorcaId: string
  szkolenieId: string
  przypomnienia: PrzypomnienieZadania[]
  miniatura?: ZadaniePulpitu['miniatura']
}

export function formularzZZadania(zadanie: ZadaniePulpitu): FormularzZadania {
  return {
    tytul: zadanie.tytul,
    data: zadanie.data,
    godzina: zadanie.godzina ?? '',
    rodzajTerminu: czyZadanieDoKoncaDnia(zadanie) ? 'DO_KONCA_DNIA' : zadanie.godzina ? 'KONKRETNA_GODZINA' : 'BRAK_GODZINY',
    priorytet: zadanie.priorytet,
    zadaniodawcaId: zadanie.zadaniodawcaId,
    zadaniobiorcaId: zadanie.zadaniobiorcaId === zadanie.zadaniodawcaId ? '' : zadanie.zadaniobiorcaId,
    szkolenieId: zadanie.powiazaneSzkolenieId ?? '',
    przypomnienia: zadanie.przypomnienia.map((przypomnienie) => ({ ...przypomnienie })),
    miniatura: zadanie.miniatura,
  }
}
