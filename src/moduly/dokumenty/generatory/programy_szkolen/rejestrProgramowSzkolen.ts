import type { KopiaRobocza } from '../../../../wspolne/dokumenty/magazynKopiiRoboczych'
import { filtrujDokumenty } from '../../../../wspolne/dokumenty/filtryDokumentow'
import { utworzNowyDokument, type Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'

type MetadaneProgramu = {
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

type DaneZapisuProgramu<TypDanych> = {
  idAktywnejKopii?: string | null
  tryb: 'zapisz' | 'aktualizuj' | 'utworz_nowa'
  tytul: string
  statusBiznesowy: string
  daneDokumentu: TypDanych
  metadane: MetadaneProgramu
}

type UstawieniaRejestruProgramu = {
  ustawienia: unknown
  statusBiznesowy: string
  metadane: MetadaneProgramu
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function rozdzielProgram<TypDanych>(dane: TypDanych) {
  if (!czyObiekt(dane)) {
    return { daneDokumentu: dane, ustawienia: {} }
  }

  const { ustawienia, ...daneDokumentu } = dane
  return { daneDokumentu: daneDokumentu as TypDanych, ustawienia: ustawienia ?? {} }
}

function polaczProgram<TypDanych>(dokument: Dokument<unknown, unknown>): TypDanych {
  const ustawienia = czyObiekt(dokument.ustawieniaDokumentu) ? dokument.ustawieniaDokumentu.ustawienia : {}
  return { ...(czyObiekt(dokument.daneDokumentu) ? dokument.daneDokumentu : {}), ustawienia } as TypDanych
}

function jakoKopieRobocza<TypDanych>(dokument: Dokument<unknown, unknown>): KopiaRobocza<TypDanych> {
  const ustawienia = czyObiekt(dokument.ustawieniaDokumentu) ? dokument.ustawieniaDokumentu : {}
  return {
    id: dokument.id,
    typGeneratora: 'programy_szkolen',
    tytul: dokument.tytul,
    status: typeof ustawienia.statusBiznesowy === 'string' ? ustawienia.statusBiznesowy : 'robocza',
    utworzono: dokument.utworzono,
    zaktualizowano: dokument.zmodyfikowano,
    daneDokumentu: polaczProgram<TypDanych>(dokument),
    wersjaFormatu: `schemat-${dokument.wersjaSchematu}`,
  }
}

export function pobierzProgramPoId<TypDanych>(id: string): KopiaRobocza<TypDanych> | null {
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(id)
  return dokument?.typ === 'PROGRAM_SZKOLENIA' ? jakoKopieRobocza<TypDanych>(dokument) : null
}

export function pobierzKopieProgramowZRejestru<TypDanych>() {
  return filtrujDokumenty(repozytoriumWspolnychDokumentow.pobierzWszystkie(), { typ: 'PROGRAM_SZKOLENIA', status: 'ROBOCZY', czyZarchiwizowany: false, czyUsunietyMiekko: false }).map((dokument) => jakoKopieRobocza<TypDanych>(dokument))
}

export function zapiszProgramWRejestrze<TypDanych>(dane: DaneZapisuProgramu<TypDanych>) {
  const poprzedni = dane.idAktywnejKopii ? repozytoriumWspolnychDokumentow.pobierzPoId(dane.idAktywnejKopii) : null
  const { daneDokumentu, ustawienia } = rozdzielProgram(dane.daneDokumentu)
  const ustawieniaDokumentu: UstawieniaRejestruProgramu = { ustawienia, statusBiznesowy: dane.statusBiznesowy, metadane: dane.metadane }

  if (dane.tryb === 'aktualizuj') {
    if (!poprzedni || poprzedni.typ !== 'PROGRAM_SZKOLENIA') {
      throw new Error('Nie znaleziono programu do aktualizacji.')
    }

    return repozytoriumWspolnychDokumentow.aktualizuj(poprzedni.id, { tytul: dane.tytul, daneDokumentu, ustawieniaDokumentu })!
  }

  const dokument = utworzNowyDokument({
    typ: 'PROGRAM_SZKOLENIA',
    tytul: dane.tytul,
    generatorId: 'programy_szkolen',
    daneDokumentu,
    ustawieniaDokumentu,
    szkolenieId: dane.metadane.szkolenieId ?? null,
    klientId: dane.metadane.klient ?? null,
    organizatorId: dane.metadane.organizator,
    poprzedniaWersjaId: dane.tryb === 'utworz_nowa' ? poprzedni?.id ?? null : null,
    dokumentNadrzednyId: dane.tryb === 'utworz_nowa' ? poprzedni?.dokumentNadrzednyId ?? poprzedni?.id ?? null : null,
  })

  repozytoriumWspolnychDokumentow.utworz(dokument)
  return dokument
}

export function usunProgramMiekko(id: string) {
  return repozytoriumWspolnychDokumentow.usunMiekko(id)
}
