import { useState, type FormEvent } from 'react'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import PoleTelefonu from '../../wspolne/telefon/PoleTelefonu'
import { utworzPustyFormularz } from './daneUzytkownikow'
import { pobierzUzytkownikow, utworzUzytkownikaPrzezAdministratora } from './magazynUzytkownikow'
import { czyMozeZarzadzacUzytkownikami } from './uprawnienia'
import AvatarUzytkownika from './komponenty/AvatarUzytkownika'
import OdznakaRoli from './komponenty/OdznakaRoli'
import OdznakaUzytkownika from './komponenty/OdznakaUzytkownika'
import { etykietyOrganizacji, etykietyRol, metadaneOdznak, roleUzytkownikow, type FormularzUzytkownika, type OdznakaUzytkownika as TypOdznakiUzytkownika, type Telefon } from './typyUzytkownikow'
import './widokUzytkownikow.css'

type WlasciwosciWidokuUzytkownikow = {
  otworzProfil: (uzytkownikId: string) => void
}

export default function WidokUzytkownikow({ otworzProfil }: WlasciwosciWidokuUzytkownikow) {
  const { zalogowanyUzytkownik, odswiezUzytkownika } = useKontekstUzytkownika()
  const [formularz, ustawFormularz] = useState<FormularzUzytkownika>(utworzPustyFormularz)
  const [wersjaListy, ustawWersjeListy] = useState(0)
  const [komunikat, ustawKomunikat] = useState('')
  const [blad, ustawBlad] = useState('')
  const uzytkownicy = pobierzUzytkownikow()

  function zmienPole<K extends keyof FormularzUzytkownika>(pole: K, wartosc: FormularzUzytkownika[K]) {
    ustawFormularz((poprzedni) => ({ ...poprzedni, [pole]: wartosc }))
  }

  function zapiszNowegoUzytkownika(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()
    if (!zalogowanyUzytkownik) return
    const wynik = utworzUzytkownikaPrzezAdministratora(zalogowanyUzytkownik, formularz)
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
    <header><h1>Użytkownicy</h1><p>Centralna lista kont działających w lokalnym trybie demonstracyjnym.</p></header>
    {komunikat && <p aria-live="polite" className="uzytkownicy__sukces">{komunikat}</p>}
    {blad && <p aria-live="assertive" className="uzytkownicy__blad">{blad}</p>}

    <section className="uzytkownicy__karta">
      <h2>Utwórz konto</h2>
      <p>W tym lokalnym trybie konto nie ma hasła — użytkownik jest wybierany na ekranie logowania.</p>
      <form className="uzytkownicy__formularz" onSubmit={zapiszNowegoUzytkownika}>
        <label>Zwrot<select value={formularz.zwrot} onChange={(zdarzenie) => zmienPole('zwrot', zdarzenie.target.value as FormularzUzytkownika['zwrot'])}><option value="">Brak</option><option value="Pan">Pan</option><option value="Pani">Pani</option></select></label>
        <label>Imię<input required value={formularz.imie} onChange={(zdarzenie) => zmienPole('imie', zdarzenie.target.value)} /></label>
        <label>Nazwisko<input required value={formularz.nazwisko} onChange={(zdarzenie) => zmienPole('nazwisko', zdarzenie.target.value)} /></label>
        <label>Pseudonim<input required value={formularz.pseudonim} onChange={(zdarzenie) => zmienPole('pseudonim', zdarzenie.target.value)} /></label>
        <label>E-mail<input required type="email" value={formularz.emaile[0] ?? ''} onChange={(zdarzenie) => zmienPole('emaile', [zdarzenie.target.value])} /></label>
        <label>Telefon<PoleTelefonu telefon={formularz.telefony[0] as Telefon} onChange={(telefon) => zmienPole('telefony', [telefon])} wymagany /></label>
        <label>Login<input required value={formularz.login} onChange={(zdarzenie) => zmienPole('login', zdarzenie.target.value)} /></label>
        <label>Rola<select value={formularz.rola} onChange={(zdarzenie) => zmienPole('rola', zdarzenie.target.value as FormularzUzytkownika['rola'])}>{roleUzytkownikow.filter((rola) => rola !== 'ARCHITEKT').map((rola) => <option key={rola} value={rola}>{etykietyRol[rola]}</option>)}</select></label>
        <label>Organizacja<select value={formularz.organizacja} onChange={(zdarzenie) => zmienPole('organizacja', zdarzenie.target.value as FormularzUzytkownika['organizacja'])}>{Object.entries(etykietyOrganizacji).map(([organizacja, etykieta]) => <option key={organizacja} value={organizacja}>{etykieta}</option>)}</select></label>
        <label>Status<select value={formularz.status} onChange={(zdarzenie) => zmienPole('status', zdarzenie.target.value as FormularzUzytkownika['status'])}><option value="AKTYWNY">Aktywny</option><option value="ZABLOKOWANY">Zablokowany</option><option value="NIEAKTYWNY">Nieaktywny</option></select></label>
        <fieldset><legend>Odznaki</legend>{(Object.keys(metadaneOdznak) as TypOdznakiUzytkownika[]).map((odznaka) => <label key={odznaka}><input type="checkbox" checked={formularz.odznaki.includes(odznaka)} onChange={(zdarzenie) => zmienPole('odznaki', zdarzenie.target.checked ? [...formularz.odznaki, odznaka] : formularz.odznaki.filter((obecna) => obecna !== odznaka))} /> {metadaneOdznak[odznaka].etykieta}</label>)}</fieldset>
        <div className="uzytkownicy__akcje"><button type="submit">Utwórz konto</button></div>
      </form>
    </section>

    <section className="uzytkownicy__lista" aria-label="Lista użytkowników">
      <h2>Istniejące konta</h2>
      {[...uzytkownicy].sort((pierwszy, drugi) => `${pierwszy.nazwisko} ${pierwszy.imie}`.localeCompare(`${drugi.nazwisko} ${drugi.imie}`, 'pl')).map((uzytkownik) => <article className="uzytkownicy__wiersz" key={uzytkownik.id}>
        <AvatarUzytkownika uzytkownik={uzytkownik} />
        <div><strong>{uzytkownik.imie} {uzytkownik.nazwisko}</strong><span>{uzytkownik.login} · {uzytkownik.email}</span><span>{etykietyOrganizacji[uzytkownik.organizacja]} · {uzytkownik.status}</span></div>
        <div className="uzytkownicy__odznaki"><OdznakaRoli rola={uzytkownik.rola} kompaktowa />{uzytkownik.odznaki.map((odznaka) => <OdznakaUzytkownika key={odznaka} odznaka={odznaka} kompaktowa />)}</div>
        <button type="button" onClick={() => otworzProfil(uzytkownik.id)}>Otwórz profil</button>
      </article>)}
    </section>
  </section>
}
