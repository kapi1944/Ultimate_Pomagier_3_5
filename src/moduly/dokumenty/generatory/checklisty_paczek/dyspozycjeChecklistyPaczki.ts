import type { DyspozycjaMaterialowa, RodzajDyspozycjiMaterialowej } from '../../../zamkniete/szczegoly_organizacyjne/typy'
import {
  pobierzDaneSzkoleniaChecklisty, pobierzIloscPozycji,
  type DaneChecklistyPaczki, type MigawkaZrodlaChecklisty, type PolaDyspozycjiChecklisty,
  type PorownanieDyspozycjiChecklisty, type PozycjaChecklisty,
} from './modelChecklistyPaczki'

const nazwyDyspozycji: Record<string, RodzajDyspozycjiMaterialowej> = {
  'podręczniki / materiały szkoleniowe': 'materialySzkoleniowe',
  'materiały dodatkowe': 'materialyDodatkowe',
  'certyfikaty / dyplomy': 'certyfikaty',
  'lista obecności': 'listaObecnosci',
  ankiety: 'ankiety',
}

export function pobierzPolaDyspozycji(pozycja: PozycjaChecklisty): PolaDyspozycjiChecklisty {
  const { czyWymagana, czyOpcjonalna, czyNieDotyczy, czyOnline, regulaIlosci, uwagiDrukowane } = pozycja
  return { czyWymagana, czyOpcjonalna, czyNieDotyczy, czyOnline, regulaIlosci: { ...regulaIlosci }, uwagiDrukowane }
}

function domyslnePola(rodzaj: RodzajDyspozycjiMaterialowej): PolaDyspozycjiChecklisty {
  return {
    czyWymagana: true, czyOpcjonalna: false, czyNieDotyczy: false, czyOnline: false,
    regulaIlosci: rodzaj === 'listaObecnosci' ? { typ: 'STALA', wartoscStala: 1 } : { typ: 'UCZESTNICY' },
    uwagiDrukowane: '',
  }
}

function zaproponujPola(rodzaj: RodzajDyspozycjiMaterialowej, dyspozycja: DyspozycjaMaterialowa) {
  const pola = domyslnePola(rodzaj)
  if (dyspozycja.terminPrzekazania === 'po_szkoleniu' || dyspozycja.sposobPrzygotowania === 'drukuje_klient') {
    return { ...pola, czyWymagana: false, czyNieDotyczy: true, regulaIlosci: { typ: 'WYLACZONA' as const },
      uwagiDrukowane: dyspozycja.sposobPrzygotowania === 'drukuje_klient' ? 'Drukuje Klient — bez wydruków w paczce.' : 'Po szkoleniu — bez wydruków w paczce przed szkoleniem.' }
  }
  if (dyspozycja.formaPrzekazania === 'online') {
    return { ...pola, czyOnline: true, regulaIlosci: { typ: 'WYLACZONA' as const }, uwagiDrukowane: 'Materiały przekazywane online — bez wydruków w paczce.' }
  }
  if (dyspozycja.formaPrzekazania === 'papierowa') return { ...pola, uwagiDrukowane: 'Wydruk do przygotowania.' }
  return null
}

export function czyMoznaImportowacDyspozycje(dane: DaneChecklistyPaczki) {
  return ['KOPIA_ROBOCZA', 'GOTOWA_DO_WYDRUKU'].includes(dane.statusChecklisty) && dane.wersjeWydruku.length === 0
}

export function zastosujDyspozycjeMaterialoweChecklisty(
  dane: DaneChecklistyPaczki, migawka: MigawkaZrodlaChecklisty,
  opcje: { paczkaId?: string; pozycjeZeZgoda?: string[] } = {},
): { dane: DaneChecklistyPaczki; porownania: PorownanieDyspozycjiChecklisty[] } {
  if (!czyMoznaImportowacDyspozycje(dane) || dane.grupaId !== migawka.grupaId
    || dane.szczegolyOrganizacyjneId !== migawka.szczegolyOrganizacyjneId) return { dane, porownania: [] }
  const porownania: PorownanieDyspozycjiChecklisty[] = []
  const uczestnicy = pobierzDaneSzkoleniaChecklisty(dane).liczbaUczestnikow
  const dni = new Set(pobierzDaneSzkoleniaChecklisty(dane).terminy).size
  const pozycje = dane.pozycje.map((pozycja) => {
    const paczka = dane.paczki.find((obecna) => obecna.id === pozycja.paczkaId)
    if (!paczka || ['GOTOWA', 'WYSŁANA'].includes(paczka.statusOperacyjny) || (opcje.paczkaId && pozycja.paczkaId !== opcje.paczkaId)) return pozycja
    const rodzaj = pozycja.importDyspozycji?.rodzaj ?? nazwyDyspozycji[pozycja.nazwa.toLocaleLowerCase('pl')]
    const dyspozycja = rodzaj ? migawka.dyspozycjeMaterialowe?.[rodzaj] : undefined
    if (!dyspozycja) return pozycja
    const przed = pobierzPolaDyspozycji(pozycja)
    const ostatnie = pozycja.importDyspozycji?.ostatnieWartosciAutomatyczne ?? domyslnePola(rodzaj)
    const proponowane = zaproponujPola(rodzaj, dyspozycja) ?? przed
    const czyDruk = !proponowane.czyOnline && !proponowane.czyNieDotyczy && dyspozycja.formaPrzekazania === 'papierowa'
    const czyIloscZatwierdzona = pozycja.nadpisanieReczne !== null
    const propozycjaIlosci = czyDruk && !czyIloscZatwierdzona ? pobierzIloscPozycji({ ...pozycja, ...proponowane }, uczestnicy, dni).koncowa : null
    const czyIloscWymagaPotwierdzenia = czyDruk && !czyIloscZatwierdzona
    if (czyIloscWymagaPotwierdzenia) proponowane.uwagiDrukowane += ` Propozycja ilości: ${propozycjaIlosci} egz. — wymaga potwierdzenia.`
    const czyZmienionoRecznie = JSON.stringify({ ...przed, uwagiDrukowane: '' }) !== JSON.stringify({ ...ostatnie, uwagiDrukowane: '' })
    const czyTrwaPrzygotowanie = pozycja.iloscPrzygotowana !== null || pozycja.statusGotowosci !== 'NIEGOTOWE'
    const czyChroniona = (czyZmienionoRecznie || czyIloscZatwierdzona || czyTrwaPrzygotowanie) && !opcje.pozycjeZeZgoda?.includes(pozycja.id)
    const czyNiepewna = dyspozycja.status === 'niepewne' || !zaproponujPola(rodzaj, dyspozycja)
    const po = czyChroniona || czyNiepewna ? przed : { ...proponowane,
      uwagiDrukowane: przed.uwagiDrukowane !== ostatnie.uwagiDrukowane ? przed.uwagiDrukowane : proponowane.uwagiDrukowane }
    const czyKonfliktReczny = czyChroniona && JSON.stringify({ ...przed, uwagiDrukowane: '' }) !== JSON.stringify({ ...proponowane, uwagiDrukowane: '' })
    const nastepna: PozycjaChecklisty = { ...pozycja, ...po, importDyspozycji: {
      rodzaj, dyspozycja: { ...dyspozycja }, grupaId: migawka.grupaId, szczegolyOrganizacyjneId: migawka.szczegolyOrganizacyjneId,
      ostatnieWartosciAutomatyczne: czyChroniona || czyNiepewna ? ostatnie : { ...proponowane },
      propozycjaIlosci, czyIloscWymagaPotwierdzenia: !czyNiepewna && czyIloscWymagaPotwierdzenia, czyKonfliktReczny,
    } }
    if (JSON.stringify(nastepna) === JSON.stringify(pozycja)) return pozycja
    porownania.push({ pozycjaId: pozycja.id, paczkaId: pozycja.paczkaId, przed, proponowane, po, czyKonfliktReczny })
    return nastepna
  })
  if (!porownania.length) return { dane, porownania }
  return { dane: { ...dane, pozycje, statusChecklisty: 'KOPIA_ROBOCZA' }, porownania }
}

export function potwierdzIloscDyspozycji(dane: DaneChecklistyPaczki, pozycjaId: string): DaneChecklistyPaczki {
  if (!czyMoznaImportowacDyspozycje(dane)) return dane
  return { ...dane, pozycje: dane.pozycje.map((pozycja) => {
    const importDyspozycji = pozycja.importDyspozycji
    const paczka = dane.paczki.find((obecna) => obecna.id === pozycja.paczkaId)
    if (pozycja.id !== pozycjaId || !importDyspozycji?.czyIloscWymagaPotwierdzenia || importDyspozycji.czyKonfliktReczny
      || !paczka || ['GOTOWA', 'WYSŁANA'].includes(paczka.statusOperacyjny)) return pozycja
    const ilosc = pobierzIloscPozycji(pozycja, pobierzDaneSzkoleniaChecklisty(dane).liczbaUczestnikow, new Set(pobierzDaneSzkoleniaChecklisty(dane).terminy).size).koncowa
    if (ilosc <= 0) return pozycja
    const uwagiDrukowane = pozycja.uwagiDrukowane === importDyspozycji.ostatnieWartosciAutomatyczne.uwagiDrukowane
      ? pozycja.uwagiDrukowane.replace(/ Propozycja ilości: .*$/, '') : pozycja.uwagiDrukowane
    return { ...pozycja, nadpisanieReczne: ilosc, uwagiDrukowane, importDyspozycji: { ...importDyspozycji,
      propozycjaIlosci: null, czyIloscWymagaPotwierdzenia: false, ostatnieWartosciAutomatyczne: { ...importDyspozycji.ostatnieWartosciAutomatyczne, uwagiDrukowane } } }
  }) }
}
