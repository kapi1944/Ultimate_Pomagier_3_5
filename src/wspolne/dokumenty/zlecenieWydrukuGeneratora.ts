import type { OperacjaWydruku } from './rejestrWydrukow'

type PrzejscieDoWydruku = { dokumentId: string; operacja: OperacjaWydruku | null }
// Wyłącznie kontekst nawigacji. Trwałe zlecenia i potwierdzenia należą do historii rejestru.
let przejscie: PrzejscieDoWydruku | null = null

export function przygotujPrzejscieDoWydruku(operacja: OperacjaWydruku | null, dokumentId = operacja?.dokumentId ?? '') {
  przejscie = { dokumentId, operacja }
}

export function pobierzPrzejscieDoWydruku(dokumentId: string | null | undefined) {
  return przejscie?.dokumentId === dokumentId ? przejscie : null
}

export function zakonczPrzejscieDoWydruku(obecne: PrzejscieDoWydruku | null) {
  if (przejscie === obecne) przejscie = null
}
