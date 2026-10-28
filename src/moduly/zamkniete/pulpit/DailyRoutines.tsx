import { useEffect, useState, type FormEvent } from 'react'
import { useKontekstUzytkownika } from '../../../aplikacja/logowanie/useKontekstUzytkownika'
import { czyJestAdministratorem } from '../../../kartoteki/uzytkownicy/uprawnienia'
import { czyJestPracownikiemWewnetrznym, pobierzNazweWyswietlanaUzytkownika } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { dataWarszawska, dodajDni, obliczPostep, poczatekTygodnia, wersjaNaDzien, wystapieniaDnia, wystapieniaTygodnia, wlascicielWystapienia, type HarmonogramRutyny, type Rutyna, type StanRutyn, type WystapienieRutyny } from './logika/rutyny'
import { pobierzRutyny, zapiszRutyne, zmienWykonanieRutyny } from './uslugi/rutynyPulpitu'
import './rutyny.css'

type Zakladka = 'Dzisiaj' | 'Ten tydzień' | 'Historia' | 'Zarządzaj rutynami'
type Formularz = { id: string; tytul: string; opis: string; instrukcja: string; link: string; wlascicielId: string; priorytet: 'ZWYKLE' | 'PILNE'; rodzaj: HarmonogramRutyny['rodzaj']; dni: number[]; liczba: number; od: string; aktywna: boolean }
const dniTygodnia = [{ numer: 1, nazwa: 'Pn' }, { numer: 2, nazwa: 'Wt' }, { numer: 3, nazwa: 'Śr' }, { numer: 4, nazwa: 'Cz' }, { numer: 5, nazwa: 'Pt' }, { numer: 6, nazwa: 'Sb' }, { numer: 0, nazwa: 'Nd' }]
const pustyStan: StanRutyn = { rutyny: [], wykonania: [], historia: [] }
function pustyFormularz(wlascicielId: string, dzisiaj: string): Formularz { return { id: '', tytul: '', opis: '', instrukcja: '', link: '', wlascicielId, priorytet: 'ZWYKLE', rodzaj: 'CODZIENNIE', dni: [], liczba: 3, od: dzisiaj, aktywna: true } }

function Pasek({ wystapienia }: { wystapienia: WystapienieRutyny[] }) {
  const postep = obliczPostep(wystapienia)
  return <div className={'rutyny-postep rutyny-postep--' + postep.stan}>
    {postep.procent === null ? <p>Brak zaplanowanych zadań</p> : <><div className="rutyny-postep__liczby"><strong>Wykonano {postep.wykonane} z {postep.liczba}</strong><strong>{Math.round(postep.procent)}%</strong></div><div className="rutyny-postep__tor" role="progressbar" aria-label="Postęp rutyn" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(postep.procent)}><span style={{ width: postep.procent + '%' }} /></div><p className={postep.stan === 'UKONCZONE' ? 'rutyny-postep__sukces' : undefined}>{postep.stan === 'UKONCZONE' ? '✓ Wszystko zrobione!' : postep.stan === 'ZIELONY' ? 'Bardzo dobry postęp' : postep.stan === 'POMARANCZOWY' ? 'W trakcie realizacji' : 'Wymaga poprawy'}</p></>}
  </div>
}

export default function WidokRutyn({ otworzMonitor }: { otworzMonitor: () => void }) {
  const { zalogowanyUzytkownik, aktywniUzytkownicy } = useKontekstUzytkownika()
  const [stan, ustawStan] = useState<StanRutyn>(pustyStan)
  const [blad, ustawBlad] = useState('')
  const [dzisiaj, ustawDzisiaj] = useState(() => dataWarszawska(new Date()))
  const [otwarty, ustawOtwarty] = useState(false)
  const [zakladka, ustawZakladke] = useState<Zakladka>('Dzisiaj')
  const [zakres, ustawZakres] = useState<'MOJE' | 'ZESPOL'>('MOJE')
  const [filtr, ustawFiltr] = useState<'WSZYSTKIE' | 'OTWARTE' | 'WYKONANE' | 'ZALEGLE'>('WSZYSTKIE')
  const [formularz, ustawFormularz] = useState<Formularz | null>(null)
  const czyAdmin = czyJestAdministratorem(zalogowanyUzytkownik)
  const czyPracownik = czyJestPracownikiemWewnetrznym(zalogowanyUzytkownik)

  useEffect(() => {
    function odswiez() { try { ustawStan(pobierzRutyny()); ustawBlad('') } catch (wyjatek) { ustawBlad(wyjatek instanceof Error ? wyjatek.message : 'Nie udało się odczytać rutyn.') } ustawDzisiaj(dataWarszawska(new Date())) }
    odswiez()
    const zegar = window.setInterval(odswiez, 60_000)
    window.addEventListener('focus', odswiez); window.addEventListener('storage', odswiez)
    return () => { window.clearInterval(zegar); window.removeEventListener('focus', odswiez); window.removeEventListener('storage', odswiez) }
  }, [])
  if (!czyPracownik || !zalogowanyUzytkownik) return null
  const uzytkownik = zalogowanyUzytkownik
  const widoczne = (wystapienia: WystapienieRutyny[]) => wystapienia.filter((wpis) => { const rutyna = stan.rutyny.find((pozycja) => pozycja.id === wpis.rutynaId); return rutyna && ((czyAdmin && zakres === 'ZESPOL') || wlascicielWystapienia(rutyna, wpis) === uzytkownik.id) })
  const dzienne = widoczne(wystapieniaDnia(stan.rutyny, stan.wykonania, dzisiaj))
  const tygodniowe = widoczne(wystapieniaTygodnia(stan.rutyny, stan.wykonania, dzisiaj))
  const zalegleDni = Array.from({ length: 30 }, (_, indeks) => dodajDni(dzisiaj, -indeks - 1)).flatMap((data) => widoczne(wystapieniaDnia(stan.rutyny, stan.wykonania, data))).filter((wpis) => !wpis.wykonane)
  const zalegleCele = Array.from({ length: 4 }, (_, indeks) => dodajDni(poczatekTygodnia(dzisiaj), -7 * (indeks + 1))).flatMap((data) => widoczne(wystapieniaTygodnia(stan.rutyny, stan.wykonania, data))).filter((wpis) => wpis.numer > 0 && !wpis.wykonane)
  const zalegle = [...zalegleDni, ...zalegleCele]
  function wykonaj(wpis: WystapienieRutyny, wartosc: boolean) { try { zmienWykonanieRutyny(wpis, wartosc, uzytkownik); ustawStan(pobierzRutyny()); ustawBlad('') } catch (wyjatek) { ustawBlad(wyjatek instanceof Error ? wyjatek.message : 'Nie udało się zmienić rutyny.') } }
  function edytuj(rutyna: Rutyna) {
    const wersja = rutyna.wersje.at(-1)!
    const od = wersja.harmonogram.rodzaj === 'CEL_TYGODNIOWY' ? dodajDni(poczatekTygodnia(dzisiaj), 7) : dodajDni(dzisiaj, 1)
    ustawFormularz({ id: rutyna.id, tytul: rutyna.tytul, opis: rutyna.opis ?? '', instrukcja: rutyna.instrukcja ?? '', link: rutyna.link ?? '', wlascicielId: rutyna.wlascicielId, priorytet: rutyna.priorytet ?? 'ZWYKLE', rodzaj: wersja.harmonogram.rodzaj, dni: wersja.harmonogram.rodzaj === 'DNI_TYGODNIA' ? wersja.harmonogram.dni : [], liczba: wersja.harmonogram.rodzaj === 'CEL_TYGODNIOWY' ? wersja.harmonogram.liczba : 3, od, aktywna: wersja.aktywna })
  }
  function zapiszFormularz(zdarzenie: FormEvent) {
    zdarzenie.preventDefault(); if (!formularz) return
    const harmonogram: HarmonogramRutyny = formularz.rodzaj === 'CODZIENNIE' ? { rodzaj: 'CODZIENNIE' } : formularz.rodzaj === 'DNI_TYGODNIA' ? { rodzaj: 'DNI_TYGODNIA', dni: formularz.dni } : { rodzaj: 'CEL_TYGODNIOWY', liczba: formularz.liczba }
    const rutyna: Rutyna = { id: formularz.id || crypto.randomUUID(), tytul: formularz.tytul, opis: formularz.opis, instrukcja: formularz.instrukcja, link: formularz.link, wlascicielId: formularz.wlascicielId, priorytet: formularz.priorytet, wersje: [{ od: formularz.od, aktywna: formularz.aktywna, harmonogram }] }
    try { zapiszRutyne(rutyna, uzytkownik); ustawStan(pobierzRutyny()); ustawFormularz(null); ustawBlad('') } catch (wyjatek) { ustawBlad(wyjatek instanceof Error ? wyjatek.message : 'Nie udało się zapisać rutyny.') }
  }
  function lista(wpisy: WystapienieRutyny[]) {
    if (!wpisy.length) return <p>Brak zaplanowanych zadań</p>
    return <ul className="rutyny-lista">{wpisy.map((wpis) => { const rutyna = stan.rutyny.find((pozycja) => pozycja.id === wpis.rutynaId); const jeszczeNieObowiazuje = wpis.numer > 0 && wpis.okres === poczatekTygodnia(dzisiaj) && rutyna && !wersjaNaDzien(rutyna, dzisiaj); return <li key={`${wpis.rutynaId}-${wpis.okres}-${wpis.numer}`}><label><input type="checkbox" checked={wpis.wykonane} disabled={wpis.okres > dzisiaj || Boolean(jeszczeNieObowiazuje)} onChange={(zdarzenie) => wykonaj(wpis, zdarzenie.target.checked)} /><span>{wpis.tytul}{wpis.numer ? ` (${wpis.numer})` : ''} {wpis.okres < dzisiaj && !wpis.numer && !wpis.wykonane && <strong> · zaległe</strong>}<small>{wpis.okres}{rutyna?.priorytet === 'PILNE' ? ' · Pilne' : ''}</small></span></label>{rutyna?.opis && <span>{rutyna.opis}</span>}{rutyna?.link && <a href={rutyna.link} target="_blank" rel="noreferrer">Otwórz link</a>}{rutyna?.instrukcja && <details><summary>Instrukcja</summary>{rutyna.instrukcja}</details>}</li> })}</ul>
  }
  const widok = filtr === 'ZALEGLE' ? zalegle : (zakladka === 'Ten tydzień' ? tygodniowe : dzienne).filter((wpis) => filtr === 'WSZYSTKIE' || (filtr === 'WYKONANE' ? wpis.wykonane : !wpis.wykonane))
  const zarzadzane = stan.rutyny.filter((rutyna) => czyAdmin || rutyna.wlascicielId === uzytkownik.id)
  return <section className="daily-routines" aria-label="Daily Routines">
    <div className="daily-routines__naglowek"><h2>Daily Routines</h2><button type="button" onClick={() => ustawOtwarty(!otwarty)}>{otwarty ? 'Zamknij moduł' : 'Zobacz wszystkie'}</button></div>
    {blad && <p role="alert" className="rutyny-blad">{blad}</p>}
    <Pasek wystapienia={dzienne} />
    {lista(dzienne.filter((wpis) => !wpis.wykonane).slice(0, 4))}
    {zalegle.length > 0 && <p className="rutyny-zalegle">Zaległe: {zalegle.length} (dni z ostatnich 30 dni i cele z czterech tygodni)</p>}
    {otwarty && <div className="rutyny-modul">
      <nav className="rutyny-zakladki" aria-label="Widoki rutyn">{(['Dzisiaj', 'Ten tydzień', 'Historia', 'Zarządzaj rutynami'] as Zakladka[]).map((nazwa) => <button type="button" key={nazwa} aria-current={zakladka === nazwa ? 'page' : undefined} onClick={() => ustawZakladke(nazwa)}>{nazwa}</button>)}</nav>
      {czyAdmin && <label>Zakres <select value={zakres} onChange={(zdarzenie) => ustawZakres(zdarzenie.target.value === 'ZESPOL' ? 'ZESPOL' : 'MOJE')}><option value="MOJE">Moje</option><option value="ZESPOL">Zespołu</option></select></label>}
      {(zakladka === 'Dzisiaj' || zakladka === 'Ten tydzień') && <><h3>{zakladka}</h3><Pasek wystapienia={zakladka === 'Dzisiaj' ? dzienne : tygodniowe} />{zakladka === 'Ten tydzień' && stan.rutyny.map((rutyna) => { const cele = tygodniowe.filter((wpis) => wpis.rutynaId === rutyna.id && wpis.numer > 0); return cele.length > 0 ? <p key={rutyna.id}>{rutyna.tytul}: {cele.filter((wpis) => wpis.wykonane).length} z {cele.length} w tym tygodniu</p> : null })}<label>Filtr <select value={filtr} onChange={(zdarzenie) => ustawFiltr(zdarzenie.target.value as typeof filtr)}><option value="WSZYSTKIE">Wszystkie</option><option value="OTWARTE">Do zrobienia</option><option value="WYKONANE">Wykonane</option><option value="ZALEGLE">Zaległe — ostatnie 30 dni / 4 tygodnie</option></select></label>{lista(widok)}{zakladka === 'Ten tydzień' && <p>Cel tygodniowy jest liczony osobno od postępu dziennego.</p>}</>}
      {zakladka === 'Historia' && <><h3>Wykonane wystąpienia</h3>{lista(widoczne(stan.wykonania.filter((wpis) => wpis.wykonane).map((wpis) => ({ ...wpis, tytul: stan.rutyny.find((rutyna) => rutyna.id === wpis.rutynaId)?.tytul ?? 'Rutyna' })) ))}<h3>Historia zmian</h3>{stan.historia.filter((wpis) => { const rutyna = stan.rutyny.find((pozycja) => pozycja.id === wpis.rutynaId); return rutyna && (czyAdmin && zakres === 'ZESPOL' || rutyna.wlascicielId === uzytkownik.id || wpis.uzytkownikId === uzytkownik.id) }).slice().reverse().map((wpis, indeks) => <p key={`${wpis.czas}-${indeks}`}>{new Date(wpis.czas).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })} · {stan.rutyny.find((rutyna) => rutyna.id === wpis.rutynaId)?.tytul} · {wpis.opis}</p>)}</>}
      {zakladka === 'Zarządzaj rutynami' && <><h3>Rutyny</h3><button type="button" onClick={() => ustawFormularz(pustyFormularz(uzytkownik.id, dzisiaj))}>Dodaj rutynę</button><div className="rutyny-szablony"><span>Przykłady: </span>{['Aktualizacja terminów w Eventis', 'Publikacja terminów na szkolenia24h.pl', 'Kontrola przesyłek w transporcie'].map((tytul) => <button type="button" key={tytul} onClick={() => ustawFormularz({ ...pustyFormularz(uzytkownik.id, dzisiaj), tytul })}>{tytul}</button>)}<button type="button" onClick={otworzMonitor}>Otwórz monitor przesyłek</button></div>{zarzadzane.map((rutyna) => <div className="rutyny-zarzadzanie" key={rutyna.id}><strong>{rutyna.tytul}</strong><span>{rutyna.wersje.at(-1)?.aktywna ? 'Aktywna' : 'Nieaktywna'}</span><button type="button" onClick={() => edytuj(rutyna)}>Edytuj</button></div>)}
        {formularz && <form className="rutyny-formularz" onSubmit={zapiszFormularz}><h3>{formularz.id ? 'Edytuj rutynę' : 'Nowa rutyna'}</h3>
          <label>Nazwa<input required value={formularz.tytul} onChange={(zdarzenie) => ustawFormularz({ ...formularz, tytul: zdarzenie.target.value })} /></label>
          <label>Opis<textarea value={formularz.opis} onChange={(zdarzenie) => ustawFormularz({ ...formularz, opis: zdarzenie.target.value })} /></label>
          <label>Instrukcja<textarea value={formularz.instrukcja} onChange={(zdarzenie) => ustawFormularz({ ...formularz, instrukcja: zdarzenie.target.value })} /></label>
          <label>Link (HTTP lub HTTPS)<input type="url" value={formularz.link} onChange={(zdarzenie) => ustawFormularz({ ...formularz, link: zdarzenie.target.value })} /></label>
          {czyAdmin && <label>Przypisanie<select value={formularz.wlascicielId} onChange={(zdarzenie) => ustawFormularz({ ...formularz, wlascicielId: zdarzenie.target.value })}>{aktywniUzytkownicy.filter(czyJestPracownikiemWewnetrznym).map((osoba) => <option value={osoba.id} key={osoba.id}>{pobierzNazweWyswietlanaUzytkownika(osoba)}</option>)}</select></label>}
          <label>Priorytet<select value={formularz.priorytet} onChange={(zdarzenie) => ustawFormularz({ ...formularz, priorytet: zdarzenie.target.value === 'PILNE' ? 'PILNE' : 'ZWYKLE' })}><option value="ZWYKLE">Zwykły</option><option value="PILNE">Pilny</option></select></label>
          <label>Częstotliwość<select value={formularz.rodzaj} onChange={(zdarzenie) => ustawFormularz({ ...formularz, rodzaj: zdarzenie.target.value as HarmonogramRutyny['rodzaj'] })}><option value="CODZIENNIE">Codziennie</option><option value="DNI_TYGODNIA">Wybrane dni tygodnia</option><option value="CEL_TYGODNIOWY">N razy w tygodniu</option></select></label>
          {formularz.rodzaj === 'DNI_TYGODNIA' && <fieldset><legend>Dni tygodnia</legend>{dniTygodnia.map((dzien) => <label key={dzien.numer}><input type="checkbox" checked={formularz.dni.includes(dzien.numer)} onChange={(zdarzenie) => ustawFormularz({ ...formularz, dni: zdarzenie.target.checked ? [...formularz.dni, dzien.numer] : formularz.dni.filter((numer) => numer !== dzien.numer) })} /> {dzien.nazwa}</label>)}</fieldset>}
          {formularz.rodzaj === 'CEL_TYGODNIOWY' && <label>Razy w tygodniu<input type="number" min="1" max="50" required value={formularz.liczba} onChange={(zdarzenie) => ustawFormularz({ ...formularz, liczba: Number(zdarzenie.target.value) })} /></label>}
          <label>Obowiązuje od<input type="date" min={formularz.id ? dodajDni(dzisiaj, 1) : dzisiaj} required value={formularz.od} onChange={(zdarzenie) => ustawFormularz({ ...formularz, od: zdarzenie.target.value })} /></label>
          <label><input type="checkbox" checked={formularz.aktywna} onChange={(zdarzenie) => ustawFormularz({ ...formularz, aktywna: zdarzenie.target.checked })} /> Rutyna aktywna</label><p>Zmiany harmonogramu i przypisania obowiązują od przyszłej daty; zmiany celu tygodniowego od poniedziałku.</p>
          <div><button type="submit">Zapisz</button> <button type="button" onClick={() => ustawFormularz(null)}>Anuluj</button></div>
        </form>}</>}
    </div>}
  </section>
}
