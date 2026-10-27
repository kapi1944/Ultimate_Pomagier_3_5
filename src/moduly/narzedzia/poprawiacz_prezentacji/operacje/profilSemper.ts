import type { SlajdPptx } from '../pptx/modelPptx'
import { bezpiecznyObszar, czyBialaNumeracja, czyNumerSlajdu, czyObiektGlowny, czyOkladka, czySeparatorNaglowka, znajdzNaglowek } from '../analiza/analizujUklad'
import { czyObiektPowiazany, ustawGeometrie } from '../pptx/zmianyPptx'
import { czyNumeracjaWzorca } from '../pptx/wzorcePptx'
import { potomkowieXml } from '../pptx/xmlPptx'

export function poprawProfilSemper(slajd: SlajdPptx, czyUsuwacDuplikaty: boolean) {
  if (czyOkladka(slajd)) {
    let zmienione = 0
    for (const obiekt of slajd.obiekty) {
      const geometria = obiekt.geometria
      if (geometria && czyObiektGlowny(obiekt) && obiekt.czyProstaGeometria && obiekt.tekst.length > 300
        && geometria.cx > slajd.szerokosc * .8 && geometria.y > slajd.wysokosc * .8) {
        const y = Math.round(slajd.wysokosc * .867)
        if (y !== geometria.y) { ustawGeometrie(obiekt, { ...geometria, y }); zmienione++ }
      }
    }
    return { zmienione, duplikaty: 0 }
  }
  if (!slajd.elementyWzorca.some((obiekt) => /SEMPER/.test(obiekt.tekst))) return { zmienione: 0, duplikaty: 0 }
  const bezpieczny = bezpiecznyObszar(slajd)
  const gora = Math.max(bezpieczny.gora + 45000, 727200)
  const dol = bezpieczny.dol - 12600
  if (dol <= gora) return { zmienione: 0, duplikaty: 0 }
  let zmienione = 0, duplikaty = 0
  for (const obiekt of slajd.obiekty) {
    const geometria = obiekt.geometria
    if (!geometria || !czyObiektGlowny(obiekt) || !obiekt.czyProstaGeometria || czyNumerSlajdu(obiekt)
      || czyObiektPowiazany(slajd.dokument, obiekt.id)) continue
    const czyPelneTlo = !obiekt.tekst.trim() && obiekt.typ === 'ksztalt' && obiekt.wypelnienie === '#FFFFFF' && geometria.x <= 100 && geometria.y <= 100
      && geometria.cx >= slajd.szerokosc * .99 && geometria.cy >= slajd.wysokosc * .9
    const czyPasek = !obiekt.tekst.trim() && obiekt.typ === 'ksztalt' && geometria.cx > slajd.szerokosc * .94
      && geometria.y < bezpieczny.gora && geometria.cy < slajd.wysokosc * .035
    const czyDolnySeparator = !obiekt.tekst.trim() && ['ksztalt', 'linia'].includes(obiekt.typ)
      && geometria.cx > slajd.szerokosc * .65 && geometria.cy < 30000 && geometria.y > slajd.wysokosc * .84
    const czyDodatkowyNumer = czyUsuwacDuplikaty && czyNumeracjaWzorca(slajd) && /^\d{1,5}$/.test(obiekt.tekst.trim()) && !czyBialaNumeracja(obiekt)
      && geometria.x > slajd.szerokosc * .8 && geometria.cx < slajd.szerokosc * .15
      && geometria.cy < slajd.wysokosc * .12 && (geometria.y < slajd.wysokosc * .2 || geometria.y > slajd.wysokosc * .8)
    if (czyPelneTlo || czyPasek || czyDolnySeparator || czyDodatkowyNumer) {
      obiekt.element.parentNode?.removeChild(obiekt.element)
      if (czyDodatkowyNumer) duplikaty++
      else zmienione++
    }
  }
  slajd.obiekty = slajd.obiekty.filter((obiekt) => obiekt.element.parentNode)
  const naglowek = znajdzNaglowek(slajd)
  const poczatkowyNaglowek = naglowek?.geometria ? { ...naglowek.geometria } : null
  const etykiety = naglowek && poczatkowyNaglowek ? slajd.obiekty.filter((obiekt) => obiekt.tekst.trim() && obiekt.geometria
    && obiekt.geometria.y + obiekt.geometria.cy <= poczatkowyNaglowek.y) : []
  const czyPrzesunacTresc = Boolean(poczatkowyNaglowek && poczatkowyNaglowek.y < 1200000 && etykiety.some((obiekt) => obiekt.geometria!.y < gora))
  const separatory = naglowek ? slajd.obiekty.filter((obiekt) => czySeparatorNaglowka(obiekt, naglowek, slajd)) : []
  const odstepySeparatorow = new Map(separatory.map((obiekt) => [obiekt, Math.max(72000,
    Math.min(230000, obiekt.geometria!.y - poczatkowyNaglowek!.y - poczatkowyNaglowek!.cy))]))
  const przesunieciaEtykiet = new Map<typeof slajd.obiekty[number], number>()
  for (const etykieta of etykiety) {
    const tekst = etykieta.geometria!
    const panel = slajd.obiekty.find((obiekt) => !obiekt.tekst.trim() && obiekt.typ === 'ksztalt' && obiekt.geometria
      && obiekt.geometria.cx < slajd.szerokosc * .4 && obiekt.geometria.x <= tekst.x && obiekt.geometria.y <= tekst.y
      && obiekt.geometria.x + obiekt.geometria.cx >= tekst.x + tekst.cx && obiekt.geometria.y + obiekt.geometria.cy >= tekst.y + tekst.cy)
    if (panel) {
      const przesuniecie = Math.max(0, 810000 - panel.geometria!.y)
      przesunieciaEtykiet.set(etykieta, przesuniecie); przesunieciaEtykiet.set(panel, przesuniecie)
    }
  }
  for (const obiekt of slajd.obiekty) {
    const geometria = obiekt.geometria
    if (!geometria || !czyObiektGlowny(obiekt) || !obiekt.czyProstaGeometria || czyNumerSlajdu(obiekt)
      || (/^\d{1,5}$/.test(obiekt.tekst.trim()) && geometria.x > slajd.szerokosc * .8 && czyBialaNumeracja(obiekt))) continue
    const nowa = { ...geometria }
    if (obiekt === naglowek) {
      nowa.y = Math.max(nowa.y + (czyPrzesunacTresc ? 360000 : 0), etykiety.length ? 1033950 : 788400)
      const rozmiary = [...potomkowieXml(obiekt.element, 'rPr'), ...potomkowieXml(obiekt.element, 'defRPr')]
        .map((element) => Number(element.getAttribute('sz'))).filter((rozmiar) => rozmiar > 0)
      const czcionka = Math.max(...(rozmiary.length ? rozmiary : [2800])) / 100 * 12700
      nowa.cy = Math.max(nowa.cy, obiekt.tekst.split('\n').length * czcionka * 1.15 + 91440)
    } else if (etykiety.includes(obiekt)) {
      nowa.y = Math.max(nowa.y, 770400)
    } else if (czyPrzesunacTresc && !separatory.includes(obiekt)) nowa.y += 180000
    if (przesunieciaEtykiet.has(obiekt)) nowa.y = geometria.y + przesunieciaEtykiet.get(obiekt)!
    if (obiekt.typ === 'ksztalt' && !obiekt.tekst.trim() && geometria.cy > slajd.wysokosc * .8) {
      nowa.y = Math.max(gora, geometria.y)
      nowa.cy = Math.min(geometria.y + geometria.cy, dol) - nowa.y
    } else if (!separatory.includes(obiekt)) {
      if (nowa.cy > dol - gora && ['obraz', 'grupa', 'ramka'].includes(obiekt.typ)) {
        const skala = (dol - gora) / nowa.cy
        nowa.cx *= skala; nowa.cy *= skala
      }
      nowa.y = Math.max(obiekt.tekst.trim() && obiekt !== naglowek && !etykiety.includes(obiekt) ? bezpieczny.gora : gora, Math.min(nowa.y, dol - nowa.cy))
      if (obiekt.tekst.trim() && geometria.y > slajd.wysokosc * .85) nowa.y = Math.min(nowa.y, dol - 234000 - nowa.cy)
    }
    if (JSON.stringify(nowa) !== JSON.stringify(geometria)) { ustawGeometrie(obiekt, nowa); zmienione++ }
  }
  if (naglowek?.geometria) {
    // Wysokość istniejącego pola zachowuje łamanie wierszy i ustawienia czcionki z PPTX.
    for (const separator of separatory) {
      const geometria = separator.geometria!
      const y = Math.max(geometria.y, naglowek.geometria.y + naglowek.geometria.cy + odstepySeparatorow.get(separator)!)
      if (y !== geometria.y) { ustawGeometrie(separator, { ...geometria, y }); zmienione++ }
    }
  }
  return { zmienione, duplikaty }
}
