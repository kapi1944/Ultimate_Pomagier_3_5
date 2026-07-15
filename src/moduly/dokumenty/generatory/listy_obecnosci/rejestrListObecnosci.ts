import {
  adapterListyObecnosci,
  type DaneDokumentuZIntegracji,
  type DaneListyObecnosciZIntegracji,
  type KontekstDokumentuSzkolenia,
  type KorektyReczneListyObecnosci,
} from '../../../../wspolne/integracje/szczegolyDoDokumentow/index'
import { repozytoriumDokumentow, type RekordDokumentu } from '../../../../wspolne/dokumenty/repozytoriumDokumentow'

export type DaneListyObecnosciDokumentu = DaneDokumentuZIntegracji<DaneListyObecnosciZIntegracji, KorektyReczneListyObecnosci>

export type MetadaneListyObecnosci = {
  szczegolyOrganizacyjneId: string
  wersjaSzczegolowId: string | null
  odciskDanych: string
  grupaId: string
  typDokumentu: 'LISTA_OBECNOSCI'
  wersja: number
}

export type DokumentListyObecnosci = RekordDokumentu<DaneListyObecnosciDokumentu> & {
  metadaneGeneratora: MetadaneListyObecnosci
}

export type WynikUtworzeniaListyObecnosci =
  | { status: 'utworzono'; dokument: DokumentListyObecnosci }
  | { status: 'istnieje'; dokument: DokumentListyObecnosci }
  | { status: 'brak_grupy'; dokument: null }

function czyMetadaneListyObecnosci(wartosc: Record<string, unknown>): wartosc is MetadaneListyObecnosci {
  return (
    typeof wartosc.szczegolyOrganizacyjneId === 'string' &&
    (typeof wartosc.wersjaSzczegolowId === 'string' || wartosc.wersjaSzczegolowId === null) &&
    typeof wartosc.odciskDanych === 'string' &&
    typeof wartosc.grupaId === 'string' &&
    wartosc.typDokumentu === 'LISTA_OBECNOSCI' &&
    typeof wartosc.wersja === 'number'
  )
}

function jakoDokumentListyObecnosci(dokument: RekordDokumentu): DokumentListyObecnosci | null {
  if (dokument.typGeneratora !== 'listy_obecnosci' || !czyMetadaneListyObecnosci(dokument.metadaneGeneratora)) {
    return null
  }

  return dokument as DokumentListyObecnosci
}

function utworzTytulListy(kontekst: KontekstDokumentuSzkolenia, grupaId: string) {
  const grupa = kontekst.grupy.find((kandydat) => kandydat.id === grupaId)
  const termin = grupa?.daty.join(', ') || 'bez terminu'
  return `Lista obecności — ${kontekst.szkolenie.tytul || 'Bez tytułu szkolenia'} — ${grupa?.nazwa || 'Bez grupy'} — ${termin}`
}

export function pobierzListeObecnosciPoId(id: string): DokumentListyObecnosci | null {
  const dokument = repozytoriumDokumentow.pobierzPoId('listy_obecnosci', id)
  return dokument ? jakoDokumentListyObecnosci(dokument) : null
}

export function pobierzIstniejacaKopieListyObecnosci(szczegolyOrganizacyjneId: string, grupaId: string): DokumentListyObecnosci | null {
  return (
    repozytoriumDokumentow
      .pobierz({ typGeneratora: 'listy_obecnosci', stanCyklu: 'kopia_robocza' })
      .map(jakoDokumentListyObecnosci)
      .filter((dokument): dokument is DokumentListyObecnosci => dokument !== null)
      .find((dokument): dokument is DokumentListyObecnosci => Boolean(dokument) && dokument.metadaneGeneratora.szczegolyOrganizacyjneId === szczegolyOrganizacyjneId && dokument.metadaneGeneratora.grupaId === grupaId) ?? null
  )
}

export function pobierzListyObecnosciPowiazane(szczegolyOrganizacyjneId: string): DokumentListyObecnosci[] {
  return repozytoriumDokumentow
    .pobierz({ typGeneratora: 'listy_obecnosci' })
    .map(jakoDokumentListyObecnosci)
    .filter((dokument): dokument is DokumentListyObecnosci => dokument !== null)
    .filter((dokument): dokument is DokumentListyObecnosci => Boolean(dokument) && dokument.metadaneGeneratora.szczegolyOrganizacyjneId === szczegolyOrganizacyjneId)
}

export function utworzListeObecnosciZeSzczegolow(
  kontekst: KontekstDokumentuSzkolenia,
  grupaId: string,
  czyUtworzycMimoIstniejacej = false,
): WynikUtworzeniaListyObecnosci {
  const istniejaca = pobierzIstniejacaKopieListyObecnosci(kontekst.zrodlo.szczegolyOrganizacyjneId, grupaId)

  if (istniejaca && !czyUtworzycMimoIstniejacej) {
    return { status: 'istnieje', dokument: istniejaca }
  }

  const daneDokumentu = adapterListyObecnosci(kontekst, grupaId)

  if (!daneDokumentu) {
    return { status: 'brak_grupy', dokument: null }
  }

  const dokument = repozytoriumDokumentow.zapiszNowy({
    typGeneratora: 'listy_obecnosci',
    tytul: utworzTytulListy(kontekst, grupaId),
    stanCyklu: 'kopia_robocza',
    statusBiznesowy: 'ROBOCZY',
    widocznosc: 'zespol',
    zrodlo: 'nowy',
    rekordZrodlowyId: kontekst.zrodlo.szczegolyOrganizacyjneId,
    wersjaFormatu: 'lista-obecnosci-z-integracji-v1',
    daneDokumentu,
    metadaneGeneratora: {
      szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId,
      wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId,
      odciskDanych: kontekst.zrodlo.odciskDanych,
      grupaId,
      typDokumentu: 'LISTA_OBECNOSCI',
      wersja: 1,
    } satisfies MetadaneListyObecnosci,
  })

  return { status: 'utworzono', dokument: jakoDokumentListyObecnosci(dokument)! }
}

export function zapiszKorektyListyObecnosci(
  id: string,
  tytul: string,
  korektyReczne: KorektyReczneListyObecnosci,
): DokumentListyObecnosci | null {
  const dokument = pobierzListeObecnosciPoId(id)

  if (!dokument) {
    return null
  }

  const zaktualizowany = repozytoriumDokumentow.aktualizuj('listy_obecnosci', id, {
    tytul,
    daneDokumentu: {
      ...dokument.daneDokumentu,
      korektyReczne,
    },
    metadaneGeneratora: dokument.metadaneGeneratora,
  })

  return zaktualizowany ? jakoDokumentListyObecnosci(zaktualizowany) : null
}
