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

const znakiNiedozwoloneWNazwiePliku = /[<>:"/\\|?*]/g

export function oczyscNazwePliku(nazwa: string) {
  return Array.from(nazwa)
    .filter((znak) => znak.charCodeAt(0) >= 32)
    .join('')
    .replace(znakiNiedozwoloneWNazwiePliku, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '') || 'Dokument'
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

export function utworzNazwePlikuDokumentu(typ: TypDokumentu, tytul?: string, rozszerzenie = 'pdf') {
  const podstawa = [pobierzZnormalizowanaNazweTypuDokumentu(typ), tytul?.trim()].filter(Boolean).join('_')
  const bezpieczneRozszerzenie = rozszerzenie.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'pdf'
  return `${oczyscNazwePliku(podstawa)}.${bezpieczneRozszerzenie}`
}

export function pobierzKolejnyNumerDziennyDokumentu(dokumenty: Dokument<unknown, unknown>[], typ: TypDokumentu, data = new Date()) {
  return dokumenty.filter((dokument) => dokument.typ === typ && czyTenSamDzien(dokument.utworzono, data)).length + 1
}

export function utworzIdentyfikatorDokumentu(typ: TypDokumentu, numerDzienny: number, wersja: number, data = new Date()) {
  return `${formatujDate(data)}_${pobierzZnormalizowanaNazweTypuDokumentu(typ)}_${String(numerDzienny).padStart(2, '0')}v${String(wersja).padStart(2, '0')}`
}
