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
    const kod = lokalizacja.kod
    const kluczKodu = JSON.stringify([lokalizacja.nadrzednaLokalizacjaId ?? null, kod])
    if (!kod || kod !== normalizujKodLokalizacji(kod) || kody.has(kluczKodu)) return 'Kod musi być unikalny w obrębie rodzica i zawierać wielkie litery, cyfry lub myślniki.'
    kody.add(kluczKodu)
    if (!lokalizacja.nazwa.trim()) return 'Każda lokalizacja wymaga nazwy.'
    const rodzic = lokalizacje.find((obecna) => obecna.id === lokalizacja.nadrzednaLokalizacjaId)
    if (!typyLokalizacji.some(({ typ }) => typ === lokalizacja.typ)) return 'Nieznany typ lokalizacji.'
    if (lokalizacja.nadrzednaLokalizacjaId !== undefined && !rodzic) return `Brak rodzica lokalizacji: ${lokalizacja.nazwa}.`
    const odwiedzone = new Set([lokalizacja.id])
    let przodek = rodzic
    while (przodek) {
      if (odwiedzone.has(przodek.id)) return 'Hierarchia zawiera cykl. Nie przenoś lokalizacji do jej potomka.'
      odwiedzone.add(przodek.id)
      przodek = lokalizacje.find((obecna) => obecna.id === przodek?.nadrzednaLokalizacjaId)
    }
    if (!Number.isInteger(lokalizacja.kolejnosc) || lokalizacja.kolejnosc < 0) return 'Kolejność musi być nieujemną liczbą całkowitą.'
    const prostokat = lokalizacja.polozenieNaMapie
    if (prostokat && (!Object.values(prostokat).every(Number.isFinite) || prostokat.x < 0 || prostokat.y < 0 || prostokat.szerokosc < 5 || prostokat.wysokosc < 5 || prostokat.x + prostokat.szerokosc > 100 || prostokat.y + prostokat.wysokosc > 100)) return 'Element mapy musi mieścić się w planie (0–100%, minimalny rozmiar 5%).'
    if (lokalizacja.zdjecie && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(lokalizacja.zdjecie) || lokalizacja.zdjecie.length > 710_000)) return 'Zdjęcie musi być lokalnym obrazem PNG, JPEG lub WebP do 512 KB.'
  }
  return null
}

export function normalizujKodLokalizacji(kod: string): string {
  return kod.replaceAll('ł', 'l').replaceAll('Ł', 'L').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Wersja 1 zachowuje dotychczasowe reguły i domyślny układ podczas odczytu starszych zapisów.
export function normalizujLokalizacjeMapy(wartosci: unknown, wersja: 1 | 2 = 1): LokalizacjaMapy[] {
  if (!Array.isArray(wartosci)) throw new Error('Nieprawidłowa lista lokalizacji.')
  const bazowe: LokalizacjaMagazynowa[] = wartosci.map((wartosc: unknown) => {
    if (!wartosc || typeof wartosc !== 'object') throw new Error('Nieprawidłowy rekord lokalizacji.')
    const dane = wartosc as Record<string, unknown>
    if (typeof dane.id !== 'string' || typeof dane.nazwa !== 'string' || typeof dane.czyAktywna !== 'boolean'
      || (dane.nadrzednaLokalizacjaId !== undefined && typeof dane.nadrzednaLokalizacjaId !== 'string')
      || ['kod', 'opis', 'zdjecie'].some((klucz) => dane[klucz] !== undefined && typeof dane[klucz] !== 'string')
      || (dane.kolejnosc !== undefined && (typeof dane.kolejnosc !== 'number' || !Number.isInteger(dane.kolejnosc) || dane.kolejnosc < 0))) throw new Error('Nieprawidłowe dane lokalizacji.')
    if (dane.typ !== undefined && !typyLokalizacji.some(({ typ }) => typ === dane.typ)) throw new Error('Nieznany typ lokalizacji.')
    if (dane.polozenieNaMapie !== undefined) {
      const prostokat = dane.polozenieNaMapie as Partial<ProstokatMapy> | null
      if (!prostokat || !['x', 'y', 'szerokosc', 'wysokosc'].every((klucz) => typeof (prostokat as Record<string, unknown>)[klucz] === 'number')) throw new Error('Nieprawidłowa geometria mapy.')
    }
    return dane as LokalizacjaMagazynowa
  })
  if (wersja === 1) {
    const kody = new Set<string>()
    for (const lokalizacja of bazowe) {
      const poziom = Math.min(4, pobierzSciezkeLokalizacji(bazowe, lokalizacja.id).length - 1)
      if (lokalizacja.typ && lokalizacja.typ !== typyLokalizacji[poziom].typ) throw new Error('Konflikt poziomu w starszej hierarchii. Zachowano zapis źródłowy.')
      if (lokalizacja.kod !== undefined) {
        const kod = normalizujKodLokalizacji(lokalizacja.kod)
        if (!kod || kody.has(kod)) throw new Error('Konflikt kodów w starszym zapisie. Zachowano zapis źródłowy.')
        kody.add(kod)
      }
    }
  }
  const lokalizacje: LokalizacjaMapy[] = bazowe.map((lokalizacja, indeks) => ({
    ...lokalizacja,
    kod: normalizujKodLokalizacji(lokalizacja.kod ?? `LOC-${String(indeks + 1).padStart(3, '0')}`),
    pelnyKod: '',
    kolejnosc: lokalizacja.kolejnosc ?? indeks,
    typ: lokalizacja.typ ?? typyLokalizacji[Math.min(4, pobierzSciezkeLokalizacji(bazowe, lokalizacja.id).length - 1)].typ,
    polozenieNaMapie: lokalizacja.polozenieNaMapie ?? (wersja === 1 ? { x: (indeks % 4) * 24, y: (Math.floor(indeks / 4) % 4) * 24, szerokosc: 20, wysokosc: 20 } : undefined),
  }))
  const blad = walidujLokalizacjeMapy(lokalizacje)
  if (blad) throw new Error(blad)
  const wedlugId = new Map(lokalizacje.map((lokalizacja) => [lokalizacja.id, lokalizacja]))
  return lokalizacje.map((lokalizacja) => ({ ...lokalizacja, pelnyKod: pobierzSciezkeLokalizacji(lokalizacje, lokalizacja.id).map((id) => wedlugId.get(id)!.kod).join('/') }))
}

export function wyszukajLokalizacje(lokalizacje: LokalizacjaMapy[], fraza: string): LokalizacjaMapy[] {
  const szukana = normalizujKodLokalizacji(fraza)
  return lokalizacje.filter((lokalizacja) => [lokalizacja.nazwa, lokalizacja.kod, lokalizacja.pelnyKod].some((tekst) => normalizujKodLokalizacji(tekst).includes(szukana)))
}

export function uporzadkujLokalizacje(lokalizacje: LokalizacjaMapy[]): LokalizacjaMapy[] {
  return [...lokalizacje].sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc || pierwsza.kod.localeCompare(druga.kod, 'pl'))
}

export function zmienKolejnoscLokalizacji(lokalizacje: LokalizacjaMapy[], id: string, kierunek: -1 | 1): LokalizacjaMapy[] {
  const wybrana = lokalizacje.find((lokalizacja) => lokalizacja.id === id)
  if (!wybrana) throw new Error('Nie znaleziono lokalizacji.')
  const rodzenstwo = uporzadkujLokalizacje(lokalizacje.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === wybrana.nadrzednaLokalizacjaId))
  const indeks = rodzenstwo.findIndex((lokalizacja) => lokalizacja.id === id)
  const docelowy = indeks + kierunek
  if (docelowy < 0 || docelowy >= rodzenstwo.length) return lokalizacje
  const zamieniana = rodzenstwo[docelowy]
  rodzenstwo[docelowy] = rodzenstwo[indeks]
  rodzenstwo[indeks] = zamieniana
  const kolejnosc = new Map(rodzenstwo.map((lokalizacja, indeks) => [lokalizacja.id, indeks]))
  return normalizujLokalizacjeMapy(lokalizacje.map((lokalizacja) => ({ ...lokalizacja, kolejnosc: kolejnosc.get(lokalizacja.id) ?? lokalizacja.kolejnosc })), 2)
}

export type NowaStrukturaLokalizacji = {
  nazwa: string; kod: string; typ: TypLokalizacjiMagazynowej; rodzicId?: string; liczbaPolek: number; czyNaMapie: boolean
}

export function dodajPolki(lokalizacje: LokalizacjaMapy[], rodzicId: string, liczba: number): LokalizacjaMapy[] {
  if (!Number.isInteger(liczba) || liczba < 1 || liczba > 500) throw new Error('Podaj od 1 do 500 półek.')
  if (!lokalizacje.some((lokalizacja) => lokalizacja.id === rodzicId)) throw new Error('Nie znaleziono rodzica.')
  const nowe: LokalizacjaMagazynowa[] = []
  const rodzenstwo = lokalizacje.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === rodzicId)
  let numer = 1
  for (let indeks = 0; indeks < liczba; indeks++) {
    while ([...rodzenstwo, ...nowe].some((lokalizacja) => lokalizacja.kod === `POLKA-${numer}`)) numer++
    nowe.push({ id: crypto.randomUUID(), nazwa: `Półka ${numer}`, kod: `POLKA-${numer}`, typ: 'POLKA', nadrzednaLokalizacjaId: rodzicId, kolejnosc: Math.max(-1, ...rodzenstwo.map((lokalizacja) => lokalizacja.kolejnosc)) + indeks + 1, czyAktywna: true })
    numer++
  }
  return normalizujLokalizacjeMapy([...lokalizacje, ...nowe], 2)
}

export function utworzStruktureLokalizacji(lokalizacje: LokalizacjaMapy[], dane: NowaStrukturaLokalizacji): { lokalizacje: LokalizacjaMapy[]; id: string } {
  if (!Number.isInteger(dane.liczbaPolek) || dane.liczbaPolek < 0 || dane.liczbaPolek > 500) throw new Error('Podaj od 0 do 500 półek.')
  const id = crypto.randomUUID()
  const rodzenstwo = lokalizacje.filter((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === dane.rodzicId)
  let wynik = normalizujLokalizacjeMapy([...lokalizacje, { id, nazwa: dane.nazwa, kod: dane.kod, typ: dane.typ, nadrzednaLokalizacjaId: dane.rodzicId, czyAktywna: true, kolejnosc: Math.max(-1, ...rodzenstwo.map((lokalizacja) => lokalizacja.kolejnosc)) + 1, polozenieNaMapie: dane.czyNaMapie ? { x: 5, y: 5, szerokosc: 25, wysokosc: 20 } : undefined }], 2)
  if (dane.liczbaPolek) wynik = dodajPolki(wynik, id, dane.liczbaPolek)
  return { lokalizacje: wynik, id }
}

export function przeniesLokalizacje(lokalizacje: LokalizacjaMapy[], id: string, rodzicId?: string): LokalizacjaMapy[] {
  if (!lokalizacje.some((lokalizacja) => lokalizacja.id === id)) throw new Error('Nie znaleziono lokalizacji.')
  // Geometria pozostaje niezależna od adresu, a wszystkie referencje używają stabilnego ID.
  return normalizujLokalizacjeMapy(lokalizacje.map((lokalizacja) => lokalizacja.id === id ? { ...lokalizacja, nadrzednaLokalizacjaId: rodzicId } : lokalizacja), 2)
}

export function duplikujStruktureLokalizacji(lokalizacje: LokalizacjaMapy[], id: string): { lokalizacje: LokalizacjaMapy[]; id: string } {
  const zrodlo = lokalizacje.find((lokalizacja) => lokalizacja.id === id)
  if (!zrodlo) throw new Error('Nie znaleziono lokalizacji.')
  const galaz = lokalizacje.filter((lokalizacja) => pobierzSciezkeLokalizacji(lokalizacje, lokalizacja.id).includes(id))
  const noweId = new Map(galaz.map((lokalizacja) => [lokalizacja.id, crypto.randomUUID()]))
  let numer = 1
  while (lokalizacje.some((lokalizacja) => lokalizacja.nadrzednaLokalizacjaId === zrodlo.nadrzednaLokalizacjaId && lokalizacja.kod === `${zrodlo.kod}-KOPIA-${numer}`)) numer++
  const kopie = galaz.map((lokalizacja) => ({ ...lokalizacja, id: noweId.get(lokalizacja.id)!, nadrzednaLokalizacjaId: lokalizacja.id === id ? zrodlo.nadrzednaLokalizacjaId : noweId.get(lokalizacja.nadrzednaLokalizacjaId!), kod: lokalizacja.id === id ? `${zrodlo.kod}-KOPIA-${numer}` : lokalizacja.kod, nazwa: lokalizacja.id === id ? `${lokalizacja.nazwa} (kopia)` : lokalizacja.nazwa, polozenieNaMapie: undefined }))
  return { lokalizacje: normalizujLokalizacjeMapy([...lokalizacje, ...kopie], 2), id: noweId.get(id)! }
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
