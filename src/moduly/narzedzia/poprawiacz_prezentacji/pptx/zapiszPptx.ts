import type { ModelPptx } from './modelPptx'

export function nazwaPoprawionejPrezentacji(nazwa: string) {
  return `${nazwa.replace(/\.pptx$/i, '')}_POPRAWIONA.pptx`
}

export async function zapiszPptx(model: ModelPptx): Promise<Blob> {
  return model.archiwum.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', compression: 'DEFLATE' })
}

export function pobierzKopiePptx(plik: Blob, nazwa: string) {
  const adres = URL.createObjectURL(plik)
  const odnosnik = document.createElement('a')
  odnosnik.href = adres
  odnosnik.download = nazwaPoprawionejPrezentacji(nazwa)
  try {
    document.body.appendChild(odnosnik)
    odnosnik.click()
  } finally {
    odnosnik.remove()
    window.setTimeout(() => URL.revokeObjectURL(adres), 1000)
  }
}
