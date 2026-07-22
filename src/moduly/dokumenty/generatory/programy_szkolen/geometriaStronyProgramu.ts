import type { ModelStronyA4 } from '../../../../wspolne/dokumenty/modelBlokowy'

export const geometriaStronyProgramu = {
  szerokoscMm: 210,
  wysokoscMm: 297,
  marginesDrukuMm: 0,
  odstepGornyMm: 14,
  odstepPoziomyMm: 15,
  wysokoscStopkiMm: 29,
  wysokoscNaglowkaModeluMm: 28,
  wysokoscStopkiModeluMm: 12,
  minimalnyOdstepOdKrawedziMm: 5,
} as const

export function pobierzWymiaryStronyProgramu() {
  return {
    szerokosc: `${geometriaStronyProgramu.szerokoscMm}mm`,
    wysokosc: `${geometriaStronyProgramu.wysokoscMm}mm`,
  }
}

export function utworzModelStronyProgramu(organizator: 'SEMPER' | 'IIST' | 'klient' = 'SEMPER'): ModelStronyA4 {
  const marginesy = {
    goraMm: geometriaStronyProgramu.odstepGornyMm,
    prawoMm: geometriaStronyProgramu.odstepPoziomyMm,
    dolMm: geometriaStronyProgramu.odstepGornyMm,
    lewoMm: geometriaStronyProgramu.odstepPoziomyMm,
  }

  return {
    format: 'A4',
    orientacja: 'pionowa',
    szerokoscMm: geometriaStronyProgramu.szerokoscMm,
    wysokoscMm: geometriaStronyProgramu.wysokoscMm,
    marginesy,
    obszarRoboczy: {
      xMm: marginesy.lewoMm,
      yMm: marginesy.goraMm,
      szerokoscMm: geometriaStronyProgramu.szerokoscMm - marginesy.lewoMm - marginesy.prawoMm,
      wysokoscMm: geometriaStronyProgramu.wysokoscMm - marginesy.goraMm - marginesy.dolMm,
    },
    naglowek: {
      aktywny: true,
      wysokoscMm: geometriaStronyProgramu.wysokoscNaglowkaModeluMm,
      organizator,
    },
    stopka: {
      aktywna: true,
      wysokoscMm: geometriaStronyProgramu.wysokoscStopkiModeluMm,
      organizator,
    },
    logotyp: {
      aktywny: false,
      szerokoscProcent: 90,
    },
    numeracjaStron: {
      aktywna: true,
      format: '1_z_n',
    },
    lamanieStron: {
      unikajDzieleniaNaglowkow: true,
      minimalnaLiczbaWierszyPoNaglowku: 2,
    },
    minimalneOdstepyOdKrawedziMm: geometriaStronyProgramu.minimalnyOdstepOdKrawedziMm,
    skalowaniePodgladu: 1,
    ustawieniaWydruku: {
      drukujTlo: true,
    },
    ustawieniaEksportu: {
      pdfReferencyjny: true,
      docxZTejSamejStruktury: true,
    },
  }
}
