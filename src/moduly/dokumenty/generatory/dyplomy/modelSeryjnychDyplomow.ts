import type { KontekstDokumentuSzkolenia } from '../../../../wspolne/integracje/szczegolyDoDokumentow'

export type DaneSeryjnychDyplomow = {
  tytulSzkolenia: string
  trybSzkolenia: 'stacjonarne' | 'online'
  miejsceSzkolenia: string
  trener: string
  liczbaGodzin: string | null
  daty: string[]
  uczestnicy: string[]
  organizator: 'SEMPER' | 'IIST'
}

export function zbudujDaneSeryjnychDyplomow(kontekst: KontekstDokumentuSzkolenia, grupaId: string): DaneSeryjnychDyplomow | null {
  const grupa = kontekst.grupy.find((pozycja) => pozycja.id === grupaId)
  if (!grupa) return null
  const lokalizacja = grupa.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.sala || pozycja.adres || pozycja.trybOnline)
  const nazwaOrganizatora = `${kontekst.organizator.marka ?? ''} ${kontekst.organizator.nazwa ?? ''}`.toLocaleUpperCase('pl')
  return {
    tytulSzkolenia: kontekst.szkolenie.tytul,
    trybSzkolenia: grupa.tryb?.toLocaleLowerCase('pl').includes('online') ? 'online' : 'stacjonarne',
    miejsceSzkolenia: lokalizacja?.trybOnline ? 'Online' : [lokalizacja?.nazwa, lokalizacja?.sala, lokalizacja?.adres].filter(Boolean).join(', '),
    trener: (grupa.trenerzy.length ? grupa.trenerzy : kontekst.trenerzy).map((trener) => trener.imieINazwisko).join(', '),
    liczbaGodzin: grupa.liczbaGodzin === null ? null : String(grupa.liczbaGodzin),
    daty: [...grupa.daty],
    uczestnicy: grupa.uczestnicy.map((uczestnik) => uczestnik.nazwaPelna.trim()).filter(Boolean),
    organizator: nazwaOrganizatora.includes('IIST') ? 'IIST' : 'SEMPER',
  }
}
