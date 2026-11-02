import { useEffect, useRef, useState } from 'react'
import { OknoDialogowe, Przycisk } from '../komponenty/ElementyInterfejsu'
import { analizujDaneSzkoleniaZMaila, sprawdzWartosciImportuSzkolenia } from '../parsery/importDanychSzkoleniaZMaila'
import type { PoleImportuSzkolenia, WartosciImportuSzkolenia, WynikImportuSzkolenia } from '../parsery/importDanychSzkoleniaZMaila'
import './importerDanychSzkoleniaZMaila.css'

type WlasciwosciImportera = {
  obecneWartosci: WartosciImportuSzkolenia
  obslugiwanePola: readonly PoleImportuSzkolenia[]
  zastosuj: (wartosci: WartosciImportuSzkolenia) => void
  zamknij: () => void
  opisZastosowania?: string
}

export default function ImporterDanychSzkoleniaZMaila({ obecneWartosci, obslugiwanePola, zastosuj, zamknij, opisZastosowania }: WlasciwosciImportera) {
  const [wiadomosc, ustawWiadomosc] = useState('')
  const [wynik, ustawWynik] = useState<WynikImportuSzkolenia | null>(null)
  const [wartosci, ustawWartosci] = useState<WartosciImportuSzkolenia>({})
  const [wybrane, ustawWybrane] = useState<PoleImportuSzkolenia[]>([])
  const [potwierdzone, ustawPotwierdzone] = useState<PoleImportuSzkolenia[]>([])
  const [czyNadpisac, ustawCzyNadpisac] = useState(false)
  const [blad, ustawBlad] = useState('')
  const naglowekWyniku = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (wynik) naglowekWyniku.current?.focus() }, [wynik])

  function analizuj() {
    ustawBlad('')
    try {
      const analiza = analizujDaneSzkoleniaZMaila(wiadomosc)
      ustawWynik(analiza)
      ustawWartosci(Object.fromEntries(analiza.pola.map((pole) => [pole.pole, pole.konflikt ? '' : pole.warianty[0]?.wartosc ?? ''])))
      ustawWybrane(analiza.pola.filter((pole) => obslugiwanePola.includes(pole.pole) && pole.warianty.length).map((pole) => pole.pole))
      ustawPotwierdzone([])
      ustawCzyNadpisac(false)
    } catch (przyczyna) {
      ustawBlad(przyczyna instanceof Error ? przyczyna.message : 'Nie udało się przeanalizować wiadomości. Dane formularza zachowano.')
    }
  }

  async function wklejZeSchowka() {
    try {
      const tekst = await navigator.clipboard.readText()
      ustawWiadomosc(tekst)
      ustawBlad('')
    } catch {
      ustawBlad('Brak dostępu do schowka. Wklej wiadomość do pola skrótem Ctrl+V lub poleceniem Wklej.')
    }
  }

  function zmienWartosc(pole: PoleImportuSzkolenia, wartosc: string) {
    ustawWartosci((obecne) => ({ ...obecne, [pole]: wartosc }))
    ustawPotwierdzone((obecne) => [...new Set([...obecne, pole])])
    ustawCzyNadpisac(false)
  }

  const doZastosowania: WartosciImportuSzkolenia = Object.fromEntries(wybrane.filter((pole) => wartosci[pole]?.trim()).map((pole) => [pole, wartosci[pole]?.trim()]))
  const bladWalidacji = sprawdzWartosciImportuSzkolenia(doZastosowania)
  const niepotwierdzone = wynik?.pola.some((pole) => wybrane.includes(pole.pole) && pole.status === 'niepewne' && !potwierdzone.includes(pole.pole))
  const nadpisywane = wybrane.filter((pole) => obecneWartosci[pole] && wartosci[pole] && obecneWartosci[pole] !== wartosci[pole])
  const nieobslugiwanyTryb = doZastosowania.formaSzkolenia && !['Stacjonarne', 'Online'].includes(doZastosowania.formaSzkolenia)
  const moznaZastosowac = !wynik?.blokada && !bladWalidacji && !niepotwierdzone && !nieobslugiwanyTryb && (!nadpisywane.length || czyNadpisac)

  return <OknoDialogowe otwarty zamknij={zamknij} etykietaZamkniecia="Anuluj" tytul="Import danych szkolenia z wiadomości e-mail">
    <div className="import-szkolenia">
      {blad && <p role="alert">{blad}</p>}
      {!wynik ? <>
        <label className="import-szkolenia__pole">Wklej treść wiadomości e-mail zawierającej szczegóły organizacyjne szkolenia
          <textarea rows={14} value={wiadomosc} maxLength={250000} onChange={(zdarzenie) => ustawWiadomosc(zdarzenie.target.value)} />
        </label>
        <p>Analiza odbywa się lokalnie po kliknięciu przycisku. Wiadomość nie jest wysyłana do usług zewnętrznych ani zapisywana w kopii roboczej.</p>
        <div className="import-szkolenia__akcje">
          <Przycisk onClick={() => void wklejZeSchowka()}>Wklej ze schowka</Przycisk>
          <Przycisk onClick={() => { ustawWiadomosc(''); ustawBlad('') }}>Wyczyść</Przycisk>
          <Przycisk onClick={analizuj}>Analizuj wiadomość</Przycisk>
        </div>
      </> : <>
        <h3 ref={naglowekWyniku} tabIndex={-1}>Rozpoznane dane szkolenia</h3>
        {wynik.blokada && <p role="alert">{wynik.blokada}</p>}
        {wynik.ostrzezenia.length > 0 && <ul aria-label="Ostrzeżenia analizy">{wynik.ostrzezenia.map((ostrzezenie) => <li key={ostrzezenie}>{ostrzezenie}</li>)}</ul>}
        <p>Zaznacz pola do zastosowania. Dane wywnioskowane i konflikty wymagają potwierdzenia. Pola informacyjne nie są zapisywane przez ten generator. {opisZastosowania}</p>
        <table className="import-szkolenia__tabela">
          <thead><tr><th scope="col">Parametr</th><th scope="col">Rozpoznana wartość</th></tr></thead>
          <tbody>{wynik.pola.map((pole) => {
            const czyObslugiwane = obslugiwanePola.includes(pole.pole)
            const czyPotwierdzone = potwierdzone.includes(pole.pole)
            const czyWybrane = wybrane.includes(pole.pole)
            return <tr key={pole.pole}>
              <th scope="row">{czyObslugiwane ? <label><input type="checkbox" checked={czyWybrane} onChange={(zdarzenie) => {
                ustawWybrane((obecne) => zdarzenie.target.checked ? [...obecne, pole.pole] : obecne.filter((nazwa) => nazwa !== pole.pole))
                ustawCzyNadpisac(false)
              }} /> {pole.etykieta}</label> : pole.etykieta}</th>
              <td>
                {pole.pole === 'programSzkolenia' ? <textarea aria-label={`Rozpoznane: ${pole.etykieta}`} rows={4} value={wartosci[pole.pole] ?? ''} onChange={(zdarzenie) => zmienWartosc(pole.pole, zdarzenie.target.value)} />
                  : pole.pole === 'formaSzkolenia' || pole.pole === 'rodzajGodzin' ? <select aria-label={`Rozpoznane: ${pole.etykieta}`} value={wartosci[pole.pole] ?? ''} onChange={(zdarzenie) => zmienWartosc(pole.pole, zdarzenie.target.value)}>
                    <option value="">Wybierz wartość</option>
                    {(pole.pole === 'formaSzkolenia' ? ['Stacjonarne', 'Online', 'Hybrydowe'] : ['Dydaktyczne (45 min)', 'Zegarowe (60 min)']).map((wartosc) => <option key={wartosc}>{wartosc}</option>)}
                  </select> : <input aria-label={`Rozpoznane: ${pole.etykieta}`} type={pole.pole === 'dataOd' || pole.pole === 'dataDo' ? 'date' : pole.pole === 'liczbaGodzin' || pole.pole === 'limitUczestnikow' ? 'number' : 'text'} min="0" step="any" value={wartosci[pole.pole] ?? ''} onChange={(zdarzenie) => zmienWartosc(pole.pole, zdarzenie.target.value)} />}
                <p className="import-szkolenia__status">{czyPotwierdzone ? '🟢 Potwierdzone przez użytkownika' : pole.konflikt ? '🔴 Konflikt danych' : pole.status === 'brak' ? 'Brak danych — możesz uzupełnić ręcznie' : pole.status === 'niepewne' ? '🟡 Do sprawdzenia — wartość wywnioskowana' : '🟢 Potwierdzone — jawna informacja w treści'}</p>
                {pole.konflikt && <div className="import-szkolenia__warianty">{pole.warianty.map((wariant) => <Przycisk key={wariant.wartosc} onClick={() => zmienWartosc(pole.pole, wariant.wartosc)}>{wariant.wartosc} ({wariant.zrodlo})</Przycisk>)}</div>}
                {pole.status === 'niepewne' && !czyPotwierdzone && wartosci[pole.pole] && <Przycisk onClick={() => zmienWartosc(pole.pole, wartosci[pole.pole] ?? '')}>Potwierdź: {pole.etykieta}</Przycisk>}
                {pole.warianty.length > 0 && <details><summary>Fragment wiadomości: {pole.etykieta}</summary>{pole.warianty.map((wariant, indeks) => <blockquote key={indeks}><strong>{wariant.zrodlo}</strong><pre>{wariant.fragment}</pre></blockquote>)}</details>}
                {czyObslugiwane && obecneWartosci[pole.pole] && <p className="import-szkolenia__porownanie">Obecnie: <strong>{obecneWartosci[pole.pole]}</strong><br />Po imporcie: {czyWybrane ? wartosci[pole.pole] || 'Nie wybrano wartości' : 'Pole pominięte'}</p>}
                {!czyObslugiwane && <small>Informacyjnie — generator nie obsługuje tego pola.</small>}
              </td>
            </tr>
          })}</tbody>
        </table>
        {nadpisywane.length > 0 && <label><input type="checkbox" checked={czyNadpisac} onChange={(zdarzenie) => ustawCzyNadpisac(zdarzenie.target.checked)} /> Zatwierdzam nadpisanie zaznaczonych pól po porównaniu wartości.</label>}
        {niepotwierdzone && <p role="status">Rozstrzygnij lub pomiń zaznaczone pola niepewne i konfliktowe.</p>}
        {nieobslugiwanyTryb && <p role="alert">Generator nie obsługuje trybu hybrydowego. Pomiń pole Tryb lub wybierz poprawny tryb po weryfikacji wiadomości.</p>}
        {bladWalidacji && <p role="status">{bladWalidacji}</p>}
        <div className="import-szkolenia__akcje">
          <Przycisk disabled={!moznaZastosowac} onClick={() => { if (moznaZastosowac) zastosuj(doZastosowania) }}>Zastosuj rozpoznane dane</Przycisk>
          <Przycisk onClick={() => { ustawWynik(null); ustawBlad('') }}>Wróć do wiadomości</Przycisk>
        </div>
      </>}
      <Przycisk onClick={zamknij}>Anuluj</Przycisk>
    </div>
  </OknoDialogowe>
}
