import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sprawdzPublikacjeWindows } from '../skrypty/publikujAktualizacjeWindows.mjs'

test('publikacja wymaga rosnącej wersji ponad oba kanały i kompletnej deklaracji zgodności', () => {
  for (const kanal of ['stabilny', 'testowy']) {
    const manifest = { version: '4.0.2', kanal, zgodnoscDanych: 1, commit: 'b'.repeat(40) }
    const wydania = [{ tag_name: 'v4.0.0', prerelease: false }, { tag_name: 'v4.0.1', prerelease: true }]
    sprawdzPublikacjeWindows(manifest, wydania, kanal, 'v4.0.2', 'Poprawka aktualizatora.')
    for (const wersja of ['4.0.2', '4.0.3', '4.1.0']) assert.throws(() => sprawdzPublikacjeWindows(manifest, [...wydania, { tag_name: `v${wersja}` }], kanal, 'v4.0.2', 'Opis'), /wyższa/)
    for (const zmiany of [{ version: '4.0.2-rc.1' }, { zgodnoscDanych: undefined }, { zgodnoscDanych: 0 }, { kanal: 'nieznany' }, { commit: 'main' }]) {
      assert.throws(() => sprawdzPublikacjeWindows({ ...manifest, ...zmiany }, [], kanal, 'v4.0.2', 'Opis'))
    }
    assert.throws(() => sprawdzPublikacjeWindows(manifest, [], kanal, 'main', 'Opis'))
    assert.throws(() => sprawdzPublikacjeWindows(manifest, [], kanal, 'v4.0.2', ''))
  }
})

 test('manifest kanału musi odpowiadać wspólnemu wydaniu i podpisowi', async () => {
 const { sprawdzManifestKanalu } = await import('../skrypty/publikujAktualizacjeWindows.mjs')
 const wydanie = {wersja:'4.0.2',commit:'a'.repeat(40),pliki:[{platforma:'windows',nazwa:'instalator.exe'}]}
 const platforma = {url:'https://github.com/wlasciciel/projekt/releases/download/v4.0.2/instalator.exe',signature:'podpis'}
 const manifest = {version:'4.0.2',commit:wydanie.commit,kanal:'stabilny',platforms:{'windows-x86_64':platforma}}
 const kanal = {...manifest,platforms:{'windows-stabilny':platforma}}
 sprawdzManifestKanalu(manifest,kanal,wydanie,'podpis','wlasciciel/projekt')
 assert.throws(()=>sprawdzManifestKanalu(manifest,kanal,wydanie,'inny','wlasciciel/projekt'))
 assert.throws(()=>sprawdzManifestKanalu(manifest,{...kanal,commit:'b'.repeat(40)},wydanie,'podpis','wlasciciel/projekt'))
 })
