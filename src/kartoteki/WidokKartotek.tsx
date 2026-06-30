import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { lokalizacjeKartoteki, trenerzyKartotekiStartowi } from '../moduly/zamkniete/szczegoly_organizacyjne/stale'
import { pobierzSzablonyDokumentow, type SzablonDokumentu } from '../wspolne/dokumenty/szablonyDokumentow'
import './widokKartotek.css'

type ZakladkaKartotek = 'trenerzy' | 'klienci' | 'lokalizacje' | 'szablony_dokumentow'
type StatusTrenera = 'Aktywny' | 'Nieaktywny'
type FiltrStatusuTrenera = 'aktywni' | 'nieaktywni' | 'wszyscy'
type FiltrStatusuOdmiany = 'wszystkie' | 'potwierdzone' | 'niepotwierdzone'

type WlasciwosciWidokuKartotek = {
  aktywnaZakladkaPoczatkowa?: ZakladkaKartotek
}

type TrenerKartoteki = {
  id: string
  imie: string
  nazwisko: string
  telefon: string
  email: string
  status: StatusTrenera
}

type KlientKartoteki = {
  id: string
  nazwa: string
  nip: string
  ulica: string
  nrBudynku: string
  nrLokalu: string
  kodPocztowy: string
  miasto: string
  kraj: string
  koordynator: string
  telefonKoordynatora: string
  emailKoordynatora: string
}

type LokalizacjaKartoteki = {
  id: string
  nazwa: string
  wojewodztwo: string
  rodzaj: string
  gmina: string
  powiat: string
  miejscownik: string
  miejscownikPotwierdzony: boolean
}

type FormularzTrenera = Omit<TrenerKartoteki, 'id'>
type FormularzKlienta = Omit<KlientKartoteki, 'id'>
type FormularzLokalizacji = Omit<LokalizacjaKartoteki, 'id'>

const zakladkiKartotek: { id: ZakladkaKartotek; etykieta: string }[] = [
  { id: 'trenerzy', etykieta: 'Trenerzy' },
  { id: 'klienci', etykieta: 'Klienci' },
  { id: 'lokalizacje', etykieta: 'Lokalizacje' },
  { id: 'szablony_dokumentow', etykieta: 'Szablony dokumentów' },
]

const opcjeLiczbyPozycji = [10, 20, 50, 100]

const pustyFormularzTrenera: FormularzTrenera = {
  imie: '',
  nazwisko: '',
  telefon: '',
  email: '',
  status: 'Aktywny',
}

const pustyFormularzKlienta: FormularzKlienta = {
  nazwa: '',
  nip: '',
  ulica: '',
  nrBudynku: '',
  nrLokalu: '',
  kodPocztowy: '',
  miasto: '',
  kraj: 'Polska',
  koordynator: '',
  telefonKoordynatora: '',
  emailKoordynatora: '',
}

const pustyFormularzLokalizacji: FormularzLokalizacji = {
  nazwa: '',
  wojewodztwo: '',
  rodzaj: '',
  gmina: '',
  powiat: '',
  miejscownik: '',
  miejscownikPotwierdzony: false,
}

const klienciStartowi: KlientKartoteki[] = [
  {
    id: 'klient-adamex',
    nazwa: 'Adamex',
    nip: '123456789',
    ulica: 'Adamska',
    nrBudynku: '12',
    nrLokalu: '70-798',
    kodPocztowy: '70-798',
    miasto: 'Szczecin',
    kraj: 'Polska',
    koordynator: 'Adam Skała',
    telefonKoordynatora: '',
    emailKoordynatora: '',
  },
]

const lokalizacjeDodatkowe: LokalizacjaKartoteki[] = [
  {
    id: 'lokalizacja-abram',
    nazwa: 'Abram',
    wojewodztwo: 'łódzkie',
    rodzaj: 'część wsi Tychów',
    gmina: 'Czarnocin',
    powiat: 'piotrkowski',
    miejscownik: 'Abramie',
    miejscownikPotwierdzony: true,
  },
  {
    id: 'lokalizacja-abisynia',
    nazwa: 'Abisynia',
    wojewodztwo: 'kujawsko-pomorskie',
    rodzaj: 'część wsi Turzyn',
    gmina: 'Kcynia',
    powiat: 'nakielski',
    miejscownik: 'Abisynii',
    miejscownikPotwierdzony: false,
  },
  {
    id: 'lokalizacja-abisynia-gorska',
    nazwa: 'Abisynia Górska',
    wojewodztwo: 'pomorskie',
    rodzaj: 'część wsi Górki',
    gmina: 'Karsin',
    powiat: 'kościerski',
    miejscownik: 'Abisynii Górskiej',
    miejscownikPotwierdzony: false,
  },
]

const kluczTrenerow = 'ultimate-pomagier.kartoteki.trenerzy'
const kluczKlientow = 'ultimate-pomagier.kartoteki.klienci'
const kluczLokalizacji = 'ultimate-pomagier.kartoteki.lokalizacje'

function utworzId(prefiks: string) {
  return `${prefiks}-${Date.now()}`
}

function pobierzZMagazynu<T>(klucz: string, wartoscDomyslna: T[]): T[] {
  try {
    const zapis = localStorage.getItem(klucz)
    const dane = zapis ? JSON.parse(zapis) : null

    return Array.isArray(dane) ? dane : wartoscDomyslna
  } catch {
    return wartoscDomyslna
  }
}

function zapiszWMagazynie<T>(klucz: string, wartosc: T[]) {
  try {
    localStorage.setItem(klucz, JSON.stringify(wartosc))
  } catch {
    return
  }
}

function rozdzielImieNazwisko(imieNazwisko: string) {
  const czesci = imieNazwisko.trim().split(/\s+/)
  const nazwisko = czesci.length > 1 ? czesci.pop() ?? '' : ''

  return {
    imie: czesci.join(' ') || imieNazwisko,
    nazwisko,
  }
}

function przygotujTrenerowStartowych(): TrenerKartoteki[] {
  return trenerzyKartotekiStartowi.map((trener) => ({
    id: trener.id,
    ...rozdzielImieNazwisko(trener.imieNazwisko),
    telefon: trener.telefon,
    email: trener.email,
    status: 'Aktywny',
  }))
}

function przygotujLokalizacjeStartowe(): LokalizacjaKartoteki[] {
  const lokalizacjeZeSzczegolow = lokalizacjeKartoteki.map((lokalizacja) => ({
    id: `lokalizacja-${lokalizacja.id}`,
    nazwa: lokalizacja.nazwa,
    wojewodztwo: '',
    rodzaj: '',
    gmina: lokalizacja.nazwa,
    powiat: '',
    miejscownik: lokalizacja.miejscownik,
    miejscownikPotwierdzony: lokalizacja.miejscownikPotwierdzony,
  }))

  return [...lokalizacjeDodatkowe, ...lokalizacjeZeSzczegolow]
}

function normalizujTekst(wartosc: string) {
  return wartosc
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function czyPasujeDoWyszukiwania(pola: string[], szukanaFraza: string) {
  const fraza = normalizujTekst(szukanaFraza.trim())

  if (!fraza) {
    return true
  }

  return normalizujTekst(pola.join(' ')).includes(fraza)
}

function policzLiczbeStron(liczbaPozycji: number, liczbaPozycjiNaStronie: number) {
  return Math.max(1, Math.ceil(liczbaPozycji / liczbaPozycjiNaStronie))
}

function skopiujFormularzTrenera(trener: TrenerKartoteki): FormularzTrenera {
  return {
    imie: trener.imie,
    nazwisko: trener.nazwisko,
    telefon: trener.telefon,
    email: trener.email,
    status: trener.status,
  }
}

function skopiujFormularzKlienta(klient: KlientKartoteki): FormularzKlienta {
  return {
    nazwa: klient.nazwa,
    nip: klient.nip,
    ulica: klient.ulica,
    nrBudynku: klient.nrBudynku,
    nrLokalu: klient.nrLokalu,
    kodPocztowy: klient.kodPocztowy,
    miasto: klient.miasto,
    kraj: klient.kraj,
    koordynator: klient.koordynator,
    telefonKoordynatora: klient.telefonKoordynatora,
    emailKoordynatora: klient.emailKoordynatora,
  }
}

function skopiujFormularzLokalizacji(lokalizacja: LokalizacjaKartoteki): FormularzLokalizacji {
  return {
    nazwa: lokalizacja.nazwa,
    wojewodztwo: lokalizacja.wojewodztwo,
    rodzaj: lokalizacja.rodzaj,
    gmina: lokalizacja.gmina,
    powiat: lokalizacja.powiat,
    miejscownik: lokalizacja.miejscownik,
    miejscownikPotwierdzony: lokalizacja.miejscownikPotwierdzony,
  }
}

export default function WidokKartotek({ aktywnaZakladkaPoczatkowa = 'trenerzy' }: WlasciwosciWidokuKartotek) {
  const [aktywnaZakladka, ustawAktywnaZakladke] = useState<ZakladkaKartotek>(aktywnaZakladkaPoczatkowa)
  const [trenerzy, ustawTrenerow] = useState<TrenerKartoteki[]>(() => pobierzZMagazynu(kluczTrenerow, przygotujTrenerowStartowych()))
  const [klienci, ustawKlientow] = useState<KlientKartoteki[]>(() => pobierzZMagazynu(kluczKlientow, klienciStartowi))
  const [lokalizacje, ustawLokalizacje] = useState<LokalizacjaKartoteki[]>(() => pobierzZMagazynu(kluczLokalizacji, przygotujLokalizacjeStartowe()))
  const [szablonyDokumentow, ustawSzablonyDokumentow] = useState<SzablonDokumentu[]>(pobierzSzablonyDokumentow)

  const [filtrTrenerow, ustawFiltrTrenerow] = useState<FiltrStatusuTrenera>('aktywni')
  const [czyFormularzTreneraWidoczny, ustawCzyFormularzTreneraWidoczny] = useState(false)
  const [edytowanyTrenerId, ustawEdytowanyTrenerId] = useState<string | null>(null)
  const [formularzTrenera, ustawFormularzTrenera] = useState<FormularzTrenera>(pustyFormularzTrenera)

  const [szukanyKlient, ustawSzukanyKlient] = useState('')
  const [czyFormularzKlientaWidoczny, ustawCzyFormularzKlientaWidoczny] = useState(false)
  const [edytowanyKlientId, ustawEdytowanyKlientId] = useState<string | null>(null)
  const [formularzKlienta, ustawFormularzKlienta] = useState<FormularzKlienta>(pustyFormularzKlienta)

  const [szukanaLokalizacja, ustawSzukanaLokalizacja] = useState('')
  const [filtrWojewodztwa, ustawFiltrWojewodztwa] = useState('wszystkie')
  const [filtrStatusuOdmiany, ustawFiltrStatusuOdmiany] = useState<FiltrStatusuOdmiany>('wszystkie')
  const [liczbaPozycjiNaStronie, ustawLiczbePozycjiNaStronie] = useState(20)
  const [stronaLokalizacji, ustawStroneLokalizacji] = useState(1)
  const [czyFormularzLokalizacjiWidoczny, ustawCzyFormularzLokalizacjiWidoczny] = useState(false)
  const [edytowanaLokalizacjaId, ustawEdytowanaLokalizacjaId] = useState<string | null>(null)
  const [formularzLokalizacji, ustawFormularzLokalizacji] = useState<FormularzLokalizacji>(pustyFormularzLokalizacji)
  const [komunikat, ustawKomunikat] = useState('')

  useEffect(() => {
    zapiszWMagazynie(kluczTrenerow, trenerzy)
  }, [trenerzy])

  useEffect(() => {
    zapiszWMagazynie(kluczKlientow, klienci)
  }, [klienci])

  useEffect(() => {
    zapiszWMagazynie(kluczLokalizacji, lokalizacje)
  }, [lokalizacje])

  const trenerzyFiltrowani = useMemo(
    () =>
      trenerzy.filter((trener) => {
        if (filtrTrenerow === 'aktywni') {
          return trener.status === 'Aktywny'
        }

        if (filtrTrenerow === 'nieaktywni') {
          return trener.status === 'Nieaktywny'
        }

        return true
      }),
    [filtrTrenerow, trenerzy],
  )

  const klienciFiltrowani = useMemo(
    () =>
      klienci.filter((klient) =>
        czyPasujeDoWyszukiwania([klient.nazwa, klient.nip, klient.miasto, klient.kodPocztowy, klient.koordynator], szukanyKlient),
      ),
    [klienci, szukanyKlient],
  )

  const dostepneWojewodztwa = useMemo(
    () => [...new Set(lokalizacje.map((lokalizacja) => lokalizacja.wojewodztwo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl')),
    [lokalizacje],
  )

  const lokalizacjeFiltrowane = useMemo(
    () =>
      lokalizacje.filter((lokalizacja) => {
        const czyPasujeFraza = czyPasujeDoWyszukiwania(
          [lokalizacja.nazwa, lokalizacja.wojewodztwo, lokalizacja.rodzaj, lokalizacja.gmina, lokalizacja.powiat, lokalizacja.miejscownik],
          szukanaLokalizacja,
        )
        const czyPasujeWojewodztwo = filtrWojewodztwa === 'wszystkie' || lokalizacja.wojewodztwo === filtrWojewodztwa
        const czyPasujeStatus =
          filtrStatusuOdmiany === 'wszystkie' ||
          (filtrStatusuOdmiany === 'potwierdzone' && lokalizacja.miejscownikPotwierdzony) ||
          (filtrStatusuOdmiany === 'niepotwierdzone' && !lokalizacja.miejscownikPotwierdzony)

        return czyPasujeFraza && czyPasujeWojewodztwo && czyPasujeStatus
      }),
    [filtrStatusuOdmiany, filtrWojewodztwa, lokalizacje, szukanaLokalizacja],
  )

  const liczbaStronLokalizacji = policzLiczbeStron(lokalizacjeFiltrowane.length, liczbaPozycjiNaStronie)
  const bezpiecznaStronaLokalizacji = Math.min(stronaLokalizacji, liczbaStronLokalizacji)
  const poczatekStronyLokalizacji = (bezpiecznaStronaLokalizacji - 1) * liczbaPozycjiNaStronie
  const lokalizacjeNaStronie = useMemo(
    () => lokalizacjeFiltrowane.slice(poczatekStronyLokalizacji, poczatekStronyLokalizacji + liczbaPozycjiNaStronie),
    [liczbaPozycjiNaStronie, lokalizacjeFiltrowane, poczatekStronyLokalizacji],
  )

  function pokazKomunikat(tresc: string) {
    ustawKomunikat(tresc)
  }

  function otworzDodawanieTrenera() {
    ustawEdytowanyTrenerId(null)
    ustawFormularzTrenera(pustyFormularzTrenera)
    ustawCzyFormularzTreneraWidoczny(true)
  }

  function edytujTrenera(trener: TrenerKartoteki) {
    ustawEdytowanyTrenerId(trener.id)
    ustawFormularzTrenera(skopiujFormularzTrenera(trener))
    ustawCzyFormularzTreneraWidoczny(true)
  }

  function zapiszTrenera(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()

    if (!formularzTrenera.imie.trim() || !formularzTrenera.nazwisko.trim()) {
      return
    }

    if (edytowanyTrenerId) {
      ustawTrenerow((obecni) => obecni.map((trener) => (trener.id === edytowanyTrenerId ? { ...trener, ...formularzTrenera } : trener)))
      pokazKomunikat('Zapisano dane trenera.')
    } else {
      ustawTrenerow((obecni) => [...obecni, { id: utworzId('trener'), ...formularzTrenera }])
      pokazKomunikat('Dodano trenera do kartoteki.')
    }

    ustawFormularzTrenera(pustyFormularzTrenera)
    ustawEdytowanyTrenerId(null)
    ustawCzyFormularzTreneraWidoczny(false)
  }

  function duplikujTrenera(trener: TrenerKartoteki) {
    ustawTrenerow((obecni) => [...obecni, { ...trener, id: utworzId('trener'), nazwisko: `${trener.nazwisko} kopia` }])
    pokazKomunikat('Zduplikowano trenera.')
  }

  function usunTrenera(id: string) {
    ustawTrenerow((obecni) => obecni.filter((trener) => trener.id !== id))
    pokazKomunikat('Usunięto trenera z kartoteki.')
  }

  function ustawStatusTrenera(id: string, status: StatusTrenera) {
    ustawTrenerow((obecni) => obecni.map((trener) => (trener.id === id ? { ...trener, status } : trener)))
  }

  function otworzDodawanieKlienta() {
    ustawEdytowanyKlientId(null)
    ustawFormularzKlienta(pustyFormularzKlienta)
    ustawCzyFormularzKlientaWidoczny(true)
  }

  function edytujKlienta(klient: KlientKartoteki) {
    ustawEdytowanyKlientId(klient.id)
    ustawFormularzKlienta(skopiujFormularzKlienta(klient))
    ustawCzyFormularzKlientaWidoczny(true)
  }

  function zapiszKlienta(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()

    if (!formularzKlienta.nazwa.trim()) {
      return
    }

    if (edytowanyKlientId) {
      ustawKlientow((obecni) => obecni.map((klient) => (klient.id === edytowanyKlientId ? { ...klient, ...formularzKlienta } : klient)))
      pokazKomunikat('Zapisano dane klienta.')
    } else {
      ustawKlientow((obecni) => [...obecni, { id: utworzId('klient'), ...formularzKlienta }])
      pokazKomunikat('Dodano klienta do kartoteki.')
    }

    ustawFormularzKlienta(pustyFormularzKlienta)
    ustawEdytowanyKlientId(null)
    ustawCzyFormularzKlientaWidoczny(false)
  }

  function duplikujKlienta(klient: KlientKartoteki) {
    ustawKlientow((obecni) => [...obecni, { ...klient, id: utworzId('klient'), nazwa: `${klient.nazwa} kopia` }])
    pokazKomunikat('Zduplikowano klienta.')
  }

  function usunKlienta(id: string) {
    ustawKlientow((obecni) => obecni.filter((klient) => klient.id !== id))
    pokazKomunikat('Usunięto klienta z kartoteki.')
  }

  function otworzDodawanieLokalizacji() {
    ustawEdytowanaLokalizacjaId(null)
    ustawFormularzLokalizacji(pustyFormularzLokalizacji)
    ustawCzyFormularzLokalizacjiWidoczny(true)
  }

  function edytujLokalizacje(lokalizacja: LokalizacjaKartoteki) {
    ustawEdytowanaLokalizacjaId(lokalizacja.id)
    ustawFormularzLokalizacji(skopiujFormularzLokalizacji(lokalizacja))
    ustawCzyFormularzLokalizacjiWidoczny(true)
  }

  function zapiszLokalizacje(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()

    if (!formularzLokalizacji.nazwa.trim()) {
      return
    }

    if (edytowanaLokalizacjaId) {
      ustawLokalizacje((obecne) => obecne.map((lokalizacja) => (lokalizacja.id === edytowanaLokalizacjaId ? { ...lokalizacja, ...formularzLokalizacji } : lokalizacja)))
      pokazKomunikat('Zapisano dane lokalizacji.')
    } else {
      ustawLokalizacje((obecne) => [...obecne, { id: utworzId('lokalizacja'), ...formularzLokalizacji }])
      pokazKomunikat('Dodano lokalizację do kartoteki.')
    }

    ustawFormularzLokalizacji(pustyFormularzLokalizacji)
    ustawEdytowanaLokalizacjaId(null)
    ustawCzyFormularzLokalizacjiWidoczny(false)
  }

  function duplikujLokalizacje(lokalizacja: LokalizacjaKartoteki) {
    ustawLokalizacje((obecne) => [...obecne, { ...lokalizacja, id: utworzId('lokalizacja'), nazwa: `${lokalizacja.nazwa} kopia` }])
    pokazKomunikat('Zduplikowano lokalizację.')
  }

  function usunLokalizacje(id: string) {
    ustawLokalizacje((obecne) => obecne.filter((lokalizacja) => lokalizacja.id !== id))
    pokazKomunikat('Usunięto lokalizację z kartoteki.')
  }

  function zmienLiczbePozycjiNaStronie(wartosc: string) {
    ustawLiczbePozycjiNaStronie(Number(wartosc))
    ustawStroneLokalizacji(1)
  }

  function zmienFiltrLokalizacji(akcja: () => void) {
    akcja()
    ustawStroneLokalizacji(1)
  }

  function anulujFormularze() {
    ustawCzyFormularzTreneraWidoczny(false)
    ustawCzyFormularzKlientaWidoczny(false)
    ustawCzyFormularzLokalizacjiWidoczny(false)
    ustawEdytowanyTrenerId(null)
    ustawEdytowanyKlientId(null)
    ustawEdytowanaLokalizacjaId(null)
  }

  function odswiezSzablonyDokumentow() {
    ustawSzablonyDokumentow(pobierzSzablonyDokumentow())
    pokazKomunikat('Odświeżono szablony dokumentów.')
  }

  return (
    <section className="widok kartoteki">
      <nav className="kartoteki__zakladki" aria-label="Kartoteki">
        {zakladkiKartotek.map((zakladka) => (
          <button
            aria-current={aktywnaZakladka === zakladka.id ? 'page' : undefined}
            className={`kartoteki__przycisk${aktywnaZakladka === zakladka.id ? ' kartoteki__przycisk--glowny' : ''}`}
            key={zakladka.id}
            type="button"
            onClick={() => ustawAktywnaZakladke(zakladka.id)}
          >
            {zakladka.etykieta}
          </button>
        ))}
      </nav>

      {komunikat && <p className="kartoteki__komunikat">{komunikat}</p>}

      {aktywnaZakladka === 'trenerzy' && (
        <section className="kartoteki__widok">
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona" aria-hidden="true">
                ♙
              </span>
              <div>
                <h1>Kartoteka trenerów</h1>
                <p>Lokalna lista trenerów dostępnych do przypisania do grup szkoleniowych.</p>
              </div>
            </div>
          </header>

          <section className="kartoteki__panel">
            <div className="kartoteki__pasek">
              <div className="kartoteki__filtry">
                {(['aktywni', 'nieaktywni', 'wszyscy'] as FiltrStatusuTrenera[]).map((filtr) => (
                  <button
                    className={`kartoteki__przycisk${filtrTrenerow === filtr ? ' kartoteki__przycisk--glowny' : ''}`}
                    key={filtr}
                    type="button"
                    onClick={() => ustawFiltrTrenerow(filtr)}
                  >
                    {filtr === 'aktywni' ? 'Aktywni' : filtr === 'nieaktywni' ? 'Nieaktywni' : 'Wszyscy'}
                  </button>
                ))}
              </div>
              <button className="kartoteki__przycisk" type="button" onClick={otworzDodawanieTrenera}>
                + Dodaj nowego trenera do bazy
              </button>
            </div>

            {czyFormularzTreneraWidoczny && (
              <form className="kartoteki__formularz kartoteki__formularz--dwa" onSubmit={zapiszTrenera}>
                <input placeholder="Imię Trenera" value={formularzTrenera.imie} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, imie: zdarzenie.target.value }))} />
                <input placeholder="Nazwisko Trenera" value={formularzTrenera.nazwisko} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, nazwisko: zdarzenie.target.value }))} />
                <input placeholder="Telefon Trenera" value={formularzTrenera.telefon} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, telefon: zdarzenie.target.value }))} />
                <input placeholder="E-mail Trenera" value={formularzTrenera.email} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, email: zdarzenie.target.value }))} />
                <select value={formularzTrenera.status} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, status: zdarzenie.target.value as StatusTrenera }))}>
                  <option>Aktywny</option>
                  <option>Nieaktywny</option>
                </select>
                <div className="kartoteki__akcje-formularza">
                  <button className="kartoteki__przycisk kartoteki__przycisk--jasny" type="submit">
                    Zapisz
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={anulujFormularze}>
                    Anuluj
                  </button>
                </div>
              </form>
            )}
          </section>

          <div className="kartoteki__lista">
            {trenerzyFiltrowani.map((trener) => (
              <article className="kartoteki__wiersz" key={trener.id}>
                <div>
                  <strong>{`${trener.imie} ${trener.nazwisko}`.trim()}</strong>
                  <span>
                    {trener.telefon || '-'} | {trener.email || '-'}
                  </span>
                </div>
                <div className="kartoteki__akcje">
                  <select value={trener.status} onChange={(zdarzenie) => ustawStatusTrenera(trener.id, zdarzenie.target.value as StatusTrenera)}>
                    <option>Aktywny</option>
                    <option>Nieaktywny</option>
                  </select>
                  <button className="kartoteki__przycisk" type="button" onClick={() => pokazKomunikat(`Podgląd trenera: ${trener.imie} ${trener.nazwisko}`)}>
                    Podgląd
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => edytujTrenera(trener)}>
                    Edytuj
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => duplikujTrenera(trener)}>
                    Duplikuj
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => usunTrenera(trener.id)}>
                    Usuń
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {aktywnaZakladka === 'klienci' && (
        <section className="kartoteki__widok">
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona" aria-hidden="true">
                ♧
              </span>
              <div>
                <h1>Kartoteka klientów</h1>
                <p>Lokalna baza klientów używana roboczo przez generator szczegółów organizacyjnych.</p>
              </div>
            </div>
          </header>

          <section className="kartoteki__panel">
            <div className="kartoteki__pasek">
              <input className="kartoteki__wyszukiwarka" placeholder="Szukaj po nazwie, NIP, mieście lub kodzie" value={szukanyKlient} onChange={(zdarzenie) => ustawSzukanyKlient(zdarzenie.target.value)} />
              <button className="kartoteki__przycisk" type="button" onClick={otworzDodawanieKlienta}>
                + Dodaj klienta
              </button>
            </div>

            {czyFormularzKlientaWidoczny && (
              <form className="kartoteki__formularz kartoteki__formularz--trzy" onSubmit={zapiszKlienta}>
                <input className="kartoteki__pole-szerokie" placeholder="Nazwa klienta" value={formularzKlienta.nazwa} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nazwa: zdarzenie.target.value }))} />
                <input placeholder="NIP" value={formularzKlienta.nip} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nip: zdarzenie.target.value }))} />
                <input placeholder="Ulica" value={formularzKlienta.ulica} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, ulica: zdarzenie.target.value }))} />
                <input placeholder="Nr budynku" value={formularzKlienta.nrBudynku} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nrBudynku: zdarzenie.target.value }))} />
                <input placeholder="Nr lokalu" value={formularzKlienta.nrLokalu} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nrLokalu: zdarzenie.target.value }))} />
                <input placeholder="Kod pocztowy" value={formularzKlienta.kodPocztowy} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, kodPocztowy: zdarzenie.target.value }))} />
                <input placeholder="Miasto" value={formularzKlienta.miasto} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, miasto: zdarzenie.target.value }))} />
                <input placeholder="Kraj" value={formularzKlienta.kraj} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, kraj: zdarzenie.target.value }))} />
                <input placeholder="Koordynator klienta" value={formularzKlienta.koordynator} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, koordynator: zdarzenie.target.value }))} />
                <input placeholder="Telefon koordynatora" value={formularzKlienta.telefonKoordynatora} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, telefonKoordynatora: zdarzenie.target.value }))} />
                <input placeholder="E-mail koordynatora" value={formularzKlienta.emailKoordynatora} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, emailKoordynatora: zdarzenie.target.value }))} />
                <div className="kartoteki__akcje-formularza">
                  <button className="kartoteki__przycisk kartoteki__przycisk--jasny" type="submit">
                    Zapisz klienta
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={anulujFormularze}>
                    Anuluj
                  </button>
                </div>
              </form>
            )}
          </section>

          <div className="kartoteki__lista">
            {klienciFiltrowani.map((klient) => (
              <article className="kartoteki__wiersz" key={klient.id}>
                <div>
                  <strong>{klient.nazwa}</strong>
                  <span>
                    {klient.nip || '-'} | {klient.ulica} {klient.nrBudynku}
                    {klient.nrLokalu ? `/${klient.nrLokalu}` : ''}, {klient.kodPocztowy} {klient.miasto}, {klient.kraj}
                  </span>
                  <span>Koordynator: {klient.koordynator || '-'}</span>
                </div>
                <div className="kartoteki__akcje">
                  <button className="kartoteki__przycisk" type="button" onClick={() => pokazKomunikat(`Podgląd klienta: ${klient.nazwa}`)}>
                    Podgląd
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => edytujKlienta(klient)}>
                    Edytuj
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => duplikujKlienta(klient)}>
                    Duplikuj
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => usunKlienta(klient.id)}>
                    Usuń
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {aktywnaZakladka === 'lokalizacje' && (
        <section className="kartoteki__widok">
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona kartoteki__ikona--zolty" aria-hidden="true">
                ⌖
              </span>
              <div>
                <h1>Kartoteka lokalizacji</h1>
                <p>Lokalna baza miejscowości i miejscowników importowana z pliku CSV.</p>
              </div>
            </div>
          </header>

          <section className="kartoteki__panel">
            <div className="kartoteki__formularz kartoteki__formularz--trzy">
              <input
                className="kartoteki__pole-szerokie"
                placeholder="Szukaj po nazwie, gminie, powiecie lub miejscowniku"
                value={szukanaLokalizacja}
                onChange={(zdarzenie) => zmienFiltrLokalizacji(() => ustawSzukanaLokalizacja(zdarzenie.target.value))}
              />
              <select value={filtrWojewodztwa} onChange={(zdarzenie) => zmienFiltrLokalizacji(() => ustawFiltrWojewodztwa(zdarzenie.target.value))}>
                <option value="wszystkie">Wszystkie województwa</option>
                {dostepneWojewodztwa.map((wojewodztwo) => (
                  <option key={wojewodztwo} value={wojewodztwo}>
                    {wojewodztwo}
                  </option>
                ))}
              </select>
              <select value={filtrStatusuOdmiany} onChange={(zdarzenie) => zmienFiltrLokalizacji(() => ustawFiltrStatusuOdmiany(zdarzenie.target.value as FiltrStatusuOdmiany))}>
                <option value="wszystkie">Wszystkie statusy</option>
                <option value="potwierdzone">Potwierdzone</option>
                <option value="niepotwierdzone">Niepotwierdzone</option>
              </select>
            </div>
            <div className="kartoteki__pasek">
              <span>
                Załadowano {lokalizacje.length} lokalizacji. Widocznych pozycji: {lokalizacjeNaStronie.length} z {lokalizacjeFiltrowane.length}.
              </span>
              <div className="kartoteki__akcje">
                <label className="kartoteki__liczba-pozycji">
                  Pozycji na stronie
                  <select value={liczbaPozycjiNaStronie} onChange={(zdarzenie) => zmienLiczbePozycjiNaStronie(zdarzenie.target.value)}>
                    {opcjeLiczbyPozycji.map((opcja) => (
                      <option key={opcja} value={opcja}>
                        {opcja}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="kartoteki__przycisk" type="button" onClick={otworzDodawanieLokalizacji}>
                  + Dodaj lokalizację
                </button>
              </div>
            </div>
          </section>

          {czyFormularzLokalizacjiWidoczny && (
            <form className="kartoteki__panel kartoteki__formularz" onSubmit={zapiszLokalizacje}>
              <strong>{edytowanaLokalizacjaId ? `Edycja miejscownika: ${formularzLokalizacji.nazwa}` : 'Nowa lokalizacja'}</strong>
              <div className="kartoteki__formularz kartoteki__formularz--trzy">
                <input placeholder="Nazwa" value={formularzLokalizacji.nazwa} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, nazwa: zdarzenie.target.value }))} />
                <input placeholder="Województwo" value={formularzLokalizacji.wojewodztwo} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, wojewodztwo: zdarzenie.target.value }))} />
                <input placeholder="Rodzaj" value={formularzLokalizacji.rodzaj} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, rodzaj: zdarzenie.target.value }))} />
                <input placeholder="Gmina" value={formularzLokalizacji.gmina} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, gmina: zdarzenie.target.value }))} />
                <input placeholder="Powiat" value={formularzLokalizacji.powiat} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, powiat: zdarzenie.target.value }))} />
                <input placeholder="Miejscownik" value={formularzLokalizacji.miejscownik} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, miejscownik: zdarzenie.target.value }))} />
                <select value={formularzLokalizacji.miejscownikPotwierdzony ? 'potwierdzona' : 'niepotwierdzona'} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, miejscownikPotwierdzony: zdarzenie.target.value === 'potwierdzona' }))}>
                  <option value="potwierdzona">Potwierdzona</option>
                  <option value="niepotwierdzona">Niepotwierdzona</option>
                </select>
              </div>
              <div className="kartoteki__akcje-formularza">
                <button className="kartoteki__przycisk kartoteki__przycisk--jasny" type="submit">
                  Zapisz
                </button>
                <button className="kartoteki__przycisk" type="button" onClick={anulujFormularze}>
                  Anuluj
                </button>
              </div>
            </form>
          )}

          <div className="kartoteki__tabela-opakowanie">
            <table className="kartoteki__tabela">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Województwo</th>
                  <th>Rodzaj</th>
                  <th>Gmina</th>
                  <th>Powiat</th>
                  <th>Miejscownik</th>
                  <th>Status odmiany</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {lokalizacjeNaStronie.map((lokalizacja) => (
                  <tr key={lokalizacja.id}>
                    <td>{lokalizacja.nazwa}</td>
                    <td>{lokalizacja.wojewodztwo || '-'}</td>
                    <td>{lokalizacja.rodzaj || '-'}</td>
                    <td>{lokalizacja.gmina || '-'}</td>
                    <td>{lokalizacja.powiat || '-'}</td>
                    <td>{lokalizacja.miejscownik || '-'}</td>
                    <td className={lokalizacja.miejscownikPotwierdzony ? 'kartoteki__status kartoteki__status--ok' : 'kartoteki__status kartoteki__status--uwaga'}>
                      {lokalizacja.miejscownikPotwierdzony ? 'Potwierdzona' : 'Niepotwierdzona'}
                    </td>
                    <td>
                      <div className="kartoteki__akcje">
                        <button className="kartoteki__przycisk" type="button" onClick={() => pokazKomunikat(`Podgląd lokalizacji: ${lokalizacja.nazwa}`)}>
                          Podgląd
                        </button>
                        <button className="kartoteki__przycisk" type="button" onClick={() => edytujLokalizacje(lokalizacja)}>
                          Edytuj
                        </button>
                        <button className="kartoteki__przycisk" type="button" onClick={() => duplikujLokalizacje(lokalizacja)}>
                          Duplikuj
                        </button>
                        <button className="kartoteki__przycisk" type="button" onClick={() => usunLokalizacje(lokalizacja.id)}>
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="kartoteki__paginacja">
            <button className="kartoteki__przycisk" disabled={bezpiecznaStronaLokalizacji <= 1} type="button" onClick={() => ustawStroneLokalizacji((obecna) => Math.max(1, obecna - 1))}>
              Poprzednia
            </button>
            <span>
              Strona {bezpiecznaStronaLokalizacji} z {liczbaStronLokalizacji}
            </span>
            <button className="kartoteki__przycisk" disabled={bezpiecznaStronaLokalizacji >= liczbaStronLokalizacji} type="button" onClick={() => ustawStroneLokalizacji((obecna) => Math.min(liczbaStronLokalizacji, obecna + 1))}>
              Następna
            </button>
          </div>
        </section>
      )}

      {aktywnaZakladka === 'szablony_dokumentow' && (
        <section className="kartoteki__widok">
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona" aria-hidden="true">
                §
              </span>
              <div>
                <h1>Szablony dokumentów</h1>
                <p>Wzorce zapisane z Replikatora dokumentów.</p>
              </div>
            </div>
            <button className="kartoteki__przycisk" type="button" onClick={odswiezSzablonyDokumentow}>
              Odśwież
            </button>
          </header>

          <div className="kartoteki__lista">
            {szablonyDokumentow.length ? szablonyDokumentow.map((szablon) => (
              <article className="kartoteki__wiersz" key={szablon.id}>
                <div>
                  <strong>{szablon.nazwa}</strong>
                  <span>
                    {szablon.typDokumentu ?? 'typ nieokreślony'} | {szablon.marka} | wersja {szablon.wersja} | {szablon.status}
                  </span>
                  <span>{szablon.miniatura}</span>
                  <span>Tagi: {szablon.tagi.join(', ') || '-'}</span>
                  <span>Oryginał: {szablon.oryginalnyPlik ?? '-'}</span>
                </div>
                <div className="kartoteki__akcje">
                  <button className="kartoteki__przycisk" type="button" onClick={() => pokazKomunikat(`Szablon klienta: ${szablon.klientNazwa ?? 'standardowy'}`)}>
                    Podgląd
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => pokazKomunikat(`Wersja szablonu: ${szablon.wersja}`)}>
                    Wersje
                  </button>
                </div>
              </article>
            )) : (
              <section className="kartoteki__panel">
                <p>Brak zapisanych szablonów dokumentów.</p>
              </section>
            )}
          </div>
        </section>
      )}
    </section>
  )
}
