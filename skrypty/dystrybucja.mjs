import { readFile, writeFile, readdir, mkdir, stat, copyFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { zipSync } from 'fflate'
import { sprawdzFrontendDesktop } from './kontrolaTrybuFrontendu.mjs'

export const katalogProjektu = fileURLToPath(new URL('../', import.meta.url))
export function numerWersjiAndroid(wersja) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(wersja)) throw new Error('Android wymaga stabilnej wersji X.Y.Z.')
  const [glowna, poboczna, poprawka] = wersja.split('.').map(Number)
  const numer = glowna * 1000000 + poboczna * 1000 + poprawka
  if (poboczna >= 1000 || poprawka >= 1000 || numer < 1 || numer > 2100000000) throw new Error('Wersja przekracza zakres versionCode Androida.')
  return numer
}
export function sprawdzZrodlaWydania(wersja) {
  const tag = execFileSync('git', ['describe', '--tags', '--exact-match', 'HEAD'], { cwd: katalogProjektu, encoding: 'utf8', windowsHide: true }).trim()
  const zmiany = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: katalogProjektu, encoding: 'utf8', windowsHide: true }).trim()
  if (tag !== `v${wersja}` || zmiany) throw new Error('Wydanie wymaga czystych źródeł na dokładnym tagu vX.Y.Z.')
}
export async function opiszPlik(sciezka, dane) {
  const zawartosc = await readFile(sciezka)
  if (!zawartosc.length) throw new Error('Artefakt jest pusty.')
  return { ...dane, nazwa: sciezka.split(/[\\/]/).at(-1), rozmiar: zawartosc.length, sha256: createHash('sha256').update(zawartosc).digest('hex') }
}
export async function przygotujWeb() {
  await sprawdzFrontendDesktop(join(katalogProjektu, 'dist'))
  const informacje = JSON.parse(await readFile(join(katalogProjektu, 'dist/wersja.json'), 'utf8'))
  if (informacje.zmienioneZrodla) throw new Error('Archiwum wydania WEB wymaga czystych źródeł.')
  sprawdzZrodlaWydania(informacje.wersja)
  const pliki = {}
  for (const sciezka of await readdir(join(katalogProjektu, 'dist'), { recursive: true })) {
    if ((await stat(join(katalogProjektu, 'dist', sciezka))).isFile()) pliki[sciezka.replaceAll('\\', '/')] = new Uint8Array(await readFile(join(katalogProjektu, 'dist', sciezka)))
  }
  const katalog = join(katalogProjektu, 'wydanie-web')
  await mkdir(katalog, { recursive: true })
  const sciezka = join(katalog, `Ultimate_Pomagier_${informacje.wersja}_WEB.zip`)
  await writeFile(sciezka, zipSync(pliki))
  const plik = await opiszPlik(sciezka, { platforma: 'web', architektura: 'uniwersalna', typ: 'zip', podpis: { rodzaj: 'sha256' } })
  await writeFile(join(katalog, 'wydanie-web.json'), JSON.stringify({ wersja: informacje.wersja, commit: informacje.commit, pliki: [plik] }, null, 2))
}

export async function polaczMetadane(katalog, sciezkaOpisu) {
  const opisy = (await readdir(katalog)).filter((nazwa) => /^wydanie-(windows|android|web)\.json$/.test(nazwa))
  if (opisy.length !== 3) throw new Error('Wymagane są metadane Windows, Android i WEB.')
  const manifest = { schemat: 1, wersja: '', commit: '', kanal: 'stabilna', pliki: [] }
  for (const nazwa of opisy) {
    const dane = JSON.parse(await readFile(join(katalog, nazwa), 'utf8'))
    if (!/^\d+\.\d+\.\d+$/.test(dane.wersja) || !/^[a-f0-9]{40}$/.test(dane.commit) || !Array.isArray(dane.pliki) || !dane.pliki.length) throw new Error('Niepełne metadane wydania.')
    if (manifest.wersja && (manifest.wersja !== dane.wersja || manifest.commit !== dane.commit)) throw new Error('Artefakty pochodzą z różnych wersji lub commitów.')
    manifest.wersja = dane.wersja; manifest.commit = dane.commit
    for (const plik of dane.pliki) {
      if (typeof plik.nazwa !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(plik.nazwa) || manifest.pliki.some((element) => element.nazwa === plik.nazwa)) throw new Error('Nieprawidłowa lub powtórzona nazwa pliku.')
      const rzeczywisty = await opiszPlik(join(katalog, plik.nazwa), {})
      if (rzeczywisty.sha256 !== plik.sha256 || rzeczywisty.rozmiar !== plik.rozmiar) throw new Error('Suma lub rozmiar pliku nie odpowiada metadanym.')
      if (plik.platforma === 'windows') {
        const podpis = await opiszPlik(join(katalog, `${plik.nazwa}.sig`), {})
        if (plik.podpis?.rodzaj !== 'tauri' || podpis.sha256 !== plik.podpis.sha256) throw new Error('Brak zgodnego podpisu Tauri.')
      } else if (plik.platforma === 'android') {
        if (plik.podpis?.rodzaj !== 'android' || !/^[a-f0-9]{64}$/.test(plik.podpis.certyfikatSha256) || plik.identyfikator !== 'pl.ultimatepomagier.desktop' || plik.versionCode !== numerWersjiAndroid(dane.wersja)) throw new Error('Niepoprawne metadane APK.')
      } else if (plik.platforma !== 'web' || plik.podpis?.rodzaj !== 'sha256') throw new Error('Nieobsługiwane metadane platformy.')
      manifest.pliki.push(plik)
    }
  }
  if (new Set(manifest.pliki.map((plik) => plik.platforma)).size !== 3) throw new Error('Brak wymaganej platformy.')
  const opis = (await readFile(sciezkaOpisu, 'utf8')).trim()
  if (!opis || opis.includes('```pomagier-wydanie')) throw new Error('Podaj rzeczywisty opis zmian bez bloku technicznego.')
  await writeFile(join(katalog, 'opis-wydania.md'), `${opis}\n\n\`\`\`pomagier-wydanie\n${JSON.stringify(manifest, null, 2)}\n\`\`\`\n`)
  await writeFile(join(katalog, 'rejestr-wydania.json'), JSON.stringify(manifest, null, 2))
  return manifest
}

export async function zbierzArtefakty(zrodlo, cel) {
  await mkdir(cel, { recursive: true })
  const nazwy = new Set()
  for (const sciezka of await readdir(zrodlo, { recursive: true })) {
    const nazwa = sciezka.split(/[\\/]/).at(-1)
    if (!/\.(exe|apk|zip|sig|sha256)$/.test(nazwa) && !/^(latest|windows-(stabilny|testowy)|wydanie-(windows|android|web))\.json$/.test(nazwa)) continue
    if (!(await stat(join(zrodlo, sciezka))).isFile()) continue
    if (nazwy.has(nazwa)) throw new Error('Artefakty zawierają powtórzone nazwy plików.')
    nazwy.add(nazwa)
    await copyFile(join(zrodlo, sciezka), join(cel, nazwa))
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const polecenie = process.argv[2]
  const wykonanie = polecenie === 'web' ? przygotujWeb() : polecenie === 'polacz' ? polaczMetadane(resolve(process.argv[3]), resolve(process.argv[4])) : polecenie === 'zbierz' ? zbierzArtefakty(resolve(process.argv[3]), resolve(process.argv[4])) : Promise.reject(new Error('Użyj: web, zbierz <źródło> <cel> albo polacz <katalog artefaktów> <plik opisu zmian>.'))
  wykonanie.catch((blad) => { console.error(blad.message); process.exitCode = 1 })
}
