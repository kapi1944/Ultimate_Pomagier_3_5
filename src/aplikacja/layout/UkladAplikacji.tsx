import { useCallback, useEffect, useState, type ReactNode } from 'react'
import WidokUstawien from '../ustawienia/WidokUstawien'
import MenuBoczne from '../menu/MenuBoczne'
import NaglowekAplikacji from './NaglowekAplikacji'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pobierzSciezkeGeneratora, pobierzWidokGeneratoraZeSciezki } from '../nawigacja/konfiguracjaGeneratorow'
import WidokKartotek, { type ZakladkaKartotek } from '../../kartoteki/WidokKartotek'
import WidokProfiluUzytkownika from '../../kartoteki/uzytkownicy/WidokProfiluUzytkownika'
import WidokKopiiRoboczychDokumentow from '../../moduly/dokumenty/WidokKopiiRoboczychDokumentow'
import WidokUzytkownikow from '../../kartoteki/uzytkownicy/WidokUzytkownikow'
import WidokWszystkichDokumentow from '../../moduly/dokumenty/WidokWszystkichDokumentow'
import WidokAnkiet from '../../moduly/dokumenty/generatory/ankiety/WidokAnkiet'
import WidokDyplomow from '../../moduly/dokumenty/generatory/dyplomy/WidokDyplomow'
import WidokKartNaDrzwi from '../../moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi'
import WidokChecklistPaczek from '../../moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek'
import WidokKopiiRoboczychChecklistPaczek from '../../moduly/dokumenty/generatory/checklisty_paczek/WidokKopiiRoboczychChecklistPaczek'
import WidokListyObecnosciZDokumentu from '../../moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu'
import { WidokProgramowSzkolen } from '../../moduly/dokumenty/generatory/programy_szkolen'
import {
  otworzKopieRoboczaProgramu,
  pobierzKopieRoboczeProgramu,
  usunKopieRoboczaProgramu,
  wyczyscAktywnaKopieProgramu,
  ustawAktywnaKopieProgramu,
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
import { migrujStarszeDokumenty } from '../../wspolne/dokumenty/migracjaStarszychDokumentow'
import './ukladAplikacji.css'

const kluczAktywnegoWidoku = 'ultimate-pomagier-aktywny-widok'


type OpcjeZmianyWidoku = {
  zachowajKopieProgramu?: boolean
  pomijajOstrzezenie?: boolean
  uzytkownikId?: string
}

type UstawWidok = (widok: WidokNawigacji, opcje?: OpcjeZmianyWidoku) => void

const dostepneWidoki: WidokNawigacji[] = [
  'profil_uzytkownika',
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
  'listy_obecnosci_kopie_robocze',
  'ankiety',
  'ankiety_kopie_robocze',
  'dyplomy',
  'dyplomy_kopie_robocze',
  'karta-na-drzwi',
  'karta_na_drzwi_kopie_robocze',
  'checklisty_paczek',
  'checklisty_paczek_kopie_robocze',
  'programy_szkolen',
  'programy_szkolen_kopie_robocze',
  'kartoteki',
  'kartoteki_trenerzy',
  'kartoteki_uzytkownicy',
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
    if (/^\/profil(?:\/[^/]+)?$/.test(window.location.pathname)) return 'profil_uzytkownika'
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

function pobierzIdProfiluZeSciezki() {
  const dopasowanie = window.location.pathname.match(/^\/profil\/([^/]+)$/)
  return dopasowanie ? decodeURIComponent(dopasowanie[1]) : null
}

function pobierzIdProgramuZeSciezki() {
  const dopasowanie = window.location.pathname.match(/^\/dokumenty\/programy-szkolen\/([^/]+)$/)
  return dopasowanie ? decodeURIComponent(dopasowanie[1]) : null
}

function pobierzIdListyObecnosciZeSciezki() {
  const dopasowanie = window.location.pathname.match(/^\/dokumenty\/listy-obecnosci\/([^/]+)$/)
  return dopasowanie ? decodeURIComponent(dopasowanie[1]) : null
}

function pobierzIdChecklistyPaczkiZeSciezki() {
  const dopasowanie = window.location.pathname.match(/^\/dokumenty\/checklisty-paczek\/([^/]+)$/)
  return dopasowanie ? decodeURIComponent(dopasowanie[1]) : null
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
  uzytkownikIdProfilu: string | null,
  wybierzProfil: (uzytkownikId: string) => void,
  ustawCzyProfilMaNiezapisaneZmiany: (czyMaNiezapisaneZmiany: boolean) => void,
): ReactNode {
  switch (widok) {
    case 'profil_uzytkownika':
      return <WidokProfiluUzytkownika key={uzytkownikIdProfilu ?? 'wlasny'} ustawCzyMaNiezapisaneZmiany={ustawCzyProfilMaNiezapisaneZmiany} uzytkownikId={uzytkownikIdProfilu} wybierzProfil={wybierzProfil} />
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
      return <WidokListyObecnosciZDokumentu dokumentIdZTrasy={pobierzIdListyObecnosciZeSciezki()} />
    case 'listy_obecnosci_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze â€” Listy obecnoĹ›ci" opis="Robocze Listy obecnoĹ›ci ze wspĂłlnego rejestru dokumentĂłw." typyStale={['LISTA_OBECNOSCI']} otworzDokument={otworzDokument} />
    case 'ankiety':
      return <WidokAnkiet />
    case 'ankiety_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze â€” Ankiety" opis="Robocze Ankiety ze wspĂłlnego rejestru dokumentĂłw." typyStale={['ANKIETA']} otworzDokument={otworzDokument} />
    case 'dyplomy':
      return <WidokDyplomow />
    case 'dyplomy_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze â€” Dyplomy" opis="Robocze certyfikaty, zaĹ›wiadczenia i dyplomy." typyStale={['CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM']} otworzDokument={otworzDokument} />
    case 'karta-na-drzwi':
      return <WidokKartNaDrzwi />
    case 'karta_na_drzwi_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze â€” Karty na drzwi" opis="Robocze Karty na drzwi ze wspĂłlnego rejestru dokumentĂłw." typyStale={['KARTA_NA_DRZWI']} otworzDokument={otworzDokument} />
    case 'checklisty_paczek':
      return <WidokChecklistPaczek dokumentIdZTrasy={pobierzIdChecklistyPaczkiZeSciezki()} />
    case 'checklisty_paczek_kopie_robocze':
      return <WidokKopiiRoboczychChecklistPaczek />
    case 'programy_szkolen':
      return <WidokProgramowSzkolen key={`${wersjaProgramu}-${pobierzIdProgramuZeSciezki() ?? 'nowy'}`} dokumentIdZTrasy={pobierzIdProgramuZeSciezki()} />
    case 'programy_szkolen_kopie_robocze':
      return (
        <WidokKopiiRoboczychGeneratora
          typGeneratora="programy_szkolen"
          tytul="Programy szkoleĹ„"
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
    case 'kartoteki_uzytkownicy':
      return <WidokUzytkownikow otworzProfil={wybierzProfil} />
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
  const { wyloguj } = useKontekstUzytkownika()
  const [aktywnyWidok, ustawAktywnyWidok] = useState<WidokNawigacji>(pobierzPoczatkowyWidok)
  const [uzytkownikIdProfilu, ustawUzytkownikIdProfilu] = useState<string | null>(pobierzIdProfiluZeSciezki)
  const [stanMenu, ustawStanMenu] = useState({ czyPrzypiete: false, czyOtwarte: false })
  const [czyProfilMaNiezapisaneZmiany, ustawCzyProfilMaNiezapisaneZmiany] = useState(false)
  const [czyWylogowanieDoPotwierdzenia, ustawCzyWylogowanieDoPotwierdzenia] = useState(false)
  const [wersjaProgramu, ustawWersjeProgramu] = useState(0)
  const [widokDoPotwierdzenia, ustawWidokDoPotwierdzenia] = useState<WidokNawigacji | null>(null)

  useEffect(() => {
    migrujStarszeDokumenty()
  }, [])

  function wykonajZmianeWidoku(widok: WidokNawigacji, opcje: OpcjeZmianyWidoku = {}) {
    if (widok === 'programy_szkolen' && !opcje.zachowajKopieProgramu) {
      wyczyscAktywnaKopieProgramu()
      ustawWersjeProgramu((obecna) => obecna + 1)
    }

    const sciezka = widok === 'profil_uzytkownika' ? opcje.uzytkownikId ? `/profil/${encodeURIComponent(opcje.uzytkownikId)}` : '/profil' : pobierzSciezkeGeneratora(widok) ?? '/'

    if (window.location.pathname !== sciezka) {
      window.history.pushState({ widok }, '', sciezka)
    }

    if (widok === 'profil_uzytkownika') ustawUzytkownikIdProfilu(opcje.uzytkownikId ?? null)
    ustawAktywnyWidok(widok)
  }

  function ustawWidok(widok: WidokNawigacji, opcje: OpcjeZmianyWidoku = {}) {
    const czyToNowyProgram = widok === 'programy_szkolen' && !opcje.zachowajKopieProgramu
    const czyZmianaWymagaPotwierdzenia = (aktywnyWidok === 'programy_szkolen' && (widok !== aktywnyWidok || czyToNowyProgram)) || (aktywnyWidok === 'profil_uzytkownika' && czyProfilMaNiezapisaneZmiany)

    if (!opcje.pomijajOstrzezenie && czyZmianaWymagaPotwierdzenia && czyProgramMaNiezapisaneZmiany()) {
      ustawWidokDoPotwierdzenia(widok)
      return
    }

    wykonajZmianeWidoku(widok, opcje)
  }

  function zapiszIWyjdz() {
    if (!widokDoPotwierdzenia && !czyWylogowanieDoPotwierdzenia) {
      return
    }

    if (czyWylogowanieDoPotwierdzenia) {
      ustawCzyWylogowanieDoPotwierdzenia(false)
      wyloguj()
      return
    }

    zapiszProgramPrzedWyjsciem()
    const docelowyWidok = widokDoPotwierdzenia
    ustawWidokDoPotwierdzenia(null)
    if (docelowyWidok) wykonajZmianeWidoku(docelowyWidok, { pomijajOstrzezenie: true })
  }

  function wyjdzBezZapisywania() {
    if (!widokDoPotwierdzenia && !czyWylogowanieDoPotwierdzenia) {
      return
    }

    if (czyWylogowanieDoPotwierdzenia) {
      ustawCzyWylogowanieDoPotwierdzenia(false)
      ustawCzyProfilMaNiezapisaneZmiany(false)
      wyloguj()
      return
    }

    const docelowyWidok = widokDoPotwierdzenia
    ustawWidokDoPotwierdzenia(null)
    if (docelowyWidok) wykonajZmianeWidoku(docelowyWidok, { pomijajOstrzezenie: true })
  }
  function zmienZakladkeKartotek(zakladka: ZakladkaKartotek) {
    ustawWidok(pobierzWidokZakladkiKartotek(zakladka))
  }

  const zglosStanMenu = useCallback((stan: { czyPrzypiete: boolean; czyOtwarte: boolean }) => { ustawStanMenu((poprzedni) => poprzedni.czyPrzypiete === stan.czyPrzypiete && poprzedni.czyOtwarte === stan.czyOtwarte ? poprzedni : stan) }, [])
  function otworzProfil(uzytkownikId?: string) { ustawWidok('profil_uzytkownika', { uzytkownikId }) }
  function obsluzWylogowanie() {
    if (czyProfilMaNiezapisaneZmiany) { ustawCzyWylogowanieDoPotwierdzenia(true); return }
    wyloguj()
  }

  function otworzDokument(dokument: Dokument<unknown, unknown>) {
    if (dokument.typ === 'PROGRAM_SZKOLENIA') {
      ustawAktywnaKopieProgramu(dokument.id)
      const sciezka = `/dokumenty/programy-szkolen/${encodeURIComponent(dokument.id)}`

      if (window.location.pathname !== sciezka) {
        window.history.pushState({ widok: 'programy_szkolen' }, '', sciezka)
      }

      ustawAktywnyWidok('programy_szkolen')
      return
    }

    const daneTekstowe = dokument.daneDokumentu && typeof dokument.daneDokumentu === 'object'
      ? (dokument.daneDokumentu as { tekst?: unknown }).tekst
      : undefined

    if (dokument.typ === 'LISTA_OBECNOSCI' && typeof daneTekstowe === 'string') {
      localStorage.setItem('ultimate-pomagier.listy-obecnosci.szkic', daneTekstowe)
      localStorage.setItem('ultimate-pomagier.listy-obecnosci.szkic.dokumentId', dokument.id)
      ustawWidok('listy-obecnosci')
      return
    }

    if (dokument.typ === 'ANKIETA' && typeof daneTekstowe === 'string') {
      localStorage.setItem('ultimate-pomagier.ankiety.szkic', daneTekstowe)
      localStorage.setItem('ultimate-pomagier.ankiety.szkic.dokumentId', dokument.id)
      ustawWidok('ankiety')
      return
    }

    if (dokument.typ === 'KARTA_NA_DRZWI' && typeof daneTekstowe === 'string') {
      localStorage.setItem('ultimate-pomagier.karta-na-drzwi.szkic', daneTekstowe)
      localStorage.setItem('ultimate-pomagier.karta-na-drzwi.szkic.dokumentId', dokument.id)
      ustawWidok('karta-na-drzwi')
      return
    }

    if (dokument.typ === 'CERTYFIKAT' || dokument.typ === 'ZASWIADCZENIE' || dokument.typ === 'DYPLOM') {
      localStorage.setItem('ultimate-pomagier.dyplomy.generator-pawla', JSON.stringify(dokument.daneDokumentu))
      localStorage.setItem('ultimate-pomagier.dyplomy.generator-pawla.dokumentId', dokument.id)
      ustawWidok('dyplomy')
      return
    }

    if (dokument.typ === 'LISTA_OBECNOSCI') {
      const sciezka = `/dokumenty/listy-obecnosci/${encodeURIComponent(dokument.id)}`
      if (window.location.pathname !== sciezka) window.history.pushState({ widok: 'listy-obecnosci' }, '', sciezka)
      ustawAktywnyWidok('listy-obecnosci')
      return
    }

    if (dokument.typ === 'CHECKLISTA_PACZKI') {
      const sciezka = `/dokumenty/checklisty-paczek/${encodeURIComponent(dokument.id)}`
      if (window.location.pathname !== sciezka) window.history.pushState({ widok: 'checklisty_paczek' }, '', sciezka)
      ustawAktywnyWidok('checklisty_paczek')
      return
    }

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
      const widokZeSciezki = /^\/profil(?:\/[^/]+)?$/.test(window.location.pathname) ? 'profil_uzytkownika' : pobierzWidokGeneratoraZeSciezki(window.location.pathname)
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

      if (poprawnyWidok === 'profil_uzytkownika') ustawUzytkownikIdProfilu(pobierzIdProfiluZeSciezki())
      ustawAktywnyWidok(poprawnyWidok)
    }

    window.addEventListener('popstate', obsluzPowrotPrzegladarki)

    return () => window.removeEventListener('popstate', obsluzPowrotPrzegladarki)
  }, [aktywnyWidok])

  return (
    <div className={`uklad-aplikacji${stanMenu.czyPrzypiete && stanMenu.czyOtwarte ? ' uklad-aplikacji--menu-przypiete' : ''}`}>
      <MenuBoczne aktywnyWidok={aktywnyWidok} poZmianieStanuMenu={zglosStanMenu} ustawAktywnyWidok={ustawWidok} />
      <div className="uklad-aplikacji__kolumna-glowna">
        <NaglowekAplikacji otworzProfil={() => otworzProfil()} wyloguj={obsluzWylogowanie} />
        <main className="uklad-aplikacji__obszar-roboczy">{renderujWidok(aktywnyWidok, zmienZakladkeKartotek, ustawWidok, wersjaProgramu, otworzDokument, uzytkownikIdProfilu, (uzytkownikId) => otworzProfil(uzytkownikId), ustawCzyProfilMaNiezapisaneZmiany)}</main>
      </div>
      {(widokDoPotwierdzenia || czyWylogowanieDoPotwierdzenia) && (
        <section className="program-panel-roboczy program-szkolen__komunikat" role="dialog" aria-modal="true" aria-label="Niezapisane zmiany">
          <strong>Masz niezapisane zmiany {czyWylogowanieDoPotwierdzenia || aktywnyWidok === 'profil_uzytkownika' ? 'profilu' : 'programu'}.</strong>
          <div className="program-szkolen__akcje">
            <button type="button" onClick={() => { ustawWidokDoPotwierdzenia(null); ustawCzyWylogowanieDoPotwierdzenia(false) }}>WrĂłÄ‡ do edycji</button>
            {!czyWylogowanieDoPotwierdzenia && <button type="button" onClick={zapiszIWyjdz}>Zapisz i kontynuuj</button>}
            <button type="button" onClick={wyjdzBezZapisywania}>OdrzuÄ‡ zmiany</button>
          </div>
        </section>
      )}
    </div>  )
}
