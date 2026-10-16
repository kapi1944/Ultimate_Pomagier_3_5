import assert from 'node:assert/strict'
import { aktywneWidoki, odczytaj, plikiInterfejsu, powierzchniePliku } from './inwentaryzacjaV4.mjs'
import { pozycjeMenu } from '../src/aplikacja/menu/pozycjeMenu.ts'
import { trasyZakupow } from '../src/aplikacja/nawigacja/konfiguracjaZakupow.ts'
import { konfiguracjePodmenuGeneratorow, pozycjeRejestruDokumentow, pobierzSciezkeGeneratora } from '../src/aplikacja/nawigacja/konfiguracjaGeneratorow.ts'
import { pobierzSciezkeNarzedzia } from '../src/aplikacja/nawigacja/konfiguracjaNarzedzi.ts'

export function widokiMenu(pozycje = pozycjeMenu) {
  return pozycje.flatMap((pozycja) => [...(pozycja.widok ? [pozycja.widok] : []), ...widokiMenu(pozycja.dzieci ?? [])])
}

export function sciezkiWidoku(widok) {
  if (widok === 'profil_uzytkownika') return ['/profil', '/profil/:uzytkownikId']
  const sciezka = trasyZakupow.find((trasa) => trasa.widok === widok)?.sciezka ?? pobierzSciezkeNarzedzia(widok) ?? pobierzSciezkeGeneratora(widok) ?? '/'
  return [sciezka, ...(['programy_szkolen', 'listy-obecnosci', 'checklisty_paczek'].includes(widok) ? [`${sciezka}/:dokumentId`] : []), ...(widok === 'zakupy_magazyn' ? ['/zakupy/magazyn'] : [])]
}

const manifest = JSON.parse(odczytaj('docs/v4/manifest-widokow.json'))
const widoki = aktywneWidoki()
assert.deepEqual(Object.keys(manifest.widoki).sort(), widoki, 'Manifest musi pokrywać cały rozwiązany typ WidokNawigacji, włącznie z zakupami.')
const uklad = odczytaj('src/aplikacja/layout/UkladAplikacji.tsx')
const przypadki = [...uklad.matchAll(/case '([^']+)'/g)].map((dopasowanie) => dopasowanie[1]).filter((widok) => widoki.includes(widok))
assert.deepEqual([...new Set([...przypadki, ...trasyZakupow.map((trasa) => trasa.widok)])].sort(), widoki, 'renderujWidok nie pokrywa typu nawigacji.')
const lista = uklad.match(/const dostepneWidoki[^=]*= \[([\s\S]*?)\n\]/)[1]
assert.deepEqual([...new Set([...lista.matchAll(/'([^']+)'/g)].map((dopasowanie) => dopasowanie[1]).concat(trasyZakupow.map((trasa) => trasa.widok)))].sort(), widoki, 'Lista aktywnych widoków rozjechała się z typem.')
for (const widok of widoki) {
  const wpis = manifest.widoki[widok]
  assert.match(wpis.zadanie, /^V4-(0[2-9]|1\d|2[0-3])$/)
  assert.deepEqual(wpis.sciezki, sciezkiWidoku(widok), `Trasy: ${widok}`)
  assert.equal(wpis.wMenu, widokiMenu().includes(widok), `Menu: ${widok}`)
  assert.ok(odczytaj('docs/v4/rejestr-widokow.md').includes(`\`${widok}\``))
}
for (const widok of [...widokiMenu(), ...pozycjeRejestruDokumentow.map((wpis) => wpis.widok), ...konfiguracjePodmenuGeneratorow.flatMap((wpis) => wpis.pozycje.map((pozycja) => pozycja.widok))]) assert.ok(manifest.widoki[widok], `Brak konfiguracji ${widok}`)
assert.deepEqual(Object.keys(manifest.pliki).sort(), plikiInterfejsu(), 'Każdy plik TSX, także dostępny wyłącznie przez kod, wymaga właściciela V4.')
for (const [plik, wpis] of Object.entries(manifest.pliki)) {
  assert.match(wpis.zadanie, /^V4-(0[2-9]|1\d|2[0-3])$/)
  assert.deepEqual(wpis.powierzchnie, powierzchniePliku(plik), `Zmieniono formularz, panel, zakładki lub modal: ${plik}. Zaktualizuj świadomie rejestr.`)
}
assert.deepEqual([...new Set([...Object.values(manifest.widoki), ...Object.values(manifest.pliki)].map((wpis) => wpis.zadanie))].sort(), Array.from({ length: 22 }, (_, indeks) => `V4-${String(indeks + 2).padStart(2, '0')}`))
console.log(`V4: ${widoki.length} widoków, ${Object.keys(manifest.pliki).length} plików interfejsu; routing, menu i powierzchnie kompletne.`)
