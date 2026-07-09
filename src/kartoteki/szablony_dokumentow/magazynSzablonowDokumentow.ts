import { sprawdzDokumentBlokowy, type DokumentBlokowy, type ProblemDokumentu } from '../../wspolne/dokumenty/modelBlokowy'
import type { DokumentPomagiera } from '../../wspolne/dokumenty/typyDokumentu'
import type { SzablonRoboczyReplikatora, TypDokumentuReplikatora } from '../../moduly/dokumenty/replikator_dokumentow/typyReplikatora'
import {
  skopiujDaneWersji,
  utworzWpisWersjiSzablonu,
  utworzWpisWersjiZSzablonu,
} from './wersjeSzablonowDokumentow'
import type {
  DecyzjaKartotekiSzablonu,
  OrganizatorSzablonuDokumentu,
  SzablonDokumentuKartoteki,
  TypSzablonuDokumentu,
} from './typySzablonowDokumentow'

export const kluczMagazynuSzablonowDokumentow = 'ultimate-pomagier.kartoteki.szablony-dokumentow'

type StarySzablonDokumentu = {
  id?: string
  nazwa?: string
  typDokumentu?: string
  status?: string
  marka?: string
  wersja?: number
  dataUtworzenia?: string
  dataAktualizacji?: string
  dokument?: DokumentPomagiera
  daneReplikacji?: {
    status?: string
    zrodloImportu?: string
    dataImportu?: string
    uzytkownik?: string
    wersja?: number
    procentZgodnosci?: number
    poziomZgodnosci?: string
    dokumentBlokowy?: DokumentBlokowy
    raportImportu?: SzablonDokumentuKartoteki['raportReplikacji']
    placeholdery?: SzablonDokumentuKartoteki['placeholdery']
    elementyNiepewne?: string[]
    elementyNieobslugiwane?: string[]
    historiaDecyzji?: SzablonDokumentuKartoteki['historiaDecyzji']
  }
}

function normalizujNazwe(nazwa: string) {
  return nazwa.trim().toLocaleLowerCase('pl')
}

function utworzIdSzablonu(nazwa: string) {
  const rdzen = nazwa
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `szablon-dokumentu-${rdzen || 'roboczy'}-${Date.now()}`
}

function utworzDecyzjeKartoteki(
  typ: DecyzjaKartotekiSzablonu['typ'],
  komentarz: string,
  uzytkownik: string,
  data = new Date().toISOString(),
): DecyzjaKartotekiSzablonu {
  return {
    id: `decyzja-kartoteki-${typ}-${Date.now()}`,
    typ,
    komentarz,
    uzytkownik,
    data,
  }
}

function mapujOrganizatora(organizator?: string): OrganizatorSzablonuDokumentu {
  return organizator === 'SEMPER' || organizator === 'IIST' ? organizator : 'Inny'
}

function mapujTypDokumentu(typ?: string): TypSzablonuDokumentu {
  const mapowanie: Record<string, TypSzablonuDokumentu> = {
    program_szkolenia: 'Program szkolenia',
    dyplom: 'Dyplom',
    lista_obecnosci: 'Lista obecności',
    ankieta_ewaluacyjna: 'Ankieta',
  }

  if (!typ) {
    return 'Inny'
  }

  return mapowanie[typ] ?? ([
    'Program szkolenia',
    'Dyplom',
    'Certyfikat',
    'Zaświadczenie',
    'Lista obecności',
    'Ankieta',
    'Protokół',
    'Materiał dodatkowy',
    'Inny',
  ].includes(typ) ? typ as TypSzablonuDokumentu : 'Inny')
}

function mapujStatus(status?: string): SzablonDokumentuKartoteki['status'] {
  if (status === 'Aktywny' || status === 'Archiwalny') {
    return status
  }

  return 'Roboczy'
}

function przygotujDokumentBlokowy(dokumentBlokowy: DokumentBlokowy): DokumentBlokowy {
  const kopia = skopiujDaneWersji(dokumentBlokowy)
  const problemy = sprawdzDokumentBlokowy(kopia)

  return {
    ...kopia,
    problemy,
  }
}

function pobierzProblemySzablonu(szablon: Pick<SzablonDokumentuKartoteki, 'dokumentBlokowy' | 'raportReplikacji'>): ProblemDokumentu[] {
  return [
    ...szablon.dokumentBlokowy.problemy,
    ...(szablon.raportReplikacji?.problemyJakosci ?? []),
  ]
}

function czyGotowyDoAktywacji(szablon: SzablonDokumentuKartoteki) {
  const maBladKrytyczny = pobierzProblemySzablonu(szablon).some((problem) => problem.poziom === 'blad_krytyczny')
  const maNierozstrzygnietePlaceholdery = szablon.placeholdery.some((placeholder) => placeholder.status === 'propozycja')

  return !maBladKrytyczny && !maNierozstrzygnietePlaceholdery
}

function utworzWersjePoczatkowa(szablon: SzablonDokumentuKartoteki, data: string) {
  return utworzWpisWersjiSzablonu({
    numerWersji: 1,
    data,
    autor: szablon.autor,
    komentarz: 'Utworzono pierwszą wersję szablonu.',
    dokumentBlokowy: szablon.dokumentBlokowy,
    raportJakosci: pobierzProblemySzablonu(szablon),
    raportReplikacji: szablon.raportReplikacji,
    zrodloZmiany: szablon.zrodlo,
    procentZgodnosci: szablon.procentZgodnosci,
    poziomZgodnosci: szablon.poziomZgodnosci,
  })
}

function migrujStarySzablon(wartosc: unknown): SzablonDokumentuKartoteki | null {
  const starySzablon = wartosc as StarySzablonDokumentu
  const daneReplikacji = starySzablon?.daneReplikacji

  if (!daneReplikacji?.dokumentBlokowy) {
    return null
  }

  const data = starySzablon.dataAktualizacji ?? daneReplikacji.dataImportu ?? new Date().toISOString()
  const dokumentBlokowy = przygotujDokumentBlokowy(daneReplikacji.dokumentBlokowy)
  const szablon: SzablonDokumentuKartoteki = {
    id: starySzablon.id ?? utworzIdSzablonu(starySzablon.nazwa ?? 'Szablon dokumentu'),
    nazwa: starySzablon.nazwa ?? 'Szablon dokumentu',
    typDokumentu: mapujTypDokumentu(starySzablon.typDokumentu),
    organizator: mapujOrganizatora(starySzablon.marka ?? dokumentBlokowy.dane.organizator),
    status: mapujStatus(daneReplikacji.status),
    wersja: daneReplikacji.wersja ?? starySzablon.wersja ?? 1,
    dataUtworzenia: starySzablon.dataUtworzenia ?? data,
    dataModyfikacji: data,
    autor: daneReplikacji.uzytkownik ?? 'Architekt',
    zrodlo: daneReplikacji.zrodloImportu === 'DOCX' || daneReplikacji.zrodloImportu === 'PDF' || daneReplikacji.zrodloImportu === 'TEKST' ? daneReplikacji.zrodloImportu : 'RECZNY',
    dokumentBlokowy,
    dokumentPodgladu: starySzablon.dokument,
    raportReplikacji: daneReplikacji.raportImportu,
    procentZgodnosci: daneReplikacji.procentZgodnosci ?? 0,
    poziomZgodnosci: daneReplikacji.poziomZgodnosci === 'bardzo_dobra_zgodnosc' || daneReplikacji.poziomZgodnosci === 'dobra_zgodnosc' || daneReplikacji.poziomZgodnosci === 'wymaga_sprawdzenia' ? daneReplikacji.poziomZgodnosci : 'tylko_wersja_robocza',
    placeholdery: daneReplikacji.placeholdery ?? [],
    elementyNiepewne: daneReplikacji.elementyNiepewne ?? [],
    elementyNieobslugiwane: daneReplikacji.elementyNieobslugiwane ?? [],
    historiaDecyzji: daneReplikacji.historiaDecyzji ?? [],
    historiaWersji: [],
    czyWersjaTestowa: (daneReplikacji.procentZgodnosci ?? 0) <= 70 || mapujStatus(daneReplikacji.status) === 'Roboczy',
    czyAktywny: mapujStatus(daneReplikacji.status) === 'Aktywny',
  }

  return {
    ...szablon,
    historiaWersji: [utworzWersjePoczatkowa(szablon, data)],
  }
}

function uporzadkujSzablon(wartosc: unknown): SzablonDokumentuKartoteki | null {
  const szablon = wartosc as SzablonDokumentuKartoteki

  if (szablon?.dokumentBlokowy && Array.isArray(szablon.historiaWersji)) {
    return {
      ...szablon,
      dokumentBlokowy: przygotujDokumentBlokowy(szablon.dokumentBlokowy),
      status: mapujStatus(szablon.status),
      organizator: mapujOrganizatora(szablon.organizator),
      typDokumentu: mapujTypDokumentu(szablon.typDokumentu),
      czyAktywny: szablon.status === 'Aktywny',
    }
  }

  return migrujStarySzablon(wartosc)
}

export function pobierzSzablonyDokumentowZKartoteki(): SzablonDokumentuKartoteki[] {
  if (typeof localStorage === 'undefined') {
    return []
  }

  try {
    const zapis = localStorage.getItem(kluczMagazynuSzablonowDokumentow)
    const dane = zapis ? JSON.parse(zapis) : []

    return Array.isArray(dane) ? dane.map(uporzadkujSzablon).filter((szablon): szablon is SzablonDokumentuKartoteki => Boolean(szablon)) : []
  } catch {
    return []
  }
}

export function zapiszSzablonyDokumentowWKartotece(szablony: SzablonDokumentuKartoteki[]) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(kluczMagazynuSzablonowDokumentow, JSON.stringify(szablony))
}

export function pobierzSzablonDokumentuPoId(id: string) {
  return pobierzSzablonyDokumentowZKartoteki().find((szablon) => szablon.id === id) ?? null
}

export function wykryjKonfliktNazwySzablonu(
  nazwa: string,
  szablony: SzablonDokumentuKartoteki[],
  pominId?: string,
) {
  const szukanaNazwa = normalizujNazwe(nazwa)

  return szablony.find((szablon) => szablon.id !== pominId && normalizujNazwe(szablon.nazwa) === szukanaNazwa) ?? null
}

export function utworzNazweSzablonuZDopiskiem(nazwa: string, szablony: SzablonDokumentuKartoteki[]) {
  const nazwaBazowa = nazwa.trim() || 'Szablon roboczy'

  if (!wykryjKonfliktNazwySzablonu(nazwaBazowa, szablony)) {
    return nazwaBazowa
  }

  for (let indeks = 1; indeks < 100; indeks += 1) {
    const nazwaZDopiskiem = `${nazwaBazowa} (${indeks})`

    if (!wykryjKonfliktNazwySzablonu(nazwaZDopiskiem, szablony)) {
      return nazwaZDopiskiem
    }
  }

  return `${nazwaBazowa} (${Date.now()})`
}

export function utworzSzablonKartotekiZReplikatora(
  szablonRoboczy: SzablonRoboczyReplikatora,
  dokumentPodgladu: DokumentPomagiera | undefined,
  autor: string,
  nazwa = szablonRoboczy.nazwa,
  data = new Date().toISOString(),
): SzablonDokumentuKartoteki {
  const dokumentBlokowy = przygotujDokumentBlokowy(szablonRoboczy.dokumentBlokowy)
  const szablon: SzablonDokumentuKartoteki = {
    id: utworzIdSzablonu(nazwa),
    nazwa,
    typDokumentu: mapujTypDokumentu(szablonRoboczy.typDokumentu),
    organizator: mapujOrganizatora(szablonRoboczy.organizator),
    status: 'Roboczy',
    wersja: 1,
    dataUtworzenia: data,
    dataModyfikacji: data,
    autor,
    zrodlo: szablonRoboczy.zrodloImportu,
    dokumentBlokowy,
    dokumentPodgladu,
    raportReplikacji: skopiujDaneWersji(szablonRoboczy.raportImportu),
    procentZgodnosci: szablonRoboczy.procentZgodnosci,
    poziomZgodnosci: szablonRoboczy.poziomZgodnosci,
    placeholdery: skopiujDaneWersji(szablonRoboczy.placeholdery),
    elementyNiepewne: skopiujDaneWersji(szablonRoboczy.elementyNiepewne),
    elementyNieobslugiwane: skopiujDaneWersji(szablonRoboczy.elementyNieobslugiwane),
    historiaDecyzji: [
      ...skopiujDaneWersji(szablonRoboczy.historiaDecyzji),
      utworzDecyzjeKartoteki('zapis', 'Zapisano wynik Replikatora jako szablon roboczy.', autor, data),
    ],
    historiaWersji: [],
    czyWersjaTestowa: szablonRoboczy.procentZgodnosci <= 70 || szablonRoboczy.status === 'Roboczy',
    czyAktywny: false,
  }

  return {
    ...szablon,
    historiaWersji: [utworzWersjePoczatkowa(szablon, data)],
  }
}

export function zapiszNowySzablonZReplikatora(
  szablonRoboczy: SzablonRoboczyReplikatora,
  dokumentPodgladu: DokumentPomagiera | undefined,
  autor: string,
  nazwa?: string,
) {
  const szablony = pobierzSzablonyDokumentowZKartoteki()
  const nazwaDoZapisu = utworzNazweSzablonuZDopiskiem(nazwa ?? szablonRoboczy.nazwa, szablony)
  const szablon = utworzSzablonKartotekiZReplikatora(szablonRoboczy, dokumentPodgladu, autor, nazwaDoZapisu)

  zapiszSzablonyDokumentowWKartotece([szablon, ...szablony])

  return szablon
}

export function zapiszNowaWersjeSzablonu(
  idSzablonu: string,
  szablonRoboczy: SzablonRoboczyReplikatora,
  dokumentPodgladu: DokumentPomagiera | undefined,
  autor: string,
  komentarz = 'Zapisano nową wersję roboczą z Replikatora.',
) {
  const szablony = pobierzSzablonyDokumentowZKartoteki()
  const istniejacySzablon = szablony.find((szablon) => szablon.id === idSzablonu)

  if (!istniejacySzablon) {
    return zapiszNowySzablonZReplikatora(szablonRoboczy, dokumentPodgladu, autor)
  }

  const data = new Date().toISOString()
  const nowaWersja = istniejacySzablon.wersja + 1
  const dokumentBlokowy = przygotujDokumentBlokowy(szablonRoboczy.dokumentBlokowy)
  const zaktualizowanySzablon: SzablonDokumentuKartoteki = {
    ...istniejacySzablon,
    typDokumentu: mapujTypDokumentu(szablonRoboczy.typDokumentu),
    organizator: mapujOrganizatora(szablonRoboczy.organizator),
    status: 'Roboczy',
    wersja: nowaWersja,
    dataModyfikacji: data,
    autor,
    zrodlo: szablonRoboczy.zrodloImportu,
    dokumentBlokowy,
    dokumentPodgladu,
    raportReplikacji: skopiujDaneWersji(szablonRoboczy.raportImportu),
    procentZgodnosci: szablonRoboczy.procentZgodnosci,
    poziomZgodnosci: szablonRoboczy.poziomZgodnosci,
    placeholdery: skopiujDaneWersji(szablonRoboczy.placeholdery),
    elementyNiepewne: skopiujDaneWersji(szablonRoboczy.elementyNiepewne),
    elementyNieobslugiwane: skopiujDaneWersji(szablonRoboczy.elementyNieobslugiwane),
    historiaDecyzji: [
      ...istniejacySzablon.historiaDecyzji,
      ...skopiujDaneWersji(szablonRoboczy.historiaDecyzji),
      utworzDecyzjeKartoteki('wersja', komentarz, autor, data),
    ],
    historiaWersji: [
      ...istniejacySzablon.historiaWersji,
      utworzWpisWersjiSzablonu({
        numerWersji: nowaWersja,
        data,
        autor,
        komentarz,
        dokumentBlokowy,
        raportJakosci: pobierzProblemySzablonu({ dokumentBlokowy, raportReplikacji: szablonRoboczy.raportImportu }),
        raportReplikacji: szablonRoboczy.raportImportu,
        zrodloZmiany: szablonRoboczy.zrodloImportu,
        procentZgodnosci: szablonRoboczy.procentZgodnosci,
        poziomZgodnosci: szablonRoboczy.poziomZgodnosci,
      }),
    ],
    czyWersjaTestowa: szablonRoboczy.procentZgodnosci <= 70 || szablonRoboczy.status === 'Roboczy',
    czyAktywny: false,
  }

  zapiszSzablonyDokumentowWKartotece(szablony.map((szablon) => (szablon.id === idSzablonu ? zaktualizowanySzablon : szablon)))

  return zaktualizowanySzablon
}

export function aktualizujMetadaneSzablonuDokumentu(
  idSzablonu: string,
  zmiany: Partial<Pick<SzablonDokumentuKartoteki, 'nazwa' | 'typDokumentu' | 'organizator' | 'czyWersjaTestowa'>>,
  autor: string,
  komentarz: string,
) {
  const szablony = pobierzSzablonyDokumentowZKartoteki()
  const data = new Date().toISOString()
  const zaktualizowane = szablony.map((szablon) => (
    szablon.id === idSzablonu
      ? {
          ...szablon,
          ...zmiany,
          dataModyfikacji: data,
          historiaDecyzji: [...szablon.historiaDecyzji, utworzDecyzjeKartoteki('metadane', komentarz, autor, data)],
        }
      : szablon
  ))

  zapiszSzablonyDokumentowWKartotece(zaktualizowane)

  return zaktualizowane.find((szablon) => szablon.id === idSzablonu) ?? null
}

export function aktywujSzablonDokumentu(idSzablonu: string, autor: string, komentarz = '') {
  const szablony = pobierzSzablonyDokumentowZKartoteki()
  const szablon = szablony.find((pozycja) => pozycja.id === idSzablonu)

  if (!szablon) {
    throw new Error('Nie znaleziono szablonu do aktywacji.')
  }

  if (!czyGotowyDoAktywacji(szablon)) {
    throw new Error('Szablon ma błędy krytyczne albo nierozstrzygnięte placeholdery.')
  }

  if (szablon.procentZgodnosci <= 70 && !komentarz.trim()) {
    throw new Error('Aktywacja szablonu z niską zgodnością wymaga komentarza.')
  }

  const data = new Date().toISOString()
  const zaktualizowanySzablon: SzablonDokumentuKartoteki = {
    ...szablon,
    status: 'Aktywny',
    czyAktywny: true,
    dataModyfikacji: data,
    historiaDecyzji: [
      ...szablon.historiaDecyzji,
      utworzDecyzjeKartoteki('aktywacja', komentarz.trim() || 'Aktywowano szablon dokumentu.', autor, data),
    ],
  }

  zapiszSzablonyDokumentowWKartotece(szablony.map((pozycja) => (pozycja.id === idSzablonu ? zaktualizowanySzablon : pozycja)))

  return zaktualizowanySzablon
}

export function archiwizujSzablonDokumentu(idSzablonu: string, autor: string, komentarz = 'Ustawiono status Archiwalny.') {
  const szablony = pobierzSzablonyDokumentowZKartoteki()
  const data = new Date().toISOString()
  const zaktualizowane = szablony.map((szablon) => (
    szablon.id === idSzablonu
      ? {
          ...szablon,
          status: 'Archiwalny' as const,
          czyAktywny: false,
          dataModyfikacji: data,
          historiaDecyzji: [...szablon.historiaDecyzji, utworzDecyzjeKartoteki('archiwizacja', komentarz, autor, data)],
        }
      : szablon
  ))

  zapiszSzablonyDokumentowWKartotece(zaktualizowane)

  return zaktualizowane.find((szablon) => szablon.id === idSzablonu) ?? null
}

export function ukryjOznaczenieWersjiTestowej(idSzablonu: string, autor: string) {
  return aktualizujMetadaneSzablonuDokumentu(
    idSzablonu,
    { czyWersjaTestowa: false },
    autor,
    'Ukryto oznaczenie wersji testowej po decyzji użytkownika.',
  )
}

export function utworzNowaWersjeNaPodstawieObecnej(idSzablonu: string, autor: string, komentarz = 'Utworzono nową wersję roboczą na podstawie obecnej.') {
  const szablony = pobierzSzablonyDokumentowZKartoteki()
  const szablon = szablony.find((pozycja) => pozycja.id === idSzablonu)

  if (!szablon) {
    return null
  }

  const data = new Date().toISOString()
  const nowaWersja = szablon.wersja + 1
  const zaktualizowanySzablon: SzablonDokumentuKartoteki = {
    ...szablon,
    status: 'Roboczy',
    czyAktywny: false,
    wersja: nowaWersja,
    dataModyfikacji: data,
    historiaDecyzji: [...szablon.historiaDecyzji, utworzDecyzjeKartoteki('wersja', komentarz, autor, data)],
    historiaWersji: [
      ...szablon.historiaWersji,
      utworzWpisWersjiSzablonu({
        numerWersji: nowaWersja,
        data,
        autor,
        komentarz,
        dokumentBlokowy: szablon.dokumentBlokowy,
        raportJakosci: pobierzProblemySzablonu(szablon),
        raportReplikacji: szablon.raportReplikacji,
        zrodloZmiany: 'kartoteka',
        procentZgodnosci: szablon.procentZgodnosci,
        poziomZgodnosci: szablon.poziomZgodnosci,
      }),
    ],
  }

  zapiszSzablonyDokumentowWKartotece(szablony.map((pozycja) => (pozycja.id === idSzablonu ? zaktualizowanySzablon : pozycja)))

  return zaktualizowanySzablon
}

export function przywrocWersjeJakoRobocza(
  idSzablonu: string,
  numerWersji: number,
  autor: string,
  komentarz = `Przywrócono wersję ${numerWersji} jako nową wersję roboczą.`,
) {
  const szablony = pobierzSzablonyDokumentowZKartoteki()
  const szablon = szablony.find((pozycja) => pozycja.id === idSzablonu)
  const wersja = szablon?.historiaWersji.find((pozycja) => pozycja.numerWersji === numerWersji)

  if (!szablon || !wersja) {
    return null
  }

  const data = new Date().toISOString()
  const nowaWersja = szablon.wersja + 1
  const zaktualizowanySzablon: SzablonDokumentuKartoteki = {
    ...szablon,
    status: 'Roboczy',
    czyAktywny: false,
    wersja: nowaWersja,
    dataModyfikacji: data,
    dokumentBlokowy: przygotujDokumentBlokowy(wersja.dokumentBlokowy),
    raportReplikacji: wersja.raportReplikacji,
    procentZgodnosci: wersja.procentZgodnosci,
    poziomZgodnosci: wersja.poziomZgodnosci,
    historiaDecyzji: [...szablon.historiaDecyzji, utworzDecyzjeKartoteki('wersja', komentarz, autor, data)],
    historiaWersji: [
      ...szablon.historiaWersji,
      utworzWpisWersjiZSzablonu(
        {
          ...szablon,
          wersja: nowaWersja,
          dokumentBlokowy: przygotujDokumentBlokowy(wersja.dokumentBlokowy),
          raportReplikacji: wersja.raportReplikacji,
          procentZgodnosci: wersja.procentZgodnosci,
          poziomZgodnosci: wersja.poziomZgodnosci,
        },
        komentarz,
        'przywrocenie_wersji',
        data,
      ),
    ],
  }

  zapiszSzablonyDokumentowWKartotece(szablony.map((pozycja) => (pozycja.id === idSzablonu ? zaktualizowanySzablon : pozycja)))

  return zaktualizowanySzablon
}

export function klasyfikujStatusSzablonu(szablon: Pick<SzablonDokumentuKartoteki, 'status'>) {
  return szablon.status
}

export function mapujTypReplikatoraNaTypSzablonu(typ: TypDokumentuReplikatora) {
  return mapujTypDokumentu(typ)
}
