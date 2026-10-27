import type { GeometriaPptx, ObiektSlajdu, SlajdPptx } from '../pptx/modelPptx'
import { potomkowieXml } from '../pptx/xmlPptx'

export type UwagaUkladu = { numerSlajdu: number; obiekt: string; opis: string }

export function czyOkladka(slajd: SlajdPptx) {
  return slajd.obiekty.some((obiekt) => obiekt.pole?.typ === 'ctrTitle' && /semper/i.test(obiekt.tekst))
}

export function czyObiektGlowny(obiekt: ObiektSlajdu) { return obiekt.klucz.split('/').length === 2 }

export function czyNumerSlajdu(obiekt: ObiektSlajdu) {
  return obiekt.pole?.typ === 'sldNum' || potomkowieXml(obiekt.element, 'fld').some((pole) => /slidenum/i.test(pole.getAttribute('type') ?? ''))
}

export function czyPrzeciecie(pierwsza: GeometriaPptx, druga: GeometriaPptx, odstep = 0) {
  return pierwsza.x < druga.x + druga.cx + odstep && pierwsza.x + pierwsza.cx + odstep > druga.x
    && pierwsza.y < druga.y + druga.cy + odstep && pierwsza.y + pierwsza.cy + odstep > druga.y
}

export function znajdzNaglowek(slajd: SlajdPptx) {
  return slajd.obiekty.find((obiekt) => obiekt.pole?.typ === 'title' && obiekt.tekst.trim() && obiekt.geometria
    && obiekt.geometria.y < slajd.wysokosc * .35 && obiekt.geometria.cx >= slajd.szerokosc * .4)
}

export function bezpiecznyObszar(slajd: SlajdPptx) {
  let gora = 0
  let dol = slajd.wysokosc
  for (const obiekt of slajd.elementyWzorca) {
    const geometria = obiekt.geometria
    if (!geometria || geometria.cy > slajd.wysokosc * .16) continue
    if (geometria.y < slajd.wysokosc * .12) gora = Math.max(gora, geometria.y + geometria.cy)
    if (geometria.y > slajd.wysokosc * .8) dol = Math.min(dol, geometria.y)
  }
  return { gora, dol, lewo: 0, prawo: slajd.szerokosc }
}

export function analizujUklad(slajd: SlajdPptx): UwagaUkladu[] {
  if (czyOkladka(slajd)) return []
  const uwagi: UwagaUkladu[] = []
  const obszar = bezpiecznyObszar(slajd)
  const naglowek = znajdzNaglowek(slajd)
  const tresci = slajd.obiekty.filter((obiekt) => obiekt.geometria && obiekt.typ !== 'grupa' && (obiekt.tekst.trim() || obiekt.typ === 'obraz' || obiekt.typ === 'ramka'))
  for (const obiekt of tresci) {
    const geometria = obiekt.geometria!
    const dodaj = (opis: string) => uwagi.push({ numerSlajdu: slajd.numer, obiekt: obiekt.id, opis })
    if (!obiekt.czyProstaGeometria) dodaj('Obiekt obrócony lub złożona transformacja: wymaga kontroli wizualnej.')
    if (geometria.x < 0 || geometria.x + geometria.cx > slajd.szerokosc + 1 || geometria.y < 0 || geometria.y + geometria.cy > slajd.wysokosc + 1) dodaj('Obiekt wychodzi poza slajd.')
    if (!czyNumerSlajdu(obiekt) && (geometria.y < obszar.gora || geometria.y + geometria.cy > obszar.dol)) dodaj('Treść wchodzi w obszar firmowego nagłówka lub stopki.')
    if (naglowek && obiekt !== naglowek && !czyNumerSlajdu(obiekt) && czyPrzeciecie(geometria, naglowek.geometria!)) dodaj('Treść nachodzi na nagłówek.')
  }
  const zawiera = (a: GeometriaPptx, b: GeometriaPptx) => a.x <= b.x && a.y <= b.y && a.x + a.cx >= b.x + b.cx && a.y + a.cy >= b.y + b.cy
  for (let indeks = 0; indeks < tresci.length; indeks++) {
    const pierwszy = tresci[indeks]
    for (const drugi of tresci.slice(indeks + 1)) {
      if (pierwszy === naglowek || drugi === naglowek) continue
      const a = pierwszy.geometria!, b = drugi.geometria!
      if (czyPrzeciecie(a, b) && !zawiera(a, b) && !zawiera(b, a)) uwagi.push({ numerSlajdu: slajd.numer, obiekt: drugi.id, opis: `Możliwa kolizja obiektów „${pierwszy.nazwa}” i „${drugi.nazwa}”.` })
    }
  }
  return uwagi
}
