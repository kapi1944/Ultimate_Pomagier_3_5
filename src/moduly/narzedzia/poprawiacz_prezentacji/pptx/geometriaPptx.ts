import type { GeometriaPptx } from './modelPptx'
import { dzieckoXml, liczbaXml } from './xmlPptx'

export function emuNaCm(emu: number) { return emu / 360000 }
export function cmNaEmu(cm: number) { return Math.round(cm * 360000) }
export function emuNaMm(emu: number) { return emu / 36000 }
export function mmNaEmu(mm: number) { return Math.round(mm * 36000) }
export function emuNaProcent(emu: number, wymiar: number) { return wymiar > 0 ? emu / wymiar * 100 : 0 }
export function procentNaEmu(procent: number, wymiar: number) { return Math.round(procent / 100 * wymiar) }

export function odczytajGeometrie(transformacja: Element | undefined): GeometriaPptx | null {
  const polozenie = dzieckoXml(transformacja, 'off')
  const rozmiar = dzieckoXml(transformacja, 'ext')
  const x = liczbaXml(polozenie, 'x')
  const y = liczbaXml(polozenie, 'y')
  const cx = liczbaXml(rozmiar, 'cx')
  const cy = liczbaXml(rozmiar, 'cy')
  return x !== null && y !== null && cx !== null && cy !== null && cx > 0 && cy > 0 ? { x, y, cx, cy } : null
}
