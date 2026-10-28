export type HarmonogramRutyny =
  | { rodzaj: 'CODZIENNIE' }
  | { rodzaj: 'DNI_TYGODNIA'; dni: number[] }
  | { rodzaj: 'CEL_TYGODNIOWY'; liczba: number }

export type WersjaHarmonogramu = { od: string; harmonogram: HarmonogramRutyny; aktywna: boolean; wlascicielId?: string }
export type Rutyna = { id: string; tytul: string; wlascicielId: string; wersje: WersjaHarmonogramu[]; opis?: string; instrukcja?: string; link?: string; priorytet?: 'ZWYKLE' | 'PILNE' }
export type WykonanieRutyny = { rutynaId: string; okres: string; numer: number; wykonane: boolean; zmieniono?: string; zmienilId?: string }
export type WystapienieRutyny = { rutynaId: string; okres: string; numer: number; tytul: string; wykonane: boolean }
export type ZdarzenieRutyny = { czas: string; uzytkownikId: string; rutynaId: string; opis: string }
export type StanRutyn = { rutyny: Rutyna[]; wykonania: WykonanieRutyny[]; historia: ZdarzenieRutyny[] }

export function dataWarszawska(data: Date): string {
  const czesci = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(data)
  const wartosc = (typ: string) => czesci.find((czesc) => czesc.type === typ)?.value ?? ''
  return `${wartosc('year')}-${wartosc('month')}-${wartosc('day')}`
}

export function dodajDni(data: string, liczba: number): string {
  const dzien = new Date(`${data}T00:00:00Z`)
  dzien.setUTCDate(dzien.getUTCDate() + liczba)
  return dzien.toISOString().slice(0, 10)
}

export function poczatekTygodnia(data: string): string {
  const dzien = new Date(`${data}T00:00:00Z`).getUTCDay()
  return dodajDni(data, -((dzien + 6) % 7))
}

export function wersjaNaDzien(rutyna: Rutyna, data: string): WersjaHarmonogramu | undefined {
  return rutyna.wersje.filter((wersja) => wersja.od <= data).sort((pierwsza, druga) => druga.od.localeCompare(pierwsza.od))[0]
}

export function wlascicielWystapienia(rutyna: Rutyna, wystapienie: WystapienieRutyny): string {
  const data = wystapienie.numer ? dodajDni(wystapienie.okres, 6) : wystapienie.okres
  const wersja = wystapienie.numer ? wersjaNaDzien(rutyna, wystapienie.okres) ?? wersjaNaDzien(rutyna, data) : wersjaNaDzien(rutyna, data)
  return wersja?.wlascicielId ?? rutyna.wlascicielId
}

export function wystapieniaDnia(rutyny: Rutyna[], wykonania: WykonanieRutyny[], data: string): WystapienieRutyny[] {
  const dzien = new Date(`${data}T00:00:00Z`).getUTCDay()
  return rutyny.flatMap((rutyna) => {
    const wersja = wersjaNaDzien(rutyna, data)
    if (!wersja?.aktywna || wersja.harmonogram.rodzaj === 'CEL_TYGODNIOWY') return []
    if (wersja.harmonogram.rodzaj === 'DNI_TYGODNIA' && !wersja.harmonogram.dni.includes(dzien)) return []
    return [{ rutynaId: rutyna.id, okres: data, numer: 0, tytul: rutyna.tytul, wykonane: wykonania.some((wpis) => wpis.rutynaId === rutyna.id && wpis.okres === data && wpis.numer === 0 && wpis.wykonane) }]
  })
}

export function wystapieniaTygodnia(rutyny: Rutyna[], wykonania: WykonanieRutyny[], data: string): WystapienieRutyny[] {
  const poniedzialek = poczatekTygodnia(data)
  const dzienne = Array.from({ length: 7 }, (_, indeks) => wystapieniaDnia(rutyny, wykonania, dodajDni(poniedzialek, indeks))).flat()
  const cele = rutyny.flatMap((rutyna) => {
    const wersja = wersjaNaDzien(rutyna, poniedzialek) ?? wersjaNaDzien(rutyna, dodajDni(poniedzialek, 6))
    if (!wersja?.aktywna || wersja.harmonogram.rodzaj !== 'CEL_TYGODNIOWY') return []
    return Array.from({ length: wersja.harmonogram.liczba }, (_, numer) => ({ rutynaId: rutyna.id, okres: poniedzialek, numer: numer + 1, tytul: rutyna.tytul, wykonane: wykonania.some((wpis) => wpis.rutynaId === rutyna.id && wpis.okres === poniedzialek && wpis.numer === numer + 1 && wpis.wykonane) }))
  })
  return [...dzienne, ...cele]
}

export function obliczPostep(wystapienia: WystapienieRutyny[]) {
  const liczba = wystapienia.length
  const wykonane = wystapienia.filter((wystapienie) => wystapienie.wykonane).length
  const procent = liczba ? 100 * wykonane / liczba : null
  const stan = procent === null ? 'BRAK' : procent === 100 ? 'UKONCZONE' : procent >= 85 ? 'ZIELONY' : procent >= 60 ? 'POMARANCZOWY' : 'CZERWONY'
  return { liczba, wykonane, procent, stan }
}
