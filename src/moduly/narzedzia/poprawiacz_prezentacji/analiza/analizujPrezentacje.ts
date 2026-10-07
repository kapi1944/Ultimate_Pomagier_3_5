import type { ProblemPrezentacji, TypPoprawki, WynikAnalizyPrezentacji } from '../modele/modelPrezentacji'
import type { ModelPptx, ObiektSlajdu, SlajdPptx } from '../pptx/modelPptx'
import { emuNaProcent } from '../pptx/geometriaPptx'

export function wykryjReguleSemper(obiekt: ObiektSlajdu, slajd: Pick<SlajdPptx, 'szerokosc' | 'wysokosc'>): TypPoprawki | null {
  const geometria = obiekt.geometria
  if (!geometria || !obiekt.czyProstaGeometria || obiekt.typ !== 'ksztalt') return null
  const x = emuNaProcent(geometria.x, slajd.szerokosc)
  const y = emuNaProcent(geometria.y, slajd.wysokosc)
  const cx = emuNaProcent(geometria.cx, slajd.szerokosc)
  const cy = emuNaProcent(geometria.cy, slajd.wysokosc)
  if (x >= 0 && x <= 2 && y >= 0 && y <= 2.5 && cx >= 94 && cy <= 3.5
    && obiekt.wypelnienie === '#087F8C' && obiekt.ksztalt === 'rect') return 'GÓRNY_PASEK'
  if (x >= 82 && y >= 84 && x + cx <= 100.1 && y + cy <= 100.1 && cx <= 12 && cy <= 10
    && /^\d{1,3}$/.test(obiekt.tekst.trim())) return 'NUMERACJA'
  return null
}

export function analizujPrezentacje(model: ModelPptx): WynikAnalizyPrezentacji {
  const problemy: ProblemPrezentacji[] = []
  const grupy = new Map<string, { opis: string; liczba: number; numerySlajdow: Set<number> }>()
  for (const slajd of model.slajdy) {
    for (const obiekt of slajd.obiekty) {
      const typ = wykryjReguleSemper(obiekt, slajd)
      if (typ) problemy.push({
        id: `${slajd.czesc}:${obiekt.klucz}`, typ, numerSlajdu: slajd.numer,
        czesc: slajd.czesc, kluczObiektu: obiekt.klucz,
        opis: typ === 'GÓRNY_PASEK' ? 'Obcy górny pasek' : `Obca numeracja: ${obiekt.tekst.trim()}`,
      })
      if (!obiekt.geometria || obiekt.typ === 'grupa') continue
      const geometria = obiekt.geometria
      const polozenie = [geometria.x / slajd.szerokosc, geometria.y / slajd.wysokosc,
        geometria.cx / slajd.szerokosc, geometria.cy / slajd.wysokosc].map((wartosc) => Math.round(wartosc * 100))
      const tekst = /^\d{1,3}$/.test(obiekt.tekst.trim()) ? 'liczba' : obiekt.tekst.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')
      const klucz = JSON.stringify([obiekt.typ, obiekt.ksztalt, polozenie, obiekt.wypelnienie, obiekt.linia, tekst])
      const opis = typ === 'GÓRNY_PASEK' ? 'prostokąt – górna krawędź'
        : typ === 'NUMERACJA' ? 'małe pole numeryczne – prawy dolny róg'
          : `${obiekt.typ === 'ksztalt' ? 'kształt' : obiekt.typ === 'obraz' ? 'obraz' : 'ramka'} – ${obiekt.tekst.trim().slice(0, 45) || obiekt.nazwa || 'bez tekstu'}`
      const grupa = grupy.get(klucz) ?? { opis, liczba: 0, numerySlajdow: new Set<number>() }
      grupa.liczba++
      grupa.numerySlajdow.add(slajd.numer)
      grupy.set(klucz, grupa)
    }
  }
  return { liczbaSlajdow: model.slajdy.length, problemy,
    powtarzalne: [...grupy.values()].filter((grupa) => grupa.numerySlajdow.size > 1)
      .sort((pierwsza, druga) => druga.liczba - pierwsza.liczba)
      .map((grupa) => ({ ...grupa, numerySlajdow: [...grupa.numerySlajdow] })),
  }
}
