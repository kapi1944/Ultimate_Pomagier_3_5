import type { DokumentPomagiera, MarkaDokumentu, TypRozpoznanegoDokumentu } from './typyDokumentu'

export type StatusSzablonuDokumentu = 'szkic' | 'aktualny' | 'archiwalny'

export type SzablonDokumentu = {
  id: string
  nazwa: string
  typDokumentu?: TypRozpoznanegoDokumentu
  klientId?: string
  klientNazwa?: string
  status: StatusSzablonuDokumentu
  tagi: string[]
  marka: MarkaDokumentu
  miniatura: string
  wersja: number
  dataUtworzenia: string
  dataAktualizacji: string
  oryginalnyPlik?: string
  dokument: DokumentPomagiera
}

export const kluczSzablonowDokumentow = 'ultimate-pomagier.kartoteki.szablony-dokumentow'

function utworzIdSzablonu(nazwa: string) {
  const rdzen = nazwa
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `szablon-${rdzen || 'dokument'}-${Date.now()}`
}

export function pobierzSzablonyDokumentow(): SzablonDokumentu[] {
  try {
    const zapis = localStorage.getItem(kluczSzablonowDokumentow)
    const dane = zapis ? JSON.parse(zapis) : []

    return Array.isArray(dane) ? dane : []
  } catch {
    return []
  }
}

export function zapiszSzablonyDokumentow(szablony: SzablonDokumentu[]) {
  try {
    localStorage.setItem(kluczSzablonowDokumentow, JSON.stringify(szablony))
  } catch {
    return
  }
}

function utworzTagi(dokument: DokumentPomagiera) {
  const tagi = new Set<string>([
    dokument.zrodlo.typ.toUpperCase(),
    dokument.metadane.branding.marka,
    'szkic',
  ])

  if (dokument.metadane.mozliwyTypDokumentu) {
    tagi.add(dokument.metadane.mozliwyTypDokumentu)
  }

  if (dokument.zrodlo.wymagaOcr) {
    tagi.add('OCR')
  }

  return Array.from(tagi)
}

function utworzMiniature(dokument: DokumentPomagiera) {
  return `Podgląd: ${dokument.strony.length} str. / ${dokument.metadane.raportImportu?.liczbaTekstow ?? 0} tekstów`
}

export function utworzSzablonZDokumentu(dokument: DokumentPomagiera): SzablonDokumentu {
  const teraz = new Date().toISOString()

  return {
    id: utworzIdSzablonu(dokument.nazwa),
    nazwa: dokument.nazwa,
    typDokumentu: dokument.metadane.mozliwyTypDokumentu,
    status: 'szkic',
    tagi: utworzTagi(dokument),
    marka: dokument.metadane.branding.marka,
    miniatura: utworzMiniature(dokument),
    wersja: 1,
    dataUtworzenia: teraz,
    dataAktualizacji: teraz,
    oryginalnyPlik: dokument.zrodlo.nazwaPliku,
    dokument,
  }
}

export function zapiszNowySzablonDokumentu(dokument: DokumentPomagiera) {
  const szablon = utworzSzablonZDokumentu(dokument)
  const obecneSzablony = pobierzSzablonyDokumentow()

  zapiszSzablonyDokumentow([szablon, ...obecneSzablony])

  return szablon
}

export function zapiszWersjeSzablonuDokumentu(idSzablonu: string, dokument: DokumentPomagiera) {
  const obecneSzablony = pobierzSzablonyDokumentow()
  const istniejacySzablon = obecneSzablony.find((szablon) => szablon.id === idSzablonu)

  if (!istniejacySzablon) {
    return zapiszNowySzablonDokumentu(dokument)
  }

  const zaktualizowanySzablon: SzablonDokumentu = {
    ...istniejacySzablon,
    nazwa: dokument.nazwa,
    typDokumentu: dokument.metadane.mozliwyTypDokumentu,
    status: 'szkic',
    tagi: utworzTagi(dokument),
    marka: dokument.metadane.branding.marka,
    miniatura: utworzMiniature(dokument),
    wersja: istniejacySzablon.wersja + 1,
    dataAktualizacji: new Date().toISOString(),
    oryginalnyPlik: dokument.zrodlo.nazwaPliku,
    dokument,
  }

  zapiszSzablonyDokumentow(obecneSzablony.map((szablon) => (szablon.id === idSzablonu ? zaktualizowanySzablon : szablon)))

  return zaktualizowanySzablon
}
