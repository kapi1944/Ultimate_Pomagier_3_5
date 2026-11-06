// QR Model 2, wersja 6-L. Stały rozmiar daje moduł ok. 0,51 mm przy polu 25 mm.
const rozmiar = 41
const daneBloku = 68
const korekcjaBloku = 18

function pomnozWPolu(pierwszy: number, drugi: number) {
  let wynik = 0
  for (let bit = 7; bit >= 0; bit--) {
    wynik = (wynik << 1) ^ ((wynik >>> 7) * 0x11d)
    wynik ^= ((drugi >>> bit) & 1) * pierwszy
  }
  return wynik
}

function obliczKorekcje(blok: number[]) {
  let wielomian = [1]
  let pierwiastek = 1
  for (let indeks = 0; indeks < korekcjaBloku; indeks++) {
    wielomian = [1, ...wielomian.map((wspolczynnik, pozycja) =>
      (wielomian[pozycja + 1] ?? 0) ^ pomnozWPolu(wspolczynnik, pierwiastek))]
    pierwiastek = pomnozWPolu(pierwiastek, 2)
  }
  const reszta = [...blok, ...Array<number>(korekcjaBloku).fill(0)]
  for (let indeks = 0; indeks < blok.length; indeks++) {
    const pierwszy = reszta[indeks]
    wielomian.forEach((wspolczynnik, pozycja) => { reszta[indeks + pozycja] ^= pomnozWPolu(wspolczynnik, pierwszy) })
  }
  return reszta.slice(blok.length)
}

function przygotujBajty(adres: string) {
  const tresc = new TextEncoder().encode(adres)
  if (tresc.length > 134) throw new Error('Adres jest za długi dla kodu QR etykiety.')
  const bity: number[] = []
  function dopisz(wartosc: number, dlugosc: number) {
    for (let bit = dlugosc - 1; bit >= 0; bit--) bity.push((wartosc >>> bit) & 1)
  }
  dopisz(4, 4)
  dopisz(tresc.length, 8)
  tresc.forEach((bajt) => dopisz(bajt, 8))
  dopisz(0, 4)
  const dane: number[] = []
  for (let indeks = 0; indeks < bity.length; indeks += 8) dane.push(bity.slice(indeks, indeks + 8).reduce((bajt, bit) => bajt * 2 + bit, 0))
  for (let indeks = 0; dane.length < 2 * daneBloku; indeks++) dane.push(indeks % 2 ? 0x11 : 0xec)
  const pierwszy = dane.slice(0, daneBloku)
  const drugi = dane.slice(daneBloku)
  const korekcjaDrugiego = obliczKorekcje(drugi)
  return [...pierwszy.flatMap((bajt, indeks) => [bajt, drugi[indeks]]),
    ...obliczKorekcje(pierwszy).flatMap((bajt, indeks) => [bajt, korekcjaDrugiego[indeks]])]
}

export function zakodujAdresEtykiety(adres: string) {
  const bajty = przygotujBajty(adres)
  const matryca = Array.from({ length: rozmiar }, () => Array<boolean | null>(rozmiar).fill(null))
  function wpisz(x: number, y: number, czarny: boolean) {
    if (matryca[y]?.[x] !== undefined) matryca[y][x] = czarny
  }
  for (let indeks = 0; indeks < rozmiar; indeks++) {
    wpisz(6, indeks, indeks % 2 === 0)
    wpisz(indeks, 6, indeks % 2 === 0)
  }
  for (const [srodekX, srodekY] of [[3, 3], [rozmiar - 4, 3], [3, rozmiar - 4]]) {
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const odleglosc = Math.max(Math.abs(x), Math.abs(y))
      wpisz(srodekX + x, srodekY + y, odleglosc !== 2 && odleglosc !== 4)
    }
  }
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) wpisz(34 + x, 34 + y, Math.max(Math.abs(x), Math.abs(y)) !== 1)
  // Bity formatu dla poziomu L i maski 0, wraz z korekcją BCH.
  const format = (bit: number) => Boolean((0x77c4 >>> bit) & 1)
  for (let bit = 0; bit < 15; bit++) {
    if (bit < 8) wpisz(8, bit < 6 ? bit : bit + 1, format(bit))
    else wpisz(bit === 8 ? 7 : 14 - bit, 8, format(bit))
    if (bit < 8) wpisz(rozmiar - 1 - bit, 8, format(bit))
    else wpisz(8, rozmiar - 15 + bit, format(bit))
  }
  wpisz(8, rozmiar - 8, true)
  let bit = 0
  let doGory = true
  for (let prawa = rozmiar - 1; prawa >= 1; prawa -= 2) {
    if (prawa === 6) prawa--
    for (let wiersz = 0; wiersz < rozmiar; wiersz++) {
      const y = doGory ? rozmiar - 1 - wiersz : wiersz
      for (const x of [prawa, prawa - 1]) {
        if (matryca[y][x] !== null) continue
        const czarny = Boolean(((bajty[bit >>> 3] ?? 0) >>> (7 - bit % 8)) & 1)
        wpisz(x, y, czarny !== ((x + y) % 2 === 0))
        bit++
      }
    }
    doGory = !doGory
  }
  return matryca.map((wiersz) => wiersz.map(Boolean))
}
