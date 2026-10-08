import { useState } from 'react'
import { podsekcjeZakupow, type WidokZakupow as TypWidokuZakupow } from '../../aplikacja/nawigacja/konfiguracjaZakupow'
import { czyZapotrzebowanieZakupoweJestAktywne } from '../zamkniete/pulpit/logika/zapotrzebowaniaZakupowe'
import { pobierzStanZakupow } from './uslugi/stanZakupow'
import WidokStanowMagazynowych from './magazyn/WidokStanowMagazynowych'
import './zakupy.css'

export default function WidokZakupow({ widok, ustawWidok }: {
  widok: TypWidokuZakupow
  ustawWidok: (widok: TypWidokuZakupow) => void
}) {
  const [stan] = useState(pobierzStanZakupow)
  const podsekcja = podsekcjeZakupow.find((podsekcja) => podsekcja.widok === widok)!
  const aktywneZapotrzebowania = stan.zapotrzebowania.filter((zapotrzebowanie) => czyZapotrzebowanieZakupoweJestAktywne(zapotrzebowanie.status))

  return (
    <section className="zakupy" aria-labelledby="zakupy-tytul">
      <header>
        <h1 id="zakupy-tytul">{podsekcja.etykieta}</h1>
        <p>{podsekcja.opis}</p>
      </header>
      <nav aria-label="Obszary zakupów" className="zakupy__nawigacja">
        {podsekcjeZakupow.map((pozycja) => (
          <button key={pozycja.widok} type="button" aria-current={widok === pozycja.widok ? 'page' : undefined} onClick={() => ustawWidok(pozycja.widok)}>
            {pozycja.etykieta}
          </button>
        ))}
      </nav>
      <div className="zakupy__panel">
        {widok === 'zakupy_pulpit' ? (
          <>
            <h2>Potrzeby zakupowe</h2>
            <p>Aktywne zapotrzebowania: <strong>{aktywneZapotrzebowania.length}</strong></p>
            <button type="button" onClick={() => ustawWidok('zakupy_zapotrzebowania')}>Przejdź do zapotrzebowań</button>
          </>
        ) : widok === 'zakupy_zapotrzebowania' ? (
          <>
            <h2>Zgłoszenia zespołu</h2>
            <p>Zapotrzebowania zgłoszone w Pulpicie. Na tym etapie edycja pozostaje dostępna w Pulpicie.</p>
            {stan.zapotrzebowania.length ? (
              <ul className="zakupy__zgloszenia">
                {stan.zapotrzebowania.map((zapotrzebowanie) => (
                  <li key={zapotrzebowanie.id}>
                    <strong>{zapotrzebowanie.nazwa}</strong>
                    {stan.pozycjeZapotrzebowan.filter((pozycja) => pozycja.zapotrzebowanieId === zapotrzebowanie.id).map((pozycja) => (
                      <p key={pozycja.id}>Ilość: {pozycja.ilosc}</p>
                    ))}
                    <p>{czyZapotrzebowanieZakupoweJestAktywne(zapotrzebowanie.status) ? 'Aktywne' : 'Zakończone'}</p>
                    {zapotrzebowanie.uwagi && <p>{zapotrzebowanie.uwagi}</p>}
                  </li>
                ))}
              </ul>
            ) : <p>Nie zgłoszono jeszcze zapotrzebowań.</p>}
          </>
        ) : widok === 'zakupy_magazyn' ? <WidokStanowMagazynowych dane={stan} /> : (
          <>
            <h2>Obszar w przygotowaniu</h2>
            <p>Obsługa tego obszaru będzie dostępna w kolejnym etapie rozwoju modułu ZAKUPY.</p>
          </>
        )}
      </div>
    </section>
  )
}
