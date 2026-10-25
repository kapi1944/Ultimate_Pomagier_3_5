import { walidujHaslo } from '../../wspolne/walidacja/walidatoryDanych'
import { informacjeOWersji } from '../wersjaAplikacji'
import { useEffect, useState, type FormEvent } from 'react'
import './panelLogowania.css'
import { Komunikat, Przycisk, OknoDialogowe } from '../../wspolne/komponenty/ElementyInterfejsu'
import PanelWersji from '../desktop/PanelWersji'
import { pobierzUstawieniaAplikacji, zastosujUstawieniaAplikacji } from '../ustawienia/magazynUstawienAplikacji'
import { czyTrybDemonstracyjny, pobierzZapamietanyLogin, uwierzytelnijPrzezUsluge, zapamietajLogin } from './uwierzytelnianie'
import { wykonajOperacjeTozsamosci } from './klientTozsamosci'
import { czyLogowanieDesktopowe, czyLogowanieNatywne, pobierzDaneDoPrzeniesienia, przeniesDaneDoKonta } from './daneDesktop'
import { odczytajBazeUzytkownikow, kluczMagazynuUzytkownikow } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'

type WlasciwosciPaneluLogowania = { otworzDemonstracje: () => boolean; poUwierzytelnieniu?: () => Promise<void> }

export default function PanelLogowania({ otworzDemonstracje, poUwierzytelnieniu }: WlasciwosciPaneluLogowania) {
  const [czyWersjeOtwarte, ustawCzyWersjeOtwarte] = useState(false)
  const [login, ustawLogin] = useState(pobierzZapamietanyLogin)
  const [haslo, ustawHaslo] = useState('')
  const [pokazHaslo, ustawPokazHaslo] = useState(false)
  const [zapamietaj, ustawZapamietaj] = useState(() => Boolean(pobierzZapamietanyLogin()))
  const [blad, ustawBlad] = useState('')
  const [czyTrwaLogowanie, ustawCzyTrwaLogowanie] = useState(false)
  const [etap, ustawEtap] = useState<'logowanie' | 'kod' | 'haslo' | 'konfiguracja'>('logowanie')
  const [imie, ustawImie] = useState('')
  const [nazwisko, ustawNazwisko] = useState('')
  const [zapamietajSesje, ustawZapamietajSesje] = useState(false)
  const [przeniesDane, ustawPrzeniesDane] = useState(false)
  const [przeniesKonta, ustawPrzeniesKonta] = useState(false)
  const [kartotekaDziedziczona] = useState(() => {
    if (!czyLogowanieDesktopowe() || czyTrybDemonstracyjny) return null
    try { const zapis = localStorage.getItem(kluczMagazynuUzytkownikow); return zapis ? odczytajBazeUzytkownikow(zapis) : null } catch { return null }
  })
  const [daneDziedziczone] = useState(() => czyLogowanieDesktopowe() && !czyTrybDemonstracyjny ? pobierzDaneDoPrzeniesienia() : {})
  const [kod, ustawKod] = useState('')
  const [zgoda, ustawZgode] = useState('')
  const [powtorzoneHaslo, ustawPowtorzoneHaslo] = useState('')
  useEffect(() => { zastosujUstawieniaAplikacji(pobierzUstawieniaAplikacji()) }, [])
  useEffect(() => {
    if (!czyLogowanieNatywne() || czyTrybDemonstracyjny) return
    let aktywny = true
    void wykonajOperacjeTozsamosci('stan-konfiguracji').then((wynik) => {
      if (!aktywny || !wynik || typeof wynik !== 'object') return
      if ('wymagaKonfiguracji' in wynik && wynik.wymagaKonfiguracji === true) ustawEtap('konfiguracja')
      if ('komunikatSesji' in wynik && typeof wynik.komunikatSesji === 'string') ustawBlad(wynik.komunikatSesji)
    }).catch(() => { if (aktywny) ustawBlad('Nie udało się sprawdzić konfiguracji kont. Zamknij aplikację i spróbuj ponownie.') })
    return () => { aktywny = false }
  }, [])
  async function obsluzLogowanie(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault(); ustawCzyTrwaLogowanie(true)
    try {
      ustawBlad('')
      if (etap === 'kod') {
        const wynik = await wykonajOperacjeTozsamosci('sprawdz-kod', { login, kod: kod.trim() })
        if (!wynik || typeof wynik !== 'object' || !('zgoda' in wynik) || typeof wynik.zgoda !== 'string') throw new Error('Nieprawidłowa odpowiedź usługi kont.')
        ustawZgode(wynik.zgoda); ustawKod(''); ustawEtap('haslo'); return
      }
      if (etap === 'haslo' || etap === 'konfiguracja') {
        if (!walidujHaslo(haslo)) throw new Error('Minimum 8 znaków, bez spacji. Polskie znaki są dozwolone. Maksymalnie 1024 bajty.')
        if (haslo !== powtorzoneHaslo) { ustawBlad('Podane hasła są różne.'); return }
        if (etap === 'konfiguracja' && przeniesDane) await przeniesDaneDoKonta(daneDziedziczone)
        await wykonajOperacjeTozsamosci(etap === 'konfiguracja' ? 'pierwsza-konfiguracja' : 'ustaw-haslo', { zgoda, login, imie, nazwisko, haslo, powtorzoneHaslo, zapamietajSesje, kartoteka: etap === 'konfiguracja' && przeniesKonta ? kartotekaDziedziczona : null })
        ustawZgode('')
      } else {
        const wynik = await uwierzytelnijPrzezUsluge(login, haslo, zapamietajSesje)
        if (wynik.status !== 'POTWIERDZONO') { ustawBlad(wynik.komunikat); return }
      }
      zapamietajLogin(login, zapamietaj)
      await poUwierzytelnieniu?.()
    } catch (blad) { ustawBlad(blad instanceof Error ? blad.message : 'Usługa tożsamości jest niedostępna.') } finally { ustawHaslo(''); ustawPowtorzoneHaslo(''); ustawCzyTrwaLogowanie(false) }
  }
  function zmienEtap(nowy: 'logowanie' | 'kod') { ustawEtap(nowy); ustawHaslo(''); ustawPowtorzoneHaslo(''); ustawKod(''); ustawZgode(''); ustawBlad('') }
  return <main className="panel-logowania"><form className="panel-logowania__formularz" onSubmit={obsluzLogowanie}>
    <header><img alt="Ultimate Pomagier" className="panel-logowania__logo" src="/logo-ultimate-pomagier.png" /><h1>{informacjeOWersji.nazwaProduktu}</h1><p>Zaloguj się do swojego obszaru pracy.</p><Komunikat>{czyLogowanieNatywne() ? 'Konta i dane są lokalne dla tej instalacji. Logowanie działa bez internetu. Dane z innych urządzeń nie są automatycznie dostępne.' : 'Logowanie wymaga skonfigurowanej lokalnej usługi kont lub aplikacji natywnej. Bez zaufanej warstwy logowanie produkcyjne jest niedostępne.'}</Komunikat>{czyTrybDemonstracyjny && <Komunikat>Lokalny tryb demonstracyjny — bez bezpiecznej weryfikacji tożsamości. Używaj wyłącznie do pracy demonstracyjnej.</Komunikat>}</header>
    <div className="panel-logowania__wybor">
      {etap !== 'logowanie' && <h2>{etap === 'konfiguracja' ? 'Pierwsza konfiguracja konta lokalnego' : etap === 'haslo' ? '🔐 Ustaw nowe hasło' : 'Dokończ resetowanie hasła'}</h2>}
      {etap === 'logowanie' && czyLogowanieNatywne() && <h2>Logowanie lokalne</h2>}
      {etap === 'konfiguracja' && kartotekaDziedziczona && <><label><input type="checkbox" checked={przeniesKonta} onChange={(zdarzenie) => {
        const wybrane = zdarzenie.target.checked; ustawPrzeniesKonta(wybrane)
        const architekt = kartotekaDziedziczona.uzytkownicy.find((konto) => konto.rola === 'ARCHITEKT')
        if (wybrane && architekt) { ustawLogin(architekt.login); ustawImie(architekt.imie); ustawNazwisko(architekt.nazwisko) }
      }} />Przenieś istniejącą kartotekę ({kartotekaDziedziczona.uzytkownicy.length} kont) z zachowaniem ID i ról. Hasło ustawiasz dla istniejącego Architekta. Pozostali właściciele ustawią hasła za pomocą kodów.</label><details><summary>Konta do przeniesienia</summary><ul>{kartotekaDziedziczona.uzytkownicy.map((konto) => <li key={konto.id}>{konto.imie} {konto.nazwisko} · {konto.login} · {konto.rola}</li>)}</ul></details></>}
      {etap === 'konfiguracja' && <><p>Utwórz pierwsze konto na tym urządzeniu. Otrzyma rolę Architekt i uprawnienia do konfiguracji. Logowanie i zapis danych działają bez internetu.</p><label>Imię<input autoComplete="given-name" required value={imie} onChange={(zdarzenie) => ustawImie(zdarzenie.target.value)} /></label><label>Nazwisko<input autoComplete="family-name" required value={nazwisko} onChange={(zdarzenie) => ustawNazwisko(zdarzenie.target.value)} /></label>{Object.keys(daneDziedziczone).length > 0 && <label><input type="checkbox" checked={przeniesDane} onChange={(zdarzenie) => ustawPrzeniesDane(zdarzenie.target.checked)} />Przenieś istniejące dane tego urządzenia ({Object.keys(daneDziedziczone).length} zapisów) do tego konta. Oryginał pozostanie zachowany. Zaznacz tylko, jeśli dane należą do Ciebie.</label>}</>}
      <label>Login lub adres e-mail<input name="username" autoComplete="username" required readOnly={etap === 'haslo'} value={login} onChange={(zdarzenie) => ustawLogin(zdarzenie.target.value)} /></label>
      {etap === 'kod' ? <><label>Kod jednorazowy<input autoComplete="off" autoCapitalize="none" spellCheck={false} required value={kod} onChange={(zdarzenie) => ustawKod(zdarzenie.target.value)} /></label><p>Kod otrzymasz od uprawnionej osoby. Jeśli wygasł lub został zablokowany, poproś ją o nowy kod. Kod jest ważny 24 godziny; po weryfikacji masz 10 minut na ustawienie hasła.</p></> : <>
        <label>{etap === 'haslo' || etap === 'konfiguracja' ? 'Nowe hasło' : 'Hasło'}<input name="password" type={pokazHaslo ? 'text' : 'password'} autoComplete={etap === 'haslo' || etap === 'konfiguracja' ? 'new-password' : 'current-password'} minLength={etap === 'haslo' || etap === 'konfiguracja' ? 8 : undefined} pattern={etap === 'haslo' || etap === 'konfiguracja' ? String.raw`[^\s\u0085]+` : undefined} required value={haslo} onChange={(zdarzenie) => ustawHaslo(zdarzenie.target.value)} /></label>
        {(etap === 'haslo' || etap === 'konfiguracja') && <><label>Powtórz nowe hasło<input type={pokazHaslo ? 'text' : 'password'} autoComplete="new-password" required value={powtorzoneHaslo} onChange={(zdarzenie) => ustawPowtorzoneHaslo(zdarzenie.target.value)} /></label><p>Minimum 8 znaków, bez spacji. Polskie znaki są dozwolone. Wybierz inne hasło niż dotychczasowe.</p></>}
        <button type="button" aria-pressed={pokazHaslo} onClick={() => ustawPokazHaslo(!pokazHaslo)}>{pokazHaslo ? 'Ukryj hasło' : 'Pokaż hasło'}</button>
      </>}
      <label><input type="checkbox" checked={zapamietaj} onChange={(zdarzenie) => { ustawZapamietaj(zdarzenie.target.checked); if (!zdarzenie.target.checked) zapamietajLogin('', false) }} />Zapamiętaj login</label>
      {czyLogowanieDesktopowe() && !czyTrybDemonstracyjny && <label><input type="checkbox" checked={zapamietajSesje} onChange={(zdarzenie) => ustawZapamietajSesje(zdarzenie.target.checked)} />Zapamiętaj sesję na tym koncie Windows przez maksymalnie 8 godzin</label>}
      {blad && <div id="blad-logowania"><Komunikat status="error">{blad}</Komunikat></div>}
      <Przycisk className="panel-logowania__zaloguj" type="submit" disabled={czyTrwaLogowanie}>{etap === 'konfiguracja' ? 'Utwórz konto lokalne' : etap === 'logowanie' ? 'Zaloguj' : etap === 'kod' ? 'Zweryfikuj kod' : 'Ustaw hasło i zaloguj'}</Przycisk>
      {!czyTrybDemonstracyjny && etap !== 'konfiguracja' && <button type="button" disabled={czyTrwaLogowanie} onClick={() => zmienEtap(etap === 'logowanie' ? 'kod' : 'logowanie')}>{etap === 'logowanie' ? 'Dokończ resetowanie hasła' : 'Wróć do logowania'}</button>}
      {etap === 'haslo' && <button type="button" disabled={czyTrwaLogowanie} onClick={() => zmienEtap('kod')}>Wprowadź kod ponownie</button>}
      {czyTrybDemonstracyjny && <Przycisk type="button" onClick={() => { if (!otworzDemonstracje()) ustawBlad('Nie udało się otworzyć demonstracji. Sprawdź stan lokalnej kartoteki i chronionego konta.') }}>Otwórz demonstrację Architekta</Przycisk>}
    </div>
    <button type="button" onClick={() => ustawCzyWersjeOtwarte(true)}>Pobierz aplikację — aktualizacje i wersje</button>
  </form><OknoDialogowe otwarty={czyWersjeOtwarte} zamknij={() => ustawCzyWersjeOtwarte(false)} tytul="Aktualizacje i wersje">{czyWersjeOtwarte && <PanelWersji />}</OknoDialogowe></main>
}
