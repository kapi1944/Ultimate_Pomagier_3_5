import {
  WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW,
  normalizujBlokiSwobodneDokumentu as normalizujBloki,
  type BlokSwobodnyDokumentu,
} from './modelSwobodnychBlokow'

export const WERSJA_UKLADU_DOKUMENTU = WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW

export type UstawieniaUkladuDokumentu = {
  wersja: typeof WERSJA_UKLADU_DOKUMENTU
  blokiSwobodne: BlokSwobodnyDokumentu[]
  zoom: number
}

export function utworzUstawieniaUkladuDokumentu(blokiSwobodne: BlokSwobodnyDokumentu[], zoom = 1): UstawieniaUkladuDokumentu {
  return {
    wersja: WERSJA_UKLADU_DOKUMENTU,
    blokiSwobodne: normalizujBloki(blokiSwobodne),
    zoom: Math.min(2, Math.max(0.5, Number.isFinite(zoom) ? zoom : 1)),
  }
}

export function normalizujUstawieniaUkladuDokumentu(wartosc: unknown, blokiDomyslne: BlokSwobodnyDokumentu[]): UstawieniaUkladuDokumentu {
  const rekordZewnetrzny = wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc) ? wartosc as Record<string, unknown> : {}
  const rekord = rekordZewnetrzny.ukladDokumentu && typeof rekordZewnetrzny.ukladDokumentu === 'object' && !Array.isArray(rekordZewnetrzny.ukladDokumentu)
    ? rekordZewnetrzny.ukladDokumentu as Record<string, unknown>
    : Array.isArray(wartosc) ? { blokiSwobodne: wartosc } : rekordZewnetrzny
  const bloki = normalizujBloki(rekord.blokiSwobodne ?? rekord.bloki)
  return utworzUstawieniaUkladuDokumentu(bloki.length ? bloki : blokiDomyslne, typeof rekord.zoom === 'number' ? rekord.zoom : 1)
}

export const wersjaUkladuDokumentu = WERSJA_UKLADU_DOKUMENTU
