import { useEffect, useState, type ReactNode } from 'react'
import WidokUstawien from '../ustawienia/WidokUstawien'
import MenuBoczne from '../menu/MenuBoczne'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pobierzSciezkeGeneratora, pobierzWidokGeneratoraZeSciezki } from '../nawigacja/konfiguracjaGeneratorow'
import WidokKartotek, { type ZakladkaKartotek } from '../../kartoteki/WidokKartotek'
import WidokKopiiRoboczychDokumentow from '../../moduly/dokumenty/WidokKopiiRoboczychDokumentow'
import WidokWszystkichDokumentow from '../../moduly/dokumenty/WidokWszystkichDokumentow'
import WidokAnkiet from '../../moduly/dokumenty/generatory/ankiety/WidokAnkiet'
import WidokDyplomow from '../../moduly/dokumenty/generatory/dyplomy/WidokDyplomow'
import WidokKartNaDrzwi from '../../moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi'
import WidokListObecnosci from '../../moduly/dokumenty/generatory/listy_obecnosci/WidokListObecnosci'
import { WidokProgramowSzkolen } from '../../moduly/dokumenty/generatory/programy_szkolen'
import {
  otworzKopieRoboczaProgramu,
  pobierzKopieRoboczeProgramu,
  usunKopieRoboczaProgramu,
  wyczyscAktywnaKopieProgramu,
} from '../../moduly/dokumenty/generatory/programy_szkolen/magazynKopiiRoboczychProgramu'
import WidokKopiiRoboczychGeneratora from '../../wspolne/dokumenty/WidokKopiiRoboczychGeneratora'
import { czyProgramMaNiezapisaneZmiany, zapiszProgramPrzedWyjsciem } from '../../moduly/dokumenty/generatory/programy_szkolen/strzeznikNiezapisanychProgramow'
import WidokReplikatoraDokumentow from '../../moduly/dokumenty/replikator_dokumentow/WidokReplikatoraDokumentow'
import WidokSzkolenOtwartych from '../../moduly/otwarte/WidokSzkolenOtwartych'
import WidokPulpitu from '../../moduly/zamkniete/pulpit/WidokPulpitu'
import WidokKopiiRoboczychSzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych'
import WidokListySzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych'
import WidokNowychSzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych'
import WidokGeneratoraSzczegolow from '../../moduly/zamkniete/szkolenia/generator_szczegolow/WidokGeneratoraSzczegolow'
import WidokSzkolenZamknietych from '../../moduly/zamkniete/szkolenia/WidokSzkolenZamknietych'
import { pobierzSciezkeGeneratoraDokumentu } from '../../wspolne/dokumenty/konfiguracjaDokumentow'
import type { Dokument } from '../../wspolne/dokumenty/modelDokumentu'
import './ukladAplikacji.css'

const kluczAktywnegoWidoku = 'ultimate-pomagier-aktywny-widok'


type OpcjeZmianyWidoku = {
  zachowajKopieProgramu?: boolean
  pomijajOstrzezenie?: boolean
}

type UstawWidok = (widok: WidokNawigacji, opcje?: OpcjeZmianyWidoku) => void

const dostepneWidoki: WidokNawigacji[] = [
  'pulpit',
  'szkolenia-zamkniete',
  'generator-szczegolow',
  'zamkniete_szczegoly_organizacyjne_lista',
  'zamkniete_szczegoly_organizacyjne_kopie_robocze',
  'zamkniete_szczegoly_organizacyjne_nowe',
  'szkolenia-otwarte',
  'dokumenty',
  'dokumenty_wszystkie',
  'dokumenty_kopie_robocze',
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

function renderujWidok(
  widok: WidokNawigacji,
  zmienZakladkeKartotek: (zakladka: ZakladkaKartotek) => void,
  ustawAktywnyWidok: UstawWidok,
  wersjaProgramu: number,
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void,
): ReactNode {
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
    case 'dokumenty_wszystkie':
      return <WidokWszystkichDokumentow otworzDokument={otworzDokument} />
    case 'dokumenty_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow otworzDokument={otworzDokument} />
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
      return <WidokProgramowSzkolen key={wersjaProgramu} />
    case 'programy_szkolen_kopie_robocze':
      return (
        <WidokKopiiRoboczychGeneratora
          typGeneratora="programy_szkolen"
          tytul="Programy szkoleń"
          pobierzKopie={pobierzKopieRoboczeProgramu}
          otworzKopie={(kopia) => {
            otworzKopieRoboczaProgramu(kopia)
            ustawAktywnyWidok('programy_szkolen', { zachowajKopieProgramu: true })
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
  const [wersjaProgramu, ustawWersjeProgramu] = useState(0)
  const [widokDoPotwierdzenia, ustawWidokDoPotwierdzenia] = useState<WidokNawigacji | null>(null)

  function wykonajZmianeWidoku(widok: WidokNawigacji, opcje: OpcjeZmianyWidoku = {}) {
    if (widok === 'programy_szkolen' && !opcje.zachowajKopieProgramu) {
      wyczyscAktywnaKopieProgramu()
      ustawWersjeProgramu((obecna) => obecna + 1)
    }

    const sciezka = pobierzSciezkeGeneratora(widok) ?? '/'

    if (window.location.pathname !== sciezka) {
      window.history.pushState({ widok }, '', sciezka)
    }

    ustawAktywnyWidok(widok)
  }

  function ustawWidok(widok: WidokNawigacji, opcje: OpcjeZmianyWidoku = {}) {
    const czyToNowyProgram = widok === 'programy_szkolen' && !opcje.zachowajKopieProgramu
    const czyZmianaWymagaPotwierdzenia = aktywnyWidok === 'programy_szkolen' && (widok !== aktywnyWidok || czyToNowyProgram)

    if (!opcje.pomijajOstrzezenie && czyZmianaWymagaPotwierdzenia && czyProgramMaNiezapisaneZmiany()) {
      ustawWidokDoPotwierdzenia(widok)
      return
    }

    wykonajZmianeWidoku(widok, opcje)
  }

  function zapiszIWyjdz() {
    if (!widokDoPotwierdzenia) {
      return
    }

    zapiszProgramPrzedWyjsciem()
    const docelowyWidok = widokDoPotwierdzenia
    ustawWidokDoPotwierdzenia(null)
    wykonajZmianeWidoku(docelowyWidok, { pomijajOstrzezenie: true })
  }

  function wyjdzBezZapisywania() {
    if (!widokDoPotwierdzenia) {
      return
    }

    const docelowyWidok = widokDoPotwierdzenia
    ustawWidokDoPotwierdzenia(null)
    wykonajZmianeWidoku(docelowyWidok, { pomijajOstrzezenie: true })
  }
  function zmienZakladkeKartotek(zakladka: ZakladkaKartotek) {
    ustawWidok(pobierzWidokZakladkiKartotek(zakladka))
  }

  function otworzDokument(dokument: Dokument<unknown, unknown>) {
    const sciezka = pobierzSciezkeGeneratoraDokumentu(dokument.typ)
    const widok = sciezka ? pobierzWidokGeneratoraZeSciezki(sciezka) : null

    if (widok) {
      ustawWidok(widok)
    }
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

      if (!czyWidokNawigacji(poprawnyWidok)) {
        return
      }

      if (aktywnyWidok === 'programy_szkolen' && poprawnyWidok !== aktywnyWidok && czyProgramMaNiezapisaneZmiany()) {
        const sciezkaBiezacegoWidoku = pobierzSciezkeGeneratora(aktywnyWidok) ?? '/'
        window.history.pushState({ widok: aktywnyWidok }, '', sciezkaBiezacegoWidoku)
        ustawWidokDoPotwierdzenia(poprawnyWidok)
        return
      }

      ustawAktywnyWidok(poprawnyWidok)
    }

    window.addEventListener('popstate', obsluzPowrotPrzegladarki)

    return () => window.removeEventListener('popstate', obsluzPowrotPrzegladarki)
  }, [aktywnyWidok])

  return (
    <div className="uklad-aplikacji">
      <MenuBoczne aktywnyWidok={aktywnyWidok} ustawAktywnyWidok={ustawWidok} />
      <main className="uklad-aplikacji__obszar-roboczy">{renderujWidok(aktywnyWidok, zmienZakladkeKartotek, ustawWidok, wersjaProgramu, otworzDokument)}</main>
      {widokDoPotwierdzenia && (
        <section className="program-panel-roboczy program-szkolen__komunikat" role="dialog" aria-modal="true" aria-label="Niezapisane zmiany programu">
          <strong>Masz niezapisane zmiany programu.</strong>
          <div className="program-szkolen__akcje">
            <button type="button" onClick={() => ustawWidokDoPotwierdzenia(null)}>Wróć do edycji</button>
            <button type="button" onClick={zapiszIWyjdz}>Zapisz i wyjdź</button>
            <button type="button" onClick={wyjdzBezZapisywania}>Wyjdź bez zapisywania</button>
          </div>
        </section>
      )}
    </div>  )
}
