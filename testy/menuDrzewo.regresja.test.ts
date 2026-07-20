import assert from 'node:assert/strict'
import { pobierzIdRozwijalnychPozycji, pobierzSciezkeMenuDlaWidoku, pozycjeMenu } from '../src/aplikacja/menu/pozycjeMenu.ts'

const nadrzedne = pozycjeMenu.map((pozycja) => pozycja.etykieta)
assert.deepEqual(nadrzedne, ['PULPIT', 'SZKOLENIA ZAMKNIĘTE', 'SZKOLENIA OTWARTE', 'DOKUMENTY', 'KARTOTEKI', 'USTAWIENIA'])

const dokumenty = pozycjeMenu.find((pozycja) => pozycja.id === 'dokumenty')
assert.ok(dokumenty?.czyPrzelaczaPodmenu)
for (const id of ['generator-list-obecnosci', 'generator-ankiet', 'generator-dyplomow', 'generator-kart-na-drzwi', 'programy-szkolen']) {
  const generator = dokumenty?.dzieci?.find((pozycja) => pozycja.id === id)
  assert.ok(generator?.czyPrzelaczaPodmenu, `${id} powinien być rozwijalny`)
  assert.ok(generator?.dzieci?.some((pozycja) => pozycja.etykieta === 'Kopie robocze'), `${id} powinien mieć kopie robocze`)
}

const rozwijalne = pobierzIdRozwijalnychPozycji()
assert.ok(rozwijalne.includes('dokumenty'))
assert.ok(rozwijalne.includes('generator-dyplomow'))
assert.deepEqual(pobierzSciezkeMenuDlaWidoku('dyplomy_kopie_robocze'), ['dokumenty', 'generator-dyplomow', 'dyplomy_kopie_robocze'])

console.log('OK: hierarchia menu, poziomy i podsekcje kopii roboczych')
