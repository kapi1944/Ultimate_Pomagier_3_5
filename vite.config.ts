import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
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
