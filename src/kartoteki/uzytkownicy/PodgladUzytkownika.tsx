import { useEffect, useRef, useState } from 'react'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import { czyTrybDemonstracyjny } from '../../aplikacja/logowanie/uwierzytelnianie'
import { pobierzUzytkownikow, zarejestrujPodgladKonta } from './magazynUzytkownikow'
import { czyMozeAkceptowac, czyMozeCzytacAudyt, czyMozeEksportowac, czyMozeWysylac, czyMozeZarzadzacUzytkownikami } from './uprawnienia'
import { ustawPodgladUzytkownika } from './stanPodgladuUzytkownika'
import AvatarUzytkownika from './komponenty/AvatarUzytkownika'
import OdznakaRoli from './komponenty/OdznakaRoli'
import type { Uzytkownik } from './typyUzytkownikow'

export default function PodgladUzytkownika() {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [szukaj, ustawSzukaj] = useState('')
  const [wybrany, ustawWybranego] = useState('')
  const [podglad, ustawPodglad] = useState<Uzytkownik | null>(null)
  const [blad, ustawBlad] = useState('')
  const okno = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (podglad) okno.current?.showModal()
    else okno.current?.close()
  }, [podglad])
  useEffect(() => () => { ustawPodgladUzytkownika(null) }, [])
  if (!czyTrybDemonstracyjny || zalogowanyUzytkownik?.rola !== 'ARCHITEKT') return null
  const konta = pobierzUzytkownikow().filter((konto) => `${konto.imie} ${konto.nazwisko} ${konto.login}`.toLocaleLowerCase('pl').includes(szukaj.toLocaleLowerCase('pl')))
  function zakoncz() {
    const wynik = zarejestrujPodgladKonta(podglad?.id ?? '', 'KONIEC_PODGLADU')
    if (wynik.blad) { ustawBlad(wynik.blad); return }
    ustawPodgladUzytkownika(null); ustawPodglad(null)
  }
  return <section aria-label="Podgląd jako użytkownik"><h2>Podgląd jako użytkownik</h2><p>Demonstracja roli i dostępnych operacji. Tożsamość sesji pozostaje na koncie Architekta. Ten podgląd nie uruchamia edytorów ani eksportów; pełna symulacja ekranów wymaga centralnego egzekwowania uprawnień.</p>
    <label>Wyszukaj użytkownika do podglądu<input value={szukaj} onChange={(zdarzenie) => { ustawSzukaj(zdarzenie.target.value); ustawWybranego('') }} /></label><label>Konto do podglądu<select aria-label="Konto do podglądu" value={wybrany} onChange={(zdarzenie) => ustawWybranego(zdarzenie.target.value)}><option value="">Wybierz</option>{konta.map((konto) => <option key={konto.id} value={konto.id}>{konto.imie} {konto.nazwisko} · {konto.login}</option>)}</select></label><button type="button" disabled={!wybrany} onClick={() => { const konto = konta.find((konto) => konto.id === wybrany); if (!konto) return; const wynik = zarejestrujPodgladKonta(konto.id, 'POCZATEK_PODGLADU'); if (wynik.blad) ustawBlad(wynik.blad); else { ustawPodgladUzytkownika(konto); ustawPodglad(konto) } }}>Uruchom podgląd</button>
    {blad && <p role="alert">{blad}</p>}
    <dialog ref={okno} className="uzytkownicy__okno-podgladu" onCancel={(zdarzenie) => { zdarzenie.preventDefault(); zakoncz() }} aria-label="Tryb podglądu użytkownika">
      {podglad && <><header className="uzytkownicy__pasek-podgladu"><strong>Tryb podglądu użytkownika · demonstracja · tylko odczyt</strong><button type="button" onClick={zakoncz}>Powrót do Architekta</button></header><AvatarUzytkownika uzytkownik={podglad} /><h2>{podglad.imie} {podglad.nazwisko}</h2><OdznakaRoli rola={podglad.rola} /><p>{podglad.organizacja} · {podglad.status}</p><p>Rzeczywista sesja: {zalogowanyUzytkownik.imie} {zalogowanyUzytkownik.nazwisko}</p><table><caption>Dostępność operacji wynikająca z bieżących reguł</caption><tbody>{[['Zarządzanie kontami', czyMozeZarzadzacUzytkownikami(podglad)], ['Akceptacja', czyMozeAkceptowac(podglad)], ['Eksport', czyMozeEksportowac(podglad)], ['Wysyłka', czyMozeWysylac(podglad)], ['Odczyt audytu', czyMozeCzytacAudyt(podglad)]].map(([nazwa, dostep]) => <tr key={String(nazwa)}><th>{nazwa}</th><td>{dostep ? 'Dostępne dla roli — zablokowane w podglądzie' : 'Brak dostępu'}</td></tr>)}</tbody></table>{blad && <p role="alert">{blad}</p>}</>}
    </dialog>
  </section>
}
