import type { BlokDokumentu, DokumentBlokowy } from '../../../wspolne/dokumenty/modelBlokowy'
import type { PlaceholderReplikatora, RodzajPlaceholderaReplikatora } from './typyReplikatora'

const wzorzecDaty = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/
const wzorzecCeny = /\b\d+(?:[,.]\d{2})?\s?(?:zł|PLN|EUR)\b/i
const wzorzecLiczby = /\b\d{2,}\b/

function splaszczBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
  return bloki.flatMap((blok) => [blok, ...splaszczBloki(blok.dzieci)])
}

function normalizuj(tekst: string) {
  return tekst
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function utworzPlaceholder(
  blok: BlokDokumentu,
  nazwa: string,
  etykieta: string,
  rodzaj: RodzajPlaceholderaReplikatora,
  powiazanie: PlaceholderReplikatora['powiazanie'],
): PlaceholderReplikatora {
  return {
    id: `placeholder-${blok.id}-${nazwa.replace(/[^a-z0-9_.-]/gi, '-')}`,
    nazwa,
    etykieta,
    rodzaj,
    status: 'propozycja',
    powiazanie,
    blokId: blok.id,
    wartoscZrodlowa: blok.tresc,
  }
}

function rozpoznajPlaceholderyBloku(blok: BlokDokumentu): PlaceholderReplikatora[] {
  const tresc = blok.tresc?.trim() ?? ''
  const tekst = normalizuj(tresc)
  const placeholdery: PlaceholderReplikatora[] = []

  if (!tresc || blok.typ === 'ElementNieobslugiwany') {
    return placeholdery
  }

  if (tekst.includes('szkolenie:') || tekst.includes('tytul szkolenia')) {
    placeholdery.push(utworzPlaceholder(blok, 'szkolenie.tytul', 'Tytuł szkolenia', 'tekst', 'generator_szczegolow'))
  }

  if (tekst.includes('data') || wzorzecDaty.test(tresc)) {
    placeholdery.push(utworzPlaceholder(blok, 'szkolenie.data', 'Data', 'data', 'generator_szczegolow'))
  }

  if (tekst.includes('trener')) {
    placeholdery.push(utworzPlaceholder(blok, 'szkolenie.trener', 'Trener', 'trener', 'generator_szczegolow'))
  }

  if (tekst.includes('klient')) {
    placeholdery.push(utworzPlaceholder(blok, 'szkolenie.klient', 'Klient', 'klient', 'generator_szczegolow'))
  }

  if (tekst.includes('organizator')) {
    placeholdery.push(utworzPlaceholder(blok, 'szkolenie.organizator', 'Organizator', 'organizator', 'generator_szczegolow'))
  }

  if (tekst.includes('miejsce') || tekst.includes('lokalizacja')) {
    placeholdery.push(utworzPlaceholder(blok, 'szkolenie.miejsce', 'Lokalizacja', 'lokalizacja', 'generator_szczegolow'))
  }

  if (wzorzecCeny.test(tresc)) {
    placeholdery.push(utworzPlaceholder(blok, 'rozliczenie.cena', 'Cena', 'cena', 'niezalezne'))
  }

  if (tekst.includes('imie i nazwisko') || tekst.includes('uczestnik')) {
    placeholdery.push(utworzPlaceholder(blok, 'uczestnik.imie_nazwisko', 'Osoba', 'osoba', 'niezalezne'))
  }

  if (!placeholdery.length && blok.typ === 'PoleZmienne') {
    placeholdery.push(utworzPlaceholder(blok, `pole.${blok.id}`, 'Pole zmienne', wzorzecLiczby.test(tresc) ? 'liczba' : 'tekst', 'niezalezne'))
  }

  return placeholdery
}

export function wykryjPlaceholderyReplikatora(dokument: DokumentBlokowy): PlaceholderReplikatora[] {
  const unikalne = new Map<string, PlaceholderReplikatora>()

  splaszczBloki(dokument.struktura).forEach((blok) => {
    rozpoznajPlaceholderyBloku(blok).forEach((placeholder) => {
      unikalne.set(`${placeholder.blokId}-${placeholder.nazwa}`, placeholder)
    })
  })

  return Array.from(unikalne.values())
}

export function czyPlaceholderySaZatwierdzone(placeholdery: PlaceholderReplikatora[]) {
  return placeholdery.every((placeholder) => placeholder.status !== 'propozycja')
}

export function polaczStatusyPlaceholderow(
  nowePlaceholdery: PlaceholderReplikatora[],
  obecnePlaceholdery: PlaceholderReplikatora[],
) {
  const obecne = new Map(obecnePlaceholdery.map((placeholder) => [`${placeholder.blokId}-${placeholder.nazwa}`, placeholder]))

  return nowePlaceholdery.map((placeholder) => {
    const zapisany = obecne.get(`${placeholder.blokId}-${placeholder.nazwa}`)
    return zapisany ? { ...placeholder, status: zapisany.status } : placeholder
  })
}
