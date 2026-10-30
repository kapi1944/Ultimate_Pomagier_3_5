export type KlientKartoteki = {
  id: string
  nazwa: string
  nip: string
  ulica: string
  nrBudynku: string
  nrLokalu: string
  kodPocztowy: string
  miasto: string
  kraj: string
  koordynator: string
  telefonKoordynatora: string
  emailKoordynatora: string
}

const klienciStartowi: KlientKartoteki[] = [
  {
    id: 'klient-adamex',
    nazwa: 'Adamex',
    nip: '123456789',
    ulica: 'Adamska',
    nrBudynku: '12',
    nrLokalu: '70-798',
    kodPocztowy: '70-798',
    miasto: 'Szczecin',
    kraj: 'Polska',
    koordynator: 'Adam Skała',
    telefonKoordynatora: '',
    emailKoordynatora: '',
  },
]

export const kluczKlientow = 'ultimate-pomagier.kartoteki.klienci'

export function pobierzKlientowZKartoteki(): KlientKartoteki[] {
  try {
    const zapis = localStorage.getItem(kluczKlientow)
    const dane: unknown = zapis ? JSON.parse(zapis) : null
    return Array.isArray(dane) ? dane : klienciStartowi
  } catch {
    return klienciStartowi
  }
}
