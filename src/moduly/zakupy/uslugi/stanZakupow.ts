import { pobierzStanPulpitu } from '../../zamkniete/pulpit/uslugi/magazynPulpitu'
import type { StanZakupow } from '../modele/zakupy'
import { pobierzLokalizacjeMagazynowe } from './magazynLokalizacji'

// Projekcja tylko do odczytu. Pulpit pozostaje źródłem zapotrzebowań do jawnej migracji.
export function pobierzStanZakupow(): StanZakupow {
  const { zapotrzebowaniaZakupowe } = pobierzStanPulpitu()
  return {
    wersjaSchematu: 1,
    produkty: [], wariantyProduktow: [], ofertyProduktow: [], snapshotyCen: [],
    zapotrzebowania: zapotrzebowaniaZakupowe.map(({ id, nazwa, status, utworzonePrzezId, utworzonoAt, uwagi }) => ({ id, nazwa, status, utworzonePrzezId, utworzonoAt, uwagi })),
    pozycjeZapotrzebowan: zapotrzebowaniaZakupowe.map((zapotrzebowanie) => ({
      id: `pulpit:${zapotrzebowanie.id}:pozycja`,
      zapotrzebowanieId: zapotrzebowanie.id,
      nazwa: zapotrzebowanie.nazwa,
      ilosc: zapotrzebowanie.ilosc,
    })),
    listyZakupowe: [], pozycjeListZakupowych: [], zamowienia: [], pozycjeZamowien: [],
    przesylki: [], pozycjePrzesylek: [], lokalizacjeMagazynowe: pobierzLokalizacjeMagazynowe().lokalizacje, egzemplarzeProduktow: [],
    stanyWLokalizacjach: [], ruchyMagazynowe: [], inwentaryzacje: [], pozycjeInwentaryzacji: [],
  }
}
