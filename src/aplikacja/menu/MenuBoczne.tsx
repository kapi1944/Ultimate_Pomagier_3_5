import { Fragment, useEffect, useMemo, useState } from 'react'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import {
  czyPozycjaLubPotomekJestAktywny,
  pobierzIdRozwijalnychPozycji,
  pobierzSciezkeMenuDlaWidoku,
  pozycjeMenu,
  type PozycjaMenu,
} from './pozycjeMenu'
import {
  kluczPrzypieciaMenu,
  kluczWysuwaniaZKrawedzi,
  pobierzPreferencjeDrzewaMenu,
  zapiszPreferencjeDrzewaMenu,
  zdarzenieZmianyPreferencjiMenu,
  type TrybWidokuMenu,
} from './preferencjeMenu'
import IkonaMenu from './IkonaMenu'
import { pobierzTypIkonyMenu } from './ikonyPozycjiMenu'

type WlasciwosciMenuBocznego = {
  aktywnyWidok: WidokNawigacji
  ustawAktywnyWidok: (widok: WidokNawigacji) => void
  poZmianieStanuMenu?: (stan: { czyPrzypiete: boolean; czyOtwarte: boolean }) => void
}

function pobierzPoczatkowePrzypiecieMenu() {
  try {
    return localStorage.getItem(kluczPrzypieciaMenu) === 'true'
  } catch {
    return false
  }
}

function pobierzPoczatkoweWysuwanieZKrawedzi() {
  try {
    return localStorage.getItem(kluczWysuwaniaZKrawedzi) !== 'false'
  } catch {
    return true
  }
}

function pobierzStanAktywnejSciezki(aktywnyWidok: WidokNawigacji) {
  const rozwijalne = new Set(pobierzIdRozwijalnychPozycji())
  return Object.fromEntries(
    pobierzSciezkeMenuDlaWidoku(aktywnyWidok)
      .filter((id) => rozwijalne.has(id))
      .map((id) => [id, true]),
  )
}

function pobierzIdPanelu(pozycjaId: string) {
  return `menu-podmenu-${pozycjaId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export default function MenuBoczne({
  aktywnyWidok,
  ustawAktywnyWidok,
  poZmianieStanuMenu,
}: WlasciwosciMenuBocznego) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const uzytkownikId = zalogowanyUzytkownik?.id ?? 'anonim'
  const preferencjePoczatkowe = useMemo(() => pobierzPreferencjeDrzewaMenu(uzytkownikId), [uzytkownikId])
  const [czyMenuPrzypiete, ustawCzyMenuPrzypiete] = useState(pobierzPoczatkowePrzypiecieMenu)
  const [czyMenuOtwarte, ustawCzyMenuOtwarte] = useState(czyMenuPrzypiete)
  const [czyWysuwanieZKrawedziWlaczone, ustawCzyWysuwanieZKrawedziWlaczone] = useState(
    pobierzPoczatkoweWysuwanieZKrawedzi,
  )
  const [trybWidokuMenu, ustawTrybWidokuMenu] = useState<TrybWidokuMenu>(preferencjePoczatkowe.tryb)
  const [stanPodmenu, ustawStanPodmenu] = useState<Record<string, boolean>>({
    ...preferencjePoczatkowe.rozwiniete,
    ...pobierzStanAktywnejSciezki(aktywnyWidok),
  })
  const czyAutoukrywanieWlaczone = !czyMenuPrzypiete
  const idRozwijalnychPozycji = useMemo(() => pobierzIdRozwijalnychPozycji(), [])

  useEffect(() => {
    const identyfikator = window.setTimeout(() => {
      const preferencje = pobierzPreferencjeDrzewaMenu(uzytkownikId)
      ustawTrybWidokuMenu(preferencje.tryb)
      ustawStanPodmenu({
        ...preferencje.rozwiniete,
        ...pobierzStanAktywnejSciezki(aktywnyWidok),
      })
    }, 0)

    return () => window.clearTimeout(identyfikator)
  }, [aktywnyWidok, uzytkownikId])

  useEffect(() => {
    try {
      localStorage.setItem(kluczPrzypieciaMenu, String(czyMenuPrzypiete))
    } catch {
      return
    }
  }, [czyMenuPrzypiete])

  useEffect(() => {
    try {
      localStorage.setItem(kluczWysuwaniaZKrawedzi, String(czyWysuwanieZKrawedziWlaczone))
    } catch {
      return
    }
  }, [czyWysuwanieZKrawedziWlaczone])

  useEffect(() => {
    zapiszPreferencjeDrzewaMenu(uzytkownikId, {
      tryb: trybWidokuMenu,
      rozwiniete: stanPodmenu,
    })
  }, [stanPodmenu, trybWidokuMenu, uzytkownikId])

  useEffect(() => {
    function odswiezPreferencje(zdarzenie: Event) {
      const szczegoly = (zdarzenie as CustomEvent<{ uzytkownikId?: string }>).detail
      if (szczegoly?.uzytkownikId && szczegoly.uzytkownikId !== uzytkownikId) return

      const preferencje = pobierzPreferencjeDrzewaMenu(uzytkownikId)
      ustawTrybWidokuMenu(preferencje.tryb)
      ustawStanPodmenu({
        ...preferencje.rozwiniete,
        ...pobierzStanAktywnejSciezki(aktywnyWidok),
      })
      ustawCzyMenuPrzypiete(pobierzPoczatkowePrzypiecieMenu())
      ustawCzyWysuwanieZKrawedziWlaczone(pobierzPoczatkoweWysuwanieZKrawedzi())
    }

    window.addEventListener(zdarzenieZmianyPreferencjiMenu, odswiezPreferencje)
    return () => window.removeEventListener(zdarzenieZmianyPreferencjiMenu, odswiezPreferencje)
  }, [aktywnyWidok, uzytkownikId])

  useEffect(() => {
    poZmianieStanuMenu?.({ czyPrzypiete: czyMenuPrzypiete, czyOtwarte: czyMenuOtwarte })
  }, [czyMenuOtwarte, czyMenuPrzypiete, poZmianieStanuMenu])

  function otworzMenu() {
    ustawCzyMenuOtwarte(true)
  }

  function otworzMenuZKrawedzi() {
    if (czyWysuwanieZKrawedziWlaczone) otworzMenu()
  }

  function schowajMenuJesliOdpiete() {
    if (czyAutoukrywanieWlaczone) ustawCzyMenuOtwarte(false)
  }

  function ustawTrybAutoukrywania(czyWlaczone: boolean) {
    ustawCzyMenuPrzypiete(!czyWlaczone)
    ustawCzyMenuOtwarte(!czyWlaczone)
  }

  function przelaczPrzypiecieMenu() {
    ustawTrybAutoukrywania(czyMenuPrzypiete)
  }

  function przelaczWysuwanieZKrawedzi() {
    ustawCzyWysuwanieZKrawedziWlaczone((czyWlaczone) => !czyWlaczone)
  }

  function przelaczPodmenu(pozycjaPodmenu: PozycjaMenu) {
    ustawStanPodmenu((poprzedniStan) => ({
      ...poprzedniStan,
      [pozycjaPodmenu.id]: !(poprzedniStan[pozycjaPodmenu.id] ?? false),
    }))
  }

  function zmienTrybWidokuMenu(nowyTryb: TrybWidokuMenu) {
    ustawTrybWidokuMenu(nowyTryb)
    ustawStanPodmenu(
      nowyTryb === 'pelne'
        ? Object.fromEntries(idRozwijalnychPozycji.map((id) => [id, true]))
        : pobierzStanAktywnejSciezki(aktywnyWidok),
    )
  }

  function renderujPozycje(pozycja: PozycjaMenu, poziom = 0) {
    const czyAktywna = pozycja.widok === aktywnyWidok
    const czyAktywnaJakoRodzic = !czyAktywna && czyPozycjaLubPotomekJestAktywny(pozycja, aktywnyWidok)
    const czyRozwijalna = Boolean(pozycja.czyPrzelaczaPodmenu && pozycja.dzieci?.length)
    const czyRozwinieta = czyRozwijalna ? Boolean(stanPodmenu[pozycja.id]) : true
    const idPanelu = czyRozwijalna ? pobierzIdPanelu(pozycja.id) : undefined
    const klasyPrzycisku = [
      'menu-boczne__przycisk',
      `menu-boczne__przycisk--poziom-${Math.min(poziom, 2)}`,
      czyRozwijalna ? 'menu-boczne__przycisk--grupa' : '',
      czyAktywna ? 'menu-boczne__przycisk--aktywny' : '',
      czyAktywnaJakoRodzic ? 'menu-boczne__przycisk--rodzic-aktywny' : '',
    ].filter(Boolean).join(' ')

    return (
      <Fragment key={pozycja.id}>
        {pozycja.czySeparatorPrzed && <li aria-hidden="true" className="menu-boczne__separator" role="separator" />}
        <li className="menu-boczne__element" data-poziom={poziom}>
          <button
            aria-controls={idPanelu}
            aria-expanded={czyRozwijalna ? czyRozwinieta : undefined}
            className={klasyPrzycisku}
            onClick={() => {
              if (czyRozwijalna) {
                przelaczPodmenu(pozycja)
                return
              }

              if (pozycja.widok) ustawAktywnyWidok(pozycja.widok)
            }}
            style={{ paddingLeft: `${14 + poziom * 18}px` }}
            type="button"
          >
            <IkonaMenu typ={pobierzTypIkonyMenu(pozycja.widok ?? pozycja.id)} />
            <span className="menu-boczne__etykieta">{pozycja.etykieta}</span>
            {czyRozwijalna && (
              <span
                aria-hidden="true"
                className={`menu-boczne__strzalka${czyRozwinieta ? ' menu-boczne__strzalka--rozwinieta' : ''}`}
              >
                ▾
              </span>
            )}
          </button>

          {pozycja.dzieci && czyRozwinieta && (
            <ul className="menu-boczne__lista menu-boczne__lista--dzieci" id={idPanelu}>
              {pozycja.dzieci.map((dziecko) => renderujPozycje(dziecko, poziom + 1))}
            </ul>
          )}
        </li>
      </Fragment>
    )
  }

  return (
    <>
      <button
        aria-label="Otwórz menu"
        className={`menu-boczne__hamburger${czyMenuOtwarte ? ' menu-boczne__hamburger--ukryty' : ''}`}
        onClick={otworzMenu}
        type="button"
      >
        ☰
      </button>
      <div aria-hidden="true" className="menu-boczne__strefa-aktywacji" onMouseEnter={otworzMenuZKrawedzi} />
      <aside
        aria-label="Menu główne"
        className={`menu-boczne${czyMenuOtwarte ? ' menu-boczne--otwarte' : ''}`}
        onMouseEnter={otworzMenu}
        onMouseLeave={schowajMenuJesliOdpiete}
      >
        <div className="menu-boczne__naglowek">
          <div className="menu-boczne__akcje">
            <button className="menu-boczne__przycisk-naglowka" onClick={przelaczWysuwanieZKrawedzi} type="button">
              ↩ {czyWysuwanieZKrawedziWlaczone ? 'Wyłącz wysuwanie' : 'Włącz wysuwanie'}
            </button>
            <button className="menu-boczne__przycisk-naglowka" onClick={przelaczPrzypiecieMenu} type="button">
              📌 {czyMenuPrzypiete ? 'Odepnij Menu' : 'Przypnij Menu'}
            </button>
          </div>
          <div className="menu-boczne__marka">
            <img alt="Ultimate Pomagier" className="menu-boczne__logo" src="/logo-ultimate-pomagier.png" />
            <strong>Ultimate Pomagier 3.0</strong>
            <span>V3-01</span>
          </div>
          <fieldset className="menu-boczne__tryb">
            <legend>Widok menu</legend>
            <button
              aria-pressed={trybWidokuMenu === 'zwijane'}
              className={trybWidokuMenu === 'zwijane' ? 'menu-boczne__tryb-aktywny' : ''}
              onClick={() => zmienTrybWidokuMenu('zwijane')}
              type="button"
            >
              Zwijane
            </button>
            <button
              aria-pressed={trybWidokuMenu === 'pelne'}
              className={trybWidokuMenu === 'pelne' ? 'menu-boczne__tryb-aktywny' : ''}
              onClick={() => zmienTrybWidokuMenu('pelne')}
              type="button"
            >
              Pełne
            </button>
          </fieldset>
        </div>
        <nav>
          <ul className="menu-boczne__lista">{pozycjeMenu.map((pozycja) => renderujPozycje(pozycja))}</ul>
        </nav>
      </aside>
    </>
  )
}
