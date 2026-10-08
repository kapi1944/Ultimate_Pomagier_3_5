export type ObslugaNiezapisanegoDokumentu = {
  czySaNiezapisaneZmiany: () => boolean
  zapiszPrzedWyjsciem: () => void | boolean
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

export function zapiszDokumentPrzedWyjsciem() {
  return aktywnaObsluga?.zapiszPrzedWyjsciem() !== false
}
