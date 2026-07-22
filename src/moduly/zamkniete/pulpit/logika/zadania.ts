import type { RolaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import type { PrzypomnienieZadania, ZadaniePulpitu } from '../modele/pulpit'

const paletaZadaniodawcow = ['#38bdf8', '#a78bfa', '#fb7185', '#f59e0b', '#2dd4bf', '#84cc16', '#f472b6', '#60a5fa']

function poczatekDnia(data: string) {
  return new Date(data + 'T00:00:00')
}

function czasDeadline(zadanie: ZadaniePulpitu) {
  const termin = new Date(zadanie.data + 'T' + (zadanie.godzina || '23:59') + ':00').getTime()
  return Number.isNaN(termin) ? Number.POSITIVE_INFINITY : termin
}

function rangaPriorytetu(zadanie: ZadaniePulpitu, teraz?: Date) {
  if (zadanie.priorytet === 'ASAP') return 0
  if (zadanie.priorytet === 'PILNE' || (teraz && czyZadanieOpoznione(zadanie, teraz))) return 1
  return 2
}

export function czyZadanieOpoznione(zadanie: ZadaniePulpitu, teraz: Date) {
  if (zadanie.status === 'WYKONANE' || !zadanie.godzina) return false
  const termin = new Date(zadanie.data + 'T' + zadanie.godzina + ':00')
  return !Number.isNaN(termin.getTime()) && termin.getTime() < teraz.getTime()
}

export function pobierzEtykieteStatusuZadania(zadanie: ZadaniePulpitu, teraz: Date) {
  if (zadanie.status === 'WYKONANE') return 'Wykonane'
  return czyZadanieOpoznione(zadanie, teraz) ? 'Opóźnione' : 'Otwarte'
}

export function sortujZadaniaWedlugPriorytetuIDeadline(zadania: ZadaniePulpitu[], teraz?: Date) {
  return [...zadania].sort((pierwsze, drugie) => {
    const roznicaPriorytetu = rangaPriorytetu(pierwsze, teraz) - rangaPriorytetu(drugie, teraz)
    if (roznicaPriorytetu !== 0) return roznicaPriorytetu
    const roznicaDeadline = czasDeadline(pierwsze) - czasDeadline(drugie)
    if (roznicaDeadline !== 0) return roznicaDeadline
    return new Date(pierwsze.utworzono).getTime() - new Date(drugie.utworzono).getTime()
  })
}

export function sortujZadaniaBezGodziny(zadania: ZadaniePulpitu[], teraz: Date) {
  return sortujZadaniaWedlugPriorytetuIDeadline(zadania, teraz)
}

export function czyZadanieDotyczyDnia(zadanie: ZadaniePulpitu, data: string) {
  return poczatekDnia(zadanie.data).getTime() === poczatekDnia(data).getTime()
}

export function pobierzZadaniaDeadline(zadania: ZadaniePulpitu[], data: string, teraz?: Date) {
  return sortujZadaniaWedlugPriorytetuIDeadline(
    zadania.filter((zadanie) => Boolean(zadanie.godzina) && czyZadanieDotyczyDnia(zadanie, data)),
    teraz,
  )
}

export function czyMoznaOznaczycZadanieRecznie(zadanie: ZadaniePulpitu) {
  return !zadanie.czyAutomatyczne && zadanie.status === 'OTWARTE'
}

export function czyMoznaWybracZadaniodawce(rola: RolaUzytkownika | null | undefined) {
  return rola === 'ADMINISTRATOR' || rola === 'ARCHITEKT'
}

export function rozstrzygnijPrzypisanieZadania(
  aktualnyUzytkownikId: string,
  rola: RolaUzytkownika | null | undefined,
  wybranyZadaniodawcaId?: string,
  wybranyZadaniobiorcaId?: string,
) {
  const zadaniodawcaId = czyMoznaWybracZadaniodawce(rola) && wybranyZadaniodawcaId
    ? wybranyZadaniodawcaId
    : aktualnyUzytkownikId
  return {
    zadaniodawcaId,
    zadaniobiorcaId: wybranyZadaniobiorcaId || zadaniodawcaId,
  }
}

export function czyZadanieWidoczneDlaUzytkownika(zadanie: ZadaniePulpitu, uzytkownikId: string) {
  if (!uzytkownikId) return false
  return zadanie.zadaniodawcaId === uzytkownikId
    || zadanie.zadaniobiorcaId === uzytkownikId
    || (!zadanie.zadaniodawcaId && !zadanie.zadaniobiorcaId && zadanie.wlascicielId === uzytkownikId)
}

export function walidujPrzypomnienia(przypomnienia: PrzypomnienieZadania[]) {
  if (przypomnienia.some((przypomnienie) => !Number.isFinite(przypomnienie.wartosc) || przypomnienie.wartosc <= 0)) {
    return 'Wartość przypomnienia musi być większa od zera.'
  }
  const klucze = przypomnienia.map((przypomnienie) => przypomnienie.wartosc + ':' + przypomnienie.jednostka)
  if (new Set(klucze).size !== klucze.length) return 'Usuń identyczne przypomnienia.'
  return null
}

export function pobierzKolorZadaniodawcy(zadaniodawcaId: string, kolorProfilu?: string) {
  if (kolorProfilu && /^#[0-9a-f]{6}$/i.test(kolorProfilu)) return kolorProfilu
  let skrot = 0
  for (const znak of zadaniodawcaId) skrot = ((skrot << 5) - skrot + znak.charCodeAt(0)) | 0
  return paletaZadaniodawcow[Math.abs(skrot) % paletaZadaniodawcow.length]
}
