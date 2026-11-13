import assert from 'node:assert/strict'
import test from 'node:test'
import { odrzucZmianyDokumentu, ustawObslugeNiezapisanegoDokumentu, zapiszDokumentPrzedWyjsciem } from '../src/moduly/dokumenty/wspolne/strzeznikNiezapisanegoDokumentu.ts'

function zarejestruj({ zapis, czyZajety = () => false, odrzuc = () => {} }: {
  zapis: () => boolean | void | Promise<boolean | void>
  czyZajety?: () => boolean
  odrzuc?: () => void
}) {
  return ustawObslugeNiezapisanegoDokumentu({
    identyfikatorInstancji: 'formularz-testowy',
    czySaNiezapisaneZmiany: () => true,
    czyTrwaZapis: czyZajety,
    zapiszPrzedWyjsciem: zapis,
    odrzucZmiany: odrzuc,
  })
}

test('stróż czeka na zapis i dopiero jego sukces pozwala kontynuować', async () => {
  let zakonczZapis!: (wynik: boolean) => void
  const zakonczono = new Promise<boolean>((rozwiaz) => { zakonczZapis = rozwiaz })
  let potwierdzenie = false
  const wyrejestruj = zarejestruj({ zapis: async () => { potwierdzenie = true; return zakonczono } })

  const wynikZapisu = zapiszDokumentPrzedWyjsciem()
  assert.equal(potwierdzenie, true)
  zakonczZapis(true)
  assert.equal(await wynikZapisu, true)
  wyrejestruj()
})

test('stróż zatrzymuje nawigację przy błędzie lub równoczesnym zapisie', async () => {
  const wyrejestrujPoBledzie = zarejestruj({ zapis: async () => false })
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  wyrejestrujPoBledzie()

  const wyrejestrujPodczasZapisu = zarejestruj({ zapis: () => true, czyZajety: () => true })
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  wyrejestrujPodczasZapisu()

  const wyrejestrujPoWyjatku = zarejestruj({ zapis: () => { throw new Error('Brak miejsca') } })
  assert.equal(await zapiszDokumentPrzedWyjsciem(), false)
  wyrejestrujPoWyjatku()
})

test('stróż udostępnia odrzucenie bieżących zmian', () => {
  let odrzucono = false
  const wyrejestruj = zarejestruj({ zapis: () => true, odrzuc: () => { odrzucono = true } })
  odrzucZmianyDokumentu()
  assert.equal(odrzucono, true)
  wyrejestruj()
})
