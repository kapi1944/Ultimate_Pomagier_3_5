import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const lokalneCargo = join(process.env.CARGO_HOME || join(homedir(), '.cargo'), 'bin', process.platform === 'win32' ? 'cargo.exe' : 'cargo')
const cargo = existsSync(lokalneCargo) ? lokalneCargo : 'cargo'
const argumenty = process.argv.slice(2)
const testy = argumenty[0] === '--testy'
const desktop = argumenty[0] === '--buduj-desktop-testowy'
let polecenie
if (desktop) polecenie = ['build', '--manifest-path', 'src-tauri/Cargo.toml', '--features', 'tauri/custom-protocol', '--target-dir', 'src-tauri/target/konta-testy', '--locked']
else if (testy) polecenie = ['test', '--manifest-path', 'src-tauri/konta/Cargo.toml', '--locked']
else if (argumenty[0] === '--buduj-usluge-testowa') polecenie = ['build', '--manifest-path', 'src-tauri/konta/Cargo.toml', '--locked']
else polecenie = ['run', '--manifest-path', 'src-tauri/konta/Cargo.toml', '--locked', '--', 'domyslna', ...argumenty]
const proces = spawn(cargo, polecenie, { stdio: 'inherit', windowsHide: true, env: desktop ? { ...process.env, TAURI_CONFIG: JSON.stringify({ identifier: 'pl.ultimatepomagier.desktop.testy' }) } : process.env })
proces.on('error', () => { console.error('Nie udało się uruchomić Cargo. Zainstaluj zestaw narzędzi Rust zgodnie z dokumentacją desktopową.'); process.exitCode = 1 })
proces.on('exit', (kod) => { process.exitCode = kod ?? 1 })
