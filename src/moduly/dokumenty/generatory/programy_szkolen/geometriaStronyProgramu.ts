export const geometriaStronyProgramu = {
  szerokoscMm: 210,
  wysokoscMm: 297,
  marginesDrukuMm: 0,
  odstepGornyMm: 14,
  odstepPoziomyMm: 15,
  wysokoscStopkiMm: 29,
} as const

export function pobierzWymiaryStronyProgramu() {
  return {
    szerokosc: `${geometriaStronyProgramu.szerokoscMm}mm`,
    wysokosc: `${geometriaStronyProgramu.wysokoscMm}mm`,
  }
}
