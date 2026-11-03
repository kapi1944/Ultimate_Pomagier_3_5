import { useRef, useState } from 'react'
import type { ProblemPrezentacji } from './modele/modelPrezentacji'
import type { GeometriaPptx, SlajdPptx } from './pptx/modelPptx'
import { emuNaProcent } from './pptx/geometriaPptx'
import { tozsamoscObiektu } from './operacje/porownaniePrezentacji'
import { czyEdytowalny } from './operacje/edycjaPrezentacji'
import { bezpiecznyObszar } from './analiza/analizujUklad'

export default function PodgladStrukturalny({ slajd, problemy, czyNakladka = false, zaznaczenie = [], podswietlenia = [], kolor = '#e53935', kontury = true, marginesy = false, siatka = false, wybierz, przesun }: {
  slajd: SlajdPptx; problemy: ProblemPrezentacji[]; czyNakladka?: boolean; zaznaczenie?: string[]; podswietlenia?: string[]
  kolor?: string; kontury?: boolean; marginesy?: boolean; siatka?: boolean
  wybierz?: (id: string, wiele: boolean) => void; przesun?: (id: string, geometria: GeometriaPptx) => void
}) {
  const powierzchnia = useRef<HTMLDivElement>(null)
  const ruch = useRef<{ id: string; x: number; y: number; geometria: GeometriaPptx; szerokosc: number; wysokosc: number; rozmiar: boolean } | null>(null)
  const [robocza, ustawRobocza] = useState<{ id: string; geometria: GeometriaPptx } | null>(null)
  const obszar = bezpiecznyObszar(slajd)
  const kandydaci = new Set(problemy.filter((problem) => problem.numerSlajdu === slajd.numer).map((problem) => problem.kluczObiektu))
  return <div ref={powierzchnia} className={`poprawiacz-prezentacji__slajd prezentacja-struktura${czyNakladka ? ' prezentacja-struktura--nakladka' : ''}${siatka ? ' prezentacja-struktura--siatka' : ''}`}
    style={{ aspectRatio: `${slajd.szerokosc}/${slajd.wysokosc}`, backgroundSize: siatka ? `${91440 / slajd.szerokosc * 100}% ${91440 / slajd.wysokosc * 100}%` : undefined }} aria-label={`Struktura slajdu ${slajd.numer}`}>
    {slajd.obiekty.map((obiekt) => {
      const id = tozsamoscObiektu(slajd, obiekt)
      const geometria = robocza?.id === id ? robocza.geometria : obiekt.geometria
      if (!geometria) return null
      const zaznaczony = Boolean(id && zaznaczenie.includes(id))
      const podswietlony = Boolean(id && podswietlenia.includes(id))
      const edytowalny = Boolean(id && przesun && czyEdytowalny(obiekt))
      return <div key={obiekt.klucz} className={`poprawiacz-prezentacji__obiekt prezentacja-obiekt${zaznaczony ? ' prezentacja-obiekt--wybrany' : ''}`}
        data-tozsamosc={id ?? undefined} role={wybierz ? 'button' : undefined} tabIndex={wybierz ? 0 : undefined}
        aria-label={`${obiekt.nazwa || obiekt.typ}${!czyEdytowalny(obiekt) ? ' — tylko do odczytu' : ''}`}
        title={`${obiekt.nazwa || obiekt.typ}: ${obiekt.tekst}`}
        onClick={(zdarzenie) => { zdarzenie.stopPropagation(); if (id) wybierz?.(id, zdarzenie.ctrlKey || zdarzenie.metaKey || zdarzenie.shiftKey) }}
        onKeyDown={(zdarzenie) => { if (id && ['Enter', ' '].includes(zdarzenie.key)) { zdarzenie.preventDefault(); wybierz?.(id, zdarzenie.ctrlKey || zdarzenie.shiftKey) } }}
        onPointerDown={(zdarzenie) => {
          if (!edytowalny || !id || zdarzenie.button !== 0) return
          zdarzenie.stopPropagation()
          const prostokat = powierzchnia.current!.getBoundingClientRect()
          ruch.current = { id, x: zdarzenie.clientX, y: zdarzenie.clientY, geometria: { ...geometria }, szerokosc: prostokat.width, wysokosc: prostokat.height,
            rozmiar: (zdarzenie.target as HTMLElement).dataset.rozmiar === 'tak' }
          zdarzenie.currentTarget.setPointerCapture(zdarzenie.pointerId)
        }}
        onPointerMove={(zdarzenie) => {
          const poczatek = ruch.current
          if (!poczatek || poczatek.id !== id) return
          const x = (zdarzenie.clientX - poczatek.x) / poczatek.szerokosc * slajd.szerokosc
          const y = (zdarzenie.clientY - poczatek.y) / poczatek.wysokosc * slajd.wysokosc
          const przyciagnij = (wartosc: number) => siatka ? Math.round(wartosc / 91440) * 91440 : Math.round(wartosc)
          const nowa = poczatek.rozmiar ? { ...poczatek.geometria, cx: Math.max(1, przyciagnij(poczatek.geometria.cx + x)), cy: Math.max(1, przyciagnij(poczatek.geometria.cy + y)) }
            : { ...poczatek.geometria, x: przyciagnij(poczatek.geometria.x + x), y: przyciagnij(poczatek.geometria.y + y) }
          if (siatka && !zdarzenie.altKey) {
            const pozostale = slajd.obiekty.filter((kandydat) => kandydat !== obiekt && kandydat.geometria)
            const prowadniceX = [0, slajd.szerokosc / 2, slajd.szerokosc, ...pozostale.flatMap((kandydat) => [kandydat.geometria!.x, kandydat.geometria!.x + kandydat.geometria!.cx])]
            const prowadniceY = [obszar.gora, slajd.wysokosc / 2, obszar.dol, ...pozostale.flatMap((kandydat) => [kandydat.geometria!.y, kandydat.geometria!.y + kandydat.geometria!.cy])]
            const dopasuj = (wartosc: number, prowadnice: number[], tolerancja: number) => prowadnice.reduce((najblizsza, prowadnica) => Math.abs(prowadnica - wartosc) < Math.abs(najblizsza - wartosc) ? prowadnica : najblizsza, wartosc + tolerancja)
            const granicaX = 6 / poczatek.szerokosc * slajd.szerokosc, granicaY = 6 / poczatek.wysokosc * slajd.wysokosc
            const doceloweX = dopasuj(poczatek.rozmiar ? nowa.x + nowa.cx : nowa.x, prowadniceX, granicaX)
            const doceloweY = dopasuj(poczatek.rozmiar ? nowa.y + nowa.cy : nowa.y, prowadniceY, granicaY)
            if (Math.abs(doceloweX - (poczatek.rozmiar ? nowa.x + nowa.cx : nowa.x)) < granicaX) { if (poczatek.rozmiar) nowa.cx = Math.max(1, doceloweX - nowa.x); else nowa.x = doceloweX }
            if (Math.abs(doceloweY - (poczatek.rozmiar ? nowa.y + nowa.cy : nowa.y)) < granicaY) { if (poczatek.rozmiar) nowa.cy = Math.max(1, doceloweY - nowa.y); else nowa.y = doceloweY }
          }
          ustawRobocza({ id: poczatek.id, geometria: nowa })
        }}
        onPointerUp={(zdarzenie) => {
          if (ruch.current?.id !== id) return
          zdarzenie.stopPropagation()
          if (id && robocza?.id === id) przesun?.(id, robocza.geometria)
          ruch.current = null; ustawRobocza(null)
        }}
        onPointerCancel={() => { ruch.current = null; ustawRobocza(null) }}
        style={{ left: `${emuNaProcent(geometria.x, slajd.szerokosc)}%`, top: `${emuNaProcent(geometria.y, slajd.wysokosc)}%`,
          width: `${emuNaProcent(geometria.cx, slajd.szerokosc)}%`, height: `${emuNaProcent(geometria.cy, slajd.wysokosc)}%`,
          zIndex: obiekt.kolejnosc + 1, background: czyNakladka || obiekt.typ === 'grupa' ? 'transparent' : obiekt.wypelnienie ?? undefined,
          borderWidth: podswietlony ? 3 : kandydaci.has(obiekt.klucz) ? 2 : kontury || zaznaczony ? 1 : 0,
          borderStyle: 'solid',
          borderColor: zaznaczony ? 'var(--ui-tekst)' : podswietlony ? kolor : kandydaci.has(obiekt.klucz) ? '#ef9200' : undefined,
          pointerEvents: wybierz ? 'auto' : 'none', touchAction: edytowalny ? 'none' : undefined }}>
        {!czyNakladka && (obiekt.typ === 'obraz' ? 'Obraz' : obiekt.tabela ? `Tabela ${obiekt.tabela.wiersze} × ${obiekt.tabela.kolumny}` : obiekt.tekst.slice(0, 180))}
        {zaznaczony && edytowalny && <span data-rozmiar="tak" className="prezentacja-uchwyt" aria-hidden="true" />}
      </div>
    })}
    {marginesy && <div className="prezentacja-marginesy" aria-label="Bezpieczne marginesy z uwzględnieniem wzorca" style={{ top: `${Math.max(5, emuNaProcent(obszar.gora, slajd.wysokosc))}%`, bottom: `${Math.max(5, 100 - emuNaProcent(obszar.dol, slajd.wysokosc))}%` }} />}
    {siatka && <div className="prezentacja-prowadnice" aria-hidden="true" />}
  </div>
}
