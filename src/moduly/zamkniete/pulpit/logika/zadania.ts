import type { RolaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { domyslnyZakresDniaPracy, pozycjaGodzinyNaOsi, type ZakresDniaPracy } from './czasDnia'
import type { PrzypomnienieZadania, ZadaniePulpitu } from '../modele/pulpit'

const paletaZadaniodawcow = ['#38bdf8', '#a78bfa', '#fb7185', '#f59e0b', '#2dd4bf', '#84cc16', '#f472b6', '#60a5fa']

function poczatekDnia(data: string) {
  return new Date(data + 'T00:00:00')
}

function dataTekstowa(data: Date) {
  const rok = data.getFullYear()
  const miesiac = String(data.getMonth() + 1).padStart(2, '0')
  const dzien = String(data.getDate()).padStart(2, '0')
  return rok + '-' + miesiac + '-' + dzien
}

function godzinaZDaty(data: Date) {
  return String(data.getHours()).padStart(2, '0') + ':' + String(data.getMinutes()).padStart(2, '0')
}

export function czyZadanieDoKoncaDnia(zadanie: ZadaniePulpitu) {
  return zadanie.rodzajTerminu === 'DO_KONCA_DNIA'
}

export function pobierzGodzineLogicznegoDeadline(
  zadanie: ZadaniePulpitu,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  return czyZadanieDoKoncaDnia(zadanie) ? zakresDniaPracy.koniec : zadanie.godzina
}

export function pobierzMomentDeadlineZadania(
  zadanie: ZadaniePulpitu,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  const godzina = pobierzGodzineLogicznegoDeadline(zadanie, zakresDniaPracy)
  if (!godzina) return null
  const termin = new Date(zadanie.data + 'T' + godzina + ':00')
  return Number.isNaN(termin.getTime()) ? null : termin
}

export function pobierzMomentPrzypomnieniaZadania(
  zadanie: ZadaniePulpitu,
  przypomnienie: PrzypomnienieZadania,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  const deadline = pobierzMomentDeadlineZadania(zadanie, zakresDniaPracy)
  if (!deadline) return null
  const mnozniki = { MINUTY: 60_000, GODZINY: 3_600_000, DNI: 86_400_000 }
  return new Date(deadline.getTime() - przypomnienie.wartosc * mnozniki[przypomnienie.jednostka])
}

export function pobierzGodzineMarkeraZadania(
  zadanie: ZadaniePulpitu,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  if (!czyZadanieDoKoncaDnia(zadanie)) return zadanie.godzina
  const utworzono = new Date(zadanie.utworzono)
  if (Number.isNaN(utworzono.getTime()) || dataTekstowa(utworzono) !== zadanie.data) {
    return zakresDniaPracy.poczatek
  }
  return godzinaZDaty(utworzono)
}

export function pobierzSzerokoscLiniiDoFajrantu(
  zadanie: ZadaniePulpitu,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  if (!czyZadanieDoKoncaDnia(zadanie)) return 0
  const godzinaMarkera = pobierzGodzineMarkeraZadania(zadanie, zakresDniaPracy)
  if (!godzinaMarkera) return 0
  return Math.max(0, pozycjaGodzinyNaOsi(zakresDniaPracy.koniec) - pozycjaGodzinyNaOsi(godzinaMarkera))
}

function czasDeadline(zadanie: ZadaniePulpitu, zakresDniaPracy: ZakresDniaPracy) {
  const deadline = pobierzMomentDeadlineZadania(zadanie, zakresDniaPracy)
  if (deadline) return deadline.getTime()
  const koniecDnia = new Date(zadanie.data + 'T23:59:00').getTime()
  return Number.isNaN(koniecDnia) ? Number.POSITIVE_INFINITY : koniecDnia
}

function rangaPriorytetu(zadanie: ZadaniePulpitu, teraz?: Date, zakresDniaPracy = domyslnyZakresDniaPracy) {
  if (zadanie.priorytet === 'ASAP') return 0
  if (zadanie.priorytet === 'PILNE' || (teraz && czyZadanieOpoznione(zadanie, teraz, zakresDniaPracy))) return 1
  return 2
}

export function czyZadanieOpoznione(
  zadanie: ZadaniePulpitu,
  teraz: Date,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  if (zadanie.status === 'WYKONANE') return false
  const deadline = pobierzMomentDeadlineZadania(zadanie, zakresDniaPracy)
  return Boolean(deadline && deadline.getTime() < teraz.getTime())
}

export function pobierzEtykieteStatusuZadania(
  zadanie: ZadaniePulpitu,
  teraz: Date,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  if (zadanie.status === 'WYKONANE') return 'Wykonane'
  return czyZadanieOpoznione(zadanie, teraz, zakresDniaPracy) ? 'Opóźnione' : 'Otwarte'
}

export function sortujZadaniaWedlugPriorytetuIDeadline(
  zadania: ZadaniePulpitu[],
  teraz?: Date,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  return [...zadania].sort((pierwsze, drugie) => {
    const roznicaPriorytetu = rangaPriorytetu(pierwsze, teraz, zakresDniaPracy) - rangaPriorytetu(drugie, teraz, zakresDniaPracy)
    if (roznicaPriorytetu !== 0) return roznicaPriorytetu
    const roznicaDeadline = czasDeadline(pierwsze, zakresDniaPracy) - czasDeadline(drugie, zakresDniaPracy)
    if (roznicaDeadline !== 0) return roznicaDeadline
    return new Date(pierwsze.utworzono).getTime() - new Date(drugie.utworzono).getTime()
  })
}

export function sortujZadaniaBezGodziny(zadania: ZadaniePulpitu[], teraz: Date, zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy) {
  return sortujZadaniaWedlugPriorytetuIDeadline(zadania, teraz, zakresDniaPracy)
}

export function czyZadanieDotyczyDnia(zadanie: ZadaniePulpitu, data: string) {
  return poczatekDnia(zadanie.data).getTime() === poczatekDnia(data).getTime()
}

export function pobierzZadaniaDeadline(
  zadania: ZadaniePulpitu[],
  data: string,
  teraz?: Date,
  zakresDniaPracy: ZakresDniaPracy = domyslnyZakresDniaPracy,
) {
  return sortujZadaniaWedlugPriorytetuIDeadline(
    zadania.filter((zadanie) => (Boolean(zadanie.godzina) || czyZadanieDoKoncaDnia(zadanie)) && czyZadanieDotyczyDnia(zadanie, data)),
    teraz,
    zakresDniaPracy,
  )
}

export function czyMoznaOznaczycZadanieRecznie(zadanie: ZadaniePulpitu) {
  return !zadanie.czyAutomatyczne && zadanie.status === 'OTWARTE'
}

export function czyMoznaEdytowacZadanie(
  zadanie: ZadaniePulpitu,
  uzytkownikId: string | null | undefined,
  rola: RolaUzytkownika | null | undefined,
) {
  if (!uzytkownikId || zadanie.czyAutomatyczne) return false
  // Architekt ma nadrzędne prawo korekty wszystkich ręcznych zadań,
  // niezależnie od Zadaniodawcy, Zadaniobiorcy i statusu.
  if (rola === 'ARCHITEKT') return true
  // Pozostali zachowują dotychczasową zasadę:
  // edycja wyłącznie własnego, otwartego zadania jako Zadaniodawca.
  return zadanie.status === 'OTWARTE' && zadanie.zadaniodawcaId === uzytkownikId
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
