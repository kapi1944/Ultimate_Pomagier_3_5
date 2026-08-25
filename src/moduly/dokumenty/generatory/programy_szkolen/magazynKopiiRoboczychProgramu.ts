import type { KopiaRobocza } from '../../../../wspolne/dokumenty/magazynKopiiRoboczych'
import { pobierzKopieProgramowZRejestru, pobierzProgramPoId, usunProgramMiekko, zapiszProgramWRejestrze } from './rejestrProgramowSzkolen'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import {
  normalizujProgramSzkolenia,
  type MetadaneProgramuSzkolenia,
  type ModelProgramuSzkolenia,
} from './modelProgramuSzkolenia'

const kluczProgramuRoboczego = 'ultimate-pomagier-program-szkolenia-roboczy'
const kluczAutosaveProgramu = 'ultimatePomagier.programySzkolen.autosave.v1'
const kluczAktywnejKopiiProgramu = 'ultimatePomagier.programySzkolen.aktywnaKopiaRobocza'
const prefiksIdAutosaveProgramu = 'autosave-programy-szkolen'

export type AutosaveProgramu = {
  idSesji: string
  aktywnaKopiaId?: string
  uzytkownikId?: string
  daneDokumentu: ModelProgramuSzkolenia
  zapisano: string
}

export type TypOperacjiHistoriiProgramu = 'utworzenie_kopii' | 'aktualizacja_kopii' | 'utworzenie_nowej_kopii' | 'publikacja'

export type WpisHistoriiProgramu = {
  typOperacji: TypOperacjiHistoriiProgramu
  idWersji: string
  uzytkownik?: string
  migawkaDokumentu: ModelProgramuSzkolenia
}

type DaneZapisuJawnejKopii = {
  idAktywnejKopii?: string | null
  tryb: 'zapisz' | 'aktualizuj' | 'utworz_nowa'
  tytul: string
  statusBiznesowy: string
  daneDokumentu: ModelProgramuSzkolenia
  metadane: MetadaneProgramuSzkolenia
  uzytkownikId?: string
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function bezpiecznieParsuj(wartosc: string | null): unknown {
  if (!wartosc) {
    return null
  }

  try {
    return JSON.parse(wartosc) as unknown
  } catch {
    return null
  }
}

function utworzIdSesji() {
  return `program-autosave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pobierzStarszyAutosaveProgramu(): AutosaveProgramu | null {
  const dane = bezpiecznieParsuj(localStorage.getItem(kluczProgramuRoboczego))

  if (!czyObiekt(dane) || !Object.keys(dane).length) {
    return null
  }

  return {
    idSesji: utworzIdSesji(),
    daneDokumentu: normalizujProgramSzkolenia(dane),
    zapisano: new Date().toISOString(),
  }
}

function pobierzIdAutosaveProgramu(uzytkownikId?: string) {
  return `${prefiksIdAutosaveProgramu}-${uzytkownikId ?? 'bez-wlasciciela'}`
}

function jakoAutosaveProgramu(zapis: unknown, zapisano: string, dokumentId?: string | null): AutosaveProgramu | null {
  if (!czyObiekt(zapis)) {
    return null
  }

  if (typeof zapis.idSesji === 'string' && 'daneDokumentu' in zapis) {
    return {
      idSesji: zapis.idSesji,
      aktywnaKopiaId: typeof zapis.aktywnaKopiaId === 'string' ? zapis.aktywnaKopiaId : dokumentId ?? undefined,
      uzytkownikId: typeof zapis.uzytkownikId === 'string' ? zapis.uzytkownikId : undefined,
      daneDokumentu: normalizujProgramSzkolenia(zapis.daneDokumentu),
      zapisano: typeof zapis.zapisano === 'string' ? zapis.zapisano : zapisano,
    }
  }

  return {
    idSesji: utworzIdSesji(),
    aktywnaKopiaId: dokumentId ?? undefined,
    daneDokumentu: normalizujProgramSzkolenia(zapis),
    zapisano,
  }
}

export function pobierzAutosaveProgramu(uzytkownikId?: string): AutosaveProgramu | null {
  const wspolny = repozytoriumWspolnychDokumentow.pobierzAutosave(pobierzIdAutosaveProgramu(uzytkownikId))
    ?? repozytoriumWspolnychDokumentow.pobierzNajnowszyAutosaveGeneratora('programy_szkolen')
  const zapisWspolny = wspolny ? jakoAutosaveProgramu(wspolny.dane, wspolny.zapisano, wspolny.dokumentId) : null

  if (zapisWspolny) {
    return uzytkownikId && zapisWspolny.uzytkownikId && zapisWspolny.uzytkownikId !== uzytkownikId ? null : zapisWspolny
  }

  const zapisLegacy = bezpiecznieParsuj(localStorage.getItem(kluczAutosaveProgramu))
  const autosaveLegacy = jakoAutosaveProgramu(zapisLegacy, new Date().toISOString())
  return autosaveLegacy ?? pobierzStarszyAutosaveProgramu()
}

export function zapiszAutosaveProgramu(autosave: Omit<AutosaveProgramu, 'zapisano'> & { zapisano?: string }) {
  const zapis: AutosaveProgramu = {
    ...autosave,
    daneDokumentu: normalizujProgramSzkolenia(autosave.daneDokumentu),
    zapisano: autosave.zapisano ?? new Date().toISOString(),
  }

  repozytoriumWspolnychDokumentow.zapiszAutosave({
    id: pobierzIdAutosaveProgramu(zapis.uzytkownikId),
    generatorId: 'programy_szkolen',
    dokumentId: zapis.aktywnaKopiaId ?? null,
    dane: zapis,
    zapisano: zapis.zapisano,
  })
  return zapis
}

export function usunAutosaveProgramu(uzytkownikId?: string) {
  if (uzytkownikId) {
    repozytoriumWspolnychDokumentow.usunAutosave(pobierzIdAutosaveProgramu(uzytkownikId))
  } else {
    repozytoriumWspolnychDokumentow.usunAutosaveGeneratora('programy_szkolen')
  }
  localStorage.removeItem(kluczAutosaveProgramu)
  localStorage.removeItem(kluczProgramuRoboczego)
}

export function pobierzIdAktywnejKopiiProgramu() {
  try {
    return localStorage.getItem(kluczAktywnejKopiiProgramu)
  } catch {
    return null
  }
}

export function ustawAktywnaKopieProgramu(id: string) {
  localStorage.setItem(kluczAktywnejKopiiProgramu, id)
}

export function wyczyscAktywnaKopieProgramu() {
  localStorage.removeItem(kluczAktywnejKopiiProgramu)
}

export function pobierzKopieRoboczeProgramu() {
  return pobierzKopieProgramowZRejestru()
}

export function pobierzAktywnaKopieProgramu(): KopiaRobocza<ModelProgramuSzkolenia> | null {
  const id = pobierzIdAktywnejKopiiProgramu()

  if (!id) {
    return null
  }

  return pobierzProgramPoId(id)
}

export function otworzKopieRoboczaProgramu(kopia: KopiaRobocza) {
  ustawAktywnaKopieProgramu(kopia.id)
}

export function usunKopieRoboczaProgramu(kopia: KopiaRobocza) {
  usunProgramMiekko(kopia.id)

  if (pobierzIdAktywnejKopiiProgramu() === kopia.id) {
    wyczyscAktywnaKopieProgramu()
  }
}

export function zapiszJawnaKopieProgramu(dane: DaneZapisuJawnejKopii) {
  const znormalizowaneDane = normalizujProgramSzkolenia(dane.daneDokumentu)
  const rekord = zapiszProgramWRejestrze({ ...dane, daneDokumentu: znormalizowaneDane })
  const typOperacji: TypOperacjiHistoriiProgramu = dane.tryb === 'aktualizuj' ? 'aktualizacja_kopii' : dane.tryb === 'utworz_nowa' ? 'utworzenie_nowej_kopii' : 'utworzenie_kopii'

  ustawAktywnaKopieProgramu(rekord.id)
  repozytoriumWspolnychDokumentow.dodajWpisHistorii({
    dokumentLogicznyId: rekord.dokumentLogicznyId,
    typ: 'historia_programu',
    dokumentId: rekord.id,
    automatyczne: false,
    dane: {
      generatorId: 'programy_szkolen',
      typOperacji,
      idWersji: rekord.id,
      migawkaDokumentu: znormalizowaneDane,
    },
  })
  usunAutosaveProgramu(dane.uzytkownikId)

  return rekord
}
export function pobierzHistorieProgramu(idDokumentu?: string) {
  return repozytoriumWspolnychDokumentow
    .pobierzHistorie(idDokumentu)
    .filter((wpis) => wpis.typ === 'historia_programu' && Boolean(wpis.dane && typeof wpis.dane === 'object' && (wpis.dane as { generatorId?: unknown }).generatorId === 'programy_szkolen'))
    .map((wpis) => {
      const dane = wpis.dane as WpisHistoriiProgramu & { generatorId?: string }
      return dane.migawkaDokumentu ? { ...dane, migawkaDokumentu: normalizujProgramSzkolenia(dane.migawkaDokumentu) } : dane
    })
}

export { kluczAutosaveProgramu }
