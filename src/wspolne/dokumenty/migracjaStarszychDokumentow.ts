import { utworzNowyDokument, type Dokument, type StatusDokumentu, type TypDokumentu } from './modelDokumentu'
import { repozytoriumDokumentow, type RekordDokumentu } from './repozytoriumDokumentow'
import { repozytoriumWspolnychDokumentow } from './rejestrDokumentow'

const kluczeProstychSzkicow: Array<{ klucz: string; typ: TypDokumentu; generatorId: string; tytul: string }> = [
  { klucz: 'ultimate-pomagier.listy-obecnosci.szkic', typ: 'LISTA_OBECNOSCI', generatorId: 'listy_obecnosci', tytul: 'Lista obecnosci' },
  { klucz: 'ultimate-pomagier.ankiety.szkic', typ: 'ANKIETA', generatorId: 'ankiety', tytul: 'Ankieta' },
  { klucz: 'ultimate-pomagier.karta-na-drzwi.szkic', typ: 'KARTA_NA_DRZWI', generatorId: 'karta_na_drzwi', tytul: 'Karta na drzwi' },
]

const kluczDyplomow = 'ultimate-pomagier.dyplomy.generator-pawla'
const kluczKopiiSzczegolow = 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze'
const kluczAktualnejWersjiSzczegolow = 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja'
const kluczWspolnychKopiiRoboczych = 'ultimatePomagier.kopieRobocze'
const prefiksKopiiBezpieczenstwa = 'ultimatePomagier.migracjaDokumentow.kopia.'

export type RaportMigracjiStarszychDokumentow = {
  znalezione: number
  przeniesione: number
  pominiete: number
  bledne: number
}

type StarszaWersjaSzczegolow = {
  id: string
  dataZapisu?: string
  autorId?: string
  dane: Record<string, unknown>
  grupy?: unknown
  adresaci?: unknown
  statusyPol?: unknown
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function bezpiecznieParsuj(wartosc: string | null): unknown {
  if (!wartosc) return null

  try {
    return JSON.parse(wartosc) as unknown
  } catch {
    return null
  }
}

function zapiszKopieBezpieczenstwa(klucz: string, wartosc: string | null) {
  if (wartosc === null) return

  try {
    localStorage.setItem(`${prefiksKopiiBezpieczenstwa}${klucz}`, wartosc)
  } catch {
    return
  }
}

function pobierzStatus(stanCyklu: string | undefined): StatusDokumentu {
  if (stanCyklu === 'opublikowany') return 'OPUBLIKOWANY'
  if (stanCyklu === 'archiwalny') return 'ZARCHIWIZOWANY'
  return 'ROBOCZY'
}

function utworzIdMigracji(typ: TypDokumentu, id: string) {
  return `${typ.toLowerCase()}-migracja-${id}`
}

function zapiszDokumentMigracji(
  raport: RaportMigracjiStarszychDokumentow,
  dane: {
    id: string
    typ: TypDokumentu
    generatorId: string
    tytul: string
    daneDokumentu: unknown
    ustawieniaDokumentu: unknown
    utworzono?: string
    zmodyfikowano?: string
    status?: StatusDokumentu
    autorId?: string | null
    wlascicielId?: string | null
    organizatorId?: string | null
    klientId?: string | null
  },
) {
  const istniejacy = repozytoriumWspolnychDokumentow.pobierzPoId(dane.id)

  if (istniejacy) {
    raport.pominiete += 1
    return
  }

  const bazowy = utworzNowyDokument({
    id: dane.id,
    typ: dane.typ,
    tytul: dane.tytul,
    generatorId: dane.generatorId,
    daneDokumentu: dane.daneDokumentu,
    ustawieniaDokumentu: dane.ustawieniaDokumentu,
    autorId: dane.autorId,
    wlascicielId: dane.wlascicielId,
    organizatorId: dane.organizatorId,
    klientId: dane.klientId,
  })
  const status = dane.status ?? 'ROBOCZY'
  const utworzono = dane.utworzono && !Number.isNaN(Date.parse(dane.utworzono)) ? dane.utworzono : bazowy.utworzono
  const zmodyfikowano = dane.zmodyfikowano && !Number.isNaN(Date.parse(dane.zmodyfikowano)) ? dane.zmodyfikowano : utworzono
  const dokument: Dokument<unknown, unknown> = {
    ...bazowy,
    status,
    utworzono,
    zmodyfikowano,
    zaktualizowano: zmodyfikowano,
    opublikowano: status === 'OPUBLIKOWANY' ? zmodyfikowano : null,
    czyZarchiwizowany: status === 'ZARCHIWIZOWANY',
    zarchiwizowano: status === 'ZARCHIWIZOWANY' ? zmodyfikowano : null,
  }

  try {
    repozytoriumWspolnychDokumentow.utworz(dokument)
    raport.przeniesione += 1
  } catch {
    raport.bledne += 1
  }
}

function migrujStareRepozytorium(raport: RaportMigracjiStarszychDokumentow) {
  const mapowanie: Record<RekordDokumentu['typGeneratora'], TypDokumentu> = {
    programy_szkolen: 'PROGRAM_SZKOLENIA',
    szczegoly_organizacyjne: 'SZCZEGOLY_ORGANIZACYJNE',
    listy_obecnosci: 'LISTA_OBECNOSCI',
  }

  repozytoriumDokumentow.pobierz().forEach((rekord) => {
    raport.znalezione += 1
    const typ = mapowanie[rekord.typGeneratora]
    const id = repozytoriumWspolnychDokumentow.pobierzPoId(rekord.id) ? utworzIdMigracji(typ, rekord.id) : rekord.id
    zapiszDokumentMigracji(raport, {
      id,
      typ,
      generatorId: rekord.typGeneratora,
      tytul: rekord.tytul,
      daneDokumentu: { ...rekord.daneDokumentu as object, metadaneMigracji: { idZrodlowy: rekord.id, zrodlo: 'repozytoriumDokumentow' } },
      ustawieniaDokumentu: rekord.metadaneGeneratora,
      utworzono: rekord.utworzono,
      zmodyfikowano: rekord.zaktualizowano,
      status: pobierzStatus(rekord.stanCyklu),
      autorId: rekord.autorId ?? null,
      wlascicielId: rekord.opiekunId ?? null,
    })
  })
}

function migrujProsteSzkice(raport: RaportMigracjiStarszychDokumentow) {
  kluczeProstychSzkicow.forEach(({ klucz, typ, generatorId, tytul }) => {
    const zapis = localStorage.getItem(klucz)
    if (zapis === null) return

    zapiszKopieBezpieczenstwa(klucz, zapis)
    raport.znalezione += 1
    const tekst = zapis.trim()

    if (!tekst) {
      raport.pominiete += 1
      return
    }

    zapiszDokumentMigracji(raport, {
      id: `${generatorId}-stary-szkic`,
      typ,
      generatorId,
      tytul,
      daneDokumentu: { tekst, metadaneMigracji: { kluczZrodlowy: klucz } },
      ustawieniaDokumentu: {},
    })
  })
}

function migrujDyplomy(raport: RaportMigracjiStarszychDokumentow) {
  const zapis = localStorage.getItem(kluczDyplomow)
  if (zapis === null) return

  zapiszKopieBezpieczenstwa(kluczDyplomow, zapis)
  raport.znalezione += 1
  const dane = bezpiecznieParsuj(zapis)

  if (!czyObiekt(dane) || (dane.trybTytulu !== 'certyfikat' && dane.trybTytulu !== 'zaswiadczenie' && dane.trybTytulu !== 'dyplom')) {
    raport.bledne += 1
    return
  }

  const { trybTytulu, motywKoloru, kolorMotywu, ...daneDokumentu } = dane
  const typ = trybTytulu === 'certyfikat' ? 'CERTYFIKAT' : trybTytulu === 'zaswiadczenie' ? 'ZASWIADCZENIE' : 'DYPLOM'
  zapiszDokumentMigracji(raport, {
    id: `dyplomy-stary-szkic-${trybTytulu}`,
    typ,
    generatorId: 'dyplomy',
    tytul: typeof dane.tytulSzkolenia === 'string' && dane.tytulSzkolenia.trim() ? dane.tytulSzkolenia : 'Dokument dyplomowy',
    daneDokumentu: { ...daneDokumentu, metadaneMigracji: { kluczZrodlowy: kluczDyplomow } },
    ustawieniaDokumentu: { motywKoloru, kolorMotywu, trybTytulu },
  })
}

function pobierzDaneStarszejWersjiSzczegolow(wartosc: Record<string, unknown>) {
  const daneDokumentu = czyObiekt(wartosc.daneDokumentu) ? wartosc.daneDokumentu : wartosc
  const dane = czyObiekt(daneDokumentu.dane) ? daneDokumentu.dane : czyObiekt(daneDokumentu.daneFormularza) ? daneDokumentu.daneFormularza : czyObiekt(wartosc.dane) ? wartosc.dane : czyObiekt(wartosc.daneFormularza) ? wartosc.daneFormularza : null

  if (!dane) {
    return null
  }

  const maCharakterystycznePole = ['tytulSzkolenia', 'statusSzczegolow', 'programSzkolenia', 'uwagi'].some((pole) => pole in dane) || Array.isArray(daneDokumentu.grupy) || Array.isArray(wartosc.grupy)
  return maCharakterystycznePole ? { daneDokumentu, dane } : null
}

function czyStarszaWersjaSzczegolow(wartosc: unknown): wartosc is StarszaWersjaSzczegolow {
  if (!czyObiekt(wartosc) || typeof wartosc.id !== 'string' || (typeof wartosc.typGeneratora === 'string' && wartosc.typGeneratora !== 'szczegoly_organizacyjne')) {
    return false
  }

  return pobierzDaneStarszejWersjiSzczegolow(wartosc) !== null
}

function migrujWersjeSzczegolow(raport: RaportMigracjiStarszychDokumentow, klucz: string, wartosc: unknown) {
  const wersje = Array.isArray(wartosc) ? wartosc : [wartosc]
  wersje.forEach((wersja) => {
    if (!czyStarszaWersjaSzczegolow(wersja)) {
      return
    }

    const zrodlo = pobierzDaneStarszejWersjiSzczegolow(wersja)!
    const znormalizowanaWersja = {
      ...zrodlo.daneDokumentu,
      ...wersja,
      dane: zrodlo.dane,
      grupy: Array.isArray(zrodlo.daneDokumentu.grupy) ? zrodlo.daneDokumentu.grupy : Array.isArray(wersja.grupy) ? wersja.grupy : [],
    }

    raport.znalezione += 1
    zapiszDokumentMigracji(raport, {
      id: wersja.id,
      typ: 'SZCZEGOLY_ORGANIZACYJNE',
      generatorId: 'szczegoly_organizacyjne',
      tytul: typeof zrodlo.dane.tytulSzkolenia === 'string' ? zrodlo.dane.tytulSzkolenia : 'Szczegoly organizacyjne',
      daneDokumentu: { ...znormalizowanaWersja, metadaneMigracji: { kluczZrodlowy: klucz, idZrodlowy: wersja.id } },
      ustawieniaDokumentu: {},
      utworzono: wersja.dataZapisu,
      zmodyfikowano: wersja.dataZapisu,
      autorId: wersja.autorId ?? null,
      klientId: typeof zrodlo.dane.nazwaKlienta === 'string' ? zrodlo.dane.nazwaKlienta : null,
      organizatorId: typeof zrodlo.dane.organizator === 'string' ? zrodlo.dane.organizator : null,
    })
  })
}

function migrujSzczegoly(raport: RaportMigracjiStarszychDokumentow) {
  ;[kluczKopiiSzczegolow, kluczAktualnejWersjiSzczegolow, kluczWspolnychKopiiRoboczych].forEach((klucz) => {
    const zapis = localStorage.getItem(klucz)
    if (zapis === null) return

    zapiszKopieBezpieczenstwa(klucz, zapis)
    migrujWersjeSzczegolow(raport, klucz, bezpiecznieParsuj(zapis))
  })
}

export function migrujStarszeDokumenty(): RaportMigracjiStarszychDokumentow {
  const raport: RaportMigracjiStarszychDokumentow = { znalezione: 0, przeniesione: 0, pominiete: 0, bledne: 0 }

  migrujStareRepozytorium(raport)
  migrujSzczegoly(raport)
  migrujDyplomy(raport)
  migrujProsteSzkice(raport)

  return raport
}
