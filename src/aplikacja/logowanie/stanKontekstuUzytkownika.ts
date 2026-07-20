import { createContext } from 'react'
import type { Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'

export type WartoscKontekstuUzytkownika = {
  zalogowanyUzytkownik: Uzytkownik | null
  aktywniUzytkownicy: Uzytkownik[]
  zaloguj: (uzytkownikId: string) => boolean
  wyloguj: () => void
  odswiezUzytkownika: () => void
}

export const KontekstUzytkownika = createContext<WartoscKontekstuUzytkownika | null>(null)
