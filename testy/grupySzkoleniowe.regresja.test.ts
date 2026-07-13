import assert from 'node:assert/strict'
import { poczatkowaGrupa } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import {
  dodajGrupeDoListy,
  pobierzEtykieteGrupy,
  przetworzUsuniecieGrupy,
  ustawRodzajGodzinGrupy,
  usunGrupeZListy,
} from '../src/moduly/zamkniete/szczegoly_organizacyjne/logikaGrupSzkoleniowych.ts'
import type { GrupaSzkoleniowa } from '../src/moduly/zamkniete/szczegoly_organizacyjne/typy.ts'

function sprawdz(nazwa: string, testRegresji: () => void) {
  testRegresji()
  console.log(`OK: ${nazwa}`)
}

function utworzGrupe(id: string, nazwa: string, liczbaUczestnikow: number): GrupaSzkoleniowa {
  return {
    ...poczatkowaGrupa,
    id,
    nazwa,
    liczbaUczestnikow,
    miejsce: `${nazwa} - sala`,
    trenerzy: [{ id: `trener-${id}`, imieNazwisko: `Trener ${nazwa}`, telefon: '', email: '' }],
  }
}

sprawdz('dodanie grupy zachowuje dane istniejących grup', () => {
  const pierwsza = utworzGrupe('grupa-a', 'Pierwsza', 12)
  const grupyPoDodaniu = dodajGrupeDoListy([pierwsza])

  assert.equal(grupyPoDodaniu.length, 2)
  assert.equal(grupyPoDodaniu[0], pierwsza)
  assert.equal(grupyPoDodaniu[0].trenerzy[0].imieNazwisko, 'Trener Pierwsza')
  assert.notEqual(grupyPoDodaniu[1].id, pierwsza.id)
})

sprawdz('etykiety grup wynikają z aktualnej pozycji', () => {
  assert.equal(pobierzEtykieteGrupy(0), 'Grupa 1')
  assert.equal(pobierzEtykieteGrupy(1), 'Grupa 2')
  assert.equal(pobierzEtykieteGrupy(2), 'Grupa 3')
})

sprawdz('usunięcie środkowej grupy zachowuje dane pozostałych i ciągłą numerację', () => {
  const pierwsza = utworzGrupe('grupa-a', 'Pierwsza', 10)
  const srodkowa = utworzGrupe('grupa-b', 'Środkowa', 20)
  const ostatnia = utworzGrupe('grupa-c', 'Ostatnia', 30)
  const grupyPoUsunieciu = usunGrupeZListy([pierwsza, srodkowa, ostatnia], srodkowa.id)

  assert.deepEqual(grupyPoUsunieciu.map((grupa) => grupa.id), ['grupa-a', 'grupa-c'])
  assert.equal(grupyPoUsunieciu[1].liczbaUczestnikow, 30)
  assert.equal(grupyPoUsunieciu[1].trenerzy[0].imieNazwisko, 'Trener Ostatnia')
  assert.equal(pobierzEtykieteGrupy(1), 'Grupa 2')
})

sprawdz('ostatnia grupa jest chroniona przed usunięciem', () => {
  const jedyna = utworzGrupe('grupa-a', 'Jedyna', 10)
  const grupy = [jedyna]

  assert.equal(usunGrupeZListy(grupy, jedyna.id), grupy)
})

sprawdz('anulowanie potwierdzenia usunięcia nie zmienia listy', () => {
  const grupy = [utworzGrupe('grupa-a', 'Pierwsza', 10), utworzGrupe('grupa-b', 'Druga', 20)]

  assert.equal(przetworzUsuniecieGrupy(grupy, 'grupa-a', false), grupy)
})

sprawdz('zaakceptowanie potwierdzenia usuwa wskazaną grupę', () => {
  const grupy = [utworzGrupe('grupa-a', 'Pierwsza', 10), utworzGrupe('grupa-b', 'Druga', 20)]
  const grupyPoPotwierdzeniu = przetworzUsuniecieGrupy(grupy, 'grupa-a', true)

  assert.deepEqual(grupyPoPotwierdzeniu.map((grupa) => grupa.id), ['grupa-b'])
})

sprawdz('zmiana rodzaju godzin nie kasuje ukrytych wartości niestandardowych', () => {
  const niestandardowa = {
    ...utworzGrupe('grupa-a', 'Pierwsza', 10),
    rodzajGodzin: 'Niestandardowe' as const,
    nazwaNiestandardowychGodzin: 'Warsztat praktyczny',
    liczbaMinutNiestandardowychGodzin: 75,
  }
  const dydaktyczna = ustawRodzajGodzinGrupy(niestandardowa, 'Dydaktyczne (45 min)')
  const ponownieNiestandardowa = ustawRodzajGodzinGrupy(dydaktyczna, 'Niestandardowe')

  assert.equal(ponownieNiestandardowa.nazwaNiestandardowychGodzin, 'Warsztat praktyczny')
  assert.equal(ponownieNiestandardowa.liczbaMinutNiestandardowychGodzin, 75)
})