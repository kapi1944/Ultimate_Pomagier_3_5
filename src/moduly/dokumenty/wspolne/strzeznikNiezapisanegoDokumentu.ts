export type WynikZapisuPrzedWyjsciem = boolean | void | Promise<boolean | void>

export type ObslugaNiezapisanegoDokumentu = {
  identyfikatorInstancji?: string
  etykieta?: string
  czySaNiezapisaneZmiany: () => boolean
  czyTrwaZapis?: () => boolean
  zapiszPrzedWyjsciem: () => WynikZapisuPrzedWyjsciem
  odrzucZmiany?: () => void
}

const aktywneObslugi = new Map<symbol, ObslugaNiezapisanegoDokumentu>()
let czyTrwaZapisPrzedWyjsciem = false
let oknoZOchrona: Window | null = null

function ostrzezPrzedOdswiezeniem(zdarzenie: BeforeUnloadEvent) {
  if (!czyDokumentMaNiezapisaneZmiany() && !czyTrwaZapisDokumentu()) return
  zdarzenie.preventDefault()
  zdarzenie.returnValue = ''
}

export function ustawObslugeNiezapisanegoDokumentu(nowaObsluga: ObslugaNiezapisanegoDokumentu) {
  const identyfikatorRejestracji = Symbol(nowaObsluga.identyfikatorInstancji)
  aktywneObslugi.set(identyfikatorRejestracji, nowaObsluga)
  if (!oknoZOchrona && typeof window !== 'undefined') {
    oknoZOchrona = window
    oknoZOchrona.addEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
  }

  return () => {
    if (aktywneObslugi.delete(identyfikatorRejestracji) && aktywneObslugi.size === 0) {
      oknoZOchrona?.removeEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
      oknoZOchrona = null
    }
  }
}

export function czyDokumentMaNiezapisaneZmiany() {
  for (const obsluga of aktywneObslugi.values()) {
    if (obsluga.czySaNiezapisaneZmiany()) return true
  }
  return false
}

export function czyTrwaZapisDokumentu() {
  if (czyTrwaZapisPrzedWyjsciem) return true
  for (const obsluga of aktywneObslugi.values()) {
    if (obsluga.czyTrwaZapis?.()) return true
  }
  return false
}

export async function zapiszDokumentPrzedWyjsciem() {
  if (czyTrwaZapisDokumentu()) return false
  czyTrwaZapisPrzedWyjsciem = true
  try {
    const zapisane = new Set<symbol>()
    for (const identyfikator of [...aktywneObslugi.keys()]) {
      const obsluga = aktywneObslugi.get(identyfikator)
      if (!obsluga?.czySaNiezapisaneZmiany()) continue
      if (obsluga.czyTrwaZapis?.() || await obsluga.zapiszPrzedWyjsciem() === false) return false
      zapisane.add(identyfikator)
    }
    // Nowa lub wcześniej czysta rejestracja mogła zmienić się podczas oczekiwania na zapis.
    for (const [identyfikator, obsluga] of aktywneObslugi) {
      if (!zapisane.has(identyfikator) && (obsluga.czySaNiezapisaneZmiany() || obsluga.czyTrwaZapis?.())) return false
    }
    return true
  } catch {
    return false
  } finally {
    czyTrwaZapisPrzedWyjsciem = false
  }
}

export function odrzucZmianyDokumentu() {
  for (const [identyfikator, obsluga] of [...aktywneObslugi]) {
    if (aktywneObslugi.has(identyfikator) && obsluga.czySaNiezapisaneZmiany()) obsluga.odrzucZmiany?.()
  }
}
