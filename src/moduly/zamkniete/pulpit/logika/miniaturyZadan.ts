import type { MiniaturaZadaniaPulpitu } from '../modele/pulpit'

const maksymalnyWymiarMiniatury = 480
const maksymalnyRozmiarPliku = 12 * 1024 * 1024

function wczytajObraz(adres: string) {
  return new Promise<HTMLImageElement>((rozwiaz, odrzuc) => {
    const obraz = new Image()
    obraz.onload = () => rozwiaz(obraz)
    obraz.onerror = () => odrzuc(new Error('Nie udało się odczytać obrazu.'))
    obraz.src = adres
  })
}

export async function przygotujMiniatureZadania(plik: File): Promise<MiniaturaZadaniaPulpitu> {
  if (!plik.type.startsWith('image/')) {
    throw new Error('Wybierz plik graficzny.')
  }

  if (plik.size > maksymalnyRozmiarPliku) {
    throw new Error('Obraz może mieć maksymalnie 12 MB.')
  }

  const adres = URL.createObjectURL(plik)

  try {
    const obraz = await wczytajObraz(adres)
    const skala = Math.min(1, maksymalnyWymiarMiniatury / Math.max(obraz.naturalWidth, obraz.naturalHeight))
    const szerokosc = Math.max(1, Math.round(obraz.naturalWidth * skala))
    const wysokosc = Math.max(1, Math.round(obraz.naturalHeight * skala))
    const plotno = document.createElement('canvas')
    plotno.width = szerokosc
    plotno.height = wysokosc
    const kontekst = plotno.getContext('2d')

    if (!kontekst) {
      throw new Error('Przeglądarka nie może przygotować miniatury.')
    }

    kontekst.drawImage(obraz, 0, 0, szerokosc, wysokosc)

    return {
      daneUrl: plotno.toDataURL('image/webp', 0.82),
      nazwaPliku: plik.name || 'obraz-ze-schowka',
      szerokosc,
      wysokosc,
    }
  } finally {
    URL.revokeObjectURL(adres)
  }
}
