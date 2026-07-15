import type { OpublikowaneSzczegolyOrganizacyjne, WersjaRoboczaGeneratora } from '../../../moduly/zamkniete/szczegoly_organizacyjne/typy'
import {
  klonujMigawke,
  type DaneSzczegolowDoKontekstu,
  type KontekstDokumentuSzkolenia,
  type KontekstGrupySzkoleniowej,
  type LokalizacjaKontekstuSzkolenia,
  type TrenerKontekstuSzkolenia,
} from './typyKontekstuDokumentu'

function tekstLubNull(wartosc: string | null | undefined): string | null {
  const tekst = wartosc?.trim()
  return tekst ? tekst : null
}

function zbudujAdres(czesci: Array<string | null | undefined>): string | null {
  const adres = czesci.map((czesc) => tekstLubNull(czesc)).filter((czesc): czesc is string => Boolean(czesc)).join(', ')
  return adres || null
}

function zbudujDaty(dataOd: string, dataDo: string): string[] {
  return [...new Set([tekstLubNull(dataOd), tekstLubNull(dataDo)].filter((data): data is string => Boolean(data)))]
}

function zbudujLokalizacje(daty: string[], miejsce: string, trybOnline: boolean): LokalizacjaKontekstuSzkolenia[] {
  const nazwa = trybOnline ? null : tekstLubNull(miejsce)
  const datyLokalizacji = daty.length ? daty : [null]

  return datyLokalizacji.map((data) => ({
    data,
    lokalizacjaId: null,
    nazwa,
    adres: null,
    sala: null,
    trybOnline,
  }))
}

function zbudujTrenerow(trenerzy: Array<{ id: string; imieNazwisko: string }>): TrenerKontekstuSzkolenia[] {
  return trenerzy
    .map((trener) => ({ id: tekstLubNull(trener.id), imieINazwisko: trener.imieNazwisko.trim() }))
    .filter((trener) => trener.imieINazwisko)
}

function zbudujGrupe(dane: DaneSzczegolowDoKontekstu, grupa: DaneSzczegolowDoKontekstu['grupy'][number]): KontekstGrupySzkoleniowej {
  const daty = zbudujDaty(grupa.dataOd, grupa.dataDo)
  const trybOnline = grupa.formaSzkolenia === 'Online'
  const odbiorca = dane.dane.odbiorcaPaczki

  return {
    id: grupa.id,
    nazwa: grupa.nazwa,
    daty,
    tryb: grupa.formaSzkolenia ?? null,
    liczbaGodzin: Number.isFinite(grupa.liczbaGodzin) ? grupa.liczbaGodzin : null,
    lokalizacje: zbudujLokalizacje(daty, grupa.miejsce, trybOnline),
    trenerzy: zbudujTrenerow(grupa.trenerzy),
    uczestnicy: (grupa.uczestnicy ?? []).map((uczestnik) => ({
      id: tekstLubNull(uczestnik.id),
      imie: uczestnik.imie.trim(),
      nazwisko: uczestnik.nazwisko.trim(),
      nazwaPelna: `${uczestnik.imie} ${uczestnik.nazwisko}`.trim(),
      email: tekstLubNull(uczestnik.email),
      stanowisko: null,
    })),
    liczbaUczestnikow: Number.isFinite(grupa.liczbaUczestnikow) ? grupa.liczbaUczestnikow : 0,
    wysylkaMaterialow: {
      wymagana: dane.dane.wysylkaPaczkiDotyczy,
      odbiorca: tekstLubNull(odbiorca.imieNazwisko) ?? tekstLubNull(odbiorca.nazwaFirmy),
      adres: zbudujAdres([
        [tekstLubNull(odbiorca.ulica), tekstLubNull(odbiorca.nrBudynku), tekstLubNull(odbiorca.nrLokalu)].filter(Boolean).join(' '),
        [tekstLubNull(odbiorca.kodPocztowy), tekstLubNull(odbiorca.miasto)].filter(Boolean).join(' '),
        odbiorca.kraj,
      ]),
      uwagi: tekstLubNull(dane.dane.dodatkoweWymogi.uwagi),
    },
  }
}

function stabilnieSerializuj(wartosc: unknown): string {
  if (wartosc === null || typeof wartosc !== 'object') {
    return JSON.stringify(wartosc)
  }

  if (Array.isArray(wartosc)) {
    return `[${wartosc.map(stabilnieSerializuj).join(',')}]`
  }

  const obiekt = wartosc as Record<string, unknown>
  return `{${Object.keys(obiekt)
    .sort()
    .map((klucz) => `${JSON.stringify(klucz)}:${stabilnieSerializuj(obiekt[klucz])}`)
    .join(',')}}`
}

export function obliczOdciskDanychKontekstu(kontekst: Omit<KontekstDokumentuSzkolenia, 'zrodlo'> & { zrodlo: Omit<KontekstDokumentuSzkolenia['zrodlo'], 'odciskDanych'> }): string {
  const tekst = stabilnieSerializuj(kontekst)
  let hash = 0x811c9dc5

  for (let indeks = 0; indeks < tekst.length; indeks += 1) {
    hash ^= tekst.charCodeAt(indeks)
    hash = Math.imul(hash, 0x01000193)
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function zbudujKontekstZeSzczegolow(zrodlo: DaneSzczegolowDoKontekstu): KontekstDokumentuSzkolenia {
  const grupy = zrodlo.grupy.map((grupa) => zbudujGrupe(zrodlo, grupa))
  const trenerzy = grupy
    .flatMap((grupa) => grupa.trenerzy)
    .filter((trener, indeks, wszystkie) => wszystkie.findIndex((porownywany) => porownywany.id === trener.id && porownywany.imieINazwisko === trener.imieINazwisko) === indeks)
  const tryby = [...new Set(grupy.map((grupa) => grupa.tryb).filter((tryb): tryb is string => Boolean(tryb)))]
  const liczbyGodzin = [...new Set(grupy.map((grupa) => grupa.liczbaGodzin).filter((liczba): liczba is number => liczba !== null))]
  const nabywca = zrodlo.dane.nabywca
  const logo = zrodlo.dane.logotypy
  const bazaKontekstu = {
    zrodlo: {
      szczegolyOrganizacyjneId: zrodlo.szczegolyOrganizacyjneId,
      wersjaSzczegolowId: zrodlo.wersjaSzczegolowId,
      zmodyfikowano: zrodlo.zmodyfikowano,
    },
    szkolenie: {
      id: null,
      tytul: zrodlo.dane.tytulSzkolenia.trim(),
      typ: null,
      tryb: tryby.length === 1 ? tryby[0] : null,
      liczbaGodzin: liczbyGodzin.length === 1 ? liczbyGodzin[0] : null,
    },
    organizator: {
      id: null,
      nazwa: tekstLubNull(zrodlo.dane.organizator),
      marka: tekstLubNull(zrodlo.dane.organizator),
      logoId: null,
      logoNazwaPliku: tekstLubNull(logo.nazwaPliku),
      logoPodglad: tekstLubNull(logo.podglad),
    },
    klient: {
      id: null,
      nazwa: tekstLubNull(zrodlo.dane.nazwaKlienta) ?? tekstLubNull(nabywca.nazwa),
      nip: tekstLubNull(nabywca.nip),
      adres: zbudujAdres([
        [tekstLubNull(nabywca.ulica), tekstLubNull(nabywca.nrBudynku), tekstLubNull(nabywca.nrLokalu)].filter(Boolean).join(' '),
        [tekstLubNull(nabywca.kodPocztowy), tekstLubNull(nabywca.miasto)].filter(Boolean).join(' '),
        nabywca.kraj,
      ]),
      osobaKontaktowa: tekstLubNull(nabywca.osobaKontaktowa),
    },
    trenerzy,
    grupy,
    uwagi: tekstLubNull(zrodlo.dane.uwagi.wewnetrzne),
  }
  const odciskDanych = obliczOdciskDanychKontekstu(bazaKontekstu)

  return klonujMigawke({ ...bazaKontekstu, zrodlo: { ...bazaKontekstu.zrodlo, odciskDanych } })
}

export function przygotujZrodloZWersjiRoboczej(wersja: WersjaRoboczaGeneratora): DaneSzczegolowDoKontekstu {
  return {
    szczegolyOrganizacyjneId: wersja.zrodloOpublikowanegoId ?? wersja.id,
    wersjaSzczegolowId: wersja.id,
    zmodyfikowano: wersja.dataZapisu,
    dane: wersja.dane,
    grupy: wersja.grupy,
  }
}

export function przygotujZrodloZOpublikowanychSzczegolow(rekord: OpublikowaneSzczegolyOrganizacyjne): DaneSzczegolowDoKontekstu {
  return {
    szczegolyOrganizacyjneId: rekord.id,
    wersjaSzczegolowId: rekord.zrodloKopiiRoboczejId || null,
    zmodyfikowano: rekord.dataPublikacji,
    dane: rekord.dane,
    grupy: rekord.grupy,
  }
}
