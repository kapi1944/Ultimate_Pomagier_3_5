import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pobierzInformacjeOWersji } from '../skrypty/informacjeOWersji.mjs'

test('wspólne metadane wydania identyfikują wersję i rzeczywiste źródła', () => {
  const informacje = pobierzInformacjeOWersji()
  const pakiet = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(informacje.wersja, pakiet.version)
  assert.equal(informacje.nazwaProduktu, 'Ultimate Pomagier 4.0')
  assert.equal(informacje.commit, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim())
  assert.equal(typeof informacje.zmienioneZrodla, 'boolean')
})

test('desktop zawsze buduje frontend z bieżących źródeł', () => {
  const konfiguracja = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))
  assert.equal(konfiguracja.version, '../package.json')
  assert.equal(konfiguracja.build.beforeBuildCommand, 'npm run build')
  assert.equal(konfiguracja.build.frontendDist, '../dist')
})
