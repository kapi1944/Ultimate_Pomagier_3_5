import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { pobierzTypIkonyMenu } from '../src/aplikacja/menu/ikonyPozycjiMenu'
import { pozycjeMenu, type PozycjaMenu } from '../src/aplikacja/menu/pozycjeMenu'

function pobierzWszystkiePozycje(pozycje: PozycjaMenu[]): PozycjaMenu[] {
  return pozycje.flatMap((pozycja) => [pozycja, ...(pozycja.dzieci ? pobierzWszystkiePozycje(pozycja.dzieci) : [])])
}

test('kazda pozycja menu ma renderowana ikone', () => {
  const pozycje = pobierzWszystkiePozycje(pozycjeMenu)
  const kodMenu = readFileSync(new URL('../src/aplikacja/menu/MenuBoczne.tsx', import.meta.url), 'utf8')

  assert.match(kodMenu, /<IkonaMenu typ=\{pobierzTypIkonyMenu\(pozycja\.id\)\} \/>/)

  for (const pozycja of pozycje) {
    const typIkony = pobierzTypIkonyMenu(pozycja.id)
    assert.ok(typIkony !== 'pulpit' || pozycja.id === 'pulpit', `Pozycja ${pozycja.id} wymaga wlasnej ikony`)
  }
})