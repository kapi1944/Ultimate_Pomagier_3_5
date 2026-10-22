import { informacjeOWersji } from '../wersjaAplikacji'
import { useEffect, useState, type FormEvent } from 'react'
import './panelLogowania.css'
import { Komunikat, Przycisk } from '../../wspolne/komponenty/ElementyInterfejsu'
import { pobierzUstawieniaAplikacji, zastosujUstawieniaAplikacji } from '../ustawienia/magazynUstawienAplikacji'
import { czyTrybDemonstracyjny, pobierzZapamietanyLogin, uwierzytelnijPrzezUsluge, zapamietajLogin } from './uwierzytelnianie'

type WlasciwosciPaneluLogowania = { otworzDemonstracje: () => boolean }

export default function PanelLogowania({ otworzDemonstracje }: WlasciwosciPaneluLogowania) {
  const [login, ustawLogin] = useState(pobierzZapamietanyLogin)
  const [haslo, ustawHaslo] = useState('')
  const [pokazHaslo, ustawPokazHaslo] = useState(false)
  const [zapamietaj, ustawZapamietaj] = useState(() => Boolean(pobierzZapamietanyLogin()))
  const [blad, ustawBlad] = useState('')
  const [czyTrwaLogowanie, ustawCzyTrwaLogowanie] = useState(false)
  useEffect(() => { zastosujUstawieniaAplikacji(pobierzUstawieniaAplikacji()) }, [])
  async function obsluzLogowanie(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault(); ustawCzyTrwaLogowanie(true)
    try {
      const wynik = await uwierzytelnijPrzezUsluge()
      if (!zapamietajLogin(login, zapamietaj)) ustawBlad('Nie udało się zapisać preferencji loginu. Usługa logowania jest niedostępna.')
      else ustawBlad(wynik.status === 'POTWIERDZONO' ? 'Usługa nie ma jeszcze podłączonej weryfikacji sesji.' : wynik.komunikat)
    } catch { ustawBlad('Usługa tożsamości jest niedostępna.') } finally { ustawHaslo(''); ustawCzyTrwaLogowanie(false) }
  }
  return <main className="panel-logowania"><form className="panel-logowania__formularz" onSubmit={obsluzLogowanie}>
    <header><img alt="Ultimate Pomagier" className="panel-logowania__logo" src="/logo-ultimate-pomagier.png" /><h1>{informacjeOWersji.nazwaProduktu}</h1><p>Zaloguj się do swojego obszaru pracy.</p><Komunikat>Usługa uwierzytelniania nie została skonfigurowana. Logowanie produkcyjne jest niedostępne.</Komunikat>{czyTrybDemonstracyjny && <Komunikat>Lokalny tryb demonstracyjny — bez bezpiecznej weryfikacji tożsamości. Używaj wyłącznie do pracy demonstracyjnej.</Komunikat>}</header>
    <div className="panel-logowania__wybor">
      <label>Login lub adres e-mail<input name="username" autoComplete="username" required value={login} onChange={(zdarzenie) => ustawLogin(zdarzenie.target.value)} /></label>
      <label>Hasło<input name="password" type={pokazHaslo ? 'text' : 'password'} autoComplete="current-password" required value={haslo} onChange={(zdarzenie) => ustawHaslo(zdarzenie.target.value)} /></label>
      <button type="button" aria-pressed={pokazHaslo} onClick={() => ustawPokazHaslo(!pokazHaslo)}>{pokazHaslo ? 'Ukryj hasło' : 'Pokaż hasło'}</button>
      <label><input type="checkbox" checked={zapamietaj} onChange={(zdarzenie) => { ustawZapamietaj(zdarzenie.target.checked); if (!zdarzenie.target.checked) zapamietajLogin('', false) }} />Zapamiętaj login</label>
      {blad && <div id="blad-logowania"><Komunikat status="error">{blad}</Komunikat></div>}
      <Przycisk className="panel-logowania__zaloguj" type="submit" disabled={czyTrwaLogowanie}>Zaloguj</Przycisk>
      {czyTrybDemonstracyjny && <Przycisk type="button" onClick={() => { if (!otworzDemonstracje()) ustawBlad('Nie udało się otworzyć demonstracji. Sprawdź stan lokalnej kartoteki i chronionego konta.') }}>Otwórz demonstrację Architekta</Przycisk>}
    </div>
  </form></main>
}
