import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import { pobierzLokalizacjeZMagazynu } from '../../../../kartoteki/lokalizacje/magazynLokalizacji'
import KartaGrupySzkoleniowej from '../komponenty/KartaGrupySzkoleniowej'
import PanelWykrytychProblemow from '../komponenty/PanelWykrytychProblemow'
import PasekStickySzczegolow from '../komponenty/PasekStickySzczegolow'
import { PoleCheckbox, PoleTekstowe, PoleTekstoweWielowierszowe, PoleWyboru } from '../komponenty/PolaSzczegolow'
import PrzelacznikTakNie from '../komponenty/PrzelacznikTakNie'
import SekcjaFormularza from '../komponenty/SekcjaFormularza'
import { useGeneratorSzczegolow } from '../hooki/useGeneratorSzczegolow'
import { opiekunowieSzczegolow } from '../uzytkownicySzczegolow'
import type { DaneFirmy, DaneFormularza, OrganizatorSzkolenia, StatusLogotypow } from '../typy'
import './widokNowychSzczegolowOrganizacyjnych.css'

const sekcjeNawigacji = [
  { id: 'importuj-szczegoly', etykieta: 'Importuj' },
  { id: 'podstawowe-informacje', etykieta: 'Podstawowe' },
  { id: 'grupy-szkoleniowe', etykieta: 'Grupy' },
  { id: 'dane-klienta', etykieta: 'Klient' },
  { id: 'pakiet-podstawowy', etykieta: 'Pakiet' },
  { id: 'materialy-szkoleniowe', etykieta: 'Materiały' },
  { id: 'wymogi-materialow', etykieta: 'Wymogi' },
  { id: 'dodatkowe-wymogi', etykieta: 'Dodatkowe' },
  { id: 'wysylka-paczki', etykieta: 'Wysyłka' },
  { id: 'wyslij-aktualizacje', etykieta: 'Aktualizacja' },
  { id: 'historia-wersji', etykieta: 'Historia' },
  { id: 'eksport-import', etykieta: 'JSON' },
]

const opcjeOpiekunow = ['', ...opiekunowieSzczegolow.map((opiekun) => opiekun.id)]
const kluczPrzypieciaPaneluJakosci = 'ultimatePomagier.panelJakosciPrzypiety'
const kluczWysuwaniaPaneluJakosci = 'ultimatePomagier.panelJakosciWysuwanieZKrawedzi'
const idPaneluJakosci = 'panel-kontroli-jakosci'

const pozycjePakietu = [
  ['listaObecnosci', 'Lista obecności'],
  ['ankiety', 'Ankiety'],
  ['certyfikaty', 'Certyfikaty'],
  ['program', 'Program'],
  ['kartaInformacyjna', 'Karta informacyjna'],
] as const

const pozycjeMaterialow = [
  ['podreczniki', 'Podręczniki'],
  ['materialyDodatkowe', 'Materiały dodatkowe'],
  ['projektTesty', 'PRE-/POST-TESTY'],
] as const

const pozycjeWymogowMaterialow = [
  ['dostepnoscCyfrowa', 'Dostępność cyfrowa'],
] as const


function pobierzPoczatkowePrzypieciePaneluJakosci() {
  try {
    return localStorage.getItem(kluczPrzypieciaPaneluJakosci) === 'true'
  } catch {
    return false
  }
}

function pobierzPoczatkoweWysuwaniePaneluJakosci() {
  try {
    return localStorage.getItem(kluczWysuwaniaPaneluJakosci) !== 'false'
  } catch {
    return true
  }
}
const pozycjeDodatkowychWymogow = [
  ['dokumentacjaZdjęciowa', 'Dokumentacja zdjęciowa'],
  ['karyWHarmonogramie', 'Kary w harmonogramie'],
  ['noweSzkolenieZaOcene', 'Nowe szkolenie za oceny'],
  ['kfs', 'KFS'],
] as const

type KluczFirmy = keyof DaneFirmy

type WlasciwosciPolFirmy = {
  tytul: string
  prefix: 'nabywca' | 'odbiorca'
  dane: DaneFirmy
  disabled?: boolean
  statusyPol: ReturnType<typeof useGeneratorSzczegolow>['statusyPol']
  aktualizujPole: (klucz: KluczFirmy, wartosc: string) => void
  miejscowosciDoPodpowiedzi: string[]
  elementNaglowka?: ReactNode
}

type WlasciwosciWierszaWymogu = {
  etykieta: string
  wlaczony: boolean
  ustawWlaczony: (wartosc: boolean) => void
  wariantPrzelacznika?: 'tak-nie' | 'aktywny-nieaktywny' | 'druk-online'
  pokazWzorKlienta?: boolean
  wzorKlienta: boolean
  ustawWzorKlienta: (wartosc: boolean) => void
  szczegolyWzoruKlienta?: DaneFormularza['dokumentacja']['szczegolyWzorowKlienta'][string]
  podgladWzoruKlienta?: PodgladWzoruKlienta
  ustawPlikWzoruKlienta?: (plik?: File) => void
  ustawUwagiWzoruKlienta?: (uwagi: string) => void
}

type PodgladWzoruKlienta = {
  adres: string
  typ: string
}

function wybierzPodpowiedziMiejscowosci(miejscowosci: string[], wartosc: string) {
  const fraza = wartosc.trim().toLocaleLowerCase('pl')
  return miejscowosci.filter((miejscowosc) => !fraza || miejscowosc.toLocaleLowerCase('pl').includes(fraza)).slice(0, 50)
}

function pobierzRozniceWersji(poprzednia: unknown, aktualna: unknown) {
  const poprzedniTekst = JSON.stringify(poprzednia, null, 2)
  const aktualnyTekst = JSON.stringify(aktualna, null, 2)

  if (poprzedniTekst === aktualnyTekst) {
    return ['Brak różnic w danych formularza.']
  }

  return ['Dane formularza różnią się od poprzedniej zapisanej wersji.']
}

function PolaFirmy({ tytul, prefix, dane, disabled, statusyPol, aktualizujPole, miejscowosciDoPodpowiedzi, elementNaglowka }: WlasciwosciPolFirmy) {
  const czyNabywca = prefix === 'nabywca'
  const podpowiedziMiasta = wybierzPodpowiedziMiejscowosci(miejscowosciDoPodpowiedzi, dane.miasto)

  return (
    <section className="szczegoly-kolumna-danych">
      <div className="szczegoly-kolumna-danych__naglowek">
        <h3>{tytul}</h3>
        {elementNaglowka}
      </div>
      <PoleTekstowe
        disabled={disabled}
        etykieta={czyNabywca ? 'Nazwa nabywcy' : 'Nazwa firmy odbiorcy'}
        pole={`${prefix}.nazwa`}
        statusyPol={statusyPol}
        wartosc={dane.nazwa}
        ustawWartosc={(wartosc) => aktualizujPole('nazwa', wartosc)}
      />
      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe disabled={disabled} etykieta="Ulica" pole={`${prefix}.ulica`} statusyPol={statusyPol} wartosc={dane.ulica} ustawWartosc={(wartosc) => aktualizujPole('ulica', wartosc)} />
        <PoleTekstowe disabled={disabled} etykieta="Nr budynku" pole={`${prefix}.nrBudynku`} statusyPol={statusyPol} wartosc={dane.nrBudynku} ustawWartosc={(wartosc) => aktualizujPole('nrBudynku', wartosc)} />
        <PoleTekstowe disabled={disabled} etykieta="Nr lokalu" pole={`${prefix}.nrLokalu`} statusyPol={statusyPol} wartosc={dane.nrLokalu} ustawWartosc={(wartosc) => aktualizujPole('nrLokalu', wartosc)} />
      </div>
      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe disabled={disabled} etykieta="Kod pocztowy" pole={`${prefix}.kodPocztowy`} statusyPol={statusyPol} wartosc={dane.kodPocztowy} ustawWartosc={(wartosc) => aktualizujPole('kodPocztowy', wartosc)} />
        <PoleTekstowe
          disabled={disabled}
          etykieta="Miasto"
          listaPodpowiedziId={`miejscowosci-${prefix}`}
          podpowiedzi={podpowiedziMiasta}
          pole={`${prefix}.miasto`}
          statusyPol={statusyPol}
          wartosc={dane.miasto}
          ustawWartosc={(wartosc) => aktualizujPole('miasto', wartosc)}
        />
        <PoleTekstowe disabled={disabled} etykieta="Kraj" pole={`${prefix}.kraj`} statusyPol={statusyPol} wartosc={dane.kraj} ustawWartosc={(wartosc) => aktualizujPole('kraj', wartosc)} />
      </div>
      <div className="szczegoly-siatka szczegoly-siatka--dwa">
        <PoleTekstowe
          disabled={disabled}
          etykieta={czyNabywca ? 'Osoba kontaktowa' : 'Imię i nazwisko odbiorcy'}
          pole={czyNabywca ? `${prefix}.osobaKontaktowa` : `${prefix}.imieNazwiskoOdbiorcy`}
          statusyPol={statusyPol}
          wartosc={czyNabywca ? dane.osobaKontaktowa : dane.imieNazwiskoOdbiorcy}
          ustawWartosc={(wartosc) => aktualizujPole(czyNabywca ? 'osobaKontaktowa' : 'imieNazwiskoOdbiorcy', wartosc)}
        />
        <PoleTekstowe disabled={disabled} etykieta={czyNabywca ? 'Nr telefonu' : 'Telefon'} pole={`${prefix}.telefon`} statusyPol={statusyPol} typ="tel" wartosc={dane.telefon} ustawWartosc={(wartosc) => aktualizujPole('telefon', wartosc)} />
      </div>
      <PoleTekstowe disabled={disabled} etykieta="Email" pole={`${prefix}.email`} statusyPol={statusyPol} typ="email" wartosc={dane.email} ustawWartosc={(wartosc) => aktualizujPole('email', wartosc)} />
      {czyNabywca && (
        <PoleTekstowe
          disabled={disabled}
          etykieta="Sposób wysyłki raportu"
          pole={`${prefix}.sposobWysylkiRaportu`}
          statusyPol={statusyPol}
          wartosc={dane.sposobWysylkiRaportu}
          ustawWartosc={(wartosc) => aktualizujPole('sposobWysylkiRaportu', wartosc)}
        />
      )}
    </section>
  )
}

function WierszWymoguRozszerzony({
  etykieta,
  wlaczony,
  ustawWlaczony,
  wariantPrzelacznika,
  pokazWzorKlienta = true,
  wzorKlienta,
  ustawWzorKlienta,
  szczegolyWzoruKlienta,
  podgladWzoruKlienta,
  ustawPlikWzoruKlienta,
  ustawUwagiWzoruKlienta,
}: WlasciwosciWierszaWymogu) {
  return (
    <div className="szczegoly-wiersz-wymogu">
      <span>{etykieta}</span>
      <PrzelacznikTakNie etykieta={etykieta} wariant={wariantPrzelacznika} wlaczony={wlaczony} ustawWlaczony={ustawWlaczony} />
      {pokazWzorKlienta && (
        <label className="szczegoly-checkbox">
          <input checked={wzorKlienta} type="checkbox" onChange={(zdarzenie) => ustawWzorKlienta(zdarzenie.target.checked)} />
          <span>Wzór klienta</span>
        </label>
      )}
      {pokazWzorKlienta && wzorKlienta && szczegolyWzoruKlienta && (
        <div className="szczegoly-wzor-klienta">
          <div className="szczegoly-wzor-klienta__plik">
            <label className="szczegoly-pole">
              <span className="szczegoly-pole__naglowek">Plik wzoru klienta</span>
              <input
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                type="file"
                onChange={(zdarzenie) => ustawPlikWzoruKlienta?.(zdarzenie.target.files?.[0])}
              />
            </label>
            <span>{szczegolyWzoruKlienta.nazwaPliku || 'Nie wybrano pliku'}</span>
          </div>
          <div className="szczegoly-wzor-klienta__podglad">
            <span className="szczegoly-pole__naglowek">Podgląd:</span>
            <div className="szczegoly-wzor-klienta__strona">
              {!podgladWzoruKlienta && <span>Brak podglądu</span>}
              {podgladWzoruKlienta?.typ.startsWith('image/') && <img alt={`Podgląd pliku ${szczegolyWzoruKlienta.nazwaPliku}`} src={podgladWzoruKlienta.adres} />}
              {podgladWzoruKlienta?.typ === 'application/pdf' && <object aria-label={`Podgląd pliku ${szczegolyWzoruKlienta.nazwaPliku}`} data={`${podgladWzoruKlienta.adres}#page=1&view=FitH`} type="application/pdf" />}
              {podgladWzoruKlienta && !podgladWzoruKlienta.typ.startsWith('image/') && podgladWzoruKlienta.typ !== 'application/pdf' && <span>Podgląd niedostępny</span>}
            </div>
          </div>
          <PoleTekstoweWielowierszowe
            etykieta="Uwagi:"
            pole={`wzorKlienta.${etykieta}.uwagi`}
            statusyPol={{}}
            wartosc={szczegolyWzoruKlienta.uwagi}
            ustawWartosc={(wartosc) => ustawUwagiWzoruKlienta?.(wartosc)}
          />
        </div>
      )}
    </div>
  )
}

export default function WidokNowychSzczegolowOrganizacyjnych() {
  const generator = useGeneratorSzczegolow()
  const [podgladyWzorowKlienta, ustawPodgladyWzorowKlienta] = useState<Record<string, PodgladWzoruKlienta>>({})
  const [porownywanaWersjaId, ustawPorownywanaWersjaId] = useState<string | null>(null)
  const liczbaProblemowBlokujacych = generator.problemyWalidacji.filter((problem) => problem.czyBlokuje).length
  const statusFormularza = `${generator.daneFormularza.status} | ${generator.czyFormularzKompletny ? 'Kompletny' : `Niepełny (${liczbaProblemowBlokujacych})`}`
  const bladTytulu = generator.daneFormularza.tytulSzkolenia.trim() ? undefined : 'Pole wymagane'
  const bladKlienta = generator.daneFormularza.nazwaKlienta.trim() ? undefined : 'Pole wymagane'
  const bladOpiekuna = generator.daneFormularza.opiekunId.trim() ? undefined : 'Pole wymagane'
  const miejscowosciDoPodpowiedzi = useMemo(
    () => [...new Set(pobierzLokalizacjeZMagazynu().map((lokalizacja) => lokalizacja.nazwa))].sort((pierwsza, druga) => pierwsza.localeCompare(druga, 'pl')),
    [],
  )
  const podpowiedziMiastaPaczki = wybierzPodpowiedziMiejscowosci(miejscowosciDoPodpowiedzi, generator.daneFormularza.odbiorcaPaczki.miasto)
  const wersjeHistorii = generator.historiaSzczegolow.filter((wpis) => wpis.typ === 'wersja')
  const porownywanaWersja = wersjeHistorii.find((wpis) => wpis.id === porownywanaWersjaId)
  const poprzedniaWersja = porownywanaWersja ? wersjeHistorii[wersjeHistorii.findIndex((wpis) => wpis.id === porownywanaWersja.id) + 1] : undefined

  const [czyPanelJakosciPrzypiety, ustawCzyPanelJakosciPrzypiety] = useState(pobierzPoczatkowePrzypieciePaneluJakosci)
  const [czyPanelJakosciOtwarty, ustawCzyPanelJakosciOtwarty] = useState(czyPanelJakosciPrzypiety)
  const [czyWysuwaniePaneluJakosciWlaczone, ustawCzyWysuwaniePaneluJakosciWlaczone] = useState(pobierzPoczatkoweWysuwaniePaneluJakosci)
  const czyPanelJakosciOdpiety = !czyPanelJakosciPrzypiety

  useEffect(() => {
    try {
      localStorage.setItem(kluczPrzypieciaPaneluJakosci, String(czyPanelJakosciPrzypiety))
    } catch {
      return
    }
  }, [czyPanelJakosciPrzypiety])

  useEffect(() => {
    try {
      localStorage.setItem(kluczWysuwaniaPaneluJakosci, String(czyWysuwaniePaneluJakosciWlaczone))
    } catch {
      return
    }
  }, [czyWysuwaniePaneluJakosciWlaczone])

  function otworzPanelJakosci() {
    ustawCzyPanelJakosciOtwarty(true)
  }

  function otworzPanelJakosciZKrawedzi() {
    if (czyWysuwaniePaneluJakosciWlaczone) {
      otworzPanelJakosci()
    }
  }

  function schowajPanelJakosciJesliOdpiety() {
    if (czyPanelJakosciOdpiety) {
      ustawCzyPanelJakosciOtwarty(false)
    }
  }

  function ustawTrybAutoukrywaniaPaneluJakosci(czyWlaczone: boolean) {
    ustawCzyPanelJakosciPrzypiety(!czyWlaczone)
    ustawCzyPanelJakosciOtwarty(!czyWlaczone)
  }

  function przelaczPrzypieciePaneluJakosci() {
    ustawTrybAutoukrywaniaPaneluJakosci(czyPanelJakosciPrzypiety)
  }

  function przelaczWysuwaniePaneluJakosci() {
    ustawCzyWysuwaniePaneluJakosciWlaczone((czyWlaczone) => !czyWlaczone)
  }

  function obsluzKlawiszPaneluJakosci(zdarzenie: KeyboardEvent<HTMLElement>) {
    if (zdarzenie.key === 'Escape' && czyPanelJakosciOdpiety) {
      zdarzenie.stopPropagation()
      schowajPanelJakosciJesliOdpiety()
    }
  }

  function aktualizujNabywce(klucz: KluczFirmy, wartosc: string) {
    generator.aktualizujDane(
      (dane) => {
        const nabywca = { ...dane.nabywca, [klucz]: wartosc }
        return {
          ...dane,
          nabywca,
          odbiorca: dane.czyNabywcaJestOdbiorca ? { ...nabywca } : dane.odbiorca,
        }
      },
      `nabywca.${klucz}`,
    )
  }

  function aktualizujOdbiorce(klucz: KluczFirmy, wartosc: string) {
    generator.aktualizujDane(
      (dane) => ({
        ...dane,
        odbiorca: {
          ...dane.odbiorca,
          [klucz]: wartosc,
        },
      }),
      `odbiorca.${klucz}`,
    )
  }

  function ustawCzyNabywcaJestOdbiorca(wartosc: boolean) {
    generator.aktualizujDane(
      (dane) => ({
        ...dane,
        czyNabywcaJestOdbiorca: wartosc,
        odbiorca: wartosc ? { ...dane.nabywca } : dane.odbiorca,
      }),
      'czyNabywcaJestOdbiorca',
    )
  }

  function aktualizujDokumentacje(klucz: keyof DaneFormularza['dokumentacja'], wartosc: boolean | StatusLogotypow) {
    generator.aktualizujDane(
      (dane) => ({
        ...dane,
        dokumentacja: {
          ...dane.dokumentacja,
          [klucz]: wartosc,
        },
      }),
      `dokumentacja.${String(klucz)}`,
    )
  }

  function aktualizujWzorDokumentacji(klucz: string, wartosc: boolean) {
    generator.aktualizujDane(
      (dane) => ({
        ...dane,
        dokumentacja: {
          ...dane.dokumentacja,
          wzoryKlienta: {
            ...dane.dokumentacja.wzoryKlienta,
            [klucz]: wartosc,
          },
        },
      }),
      `dokumentacja.wzoryKlienta.${klucz}`,
    )
  }

  function aktualizujSzczegolyWzoruDokumentacji(klucz: string, pole: 'nazwaPliku' | 'uwagi', wartosc: string) {
    generator.aktualizujDane(
      (dane) => ({
        ...dane,
        dokumentacja: {
          ...dane.dokumentacja,
          szczegolyWzorowKlienta: {
            ...dane.dokumentacja.szczegolyWzorowKlienta,
            [klucz]: {
              ...dane.dokumentacja.szczegolyWzorowKlienta[klucz],
              [pole]: wartosc,
            },
          },
        },
      }),
      `dokumentacja.szczegolyWzorowKlienta.${klucz}.${pole}`,
    )
  }

  function aktualizujPlikWzoruDokumentacji(klucz: string, plik?: File) {
    aktualizujSzczegolyWzoruDokumentacji(klucz, 'nazwaPliku', plik?.name ?? '')
    ustawPodgladyWzorowKlienta((obecne) => {
      const poprzedni = obecne[klucz]

      if (poprzedni) {
        URL.revokeObjectURL(poprzedni.adres)
      }

      if (!plik) {
        const pozostale = { ...obecne }
        delete pozostale[klucz]
        return pozostale
      }

      return {
        ...obecne,
        [klucz]: {
          adres: URL.createObjectURL(plik),
          typ: plik.type,
        },
      }
    })
  }

  function aktualizujDodatkowyWymog(klucz: keyof DaneFormularza['dodatkoweWymogi'], wartosc: boolean | number | string) {
    generator.aktualizujDane(
      (dane) => ({
        ...dane,
        dodatkoweWymogi: {
          ...dane.dodatkoweWymogi,
          [klucz]: wartosc,
        },
      }),
      `dodatkoweWymogi.${String(klucz)}`,
    )
  }

  function aktualizujWzorDodatkowegoWymogu(klucz: string, wartosc: boolean) {
    generator.aktualizujDane(
      (dane) => ({
        ...dane,
        dodatkoweWymogi: {
          ...dane.dodatkoweWymogi,
          wzoryKlienta: {
            ...dane.dodatkoweWymogi.wzoryKlienta,
            [klucz]: wartosc,
          },
        },
      }),
      `dodatkoweWymogi.wzoryKlienta.${klucz}`,
    )
  }

  function obsluzPlikLogotypu(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]

    if (!plik) {
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => {
      generator.aktualizujDane(
        (dane) => ({
          ...dane,
          logotypy: {
            nazwaPliku: plik.name,
            podglad: String(czytnik.result ?? ''),
          },
        }),
        'logotypy.nazwaPliku',
      )
    }
    czytnik.readAsDataURL(plik)
  }

  function obsluzPlikDokumentu(zdarzenie: ChangeEvent<HTMLInputElement>) {
    if (zdarzenie.target.files?.[0]) {
      generator.pokazKomunikatImportuDokumentow()
      zdarzenie.target.value = ''
    }
  }

  function obsluzImportJson(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]

    if (!plik) {
      return
    }

    const czytnik = new FileReader()
    czytnik.onload = () => generator.importujJson(String(czytnik.result ?? ''))
    czytnik.readAsText(plik)
    zdarzenie.target.value = ''
  }

  function wyczyscPoPotwierdzeniu() {
    if (window.confirm('Wyczyścić formularz i aktualną kopię roboczą?')) {
      generator.wyczyscFormularz()
    }
  }

  return (
    <section
      className={`widok szczegoly-organizacyjne${czyPanelJakosciPrzypiety ? ' szczegoly-organizacyjne--panel-przypiety' : ''}${czyPanelJakosciOtwarty ? ' szczegoly-organizacyjne--panel-otwarty' : ''}`}
    >
      <div className="szczegoly-obszar-roboczy">
        <PasekStickySzczegolow
        sekcje={sekcjeNawigacji}
        status={statusFormularza}
        tytul="Nowe szczegóły organizacyjne"
        akcje={
          <>
            {generator.daneFormularza.status === 'NIEPEŁNE' && (
              <button disabled={generator.czyTylkoPodglad} type="button" onClick={generator.zapiszWersje}>
                Zapisz wersję roboczą
              </button>
            )}
            {generator.daneFormularza.status === 'PEŁNE' && (
              <button disabled={!generator.czyFormularzKompletny || generator.czyTylkoPodglad} type="button" onClick={generator.opublikujSzczegoly}>
                Opublikuj
              </button>
            )}
            {(generator.daneFormularza.status === 'OCZEKUJĄCE' || generator.daneFormularza.status === 'ZAAKCEPTOWANE') && (
              <button disabled={generator.czyTylkoPodglad} type="button" onClick={generator.zapiszWersje}>
                Utwórz aktualizację
              </button>
            )}
            {generator.daneFormularza.status === 'GOTOWE' && (
              <button disabled={generator.czyTylkoPodglad} type="button" onClick={generator.zapiszWersje}>
                Zapisz zmianę workflow
              </button>
            )}
          </>
        }
      />

      <p className="szczegoly-komunikat">{generator.komunikat}</p>
      {generator.autosaveDoDecyzji && (
        <div className="szczegoly-autosave">
          <strong>Znaleziono niezapisaną wersję roboczą</strong>
          <span>{new Date(generator.autosaveDoDecyzji.dataZapisu).toLocaleString('pl-PL')}</span>
          <button type="button" onClick={generator.przywrocAutosave}>
            Przywróć draft
          </button>
          <button type="button" onClick={generator.odrzucAutosave}>
            Odrzuć draft
          </button>
        </div>
      )}

      <div className="szczegoly-uklad-generatora">
        <div className="szczegoly-formularz">
        <SekcjaFormularza id="importuj-szczegoly" tytul="Importuj szczegóły">
          <label className="szczegoly-pole szczegoly-import-maila">
            <span className="szczegoly-pole__naglowek">Wklej treść maila ze szczegółami</span>
            <textarea value={generator.trescMaila} onChange={(zdarzenie) => generator.ustawTrescMaila(zdarzenie.target.value)} />
            <button className="szczegoly-przycisk-pelny" type="button" onClick={generator.obsluzImportMaila}>
              Zastosuj treść maila
            </button>
          </label>
          <label className="szczegoly-przycisk-pliku">
            Import Word/PDF
            <input accept=".doc,.docx,.pdf" type="file" onChange={obsluzPlikDokumentu} />
          </label>
          {generator.rozpoznaneObszary.length > 0 && (
            <div className="szczegoly-rozpoznane">
              {generator.rozpoznaneObszary.map((obszar) => (
                <span key={obszar}>{obszar}</span>
              ))}
            </div>
          )}
        </SekcjaFormularza>

        <SekcjaFormularza id="podstawowe-informacje" tytul="Podstawowe informacje">
          <PoleTekstowe
            blad={bladTytulu}
            etykieta="Tytuł szkolenia"
            pole="tytulSzkolenia"
            statusyPol={generator.statusyPol}
            wartosc={generator.daneFormularza.tytulSzkolenia}
            ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, tytulSzkolenia: wartosc }), 'tytulSzkolenia')}
          />
          <div className="szczegoly-siatka szczegoly-siatka--trzy">
            <PoleTekstowe
              blad={bladKlienta}
              etykieta="Nazwa klienta"
              pole="nazwaKlienta"
              statusyPol={generator.statusyPol}
              wartosc={generator.daneFormularza.nazwaKlienta}
              ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, nazwaKlienta: wartosc }), 'nazwaKlienta')}
            />
            <PoleWyboru
              blad={bladOpiekuna}
              etykieta="Opiekun"
              opcje={opcjeOpiekunow}
              pole="opiekunId"
              statusyPol={generator.statusyPol}
              wartosc={generator.daneFormularza.opiekunId}
              ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, opiekunId: wartosc }), 'opiekunId')}
            />
          </div>
        </SekcjaFormularza>

        <SekcjaFormularza
          id="grupy-szkoleniowe"
          opis="Każda grupa ma własny termin, miejsce, trenera i rozliczenie."
          tytul="Grupy szkoleniowe"
          akcje={
            <button type="button" onClick={generator.dodajGrupe}>
              Dodaj grupę
            </button>
          }
        >
          <div className="szczegoly-grupy">
            {generator.grupy.map((grupa, indeks) => (
              <KartaGrupySzkoleniowej
                aktualizujGrupe={generator.aktualizujGrupe}
                grupa={grupa}
                indeks={indeks}
                liczbaGrup={generator.grupy.length}
                key={grupa.id}
                statusyPol={generator.statusyPol}
                trenerzyKartoteki={generator.trenerzyKartoteki}
                duplikujGrupe={generator.duplikujGrupe}
                usunGrupe={generator.usunGrupe}
              />
            ))}
          </div>
          <button type="button" onClick={generator.odswiezTrenerowZKartoteki}>
            Odśwież trenerów z kartoteki
          </button>
        </SekcjaFormularza>

        <SekcjaFormularza id="dane-klienta" tytul="Dane klienta / Nabywca i Odbiorca">
          <PoleWyboru
            etykieta="Firma organizatora"
            opcje={['SEMPER', 'IIST', 'SD', 'klient', 'inny']}
            pole="organizator"
            statusyPol={generator.statusyPol}
            wartosc={generator.daneFormularza.organizator}
            ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, organizator: wartosc as OrganizatorSzkolenia }), 'organizator')}
          />
          <div className="szczegoly-kolumny-danych">
            <PolaFirmy
              aktualizujPole={aktualizujNabywce}
              dane={generator.daneFormularza.nabywca}
              elementNaglowka={
                <PoleCheckbox
                  etykieta="Nabywca jest odbiorcą"
                  pole="czyNabywcaJestOdbiorca"
                  statusyPol={generator.statusyPol}
                  zaznaczone={generator.daneFormularza.czyNabywcaJestOdbiorca}
                  ustawZaznaczone={ustawCzyNabywcaJestOdbiorca}
                />
              }
              miejscowosciDoPodpowiedzi={miejscowosciDoPodpowiedzi}
              prefix="nabywca"
              statusyPol={generator.statusyPol}
              tytul="Nabywca"
            />
            <PolaFirmy
              aktualizujPole={aktualizujOdbiorce}
              dane={generator.daneFormularza.odbiorca}
              disabled={generator.daneFormularza.czyNabywcaJestOdbiorca}
              miejscowosciDoPodpowiedzi={miejscowosciDoPodpowiedzi}
              prefix="odbiorca"
              statusyPol={generator.statusyPol}
              tytul="Odbiorca"
            />
          </div>
        </SekcjaFormularza>

        <div className="szczegoly-uklad-sekcji">
          <SekcjaFormularza id="pakiet-podstawowy" tytul="Pakiet podstawowy">
            <div className="szczegoly-lista-wymogow">
              {pozycjePakietu.map(([klucz, etykieta]) => (
                <WierszWymoguRozszerzony
                  etykieta={etykieta}
                  key={klucz}
                  wlaczony={Boolean(generator.daneFormularza.dokumentacja[klucz])}
                  ustawWlaczony={(wartosc) => aktualizujDokumentacje(klucz, wartosc)}
                  wariantPrzelacznika="druk-online"
                  wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta[klucz])}
                  ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji(klucz, wartosc)}
                  szczegolyWzoruKlienta={generator.daneFormularza.dokumentacja.szczegolyWzorowKlienta[klucz]}
                  podgladWzoruKlienta={podgladyWzorowKlienta[klucz]}
                  ustawPlikWzoruKlienta={(plik) => aktualizujPlikWzoruDokumentacji(klucz, plik)}
                  ustawUwagiWzoruKlienta={(uwagi) => aktualizujSzczegolyWzoruDokumentacji(klucz, 'uwagi', uwagi)}
                />
              ))}
            </div>
          </SekcjaFormularza>

          <SekcjaFormularza id="dodatkowe-wymogi" tytul="Dodatkowe wymogi">
            <div className="szczegoly-lista-wymogow">
              <div
                className={`szczegoly-wiersz-wymogu szczegoly-wiersz-wymogu--przyjazd ${
                  generator.daneFormularza.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera ? 'szczegoly-wiersz-wymogu--przyjazd-aktywny' : ''
                }`}
              >
                <span>Wcześniejszy przyjazd trenera</span>
                {generator.daneFormularza.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera && (
                  <label className="szczegoly-pole-minut">
                    <span>Ile minut:</span>
                    <input
                      aria-invalid={false}
                      min={0}
                      step={1}
                      type="number"
                      value={generator.daneFormularza.dodatkoweWymogi.minutyWczesniej}
                      onChange={(zdarzenie) => aktualizujDodatkowyWymog('minutyWczesniej', Number(zdarzenie.target.value))}
                    />
                  </label>
                )}
                <PrzelacznikTakNie
                  etykieta="Wcześniejszy przyjazd trenera"
                  wlaczony={generator.daneFormularza.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera}
                  ustawWlaczony={(wartosc) => aktualizujDodatkowyWymog('wczesniejszyPrzyjazdTrenera', wartosc)}
                />
              </div>
              {pozycjeDodatkowychWymogow.map(([klucz, etykieta]) => (
                <WierszWymoguRozszerzony
                  etykieta={etykieta}
                  key={klucz}
                  wlaczony={Boolean(generator.daneFormularza.dodatkoweWymogi[klucz])}
                  ustawWlaczony={(wartosc) => aktualizujDodatkowyWymog(klucz, wartosc)}
                  pokazWzorKlienta={false}
                  wzorKlienta={Boolean(generator.daneFormularza.dodatkoweWymogi.wzoryKlienta[klucz])}
                  ustawWzorKlienta={(wartosc) => aktualizujWzorDodatkowegoWymogu(klucz, wartosc)}
                />
              ))}
            </div>
          </SekcjaFormularza>
        </div>

        <div className="szczegoly-uklad-sekcji">
          <SekcjaFormularza id="materialy-szkoleniowe" tytul="Materiały szkoleniowe">
            <div className="szczegoly-lista-wymogow">
              {pozycjeMaterialow.map(([klucz, etykieta]) => (
                <WierszWymoguRozszerzony
                  etykieta={etykieta}
                  key={klucz}
                  wlaczony={Boolean(generator.daneFormularza.dokumentacja[klucz])}
                  ustawWlaczony={(wartosc) => aktualizujDokumentacje(klucz, wartosc)}
                  wariantPrzelacznika="druk-online"
                  wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta[klucz])}
                  ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji(klucz, wartosc)}
                  szczegolyWzoruKlienta={generator.daneFormularza.dokumentacja.szczegolyWzorowKlienta[klucz]}
                  podgladWzoruKlienta={podgladyWzorowKlienta[klucz]}
                  ustawPlikWzoruKlienta={(plik) => aktualizujPlikWzoruDokumentacji(klucz, plik)}
                  ustawUwagiWzoruKlienta={(uwagi) => aktualizujSzczegolyWzoruDokumentacji(klucz, 'uwagi', uwagi)}
                />
              ))}
            </div>
          </SekcjaFormularza>

          <SekcjaFormularza id="wymogi-materialow" tytul="Wymogi dotyczące materiałów">
            <div className="szczegoly-lista-wymogow">
              {pozycjeWymogowMaterialow.map(([klucz, etykieta]) => (
                <WierszWymoguRozszerzony
                  etykieta={etykieta}
                  key={klucz}
                  wlaczony={Boolean(generator.daneFormularza.dokumentacja[klucz])}
                  ustawWlaczony={(wartosc) => aktualizujDokumentacje(klucz, wartosc)}
                  pokazWzorKlienta={false}
                  wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta[klucz])}
                  ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji(klucz, wartosc)}
                />
              ))}
              <div className="szczegoly-wiersz-wymogu">
                <span>Logotypy</span>
                <PrzelacznikTakNie
                  etykieta="Logotypy"
                  wlaczony={generator.daneFormularza.dokumentacja.logotypy === 'Tak'}
                  ustawWlaczony={(wartosc) => aktualizujDokumentacje('logotypy', wartosc ? 'Tak' : 'Nie')}
                />
              </div>
              {generator.daneFormularza.dokumentacja.logotypy === 'Tak' && (
                <>
                  <label className="szczegoly-pole">
                    <span className="szczegoly-pole__naglowek">Plik logotypu</span>
                    <input accept=".png,.jpg,.jpeg,.svg" type="file" onChange={obsluzPlikLogotypu} />
                  </label>
                  {generator.daneFormularza.logotypy.podglad && <img alt="Podgląd logotypu" className="szczegoly-logo-podglad" src={generator.daneFormularza.logotypy.podglad} />}
                </>
              )}
              <hr className="szczegoly-separator" />
              <WierszWymoguRozszerzony
                etykieta={'"+1" Dodatkowy egzemplarz'}
                wlaczony={generator.daneFormularza.dokumentacja.plusJedenEgzemplarz}
                ustawWlaczony={(wartosc) => aktualizujDokumentacje('plusJedenEgzemplarz', wartosc)}
                pokazWzorKlienta={false}
                wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta.plusJedenEgzemplarz)}
                ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji('plusJedenEgzemplarz', wartosc)}
              />
            </div>
          </SekcjaFormularza>
        </div>

        <div className="szczegoly-uwagi-dodatkowe szczegoly-uwagi-dodatkowe--osobne">
          <PoleTekstoweWielowierszowe
            etykieta="Uwagi dodatkowe"
            pole="dodatkoweWymogi.uwagi"
            statusyPol={generator.statusyPol}
            wartosc={generator.daneFormularza.dodatkoweWymogi.uwagi}
            ustawWartosc={(wartosc) => aktualizujDodatkowyWymog('uwagi', wartosc)}
          />
        </div>

        <SekcjaFormularza id="wysylka-paczki" tytul="Wysyłka paczki">
          <PrzelacznikTakNie
            etykieta="Wysyłka paczki dotyczy"
            wlaczony={generator.daneFormularza.wysylkaPaczkiDotyczy}
            ustawWlaczony={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, wysylkaPaczkiDotyczy: wartosc }), 'wysylkaPaczkiDotyczy')}
          />
          <div className={generator.daneFormularza.wysylkaPaczkiDotyczy ? 'szczegoly-wysylka' : 'szczegoly-wysylka szczegoly-wysylka--disabled'}>
            <PoleTekstowe
              disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy}
              etykieta="Nazwa firmy odbiorcy"
              pole="odbiorcaPaczki.nazwaFirmy"
              statusyPol={generator.statusyPol}
              wartosc={generator.daneFormularza.odbiorcaPaczki.nazwaFirmy}
              ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, nazwaFirmy: wartosc } }), 'odbiorcaPaczki.nazwaFirmy')}
            />
            <div className="szczegoly-siatka szczegoly-siatka--trzy">
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Ulica" pole="odbiorcaPaczki.ulica" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.ulica} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, ulica: wartosc } }), 'odbiorcaPaczki.ulica')} />
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Numer budynku" pole="odbiorcaPaczki.nrBudynku" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.nrBudynku} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, nrBudynku: wartosc } }), 'odbiorcaPaczki.nrBudynku')} />
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Numer lokalu" pole="odbiorcaPaczki.nrLokalu" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.nrLokalu} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, nrLokalu: wartosc } }), 'odbiorcaPaczki.nrLokalu')} />
            </div>
            <div className="szczegoly-siatka szczegoly-siatka--trzy">
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Kod pocztowy" pole="odbiorcaPaczki.kodPocztowy" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.kodPocztowy} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, kodPocztowy: wartosc } }), 'odbiorcaPaczki.kodPocztowy')} />
              <PoleTekstowe
                disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy}
                etykieta="Miasto"
                listaPodpowiedziId="miejscowosci-odbiorca-paczki"
                podpowiedzi={podpowiedziMiastaPaczki}
                pole="odbiorcaPaczki.miasto"
                statusyPol={generator.statusyPol}
                wartosc={generator.daneFormularza.odbiorcaPaczki.miasto}
                ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, miasto: wartosc } }), 'odbiorcaPaczki.miasto')}
              />
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Kraj" pole="odbiorcaPaczki.kraj" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.kraj} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, kraj: wartosc } }), 'odbiorcaPaczki.kraj')} />
            </div>
            <hr className="szczegoly-separator" />
            <div className="szczegoly-siatka szczegoly-siatka--trzy">
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Imię i nazwisko odbiorcy" pole="odbiorcaPaczki.imieNazwisko" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.imieNazwisko} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, imieNazwisko: wartosc } }), 'odbiorcaPaczki.imieNazwisko')} />
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Telefon" pole="odbiorcaPaczki.telefon" statusyPol={generator.statusyPol} typ="tel" wartosc={generator.daneFormularza.odbiorcaPaczki.telefon} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, telefon: wartosc } }), 'odbiorcaPaczki.telefon')} />
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Email" pole="odbiorcaPaczki.email" statusyPol={generator.statusyPol} typ="email" wartosc={generator.daneFormularza.odbiorcaPaczki.email} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, email: wartosc } }), 'odbiorcaPaczki.email')} />
            </div>
          </div>
        </SekcjaFormularza>

        <SekcjaFormularza id="wyslij-aktualizacje" tytul="Wyślij aktualizację">
          <PoleTekstowe
            etykieta="Adresaci oddzieleni przecinkiem"
            pole="adresaci.reczniAdresaci"
            statusyPol={generator.statusyPol}
            typ="email"
            wartosc={generator.adresaci.reczniAdresaci}
            ustawWartosc={(wartosc) => generator.ustawAdresaci((obecne) => ({ ...obecne, reczniAdresaci: wartosc }))}
          />
          <div className="szczegoly-segmenty" role="group" aria-label="Opcje zawartości">
            {(['Tylko zmiany', 'Cała treść'] as const).map((opcja) => (
              <button
                aria-pressed={generator.adresaci.trybTresci === opcja}
                className={generator.adresaci.trybTresci === opcja ? 'szczegoly-segmenty__aktywny' : ''}
                key={opcja}
                type="button"
                onClick={() => generator.ustawAdresaci((obecne) => ({ ...obecne, trybTresci: opcja }))}
              >
                {opcja}
              </button>
            ))}
          </div>
          <PoleCheckbox
            etykieta="Dodaj podpis"
            pole="adresaci.czyPodpis"
            statusyPol={generator.statusyPol}
            zaznaczone={generator.adresaci.czyPodpis}
            ustawZaznaczone={(wartosc) => generator.ustawAdresaci((obecne) => ({ ...obecne, czyPodpis: wartosc }))}
          />
          <PoleTekstoweWielowierszowe
            etykieta="Wiadomość własna"
            pole="adresaci.wiadomoscWlasna"
            statusyPol={generator.statusyPol}
            wartosc={generator.adresaci.wiadomoscWlasna}
            ustawWartosc={(wartosc) => generator.ustawAdresaci((obecne) => ({ ...obecne, wiadomoscWlasna: wartosc }))}
          />
          <button disabled={!generator.czyAdresaciAktualizacjiPoprawni} type="button" onClick={generator.przygotujAktualizacje}>
            Wyślij aktualizację
          </button>
        </SekcjaFormularza>

        <SekcjaFormularza id="historia-wersji" tytul="Historia wersji i zdarzeń">
          <div className="szczegoly-historia">
            {generator.historiaSzczegolow.length === 0 && <p>Brak zapisanych wersji i zdarzeń.</p>}
            {generator.historiaSzczegolow.map((wpis) => (
              <article className="szczegoly-historia__wpis" key={wpis.id}>
                <div>
                  <strong>{wpis.etykietaWersji ?? wpis.typ}</strong>
                  <span>{new Date(wpis.data).toLocaleString('pl-PL')} | {wpis.autorNazwa}</span>
                </div>
                <p>{wpis.komentarz}</p>
                {wpis.zmianaStatusu && <p>Status: {wpis.zmianaStatusu.z ?? 'brak'} → {wpis.zmianaStatusu.na}</p>}
                {wpis.zdarzenieSpecjalne && <p>{wpis.zdarzenieSpecjalne}</p>}
                {wpis.typ === 'wersja' && (
                  <button type="button" onClick={() => ustawPorownywanaWersjaId(porownywanaWersjaId === wpis.id ? null : wpis.id)}>
                    {porownywanaWersjaId === wpis.id ? 'Ukryj porównanie' : 'Porównaj'}
                  </button>
                )}
                {porownywanaWersjaId === wpis.id && (
                  <ul>
                    {pobierzRozniceWersji(poprzedniaWersja?.dane, porownywanaWersja?.dane).map((roznica) => (
                      <li key={roznica}>{roznica}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </SekcjaFormularza>

        <SekcjaFormularza id="eksport-import" tytul="Eksport / Import">
          <div className="szczegoly-akcje szczegoly-akcje--pelne">
            <button type="button" onClick={generator.eksportujJson}>
              Eksportuj JSON
            </button>
            <label className="szczegoly-przycisk-pliku">
              Importuj JSON
              <input accept=".json,application/json" type="file" onChange={obsluzImportJson} />
            </label>
            <button type="button" onClick={wyczyscPoPotwierdzeniu}>
              Nowy formularz
            </button>
          </div>
          <div className="szczegoly-kopie">
            {generator.kopieRobocze.map((kopia) => (
              <button key={kopia.id} type="button" onClick={() => generator.wczytajWersje(kopia)}>
                {kopia.nazwa}
              </button>
            ))}
          </div>
        </SekcjaFormularza>
        </div>
      </div>
      </div>

      <div className="szczegoly-panel-jakosci__strefa-aktywacji" onMouseEnter={otworzPanelJakosciZKrawedzi} aria-hidden="true" />
      <aside
        aria-label="Panel kontroli jakosci"
        className={`szczegoly-panel-jakosci${czyPanelJakosciOtwarty ? ' szczegoly-panel-jakosci--otwarty' : ''}${czyPanelJakosciPrzypiety ? ' szczegoly-panel-jakosci--przypiety' : ''}`}
        id={idPaneluJakosci}
        onKeyDown={obsluzKlawiszPaneluJakosci}
        onMouseEnter={otworzPanelJakosci}
        onMouseLeave={schowajPanelJakosciJesliOdpiety}
      >
        <div className="szczegoly-panel-jakosci__sterowanie">
          <button aria-label={czyWysuwaniePaneluJakosciWlaczone ? 'Wylacz automatyczne wysuwanie panelu jakosci' : 'Wlacz automatyczne wysuwanie panelu jakosci'} className="szczegoly-panel-jakosci__przycisk" onClick={przelaczWysuwaniePaneluJakosci} title={czyWysuwaniePaneluJakosciWlaczone ? 'Wylacz wysuwanie' : 'Wlacz wysuwanie'} type="button">
            {czyWysuwaniePaneluJakosciWlaczone ? 'Wylacz wysuwanie' : 'Wlacz wysuwanie'}
          </button>
          <button aria-label={czyPanelJakosciPrzypiety ? 'Odepnij panel kontroli jakosci' : 'Przypnij panel kontroli jakosci'} className="szczegoly-panel-jakosci__przycisk" onClick={przelaczPrzypieciePaneluJakosci} title={czyPanelJakosciPrzypiety ? 'Odepnij panel' : 'Przypnij panel'} type="button">
            {czyPanelJakosciPrzypiety ? 'Odepnij panel' : 'Przypnij panel'}
          </button>
        </div>
        <PanelWykrytychProblemow
          komunikatySystemowe={[generator.komunikat]}
          modelSekcyjny={generator.modelSekcyjny}
          ostatniAutosave={generator.ostatniAutosave}
          polaNiepewne={generator.polaNiepewne}
          problemy={generator.problemyWalidacji}
          zaakceptujPolaNiepewne={generator.zaakceptujWszystkiePolaNiepewne}
        />
      </aside>
    </section>
  )
}
