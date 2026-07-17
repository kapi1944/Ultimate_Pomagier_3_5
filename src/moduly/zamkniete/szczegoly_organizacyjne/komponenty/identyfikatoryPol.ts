function normalizujFragmentId(wartosc: string) {
  return wartosc.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export function pobierzIdPola(pole: string, idGrupy?: string, wariant?: string) {
  const fragmentGrupy = idGrupy ? `grupa-${normalizujFragmentId(idGrupy)}-` : ''
  const fragmentWariantu = wariant ? `-${normalizujFragmentId(wariant)}` : ''
  return `szczegoly-pole-${fragmentGrupy}${normalizujFragmentId(pole)}${fragmentWariantu}`
}

export function pobierzIdBleduPola(pole: string) {
  return `szczegoly-blad-${normalizujFragmentId(pole)}`
}
