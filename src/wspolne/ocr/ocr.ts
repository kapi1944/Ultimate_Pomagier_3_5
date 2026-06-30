import type { DaneWyekstrahowaneDokumentu } from '../dokumenty/typyDokumentu'

export type WynikOcr = {
  tekst: string
  daneWyekstrahowane: DaneWyekstrahowaneDokumentu[]
  komunikat: string
}

export async function rozpoznajObrazLokalnie(plik: File): Promise<WynikOcr> {
  return {
    tekst: '',
    daneWyekstrahowane: [
      {
        id: 'ocr-warstwa-1',
        rodzaj: 'tekst',
        etykieta: 'OCR',
        wartosc: `Obraz ${plik.name} wymaga zatwierdzenia po uruchomieniu lokalnego OCR.`,
        status: 'do_zatwierdzenia',
        zrodlo: 'ocr',
      },
    ],
    komunikat: 'Obraz zapisano jako wzorzec. Warstwa OCR jest przygotowana, ale wymaga lokalnego silnika rozpoznawania.',
  }
}
