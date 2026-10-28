import { czyNowszaWersjaStabilna } from '../src/aplikacja/desktop/aktualizacjeDesktop.ts'

// Walidacja dla centralnego zatwierdzania; ten modul nie publikuje wydan.
export function sprawdzPublikacjeWindows(manifest, wydania, kanal, tag, opis) {
  if (!['stabilny', 'testowy'].includes(kanal) || manifest.kanal !== kanal || tag !== `v${manifest.version}`
    || !czyNowszaWersjaStabilna('0.0.0', manifest.version)
    || !Number.isSafeInteger(manifest.zgodnoscDanych) || manifest.zgodnoscDanych < 1
    || !/^[a-f0-9]{40}$/.test(manifest.commit) || !opis?.trim() || opis.includes('```pomagier-wydanie')) {
    throw new Error('Nieprawidłowe metadane, kanał, tag lub opis zmian wydania Windows.')
  }
  for (const wydanie of wydania) {
    const wersja = /^v(\d+\.\d+\.\d+)$/.exec(wydanie.tag_name)?.[1]
    if (wersja && !czyNowszaWersjaStabilna(wersja, manifest.version)) {
      throw new Error('Wersja musi być wyższa od wszystkich wydań obu kanałów, również szkiców. Zwiększ wersję X.Y.Z.')
    }
  }
}

export function sprawdzManifestKanalu(manifest, manifestKanalu, wydanie, podpis, repozytorium) {
  const plik = wydanie.pliki.find(element => element.platforma === 'windows')
  const platforma = manifest.platforms?.['windows-x86_64']
  const oczekiwany = { ...manifest, platforms: { ['windows-' + manifest.kanal]: platforma } }
  if (!plik || manifest.version !== wydanie.wersja || manifest.commit !== wydanie.commit
    || platforma?.url !== 'https://github.com/' + repozytorium + '/releases/download/v' + wydanie.wersja + '/' + plik.nazwa
    || platforma.signature !== podpis.trim() || JSON.stringify(manifestKanalu) !== JSON.stringify(oczekiwany)) {
    throw new Error('Manifest kanalu nie odpowiada zatwierdzonemu wydaniu Windows.')
  }
}
