import type { Dokument, StatusDokumentu } from '../../../../wspolne/dokumenty/modelDokumentu'
import { utworzNowyDokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { pobierzKolejnyNumerDziennyDokumentu, utworzIdentyfikatorDokumentu } from '../../../../wspolne/dokumenty/nazwyDokumentow'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import {
  pobierzSzczegolyDoGeneratorow,
  type KontekstDokumentuSzkolenia,
  type SzczegolyDoGeneratoraDokumentu,
} from '../../../../wspolne/integracje/szczegolyDoDokumentow/index.ts'
import type { RolaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { utworzUstawieniaUkladuDokumentu } from '../../../../wspolne/dokumenty/ustawieniaUkladuDokumentu'
import {
  normalizujDaneChecklisty,
  pobierzDaneSzkoleniaChecklisty,
  czyMoznaEksportowacCheckliste,
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

export type DokumentChecklistyPaczki = Dokument<DaneChecklistyPaczki, Record<string, unknown>>

export type DaneZrodlaChecklisty = {
  opiekunId: string
  finansowanie: string
  odbiorca: DaneOdbiorcyChecklisty
  logotypy?: Array<{ nazwa: string; podglad: string }>
  uwagiZeSzczegolow?: UwagaZeSzczegolow[]
  wzoryKlienta?: Record<string, string>
}

export type SzczegolyDoChecklisty = SzczegolyDoGeneratoraDokumentu

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

export function pobierzSzczegolyDoChecklisty(): SzczegolyDoChecklisty[] {
  return pobierzSzczegolyDoGeneratorow()
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
  dane.daneSzkolenia = { ...pobierzDaneSzkoleniaChecklisty(dane), organizator: kontekst.organizator.nazwa ?? '' }
  return repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({
    typ: 'CHECKLISTA_PACZKI',
    tytul: pobierzTytul(migawka),
    generatorId: 'checklisty_paczek',
    daneDokumentu: dane,
    ustawieniaDokumentu: { ukladDokumentu: utworzUstawieniaUkladuDokumentu(dane.blokiSwobodne) },
    powiazania: { szkolenieId: kontekst.szkolenie.id, grupaId, szczegolyOrganizacyjneId: migawka.szczegolyOrganizacyjneId, wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId, odciskDanychZrodlowych: migawka.odciskDanych },
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
  return repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ typ: 'CHECKLISTA_PACZKI', tytul: 'Checklista paczki — ręczna', generatorId: 'checklisty_paczek', daneDokumentu: dane, ustawieniaDokumentu: { ukladDokumentu: utworzUstawieniaUkladuDokumentu(dane.blokiSwobodne) }, autorId: uzytkownikId, wlascicielId: uzytkownikId })) as DokumentChecklistyPaczki
}

type ZmianaPowiazaniaChecklisty = Pick<DokumentChecklistyPaczki, 'szkolenieId' | 'klientId' | 'organizatorId' | 'powiazania'> & { integralnosc: Partial<DokumentChecklistyPaczki['integralnosc']> }

function zapiszDaneChecklisty(id: string, dane: DaneChecklistyPaczki, uzytkownikId: string | null, opis: string, powiazanie?: ZmianaPowiazaniaChecklisty) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument || dokument.status === 'ZARCHIWIZOWANY') return null
  const zaktualizowane = dodajWpisHistorii(normalizujDaneChecklisty(dane), 'EDYCJA', uzytkownikId, opis)
  const daneSzkolenia = pobierzDaneSzkoleniaChecklisty(zaktualizowane)
  const reczneNadpisania = zaktualizowane.migawkaZrodla
    ? Object.fromEntries(Object.entries(daneSzkolenia).filter(([pole, wartosc]) => JSON.stringify(wartosc) !== JSON.stringify(zaktualizowane.migawkaZrodla?.[pole as keyof MigawkaZrodlaChecklisty])))
    : {}
  if (zaktualizowane.migawkaZrodla && zaktualizowane.klient !== zaktualizowane.migawkaZrodla.klient) reczneNadpisania.klient = zaktualizowane.klient
  return repozytoriumWspolnychDokumentow.aktualizuj(id, {
    ...powiazanie,
    daneDokumentu: zaktualizowane,
    ustawieniaDokumentu: { ...dokument.ustawieniaDokumentu, ukladDokumentu: utworzUstawieniaUkladuDokumentu(zaktualizowane.blokiSwobodne) },
    status: pobierzStatusWspolny(zaktualizowane.statusChecklisty),
    tytul: ['Checklista paczki', daneSzkolenia.tytulSzkolenia, daneSzkolenia.nazwaGrupy].filter(Boolean).join(' — '),
    integralnosc: { ...dokument.integralnosc, ...powiazanie?.integralnosc, reczneNadpisania },
  }) as DokumentChecklistyPaczki | null
}

export function zapiszChecklistePaczki(id: string, dane: DaneChecklistyPaczki, uzytkownikId: string | null, opis = 'Zapisano zmiany checklisty.') {
  return zapiszDaneChecklisty(id, dane, uzytkownikId, opis)
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
  if (!dokument || !czyMoznaEksportowacCheckliste(dokument.daneDokumentu)) return null
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
  return repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ typ: 'CHECKLISTA_PACZKI', tytul: pobierzTytul(docelowaMigawka), generatorId: 'checklisty_paczek', daneDokumentu: dane, ustawieniaDokumentu: { ukladDokumentu: utworzUstawieniaUkladuDokumentu(dane.blokiSwobodne) }, autorId: uzytkownikId, wlascicielId: docelowaMigawka.opiekunId, integralnosc: { idZrodlowychSzczegolow: docelowaMigawka.szczegolyOrganizacyjneId, znacznikDanychZrodlowych: docelowaMigawka.odciskDanych } })) as DokumentChecklistyPaczki
}

export type { TypZalacznikaChecklisty }


export function duplikujIstniejacaChecklistePaczki(id: string, uzytkownikId: string | null) {
  const zrodlo = pobierzChecklistePaczki(id)
  return zrodlo?.daneDokumentu.migawkaZrodla ? duplikujChecklistePaczki(id, zrodlo.daneDokumentu.migawkaZrodla, uzytkownikId) : null
}

export function usunChecklistePaczki(id: string) {
  return repozytoriumWspolnychDokumentow.usunMiekko(id)
}

export function powiazChecklisteZeSzkoleniem(id: string, kontekst: KontekstDokumentuSzkolenia, grupaId: string, daneZrodla: DaneZrodlaChecklisty, uzytkownikId: string | null) {
  const dokument = pobierzChecklistePaczki(id)
  const migawka = utworzMigawke(kontekst, grupaId, daneZrodla)
  if (!dokument || !migawka || dokument.status === 'ZARCHIWIZOWANY') return null
  const obecne = pobierzDaneSzkoleniaChecklisty(dokument.daneDokumentu)
  const pobrane = { ...pobierzDaneSzkoleniaChecklisty({ migawkaZrodla: migawka }), organizator: kontekst.organizator.nazwa ?? '' }
  const daneSzkolenia = { ...pobrane, ...Object.fromEntries(Object.entries(obecne).filter(([, wartosc]) => Array.isArray(wartosc) ? wartosc.length > 0 : typeof wartosc === 'number' ? wartosc > 0 : wartosc !== '')) }
  return zapiszDaneChecklisty(id, {
    ...dokument.daneDokumentu,
    daneSzkolenia,
    migawkaZrodla: migawka,
    szczegolyOrganizacyjneId: migawka.szczegolyOrganizacyjneId,
    grupaId,
    czyDaneZrodloweNowsze: false,
    klient: dokument.daneDokumentu.klient || migawka.klient,
    opiekunId: dokument.daneDokumentu.opiekunId || migawka.opiekunId,
    daneOdbiorcy: { ...migawka.odbiorca, ...Object.fromEntries(Object.entries(dokument.daneDokumentu.daneOdbiorcy).filter(([, wartosc]) => Boolean(wartosc))) },
  }, uzytkownikId, 'Powiązano ze szkoleniem, zachowując lokalne dane i pozycje.', {
    szkolenieId: kontekst.szkolenie.id,
    klientId: kontekst.klient.id,
    organizatorId: kontekst.organizator.id,
    powiazania: { ...dokument.powiazania, szkolenieId: kontekst.szkolenie.id, klientId: kontekst.klient.id, organizatorId: kontekst.organizator.id, grupaId, szczegolyOrganizacyjneId: migawka.szczegolyOrganizacyjneId, wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId, odciskDanychZrodlowych: migawka.odciskDanych },
    integralnosc: { powiazanieZeSzczegolami: 'POWIAZANY_ZE_SZCZEGOLAMI', idZrodlowychSzczegolow: migawka.szczegolyOrganizacyjneId, znacznikDanychZrodlowych: migawka.odciskDanych, czyDaneZrodloweNowsze: false },
  })
}

export function odlaczChecklisteOdSzkolenia(id: string, uzytkownikId: string | null) {
  const dokument = pobierzChecklistePaczki(id)
  if (!dokument || dokument.status === 'ZARCHIWIZOWANY') return null
  return zapiszDaneChecklisty(id, {
    ...dokument.daneDokumentu,
    daneSzkolenia: pobierzDaneSzkoleniaChecklisty(dokument.daneDokumentu),
    migawkaZrodla: null,
    szczegolyOrganizacyjneId: null,
    grupaId: null,
    czyDaneZrodloweNowsze: false,
  }, uzytkownikId, 'Odłączono szkolenie, zachowując treść checklisty.', {
    szkolenieId: null,
    klientId: null,
    organizatorId: null,
    powiazania: { szkolenieId: null, klientId: null, organizatorId: null, grupaId: null, szczegolyOrganizacyjneId: null, wersjaSzczegolowId: null, odciskDanychZrodlowych: null },
    integralnosc: { powiazanieZeSzczegolami: 'SAMODZIELNY', idZrodlowychSzczegolow: null, znacznikDanychZrodlowych: null, czyDaneZrodloweNowsze: false },
  })
}
