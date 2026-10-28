import { readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function pobierzInformacjeOWersji() {
  const katalog = new URL('../', import.meta.url)
  const pakiet = JSON.parse(readFileSync(new URL('package.json', katalog), 'utf8'))
  const { zgodnoscDanych } = JSON.parse(readFileSync(new URL('konfiguracja-aktualizacji.json', katalog), 'utf8'))
  const kanal = process.env.POMAGIER_KANAL_AKTUALIZACJI || 'stabilny'
  if (!['stabilny', 'testowy'].includes(kanal) || !Number.isSafeInteger(zgodnoscDanych) || zgodnoscDanych < 1) throw new Error('Nieprawidłowa konfiguracja zgodności danych lub kanału aktualizacji.')
  const git = (...argumenty) => execFileSync('git', argumenty, { cwd: katalog, encoding: 'utf8' }).trim()
  const katalogZrodel = fileURLToPath(new URL('src/', katalog))
  const skrotZrodel = createHash('sha256')
  const plikiZrodlowe = readdirSync(katalogZrodel, { recursive: true }).map(String).sort()
  for (const plik of plikiZrodlowe) {
    const sciezka = join(katalogZrodel, plik)
    if (statSync(sciezka).isFile()) skrotZrodel.update(plik.replaceAll('\\', '/')).update('\0').update(readFileSync(sciezka))
  }
  return {
    nazwaProduktu: `Ultimate Pomagier ${pakiet.version.split('.').slice(0, 2).join('.')}`,
    wersja: pakiet.version,
    numerKompilacji: process.env.GITHUB_RUN_NUMBER || git('rev-list', '--count', 'HEAD'),
    kanal,
    zgodnoscDanych,
    commit: git('rev-parse', 'HEAD'),
    zmienioneZrodla: git('status', '--porcelain', '--untracked-files=all') !== '',
    zrodlaSha256: skrotZrodel.digest('hex'),
    logowanieSha256: createHash('sha256').update(readFileSync(new URL('src/aplikacja/logowanie/PanelLogowania.tsx', katalog))).digest('hex'),
  }
}
