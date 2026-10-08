import type { LokalizacjaMapy, LokalizacjaMagazynowa, ProstokatMapy, StanZakupow, TypLokalizacjiMagazynowej } from '../modele/zakupy'
import { obliczMiarkeStanu, wyliczStanyMagazynowe } from './stanyMagazynowe'

export const typyLokalizacji: { typ: TypLokalizacjiMagazynowej; etykieta: string }[] = [
  { typ: 'OBIEKT', etykieta: 'Obiekt' }, { typ: 'STREFA', etykieta: 'Strefa' },
  { typ: 'REGAL', etykieta: 'Regał' }, { typ: 'POLKA', etykieta: 'Półka' }, { typ: 'POZYCJA', etykieta: 'Pozycja' },
]

export function pobierzSciezkeLokalizacji(lokalizacje: LokalizacjaMagazynowa[], id: string): string[] {
  const sciezka: string[] = []
  let obecna = lokalizacje.find((lokalizacja) => lokalizacja.id === id)
  while (obecna && !sciezka.includes(obecna.id)) {
    sciezka.unshift(obecna.id)
    obecna = lokalizacje.find((lokalizacja) => lokalizacja.id === obecna?.nadrzednaLokalizacjaId)
  }
  return sciezka
}

export function ograniczProstokat(prostokat: ProstokatMapy): ProstokatMapy {
  const szerokosc = Math.max(5, Math.min(100, prostokat.szerokosc))
  const wysokosc = Math.max(5, Math.min(100, prostokat.wysokosc))
  return { szerokosc, wysokosc, x: Math.max(0, Math.min(100 - szerokosc, prostokat.x)), y: Math.max(0, Math.min(100 - wysokosc, prostokat.y)) }
}

export function walidujLokalizacjeMapy(lokalizacje: LokalizacjaMapy[]): string | null {
  const identyfikatory = new Set<string>()
  const kody = new Set<string>()
  for (const lokalizacja of lokalizacje) {
    if (!lokalizacja.id || identyfikatory.has(lokalizacja.id)) return 'Identyfikatory lokalizacji muszą być unikalne.'
    identyfikatory.add(lokalizacja.id)
    const kod = lokalizacja.kod.trim().toLocaleUpperCase('pl-PL')
    if (!kod || kody.has(kod)) return 'Każda lokalizacja wymaga unikalnego kodu.'
    kody.add(kod)
    if (!lokalizacja.nazwa.trim()) return 'Każda lokalizacja wymaga nazwy.'
    const poziom = typyLokalizacji.findIndex(({ typ }) => typ === lokalizacja.typ)
    const rodzic = lokalizacje.find((obecna) => obecna.id === lokalizacja.nadrzednaLokalizacjaId)
    if (poziom < 0 || (poziom === 0 ? Boolean(lokalizacja.nadrzednaLokalizacjaId) : !rodzic || rodzic.typ !== typyLokalizacji[poziom - 1].typ)) return 'Zachowaj hierarchię: obiekt → strefa → regał → półka → pozycja.'
    if (pobierzSciezkeLokalizacji(lokalizacje, lokalizacja.id).length !== poziom + 1) return 'Hierarchia zawiera cykl lub niepełną ścieżkę.'
    const prostokat = lokalizacja.polozenieNaMapie
    if (!Object.values(prostokat).every(Number.isFinite) || prostokat.x < 0 || prostokat.y < 0 || prostokat.szerokosc < 5 || prostokat.wysokosc < 5 || prostokat.x + prostokat.szerokosc > 100 || prostokat.y + prostokat.wysokosc > 100) return 'Element mapy musi mieścić się w planie (0–100%, minimalny rozmiar 5%).'
    if (lokalizacja.zdjecie && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(lokalizacja.zdjecie) || lokalizacja.zdjecie.length > 710_000)) return 'Zdjęcie musi być lokalnym obrazem PNG, JPEG lub WebP do 512 KB.'
  }
  return null
}

export function normalizujLokalizacjeMapy(wartosci: unknown): LokalizacjaMapy[] {
  if (!Array.isArray(wartosci)) throw new Error('Nieprawidłowa lista lokalizacji.')
  const bazowe: LokalizacjaMagazynowa[] = wartosci.map((wartosc: unknown) => {
    if (!wartosc || typeof wartosc !== 'object') throw new Error('Nieprawidłowy rekord lokalizacji.')
    const dane = wartosc as Record<string, unknown>
    if (typeof dane.id !== 'string' || typeof dane.nazwa !== 'string' || typeof dane.czyAktywna !== 'boolean'
      || (dane.nadrzednaLokalizacjaId !== undefined && typeof dane.nadrzednaLokalizacjaId !== 'string')
      || ['kod', 'opis', 'zdjecie'].some((klucz) => dane[klucz] !== undefined && typeof dane[klucz] !== 'string')) throw new Error('Nieprawidłowe dane lokalizacji.')
    if (dane.typ !== undefined && !typyLokalizacji.some(({ typ }) => typ === dane.typ)) throw new Error('Nieznany typ lokalizacji.')
    if (dane.polozenieNaMapie !== undefined) {
      const prostokat = dane.polozenieNaMapie as Partial<ProstokatMapy> | null
      if (!prostokat || !['x', 'y', 'szerokosc', 'wysokosc'].every((klucz) => typeof (prostokat as Record<string, unknown>)[klucz] === 'number')) throw new Error('Nieprawidłowa geometria mapy.')
    }
    return dane as LokalizacjaMagazynowa
  })
  const lokalizacje = bazowe.map((lokalizacja, indeks) => ({
    ...lokalizacja,
    kod: lokalizacja.kod ?? `LOC-${String(indeks + 1).padStart(3, '0')}`,
    typ: lokalizacja.typ ?? typyLokalizacji[Math.min(4, pobierzSciezkeLokalizacji(bazowe, lokalizacja.id).length - 1)].typ,
    polozenieNaMapie: lokalizacja.polozenieNaMapie ?? { x: (indeks % 4) * 24, y: (Math.floor(indeks / 4) % 4) * 24, szerokosc: 20, wysokosc: 20 },
  }))
  const blad = walidujLokalizacjeMapy(lokalizacje)
  if (blad) throw new Error(blad)
  return lokalizacje
}

export function znajdzMiejscaProduktu(dane: StanZakupow, produktId: string) {
  const stanProduktu = wyliczStanyMagazynowe(dane).find((wiersz) => wiersz.produkt.id === produktId && !wiersz.wariant)
  const miejsca = stanProduktu?.lokalizacje.filter((lokalizacja) => lokalizacja.ilosc > 0) ?? []
  return { miejsca, razem: miejsca.reduce((suma, miejsce) => suma + miejsce.ilosc, 0), podswietloneId: new Set(miejsca.flatMap((miejsce) => pobierzSciezkeLokalizacji(dane.lokalizacjeMagazynowe, miejsce.id))) }
}

export const etykietyProblemow = { prawidlowy: 'Brak problemów', niski: 'Niski stan', wyczerpany: 'Produkt wyczerpany', inwentaryzacja: 'Do inwentaryzacji' } as const
export function pobierzProblemyLokalizacji(dane: StanZakupow, lokalizacjaId: string) {
  const identyfikatory = new Set(dane.lokalizacjeMagazynowe.filter((lokalizacja) => pobierzSciezkeLokalizacji(dane.lokalizacjeMagazynowe, lokalizacja.id).includes(lokalizacjaId)).map((lokalizacja) => lokalizacja.id))
  const stany = dane.stanyWLokalizacjach.filter((stan) => identyfikatory.has(stan.lokalizacjaId))
  const wiersze = wyliczStanyMagazynowe({ ...dane, stanyWLokalizacjach: stany, inwentaryzacje: dane.inwentaryzacje.filter((inwentaryzacja) => identyfikatory.has(inwentaryzacja.lokalizacjaId)) }).filter((wiersz) => stany.some((stan) => stan.produktId === wiersz.produkt.id && (!wiersz.wariant || stan.wariantProduktuId === wiersz.wariant.id)))
  const globalne = wyliczStanyMagazynowe(dane).filter((wiersz) => wiersze.some((lokalny) => lokalny.id === wiersz.id))
  const problemy: (keyof typeof etykietyProblemow)[] = []
  if (wiersze.some((wiersz) => wiersz.stan === 0)) problemy.push('wyczerpany')
  if (globalne.some((wiersz) => wiersz.stan > 0 && ((wiersz.minimum !== undefined && wiersz.stan < wiersz.minimum) || ['czerwony', 'pomaranczowy'].includes(obliczMiarkeStanu(wiersz.stan, wiersz.cel).kolor)))) problemy.push('niski')
  if (wiersze.some((wiersz) => wiersz.czyDoPrzeliczenia)) problemy.push('inwentaryzacja')
  return problemy.length ? problemy : ['prawidlowy'] as const
}
