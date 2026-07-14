import type { KopiaRobocza } from '../../../../wspolne/dokumenty/magazynKopiiRoboczych'
import { pobierzKopieProgramowZRejestru, pobierzProgramPoId, usunProgramMiekko, zapiszProgramWRejestrze } from './rejestrProgramowSzkolen'
import { repozytoriumDokumentow } from '../../../../wspolne/dokumenty/repozytoriumDokumentow'

const kluczProgramuRoboczego = 'ultimate-pomagier-program-szkolenia-roboczy'
const kluczAutosaveProgramu = 'ultimatePomagier.programySzkolen.autosave.v1'
const kluczAktywnejKopiiProgramu = 'ultimatePomagier.programySzkolen.aktywnaKopiaRobocza'
const kluczMigracjiKopiiProgramu = 'ultimatePomagier.programySzkolen.kopieRobocze.wspolnyMagazyn.v1'

type DaneProgramu = Record<string, unknown>

export type AutosaveProgramu<TypDanych = DaneProgramu> = {
  idSesji: string
  aktywnaKopiaId?: string
  daneDokumentu: TypDanych
  zapisano: string
}

export type MetadaneProgramu = {
  organizator: 'SEMPER' | 'IIST'
  liczbaDni: number
  liczbaModulow: number
  autor?: string
  klient?: string
  szkolenieId?: string
  dataSzkolenia?: string
  zrodloProgramu?: string
  czyWynikParsowaniaZatwierdzony: boolean
}

export type TypOperacjiHistoriiProgramu = 'utworzenie_kopii' | 'aktualizacja_kopii' | 'utworzenie_nowej_kopii' | 'publikacja'

export type WpisHistoriiProgramu<TypDanych = DaneProgramu> = {
  typOperacji: TypOperacjiHistoriiProgramu
  idWersji: string
  uzytkownik?: string
  migawkaDokumentu: TypDanych
}

type DaneZapisuJawnejKopii<TypDanych> = {
  idAktywnejKopii?: string | null
  tryb: 'zapisz' | 'aktualizuj' | 'utworz_nowa'
  tytul: string
  statusBiznesowy: string
  daneDokumentu: TypDanych
  metadane: MetadaneProgramu
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

function pobierzStarszyAutosaveProgramu<TypDanych>() {
  const dane = bezpiecznieParsuj(localStorage.getItem(kluczProgramuRoboczego))

  if (!czyObiekt(dane) || !Object.keys(dane).length) {
    return null
  }

  return {
    idSesji: utworzIdSesji(),
    daneDokumentu: dane as TypDanych,
    zapisano: new Date().toISOString(),
  }
}

export function pobierzAutosaveProgramu<TypDanych = DaneProgramu>(): AutosaveProgramu<TypDanych> | null {
  const zapis = bezpiecznieParsuj(localStorage.getItem(kluczAutosaveProgramu))

  if (czyObiekt(zapis) && typeof zapis.idSesji === 'string' && 'daneDokumentu' in zapis && typeof zapis.zapisano === 'string') {
    return {
      idSesji: zapis.idSesji,
      aktywnaKopiaId: typeof zapis.aktywnaKopiaId === 'string' ? zapis.aktywnaKopiaId : undefined,
      daneDokumentu: zapis.daneDokumentu as TypDanych,
      zapisano: zapis.zapisano,
    }
  }

  return pobierzStarszyAutosaveProgramu<TypDanych>()
}

export function zapiszAutosaveProgramu<TypDanych>(autosave: Omit<AutosaveProgramu<TypDanych>, 'zapisano'> & { zapisano?: string }) {
  const zapis: AutosaveProgramu<TypDanych> = {
    ...autosave,
    zapisano: autosave.zapisano ?? new Date().toISOString(),
  }

  localStorage.setItem(kluczAutosaveProgramu, JSON.stringify(zapis))
  return zapis
}

export function usunAutosaveProgramu() {
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
  localStorage.setItem(kluczMigracjiKopiiProgramu, 'true')
}

export function wyczyscAktywnaKopieProgramu() {
  localStorage.removeItem(kluczAktywnejKopiiProgramu)
}

export function pobierzKopieRoboczeProgramu() {
  return pobierzKopieProgramowZRejestru()
}

export function pobierzAktywnaKopieProgramu<TypDanych = DaneProgramu>(): KopiaRobocza<TypDanych> | null {
  const id = pobierzIdAktywnejKopiiProgramu()

  if (!id) {
    return null
  }

  return pobierzProgramPoId<TypDanych>(id)
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

export function zapiszJawnaKopieProgramu<TypDanych>(dane: DaneZapisuJawnejKopii<TypDanych>) {
  const rekord = zapiszProgramWRejestrze(dane)
  const typOperacji: TypOperacjiHistoriiProgramu = dane.tryb === 'aktualizuj' ? 'aktualizacja_kopii' : dane.tryb === 'utworz_nowa' ? 'utworzenie_nowej_kopii' : 'utworzenie_kopii'

  ustawAktywnaKopieProgramu(rekord.id)
  repozytoriumDokumentow.dodajWersjeHistorii({
    typGeneratora: 'programy_szkolen',
    dokumentId: rekord.id,
    dane: {
      typOperacji,
      idWersji: rekord.id,
      migawkaDokumentu: dane.daneDokumentu,
    } satisfies WpisHistoriiProgramu<TypDanych>,
  })
  usunAutosaveProgramu()

  return rekord
}
export function pobierzHistorieProgramu<TypDanych = DaneProgramu>(idDokumentu?: string) {
  return repozytoriumDokumentow
    .pobierzHistorie('programy_szkolen', idDokumentu)
    .map((wpis) => wpis.dane as WpisHistoriiProgramu<TypDanych>)
}

export { kluczAutosaveProgramu }
