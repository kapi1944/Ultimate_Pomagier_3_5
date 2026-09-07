import {
  WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW,
  normalizujBlokiSwobodneDokumentu as normalizujBloki,
  type BlokSwobodnyDokumentu,
} from './modelSwobodnychBlokow'

export type UstawieniaUkladuDokumentu = {
  wersja: 1
  blokiSwobodne: BlokSwobodnyDokumentu[]
  zoom: number
}

export function utworzUstawieniaUkladuDokumentu(blokiSwobodne: BlokSwobodnyDokumentu[], zoom = 1): UstawieniaUkladuDokumentu {
  return {
    wersja: 1,
    blokiSwobodne: normalizujBloki(blokiSwobodne),
    zoom: Math.min(2, Math.max(0.5, Number.isFinite(zoom) ? zoom : 1)),
  }
}

export function normalizujUstawieniaUkladuDokumentu(wartosc: unknown, blokiDomyslne: BlokSwobodnyDokumentu[]): UstawieniaUkladuDokumentu {
  const rekord = wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc) ? wartosc as Record<string, unknown> : {}
  const bloki = normalizujBloki(rekord.blokiSwobodne ?? rekord.bloki)
  return utworzUstawieniaUkladuDokumentu(bloki.length ? bloki : blokiDomyslne, typeof rekord.zoom === 'number' ? rekord.zoom : 1)
}

export const wersjaUkladuDokumentu = WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW
