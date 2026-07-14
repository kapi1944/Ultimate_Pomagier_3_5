type ObslugaNiezapisanychProgramow = {
  czySaNiezapisaneZmiany: () => boolean
  zapiszPrzedWyjsciem: () => void
}

let obsluga: ObslugaNiezapisanychProgramow | null = null

export function ustawObslugeNiezapisanychProgramow(nowaObsluga: ObslugaNiezapisanychProgramow) {
  obsluga = nowaObsluga

  return () => {
    if (obsluga === nowaObsluga) {
      obsluga = null
    }
  }
}

export function czyProgramMaNiezapisaneZmiany() {
  return obsluga?.czySaNiezapisaneZmiany() ?? false
}

export function zapiszProgramPrzedWyjsciem() {
  obsluga?.zapiszPrzedWyjsciem()
}
