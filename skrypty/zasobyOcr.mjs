import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// Zasoby trafiają do paczki aplikacji; przetwarzanie nie korzysta z CDN.
export function zasobyOcr() {
  const wymagaj = createRequire(import.meta.url)
  const katalog = (pakiet) => dirname(wymagaj.resolve(`${pakiet}/package.json`))
  const pliki = new Map([
    ['worker.min.js', join(katalog('tesseract.js'), 'dist/worker.min.js')],
    ...['', '-simd', '-relaxedsimd'].map((wariant) => [`tesseract-core${wariant}-lstm.wasm.js`, join(katalog('tesseract.js-core'), `tesseract-core${wariant}-lstm.wasm.js`)]),
    ...['pol', 'eng'].map((jezyk) => [`${jezyk}.traineddata.gz`, join(katalog(`@tesseract.js-data/${jezyk}`), `4.0.0_best_int/${jezyk}.traineddata.gz`)]),
    ['LICENSE-tesseract-core.txt', join(katalog('tesseract.js-core'), 'LICENSE')],
    ['LICENSE-tesseract.txt', join(katalog('tesseract.js'), 'LICENSE.md')],
  ])
  return {
    name: 'lokalne-zasoby-ocr',
    configureServer(serwer) {
      serwer.middlewares.use('/ocr', (zadanie, odpowiedz, dalej) => {
        const nazwa = zadanie.url?.split('?')[0].slice(1)
        const plik = pliki.get(nazwa)
        if (!plik) return dalej()
        odpowiedz.setHeader('Content-Type', nazwa.endsWith('.js') ? 'application/javascript' : 'application/octet-stream')
        odpowiedz.end(readFileSync(plik))
      })
    },
    generateBundle() {
      for (const [nazwa, plik] of pliki) this.emitFile({ type: 'asset', fileName: `ocr/${nazwa}`, source: readFileSync(plik) })
    },
  }
}
