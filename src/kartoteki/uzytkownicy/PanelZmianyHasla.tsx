import { walidujHaslo } from '../../wspolne/walidacja/walidatoryDanych'
import { useState, type FormEvent } from 'react'
import { wykonajOperacjeTozsamosci } from '../../aplikacja/logowanie/klientTozsamosci'
import { czyTrybDemonstracyjny } from '../../aplikacja/logowanie/uwierzytelnianie'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'

export default function PanelZmianyHasla({ uzytkownikId }: { uzytkownikId: string }) {
  const { zalogowanyUzytkownik, odswiezUzytkownika } = useKontekstUzytkownika()
  const [otwarty, ustawOtwarty] = useState(false)
  const [dotychczasoweHaslo, ustawDotychczasoweHaslo] = useState('')
  const [haslo, ustawHaslo] = useState('')
  const [powtorzoneHaslo, ustawPowtorzoneHaslo] = useState('')
  const [pokaz, ustawPokaz] = useState(false)
  const [zajety, ustawZajety] = useState(false)
  const [komunikat, ustawKomunikat] = useState('')
  if (czyTrybDemonstracyjny || zalogowanyUzytkownik?.id !== uzytkownikId) return null
  function wyczysc() { ustawDotychczasoweHaslo(''); ustawHaslo(''); ustawPowtorzoneHaslo('') }
  async function zmien(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault(); ustawZajety(true); ustawKomunikat('')
    try {
      if (!walidujHaslo(haslo)) throw new Error('Minimum 8 znaków, bez spacji. Polskie znaki są dozwolone. Maksymalnie 1024 bajty.')
      await wykonajOperacjeTozsamosci('zmien-haslo', { dotychczasoweHaslo, haslo, powtorzoneHaslo })
      ustawKomunikat('Hasło zostało zmienione. Pozostałe sesje zostały unieważnione.'); ustawOtwarty(false)
      await odswiezUzytkownika()
    } catch (blad) { ustawKomunikat(blad instanceof Error ? blad.message : 'Nie udało się zmienić hasła.') }
    finally { wyczysc(); ustawZajety(false) }
  }
  return <section aria-label="Bezpieczeństwo konta"><h2>Bezpieczeństwo konta</h2>
    {komunikat && <p role="status">{komunikat}</p>}
    {!otwarty ? <button type="button" onClick={() => { ustawOtwarty(true); ustawKomunikat('') }}>Zmień własne hasło</button> : <form className="profil-uzytkownika__formularz" onSubmit={(zdarzenie) => { void zmien(zdarzenie) }}>
      <label>Dotychczasowe hasło<input autoComplete="current-password" type={pokaz ? 'text' : 'password'} required value={dotychczasoweHaslo} onChange={(zdarzenie) => ustawDotychczasoweHaslo(zdarzenie.target.value)} /></label>
      <label>Nowe hasło<input autoComplete="new-password" type={pokaz ? 'text' : 'password'} minLength={8} pattern={String.raw`[^\s\u0085]+`} required value={haslo} onChange={(zdarzenie) => ustawHaslo(zdarzenie.target.value)} /></label>
      <label>Powtórz nowe hasło<input autoComplete="new-password" type={pokaz ? 'text' : 'password'} required value={powtorzoneHaslo} onChange={(zdarzenie) => ustawPowtorzoneHaslo(zdarzenie.target.value)} /></label>
      <p>Minimum 8 znaków, bez spacji. Polskie znaki są dozwolone.</p>
      <button type="button" aria-pressed={pokaz} onClick={() => ustawPokaz(!pokaz)}>{pokaz ? 'Ukryj hasła' : 'Pokaż hasła'}</button>
      <button type="button" disabled={zajety} onClick={() => { wyczysc(); ustawOtwarty(false) }}>Anuluj</button><button type="submit" disabled={zajety}>Zapisz nowe hasło</button>
    </form>}
  </section>
}
