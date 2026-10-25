import { czyNowszaWersjaStabilna } from './aktualizacjeDesktop'

export const repozytoriumWydan = 'kapi1944/Ultimate_Pomagier_3_5'
const adresApi = `https://api.github.com/repos/${repozytoriumWydan}/releases`
const wzorzecWersji = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/
export type PlatformaWydania = 'windows' | 'android' | 'web' | 'linux' | 'macos' | 'ios'
export type PlikWydania = {
  wydanieId: number; wersja: string; platforma: PlatformaWydania; architektura: string
  kanal: 'stabilna' | 'testowa'; data: string; typ: string; nazwa: string; rozmiar: number
  adres: string; sha256: string; podpis: string; opis: string; commit: string
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return typeof wartosc === 'object' && wartosc !== null && !Array.isArray(wartosc)
}

export function rozpoznajPlatforme(agent: string, platforma = ''): PlatformaWydania {
  const tekst = `${agent} ${platforma}`
  if (/android/i.test(tekst)) return 'android'
  if (/iphone|ipad|ipod/i.test(tekst)) return 'ios'
  if (/windows|win32|win64/i.test(tekst)) return 'windows'
  if (/macintosh|macintel|macos/i.test(tekst)) return 'macos'
  if (/linux/i.test(tekst)) return 'linux'
  return 'web'
}

// Opis wydania zawiera manifest wygenerowany z gotowych artefaktów.
// Rozmiar i SHA-256 każdego pliku muszą zgadzać się z API GitHub.
export function odczytajWydania(dane: unknown): PlikWydania[] {
  if (!Array.isArray(dane)) throw new Error('Nieprawidłowa odpowiedź rejestru wydań.')
  const wynik: PlikWydania[] = []
  for (const wydanie of dane) {
    if (!czyObiekt(wydanie) || wydanie.draft !== false || typeof wydanie.prerelease !== 'boolean'
      || typeof wydanie.id !== 'number' || !Number.isSafeInteger(wydanie.id) || wydanie.id <= 0
      || typeof wydanie.body !== 'string' || typeof wydanie.tag_name !== 'string'
      || typeof wydanie.published_at !== 'string' || !Number.isFinite(Date.parse(wydanie.published_at))
      || !Array.isArray(wydanie.assets)) continue
    const fragment = /```pomagier-wydanie\s*\n([\s\S]*?)\n```/.exec(wydanie.body)
    if (!fragment) continue
    let manifest: unknown
    try { manifest = JSON.parse(fragment[1]) } catch { continue }
    if (!czyObiekt(manifest) || manifest.schemat !== 1 || typeof manifest.wersja !== 'string'
      || !wzorzecWersji.test(manifest.wersja) || wydanie.tag_name !== `v${manifest.wersja}`
      || (!wydanie.prerelease && manifest.wersja.includes('-'))
      || manifest.kanal !== (wydanie.prerelease ? 'testowa' : 'stabilna')
      || typeof manifest.commit !== 'string' || !/^[a-f0-9]{40}$/.test(manifest.commit)
      || !Array.isArray(manifest.pliki)) continue
    for (const plik of manifest.pliki) {
      if (!czyObiekt(plik) || !['windows', 'android', 'web', 'linux', 'macos', 'ios'].includes(String(plik.platforma))
        || typeof plik.architektura !== 'string' || !/^(x86_64|aarch64|armv7|i686|uniwersalna)$/.test(plik.architektura)
        || typeof plik.nazwa !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(plik.nazwa)
        || typeof plik.typ !== 'string' || !['exe', 'apk', 'zip'].includes(plik.typ) || !plik.nazwa.endsWith(`.${plik.typ}`)
        || typeof plik.rozmiar !== 'number' || !Number.isSafeInteger(plik.rozmiar) || plik.rozmiar <= 0
        || typeof plik.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(plik.sha256)
        || !czyObiekt(plik.podpis)) continue
      const adres = `https://github.com/${repozytoriumWydan}/releases/download/${wydanie.tag_name}/${plik.nazwa}`
      const artefakt = wydanie.assets.find((element: unknown) => czyObiekt(element) && element.name === plik.nazwa)
      if (!czyObiekt(artefakt) || artefakt.state !== 'uploaded' || artefakt.size !== plik.rozmiar
        || artefakt.digest !== `sha256:${plik.sha256}` || artefakt.browser_download_url !== adres) continue
      let podpis: string
      if (plik.platforma === 'windows' && plik.typ === 'exe' && plik.podpis.rodzaj === 'tauri') {
        const podpisArtefaktu = wydanie.assets.find((element: unknown) => czyObiekt(element) && element.name === `${plik.nazwa}.sig`)
        if (!czyObiekt(podpisArtefaktu) || podpisArtefaktu.state !== 'uploaded' || typeof podpisArtefaktu.size !== 'number' || podpisArtefaktu.size <= 0
          || typeof plik.podpis.sha256 !== 'string' || podpisArtefaktu.digest !== `sha256:${plik.podpis.sha256}`) continue
        podpis = 'Podpis aktualizacji Tauri; SHA-256 instalatora'
      } else if (plik.platforma === 'android' && plik.typ === 'apk' && plik.podpis.rodzaj === 'android'
        && typeof plik.podpis.certyfikatSha256 === 'string' && /^[a-f0-9]{64}$/.test(plik.podpis.certyfikatSha256)
        && plik.identyfikator === 'pl.ultimatepomagier.desktop' && Number.isSafeInteger(plik.versionCode) && Number(plik.versionCode) > 0) {
        podpis = `Certyfikat APK SHA-256: ${plik.podpis.certyfikatSha256}`
      } else if (plik.platforma === 'web' && plik.typ === 'zip' && plik.podpis.rodzaj === 'sha256') {
        podpis = 'Archiwum WEB; integralność SHA-256'
      } else continue
      wynik.push({ wydanieId: wydanie.id, wersja: manifest.wersja, platforma: plik.platforma as PlatformaWydania,
        architektura: plik.architektura, kanal: wydanie.prerelease ? 'testowa' : 'stabilna', data: wydanie.published_at, typ: plik.typ,
        nazwa: plik.nazwa, rozmiar: plik.rozmiar, adres, sha256: plik.sha256, podpis,
        opis: wydanie.body.slice(0, fragment.index).trim().slice(0, 4000), commit: manifest.commit })
    }
  }
  return wynik.sort((pierwszy, drugi) => Date.parse(drugi.data) - Date.parse(pierwszy.data))
}

async function pobierzJson(adres: string, sygnal?: AbortSignal): Promise<unknown> {
  const odpowiedz = await fetch(adres, { signal: sygnal, credentials: 'omit', cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json' } })
  if (!odpowiedz.ok) throw new Error(odpowiedz.status === 403 || odpowiedz.status === 429
    ? 'Rejestr wydań ograniczył liczbę zapytań. Spróbuj później.' : 'Rejestr wydań jest niedostępny.')
  return odpowiedz.json()
}

export async function pobierzRejestrWydan(sygnal?: AbortSignal): Promise<PlikWydania[]> {
  const wynik: PlikWydania[] = []
  for (let strona = 1; strona <= 10; strona += 1) {
    const dane = await pobierzJson(`${adresApi}?per_page=100&page=${strona}`, sygnal)
    wynik.push(...odczytajWydania(dane))
    if (!Array.isArray(dane) || dane.length < 100) return wynik
  }
  throw new Error('Historia przekracza zakres rejestru. Otwórz GitHub Releases, aby przejrzeć wszystkie wydania.')
}

export function wybierzNajnowsze(pliki: PlikWydania[], platforma: PlatformaWydania): PlikWydania | undefined {
  return pliki.filter((plik) => plik.platforma === platforma && plik.kanal === 'stabilna')
    .reduce<PlikWydania | undefined>((najnowszy, plik) => !najnowszy || czyNowszaWersjaStabilna(najnowszy.wersja, plik.wersja) ? plik : najnowszy, undefined)
}

export function czyStarszeWydanie(plik: PlikWydania, pliki: PlikWydania[], obecnaWersja: string): boolean {
  const najnowsze = wybierzNajnowsze(pliki, plik.platforma)
  const wersjaBazowa = plik.wersja.split('-')[0]
  return czyNowszaWersjaStabilna(wersjaBazowa, obecnaWersja.split('-')[0])
    || Boolean(najnowsze && czyNowszaWersjaStabilna(wersjaBazowa, najnowsze.wersja))
}

export async function sprawdzPlikPrzedPobraniem(plik: PlikWydania): Promise<void> {
  const aktualne = odczytajWydania([await pobierzJson(`${adresApi}/${plik.wydanieId}`, AbortSignal.timeout(20000))])
  if (!aktualne.some((element) => element.adres === plik.adres && element.sha256 === plik.sha256 && element.rozmiar === plik.rozmiar)) {
    throw new Error('Instalator został wycofany lub zmieniony. Odśwież listę wydań.')
  }
}
