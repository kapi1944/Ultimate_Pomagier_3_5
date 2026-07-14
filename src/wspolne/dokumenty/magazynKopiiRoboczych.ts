import {
  repozytoriumDokumentow,
  type RekordDokumentu,
  type TypGeneratoraDokumentu,
} from './repozytoriumDokumentow'

export type TypGeneratoraKopiiRoboczej = TypGeneratoraDokumentu

export type KopiaRobocza<TypDanych = unknown> = {
  id: string
  typGeneratora: TypGeneratoraKopiiRoboczej
  tytul: string
  status: string
  utworzono: string
  zaktualizowano: string
  daneDokumentu: TypDanych
  wersjaFormatu?: string
}

type DaneKopiiRoboczej<TypDanych> = {
  id?: string
  typGeneratora: TypGeneratoraKopiiRoboczej
  tytul: string
  status: string
  daneDokumentu: TypDanych
  wersjaFormatu?: string
}

const kluczWspolnychKopiiRoboczych = 'ultimatePomagier.kopieRobocze'

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function pobierzStarszeKopie() {
  try {
    const zapis = JSON.parse(localStorage.getItem(kluczWspolnychKopiiRoboczych) ?? '[]') as unknown
    return Array.isArray(zapis) ? zapis : []
  } catch {
    return []
  }
}

function jakoKopieRobocza<TypDanych>(dokument: RekordDokumentu): KopiaRobocza<TypDanych> {
  return {
    id: dokument.id,
    typGeneratora: dokument.typGeneratora,
    tytul: dokument.tytul,
    status: dokument.statusBiznesowy ?? 'robocza',
    utworzono: dokument.utworzono,
    zaktualizowano: dokument.zaktualizowano,
    daneDokumentu: dokument.daneDokumentu as TypDanych,
    wersjaFormatu: dokument.wersjaFormatu,
  }
}

function zmigrujStarszeKopie() {
  pobierzStarszeKopie().forEach((wartosc) => {
    if (!czyObiekt(wartosc) || typeof wartosc.id !== 'string' || (wartosc.typGeneratora !== 'programy_szkolen' && wartosc.typGeneratora !== 'szczegoly_organizacyjne')) {
      return
    }

    if (repozytoriumDokumentow.pobierzPoId(wartosc.typGeneratora, wartosc.id)) {
      return
    }

    repozytoriumDokumentow.zapiszNowy({
      id: wartosc.id,
      typGeneratora: wartosc.typGeneratora,
      tytul: typeof wartosc.tytul === 'string' ? wartosc.tytul : typeof wartosc.nazwa === 'string' ? wartosc.nazwa : 'Bez tytułu',
      stanCyklu: 'kopia_robocza',
      statusBiznesowy: typeof wartosc.status === 'string' ? wartosc.status : 'robocza',
      utworzono: typeof wartosc.utworzono === 'string' ? wartosc.utworzono : undefined,
      zaktualizowano: typeof wartosc.zaktualizowano === 'string' ? wartosc.zaktualizowano : undefined,
      widocznosc: 'prywatny',
      zrodlo: 'migracja',
      wersjaFormatu: typeof wartosc.wersjaFormatu === 'string' ? wartosc.wersjaFormatu : typeof wartosc.wersja === 'string' ? wartosc.wersja : undefined,
      daneDokumentu: 'daneDokumentu' in wartosc ? wartosc.daneDokumentu : wartosc.dane ?? {},
      metadaneGeneratora: {},
      daneMigracji: { kluczZrodlowy: kluczWspolnychKopiiRoboczych, idZrodlowy: wartosc.id, zmigrowano: new Date().toISOString() },
    })
  })
}

export function pobierzWszystkieKopieRobocze() {
  zmigrujStarszeKopie()
  return repozytoriumDokumentow.pobierz({ stanCyklu: 'kopia_robocza' }).map((dokument) => jakoKopieRobocza(dokument))
}

export function pobierzKopieRoboczeGeneratora<TypDanych>(typGeneratora: TypGeneratoraKopiiRoboczej) {
  return pobierzWszystkieKopieRobocze()
    .filter((kopia) => kopia.typGeneratora === typGeneratora)
    .sort((pierwsza, druga) => new Date(druga.zaktualizowano).getTime() - new Date(pierwsza.zaktualizowano).getTime()) as KopiaRobocza<TypDanych>[]
}

export function zapiszKopieRobocza<TypDanych>(dane: DaneKopiiRoboczej<TypDanych>) {
  const poprzednia = dane.id ? repozytoriumDokumentow.pobierzPoId(dane.typGeneratora, dane.id) : null
  const zmiany = {
    tytul: dane.tytul,
    statusBiznesowy: dane.status,
    daneDokumentu: dane.daneDokumentu,
    wersjaFormatu: dane.wersjaFormatu,
    metadaneGeneratora: {},
  }
  const dokument = poprzednia
    ? repozytoriumDokumentow.aktualizuj(dane.typGeneratora, poprzednia.id, zmiany)
    : repozytoriumDokumentow.zapiszNowy({
        id: dane.id,
        typGeneratora: dane.typGeneratora,
        ...zmiany,
        stanCyklu: 'kopia_robocza',
        widocznosc: 'prywatny',
        zrodlo: 'nowy',
      })

  return jakoKopieRobocza<TypDanych>(dokument!)
}

export function usunKopieRobocza(typGeneratora: TypGeneratoraKopiiRoboczej, id: string) {
  repozytoriumDokumentow.przeniesDoKosza(typGeneratora, id)
}
