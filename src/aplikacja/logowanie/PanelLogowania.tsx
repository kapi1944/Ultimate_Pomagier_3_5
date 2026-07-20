import { useState, type FormEvent } from 'react'
import type { Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import { etykietyOrganizacji, etykietyRol, metadaneOdznak, pobierzNazweWyswietlanaUzytkownika } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import './panelLogowania.css'

type WlasciwosciPaneluLogowania = { aktywniUzytkownicy: Uzytkownik[]; zalogujUzytkownika: (id: string) => boolean }

export default function PanelLogowania({ aktywniUzytkownicy, zalogujUzytkownika }: WlasciwosciPaneluLogowania) {
  const [idUzytkownika, ustawIdUzytkownika] = useState(aktywniUzytkownicy[0]?.id ?? '')
  const [blad, ustawBlad] = useState('')
  const wybranyUzytkownik = aktywniUzytkownicy.find((uzytkownik) => uzytkownik.id === idUzytkownika)
  function obsluzLogowanie(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()
    if (!idUzytkownika || !zalogujUzytkownika(idUzytkownika)) { ustawBlad('Wybrane konto nie jest dostępne do zalogowania.'); return }
    ustawBlad('')
  }
  return <main className="panel-logowania"><form className="panel-logowania__formularz" onSubmit={obsluzLogowanie}>
    <header><img alt="Ultimate Pomagier" className="panel-logowania__logo" src="/logo-ultimate-pomagier.png" /><h1>Ultimate Pomagier 3.0</h1><p>Lokalny tryb demonstracyjny — konto jest wybierane na tym urządzeniu.</p></header>
    <label htmlFor="wybor-konta">Aktywne konto</label>
    <select id="wybor-konta" onChange={(zdarzenie) => ustawIdUzytkownika(zdarzenie.target.value)} value={idUzytkownika}>{aktywniUzytkownicy.map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweWyswietlanaUzytkownika(uzytkownik)} — {etykietyRol[uzytkownik.rola]}</option>)}</select>
    {wybranyUzytkownik && <section aria-label="Dane wybranego użytkownika" className="panel-logowania__profil"><strong>{pobierzNazweWyswietlanaUzytkownika(wybranyUzytkownik)}</strong><span>{etykietyRol[wybranyUzytkownik.rola]} · {etykietyOrganizacji[wybranyUzytkownik.organizacja]}</span><span>{wybranyUzytkownik.odznaki.length ? wybranyUzytkownik.odznaki.map((odznaka) => metadaneOdznak[odznaka].etykieta).join(', ') : 'Brak dodatkowych odznak'}</span></section>}
    {blad && <p aria-live="polite" className="panel-logowania__blad">{blad}</p>}<button type="submit">Zaloguj</button>
  </form></main>
}
