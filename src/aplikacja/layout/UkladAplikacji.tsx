import { czyWidokZakupow, trasyZakupow, pobierzSciezkeZakupow, pobierzWidokZakupowZeSciezki } from '../nawigacja/konfiguracjaZakupow'
import WidokZakupow from '../../moduly/zakupy/WidokZakupow'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import WidokUstawien from '../ustawienia/WidokUstawien'
import {
  pobierzUstawieniaAplikacji,
  zastosujUstawieniaAplikacji,
  zdarzenieZmianyUstawienAplikacji,
} from '../ustawienia/magazynUstawienAplikacji'
import MenuBoczne from '../menu/MenuBoczne'
import NaglowekAplikacji from './NaglowekAplikacji'
import { useKontekstUzytkownika } from '../logowanie/useKontekstUzytkownika'
import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { konfiguracjePodmenuGeneratorow, pobierzSciezkeGeneratora, pobierzWidokGeneratoraZeSciezki } from '../nawigacja/konfiguracjaGeneratorow'
import GranicaBleduGeneratora from '../../moduly/dokumenty/wspolne/GranicaBleduGeneratora'
import { pobierzSciezkeNarzedzia, pobierzWidokNarzedziaZeSciezki } from '../nawigacja/konfiguracjaNarzedzi'
import WidokNarzedzi from '../../moduly/narzedzia/WidokNarzedzi'
import WidokPoprawiaczaPrezentacji from '../../moduly/narzedzia/poprawiacz_prezentacji/WidokPoprawiaczaPrezentacji'
import WidokKartotek, { type ZakladkaKartotek } from '../../kartoteki/WidokKartotek'
import WidokProfiluUzytkownika from '../../kartoteki/uzytkownicy/WidokProfiluUzytkownika'
import WidokKopiiRoboczychDokumentow from '../../moduly/dokumenty/WidokKopiiRoboczychDokumentow'
import WidokUzytkownikow from '../../kartoteki/uzytkownicy/WidokUzytkownikow'
import WidokWszystkichDokumentow from '../../moduly/dokumenty/WidokWszystkichDokumentow'
import type { TypSzybkiegoDokumentu } from '../../moduly/dokumenty/ListaDokumentow'
import WidokAnkiet from '../../moduly/dokumenty/generatory/ankiety/WidokAnkiet'
import WidokDyplomow from '../../moduly/dokumenty/generatory/dyplomy/WidokDyplomow'
import WidokKartNaDrzwi from '../../moduly/dokumenty/generatory/karta_na_drzwi/WidokKartNaDrzwi'
import WidokChecklistPaczek from '../../moduly/dokumenty/generatory/checklisty_paczek/WidokChecklistPaczek'
import { pobierzChecklistePaczki } from '../../moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import WidokListyObecnosciZDokumentu from '../../moduly/dokumenty/generatory/listy_obecnosci/WidokListyObecnosciZDokumentu'
import { WidokProgramowSzkolen } from '../../moduly/dokumenty/generatory/programy_szkolen'
import {
  wyczyscAktywnaKopieProgramu,
  ustawAktywnaKopieProgramu,
} from '../../moduly/dokumenty/generatory/programy_szkolen/magazynKopiiRoboczychProgramu'
import { czyDokumentMaNiezapisaneZmiany, zapiszDokumentPrzedWyjsciem } from '../../moduly/dokumenty/wspolne/strzeznikNiezapisanegoDokumentu'
import WidokReplikatoraDokumentow from '../../moduly/dokumenty/replikator_dokumentow/WidokReplikatoraDokumentow'
import WidokSzkolenOtwartych from '../../moduly/otwarte/WidokSzkolenOtwartych'
import WidokPulpitu from '../../moduly/zamkniete/pulpit/WidokPulpitu'
import WidokKopiiRoboczychSzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokKopiiRoboczychSzczegolowOrganizacyjnych'
import WidokListySzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokListySzczegolowOrganizacyjnych'
import WidokNowychSzczegolowOrganizacyjnych from '../../moduly/zamkniete/szczegoly_organizacyjne/widoki/WidokNowychSzczegolowOrganizacyjnych'
import { rozpocznijNoweSzczegolyOrganizacyjne } from '../../moduly/zamkniete/szczegoly_organizacyjne/uslugi/magazynWersjiRoboczych'
import WidokGeneratoraSzczegolow from '../../moduly/zamkniete/szkolenia/generator_szczegolow/WidokGeneratoraSzczegolow'
import WidokSzkolenZamknietych from '../../moduly/zamkniete/szkolenia/WidokSzkolenZamknietych'
import { pobierzSciezkeGeneratoraDokumentu } from '../../wspolne/dokumenty/konfiguracjaDokumentow'
import type { Dokument } from '../../wspolne/dokumenty/modelDokumentu'
import './ukladAplikacji.css'
import './powlokaV4.css'
import DockAplikacji from './DockAplikacji'
import { useMalyEkran } from './useMalyEkran'
import { pobierzDostepneSkroty, pobierzPreferencjePowloki, zapiszPreferencjePowloki, zdarzenieZmianyPreferencjiMenu, type PreferencjePowloki } from '../menu/preferencjeMenu'
import { OknoDialogowe, Przycisk, Komunikat } from '../../wspolne/komponenty/ElementyInterfejsu'

const kluczAktywnegoWidoku = 'ultimate-pomagier-aktywny-widok'


type OpcjeZmianyWidoku = {
  zachowajKopieProgramu?: boolean
  pomijajOstrzezenie?: boolean
  uzytkownikId?: string
}

type UstawWidok = (widok: WidokNawigacji, opcje?: OpcjeZmianyWidoku) => void

const dostepneWidoki: WidokNawigacji[] = [
  ...trasyZakupow.map((podsekcja) => podsekcja.widok),
  'profil_uzytkownika',
  'pulpit',
  'szkolenia-zamkniete',
  'generator-szczegolow',
  'zamkniete_szczegoly_organizacyjne_lista',
  'zamkniete_szczegoly_organizacyjne_kopie_robocze',
  'zamkniete_szczegoly_organizacyjne_nowe',
  'szkolenia-otwarte',
  'dokumenty',
  'narzedzia',
  'poprawiacz_prezentacji',
  'dokumenty_wszystkie',
  'dokumenty_kopie_robocze',
  'dokumenty_kosz',
  'replikator_dokumentow',
  'listy-obecnosci',
  'listy_obecnosci_kopie_robocze',
  'listy_obecnosci_wszystkie',
  'listy_obecnosci_kosz',
  'ankiety',
  'ankiety_kopie_robocze',
  'ankiety_wszystkie',
  'ankiety_kosz',
  'dyplomy',
  'dyplomy_kopie_robocze',
  'dyplomy_wszystkie',
  'dyplomy_kosz',
  'karta-na-drzwi',
  'karta_na_drzwi_kopie_robocze',
  'karta_na_drzwi_wszystkie',
  'karta_na_drzwi_kosz',
  'checklisty_paczek',
  'checklisty_paczek_kopie_robocze',
  'checklisty_paczek_wszystkie',
  'checklisty_paczek_kosz',
  'programy_szkolen',
  'programy_szkolen_kopie_robocze',
  'programy_szkolen_kosz',
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
    const widokZeSciezki = pobierzWidokZakupowZeSciezki(window.location.pathname) ?? pobierzWidokNarzedziaZeSciezki(window.location.pathname) ?? pobierzWidokGeneratoraZeSciezki(window.location.pathname)

    if (widokZeSciezki) {
      return widokZeSciezki
    }

    return 'pulpit'
  } catch {
    return 'pulpit'
  }
}

function pobierzIdProfiluZeSciezki() {
  const dopasowanie = window.location.pathname.match(/^\/profil\/([^/]+)$/)
  return dopasowanie ? decodeURIComponent(dopasowanie[1]) : null
}

function pobierzPoczatkowaWersjeFormularzaSzczegolow() {
  if (window.location.pathname === '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe') {
    rozpocznijNoweSzczegolyOrganizacyjne()
  }
  return 0
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

function otworzGeneratorZKafelka(typ: TypSzybkiegoDokumentu, ustawWidok: UstawWidok) {
  const widokiGeneratorow: Record<TypSzybkiegoDokumentu, WidokNawigacji> = {
    program_szkolenia: 'programy_szkolen',
    lista_obecnosci: 'listy-obecnosci',
    ankieta: 'ankiety',
    dyplom: 'dyplomy',
    karta_na_drzwi: 'karta-na-drzwi',
    checklista_paczki: 'checklisty_paczek',
  }

  ustawWidok(widokiGeneratorow[typ])
}

function renderujWidok(
  widok: WidokNawigacji,
  zmienZakladkeKartotek: (zakladka: ZakladkaKartotek) => void,
  ustawAktywnyWidok: UstawWidok,
  wersjaProgramu: number,
  wersjaFormularzaSzczegolow: number,
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void,
  uzytkownikIdProfilu: string | null,
  wybierzProfil: (uzytkownikId: string) => void,
  ustawCzyProfilMaNiezapisaneZmiany: (czyMaNiezapisaneZmiany: boolean) => void,
  otworzRekordPulpitu: () => void,
  otworzDokumentyPulpitu: () => void,
  otworzPaczkePulpitu: () => void,
): ReactNode {
  if (czyWidokZakupow(widok)) return <WidokZakupow key={widok} widok={widok} ustawWidok={ustawAktywnyWidok} />
  switch (widok) {
    case 'profil_uzytkownika':
      return <WidokProfiluUzytkownika key={uzytkownikIdProfilu ?? 'wlasny'} ustawCzyMaNiezapisaneZmiany={ustawCzyProfilMaNiezapisaneZmiany} uzytkownikId={uzytkownikIdProfilu} wybierzProfil={wybierzProfil} />
    case 'pulpit':
      return <WidokPulpitu otworzDokumenty={otworzDokumentyPulpitu} otworzPaczke={(id, paczkaId) => {
        const checklista = pobierzChecklistePaczki(id)
        if (checklista) {
          otworzDokument(checklista)
          if (paczkaId) window.history.replaceState(window.history.state, '', window.location.pathname + '#paczka-' + encodeURIComponent(paczkaId))
        }
        else otworzPaczkePulpitu()
      }} otworzRekordZrodlowy={otworzRekordPulpitu} />
    case 'szkolenia-zamkniete':
      return <WidokSzkolenZamknietych ustawWidok={ustawAktywnyWidok} />
    case 'generator-szczegolow':
      return <WidokGeneratoraSzczegolow otworzDokument={otworzDokument} />
    case 'zamkniete_szczegoly_organizacyjne_lista':
      return <WidokListySzczegolowOrganizacyjnych otworzNoweSzczegoly={() => ustawAktywnyWidok('zamkniete_szczegoly_organizacyjne_nowe')} />
    case 'zamkniete_szczegoly_organizacyjne_kopie_robocze':
      return <WidokKopiiRoboczychSzczegolowOrganizacyjnych otworzNoweSzczegoly={() => ustawAktywnyWidok('zamkniete_szczegoly_organizacyjne_nowe')} />
    case 'zamkniete_szczegoly_organizacyjne_nowe':
      return <WidokNowychSzczegolowOrganizacyjnych key={wersjaFormularzaSzczegolow} otworzDokument={otworzDokument} />
    case 'szkolenia-otwarte':
      return <WidokSzkolenOtwartych />
    case 'dokumenty':
    case 'dokumenty_wszystkie':
      return <WidokWszystkichDokumentow otworzDokument={otworzDokument} otworzNowyDokument={(typ) => otworzGeneratorZKafelka(typ, ustawAktywnyWidok)} />
    case 'narzedzia':
      return <WidokNarzedzi otworzPoprawiacz={() => ustawAktywnyWidok('poprawiacz_prezentacji')} />
    case 'poprawiacz_prezentacji':
      return <WidokPoprawiaczaPrezentacji />
    case 'dokumenty_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow otworzDokument={otworzDokument} />
    case 'dokumenty_kosz':
      return <WidokWszystkichDokumentow czyKosz opis="Usunięte dokumenty można przywrócić albo trwale spalić." otworzDokument={otworzDokument} tytul="Kosz dokumentów" />
    case 'replikator_dokumentow':
      return <WidokReplikatoraDokumentow />
    case 'listy-obecnosci':
      return <WidokListyObecnosciZDokumentu dokumentIdZTrasy={pobierzIdListyObecnosciZeSciezki()} />
    case 'listy_obecnosci_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze — Listy obecności" opis="Robocze Listy obecności ze wspólnego rejestru dokumentów." typyStale={['LISTA_OBECNOSCI']} otworzDokument={otworzDokument} />
    case 'listy_obecnosci_wszystkie':
      return <WidokWszystkichDokumentow tytul="Wszystkie listy obecności" opis="Wszystkie listy obecności dostępne we wspólnym rejestrze." typyStale={['LISTA_OBECNOSCI']} otworzDokument={otworzDokument} />
    case 'listy_obecnosci_kosz':
      return <WidokWszystkichDokumentow czyKosz opis="Usunięte listy obecności." otworzDokument={otworzDokument} tytul="Kosz — Listy obecności" typyStale={['LISTA_OBECNOSCI']} />
    case 'ankiety':
      return <WidokAnkiet />
    case 'ankiety_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze — Ankiety" opis="Robocze Ankiety ze wspólnego rejestru dokumentów." typyStale={['ANKIETA']} otworzDokument={otworzDokument} />
    case 'ankiety_wszystkie':
      return <WidokWszystkichDokumentow tytul="Wszystkie ankiety" opis="Wszystkie ankiety dostępne we wspólnym rejestrze." typyStale={['ANKIETA']} otworzDokument={otworzDokument} />
    case 'ankiety_kosz':
      return <WidokWszystkichDokumentow czyKosz opis="Usunięte ankiety." otworzDokument={otworzDokument} tytul="Kosz — Ankiety" typyStale={['ANKIETA']} />
    case 'dyplomy':
      return <WidokDyplomow />
    case 'dyplomy_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze — Dyplomy" opis="Robocze certyfikaty, zaświadczenia i dyplomy." typyStale={['CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM']} otworzDokument={otworzDokument} />
    case 'dyplomy_wszystkie':
      return <WidokWszystkichDokumentow tytul="Wszystkie dyplomy" opis="Wszystkie certyfikaty, zaświadczenia i dyplomy ze wspólnego rejestru." typyStale={['CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM']} otworzDokument={otworzDokument} />
    case 'dyplomy_kosz':
      return <WidokWszystkichDokumentow czyKosz opis="Usunięte certyfikaty, zaświadczenia i dyplomy." otworzDokument={otworzDokument} tytul="Kosz — Dyplomy" typyStale={['CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM']} />
    case 'karta-na-drzwi':
      return <WidokKartNaDrzwi />
    case 'karta_na_drzwi_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze — Karty na drzwi" opis="Robocze Karty na drzwi ze wspólnego rejestru dokumentów." typyStale={['KARTA_NA_DRZWI']} otworzDokument={otworzDokument} />
    case 'karta_na_drzwi_wszystkie':
      return <WidokWszystkichDokumentow tytul="Wszystkie karty na drzwi" opis="Wszystkie karty na drzwi dostępne we wspólnym rejestrze." typyStale={['KARTA_NA_DRZWI']} otworzDokument={otworzDokument} />
    case 'karta_na_drzwi_kosz':
      return <WidokWszystkichDokumentow czyKosz opis="Usunięte karty na drzwi." otworzDokument={otworzDokument} tytul="Kosz — Karty na drzwi" typyStale={['KARTA_NA_DRZWI']} />
    case 'checklisty_paczek':
      return <WidokChecklistPaczek dokumentIdZTrasy={pobierzIdChecklistyPaczkiZeSciezki()} />
    case 'checklisty_paczek_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze — Checklisty paczek" opis="Robocze checklisty paczek ze wspólnego rejestru dokumentów." typyStale={['CHECKLISTA_PACZKI']} otworzDokument={otworzDokument} />
    case 'checklisty_paczek_wszystkie':
      return <WidokWszystkichDokumentow tytul="Wszystkie checklisty paczek" opis="Wszystkie checklisty paczek dostępne we wspólnym rejestrze." typyStale={['CHECKLISTA_PACZKI']} otworzDokument={otworzDokument} />
    case 'checklisty_paczek_kosz':
      return <WidokWszystkichDokumentow czyKosz opis="Usunięte checklisty paczek." otworzDokument={otworzDokument} tytul="Kosz — Checklisty paczek" typyStale={['CHECKLISTA_PACZKI']} />
    case 'programy_szkolen':
      return <WidokProgramowSzkolen key={`${wersjaProgramu}-${pobierzIdProgramuZeSciezki() ?? 'nowy'}`} dokumentIdZTrasy={pobierzIdProgramuZeSciezki()} />
    case 'programy_szkolen_kopie_robocze':
      return <WidokKopiiRoboczychDokumentow tytul="Kopie robocze — Programy szkoleń" opis="Robocze programy szkoleń ze wspólnego rejestru dokumentów." typyStale={['PROGRAM_SZKOLENIA']} otworzDokument={otworzDokument} />
    case 'programy_szkolen_kosz':
      return <WidokWszystkichDokumentow czyKosz opis="Usunięte programy szkoleń." otworzDokument={otworzDokument} tytul="Kosz — Programy szkoleń" typyStale={['PROGRAM_SZKOLENIA']} />
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
  const { wyloguj, zalogowanyUzytkownik } = useKontekstUzytkownika()
  const uzytkownikId = zalogowanyUzytkownik?.id ?? 'anonim'
  const czyMalyEkran = useMalyEkran()
  const powloka = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = powloka.current
    const obszar = element?.querySelector('main')
    if (!element || !obszar) return
    const obserwator = new ResizeObserver(() => {
      const geometria = obszar.getBoundingClientRect()
      const skala = Number(document.documentElement.style.getPropertyValue('--ui-skala-przegladarki')) || 1
      element.style.setProperty('--ui-wysokosc-naglowka', geometria.top / skala + 'px')
      element.style.setProperty('--ui-wysokosc-docka', Math.max(0, window.innerHeight - geometria.bottom) / skala + 'px')
      element.style.setProperty('--ui-wysokosc-obszaru', geometria.height / skala + 'px')
    })
    obserwator.observe(obszar)
    return () => obserwator.disconnect()
  }, [])
  const [preferencjePowloki, ustawPreferencjePowloki] = useState(() => pobierzPreferencjePowloki(uzytkownikId))
  const [czyEdytujeDock, ustawCzyEdytujeDock] = useState(false)
  const [bladPreferencji, ustawBladPreferencji] = useState('')
  const czyDockWidoczny = preferencjePowloki.widocznyDock ?? !czyMalyEkran
  useEffect(() => {
    function odswiezPreferencje() { ustawPreferencjePowloki(pobierzPreferencjePowloki(uzytkownikId)) }
    window.addEventListener(zdarzenieZmianyPreferencjiMenu, odswiezPreferencje)
    return () => window.removeEventListener(zdarzenieZmianyPreferencjiMenu, odswiezPreferencje)
  }, [uzytkownikId])
  function zmienPreferencjePowloki(zmiany: Partial<PreferencjePowloki>) {
    ustawBladPreferencji(zapiszPreferencjePowloki(uzytkownikId, zmiany) ? '' : 'Nie udało się zapisać preferencji. Dotychczasowe ustawienia pozostają aktywne.')
  }
  const [aktywnyWidok, ustawAktywnyWidok] = useState<WidokNawigacji>(pobierzPoczatkowyWidok)
  const [uzytkownikIdProfilu, ustawUzytkownikIdProfilu] = useState<string | null>(pobierzIdProfiluZeSciezki)
  const [stanMenu, ustawStanMenu] = useState({ czyPrzypiete: false, czyOtwarte: false })
  const [czyProfilMaNiezapisaneZmiany, ustawCzyProfilMaNiezapisaneZmiany] = useState(false)
  const [czyWylogowanieDoPotwierdzenia, ustawCzyWylogowanieDoPotwierdzenia] = useState(false)
  const [wersjaProgramu, ustawWersjeProgramu] = useState(0)
  const [wersjaFormularzaSzczegolow, ustawWersjeFormularzaSzczegolow] = useState(pobierzPoczatkowaWersjeFormularzaSzczegolow)
  const [widokDoPotwierdzenia, ustawWidokDoPotwierdzenia] = useState<WidokNawigacji | null>(null)

  useEffect(() => {
    function zastosujZapisaneUstawienia() {
      zastosujUstawieniaAplikacji(pobierzUstawieniaAplikacji())
    }

    zastosujZapisaneUstawienia()
    window.addEventListener(zdarzenieZmianyUstawienAplikacji, zastosujZapisaneUstawienia)

    return () => {
      window.removeEventListener(zdarzenieZmianyUstawienAplikacji, zastosujZapisaneUstawienia)
    }
  }, [])

  function wykonajZmianeWidoku(widok: WidokNawigacji, opcje: OpcjeZmianyWidoku = {}) {
    if (widok === 'programy_szkolen' && !opcje.zachowajKopieProgramu) {
      wyczyscAktywnaKopieProgramu()
      ustawWersjeProgramu((obecna) => obecna + 1)
    }

    if (widok === 'zamkniete_szczegoly_organizacyjne_nowe') {
      rozpocznijNoweSzczegolyOrganizacyjne()
      ustawWersjeFormularzaSzczegolow((obecna) => obecna + 1)
    }

    const sciezka = widok === 'profil_uzytkownika' ? opcje.uzytkownikId ? `/profil/${encodeURIComponent(opcje.uzytkownikId)}` : '/profil' : pobierzSciezkeZakupow(widok) ?? pobierzSciezkeNarzedzia(widok) ?? pobierzSciezkeGeneratora(widok) ?? '/'

    if (window.location.pathname !== sciezka) {
      window.history.pushState({ widok }, '', sciezka)
    }

    if (widok === 'profil_uzytkownika') ustawUzytkownikIdProfilu(opcje.uzytkownikId ?? null)
    ustawAktywnyWidok(widok)
    if (widok === 'checklisty_paczek') window.dispatchEvent(new PopStateEvent('popstate'))
  }

  function ustawWidok(widok: WidokNawigacji, opcje: OpcjeZmianyWidoku = {}) {
    const czyToNowyProgram = widok === 'programy_szkolen' && !opcje.zachowajKopieProgramu
    const czyZmianaWymagaPotwierdzenia = widok !== aktywnyWidok || czyToNowyProgram
    const czyProfilWymagaPotwierdzenia = aktywnyWidok === 'profil_uzytkownika' && czyProfilMaNiezapisaneZmiany

    if (!opcje.pomijajOstrzezenie && czyZmianaWymagaPotwierdzenia && (czyProfilWymagaPotwierdzenia || czyDokumentMaNiezapisaneZmiany())) {
      ustawWidokDoPotwierdzenia(widok)
      return
    }

    wykonajZmianeWidoku(widok, opcje)
  }

  function zapiszIWyjdz() {
    if (!widokDoPotwierdzenia && !czyWylogowanieDoPotwierdzenia) {
      return
    }

    if (!zapiszDokumentPrzedWyjsciem()) return

    if (czyWylogowanieDoPotwierdzenia) {
      ustawCzyWylogowanieDoPotwierdzenia(false)
      wyloguj()
      return
    }

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
    if (czyProfilMaNiezapisaneZmiany || czyDokumentMaNiezapisaneZmiany()) { ustawCzyWylogowanieDoPotwierdzenia(true); return }
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
      window.dispatchEvent(new PopStateEvent('popstate'))
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
      const widokZeSciezki = /^\/profil(?:\/[^/]+)?$/.test(window.location.pathname) ? 'profil_uzytkownika' : pobierzWidokZakupowZeSciezki(window.location.pathname) ?? pobierzWidokNarzedziaZeSciezki(window.location.pathname) ?? pobierzWidokGeneratoraZeSciezki(window.location.pathname)
      const widok = widokZeSciezki ?? stanHistorii?.widok
      const poprawnyWidok = widok ?? null

      if (!czyWidokNawigacji(poprawnyWidok)) {
        return
      }

      if (poprawnyWidok !== aktywnyWidok && (czyDokumentMaNiezapisaneZmiany() || czyProfilMaNiezapisaneZmiany)) {
        const sciezkaBiezacegoWidoku = pobierzSciezkeZakupow(aktywnyWidok) ?? pobierzSciezkeNarzedzia(aktywnyWidok) ?? pobierzSciezkeGeneratora(aktywnyWidok) ?? '/'
        window.history.pushState({ widok: aktywnyWidok }, '', sciezkaBiezacegoWidoku)
        ustawWidokDoPotwierdzenia(poprawnyWidok)
        return
      }

      if (poprawnyWidok === 'profil_uzytkownika') ustawUzytkownikIdProfilu(pobierzIdProfiluZeSciezki())
      ustawAktywnyWidok(poprawnyWidok)
    }

    window.addEventListener('popstate', obsluzPowrotPrzegladarki)

    return () => window.removeEventListener('popstate', obsluzPowrotPrzegladarki)
  }, [aktywnyWidok, czyProfilMaNiezapisaneZmiany])

  const nazwaGeneratora = konfiguracjePodmenuGeneratorow.find((konfiguracja) => konfiguracja.pozycje[0]?.widok === aktywnyWidok)?.etykieta
  const widok = renderujWidok(aktywnyWidok, zmienZakladkeKartotek, ustawWidok, wersjaProgramu, wersjaFormularzaSzczegolow, otworzDokument, uzytkownikIdProfilu, (uzytkownikId) => otworzProfil(uzytkownikId), ustawCzyProfilMaNiezapisaneZmiany, () => ustawWidok('zamkniete_szczegoly_organizacyjne_lista'), () => ustawWidok('dokumenty_wszystkie'), () => ustawWidok('checklisty_paczek'))
  return (
    <div ref={powloka} className={`uklad-aplikacji${stanMenu.czyPrzypiete && stanMenu.czyOtwarte ? ' uklad-aplikacji--menu-przypiete' : ''}`}>
      <a className="powloka__pomin" href="#obszar-roboczy">Przejdź do treści</a>
      <MenuBoczne key={`${uzytkownikId}-${czyMalyEkran}`} czyMalyEkran={czyMalyEkran} aktywnyWidok={aktywnyWidok} poZmianieStanuMenu={zglosStanMenu} ustawAktywnyWidok={ustawWidok} />
      <div className="uklad-aplikacji__kolumna-glowna">
        <NaglowekAplikacji aktywnyWidok={aktywnyWidok} czyMenuPrzypiete={stanMenu.czyPrzypiete} czyDockWidoczny={czyDockWidoczny} przelaczDock={() => zmienPreferencjePowloki({ widocznyDock: !czyDockWidoczny })} otworzProfil={() => otworzProfil()} wyloguj={obsluzWylogowanie} />
        {bladPreferencji && <Komunikat status="error">{bladPreferencji}</Komunikat>}
        <main id="obszar-roboczy" tabIndex={-1} className="uklad-aplikacji__obszar-roboczy">{nazwaGeneratora ? <GranicaBleduGeneratora key={`${aktywnyWidok}-${window.location.pathname}`} nazwaGeneratora={nazwaGeneratora} wrocDoDokumentow={() => ustawWidok('dokumenty_wszystkie')}>{widok}</GranicaBleduGeneratora> : widok}</main>
        {czyDockWidoczny && <DockAplikacji skroty={preferencjePowloki.skroty} aktywnyWidok={aktywnyWidok} ustawWidok={ustawWidok} edytuj={() => ustawCzyEdytujeDock(true)} ukryj={() => zmienPreferencjePowloki({ widocznyDock: false })} />}
      </div>
      <OknoDialogowe otwarty={czyEdytujeDock} zamknij={() => ustawCzyEdytujeDock(false)} tytul="Skróty docka"><p>Wybierz widoki dostępne na dolnym pasku.</p><div className="dock-aplikacji__wybor">{pobierzDostepneSkroty().map(({ widok, opis }) => <label key={widok}><input type="checkbox" checked={preferencjePowloki.skroty.includes(widok)} onChange={(zdarzenie) => zmienPreferencjePowloki({ skroty: zdarzenie.target.checked ? [...preferencjePowloki.skroty, widok] : preferencjePowloki.skroty.filter((skrot) => skrot !== widok) })} />{opis}</label>)}</div>{bladPreferencji && <Komunikat status="error">{bladPreferencji}</Komunikat>}</OknoDialogowe>
      {(widokDoPotwierdzenia || czyWylogowanieDoPotwierdzenia) && (
        <OknoDialogowe otwarty zamknij={() => { ustawWidokDoPotwierdzenia(null); ustawCzyWylogowanieDoPotwierdzenia(false) }} tytul="Niezapisane zmiany" etykietaZamkniecia="Wróć do edycji">
          <strong>Masz niezapisane zmiany {aktywnyWidok === 'profil_uzytkownika' ? 'profilu' : 'dokumentu'}.</strong>
          <div className="program-szkolen__akcje">
            {!czyWylogowanieDoPotwierdzenia && aktywnyWidok !== 'profil_uzytkownika' && <Przycisk onClick={zapiszIWyjdz}>Zapisz i kontynuuj</Przycisk>}
            <Przycisk onClick={wyjdzBezZapisywania}>Odrzuć zmiany</Przycisk>
          </div>
        </OknoDialogowe>
      )}
    </div>  )
}
