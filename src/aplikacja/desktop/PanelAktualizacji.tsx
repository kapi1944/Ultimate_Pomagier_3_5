import { useEffect, useRef, useState } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { czyNowszaWersjaStabilna, pobierzIZainstalujPodpisanaAktualizacje } from './aktualizacjeDesktop'

export default function PanelAktualizacji() {
  const [wersja, ustawWersje] = useState('')
  const [dostepne, ustawDostepne] = useState(false)
  const [zajety, ustawZajety] = useState(false)
  const [aktualizacja, ustawAktualizacje] = useState<Update | null>(null)
  const [komunikat, ustawKomunikat] = useState('')
  const czyZamontowany = useRef(true)

  useEffect(() => {
    if (!isTauri()) return
    czyZamontowany.current = true
    let aktywny = true
    Promise.all([getVersion(), invoke<boolean>('czy_aktualizacje_dostepne')])
      .then(([numer, wlaczone]) => {
        if (aktywny) { ustawWersje(numer); ustawDostepne(wlaczone) }
      })
      .catch(() => { if (aktywny) ustawKomunikat('Nie udało się odczytać konfiguracji aktualizacji.') })
    return () => { aktywny = false; czyZamontowany.current = false }
  }, [])

  useEffect(() => () => {
    if (aktualizacja) void aktualizacja.close().catch((blad: unknown) => console.error('Nie udało się zwolnić aktualizacji', blad))
  }, [aktualizacja])

  async function sprawdzAktualizacje() {
    ustawZajety(true)
    ustawKomunikat('Sprawdzanie stabilnego wydania…')
    try {
      const wynik = await check({ timeout: 20000 })
      if (!czyZamontowany.current) { if (wynik) await wynik.close(); return }
      if (wynik && czyNowszaWersjaStabilna(wersja, wynik.version)) {
        ustawAktualizacje(wynik)
        ustawKomunikat(`Dostępna wersja ${wynik.version}. Zapisz otwarte formularze i wykonaj kopię bezpieczeństwa w zakładce Dane przed instalacją.`)
      } else {
        if (wynik) await wynik.close()
        ustawKomunikat('Brak nowszego stabilnego wydania.')
      }
    } catch {
      ustawKomunikat('Nie udało się sprawdzić wydania. Sprawdź połączenie i dostępność stabilnego wydania.')
    } finally { ustawZajety(false) }
  }

  async function zainstalujAktualizacje() {
    if (!aktualizacja || !window.confirm('Czy zapisano otwarte formularze i kopię bezpieczeństwa? Instalacja zamknie aplikację, a następnie uruchomi ją ponownie.')) return
    ustawZajety(true)
    ustawKomunikat('Pobieranie i weryfikacja podpisu. Po poprawnej weryfikacji rozpocznie się instalacja…')
    try {
      await pobierzIZainstalujPodpisanaAktualizacje(aktualizacja)
    } catch {
      ustawKomunikat('Aktualizacja nie została zakończona. Pobranie, podpis lub uruchomienie instalatora nie powiodło się. Możesz spróbować ponownie.')
    } finally { ustawZajety(false) }
  }

  if (!isTauri()) return null
  return <section className="ustawienia__karta" aria-busy={zajety}>
    <h2>Wersja desktopowa {wersja}</h2>
    <p>Dane tej aplikacji są oddzielone od danych przeglądarki.</p>
    {!dostepne && <p>Podpisane aktualizacje nie są skonfigurowane w tym pakiecie.</p>}
    <button type="button" disabled={!dostepne || zajety || aktualizacja !== null} onClick={sprawdzAktualizacje}>Sprawdź aktualizacje</button>
    {aktualizacja && <>
      <button type="button" disabled={zajety} onClick={zainstalujAktualizacje}>Pobierz i zainstaluj</button>
      <button type="button" disabled={zajety} onClick={() => { ustawAktualizacje(null); ustawKomunikat('Aktualizację odłożono.') }}>Później</button>
    </>}
    <p role="status">{komunikat}</p>
  </section>
}
