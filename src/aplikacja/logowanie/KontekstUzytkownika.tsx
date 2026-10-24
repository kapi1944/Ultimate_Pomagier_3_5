import { czyTrybDemonstracyjny } from './uwierzytelnianie'
import { useCallback, useState, type ReactNode } from 'react'
import { pobierzAktywnychUzytkownikowWedlugRoli, pobierzUzytkownika } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzZalogowanegoUzytkownika, rozpocznijSesje, zakonczSesje } from './sesjaUzytkownika'
import { KontekstUzytkownika } from './stanKontekstuUzytkownika'

export function DostawcaUzytkownika({ children }: { children: ReactNode }) {
  const [zalogowanyUzytkownik, ustawZalogowanegoUzytkownika] = useState(() => czyTrybDemonstracyjny ? pobierzZalogowanegoUzytkownika() : null)
  const odswiezUzytkownika = useCallback(() => { ustawZalogowanegoUzytkownika(czyTrybDemonstracyjny ? pobierzZalogowanegoUzytkownika() : null) }, [])
  const zaloguj = useCallback((uzytkownikId: string) => {
    if (!czyTrybDemonstracyjny || uzytkownikId !== 'administrator-kacper-madej') return false
    const czyRozpoczeto = rozpocznijSesje(uzytkownikId)
    ustawZalogowanegoUzytkownika(czyRozpoczeto ? pobierzUzytkownika(uzytkownikId) ?? null : null)
    return czyRozpoczeto
  }, [])
  const wyloguj = useCallback(() => { zakonczSesje(); ustawZalogowanegoUzytkownika(null) }, [])
  const wartosc = { zalogowanyUzytkownik, aktywniUzytkownicy: pobierzAktywnychUzytkownikowWedlugRoli(), zaloguj, wyloguj, odswiezUzytkownika }
  return <KontekstUzytkownika.Provider value={wartosc}>{children}</KontekstUzytkownika.Provider>
}
