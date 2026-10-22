import { Component, type ReactNode, useState } from 'react'
import { czyTrybDemonstracyjny } from '../../aplikacja/logowanie/uwierzytelnianie'
import { kluczKopiiMigracjiUzytkownikow, kluczKopiiUzytkownikow, kluczMagazynuUzytkownikow, odzyskajUszkodzonaKartoteke, odczytajBazeUzytkownikow } from './magazynUzytkownikow'

function PanelOdzyskiwania({ blad }: { blad: Error }) {
  const [kopia, ustawKopie] = useState('')
  const [liczba, ustawLiczbe] = useState(0)
  const [akceptacja, ustawAkceptacje] = useState(false)
  const [komunikat, ustawKomunikat] = useState('')
  function wczytaj(zapis: string) {
    try { const baza = odczytajBazeUzytkownikow(zapis); ustawKopie(zapis); ustawLiczbe(baza.uzytkownicy.length); ustawAkceptacje(false); ustawKomunikat('Wczytano kopię do podglądu.') } catch (blad) { ustawKomunikat(blad instanceof Error ? blad.message : 'Nieprawidłowa kopia.'); ustawKopie('') }
  }
  function pobierzSurowaKopie() {
    const adres = URL.createObjectURL(new Blob([localStorage.getItem(kluczMagazynuUzytkownikow) ?? ''], { type: 'application/json' }))
    const odnosnik = document.createElement('a'); odnosnik.href = adres; odnosnik.download = 'kartoteka-do-odzyskania.json'; odnosnik.click(); setTimeout(() => URL.revokeObjectURL(adres), 1000)
  }
  return <main className="widok uzytkownicy"><h1>Kartoteka wymaga odzyskania</h1><p role="alert">{blad.message}</p><p>Nie zastąpiono danych danymi startowymi. Zachowaj surowy plik przed dalszymi zmianami. Może zawierać dane osobowe; przechowuj go lokalnie.</p><button type="button" onClick={pobierzSurowaKopie}>Pobierz oryginalny zapis do odzyskania</button>
    {czyTrybDemonstracyjny ? <section><h2>Odzyskiwanie w jawnej demonstracji</h2><p>Bez centralnej usługi nie można zweryfikować tożsamości operatora. Odtwarzanie jest dostępne wyłącznie w kompilacji demonstracyjnej.</p><label>Poprawna kopia JSON<input type="file" accept=".json" onChange={async (zdarzenie) => { const plik = zdarzenie.target.files?.[0]; if (plik && plik.size <= 5 * 1024 * 1024) wczytaj(await plik.text()); else ustawKomunikat('Wybierz kopię do 5 MB.') }} /></label>{[kluczKopiiUzytkownikow, kluczKopiiMigracjiUzytkownikow].map((klucz, indeks) => <button type="button" key={klucz} onClick={() => { const zapis = localStorage.getItem(klucz); if (zapis) wczytaj(zapis); else ustawKomunikat('Brak takiej kopii na tym urządzeniu.') }}>{indeks === 0 ? 'Wczytaj kopię sprzed operacji' : 'Wczytaj kopię sprzed migracji'}</button>)}
      {kopia && <><p>Kopia zawiera {liczba} kont. Znane ID muszą pozostać zachowane.</p><details><summary>Podgląd kont z kopii</summary><ul>{odczytajBazeUzytkownikow(kopia).uzytkownicy.map((konto) => <li key={konto.id}>{konto.imie} {konto.nazwisko} · {konto.login} · {konto.rola} · {konto.status}</li>)}</ul></details><label><input type="checkbox" checked={akceptacja} onChange={(zdarzenie) => ustawAkceptacje(zdarzenie.target.checked)} />Akceptuję odtworzenie pokazanej kartoteki. Oryginał zostanie zachowany w osobnej kopii.</label><button type="button" disabled={!akceptacja} onClick={() => { const wynik = odzyskajUszkodzonaKartoteke(kopia, localStorage.getItem(kluczMagazynuUzytkownikow)); if (wynik.blad) ustawKomunikat(wynik.blad); else window.location.reload() }}>Odtwórz lokalną kartotekę demonstracyjną</button></>}
    </section> : <p>Włącz jawny tryb demonstracyjny zgodnie z dokumentacją administratora, aby przeprowadzić lokalne odzyskiwanie. W docelowym trybie produkcyjnym tę operację musi autoryzować usługa tożsamości.</p>}
    <p role="status">{komunikat}</p></main>
}

export default class OchronaKartotekiUzytkownikow extends Component<{ children: ReactNode }, { blad: Error | null }> {
  state: { blad: Error | null } = { blad: null }
  static getDerivedStateFromError(blad: Error) { return { blad } }
  render() { return this.state.blad ? <PanelOdzyskiwania blad={this.state.blad} /> : this.props.children }
}
