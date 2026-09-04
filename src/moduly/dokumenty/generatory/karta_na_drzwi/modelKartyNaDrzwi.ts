import { WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW, normalizujBlokiSwobodneDokumentu, type BlokSwobodnyDokumentu } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'
import type { KontekstDokumentuSzkolenia } from '../../../../wspolne/integracje/szczegolyDoDokumentow'

export type OrientacjaKartyNaDrzwi = 'pozioma' | 'pionowa'

export type DaneKartyNaDrzwi = {
  wersjaSchematu: 2
  daneWejsciowe: string
  orientacja: OrientacjaKartyNaDrzwi
  blokiSwobodne: BlokSwobodnyDokumentu[]
  wersjaSchematuBlokow: number
  szczegolyOrganizacyjneId: string | null
  grupaId: string | null
}

export const tekstPrzykladowyKartyNaDrzwi = `Tytuł szkolenia: Skuteczna komunikacja w zespole
Data: 2026-07-15
Miejsce: Sala szkoleniowa A
Ekspert merytoryczny: Jan Nowak
Opiekun szkolenia: Anna Kowalska
Telefon opiekuna: +48 501 234 567
Organizator: SEMPER
Marka: SEMPER
Dodatkowy tekst: Zapraszamy uczestników szkolenia`

function blokTekstu(id: string, nazwa: string, sciezka: string, xMm: number, yMm: number, szerokoscMm: number, wysokoscMm: number, rozmiarCzcionkiPt: number): BlokSwobodnyDokumentu {
  return {
    id,
    nazwa,
    rola: 'element_staly_szablonu',
    typ: 'tekst',
    pochodzenie: 'szablon',
    zablokowany: false,
    xMm,
    yMm,
    szerokoscMm,
    wysokoscMm,
    przypisanieDoStrony: { rodzaj: 'pierwsza' },
    widoczny: true,
    indeksWarstwy: 2,
    dane: { zrodlo: { rodzaj: 'pole_danych', sciezka, tekstZastepczy: nazwa }, rozmiarCzcionkiPt, gruboscCzcionki: 700, rodzinaCzcionki: 'Arial', wyrownanie: 'srodek', interlinia: 1.15, kolor: '#172033', marginesWewnetrznyMm: 1 },
  }
}

export function utworzBlokiSzablonuKartyNaDrzwi(orientacja: OrientacjaKartyNaDrzwi): BlokSwobodnyDokumentu[] {
  const pozioma = orientacja === 'pozioma'
  const szerokosc = pozioma ? 297 : 210
  return [
    { id: 'logo', nazwa: 'Logo', rola: 'logo', typ: 'obraz', pochodzenie: 'szablon', zablokowany: false, xMm: szerokosc - 48, yMm: 12, szerokoscMm: 34, wysokoscMm: 20, przypisanieDoStrony: { rodzaj: 'pierwsza' }, widoczny: true, indeksWarstwy: 3, dane: { zrodlo: { rodzaj: 'zasob_organizatora', klucz: 'logo_organizatora' }, tekstAlternatywny: 'Logo organizatora', zachowajProporcje: true, trybDopasowania: 'contain' } },
    blokTekstu('tytul', 'Tytuł szkolenia', 'tytulSzkolenia', 16, pozioma ? 55 : 65, szerokosc - 32, pozioma ? 28 : 32, pozioma ? 24 : 21),
    blokTekstu('termin', 'Termin', 'termin', 16, pozioma ? 94 : 112, szerokosc - 32, 14, 13),
    blokTekstu('miejsce', 'Miejsce / sala', 'miejsce', 16, pozioma ? 116 : 137, szerokosc - 32, 14, 13),
    blokTekstu('dodatkowy-tekst', 'Dodatkowy tekst', 'dodatkowyTekst', 16, pozioma ? 150 : 178, szerokosc - 32, pozioma ? 25 : 34, 11),
    blokTekstu('organizator', 'Organizator', 'organizator', 16, pozioma ? 190 : 258, szerokosc - 32, 10, 9),
  ]
}

export function utworzDomyslneDaneKartyNaDrzwi(): DaneKartyNaDrzwi {
  const orientacja = 'pozioma' as const
  return { wersjaSchematu: 2, daneWejsciowe: tekstPrzykladowyKartyNaDrzwi, orientacja, blokiSwobodne: utworzBlokiSzablonuKartyNaDrzwi(orientacja), wersjaSchematuBlokow: WERSJA_SCHEMATU_SWOBODNYCH_BLOKOW, szczegolyOrganizacyjneId: null, grupaId: null }
}

export function utworzDaneKartyNaDrzwiZKontekstu(kontekst: KontekstDokumentuSzkolenia, grupaId: string, opiekun = ''): DaneKartyNaDrzwi | null {
  const grupa = kontekst.grupy.find((pozycja) => pozycja.id === grupaId)
  if (!grupa) return null
  const lokalizacja = grupa.lokalizacje.find((pozycja) => pozycja.nazwa || pozycja.sala || pozycja.adres || pozycja.trybOnline)
  const miejsce = [lokalizacja?.nazwa, lokalizacja?.sala, lokalizacja?.adres].filter(Boolean).join(', ') || (lokalizacja?.trybOnline ? 'Online' : '')
  const organizator = kontekst.organizator.marka || kontekst.organizator.nazwa || 'SEMPER'
  const trenerzy = grupa.trenerzy.map((trener) => trener.imieINazwisko).join(', ')
  const dodatkowyTekst = [trenerzy ? `Ekspert: ${trenerzy}` : '', opiekun ? `Opiekun: ${opiekun}` : ''].filter(Boolean).join('\n')
  const dane = utworzDomyslneDaneKartyNaDrzwi()
  return {
    ...dane,
    szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId,
    grupaId,
    daneWejsciowe: [
      `Tytuł szkolenia: ${kontekst.szkolenie.tytul}`,
      `Data: ${grupa.daty.join(', ')}`,
      `Miejsce: ${miejsce}`,
      `Ekspert merytoryczny: ${trenerzy}`,
      `Opiekun szkolenia: ${opiekun}`,
      `Organizator: ${organizator}`,
      `Marka: ${organizator}`,
      `Dodatkowy tekst: ${dodatkowyTekst}`,
    ].join('\n'),
  }
}

export function serializujDaneKartyNaDrzwi(dane: DaneKartyNaDrzwi) {
  return JSON.stringify(dane)
}

export function deserializujDaneKartyNaDrzwi(zapis: string | null): DaneKartyNaDrzwi {
  const domyslne = utworzDomyslneDaneKartyNaDrzwi()
  if (!zapis?.trim()) return domyslne
  try {
    const rekord = JSON.parse(zapis) as Record<string, unknown>
    if (!rekord || typeof rekord !== 'object' || Array.isArray(rekord)) return { ...domyslne, daneWejsciowe: zapis }
    const orientacja = rekord.orientacja === 'pionowa' ? 'pionowa' : 'pozioma'
    const bloki = normalizujBlokiSwobodneDokumentu(rekord.blokiSwobodne)
    return {
      ...domyslne,
      daneWejsciowe: typeof rekord.daneWejsciowe === 'string' ? rekord.daneWejsciowe : domyslne.daneWejsciowe,
      orientacja,
      blokiSwobodne: bloki.length ? bloki : utworzBlokiSzablonuKartyNaDrzwi(orientacja),
      szczegolyOrganizacyjneId: typeof rekord.szczegolyOrganizacyjneId === 'string' ? rekord.szczegolyOrganizacyjneId : null,
      grupaId: typeof rekord.grupaId === 'string' ? rekord.grupaId : null,
    }
  } catch {
    return { ...domyslne, daneWejsciowe: zapis }
  }
}

export function pobierzDaneKartyNaDrzwi(tekst: string) {
  const pobierz = (etykieta: string) => tekst.split('\n').find((wiersz) => wiersz.toLocaleLowerCase('pl').startsWith(`${etykieta.toLocaleLowerCase('pl')}:`))?.split(':').slice(1).join(':').trim() ?? ''
  const ekspert = pobierz('Ekspert merytoryczny')
  const opiekun = pobierz('Opiekun szkolenia')
  const telefon = pobierz('Telefon opiekuna')
  const marka = pobierz('Marka') || pobierz('Organizator') || 'SEMPER'
  return {
    tytulSzkolenia: pobierz('Tytuł szkolenia') || 'Tytuł szkolenia',
    termin: pobierz('Data') || 'Termin szkolenia',
    miejsce: pobierz('Miejsce') || 'Miejsce / sala',
    dodatkowyTekst: pobierz('Dodatkowy tekst') || [ekspert && `Ekspert: ${ekspert}`, opiekun && `Opiekun: ${opiekun}`, telefon].filter(Boolean).join('\n'),
    organizator: pobierz('Organizator') || marka,
    marka,
  }
}
