import { czyPaczkaWidoczna } from './paczki'
import { czyZadanieOpoznione } from './zadania'
import type { ZakresDniaPracy } from './czasDnia'
import type { PaczkaPulpitu, ZadaniePulpitu } from '../modele/pulpit'

export type LicznikiPulpitu = { doZrobienia: number; pilne: number; paczki: number; blokady: number }

export function obliczLicznikiPulpitu(zadania: ZadaniePulpitu[], paczki: PaczkaPulpitu[], dzisiaj: Date, data: string, zakresDniaPracy?: ZakresDniaPracy): LicznikiPulpitu {
  const otwarte = zadania.filter((zadanie) => zadanie.status === 'OTWARTE')
  return {
    doZrobienia: otwarte.filter((zadanie) => zadanie.data === data).length,
    pilne: otwarte.filter((zadanie) => zadanie.priorytet === 'ASAP' || zadanie.priorytet === 'PILNE' || czyZadanieOpoznione(zadanie, dzisiaj, zakresDniaPracy)).length,
    paczki: paczki.filter((paczka) => czyPaczkaWidoczna(paczka, dzisiaj)).length,
    blokady: otwarte.filter((zadanie) => zadanie.czyAutomatyczne).length,
  }
}
