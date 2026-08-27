export type ObslugaNiezapisanegoDokumentu = {
  czySaNiezapisaneZmiany: () => boolean
  zapiszPrzedWyjsciem: () => void
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
  aktywnaObsluga?.zapiszPrzedWyjsciem()
}
