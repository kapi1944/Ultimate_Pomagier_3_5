import type { TypZrodlaDokumentu } from '../dokumenty/typyDokumentu'

export function rozpoznajTypPliku(plik: File): TypZrodlaDokumentu {
  const nazwa = plik.name.toLowerCase()
  const typ = plik.type.toLowerCase()

  if (nazwa.endsWith('.docx')) {
    return 'docx'
  }

  if (nazwa.endsWith('.csv') || typ === 'text/csv') {
    return 'csv'
  }

  if (nazwa.endsWith('.pdf') || typ === 'application/pdf') {
    return 'pdf'
  }

  if (
    typ.startsWith('image/') ||
    nazwa.endsWith('.jpg') ||
    nazwa.endsWith('.jpeg') ||
    nazwa.endsWith('.png') ||
    nazwa.endsWith('.svg')
  ) {
    return 'obraz'
  }

  if (typ.startsWith('text/') || nazwa.endsWith('.txt')) {
    return 'tekst'
  }

  return 'nieznany'
}
