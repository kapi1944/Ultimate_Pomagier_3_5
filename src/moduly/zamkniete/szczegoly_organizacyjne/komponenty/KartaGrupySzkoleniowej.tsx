import { useState } from 'react'
import { lokalizacjeKartoteki } from '../stale'
import type { FormaSzkolenia, GrupaSzkoleniowa, RodzajGodzin, StatusTerminu, StatusyPolImportu, TrenerKartoteki, TrenerGrupy, TrybCeny } from '../typy'
import { PoleLiczbowe, PoleTekstowe, PoleTekstoweWielowierszowe, PoleWyboru } from './PolaSzczegolow'

type WlasciwosciKartyGrupy = {
  grupa: GrupaSzkoleniowa
  indeks: number
  statusyPol: StatusyPolImportu
  czyKontaktWspolny: boolean
  trenerzyKartoteki: TrenerKartoteki[]
  aktualizujGrupe: (id: string, aktualizacja: (grupa: GrupaSzkoleniowa) => GrupaSzkoleniowa, pole?: string) => void
  usunGrupe: (id: string) => void
  dodajTreneraDoKartoteki: (trener: Omit<TrenerKartoteki, 'id'>) => TrenerKartoteki
  dodajTreneraDoGrupy: (idGrupy: string, trener: TrenerKartoteki) => void
  usunTreneraZGrupy: (idGrupy: string, idTrenera: string) => void
  zastosujTreneraDoWszystkichGrup: (trener: TrenerGrupy) => void
}

function policzLiczbeDni(dataOd: string, dataDo: string) {
  if (!dataOd || !dataDo) {
    return 0
  }

  const poczatek = new Date(dataOd)
  const koniec = new Date(dataDo)
  const roznica = Math.round((koniec.getTime() - poczatek.getTime()) / 86_400_000)
  return Number.isNaN(roznica) ? 0 : Math.max(1, roznica + 1)
}

export default function KartaGrupySzkoleniowej({
  grupa,
  indeks,
  statusyPol,
  czyKontaktWspolny,
  trenerzyKartoteki,
  aktualizujGrupe,
  usunGrupe,
  dodajTreneraDoKartoteki,
  dodajTreneraDoGrupy,
  usunTreneraZGrupy,
  zastosujTreneraDoWszystkichGrup,
}: WlasciwosciKartyGrupy) {
  const [wybranyTrenerId, ustawWybranyTrenerId] = useState(trenerzyKartoteki[0]?.id ?? '')
  const [nowyTrener, ustawNowyTrener] = useState({ imieNazwisko: '', telefon: '', email: '' })
  const [czyEdytorMiejscownikaOtwarty, ustawCzyEdytorMiejscownikaOtwarty] = useState(false)
  const [roboczyMiejscownik, ustawRoboczyMiejscownik] = useState(grupa.miejscownik)
  const [czyRoboczyMiejscownikPotwierdzony, ustawCzyRoboczyMiejscownikPotwierdzony] = useState(grupa.miejscownikPotwierdzony)
  const liczbaDni = policzLiczbeDni(grupa.dataOd, grupa.dataDo)
  const czyPokazacLokalizacje = grupa.formaSzkolenia === 'Stacjonarne' || grupa.formaSzkolenia === 'Hybrydowe'
  const czyPokazacOnline = grupa.formaSzkolenia === 'Online' || grupa.formaSzkolenia === 'Hybrydowe'
  const czySplitPayment = grupa.cenaBrutto > 15_000

  function wybierzLokalizacje(id: string) {
    const lokalizacja = lokalizacjeKartoteki.find((pozycja) => pozycja.id === id)
    aktualizujGrupe(
      grupa.id,
      (obecna) => ({
        ...obecna,
        lokalizacjaId: id,
        nazwaLokalizacji: lokalizacja?.nazwa ?? obecna.nazwaLokalizacji,
        miejscownik: lokalizacja?.miejscownik ?? obecna.miejscownik,
        miejscownikPotwierdzony: lokalizacja?.miejscownikPotwierdzony ?? false,
        adresLokalizacji: lokalizacja?.adres ?? obecna.adresLokalizacji,
      }),
      `grupy.${indeks}.lokalizacjaId`,
    )
  }

  function otworzEdytorMiejscownika() {
    ustawRoboczyMiejscownik(grupa.miejscownik)
    ustawCzyRoboczyMiejscownikPotwierdzony(grupa.miejscownikPotwierdzony)
    ustawCzyEdytorMiejscownikaOtwarty(true)
  }

  function zamknijEdytorMiejscownika() {
    ustawCzyEdytorMiejscownikaOtwarty(false)
  }

  function zapiszMiejscownik() {
    aktualizujGrupe(
      grupa.id,
      (obecna) => ({
        ...obecna,
        miejscownik: roboczyMiejscownik,
        miejscownikPotwierdzony: czyRoboczyMiejscownikPotwierdzony,
      }),
      `grupy.${indeks}.miejscownik`,
    )
    zamknijEdytorMiejscownika()
  }

  function dodajWybranegoTrenera() {
    const trener = trenerzyKartoteki.find((pozycja) => pozycja.id === wybranyTrenerId)

    if (trener) {
      dodajTreneraDoGrupy(grupa.id, trener)
    }
  }

  function dodajNowegoTrenera() {
    if (!nowyTrener.imieNazwisko.trim()) {
      return
    }

    const trener = dodajTreneraDoKartoteki(nowyTrener)
    dodajTreneraDoGrupy(grupa.id, trener)
    ustawWybranyTrenerId(trener.id)
    ustawNowyTrener({ imieNazwisko: '', telefon: '', email: '' })
  }

  return (
    <article className="szczegoly-karta-grupy">
      <header className="szczegoly-karta-grupy__naglowek">
        <div>
          <h3>{grupa.nazwa}</h3>
          <span>{liczbaDni ? `${liczbaDni} dni` : 'Termin bez dat'}</span>
        </div>
        <button type="button" onClick={() => usunGrupe(grupa.id)}>
          Usuń grupę
        </button>
      </header>

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleTekstowe
          etykieta="Nazwa grupy"
          pole={`grupy.${indeks}.nazwa`}
          statusyPol={statusyPol}
          wartosc={grupa.nazwa}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, nazwa: wartosc }), `grupy.${indeks}.nazwa`)}
        />
        <PoleWyboru
          etykieta="Status terminu"
          pole={`grupy.${indeks}.statusTerminu`}
          statusyPol={statusyPol}
          opcje={['Niepotwierdzony', 'Potwierdzony', 'Do ustalenia']}
          wartosc={grupa.statusTerminu}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, statusTerminu: wartosc as StatusTerminu }), `grupy.${indeks}.statusTerminu`)}
        />
        <PoleWyboru
          etykieta="Forma szkolenia"
          pole={`grupy.${indeks}.formaSzkolenia`}
          statusyPol={statusyPol}
          opcje={['Stacjonarne', 'Online', 'Hybrydowe']}
          wartosc={grupa.formaSzkolenia}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, formaSzkolenia: wartosc as FormaSzkolenia }), `grupy.${indeks}.formaSzkolenia`)}
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
        <PoleTekstowe
          etykieta="Godzina rozpoczęcia"
          pole={`grupy.${indeks}.godzinaRozpoczecia`}
          statusyPol={statusyPol}
          typ="time"
          wartosc={grupa.godzinaRozpoczecia}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, godzinaRozpoczecia: wartosc }), `grupy.${indeks}.godzinaRozpoczecia`)}
        />
        <PoleTekstowe
          etykieta="Godzina zakończenia"
          pole={`grupy.${indeks}.godzinaZakonczenia`}
          statusyPol={statusyPol}
          typ="time"
          wartosc={grupa.godzinaZakonczenia}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, godzinaZakonczenia: wartosc }), `grupy.${indeks}.godzinaZakonczenia`)}
        />
      </div>

      <div className="szczegoly-siatka szczegoly-siatka--cztery">
        <PoleLiczbowe
          etykieta="Cena netto"
          pole={`grupy.${indeks}.cenaNetto`}
          statusyPol={statusyPol}
          min={0}
          krok={0.01}
          wartosc={grupa.cenaNetto}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, cenaNetto: wartosc }), `grupy.${indeks}.cenaNetto`)}
        />
        <PoleWyboru
          etykieta="VAT"
          pole={`grupy.${indeks}.vat`}
          statusyPol={statusyPol}
          opcje={['23%', '8%', '0%', 'zwolnione', 'brak']}
          wartosc={grupa.vat}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, vat: wartosc as GrupaSzkoleniowa['vat'] }), `grupy.${indeks}.vat`)}
        />
        <label className="szczegoly-pole">
          <span className="szczegoly-pole__naglowek">Cena brutto</span>
          <output>{grupa.cenaBrutto.toFixed(2)} zł</output>
        </label>
        <PoleWyboru
          etykieta="Tryb ceny"
          pole={`grupy.${indeks}.trybCeny`}
          statusyPol={statusyPol}
          opcje={['za grupę', 'za uczestnika']}
          wartosc={grupa.trybCeny}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, trybCeny: wartosc as TrybCeny }), `grupy.${indeks}.trybCeny`)}
        />
      </div>

      {czySplitPayment && <p className="szczegoly-ostrzezenie">Kwota brutto przekracza 15 000 zł. Sprawdź split payment.</p>}

      <div className="szczegoly-siatka szczegoly-siatka--trzy">
        <PoleLiczbowe
          etykieta="Liczba godzin"
          pole={`grupy.${indeks}.liczbaGodzin`}
          statusyPol={statusyPol}
          min={0}
          krok={0.5}
          wartosc={grupa.liczbaGodzin}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, liczbaGodzin: wartosc }), `grupy.${indeks}.liczbaGodzin`)}
        />
        <PoleWyboru
          etykieta="Rodzaj godzin"
          pole={`grupy.${indeks}.rodzajGodzin`}
          statusyPol={statusyPol}
          opcje={['dydaktyczne', 'zegarowe', 'niestandardowe']}
          wartosc={grupa.rodzajGodzin}
          ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, rodzajGodzin: wartosc as RodzajGodzin }), `grupy.${indeks}.rodzajGodzin`)}
        />
        <PoleTekstowe
          etykieta="Niestandardowa formuła godzin"
          pole={`grupy.${indeks}.niestandardowaFormulaGodzin`}
          statusyPol={statusyPol}
          wartosc={grupa.niestandardowaFormulaGodzin}
          ustawWartosc={(wartosc) =>
            aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, niestandardowaFormulaGodzin: wartosc }), `grupy.${indeks}.niestandardowaFormulaGodzin`)
          }
        />
      </div>

      {czyPokazacLokalizacje && (
        <section className="szczegoly-podsekcja">
          <h4>Lokalizacja</h4>
          <div className="szczegoly-siatka szczegoly-siatka--trzy">
            <PoleWyboru
              etykieta="Lokalizacja z kartoteki"
              pole={`grupy.${indeks}.lokalizacjaId`}
              statusyPol={statusyPol}
              opcje={['', ...lokalizacjeKartoteki.map((lokalizacja) => lokalizacja.id)]}
              wartosc={grupa.lokalizacjaId}
              ustawWartosc={wybierzLokalizacje}
            />
            <div className="szczegoly-pole szczegoly-miejscownik-podglad">
              <span className="szczegoly-pole__naglowek">
                <span>Aktualny miejscownik</span>
              </span>
              <output>{grupa.miejscownik || '-'}</output>
              <button type="button" onClick={otworzEdytorMiejscownika}>
                Edytuj miejscownik
              </button>
            </div>
            <div className="szczegoly-pole szczegoly-miejscownik-podglad">
              <span className="szczegoly-pole__naglowek">
                <span>Status miejscownika</span>
              </span>
              <output>{grupa.miejscownikPotwierdzony ? 'Potwierdzona' : 'Niepotwierdzona'}</output>
            </div>
          </div>
          {!grupa.miejscownikPotwierdzony && <p className="szczegoly-ostrzezenie">Odmiana miejscownika nie jest potwierdzona.</p>}
          <div className="szczegoly-siatka szczegoly-siatka--dwa">
            <PoleTekstowe
              etykieta="Miejsce"
              pole={`grupy.${indeks}.miejsce`}
              statusyPol={statusyPol}
              wartosc={grupa.miejsce}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, miejsce: wartosc }), `grupy.${indeks}.miejsce`)}
            />
            <PoleTekstowe
              etykieta="Kto zapewnia salę"
              pole={`grupy.${indeks}.ktoZapewniaSale`}
              statusyPol={statusyPol}
              wartosc={grupa.ktoZapewniaSale}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, ktoZapewniaSale: wartosc }), `grupy.${indeks}.ktoZapewniaSale`)}
            />
          </div>
          <div className="szczegoly-siatka szczegoly-siatka--trzy">
            <PoleTekstowe
              etykieta="Nazwa lokalizacji"
              pole={`grupy.${indeks}.nazwaLokalizacji`}
              statusyPol={statusyPol}
              wartosc={grupa.nazwaLokalizacji}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, nazwaLokalizacji: wartosc }), `grupy.${indeks}.nazwaLokalizacji`)}
            />
            <PoleTekstowe
              etykieta="Adres lokalizacji"
              pole={`grupy.${indeks}.adresLokalizacji`}
              statusyPol={statusyPol}
              wartosc={grupa.adresLokalizacji}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, adresLokalizacji: wartosc }), `grupy.${indeks}.adresLokalizacji`)}
            />
            <PoleTekstowe
              etykieta="Sala"
              pole={`grupy.${indeks}.sala`}
              statusyPol={statusyPol}
              wartosc={grupa.sala}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, sala: wartosc }), `grupy.${indeks}.sala`)}
            />
          </div>
          <PoleTekstoweWielowierszowe
            etykieta="Informacje dojazdowe"
            pole={`grupy.${indeks}.informacjeDojazdowe`}
            statusyPol={statusyPol}
            wartosc={grupa.informacjeDojazdowe}
            ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, informacjeDojazdowe: wartosc }), `grupy.${indeks}.informacjeDojazdowe`)}
          />
        </section>
      )}

      {czyPokazacOnline && (
        <section className="szczegoly-podsekcja">
          <h4>Online</h4>
          <div className="szczegoly-siatka szczegoly-siatka--cztery">
            <PoleWyboru
              etykieta="Platforma"
              pole={`grupy.${indeks}.platformaOnline`}
              statusyPol={statusyPol}
              opcje={['Zoom', 'Microsoft Teams', 'Inna']}
              wartosc={grupa.platformaOnline}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, platformaOnline: wartosc as GrupaSzkoleniowa['platformaOnline'] }), `grupy.${indeks}.platformaOnline`)}
            />
            <PoleTekstowe
              etykieta="Link do spotkania"
              pole={`grupy.${indeks}.linkOnline`}
              statusyPol={statusyPol}
              typ="url"
              wartosc={grupa.linkOnline}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, linkOnline: wartosc }), `grupy.${indeks}.linkOnline`)}
            />
            <PoleTekstowe
              etykieta="Hasło / kod dostępu"
              pole={`grupy.${indeks}.kodDostepuOnline`}
              statusyPol={statusyPol}
              wartosc={grupa.kodDostepuOnline}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, kodDostepuOnline: wartosc }), `grupy.${indeks}.kodDostepuOnline`)}
            />
            <PoleTekstowe
              etykieta="Informacje techniczne"
              pole={`grupy.${indeks}.informacjeTechniczne`}
              statusyPol={statusyPol}
              wartosc={grupa.informacjeTechniczne}
              ustawWartosc={(wartosc) => aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, informacjeTechniczne: wartosc }), `grupy.${indeks}.informacjeTechniczne`)}
            />
          </div>
        </section>
      )}

      <section className="szczegoly-podsekcja">
        <h4>Trenerzy</h4>
        <div className="szczegoly-siatka szczegoly-siatka--trzy">
          <label className="szczegoly-pole">
            <span className="szczegoly-pole__naglowek">Wybór trenera z kartoteki</span>
            <select value={wybranyTrenerId} onChange={(zdarzenie) => ustawWybranyTrenerId(zdarzenie.target.value)}>
              {trenerzyKartoteki.map((trener) => (
                <option key={trener.id} value={trener.id}>
                  {trener.imieNazwisko}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={dodajWybranegoTrenera}>
            Dodaj trenera do grupy
          </button>
          <span className="szczegoly-licznik">{grupa.trenerzy.length} przypisanych</span>
        </div>

        <div className="szczegoly-lista-trenerow">
          {grupa.trenerzy.map((trener) => (
            <div className="szczegoly-trener" key={trener.id}>
              <strong>{trener.imieNazwisko}</strong>
              <span>{trener.telefon || '-'}</span>
              <span>{trener.email || '-'}</span>
              <button type="button" onClick={() => zastosujTreneraDoWszystkichGrup(trener)}>
                Ten trener szkoli każdą grupę
              </button>
              <button type="button" onClick={() => usunTreneraZGrupy(grupa.id, trener.id)}>
                Usuń
              </button>
            </div>
          ))}
        </div>

        <div className="szczegoly-siatka szczegoly-siatka--cztery">
          <PoleTekstowe
            etykieta="Nowy trener"
            pole={`grupy.${indeks}.nowyTrener.imieNazwisko`}
            statusyPol={statusyPol}
            wartosc={nowyTrener.imieNazwisko}
            ustawWartosc={(wartosc) => ustawNowyTrener((obecny) => ({ ...obecny, imieNazwisko: wartosc }))}
          />
          <PoleTekstowe
            etykieta="Telefon"
            pole={`grupy.${indeks}.nowyTrener.telefon`}
            statusyPol={statusyPol}
            typ="tel"
            wartosc={nowyTrener.telefon}
            ustawWartosc={(wartosc) => ustawNowyTrener((obecny) => ({ ...obecny, telefon: wartosc }))}
          />
          <PoleTekstowe
            etykieta="E-mail"
            pole={`grupy.${indeks}.nowyTrener.email`}
            statusyPol={statusyPol}
            typ="email"
            wartosc={nowyTrener.email}
            ustawWartosc={(wartosc) => ustawNowyTrener((obecny) => ({ ...obecny, email: wartosc }))}
          />
          <button type="button" onClick={dodajNowegoTrenera}>
            Dodaj nowego trenera do bazy
          </button>
        </div>
      </section>

      {!czyKontaktWspolny && (
        <section className="szczegoly-podsekcja">
          <h4>Kontakt grupy</h4>
          <div className="szczegoly-siatka szczegoly-siatka--trzy">
            <PoleTekstowe
              etykieta="Koordynator klienta"
              pole={`grupy.${indeks}.koordynatorKlienta.imieNazwisko`}
              statusyPol={statusyPol}
              wartosc={grupa.koordynatorKlienta.imieNazwisko}
              ustawWartosc={(wartosc) =>
                aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, koordynatorKlienta: { ...obecna.koordynatorKlienta, imieNazwisko: wartosc } }), `grupy.${indeks}.koordynatorKlienta.imieNazwisko`)
              }
            />
            <PoleTekstowe
              etykieta="E-mail"
              pole={`grupy.${indeks}.koordynatorKlienta.email`}
              statusyPol={statusyPol}
              typ="email"
              wartosc={grupa.koordynatorKlienta.email}
              ustawWartosc={(wartosc) =>
                aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, koordynatorKlienta: { ...obecna.koordynatorKlienta, email: wartosc } }), `grupy.${indeks}.koordynatorKlienta.email`)
              }
            />
            <PoleTekstowe
              etykieta="Telefon"
              pole={`grupy.${indeks}.koordynatorKlienta.telefon`}
              statusyPol={statusyPol}
              typ="tel"
              wartosc={grupa.koordynatorKlienta.telefon}
              ustawWartosc={(wartosc) =>
                aktualizujGrupe(grupa.id, (obecna) => ({ ...obecna, koordynatorKlienta: { ...obecna.koordynatorKlienta, telefon: wartosc } }), `grupy.${indeks}.koordynatorKlienta.telefon`)
              }
            />
          </div>
        </section>
      )}

      {czyEdytorMiejscownikaOtwarty && (
        <div className="szczegoly-modal" role="presentation">
          <form className="szczegoly-modal__okno" role="dialog" aria-modal="true" aria-labelledby={`edytor-miejscownika-${grupa.id}`} onSubmit={(zdarzenie) => {
            zdarzenie.preventDefault()
            zapiszMiejscownik()
          }}>
            <h4 id={`edytor-miejscownika-${grupa.id}`}>Edycja miejscownika</h4>
            <label className="szczegoly-pole">
              <span className="szczegoly-pole__naglowek">Miejscownik</span>
              <input value={roboczyMiejscownik} onChange={(zdarzenie) => ustawRoboczyMiejscownik(zdarzenie.target.value)} />
            </label>
            <label className="szczegoly-przelacznik">
              <input
                checked={czyRoboczyMiejscownikPotwierdzony}
                role="switch"
                type="checkbox"
                onChange={(zdarzenie) => ustawCzyRoboczyMiejscownikPotwierdzony(zdarzenie.target.checked)}
              />
              <span className="szczegoly-przelacznik__tor">
                <span className="szczegoly-przelacznik__uchwyt" />
              </span>
              <span>{czyRoboczyMiejscownikPotwierdzony ? 'Potwierdzona' : 'Niepotwierdzona'}</span>
            </label>
            <div className="szczegoly-modal__akcje">
              <button type="button" onClick={zamknijEdytorMiejscownika}>
                Anuluj
              </button>
              <button type="submit">Zapisz</button>
            </div>
          </form>
        </div>
      )}
    </article>
  )
}
