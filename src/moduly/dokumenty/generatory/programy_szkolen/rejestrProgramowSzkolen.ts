import type { KopiaRobocza } from '../../../../wspolne/dokumenty/magazynKopiiRoboczych'
import { filtrujDokumenty } from '../../../../wspolne/dokumenty/filtryDokumentow'
import { utworzNowyDokument, type Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import {
  normalizujProgramSzkolenia,
  type MetadaneProgramuSzkolenia,
  type ModelProgramuSzkolenia,
} from './modelProgramuSzkolenia'

type DaneZapisuProgramu = {
  idAktywnejKopii?: string | null
  tryb: 'zapisz' | 'aktualizuj' | 'utworz_nowa'
  tytul: string
  statusBiznesowy: string
  daneDokumentu: ModelProgramuSzkolenia
  metadane: MetadaneProgramuSzkolenia
  uzytkownikId?: string
}

type UstawieniaRejestruProgramu = {
  ustawienia: ModelProgramuSzkolenia['ustawienia']
  statusBiznesowy: string
  metadane: MetadaneProgramuSzkolenia
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function rozdzielProgram(dane: ModelProgramuSzkolenia) {
  const znormalizowany = normalizujProgramSzkolenia(dane)
  const { ustawienia, ...daneDokumentu } = znormalizowany
  return { daneDokumentu, ustawienia }
}

function polaczProgram(dokument: Dokument<unknown, unknown>): ModelProgramuSzkolenia {
  const ustawieniaRejestru = czyObiekt(dokument.ustawieniaDokumentu) && czyObiekt(dokument.ustawieniaDokumentu.ustawienia)
    ? dokument.ustawieniaDokumentu.ustawienia
    : undefined
  const daneDokumentu = czyObiekt(dokument.daneDokumentu) ? dokument.daneDokumentu : {}
  return normalizujProgramSzkolenia({ ...daneDokumentu, ustawienia: ustawieniaRejestru ?? daneDokumentu.ustawienia })
}

function jakoKopieRobocza(dokument: Dokument<unknown, unknown>): KopiaRobocza<ModelProgramuSzkolenia> {
  const ustawienia = czyObiekt(dokument.ustawieniaDokumentu) ? dokument.ustawieniaDokumentu : {}
  return {
    id: dokument.id,
    typGeneratora: 'programy_szkolen',
    tytul: dokument.tytul,
    status: typeof ustawienia.statusBiznesowy === 'string' ? ustawienia.statusBiznesowy : 'robocza',
    utworzono: dokument.utworzono,
    zaktualizowano: dokument.zmodyfikowano,
    daneDokumentu: polaczProgram(dokument),
    wersjaFormatu: `schemat-${dokument.wersjaSchematu}`,
  }
}

export function pobierzProgramPoId(id: string): KopiaRobocza<ModelProgramuSzkolenia> | null {
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(id)
  return dokument?.typ === 'PROGRAM_SZKOLENIA' ? jakoKopieRobocza(dokument) : null
}

export function pobierzKopieProgramowZRejestru() {
  return filtrujDokumenty(repozytoriumWspolnychDokumentow.pobierzWszystkie(), { typ: 'PROGRAM_SZKOLENIA', status: 'ROBOCZY', czyZarchiwizowany: false, czyUsunietyMiekko: false }).map(jakoKopieRobocza)
}

export function zapiszProgramWRejestrze(dane: DaneZapisuProgramu) {
  const poprzedni = dane.idAktywnejKopii ? repozytoriumWspolnychDokumentow.pobierzPoId(dane.idAktywnejKopii) : null
  const { daneDokumentu, ustawienia } = rozdzielProgram(dane.daneDokumentu)
  const tytul = dane.tytul.trim() || 'Program szkolenia'
  const ustawieniaDokumentu: UstawieniaRejestruProgramu = { ustawienia, statusBiznesowy: dane.statusBiznesowy, metadane: dane.metadane }

  if (dane.tryb === 'aktualizuj') {
    if (!poprzedni || poprzedni.typ !== 'PROGRAM_SZKOLENIA') {
      throw new Error('Nie znaleziono programu do aktualizacji.')
    }

    return repozytoriumWspolnychDokumentow.aktualizuj(poprzedni.id, {
      tytul,
      daneDokumentu,
      ustawieniaDokumentu,
      ostatnioModyfikujacyId: dane.uzytkownikId ?? poprzedni.ostatnioModyfikujacyId,
    })!
  }

  const dokument = utworzNowyDokument({
    typ: 'PROGRAM_SZKOLENIA',
    tytul,
    generatorId: 'programy_szkolen',
    daneDokumentu,
    ustawieniaDokumentu,
    szkolenieId: dane.metadane.szkolenieId ?? null,
    klientId: dane.metadane.klient ?? null,
    organizatorId: dane.metadane.organizator,
    autorId: dane.uzytkownikId ?? null,
    wlascicielId: dane.uzytkownikId ?? null,
    ostatnioModyfikujacyId: dane.uzytkownikId ?? null,
    poprzedniaWersjaId: dane.tryb === 'utworz_nowa' ? poprzedni?.id ?? null : null,
    dokumentNadrzednyId: dane.tryb === 'utworz_nowa' ? poprzedni?.dokumentNadrzednyId ?? poprzedni?.id ?? null : null,
  })

  repozytoriumWspolnychDokumentow.utworz(dokument)
  return dokument
}

export function usunProgramMiekko(id: string) {
  return repozytoriumWspolnychDokumentow.usunMiekko(id)
}
