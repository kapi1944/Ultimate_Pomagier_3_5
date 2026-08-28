import type { Dokument, TypDokumentu } from './modelDokumentu'

const nazwyTypowDokumentow: Record<TypDokumentu, string> = {
  PROGRAM_SZKOLENIA: 'Program-szkolenia', SZCZEGOLY_ORGANIZACYJNE: 'Szczegoly-organizacyjne', LISTA_OBECNOSCI: 'Lista-obecnosci', ANKIETA: 'Ankieta', CERTYFIKAT: 'Certyfikat', ZASWIADCZENIE: 'Zaswiadczenie', DYPLOM: 'Dyplom', PROTOKOL: 'Protokol', MATERIAL_DODATKOWY: 'Material-dodatkowy', KARTA_NA_DRZWI: 'Karta-na-drzwi', CHECKLISTA_PACZKI: 'Checklista-paczki', INNY: 'Inny-dokument',
}
const znakiNiedozwoloneWNazwiePliku = /[<>:"/\\|?*]/g
const wartosciPuste = new Set(['brak', 'nieznany', 'undefined', 'null', 'bez organizatora'])

export type DaneKlientaDoNazwyEksportu = { skrot?: string | null; nazwaSkrocona?: string | null; nazwa?: string | null }
export type DaneNazwyEksportowanegoDokumentu = {
  typDokumentu: TypDokumentu; organizator?: string | null; terminy?: string[] | null; klient?: DaneKlientaDoNazwyEksportu | string | null; miejsce?: string | null; czyOnline?: boolean; tytulSzkolenia?: string | null; nazwaUzytkownika?: string | null; dataUtworzenia?: string | Date | null; wersja?: number | null; rozszerzenie?: string
}

export function oczyscNazwePliku(nazwa: string) { return Array.from(nazwa).filter((znak) => znak.charCodeAt(0) >= 32).join('').replace(znakiNiedozwoloneWNazwiePliku, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '') || 'Dokument' }
export function sanityzujSegmentNazwy(wartosc: string | null | undefined, maksymalnaDlugosc = 80) {
  if (typeof wartosc !== 'string') return ''
  const oczyszczona = wartosc.replace(/[łŁ]/g, (znak) => znak === 'ł' ? 'l' : 'L').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(znakiNiedozwoloneWNazwiePliku, ' ').replace(/[\r\n\t]+/g, ' ').replace(/[_\s]+/g, '_').replace(/^_+|_+$/g, '').replace(/\.{2,}/g, '.').replace(/[. ]+$/g, '')
  if (!oczyszczona || wartosciPuste.has(oczyszczona.toLocaleLowerCase('pl'))) return ''
  return oczyszczona.slice(0, maksymalnaDlugosc).replace(/_+$/g, '')
}
function formatujDateDoNazwy(data: Date) { return [data.getFullYear(), String(data.getMonth() + 1).padStart(2, '0'), String(data.getDate()).padStart(2, '0')].join('.') }
function odczytajDate(wartosc: string) { const dopasowanie = /^(\d{4})-(\d{2})-(\d{2})/.exec(wartosc); if (!dopasowanie) return null; const data = new Date(`${dopasowanie[1]}-${dopasowanie[2]}-${dopasowanie[3]}T00:00:00`); return Number.isNaN(data.getTime()) ? null : data }
export function formatujTerminyDoNazwy(wartosci: string[] | null | undefined) {
  const unikalneDaty = new Map((wartosci ?? []).map((wartosc) => [wartosc.slice(0, 10), odczytajDate(wartosc)]))
  const daty = [...unikalneDaty.values()].flatMap((data) => data ? [data] : []).sort((a, b) => a.getTime() - b.getTime())
  const grupy: Date[][] = []
  daty.forEach((data) => { const grupa = grupy.at(-1); const poprzednia = grupa?.at(-1); if (grupa && poprzednia && data.getTime() - poprzednia.getTime() === 86400000) grupa.push(data); else grupy.push([data]) })
  return grupy.map((grupa) => { const pierwsza = grupa[0]; const ostatnia = grupa.at(-1)!; if (grupa.length === 1) return formatujDateDoNazwy(pierwsza); if (pierwsza.getFullYear() === ostatnia.getFullYear() && pierwsza.getMonth() === ostatnia.getMonth()) return `${formatujDateDoNazwy(pierwsza)}-${String(ostatnia.getDate()).padStart(2, '0')}`; return `${formatujDateDoNazwy(pierwsza)}-${formatujDateDoNazwy(ostatnia)}` }).join('+')
}
function pobierzDateUtworzenia(data: string | Date | null | undefined) { if (data instanceof Date && !Number.isNaN(data.getTime())) return formatujDateDoNazwy(data); if (typeof data === 'string') { const dopasowanie = /^(\d{4})-(\d{2})-(\d{2})/.exec(data); if (dopasowanie) return `${dopasowanie[1]}.${dopasowanie[2]}.${dopasowanie[3]}` } return formatujDateDoNazwy(new Date()) }
function pobierzNazweKlienta(klient: DaneKlientaDoNazwyEksportu | string | null | undefined) { return typeof klient === 'string' ? klient : klient?.skrot ?? klient?.nazwaSkrocona ?? klient?.nazwa ?? '' }
function pobierzNazweOrganizatora(organizator: string | null | undefined) { const wartosc = organizator?.toLocaleUpperCase('pl') ?? ''; if (wartosc.includes('SEMPER')) return 'SEMPER'; if (wartosc.includes('IIST')) return 'IIST'; return organizator ?? '' }
export function pobierzZnormalizowanaNazweTypuDokumentu(typ: TypDokumentu) { return nazwyTypowDokumentow[typ] }
export function czyNazwaWymagaOpisuUzytkownika(dane: DaneNazwyEksportowanegoDokumentu) { return !sanityzujSegmentNazwy(dane.tytulSzkolenia) && !sanityzujSegmentNazwy(dane.nazwaUzytkownika) }
export function zbudujNazweBazowaEksportowanegoDokumentu(dane: DaneNazwyEksportowanegoDokumentu) {
  const maTytul = Boolean(sanityzujSegmentNazwy(dane.tytulSzkolenia))
  const segmenty = maTytul ? [pobierzNazweOrganizatora(dane.organizator), formatujTerminyDoNazwy(dane.terminy), pobierzNazweKlienta(dane.klient), dane.czyOnline ? 'online' : dane.miejsce, dane.tytulSzkolenia] : [pobierzDateUtworzenia(dane.dataUtworzenia), dane.nazwaUzytkownika]
  const rodzajDokumentu = sanityzujSegmentNazwy(pobierzZnormalizowanaNazweTypuDokumentu(dane.typDokumentu), 48).replace(/-/g, '_')
  return segmenty.map((segment, indeks) => sanityzujSegmentNazwy(segment, indeks === segmenty.length - 1 ? 80 : 48)).filter(Boolean).concat(rodzajDokumentu).join('_')
}
export function zbudujNazweEksportowanegoDokumentu(dane: DaneNazwyEksportowanegoDokumentu) { const wersja = Number.isInteger(dane.wersja) && (dane.wersja ?? 0) > 0 ? dane.wersja! : 1; const rozszerzenie = (dane.rozszerzenie ?? 'pdf').replace(/[^a-z0-9]/gi, '').toLocaleLowerCase() || 'pdf'; return `${zbudujNazweBazowaEksportowanegoDokumentu(dane)}_(v${wersja}).${rozszerzenie}` }
// Zachowana sygnatura dla starszych generatorow; korzysta z tego samego buildera.
export function utworzNazwePlikuDokumentu(typ: TypDokumentu, tytul?: string, rozszerzenie = 'pdf') { return zbudujNazweEksportowanegoDokumentu({ typDokumentu: typ, tytulSzkolenia: tytul, rozszerzenie }) }
function formatujDate(data: Date) { return [data.getFullYear(), String(data.getMonth() + 1).padStart(2, '0'), String(data.getDate()).padStart(2, '0')].join('-') }
function czyTenSamDzien(dataIso: string, data: Date) { return formatujDate(new Date(dataIso)) === formatujDate(data) }
export function pobierzKolejnyNumerDziennyDokumentu(dokumenty: Dokument<unknown, unknown>[], typ: TypDokumentu, data = new Date()) { return dokumenty.filter((dokument) => dokument.typ === typ && czyTenSamDzien(dokument.utworzono, data)).length + 1 }
export function utworzIdentyfikatorDokumentu(typ: TypDokumentu, numerDzienny: number, wersja: number, data = new Date()) { return `${formatujDate(data)}_${pobierzZnormalizowanaNazweTypuDokumentu(typ)}_${String(numerDzienny).padStart(2, '0')}v${String(wersja).padStart(2, '0')}` }
