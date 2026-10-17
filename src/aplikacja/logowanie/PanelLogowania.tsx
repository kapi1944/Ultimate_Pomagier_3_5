import { useEffect, useState, type FormEvent } from 'react'
import type { Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import { etykietyOrganizacji, etykietyRol, metadaneOdznak, pobierzNazweWyswietlanaUzytkownika } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import './panelLogowania.css'
import AvatarUzytkownika from '../../kartoteki/uzytkownicy/komponenty/AvatarUzytkownika'
import OdznakaRoli from '../../kartoteki/uzytkownicy/komponenty/OdznakaRoli'
import { Komunikat, Przycisk, PustyStan } from '../../wspolne/komponenty/ElementyInterfejsu'
import { pobierzUstawieniaAplikacji, zastosujUstawieniaAplikacji } from '../ustawienia/magazynUstawienAplikacji'

type WlasciwosciPaneluLogowania = { aktywniUzytkownicy: Uzytkownik[]; zalogujUzytkownika: (id: string) => boolean }

export default function PanelLogowania({ aktywniUzytkownicy, zalogujUzytkownika }: WlasciwosciPaneluLogowania) {
  const [idUzytkownika, ustawIdUzytkownika] = useState(aktywniUzytkownicy[0]?.id ?? '')
  const [blad, ustawBlad] = useState('')
  const wybranyUzytkownik = aktywniUzytkownicy.find((uzytkownik) => uzytkownik.id === idUzytkownika)
  useEffect(() => { zastosujUstawieniaAplikacji(pobierzUstawieniaAplikacji()) }, [])
  function obsluzLogowanie(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()
    if (!idUzytkownika || !zalogujUzytkownika(idUzytkownika)) { ustawBlad('Wybrane konto nie jest dostępne do zalogowania.'); return }
    ustawBlad('')
  }
  return <main className="panel-logowania"><form className="panel-logowania__formularz" onSubmit={obsluzLogowanie}>
    <header><img alt="Ultimate Pomagier" className="panel-logowania__logo" src="/logo-ultimate-pomagier.png" /><h1>Ultimate Pomagier V4</h1><p>Wybierz konto i przejdź do swojego obszaru pracy.</p><Komunikat>Lokalny tryb demonstracyjny — konto jest wybierane na tym urządzeniu.</Komunikat></header>
    <div className="panel-logowania__wybor">
      {aktywniUzytkownicy.length ? <fieldset aria-describedby={blad ? 'blad-logowania' : undefined} aria-invalid={Boolean(blad)}><legend>Aktywne konto</legend><div className="panel-logowania__konta">{aktywniUzytkownicy.map((uzytkownik) => <label className="panel-logowania__konto" key={uzytkownik.id}>
        <input type="radio" name="wybor-konta" value={uzytkownik.id} checked={idUzytkownika === uzytkownik.id} onChange={() => { ustawIdUzytkownika(uzytkownik.id); ustawBlad('') }} aria-label={`${pobierzNazweWyswietlanaUzytkownika(uzytkownik)} — ${etykietyRol[uzytkownik.rola]}`} />
        <AvatarUzytkownika uzytkownik={uzytkownik} /><span className="panel-logowania__nazwa"><strong>{pobierzNazweWyswietlanaUzytkownika(uzytkownik)}</strong><OdznakaRoli rola={uzytkownik.rola} /></span>
      </label>)}</div></fieldset> : <PustyStan>Brak aktywnych kont. Skontaktuj się z administratorem, aby uzyskać dostęp.</PustyStan>}
    {wybranyUzytkownik && <section aria-label="Dane wybranego użytkownika" className="panel-logowania__profil"><strong>{pobierzNazweWyswietlanaUzytkownika(wybranyUzytkownik)}</strong><span>{etykietyRol[wybranyUzytkownik.rola]} · {etykietyOrganizacji[wybranyUzytkownik.organizacja]}</span><span>{wybranyUzytkownik.odznaki.length ? wybranyUzytkownik.odznaki.map((odznaka) => metadaneOdznak[odznaka].etykieta).join(', ') : 'Brak dodatkowych odznak'}</span></section>}
    {blad && <div id="blad-logowania"><Komunikat status="error">{blad}</Komunikat></div>}<Przycisk className="panel-logowania__zaloguj" type="submit" disabled={!wybranyUzytkownik}>Zaloguj</Przycisk>
    </div>
  </form></main>
}
