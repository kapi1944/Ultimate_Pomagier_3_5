import type { Dokument, StatusDokumentu } from '../../../../wspolne/dokumenty/modelDokumentu'
import { utworzNowyDokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { pobierzKolejnyNumerDziennyDokumentu, utworzIdentyfikatorDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import type { KontekstDokumentuSzkolenia } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import type { RolaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import {
  normalizujDaneChecklisty,
  type DaneChecklistyPaczki,
  type DaneOdbiorcyChecklisty,
  type MigawkaZrodlaChecklisty,
  type PozycjaChecklisty,
  type ProsbaOWeryfikacje,
  type StatusChecklistyPaczki,
  type TypZalacznikaChecklisty,
  type UwagaZeSzczegolow,
  type ZalacznikChecklisty,
  utworzDomyslneDaneChecklisty,
} from './modelChecklistyPaczki'

export type DokumentChecklistyPaczki = Dokument<DaneChecklistyPaczki, Record<string, never>>

export type DaneZrodlaChecklisty = {
  opiekunId: string
  finansowanie: string
  odbiorca: DaneOdbiorcyChecklisty
  logotypy?: Array<{ nazwa: string; podglad: string }>
  uwagiZeSzczegolow?: UwagaZeSzczegolow[]
  wzoryKlienta?: Record<string, string>
}

function utworzId(prefiks: string) {
  return `${prefiks}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function jakoDokumentChecklisty(dokument: Dokument<unknown, unknown>): DokumentChecklistyPaczki | null {
  if (dokument.typ !== 'CHECKLISTA_PACZKI' || !dokument.daneDokumentu || typeof dokument.daneDokumentu !== 'object') return null
  const dane = dokument.daneDokumentu as Partial<DaneChecklistyPaczki>
  if (typeof dane.identyfikator !== 'string' || !Array.isArray(dane.pozycje) || !Array.isArray(dane.kategorie)) return null
  return { ...dokument, daneDokumentu: normalizujDaneChecklisty(dane as DaneChecklistyPaczki) } as DokumentChecklistyPaczki
}

function pobierzStatusWspolny(status: StatusChecklistyPaczki): StatusDokumentu {
  if (status === 'KOPIA_ROBOCZA') return 'ROBOCZY'
  if (status === 'GOTOWA_DO_WYDRUKU') return 'GOTOWY'
  if (status === 'WYDRUKOWANA') return 'OPUBLIKOWANY'
  if (status === 'KOMPLETNA') return 'KOMPLETNY'
  return 'ZARCHIWIZOWANY'
}

function utworzMigawke(kontekst: KontekstDokumentuSzkolenia, grupaId: string, daneZrodla: DaneZrodlaChecklisty): MigawkaZrodlaChecklisty | null {
  const grupa = kontekst.grupy.find((pozycja) => pozycja.id === grupaId)
  if (!grupa) return null
  const lokalizacja = grupa.lokalizacje.find((pozycja) => Boolean(pozycja.nazwa))
  const logotypy = daneZrodla.logotypy?.length
    ? daneZrodla.logotypy
    : kontekst.organizator.logoNazwaPliku ? [{ nazwa: kontekst.organizator.logoNazwaPliku, podglad: kontekst.organizator.logoPodglad ?? '' }] : []
  return {
    szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId,
    grupaId,
    nazwaGrupy: grupa.nazwa,
    odciskDanych: kontekst.zrodlo.odciskDanych,
    tytulSzkolenia: kontekst.szkolenie.tytul,
    klient: kontekst.klient.nazwa ?? '',
    opiekunId: daneZrodla.opiekunId,
    trenerzy: grupa.trenerzy.map((trener) => trener.imieINazwisko),
    terminy: grupa.daty,
    miejsce: lokalizacja?.nazwa ?? (grupa.tryb === 'Online' ? 'Online' : ''),
    uczestnicy: grupa.uczestnicy.map((uczestnik) => ({ id: uczestnik.id, nazwaPelna: uczestnik.nazwaPelna })),
    liczbaUczestnikow: grupa.liczbaUczestnikow,
    logotypy,
    finansowanie: daneZrodla.finansowanie,
    uwagiZeSzczegolow: daneZrodla.uwagiZeSzczegolow ?? [],
    odbiorca: daneZrodla.odbiorca,
  }
}

function pobierzTytul(migawka: MigawkaZrodlaChecklisty | null) {
  return `Checklista paczki — ${migawka?.tytulSzkolenia || 'bez wskazanej grupy'}${migawka ? ` — ${migawka.nazwaGrupy}` : ''}`
}

function dodajWpisHistorii(dane: DaneChecklistyPaczki, typ: DaneChecklistyPaczki['historia'][number]['typ'], uzytkownikId: string | null, opis: string): DaneChecklistyPaczki {
  return { ...dane, historia: [...dane.historia, { id: utworzId('audyt'), typ, data: new Date().toISOString(), uzytkownikId, opis }] }
}

function pobierzKluczWzoruKlienta(nazwaPozycji: string) {
  const nazwa = nazwaPozycji.toLocaleLowerCase('pl')
  if (nazwa.includes('lista obecności')) return 'listaObecnosci'
  if (nazwa.includes('ankiet')) return 'ankiety'
  if (nazwa.includes('certyfikat')) return 'certyfikaty'
  if (nazwa.includes('program') || nazwa.includes('teczki')) return 'program'
  if (nazwa.includes('karta na drzwi')) return 'kartaInformacyjna'
  if (nazwa.includes('podręczniki')) return 'podreczniki'
  if (nazwa.includes('materiały dodatkowe')) return 'materialyDodatkowe'
  if (nazwa.includes('pre/post')) return 'projektTesty'
  return ''
}

function zastosujWzoryKlienta(dane: DaneChecklistyPaczki, wzoryKlienta?: Record<string, string>) {
  if (!wzoryKlienta) return dane
  return { ...dane, pozycje: dane.pozycje.map((pozycja) => ({ ...pozycja, wzorKlienta: wzoryKlienta[pobierzKluczWzoruKlienta(pozycja.nazwa)] ?? pozycja.wzorKlienta })) }
}

export function pobierzChecklistyPaczek() {
  return repozytoriumWspolnychDokumentow.pobierzWszystkie().map(jakoDokumentChecklisty).filter((dokument): dokument is DokumentChecklistyPaczki => dokument !== null)
}

export function pobierzChecklistePaczki(id: string) {
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(id)
  return dokument ? jakoDokumentChecklisty(dokument) : null
}

export function pobierzChecklistyPowiazane(szczegolyOrganizacyjneId: string) {
  return pobierzChecklistyPaczek().filter((dokument) => dokument.daneDokumentu.szczegolyOrganizacyjneId === szczegolyOrganizacyjneId)
}

export function utworzChecklistePaczkiZeZrodla(kontekst: KontekstDokumentuSzkolenia, grupaId: string, daneZrodla: DaneZrodlaChecklisty, uzytkownikId: string | null) {
  const migawka = utworzMigawke(kontekst, grupaId, daneZrodla)
  if (!migawka) return null
  const dokumenty = repozytoriumWspolnychDokumentow.pobierzWszystkie()
  const numerDzienny = pobierzKolejnyNumerDziennyDokumentu(dokumenty, 'CHECKLISTA_PACZKI')
  const identyfikator = utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', numerDzienny, 1)
  const dane = zastosujWzoryKlienta(utworzDomyslneDaneChecklisty({ identyfikator, numerDzienny, migawka, wariantOnline: false, uzytkownikId }), daneZrodla.wzoryKlienta)
  return repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({
    typ: 'CHECKLISTA_PACZKI',
    tytul: pobierzTytul(migawka),
    generatorId: 'checklisty_paczek',
    daneDokumentu: dane,
    ustawieniaDokumentu: {},
    szkolenieId: kontekst.szkolenie.id,
    klientId: kontekst.klient.id,
    autorId: uzytkownikId,
    wlascicielId: migawka.opiekunId || uzytkownikId,
    integralnosc: { idZrodlowychSzczegolow: migawka.szczegolyOrganizacyjneId, znacznikDanychZrodlowych: migawka.odciskDanych },
  })) as DokumentChecklistyPaczki
}

export function utworzRecznaChecklistePaczki(uzytkownikId: string | null) {
  const numerDzienny = pobierzKolejnyNumerDziennyDokumentu(repozytoriumWspolnychDokumentow.pobierzWszystkie(), 'CHECKLISTA_PACZKI')
  const identyfikator = utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', numerDzienny, 1)
  const dane = utworzDomyslneDaneChecklisty({ identyfikator, numerDzienny, uzytkownikId })
  return repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ typ: 'CHECKLISTA_PACZKI', tytul: 'Checklista paczki — ręczna', generatorId: 'checklisty_paczek', daneDokumentu: dane, ustawieniaDokumentu: {}, autorId: uzytkownikId, wlascicielId: uzytkownikId })) as DokumentChecklistyPaczki
}

export function zapiszChecklistePaczki(id: string, dane: DaneChecklistyPaczki, uzytkownikId: string | null, opis = 'Zapisano zmiany checklisty.') {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument || dokument.status === 'ZARCHIWIZOWANY') return null
  const zaktualizowane = dodajWpisHistorii(normalizujDaneChecklisty(dane), 'EDYCJA', uzytkownikId, opis)
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: zaktualizowane, status: pobierzStatusWspolny(zaktualizowane.statusChecklisty), tytul: pobierzTytul(zaktualizowane.migawkaZrodla) }) as DokumentChecklistyPaczki | null
}

export function ustawStatusChecklisty(id: string, statusChecklisty: StatusChecklistyPaczki, uzytkownikId: string | null, opis: string) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument) return null
  const dane = dodajWpisHistorii({ ...dokument.daneDokumentu, statusChecklisty }, statusChecklisty === 'ZARCHIWIZOWANA' ? 'ARCHIWIZACJA' : 'ZMIANA_STATUSU', uzytkownikId, opis)
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: dane, status: pobierzStatusWspolny(statusChecklisty), czyZarchiwizowany: statusChecklisty === 'ZARCHIWIZOWANA', zarchiwizowano: statusChecklisty === 'ZARCHIWIZOWANA' ? new Date().toISOString() : null }) as DokumentChecklistyPaczki | null
}

export function dodajZalacznikChecklisty(id: string, zalacznik: Omit<ZalacznikChecklisty, 'id' | 'dodano'>, uzytkownikId: string | null) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument || dokument.status === 'ZARCHIWIZOWANY') return null
  const nowyZalacznik: ZalacznikChecklisty = { ...zalacznik, id: utworzId('zalacznik'), dodano: new Date().toISOString(), autorId: uzytkownikId }
  const statusChecklisty = nowyZalacznik.typ === 'SKAN_PODPISANEJ_CHECKLISTY' ? 'KOMPLETNA' : dokument.daneDokumentu.statusChecklisty
  const dane = dodajWpisHistorii({ ...dokument.daneDokumentu, statusChecklisty, zalaczniki: [...dokument.daneDokumentu.zalaczniki, nowyZalacznik] }, 'DODANIE_ZALACZNIKA', uzytkownikId, `Dodano załącznik: ${nowyZalacznik.nazwa}.`)
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: dane, status: pobierzStatusWspolny(statusChecklisty) }) as DokumentChecklistyPaczki | null
}

function odciskTresci(dane: DaneChecklistyPaczki) {
  return JSON.stringify({ ...dane, identyfikator: undefined, historia: undefined, wersjeWydruku: undefined, zalaczniki: undefined, prosbyOWeryfikacje: undefined })
}

export function zarejestrujWydrukChecklisty(id: string, uzytkownikId: string | null) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument) return null
  const statusChecklisty = dokument.daneDokumentu.statusChecklisty === 'KOPIA_ROBOCZA' || dokument.daneDokumentu.statusChecklisty === 'GOTOWA_DO_WYDRUKU' ? 'WYDRUKOWANA' : dokument.daneDokumentu.statusChecklisty
  const odcisk = odciskTresci({ ...dokument.daneDokumentu, statusChecklisty })
  const ostatnia = dokument.daneDokumentu.wersjeWydruku.at(-1)
  const wersja = ostatnia?.odciskTresci === odcisk ? ostatnia.wersja : (ostatnia?.wersja ?? 0) + 1
  const identyfikator = utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', dokument.daneDokumentu.numerDzienny, wersja, new Date(dokument.utworzono))
  const wersjeWydruku = ostatnia?.odciskTresci === odcisk ? dokument.daneDokumentu.wersjeWydruku : [...dokument.daneDokumentu.wersjeWydruku, { wersja, identyfikator, odciskTresci: odcisk, utworzono: new Date().toISOString(), autorId: uzytkownikId }]
  const dane = dodajWpisHistorii({ ...dokument.daneDokumentu, identyfikator, statusChecklisty, wersjeWydruku }, ostatnia?.odciskTresci === odcisk ? 'WYDRUK' : 'NOWA_WERSJA', uzytkownikId, ostatnia?.odciskTresci === odcisk ? 'Ponownie wydrukowano istniejącą wersję.' : `Utworzono wersję wydruku v${String(wersja).padStart(2, '0')}.`)
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: dane, status: pobierzStatusWspolny(statusChecklisty), opublikowano: statusChecklisty === 'WYDRUKOWANA' ? (dokument.opublikowano ?? new Date().toISOString()) : dokument.opublikowano }) as DokumentChecklistyPaczki | null
}

export function odswiezStanZrodlaChecklisty(id: string, aktualnyOdcisk: string) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument?.daneDokumentu.migawkaZrodla) return null
  const czyNowsze = dokument.daneDokumentu.migawkaZrodla.odciskDanych !== aktualnyOdcisk
  const dane = { ...dokument.daneDokumentu, czyDaneZrodloweNowsze: czyNowsze }
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: dane, integralnosc: { ...dokument.integralnosc, czyDaneZrodloweNowsze: czyNowsze } }) as DokumentChecklistyPaczki | null
}

export function utworzProsbeOWeryfikacje(id: string, odUzytkownikaId: string, doUzytkownikaId: string, uzytkownikId: string | null) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument || odUzytkownikaId === doUzytkownikaId) return null
  const prosba: ProsbaOWeryfikacje = { id: utworzId('prosba'), odUzytkownikaId, doUzytkownikaId, utworzono: new Date().toISOString(), status: 'OCZEKUJE', odpowiedz: '' }
  const dane = dodajWpisHistorii({ ...dokument.daneDokumentu, prosbyOWeryfikacje: [...dokument.daneDokumentu.prosbyOWeryfikacje, prosba] }, 'PROSBA_O_AKCEPTACJE', uzytkownikId, 'Wysłano prośbę o weryfikację.')
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: dane }) as DokumentChecklistyPaczki | null
}

export function otworzPonownieCheckliste(id: string, rola: RolaUzytkownika, uzytkownikId: string | null) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument || (rola !== 'ADMINISTRATOR' && rola !== 'ARCHITEKT')) return null
  const dane = dodajWpisHistorii({ ...dokument.daneDokumentu, statusChecklisty: 'KOPIA_ROBOCZA' }, 'PONOWNE_OTWARCIE', uzytkownikId, 'Administrator ponownie otworzył checklistę.')
  return repozytoriumWspolnychDokumentow.aktualizuj(id, { daneDokumentu: dane, status: 'ROBOCZY', czyZarchiwizowany: false, zarchiwizowano: null }) as DokumentChecklistyPaczki | null
}

export function duplikujChecklistePaczki(id: string, docelowaMigawka: MigawkaZrodlaChecklisty, uzytkownikId: string | null) {
  const zrodlo = pobierzChecklistePaczki(id)
  if (!zrodlo) return null
  const numerDzienny = pobierzKolejnyNumerDziennyDokumentu(repozytoriumWspolnychDokumentow.pobierzWszystkie(), 'CHECKLISTA_PACZKI')
  const identyfikator = utworzIdentyfikatorDokumentu('CHECKLISTA_PACZKI', numerDzienny, 1)
  const dane = utworzDomyslneDaneChecklisty({ identyfikator, numerDzienny, migawka: docelowaMigawka, uzytkownikId })
  dane.kategorie = zrodlo.daneDokumentu.kategorie.map((kategoria) => ({ ...kategoria }))
  dane.pozycje = zrodlo.daneDokumentu.pozycje.map((pozycja: PozycjaChecklisty) => ({ ...pozycja, statusGotowosci: 'NIEGOTOWE', nadpisanieReczne: null, dodatkoweEgzemplarze: pozycja.dodatkoweEgzemplarze.map((dodatek) => ({ ...dodatek })) }))
  return repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ typ: 'CHECKLISTA_PACZKI', tytul: pobierzTytul(docelowaMigawka), generatorId: 'checklisty_paczek', daneDokumentu: dane, ustawieniaDokumentu: {}, autorId: uzytkownikId, wlascicielId: docelowaMigawka.opiekunId, integralnosc: { idZrodlowychSzczegolow: docelowaMigawka.szczegolyOrganizacyjneId, znacznikDanychZrodlowych: docelowaMigawka.odciskDanych } })) as DokumentChecklistyPaczki
}

export type { TypZalacznikaChecklisty }
