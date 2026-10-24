import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const polecenieBudowaniaDesktop = 'npm run build && node skrypty/kontrolaTrybuFrontendu.mjs'

export function okreslTrybFrontendu(trybVite, zmienne) {
  const flagaDemo = zmienne.VITE_TRYB_DEMONSTRACYJNY
  if (![undefined, '', 'true', 'false'].includes(flagaDemo)) throw new Error('VITE_TRYB_DEMONSTRACYJNY musi mieć wartość true albo false.')
  const czyDemonstracja = flagaDemo === 'true'
  if (czyDemonstracja !== (trybVite === 'demonstracyjny')) throw new Error('Demonstracja wymaga jawnego trybu demonstracyjny. Nie wolno włączać jej w zwykłym buildzie lub uruchomieniu.')
  return { wersjaSchematu: 1, trybVite, tryb: czyDemonstracja ? 'demonstracyjny' : trybVite === 'production' ? 'produkcyjny' : 'programistyczny' }
}

export function sprawdzKonfiguracjeDesktop(konfiguracja) {
  if (konfiguracja.build?.beforeBuildCommand !== polecenieBudowaniaDesktop || konfiguracja.build?.frontendDist !== '../dist') throw new Error('Wydanie Windows musi budować i sprawdzać produkcyjny frontend przed pakowaniem.')
}

export function sprawdzManifestProdukcyjny(manifest) {
  if (!manifest || manifest.wersjaSchematu !== 1 || manifest.tryb !== 'produkcyjny' || manifest.trybVite !== 'production') throw new Error('Odrzucono frontend demonstracyjny, programistyczny lub bez rozpoznanego manifestu. Nie można użyć go w instalatorze produkcyjnym.')
}

export async function sprawdzFrontendDesktop(katalog = fileURLToPath(new URL('../dist/', import.meta.url))) {
  const manifest = JSON.parse(await readFile(resolve(katalog, 'tryb-frontendu.json'), 'utf8'))
  sprawdzManifestProdukcyjny(manifest)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  sprawdzFrontendDesktop().catch((blad) => { console.error(blad.message); process.exitCode = 1 })
}
