import { useMemo, useState } from 'react'
import {
  pobierzLokalizacjeZMagazynu,
  ustawPotwierdzonyMiejscownikLokalizacji,
  znajdzLokalizacjeDlaMiejsca,
} from '../../../../kartoteki/lokalizacje/magazynLokalizacji'
import { etykietyStatusowPol, klasyStatusowPol } from '../stale'
import type {
  FormaSzkolenia,
  GrupaSzkoleniowa,
  OswiadczenieVat,
  RodzajGodzin,
  StatusyPolImportu,
  TrenerKartoteki,
  TrybCeny,
} from '../typy'
import { PoleCheckbox, PoleLiczbowe, PoleTekstowe, PoleWyboru } from './PolaSzczegolow'

type WlasciwosciKartyGrupy = {
  grupa: GrupaSzkoleniowa
  indeks: number
  statusyPol: StatusyPolImportu
  trenerzyKartoteki: TrenerKartoteki[]
  aktualizujGrupe: (id: string, aktualizacja: (grupa: GrupaSzkoleniowa) => GrupaSzkoleniowa, pole?: string) => void
  duplikujGrupe: (id: string) => void
  usunGrupe: (id: string) => void
}

const opcjeFormy: FormaSzkolenia[] = ['Stacjonarne', 'Online']
const opcjeGodzin: RodzajGodzin[] = ['Zajęciowe (60 min)', 'Akademickie (45 min)']
const opcjeVat: OswiadczenieVat[] = ['Nie – 23%', 'Min. 70%', 'ZW – 100%']
const opcjeTrybuCeny: TrybCeny[] = ['za grupę', 'za osobę']

function formatujKwote(wartosc: number) {
  if (!Number.isFinite(wartosc) || wartosc <= 0) {
    return ''
  }

  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(wartosc)
}

function parsujKwote(wartosc: string) {
  const bezSpacji = wartosc.replace(/\s/g, '').replace(',', '.')

  if (!/^\d*(\.\d{0,2})?$/.test(bezSpacji)) {
    return Number.NaN
  }

  return Number(bezSpacji || 0)
}

function ZnacznikStatusu({ pole, statusyPol }: { pole: string; statusyPol: StatusyPolImportu }) {
  const status = statusyPol[pole]

  if (!status) {
    return null
  }

  return <span className={`szczegoly-pole__status ${klasyStatusowPol[status]}`}>{etykietyStatusowPol[status]}</span>
}

function PoleCeny({
  grupa,
  indeks,
  statusyPol,
  aktualizujGrupe,
}: Pick<WlasciwosciKartyGrupy, 'grupa' | 'indeks' | 'statusyPol' | 'aktualizujGrupe'>) {
  const pole = `grupy.${indeks}.cenaNetto`
  const status = statusyPol[pole]
  const [czyAktywne, ustawCzyAktywne] = useState(false)
  const [wartoscRobocza, ustawWartoscRobocza] = useState(formatujKwote(grupa.cenaNetto))
  const wartoscWidoczna = czyAktywne ? wartoscRobocza : formatujKwote(grupa.cenaNetto)

  function zmienWartosc(wartosc: string) {
    ustawWartoscRobocza(wartosc)
    aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, cenaNetto: parsujKwote(wartosc) }), pole)
  }

  function sformatujWartosc() {
    ustawCzyAktywne(false)
    ustawWartoscRobocza(formatujKwote(grupa.cenaNetto))
  }

  return (
    <label className={`szczegoly-pole ${status ? klasyStatusowPol[status] : ''}`}>
      <span className="szczegoly-pole__naglowek">
        <span>Cena netto</span>
        <ZnacznikStatusu pole={pole} statusyPol={statusyPol} />
      </span>
      <span className="szczegoly-pole-ceny">
        <input
          aria-invalid={!Number.isFinite(grupa.cenaNetto)}
          inputMode="decimal"
          value={wartoscWidoczna}
          onBlur={sformatujWartosc}
          onChange={(zdarzenie) => zmienWartosc(zdarzenie.target.value)}
          onFocus={() => {
            ustawWartoscRobocza(wartoscWidoczna)
            ustawCzyAktywne(true)
          }}
        />
        <span>zł/netto</span>
      </span>
    </label>
  )
}

export default function KartaGrupySzkoleniowej({
  grupa,
  indeks,
  statusyPol,
  trenerzyKartoteki,
  aktualizujGrupe,
  duplikujGrupe,
  usunGrupe,
}: WlasciwosciKartyGrupy) {
  const [wersjaLokalizacji, ustawWersjeLokalizacji] = useState(0)
  const [poprawionyMiejscownik, ustawPoprawionyMiejscownik] = useState('')
  const lokalizacje = useMemo(() => {
    void wersjaLokalizacji
    return pobierzLokalizacjeZMagazynu()
  }, [wersjaLokalizacji])
  const trenerzyDoWyboru = useMemo(() => {
    const trenerzyImportowani = grupa.trenerzy.filter((trener) => !trenerzyKartoteki.some((pozycja) => pozycja.id === trener.id))
    return [...trenerzyKartoteki, ...trenerzyImportowani]
  }, [grupa.trenerzy, trenerzyKartoteki])
  const wybranaLokalizacja = useMemo(() => znajdzLokalizacjeDlaMiejsca(grupa.miejsce, lokalizacje), [grupa.miejsce, lokalizacje])
  const lokalizacjeDoPodpowiedzi = useMemo(() => {
    const fraza = grupa.miejsce.trim().toLocaleLowerCase('pl')
    return lokalizacje.filter((lokalizacja) => !fraza || lokalizacja.nazwa.toLocaleLowerCase('pl').includes(fraza)).slice(0, 50)
  }, [grupa.miejsce, lokalizacje])

  function ustawTrenera(idTrenera: string) {
    const trener = trenerzyDoWyboru.find((pozycja) => pozycja.id === idTrenera)
    aktualizujGrupe(
      grupa.id,
      (obecna) => ({
        ...obecna,
        trenerzy: trener ? [{ id: trener.id, imieNazwisko: trener.imieNazwisko, telefon: trener.telefon, email: trener.email }] : [],
      }),
      `grupy.${indeks}.trenerzy`,
    )
  }

  function ustawForme(formaSzkolenia: FormaSzkolenia) {
    aktualizujGrupe(
      grupa.id,
      (obecna) => ({
        ...obecna,
        formaSzkolenia,
        miejsce: formaSzkolenia === 'Online' ? 'Online' : obecna.miejsce === 'Online' ? '' : obecna.miejsce,
      }),
      `grupy.${indeks}.formaSzkolenia`,
    )
  }

  function ustawMiejsce(miejsce: string) {
    ustawPoprawionyMiejscownik('')
    aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, miejsce }), `grupy.${indeks}.miejsce`)
  }

  function potwierdzMiejscownik(wartosc?: string) {
    if (!wybranaLokalizacja) {
      return
    }

    const miejscownik = (wartosc ?? wybranaLokalizacja.miejscownik_pelny_auto).trim()

    if (!miejscownik) {
      return
    }

    ustawPotwierdzonyMiejscownikLokalizacji(wybranaLokalizacja.klucz_lokalizacji, miejscownik)
    ustawPoprawionyMiejscownik('')
    ustawWersjeLokalizacji((obecna) => obecna + 1)
    aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, miejsce: obecna.miejsce }), `grupy.${indeks}.miejsce`)
  }

  return (
    <article className="szczegoly-karta-grupy">
      <header className="szczegoly-karta-grupy__naglowek">
        <div>
          <h3>{grupa.nazwa || `Grupa ${indeks + 1}`}</h3>
          <span>{grupa.formaSzkolenia} · {grupa.dataOd || 'brak daty od'} - {grupa.dataDo || 'brak daty do'}</span>
        </div>
        <div className="szczegoly-akcje">
          <button type="button" onClick={() => duplikujGrupe(grupa.id)}>
            Duplikuj grupę
          </button>
          <button disabled={indeks === 0} type="button" onClick={() => usunGrupe(grupa.id)}>
            Usuń grupę
          </button>
        </div>
      </header>

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <label className={`szczegoly-pole ${statusyPol[`grupy.${indeks}.trenerzy`] ? klasyStatusowPol[statusyPol[`grupy.${indeks}.trenerzy`]!] : ''}`}>
          <span className="szczegoly-pole__naglowek">
            <span>Trener</span>
            <ZnacznikStatusu pole={`grupy.${indeks}.trenerzy`} statusyPol={statusyPol} />
          </span>
          <select value={grupa.trenerzy[0]?.id ?? ''} onChange={(zdarzenie) => ustawTrenera(zdarzenie.target.value)}>
            <option value="">Wybierz trenera</option>
            {trenerzyDoWyboru.map((trener) => (
              <option key={trener.id} value={trener.id}>
                {trener.imieNazwisko}
              </option>
            ))}
          </select>
        </label>
        <PoleWyboru
          etykieta="Forma szkolenia"
          opcje={opcjeFormy}
          pole={`grupy.${indeks}.formaSzkolenia`}
          statusyPol={statusyPol}
          wartosc={grupa.formaSzkolenia}
          ustawWartosc={(wartosc) => ustawForme(wartosc as FormaSzkolenia)}
        />
        <PoleLiczbowe
          etykieta="Liczba uczestników"
          min={1}
          pole={`grupy.${indeks}.liczbaUczestnikow`}
          statusyPol={statusyPol}
          wartosc={grupa.liczbaUczestnikow}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, liczbaUczestnikow: wartosc }), `grupy.${indeks}.liczbaUczestnikow`)}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--cztery">
        <PoleTekstowe
          etykieta="Data od"
          pole={`grupy.${indeks}.dataOd`}
          statusyPol={statusyPol}
          typ="date"
          wartosc={grupa.dataOd}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, dataOd: wartosc }), `grupy.${indeks}.dataOd`)}
        />
        <PoleTekstowe
          etykieta="Data do"
          pole={`grupy.${indeks}.dataDo`}
          statusyPol={statusyPol}
          typ="date"
          wartosc={grupa.dataDo}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, dataDo: wartosc }), `grupy.${indeks}.dataDo`)}
        />
        <PoleLiczbowe
          etykieta="Liczba godzin"
          min={0}
          pole={`grupy.${indeks}.liczbaGodzin`}
          statusyPol={statusyPol}
          wartosc={grupa.liczbaGodzin}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, liczbaGodzin: wartosc }), `grupy.${indeks}.liczbaGodzin`)}
        />
        <PoleWyboru
          etykieta="Rodzaj godzin"
          opcje={opcjeGodzin}
          pole={`grupy.${indeks}.rodzajGodzin`}
          statusyPol={statusyPol}
          wartosc={grupa.rodzajGodzin}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, rodzajGodzin: wartosc as RodzajGodzin }), `grupy.${indeks}.rodzajGodzin`)}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--dwa">
        <div
          className={`szczegoly-pole ${statusyPol[`grupy.${indeks}.miejsce`] ? klasyStatusowPol[statusyPol[`grupy.${indeks}.miejsce`]!] : ''} ${
            grupa.formaSzkolenia === 'Online' ? 'szczegoly-pole--disabled' : ''
          }`}
        >
          <span className="szczegoly-pole__naglowek">
            <span>Miejsce</span>
            <ZnacznikStatusu pole={`grupy.${indeks}.miejsce`} statusyPol={statusyPol} />
          </span>
          <input
            disabled={grupa.formaSzkolenia === 'Online'}
            list={`lokalizacje-${grupa.id}`}
            value={grupa.miejsce}
            onChange={(zdarzenie) => ustawMiejsce(zdarzenie.target.value)}
          />
          <datalist id={`lokalizacje-${grupa.id}`}>
            {lokalizacjeDoPodpowiedzi.map((lokalizacja) => (
              <option key={lokalizacja.klucz_lokalizacji} value={lokalizacja.nazwa} />
            ))}
          </datalist>
          {wybranaLokalizacja && (
            <span className="szczegoly-pole__pomoc">Miejscownik: {wybranaLokalizacja.miejscownik_pelny_auto}</span>
          )}
          {wybranaLokalizacja && !wybranaLokalizacja.status_odmiany && (
            <>
              <span className="szczegoly-pole__blad">Odmiana nazwy tej lokalizacji nie została jeszcze potwierdzona.</span>
              <span className="szczegoly-pole__pomoc">Czy forma miejscownika jest poprawna?</span>
              <span className="szczegoly-akcje">
                <button type="button" onClick={() => potwierdzMiejscownik()}>
                  Potwierdź
                </button>
                <input placeholder="Poprawny miejscownik" value={poprawionyMiejscownik} onChange={(zdarzenie) => ustawPoprawionyMiejscownik(zdarzenie.target.value)} />
                <button disabled={!poprawionyMiejscownik.trim()} type="button" onClick={() => potwierdzMiejscownik(poprawionyMiejscownik)}>
                  Zapisz poprawkę
                </button>
              </span>
            </>
          )}
        </div>
        <PoleTekstowe
          etykieta={grupa.formaSzkolenia === 'Online' ? 'Kto zapewnia łącze' : 'Kto zapewnia salę'}
          pole={`grupy.${indeks}.ktoZapewniaSale`}
          statusyPol={statusyPol}
          wartosc={grupa.ktoZapewniaSale}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, ktoZapewniaSale: wartosc }), `grupy.${indeks}.ktoZapewniaSale`)}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleCeny grupa={grupa} indeks={indeks} statusyPol={statusyPol} aktualizujGrupe={aktualizujGrupe} />
        <PoleWyboru
          etykieta="Sposób naliczenia ceny"
          opcje={opcjeTrybuCeny}
          pole={`grupy.${indeks}.trybCeny`}
          statusyPol={statusyPol}
          wartosc={grupa.trybCeny}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, trybCeny: wartosc as TrybCeny }), `grupy.${indeks}.trybCeny`)}
        />
        <PoleWyboru
          etykieta="Oświadczenie VAT"
          opcje={opcjeVat}
          pole={`grupy.${indeks}.vat`}
          statusyPol={statusyPol}
          wartosc={grupa.vat}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, vat: wartosc as OswiadczenieVat }), `grupy.${indeks}.vat`)}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--cztery">
        <PoleLiczbowe
          etykieta="Termin płatności (dni)"
          min={0}
          pole={`grupy.${indeks}.terminPlatnosci`}
          statusyPol={statusyPol}
          wartosc={grupa.terminPlatnosci}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, terminPlatnosci: wartosc }), `grupy.${indeks}.terminPlatnosci`)}
        />
        <PoleTekstowe
          etykieta="Data umowy"
          pole={`grupy.${indeks}.dataUmowy`}
          statusyPol={statusyPol}
          typ="date"
          wartosc={grupa.dataUmowy}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, dataUmowy: wartosc }), `grupy.${indeks}.dataUmowy`)}
        />
        <PoleTekstowe
          etykieta="Numer umowy"
          pole={`grupy.${indeks}.numerUmowy`}
          statusyPol={statusyPol}
          wartosc={grupa.numerUmowy}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, numerUmowy: wartosc }), `grupy.${indeks}.numerUmowy`)}
        />
        <div className="szczegoly-flagi szczegoly-flagi--pion">
          <PoleCheckbox
            etykieta="Protokół"
            pole={`grupy.${indeks}.protokol`}
            statusyPol={statusyPol}
            zaznaczone={grupa.protokol}
            ustawZaznaczone={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, protokol: wartosc }), `grupy.${indeks}.protokol`)}
          />
          <PoleCheckbox
            etykieta="Mechanizm podzielonej płatności (MPP)"
            pole={`grupy.${indeks}.mechanizmPodzielonejPlatnosci`}
            statusyPol={statusyPol}
            zaznaczone={grupa.mechanizmPodzielonejPlatnosci}
            ustawZaznaczone={(wartosc) =>
              aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, mechanizmPodzielonejPlatnosci: wartosc }), `grupy.${indeks}.mechanizmPodzielonejPlatnosci`)
            }
          />
        </div>
      </div>
    </article>
  )
}
