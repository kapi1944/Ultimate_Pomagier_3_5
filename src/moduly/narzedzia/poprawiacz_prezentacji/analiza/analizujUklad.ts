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

export function czyBialaNumeracja(obiekt: ObiektSlajdu) {
  return potomkowieXml(obiekt.element, 'txBody').some((tekst) =>
    potomkowieXml(tekst, 'srgbClr').some((kolor) => kolor.getAttribute('val')?.toUpperCase() === 'FFFFFF')
    || potomkowieXml(tekst, 'prstClr').some((kolor) => kolor.getAttribute('val') === 'white')
    || potomkowieXml(tekst, 'schemeClr').some((kolor) => ['lt1', 'lt2', 'bg1', 'bg2'].includes(kolor.getAttribute('val') ?? '')))
}

export function czyPrzeciecie(pierwsza: GeometriaPptx, druga: GeometriaPptx, odstep = 0) {
  return pierwsza.x < druga.x + druga.cx + odstep && pierwsza.x + pierwsza.cx + odstep > druga.x
    && pierwsza.y < druga.y + druga.cy + odstep && pierwsza.y + pierwsza.cy + odstep > druga.y
}

export function znajdzNaglowek(slajd: SlajdPptx) {
  const kandydaci = slajd.obiekty.filter((obiekt) => czyObiektGlowny(obiekt) && obiekt.tekst.trim() && obiekt.geometria
    && obiekt.geometria.y < slajd.wysokosc * .35 && obiekt.geometria.cx >= slajd.szerokosc * .4)
  const rozmiar = (obiekt: ObiektSlajdu) => Math.max(0, ...[...potomkowieXml(obiekt.element, 'rPr'), ...potomkowieXml(obiekt.element, 'defRPr')]
    .map((element) => Number(element.getAttribute('sz'))))
  return kandydaci.find((obiekt) => obiekt.pole?.typ === 'title')
    ?? kandydaci.filter((obiekt) => rozmiar(obiekt) >= 2400 && obiekt.tekst.length <= 300
      && obiekt.geometria!.cy < slajd.wysokosc * .35).sort((pierwszy, drugi) => rozmiar(drugi) - rozmiar(pierwszy))[0]
}

export function czySeparatorNaglowka(obiekt: ObiektSlajdu, naglowek: ObiektSlajdu, slajd: SlajdPptx) {
  const geometria = obiekt.geometria, tytul = naglowek.geometria
  return Boolean(geometria && tytul && !obiekt.tekst.trim() && ['linia', 'ksztalt'].includes(obiekt.typ)
    && geometria.cy < 60000 && geometria.cx > slajd.szerokosc * .25
    && geometria.y >= tytul.y && geometria.y < tytul.y + tytul.cy + slajd.wysokosc * .05)
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
  const tresci = slajd.obiekty.filter((obiekt) => obiekt.geometria && czyObiektGlowny(obiekt))
  for (const obiekt of tresci) {
    const geometria = obiekt.geometria!
    const dodaj = (opis: string) => uwagi.push({ numerSlajdu: slajd.numer, obiekt: obiekt.id, opis })
    if (!obiekt.czyProstaGeometria) dodaj('Obiekt obrócony lub złożona transformacja: wymaga kontroli wizualnej.')
    if (geometria.x < 0 || geometria.x + geometria.cx > slajd.szerokosc + 1 || geometria.y < 0 || geometria.y + geometria.cy > slajd.wysokosc + 1) dodaj('Obiekt wychodzi poza slajd.')
    if (!czyNumerSlajdu(obiekt) && (geometria.y < obszar.gora || geometria.y + geometria.cy > obszar.dol)) dodaj('Treść wchodzi w obszar firmowego nagłówka lub stopki.')
    if (naglowek && obiekt !== naglowek && !czyNumerSlajdu(obiekt) && obiekt.tekst.trim() && czyPrzeciecie(geometria, naglowek.geometria!)) dodaj('Treść nachodzi na nagłówek.')
    if (naglowek && czySeparatorNaglowka(obiekt, naglowek, slajd) && geometria.y < naglowek.geometria!.y + naglowek.geometria!.cy + 45000) dodaj('Separator nachodzi na nagłówek lub nie zachowuje odstępu.')
  }
  const zawiera = (a: GeometriaPptx, b: GeometriaPptx) => a.x <= b.x && a.y <= b.y && a.x + a.cx >= b.x + b.cx && a.y + a.cy >= b.y + b.cy
  for (let indeks = 0; indeks < tresci.length; indeks++) {
    const pierwszy = tresci[indeks]
    for (const drugi of tresci.slice(indeks + 1)) {
      if (!pierwszy.tekst.trim() || !drugi.tekst.trim()) continue
      if (pierwszy === naglowek || drugi === naglowek) continue
      const a = pierwszy.geometria!, b = drugi.geometria!
      if (czyPrzeciecie(a, b) && !zawiera(a, b) && !zawiera(b, a)) uwagi.push({ numerSlajdu: slajd.numer, obiekt: drugi.id, opis: `Możliwa kolizja obiektów „${pierwszy.nazwa}” i „${drugi.nazwa}”.` })
    }
  }
  return uwagi
}
