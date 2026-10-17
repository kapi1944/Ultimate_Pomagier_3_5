import AvatarUzytkownika from '../../kartoteki/uzytkownicy/komponenty/AvatarUzytkownika'
import OdznakaRoli from '../../kartoteki/uzytkownicy/komponenty/OdznakaRoli'
import { koloryRol, pobierzNadrzednaRoleUzytkownika, pobierzNazweWyswietlanaUzytkownika } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import './naglowekAplikacji.css'
import { OdznakaStatusu, Przycisk } from '../../wspolne/komponenty/ElementyInterfejsu'
import { pobierzKontekstNawigacji } from '../menu/pozycjeMenu'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'

type WlasciwosciNaglowkaAplikacji = {
  aktywnyWidok: WidokNawigacji
  czyMenuPrzypiete: boolean
  czyDockWidoczny: boolean
  przelaczDock: () => void
  otworzProfil: () => void
  wyloguj: () => void
}

export default function NaglowekAplikacji({ aktywnyWidok, czyMenuPrzypiete, czyDockWidoczny, przelaczDock, otworzProfil, wyloguj }: WlasciwosciNaglowkaAplikacji) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  if (!zalogowanyUzytkownik) return null
  const nazwa = pobierzNazweWyswietlanaUzytkownika(zalogowanyUzytkownik)
  const kolorRoli = koloryRol[pobierzNadrzednaRoleUzytkownika(zalogowanyUzytkownik)]
  const kontekst = pobierzKontekstNawigacji(aktywnyWidok)

  return <header className="naglowek-aplikacji">
    <div className="naglowek-aplikacji__lewa-strefa"><span className="naglowek-aplikacji__marka">Ultimate Pomagier V4</span><nav aria-label="Bieżąca sekcja"><ol>{kontekst.map((etykieta, indeks) => <li key={indeks} aria-current={indeks === kontekst.length - 1 ? 'page' : undefined}>{etykieta}</li>)}</ol></nav></div>
    <div className="naglowek-aplikacji__statusy"><OdznakaStatusu status="info">{czyMenuPrzypiete ? 'Menu przypięte' : 'Menu zwijane'}</OdznakaStatusu><Przycisk aria-label={czyDockWidoczny ? 'Ukryj dock' : 'Pokaż dock'} aria-pressed={czyDockWidoczny} onClick={przelaczDock}><span className="naglowek-aplikacji__dock-etykieta">{czyDockWidoczny ? 'Ukryj dock' : 'Pokaż dock'}</span><span className="naglowek-aplikacji__dock-krotki" aria-hidden="true">Dock</span></Przycisk></div>
    <section aria-label="Panel zalogowanego użytkownika" className="naglowek-aplikacji__panel-uzytkownika" style={{ borderColor: kolorRoli }}>
      <button aria-label={`Otwórz profil użytkownika ${nazwa}`} className="naglowek-aplikacji__avatar" onClick={otworzProfil} type="button"><AvatarUzytkownika uzytkownik={zalogowanyUzytkownik} /></button>
      <button className="naglowek-aplikacji__dane" onClick={otworzProfil} type="button"><strong>{nazwa}</strong><OdznakaRoli kompaktowa rola={zalogowanyUzytkownik.rola} /></button>
      <button className="naglowek-aplikacji__przycisk" onClick={otworzProfil} type="button">Profil</button>
      <button className="naglowek-aplikacji__przycisk naglowek-aplikacji__przycisk--wyloguj" onClick={wyloguj} type="button">Wyloguj</button>
    </section>
  </header>
}
