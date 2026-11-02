/// <reference lib="webworker" />
export {}

// Wzorzec SEMPER: skalowanie, percentyle luminancji, kontrast i próg binarny.
self.onmessage = async (zdarzenie: MessageEvent<{ obraz: ImageBitmap; obrot: number; binarnie: boolean }>) => {
  const { obraz, obrot, binarnie } = zdarzenie.data
  try {
    const skala = Math.min(2, 2600 / Math.max(obraz.width, obraz.height))
    const zamiana = obrot % 180 !== 0
    const kanwa = new OffscreenCanvas(Math.round((zamiana ? obraz.height : obraz.width) * skala), Math.round((zamiana ? obraz.width : obraz.height) * skala))
    const kontekst = kanwa.getContext('2d', { willReadFrequently: true })!
    kontekst.fillStyle = '#fff'; kontekst.fillRect(0, 0, kanwa.width, kanwa.height)
    kontekst.translate(kanwa.width / 2, kanwa.height / 2); kontekst.rotate(obrot * Math.PI / 180)
    kontekst.drawImage(obraz, -obraz.width * skala / 2, -obraz.height * skala / 2, obraz.width * skala, obraz.height * skala)
    kontekst.resetTransform(); obraz.close()
    const oryginal = await kanwa.convertToBlob({ type: 'image/png' })
    const piksele = kontekst.getImageData(0, 0, kanwa.width, kanwa.height)
    const histogram = new Uint32Array(256)
    for (let i = 0; i < piksele.data.length; i += 4) histogram[Math.round(0.299 * piksele.data[i] + 0.587 * piksele.data[i + 1] + 0.114 * piksele.data[i + 2])]++
    const percentyl = (procent: number) => { let suma = 0; for (let i = 0; i < 256; i++) { suma += histogram[i]; if (suma >= kanwa.width * kanwa.height * procent) return i } return 255 }
    const dol = percentyl(0.04), zakres = Math.max(35, percentyl(0.96) - dol)
    const poziomy = new Uint32Array(kanwa.height), piony = new Uint32Array(kanwa.width)
    for (let i = 0; i < piksele.data.length; i += 4) {
      const jasnosc = Math.round(Math.max(0, Math.min(255, (0.299 * piksele.data[i] + 0.587 * piksele.data[i + 1] + 0.114 * piksele.data[i + 2] - dol) * 255 / zakres)))
      const wartosc = binarnie ? jasnosc < 165 ? 0 : 255 : jasnosc
      piksele.data[i] = piksele.data[i + 1] = piksele.data[i + 2] = wartosc
      if (jasnosc < 110) { poziomy[Math.floor(i / 4 / kanwa.width)]++; piony[i / 4 % kanwa.width]++ }
    }
    const linie = (liczniki: Uint32Array, prog: number) => {
      const wynik: number[] = []
      for (let i = 0; i < liczniki.length; i++) if (liczniki[i] > prog) {
        const poczatek = i
        while (i + 1 < liczniki.length && liczniki[i + 1] > prog) i++
        wynik.push(Math.round((poczatek + i) / 2))
      }
      return wynik
    }
    kontekst.putImageData(piksele, 0, 0)
    self.postMessage({ obraz: await kanwa.convertToBlob({ type: 'image/png' }), oryginal, szerokosc: kanwa.width, wysokosc: kanwa.height, pionowe: linie(piony, kanwa.height * 0.3), poziome: linie(poziomy, kanwa.width * 0.4) })
  } catch { obraz.close(); self.postMessage({ blad: 'Nie udało się przygotować obrazu. Zmniejsz rozmiar zdjęcia lub wybierz inny plik.' }) }
}
