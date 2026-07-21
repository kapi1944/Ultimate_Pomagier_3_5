import { pobierzKonfiguracjeTypuDokumentu } from './konfiguracjaDokumentow'
import type { Dokument, StatusDokumentu, TypDokumentu } from './modelDokumentu'

export type FiltrDokumentow = {
  typ?: TypDokumentu
  status?: StatusDokumentu
  szkolenieId?: string | null
  klientId?: string | null
  wlascicielId?: string | null
  dataOd?: string
  dataDo?: string
  tekst?: string
  czyZarchiwizowany?: boolean
  czyUsunietyMiekko?: boolean
}

export type KryteriumSortowaniaDokumentow = 'ZMODYFIKOWANO_MALEJACO' | 'ZMODYFIKOWANO_ROSNACO' | 'TYTUL_ROSNACO' | 'TYTUL_MALEJACO'

function normalizujTekst(wartosc: string) {
  return wartosc.trim().toLocaleLowerCase('pl-PL')
}

function pobierzTekstZPola(wartosc: unknown): string {
  if (typeof wartosc === 'string') return wartosc
  if (Array.isArray(wartosc)) return wartosc.map(pobierzTekstZPola).join(' ')
  if (!wartosc || typeof wartosc !== 'object') return ''
  return Object.values(wartosc as Record<string, unknown>).map(pobierzTekstZPola).join(' ')
}

function pobierzTekstDanychDokumentu(daneDokumentu: unknown) {
  if (!daneDokumentu || typeof daneDokumentu !== 'object') return ''
  const dane = daneDokumentu as Record<string, unknown>
  const migawka = dane.migawkaZrodla && typeof dane.migawkaZrodla === 'object' ? dane.migawkaZrodla as Record<string, unknown> : {}
  return [
    dane.tytulSzkolenia,
    dane.nazwaKlienta,
    dane.trener,
    dane.trenerzy,
    dane.nazwaGrupy,
    dane.klient,
    dane.opiekunId,
    migawka.tytulSzkolenia,
    migawka.klient,
    migawka.trenerzy,
    migawka.nazwaGrupy,
  ].map(pobierzTekstZPola).join(' ')
}

function czyDataNalezyDoZakresu(data: string, dataOd?: string, dataDo?: string) {
  const czas = Date.parse(data)
  const od = dataOd ? Date.parse(`${dataOd}T00:00:00`) : Number.NEGATIVE_INFINITY
  const doDaty = dataDo ? Date.parse(`${dataDo}T23:59:59.999`) : Number.POSITIVE_INFINITY

  return czas >= od && czas <= doDaty
}

export function filtrujDokumenty(dokumenty: Dokument<unknown, unknown>[], filtr: FiltrDokumentow = {}) {
  const tekst = filtr.tekst ? normalizujTekst(filtr.tekst) : ''

  return dokumenty.filter((dokument) => {
    const etykietaTypu = pobierzKonfiguracjeTypuDokumentu(dokument.typ)?.etykieta ?? dokument.typ
    const indeksTekstowy = normalizujTekst(`${dokument.tytul} ${dokument.id} ${dokument.generatorId} ${dokument.szkolenieId ?? ''} ${dokument.klientId ?? ''} ${dokument.wlascicielId ?? ''} ${etykietaTypu} ${pobierzTekstDanychDokumentu(dokument.daneDokumentu)}`)

    return (
      (!filtr.typ || dokument.typ === filtr.typ) &&
      (!filtr.status || dokument.status === filtr.status) &&
      (filtr.szkolenieId === undefined || dokument.szkolenieId === filtr.szkolenieId) &&
      (filtr.klientId === undefined || dokument.klientId === filtr.klientId) &&
      (filtr.wlascicielId === undefined || dokument.wlascicielId === filtr.wlascicielId) &&
      (filtr.czyZarchiwizowany === undefined || dokument.czyZarchiwizowany === filtr.czyZarchiwizowany) &&
      (filtr.czyUsunietyMiekko === undefined || dokument.czyUsunietyMiekko === filtr.czyUsunietyMiekko) &&
      czyDataNalezyDoZakresu(dokument.zmodyfikowano, filtr.dataOd, filtr.dataDo) &&
      (!tekst || indeksTekstowy.includes(tekst))
    )
  })
}

export function sortujDokumenty(dokumenty: Dokument<unknown, unknown>[], kryterium: KryteriumSortowaniaDokumentow) {
  return [...dokumenty].sort((pierwszy, drugi) => {
    if (kryterium === 'TYTUL_ROSNACO' || kryterium === 'TYTUL_MALEJACO') {
      const wynik = pierwszy.tytul.localeCompare(drugi.tytul, 'pl')
      return kryterium === 'TYTUL_ROSNACO' ? wynik : -wynik
    }

    const wynik = Date.parse(pierwszy.zmodyfikowano) - Date.parse(drugi.zmodyfikowano)
    return kryterium === 'ZMODYFIKOWANO_ROSNACO' ? wynik : -wynik
  })
}
