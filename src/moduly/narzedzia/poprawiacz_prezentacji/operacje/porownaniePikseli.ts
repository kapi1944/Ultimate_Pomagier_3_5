/** Pomocniczy sygnał wizualny, nigdy dowód zmiany konkretnego obiektu. */
export function porownajPiksele(przed: Uint8ClampedArray, po: Uint8ClampedArray, szerokosc: number, wysokosc: number, tolerancja = 24) {
  if (przed.length !== po.length || przed.length !== szerokosc * wysokosc * 4) throw new Error('Obrazy muszą mieć identyczne wymiary.')
  function pasuje(zrodlo: Uint8ClampedArray, cel: Uint8ClampedArray, x: number, y: number) {
    const indeks = (y * szerokosc + x) * 4
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= szerokosc || ny >= wysokosc) continue
      const drugi = (ny * szerokosc + nx) * 4
      if ([0, 1, 2].every((kanal) => Math.abs(zrodlo[indeks + kanal] - cel[drugi + kanal]) <= tolerancja)) return true
    }
    return false
  }
  let zmienione = 0
  for (let y = 0; y < wysokosc; y++) for (let x = 0; x < szerokosc; x++)
    if (!pasuje(przed, po, x, y) || !pasuje(po, przed, x, y)) zmienione++
  return { zmienione, procent: zmienione / (szerokosc * wysokosc) * 100 }
}
