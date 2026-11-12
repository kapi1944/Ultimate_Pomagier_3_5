import { pobierzStanPulpitu } from '../../zamkniete/pulpit/uslugi/magazynPulpitu'
import type { StanZakupow } from '../modele/zakupy'
import { pobierzLokalizacjeMagazynowe } from './magazynLokalizacji'

// Projekcja tylko do odczytu. Pulpit pozostaje źródłem zapotrzebowań do jawnej migracji.
export function pobierzStanZakupow(): StanZakupow {
  const { zapotrzebowaniaZakupowe } = pobierzStanPulpitu()
  const magazyn = pobierzLokalizacjeMagazynowe()
  return {
    wersjaSchematu: 1,
    ...magazyn.daneMagazynowe, ofertyProduktow: [], snapshotyCen: [],
    zapotrzebowania: zapotrzebowaniaZakupowe.map(({ id, nazwa, status, utworzonePrzezId, utworzonoAt, uwagi }) => ({ id, nazwa, status, utworzonePrzezId, utworzonoAt, uwagi })),
    pozycjeZapotrzebowan: zapotrzebowaniaZakupowe.map((zapotrzebowanie) => ({
      id: `pulpit:${zapotrzebowanie.id}:pozycja`,
      zapotrzebowanieId: zapotrzebowanie.id,
      nazwa: zapotrzebowanie.nazwa,
      ilosc: zapotrzebowanie.ilosc,
    })),
    listyZakupowe: [], pozycjeListZakupowych: [], zamowienia: [], pozycjeZamowien: [],
    przesylki: [], pozycjePrzesylek: [], lokalizacjeMagazynowe: magazyn.lokalizacje,
  }
}
