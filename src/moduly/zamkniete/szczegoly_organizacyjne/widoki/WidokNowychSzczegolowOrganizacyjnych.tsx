import type { ChangeEvent } from 'react'
import KartaGrupySzkoleniowej from '../komponenty/KartaGrupySzkoleniowej'
import PanelWykrytychProblemow from '../komponenty/PanelWykrytychProblemow'
import PasekStickySzczegolow from '../komponenty/PasekStickySzczegolow'
import { PoleCheckbox, PoleLiczbowe, PoleTekstowe, PoleTekstoweWielowierszowe, PoleWyboru } from '../komponenty/PolaSzczegolow'
import PrzelacznikTakNie from '../komponenty/PrzelacznikTakNie'
import SekcjaFormularza from '../komponenty/SekcjaFormularza'
import { useGeneratorSzczegolow } from '../hooki/useGeneratorSzczegolow'
import type { DaneFirmy, DaneFormularza, OrganizatorSzkolenia, StatusLogotypow } from '../typy'
import './widokNowychSzczegolowOrganizacyjnych.css'

const sekcjeNawigacji = [
  { id: 'wykryte-problemy', etykieta: 'Problemy' },
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
  { id: 'eksport-import', etykieta: 'JSON' },
]

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
  ['projektTesty', 'Projekt testy'],
] as const

const pozycjeWymogowMaterialow = [
  ['dostepnoscCyfrowa', 'Dostępność cyfrowa'],
  ['plikZrodlowy', 'Plik źródłowy'],
] as const

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
}

type WlasciwosciWierszaWymogu = {
  etykieta: string
  wlaczony: boolean
  ustawWlaczony: (wartosc: boolean) => void
  wzorKlienta: boolean
  ustawWzorKlienta: (wartosc: boolean) => void
}

function PolaFirmy({ tytul, prefix, dane, disabled, statusyPol, aktualizujPole }: WlasciwosciPolFirmy) {
  const czyNabywca = prefix === 'nabywca'

  return (
    <section className="szczegoly-kolumna-danych">
      <h3>{tytul}</h3>
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
        <PoleTekstowe disabled={disabled} etykieta="Miasto" pole={`${prefix}.miasto`} statusyPol={statusyPol} wartosc={dane.miasto} ustawWartosc={(wartosc) => aktualizujPole('miasto', wartosc)} />
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

function WierszWymogu({ etykieta, wlaczony, ustawWlaczony, wzorKlienta, ustawWzorKlienta }: WlasciwosciWierszaWymogu) {
  return (
    <div className="szczegoly-wiersz-wymogu">
      <span>{etykieta}</span>
      <PrzelacznikTakNie etykieta={etykieta} wlaczony={wlaczony} ustawWlaczony={ustawWlaczony} />
      <label className="szczegoly-checkbox">
        <input checked={wzorKlienta} type="checkbox" onChange={(zdarzenie) => ustawWzorKlienta(zdarzenie.target.checked)} />
        <span>Wzór klienta</span>
      </label>
    </div>
  )
}

export default function WidokNowychSzczegolowOrganizacyjnych() {
  const generator = useGeneratorSzczegolow()
  const liczbaProblemowBlokujacych = generator.problemyWalidacji.filter((problem) => problem.czyBlokuje).length
  const statusFormularza = generator.czyFormularzKompletny ? 'Kompletny' : `Niepełny (${liczbaProblemowBlokujacych})`
  const bladTytulu = generator.daneFormularza.tytulSzkolenia.trim() ? undefined : 'Pole wymagane'
  const bladKlienta = generator.daneFormularza.nazwaKlienta.trim() ? undefined : 'Pole wymagane'

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
    <section className="widok szczegoly-organizacyjne">
      <PasekStickySzczegolow
        sekcje={sekcjeNawigacji}
        status={statusFormularza}
        tytul="Nowe szczegóły organizacyjne"
        akcje={
          <>
            <button type="button" onClick={generator.zapiszWersje}>
              Zapisz kopię roboczą
            </button>
            <button disabled={!generator.czyFormularzKompletny} type="button" onClick={generator.wprowadzSzkolenie}>
              Wprowadź to szkolenie
            </button>
          </>
        }
      />

      <p className="szczegoly-komunikat">{generator.komunikat}</p>

      <div className="szczegoly-formularz">
        <SekcjaFormularza id="wykryte-problemy" tytul="Wykryte problemy">
          <PanelWykrytychProblemow problemy={generator.problemyWalidacji} />
        </SekcjaFormularza>

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
          <PoleTekstowe
            blad={bladKlienta}
            etykieta="Nazwa klienta"
            pole="nazwaKlienta"
            statusyPol={generator.statusyPol}
            wartosc={generator.daneFormularza.nazwaKlienta}
            ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, nazwaKlienta: wartosc }), 'nazwaKlienta')}
          />
        </SekcjaFormularza>

        <SekcjaFormularza
          id="grupy-szkoleniowe"
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
                key={grupa.id}
                statusyPol={generator.statusyPol}
                trenerzyKartoteki={generator.trenerzyKartoteki}
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
          <PoleCheckbox
            etykieta="Nabywca jest odbiorcą"
            pole="czyNabywcaJestOdbiorca"
            statusyPol={generator.statusyPol}
            zaznaczone={generator.daneFormularza.czyNabywcaJestOdbiorca}
            ustawZaznaczone={ustawCzyNabywcaJestOdbiorca}
          />
          <div className="szczegoly-kolumny-danych">
            <PolaFirmy aktualizujPole={aktualizujNabywce} dane={generator.daneFormularza.nabywca} prefix="nabywca" statusyPol={generator.statusyPol} tytul="Nabywca" />
            <PolaFirmy
              aktualizujPole={aktualizujOdbiorce}
              dane={generator.daneFormularza.odbiorca}
              disabled={generator.daneFormularza.czyNabywcaJestOdbiorca}
              prefix="odbiorca"
              statusyPol={generator.statusyPol}
              tytul="Odbiorca"
            />
          </div>
        </SekcjaFormularza>

        <SekcjaFormularza id="pakiet-podstawowy" tytul="Pakiet podstawowy">
          <div className="szczegoly-lista-wymogow">
            {pozycjePakietu.map(([klucz, etykieta]) => (
              <WierszWymogu
                etykieta={etykieta}
                key={klucz}
                wlaczony={Boolean(generator.daneFormularza.dokumentacja[klucz])}
                ustawWlaczony={(wartosc) => aktualizujDokumentacje(klucz, wartosc)}
                wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta[klucz])}
                ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji(klucz, wartosc)}
              />
            ))}
          </div>
        </SekcjaFormularza>

        <SekcjaFormularza id="materialy-szkoleniowe" tytul="Materiały szkoleniowe">
          <div className="szczegoly-lista-wymogow">
            {pozycjeMaterialow.map(([klucz, etykieta]) => (
              <WierszWymogu
                etykieta={etykieta}
                key={klucz}
                wlaczony={Boolean(generator.daneFormularza.dokumentacja[klucz])}
                ustawWlaczony={(wartosc) => aktualizujDokumentacje(klucz, wartosc)}
                wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta[klucz])}
                ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji(klucz, wartosc)}
              />
            ))}
          </div>
        </SekcjaFormularza>

        <SekcjaFormularza id="wymogi-materialow" tytul="Wymogi dotyczące materiałów">
          <div className="szczegoly-lista-wymogow">
            {pozycjeWymogowMaterialow.map(([klucz, etykieta]) => (
              <WierszWymogu
                etykieta={etykieta}
                key={klucz}
                wlaczony={Boolean(generator.daneFormularza.dokumentacja[klucz])}
                ustawWlaczony={(wartosc) => aktualizujDokumentacje(klucz, wartosc)}
                wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta[klucz])}
                ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji(klucz, wartosc)}
              />
            ))}
            <div className="szczegoly-wiersz-wymogu">
              <span>Logotypy</span>
              <select value={generator.daneFormularza.dokumentacja.logotypy} onChange={(zdarzenie) => aktualizujDokumentacje('logotypy', zdarzenie.target.value as StatusLogotypow)}>
                <option>Tak</option>
                <option>Nie</option>
                <option>Nie dotyczy</option>
              </select>
              <label className="szczegoly-checkbox">
                <input checked={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta.logotypy)} type="checkbox" onChange={(zdarzenie) => aktualizujWzorDokumentacji('logotypy', zdarzenie.target.checked)} />
                <span>Wzór klienta</span>
              </label>
            </div>
            <label className="szczegoly-pole">
              <span className="szczegoly-pole__naglowek">Plik logotypu</span>
              <input accept=".png,.jpg,.jpeg,.svg" type="file" onChange={obsluzPlikLogotypu} />
            </label>
            {generator.daneFormularza.logotypy.podglad && <img alt="Podgląd logotypu" className="szczegoly-logo-podglad" src={generator.daneFormularza.logotypy.podglad} />}
            <hr className="szczegoly-separator" />
            <WierszWymogu
              etykieta="Plus jeden egzemplarz"
              wlaczony={generator.daneFormularza.dokumentacja.plusJedenEgzemplarz}
              ustawWlaczony={(wartosc) => aktualizujDokumentacje('plusJedenEgzemplarz', wartosc)}
              wzorKlienta={Boolean(generator.daneFormularza.dokumentacja.wzoryKlienta.plusJedenEgzemplarz)}
              ustawWzorKlienta={(wartosc) => aktualizujWzorDokumentacji('plusJedenEgzemplarz', wartosc)}
            />
          </div>
        </SekcjaFormularza>

        <SekcjaFormularza id="dodatkowe-wymogi" tytul="Dodatkowe wymogi">
          <div className="szczegoly-lista-wymogow">
            <div className="szczegoly-wiersz-wymogu szczegoly-wiersz-wymogu--rozszerzony">
              <span>Wcześniejszy przyjazd trenera</span>
              <PrzelacznikTakNie
                etykieta="Wcześniejszy przyjazd trenera"
                wlaczony={generator.daneFormularza.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera}
                ustawWlaczony={(wartosc) => aktualizujDodatkowyWymog('wczesniejszyPrzyjazdTrenera', wartosc)}
              />
              <label className="szczegoly-checkbox">
                <input
                  checked={Boolean(generator.daneFormularza.dodatkoweWymogi.wzoryKlienta.wczesniejszyPrzyjazdTrenera)}
                  type="checkbox"
                  onChange={(zdarzenie) => aktualizujWzorDodatkowegoWymogu('wczesniejszyPrzyjazdTrenera', zdarzenie.target.checked)}
                />
                <span>Wzór klienta</span>
              </label>
              {generator.daneFormularza.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera && (
                <PoleLiczbowe
                  etykieta="Ile minut wcześniej"
                  min={0}
                  pole="dodatkoweWymogi.minutyWczesniej"
                  statusyPol={generator.statusyPol}
                  wartosc={generator.daneFormularza.dodatkoweWymogi.minutyWczesniej}
                  ustawWartosc={(wartosc) => aktualizujDodatkowyWymog('minutyWczesniej', wartosc)}
                />
              )}
            </div>
            {pozycjeDodatkowychWymogow.map(([klucz, etykieta]) => (
              <WierszWymogu
                etykieta={etykieta}
                key={klucz}
                wlaczony={Boolean(generator.daneFormularza.dodatkoweWymogi[klucz])}
                ustawWlaczony={(wartosc) => aktualizujDodatkowyWymog(klucz, wartosc)}
                wzorKlienta={Boolean(generator.daneFormularza.dodatkoweWymogi.wzoryKlienta[klucz])}
                ustawWzorKlienta={(wartosc) => aktualizujWzorDodatkowegoWymogu(klucz, wartosc)}
              />
            ))}
          </div>
          <PoleTekstoweWielowierszowe
            etykieta="Uwagi dodatkowe"
            pole="dodatkoweWymogi.uwagi"
            statusyPol={generator.statusyPol}
            wartosc={generator.daneFormularza.dodatkoweWymogi.uwagi}
            ustawWartosc={(wartosc) => aktualizujDodatkowyWymog('uwagi', wartosc)}
          />
        </SekcjaFormularza>

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
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Miasto" pole="odbiorcaPaczki.miasto" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.miasto} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, miasto: wartosc } }), 'odbiorcaPaczki.miasto')} />
              <PoleTekstowe disabled={!generator.daneFormularza.wysylkaPaczkiDotyczy} etykieta="Kraj" pole="odbiorcaPaczki.kraj" statusyPol={generator.statusyPol} wartosc={generator.daneFormularza.odbiorcaPaczki.kraj} ustawWartosc={(wartosc) => generator.aktualizujDane((dane) => ({ ...dane, odbiorcaPaczki: { ...dane.odbiorcaPaczki, kraj: wartosc } }), 'odbiorcaPaczki.kraj')} />
            </div>
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
    </section>
  )
}
