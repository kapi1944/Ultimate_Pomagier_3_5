import { useState, type FormEvent } from 'react'
import './panelLogowania.css'

type WlasciwosciPaneluLogowania = {
  zalogujUzytkownika: (nazwa: string) => void
}

export default function PanelLogowania({ zalogujUzytkownika }: WlasciwosciPaneluLogowania) {
  const [nazwaUzytkownika, ustawNazweUzytkownika] = useState('')
  const [haslo, ustawHaslo] = useState('')
  const [blad, ustawBlad] = useState('')

  function obsluzLogowanie(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()

    if (!nazwaUzytkownika.trim()) {
      ustawBlad('Podaj nazwę użytkownika.')
      return
    }

    ustawBlad('')
    zalogujUzytkownika(nazwaUzytkownika)
  }

  return (
    <main className="panel-logowania">
      <form className="panel-logowania__formularz" onSubmit={obsluzLogowanie}>
        <header>
          <h1>Ultimate Pomagier 3.0</h1>
          <p>Zaloguj użytkownika, aby przejść do aplikacji.</p>
        </header>

        <label>
          Użytkownik
          <input
            autoComplete="username"
            onChange={(zdarzenie) => ustawNazweUzytkownika(zdarzenie.target.value)}
            value={nazwaUzytkownika}
          />
        </label>

        <label>
          Hasło
          <input
            autoComplete="current-password"
            onChange={(zdarzenie) => ustawHaslo(zdarzenie.target.value)}
            type="password"
            value={haslo}
          />
        </label>

        {blad && <p className="panel-logowania__blad">{blad}</p>}

        <button type="submit">Zaloguj</button>
      </form>
    </main>
  )
}
