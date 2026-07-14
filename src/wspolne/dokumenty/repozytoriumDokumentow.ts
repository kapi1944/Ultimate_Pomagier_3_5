export type TypGeneratoraDokumentu = 'programy_szkolen' | 'szczegoly_organizacyjne'
export type StanCykluDokumentu = 'kopia_robocza' | 'opublikowany' | 'archiwalny' | 'kosz'
export type WidocznoscDokumentu = 'prywatny' | 'zespol' | 'organizacja'
export type ZrodloDokumentu = 'nowy' | 'duplikat' | 'aktualizacja' | 'migracja'

export type DaneMigracjiDokumentu = {
  kluczZrodlowy?: string
  idZrodlowy?: string
  zmigrowano?: string
}

export type RekordDokumentu<TypDanych = unknown> = {
  id: string
  typGeneratora: TypGeneratoraDokumentu
  tytul: string
  stanCyklu: StanCykluDokumentu
  statusBiznesowy: string | null
  utworzono: string
  zaktualizowano: string
  opublikowano?: string
  usunieto?: string
  autorId?: string
  autorNazwa?: string
  opiekunId?: string
  widocznosc: WidocznoscDokumentu
  zrodlo: ZrodloDokumentu
  rekordZrodlowyId?: string
  wersjaFormatu?: string
  daneDokumentu: TypDanych
  metadaneGeneratora: Record<string, unknown>
  daneMigracji?: DaneMigracjiDokumentu
}

export type WpisHistoriiDokumentu<TypDanych = unknown> = {
  id: string
  typGeneratora: TypGeneratoraDokumentu
  dokumentId?: string
  data: string
  dane: TypDanych
}

export type FiltrDokumentow = {
  typGeneratora?: TypGeneratoraDokumentu
  stanCyklu?: StanCykluDokumentu
}

export type DaneNowegoDokumentu<TypDanych> = Omit<RekordDokumentu<TypDanych>, 'id' | 'utworzono' | 'zaktualizowano'> & {
  id?: string
  utworzono?: string
  zaktualizowano?: string
}

export interface RepozytoriumDokumentow {
  pobierz(filtr?: FiltrDokumentow): RekordDokumentu[]
  pobierzPoId(typGeneratora: TypGeneratoraDokumentu, id: string): RekordDokumentu | null
  zapiszNowy<TypDanych>(dane: DaneNowegoDokumentu<TypDanych>): RekordDokumentu<TypDanych>
  aktualizuj<TypDanych>(typGeneratora: TypGeneratoraDokumentu, id: string, zmiany: Partial<DaneNowegoDokumentu<TypDanych>>): RekordDokumentu<TypDanych> | null
  utworzKopie<TypDanych>(typGeneratora: TypGeneratoraDokumentu, id: string, zmiany?: Partial<DaneNowegoDokumentu<TypDanych>>): RekordDokumentu<TypDanych> | null
  opublikuj(typGeneratora: TypGeneratoraDokumentu, id: string, statusBiznesowy?: string | null): RekordDokumentu | null
  archiwizuj(typGeneratora: TypGeneratoraDokumentu, id: string): RekordDokumentu | null
  przeniesDoKosza(typGeneratora: TypGeneratoraDokumentu, id: string): RekordDokumentu | null
  przywrocZKosza(typGeneratora: TypGeneratoraDokumentu, id: string, stanCyklu?: Exclude<StanCykluDokumentu, 'kosz'>): RekordDokumentu | null
  pobierzHistorie(typGeneratora: TypGeneratoraDokumentu, dokumentId?: string): WpisHistoriiDokumentu[]
  dodajWersjeHistorii<TypDanych>(wpis: Omit<WpisHistoriiDokumentu<TypDanych>, 'id' | 'data'> & Partial<Pick<WpisHistoriiDokumentu, 'id' | 'data'>>): WpisHistoriiDokumentu<TypDanych>
}

type StanMagazynuDokumentow = {
  dokumenty: RekordDokumentu[]
  historia: WpisHistoriiDokumentu[]
}

export const kluczRepozytoriumDokumentow = 'ultimatePomagier.dokumenty.wspolne.v1'
const typyGeneratorow: TypGeneratoraDokumentu[] = ['programy_szkolen', 'szczegoly_organizacyjne']
const stanyCyklu: StanCykluDokumentu[] = ['kopia_robocza', 'opublikowany', 'archiwalny', 'kosz']
const widocznosci: WidocznoscDokumentu[] = ['prywatny', 'zespol', 'organizacja']
const zrodla: ZrodloDokumentu[] = ['nowy', 'duplikat', 'aktualizacja', 'migracja']

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object')
}

function czyNalezyDo<Typ extends string>(wartosc: unknown, wartosci: readonly Typ[]): wartosc is Typ {
  return typeof wartosc === 'string' && wartosci.includes(wartosc as Typ)
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

function utworzId(prefiks: string) {
  return `${prefiks}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizujDokument(wartosc: unknown): RekordDokumentu | null {
  if (!czyObiekt(wartosc) || typeof wartosc.id !== 'string' || !czyNalezyDo(wartosc.typGeneratora, typyGeneratorow)) {
    return null
  }

  const teraz = new Date().toISOString()
  const dataZapisu = typeof wartosc.dataZapisu === 'string' ? wartosc.dataZapisu : teraz

  return {
    id: wartosc.id,
    typGeneratora: wartosc.typGeneratora,
    tytul: typeof wartosc.tytul === 'string' && wartosc.tytul.trim() ? wartosc.tytul : typeof wartosc.nazwa === 'string' ? wartosc.nazwa : 'Bez tytułu',
    stanCyklu: czyNalezyDo(wartosc.stanCyklu, stanyCyklu) ? wartosc.stanCyklu : 'kopia_robocza',
    statusBiznesowy: typeof wartosc.statusBiznesowy === 'string' ? wartosc.statusBiznesowy : typeof wartosc.status === 'string' ? wartosc.status : null,
    utworzono: typeof wartosc.utworzono === 'string' ? wartosc.utworzono : dataZapisu,
    zaktualizowano: typeof wartosc.zaktualizowano === 'string' ? wartosc.zaktualizowano : dataZapisu,
    opublikowano: typeof wartosc.opublikowano === 'string' ? wartosc.opublikowano : undefined,
    usunieto: typeof wartosc.usunieto === 'string' ? wartosc.usunieto : undefined,
    autorId: typeof wartosc.autorId === 'string' ? wartosc.autorId : undefined,
    autorNazwa: typeof wartosc.autorNazwa === 'string' ? wartosc.autorNazwa : undefined,
    opiekunId: typeof wartosc.opiekunId === 'string' ? wartosc.opiekunId : undefined,
    widocznosc: czyNalezyDo(wartosc.widocznosc, widocznosci) ? wartosc.widocznosc : 'prywatny',
    zrodlo: czyNalezyDo(wartosc.zrodlo, zrodla) ? wartosc.zrodlo : 'migracja',
    rekordZrodlowyId: typeof wartosc.rekordZrodlowyId === 'string' ? wartosc.rekordZrodlowyId : undefined,
    wersjaFormatu: typeof wartosc.wersjaFormatu === 'string' ? wartosc.wersjaFormatu : typeof wartosc.wersja === 'string' ? wartosc.wersja : undefined,
    daneDokumentu: 'daneDokumentu' in wartosc ? wartosc.daneDokumentu : 'dane' in wartosc ? wartosc.dane : {},
    metadaneGeneratora: czyObiekt(wartosc.metadaneGeneratora) ? wartosc.metadaneGeneratora : {},
    daneMigracji: czyObiekt(wartosc.daneMigracji) ? wartosc.daneMigracji : undefined,
  }
}

function normalizujHistorie(wartosc: unknown): WpisHistoriiDokumentu | null {
  if (!czyObiekt(wartosc) || typeof wartosc.id !== 'string' || !czyNalezyDo(wartosc.typGeneratora, typyGeneratorow)) {
    return null
  }

  return {
    id: wartosc.id,
    typGeneratora: wartosc.typGeneratora,
    dokumentId: typeof wartosc.dokumentId === 'string' ? wartosc.dokumentId : undefined,
    data: typeof wartosc.data === 'string' ? wartosc.data : new Date().toISOString(),
    dane: 'dane' in wartosc ? wartosc.dane : {},
  }
}

function pobierzStan(): StanMagazynuDokumentow {
  const zapis = bezpiecznieParsuj(localStorage.getItem(kluczRepozytoriumDokumentow))

  if (!czyObiekt(zapis)) {
    return { dokumenty: [], historia: [] }
  }

  const zajeteIdentyfikatory = new Set<string>()
  const dokumenty = (Array.isArray(zapis.dokumenty) ? zapis.dokumenty : [])
    .map(normalizujDokument)
    .filter((dokument): dokument is RekordDokumentu => {
      if (!dokument) {
        return false
      }

      const identyfikator = `${dokument.typGeneratora}:${dokument.id}`
      if (zajeteIdentyfikatory.has(identyfikator)) {
        return false
      }

      zajeteIdentyfikatory.add(identyfikator)
      return true
    })

  return {
    dokumenty,
    historia: (Array.isArray(zapis.historia) ? zapis.historia : []).map(normalizujHistorie).filter((wpis): wpis is WpisHistoriiDokumentu => Boolean(wpis)),
  }
}

function zapiszStan(stan: StanMagazynuDokumentow) {
  localStorage.setItem(kluczRepozytoriumDokumentow, JSON.stringify(stan))
}

function zaktualizujStanDokumentu<TypDanych>(typGeneratora: TypGeneratoraDokumentu, id: string, zmien: (dokument: RekordDokumentu) => RekordDokumentu<TypDanych>) {
  const stan = pobierzStan()
  const indeks = stan.dokumenty.findIndex((dokument) => dokument.typGeneratora === typGeneratora && dokument.id === id)

  if (indeks === -1) {
    return null
  }

  const dokument = zmien(stan.dokumenty[indeks])
  stan.dokumenty[indeks] = dokument
  zapiszStan(stan)
  return dokument
}

export const repozytoriumDokumentow: RepozytoriumDokumentow = {
  pobierz(filtr) {
    return pobierzStan().dokumenty
      .filter((dokument) => (!filtr?.typGeneratora || dokument.typGeneratora === filtr.typGeneratora) && (!filtr?.stanCyklu || dokument.stanCyklu === filtr.stanCyklu))
      .sort((pierwszy, drugi) => new Date(drugi.zaktualizowano).getTime() - new Date(pierwszy.zaktualizowano).getTime())
  },

  pobierzPoId(typGeneratora, id) {
    return pobierzStan().dokumenty.find((dokument) => dokument.typGeneratora === typGeneratora && dokument.id === id) ?? null
  },

  zapiszNowy<TypDanych>(dane: DaneNowegoDokumentu<TypDanych>) {
    const stan = pobierzStan()
    const id = dane.id && !stan.dokumenty.some((dokument) => dokument.typGeneratora === dane.typGeneratora && dokument.id === dane.id) ? dane.id : utworzId(dane.typGeneratora)
    const teraz = new Date().toISOString()
    const dokument: RekordDokumentu<TypDanych> = {
      ...dane,
      id,
      tytul: dane.tytul.trim() || 'Bez tytułu',
      utworzono: dane.utworzono ?? teraz,
      zaktualizowano: dane.zaktualizowano ?? teraz,
      metadaneGeneratora: dane.metadaneGeneratora ?? {},
    }

    stan.dokumenty.unshift(dokument)
    zapiszStan(stan)
    return dokument
  },

  aktualizuj<TypDanych>(typGeneratora: TypGeneratoraDokumentu, id: string, zmiany: Partial<DaneNowegoDokumentu<TypDanych>>) {
    return zaktualizujStanDokumentu(typGeneratora, id, (dokument) => ({
      ...dokument,
      ...zmiany,
      id: dokument.id,
      typGeneratora: dokument.typGeneratora,
      utworzono: dokument.utworzono,
      tytul: typeof zmiany.tytul === 'string' && zmiany.tytul.trim() ? zmiany.tytul : dokument.tytul,
      zaktualizowano: new Date().toISOString(),
      zrodlo: 'aktualizacja',
      metadaneGeneratora: zmiany.metadaneGeneratora ?? dokument.metadaneGeneratora,
    })) as RekordDokumentu<TypDanych> | null
  },

  utworzKopie<TypDanych>(typGeneratora: TypGeneratoraDokumentu, id: string, zmiany: Partial<DaneNowegoDokumentu<TypDanych>> = {}) {
    const zrodlo = this.pobierzPoId(typGeneratora, id) as RekordDokumentu<TypDanych> | null

    if (!zrodlo) {
      return null
    }

    return this.zapiszNowy<TypDanych>({
      ...zrodlo,
      ...zmiany,
      id: undefined,
      stanCyklu: 'kopia_robocza',
      zrodlo: 'duplikat',
      rekordZrodlowyId: zrodlo.id,
      opublikowano: undefined,
      usunieto: undefined,
      metadaneGeneratora: zmiany.metadaneGeneratora ?? zrodlo.metadaneGeneratora,
    })
  },

  opublikuj(typGeneratora, id, statusBiznesowy) {
    return zaktualizujStanDokumentu(typGeneratora, id, (dokument) => ({
      ...dokument,
      stanCyklu: 'opublikowany',
      statusBiznesowy: statusBiznesowy ?? dokument.statusBiznesowy,
      opublikowano: new Date().toISOString(),
      usunieto: undefined,
      zaktualizowano: new Date().toISOString(),
    }))
  },

  archiwizuj(typGeneratora, id) {
    return zaktualizujStanDokumentu(typGeneratora, id, (dokument) => ({ ...dokument, stanCyklu: 'archiwalny', zaktualizowano: new Date().toISOString() }))
  },

  przeniesDoKosza(typGeneratora, id) {
    return zaktualizujStanDokumentu(typGeneratora, id, (dokument) => ({ ...dokument, stanCyklu: 'kosz', usunieto: new Date().toISOString(), zaktualizowano: new Date().toISOString() }))
  },

  przywrocZKosza(typGeneratora, id, stanCyklu = 'kopia_robocza') {
    return zaktualizujStanDokumentu(typGeneratora, id, (dokument) => ({ ...dokument, stanCyklu, usunieto: undefined, zaktualizowano: new Date().toISOString() }))
  },

  pobierzHistorie(typGeneratora, dokumentId) {
    return pobierzStan().historia
      .filter((wpis) => wpis.typGeneratora === typGeneratora && (!dokumentId || wpis.dokumentId === dokumentId))
      .sort((pierwszy, drugi) => new Date(drugi.data).getTime() - new Date(pierwszy.data).getTime())
  },

  dodajWersjeHistorii<TypDanych>(wpis: Omit<WpisHistoriiDokumentu<TypDanych>, 'id' | 'data'> & Partial<Pick<WpisHistoriiDokumentu, 'id' | 'data'>>) {
    const stan = pobierzStan()
    const rekord: WpisHistoriiDokumentu<TypDanych> = {
      ...wpis,
      id: wpis.id && !stan.historia.some((istniejacy) => istniejacy.id === wpis.id && istniejacy.typGeneratora === wpis.typGeneratora) ? wpis.id : utworzId('historia'),
      data: wpis.data ?? new Date().toISOString(),
    }

    stan.historia.unshift(rekord)
    zapiszStan(stan)
    return rekord
  },
}
