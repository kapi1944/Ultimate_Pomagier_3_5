import type { StatusInterfejsu } from '../../../wspolne/komponenty/ElementyInterfejsu'
import type { StatusSzczegolow, StatusSzkolenia } from './typy'

export const oznaczeniaStatusowSzczegolow: Record<StatusSzczegolow, { etykieta: string; status: StatusInterfejsu }> = {
  NIEPEŁNE: { etykieta: 'Niepełne — do uzupełnienia', status: 'warning' },
  PEŁNE: { etykieta: 'Pełne — do publikacji', status: 'info' },
  OCZEKUJĄCE: { etykieta: 'Oczekujące na akceptację', status: 'warning' },
  ZAAKCEPTOWANE: { etykieta: 'Zaakceptowane', status: 'info' },
  GOTOWE: { etykieta: 'Gotowe', status: 'success' },
  ZREALIZOWANE: { etykieta: 'Zrealizowane', status: 'success' },
  NIEZREALIZOWANE: { etykieta: 'Niezrealizowane', status: 'error' },
  ROZLICZONE: { etykieta: 'Rozliczone', status: 'info' },
}

export const oznaczeniaStatusowSzkolenia: Record<StatusSzkolenia, StatusInterfejsu> = {
  'W PRZYGOTOWANIACH': 'warning', POTWIERDZONE: 'info', PRZYGOTOWANE: 'success',
  'WYSŁANA PACZKA': 'info', TRWA: 'info', ZREALIZOWANE: 'success', NIEZREALIZOWANE: 'error', ROZLICZONE: 'info',
}

export function formatujDateRejestru(data: string) {
  const dataZapisu = new Date(data)
  return Number.isNaN(dataZapisu.getTime()) ? 'Brak poprawnej daty' : dataZapisu.toLocaleString('pl-PL')
}
