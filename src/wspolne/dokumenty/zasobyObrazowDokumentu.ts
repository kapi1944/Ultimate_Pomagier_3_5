export const KLUCZ_ZASOBOW_OBRAZOW_DOKUMENTU = 'ultimate-pomagier.dokumenty.zasoby-obrazow.v1'
const MAKSYMALNY_ROZMIAR_PLIKU = 8 * 1024 * 1024
const MAKSYMALNY_BOK_OBRAZU = 1600

type ZasobObrazuDokumentu = {
  klucz: string
  nazwa: string
  typ: string
  daneUrl: string
}

function odczytajZasoby(): Record<string, ZasobObrazuDokumentu> {
  try {
    const dane = JSON.parse(localStorage.getItem(KLUCZ_ZASOBOW_OBRAZOW_DOKUMENTU) ?? '{}') as unknown
    return dane && typeof dane === 'object' && !Array.isArray(dane) ? dane as Record<string, ZasobObrazuDokumentu> : {}
  } catch {
    return {}
  }
}

function odczytajPlikJakoDataUrl(plik: File) {
  return new Promise<string>((rozwiaz, odrzuc) => {
    const czytnik = new FileReader()
    czytnik.onload = () => typeof czytnik.result === 'string' ? rozwiaz(czytnik.result) : odrzuc(new Error('Nie udało się odczytać obrazu.'))
    czytnik.onerror = () => odrzuc(new Error('Nie udało się odczytać obrazu.'))
    czytnik.readAsDataURL(plik)
  })
}

function wczytajObraz(daneUrl: string) {
  return new Promise<HTMLImageElement>((rozwiaz, odrzuc) => {
    const obraz = new Image()
    obraz.onload = () => rozwiaz(obraz)
    obraz.onerror = () => odrzuc(new Error('Plik nie zawiera poprawnego obrazu.'))
    obraz.src = daneUrl
  })
}

async function przygotujDaneObrazu(plik: File) {
  const daneUrl = /\.ai$/i.test(plik.name) ? await odczytajGrafikeIllustratora(plik) : await odczytajPlikJakoDataUrl(plik)
  const obraz = await wczytajObraz(daneUrl)
  let skala = Math.min(1, MAKSYMALNY_BOK_OBRAZU / Math.max(obraz.naturalWidth, obraz.naturalHeight))
  if (skala === 1 && daneUrl.length <= 2_500_000) return daneUrl
  const plotno = document.createElement('canvas')
  let wynik: string
  do {
    plotno.width = Math.max(1, Math.round(obraz.naturalWidth * skala))
    plotno.height = Math.max(1, Math.round(obraz.naturalHeight * skala))
    const kontekst = plotno.getContext('2d')
    if (!kontekst) throw new Error('Nie udało się przygotować obrazu.')
    kontekst.clearRect(0, 0, plotno.width, plotno.height)
    kontekst.drawImage(obraz, 0, 0, plotno.width, plotno.height)
    wynik = plotno.toDataURL(plik.type === 'image/png' ? 'image/png' : 'image/webp', 0.88)
    skala *= .8
  } while (wynik.length > 2_500_000 && Math.min(plotno.width, plotno.height) > 320)
  if (wynik.length > 2_500_000) throw new Error('Obraz po optymalizacji nadal jest zbyt duży do bezpiecznego zapisu.')
  return wynik
}

async function obliczKlucz(daneUrl: string) {
  const skrot = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(daneUrl))
  return `obraz-${Array.from(new Uint8Array(skrot)).slice(0, 12).map((bajt) => bajt.toString(16).padStart(2, '0')).join('')}`
}

export async function zapiszZasobObrazuDokumentu(plik: File) {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(plik.type) && !/\.ai$/i.test(plik.name)) throw new Error('Dozwolone są obrazy PNG, JPEG, SVG, WebP i AI zgodne z PDF.')
  if (plik.size > MAKSYMALNY_ROZMIAR_PLIKU) throw new Error('Obraz może mieć maksymalnie 8 MB.')
  const daneUrl = await przygotujDaneObrazu(plik)
  const klucz = await obliczKlucz(daneUrl)
  const zasoby = odczytajZasoby()
  if (!zasoby[klucz]) {
    zasoby[klucz] = { klucz, nazwa: plik.name, typ: plik.type, daneUrl }
    localStorage.setItem(KLUCZ_ZASOBOW_OBRAZOW_DOKUMENTU, JSON.stringify(zasoby))
  }
  return klucz
}

export function pobierzMapeZasobowObrazowDokumentu() {
  return Object.fromEntries(Object.entries(odczytajZasoby()).map(([klucz, zasob]) => [klucz, zasob.daneUrl]))
}

async function odczytajGrafikeIllustratora(plik: File): Promise<string> {
  const dane = new Uint8Array(await plik.arrayBuffer())
  if (!new TextDecoder().decode(dane.slice(0, 1024)).includes('%PDF-')) throw new Error('Ten plik AI nie ma zawartości zgodnej z PDF. Zapisz go w Illustratorze z opcją zgodności z PDF lub wyeksportuj do SVG/PNG.')
  const biblioteka = await import('pdfjs-dist/legacy/build/pdf.mjs')
  if (!biblioteka.GlobalWorkerOptions.workerSrc) biblioteka.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  const zadanie = biblioteka.getDocument({ data: dane })
  try {
    const dokument = await zadanie.promise
    const strona = await dokument.getPage(1)
    const rozmiar = strona.getViewport({ scale: 1 })
    const widok = strona.getViewport({ scale: MAKSYMALNY_BOK_OBRAZU / Math.max(rozmiar.width, rozmiar.height) })
    const plotno = document.createElement('canvas')
    plotno.width = Math.ceil(widok.width)
    plotno.height = Math.ceil(widok.height)
    const kontekst = plotno.getContext('2d')
    if (!kontekst) throw new Error('Nie udało się przygotować grafiki AI.')
    await strona.render({ canvasContext: kontekst, canvas: plotno, viewport: widok, background: 'rgba(0,0,0,0)' }).promise
    return plotno.toDataURL('image/png')
  } finally {
    await zadanie.destroy()
  }
}
