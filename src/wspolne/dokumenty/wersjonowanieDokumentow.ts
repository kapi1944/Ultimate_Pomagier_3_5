import { utworzNowyDokument, walidujDokument, type Dokument } from './modelDokumentu'
import { repozytoriumWspolnychDokumentow } from './rejestrDokumentow'

export type WpisHistoriiWersji = {
  id: string
  dokumentId: string
  wersja: number
  status: Dokument<unknown, unknown>['status']
  utworzono: string
  zmodyfikowano: string
  opublikowano: string | null
}

export type FormatEksportuDokumentu = 'PDF' | 'DOCX'

export type MetadaneEksportuDokumentu = {
  id: string
  dokumentId: string
  wersjaDokumentu: number
  format: FormatEksportuDokumentu
  nazwa: string
  utworzono: string
  autorId: string | null
}

const kluczHistoriiEksportow = 'ultimatePomagier.dokumenty.historiaEksportow.v1'

function pobierzHistorieRodziny(dokument: Dokument<unknown, unknown>) {
  const korzenId = dokument.dokumentNadrzednyId ?? dokument.id
  return repozytoriumWspolnychDokumentow
    .pobierzWszystkie()
    .filter((rekord) => rekord.id === korzenId || rekord.dokumentNadrzednyId === korzenId)
    .sort((pierwszy, drugi) => pierwszy.wersja - drugi.wersja)
}

export function pobierzHistorieWersji(dokumentId: string): WpisHistoriiWersji[] {
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(dokumentId)
  if (!dokument) return []

  return pobierzHistorieRodziny(dokument).map((rekord) => ({
    id: rekord.id,
    dokumentId: rekord.id,
    wersja: rekord.wersja,
    status: rekord.status,
    utworzono: rekord.utworzono,
    zmodyfikowano: rekord.zmodyfikowano,
    opublikowano: rekord.opublikowano,
  }))
}

export function opublikujDokument(id: string) {
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(id)
  if (!dokument) return null
  if (!walidujDokument(dokument).czyPoprawny) throw new Error('Dokument nie przechodzi walidacji.')
  if (dokument.status === 'OPUBLIKOWANY') return dokument

  const teraz = new Date().toISOString()
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { status: 'OPUBLIKOWANY', opublikowano: teraz })
}

export function utworzAktualizacjeDokumentu(id: string) {
  const zrodlo = repozytoriumWspolnychDokumentow.pobierzPoId(id)
  if (!zrodlo || zrodlo.status !== 'OPUBLIKOWANY') return null

  const korzenId = zrodlo.dokumentNadrzednyId ?? zrodlo.id
  const wersja = Math.max(...pobierzHistorieRodziny(zrodlo).map((rekord) => rekord.wersja)) + 1
  const kopia = utworzNowyDokument({
    typ: zrodlo.typ,
    tytul: zrodlo.tytul,
    generatorId: zrodlo.generatorId,
    daneDokumentu: zrodlo.daneDokumentu,
    ustawieniaDokumentu: zrodlo.ustawieniaDokumentu,
    szkolenieId: zrodlo.szkolenieId,
    klientId: zrodlo.klientId,
    organizatorId: zrodlo.organizatorId,
    dokumentNadrzednyId: korzenId,
    poprzedniaWersjaId: zrodlo.id,
    autorId: zrodlo.autorId,
    wlascicielId: zrodlo.wlascicielId,
  })
  const dokument = { ...kopia, wersja }
  return repozytoriumWspolnychDokumentow.utworz(dokument)
}

function pobierzEksporty(): MetadaneEksportuDokumentu[] {
  try {
    const zapis = JSON.parse(localStorage.getItem(kluczHistoriiEksportow) ?? '[]') as unknown
    return Array.isArray(zapis) ? zapis.filter((wpis): wpis is MetadaneEksportuDokumentu => Boolean(wpis && typeof wpis === 'object' && typeof (wpis as { id?: unknown }).id === 'string')) : []
  } catch {
    return []
  }
}

export function pobierzHistorieEksportow(dokumentId: string) {
  return pobierzEksporty().filter((wpis) => wpis.dokumentId === dokumentId).sort((pierwszy, drugi) => Date.parse(drugi.utworzono) - Date.parse(pierwszy.utworzono))
}

export function zarejestrujEksportDokumentu(dokumentId: string, format: FormatEksportuDokumentu, nazwa: string, autorId: string | null = null) {
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(dokumentId)
  if (!dokument) return null

  const wpis: MetadaneEksportuDokumentu = {
    id: crypto.randomUUID(),
    dokumentId,
    wersjaDokumentu: dokument.wersja,
    format,
    nazwa,
    utworzono: new Date().toISOString(),
    autorId,
  }
  localStorage.setItem(kluczHistoriiEksportow, JSON.stringify([wpis, ...pobierzEksporty()]))
  return wpis
}
