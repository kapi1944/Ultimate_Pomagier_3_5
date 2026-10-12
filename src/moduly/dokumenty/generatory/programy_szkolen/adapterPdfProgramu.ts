import { polaczKontynuacjeProgramuPdf } from './ParserTekstu'
import { importujTekstProgramu, utworzWynikImportuProgramu, type WynikImportuProgramu } from './pipelineImportuProgramu'

import { wyodrebnijTekstPdf } from '../../../../wspolne/import/odczytTekstuPdf'
import type { PobierzBibliotekePdf } from '../../../../wspolne/import/odczytTekstuPdf'
export { normalizujTekstPdf, wyodrebnijTekstPdf } from '../../../../wspolne/import/odczytTekstuPdf'

function czyPusta(wartosc: string) {
  return !wartosc.trim()
}

export function utworzWynikImportuProgramuZTekstuPdf(tekst: string): WynikImportuProgramu {
  const wynikTekstu = importujTekstProgramu(polaczKontynuacjeProgramuPdf(tekst))

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
  pobierzBiblioteke?: PobierzBibliotekePdf,
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
