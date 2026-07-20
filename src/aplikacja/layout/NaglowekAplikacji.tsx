import AvatarUzytkownika from '../../kartoteki/uzytkownicy/komponenty/AvatarUzytkownika'
import OdznakaRoli from '../../kartoteki/uzytkownicy/komponenty/OdznakaRoli'
import { koloryRol, pobierzNadrzednaRoleUzytkownika, pobierzNazweWyswietlanaUzytkownika } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import './naglowekAplikacji.css'

type WlasciwosciNaglowkaAplikacji = {
  otworzProfil: () => void
  wyloguj: () => void
}

export default function NaglowekAplikacji({ otworzProfil, wyloguj }: WlasciwosciNaglowkaAplikacji) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  if (!zalogowanyUzytkownik) return null
  const nazwa = pobierzNazweWyswietlanaUzytkownika(zalogowanyUzytkownik)
  const kolorRoli = koloryRol[pobierzNadrzednaRoleUzytkownika(zalogowanyUzytkownik)]

  return <header className="naglowek-aplikacji">
    <div className="naglowek-aplikacji__lewa-strefa" />
    <section aria-label="Panel zalogowanego użytkownika" className="naglowek-aplikacji__panel-uzytkownika" style={{ borderColor: kolorRoli }}>
      <button aria-label={`Otwórz profil użytkownika ${nazwa}`} className="naglowek-aplikacji__avatar" onClick={otworzProfil} type="button"><AvatarUzytkownika uzytkownik={zalogowanyUzytkownik} /></button>
      <button className="naglowek-aplikacji__dane" onClick={otworzProfil} type="button"><strong>{nazwa}</strong><OdznakaRoli kompaktowa rola={zalogowanyUzytkownik.rola} /></button>
      <button className="naglowek-aplikacji__przycisk" onClick={otworzProfil} type="button">Profil</button>
      <button className="naglowek-aplikacji__przycisk naglowek-aplikacji__przycisk--wyloguj" onClick={wyloguj} type="button">Wyloguj</button>
    </section>
  </header>
}
