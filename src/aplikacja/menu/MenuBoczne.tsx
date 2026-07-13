import { useEffect, useState } from 'react'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pozycjeMenu, type PozycjaMenu } from './pozycjeMenu'

const kluczPrzypieciaMenu = 'ultimatePomagier.menuPrzypiete'
const kluczWysuwaniaZKrawedzi = 'ultimatePomagier.menuWysuwanieZKrawedzi'

type WlasciwosciMenuBocznego = {
  aktywnyWidok: WidokNawigacji
  ustawAktywnyWidok: (widok: WidokNawigacji) => void
}

function czyPozycjaLubPotomekJestAktywny(pozycja: PozycjaMenu, aktywnyWidok: WidokNawigacji): boolean {
  return pozycja.id === aktywnyWidok || Boolean(pozycja.dzieci?.some((dziecko) => czyPozycjaLubPotomekJestAktywny(dziecko, aktywnyWidok)))
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

export default function MenuBoczne({
  aktywnyWidok,
  ustawAktywnyWidok,
}: WlasciwosciMenuBocznego) {
  const [czyMenuPrzypiete, ustawCzyMenuPrzypiete] = useState(pobierzPoczatkowePrzypiecieMenu)
  const [czyMenuOtwarte, ustawCzyMenuOtwarte] = useState(czyMenuPrzypiete)
  const [czyWysuwanieZKrawedziWlaczone, ustawCzyWysuwanieZKrawedziWlaczone] = useState(
    pobierzPoczatkoweWysuwanieZKrawedzi,
  )
  const czyAutoukrywanieWlaczone = !czyMenuPrzypiete
  const [stanPodmenu, ustawStanPodmenu] = useState<Record<string, boolean>>({})

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

  function otworzMenu() {
    ustawCzyMenuOtwarte(true)
  }

  function otworzMenuZKrawedzi() {
    if (czyWysuwanieZKrawedziWlaczone) {
      otworzMenu()
    }
  }

  function schowajMenuJesliOdpiete() {
    if (czyAutoukrywanieWlaczone) {
      ustawCzyMenuOtwarte(false)
    }
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
      [pozycjaPodmenu.id]: !(poprzedniStan[pozycjaPodmenu.id] ?? czyPozycjaLubPotomekJestAktywny(pozycjaPodmenu, aktywnyWidok)),
    }))
  }

  function renderujPozycje(pozycja: PozycjaMenu, poziom = 0) {
    const czyAktywna = pozycja.id === aktywnyWidok
    const czyAktywnaJakoRodzic = !czyAktywna && czyPozycjaLubPotomekJestAktywny(pozycja, aktywnyWidok)
    const czyRozwinieta = !pozycja.czyPrzelaczaPodmenu || (stanPodmenu[pozycja.id] ?? czyPozycjaLubPotomekJestAktywny(pozycja, aktywnyWidok))

    return (
      <li className="menu-boczne__element" key={pozycja.id}>
        <button
          aria-expanded={pozycja.czyPrzelaczaPodmenu ? czyRozwinieta : undefined}
          className={`menu-boczne__przycisk${czyAktywna || czyAktywnaJakoRodzic ? ' menu-boczne__przycisk--aktywny' : ''}`}
          onClick={() => {
            if (pozycja.czyPrzelaczaPodmenu) {
              przelaczPodmenu(pozycja)
              return
            }

            ustawAktywnyWidok(pozycja.id)
          }}
          style={{ paddingLeft: `${16 + poziom * 18}px` }}
          type="button"
        >
          {pozycja.etykieta}
        </button>

        {pozycja.dzieci && czyRozwinieta && (
          <ul className="menu-boczne__lista menu-boczne__lista--dzieci">
            {pozycja.dzieci.map((dziecko) => renderujPozycje(dziecko, poziom + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <>
      <button
        className={`menu-boczne__hamburger${czyMenuOtwarte ? ' menu-boczne__hamburger--ukryty' : ''}`}
        onClick={otworzMenu}
        type="button"
        aria-label={'Otw\u00f3rz menu'}
      >
        {'\u2630'}
      </button>
      <div className="menu-boczne__strefa-aktywacji" onMouseEnter={otworzMenuZKrawedzi} aria-hidden="true" />
      <aside
        className={`menu-boczne${czyMenuOtwarte ? ' menu-boczne--otwarte' : ''}`}
        aria-label={'Menu g\u0142\u00f3wne'}
        onMouseEnter={otworzMenu}
        onMouseLeave={schowajMenuJesliOdpiete}
      >
        <div className="menu-boczne__naglowek">
          <div className="menu-boczne__akcje">
            <button className="menu-boczne__przycisk-naglowka" onClick={przelaczWysuwanieZKrawedzi} type="button">
              {'\u21a9 '}
              {czyWysuwanieZKrawedziWlaczone
                ? 'Wy\u0142\u0105cz wysuwanie'
                : 'W\u0142\u0105cz wysuwanie'}
            </button>
            <button className="menu-boczne__przycisk-naglowka" onClick={przelaczPrzypiecieMenu} type="button">
              {'\uD83D\uDCCC '}
              {czyMenuPrzypiete ? 'Odepnij Menu' : 'Przypnij Menu'}
            </button>
          </div>
          <div className="menu-boczne__marka">
            <strong>Ultimate Pomagier 3.0</strong>
            <span>V3-01</span>
          </div>
        </div>
        <nav>
          <ul className="menu-boczne__lista">{pozycjeMenu.map((pozycja) => renderujPozycje(pozycja))}</ul>
        </nav>
      </aside>
    </>
  )
}
