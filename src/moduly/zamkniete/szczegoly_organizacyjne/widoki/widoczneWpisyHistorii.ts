import type { WpisHistoriiSzczegolow } from '../typy'

export const maksymalnaLiczbaWidocznychWpisowHistorii = 2

export function pobierzWidoczneWpisyHistorii(wpisy: WpisHistoriiSzczegolow[], czyHistoriaRozwinieta: boolean) {
  return czyHistoriaRozwinieta ? wpisy : wpisy.slice(0, maksymalnaLiczbaWidocznychWpisowHistorii)
}

export function pobierzLiczbeUkrytychWpisowHistorii(wpisy: WpisHistoriiSzczegolow[]) {
  return Math.max(0, wpisy.length - maksymalnaLiczbaWidocznychWpisowHistorii)
}
