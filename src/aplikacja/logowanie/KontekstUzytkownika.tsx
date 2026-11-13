import { czyTrybDemonstracyjny } from './uwierzytelnianie'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { odswiezPotwierdzonaSesje, wyczyscPotwierdzonaSesje, zakonczPotwierdzonaSesje } from './klientTozsamosci'
import { pobierzAktywnychUzytkownikowWedlugRoli, pobierzUzytkownika } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzZalogowanegoUzytkownika, rozpocznijSesje, zakonczSesje } from './sesjaUzytkownika'
import { KontekstUzytkownika } from './stanKontekstuUzytkownika'
import { wrocDoLogowaniaDesktopowego } from './daneDesktop'

export function DostawcaUzytkownika({ children }: { children: ReactNode }) {
  const [zalogowanyUzytkownik, ustawZalogowanegoUzytkownika] = useState(() => czyTrybDemonstracyjny ? pobierzZalogowanegoUzytkownika() : null)
  const [inicjalizacja, ustawInicjalizacje] = useState(() => ({ aktywna: !czyTrybDemonstracyjny, etap: 'Przygotowywanie aplikacji' }))
  const odswiezUzytkownika = useCallback(async (pokazEkranInicjalizacji = false) => {
    if (czyTrybDemonstracyjny) { ustawZalogowanegoUzytkownika(pobierzZalogowanegoUzytkownika()); return }
    const raportujEtap = (etap: string) => { if (pokazEkranInicjalizacji) ustawInicjalizacje({ aktywna: true, etap }) }
    try {
      const uzytkownik = await odswiezPotwierdzonaSesje(raportujEtap)
      if (pokazEkranInicjalizacji) ustawInicjalizacje({ aktywna: true, etap: 'Interfejs gotowy' })
      ustawZalogowanegoUzytkownika(uzytkownik)
    } catch (blad) { wyczyscPotwierdzonaSesje(); ustawZalogowanegoUzytkownika(null); await wrocDoLogowaniaDesktopowego(true); throw blad }
    finally { if (pokazEkranInicjalizacji) ustawInicjalizacje({ aktywna: false, etap: '' }) }
  }, [])
  useEffect(() => {
    if (czyTrybDemonstracyjny) return
    let aktywny = true
    void odswiezPotwierdzonaSesje((etap) => { if (aktywny) ustawInicjalizacje({ aktywna: true, etap }) }).then((konto) => { if (aktywny) { ustawInicjalizacje({ aktywna: true, etap: 'Interfejs gotowy' }); ustawZalogowanegoUzytkownika(konto) } }).catch(() => { if (aktywny) { wyczyscPotwierdzonaSesje(); ustawZalogowanegoUzytkownika(null); void wrocDoLogowaniaDesktopowego(true) } }).finally(() => { if (aktywny) ustawInicjalizacje({ aktywna: false, etap: '' }) })
    const licznik = window.setInterval(() => { void odswiezUzytkownika() }, 15000)
    const odswiez = () => { void odswiezUzytkownika() }
    window.addEventListener('focus', odswiez)
    return () => { aktywny = false; window.clearInterval(licznik); window.removeEventListener('focus', odswiez) }
  }, [odswiezUzytkownika])
  const zaloguj = useCallback((uzytkownikId: string) => {
    if (!czyTrybDemonstracyjny || uzytkownikId !== 'administrator-kacper-madej') return false
    const czyRozpoczeto = rozpocznijSesje(uzytkownikId)
    ustawZalogowanegoUzytkownika(czyRozpoczeto ? pobierzUzytkownika(uzytkownikId) ?? null : null)
    return czyRozpoczeto
  }, [])
  const wyloguj = useCallback(() => {
    if (czyTrybDemonstracyjny) { zakonczSesje(); ustawZalogowanegoUzytkownika(null); return }
    void zakonczPotwierdzonaSesje().then(() => ustawZalogowanegoUzytkownika(null)).catch(() => window.alert('Nie udało się unieważnić sesji. Spróbuj wylogować się ponownie.'))
  }, [])
  const wartosc = { zalogowanyUzytkownik, inicjalizacja, aktywniUzytkownicy: pobierzAktywnychUzytkownikowWedlugRoli(), zaloguj, wyloguj, odswiezUzytkownika }
  return <KontekstUzytkownika.Provider value={wartosc}>{children}</KontekstUzytkownika.Provider>
}
