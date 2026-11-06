import { useState } from 'react'
import { dniHarmonogramu, walidujHarmonogramPracy, zmienGraniceBloku, type BlokPracy, type HarmonogramPracy, type PrzedzialGodzin } from '../../moduly/zamkniete/pulpit/logika/harmonogramPracy'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import { czyJestPracownikiemWewnetrznym, pobierzNazweWyswietlanaUzytkownika } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import { walidujWyjatkiKalendarza, type WyjatekKalendarzaPracy } from '../../wspolne/czas/kalendarzPracy'

function PolaPrzedzialu({ wartosc, zmien }: { wartosc: PrzedzialGodzin | null; zmien: (wartosc: PrzedzialGodzin | null) => void }) {
  return <>
    <label><input type="checkbox" role="switch" checked={wartosc !== null} onChange={(zdarzenie) => zmien(zdarzenie.target.checked ? { poczatek: '14:30', koniec: '16:00' } : null)} /> Odbiór</label>
    {wartosc && <><label>Od<input type="time" value={wartosc.poczatek} onChange={(zdarzenie) => zmien({ ...wartosc, poczatek: zdarzenie.target.value })} /></label><label>Do<input type="time" value={wartosc.koniec} onChange={(zdarzenie) => zmien({ ...wartosc, koniec: zdarzenie.target.value })} /></label></>}
  </>
}

export default function UstawieniaHarmonogramu({ wartosc, zmien }: { wartosc: HarmonogramPracy; zmien: (wartosc: HarmonogramPracy) => void }) {
  const { aktywniUzytkownicy } = useKontekstUzytkownika()
  const [dataWyjatku, ustawDateWyjatku] = useState('')
  const [wyjatekKalendarza, ustawWyjatekKalendarza] = useState<Omit<WyjatekKalendarzaPracy, 'id'>>({ od: '', do: '', rodzaj: 'WOLNE', powod: '' })
  const [bladKalendarza, ustawBladKalendarza] = useState('')
  const wyjatkiKalendarza = wartosc.wyjatkiKalendarza ?? []
  const bledy = walidujHarmonogramPracy(wartosc)
  function dodajWyjatekKalendarza() {
    const wpis = { ...wyjatekKalendarza, id: crypto.randomUUID(), powod: wyjatekKalendarza.powod.trim() }
    const bledy = walidujWyjatkiKalendarza([...wyjatkiKalendarza, wpis])
    if (bledy.length) { ustawBladKalendarza(bledy.join(' ')); return }
    zmien({ ...wartosc, wyjatkiKalendarza: [...wyjatkiKalendarza, wpis] })
    ustawBladKalendarza('')
    ustawWyjatekKalendarza({ od: '', do: '', rodzaj: 'WOLNE', powod: '' })
  }
  return <section className="ustawienia__karta ustawienia-harmonogram">
    <h2>Kalendarz pracy</h2>
    <p>Kalendarz korzysta z dni tygodnia wybranych w ustawieniach Pulpitu i polskich świąt, w tym Wigilii od 2025 roku. Działa offline w strefie Europe/Warsaw.</p>
    <p>Pierwszeństwo: indywidualny dzień pracy → indywidualne nieobecności → firmowy dzień wolny → firmowy dzień pracy → święto → tydzień pracy. Przy nakładających się nieobecnościach: zwolnienie → urlop → inna nieobecność → dzień wolny. Dzień wolny za święto w sobotę wprowadź z datą ustaloną w firmie.</p>
    <fieldset>
      <legend>Dodaj wyjątek kalendarza pracy</legend>
      <div className="ustawienia-harmonogram__wiersz">
        <label>Zakres wyjątku<select value={wyjatekKalendarza.uzytkownikId ?? ''} onChange={(zdarzenie) => ustawWyjatekKalendarza({ ...wyjatekKalendarza, uzytkownikId: zdarzenie.target.value || undefined, rodzaj: !zdarzenie.target.value && !['PRACA', 'WOLNE'].includes(wyjatekKalendarza.rodzaj) ? 'WOLNE' : wyjatekKalendarza.rodzaj })}><option value="">Cała firma</option>{aktywniUzytkownicy.filter(czyJestPracownikiemWewnetrznym).map((osoba) => <option key={osoba.id} value={osoba.id}>{pobierzNazweWyswietlanaUzytkownika(osoba)}</option>)}</select></label>
        <label>Od dnia<input type="date" value={wyjatekKalendarza.od} onChange={(zdarzenie) => ustawWyjatekKalendarza({ ...wyjatekKalendarza, od: zdarzenie.target.value, do: wyjatekKalendarza.do || zdarzenie.target.value })} /></label>
        <label>Do dnia włącznie<input type="date" value={wyjatekKalendarza.do} onChange={(zdarzenie) => ustawWyjatekKalendarza({ ...wyjatekKalendarza, do: zdarzenie.target.value })} /></label>
        <label>Rodzaj wyjątku<select value={wyjatekKalendarza.rodzaj} onChange={(zdarzenie) => ustawWyjatekKalendarza({ ...wyjatekKalendarza, rodzaj: zdarzenie.target.value as WyjatekKalendarzaPracy['rodzaj'] })}><option value="WOLNE">Dodatkowy dzień wolny</option><option value="PRACA">Wyjątkowy dzień pracujący</option>{wyjatekKalendarza.uzytkownikId && <><option value="URLOP">Urlop</option><option value="ZWOLNIENIE">Zwolnienie</option><option value="NIEOBECNOSC">Inna nieobecność</option></>}</select></label>
        <label>Powód<input value={wyjatekKalendarza.powod} onChange={(zdarzenie) => ustawWyjatekKalendarza({ ...wyjatekKalendarza, powod: zdarzenie.target.value })} /></label>
        <button type="button" onClick={dodajWyjatekKalendarza}>Dodaj wyjątek kalendarza</button>
      </div>
      {bladKalendarza && <p role="alert">{bladKalendarza}</p>}
    </fieldset>
    <p>Wyjątki zostaną utrwalone przyciskiem zapisu ustawień. Zmiana kalendarza przelicza wystąpienia bez przesuwania rutyn i bez usuwania historii wykonań.</p>
    {(['FIRMA', 'OSOBY'] as const).map((zakres) => <div key={zakres}>
      <h3>{zakres === 'FIRMA' ? 'Firmowe dni wolne i pracujące' : 'Indywidualne nieobecności i dni pracujące'}</h3>
      <ul>{wyjatkiKalendarza.filter((wpis) => zakres === 'FIRMA' ? !wpis.uzytkownikId : Boolean(wpis.uzytkownikId)).map((wpis) => {
        const osoba = aktywniUzytkownicy.find((osoba) => osoba.id === wpis.uzytkownikId)
        return <li key={wpis.id}>{wpis.od}–{wpis.do} · {wpis.uzytkownikId ? osoba ? pobierzNazweWyswietlanaUzytkownika(osoba) : 'Nieaktywny użytkownik' : 'Cała firma'} · {wpis.rodzaj === 'PRACA' ? 'Dzień pracy' : 'Wolne / nieobecność'} · {wpis.powod} <button type="button" onClick={() => zmien({ ...wartosc, wyjatkiKalendarza: wyjatkiKalendarza.filter((inny) => inny.id !== wpis.id) })}>Usuń wyjątek: {wpis.powod}</button></li>
      })}</ul>
    </div>)}
    <h2>Bloki pracy</h2>
    <p>Kolejność określa listę wyboru rutyn; pozycja na osi wynika z godzin. Wyłączenie lub usunięcie bloku zachowuje powiązania rutyn i wymaga ich ponownego przypisania.</p>
    <PolaBlokowPracy bloki={wartosc.blokiPracy} zmien={(blokiPracy) => zmien({ ...wartosc, blokiPracy })} pelnaKonfiguracja />
    <h2>Spodziewane okna odbioru kuriera</h2>
    <p>Przedział jest orientacyjny. Wyjątek dla daty ma pierwszeństwo przed tygodniem; wyłącz odbiór w dni wolne i święta, gdy znasz odwołanie.</p>
    {[1, 2, 3, 4, 5, 6, 0].map((dzien) => <fieldset key={dzien}><legend>{dniHarmonogramu[dzien]}</legend><div className="ustawienia-harmonogram__wiersz"><PolaPrzedzialu wartosc={wartosc.kurier.tydzien[dzien]} zmien={(okno) => zmien({ ...wartosc, kurier: { ...wartosc.kurier, tydzien: { ...wartosc.kurier.tydzien, [dzien]: okno } } })} /></div></fieldset>)}
    <h3>Wyjątki dla konkretnych dat</h3>
    <div className="ustawienia-harmonogram__wiersz"><label>Data wyjątku<input type="date" value={dataWyjatku} onChange={(zdarzenie) => ustawDateWyjatku(zdarzenie.target.value)} /></label><button type="button" disabled={!dataWyjatku || Object.hasOwn(wartosc.kurier.wyjatki, dataWyjatku)} onClick={() => { zmien({ ...wartosc, kurier: { ...wartosc.kurier, wyjatki: { ...wartosc.kurier.wyjatki, [dataWyjatku]: null } } }); ustawDateWyjatku('') }}>Dodaj wyjątek (brak odbioru)</button></div>
    {Object.entries(wartosc.kurier.wyjatki).sort(([pierwsza], [druga]) => pierwsza.localeCompare(druga)).map(([data, okno]) => <fieldset key={data}><legend>{data}</legend><div className="ustawienia-harmonogram__wiersz"><PolaPrzedzialu wartosc={okno} zmien={(przedzial) => zmien({ ...wartosc, kurier: { ...wartosc.kurier, wyjatki: { ...wartosc.kurier.wyjatki, [data]: przedzial } } })} /><button type="button" onClick={() => zmien({ ...wartosc, kurier: { ...wartosc.kurier, wyjatki: Object.fromEntries(Object.entries(wartosc.kurier.wyjatki).filter(([klucz]) => klucz !== data)) } })}>Usuń wyjątek {data}</button></div></fieldset>)}
    {bledy.length > 0 && <div role="alert">{bledy.map((blad) => <p key={blad}>{blad}</p>)}</div>}
  </section>
}

export function PolaBlokowPracy({ bloki, zmien, pelnaKonfiguracja = false }: {
  bloki: BlokPracy[]
  zmien: (bloki: BlokPracy[]) => void
  pelnaKonfiguracja?: boolean
}) {
  const [polacz, ustawPolacz] = useState(true)
  function przesun(indeks: number, kierunek: number) {
    const nowaKolejnosc = [...bloki]
    const cel = indeks + kierunek
    if (cel < 0 || cel >= bloki.length) return
    ;[nowaKolejnosc[indeks], nowaKolejnosc[cel]] = [nowaKolejnosc[cel], nowaKolejnosc[indeks]]
    zmien(nowaKolejnosc)
  }
  return <>
    {!pelnaKonfiguracja && <label><input type="checkbox" checked={polacz} onChange={(zdarzenie) => ustawPolacz(zdarzenie.target.checked)} /> Przesuwaj wspólne granice bloków o tych samych dniach pracy</label>}
    {bloki.map((blok, indeks) => {
      const aktualizuj = (pola: Partial<BlokPracy>) => zmien(bloki.map((wpis) => wpis.id === blok.id ? { ...wpis, ...pola } : wpis))
      return <fieldset key={blok.id}>
        <legend>{blok.nazwa || 'Nowy blok'}</legend>
        <div className="ustawienia-harmonogram__wiersz">
          <label>Nazwa<input value={blok.nazwa} onChange={(zdarzenie) => aktualizuj({ nazwa: zdarzenie.target.value })} /></label>
          <label>Od<input type="time" value={blok.poczatek} onChange={(zdarzenie) => zmien(zmienGraniceBloku(bloki, blok, 'poczatek', zdarzenie.target.value, !pelnaKonfiguracja && polacz))} /></label>
          <label>Do<input type="time" value={blok.koniec} onChange={(zdarzenie) => zmien(zmienGraniceBloku(bloki, blok, 'koniec', zdarzenie.target.value, !pelnaKonfiguracja && polacz))} /></label>
          <label>Kolor<input type="color" value={blok.kolor ?? '#64748b'} onChange={(zdarzenie) => aktualizuj({ kolor: zdarzenie.target.value })} /></label>
          {blok.kolor && <button type="button" onClick={() => aktualizuj({ kolor: undefined })}>Kolor motywu</button>}
          {pelnaKonfiguracja && <label><input type="checkbox" role="switch" checked={blok.wlaczony} onChange={(zdarzenie) => aktualizuj({ wlaczony: zdarzenie.target.checked })} /> Włączony</label>}
          <button type="button" aria-label={'Przesuń w górę: ' + blok.nazwa} disabled={indeks === 0} onClick={() => przesun(indeks, -1)}>↑</button>
          <button type="button" aria-label={'Przesuń w dół: ' + blok.nazwa} disabled={indeks === bloki.length - 1} onClick={() => przesun(indeks, 1)}>↓</button>
          {pelnaKonfiguracja && <button type="button" onClick={() => zmien(bloki.filter((wpis) => wpis.id !== blok.id))}>Usuń blok {blok.nazwa}</button>}
        </div>
        {pelnaKonfiguracja && <div className="ustawienia-harmonogram__wiersz">{[1, 2, 3, 4, 5, 6, 0].map((dzien) => <label key={dzien}><input type="checkbox" checked={blok.dni.includes(dzien)} onChange={(zdarzenie) => aktualizuj({ dni: zdarzenie.target.checked ? [...blok.dni, dzien] : blok.dni.filter((numer) => numer !== dzien) })} />{dniHarmonogramu[dzien]}</label>)}</div>}
      </fieldset>
    })}
    {pelnaKonfiguracja && <button type="button" onClick={() => zmien([...bloki, { id: crypto.randomUUID(), nazwa: 'Nowy blok', poczatek: '16:00', koniec: '17:00', dni: [1, 2, 3, 4, 5], wlaczony: false }])}>Dodaj blok pracy</button>}
  </>
}
