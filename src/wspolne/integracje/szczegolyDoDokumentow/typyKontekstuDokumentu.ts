import type { TypDokumentu } from '../../dokumenty/modelDokumentu'
import type { DaneFormularza, GrupaSzkoleniowa } from '../../../moduly/zamkniete/szczegoly_organizacyjne/typy'

export type StrategiaGenerowaniaDokumentu = 'JEDEN_NA_GRUPE' | 'JEDEN_NA_UCZESTNIKA' | 'JEDEN_ZBIORCZY'

export type LokalizacjaKontekstuSzkolenia = {
  data: string | null
  lokalizacjaId: string | null
  nazwa: string | null
  adres: string | null
  sala: string | null
  trybOnline: boolean
}

export type UczestnikKontekstuSzkolenia = {
  id: string | null
  imie: string
  nazwisko: string
  nazwaPelna: string
  email: string | null
  stanowisko: string | null
}

export type TrenerKontekstuSzkolenia = {
  id: string | null
  imieINazwisko: string
}

export type KontekstGrupySzkoleniowej = {
  id: string
  nazwa: string
  daty: string[]
  tryb: string | null
  liczbaGodzin: number | null
  lokalizacje: LokalizacjaKontekstuSzkolenia[]
  trenerzy: TrenerKontekstuSzkolenia[]
  uczestnicy: UczestnikKontekstuSzkolenia[]
  liczbaUczestnikow: number
  wysylkaMaterialow: {
    wymagana: boolean | null
    odbiorca: string | null
    adres: string | null
    uwagi: string | null
  }
}

export type KontekstDokumentuSzkolenia = {
  zrodlo: {
    szczegolyOrganizacyjneId: string
    wersjaSzczegolowId: string | null
    zmodyfikowano: string
    odciskDanych: string
  }
  szkolenie: {
    id: string | null
    tytul: string
    typ: string | null
    tryb: string | null
    liczbaGodzin: number | null
  }
  organizator: {
    id: string | null
    nazwa: string | null
    marka: string | null
    logoId: string | null
    logoNazwaPliku: string | null
    logoPodglad: string | null
  }
  klient: {
    id: string | null
    nazwa: string | null
    nip: string | null
    adres: string | null
    osobaKontaktowa: string | null
  }
  trenerzy: TrenerKontekstuSzkolenia[]
  grupy: KontekstGrupySzkoleniowej[]
  uwagi: string | null
}

export type DaneSzczegolowDoKontekstu = {
  szczegolyOrganizacyjneId: string
  wersjaSzczegolowId: string | null
  zmodyfikowano: string
  dane: DaneFormularza
  grupy: GrupaSzkoleniowa[]
}

export type PowiazanieZeSzczegolami = {
  szczegolyOrganizacyjneId: string
  wersjaSzczegolowId: string | null
  zmodyfikowano: string
  odciskDanych: string
  migawkaKontekstu: KontekstDokumentuSzkolenia
}

export type DaneDokumentuZIntegracji<TDaneZrodlowe, TKorekty> = {
  daneZrodlowe: TDaneZrodlowe
  korektyReczne: TKorekty
  powiazanieZeZrodlem: PowiazanieZeSzczegolami
}

export type ProblemWalidacjiKontekstu = {
  kod: string
  komunikat: string
  sciezka: string | null
  grupaId: string | null
  poziom: 'blad' | 'ostrzezenie'
}

export type WynikWalidacjiKontekstu = {
  poprawny: boolean
  bledy: ProblemWalidacjiKontekstu[]
  ostrzezenia: ProblemWalidacjiKontekstu[]
}

export type DaneZrodlowePozycjiGenerowania = {
  zrodlo: PowiazanieZeSzczegolami
  szkolenie: KontekstDokumentuSzkolenia['szkolenie']
  organizator: KontekstDokumentuSzkolenia['organizator']
  klient: KontekstDokumentuSzkolenia['klient']
  trenerzy: TrenerKontekstuSzkolenia[]
  grupy: KontekstGrupySzkoleniowej[]
  uwagi: string | null
}

export type PozycjaPlanuGenerowania = {
  strategia: StrategiaGenerowaniaDokumentu
  typDokumentu: TypDokumentu
  grupaId: string | null
  uczestnikId: string | null
  proponowanyTytul: string
  daneZrodlowe: DaneZrodlowePozycjiGenerowania
}

export type PlanGenerowania = {
  pozycje: PozycjaPlanuGenerowania[]
  bledy: ProblemWalidacjiKontekstu[]
}

export function klonujMigawke<TDane>(dane: TDane): TDane {
  return JSON.parse(JSON.stringify(dane)) as TDane
}

export function utworzPowiazanieZeSzczegolami(kontekst: KontekstDokumentuSzkolenia): PowiazanieZeSzczegolami {
  return {
    szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId,
    wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId,
    zmodyfikowano: kontekst.zrodlo.zmodyfikowano,
    odciskDanych: kontekst.zrodlo.odciskDanych,
    migawkaKontekstu: klonujMigawke(kontekst),
  }
}

export function utworzDaneDokumentuZIntegracji<TDaneZrodlowe, TKorekty>(
  daneZrodlowe: TDaneZrodlowe,
  korektyReczne: TKorekty,
  powiazanieZeZrodlem: PowiazanieZeSzczegolami,
): DaneDokumentuZIntegracji<TDaneZrodlowe, TKorekty> {
  return {
    daneZrodlowe: klonujMigawke(daneZrodlowe),
    korektyReczne: klonujMigawke(korektyReczne),
    powiazanieZeZrodlem: klonujMigawke(powiazanieZeZrodlem),
  }
}

export function zaktualizujDaneZrodloweIntegracji<TDaneZrodlowe, TKorekty>(
  dane: DaneDokumentuZIntegracji<TDaneZrodlowe, TKorekty>,
  daneZrodlowe: TDaneZrodlowe,
): DaneDokumentuZIntegracji<TDaneZrodlowe, TKorekty> {
  return utworzDaneDokumentuZIntegracji(daneZrodlowe, dane.korektyReczne, dane.powiazanieZeZrodlem)
}
