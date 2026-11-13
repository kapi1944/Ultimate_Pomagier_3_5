import { createContext } from 'react'
import type { Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'

export type WartoscKontekstuUzytkownika = {
  zalogowanyUzytkownik: Uzytkownik | null
  inicjalizacja: { aktywna: boolean; etap: string }
  aktywniUzytkownicy: Uzytkownik[]
  zaloguj: (uzytkownikId: string) => boolean
  wyloguj: () => void
  odswiezUzytkownika: (pokazEkranInicjalizacji?: boolean) => Promise<void>
}

export const KontekstUzytkownika = createContext<WartoscKontekstuUzytkownika | null>(null)
