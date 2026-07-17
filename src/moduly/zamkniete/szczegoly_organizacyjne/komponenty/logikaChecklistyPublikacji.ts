import type { KluczSekcjiSzczegolow, ModelSekcyjnySzczegolow, ProblemWalidacji } from '../typy'

export type PozycjaChecklistyPublikacji = {
  klucz: KluczSekcjiSzczegolow
  etykieta: string
  bledy: ProblemWalidacji[]
  idSekcjiFormularza: string
}

const identyfikatorySekcjiFormularza: Record<KluczSekcjiSzczegolow, string> = {
  podstawoweInformacje: 'podstawowe-informacje',
  klient: 'dane-klienta',
  opiekun: 'podstawowe-informacje',
  trenerzy: 'grupy-szkoleniowe',
  lokalizacja: 'grupy-szkoleniowe',
  grupySzkoleniowe: 'grupy-szkoleniowe',
  harmonogram: 'grupy-szkoleniowe',
  wysylka: 'wysylka-paczki',
  dokumenty: 'pakiet-podstawowy',
  rozliczenia: 'grupy-szkoleniowe',
  uwagi: 'uwagi',
  metadane: 'wyslij-aktualizacje',
}

export function deduplikujBledySekcji(kluczSekcji: KluczSekcjiSzczegolow, bledy: ProblemWalidacji[]) {
  const widziane = new Set<string>()

  return bledy.filter((blad) => {
    const klucz = `${kluczSekcji}:${blad.pole}:${blad.kodBledu ?? blad.komunikat}`
    if (widziane.has(klucz)) return false
    widziane.add(klucz)
    return true
  })
}

export function zbudujPozycjeChecklistyPublikacji(modelSekcyjny: ModelSekcyjnySzczegolow): PozycjaChecklistyPublikacji[] {
  return Object.values(modelSekcyjny)
    .filter((sekcja) => sekcja.wymaganaDoPublikacji)
    .map((sekcja) => ({
      klucz: sekcja.klucz,
      etykieta: sekcja.etykieta,
      bledy: deduplikujBledySekcji(sekcja.klucz, [...sekcja.bledyKrytyczne, ...sekcja.ostrzezenia]),
      idSekcjiFormularza: identyfikatorySekcjiFormularza[sekcja.klucz],
    }))
}

export function czyWszystkieListyBledowRozwiniete(pozycje: PozycjaChecklistyPublikacji[], rozwinieteSekcje: ReadonlySet<KluczSekcjiSzczegolow>) {
  const pozycjeZBledami = pozycje.filter((pozycja) => pozycja.bledy.length > 0)
  return pozycjeZBledami.length > 0 && pozycjeZBledami.every((pozycja) => rozwinieteSekcje.has(pozycja.klucz))
}

export function synchronizujRozwinieteSekcje(pozycje: PozycjaChecklistyPublikacji[], rozwinieteSekcje: ReadonlySet<KluczSekcjiSzczegolow>) {
  const kluczeZBledami = new Set(pozycje.filter((pozycja) => pozycja.bledy.length > 0).map((pozycja) => pozycja.klucz))
  return new Set([...rozwinieteSekcje].filter((klucz) => kluczeZBledami.has(klucz)))
}
