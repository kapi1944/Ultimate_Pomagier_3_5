import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const katalogProjektu = fileURLToPath(new URL('../', import.meta.url))

export function pobierzStanDanych() {
  return {
    status: 'niedostepny',
    pending: null,
    synchronizacjaZdalna: false,
    warnings: [
      'Dane są w localStorage przeglądarki. Launcher nie ma dostępu do ich integralności ani stanów migracji oczekujących na weryfikację.',
      'Aplikacja nie ma zdalnej synchronizacji ani kolejki operacji do wysłania. Backup, import i migracje obsługuje aplikacja.',
    ],
  }
}

export async function pobierzKonfiguracjeSerwera() {
  const { resolveConfig } = await import('vite')
  const konfiguracja = await resolveConfig({ root: katalogProjektu, logLevel: 'silent' }, 'serve')
  if (konfiguracja.server.https) throw new Error('Launcher wymaga lokalnego serwera HTTP; uruchom npm run dev ręcznie dla HTTPS.')
  const identyfikator = createHash('sha256').update(resolve(konfiguracja.root).toLowerCase()).digest('hex')
  const adres = `http://localhost:${konfiguracja.server.port}${konfiguracja.base}`
  return { adres, identyfikator }
}

export async function sprawdzSerwer(konfiguracja) {
  try {
    const odpowiedz = await fetch(new URL('/__ultimate_pomagier_launcher', konfiguracja.adres), { signal: AbortSignal.timeout(1500) })
    const dane = await odpowiedz.json()
    return odpowiedz.ok && dane.identyfikator === konfiguracja.identyfikator
  } catch {
    return false
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const tryb = process.argv[2]
    if (tryb === 'dane') console.log(JSON.stringify(pobierzStanDanych()))
    else {
      const konfiguracja = await pobierzKonfiguracjeSerwera()
      console.log(JSON.stringify({ ...konfiguracja, dziala: await sprawdzSerwer(konfiguracja) }))
    }
  } catch (blad) {
    console.error(blad.message)
    process.exitCode = 1
  }
}
