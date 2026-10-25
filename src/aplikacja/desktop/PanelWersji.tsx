import { useEffect, useState } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { informacjeOWersji } from '../wersjaAplikacji'
import { Przycisk } from '../../wspolne/komponenty/ElementyInterfejsu'
import PanelAktualizacji from './PanelAktualizacji'
import { czyNowszaWersjaStabilna } from './aktualizacjeDesktop'
import { czyStarszeWydanie, pobierzRejestrWydan, rozpoznajPlatforme, sprawdzPlikPrzedPobraniem, wybierzNajnowsze, type PlatformaWydania, type PlikWydania } from './rejestrWydan'
import './panelWersji.css'

const nazwyPlatform: Record<PlatformaWydania, string> = { windows: 'Windows', android: 'Android', web: 'WEB', linux: 'Linux', macos: 'macOS', ios: 'iOS' }
function IkonaPlatformy({ platforma }: { platforma: PlatformaWydania }) {
  return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    {platforma === 'windows' ? <path d="M2 4 11 3v8H2zm11-1 9-1v9h-9zM2 13h9v8l-9-1zm11 0h9v9l-9-1z" />
      : platforma === 'android' ? <><path d="m7 3-2-2m12 2 2-2M4 10a8 8 0 0 1 16 0zm0 3h16v6H4zm3 6v4m10-4v4M1 12v7m22-7v7" /><circle cx="8" cy="6" r=".5" /><circle cx="16" cy="6" r=".5" /></>
      : <><circle cx="12" cy="12" r="10" /><ellipse cx="12" cy="12" rx="4" ry="10" /><path d="M2 12h20M4 6h16M4 18h16" /></>}
  </svg>
}
function dataWydania(data: string) { return new Date(data).toLocaleDateString('pl-PL') }
function rozmiarPliku(rozmiar: number) { return `${(rozmiar / 1024 / 1024).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} MB` }

export default function PanelWersji() {
  const [platforma, ustawPlatforme] = useState(() => rozpoznajPlatforme(navigator.userAgent, navigator.platform))
  const [architektura, ustawArchitekture] = useState('Nieustalona przez przeglądarkę')
  const [pliki, ustawPliki] = useState<PlikWydania[]>([])
  const [zajety, ustawZajety] = useState(false)
  const [blad, ustawBlad] = useState('')
  const [komunikat, ustawKomunikat] = useState('')
  const [online, ustawOnline] = useState(navigator.onLine)
  const [odswiezenie, ustawOdswiezenie] = useState(0)

  useEffect(() => {
    let aktywny = true
    if (!isTauri()) {
      const przegladarka = navigator as Navigator & { userAgentData?: { getHighEntropyValues: (pola: string[]) => Promise<{ architecture?: string, bitness?: string }> } }
      void przegladarka.userAgentData?.getHighEntropyValues(['architecture', 'bitness']).then((wynik) => {
        if (aktywny && wynik.architecture) ustawArchitekture(`${wynik.architecture}${wynik.bitness ? ` (${wynik.bitness}-bit)` : ''}`)
      }).catch(() => { if (aktywny) ustawArchitekture('Nieudostępniona przez przeglądarkę') })
      return () => { aktywny = false }
    }
    invoke<{ system: string, architektura: string }>('informacje_o_platformie').then((wynik) => {
      if (aktywny) { ustawPlatforme(rozpoznajPlatforme(wynik.system)); ustawArchitekture(wynik.architektura) }
    }).catch(() => { if (aktywny) ustawArchitekture('Nie udało się odczytać') })
    return () => { aktywny = false }
  }, [])

  useEffect(() => {
    function odswiezPolaczenie() {
      ustawOnline(navigator.onLine)
      if (!navigator.onLine) { ustawPliki([]); ustawZajety(false); ustawBlad('') }
    }
    window.addEventListener('online', odswiezPolaczenie)
    window.addEventListener('offline', odswiezPolaczenie)
    return () => { window.removeEventListener('online', odswiezPolaczenie); window.removeEventListener('offline', odswiezPolaczenie) }
  }, [])

  useEffect(() => {
    const kontroler = new AbortController()
    let aktywny = true
    const limit = window.setTimeout(() => kontroler.abort(), 20000)
    async function odswiez() {
      ustawZajety(true); ustawBlad(''); ustawPliki([])
      try { const wynik = await pobierzRejestrWydan(kontroler.signal); if (aktywny) ustawPliki(wynik) }
      catch (przyczyna) { if (aktywny) ustawBlad(przyczyna instanceof Error && przyczyna.name !== 'AbortError' ? przyczyna.message : 'Nie udało się pobrać rejestru. Sprawdź połączenie i spróbuj ponownie.') }
      finally { if (aktywny) ustawZajety(false); window.clearTimeout(limit) }
    }
    if (online) void odswiez()
    return () => { aktywny = false; window.clearTimeout(limit); kontroler.abort() }
  }, [odswiezenie, online])

  async function pobierz(plik: PlikWydania) {
    if (czyStarszeWydanie(plik, pliki, informacjeOWersji.wersja)) return
    ustawZajety(true); ustawKomunikat('Sprawdzanie dostępności pliku…')
    try {
      await sprawdzPlikPrzedPobraniem(plik)
      if (isTauri()) {
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(plik.adres)
      } else {
        const lacze = document.createElement('a')
        lacze.href = plik.adres; lacze.rel = 'noopener noreferrer'; lacze.download = plik.nazwa
        document.body.append(lacze); lacze.click(); lacze.remove()
      }
      ustawKomunikat(plik.platforma === 'android' ? 'Przekazano pobieranie APK do przeglądarki. Potwierdź instalację w Androidzie. Aktualizacja wymaga tego samego certyfikatu i wyższego numeru kompilacji.' : 'Przekazano pobieranie do przeglądarki. Sprawdź jej listę pobieranych plików.')
    } catch (przyczyna) { ustawKomunikat(przyczyna instanceof Error ? przyczyna.message : 'Pobieranie nie powiodło się.') }
    finally { ustawZajety(false) }
  }

  const platformy: PlatformaWydania[] = ['windows', 'android', 'web', ...(['linux', 'macos', 'ios'] as const).filter((nazwa) => pliki.some((plik) => plik.platforma === nazwa))]
  platformy.sort((pierwsza, druga) => Number(druga === platforma) - Number(pierwsza === platforma))
  const najnowsza = wybierzNajnowsze(pliki, platforma)
  const obecneWydanie = informacjeOWersji.zmienioneZrodla ? undefined : pliki.find((plik) => plik.commit === informacjeOWersji.commit && plik.wersja === informacjeOWersji.wersja)

  function przyciskPobrania(plik: PlikWydania, zalecany = false) {
    const starszy = czyStarszeWydanie(plik, pliki, informacjeOWersji.wersja)
    return <>
      <Przycisk disabled={zajety || !online || starszy} onClick={() => void pobierz(plik)}>{zalecany ? `Pobierz na ${nazwyPlatform[plik.platforma]}` : 'Pobierz'}</Przycisk>
      {starszy && <p>Instalacja starszej wersji jest zablokowana ze względu na możliwą niezgodność danych.</p>}
    </>
  }

  return <div className="wersje" aria-busy={zajety}>
    <section className="ustawienia__karta">
      <h2>Aktualna wersja</h2>
      <dl className="wersje__dane">
        <div><dt>Wersja</dt><dd>{informacjeOWersji.wersja}</dd></div>
        <div><dt>Platforma</dt><dd>{nazwyPlatform[platforma]} · {isTauri() ? 'aplikacja natywna' : 'przeglądarka'}</dd></div>
        <div><dt>Architektura</dt><dd>{architektura}</dd></div>
        <div><dt>Data wydania</dt><dd>{obecneWydanie ? dataWydania(obecneWydanie.data) : 'Brak opublikowanego wydania tej kompilacji'}</dd></div>
      </dl>
      <p>{najnowsza ? czyNowszaWersjaStabilna(informacjeOWersji.wersja, najnowsza.wersja) ? `Dostępna aktualizacja: ${najnowsza.wersja}` : 'Brak nowszego stabilnego wydania.' : 'Dostępność aktualizacji niepotwierdzona.'}</p>
      <p>Dane są lokalne dla tej instalacji. Nie są synchronizowane między Windows, Androidem i przeglądarką.</p>
      <details><summary>Szczegóły kompilacji</summary><p className="wersje__skrot">Commit: {informacjeOWersji.commit}{informacjeOWersji.zmienioneZrodla ? ' (zmienione źródła)' : ''}</p></details>
      {isTauri() && platforma === 'windows' ? <PanelAktualizacji /> : <p>Status aktualizatora: pobieranie i instalacja na żądanie użytkownika.</p>}
    </section>
    <section className="ustawienia__karta">
      <h2>Pobierz Ultimate Pomagiera</h2>
      <p>Wyświetlamy opublikowane pliki zgodne z metadanymi GitHub Releases. Możesz wybrać dowolną dostępną platformę.</p>
      <Przycisk onClick={() => ustawOdswiezenie((liczba) => liczba + 1)} disabled={zajety || !online}>Odśwież listę wydań</Przycisk>
      {!online && <p role="status">Brak połączenia z internetem. Lista wydań i pobieranie są niedostępne.</p>}
      {blad && <p role="alert">{blad}</p>}
      {zajety && <p role="status">Odczytywanie danych…</p>}
      <div className="wersje__platformy">
        {platformy.map((nazwa) => {
          const plik = wybierzNajnowsze(pliki, nazwa)
          return <article key={nazwa} className={`wersje__platforma${nazwa === platforma ? ' wersje__platforma--zalecana' : ''}`}>
            <h3><IkonaPlatformy platforma={nazwa} /> {nazwyPlatform[nazwa]}</h3>
            {nazwa === platforma && <strong>Dla Twojego urządzenia</strong>}
            {plik ? <>
              <p><strong>{plik.wersja}</strong> · stabilna · {plik.architektura}</p>
              <p>{dataWydania(plik.data)} · {rozmiarPliku(plik.rozmiar)} · {plik.typ.toUpperCase()}</p>
              <p className="wersje__opis">{plik.opis || 'Brak opisu zmian.'}</p>
              <p>Dostępne · najnowsze stabilne wydanie</p>
              {przyciskPobrania(plik, nazwa === platforma)}
              <details><summary>Weryfikacja pliku</summary><p className="wersje__skrot">SHA-256: {plik.sha256}</p><p className="wersje__skrot">{plik.podpis}</p></details>
            </> : <p>{zajety ? 'Sprawdzanie dostępności…' : 'Brak potwierdzonego stabilnego wydania do pobrania.'}</p>}
          </article>
        })}
      </div>
      <p role="status">{komunikat}</p>
    </section>
    <section className="ustawienia__karta">
      <h2>Historia wydań</h2>
      <details><summary>Opublikowane wersje ({pliki.length})</summary>
        {pliki.length === 0 && <p>Brak potwierdzonych wydań w rejestrze.</p>}
        {pliki.map((plik) => <article className="wersje__historia" key={`${plik.wydanieId}-${plik.nazwa}`}>
          <h3>{plik.wersja} · {nazwyPlatform[plik.platforma]} · {plik.typ.toUpperCase()}</h3>
          <p>{dataWydania(plik.data)} · {plik.kanal} · {plik.architektura} · {rozmiarPliku(plik.rozmiar)}</p>
          <p className="wersje__opis">{plik.opis || 'Brak opisu zmian.'}</p>
          {plik.kanal === 'testowa' && <p>Wydanie testowe — przed instalacją wykonaj kopię danych. Nie jest zalecaną aktualizacją.</p>}
          {przyciskPobrania(plik)}
        </article>)}
      </details>
    </section>
  </div>
}
