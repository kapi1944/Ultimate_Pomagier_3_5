import { useEffect, useState, type ReactNode } from 'react'
import WidokUstawien from '../ustawienia/WidokUstawien'
import MenuBoczne from '../menu/MenuBoczne'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import WidokKartotek, { type ZakladkaKartotek } from '../../kartoteki/WidokKartotek'
import WidokDokumentow from '../../moduly/dokumenty/WidokDokumentow'
import WidokAnkiet from '../../moduly/dokumenty/generatory/ankiety/WidokAnkiet'
import WidokDyplomow from '../../moduly/dokumenty/generatory/dyplomy/WidokDyplomow'
import WidokKartNaDrzwi from '../../moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi'
import WidokListObecnosci from '../../moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci'
import { WidokProgramowSzkolen } from '../../moduly/dokumenty/generatory/programy_szkolen'
import WidokReplikatoraDokumentow from '../../moduly/dokumenty/replikator_dokumentow/WidokReplikatoraDokumentow'
import WidokSzkolenOtwartych from '../../moduly/otwarte/WidokSzkolenOtwartych'
import WidokPulpitu from '../../moduly/zamkniete/pulpit/WidokPulpitu'
import WidokGeneratoraSzczegolow from '../../moduly/zamkniete/szkolenia/generator_szczegolow/WidokGeneratoraSzczegolow'
import WidokSzkolenZamknietych from '../../moduly/zamkniete/szkolenia/WidokSzkolenZamknietych'
import './ukladAplikacji.css'

const kluczAktywnegoWidoku = 'ultimate-pomagier-aktywny-widok'

const dostepneWidoki: WidokNawigacji[] = [
  'pulpit',
  'szkolenia-zamkniete',
  'generator-szczegolow',
  'zamkniete_szczegoly_organizacyjne_nowe',
  'szkolenia-otwarte',
  'dokumenty',
  'replikator_dokumentow',
  'listy-obecnosci',
  'ankiety',
  'dyplomy',
  'karta-na-drzwi',
  'programy_szkolen',
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

function renderujWidok(widok: WidokNawigacji, zmienZakladkeKartotek: (zakladka: ZakladkaKartotek) => void): ReactNode {
  switch (widok) {
    case 'pulpit':
      return <WidokPulpitu />
    case 'szkolenia-zamkniete':
      return <WidokSzkolenZamknietych />
    case 'generator-szczegolow':
      return <WidokGeneratoraSzczegolow />
    case 'zamkniete_szczegoly_organizacyjne_nowe':
      return <WidokGeneratoraSzczegolow />
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

  function zmienZakladkeKartotek(zakladka: ZakladkaKartotek) {
    ustawAktywnyWidok(pobierzWidokZakladkiKartotek(zakladka))
  }

  useEffect(() => {
    try {
      localStorage.setItem(kluczAktywnegoWidoku, aktywnyWidok)
    } catch {
      return
    }
  }, [aktywnyWidok])

  return (
    <div className="uklad-aplikacji">
      <MenuBoczne aktywnyWidok={aktywnyWidok} ustawAktywnyWidok={ustawAktywnyWidok} />
      <main className="uklad-aplikacji__obszar-roboczy">{renderujWidok(aktywnyWidok, zmienZakladkeKartotek)}</main>
    </div>
  )
}
