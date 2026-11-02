export type PrzedzialGodzin = { poczatek: string; koniec: string }
export type BlokPracy = PrzedzialGodzin & { id: string; nazwa: string; dni: number[]; wlaczony: boolean }
export type HarmonogramPracy = {
  blokiPracy: BlokPracy[]
  kurier: { tydzien: Record<number, PrzedzialGodzin | null>; wyjatki: Record<string, PrzedzialGodzin | null> }
}

export const dniHarmonogramu = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
export const domyslnyHarmonogramPracy: HarmonogramPracy = {
  blokiPracy: [
    { id: 'rozruch', nazwa: 'Rozruch', poczatek: '07:45', koniec: '08:30', dni: [1, 2, 3, 4, 5], wlaczony: true },
    { id: 'przygotowania', nazwa: 'Przygotowania', poczatek: '08:30', koniec: '10:00', dni: [1, 2, 3, 4, 5], wlaczony: true },
    { id: 'paczkowanie', nazwa: 'Paczkowanie', poczatek: '10:00', koniec: '13:00', dni: [1, 2, 3, 4, 5], wlaczony: true },
    { id: 'multitasking', nazwa: 'Multitasking', poczatek: '13:00', koniec: '15:00', dni: [1, 2, 3, 4, 5], wlaczony: true },
    { id: 'podsumowania', nazwa: 'Podsumowania', poczatek: '15:00', koniec: '16:00', dni: [1, 2, 3, 4, 5], wlaczony: true },
  ],
  kurier: {
    tydzien: { 0: null, 1: { poczatek: '13:30', koniec: '16:00' }, 2: { poczatek: '14:30', koniec: '16:00' }, 3: { poczatek: '14:30', koniec: '16:00' }, 4: { poczatek: '14:30', koniec: '16:00' }, 5: { poczatek: '13:30', koniec: '16:00' }, 6: null },
    wyjatki: {},
  },
}

export function czyPoprawnaGodzina(wartosc: unknown): wartosc is string {
  return typeof wartosc === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(wartosc)
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return wartosc !== null && typeof wartosc === 'object' && !Array.isArray(wartosc)
}

function czyPrzedzial(wartosc: unknown): wartosc is PrzedzialGodzin {
  return czyObiekt(wartosc) && czyPoprawnaGodzina(wartosc.poczatek) && czyPoprawnaGodzina(wartosc.koniec) && wartosc.poczatek < wartosc.koniec
}

function czyData(wartosc: string) {
  const data = new Date(wartosc + 'T12:00:00Z')
  return /^\d{4}-\d{2}-\d{2}$/.test(wartosc) && Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === wartosc
}

export function walidujHarmonogramPracy(dane: unknown): string[] {
  if (!czyObiekt(dane) || !Array.isArray(dane.blokiPracy) || !czyObiekt(dane.kurier) || !czyObiekt(dane.kurier.tydzien) || !czyObiekt(dane.kurier.wyjatki)) return ['Nieprawidłowa konfiguracja harmonogramu.']
  const bledy: string[] = []
  const bloki: BlokPracy[] = []
  for (const blok of dane.blokiPracy) {
    if (!czyObiekt(blok) || typeof blok.id !== 'string' || !blok.id || typeof blok.nazwa !== 'string' || !blok.nazwa.trim() || typeof blok.wlaczony !== 'boolean' || !Array.isArray(blok.dni) || !blok.dni.length || blok.dni.some((dzien) => !Number.isInteger(dzien) || dzien < 0 || dzien > 6) || !czyPrzedzial(blok)) {
      bledy.push('Każdy blok wymaga nazwy, dni i poprawnego przedziału godzin (początek przed końcem).')
      continue
    }
    const poprawny = blok as BlokPracy
    if (bloki.some((inny) => inny.id === poprawny.id)) bledy.push('Identyfikatory bloków muszą być unikalne.')
    if (poprawny.wlaczony && bloki.some((inny) => inny.wlaczony && inny.dni.some((dzien) => poprawny.dni.includes(dzien)) && inny.poczatek < poprawny.koniec && poprawny.poczatek < inny.koniec)) bledy.push('Aktywne bloki pracy nie mogą nakładać się w tych samych dniach.')
    bloki.push(poprawny)
  }
  for (let dzien = 0; dzien < 7; dzien++) {
    const okno = dane.kurier.tydzien[dzien]
    if (okno !== null && !czyPrzedzial(okno)) bledy.push('Kurier: podaj poprawny przedział dla dnia ' + dniHarmonogramu[dzien] + '.')
  }
  for (const [data, okno] of Object.entries(dane.kurier.wyjatki)) {
    if (!czyData(data) || (okno !== null && !czyPrzedzial(okno))) bledy.push('Kurier: wyjątek wymaga poprawnej daty i przedziału lub odwołania odbioru.')
  }
  return [...new Set(bledy)]
}

export function normalizujHarmonogramPracy(dane: unknown): HarmonogramPracy {
  return structuredClone(walidujHarmonogramPracy(dane).length ? domyslnyHarmonogramPracy : dane as HarmonogramPracy)
}

export function blokiNaDzien(bloki: BlokPracy[], data: string): BlokPracy[] {
  if (!czyData(data)) return []
  const dzien = new Date(data + 'T12:00:00').getDay()
  return bloki.filter((blok) => blok.wlaczony && blok.dni.includes(dzien))
}

export function oknoKurieraNaDzien(kurier: HarmonogramPracy['kurier'], data: string): PrzedzialGodzin | null {
  if (!czyData(data)) return null
  if (Object.hasOwn(kurier.wyjatki, data)) return kurier.wyjatki[data]
  return kurier.tydzien[new Date(data + 'T12:00:00').getDay()] ?? null
}
