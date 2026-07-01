import tekstLokalizacjiCsv from './dane/kartoteka_lokalizacje_miejscowosci_2019.csv?raw'
import { importujLokalizacjeZCsv } from './importerLokalizacji'
import type { Lokalizacja } from './typyLokalizacji'

const kluczLokalizacji = 'ultimate-pomagier.kartoteki.lokalizacje'
const wynikImportuStartowego = importujLokalizacjeZCsv(tekstLokalizacjiCsv)
const lokalizacjeStartowe = wynikImportuStartowego.lokalizacje
const lokalizacjeStartoweWedlugKlucza = new Map(lokalizacjeStartowe.map((lokalizacja) => [lokalizacja.klucz_lokalizacji, lokalizacja]))

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc))
}

function tekst(wartosc: unknown) {
  return String(wartosc ?? '').trim()
}

function normalizujStatus(wartosc: unknown) {
  return wartosc === true || wartosc === 'true'
}

function normalizujLokalizacje(wartosc: unknown): Lokalizacja | null {
  if (!czyObiekt(wartosc)) {
    return null
  }

  const lokalizacja: Lokalizacja = {
    klucz_lokalizacji: tekst(wartosc.klucz_lokalizacji || wartosc.id),
    nazwa: tekst(wartosc.nazwa),
    wojewodztwo: tekst(wartosc.wojewodztwo),
    rodzaj: tekst(wartosc.rodzaj),
    gmina: tekst(wartosc.gmina),
    powiat: tekst(wartosc.powiat),
    miejscownik_pelny_auto: tekst(wartosc.miejscownik_pelny_auto || wartosc.miejscownik),
    status_odmiany: normalizujStatus(wartosc.status_odmiany ?? wartosc.miejscownikPotwierdzony),
  }

  if (!lokalizacja.klucz_lokalizacji || !lokalizacja.nazwa || !lokalizacja.miejscownik_pelny_auto) {
    return null
  }

  return lokalizacja
}

function odczytajLokalizacjeZMagazynu() {
  try {
    const zapis = localStorage.getItem(kluczLokalizacji)
    const dane = zapis ? JSON.parse(zapis) : null

    return Array.isArray(dane) ? dane.map(normalizujLokalizacje).filter((lokalizacja): lokalizacja is Lokalizacja => Boolean(lokalizacja)) : []
  } catch {
    return []
  }
}

function scalLokalizacje(seed: Lokalizacja[], zapisane: Lokalizacja[]) {
  const mapa = new Map(seed.map((lokalizacja) => [lokalizacja.klucz_lokalizacji, lokalizacja]))

  zapisane.forEach((lokalizacja) => {
    mapa.set(lokalizacja.klucz_lokalizacji, lokalizacja)
  })

  return [...mapa.values()]
}

export function pobierzLokalizacjeStartowe() {
  return lokalizacjeStartowe
}

export function pobierzBledyImportuStartowego() {
  return wynikImportuStartowego.bledy
}

export function pobierzLokalizacjeZMagazynu() {
  return scalLokalizacje(lokalizacjeStartowe, odczytajLokalizacjeZMagazynu())
}

export function zapiszLokalizacjeWMagazynie(lokalizacje: Lokalizacja[]) {
  try {
    const zmianyUzytkownika = lokalizacje.filter((lokalizacja) => {
      const lokalizacjaStartowa = lokalizacjeStartoweWedlugKlucza.get(lokalizacja.klucz_lokalizacji)

      return (
        !lokalizacjaStartowa ||
        lokalizacjaStartowa.nazwa !== lokalizacja.nazwa ||
        lokalizacjaStartowa.wojewodztwo !== lokalizacja.wojewodztwo ||
        lokalizacjaStartowa.rodzaj !== lokalizacja.rodzaj ||
        lokalizacjaStartowa.gmina !== lokalizacja.gmina ||
        lokalizacjaStartowa.powiat !== lokalizacja.powiat ||
        lokalizacjaStartowa.miejscownik_pelny_auto !== lokalizacja.miejscownik_pelny_auto ||
        lokalizacjaStartowa.status_odmiany !== lokalizacja.status_odmiany
      )
    })

    localStorage.setItem(kluczLokalizacji, JSON.stringify(zmianyUzytkownika))
  } catch {
    return
  }
}

export function znajdzLokalizacjePoKluczu(klucz_lokalizacji: string, lokalizacje = pobierzLokalizacjeZMagazynu()) {
  return lokalizacje.find((lokalizacja) => lokalizacja.klucz_lokalizacji === klucz_lokalizacji) ?? null
}

export function znajdzLokalizacjeDlaMiejsca(miejsce: string, lokalizacje = pobierzLokalizacjeZMagazynu()) {
  const szukanaNazwa = miejsce.trim().toLocaleLowerCase('pl')

  if (!szukanaNazwa) {
    return null
  }

  return lokalizacje.find((lokalizacja) => lokalizacja.nazwa.toLocaleLowerCase('pl') === szukanaNazwa) ?? null
}

export function ustawPotwierdzonyMiejscownikLokalizacji(klucz_lokalizacji: string, miejscownik_pelny_auto: string) {
  const lokalizacje = pobierzLokalizacjeZMagazynu()
  const zmienione = lokalizacje.map((lokalizacja) =>
    lokalizacja.klucz_lokalizacji === klucz_lokalizacji
      ? {
          ...lokalizacja,
          miejscownik_pelny_auto: miejscownik_pelny_auto.trim(),
          status_odmiany: true,
        }
      : lokalizacja,
  )

  zapiszLokalizacjeWMagazynie(zmienione)
  return znajdzLokalizacjePoKluczu(klucz_lokalizacji, zmienione)
}

export function pobierzPotwierdzonyMiejscownikLokalizacji(klucz_lokalizacji: string) {
  const lokalizacja = znajdzLokalizacjePoKluczu(klucz_lokalizacji)

  if (!lokalizacja) {
    return { miejscownik: null, blad: 'Nie odnaleziono lokalizacji w kartotece.' }
  }

  if (!lokalizacja.status_odmiany) {
    return { miejscownik: null, blad: 'Odmiana nazwy tej lokalizacji nie została jeszcze potwierdzona.' }
  }

  return { miejscownik: lokalizacja.miejscownik_pelny_auto, blad: null }
}
