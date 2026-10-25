import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

export function sprawdzSzkicPublikacji(wydanie, tag, repozytorium) {
  if (!wydanie.draft || wydanie.prerelease || wydanie.tag_name !== tag || !/^v\d+\.\d+\.\d+$/.test(tag)
    || typeof wydanie.body !== 'string' || !Array.isArray(wydanie.assets)) throw new Error('Brak przygotowanego stabilnego szkicu.')
  const fragment = /```pomagier-wydanie\s*\n([\s\S]*?)\n```/.exec(wydanie.body)
  if (!fragment) throw new Error('Brak manifestu szkicu.')
  const manifest = JSON.parse(fragment[1])
  if (manifest.schemat !== 1 || `v${manifest.wersja}` !== tag || manifest.kanal !== 'stabilna' || !/^[a-f0-9]{40}$/.test(manifest.commit)
    || !Array.isArray(manifest.pliki) || new Set(manifest.pliki.map((plik) => plik.platforma)).size !== 3) throw new Error('Niekompletny manifest szkicu.')
  for (const plik of manifest.pliki) {
    const artefakt = wydanie.assets.find((element) => element.name === plik.nazwa)
    if (!/^[a-zA-Z0-9_.-]+$/.test(plik.nazwa) || !/^[a-f0-9]{64}$/.test(plik.sha256)
      || !artefakt || artefakt.state !== 'uploaded' || artefakt.size !== plik.rozmiar || artefakt.size <= 0
      || artefakt.digest !== `sha256:${plik.sha256}`
      || artefakt.browser_download_url !== `https://github.com/${repozytorium}/releases/download/${tag}/${plik.nazwa}`) throw new Error('Pliki szkicu są niekompletne lub zmienione.')
    if (plik.platforma === 'windows') {
      const podpis = wydanie.assets.find((element) => element.name === `${plik.nazwa}.sig`)
      if (plik.podpis?.rodzaj !== 'tauri' || !podpis || podpis.state !== 'uploaded' || podpis.size <= 0 || podpis.digest !== `sha256:${plik.podpis.sha256}`) throw new Error('Brak zgodnego podpisu Windows.')
    } else if (plik.platforma === 'android') {
      if (plik.podpis?.rodzaj !== 'android' || !/^[a-f0-9]{64}$/.test(plik.podpis.certyfikatSha256) || plik.identyfikator !== 'pl.ultimatepomagier.desktop' || !Number.isSafeInteger(plik.versionCode)) throw new Error('Brak metadanych podpisanego APK.')
    } else if (plik.platforma !== 'web' || plik.podpis?.rodzaj !== 'sha256') throw new Error('Nieobsługiwana platforma szkicu.')
  }
  const aktualizator = wydanie.assets.find((element) => element.name === 'latest.json')
  if (!aktualizator || aktualizator.state !== 'uploaded' || aktualizator.size <= 0) throw new Error('Brak manifestu aktualizatora Windows.')
  return manifest
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Publikacja wymaga ręcznego zatwierdzenia workflow.')
    const tag = process.env.GITHUB_REF_NAME
    const repozytorium = process.env.GITHUB_REPOSITORY
    const wydanie = JSON.parse(execFileSync('gh', ['api', `repos/${repozytorium}/releases/tags/${tag}`], { encoding: 'utf8', windowsHide: true }))
    const manifest = sprawdzSzkicPublikacji(wydanie, tag, repozytorium)
    const commit = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { encoding: 'utf8', windowsHide: true }).trim()
    if (commit !== manifest.commit) throw new Error('Tag nie wskazuje commita przygotowanych instalatorów.')
    execFileSync('gh', ['release', 'edit', tag, '--draft=false', '--latest'], { stdio: 'inherit', windowsHide: true })
  } catch (blad) { console.error(blad.message); process.exitCode = 1 }
}
