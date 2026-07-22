import type { PaczkaPulpitu } from '../modele/pulpit'

export const liczbaDniWidocznosciPaczki = 7

function dataBezCzasu(data: string) {
  return new Date(`${data}T00:00:00`)
}

function roznicaDni(pierwsza: Date, druga: Date) {
  return Math.floor((pierwsza.getTime() - druga.getTime()) / 86_400_000)
}

export function czyPaczkaWidoczna(paczka: PaczkaPulpitu, dzisiaj: Date) {
  if (paczka.czyWyslana || !paczka.planowanaDataWysylki) return false
  const termin = dataBezCzasu(paczka.planowanaDataWysylki)
  const dzien = new Date(dzisiaj.getFullYear(), dzisiaj.getMonth(), dzisiaj.getDate())
  return roznicaDni(termin, dzien) <= liczbaDniWidocznosciPaczki
}

export function czyPaczkaOpozniona(paczka: PaczkaPulpitu, dzisiaj: Date) {
  return !paczka.czyWyslana && dataBezCzasu(paczka.planowanaDataWysylki).getTime() < new Date(dzisiaj.getFullYear(), dzisiaj.getMonth(), dzisiaj.getDate()).getTime()
}

export function sortujPaczki(paczki: PaczkaPulpitu[], dzisiaj: Date) {
  return [...paczki].sort((pierwsza, druga) => {
    const opoznionaPierwsza = czyPaczkaOpozniona(pierwsza, dzisiaj)
    const opoznionaDruga = czyPaczkaOpozniona(druga, dzisiaj)
    if (opoznionaPierwsza !== opoznionaDruga) return opoznionaPierwsza ? -1 : 1
    return dataBezCzasu(pierwsza.planowanaDataWysylki).getTime() - dataBezCzasu(druga.planowanaDataWysylki).getTime()
  })
}

export function pobierzTerminWzglednyPaczki(paczka: PaczkaPulpitu, dzisiaj: Date) {
  if (czyPaczkaOpozniona(paczka, dzisiaj)) return 'OPÓŹNIONA'
  const roznica = roznicaDni(dataBezCzasu(paczka.planowanaDataWysylki), new Date(dzisiaj.getFullYear(), dzisiaj.getMonth(), dzisiaj.getDate()))
  if (roznica === 0) return 'DZISIAJ'
  if (roznica === 1) return 'JUTRO'
  return `ZA ${roznica} DNI`
}

export function pobierzGotowoscPaczki(paczka: PaczkaPulpitu) {
  const procent = paczka.liczbaWymaganych ? Math.round((paczka.liczbaGotowych / paczka.liczbaWymaganych) * 100) : 100
  return { procent, tekst: `${procent}% • ${paczka.liczbaGotowych}/${paczka.liczbaWymaganych}`, czyGotowa: paczka.liczbaGotowych === paczka.liczbaWymaganych }
}

export function czyWysylkaWymagaDodatkowegoPotwierdzenia(paczka: PaczkaPulpitu) {
  return paczka.brakujaceElementy.length > 0
}
