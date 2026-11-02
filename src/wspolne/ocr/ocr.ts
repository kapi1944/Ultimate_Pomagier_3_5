import type { DaneWyekstrahowaneDokumentu } from '../dokumenty/typyDokumentu'
import { importujDokumentOcr } from './importDokumentuOcr'

export type WynikOcr = {
  tekst: string
  daneWyekstrahowane: DaneWyekstrahowaneDokumentu[]
  komunikat: string
}

export async function rozpoznajObrazLokalnie(plik: File): Promise<WynikOcr> {
  const strony = await importujDokumentOcr(plik, { sygnal: new AbortController().signal, postep: () => undefined, obrot: 0, odreczna: false, binarnie: false, podpisyOd: 100, podpisyPotwierdzone: true })
  const tekst = strony.map(({ tabela }) => [tabela.informacje, ...tabela.wiersze.map((wiersz) => wiersz.map((pole) => pole.podpis ? '[grafika podpisu]' : pole.tekst).join('\t'))].join('\n')).join('\n\n')
  return {
    tekst,
    daneWyekstrahowane: [
      {
        id: 'ocr-warstwa-1',
        rodzaj: 'tekst',
        etykieta: 'OCR',
        wartosc: tekst,
        status: 'do_zatwierdzenia',
        zrodlo: 'ocr',
      },
    ],
    komunikat: 'Wykonano lokalny OCR. Sprawdź odczyt przed wykorzystaniem danych.',
  }
}
