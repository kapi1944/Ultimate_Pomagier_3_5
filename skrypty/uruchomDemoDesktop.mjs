import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'

const proces = spawn(process.execPath, [resolve('node_modules/@tauri-apps/cli/tauri.js'), 'dev', '--features', 'demo-desktop', '--config', 'src-tauri/tauri.demo.conf.json', ...process.argv.slice(2)], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, PATH: `${join(homedir(), '.cargo', 'bin')}${delimiter}${process.env.PATH}`, CARGO_TARGET_DIR: process.env.CARGO_TARGET_DIR || resolve('src-tauri/target/demo') },
})
proces.on('error', () => { console.error('Nie udało się uruchomić natywnej demonstracji. Sprawdź instalację narzędzi desktopowych.'); process.exitCode = 1 })
proces.on('exit', (kod) => { process.exitCode = kod ?? 1 })
