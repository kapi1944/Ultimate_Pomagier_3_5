import type { DaneImportuDyplomu } from './importDyplomu'
import type { PoleImportuSzkolenia, WartosciImportuSzkolenia } from '../../../../wspolne/parsery/importDanychSzkoleniaZMaila'
import { sprawdzWartosciImportuSzkolenia } from '../../../../wspolne/parsery/importDanychSzkoleniaZMaila'

export const polaMailaObslugiwanePrzezDyplom: readonly PoleImportuSzkolenia[] = ['tytulSzkolenia', 'dataOd', 'dataDo', 'trener', 'formaSzkolenia', 'miejsce', 'liczbaGodzin', 'rodzajGodzin']
type DaneSzkoleniaDyplomu = Pick<DaneImportuDyplomu, 'tytulSzkolenia' | 'wybraneDaty' | 'trener' | 'trybSzkolenia' | 'miejsceSzkolenia' | 'liczbaGodzin' | 'rodzajGodzin'>

export function odczytajWartosciDyplomuDoImportu(dane: DaneSzkoleniaDyplomu): WartosciImportuSzkolenia {
  return {
    tytulSzkolenia: dane.tytulSzkolenia, dataOd: dane.wybraneDaty[0] ?? '', dataDo: dane.wybraneDaty.at(-1) ?? '', trener: dane.trener,
    formaSzkolenia: dane.trybSzkolenia === 'online' ? 'Online' : 'Stacjonarne', miejsce: dane.miejsceSzkolenia,
    liczbaGodzin: dane.liczbaGodzin, rodzajGodzin: dane.rodzajGodzin === 'zegarowych' ? 'Zegarowe (60 min)' : dane.rodzajGodzin === 'dydaktycznych' ? 'Dydaktyczne (45 min)' : dane.rodzajGodzin,
  }
}

export function przygotujZmianyDyplomuZMaila(wartosci: WartosciImportuSzkolenia) {
  const blad = sprawdzWartosciImportuSzkolenia(wartosci)
  if (blad) throw new Error(blad)
  const zmiany: Partial<Omit<DaneSzkoleniaDyplomu, 'rodzajGodzin'>> & { miesiacKalendarza?: string; rodzajGodzin?: 'zegarowych' | 'dydaktycznych' } = {}
  for (const pole of ['tytulSzkolenia', 'trener', 'liczbaGodzin'] as const) if (wartosci[pole]) zmiany[pole] = wartosci[pole]
  if (wartosci.miejsce) zmiany.miejsceSzkolenia = wartosci.miejsce
  if (wartosci.formaSzkolenia) {
    if (wartosci.formaSzkolenia !== 'Online' && wartosci.formaSzkolenia !== 'Stacjonarne') throw new Error('Generator Dyplomów nie obsługuje rozpoznanego trybu szkolenia.')
    zmiany.trybSzkolenia = wartosci.formaSzkolenia === 'Online' ? 'online' : 'stacjonarne'
  }
  if (wartosci.rodzajGodzin) {
    if (!['Zegarowe (60 min)', 'Dydaktyczne (45 min)'].includes(wartosci.rodzajGodzin)) throw new Error('Potwierdź obsługiwany rodzaj godzin.')
    zmiany.rodzajGodzin = wartosci.rodzajGodzin === 'Zegarowe (60 min)' ? 'zegarowych' : 'dydaktycznych'
  }
  if (wartosci.dataOd && wartosci.dataDo) {
    const poczatek = Date.parse(wartosci.dataOd)
    const liczbaDni = (Date.parse(wartosci.dataDo) - poczatek) / 86400000 + 1
    zmiany.wybraneDaty = Array.from({ length: liczbaDni }, (_, indeks) => new Date(poczatek + indeks * 86400000).toISOString().slice(0, 10))
    zmiany.miesiacKalendarza = wartosci.dataOd.slice(0, 7)
  }
  return zmiany
}

export function przygotujCofniecieImportu<Typ extends object>(dane: Typ, zmiany: Partial<Typ>): Partial<Typ> {
  const poprzednie: Partial<Typ> = {}
  for (const pole of Object.keys(zmiany) as (keyof Typ)[]) poprzednie[pole] = dane[pole]
  return poprzednie
}
