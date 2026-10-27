import type { GeometriaPptx, ModelPptx, ObiektSlajdu, SlajdPptx } from '../pptx/modelPptx'
import { otworzPptx } from '../pptx/otworzPptx'
import { odczytajObiektySlajdu } from '../pptx/slajdyPptx'
import { czyObiektPowiazany, dopasujTekstDoPola, ustawGeometrie, zapiszZmianyPptx } from '../pptx/zmianyPptx'
import { potomkowieXml } from '../pptx/xmlPptx'
import { czyNumeracjaWzorca } from '../pptx/wzorcePptx'
import { analizujUklad, bezpiecznyObszar, czyNumerSlajdu, czyObiektGlowny, czyOkladka, czyPrzeciecie, znajdzNaglowek } from '../analiza/analizujUklad'

export type UstawieniaKorekty = { szerokoscCm: number; wysokoscCm: number; czyKorygowacUklad: boolean; czyUsuwacDuplikaty: boolean }

function przeskalujObiekt(obiekt: ObiektSlajdu, szerokosc: number, wysokosc: number, nowaSzerokosc: number, nowaWysokosc: number, czyWzorzec: boolean) {
  const geometria = obiekt.geometria
  if (!geometria || !czyObiektGlowny(obiekt)) return
  const skalaX = nowaSzerokosc / szerokosc, skalaY = nowaWysokosc / wysokosc
  const nowa = { ...geometria, x: geometria.x * skalaX, y: geometria.y * skalaY }
  if (czyWzorzec && geometria.y > wysokosc * .8) nowa.y = nowaWysokosc - (wysokosc - geometria.y)
  else if (czyWzorzec && geometria.y < wysokosc * .15) nowa.y = geometria.y
  if (obiekt.typ === 'obraz' || obiekt.typ === 'grupa' || obiekt.typ === 'ramka' || (obiekt.typ === 'ksztalt' && !obiekt.tekst && geometria.cx < szerokosc * .65)) {
    const skala = Math.min(skalaX, skalaY)
    nowa.cx *= skala; nowa.cy *= skala
  } else {
    nowa.cx *= skalaX
  }
  ustawGeometrie(obiekt, nowa)
  if (!czyWzorzec && obiekt.tekst) dopasujTekstDoPola(obiekt)
}

function dopasujDoObszaru(obiekt: ObiektSlajdu, obszar: { gora: number; dol: number; prawo: number }) {
  const geometria = { ...obiekt.geometria! }
  if (obiekt.typ === 'obraz' || obiekt.typ === 'grupa' || obiekt.typ === 'ramka') {
    const skala = Math.min(1, obszar.prawo / Math.max(1, geometria.cx), (obszar.dol - obszar.gora) / Math.max(1, geometria.cy))
    geometria.cx *= skala; geometria.cy *= skala
  } else {
    geometria.cx = Math.min(geometria.cx, obszar.prawo)
    geometria.cy = Math.min(geometria.cy, obszar.dol - obszar.gora)
  }
  geometria.x = Math.max(0, Math.min(geometria.x, obszar.prawo - geometria.cx))
  geometria.y = Math.max(obszar.gora, Math.min(geometria.y, obszar.dol - geometria.cy))
  return geometria
}

function poprawSlajd(slajd: SlajdPptx) {
  if (czyOkladka(slajd)) return 0
  const odstep = 45000
  const bezpieczny = bezpiecznyObszar(slajd)
  const obszar = { gora: bezpieczny.gora ? bezpieczny.gora + odstep : 0, dol: bezpieczny.dol < slajd.wysokosc ? bezpieczny.dol - odstep : slajd.wysokosc, prawo: slajd.szerokosc }
  if (obszar.dol <= obszar.gora) return 0
  const naglowek = znajdzNaglowek(slajd)
  const obiekty = slajd.obiekty.filter((obiekt) => czyObiektGlowny(obiekt) && obiekt.geometria && obiekt.czyProstaGeometria && !czyNumerSlajdu(obiekt))
  const poczatkowePozycje = new Map(obiekty.map((obiekt) => [obiekt, { ...obiekt.geometria! }]))
  const planowane = new Map<ObiektSlajdu, GeometriaPptx>()
  let liczba = 0
  const zmien = (obiekt: ObiektSlajdu, geometria: GeometriaPptx) => {
    if (JSON.stringify(geometria) === JSON.stringify(obiekt.geometria)) return
    obiekt.geometria = geometria
    planowane.set(obiekt, geometria)
    liczba++
  }
  if (naglowek && obiekty.includes(naglowek)) {
    const geometria = dopasujDoObszaru(naglowek, obszar)
    const rozmiary = potomkowieXml(naglowek.element, 'rPr').map((element) => Number(element.getAttribute('sz'))).filter((rozmiar) => rozmiar > 0)
    const czcionka = Math.max(...(rozmiary.length ? rozmiary : [2800])) / 100 * 12700
    const pojemnoscWiersza = Math.max(1, geometria.cx / (czcionka * .55))
    const wiersze = naglowek.tekst.split('\n').reduce((suma, tekst) => suma + Math.max(1, Math.ceil(tekst.length / pojemnoscWiersza)), 0)
    geometria.cy = Math.min(obszar.dol - geometria.y, Math.max(geometria.cy, wiersze * czcionka * 1.15 + 72000))
    zmien(naglowek, geometria)
  }
  let poczatekTresci = naglowek?.geometria ? naglowek.geometria.y + naglowek.geometria.cy + odstep : obszar.gora
  if (naglowek) {
    const separatory = obiekty.filter((obiekt) => obiekt.typ === 'linia' && obiekt.geometria!.cy < 60000
      && obiekt.geometria!.cx > slajd.szerokosc * .25 && obiekt.geometria!.y >= naglowek.geometria!.y
      && obiekt.geometria!.y < poczatekTresci + slajd.wysokosc * .05)
    for (const separator of separatory) {
      const nowaY = Math.max(separator.geometria!.y, poczatekTresci)
      zmien(separator, { ...separator.geometria!, y: nowaY })
      poczatekTresci = nowaY + separator.geometria!.cy + odstep
    }
  }
  const zajete: { przed: GeometriaPptx; po: GeometriaPptx }[] = []
  for (const obiekt of obiekty.filter((obiekt) => obiekt !== naglowek && obiekt.typ !== 'linia'
    && (obiekt.tekst.trim() || ['obraz', 'ramka', 'grupa'].includes(obiekt.typ))).sort((a, b) => a.geometria!.y - b.geometria!.y)) {
    const geometria = dopasujDoObszaru(obiekt, obszar)
    let nowaY = Math.max(geometria.y, poczatekTresci)
    for (const poprzedni of zajete) {
      const czyKolizjaPrzed = czyPrzeciecie(obiekt.geometria!, poprzedni.przed, odstep)
      const czyNowePrzesuniecie = nowaY !== obiekt.geometria!.y || poprzedni.przed.y !== poprzedni.po.y
      if ((!czyKolizjaPrzed || czyNowePrzesuniecie) && czyPrzeciecie({ ...geometria, y: nowaY }, poprzedni.po, odstep)) nowaY = Math.max(nowaY, poprzedni.po.y + poprzedni.po.cy + odstep)
    }
    if (nowaY + geometria.cy <= obszar.dol) geometria.y = nowaY
    // Brak miejsca nie uzasadnia usuwania treści ani przesuwania jej w stopkę.
    const przed = { ...obiekt.geometria! }
    zmien(obiekt, geometria)
    zajete.push({ przed, po: geometria })
  }
  const tresci = obiekty.filter((obiekt) => obiekt.tekst.trim() || ['obraz', 'ramka', 'grupa'].includes(obiekt.typ))
  const czyNowaKolizja = tresci.some((pierwszy, indeks) => tresci.slice(indeks + 1).some((drugi) =>
    czyPrzeciecie(pierwszy.geometria!, drugi.geometria!) && !czyPrzeciecie(poczatkowePozycje.get(pierwszy)!, poczatkowePozycje.get(drugi)!)))
  if (czyNowaKolizja) {
    for (const [obiekt, geometria] of poczatkowePozycje) obiekt.geometria = geometria
    return 0
  }
  for (const [obiekt, geometria] of planowane) { ustawGeometrie(obiekt, geometria); dopasujTekstDoPola(obiekt) }
  return liczba
}

export async function korygujUklad(model: ModelPptx, ustawienia: UstawieniaKorekty) {
  const { szerokoscCm, wysokoscCm } = ustawienia
  if (![szerokoscCm, wysokoscCm].every((wartosc) => Number.isFinite(wartosc) && wartosc >= 5 && wartosc <= 100)) throw new Error('Wymiary slajdu muszą mieścić się w zakresie 5–100 cm.')
  const kopia = await otworzPptx(model.buforZrodlowy)
  const zmiany = new Map<string, Document>()
  const szerokosc = kopia.slajdy[0].szerokosc, wysokosc = kopia.slajdy[0].wysokosc
  const nowaSzerokosc = Math.round(szerokoscCm * 360000), nowaWysokosc = Math.round(wysokoscCm * 360000)
  let zmienione = 0, duplikaty = 0
  if (nowaSzerokosc !== szerokosc || nowaWysokosc !== wysokosc) {
    const prezentacja = kopia.czesciXml.get('ppt/presentation.xml')!
    const rozmiar = potomkowieXml(prezentacja, 'sldSz')[0]
    rozmiar.setAttribute('cx', String(nowaSzerokosc)); rozmiar.setAttribute('cy', String(nowaWysokosc)); rozmiar.removeAttribute('type')
    zmiany.set('ppt/presentation.xml', prezentacja)
    for (const [czesc, dokument] of kopia.czesciXml) {
      if (!/^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(czesc)) continue
      const slajd = kopia.slajdy.find((pozycja) => pozycja.czesc === czesc)
      for (const obiekt of odczytajObiektySlajdu(dokument)) {
        if (slajd && czyOkladka(slajd) && obiekt.geometria && czyObiektGlowny(obiekt)) {
          const skala = Math.min(nowaSzerokosc / szerokosc, nowaWysokosc / wysokosc)
          ustawGeometrie(obiekt, { x: (nowaSzerokosc - szerokosc * skala) / 2 + obiekt.geometria.x * skala, y: (nowaWysokosc - wysokosc * skala) / 2 + obiekt.geometria.y * skala, cx: obiekt.geometria.cx * skala, cy: obiekt.geometria.cy * skala })
        } else przeskalujObiekt(obiekt, szerokosc, wysokosc, nowaSzerokosc, nowaWysokosc, !czesc.startsWith('ppt/slides/'))
      }
      zmiany.set(czesc, dokument)
    }
  }
  const wymiarowany = zmiany.size ? await zapiszZmianyPptx(kopia, zmiany) : kopia
  const poprawki = new Map<string, Document>()
  for (const slajd of wymiarowany.slajdy) {
    const przed = new XMLSerializer().serializeToString(slajd.dokument)
    if (ustawienia.czyUsuwacDuplikaty && czyNumeracjaWzorca(slajd)) {
      for (const obiekt of slajd.obiekty) {
        const geometria = obiekt.geometria
        if (!geometria || !czyObiektGlowny(obiekt) || czyNumerSlajdu(obiekt) || !/^\d{1,5}$/.test(obiekt.tekst.trim())
          || geometria.y < slajd.wysokosc * .8 || geometria.cx > slajd.szerokosc * .15 || geometria.cy > slajd.wysokosc * .12) continue
        if (czyObiektPowiazany(slajd.dokument, obiekt.id)) continue
        obiekt.element.parentNode?.removeChild(obiekt.element); duplikaty++
      }
      slajd.obiekty = odczytajObiektySlajdu(slajd.dokument)
    }
    if (ustawienia.czyKorygowacUklad) zmienione += poprawSlajd(slajd)
    if (przed !== new XMLSerializer().serializeToString(slajd.dokument)) poprawki.set(slajd.czesc, slajd.dokument)
  }
  const wynik = poprawki.size ? await zapiszZmianyPptx(wymiarowany, poprawki) : wymiarowany
  if (wynik.slajdy.length !== model.slajdy.length || wynik.slajdy.some((slajd, indeks) => slajd.czesc !== model.slajdy[indeks].czesc)) throw new Error('Zmieniła się kolejność slajdów. Nie zapisano wyniku.')
  return { model: wynik, zmienione, duplikaty, uwagi: wynik.slajdy.flatMap(analizujUklad) }
}
