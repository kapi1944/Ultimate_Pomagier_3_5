import { useState, type FormEvent } from 'react'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import PoleTelefonu from '../../wspolne/telefon/PoleTelefonu'
import { utworzPustyFormularz } from './daneUzytkownikow'
import { utworzUzytkownikaPrzezAdministratora } from './magazynUzytkownikow'
import { czyMozeZarzadzacUzytkownikami } from './uprawnienia'
import PanelOperacjiKont from './PanelOperacjiKont'
import { etykietyOrganizacji, etykietyRol, metadaneOdznak, roleUzytkownikow, type FormularzUzytkownika, type OdznakaUzytkownika as TypOdznakiUzytkownika, type Telefon } from './typyUzytkownikow'
import './widokUzytkownikow.css'
import { czyTrybDemonstracyjny } from '../../aplikacja/logowanie/uwierzytelnianie'
import { wykonajOperacjeTozsamosci } from '../../aplikacja/logowanie/klientTozsamosci'
import { sprawdzStruktureUzytkownika } from './walidacjaUzytkownikow'

type WlasciwosciWidokuUzytkownikow = {
  otworzProfil: (uzytkownikId: string) => void
}

export default function WidokUzytkownikow({ otworzProfil }: WlasciwosciWidokuUzytkownikow) {
  const { zalogowanyUzytkownik, odswiezUzytkownika } = useKontekstUzytkownika()
  const [formularz, ustawFormularz] = useState<FormularzUzytkownika>(utworzPustyFormularz)
  const [wersjaListy, ustawWersjeListy] = useState(0)
  const [komunikat, ustawKomunikat] = useState('')
  const [blad, ustawBlad] = useState('')

  function zmienPole<K extends keyof FormularzUzytkownika>(pole: K, wartosc: FormularzUzytkownika[K]) {
    ustawFormularz((poprzedni) => ({ ...poprzedni, [pole]: wartosc }))
  }

  async function zapiszNowegoUzytkownika(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()
    if (!zalogowanyUzytkownik) return
    const profil = { ...formularz, telefony: formularz.telefony.filter((telefon) => telefon.numer.trim()) }
    if (!czyTrybDemonstracyjny) {
      try {
        const konto = await wykonajOperacjeTozsamosci('utworz-konto', { profil })
        if (!sprawdzStruktureUzytkownika(konto)) throw new Error('Nieprawidłowa odpowiedź usługi kont.')
        ustawFormularz(utworzPustyFormularz()); ustawBlad(''); ustawKomunikat(`Utworzono konto ${konto.login}. W profilu wygeneruj kod, aby właściciel ustawił hasło.`)
        await odswiezUzytkownika(); ustawWersjeListy((obecna) => obecna + 1)
      } catch (blad) { ustawBlad(blad instanceof Error ? blad.message : 'Nie udało się utworzyć konta.') }
      return
    }
    const wynik = utworzUzytkownikaPrzezAdministratora(zalogowanyUzytkownik, profil)
    if (!wynik.uzytkownik) {
      ustawBlad(wynik.blad ?? 'Nie udało się utworzyć użytkownika.')
      ustawKomunikat('')
      return
    }
    ustawFormularz(utworzPustyFormularz())
    ustawWersjeListy((obecna) => obecna + 1)
    odswiezUzytkownika()
    ustawBlad('')
    ustawKomunikat(`Utworzono konto: ${wynik.uzytkownik.imie} ${wynik.uzytkownik.nazwisko}.`)
  }

  if (!zalogowanyUzytkownik || !czyMozeZarzadzacUzytkownikami(zalogowanyUzytkownik)) {
    return <section className="widok uzytkownicy"><header><h1>Użytkownicy</h1><p>Nie masz uprawnień do zarządzania użytkownikami.</p></header></section>
  }

  return <section className="widok uzytkownicy" data-wersja-listy={wersjaListy}>
    <header><h1>Użytkownicy</h1><p>{czyTrybDemonstracyjny ? 'Centralna lista kont działających w lokalnym trybie demonstracyjnym.' : 'Lokalna kartoteka kont. Hasła są weryfikowane w zaufanej warstwie aplikacji.'}</p></header>
    {komunikat && <p aria-live="polite" className="uzytkownicy__sukces">{komunikat}</p>}
    {blad && <p aria-live="assertive" className="uzytkownicy__blad">{blad}</p>}

    <details className="uzytkownicy__karta"><summary>Utwórz pojedyncze konto</summary>
      <h2>Utwórz konto</h2>
      <p>{czyTrybDemonstracyjny ? 'Konto demonstracyjne nie otrzymuje rzeczywistego hasła.' : 'Po utworzeniu konta wygeneruj w jego profilu kod resetowania. Hasło ustali właściciel konta. Dostęp wymaga aktywnego statusu konta.'}</p>
      <form className="uzytkownicy__formularz" onSubmit={zapiszNowegoUzytkownika}>
        <label>Zwrot<select value={formularz.zwrot} onChange={(zdarzenie) => zmienPole('zwrot', zdarzenie.target.value as FormularzUzytkownika['zwrot'])}><option value="">Brak</option><option value="Pan">Pan</option><option value="Pani">Pani</option></select></label>
        <label>Imię<input required value={formularz.imie} onChange={(zdarzenie) => zmienPole('imie', zdarzenie.target.value)} /></label>
        <label>Nazwisko<input required value={formularz.nazwisko} onChange={(zdarzenie) => zmienPole('nazwisko', zdarzenie.target.value)} /></label>
        <label>Pseudonim<input value={formularz.pseudonim} onChange={(zdarzenie) => zmienPole('pseudonim', zdarzenie.target.value)} /></label>
        <label>E-mail<input required type="email" value={formularz.emaile[0] ?? ''} onChange={(zdarzenie) => zmienPole('emaile', [zdarzenie.target.value])} /></label>
        <label>Telefon<PoleTelefonu telefon={formularz.telefony[0] as Telefon} onChange={(telefon) => zmienPole('telefony', [telefon])} /></label>
        <label>Login<input required value={formularz.login} onChange={(zdarzenie) => zmienPole('login', zdarzenie.target.value)} /></label>
        <label>Rola<select value={formularz.rola} onChange={(zdarzenie) => zmienPole('rola', zdarzenie.target.value as FormularzUzytkownika['rola'])}>{roleUzytkownikow.filter((rola) => rola !== 'ARCHITEKT').map((rola) => <option key={rola} value={rola}>{etykietyRol[rola]}</option>)}</select></label>
        <label>Organizacja<select value={formularz.organizacja} onChange={(zdarzenie) => zmienPole('organizacja', zdarzenie.target.value as FormularzUzytkownika['organizacja'])}>{Object.entries(etykietyOrganizacji).map(([organizacja, etykieta]) => <option key={organizacja} value={organizacja}>{etykieta}</option>)}</select></label>
        <label>Status<select value={formularz.status} onChange={(zdarzenie) => zmienPole('status', zdarzenie.target.value as FormularzUzytkownika['status'])}><option value="UTWORZONY">Utworzony</option><option value="OCZEKUJE_NA_AKTYWACJE">Oczekuje na aktywację</option><option value="AKTYWNY">Aktywny</option><option value="ZABLOKOWANY">Zablokowany</option><option value="NIEAKTYWNY">Nieaktywny</option></select></label>
        <fieldset><legend>Odznaki</legend>{(Object.keys(metadaneOdznak) as TypOdznakiUzytkownika[]).map((odznaka) => <label key={odznaka}><input type="checkbox" checked={formularz.odznaki.includes(odznaka)} onChange={(zdarzenie) => zmienPole('odznaki', zdarzenie.target.checked ? [...formularz.odznaki, odznaka] : formularz.odznaki.filter((obecna) => obecna !== odznaka))} /> {metadaneOdznak[odznaka].etykieta}</label>)}</fieldset>
        <div className="uzytkownicy__akcje"><button type="submit">Utwórz konto</button></div>
      </form>
    </details>
    <PanelOperacjiKont otworzProfil={otworzProfil} poZapisie={() => { ustawWersjeListy((obecna) => obecna + 1); odswiezUzytkownika() }} />
  </section>
}
