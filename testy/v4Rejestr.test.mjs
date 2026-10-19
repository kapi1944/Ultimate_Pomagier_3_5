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
  assert.ok(odczytaj('docs/v4/rejestr-widokow.md').includes(`| \`${widok}\` | ${wpis.zadanie} |`), `Właściciel w rejestrze: ${widok}`)
}
for (const widok of [...widokiMenu(), ...pozycjeRejestruDokumentow.map((wpis) => wpis.widok), ...konfiguracjePodmenuGeneratorow.flatMap((wpis) => wpis.pozycje.map((pozycja) => pozycja.widok))]) assert.ok(manifest.widoki[widok], `Brak konfiguracji ${widok}`)
assert.deepEqual(Object.keys(manifest.pliki).sort(), plikiInterfejsu(), 'Każdy plik TSX, także dostępny wyłącznie przez kod, wymaga właściciela V4.')
for (const [plik, wpis] of Object.entries(manifest.pliki)) {
  assert.match(wpis.zadanie, /^V4-(0[2-9]|1\d|2[0-3])$/)
  assert.deepEqual(wpis.powierzchnie, powierzchniePliku(plik), `Zmieniono formularz, panel, zakładki lub modal: ${plik}. Zaktualizuj świadomie rejestr.`)
  assert.ok(odczytaj('docs/v4/rejestr-widokow.md').includes(`| \`${plik}\` | ${wpis.zadanie} | ${wpis.wspoldzieloneZ.join(', ') || '—'} | ${wpis.ukonczoneEtapy.join(', ') || '—'} | ${wpis.powierzchnie.length} |`), `Plik w rejestrze: ${plik}`)
}
const etapy = Array.from({ length: 23 }, (_, indeks) => `V4-${String(indeks + 1).padStart(2, '0')}`)
const zatwierdzoneNazwy = [
  'Szkolenia zamknięte i otwarte', 'Lista i kopie szczegółów organizacyjnych',
  'Formularz szczegółów organizacyjnych', 'Centrum dokumentów, rejestry, kopie i kosze',
  'Wspólny workspace generatorów', 'Generator programów szkoleń', 'Generator list obecności',
  'Generator ankiet', 'Generator dyplomów', 'Generator kart na drzwi', 'Generator checklist paczek',
  'Replikator dokumentów', 'Narzędzia i Poprawiacz prezentacji', 'Zakupy', 'Magazyn i mapa',
  'Kartoteki klientów, trenerów i lokalizacji', 'Szablony, użytkownicy i profile',
  'Ustawienia aplikacji', 'Audyt końcowy i Release Candidate',
]
assert.deepEqual(Object.keys(manifest.zadania), etapy, 'Plan musi zawierać dokładnie 23 etapy.')
assert.deepEqual(Object.values(manifest.zadania).slice(4), zatwierdzoneNazwy, 'Zatwierdzona numeracja V4-05–23 nie może się rozjechać.')
assert.equal(widoki.length, 53)
const wlascicieleWidokow = {
  'V4-04': ['pulpit'],
  'V4-05': ['szkolenia-zamkniete', 'szkolenia-otwarte'],
  'V4-06': ['zamkniete_szczegoly_organizacyjne_lista', 'zamkniete_szczegoly_organizacyjne_kopie_robocze'],
  'V4-07': ['generator-szczegolow', 'zamkniete_szczegoly_organizacyjne_nowe'],
  'V4-08': widoki.filter((id) => id.startsWith('dokumenty') || !id.startsWith('zamkniete_') && /_kopie_robocze$|_kosz$|_wszystkie$/.test(id)),
  'V4-10': ['programy_szkolen'], 'V4-11': ['listy-obecnosci'], 'V4-12': ['ankiety'],
  'V4-13': ['dyplomy'], 'V4-14': ['karta-na-drzwi'], 'V4-15': ['checklisty_paczek'],
  'V4-16': ['replikator_dokumentow'], 'V4-17': ['narzedzia', 'poprawiacz_prezentacji'],
  'V4-18': ['zakupy_pulpit', 'zakupy_zapotrzebowania', 'zakupy_katalog', 'zakupy_listy', 'zakupy_zamowienia', 'zakupy_historia'],
  'V4-19': ['zakupy_magazyn', 'zakupy_mapa_magazynu'],
  'V4-20': ['kartoteki', 'kartoteki_klienci', 'kartoteki_trenerzy', 'kartoteki_lokalizacje'],
  'V4-21': ['kartoteki_szablony_dokumentow', 'kartoteki_uzytkownicy', 'profil_uzytkownika'],
  'V4-22': ['ustawienia'],
}
assert.deepEqual(Object.values(wlascicieleWidokow).flat().sort(), widoki, 'Każdy widok ma jednego właściciela zatwierdzonego planu.')
for (const [etap, identyfikatory] of Object.entries(wlascicieleWidokow)) {
  for (const id of identyfikatory) assert.equal(manifest.widoki[id].zadanie, etap, `Właściciel widoku ${id}`)
}
assert.equal(manifest.widoki['generator-szczegolow'].aliasWidoku, 'zamkniete_szczegoly_organizacyjne_nowe')
assert.match(odczytaj('src/moduly/zamkniete/szkolenia/generator_szczegolow/WidokGeneratoraSzczegolow.tsx'), /export default WidokNowychSzczegolowOrganizacyjnych/)
assert.deepEqual(Object.keys(manifest.realizacjaEtapow), etapy)
for (const [indeks, etap] of etapy.entries()) {
  const wykonanie = manifest.realizacjaEtapow[etap]
  assert.equal(wykonanie.status, indeks < 6 ? 'ukonczony' : 'planowany')
  if (wykonanie.status === 'ukonczony') {
    assert.ok(wykonanie.commit)
    assert.ok(odczytaj(wykonanie.raport))
  }
}
for (const wpis of [...Object.values(manifest.widoki), ...Object.values(manifest.pliki)]) {
  assert.ok(manifest.zadania[wpis.zadanie])
  assert.equal(new Set(wpis.ukonczoneEtapy).size, wpis.ukonczoneEtapy.length)
  for (const etap of wpis.ukonczoneEtapy) assert.equal(manifest.realizacjaEtapow[etap].status, 'ukonczony')
}
for (const [plik, wpis] of Object.entries(manifest.pliki)) {
  assert.equal(new Set(wpis.wspoldzieloneZ).size, wpis.wspoldzieloneZ.length, plik)
  for (const etap of wpis.wspoldzieloneZ) {
    assert.ok(manifest.zadania[etap], `Współdzielenie ${plik}`)
    assert.notEqual(etap, wpis.zadanie)
  }
}
assert.deepEqual([...new Set([...Object.values(manifest.widoki), ...Object.values(manifest.pliki)].map((wpis) => wpis.zadanie).concat(Object.keys(manifest.zakresyPrzekrojowe)))].sort(), etapy, 'Każdy etap ma zakres widoku, kodu lub audytu przekrojowego.')
assert.equal(manifest.pliki['src/aplikacja/layout/UkladAplikacji.tsx'].zadanie, 'V4-02')
assert.ok(manifest.pliki['src/aplikacja/layout/UkladAplikacji.tsx'].wspoldzieloneZ.includes('V4-05'))
assert.equal(manifest.pliki['src/aplikacja/logowanie/PanelLogowania.tsx'].zadanie, 'V4-03')
assert.equal(manifest.pliki['src/moduly/zamkniete/pulpit/WidokPulpitu.tsx'].zadanie, 'V4-04')
assert.equal(manifest.pliki['src/moduly/dokumenty/wspolne/UkladGeneratoraDokumentu.tsx'].zadanie, 'V4-09')
assert.deepEqual(manifest.pliki['src/moduly/dokumenty/wspolne/UkladGeneratoraDokumentu.tsx'].wspoldzieloneZ, etapy.slice(9, 15))
console.log(`V4: ${widoki.length} widoków, ${Object.keys(manifest.pliki).length} plików interfejsu; routing, menu i powierzchnie kompletne.`)
