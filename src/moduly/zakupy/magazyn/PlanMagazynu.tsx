import { useRef, useState, type PointerEvent } from 'react'
import type { LokalizacjaMapy, ProstokatMapy, StanZakupow } from '../modele/zakupy'
import { etykietyProblemow, ograniczProstokat, pobierzProblemyLokalizacji, uporzadkujLokalizacje } from '../logika/mapaMagazynu'

export default function PlanMagazynu({ dane, rodzicId, wybranaId, podswietloneId, czyFiltr, czyEdycja, wybierz, zmienProstokat }: {
  dane: Omit<StanZakupow, 'lokalizacjeMagazynowe'> & { lokalizacjeMagazynowe: LokalizacjaMapy[] }
  rodzicId: string | null
  wybranaId: string | null
  podswietloneId: Set<string>
  czyFiltr: boolean
  czyEdycja: boolean
  wybierz: (id: string) => void
  zmienProstokat: (id: string, prostokat: ProstokatMapy) => void
}) {
  const plan = useRef<HTMLDivElement>(null)
  const [powiekszenie, ustawPowiekszenie] = useState(1)
  const [czySiatka, ustawSiatke] = useState(false)
  const gest = useRef<{ id: string; wskaznikId: number; x: number; y: number; szerokoscPlanu: number; wysokoscPlanu: number; prostokat: ProstokatMapy; czySkalowanie: boolean } | null>(null)
  const lokalizacje = uporzadkujLokalizacje(dane.lokalizacjeMagazynowe).filter((lokalizacja) => lokalizacja.polozenieNaMapie && (lokalizacja.nadrzednaLokalizacjaId ?? null) === rodzicId)

  function rozpocznij(zdarzenie: PointerEvent<HTMLButtonElement>, lokalizacja: LokalizacjaMapy, czySkalowanie: boolean) {
    if (!czyEdycja || zdarzenie.button !== 0 || !plan.current || !lokalizacja.polozenieNaMapie) return
    const wymiary = plan.current.getBoundingClientRect()
    if (!wymiary.width || !wymiary.height) return
    zdarzenie.preventDefault()
    wybierz(lokalizacja.id)
    gest.current = { id: lokalizacja.id, wskaznikId: zdarzenie.pointerId, x: zdarzenie.clientX, y: zdarzenie.clientY, szerokoscPlanu: wymiary.width, wysokoscPlanu: wymiary.height, prostokat: lokalizacja.polozenieNaMapie, czySkalowanie }
    zdarzenie.currentTarget.setPointerCapture(zdarzenie.pointerId)
  }

  function przesun(zdarzenie: PointerEvent<HTMLButtonElement>) {
    const obecny = gest.current
    if (!obecny || obecny.wskaznikId !== zdarzenie.pointerId) return
    const dx = (zdarzenie.clientX - obecny.x) / obecny.szerokoscPlanu * 100
    const dy = (zdarzenie.clientY - obecny.y) / obecny.wysokoscPlanu * 100
    const zmiana = obecny.czySkalowanie
      ? { ...obecny.prostokat, szerokosc: Math.min(100 - obecny.prostokat.x, obecny.prostokat.szerokosc + dx), wysokosc: Math.min(100 - obecny.prostokat.y, obecny.prostokat.wysokosc + dy) }
      : { ...obecny.prostokat, x: obecny.prostokat.x + dx, y: obecny.prostokat.y + dy }
    const przyciagnij = (liczba: number) => czySiatka ? Math.round(liczba / 5) * 5 : liczba
    zmienProstokat(obecny.id, ograniczProstokat({ x: przyciagnij(zmiana.x), y: przyciagnij(zmiana.y), szerokosc: przyciagnij(zmiana.szerokosc), wysokosc: przyciagnij(zmiana.wysokosc) }))
  }

  function zakoncz(zdarzenie: PointerEvent<HTMLButtonElement>, czyAnulowanie = false) {
    if (gest.current?.wskaznikId !== zdarzenie.pointerId) return
    if (czyAnulowanie) zmienProstokat(gest.current.id, gest.current.prostokat)
    gest.current = null
  }

  return <>
    <div className="zakupy__nawigacja" role="group" aria-label="Narzędzia mapy">
      <button type="button" aria-label="Pomniejsz mapę" disabled={powiekszenie <= 0.5} onClick={() => ustawPowiekszenie((obecne) => Math.max(0.5, obecne - 0.25))}>−</button>
      <output aria-label="Powiększenie mapy">{powiekszenie * 100}%</output>
      <button type="button" aria-label="Powiększ mapę" disabled={powiekszenie >= 2} onClick={() => ustawPowiekszenie((obecne) => Math.min(2, obecne + 0.25))}>+</button>
      <label><input type="checkbox" role="switch" checked={czySiatka} onChange={(zdarzenie) => ustawSiatke(zdarzenie.target.checked)} /> Siatka 5%</label>
    </div>
    <div className="mapa-magazynu__przewijanie" tabIndex={0} role="region" aria-label="Przewijany plan magazynu">
    <div className={`mapa-magazynu__plan${czyEdycja ? ' mapa-magazynu__plan--edycja' : ''}${czySiatka ? ' mapa-magazynu__plan--siatka' : ''}`} style={{ width: `${powiekszenie * 100}%`, minWidth: 480 * powiekszenie, height: 480 * powiekszenie }} ref={plan} aria-label="Plan 2D wybranej lokalizacji">
    {!lokalizacje.length && <p className="mapa-magazynu__pusty">Brak elementów w tym planie. W trybie edycji możesz dodać lokalizację.</p>}
    {lokalizacje.map((lokalizacja) => {
      const prostokat = lokalizacja.polozenieNaMapie
      if (!prostokat) return null
      const problemy = pobierzProblemyLokalizacji(dane, lokalizacja.id)
      return <div key={lokalizacja.id}
        className={`mapa-magazynu__element${czyFiltr && !podswietloneId.has(lokalizacja.id) ? ' mapa-magazynu__element--przygaszony' : ''}${czyFiltr && podswietloneId.has(lokalizacja.id) ? ' mapa-magazynu__element--trafienie' : ''}${!lokalizacja.czyAktywna ? ' mapa-magazynu__element--nieaktywny' : ''}`}
        style={{ left: `${prostokat.x}%`, top: `${prostokat.y}%`, width: `${prostokat.szerokosc}%`, height: `${prostokat.wysokosc}%` }}>
        <button type="button" className="mapa-magazynu__miejsce" aria-pressed={wybranaId === lokalizacja.id} onClick={() => wybierz(lokalizacja.id)}
          onKeyDown={(zdarzenie) => {
            if (!czyEdycja || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(zdarzenie.key)) return
            zdarzenie.preventDefault()
            const krok = czySiatka ? 5 : 1
            zmienProstokat(lokalizacja.id, ograniczProstokat({ ...prostokat, x: prostokat.x + (zdarzenie.key === 'ArrowRight' ? krok : zdarzenie.key === 'ArrowLeft' ? -krok : 0), y: prostokat.y + (zdarzenie.key === 'ArrowDown' ? krok : zdarzenie.key === 'ArrowUp' ? -krok : 0) }))
          }}
          onPointerDown={(zdarzenie) => rozpocznij(zdarzenie, lokalizacja, false)} onPointerMove={przesun} onPointerUp={(zdarzenie) => zakoncz(zdarzenie)} onPointerCancel={(zdarzenie) => zakoncz(zdarzenie, true)}>
          <strong>{lokalizacja.kod}</strong><span>{lokalizacja.nazwa}</span>
          {!lokalizacja.czyAktywna && <span>Nieaktywna</span>}
          {problemy.map((problem) => <span key={problem} className={`mapa-magazynu__problem mapa-magazynu__problem--${problem}`}>{etykietyProblemow[problem]}</span>)}
        </button>
        {czyEdycja && <button type="button" className="mapa-magazynu__skalowanie" aria-label={`Zmień rozmiar: ${lokalizacja.kod}. Wymiary można też wpisać w formularzu.`}
          onPointerDown={(zdarzenie) => rozpocznij(zdarzenie, lokalizacja, true)} onPointerMove={przesun} onPointerUp={(zdarzenie) => zakoncz(zdarzenie)} onPointerCancel={(zdarzenie) => zakoncz(zdarzenie, true)} onClick={() => wybierz(lokalizacja.id)}>↘</button>}
      </div>
    })}
    </div></div>
  </>
}
