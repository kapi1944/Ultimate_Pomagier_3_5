import { useState } from 'react'
import { dniHarmonogramu, walidujHarmonogramPracy, type HarmonogramPracy, type PrzedzialGodzin } from '../../moduly/zamkniete/pulpit/logika/harmonogramPracy'

function PolaPrzedzialu({ wartosc, zmien }: { wartosc: PrzedzialGodzin | null; zmien: (wartosc: PrzedzialGodzin | null) => void }) {
  return <>
    <label><input type="checkbox" role="switch" checked={wartosc !== null} onChange={(zdarzenie) => zmien(zdarzenie.target.checked ? { poczatek: '14:30', koniec: '16:00' } : null)} /> Odbiór</label>
    {wartosc && <><label>Od<input type="time" value={wartosc.poczatek} onChange={(zdarzenie) => zmien({ ...wartosc, poczatek: zdarzenie.target.value })} /></label><label>Do<input type="time" value={wartosc.koniec} onChange={(zdarzenie) => zmien({ ...wartosc, koniec: zdarzenie.target.value })} /></label></>}
  </>
}

export default function UstawieniaHarmonogramu({ wartosc, zmien }: { wartosc: HarmonogramPracy; zmien: (wartosc: HarmonogramPracy) => void }) {
  const [dataWyjatku, ustawDateWyjatku] = useState('')
  const bledy = walidujHarmonogramPracy(wartosc)
  function przesun(indeks: number, kierunek: number) {
    const bloki = [...wartosc.blokiPracy]
    const cel = indeks + kierunek
    if (cel < 0 || cel >= bloki.length) return
    ;[bloki[indeks], bloki[cel]] = [bloki[cel], bloki[indeks]]
    zmien({ ...wartosc, blokiPracy: bloki })
  }
  return <section className="ustawienia__karta ustawienia-harmonogram">
    <h2>Bloki pracy</h2>
    <p>Kolejność określa listę wyboru rutyn; pozycja na osi wynika z godzin. Wyłączenie lub usunięcie bloku zachowuje powiązania rutyn i wymaga ich ponownego przypisania.</p>
    {wartosc.blokiPracy.map((blok, indeks) => <fieldset key={blok.id}>
      <legend>{blok.nazwa || 'Nowy blok'}</legend>
      <div className="ustawienia-harmonogram__wiersz">
        <label>Nazwa<input value={blok.nazwa} onChange={(zdarzenie) => zmien({ ...wartosc, blokiPracy: wartosc.blokiPracy.map((wpis) => wpis.id === blok.id ? { ...wpis, nazwa: zdarzenie.target.value } : wpis) })} /></label>
        <label>Od<input type="time" value={blok.poczatek} onChange={(zdarzenie) => zmien({ ...wartosc, blokiPracy: wartosc.blokiPracy.map((wpis) => wpis.id === blok.id ? { ...wpis, poczatek: zdarzenie.target.value } : wpis) })} /></label>
        <label>Do<input type="time" value={blok.koniec} onChange={(zdarzenie) => zmien({ ...wartosc, blokiPracy: wartosc.blokiPracy.map((wpis) => wpis.id === blok.id ? { ...wpis, koniec: zdarzenie.target.value } : wpis) })} /></label>
        <label><input type="checkbox" role="switch" checked={blok.wlaczony} onChange={(zdarzenie) => zmien({ ...wartosc, blokiPracy: wartosc.blokiPracy.map((wpis) => wpis.id === blok.id ? { ...wpis, wlaczony: zdarzenie.target.checked } : wpis) })} /> Włączony</label>
        <button type="button" aria-label={'Przesuń w górę: ' + blok.nazwa} disabled={indeks === 0} onClick={() => przesun(indeks, -1)}>↑</button>
        <button type="button" aria-label={'Przesuń w dół: ' + blok.nazwa} disabled={indeks === wartosc.blokiPracy.length - 1} onClick={() => przesun(indeks, 1)}>↓</button>
        <button type="button" onClick={() => zmien({ ...wartosc, blokiPracy: wartosc.blokiPracy.filter((wpis) => wpis.id !== blok.id) })}>Usuń blok {blok.nazwa}</button>
      </div>
      <div className="ustawienia-harmonogram__wiersz">{[1, 2, 3, 4, 5, 6, 0].map((dzien) => <label key={dzien}><input type="checkbox" checked={blok.dni.includes(dzien)} onChange={(zdarzenie) => zmien({ ...wartosc, blokiPracy: wartosc.blokiPracy.map((wpis) => wpis.id === blok.id ? { ...wpis, dni: zdarzenie.target.checked ? [...wpis.dni, dzien] : wpis.dni.filter((numer) => numer !== dzien) } : wpis) })} />{dniHarmonogramu[dzien]}</label>)}</div>
    </fieldset>)}
    <button type="button" onClick={() => zmien({ ...wartosc, blokiPracy: [...wartosc.blokiPracy, { id: crypto.randomUUID(), nazwa: 'Nowy blok', poczatek: '16:00', koniec: '17:00', dni: [1, 2, 3, 4, 5], wlaczony: false }] })}>Dodaj blok pracy</button>
    <h2>Spodziewane okna odbioru kuriera</h2>
    <p>Przedział jest orientacyjny. Wyjątek dla daty ma pierwszeństwo przed tygodniem; wyłącz odbiór w dni wolne i święta, gdy znasz odwołanie.</p>
    {[1, 2, 3, 4, 5, 6, 0].map((dzien) => <fieldset key={dzien}><legend>{dniHarmonogramu[dzien]}</legend><div className="ustawienia-harmonogram__wiersz"><PolaPrzedzialu wartosc={wartosc.kurier.tydzien[dzien]} zmien={(okno) => zmien({ ...wartosc, kurier: { ...wartosc.kurier, tydzien: { ...wartosc.kurier.tydzien, [dzien]: okno } } })} /></div></fieldset>)}
    <h3>Wyjątki dla konkretnych dat</h3>
    <div className="ustawienia-harmonogram__wiersz"><label>Data wyjątku<input type="date" value={dataWyjatku} onChange={(zdarzenie) => ustawDateWyjatku(zdarzenie.target.value)} /></label><button type="button" disabled={!dataWyjatku || Object.hasOwn(wartosc.kurier.wyjatki, dataWyjatku)} onClick={() => { zmien({ ...wartosc, kurier: { ...wartosc.kurier, wyjatki: { ...wartosc.kurier.wyjatki, [dataWyjatku]: null } } }); ustawDateWyjatku('') }}>Dodaj wyjątek (brak odbioru)</button></div>
    {Object.entries(wartosc.kurier.wyjatki).sort(([pierwsza], [druga]) => pierwsza.localeCompare(druga)).map(([data, okno]) => <fieldset key={data}><legend>{data}</legend><div className="ustawienia-harmonogram__wiersz"><PolaPrzedzialu wartosc={okno} zmien={(przedzial) => zmien({ ...wartosc, kurier: { ...wartosc.kurier, wyjatki: { ...wartosc.kurier.wyjatki, [data]: przedzial } } })} /><button type="button" onClick={() => zmien({ ...wartosc, kurier: { ...wartosc.kurier, wyjatki: Object.fromEntries(Object.entries(wartosc.kurier.wyjatki).filter(([klucz]) => klucz !== data)) } })}>Usuń wyjątek {data}</button></div></fieldset>)}
    {bledy.length > 0 && <div role="alert">{bledy.map((blad) => <p key={blad}>{blad}</p>)}</div>}
  </section>
}
