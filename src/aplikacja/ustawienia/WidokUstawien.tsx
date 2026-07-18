import { useState } from 'react'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import { pobierzIdRozwijalnychPozycji } from '../menu/pozycjeMenu'
import {
  kluczPrzypieciaMenu,
  kluczWysuwaniaZKrawedzi,
  pobierzPreferencjeDrzewaMenu,
  zapiszPreferencjeDrzewaMenu,
  zglosZmianePreferencjiMenu,
  type TrybWidokuMenu,
} from '../menu/preferencjeMenu'
import './widokUstawien.css'

function pobierzBoolean(klucz: string, wartoscDomyslna: boolean) {
  try {
    const wartosc = localStorage.getItem(klucz)
    return wartosc === null ? wartoscDomyslna : wartosc === 'true'
  } catch {
    return wartoscDomyslna
  }
}

export default function WidokUstawien() {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const uzytkownikId = zalogowanyUzytkownik?.id ?? 'anonim'
  const preferencje = pobierzPreferencjeDrzewaMenu(uzytkownikId)
  const [czyPrzypiete, ustawCzyPrzypiete] = useState(() => pobierzBoolean(kluczPrzypieciaMenu, false))
  const [czyWysuwanie, ustawCzyWysuwanie] = useState(() => pobierzBoolean(kluczWysuwaniaZKrawedzi, true))
  const [trybMenu, ustawTrybMenu] = useState<TrybWidokuMenu>(preferencje.tryb)
  const [komunikat, ustawKomunikat] = useState('')

  function zapiszBoolean(klucz: string, wartosc: boolean) {
    localStorage.setItem(klucz, String(wartosc))
    zglosZmianePreferencjiMenu(uzytkownikId)
    ustawKomunikat('Zapisano ustawienia menu.')
  }

  function zmienPrzypiecie(wartosc: boolean) {
    ustawCzyPrzypiete(wartosc)
    zapiszBoolean(kluczPrzypieciaMenu, wartosc)
  }

  function zmienWysuwanie(wartosc: boolean) {
    ustawCzyWysuwanie(wartosc)
    zapiszBoolean(kluczWysuwaniaZKrawedzi, wartosc)
  }

  function zmienTrybMenu(wartosc: TrybWidokuMenu) {
    ustawTrybMenu(wartosc)
    zapiszPreferencjeDrzewaMenu(uzytkownikId, {
      tryb: wartosc,
      rozwiniete: wartosc === 'zwijane' ? {} : Object.fromEntries(pobierzIdRozwijalnychPozycji().map((id) => [id, true])),
    })
    zglosZmianePreferencjiMenu(uzytkownikId)
    ustawKomunikat('Zapisano domyślny widok drzewa menu.')
  }

  function resetujDrzewo() {
    zapiszPreferencjeDrzewaMenu(uzytkownikId, { tryb: 'zwijane', rozwiniete: {} })
    ustawTrybMenu('zwijane')
    zglosZmianePreferencjiMenu(uzytkownikId)
    ustawKomunikat('Zwinięto i zresetowano drzewo menu.')
  }

  function eksportujDaneLokalne() {
    const dane = Object.fromEntries(Array.from({ length: localStorage.length }, (_, indeks) => {
      const klucz = localStorage.key(indeks) ?? ''
      return [klucz, localStorage.getItem(klucz)]
    }).filter(([klucz]) => klucz))

    const plik = new Blob([JSON.stringify(dane, null, 2)], { type: 'application/json' })
    const adres = URL.createObjectURL(plik)
    const lacze = document.createElement('a')
    lacze.href = adres
    lacze.download = `ultimate-pomagier-kopia-${new Date().toISOString().slice(0, 10)}.json`
    lacze.click()
    URL.revokeObjectURL(adres)
    ustawKomunikat('Przygotowano kopię danych lokalnych.')
  }

  return (
    <section className="widok ustawienia">
      <header><h1>Ustawienia</h1><p>Preferencje interfejsu i bezpieczna kopia danych lokalnych.</p></header>

      <section className="ustawienia__karta">
        <h2>Menu boczne</h2>
        <label className="ustawienia__wiersz">
          <span><strong>Przypięte menu</strong><small>Menu pozostaje stale widoczne na szerokim ekranie.</small></span>
          <input checked={czyPrzypiete} onChange={(zdarzenie) => zmienPrzypiecie(zdarzenie.target.checked)} type="checkbox" />
        </label>
        <label className="ustawienia__wiersz">
          <span><strong>Wysuwanie z lewej krawędzi</strong><small>Pozwala otworzyć odpięte menu przez najechanie na krawędź.</small></span>
          <input checked={czyWysuwanie} onChange={(zdarzenie) => zmienWysuwanie(zdarzenie.target.checked)} type="checkbox" />
        </label>
        <label className="ustawienia__pole">
          Domyślny widok drzewa
          <select value={trybMenu} onChange={(zdarzenie) => zmienTrybMenu(zdarzenie.target.value as TrybWidokuMenu)}>
            <option value="zwijane">Zwijane</option>
            <option value="pelne">Pełne</option>
          </select>
        </label>
        <button type="button" onClick={resetujDrzewo}>Zresetuj rozwinięte sekcje</button>
      </section>

      <section className="ustawienia__karta">
        <h2>Dane lokalne</h2>
        <p>Aplikacja nadal działa w lokalnym modelu danych przeglądarki. Eksport tworzy kopię wszystkich kluczy używanych na tym urządzeniu.</p>
        <button type="button" onClick={eksportujDaneLokalne}>Eksportuj kopię JSON</button>
      </section>

      {komunikat && <p aria-live="polite" className="ustawienia__komunikat">{komunikat}</p>}
    </section>
  )
}
