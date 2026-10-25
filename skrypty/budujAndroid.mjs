import { readFile, writeFile, readdir, mkdir, stat, cp, copyFile } from 'node:fs/promises'
import { execFileSync, spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { unzipSync } from 'fflate'
import { katalogProjektu, numerWersjiAndroid, sprawdzZrodlaWydania, opiszPlik } from './dystrybucja.mjs'
import { sprawdzFrontendDesktop } from './kontrolaTrybuFrontendu.mjs'

function wykonaj(program, argumenty, opcje = {}) {
  return execFileSync(program, argumenty, { cwd: katalogProjektu, windowsHide: true, ...opcje })
}
export function czyBladDowiazaniaAndroid(system, blad) {
  return system === 'win32' && /Failed to create a symbolic link/.test(blad) && /Creation symbolic link is not allowed for this system/.test(blad)
}

async function budujTauriLubGradle(cli, argumenty, { testowy, architektura }) {
  const blad = await new Promise((zakoncz, odrzuc) => {
    let wyjscieBledow = ''
    const proces = spawn(process.execPath, [cli, ...argumenty], { cwd: katalogProjektu, windowsHide: true, stdio: ['ignore', 'inherit', 'pipe'] })
    proces.stderr.on('data', (fragment) => { process.stderr.write(fragment); wyjscieBledow = (wyjscieBledow + fragment.toString()).slice(-131072) })
    proces.on('error', odrzuc)
    proces.on('exit', (kod) => zakoncz(kod === 0 ? '' : wyjscieBledow || 'Build Tauri Android nie powiódł się.'))
  })
  if (!blad) return
  if (!czyBladDowiazaniaAndroid(process.platform, blad)) throw new Error('Build Tauri Android nie powiódł się. Nie przygotowano artefaktu.')
  // Tauri ukończył kompilację Rust, a Windows odmówił jedynie dowiązania JNI.
  // Kopiujemy tę samą bibliotekę i korzystamy z wygenerowanego projektu Gradle.
  const profil = testowy ? 'debug' : 'release'
  const abi = architektura === 'aarch64' ? 'arm64-v8a' : 'x86_64'
  const wariant = architektura === 'aarch64' ? 'Arm64' : 'X86_64'
  const katalogAndroid = join(katalogProjektu, 'src-tauri/gen/android')
  const katalogBibliotek = join(katalogAndroid, 'app/src/main/jniLibs', abi)
  await mkdir(katalogBibliotek, { recursive: true })
  const katalogKompilacji = process.env.CARGO_TARGET_DIR ? resolve(process.env.CARGO_TARGET_DIR) : join(katalogProjektu, 'src-tauri/target')
  await copyFile(join(katalogKompilacji, `${architektura}-linux-android`, profil, 'libpomagier_aplikacja.so'), join(katalogBibliotek, 'libpomagier_aplikacja.so'))
  const katalogNdk = process.env.NDK_HOME
  await copyFile(join(katalogNdk, 'toolchains/llvm/prebuilt/windows-x86_64/sysroot/usr/lib', `${architektura}-linux-android`, 'libc++_shared.so'), join(katalogBibliotek, 'libc++_shared.so'))
  console.log('Pakowanie skompilowanej biblioteki przez Gradle, bez dowiązań i bez zmiany uprawnień Windows.')
  const rodzaj = testowy ? 'Debug' : 'Release'
  wykonaj('java', ['-classpath', join(katalogAndroid, 'gradle/wrapper/gradle-wrapper.jar'), 'org.gradle.wrapper.GradleWrapperMain', `assemble${wariant}${rodzaj}`, '-x', `rustBuild${wariant}${rodzaj}`, '--no-daemon', '--console=plain'], { cwd: katalogAndroid, stdio: 'inherit' })
}
export function sprawdzRaportApk(raport, certyfikat, wersja, numer) {
  if (!/^pl\.ultimatepomagier\.desktop$/.test(raport.identyfikator) || raport.wersja !== wersja || raport.versionCode !== numer || raport.debugowalny) throw new Error('APK ma niewłaściwy pakiet, wersję, versionCode lub jest debugowalny.')
  const odcisk = /Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]{64})/.exec(raport.podpis)?.[1]?.toLowerCase()
  if (!odcisk || odcisk !== certyfikat?.replaceAll(':', '').toLowerCase() || /CN=Android Debug/i.test(raport.podpis)) throw new Error('APK nie ma zatwierdzonego certyfikatu wydawcy.')
  return odcisk
}

export async function przygotujAndroid({ tylkoInicjalizacja = false, testowy = false, architektura = 'aarch64' } = {}) {
  if (!['aarch64', 'x86_64'].includes(architektura)) throw new Error('Obsługiwane architektury: aarch64 i x86_64.')
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!sdk || !process.env.NDK_HOME) throw new Error('Ustaw ANDROID_HOME oraz NDK_HOME zgodnie z docs/dystrybucja-wieloplatformowa.md.')
  const pakiet = JSON.parse(await readFile(join(katalogProjektu, 'package.json'), 'utf8'))
  const numer = numerWersjiAndroid(pakiet.version)
  if (!tylkoInicjalizacja && !testowy) {
    for (const zmienna of ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD', 'ANDROID_CERT_SHA256']) {
      if (!process.env[zmienna]) throw new Error(`Brak konfiguracji podpisywania: ${zmienna}.`)
    }
    sprawdzZrodlaWydania(pakiet.version)
  }
  const cli = join(katalogProjektu, 'node_modules/@tauri-apps/cli/tauri.js')
  const gradle = join(katalogProjektu, 'src-tauri/gen/android/app/build.gradle.kts')
  try { await stat(gradle) } catch {
    wykonaj(process.execPath, [cli, 'android', 'init', '--ci', '--skip-targets-install'], { stdio: 'inherit' })
  }
  const konfiguracjaGradle = await readFile(gradle, 'utf8')
  if (!/compileSdk = \d+/.test(konfiguracjaGradle) || !/targetSdk = \d+/.test(konfiguracjaGradle)) throw new Error('Nieobsługiwany szablon Android Gradle. Nie zmieniono projektu.')
  await writeFile(gradle, konfiguracjaGradle.replace(/compileSdk = \d+/, 'compileSdk = 36').replace(/targetSdk = \d+/, 'targetSdk = 36'))
  const katalogIkon = join(katalogProjektu, '.desktop-icons/mobile')
  wykonaj(process.execPath, [cli, 'icon', join(katalogProjektu, 'public/logo-ultimate-pomagier.png'), '--output', katalogIkon, '--fit', 'contain'], { stdio: 'ignore' })
  await cp(join(katalogIkon, 'android'), join(katalogProjektu, 'src-tauri/gen/android/app/src/main/res'), { recursive: true })
  if (tylkoInicjalizacja) return
  const katalog = join(katalogProjektu, 'wydanie-android', testowy ? 'testowe' : 'podpisane')
  await mkdir(katalog, { recursive: true })
  const konfiguracja = join(katalog, 'konfiguracja.json')
  await writeFile(konfiguracja, JSON.stringify({ bundle: { android: { versionCode: numer } } }))
  const poczatek = Date.now()
  await budujTauriLubGradle(cli, ['android', 'build', '--ci', '--apk', '--target', architektura, '--config', konfiguracja, ...(testowy ? ['--debug'] : [])], { testowy, architektura })
  await sprawdzFrontendDesktop(join(katalogProjektu, 'dist'))
  const informacje = JSON.parse(await readFile(join(katalogProjektu, 'dist/wersja.json'), 'utf8'))
  const katalogApk = join(katalogProjektu, 'src-tauri/gen/android/app/build/outputs/apk')
  const kandydaci = []
  for (const nazwa of await readdir(katalogApk, { recursive: true })) {
    const sciezka = join(katalogApk, nazwa)
    if (nazwa.endsWith('.apk') && nazwa.toLowerCase().includes(testowy ? 'debug' : 'release') && (await stat(sciezka)).mtimeMs >= poczatek - 2000) kandydaci.push(sciezka)
  }
  if (kandydaci.length !== 1) throw new Error('Nie znaleziono dokładnie jednego świeżego APK wybranej architektury.')
  const zawartosc = unzipSync(new Uint8Array(await readFile(kandydaci[0])))
  const abi = architektura === 'aarch64' ? 'arm64-v8a' : 'x86_64'
  if (!zawartosc['AndroidManifest.xml'] || !zawartosc[`lib/${abi}/libpomagier_aplikacja.so`]?.length) throw new Error('APK jest niekompletny: brak manifestu lub natywnej aplikacji wybranej architektury.')
  if (testowy) {
    await copyFile(kandydaci[0], join(katalog, `Ultimate_Pomagier_TESTOWY_${architektura === 'aarch64' ? 'arm64' : 'x64'}.apk`))
    console.log('Przygotowano wyłącznie debug APK do testów. Nie jest wydaniem produkcyjnym.')
    return
  }
  const narzedzia = join(sdk, 'build-tools', process.env.ANDROID_BUILD_TOOLS_VERSION || '36.0.0')
  const rozszerzenie = process.platform === 'win32' ? '.exe' : ''
  const wyrownany = join(katalog, 'wyrownany.apk')
  wykonaj(join(narzedzia, `zipalign${rozszerzenie}`), ['-f', '-p', '4', kandydaci[0], wyrownany])
  const sciezka = join(katalog, `Ultimate_Pomagier_${pakiet.version}_Android_${architektura === 'aarch64' ? 'arm64' : 'x64'}.apk`)
  const podpisywacz = ['-jar', join(narzedzia, 'lib/apksigner.jar')]
  wykonaj('java', [...podpisywacz, 'sign', '--ks', resolve(process.env.ANDROID_KEYSTORE_PATH), '--ks-key-alias', process.env.ANDROID_KEY_ALIAS,
    '--ks-pass', 'env:ANDROID_KEYSTORE_PASSWORD', '--key-pass', 'env:ANDROID_KEY_PASSWORD', '--out', sciezka, wyrownany])
  const podpis = wykonaj('java', [...podpisywacz, 'verify', '--verbose', '--print-certs', sciezka], { encoding: 'utf8' })
  const badging = wykonaj(join(narzedzia, `aapt${rozszerzenie}`), ['dump', 'badging', sciezka], { encoding: 'utf8' })
  const danePakietu = /package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/.exec(badging)
  if (!danePakietu) throw new Error('Nie udało się odczytać manifestu APK.')
  const certyfikatSha256 = sprawdzRaportApk({ identyfikator: danePakietu[1], versionCode: Number(danePakietu[2]), wersja: danePakietu[3], debugowalny: badging.includes('application-debuggable'), podpis }, process.env.ANDROID_CERT_SHA256, pakiet.version, numer)
  const plik = await opiszPlik(sciezka, { platforma: 'android', architektura, typ: 'apk', identyfikator: danePakietu[1], versionCode: numer, podpis: { rodzaj: 'android', certyfikatSha256 } })
  await writeFile(`${sciezka}.sha256`, `${plik.sha256}  ${plik.nazwa}\n`)
  await writeFile(join(katalog, 'wydanie-android.json'), JSON.stringify({ wersja: pakiet.version, commit: informacje.commit, pliki: [plik] }, null, 2))
  console.log(`Przygotowano i sprawdzono podpisany APK: ${sciezka}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  przygotujAndroid({ tylkoInicjalizacja: process.argv.includes('--inicjalizuj'), testowy: process.argv.includes('--testowy'), architektura: process.argv.find((argument) => argument.startsWith('--architektura='))?.split('=')[1] || 'aarch64' })
    .catch((blad) => { console.error(blad.message); process.exitCode = 1 })
}
