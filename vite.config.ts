import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pobierzInformacjeOWersji } from './skrypty/informacjeOWersji.mjs'

const informacjeOWersji = pobierzInformacjeOWersji()

// https://vite.dev/config/
export default defineConfig({
  define: { __INFORMACJE_O_WERSJI__: JSON.stringify(informacjeOWersji) },
  plugins: [react(), {
    name: 'informacje-o-wydaniu',
    transformIndexHtml(html) {
      return html.replace('%NAZWA_PRODUKTU%', informacjeOWersji.nazwaProduktu)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'wersja.json', source: JSON.stringify(informacjeOWersji, null, 2) })
    },
  }, {
    name: 'identyfikacja-launchera',
    configureServer(serwer) {
      const identyfikator = createHash('sha256').update(resolve(serwer.config.root).toLowerCase()).digest('hex')
      serwer.middlewares.use('/__ultimate_pomagier_launcher', (_zadanie, odpowiedz) => {
        odpowiedz.setHeader('Content-Type', 'application/json')
        odpowiedz.setHeader('Cache-Control', 'no-store')
        odpowiedz.end(JSON.stringify({ identyfikator }))
      })
    },
  }],
})
