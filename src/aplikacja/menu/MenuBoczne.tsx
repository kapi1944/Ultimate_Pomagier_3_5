import { informacjeOWersji } from '../wersjaAplikacji'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
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
  pobierzPreferencjePowloki,
  zapiszPreferencjePowloki,
  pobierzPreferencjeDrzewaMenu,
  zapiszPreferencjeDrzewaMenu,
  zdarzenieZmianyPreferencjiMenu,
  type TrybWidokuMenu,
} from './preferencjeMenu'
import { Komunikat } from '../../wspolne/komponenty/ElementyInterfejsu'
import IkonaMenu from './IkonaMenu'
import { pobierzTypIkonyMenu } from './ikonyPozycjiMenu'

type WlasciwosciMenuBocznego = {
  czyMalyEkran: boolean
  aktywnyWidok: WidokNawigacji
  ustawAktywnyWidok: (widok: WidokNawigacji) => void
  poZmianieStanuMenu?: (stan: { czyPrzypiete: boolean; czyOtwarte: boolean }) => void
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
  czyMalyEkran,
  ustawAktywnyWidok,
  poZmianieStanuMenu,
}: WlasciwosciMenuBocznego) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const uzytkownikId = zalogowanyUzytkownik?.id ?? 'anonim'
  const preferencjePoczatkowe = useMemo(() => pobierzPreferencjeDrzewaMenu(uzytkownikId), [uzytkownikId])
  const [czyMenuPrzypiete, ustawCzyMenuPrzypiete] = useState(() => pobierzPreferencjePowloki(uzytkownikId).przypiete)
  const [czyMenuOtwarte, ustawCzyMenuOtwarte] = useState(false)
  const [czyWysuwanieZKrawedziWlaczone, ustawCzyWysuwanieZKrawedziWlaczone] = useState(
    () => pobierzPreferencjePowloki(uzytkownikId).wysuwanie,
  )
  const [trybWidokuMenu, ustawTrybWidokuMenu] = useState<TrybWidokuMenu>(preferencjePoczatkowe.tryb)
  const [stanPodmenu, ustawStanPodmenu] = useState<Record<string, boolean>>({
    ...preferencjePoczatkowe.rozwiniete,
    ...pobierzStanAktywnejSciezki(aktywnyWidok),
  })
  const czyAutoukrywanieWlaczone = !czyMenuPrzypiete || czyMalyEkran
  const czyRozwiniete = czyMenuOtwarte || (czyMenuPrzypiete && !czyMalyEkran)
  const przyciskMenu = useRef<HTMLButtonElement>(null)
  const [bladPreferencji, ustawBladPreferencji] = useState('')
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
      ustawCzyMenuPrzypiete(pobierzPreferencjePowloki(uzytkownikId).przypiete)
      ustawCzyWysuwanieZKrawedziWlaczone(pobierzPreferencjePowloki(uzytkownikId).wysuwanie)
    }

    window.addEventListener(zdarzenieZmianyPreferencjiMenu, odswiezPreferencje)
    return () => window.removeEventListener(zdarzenieZmianyPreferencjiMenu, odswiezPreferencje)
  }, [aktywnyWidok, uzytkownikId])

  useEffect(() => {
    poZmianieStanuMenu?.({ czyPrzypiete: czyMenuPrzypiete && !czyMalyEkran, czyOtwarte: czyRozwiniete })
  }, [czyRozwiniete, czyMenuPrzypiete, czyMalyEkran, poZmianieStanuMenu])

  function otworzMenu() {
    ustawCzyMenuOtwarte(true)
  }

  function otworzMenuZKrawedzi() {
    if (czyWysuwanieZKrawedziWlaczone) otworzMenu()
  }

  function schowajMenuJesliOdpiete() {
    if (czyAutoukrywanieWlaczone) ustawCzyMenuOtwarte(false)
  }

  function przelaczPrzypiecieMenu() {
    const nowaWartosc = !czyMenuPrzypiete
    if (!zapiszPreferencjePowloki(uzytkownikId, { przypiete: nowaWartosc })) {
      ustawBladPreferencji('Nie udało się zapisać przypięcia menu.')
      return
    }
    ustawBladPreferencji('')
    ustawCzyMenuPrzypiete(nowaWartosc)
    ustawCzyMenuOtwarte(nowaWartosc)
  }

  function zamknijMenu() {
    ustawCzyMenuOtwarte(false)
    przyciskMenu.current?.focus()
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
    const klasyElementu = [
      'menu-boczne__element',
      czyRozwijalna && czyRozwinieta ? 'menu-boczne__element--rozwiniety' : '',
    ].filter(Boolean).join(' ')

    return (
      <Fragment key={pozycja.id}>
        {pozycja.czySeparatorPrzed && <li aria-hidden="true" className="menu-boczne__separator" role="separator" />}
        <li className={klasyElementu} data-poziom={poziom}>
          <button
            aria-label={pozycja.etykieta}
            aria-current={czyAktywna ? 'page' : undefined}
            title={!czyRozwiniete ? pozycja.etykieta : undefined}
            aria-controls={idPanelu}
            aria-expanded={czyRozwijalna ? czyRozwinieta : undefined}
            className={klasyPrzycisku}
            onClick={() => {
              if (czyRozwijalna) {
                przelaczPodmenu(pozycja)
                if (pozycja.widok === 'narzedzia') ustawAktywnyWidok(pozycja.widok)
                if (pozycja.widok === 'szkolenia-zamkniete') {
                  ustawAktywnyWidok(pozycja.widok)
                  if (czyMalyEkran) zamknijMenu()
                }
                return
              }

              if (pozycja.widok) { ustawAktywnyWidok(pozycja.widok); if (czyMalyEkran) zamknijMenu() }
            }}
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
        ref={przyciskMenu}
        aria-label={czyRozwiniete ? 'Zwiń menu' : 'Otwórz menu'}
        aria-expanded={czyRozwiniete}
        aria-controls="menu-glowne"
        className="menu-boczne__hamburger"
        onClick={() => ustawCzyMenuOtwarte((otwarte) => !otwarte)}
        type="button"
      >
        ☰
      </button>
      {czyMalyEkran && czyMenuOtwarte && <button type="button" className="menu-boczne__przeslona" aria-label="Zamknij menu" onClick={zamknijMenu} />}
      <aside
        id="menu-glowne"
        inert={czyMalyEkran && !czyMenuOtwarte}
        aria-label="Menu główne"
        className={`menu-boczne${czyRozwiniete ? ' menu-boczne--otwarte' : ''}`}
        onFocusCapture={otworzMenu}
        onBlurCapture={(zdarzenie) => { if (!zdarzenie.currentTarget.contains(zdarzenie.relatedTarget)) schowajMenuJesliOdpiete() }}
        onKeyDown={(zdarzenie) => { if (zdarzenie.key === 'Escape') { zdarzenie.preventDefault(); zamknijMenu() } }}
        onPointerEnter={(zdarzenie) => { if (zdarzenie.pointerType === 'mouse' && !czyMalyEkran) otworzMenuZKrawedzi() }}
        onPointerLeave={(zdarzenie) => { if (zdarzenie.pointerType === 'mouse' && !zdarzenie.currentTarget.contains(document.activeElement)) schowajMenuJesliOdpiete() }}
      >
        <div className="menu-boczne__naglowek">
          <div className="menu-boczne__akcje">
            <button className="menu-boczne__przycisk-naglowka" onClick={przelaczPrzypiecieMenu} aria-pressed={czyMenuPrzypiete} type="button">
              📌 {czyMenuPrzypiete ? 'Odepnij Menu' : 'Przypnij Menu'}
            </button>
          </div>
          <div className="menu-boczne__marka">
            <img alt="Ultimate Pomagier" className="menu-boczne__logo" src="/logo-ultimate-pomagier.png" />
            <strong>{informacjeOWersji.nazwaProduktu}</strong>

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
        {bladPreferencji && <Komunikat status="error">{bladPreferencji}</Komunikat>}
        <nav aria-label="Moduły aplikacji">
          <ul className="menu-boczne__lista">{pozycjeMenu.map((pozycja) => renderujPozycje(pozycja))}</ul>
        </nav>
      </aside>
    </>
  )
}
