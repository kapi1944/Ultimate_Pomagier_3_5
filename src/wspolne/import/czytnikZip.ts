type WpisZip = {
  nazwa: string
  metodaKompresji: number
  dane: Uint8Array
}

function czytajUint16(dane: Uint8Array, pozycja: number) {
  return dane[pozycja] | (dane[pozycja + 1] << 8)
}

function czytajUint32(dane: Uint8Array, pozycja: number) {
  return (
    dane[pozycja] |
    (dane[pozycja + 1] << 8) |
    (dane[pozycja + 2] << 16) |
    (dane[pozycja + 3] << 24)
  ) >>> 0
}

function znajdzKoniecKatalogu(dane: Uint8Array) {
  const najmniejszyRozmiar = 22
  const najdalszyKomentarz = 65535
  const start = Math.max(0, dane.length - najmniejszyRozmiar - najdalszyKomentarz)

  for (let pozycja = dane.length - najmniejszyRozmiar; pozycja >= start; pozycja--) {
    if (czytajUint32(dane, pozycja) === 0x06054b50) {
      return pozycja
    }
  }

  throw new Error('Nie znaleziono katalogu ZIP.')
}

async function rozpakujWpis(wpis: WpisZip) {
  if (wpis.metodaKompresji === 0) {
    return wpis.dane
  }

  if (wpis.metodaKompresji !== 8) {
    throw new Error(`Nieobsługiwana metoda kompresji ZIP: ${wpis.metodaKompresji}.`)
  }

  const bufor = new ArrayBuffer(wpis.dane.byteLength)
  new Uint8Array(bufor).set(wpis.dane)
  const strumien = new Blob([bufor]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const rozpakowanyBufor = await new Response(strumien).arrayBuffer()

  return new Uint8Array(rozpakowanyBufor)
}

export async function czytajZip(bufor: ArrayBuffer) {
  const dane = new Uint8Array(bufor)
  const dekoder = new TextDecoder()
  const koniecKatalogu = znajdzKoniecKatalogu(dane)
  const liczbaWpisow = czytajUint16(dane, koniecKatalogu + 10)
  let pozycjaKatalogu = czytajUint32(dane, koniecKatalogu + 16)
  const wpisy = new Map<string, WpisZip>()

  for (let indeks = 0; indeks < liczbaWpisow; indeks++) {
    if (czytajUint32(dane, pozycjaKatalogu) !== 0x02014b50) {
      throw new Error('Uszkodzony katalog ZIP.')
    }

    const metodaKompresji = czytajUint16(dane, pozycjaKatalogu + 10)
    const rozmiarSkompresowany = czytajUint32(dane, pozycjaKatalogu + 20)
    const dlugoscNazwy = czytajUint16(dane, pozycjaKatalogu + 28)
    const dlugoscDodatkow = czytajUint16(dane, pozycjaKatalogu + 30)
    const dlugoscKomentarza = czytajUint16(dane, pozycjaKatalogu + 32)
    const pozycjaNaglowka = czytajUint32(dane, pozycjaKatalogu + 42)
    const nazwa = dekoder.decode(dane.slice(pozycjaKatalogu + 46, pozycjaKatalogu + 46 + dlugoscNazwy))

    const dlugoscNazwyLokalnej = czytajUint16(dane, pozycjaNaglowka + 26)
    const dlugoscDodatkowLokalnych = czytajUint16(dane, pozycjaNaglowka + 28)
    const pozycjaDanych = pozycjaNaglowka + 30 + dlugoscNazwyLokalnej + dlugoscDodatkowLokalnych

    wpisy.set(nazwa, {
      nazwa,
      metodaKompresji,
      dane: dane.slice(pozycjaDanych, pozycjaDanych + rozmiarSkompresowany),
    })

    pozycjaKatalogu += 46 + dlugoscNazwy + dlugoscDodatkow + dlugoscKomentarza
  }

  return {
    async tekst(nazwa: string) {
      const wpis = wpisy.get(nazwa)

      if (!wpis) {
        return ''
      }

      return dekoder.decode(await rozpakujWpis(wpis))
    },
    async bajty(nazwa: string) {
      const wpis = wpisy.get(nazwa)

      if (!wpis) {
        return null
      }

      return rozpakujWpis(wpis)
    },
  }
}
