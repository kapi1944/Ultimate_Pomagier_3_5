import { useSyncExternalStore } from 'react'

function obserwujRozmiar(odswiez: () => void) {
  const zapytanie = window.matchMedia('(max-width: 760px)')
  zapytanie.addEventListener('change', odswiez)
  return () => zapytanie.removeEventListener('change', odswiez)
}

export function useMalyEkran() {
  return useSyncExternalStore(obserwujRozmiar, () => window.matchMedia('(max-width: 760px)').matches, () => false)
}
