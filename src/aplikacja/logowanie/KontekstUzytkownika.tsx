import { useCallback, useState, type ReactNode } from 'react'
import { pobierzAktywnychUzytkownikowWedlugRoli, pobierzUzytkownika } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzZalogowanegoUzytkownika, rozpocznijSesje, zakonczSesje } from './sesjaUzytkownika'
import { KontekstUzytkownika } from './stanKontekstuUzytkownika'

export function DostawcaUzytkownika({ children }: { children: ReactNode }) {
  const [zalogowanyUzytkownik, ustawZalogowanegoUzytkownika] = useState(() => pobierzZalogowanegoUzytkownika())
  const odswiezUzytkownika = useCallback(() => { ustawZalogowanegoUzytkownika(pobierzZalogowanegoUzytkownika()) }, [])
  const zaloguj = useCallback((uzytkownikId: string) => {
    const czyRozpoczeto = rozpocznijSesje(uzytkownikId)
    ustawZalogowanegoUzytkownika(czyRozpoczeto ? pobierzUzytkownika(uzytkownikId) ?? null : null)
    return czyRozpoczeto
  }, [])
  const wyloguj = useCallback(() => { zakonczSesje(); ustawZalogowanegoUzytkownika(null) }, [])
  const wartosc = { zalogowanyUzytkownik, aktywniUzytkownicy: pobierzAktywnychUzytkownikowWedlugRoli(), zaloguj, wyloguj, odswiezUzytkownika }
  return <KontekstUzytkownika.Provider value={wartosc}>{children}</KontekstUzytkownika.Provider>
}
