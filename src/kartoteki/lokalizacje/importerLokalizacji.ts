import type { BladImportuLokalizacji, Lokalizacja, WynikImportuLokalizacji } from './typyLokalizacji'

const wymaganeKolumny = [
  'klucz_lokalizacji',
  'nazwa',
  'wojewodztwo',
  'rodzaj',
  'gmina',
  'powiat',
  'miejscownik_pelny_auto',
  'status_odmiany',
]

function zdejmijBom(tresc: string) {
  return tresc.charCodeAt(0) === 0xfeff ? tresc.slice(1) : tresc
}

function parsujWierszCsv(wiersz: string) {
  const pola: string[] = []
  let pole = ''
  let czyWCudzyslowie = false

  for (let indeks = 0; indeks < wiersz.length; indeks += 1) {
    const znak = wiersz[indeks]
    const nastepnyZnak = wiersz[indeks + 1]

    if (znak === '"' && czyWCudzyslowie && nastepnyZnak === '"') {
      pole += '"'
      indeks += 1
      continue
    }

    if (znak === '"') {
      czyWCudzyslowie = !czyWCudzyslowie
      continue
    }

    if (znak === ',' && !czyWCudzyslowie) {
      pola.push(pole)
      pole = ''
      continue
    }

    pole += znak
  }

  pola.push(pole)
  return pola.map((wartosc) => wartosc.trim())
}

function czyPustyRekord(wartosci: string[]) {
  return wartosci.every((wartosc) => !wartosc.trim())
}

function odczytajStatusOdmiany(wartosc: string, wiersz: number, bledy: BladImportuLokalizacji[]) {
  const status = wartosc.trim().toLowerCase()

  if (status === 'true') {
    return true
  }

  if (status === 'false' || !status) {
    return false
  }

  bledy.push({ wiersz, komunikat: `Nieprawidlowy status_odmiany: ${wartosc}` })
  return false
}

export function importujLokalizacjeZCsv(trescCsv: string): WynikImportuLokalizacji {
  const linie = zdejmijBom(trescCsv).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const naglowek = parsujWierszCsv(linie[0] ?? '')
  const bledy: BladImportuLokalizacji[] = []
  const indeksyKolumn = new Map(naglowek.map((kolumna, indeks) => [kolumna, indeks]))
  const lokalizacjeWedlugKlucza = new Map<string, Lokalizacja>()

  wymaganeKolumny.forEach((kolumna) => {
    if (!indeksyKolumn.has(kolumna)) {
      bledy.push({ wiersz: 1, komunikat: `Brak wymaganej kolumny: ${kolumna}` })
    }
  })

  if (bledy.some((blad) => blad.wiersz === 1)) {
    return { lokalizacje: [], bledy }
  }

  linie.slice(1).forEach((linia, indeks) => {
    const numerWiersza = indeks + 2
    const wartosci = parsujWierszCsv(linia)

    if (czyPustyRekord(wartosci)) {
      return
    }

    function pobierzPole(kolumna: string) {
      return wartosci[indeksyKolumn.get(kolumna) ?? -1] ?? ''
    }

    const lokalizacja: Lokalizacja = {
      klucz_lokalizacji: pobierzPole('klucz_lokalizacji'),
      nazwa: pobierzPole('nazwa'),
      wojewodztwo: pobierzPole('wojewodztwo'),
      rodzaj: pobierzPole('rodzaj'),
      gmina: pobierzPole('gmina'),
      powiat: pobierzPole('powiat'),
      miejscownik_pelny_auto: pobierzPole('miejscownik_pelny_auto'),
      status_odmiany: odczytajStatusOdmiany(pobierzPole('status_odmiany'), numerWiersza, bledy),
    }

    if (!lokalizacja.klucz_lokalizacji) {
      bledy.push({ wiersz: numerWiersza, komunikat: 'Brak klucz_lokalizacji' })
      return
    }

    if (!lokalizacja.nazwa) {
      bledy.push({ wiersz: numerWiersza, komunikat: 'Brak nazwa' })
      return
    }

    if (!lokalizacja.miejscownik_pelny_auto) {
      bledy.push({ wiersz: numerWiersza, komunikat: 'Brak miejscownik_pelny_auto' })
      return
    }

    if (lokalizacjeWedlugKlucza.has(lokalizacja.klucz_lokalizacji)) {
      bledy.push({ wiersz: numerWiersza, komunikat: `Pominieto duplikat klucza: ${lokalizacja.klucz_lokalizacji}` })
      return
    }

    lokalizacjeWedlugKlucza.set(lokalizacja.klucz_lokalizacji, lokalizacja)
  })

  return {
    lokalizacje: [...lokalizacjeWedlugKlucza.values()],
    bledy,
  }
}
