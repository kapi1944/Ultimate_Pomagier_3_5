import { createWorker as utworzPracownika, OEM, PSM, type Worker as SilnikOcr } from 'tesseract.js'
import { czyPodpisOcr, ocenObecnoscGrafikiPodpisu, zbudujTabeleOcr, type SlowoOcr, type TabelaOcr } from './modelTabeliOcr'

export type StronaImportuOcr = { tabela: TabelaOcr; podglad: Blob }
type OpcjeOcr = { sygnal: AbortSignal; postep: (opis: string, postep: number) => void; obrot: number; odreczna: boolean; binarnie: boolean; podpisyOd: number; podpisyPotwierdzone?: boolean }
type PrzygotowanyObraz = { obraz: Blob; oryginal: Blob; szerokosc: number; wysokosc: number; pionowe: number[]; poziome: number[]; blad?: string }

function zPrzerwaniem<Typ>(obietnica: Promise<Typ>, sygnal: AbortSignal): Promise<Typ> {
  sygnal.throwIfAborted()
  return new Promise((rozwiaz, odrzuc) => {
    const przerwij = () => odrzuc(new DOMException('Anulowano przetwarzanie.', 'AbortError'))
    sygnal.addEventListener('abort', przerwij, { once: true })
    obietnica.then(rozwiaz, odrzuc).finally(() => sygnal.removeEventListener('abort', przerwij))
  })
}

async function przygotujObraz(plik: Blob, opcje: OpcjeOcr): Promise<PrzygotowanyObraz> {
  let obraz: ImageBitmap
  try { obraz = await createImageBitmap(plik) }
  catch { throw new Error('Nie można odczytać obrazu. Plik jest uszkodzony lub ma nieobsługiwany format.') }
  if (obraz.width * obraz.height > 40000000) { obraz.close(); throw new Error('Obraz przekracza 40 megapikseli. Zmniejsz zdjęcie przed importem.') }
  const pracownik = new Worker(new URL('./przetwarzanieObrazu.worker.ts', import.meta.url), { type: 'module' })
  try {
    return await zPrzerwaniem(new Promise<PrzygotowanyObraz>((rozwiaz, odrzuc) => {
      pracownik.onmessage = (zdarzenie: MessageEvent<PrzygotowanyObraz>) => zdarzenie.data.blad ? odrzuc(new Error(zdarzenie.data.blad)) : rozwiaz(zdarzenie.data)
      pracownik.onerror = () => odrzuc(new Error('Przeglądarka nie uruchomiła przetwarzania obrazu.'))
      pracownik.postMessage({ obraz, obrot: opcje.obrot, binarnie: opcje.binarnie }, [obraz])
    }), opcje.sygnal)
  } finally { pracownik.terminate() }
}

function slowaZWyniku(wynik: Awaited<ReturnType<SilnikOcr['recognize']>>): SlowoOcr[] {
  return (wynik.data.blocks ?? []).flatMap((blok) => blok.paragraphs.flatMap((akapit) => akapit.lines.flatMap((linia) => linia.words.map((slowo) => ({ tekst: slowo.text, pewnosc: slowo.confidence, x: slowo.bbox.x0, y: slowo.bbox.y0, szerokosc: slowo.bbox.x1 - slowo.bbox.x0, wysokosc: slowo.bbox.y1 - slowo.bbox.y0 })))))
}

export async function importujDokumentOcr(plik: File, opcje: OpcjeOcr): Promise<StronaImportuOcr[]> {
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(plik.name)) throw new Error('Wybierz PDF, JPG, JPEG, PNG lub WebP.')
  if (plik.size > 40 * 1024 * 1024) throw new Error('Plik przekracza 40 MB. Podziel dokument na mniejsze części.')
  let obietnicaSilnika: Promise<SilnikOcr> | null = null
  let aktywny: SilnikOcr | null = null
  let bladSilnika: (() => void) | null = null
  const awariaSilnika = new Promise<never>((_, odrzuc) => { bladSilnika = () => odrzuc(new Error('Nie udało się uruchomić lokalnego OCR. Sprawdź dostępność zasobów aplikacji.')) })
  // Obietnica awarii ma odbiorcę również przed pierwszym rozpoznawaniem.
  void awariaSilnika.catch(() => undefined)
  const rozpoznaj = async (obraz: HTMLCanvasElement) => {
    if (!obietnicaSilnika) {
      const adres = new URL(`${import.meta.env.BASE_URL}ocr/`, location.href).href
      obietnicaSilnika = utworzPracownika(['pol', 'eng'], OEM.LSTM_ONLY, {
        workerPath: `${adres}worker.min.js`, corePath: adres, langPath: adres, workerBlobURL: false, cacheMethod: 'none',
        logger: (wiadomosc) => opcje.postep('Rozpoznawanie tekstu — lokalny Tesseract', Math.round(wiadomosc.progress * 100)),
        errorHandler: () => bladSilnika?.(),
      }).then(async (silnik) => {
        if (opcje.sygnal.aborted) { await silnik.terminate(); throw new DOMException('Anulowano.', 'AbortError') }
        aktywny = silnik
        await silnik.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300', tessedit_pageseg_mode: PSM.SPARSE_TEXT })
        return silnik
      })
    }
    const silnik = await zPrzerwaniem(Promise.race([obietnicaSilnika, awariaSilnika]), opcje.sygnal)
    return slowaZWyniku(await zPrzerwaniem(Promise.race([silnik.recognize(obraz, {}, { blocks: true, text: true }), awariaSilnika]), opcje.sygnal))
  }

  const rozpoznajSkan = async (obraz: Blob, numer: number, czyPdf = false): Promise<StronaImportuOcr> => {
    const dane = await przygotujObraz(obraz, czyPdf ? { ...opcje, obrot: 0 } : opcje)
    const bitmapa = await createImageBitmap(dane.obraz)
    const kanwa = document.createElement('canvas')
    kanwa.width = dane.szerokosc; kanwa.height = dane.wysokosc
    const kontekst = kanwa.getContext('2d')!
    kontekst.drawImage(bitmapa, 0, 0); bitmapa.close()
    try {
      const siatka = dane.pionowe.length >= 3 && dane.poziome.length >= 3
      if (!siatka && !opcje.podpisyPotwierdzone) throw new Error('Nie rozpoznano pewnej siatki. Sprawdź oryginał, ustaw obszar podpisów i potwierdź go przed OCR.')
      // Pierwsza próba obejmuje wyłącznie nagłówek tabeli. Obszary podpisów w danych nie trafiają do OCR.
      const poczatek = siatka ? dane.poziome[0] + 2 : 0
      const koniec = siatka ? dane.poziome[1] - 2 : Math.max(20, dane.wysokosc * 0.12)
      const kanwaNaglowka = document.createElement('canvas')
      kanwaNaglowka.width = dane.szerokosc; kanwaNaglowka.height = Math.ceil(koniec - poczatek + 40)
      const kontekstNaglowka = kanwaNaglowka.getContext('2d')!
      kontekstNaglowka.fillStyle = '#fff'; kontekstNaglowka.fillRect(0, 0, kanwaNaglowka.width, kanwaNaglowka.height)
      kontekstNaglowka.drawImage(kanwa, 0, poczatek, dane.szerokosc, koniec - poczatek, 0, 20, dane.szerokosc, koniec - poczatek)
      for (const x of dane.pionowe) kontekstNaglowka.fillRect(x - 3, 0, 7, kanwaNaglowka.height)
      const naglowek = await rozpoznaj(kanwaNaglowka)
      kanwaNaglowka.width = 0; kanwaNaglowka.height = 0
      const podpisy = naglowek.filter((slowo) => czyPodpisOcr(slowo.tekst))
      const obszary = siatka ? dane.pionowe.slice(0, -1).flatMap((x, indeks) => podpisy.some((s) => s.x + s.szerokosc / 2 > x && s.x + s.szerokosc / 2 < dane.pionowe[indeks + 1]) ? [{ x, szerokosc: dane.pionowe[indeks + 1] - x }] : []) : []
      const grafiki = new Map<string, string>()
      if (siatka) for (let wiersz = 1; wiersz < dane.poziome.length - 1; wiersz++) for (let kolumna = 0; kolumna < dane.pionowe.length - 1; kolumna++) {
        const x = dane.pionowe[kolumna], y = dane.poziome[wiersz]
        if (!obszary.some((obszar) => obszar.x === x)) continue
        const szerokosc = dane.pionowe[kolumna + 1] - x - 12, wysokosc = dane.poziome[wiersz + 1] - y - 12
        if (szerokosc > 0 && wysokosc > 0) grafiki.set(`${wiersz - 1}:${kolumna}`, ocenObecnoscGrafikiPodpisu(kontekst.getImageData(x + 6, y + 6, szerokosc, wysokosc).data))
      }
      if (!obszary.length) {
        if (!opcje.podpisyPotwierdzone) throw new Error('Nie rozpoznano położenia podpisów. Sprawdź oryginał, ustaw obszar podpisów i potwierdź go przed OCR.')
        const granica = dane.szerokosc * opcje.podpisyOd / 100
        const x = siatka && opcje.podpisyOd < 100 ? [...dane.pionowe].reverse().find((linia) => linia <= granica) ?? 0 : granica
        obszary.push({ x, szerokosc: dane.szerokosc - x })
      }
      kontekst.fillStyle = '#fff'
      for (const obszar of obszary) kontekst.fillRect(obszar.x, koniec + 2, obszar.szerokosc, dane.wysokosc - koniec)
      // Linie siatki nie mogą łączyć liter i numerów porządkowych.
      for (const x of dane.pionowe) kontekst.fillRect(x - 2, 0, 5, dane.wysokosc)
      for (const y of dane.poziome) kontekst.fillRect(0, y - 2, dane.szerokosc, 5)
      const slowa = await rozpoznaj(kanwa)
      const tabela = zbudujTabeleOcr(slowa, siatka ? dane.pionowe : [], siatka ? dane.poziome : [], numer, opcje.odreczna)
      tabela.wiersze = tabela.wiersze.map((wiersz, numer) => wiersz.map((pole, kolumna) => pole.podpis ? { ...pole, tekst: grafiki.get(`${numer}:${kolumna}`) ?? 'Niejednoznaczna grafika' } : pole))
      if (!siatka) tabela.informacje += ' Brak pewnej siatki: sprawdź układ i ręcznie ustaw granicę podpisów.'
      if (!obszary.length || !podpisy.length) tabela.informacje += ` Podpisy zabezpieczono od ${opcje.podpisyOd}% szerokości dokumentu.`
      return { tabela, podglad: dane.oryginal }
    } finally { kanwa.width = 0; kanwa.height = 0 }
  }

  try {
    opcje.sygnal.throwIfAborted()
    if (!/\.pdf$/i.test(plik.name)) return [await rozpoznajSkan(plik, 1)]
    const biblioteka = await import('pdfjs-dist')
    biblioteka.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    const zadanie = biblioteka.getDocument({ data: new Uint8Array(await plik.arrayBuffer()) })
    const anulujPdf = () => { void zadanie.destroy() }
    opcje.sygnal.addEventListener('abort', anulujPdf, { once: true })
    try {
      const dokument = await zPrzerwaniem(zadanie.promise, opcje.sygnal)
      if (dokument.numPages > 30) throw new Error('Dokument przekracza 30 stron. Podziel go na części dla ograniczenia zużycia pamięci.')
      const wynik: StronaImportuOcr[] = []
      for (let numer = 1; numer <= dokument.numPages; numer++) {
        opcje.sygnal.throwIfAborted(); opcje.postep(`Strona ${numer} z ${dokument.numPages}`, Math.round((numer - 1) / dokument.numPages * 100))
        const strona = await dokument.getPage(numer)
        const widok = strona.getViewport({ scale: Math.min(2, 2400 / strona.getViewport({ scale: 1 }).width), rotation: (strona.rotate + opcje.obrot) % 360 })
        const kanwa = document.createElement('canvas'); kanwa.width = Math.ceil(widok.width); kanwa.height = Math.ceil(widok.height)
        try {
          const render = strona.render({ canvas: kanwa, viewport: widok })
          const anulujRender = () => render.cancel()
          opcje.sygnal.addEventListener('abort', anulujRender, { once: true })
          try { await zPrzerwaniem(render.promise, opcje.sygnal) } finally { opcje.sygnal.removeEventListener('abort', anulujRender) }
          const podglad = await new Promise<Blob>((rozwiaz, odrzuc) => kanwa.toBlob((blob) => blob ? rozwiaz(blob) : odrzuc(new Error('Nie udało się utworzyć podglądu PDF.')), 'image/png'))
          const tresc = await strona.getTextContent()
          const slowa: SlowoOcr[] = tresc.items.flatMap((element) => {
            if (!('str' in element) || !element.str.trim()) return []
            const macierz = biblioteka.Util.transform(widok.transform, element.transform)
            return [{ tekst: element.str, pewnosc: 90, x: macierz[4], y: macierz[5] - Math.abs(element.height * widok.scale), szerokosc: Math.abs(element.width * widok.scale), wysokosc: Math.max(8, Math.abs(element.height * widok.scale)) }]
          })
          if (opcje.obrot === 0 && slowa.some((slowo) => /nazwisko|imi[eę]/i.test(slowo.tekst))) {
            wynik.push({ tabela: zbudujTabeleOcr(slowa, [], [], numer, opcje.odreczna), podglad })
          } else wynik.push(await rozpoznajSkan(podglad, numer, true))
        } finally { kanwa.width = 0; kanwa.height = 0; strona.cleanup() }
      }
      return wynik
    } finally { opcje.sygnal.removeEventListener('abort', anulujPdf); await zadanie.destroy() }
  } finally { if (aktywny) await (aktywny as SilnikOcr).terminate() }
}
