import type { ZadaniePulpitu } from '../modele/pulpit'

function poczatekDnia(data: string) {
  return new Date(`${data}T00:00:00`)
}

export function czyZadanieOpoznione(zadanie: ZadaniePulpitu, teraz: Date) {
  if (zadanie.status === 'WYKONANE' || !zadanie.godzina) return false
  const termin = new Date(`${zadanie.data}T${zadanie.godzina}:00`)
  return !Number.isNaN(termin.getTime()) && termin.getTime() < teraz.getTime()
}

export function pobierzEtykieteStatusuZadania(zadanie: ZadaniePulpitu, teraz: Date) {
  if (zadanie.status === 'WYKONANE') return 'Wykonane'
  return czyZadanieOpoznione(zadanie, teraz) ? 'Opóźnione' : 'Otwarte'
}

export function sortujZadaniaBezGodziny(zadania: ZadaniePulpitu[], teraz: Date) {
  return [...zadania].sort((pierwsze, drugie) => {
    const pilnoscPierwszego = pierwsze.priorytet === 'PILNE' || czyZadanieOpoznione(pierwsze, teraz) ? 0 : 1
    const pilnoscDrugiego = drugie.priorytet === 'PILNE' || czyZadanieOpoznione(drugie, teraz) ? 0 : 1
    if (pilnoscPierwszego !== pilnoscDrugiego) return pilnoscPierwszego - pilnoscDrugiego
    return new Date(pierwsze.utworzono).getTime() - new Date(drugie.utworzono).getTime()
  })
}

export function czyZadanieDotyczyDnia(zadanie: ZadaniePulpitu, data: string) {
  return poczatekDnia(zadanie.data).getTime() === poczatekDnia(data).getTime()
}

export function czyMoznaOznaczycZadanieRecznie(zadanie: ZadaniePulpitu) {
  return !zadanie.czyAutomatyczne && zadanie.status === 'OTWARTE'
}
