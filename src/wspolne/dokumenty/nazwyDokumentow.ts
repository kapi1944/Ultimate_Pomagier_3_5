import type { Dokument, TypDokumentu } from './modelDokumentu'

const nazwyTypowDokumentow: Record<TypDokumentu, string> = {
  PROGRAM_SZKOLENIA: 'Program-szkolenia',
  SZCZEGOLY_ORGANIZACYJNE: 'Szczegoly-organizacyjne',
  LISTA_OBECNOSCI: 'Lista-obecnosci',
  ANKIETA: 'Ankieta',
  CERTYFIKAT: 'Certyfikat',
  ZASWIADCZENIE: 'Zaswiadczenie',
  DYPLOM: 'Dyplom',
  PROTOKOL: 'Protokol',
  MATERIAL_DODATKOWY: 'Material-dodatkowy',
  KARTA_NA_DRZWI: 'Karta-na-drzwi',
  CHECKLISTA_PACZKI: 'Checklista-paczki',
  INNY: 'Inny-dokument',
}

function formatujDate(data: Date) {
  return [data.getFullYear(), String(data.getMonth() + 1).padStart(2, '0'), String(data.getDate()).padStart(2, '0')].join('-')
}

function czyTenSamDzien(dataIso: string, data: Date) {
  return formatujDate(new Date(dataIso)) === formatujDate(data)
}

export function pobierzZnormalizowanaNazweTypuDokumentu(typ: TypDokumentu) {
  return nazwyTypowDokumentow[typ]
}

export function pobierzKolejnyNumerDziennyDokumentu(dokumenty: Dokument<unknown, unknown>[], typ: TypDokumentu, data = new Date()) {
  return dokumenty.filter((dokument) => dokument.typ === typ && czyTenSamDzien(dokument.utworzono, data)).length + 1
}

export function utworzIdentyfikatorDokumentu(typ: TypDokumentu, numerDzienny: number, wersja: number, data = new Date()) {
  return `${formatujDate(data)}_${pobierzZnormalizowanaNazweTypuDokumentu(typ)}_${String(numerDzienny).padStart(2, '0')}v${String(wersja).padStart(2, '0')}`
}
