import {
  utworzDaneDokumentuZIntegracji,
  utworzPowiazanieZeSzczegolami,
  type DaneDokumentuZIntegracji,
  type KontekstDokumentuSzkolenia,
  type KontekstGrupySzkoleniowej,
  type LokalizacjaKontekstuSzkolenia,
  type TrenerKontekstuSzkolenia,
  type UczestnikKontekstuSzkolenia,
} from '../typyKontekstuDokumentu'

export type DaneListyObecnosciZIntegracji = {
  typDokumentu: 'LISTA_OBECNOSCI'
  tytulSzkolenia: string
  nazwaGrupy: string
  daty: string[]
  lokalizacje: LokalizacjaKontekstuSzkolenia[]
  organizator: KontekstDokumentuSzkolenia['organizator']
  klient: KontekstDokumentuSzkolenia['klient']
  trenerzy: TrenerKontekstuSzkolenia[]
  uczestnicy: UczestnikKontekstuSzkolenia[]
  liczbaUczestnikow: number
  trybSzkolenia: string | null
  daneZrodlowe: {
    szczegolyOrganizacyjneId: string
    wersjaSzczegolowId: string | null
    zmodyfikowano: string
    odciskDanych: string
  }
}

export type KorektyReczneListyObecnosci = Partial<
  Pick<DaneListyObecnosciZIntegracji, 'tytulSzkolenia' | 'nazwaGrupy' | 'daty' | 'lokalizacje' | 'trenerzy' | 'uczestnicy' | 'liczbaUczestnikow' | 'trybSzkolenia'>
>

function zbudujDaneListyObecnosci(
  kontekst: KontekstDokumentuSzkolenia,
  grupa: KontekstGrupySzkoleniowej,
): DaneListyObecnosciZIntegracji {
  return {
    typDokumentu: 'LISTA_OBECNOSCI',
    tytulSzkolenia: kontekst.szkolenie.tytul,
    nazwaGrupy: grupa.nazwa,
    daty: grupa.daty,
    lokalizacje: grupa.lokalizacje,
    organizator: kontekst.organizator,
    klient: kontekst.klient,
    trenerzy: grupa.trenerzy,
    uczestnicy: grupa.uczestnicy,
    liczbaUczestnikow: grupa.liczbaUczestnikow,
    trybSzkolenia: grupa.tryb,
    daneZrodlowe: {
      szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId,
      wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId,
      zmodyfikowano: kontekst.zrodlo.zmodyfikowano,
      odciskDanych: kontekst.zrodlo.odciskDanych,
    },
  }
}

export function adapterListyObecnosci(
  kontekst: KontekstDokumentuSzkolenia,
  grupaId: string,
  korektyReczne: KorektyReczneListyObecnosci = {},
): DaneDokumentuZIntegracji<DaneListyObecnosciZIntegracji, KorektyReczneListyObecnosci> | null {
  const grupa = kontekst.grupy.find((kandydat) => kandydat.id === grupaId)

  if (!grupa) {
    return null
  }

  return utworzDaneDokumentuZIntegracji(
    zbudujDaneListyObecnosci(kontekst, grupa),
    korektyReczne,
    utworzPowiazanieZeSzczegolami(kontekst),
  )
}
