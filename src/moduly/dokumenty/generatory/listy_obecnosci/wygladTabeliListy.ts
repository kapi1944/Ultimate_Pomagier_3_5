import type { CSSProperties } from 'react'

export type WygladTabeliListy = {
  wysokoscWierszaMm: number
  rozmiarTekstuPt: number
  rozmiarNaglowkowPt: number
}

export const domyslnyWygladTabeliListy: WygladTabeliListy = {
  // Odpowiedniki dotychczasowych 3.34 cqw i 1.58 cqw na stronie A4 z 190 mm treści.
  wysokoscWierszaMm: 6.346,
  rozmiarTekstuPt: 8.509606299212599,
  rozmiarNaglowkowPt: 8.509606299212599,
}
export const zakresFontuTabeli = { minimum: 7, maksimum: 14, krok: 0.5 }
export const maksymalnaWysokoscWierszaMm = 20
export const interliniaTabeliListy = 1.15
export const paddingPionowyTabeliMm = 1.083

export function minimalnaWysokoscWierszaMm(rozmiarTekstuPt: number) {
  return Math.ceil((rozmiarTekstuPt * 25.4 / 72 * interliniaTabeliListy + 2 * paddingPionowyTabeliMm + 0.2) * 10) / 10
}

export function normalizujWygladTabeliListy(wartosc: unknown): WygladTabeliListy {
  const dane = wartosc && typeof wartosc === 'object' ? wartosc as Record<string, unknown> : {}
  const ogranicz = (klucz: keyof WygladTabeliListy, minimum: number, maksimum: number) => {
    const liczba = dane[klucz]
    return typeof liczba === 'number' && Number.isFinite(liczba)
      ? Math.min(maksimum, Math.max(minimum, liczba)) : domyslnyWygladTabeliListy[klucz]
  }
  const rozmiarTekstuPt = ogranicz('rozmiarTekstuPt', 7, 14)
  return {
    rozmiarTekstuPt,
    rozmiarNaglowkowPt: ogranicz('rozmiarNaglowkowPt', 7, 14),
    wysokoscWierszaMm: Math.max(minimalnaWysokoscWierszaMm(rozmiarTekstuPt), ogranicz('wysokoscWierszaMm', 0, maksymalnaWysokoscWierszaMm)),
  }
}

export function zmienWygladTabeliListy(obecny: WygladTabeliListy, pole: keyof WygladTabeliListy, wartosc: number) {
  return normalizujWygladTabeliListy({ ...obecny, [pole]: wartosc })
}

export function przesunWygladTabeliListy(obecny: WygladTabeliListy, pole: keyof WygladTabeliListy, kierunek: -1 | 1) {
  const krok = pole === 'wysokoscWierszaMm' ? 0.1 : zakresFontuTabeli.krok
  return zmienWygladTabeliListy(obecny, pole, Number((Math.round((obecny[pole] + kierunek * krok) / krok) * krok).toFixed(1)))
}

export function pobierzStylTabeliListy(wyglad: WygladTabeliListy): CSSProperties & Record<`--${string}`, string | number> {
  const ustawienia = normalizujWygladTabeliListy(wyglad)
  // Kontener A4 ma 190 mm szerokości treści; cqw skaluje te same jednostki dokumentowe w podglądzie i eksporcie.
  return {
    '--wysokosc-wiersza': `${ustawienia.wysokoscWierszaMm / 1.9}cqw`,
    '--font-tabeli': `${ustawienia.rozmiarTekstuPt * 25.4 / 72 / 1.9}cqw`,
    '--font-naglowkow': `${ustawienia.rozmiarNaglowkowPt * 25.4 / 72 / 1.9}cqw`,
    '--interlinia-tabeli': interliniaTabeliListy,
    '--padding-pionowy': `${paddingPionowyTabeliMm / 1.9}cqw`,
  }
}

export function pobierzBladPrzepelnieniaListy(obszar: HTMLElement | null): string | null {
  return obszar && Array.from(obszar.querySelectorAll<HTMLElement>('.lista-obecnosci-a4')).some((strona) => strona.scrollHeight > strona.clientHeight + 1)
    ? 'Treść nie mieści się na stronie A4. Zmniejsz wysokość wierszy lub rozmiar tekstu tabeli albo skróć zawartość komórek.' : null
}
