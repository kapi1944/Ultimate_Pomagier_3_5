import { useEffect, useState, type FormEvent } from 'react'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import { zaktualizujUzytkownikaPrzezAdministratora, zaktualizujUzytkownikaPrzezArchitekta, zaktualizujWlasnyProfil, pobierzUzytkownikow } from './magazynUzytkownikow'
import { czyMozeEdytowacProfil, czyMozePrzegladacProfil } from './uprawnienia'
import AvatarUzytkownika from './komponenty/AvatarUzytkownika'
import OdznakaRoli from './komponenty/OdznakaRoli'
import OdznakaUzytkownika from './komponenty/OdznakaUzytkownika'
import { etykietyOrganizacji, etykietyRol, metadaneOdznak, pobierzNazweWyswietlanaUzytkownika, type FormularzUzytkownika, type OdznakaUzytkownika as TypOdznaki, type Uzytkownik } from './typyUzytkownikow'
import { mapujUzytkownikaNaFormularz, roleUzytkownikow, tytulyNaukowe, zwroty } from './daneUzytkownikow'
import './widokProfiluUzytkownika.css'

type WlasciwosciWidokuProfilu = {
  uzytkownikId?: string | null
  wybierzProfil: (uzytkownikId: string) => void
  ustawCzyMaNiezapisaneZmiany: (czyMaNiezapisaneZmiany: boolean) => void
}

function Pole({ etykieta, children }: { etykieta: string; children: React.ReactNode }) { return <label className="profil-uzytkownika__pole"><span>{etykieta}</span>{children}</label> }
function czyMoznaPokazacDaneAdministracyjne(zalogowany: Uzytkownik, przegladany: Uzytkownik) { return zalogowany.id === przegladany.id || zalogowany.rola === 'ADMINISTRATOR' || zalogowany.rola === 'ARCHITEKT' }

export default function WidokProfiluUzytkownika({ uzytkownikId, wybierzProfil, ustawCzyMaNiezapisaneZmiany }: WlasciwosciWidokuProfilu) {
  const { zalogowanyUzytkownik, odswiezUzytkownika } = useKontekstUzytkownika()
  const uzytkownicy = pobierzUzytkownikow()
  const przegladany = uzytkownicy.find((uzytkownik) => uzytkownik.id === (uzytkownikId || zalogowanyUzytkownik?.id))
  const [czyEdycja, ustawCzyEdycja] = useState(false)
  const [formularz, ustawFormularz] = useState<FormularzUzytkownika | null>(null)
  const [komunikat, ustawKomunikat] = useState('')
  const [blad, ustawBlad] = useState('')

  useEffect(() => {
    function ostrzezPrzedOdswiezeniem(zdarzenie: BeforeUnloadEvent) { if (czyEdycja) { zdarzenie.preventDefault(); zdarzenie.returnValue = '' } }
    window.addEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
    return () => window.removeEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
  }, [czyEdycja])

  if (!zalogowanyUzytkownik || !przegladany || !czyMozePrzegladacProfil(zalogowanyUzytkownik, przegladany)) return <main className="widok profil-uzytkownika"><p>Nie masz uprawnień do wyświetlenia tego profilu.</p></main>
  const uzytkownikProfilu = przegladany
  const uzytkownikZalogowany = zalogowanyUzytkownik
  const czyMozeEdytowac = czyMozeEdytowacProfil(zalogowanyUzytkownik, przegladany)
  const czyDaneAdministracyjne = czyMoznaPokazacDaneAdministracyjne(zalogowanyUzytkownik, przegladany)
  const dostepniUzytkownicy = uzytkownicy.filter((uzytkownik) => czyMozePrzegladacProfil(zalogowanyUzytkownik, uzytkownik))
  const aktualnyFormularz = formularz ?? mapujUzytkownikaNaFormularz(przegladany)
  const czyWlasciciel = zalogowanyUzytkownik.id === przegladany.id

  function rozpocznijEdycje() { ustawFormularz(mapujUzytkownikaNaFormularz(uzytkownikProfilu)); ustawCzyEdycja(true); ustawKomunikat(''); ustawBlad('') }
  function anuluj() { ustawFormularz(null); ustawCzyEdycja(false); ustawCzyMaNiezapisaneZmiany(false); ustawBlad('') }
  function zmienPole<K extends keyof FormularzUzytkownika>(pole: K, wartosc: FormularzUzytkownika[K]) { ustawFormularz((poprzedni) => poprzedni ? { ...poprzedni, [pole]: wartosc } : poprzedni); ustawCzyMaNiezapisaneZmiany(true) }
  function zapisz(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()
    if (!formularz) return
    const wynik = czyWlasciciel ? zaktualizujWlasnyProfil(uzytkownikZalogowany, uzytkownikProfilu.id, formularz) : uzytkownikZalogowany.rola === 'ARCHITEKT' ? zaktualizujUzytkownikaPrzezArchitekta(uzytkownikZalogowany, uzytkownikProfilu.id, formularz) : zaktualizujUzytkownikaPrzezAdministratora(uzytkownikZalogowany, uzytkownikProfilu.id, formularz)
    if (!wynik.uzytkownik) { ustawBlad(wynik.blad ?? 'Nie udało się zapisać profilu.'); return }
    ustawCzyEdycja(false); ustawFormularz(null); ustawCzyMaNiezapisaneZmiany(false); ustawKomunikat('Profil został zapisany.'); ustawBlad('')
    odswiezUzytkownika()
  }

  return <main className="widok profil-uzytkownika">
    <div className="profil-uzytkownika__wybor"><label htmlFor="wyswietlany-profil">Wyświetlany profil</label><select id="wyswietlany-profil" onChange={(zdarzenie) => wybierzProfil(zdarzenie.target.value)} value={przegladany.id}>{dostepniUzytkownicy.map((uzytkownik) => <option key={uzytkownik.id} value={uzytkownik.id}>{pobierzNazweWyswietlanaUzytkownika(uzytkownik)}</option>)}</select></div>
    {komunikat && <p aria-live="polite" className="profil-uzytkownika__sukces">{komunikat}</p>}
    {blad && <p aria-live="assertive" className="profil-uzytkownika__blad">{blad}</p>}
    <header className="profil-uzytkownika__naglowek"><AvatarUzytkownika uzytkownik={przegladany} /><div><h1>{przegladany.imie} {przegladany.nazwisko}</h1>{przegladany.pseudonim && <p>{przegladany.pseudonim}</p>}<OdznakaRoli rola={przegladany.rola} /><span>{etykietyOrganizacji[przegladany.organizacja]} · {przegladany.status}</span></div>{czyMozeEdytowac && !czyEdycja && <button onClick={rozpocznijEdycje} type="button">Edytuj profil</button>}</header>
    {czyEdycja ? <form className="profil-uzytkownika__formularz" onSubmit={zapisz}>
      <section><h2>Dane kontaktowe</h2><div className="profil-uzytkownika__siatka">
        <Pole etykieta="Zwrot"><select onChange={(zdarzenie) => zmienPole('zwrot', zdarzenie.target.value as FormularzUzytkownika['zwrot'])} value={aktualnyFormularz.zwrot}>{['', ...zwroty].map((zwrot) => <option key={zwrot} value={zwrot}>{zwrot || 'Wybierz'}</option>)}</select></Pole>
        <Pole etykieta="Tytuł naukowy"><select onChange={(zdarzenie) => zmienPole('tytulNaukowy', zdarzenie.target.value as FormularzUzytkownika['tytulNaukowy'])} value={aktualnyFormularz.tytulNaukowy}>{tytulyNaukowe.map((tytul) => <option key={tytul} value={tytul}>{tytul || 'Brak'}</option>)}</select></Pole>
        <Pole etykieta="Imię"><input onChange={(zdarzenie) => zmienPole('imie', zdarzenie.target.value)} required value={aktualnyFormularz.imie} /></Pole>
        <Pole etykieta="Nazwisko"><input onChange={(zdarzenie) => zmienPole('nazwisko', zdarzenie.target.value)} required value={aktualnyFormularz.nazwisko} /></Pole>
        <Pole etykieta="Pseudonim"><input onChange={(zdarzenie) => zmienPole('pseudonim', zdarzenie.target.value)} value={aktualnyFormularz.pseudonim} /></Pole>
        {aktualnyFormularz.emaile.map((email, indeks) => <Pole etykieta={`E-mail ${indeks + 1}`} key={`email-${indeks}`}><input onChange={(zdarzenie) => zmienPole('emaile', aktualnyFormularz.emaile.map((wartosc, indeksEmaila) => indeksEmaila === indeks ? zdarzenie.target.value : wartosc))} type="email" value={email} /></Pole>)}
        {aktualnyFormularz.telefony.map((telefon, indeks) => <Pole etykieta={`Telefon ${indeks + 1}`} key={`telefon-${indeks}`}><div className="profil-uzytkownika__telefon"><span>+48</span><input onChange={(zdarzenie) => zmienPole('telefony', aktualnyFormularz.telefony.map((wartosc, indeksTelefonu) => indeksTelefonu === indeks ? { ...wartosc, numer: zdarzenie.target.value } : wartosc))} inputMode="numeric" value={telefon.numer} /></div></Pole>)}
      </div><button onClick={() => zmienPole('emaile', [...aktualnyFormularz.emaile, ''])} type="button">Dodaj e-mail</button><button onClick={() => zmienPole('telefony', [...aktualnyFormularz.telefony, { prefiks: '+48', numer: '' }])} type="button">Dodaj telefon</button></section>
      {!czyWlasciciel && <section><h2>Dane organizacyjne</h2><div className="profil-uzytkownika__siatka"><Pole etykieta="Login"><input onChange={(zdarzenie) => zmienPole('login', zdarzenie.target.value)} value={aktualnyFormularz.login} /></Pole><Pole etykieta="Rola">{przegladany.rola === 'ARCHITEKT' ? <output>Chroniona rola Kacpra Madeja</output> : <select onChange={(zdarzenie) => zmienPole('rola', zdarzenie.target.value as FormularzUzytkownika['rola'])} value={aktualnyFormularz.rola}>{roleUzytkownikow.filter((rola) => rola !== 'ARCHITEKT').map((rola) => <option key={rola} value={rola}>{etykietyRol[rola]}</option>)}</select>}</Pole><Pole etykieta="Kolor profilu"><input onChange={(zdarzenie) => zmienPole('kolorProfilu', zdarzenie.target.value)} pattern="#[0-9a-fA-F]{6}" value={aktualnyFormularz.kolorProfilu} /></Pole></div><fieldset><legend>Odznaki</legend>{(Object.keys(metadaneOdznak) as TypOdznaki[]).map((odznaka) => <label key={odznaka}><input checked={aktualnyFormularz.odznaki.includes(odznaka)} onChange={(zdarzenie) => zmienPole('odznaki', zdarzenie.target.checked ? [...aktualnyFormularz.odznaki, odznaka] : aktualnyFormularz.odznaki.filter((wartosc) => wartosc !== odznaka))} type="checkbox" />{metadaneOdznak[odznaka].etykieta}</label>)}</fieldset></section>}
      <div className="profil-uzytkownika__akcje"><button onClick={anuluj} type="button">Anuluj</button><button type="submit">Zapisz</button></div>
    </form> : <div className="profil-uzytkownika__kolumny"><section><h2>Dane kontaktowe</h2><p>{przegladany.emaile.join(', ')}</p><p>{przegladany.telefony.map((telefon) => `${telefon.prefiks} ${telefon.numer}`).join(', ')}</p></section><section><h2>Dane organizacyjne</h2>{czyDaneAdministracyjne ? <><p>Login: {przegladany.login}</p><p>Status: {przegladany.status}</p><p>Kolor profilu: {przegladany.kolorProfilu}</p></> : <p>{etykietyOrganizacji[przegladany.organizacja]}</p>}</section><section><h2>Odznaki i uprawnienia</h2>{przegladany.odznaki.length ? <div className="profil-uzytkownika__odznaki">{przegladany.odznaki.map((odznaka) => <OdznakaUzytkownika key={odznaka} odznaka={odznaka} />)}</div> : <p>Ten użytkownik nie ma dodatkowych odznak.</p>}</section>{czyDaneAdministracyjne && <section><h2>Informacje systemowe</h2><p>Identyfikator: {przegladany.id}</p><p>Ostatnie logowanie: {przegladany.ostatnieLogowanie ?? 'Brak'}</p><p>Utworzono: {przegladany.utworzono}</p><p>Zaktualizowano: {przegladany.zaktualizowano}</p><p>Wersja uprawnień: {przegladany.wersjaUprawnien}</p></section>}</div>}
  </main>
}
