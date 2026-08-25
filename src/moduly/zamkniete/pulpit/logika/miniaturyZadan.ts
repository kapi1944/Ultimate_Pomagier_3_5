import type { KadrMiniaturyZadania, MiniaturaZadaniaPulpitu, ProporcjaMiniaturyZadania } from '../modele/pulpit'

const maksymalnyWymiarZrodla = 1600
const maksymalnyRozmiarPliku = 12 * 1024 * 1024
const szerokoscPodgladu = 320

const wymiaryProporcji: Record<ProporcjaMiniaturyZadania, { szerokosc: number; wysokosc: number }> = {
  '16:9': { szerokosc: 16, wysokosc: 9 },
  '4:3': { szerokosc: 4, wysokosc: 3 },
  '1:1': { szerokosc: 1, wysokosc: 1 },
}

function ogranicz(wartosc: number, minimum: number, maksimum: number) {
  return Math.min(maksimum, Math.max(minimum, wartosc))
}

export function normalizujKadrMiniatury(kadr: Partial<KadrMiniaturyZadania> | null | undefined): KadrMiniaturyZadania {
  const proporcja = kadr?.proporcja === '4:3' || kadr?.proporcja === '1:1' ? kadr.proporcja : '16:9'
  return {
    x: ogranicz(Number.isFinite(kadr?.x) ? Number(kadr?.x) : 0, -1, 1),
    y: ogranicz(Number.isFinite(kadr?.y) ? Number(kadr?.y) : 0, -1, 1),
    zoom: ogranicz(Number.isFinite(kadr?.zoom) ? Number(kadr?.zoom) : 1, 1, 3),
    proporcja,
  }
}

function wczytajObraz(adres: string) {
  return new Promise<HTMLImageElement>((rozwiaz, odrzuc) => {
    const obraz = new Image()
    obraz.onload = () => rozwiaz(obraz)
    obraz.onerror = () => odrzuc(new Error('Nie udało się odczytać obrazu.'))
    obraz.src = adres
  })
}

function pobierzWymiaryPodgladu(proporcja: ProporcjaMiniaturyZadania) {
  const wymiary = wymiaryProporcji[proporcja]
  return {
    szerokosc: szerokoscPodgladu,
    wysokosc: Math.max(1, Math.round(szerokoscPodgladu * wymiary.wysokosc / wymiary.szerokosc)),
  }
}

async function renderujKadr(zrodloDaneUrl: string, kadrWejsciowy: KadrMiniaturyZadania) {
  const kadr = normalizujKadrMiniatury(kadrWejsciowy)
  const obraz = await wczytajObraz(zrodloDaneUrl)
  const wymiary = pobierzWymiaryPodgladu(kadr.proporcja)
  const plotno = document.createElement('canvas')
  plotno.width = wymiary.szerokosc
  plotno.height = wymiary.wysokosc

  const kontekst = plotno.getContext('2d')
  if (!kontekst) throw new Error('Przeglądarka nie może przygotować miniatury.')

  const skalaBazowa = Math.max(
    wymiary.szerokosc / obraz.naturalWidth,
    wymiary.wysokosc / obraz.naturalHeight,
  )
  const skala = skalaBazowa * kadr.zoom
  const szerokoscRysunku = obraz.naturalWidth * skala
  const wysokoscRysunku = obraz.naturalHeight * skala
  const nadmiarX = Math.max(0, szerokoscRysunku - wymiary.szerokosc)
  const nadmiarY = Math.max(0, wysokoscRysunku - wymiary.wysokosc)
  const x = (wymiary.szerokosc - szerokoscRysunku) / 2 - kadr.x * nadmiarX / 2
  const y = (wymiary.wysokosc - wysokoscRysunku) / 2 - kadr.y * nadmiarY / 2

  kontekst.drawImage(obraz, x, y, szerokoscRysunku, wysokoscRysunku)

  return {
    daneUrl: plotno.toDataURL('image/webp', 0.82),
    szerokosc: wymiary.szerokosc,
    wysokosc: wymiary.wysokosc,
  }
}

async function przygotujZrodloRobocze(plik: File) {
  const adres = URL.createObjectURL(plik)

  try {
    const obraz = await wczytajObraz(adres)
    const skala = Math.min(1, maksymalnyWymiarZrodla / Math.max(obraz.naturalWidth, obraz.naturalHeight))
    const szerokosc = Math.max(1, Math.round(obraz.naturalWidth * skala))
    const wysokosc = Math.max(1, Math.round(obraz.naturalHeight * skala))
    const plotno = document.createElement('canvas')
    plotno.width = szerokosc
    plotno.height = wysokosc

    const kontekst = plotno.getContext('2d')
    if (!kontekst) throw new Error('Przeglądarka nie może przygotować obrazu roboczego.')

    kontekst.drawImage(obraz, 0, 0, szerokosc, wysokosc)

    return {
      zrodloDaneUrl: plotno.toDataURL('image/webp', 0.86),
      szerokoscZrodla: szerokosc,
      wysokoscZrodla: wysokosc,
    }
  } finally {
    URL.revokeObjectURL(adres)
  }
}

export async function przygotujMiniatureZadania(plik: File): Promise<MiniaturaZadaniaPulpitu> {
  if (!plik.type.startsWith('image/')) {
    throw new Error('Wybierz plik graficzny.')
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(plik.type.toLowerCase())) {
    throw new Error('Obsługiwane formaty miniatur to PNG, JPEG i WEBP.')
  }

  if (plik.size > maksymalnyRozmiarPliku) {
    throw new Error('Obraz może mieć maksymalnie 12 MB.')
  }

  const zrodlo = await przygotujZrodloRobocze(plik)
  const kadr = normalizujKadrMiniatury(undefined)
  const podglad = await renderujKadr(zrodlo.zrodloDaneUrl, kadr)

  return {
    ...zrodlo,
    ...podglad,
    kadr,
    nazwaPliku: plik.name || 'obraz-ze-schowka',
  }
}

export async function aktualizujKadrMiniatury(
  miniatura: MiniaturaZadaniaPulpitu,
  zmiana: Partial<KadrMiniaturyZadania>,
): Promise<MiniaturaZadaniaPulpitu> {
  const kadr = normalizujKadrMiniatury({ ...miniatura.kadr, ...zmiana })
  const podglad = await renderujKadr(miniatura.zrodloDaneUrl, kadr)
  return { ...miniatura, ...podglad, kadr }
}
