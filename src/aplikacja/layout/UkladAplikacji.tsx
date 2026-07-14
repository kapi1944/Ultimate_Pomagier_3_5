import { useEffect, useState, type ReactNode } from 'react'
import WidokUstawien from '../ustawienia/WidokUstawien'
import MenuBoczne from '../menu/MenuBoczne'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pobierzSciezkeGeneratora, pobierzWidokGeneratoraZeSciezki } from '../nawigacja/konfiguracjaGeneratorow'
import WidokKartotek, { type ZakladkaKartotek } from '../../kartoteki/WidokKartotek'
import WidokDokumentow from '../../moduly/dokumenty/WidokDokumentow'
import WidokAnkiet from '../../moduly/dokumenty/generatory/ankiety/WidokAnkiet'
import WidokDyplomow from '../../moduly/dokumenty/generatory/dyplomy/WidokDyplomow'
import WidokKartNaDrzwi from '../../moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi'
import WidokListObecnosci from '../../moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci'
import { WidokProgramowSzkolen } from '../../moduly/dokumenty/generatory/programy_szkolen'
import {
  otworzKopieRoboczaProgramu,
  pobierzKopieRoboczeProgramu,
  usunKopieRoboczaProgramu,
} from '../../moduly/dokumenty/generatory/programy_szkolen/magazynKopiiRoboczychProgramu'
import WidokKopiiRoboczychGeneratora from '../../wspolne/dokumenty/WidokKopiiRoboczychGeneratora'
import WidokReplikatoraDokumentow from '../../moduly/dokumenty/replikator_dokumentow/WidokReplikatoraDokumentow'
import WidokSzkolenOtwartych from '../../moduly/otwarte/WidokSzkolenOtwartych'
import WidokPulpitu from '../../moduly/zamkniete/pulpit/WidokPulpitu'
import WidokKopiiRoboczychSzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych'
import WidokListySzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych'
import WidokNowychSzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych'
import WidokGeneratoraSzczegolow from '../../moduly/zamkniete/szkolenia/generator_szczegolow/WidokGeneratoraSzczegolow'
import WidokSzkolenZamknietych from '../../moduly/zamkniete/szkolenia/WidokSzkolenZamknietych'
import './ukladAplikacji.css'

const kluczAktywnegoWidoku = 'ultimate-pomagier-aktywny-widok'

const dostepneWidoki: WidokNawigacji[] = [
  'pulpit',
  'szkolenia-zamkniete',
  'generator-szczegolow',
  'zamkniete_szczegoly_organizacyjne_lista',
  'zamkniete_szczegoly_organizacyjne_kopie_robocze',
  'zamkniete_szczegoly_organizacyjne_nowe',
  'szkolenia-otwarte',
  'dokumenty',
  'replikator_dokumentow',
  'listy-obecnosci',
  'ankiety',
  'dyplomy',
  'karta-na-drzwi',
  'programy_szkolen',
  'programy_szkolen_kopie_robocze',
  'kartoteki',
  'kartoteki_trenerzy',
  'kartoteki_klienci',
  'kartoteki_lokalizacje',
  'kartoteki_szablony_dokumentow',
  'ustawienia',
]

function czyWidokNawigacji(wartosc: string | null): wartosc is WidokNawigacji {
  return Boolean(wartosc && dostepneWidoki.includes(wartosc as WidokNawigacji))
}

function pobierzPoczatkowyWidok(): WidokNawigacji {
  try {
    const widokZeSciezki = pobierzWidokGeneratoraZeSciezki(window.location.pathname)

    if (widokZeSciezki) {
      return widokZeSciezki
    }

    const zapisanyWidok = localStorage.getItem(kluczAktywnegoWidoku)

    return czyWidokNawigacji(zapisanyWidok) ? zapisanyWidok : 'pulpit'
  } catch {
    return 'pulpit'
  }
}

function pobierzWidokZakladkiKartotek(zakladka: ZakladkaKartotek): WidokNawigacji {
  switch (zakladka) {
    case 'trenerzy':
      return 'kartoteki_trenerzy'
    case 'klienci':
      return 'kartoteki_klienci'
    case 'lokalizacje':
      return 'kartoteki_lokalizacje'
    case 'szablony_dokumentow':
      return 'kartoteki_szablony_dokumentow'
  }
}

function renderujWidok(widok: WidokNawigacji, zmienZakladkeKartotek: (zakladka: ZakladkaKartotek) => void, ustawAktywnyWidok: (widok: WidokNawigacji) => void): ReactNode {
  switch (widok) {
    case 'pulpit':
      return <WidokPulpitu />
    case 'szkolenia-zamkniete':
      return <WidokSzkolenZamknietych />
    case 'generator-szczegolow':
      return <WidokGeneratoraSzczegolow />
    case 'zamkniete_szczegoly_organizacyjne_lista':
      return <WidokListySzczegolowOrganizacyjnych otworzNoweSzczegoly={() => ustawAktywnyWidok('zamkniete_szczegoly_organizacyjne_nowe')} />
    case 'zamkniete_szczegoly_organizacyjne_kopie_robocze':
      return <WidokKopiiRoboczychSzczegolowOrganizacyjnych otworzNoweSzczegoly={() => ustawAktywnyWidok('zamkniete_szczegoly_organizacyjne_nowe')} />
    case 'zamkniete_szczegoly_organizacyjne_nowe':
      return <WidokNowychSzczegolowOrganizacyjnych />
    case 'szkolenia-otwarte':
      return <WidokSzkolenOtwartych />
    case 'dokumenty':
      return <WidokDokumentow />
    case 'replikator_dokumentow':
      return <WidokReplikatoraDokumentow />
    case 'listy-obecnosci':
      return <WidokListObecnosci />
    case 'ankiety':
      return <WidokAnkiet />
    case 'dyplomy':
      return <WidokDyplomow />
    case 'karta-na-drzwi':
      return <WidokKartNaDrzwi />
    case 'programy_szkolen':
      return <WidokProgramowSzkolen />
    case 'programy_szkolen_kopie_robocze':
      return (
        <WidokKopiiRoboczychGeneratora
          typGeneratora="programy_szkolen"
          tytul="Programy szkoleń"
          pobierzKopie={pobierzKopieRoboczeProgramu}
          otworzKopie={(kopia) => {
            otworzKopieRoboczaProgramu(kopia)
            ustawAktywnyWidok('programy_szkolen')
          }}
          usunKopie={usunKopieRoboczaProgramu}
        />
      )
    case 'kartoteki':
      return <WidokKartotek poZmianieZakladki={zmienZakladkeKartotek} />
    case 'kartoteki_trenerzy':
      return <WidokKartotek key="kartoteki_trenerzy" aktywnaZakladkaPoczatkowa="trenerzy" poZmianieZakladki={zmienZakladkeKartotek} />
    case 'kartoteki_klienci':
      return <WidokKartotek key="kartoteki_klienci" aktywnaZakladkaPoczatkowa="klienci" poZmianieZakladki={zmienZakladkeKartotek} />
    case 'kartoteki_lokalizacje':
      return <WidokKartotek key="kartoteki_lokalizacje" aktywnaZakladkaPoczatkowa="lokalizacje" poZmianieZakladki={zmienZakladkeKartotek} />
    case 'kartoteki_szablony_dokumentow':
      return <WidokKartotek key="kartoteki_szablony_dokumentow" aktywnaZakladkaPoczatkowa="szablony_dokumentow" poZmianieZakladki={zmienZakladkeKartotek} />
    case 'ustawienia':
      return <WidokUstawien />
  }
}

export default function UkladAplikacji() {
  const [aktywnyWidok, ustawAktywnyWidok] = useState<WidokNawigacji>(pobierzPoczatkowyWidok)

  function ustawWidok(widok: WidokNawigacji) {
    const sciezka = pobierzSciezkeGeneratora(widok) ?? '/'

    if (window.location.pathname !== sciezka) {
      window.history.pushState({ widok }, '', sciezka)
    }

    ustawAktywnyWidok(widok)
  }
  function zmienZakladkeKartotek(zakladka: ZakladkaKartotek) {
    ustawWidok(pobierzWidokZakladkiKartotek(zakladka))
  }

  useEffect(() => {
    try {
      localStorage.setItem(kluczAktywnegoWidoku, aktywnyWidok)
    } catch {
      return
    }
  }, [aktywnyWidok])

  useEffect(() => {
    function obsluzPowrotPrzegladarki() {
      const stanHistorii = window.history.state as { widok?: string } | null
      const widokZeSciezki = pobierzWidokGeneratoraZeSciezki(window.location.pathname)
      const widok = widokZeSciezki ?? stanHistorii?.widok
      const poprawnyWidok = widok ?? null

      if (czyWidokNawigacji(poprawnyWidok)) {
        ustawAktywnyWidok(poprawnyWidok)
      }
    }

    window.addEventListener('popstate', obsluzPowrotPrzegladarki)

    return () => window.removeEventListener('popstate', obsluzPowrotPrzegladarki)
  }, [])

  return (
    <div className="uklad-aplikacji">
      <MenuBoczne aktywnyWidok={aktywnyWidok} ustawAktywnyWidok={ustawWidok} />
      <main className="uklad-aplikacji__obszar-roboczy">{renderujWidok(aktywnyWidok, zmienZakladkeKartotek, ustawWidok)}</main>
    </div>
  )
}
