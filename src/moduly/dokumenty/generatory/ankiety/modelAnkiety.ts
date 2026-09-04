import { WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW, normalizujBlokiSwobodneDokumentu, type BlokSwobodnyDokumentu } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'
import type { KontekstDokumentuSzkolenia } from '../../../../wspolne/integracje/szczegolyDoDokumentow'

export type WariantSzablonuAnkiety = 'ORYGINALNA_PELNA' | 'ORYGINALNA_SKROCONA' | 'NOWOCZESNA'
export type PresetAnkiety = 'ORYGINALNA_SEMPER_PELNA' | 'ORYGINALNA_IIST_PELNA' | 'ORYGINALNA_SKROCONA' | 'NOWOCZESNA_SEMPER' | 'NOWOCZESNA_IIST' | 'WLASNA'
export type OrganizatorAnkiety = 'SEMPER' | 'IIST'
export type TypPytaniaAnkiety = 'OCENA_4' | 'OTWARTE' | 'TAK_NIE_NIE_DOTYCZY' | 'JEDNA_LINIA' | 'POLE_TEKSTOWE'

export type PytanieAnkiety = { id: string; typ: TypPytaniaAnkiety; tekst: string }
export type SekcjaAnkiety = { id: string; nazwa: string; opis?: string; widoczna: boolean; pytania: PytanieAnkiety[] }
export type DaneAnkiety = {
  wersjaSchematu: 2
  tytulSzkolenia: string
  dataOd: string
  dataDo: string
  miejsce: string
  organizator: OrganizatorAnkiety
  trener: string
  preset: PresetAnkiety
  wariantSzablonu: WariantSzablonuAnkiety
  sekcje: SekcjaAnkiety[]
  blokiSwobodne: BlokSwobodnyDokumentu[]
  wersjaSchematuBlokow: typeof WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW
}
export type StronaAnkiety = { numer: number; sekcje: SekcjaAnkiety[] }

export const nazwyOrganizatorowAnkiety: Record<OrganizatorAnkiety, string> = {
  SEMPER: 'Centrum Organizacji Szkoleń i Konferencji SEMPER',
  IIST: 'Międzynarodowy Instytut Szkoleń Specjalistycznych IIST',
}
export const etykietyWariantowAnkiety: Record<WariantSzablonuAnkiety, string> = {
  ORYGINALNA_PELNA: 'Oryginalna — pełna', ORYGINALNA_SKROCONA: 'Oryginalna — skrócona', NOWOCZESNA: 'Nowoczesna',
}
export const etykietyPresetowAnkiety: Record<PresetAnkiety, string> = {
  ORYGINALNA_SEMPER_PELNA: 'Oryginalna SEMPER — pełna', ORYGINALNA_IIST_PELNA: 'Oryginalna IIST — pełna', ORYGINALNA_SKROCONA: 'Oryginalna — skrócona', NOWOCZESNA_SEMPER: 'Nowoczesna SEMPER', NOWOCZESNA_IIST: 'Nowoczesna IIST', WLASNA: 'Własna',
}
export const etykietyTypowPytanAnkiety: Record<TypPytaniaAnkiety, string> = {
  OCENA_4: 'Ocena 4-stopniowa', OTWARTE: 'Pytanie otwarte', TAK_NIE_NIE_DOTYCZY: 'TAK / NIE / NIE DOTYCZY', JEDNA_LINIA: 'Pojedyncza linia tekstu', POLE_TEKSTOWE: 'Większe pole tekstowe',
}

const ocenaOgolna: PytanieAnkiety[] = [{ id: 'ocena-ogolna-1', typ: 'OCENA_4', tekst: 'Proszę ocenić ogólny poziom Pani/Pana zadowolenia ze szkolenia.' }]
const ocenaTrenerow: PytanieAnkiety[] = [
  { id: 'ocena-trenera-1', typ: 'OCENA_4', tekst: 'Znajomość tematyki przedmiotu.' },
  { id: 'ocena-trenera-2', typ: 'OCENA_4', tekst: 'Umiejętność przekazywania wiedzy.' },
  { id: 'ocena-trenera-3', typ: 'OCENA_4', tekst: 'Utrzymanie zainteresowania słuchaczy i komunikatywność.' },
  { id: 'ocena-trenera-4', typ: 'OCENA_4', tekst: 'Różnorodność stosowanych przez trenera metod pracy.' },
  { id: 'ocena-trenera-5', typ: 'OCENA_4', tekst: 'Otwartość na dyskusje i pytania uczestników.' },
  { id: 'ocena-trenera-6', typ: 'OCENA_4', tekst: 'Utrzymywanie dobrej atmosfery.' },
]
const ocenaOrganizacji: PytanieAnkiety[] = [
  { id: 'ocena-organizacji-1', typ: 'OCENA_4', tekst: 'Proszę ocenić materiały szkoleniowe.' },
  { id: 'ocena-organizacji-2', typ: 'OCENA_4', tekst: 'Proszę ocenić punktualność, przerwy, stronę czasowo-organizacyjną szkolenia.' },
]
const otwarte: PytanieAnkiety[] = [
  { id: 'pytanie-otwarte-1', typ: 'POLE_TEKSTOWE', tekst: 'Jakie zagadnienie z warsztatu szczególnie Panią/Pana zainteresowało i dlaczego?' },
  { id: 'pytanie-otwarte-2', typ: 'POLE_TEKSTOWE', tekst: 'O jakie elementy udoskonaliłby/udoskonaliłaby Pani/Pan szkolenie i dlaczego?' },
  { id: 'pytanie-otwarte-3', typ: 'POLE_TEKSTOWE', tekst: 'Jakim tematem/terminem szkolenia jest Pani/Pan zainteresowana/y w przyszłości?' },
]
function klonujPytania(pytania: PytanieAnkiety[]) { return pytania.map((pytanie) => ({ ...pytanie })) }

export function utworzDomyslneSekcjeAnkiety(czyPelna = true): SekcjaAnkiety[] {
  return [
    { id: 'ocena-ogolna', nazwa: 'A. Ogólna ocena szkolenia', widoczna: true, pytania: klonujPytania(ocenaOgolna) },
    { id: 'ocena-trenerow', nazwa: 'B. Ocena trenerów', opis: 'Prosimy ocenić pracę osoby prowadzącej.', widoczna: true, pytania: klonujPytania(ocenaTrenerow) },
    { id: 'ocena-organizacji', nazwa: 'C. Ocena organizacji szkolenia', widoczna: true, pytania: klonujPytania(ocenaOrganizacji) },
    { id: 'pytania-otwarte', nazwa: 'Pytania otwarte', widoczna: true, pytania: klonujPytania(otwarte) },
    { id: 'email', nazwa: 'Kontakt e-mail', opis: 'Podanie adresu e-mail umożliwi otrzymywanie informacji o szkoleniach i rabatach.', widoczna: true, pytania: [{ id: 'email-1', typ: 'JEDNA_LINIA', tekst: 'e-mail (czytelnie)' }] },
    { id: 'uwagi', nazwa: 'Uwagi, sugestie', widoczna: czyPelna, pytania: [
      { id: 'uwagi-1', typ: 'POLE_TEKSTOWE', tekst: 'Uwagi, sugestie*' },
      { id: 'uwagi-2', typ: 'TAK_NIE_NIE_DOTYCZY', tekst: 'Czy ewentualne uwagi, sugestie zgłosił/a Pan/i Organizatorowi podczas szkolenia?' },
      { id: 'uwagi-3', typ: 'TAK_NIE_NIE_DOTYCZY', tekst: 'Czy Organizator zareagował i znalazł rozwiązanie dla zgłoszonych uwag, sugestii?' },
    ] },
  ]
}

function podstawaBloku(id: string, nazwa: string, xMm: number, yMm: number, szerokoscMm: number, wysokoscMm: number) {
  return { id, nazwa, rola: 'element_staly_szablonu' as const, xMm, yMm, szerokoscMm, wysokoscMm, przypisanieDoStrony: { rodzaj: 'kazda' as const }, widoczny: true, indeksWarstwy: 10, pochodzenie: 'szablon' as const, zablokowany: true }
}
export function utworzBlokiSzablonuAnkiety(wariant: WariantSzablonuAnkiety = 'ORYGINALNA_PELNA'): BlokSwobodnyDokumentu[] {
  if (wariant === 'NOWOCZESNA') return [
    { ...podstawaBloku('szablon-nowoczesny-tytul', 'Tytuł ankiety', 15, 10, 130, 18), typ: 'tekst', dane: { zrodlo: { rodzaj: 'statyczne', tekst: 'ANKIETA EWALUACYJNA' }, rozmiarCzcionkiPt: 16, gruboscCzcionki: 700, rodzinaCzcionki: 'Arial', wyrownanie: 'lewo', interlinia: 1.1, kolor: '#20242a', marginesWewnetrznyMm: 2 } },
    { ...podstawaBloku('szablon-nowoczesny-logo', 'Logo organizatora', 160, 8, 35, 20), rola: 'logo', typ: 'obraz', dane: { zrodlo: { rodzaj: 'zasob_organizatora', klucz: 'logo_organizatora' }, tekstAlternatywny: 'Logo organizatora', zachowajProporcje: true, trybDopasowania: 'contain' } },
    { ...podstawaBloku('szablon-nowoczesny-numer', 'Numer strony', 196, 11, 8, 8), typ: 'tekst', dane: { zrodlo: { rodzaj: 'pole_danych', sciezka: 'numerStrony' }, rozmiarCzcionkiPt: 8, gruboscCzcionki: 400, rodzinaCzcionki: 'Arial', wyrownanie: 'prawo', interlinia: 1, kolor: '#666666', marginesWewnetrznyMm: 1 } },
  ]
  return [1, 2].flatMap((numerStrony): BlokSwobodnyDokumentu[] => [
    { ...podstawaBloku(`szablon-numer-strony-${numerStrony}`, `Numer strony ${numerStrony}`, 10.1, 12.6, 19, 19.75), przypisanieDoStrony: { rodzaj: 'strona', numer: numerStrony }, typ: 'tekst', dane: { zrodlo: { rodzaj: 'statyczne', tekst: String(numerStrony) }, rozmiarCzcionkiPt: 11, gruboscCzcionki: 400, rodzinaCzcionki: 'Arial', wyrownanie: 'srodek', interlinia: 1, kolor: '#ffffff', marginesWewnetrznyMm: 6 } },
    { ...podstawaBloku(`szablon-tytul-${numerStrony}`, 'Tytuł ankiety', 29.1, 12.6, 118.8, 19.75), przypisanieDoStrony: { rodzaj: 'strona', numer: numerStrony }, typ: 'tekst', dane: { zrodlo: { rodzaj: 'statyczne', tekst: 'Ankieta ewaluacyjna Uczestnika szkolenia' }, rozmiarCzcionkiPt: 11.5, gruboscCzcionki: 400, rodzinaCzcionki: 'Arial', wyrownanie: 'lewo', interlinia: 1.15, kolor: '#c6534f', marginesWewnetrznyMm: 5 } },
    { ...podstawaBloku(`szablon-logo-${numerStrony}`, 'Logo organizatora', 147.9, 12.6, 52, 19.75), rola: 'logo', przypisanieDoStrony: { rodzaj: 'strona', numer: numerStrony }, typ: 'obraz', dane: { zrodlo: { rodzaj: 'zasob_organizatora', klucz: 'logo_organizatora' }, tekstAlternatywny: 'Logo organizatora', zachowajProporcje: true, trybDopasowania: 'contain' } },
  ])
}

function konfiguracjaPresetu(preset: PresetAnkiety) {
  if (preset === 'ORYGINALNA_IIST_PELNA') return { organizator: 'IIST' as const, wariant: 'ORYGINALNA_PELNA' as const, pelna: true }
  if (preset === 'ORYGINALNA_SKROCONA') return { organizator: 'SEMPER' as const, wariant: 'ORYGINALNA_SKROCONA' as const, pelna: false }
  if (preset === 'NOWOCZESNA_SEMPER') return { organizator: 'SEMPER' as const, wariant: 'NOWOCZESNA' as const, pelna: true }
  if (preset === 'NOWOCZESNA_IIST') return { organizator: 'IIST' as const, wariant: 'NOWOCZESNA' as const, pelna: true }
  return { organizator: 'SEMPER' as const, wariant: 'ORYGINALNA_PELNA' as const, pelna: true }
}
export function utworzDomyslneDaneAnkiety(preset: PresetAnkiety = 'ORYGINALNA_SEMPER_PELNA'): DaneAnkiety {
  const konfiguracja = konfiguracjaPresetu(preset)
  return { wersjaSchematu: 2, tytulSzkolenia: 'Skuteczna komunikacja w zespole', dataOd: '', dataDo: '', miejsce: '', organizator: konfiguracja.organizator, trener: '', preset, wariantSzablonu: konfiguracja.wariant, sekcje: utworzDomyslneSekcjeAnkiety(konfiguracja.pelna), blokiSwobodne: utworzBlokiSzablonuAnkiety(konfiguracja.wariant), wersjaSchematuBlokow: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW }
}
export function zastosujPresetAnkiety(dane: DaneAnkiety, preset: PresetAnkiety): DaneAnkiety {
  if (preset === 'WLASNA') return { ...dane, preset: 'WLASNA', sekcje: dane.sekcje.map((sekcja) => ({ ...sekcja, pytania: klonujPytania(sekcja.pytania) })) }
  const domyslne = utworzDomyslneDaneAnkiety(preset)
  return { ...dane, preset, organizator: domyslne.organizator, wariantSzablonu: domyslne.wariantSzablonu, sekcje: domyslne.sekcje, blokiSwobodne: domyslne.blokiSwobodne }
}
export function formatujZakresDatAnkiety(dataOd: string, dataDo: string) {
  if (!dataOd && !dataDo) return ''
  if (!dataDo || dataOd === dataDo) return dataOd
  if (!dataOd) return dataDo
  return `${dataOd} do ${dataDo}`
}

function kosztPytania(pytanie: PytanieAnkiety) {
  if (pytanie.typ === 'POLE_TEKSTOWE' || pytanie.typ === 'OTWARTE') return 5
  if (pytanie.typ === 'TAK_NIE_NIE_DOTYCZY' || pytanie.typ === 'JEDNA_LINIA') return 3
  return 1.5
}
export function podzielAnkieteNaStrony(dane: DaneAnkiety): StronaAnkiety[] {
  const widoczne = dane.sekcje.filter((sekcja) => sekcja.widoczna && sekcja.pytania.length)
  if (dane.wariantSzablonu !== 'NOWOCZESNA' && dane.preset !== 'WLASNA') return [
    { numer: 1, sekcje: widoczne.filter((sekcja) => ['ocena-ogolna', 'ocena-trenerow', 'ocena-organizacji'].includes(sekcja.id)) },
    { numer: 2, sekcje: widoczne.filter((sekcja) => !['ocena-ogolna', 'ocena-trenerow', 'ocena-organizacji'].includes(sekcja.id)) },
  ]
  const strony: StronaAnkiety[] = [{ numer: 1, sekcje: [] }]
  let kosztStrony = 0
  for (const sekcja of widoczne) {
    let fragment: SekcjaAnkiety = { ...sekcja, pytania: [] }
    for (const pytanie of sekcja.pytania) {
      const limit = strony.length === 1 ? 24 : 38
      const koszt = kosztPytania(pytanie)
      const kosztNaglowka = fragment.pytania.length ? 0 : 2
      if (kosztStrony + kosztNaglowka + koszt > limit && strony.at(-1)!.sekcje.length) {
        strony.push({ numer: strony.length + 1, sekcje: [] }); kosztStrony = 0
        fragment = { ...sekcja, id: `${sekcja.id}-kontynuacja-${strony.length}`, nazwa: `${sekcja.nazwa} — ciąg dalszy`, pytania: [] }
      }
      if (!fragment.pytania.length) { strony.at(-1)!.sekcje.push(fragment); kosztStrony += 2 }
      fragment.pytania.push(pytanie); kosztStrony += koszt
    }
  }
  return strony
}

function czyRekord(wartosc: unknown): wartosc is Record<string, unknown> { return Boolean(wartosc) && typeof wartosc === 'object' && !Array.isArray(wartosc) }
function tekst(rekord: Record<string, unknown>, klucz: string, domyslny = '') { return typeof rekord[klucz] === 'string' ? rekord[klucz] : domyslny }
function normalizujOrganizatora(wartosc: unknown): OrganizatorAnkiety { return typeof wartosc === 'string' && wartosc.toUpperCase().includes('IIST') ? 'IIST' : 'SEMPER' }
function normalizujWariant(wartosc: unknown): WariantSzablonuAnkiety { if (wartosc === 'NOWOCZESNA') return 'NOWOCZESNA'; return wartosc === 'ORYGINALNA_SKROCONA' ? 'ORYGINALNA_SKROCONA' : 'ORYGINALNA_PELNA' }
function normalizujPreset(wartosc: unknown, wariant: WariantSzablonuAnkiety, organizator: OrganizatorAnkiety): PresetAnkiety {
  if (typeof wartosc === 'string' && wartosc in etykietyPresetowAnkiety) return wartosc as PresetAnkiety
  if (wariant === 'NOWOCZESNA') return organizator === 'IIST' ? 'NOWOCZESNA_IIST' : 'NOWOCZESNA_SEMPER'
  if (wariant === 'ORYGINALNA_SKROCONA') return 'ORYGINALNA_SKROCONA'
  return organizator === 'IIST' ? 'ORYGINALNA_IIST_PELNA' : 'ORYGINALNA_SEMPER_PELNA'
}
function normalizujSekcje(wartosc: unknown, legacy: Record<string, unknown>, czyPelna: boolean) {
  if (Array.isArray(wartosc)) {
    const sekcje = wartosc.flatMap((sekcja, indeks): SekcjaAnkiety[] => {
      if (!czyRekord(sekcja) || !Array.isArray(sekcja.pytania)) return []
      const pytania = sekcja.pytania.flatMap((pytanie, indeksPytania): PytanieAnkiety[] => {
        if (!czyRekord(pytanie) || typeof pytanie.tekst !== 'string') return []
        const typ = typeof pytanie.typ === 'string' && pytanie.typ in etykietyTypowPytanAnkiety ? pytanie.typ as TypPytaniaAnkiety : 'POLE_TEKSTOWE'
        return [{ id: tekst(pytanie, 'id', `pytanie-${indeks}-${indeksPytania}`), typ, tekst: pytanie.tekst }]
      })
      return [{ id: tekst(sekcja, 'id', `sekcja-${indeks}`), nazwa: tekst(sekcja, 'nazwa', `Sekcja ${indeks + 1}`), ...(typeof sekcja.opis === 'string' && sekcja.opis ? { opis: sekcja.opis } : {}), widoczna: sekcja.widoczna !== false, pytania }]
    })
    if (sekcje.length) return sekcje
  }
  const sekcje = utworzDomyslneSekcjeAnkiety(czyPelna)
  const oceniane = Array.isArray(legacy.pytaniaOceniane) ? legacy.pytaniaOceniane : []
  for (const sekcja of sekcje.slice(0, 3)) {
    const symbol = sekcja.id === 'ocena-ogolna' ? 'A' : sekcja.id === 'ocena-trenerow' ? 'B' : 'C'
    const pytania = oceniane.flatMap((pytanie, indeks): PytanieAnkiety[] => czyRekord(pytanie) && pytanie.sekcja === symbol && typeof pytanie.tekst === 'string' ? [{ id: tekst(pytanie, 'id', `legacy-${symbol}-${indeks}`), typ: 'OCENA_4', tekst: pytanie.tekst }] : [])
    if (pytania.length) sekcja.pytania = pytania
  }
  if (Array.isArray(legacy.pytaniaOtwarte)) {
    const pytania = legacy.pytaniaOtwarte.flatMap((pytanie, indeks): PytanieAnkiety[] => czyRekord(pytanie) && typeof pytanie.tekst === 'string' ? [{ id: tekst(pytanie, 'id', `legacy-otwarte-${indeks}`), typ: 'POLE_TEKSTOWE', tekst: pytanie.tekst }] : [])
    if (pytania.length) sekcje[3].pytania = pytania
  }
  const widocznosc = czyRekord(legacy.widocznoscSekcji) ? legacy.widocznoscSekcji : {}
  ;['ocenaOgolna', 'ocenaTrenerow', 'ocenaOrganizacji', 'pytaniaOtwarte', 'poleEmail', 'uwagiISugestie'].forEach((klucz, indeks) => { if (typeof widocznosc[klucz] === 'boolean') sekcje[indeks].widoczna = widocznosc[klucz] as boolean })
  return sekcje
}
function odczytajPoleLegacy(zapis: string, etykieta: string) { return zapis.split(/\r?\n/).find((linia) => linia.toLocaleLowerCase('pl').startsWith(`${etykieta.toLocaleLowerCase('pl')}:`))?.split(':').slice(1).join(':').trim() ?? '' }
export function serializujDaneAnkiety(dane: DaneAnkiety) { return JSON.stringify(dane) }
export function deserializujDaneAnkiety(zapis: string | null): DaneAnkiety {
  const domyslne = utworzDomyslneDaneAnkiety()
  if (!zapis?.trim()) return domyslne
  try {
    const rekord = JSON.parse(zapis) as unknown
    if (!czyRekord(rekord)) throw new Error('Nieprawidłowy zapis ankiety.')
    const organizator = normalizujOrganizatora(rekord.organizator)
    const wariantSzablonu = normalizujWariant(rekord.wariantSzablonu)
    const preset = normalizujPreset(rekord.preset, wariantSzablonu, organizator)
    const bloki = normalizujBlokiSwobodneDokumentu(rekord.blokiSwobodne)
    return { wersjaSchematu: 2, tytulSzkolenia: tekst(rekord, 'tytulSzkolenia', domyslne.tytulSzkolenia), dataOd: tekst(rekord, 'dataOd'), dataDo: tekst(rekord, 'dataDo'), miejsce: tekst(rekord, 'miejsce'), organizator, trener: tekst(rekord, 'trener'), preset, wariantSzablonu, sekcje: normalizujSekcje(rekord.sekcje, rekord, wariantSzablonu !== 'ORYGINALNA_SKROCONA'), blokiSwobodne: bloki.length ? bloki : utworzBlokiSzablonuAnkiety(wariantSzablonu), wersjaSchematuBlokow: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW }
  } catch {
    return { ...domyslne, organizator: normalizujOrganizatora(odczytajPoleLegacy(zapis, 'Marka')), tytulSzkolenia: odczytajPoleLegacy(zapis, 'Tytuł szkolenia') || domyslne.tytulSzkolenia }
  }
}
export function utworzDaneAnkietyZKontekstu(kontekst: KontekstDokumentuSzkolenia, grupaId?: string | null): DaneAnkiety {
  const organizator = normalizujOrganizatora(kontekst.organizator.marka ?? kontekst.organizator.nazwa)
  const dane = utworzDomyslneDaneAnkiety(organizator === 'IIST' ? 'ORYGINALNA_IIST_PELNA' : 'ORYGINALNA_SEMPER_PELNA')
  const grupa = kontekst.grupy.find((pozycja) => pozycja.id === grupaId) ?? kontekst.grupy[0]
  const daty = grupa?.daty ?? []
  const lokalizacja = grupa?.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.adres)
  const trenerzy = grupa?.trenerzy.length ? grupa.trenerzy : kontekst.trenerzy
  return { ...dane, tytulSzkolenia: kontekst.szkolenie.tytul || dane.tytulSzkolenia, dataOd: daty[0] ?? '', dataDo: daty.at(-1) ?? '', miejsce: lokalizacja?.nazwa ?? lokalizacja?.adres ?? (lokalizacja?.trybOnline ? 'Online' : ''), organizator, trener: trenerzy.map((trener) => trener.imieINazwisko).join(', ') }
}
