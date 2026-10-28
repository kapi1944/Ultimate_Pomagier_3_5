import { readFile, mkdir, copyFile, writeFile, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { pobierzInformacjeOWersji } from './informacjeOWersji.mjs'
import { sprawdzKonfiguracjeDesktop, sprawdzFrontendDesktop } from './kontrolaTrybuFrontendu.mjs'
import { opiszPlik } from './dystrybucja.mjs'

const katalog = fileURLToPath(new URL('../', import.meta.url))
export const adresStabilnegoWydania = 'https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/latest/download/latest.json'
export const adresKanalowWydan = 'https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/windows-aktualizacje/{{target}}.json'

export function przygotujKonfiguracjeWydania(pakiet, konfiguracja, { podpisane, tag, czysteZrodla, kluczPubliczny, kluczPrywatny, kanal = 'stabilny' }) {
  sprawdzKonfiguracjeDesktop(konfiguracja)
  if (!/^\d+\.\d+\.\d+$/.test(pakiet.version) || (konfiguracja.version !== '../package.json' && pakiet.version !== konfiguracja.version)) throw new Error('Wersje pakietu i Tauri muszą być zgodne i stabilne.')
  if (podpisane) {
    if (!['stabilny', 'testowy'].includes(kanal)) throw new Error('Nieznany kanał aktualizacji.')
    if (tag !== `v${pakiet.version}`) throw new Error('Podpisane wydanie wymaga dokładnego stabilnego tagu zgodnego z wersją.')
    if (!czysteZrodla) throw new Error('Podpisane wydanie wymaga czystego repozytorium bez zmian lokalnych.')
    if (!kluczPubliczny?.trim() || !kluczPrywatny?.trim()) throw new Error('Brak kluczy podpisujących wydanie. Aktualizacja nie może być niepodpisana.')
    const zawartoscKlucza = Buffer.from(kluczPubliczny.trim(), 'base64').toString('utf8')
    const linie = zawartoscKlucza.trim().split(/\r?\n/)
    if (!linie[0]?.startsWith('untrusted comment:') || Buffer.from(linie[1] ?? '', 'base64').length !== 42) throw new Error('Niepoprawny format publicznego klucza Tauri.')
  }
  return {
    bundle: { createUpdaterArtifacts: podpisane },
    plugins: { updater: {
      pubkey: podpisane ? kluczPubliczny.trim() : '',
      requireSignedVersion: true,
      endpoints: podpisane ? [adresKanalowWydan] : [],
      windows: { installMode: 'passive' },
    } },
  }
}

export function nazwaInstalatora(wersja) {
  return `Ultimate_Pomagier_${wersja === '4.0.0' ? '4.0' : wersja}_Setup.exe`
}

async function buduj() {
  if (process.platform !== 'win32') throw new Error('Instalator buduj na Windows z Rust MSVC albo przez workflow Windows.')
  const pakiet = JSON.parse(await readFile(join(katalog, 'package.json'), 'utf8'))
  const konfiguracja = JSON.parse(await readFile(join(katalog, 'src-tauri/tauri.conf.json'), 'utf8'))
  const informacjeOWersji = pobierzInformacjeOWersji()
  const manifestRust = await readFile(join(katalog, 'src-tauri/Cargo.toml'), 'utf8')
  if (!manifestRust.includes(`version = "${pakiet.version}"`)) throw new Error('Wersja pakietu Rust musi odpowiadać package.json.')
  const podpisane = process.argv.includes('--podpisane')
  const sprawdzenieTagu = spawnSync('git', ['describe', '--exact-match', '--tags', 'HEAD'], { cwd: katalog, encoding: 'utf8' })
  const stanRepozytorium = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: katalog, encoding: 'utf8' })
  const nadpisanie = przygotujKonfiguracjeWydania(pakiet, konfiguracja, {
    podpisane, tag: sprawdzenieTagu.status === 0 ? sprawdzenieTagu.stdout.trim() : '',
    czysteZrodla: stanRepozytorium.status === 0 && stanRepozytorium.stdout.trim() === '',
    kluczPubliczny: process.env.TAURI_UPDATER_PUBLIC_KEY,
    kluczPrywatny: process.env.TAURI_SIGNING_PRIVATE_KEY,
    kanal: informacjeOWersji.kanal,
  })
  nadpisanie.app = { windows: [{ ...konfiguracja.app.windows[0], title: informacjeOWersji.nazwaProduktu }] }
  const katalogWydania = join(katalog, 'wydanie-desktop')
  const katalogArtefaktow = join(katalogWydania, podpisane ? 'podpisane' : 'testowe')
  await mkdir(katalogArtefaktow, { recursive: true })
  const plikKonfiguracji = join(katalogWydania, 'konfiguracja.json')
  await writeFile(plikKonfiguracji, JSON.stringify(nadpisanie, null, 2))
  const wynik = spawnSync(process.execPath, [join(katalog, 'node_modules/@tauri-apps/cli/tauri.js'), 'build', '--ci', '--target', 'x86_64-pc-windows-msvc', '--bundles', 'nsis', '--config', plikKonfiguracji, '--', '--locked'], { cwd: katalog, stdio: 'inherit' })
  if (wynik.status !== 0) throw new Error('Build Tauri nie powiódł się. Artefakt nie został przygotowany.')
  await sprawdzFrontendDesktop(join(katalog, 'dist'))
  const wersjaFrontendu = JSON.parse(await readFile(join(katalog, 'dist/wersja.json'), 'utf8'))
  if (JSON.stringify(wersjaFrontendu) !== JSON.stringify(informacjeOWersji)) throw new Error('Frontend pochodzi z innych źródeł niż bieżący build desktopowy.')
  const nazwa = nazwaInstalatora(pakiet.version)
  const zrodlo = join(katalog, `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Ultimate Pomagier_${pakiet.version}_x64-setup.exe`)
  if ((await stat(zrodlo)).size === 0) throw new Error('Instalator jest pusty.')
  await copyFile(zrodlo, join(katalogArtefaktow, nazwa))
  const suma = createHash('sha256').update(await readFile(zrodlo)).digest('hex')
  await writeFile(join(katalogArtefaktow, `${nazwa}.sha256`), `${suma}  ${nazwa}\n`)
  await writeFile(join(katalogArtefaktow, 'wersja.json'), JSON.stringify({ ...informacjeOWersji, instalator: nazwa, sha256: suma }, null, 2))
  if (podpisane) {
    const podpis = (await readFile(`${zrodlo}.sig`, 'utf8')).trim()
    if (!podpis) throw new Error('Brak podpisu aktualizacji.')
    await copyFile(`${zrodlo}.sig`, join(katalogArtefaktow, `${nazwa}.sig`))
    const metadanePodpisu = await opiszPlik(`${zrodlo}.sig`, {})
    const metadaneInstalatora = await opiszPlik(join(katalogArtefaktow, nazwa), {
      platforma: 'windows', architektura: 'x86_64', typ: 'exe', podpis: { rodzaj: 'tauri', sha256: metadanePodpisu.sha256 },
    })
    await writeFile(join(katalogArtefaktow, 'wydanie-windows.json'), JSON.stringify({ wersja: pakiet.version, commit: informacjeOWersji.commit, pliki: [metadaneInstalatora] }, null, 2))
    const manifestAktualizacji = {
      version: pakiet.version,
      kanal: informacjeOWersji.kanal,
      zgodnoscDanych: informacjeOWersji.zgodnoscDanych,
      commit: informacjeOWersji.commit,
      numerKompilacji: informacjeOWersji.numerKompilacji,
      notes: process.env.POMAGIER_OPIS_ZMIAN?.trim() || `Wydanie ${informacjeOWersji.kanal}: Ultimate Pomagier ${pakiet.version}`,
      pub_date: new Date().toISOString(),
      platforms: { 'windows-x86_64': {
        signature: podpis,
        url: `https://github.com/kapi1944/Ultimate_Pomagier_3_5/releases/download/v${pakiet.version}/${nazwa}`,
      } },
    }
    await writeFile(join(katalogArtefaktow, 'latest.json'), JSON.stringify(manifestAktualizacji, null, 2))
    await writeFile(join(katalogArtefaktow, `windows-${informacjeOWersji.kanal}.json`), JSON.stringify({
      ...manifestAktualizacji,
      platforms: { [`windows-${informacjeOWersji.kanal}`]: manifestAktualizacji.platforms['windows-x86_64'] },
    }, null, 2))
  }
  console.log(`Przygotowano ${join(katalogArtefaktow, nazwa)}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  buduj().catch((blad) => { console.error(blad.message); process.exitCode = 1 })
}
