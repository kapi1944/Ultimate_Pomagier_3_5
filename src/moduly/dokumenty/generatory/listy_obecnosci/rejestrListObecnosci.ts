import {
  adapterListyObecnosci,
  type DaneDokumentuZIntegracji,
  type DaneListyObecnosciZIntegracji,
  type KontekstDokumentuSzkolenia,
  type KorektyReczneListyObecnosci,
} from '../../../../wspolne/integracje/szczegolyDoDokumentow/index'
import { utworzNowyDokument, type Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'

export type DaneListyObecnosciDokumentu = DaneDokumentuZIntegracji<DaneListyObecnosciZIntegracji, KorektyReczneListyObecnosci>

export type MetadaneListyObecnosci = {
  szczegolyOrganizacyjneId: string
  wersjaSzczegolowId: string | null
  odciskDanych: string
  grupaId: string
  typDokumentu: 'LISTA_OBECNOSCI'
  wersja: number
}

export type DokumentListyObecnosci = Dokument<DaneListyObecnosciDokumentu, MetadaneListyObecnosci> & {
  stanCyklu: 'kopia_robocza' | 'opublikowany' | 'archiwalny' | 'kosz'
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

function jakoDokumentListyObecnosci(dokument: Dokument<unknown, unknown>): DokumentListyObecnosci | null {
  if (dokument.typ !== 'LISTA_OBECNOSCI' || dokument.generatorId !== 'listy_obecnosci' || !czyMetadaneListyObecnosci(dokument.ustawieniaDokumentu as Record<string, unknown>)) {
    return null
  }
  const stanCyklu = dokument.czyUsunietyMiekko ? 'kosz' : dokument.status === 'OPUBLIKOWANY' ? 'opublikowany' : dokument.status === 'ZARCHIWIZOWANY' ? 'archiwalny' : 'kopia_robocza'
  return { ...dokument, daneDokumentu: dokument.daneDokumentu as DaneListyObecnosciDokumentu, ustawieniaDokumentu: dokument.ustawieniaDokumentu as MetadaneListyObecnosci, metadaneGeneratora: dokument.ustawieniaDokumentu as MetadaneListyObecnosci, stanCyklu }
}

function utworzTytulListy(kontekst: KontekstDokumentuSzkolenia, grupaId: string) {
  const grupa = kontekst.grupy.find((kandydat) => kandydat.id === grupaId)
  const termin = grupa?.daty.join(', ') || 'bez terminu'
  return `Lista obecności — ${kontekst.szkolenie.tytul || 'Bez tytułu szkolenia'} — ${grupa?.nazwa || 'Bez grupy'} — ${termin}`
}

export function pobierzListeObecnosciPoId(id: string): DokumentListyObecnosci | null {
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(id)
  return dokument ? jakoDokumentListyObecnosci(dokument) : null
}

export function pobierzIstniejacaKopieListyObecnosci(szczegolyOrganizacyjneId: string, grupaId: string): DokumentListyObecnosci | null {
  return (
    repozytoriumWspolnychDokumentow
      .pobierzWszystkie()
      .filter((dokument) => dokument.typ === 'LISTA_OBECNOSCI' && dokument.generatorId === 'listy_obecnosci' && dokument.status === 'ROBOCZY' && !dokument.czyUsunietyMiekko)
      .map(jakoDokumentListyObecnosci)
      .filter((dokument): dokument is DokumentListyObecnosci => dokument !== null)
      .find((dokument): dokument is DokumentListyObecnosci => Boolean(dokument) && dokument.metadaneGeneratora.szczegolyOrganizacyjneId === szczegolyOrganizacyjneId && dokument.metadaneGeneratora.grupaId === grupaId) ?? null
  )
}

export function pobierzListyObecnosciPowiazane(szczegolyOrganizacyjneId: string): DokumentListyObecnosci[] {
  return repozytoriumWspolnychDokumentow
    .pobierzWszystkie()
    .filter((dokument) => dokument.typ === 'LISTA_OBECNOSCI' && dokument.generatorId === 'listy_obecnosci')
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

  const metadane = {
    szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId,
    wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId,
    odciskDanych: kontekst.zrodlo.odciskDanych,
    grupaId,
    typDokumentu: 'LISTA_OBECNOSCI',
    wersja: 1,
  } satisfies MetadaneListyObecnosci
  const dokument = utworzNowyDokument({
    typ: 'LISTA_OBECNOSCI',
    generatorId: 'listy_obecnosci',
    tytul: utworzTytulListy(kontekst, grupaId),
    statusBiznesowy: 'ROBOCZY',
    widocznosc: 'zespol',
    zrodloUtworzenia: 'nowy',
    rekordZrodlowyId: kontekst.zrodlo.szczegolyOrganizacyjneId,
    wersjaFormatu: 'lista-obecnosci-z-integracji-v1',
    powiazania: { szkolenieId: kontekst.szkolenie.id, grupaId, klientId: kontekst.klient.id, organizatorId: kontekst.organizator.id, szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId, wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId, odciskDanychZrodlowych: kontekst.zrodlo.odciskDanych },
    integralnosc: { powiazanieZeSzczegolami: 'POWIAZANY_ZE_SZCZEGOLAMI', idZrodlowychSzczegolow: kontekst.zrodlo.szczegolyOrganizacyjneId, znacznikDanychZrodlowych: kontekst.zrodlo.odciskDanych, reczneNadpisania: {} },
    daneDokumentu,
    ustawieniaDokumentu: metadane,
  })
  repozytoriumWspolnychDokumentow.utworz(dokument)
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

  const zaktualizowany = repozytoriumWspolnychDokumentow.aktualizuj(id, {
    tytul,
    daneDokumentu: {
      ...dokument.daneDokumentu,
      korektyReczne,
    },
    ustawieniaDokumentu: dokument.metadaneGeneratora,
    integralnosc: { ...dokument.integralnosc, reczneNadpisania: korektyReczne },
  })

  return zaktualizowany ? jakoDokumentListyObecnosci(zaktualizowany) : null
}
