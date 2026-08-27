import type { KontekstDokumentuSzkolenia } from '../../../../wspolne/integracje/szczegolyDoDokumentow'

export type WariantSzablonuAnkiety = 'ORYGINALNA_PELNA' | 'ORYGINALNA_SKROCONA'
export type OrganizatorAnkiety = 'SEMPER' | 'IIST'
export type SekcjaPytaniaOcenianego = 'A' | 'B' | 'C'

export type PytanieOcenianeAnkiety = {
  id: string
  sekcja: SekcjaPytaniaOcenianego
  tekst: string
}

export type PytanieOtwarteAnkiety = {
  id: string
  tekst: string
}

export type WidocznoscSekcjiAnkiety = {
  ocenaOgolna: boolean
  ocenaTrenerow: boolean
  ocenaOrganizacji: boolean
  pytaniaOtwarte: boolean
  poleEmail: boolean
  uwagiISugestie: boolean
}

export type DaneAnkiety = {
  wersjaSchematu: 1
  tytulSzkolenia: string
  dataOd: string
  dataDo: string
  miejsce: string
  organizator: OrganizatorAnkiety
  trener: string
  wariantSzablonu: WariantSzablonuAnkiety
  widocznoscSekcji: WidocznoscSekcjiAnkiety
  pytaniaOceniane: PytanieOcenianeAnkiety[]
  pytaniaOtwarte: PytanieOtwarteAnkiety[]
}

export const nazwyOrganizatorowAnkiety: Record<OrganizatorAnkiety, string> = {
  SEMPER: 'Centrum Organizacji Szkoleń i Konferencji SEMPER',
  IIST: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST',
}

export const etykietyWariantowAnkiety: Record<WariantSzablonuAnkiety, string> = {
  ORYGINALNA_PELNA: 'Oryginalna — pełna',
  ORYGINALNA_SKROCONA: 'Oryginalna — skrócona',
}

export const domyslnePytaniaOceniane: PytanieOcenianeAnkiety[] = [
  { id: 'ocena-ogolna-1', sekcja: 'A', tekst: 'Proszę ocenić ogólny poziom Pani/Pana zadowolenia ze szkolenia.' },
  { id: 'ocena-trenera-1', sekcja: 'B', tekst: 'Znajomość tematyki przedmiotu.' },
  { id: 'ocena-trenera-2', sekcja: 'B', tekst: 'Umiejętność przekazywania wiedzy.' },
  { id: 'ocena-trenera-3', sekcja: 'B', tekst: 'Utrzymanie zainteresowania słuchaczy i komunikatywność.' },
  { id: 'ocena-trenera-4', sekcja: 'B', tekst: 'Różnorodność stosowanych przez trenera metod pracy.' },
  { id: 'ocena-trenera-5', sekcja: 'B', tekst: 'Otwartość na dyskusje i pytania uczestników.' },
  { id: 'ocena-trenera-6', sekcja: 'B', tekst: 'Utrzymywanie dobrej atmosfery.' },
  { id: 'ocena-organizacji-1', sekcja: 'C', tekst: 'Proszę ocenić materiały szkoleniowe.' },
  { id: 'ocena-organizacji-2', sekcja: 'C', tekst: 'Proszę ocenić punktualność, przerwy, stronę czasowo-organizacyjną szkolenia.' },
]

export const domyslnePytaniaOtwarte: PytanieOtwarteAnkiety[] = [
  { id: 'pytanie-otwarte-1', tekst: 'Jakie zagadnienie z warsztatu szczególnie Panią/Pana zainteresowało i dlaczego?' },
  { id: 'pytanie-otwarte-2', tekst: 'O jakie elementy udoskonaliłby/udoskonaliłaby Pani/Pan szkolenie i dlaczego?' },
  { id: 'pytanie-otwarte-3', tekst: 'Jakim tematem/terminem szkolenia jest Pani/Pan zainteresowana/y w przyszłości?' },
]

function klonujPytaniaOceniane() {
  return domyslnePytaniaOceniane.map((pytanie) => ({ ...pytanie }))
}

function klonujPytaniaOtwarte() {
  return domyslnePytaniaOtwarte.map((pytanie) => ({ ...pytanie }))
}

export function utworzDomyslneDaneAnkiety(wariantSzablonu: WariantSzablonuAnkiety = 'ORYGINALNA_PELNA'): DaneAnkiety {
  return {
    wersjaSchematu: 1,
    tytulSzkolenia: 'Skuteczna komunikacja w zespole',
    dataOd: '',
    dataDo: '',
    miejsce: '',
    organizator: 'SEMPER',
    trener: '',
    wariantSzablonu,
    widocznoscSekcji: {
      ocenaOgolna: true,
      ocenaTrenerow: true,
      ocenaOrganizacji: true,
      pytaniaOtwarte: true,
      poleEmail: true,
      uwagiISugestie: wariantSzablonu === 'ORYGINALNA_PELNA',
    },
    pytaniaOceniane: klonujPytaniaOceniane(),
    pytaniaOtwarte: klonujPytaniaOtwarte(),
  }
}

export function zastosujWariantSzablonu(dane: DaneAnkiety, wariantSzablonu: WariantSzablonuAnkiety): DaneAnkiety {
  return {
    ...dane,
    wariantSzablonu,
    widocznoscSekcji: {
      ...dane.widocznoscSekcji,
      uwagiISugestie: wariantSzablonu === 'ORYGINALNA_PELNA',
    },
  }
}

export function formatujZakresDatAnkiety(dataOd: string, dataDo: string) {
  if (!dataOd && !dataDo) return ''
  if (!dataDo || dataOd === dataDo) return dataOd
  if (!dataOd) return dataDo
  return `${dataOd} do ${dataDo}`
}

function czyRekord(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc) && typeof wartosc === 'object' && !Array.isArray(wartosc)
}

function pobierzTekst(rekord: Record<string, unknown>, klucz: string, wartoscDomyslna: string) {
  return typeof rekord[klucz] === 'string' ? rekord[klucz] : wartoscDomyslna
}

function normalizujOrganizatora(wartosc: unknown): OrganizatorAnkiety {
  return typeof wartosc === 'string' && wartosc.toUpperCase().includes('IIST') ? 'IIST' : 'SEMPER'
}

function normalizujWariant(wartosc: unknown): WariantSzablonuAnkiety {
  return wartosc === 'ORYGINALNA_SKROCONA' ? 'ORYGINALNA_SKROCONA' : 'ORYGINALNA_PELNA'
}

function normalizujPytaniaOceniane(wartosc: unknown) {
  if (!Array.isArray(wartosc)) return klonujPytaniaOceniane()

  const pytania = wartosc.flatMap((pytanie, indeks): PytanieOcenianeAnkiety[] => {
    if (!czyRekord(pytanie) || typeof pytanie.tekst !== 'string' || !['A', 'B', 'C'].includes(String(pytanie.sekcja))) return []
    return [{
      id: typeof pytanie.id === 'string' && pytanie.id ? pytanie.id : `pytanie-oceniane-${indeks + 1}`,
      sekcja: pytanie.sekcja as SekcjaPytaniaOcenianego,
      tekst: pytanie.tekst,
    }]
  })

  return pytania.length ? pytania : klonujPytaniaOceniane()
}

function normalizujPytaniaOtwarte(wartosc: unknown) {
  if (!Array.isArray(wartosc)) return klonujPytaniaOtwarte()

  const pytania = wartosc.flatMap((pytanie, indeks): PytanieOtwarteAnkiety[] => {
    if (!czyRekord(pytanie) || typeof pytanie.tekst !== 'string') return []
    return [{
      id: typeof pytanie.id === 'string' && pytanie.id ? pytanie.id : `pytanie-otwarte-${indeks + 1}`,
      tekst: pytanie.tekst,
    }]
  })

  return pytania.length ? pytania : klonujPytaniaOtwarte()
}

function odczytajPoleLegacy(tekst: string, etykieta: string) {
  const wiersz = tekst.split(/\r?\n/).find((linia) => linia.toLocaleLowerCase('pl').startsWith(`${etykieta.toLocaleLowerCase('pl')}:`))
  return wiersz?.split(':').slice(1).join(':').trim() ?? ''
}

export function serializujDaneAnkiety(dane: DaneAnkiety) {
  return JSON.stringify(dane)
}

export function deserializujDaneAnkiety(tekst: string | null): DaneAnkiety {
  const daneDomyslne = utworzDomyslneDaneAnkiety()

  if (!tekst?.trim()) return daneDomyslne

  try {
    const dane = JSON.parse(tekst) as unknown
    if (!czyRekord(dane)) throw new Error('Nieprawidłowy zapis ankiety.')
    const wariantSzablonu = normalizujWariant(dane.wariantSzablonu)
    const widocznoscDomyslna = utworzDomyslneDaneAnkiety(wariantSzablonu).widocznoscSekcji
    const widocznosc = czyRekord(dane.widocznoscSekcji) ? dane.widocznoscSekcji : {}

    return {
      wersjaSchematu: 1,
      tytulSzkolenia: pobierzTekst(dane, 'tytulSzkolenia', daneDomyslne.tytulSzkolenia),
      dataOd: pobierzTekst(dane, 'dataOd', ''),
      dataDo: pobierzTekst(dane, 'dataDo', ''),
      miejsce: pobierzTekst(dane, 'miejsce', ''),
      organizator: normalizujOrganizatora(dane.organizator),
      trener: pobierzTekst(dane, 'trener', ''),
      wariantSzablonu,
      widocznoscSekcji: {
        ocenaOgolna: typeof widocznosc.ocenaOgolna === 'boolean' ? widocznosc.ocenaOgolna : widocznoscDomyslna.ocenaOgolna,
        ocenaTrenerow: typeof widocznosc.ocenaTrenerow === 'boolean' ? widocznosc.ocenaTrenerow : widocznoscDomyslna.ocenaTrenerow,
        ocenaOrganizacji: typeof widocznosc.ocenaOrganizacji === 'boolean' ? widocznosc.ocenaOrganizacji : widocznoscDomyslna.ocenaOrganizacji,
        pytaniaOtwarte: typeof widocznosc.pytaniaOtwarte === 'boolean' ? widocznosc.pytaniaOtwarte : widocznoscDomyslna.pytaniaOtwarte,
        poleEmail: typeof widocznosc.poleEmail === 'boolean' ? widocznosc.poleEmail : widocznoscDomyslna.poleEmail,
        uwagiISugestie: typeof widocznosc.uwagiISugestie === 'boolean' ? widocznosc.uwagiISugestie : widocznoscDomyslna.uwagiISugestie,
      },
      pytaniaOceniane: normalizujPytaniaOceniane(dane.pytaniaOceniane),
      pytaniaOtwarte: normalizujPytaniaOtwarte(dane.pytaniaOtwarte),
    }
  } catch {
    const marka = odczytajPoleLegacy(tekst, 'Marka')
    const tytulSzkolenia = odczytajPoleLegacy(tekst, 'Tytuł szkolenia')
    return {
      ...daneDomyslne,
      organizator: normalizujOrganizatora(marka),
      tytulSzkolenia: tytulSzkolenia || daneDomyslne.tytulSzkolenia,
    }
  }
}

export function utworzDaneAnkietyZKontekstu(kontekst: KontekstDokumentuSzkolenia, grupaId?: string | null): DaneAnkiety {
  const dane = utworzDomyslneDaneAnkiety()
  const grupa = kontekst.grupy.find((pozycja) => pozycja.id === grupaId) ?? kontekst.grupy[0]
  const daty = grupa?.daty ?? []
  const lokalizacja = grupa?.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.adres)
  const trenerzy = grupa?.trenerzy.length ? grupa.trenerzy : kontekst.trenerzy

  return {
    ...dane,
    tytulSzkolenia: kontekst.szkolenie.tytul || dane.tytulSzkolenia,
    dataOd: daty[0] ?? '',
    dataDo: daty.at(-1) ?? '',
    miejsce: lokalizacja?.nazwa ?? lokalizacja?.adres ?? (lokalizacja?.trybOnline ? 'Online' : ''),
    organizator: normalizujOrganizatora(kontekst.organizator.marka ?? kontekst.organizator.nazwa),
    trener: trenerzy.map((trener) => trener.imieINazwisko).join(', '),
  }
}
