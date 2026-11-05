export type WyjatekKalendarzaPracy = {
  id: string
  od: string
  do: string
  uzytkownikId?: string
  rodzaj: 'PRACA' | 'WOLNE' | 'URLOP' | 'ZWOLNIENIE' | 'NIEOBECNOSC'
  powod: string
}

export type KalendarzPracy = { dniPracy: number[]; wyjatki: WyjatekKalendarzaPracy[] }
export type OcenaDniaPracy = { roboczy: boolean; powod: string }
export const domyslnyKalendarzPracy: KalendarzPracy = { dniPracy: [1, 2, 3, 4, 5], wyjatki: [] }

export function dataWarszawska(data: Date): string {
  const czesci = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(data)
  const wartosc = (typ: string) => czesci.find((czesc) => czesc.type === typ)?.value ?? ''
  return `${wartosc('year')}-${wartosc('month')}-${wartosc('day')}`
}

export function czyPoprawnaDataKalendarza(wartosc: unknown): wartosc is string {
  if (typeof wartosc !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(wartosc)) return false
  const data = new Date(wartosc + 'T12:00:00Z')
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === wartosc
}

export function walidujWyjatkiKalendarza(dane: unknown): string[] {
  if (!Array.isArray(dane)) return ['Kalendarz pracy wymaga listy wyjątków.']
  const identyfikatory = new Set<string>()
  for (const wpis of dane) {
    if (!wpis || typeof wpis !== 'object' || typeof wpis.id !== 'string' || !wpis.id.trim() || identyfikatory.has(wpis.id)
      || !czyPoprawnaDataKalendarza(wpis.od) || !czyPoprawnaDataKalendarza(wpis.do) || wpis.od > wpis.do
      || typeof wpis.powod !== 'string' || !wpis.powod.trim()
      || !['PRACA', 'WOLNE', 'URLOP', 'ZWOLNIENIE', 'NIEOBECNOSC'].includes(wpis.rodzaj)
      || (wpis.uzytkownikId !== undefined && (typeof wpis.uzytkownikId !== 'string' || !wpis.uzytkownikId.trim()))
      || (['URLOP', 'ZWOLNIENIE', 'NIEOBECNOSC'].includes(wpis.rodzaj) && !wpis.uzytkownikId)) {
      return ['Wyjątek kalendarza wymaga unikalnego ID, poprawnego zakresu dat, rodzaju i powodu; nieobecność wymaga użytkownika.']
    }
    identyfikatory.add(wpis.id)
  }
  return []
}

function wielkanoc(rok: number): Date {
  const cyklKsiezycowy = rok % 19
  const stulecie = Math.floor(rok / 100)
  const rokStulecia = rok % 100
  const przestepneStulecia = Math.floor(stulecie / 4)
  const resztaStulecia = stulecie % 4
  const korektaSloneczna = Math.floor((stulecie + 8) / 25)
  const korektaKsiezycowa = Math.floor((stulecie - korektaSloneczna + 1) / 3)
  const epakta = (19 * cyklKsiezycowy + stulecie - przestepneStulecia - korektaKsiezycowa + 15) % 30
  const przestepneLata = Math.floor(rokStulecia / 4)
  const resztaRoku = rokStulecia % 4
  const przesuniecieNiedzieli = (32 + 2 * resztaStulecia + 2 * przestepneLata - epakta - resztaRoku) % 7
  const korekta = Math.floor((cyklKsiezycowy + 11 * epakta + 22 * przesuniecieNiedzieli) / 451)
  const miesiac = Math.floor((epakta + przesuniecieNiedzieli - 7 * korekta + 114) / 31)
  const dzien = (epakta + przesuniecieNiedzieli - 7 * korekta + 114) % 31 + 1
  return new Date(Date.UTC(rok, miesiac - 1, dzien))
}

function swietoNaDzien(data: string): string | undefined {
  const rok = Number(data.slice(0, 4))
  const stale: Record<string, string> = {
    '01-01': 'Nowy Rok', '05-01': 'Święto Pracy', '05-03': 'Święto Konstytucji 3 Maja',
    '08-15': 'Wniebowzięcie NMP', '11-01': 'Wszystkich Świętych', '11-11': 'Narodowe Święto Niepodległości',
    '12-25': 'Boże Narodzenie', '12-26': 'Drugi dzień Bożego Narodzenia',
  }
  if (rok >= 2011) stale['01-06'] = 'Święto Trzech Króli'
  if (rok >= 2025) stale['12-24'] = 'Wigilia Bożego Narodzenia'
  const swieto = stale[data.slice(5)]
  if (swieto) return swieto
  const niedziela = wielkanoc(rok)
  for (const [przesuniecie, nazwa] of [[0, 'Wielkanoc'], [1, 'Poniedziałek Wielkanocny'], [49, 'Zielone Świątki'], [60, 'Boże Ciało']] as const) {
    const dzien = new Date(niedziela)
    dzien.setUTCDate(dzien.getUTCDate() + przesuniecie)
    if (dzien.toISOString().slice(0, 10) === data) return nazwa
  }
  return undefined
}

function pierwszenstwo(wpis: WyjatekKalendarzaPracy): number {
  // Jawny indywidualny dzień pracy wygrywa także z nieobecnością i zamknięciem firmy.
  const kolejnosc = { PRACA: 0, WOLNE: 1, NIEOBECNOSC: 2, URLOP: 3, ZWOLNIENIE: 4 }
  return wpis.uzytkownikId ? (wpis.rodzaj === 'PRACA' ? 10 : 5 + kolejnosc[wpis.rodzaj]) : kolejnosc[wpis.rodzaj]
}

export function ocenDzienPracy(data: string | Date, uzytkownikId: string, kalendarz: KalendarzPracy = domyslnyKalendarzPracy): OcenaDniaPracy {
  if (data instanceof Date && !Number.isFinite(data.getTime())) return { roboczy: false, powod: 'Nieprawidłowa data' }
  const dzien = data instanceof Date ? dataWarszawska(data) : data
  if (!czyPoprawnaDataKalendarza(dzien)) return { roboczy: false, powod: 'Nieprawidłowa data' }
  const wyjatek = kalendarz.wyjatki.filter((wpis) => wpis.od <= dzien && wpis.do >= dzien && (!wpis.uzytkownikId || wpis.uzytkownikId === uzytkownikId))
    .sort((pierwszy, drugi) => pierwszenstwo(drugi) - pierwszenstwo(pierwszy) || pierwszy.id.localeCompare(drugi.id))[0]
  if (wyjatek) return { roboczy: wyjatek.rodzaj === 'PRACA', powod: wyjatek.powod }
  const swieto = swietoNaDzien(dzien)
  if (swieto) return { roboczy: false, powod: swieto }
  const dzienTygodnia = new Date(dzien + 'T12:00:00Z').getUTCDay()
  if (!kalendarz.dniPracy.includes(dzienTygodnia)) return { roboczy: false, powod: dzienTygodnia === 0 || dzienTygodnia === 6 ? 'Weekend — poza tygodniem pracy' : 'Dzień poza tygodniem pracy' }
  return { roboczy: true, powod: 'Zaplanowany dzień pracy' }
}
