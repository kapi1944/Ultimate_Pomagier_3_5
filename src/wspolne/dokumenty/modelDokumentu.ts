export type TypDokumentu =
  | 'PROGRAM_SZKOLENIA'
  | 'SZCZEGOLY_ORGANIZACYJNE'
  | 'LISTA_OBECNOSCI'
  | 'ANKIETA'
  | 'CERTYFIKAT'
  | 'ZASWIADCZENIE'
  | 'DYPLOM'
  | 'PROTOKOL'
  | 'MATERIAL_DODATKOWY'
  | 'KARTA_NA_DRZWI'
  | 'CHECKLISTA_PACZKI'
  | 'INNY'

export type StatusDokumentu = 'ROBOCZY' | 'GOTOWY' | 'OPUBLIKOWANY' | 'KOMPLETNY' | 'ZARCHIWIZOWANY'
export type PowiazanieZeSzczegolami = 'SAMODZIELNY' | 'POWIAZANY_ZE_SZCZEGOLAMI'
export type StanWartosciDokumentu = 'POBRANA_ZE_ZRODLA' | 'RECZNIE_NADPISANA' | 'NIEAKTUALNA_WZGLEM_ZRODLA'

export type IntegralnoscDokumentu = {
  powiazanieZeSzczegolami: PowiazanieZeSzczegolami
  idZrodlowychSzczegolow: string | null
  znacznikDanychZrodlowych: string | null
  reczneNadpisania: Record<string, unknown>
  czyDaneZrodloweNowsze: boolean
}

export const typyDokumentow: TypDokumentu[] = [
  'PROGRAM_SZKOLENIA',
  'SZCZEGOLY_ORGANIZACYJNE',
  'LISTA_OBECNOSCI',
  'ANKIETA',
  'CERTYFIKAT',
  'ZASWIADCZENIE',
  'DYPLOM',
  'PROTOKOL',
  'MATERIAL_DODATKOWY',
  'KARTA_NA_DRZWI',
  'CHECKLISTA_PACZKI',
  'INNY',
]

export const statusyDokumentow: StatusDokumentu[] = ['ROBOCZY', 'GOTOWY', 'OPUBLIKOWANY', 'KOMPLETNY', 'ZARCHIWIZOWANY']

export type Dokument<TDane, TUstawienia> = {
  id: string
  typ: TypDokumentu
  tytul: string
  status: StatusDokumentu
  wersja: number
  wersjaSchematu: number
  daneDokumentu: TDane
  ustawieniaDokumentu: TUstawienia
  generatorId: string
  szkolenieId: string | null
  klientId: string | null
  organizatorId: string | null
  dokumentNadrzednyId: string | null
  poprzedniaWersjaId: string | null
  integralnosc: IntegralnoscDokumentu
  utworzono: string
  zmodyfikowano: string
  zaktualizowano: string
  opublikowano: string | null
  autorId: string | null
  wlascicielId: string | null
  ostatnioModyfikujacyId: string | null
  czyZarchiwizowany: boolean
  zarchiwizowano: string | null
  czyUsunietyMiekko: boolean
  usunieto: string | null
}

export type DaneNowegoDokumentu<TDane, TUstawienia> = {
  id?: string
  typ: TypDokumentu
  tytul: string
  daneDokumentu: TDane
  ustawieniaDokumentu: TUstawienia
  generatorId: string
  szkolenieId?: string | null
  klientId?: string | null
  organizatorId?: string | null
  dokumentNadrzednyId?: string | null
  poprzedniaWersjaId?: string | null
  integralnosc?: Partial<IntegralnoscDokumentu>
  autorId?: string | null
  wlascicielId?: string | null
  ostatnioModyfikujacyId?: string | null
}

function utworzIdDokumentu() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `dokument-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function utworzNowyDokument<TDane, TUstawienia>(dane: DaneNowegoDokumentu<TDane, TUstawienia>): Dokument<TDane, TUstawienia> {
  const teraz = new Date().toISOString()

  return {
    id: dane.id?.trim() || utworzIdDokumentu(),
    typ: dane.typ,
    tytul: dane.tytul.trim() || 'Bez tytulu',
    status: 'ROBOCZY',
    wersja: 1,
    wersjaSchematu: 1,
    daneDokumentu: dane.daneDokumentu,
    ustawieniaDokumentu: dane.ustawieniaDokumentu,
    generatorId: dane.generatorId,
    szkolenieId: dane.szkolenieId ?? null,
    klientId: dane.klientId ?? null,
    organizatorId: dane.organizatorId ?? null,
    dokumentNadrzednyId: dane.dokumentNadrzednyId ?? null,
    poprzedniaWersjaId: dane.poprzedniaWersjaId ?? null,
    integralnosc: {
      powiazanieZeSzczegolami: dane.integralnosc?.powiazanieZeSzczegolami ?? (dane.integralnosc?.idZrodlowychSzczegolow ? 'POWIAZANY_ZE_SZCZEGOLAMI' : 'SAMODZIELNY'),
      idZrodlowychSzczegolow: dane.integralnosc?.idZrodlowychSzczegolow ?? null,
      znacznikDanychZrodlowych: dane.integralnosc?.znacznikDanychZrodlowych ?? null,
      reczneNadpisania: dane.integralnosc?.reczneNadpisania ?? {},
      czyDaneZrodloweNowsze: dane.integralnosc?.czyDaneZrodloweNowsze ?? false,
    },
    utworzono: teraz,
    zmodyfikowano: teraz,
    zaktualizowano: teraz,
    opublikowano: null,
    autorId: dane.autorId ?? null,
    wlascicielId: dane.wlascicielId ?? null,
    ostatnioModyfikujacyId: dane.ostatnioModyfikujacyId ?? null,
    czyZarchiwizowany: false,
    zarchiwizowano: null,
    czyUsunietyMiekko: false,
    usunieto: null,
  }
}

export type WynikWalidacjiDokumentu = {
  czyPoprawny: boolean
  bledy: string[]
}

function czyNiepustyTekst(wartosc: unknown): wartosc is string {
  return typeof wartosc === 'string' && wartosc.trim().length > 0
}

function czyDataIsoLubNull(wartosc: unknown) {
  return wartosc === null || (typeof wartosc === 'string' && !Number.isNaN(Date.parse(wartosc)))
}

export function walidujDokument(dokument: Dokument<unknown, unknown>): WynikWalidacjiDokumentu {
  const bledy: string[] = []

  if (!czyNiepustyTekst(dokument.id)) bledy.push('Dokument musi miec identyfikator.')
  if (!typyDokumentow.includes(dokument.typ)) bledy.push('Dokument ma nieobslugiwany typ.')
  if (!czyNiepustyTekst(dokument.tytul)) bledy.push('Dokument musi miec tytul.')
  if (!statusyDokumentow.includes(dokument.status)) bledy.push('Dokument ma nieobslugiwany status.')
  if (!Number.isInteger(dokument.wersja) || dokument.wersja < 1) bledy.push('Wersja dokumentu musi byc dodatnia liczba calkowita.')
  if (!Number.isInteger(dokument.wersjaSchematu) || dokument.wersjaSchematu < 1) bledy.push('Wersja schematu musi byc dodatnia liczba calkowita.')
  if (!czyNiepustyTekst(dokument.generatorId)) bledy.push('Dokument musi wskazywac generator.')
  if (dokument.integralnosc.powiazanieZeSzczegolami === 'SAMODZIELNY' && dokument.integralnosc.idZrodlowychSzczegolow !== null) bledy.push('Samodzielny dokument nie moze wskazywac Szczegolow organizacyjnych.')
  if (dokument.integralnosc.powiazanieZeSzczegolami === 'POWIAZANY_ZE_SZCZEGOLAMI' && !czyNiepustyTekst(dokument.integralnosc.idZrodlowychSzczegolow)) bledy.push('Powiazany dokument musi wskazywac Szczegoly organizacyjne.')
  if (!czyDataIsoLubNull(dokument.utworzono) || !czyDataIsoLubNull(dokument.zmodyfikowano) || !czyDataIsoLubNull(dokument.zaktualizowano) || !czyDataIsoLubNull(dokument.opublikowano)) bledy.push('Daty dokumentu musza miec format ISO.')
  if (dokument.zaktualizowano !== dokument.zmodyfikowano) bledy.push('Data aktualizacji musi odpowiadac dacie modyfikacji.')
  if (dokument.status === 'OPUBLIKOWANY' && dokument.opublikowano === null) bledy.push('Opublikowany dokument musi miec date publikacji.')
  if (dokument.czyZarchiwizowany !== (dokument.status === 'ZARCHIWIZOWANY')) bledy.push('Znacznik archiwizacji musi odpowiadac statusowi dokumentu.')
  if (dokument.czyZarchiwizowany !== (dokument.zarchiwizowano !== null)) bledy.push('Archiwizacja musi miec date archiwizacji.')
  if (dokument.czyUsunietyMiekko !== (dokument.usunieto !== null)) bledy.push('Miekkie usuniecie musi miec date usuniecia.')

  return { czyPoprawny: bledy.length === 0, bledy }
}

export function pobierzStanWartosciDokumentu(czyPoleNadpisaneRecznie: boolean, czyDaneZrodloweNowsze: boolean): StanWartosciDokumentu {
  if (czyDaneZrodloweNowsze) return 'NIEAKTUALNA_WZGLEM_ZRODLA'
  return czyPoleNadpisaneRecznie ? 'RECZNIE_NADPISANA' : 'POBRANA_ZE_ZRODLA'
}

export function czyDokumentMaNowszeDaneZrodlowe(dokument: Dokument<unknown, unknown>, aktualnyZnacznikDanychZrodlowych: string | null) {
  const { idZrodlowychSzczegolow, znacznikDanychZrodlowych } = dokument.integralnosc
  return idZrodlowychSzczegolow !== null && aktualnyZnacznikDanychZrodlowych !== null && znacznikDanychZrodlowych !== aktualnyZnacznikDanychZrodlowych
}
