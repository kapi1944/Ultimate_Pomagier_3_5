import assert from 'node:assert/strict'
import { porownajSnapshotyWersji } from '../src/moduly/zamkniete/szczegoly_organizacyjne/logikaPorownaniaWersji.ts'
import { poczatkoweDaneFormularza, poczatkowaGrupa } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'

function sprawdz(nazwa: string, test: () => void) {
  test()
  console.log(`OK: ${nazwa}`)
}

function utworzSnapshot() {
  return {
    dane: { ...poczatkoweDaneFormularza, nabywca: { ...poczatkoweDaneFormularza.nabywca } },
    grupy: [{ ...poczatkowaGrupa, id: 'grupa-a', nazwa: 'Grupa A', liczbaUczestnikow: 10 }],
    adresaci: { reczniAdresaci: '', trybTresci: 'Tylko zmiany' as const, czyPodpis: false, wiadomoscWlasna: '' },
  }
}

sprawdz('brak zmian nie zwraca różnic', () => {
  const snapshot = utworzSnapshot()
  assert.deepEqual(porownajSnapshotyWersji(snapshot, snapshot), [])
})

sprawdz('porównanie pokazuje zmianę tekstu, liczby i pustej wartości czytelnymi etykietami', () => {
  const starsza = utworzSnapshot()
  const nowsza = utworzSnapshot()
  nowsza.dane.nabywca.nazwa = 'Nowy nabywca'
  nowsza.grupy[0].liczbaUczestnikow = 12
  nowsza.dane.tytulSzkolenia = 'Szkolenie'
  const roznice = porownajSnapshotyWersji(starsza, nowsza)

  assert.deepEqual(roznice.find((roznica) => roznica.pole.endsWith('Nazwa')), { sekcja: 'Dane formularza', pole: 'Nabywca — Nazwa', starszaWartosc: '(puste)', nowszaWartosc: 'Nowy nabywca' })
  assert.deepEqual(roznice.find((roznica) => roznica.pole.includes('Liczba uczestników')), { sekcja: 'Grupy szkoleniowe', pole: 'Grupa A — Liczba uczestników', starszaWartosc: '10', nowszaWartosc: '12' })
  assert.ok(roznice.every((roznica) => !roznica.pole.includes('.')))
})

sprawdz('porównanie rozpoznaje dodanie i usunięcie grup po stabilnym ID', () => {
  const starsza = utworzSnapshot()
  const nowsza = utworzSnapshot()
  nowsza.grupy = [{ ...poczatkowaGrupa, id: 'grupa-b', nazwa: 'Grupa B', liczbaUczestnikow: 8 }]
  const roznice = porownajSnapshotyWersji(starsza, nowsza)

  assert.ok(roznice.some((roznica) => roznica.starszaWartosc === 'Grupa A' && roznica.nowszaWartosc === '(puste)'))
  assert.ok(roznice.some((roznica) => roznica.starszaWartosc === '(puste)' && roznica.nowszaWartosc === 'Grupa B'))
})
