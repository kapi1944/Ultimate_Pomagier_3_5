export function pobierzIdBleduPola(pole: string) {
  return `szczegoly-blad-${pole.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}
