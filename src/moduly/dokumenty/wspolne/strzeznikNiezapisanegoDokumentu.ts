export type WynikZapisuPrzedWyjsciem = boolean | void | Promise<boolean | void>

export type ObslugaNiezapisanegoDokumentu = {
  identyfikatorInstancji?: string
  etykieta?: string
  czySaNiezapisaneZmiany: () => boolean
  czyTrwaZapis?: () => boolean
  zapiszPrzedWyjsciem: () => WynikZapisuPrzedWyjsciem
  odrzucZmiany?: () => void
}

let aktywnaObsluga: ObslugaNiezapisanegoDokumentu | null = null

export function ustawObslugeNiezapisanegoDokumentu(nowaObsluga: ObslugaNiezapisanegoDokumentu) {
  aktywnaObsluga = nowaObsluga

  return () => {
    if (aktywnaObsluga === nowaObsluga) {
      aktywnaObsluga = null
    }
  }
}

export function czyDokumentMaNiezapisaneZmiany() {
  return aktywnaObsluga?.czySaNiezapisaneZmiany() ?? false
}

export function pobierzObslugeNiezapisanegoDokumentu() {
  return aktywnaObsluga
}

export async function zapiszDokumentPrzedWyjsciem() {
  if (!aktywnaObsluga || !aktywnaObsluga.czySaNiezapisaneZmiany()) return true
  if (aktywnaObsluga.czyTrwaZapis?.()) return false

  try {
    const wynik = await aktywnaObsluga.zapiszPrzedWyjsciem()
    return wynik !== false
  } catch {
    return false
  }
}

export function odrzucZmianyDokumentu() {
  aktywnaObsluga?.odrzucZmiany?.()
}
