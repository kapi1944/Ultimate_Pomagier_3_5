import { importujTekstProgramu, utworzWynikImportuProgramu, type WynikImportuProgramu } from './pipelineImportuProgramu'

type ElementTekstuPdf = { str?: string; hasEOL?: boolean }
type StronaPdf = { getTextContent: () => Promise<{ items: ElementTekstuPdf[] }> }
type DokumentPdf = { numPages: number; getPage: (numerStrony: number) => Promise<StronaPdf>; destroy?: () => Promise<void> }
type BibliotekaPdf = { getDocument: (dane: { data: Uint8Array }) => { promise: Promise<DokumentPdf> }; GlobalWorkerOptions: { workerSrc: string } }
type PobierzBibliotekePdf = () => Promise<BibliotekaPdf>

function czyPusta(wartosc: string) {
  return !wartosc.trim()
}

function normalizujWierszPdf(wiersz: string) {
  return wiersz
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

export function normalizujTekstPdf(tekst: string) {
  return tekst
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(normalizujWierszPdf)
    .filter(Boolean)
    .join('\n')
    .trim()
}

function czyTekstPdfJestUzyteczny(tekst: string) {
  return (tekst.match(/[\p{L}\p{N}]/gu) ?? []).length >= 3
}

function polaczElementyTekstuPdf(elementy: ElementTekstuPdf[]) {
  let wiersz = ''
  const wiersze: string[] = []

  elementy.forEach((element) => {
    const fragment = element.str?.trim()

    if (fragment) {
      wiersz = wiersz ? `${wiersz} ${fragment}` : fragment
    }

    if (element.hasEOL && wiersz) {
      wiersze.push(wiersz)
      wiersz = ''
    }
  })

  if (wiersz) {
    wiersze.push(wiersz)
  }

  return wiersze.join('\n')
}

async function pobierzBibliotekePdf(): Promise<BibliotekaPdf> {
  const biblioteka = await import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as BibliotekaPdf

  if (!biblioteka.GlobalWorkerOptions.workerSrc) {
    biblioteka.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  }

  return biblioteka
}

export async function wyodrebnijTekstPdf(
  plik: Pick<File, 'arrayBuffer'>,
  pobierzBiblioteke: PobierzBibliotekePdf = pobierzBibliotekePdf,
) {
  const biblioteka = await pobierzBiblioteke()
  const zadanie = biblioteka.getDocument({ data: new Uint8Array(await plik.arrayBuffer()) })
  const dokument = await zadanie.promise

  try {
    if (!dokument.numPages) {
      throw new Error('PDF_BEZ_STRON')
    }

    const strony: string[] = []

    for (let numerStrony = 1; numerStrony <= dokument.numPages; numerStrony += 1) {
      const strona = await dokument.getPage(numerStrony)
      const tresc = await strona.getTextContent()
      strony.push(polaczElementyTekstuPdf(tresc.items))
    }

    const tekst = normalizujTekstPdf(strony.join('\n\n'))

    if (!czyTekstPdfJestUzyteczny(tekst)) {
      throw new Error('PDF_BEZ_TEKSTU')
    }

    return tekst
  } finally {
    await dokument.destroy?.()
  }
}

export function utworzWynikImportuProgramuZTekstuPdf(tekst: string): WynikImportuProgramu {
  const wynikTekstu = importujTekstProgramu(tekst)

  return utworzWynikImportuProgramu({
    zrodlo: 'PDF',
    propozycje: wynikTekstu.propozycje,
    ostrzezenia: wynikTekstu.ostrzezenia,
    bledy: czyPusta(tekst) ? ['Nie udało się odczytać tekstu z tego pliku PDF. Dokument może być skanem bez warstwy tekstowej.'] : wynikTekstu.bledy,
  })
}

function utworzBladPdf(tresc: string): WynikImportuProgramu {
  return utworzWynikImportuProgramu({ zrodlo: 'PDF', propozycje: [], ostrzezenia: [], bledy: [tresc] })
}

function pobierzKomunikatBleduPdf(blad: unknown) {
  if (blad instanceof Error && blad.message === 'PDF_BEZ_STRON') {
    return 'Plik PDF nie zawiera stron możliwych do odczytania.'
  }

  if (blad instanceof Error && blad.message === 'PDF_BEZ_TEKSTU') {
    return 'Nie udało się odczytać tekstu z tego pliku PDF. Dokument może być skanem bez warstwy tekstowej. Import skanowanych PDF nie jest jeszcze obsługiwany.'
  }

  const nazwa = blad instanceof Error ? blad.name : ''
  const kod = typeof blad === 'object' && blad !== null && 'code' in blad ? (blad as { code?: unknown }).code : undefined

  if (nazwa === 'PasswordException' || kod === 1 || kod === 2) {
    return 'Ten PDF jest zabezpieczony i nie może zostać zaimportowany.'
  }

  return 'Nie udało się odczytać poprawnej treści z pliku PDF.'
}

export async function importujPdfProgramu(
  plik: File,
  pobierzBiblioteke: PobierzBibliotekePdf = pobierzBibliotekePdf,
): Promise<WynikImportuProgramu> {
  if (!/\.pdf$/i.test(plik.name)) {
    return utworzBladPdf('Wybierz plik PDF z rozszerzeniem .pdf.')
  }

  if (plik.size === 0) {
    return utworzBladPdf('Plik PDF jest pusty.')
  }

  try {
    return utworzWynikImportuProgramuZTekstuPdf(await wyodrebnijTekstPdf(plik, pobierzBiblioteke))
  } catch (blad) {
    return utworzBladPdf(pobierzKomunikatBleduPdf(blad))
  }
}
