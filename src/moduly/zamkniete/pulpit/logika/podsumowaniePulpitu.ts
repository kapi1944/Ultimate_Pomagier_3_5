import { czyPaczkaWidoczna } from './paczki'
import { czyZadanieOpoznione } from './zadania'
import type { PaczkaPulpitu, ZadaniePulpitu } from '../modele/pulpit'

export type LicznikiPulpitu = { doZrobienia: number; pilne: number; paczki: number; blokady: number }

export function obliczLicznikiPulpitu(zadania: ZadaniePulpitu[], paczki: PaczkaPulpitu[], dzisiaj: Date, data: string): LicznikiPulpitu {
  const otwarte = zadania.filter((zadanie) => zadanie.status === 'OTWARTE')
  return {
    doZrobienia: otwarte.filter((zadanie) => zadanie.data === data).length,
    pilne: otwarte.filter((zadanie) => zadanie.priorytet === 'PILNE' || czyZadanieOpoznione(zadanie, dzisiaj)).length,
    paczki: paczki.filter((paczka) => czyPaczkaWidoczna(paczka, dzisiaj)).length,
    blokady: otwarte.filter((zadanie) => zadanie.czyAutomatyczne).length,
  }
}
