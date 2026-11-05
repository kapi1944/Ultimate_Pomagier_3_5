import type { Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { czyDokumentMaNowszeDaneZrodlowe } from '../../../../wspolne/dokumenty/modelDokumentu'
import type { WpisHistoriiWspolnegoDokumentu } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import { czyHistoriaWydrukowPoprawna, czyPoprawnaIloscWydruku, czyTenSamKontekstWydruku, obliczPotwierdzoneWydruki, odczytajOperacjeWydruku, pobierzIdWersjiWydruku, typHistoriiWydruku, type KontekstWydruku, type OperacjaWydruku } from '../../../../wspolne/dokumenty/rejestrWydrukow'
import { czyDokumentJestGrupowy, etykietyDokumentowZeSzczegolow, pobierzRodzajDokumentuZeSzczegolow, rodzajeWszystkichDokumentow, type RodzajDokumentuZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow/fabrykiDokumentowZeSzczegolow'
import { zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow/zbudujKontekstZeSzczegolow'
import { pobierzIloscPozycji, type PozycjaChecklisty } from '../../../dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki'
import type { DokumentChecklistyPaczki, SzczegolyDoChecklisty } from '../../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import type { RodzajDyspozycjiMaterialowej } from '../../szczegoly_organizacyjne/typy'
import type { WysylkaMonitora } from './monitorWysylek'

export type WymaganieWydruku = KontekstWydruku & {
  rodzaj: RodzajDokumentuZeSzczegolow
  liczbaEgzemplarzy: number | null
  nieDotyczy: boolean | null
  uzytkownikId: string
  operacjaId: string
}
export const typHistoriiWymaganWydruku = 'wymaganie_wydruku'

export type StanDokumentuWysylki = {
  rodzaj: RodzajDokumentuZeSzczegolow
  nazwa: string
  ikona: string
  dokument: Dokument<unknown, unknown> | null
  wersjaDokumentuId: string | null
  kontekst: KontekstWydruku
  wymagane: number
  wydrukowane: number
  brakujace: number
  nieDotyczy: boolean
  wymagaAktualizacji: boolean
  ostrzezenia: string[]
  status: 'brak' | 'przygotowany' | 'wydrukowany' | 'nie_dotyczy' | 'niepewny'
  zrodloIlosci: string
  operacje: OperacjaWydruku[]
  wymaganieReczne: WymaganieWydruku | null
  odciskZrodla: string | null
}

const konfiguracja: Record<RodzajDokumentuZeSzczegolow, { ikona: string; nazwyPozycji: string[]; dyspozycja?: RodzajDyspozycjiMaterialowej; naUczestnika: boolean }> = {
  program: { ikona: '📘', nazwyPozycji: ['program szkolenia'], naUczestnika: true },
  lista: { ikona: '📋', nazwyPozycji: ['lista obecności'], dyspozycja: 'listaObecnosci', naUczestnika: false },
  ankieta: { ikona: '📝', nazwyPozycji: ['ankiety', 'ankieta'], dyspozycja: 'ankiety', naUczestnika: true },
  dyplomy: { ikona: '🎓', nazwyPozycji: ['certyfikaty / dyplomy'], dyspozycja: 'certyfikaty', naUczestnika: true },
  karty: { ikona: '🚪', nazwyPozycji: ['karta na drzwi'], naUczestnika: false },
  checklista: { ikona: '☑', nazwyPozycji: [], naUczestnika: false },
}

export function odczytajWymaganieWydruku(wpis: WpisHistoriiWspolnegoDokumentu): WymaganieWydruku | null {
  if (wpis.typ !== typHistoriiWymaganWydruku || !wpis.dane || typeof wpis.dane !== 'object') return null
  const dane = wpis.dane as Partial<WymaganieWydruku>
  if (!rodzajeWszystkichDokumentow.includes(dane.rodzaj as RodzajDokumentuZeSzczegolow)
    || ![dane.szkolenieId, dane.szczegolyId, dane.grupaId, dane.uzytkownikId, dane.operacjaId].every((wartosc) => typeof wartosc === 'string' && wartosc.length > 0)
    || ![dane.paczkaId, dane.checklistaId].every((wartosc) => wartosc === null || typeof wartosc === 'string')
    || !(dane.liczbaEgzemplarzy === null || typeof dane.liczbaEgzemplarzy === 'number' && czyPoprawnaIloscWydruku(dane.liczbaEgzemplarzy))
    || !(dane.nieDotyczy === null || typeof dane.nieDotyczy === 'boolean')) return null
  return dane as WymaganieWydruku
}

function czyNiepewnaPozycja(pozycja: PozycjaChecklisty) {
  return pozycja.importDyspozycji?.czyKonfliktReczny || pozycja.importDyspozycji?.czyIloscWymagaPotwierdzenia || pozycja.importDyspozycji?.dyspozycja.status === 'niepewne'
}

export function zbudujDokumentyWysylki(wysylka: WysylkaMonitora, szczegoly: SzczegolyDoChecklisty | null, checklista: DokumentChecklistyPaczki | null, dokumenty: Dokument<unknown, unknown>[], historia: WpisHistoriiWspolnegoDokumentu[]): StanDokumentuWysylki[] {
  const zrodlo = szczegoly ? zbudujKontekstZeSzczegolow(szczegoly.zrodloKontekstu) : null
  const grupa = szczegoly?.grupy.find((obecna) => obecna.id === wysylka.grupaId)
  const kontekst: KontekstWydruku = { szkolenieId: zrodlo?.szkolenie.id || wysylka.zrodloSzczegolowId, szczegolyId: wysylka.zrodloSzczegolowId, grupaId: wysylka.grupaId, paczkaId: wysylka.paczkaId ?? null, checklistaId: wysylka.checklistaId ?? null }
  const operacje = historia.map(odczytajOperacjeWydruku).filter((operacja): operacja is OperacjaWydruku => operacja !== null)
  const wymagania = historia.map(odczytajWymaganieWydruku).filter((wymaganie): wymaganie is WymaganieWydruku => wymaganie !== null)
  return rodzajeWszystkichDokumentow.map((rodzaj) => {
    const ustawienia = konfiguracja[rodzaj]
    const powiazane = dokumenty.filter((dokument) => !dokument.czyUsunietyMiekko && !dokument.czyZarchiwizowany && pobierzRodzajDokumentuZeSzczegolow(dokument.typ) === rodzaj
      && (rodzaj === 'checklista' ? dokument.id === wysylka.checklistaId :
        [wysylka.szczegolyId, wysylka.zrodloSzczegolowId].includes(dokument.powiazania.szczegolyOrganizacyjneId ?? dokument.integralnosc.idZrodlowychSzczegolow ?? '')
        && (dokument.powiazania.grupaId === wysylka.grupaId || !dokument.powiazania.grupaId && !czyDokumentJestGrupowy(rodzaj))))
      .sort((pierwszy, drugi) => drugi.wersja - pierwszy.wersja || drugi.zmodyfikowano.localeCompare(pierwszy.zmodyfikowano) || pierwszy.id.localeCompare(drugi.id))
    const dokument = powiazane[0] ?? null
    const wersjaDokumentuId = dokument ? pobierzIdWersjiWydruku(dokument) : null
    const ostrzezenia: string[] = []
    if (!grupa || !zrodlo) ostrzezenia.push('Nie znaleziono aktualnej grupy szkolenia.')
    if (wysylka.checklistaId && (!checklista || !checklista.daneDokumentu.paczki.some((paczka) => paczka.id === wysylka.paczkaId))) ostrzezenia.push('Paczka lub checklista zmieniła się. Odśwież monitor.')
    const rodziny = new Set(powiazane.map((obecny) => obecny.dokumentNadrzednyId ?? obecny.dokumentLogicznyId))
    if (rodziny.size > 1) ostrzezenia.push('Kilka dokumentów tego rodzaju — sprawdź powiązania w rejestrze.')
    const pozycje = checklista?.daneDokumentu.pozycje.filter((pozycja) => pozycja.paczkaId === wysylka.paczkaId && ustawienia.nazwyPozycji.includes(pozycja.nazwa.trim().toLocaleLowerCase('pl'))) ?? []
    const dyspozycja = ustawienia.dyspozycja ? grupa?.dyspozycjeMaterialowe?.[ustawienia.dyspozycja] : undefined
    const wymaganieReczne = wymagania.find((wymaganie) => wymaganie.rodzaj === rodzaj && czyTenSamKontekstWydruku(wymaganie, kontekst)) ?? null
    const aktywnePozycje = pozycje.filter((pozycja) => !pozycja.czyNieDotyczy && !pozycja.czyOnline && pozycja.regulaIlosci.typ !== 'WYLACZONA')
    let wymagane = pozycje.length ? aktywnePozycje.reduce((suma, pozycja) => suma + pobierzIloscPozycji(pozycja, grupa?.liczbaUczestnikow ?? wysylka.liczbaUczestnikow, wysylka.terminySzkolenia.length).koncowa, 0) : ustawienia.naUczestnika ? grupa?.liczbaUczestnikow ?? wysylka.liczbaUczestnikow : 1
    let nieDotyczy = pozycje.length ? aktywnePozycje.length === 0 : Boolean(dyspozycja && (dyspozycja.formaPrzekazania === 'online' || dyspozycja.sposobPrzygotowania === 'drukuje_klient' || dyspozycja.terminPrzekazania === 'po_szkoleniu'))
    let zrodloIlosci = pozycje.length ? 'Dyspozycje i ilości checklisty' : dyspozycja ? 'Dyspozycja grupy' : ustawienia.naUczestnika ? 'Domyślnie: na uczestnika' : rodzaj === 'checklista' ? 'Domyślnie: na paczkę' : 'Domyślnie: na grupę'
    if (wymaganieReczne?.liczbaEgzemplarzy !== null && wymaganieReczne?.liczbaEgzemplarzy !== undefined) { wymagane = wymaganieReczne.liczbaEgzemplarzy; zrodloIlosci = 'Ręcznie zatwierdzone' }
    if (wymaganieReczne?.nieDotyczy !== null && wymaganieReczne?.nieDotyczy !== undefined) nieDotyczy = wymaganieReczne.nieDotyczy
    if (pozycje.some(czyNiepewnaPozycja) || dyspozycja?.status === 'niepewne') ostrzezenia.push('Dyspozycja lub jej ilość wymaga potwierdzenia w checkliście.')
    if (!czyPoprawnaIloscWydruku(wymagane)) { ostrzezenia.push('Nieprawidłowa wymagana ilość.'); wymagane = 0 }
    if (!nieDotyczy && wymagane === 0) ostrzezenia.push('Ustal wymaganą liczbę egzemplarzy lub oznacz „Nie dotyczy”.')
    const rodzinaId = dokument?.dokumentNadrzednyId ?? dokument?.dokumentLogicznyId
    const idRodziny = new Set(dokumenty.filter((obecny) => rodzinaId && (obecny.dokumentNadrzednyId ?? obecny.dokumentLogicznyId) === rodzinaId).map((obecny) => obecny.id))
    const historiaDokumentu = operacje.filter((operacja) => czyTenSamKontekstWydruku(operacja, kontekst) && idRodziny.has(operacja.dokumentId))
    if (!czyHistoriaWydrukowPoprawna(historiaDokumentu)) ostrzezenia.push('Niespójna historia korekt wydruków — sprawdź dane.')
    if (historia.some((wpis) => wpis.typ === typHistoriiWydruku && wpis.dokumentId === dokument?.id && !odczytajOperacjeWydruku(wpis))) ostrzezenia.push('Historia wydruków zawiera niepoprawny wpis.')
    if (historia.some((wpis) => wpis.typ === typHistoriiWymaganWydruku && !odczytajWymaganieWydruku(wpis))) ostrzezenia.push('Nie można odczytać części wymagań wydruków.')
    const wydrukowane = obliczPotwierdzoneWydruki(historiaDokumentu.filter((operacja) => operacja.wersjaDokumentuId === wersjaDokumentuId))
    const wymagaAktualizacji = Boolean(dokument && (dokument.integralnosc.czyDaneZrodloweNowsze || zrodlo && (czyDokumentMaNowszeDaneZrodlowe(dokument, zrodlo.zrodlo.odciskDanych)
      || dokument.powiazania.odciskDanychZrodlowych && dokument.powiazania.odciskDanychZrodlowych !== zrodlo.zrodlo.odciskDanych)))
    const status = nieDotyczy ? 'nie_dotyczy' : !dokument ? 'brak' : ostrzezenia.length ? 'niepewny' : !wymagaAktualizacji && wydrukowane >= wymagane ? 'wydrukowany' : 'przygotowany'
    return { rodzaj, nazwa: etykietyDokumentowZeSzczegolow[rodzaj], ikona: ustawienia.ikona, dokument, wersjaDokumentuId, kontekst, wymagane, wydrukowane, brakujace: nieDotyczy ? 0 : Math.max(0, wymagane - wydrukowane), nieDotyczy, wymagaAktualizacji, ostrzezenia, status, zrodloIlosci, operacje: historiaDokumentu, wymaganieReczne, odciskZrodla: zrodlo?.zrodlo.odciskDanych ?? null }
  })
}

export function podsumujDokumentyWysylki(dokumenty: StanDokumentuWysylki[]) {
  const dotyczace = dokumenty.filter((dokument) => !dokument.nieDotyczy)
  const gotowe = dotyczace.filter((dokument) => dokument.status === 'wydrukowany').length
  return { gotowe, wymagane: dotyczace.length, procent: dotyczace.length ? Math.round(100 * gotowe / dotyczace.length) : 100 }
}
