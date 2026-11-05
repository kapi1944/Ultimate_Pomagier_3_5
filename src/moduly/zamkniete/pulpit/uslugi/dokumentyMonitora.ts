import { pobierzStanRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import { czyTenSamKontekstWydruku, sprawdzUprawnienieWydrukow, zBlokadaWydrukow, zapiszOperacjeWydruku, type OperacjaWydruku } from '../../../../wspolne/dokumenty/rejestrWydrukow'
import { pobierzChecklistyPaczek, pobierzSzczegolyDoChecklisty } from '../../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import { czyPoprawnaIloscWydruku } from '../../../../wspolne/dokumenty/rejestrWydrukow'
import { odczytajWymaganieWydruku, typHistoriiWymaganWydruku, zbudujDokumentyWysylki, type StanDokumentuWysylki, type WymaganieWydruku } from '../logika/dokumentyWysylki'
import type { WysylkaMonitora } from '../logika/monitorWysylek'

export function pobierzDokumentyMonitora(wysylki: WysylkaMonitora[]) {
  const stan = pobierzStanRejestruDokumentow()
  const szczegoly = pobierzSzczegolyDoChecklisty()
  const checklisty = pobierzChecklistyPaczek()
  return new Map(wysylki.map((wysylka) => [wysylka.id, zbudujDokumentyWysylki(wysylka,
    szczegoly.find((rekord) => rekord.id === wysylka.szczegolyId) ?? null,
    checklisty.find((rekord) => rekord.id === wysylka.checklistaId) ?? null, stan.dokumenty, stan.historia)]))
}

function pobierzAktualnyStan(wysylka: WysylkaMonitora, wybrany: StanDokumentuWysylki) {
  const obecny = pobierzDokumentyMonitora([wysylka]).get(wysylka.id)?.find((dokument) => dokument.rodzaj === wybrany.rodzaj)
  if (!obecny || !czyTenSamKontekstWydruku(obecny.kontekst, wybrany.kontekst) || obecny.dokument?.id !== wybrany.dokument?.id || obecny.wersjaDokumentuId !== wybrany.wersjaDokumentuId) throw new Error('Dokument lub jego powiązania zmieniły się. Odśwież panel.')
  if (!obecny.kontekst.paczkaId || !obecny.kontekst.checklistaId) throw new Error('Najpierw utwórz checklistę i wskaż paczkę, której dotyczą wydruki.')
  return obecny
}

export async function potwierdzAktualnoscDokumentuMonitora(wysylka: WysylkaMonitora, wybrany: StanDokumentuWysylki, uzytkownikId: string | null) {
  return zBlokadaWydrukow(() => {
    sprawdzUprawnienieWydrukow(uzytkownikId, 'druk')
    const obecny = pobierzAktualnyStan(wysylka, wybrany)
    const dokument = obecny.dokument
    if (!dokument || !obecny.odciskZrodla || obecny.odciskZrodla !== wybrany.odciskZrodla || obecny.ostrzezenia.length) throw new Error('Źródło zmieniło się lub wymaga sprawdzenia. Odśwież panel.')
    return repozytoriumWspolnychDokumentow.aktualizuj(dokument.id, {
      powiazania: { ...dokument.powiazania, odciskDanychZrodlowych: obecny.odciskZrodla },
      integralnosc: { ...dokument.integralnosc, powiazanieZeSzczegolami: 'POWIAZANY_ZE_SZCZEGOLAMI', idZrodlowychSzczegolow: obecny.kontekst.szczegolyId, znacznikDanychZrodlowych: obecny.odciskZrodla, czyDaneZrodloweNowsze: false },
      ostatnioModyfikujacyId: uzytkownikId,
    })
  })
}

export async function zarejestrujWydrukMonitora(wysylka: WysylkaMonitora, wybrany: StanDokumentuWysylki, dane: { status: 'ZLECONY' | 'POTWIERDZONY'; liczbaEgzemplarzy: number; operacjaId: string }, uzytkownikId: string | null) {
  return zBlokadaWydrukow(() => {
    sprawdzUprawnienieWydrukow(uzytkownikId, dane.status === 'ZLECONY' ? 'druk' : 'potwierdzenie')
    const obecny = pobierzAktualnyStan(wysylka, wybrany)
    if (!obecny.dokument || !obecny.wersjaDokumentuId || obecny.nieDotyczy || obecny.ostrzezenia.length || !czyPoprawnaIloscWydruku(dane.liczbaEgzemplarzy) || dane.liczbaEgzemplarzy === 0) throw new Error('Sprawdź dokument, dyspozycje i dodatnią liczbę egzemplarzy.')
    if (obecny.wymagaAktualizacji) throw new Error('Przed drukiem i potwierdzeniem zaktualizuj dokument w generatorze.')
    return zapiszOperacjeWydruku({ ...obecny.kontekst, ...dane, dokumentId: obecny.dokument.id, wersjaDokumentuId: obecny.wersjaDokumentuId,
      data: new Date().toISOString(), uzytkownikId: uzytkownikId!, korygowanaOperacjaId: null, powod: '' })
  })
}

export async function skorygujWydrukMonitora(wysylka: WysylkaMonitora, wybrany: StanDokumentuWysylki, poprzednia: OperacjaWydruku, liczbaEgzemplarzy: number, powod: string, operacjaId: string, uzytkownikId: string | null) {
  return zBlokadaWydrukow(() => {
    sprawdzUprawnienieWydrukow(uzytkownikId, 'potwierdzenie')
    const obecny = pobierzAktualnyStan(wysylka, wybrany)
    if (!obecny.operacje.some((operacja) => operacja.operacjaId === poprzednia.operacjaId)) throw new Error('Nie znaleziono wpisu w historii tej paczki.')
    return zapiszOperacjeWydruku({ ...poprzednia, operacjaId, status: 'KOREKTA', korygowanaOperacjaId: poprzednia.operacjaId,
      liczbaEgzemplarzy, powod: powod.trim(), data: new Date().toISOString(), uzytkownikId: uzytkownikId! })
  })
}

export async function zapiszWymaganieMonitora(wysylka: WysylkaMonitora, wybrany: StanDokumentuWysylki, zmiany: Pick<WymaganieWydruku, 'liczbaEgzemplarzy' | 'nieDotyczy'>, operacjaId: string, uzytkownikId: string | null) {
  return zBlokadaWydrukow(() => {
    sprawdzUprawnienieWydrukow(uzytkownikId, 'potwierdzenie')
    const obecny = pobierzAktualnyStan(wysylka, wybrany)
    if (zmiany.liczbaEgzemplarzy !== null && !czyPoprawnaIloscWydruku(zmiany.liczbaEgzemplarzy)) throw new Error('Podaj nieujemną całkowitą liczbę egzemplarzy.')
    const wymaganie: WymaganieWydruku = { ...obecny.kontekst, ...zmiany, rodzaj: obecny.rodzaj, operacjaId, uzytkownikId: uzytkownikId! }
    const wpis = { id: `wymaganie-wydruku:${operacjaId}`, dokumentId: obecny.dokument?.id ?? null, dokumentLogicznyId: obecny.dokument?.dokumentLogicznyId ?? null, typ: typHistoriiWymaganWydruku, dane: wymaganie, automatyczne: false }
    const poprzedni = repozytoriumWspolnychDokumentow.pobierzHistorie().find((rekord) => rekord.id === wpis.id)
    if (poprzedni) {
      if (JSON.stringify(odczytajWymaganieWydruku(poprzedni)) !== JSON.stringify(wymaganie)) throw new Error('Identyfikator operacji został już użyty.')
      return
    }
    if (obecny.wymaganieReczne?.operacjaId !== wybrany.wymaganieReczne?.operacjaId) throw new Error('Wymagania zmieniły się w innej karcie. Odśwież panel.')
    repozytoriumWspolnychDokumentow.dodajWpisHistorii(wpis)
  })
}
