import { useEffect, useRef, useState } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { czyZgodnaAktualizacja, type KanalAktualizacji } from './aktualizacjeDesktop'
import { informacjeOWersji } from '../wersjaAplikacji'

export default function PanelAktualizacji() {
  const [wersja, ustawWersje] = useState('')
  const [dostepne, ustawDostepne] = useState(false)
  const [zajety, ustawZajety] = useState(false)
  const [aktualizacja, ustawAktualizacje] = useState<Update | null>(null)
  const [komunikat, ustawKomunikat] = useState('')
  const [kanal, ustawKanal] = useState<KanalAktualizacji>(informacjeOWersji.kanal === 'testowy' ? 'testowy' : 'stabilny')
  const [pobrana, ustawPobrana] = useState(false)
  const [postep, ustawPostep] = useState<{ pobrano: number, razem?: number }>({ pobrano: 0 })
  const operacjaWToku = useRef(false)
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
    if (operacjaWToku.current) return
    operacjaWToku.current = true
    ustawZajety(true)
    ustawKomunikat('Sprawdzanie wydania…')
    try {
      const wynik = await check({ timeout: 20000, target: `windows-${kanal}` })
      if (!czyZamontowany.current) { if (wynik) await wynik.close(); return }
      if (wynik && czyZgodnaAktualizacja(wersja, wynik.version, wynik.rawJson, kanal, informacjeOWersji.zgodnoscDanych)) {
        ustawAktualizacje(wynik)
        ustawPobrana(false)
        ustawKomunikat(`Dostępna wersja ${wynik.version}. Zapisz otwarte formularze i wykonaj kopię bezpieczeństwa w zakładce Dane przed instalacją.`)
      } else {
        if (wynik) await wynik.close()
        ustawKomunikat(wynik ? 'Wydanie odrzucono: niezgodny kanał, wersja lub format danych.' : 'Brak nowszego wydania w wybranym kanale.')
      }
    } catch {
      ustawKomunikat('Nie udało się sprawdzić wydania. Sprawdź połączenie i dostępność wybranego kanału.')
    } finally { operacjaWToku.current = false; ustawZajety(false) }
  }

  async function pobierzAktualizacje() {
    if (!aktualizacja || operacjaWToku.current) return
    operacjaWToku.current = true
    ustawZajety(true); ustawPobrana(false); ustawPostep({ pobrano: 0 })
    ustawKomunikat('Pobieranie aktualizacji…')
    try {
      await aktualizacja.download((zdarzenie) => {
        if (!czyZamontowany.current) return
        if (zdarzenie.event === 'Started') ustawPostep({ pobrano: 0, razem: zdarzenie.data.contentLength })
        if (zdarzenie.event === 'Progress') ustawPostep((stan) => ({ ...stan, pobrano: stan.pobrano + zdarzenie.data.chunkLength }))
        if (zdarzenie.event === 'Finished') ustawKomunikat('Pobieranie zakończone. Weryfikacja podpisu…')
      }, { timeout: 120000 })
      if (czyZamontowany.current) {
        ustawPobrana(true)
        ustawKomunikat('Podpis zweryfikowany. Aktualizacja jest gotowa do instalacji po zapisaniu formularzy i kopii bezpieczeństwa.')
      }
    } catch {
      if (czyZamontowany.current) ustawKomunikat('Pobieranie lub weryfikacja podpisu nie powiodły się. Instalacja jest zablokowana. Spróbuj pobrać ponownie.')
    } finally { operacjaWToku.current = false; ustawZajety(false) }
  }

  async function zainstalujAktualizacje() {
    if (!aktualizacja || !pobrana || operacjaWToku.current || !window.confirm('Czy zapisano otwarte formularze i kopię bezpieczeństwa? Instalacja zamknie aplikację, a następnie uruchomi ją ponownie.')) return
    operacjaWToku.current = true
    ustawZajety(true)
    ustawKomunikat('Uruchamianie instalatora. Aplikacja zostanie zamknięta; dalszy postęp pokaże instalator Windows.')
    try {
      await aktualizacja.install({ restartAfterInstall: true })
    } catch {
      ustawPobrana(false)
      ustawKomunikat('Nie udało się uruchomić instalatora. Pobierz aktualizację ponownie i ponów próbę. Obecna wersja pozostaje dostępna.')
    } finally { operacjaWToku.current = false; ustawZajety(false) }
  }

  if (!isTauri()) return null
  return <section className="ustawienia__karta" aria-busy={zajety}>
    <h2>Wersja desktopowa {wersja}</h2>
    <p>Kompilacja: {informacjeOWersji.numerKompilacji} · Commit: <code>{informacjeOWersji.commit}</code></p>
    {informacjeOWersji.kanal === 'testowy' && <p role="note"><strong>Zainstalowana wersja eksperymentalna — do testów.</strong></p>}
    <label>Kanał aktualizacji <select value={kanal} disabled={zajety || aktualizacja !== null} onChange={(zdarzenie) => { ustawKanal(zdarzenie.target.value === 'testowy' ? 'testowy' : 'stabilny'); ustawKomunikat('') }}>
      <option value="stabilny">Stabilny — codzienna praca</option>
      <option value="testowy">Testowy — wersje eksperymentalne</option>
    </select></label>
    {kanal === 'testowy' && <p>Wersje eksperymentalne. Przed testami wykonaj kopię danych. Powrót do kanału stabilnego wymaga nowszej zgodnej wersji.</p>}
    <p>Dane tej aplikacji są oddzielone od danych przeglądarki.</p>
    {!dostepne && <p>Podpisane aktualizacje nie są skonfigurowane w tym pakiecie.</p>}
    <button type="button" disabled={!dostepne || zajety || aktualizacja !== null} onClick={sprawdzAktualizacje}>Sprawdź aktualizacje</button>
    {aktualizacja && <>
      <details><summary>Informacje o zmianach — {aktualizacja.version}</summary><p style={{ whiteSpace: 'pre-wrap' }}>{aktualizacja.body || 'Wydawca nie dostarczył opisu zmian.'}</p></details>
      <button type="button" disabled={zajety || pobrana} onClick={pobierzAktualizacje}>Pobierz aktualizację</button>
      <button type="button" disabled={zajety || !pobrana} onClick={zainstalujAktualizacje}>Zainstaluj aktualizację</button>
      <button type="button" disabled={zajety} onClick={() => { ustawAktualizacje(null); ustawPobrana(false); ustawPostep({ pobrano: 0 }); ustawKomunikat('Aktualizację odłożono.') }}>Później</button>
    </>}
    {postep.pobrano > 0 && <p>Pobrano {(postep.pobrano / 1048576).toFixed(1)} MB{postep.razem ? <> z {(postep.razem / 1048576).toFixed(1)} MB <progress aria-label="Postęp pobierania" value={postep.pobrano} max={postep.razem} /></> : null}</p>}
    <p role="status">{komunikat}</p>
  </section>
}
