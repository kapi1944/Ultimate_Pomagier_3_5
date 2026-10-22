import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

export function pobierzInformacjeOWersji() {
  const katalog = new URL('../', import.meta.url)
  const pakiet = JSON.parse(readFileSync(new URL('package.json', katalog), 'utf8'))
  const git = (...argumenty) => execFileSync('git', argumenty, { cwd: katalog, encoding: 'utf8' }).trim()
  return {
    nazwaProduktu: `Ultimate Pomagier ${pakiet.version.split('.').slice(0, 2).join('.')}`,
    wersja: pakiet.version,
    commit: git('rev-parse', 'HEAD'),
    zmienioneZrodla: git('status', '--porcelain', '--untracked-files=all') !== '',
  }
}
