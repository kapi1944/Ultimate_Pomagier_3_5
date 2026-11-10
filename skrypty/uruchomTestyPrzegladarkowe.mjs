import { spawn } from 'node:child_process'
import { createServer } from 'vite'

const serwery = []
try {
  async function uruchomSerwer(tryb) {
    const serwer = await createServer({ mode: tryb, server: { host: '127.0.0.1', port: tryb === 'development' ? 47831 : 5173, strictPort: false, open: false }, logLevel: 'error' })
    serwery.push(serwer)
    await serwer.listen()
    const adres = serwer.httpServer.address()
    if (!adres || typeof adres === 'string') throw new Error('Nie można odczytać portu serwera testowego.')
    return `http://127.0.0.1:${adres.port}`
  }
  const adresDemo = await uruchomSerwer('demonstracyjny')
  const adresProdukcyjny = await uruchomSerwer('development')
  const pliki = process.argv.slice(2)
  const proces = spawn(process.execPath, ['--test', ...(pliki.length ? pliki : ['testy/importMailaSzczegolow.przegladarka.test.mjs'])], {
    stdio: 'inherit',
    env: { ...process.env, POMAGIER_ADRES: adresDemo, POMAGIER_ADRES_PRODUKCYJNY: adresProdukcyjny },
  })
  process.exitCode = await new Promise((rozwiaz, odrzuc) => {
    proces.once('error', odrzuc)
    proces.once('exit', (kod) => rozwiaz(kod ?? 1))
  })
} finally {
  await Promise.all(serwery.map((serwer) => serwer.close()))
}
