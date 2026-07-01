import { useMemo, useState } from 'react'
import {
  poczatkowaFirma,
  poczatkowaGrupa,
  poczatkoweDaneFormularza,
  poczatkoweSzczegolyWzorowKlienta,
  poczatkoweWzoryKlienta,
  poczatkowiAdresaci,
  utworzPoczatkowaGrupe,
} from '../danePoczatkowe'
import { polaWymaganePoImporcie, trenerzyKartotekiStartowi } from '../stale'
import type {
  DaneAdresatow,
  DaneDokumentacjiMaterialow,
  DaneFirmy,
  DaneFormularza,
  FormaSzkolenia,
  GrupaSzkoleniowa,
  OswiadczenieVat,
  ProblemWalidacji,
  RodzajGodzin,
  StatusyPolImportu,
  TrenerKartoteki,
  WersjaRoboczaGeneratora,
} from '../typy'
import { utworzTekstSzczegolow } from '../uslugi/eksportSzczegolow'
import {
  pobierzAktualnaWersjeRobocza,
  pobierzKopieRobocze,
  wersjaEksportuSzczegolow,
  wyczyscAktualnaWersjeRobocza,
  zapiszWersjeRobocza,
  zbudujWersjeRobocza,
} from '../uslugi/magazynWersjiRoboczych'
import { parsujMailaSzczegolow } from '../uslugi/parserMailaSzczegolow'

const kluczTrenerowKartoteki = 'ultimate-pomagier.kartoteki.trenerzy'

function klonuj<Typ>(wartosc: Typ): Typ {
  return JSON.parse(JSON.stringify(wartosc)) as Typ
}

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc))
}

function czyEmailPoprawny(wartosc: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wartosc.trim())
}

function czyKodPocztowyPoprawny(wartosc: string) {
  return /^\d{2}-?\d{3}$/.test(wartosc.trim())
}

function podzielAdresatow(wartosc: string) {
  return wartosc
    .split(',')
    .map((adres) => adres.trim())
    .filter(Boolean)
}

function scalFirme(obecna: DaneFirmy, czesciowa?: Partial<DaneFirmy>) {
  return {
    ...poczatkowaFirma,
    ...obecna,
    ...czesciowa,
    kraj: czesciowa?.kraj || obecna.kraj || 'Polska',
  }
}

function scalDokumentacje(obecna: DaneDokumentacjiMaterialow, czesciowa?: Partial<DaneDokumentacjiMaterialow>) {
  return {
    ...obecna,
    ...czesciowa,
    wzoryKlienta: {
      ...poczatkoweWzoryKlienta,
      ...obecna.wzoryKlienta,
      ...czesciowa?.wzoryKlienta,
    },
    szczegolyWzorowKlienta: {
      ...poczatkoweSzczegolyWzorowKlienta,
      ...obecna.szczegolyWzorowKlienta,
      ...czesciowa?.szczegolyWzorowKlienta,
    },
  }
}

function mapujVat(wartosc: unknown): OswiadczenieVat {
  if (wartosc === 'Min. 70%' || wartosc === 'ZW – 100%' || wartosc === 'Nie – 23%') {
    return wartosc
  }

  if (wartosc === 'zwolnione' || wartosc === '0%' || wartosc === 'ZW - 100%') {
    return 'ZW – 100%'
  }

  if (wartosc === '70%' || wartosc === 'Min. 70%') {
    return 'Min. 70%'
  }

  return 'Nie – 23%'
}

function mapujRodzajGodzin(wartosc: unknown): RodzajGodzin {
  if (wartosc === 'Akademickie (45 min)' || wartosc === 'dydaktyczne') {
    return 'Akademickie (45 min)'
  }

  return 'Zajęciowe (60 min)'
}

function mapujForme(wartosc: unknown): FormaSzkolenia {
  return wartosc === 'Online' ? 'Online' : 'Stacjonarne'
}

function normalizujDane(dane?: Partial<DaneFormularza>): DaneFormularza {
  const obecne = dane ?? {}
  const nabywca = scalFirme(poczatkoweDaneFormularza.nabywca, obecne.nabywca)
  const odbiorca = scalFirme(poczatkoweDaneFormularza.odbiorca, obecne.odbiorca)
  const czyNabywcaJestOdbiorca = Boolean(obecne.czyNabywcaJestOdbiorca)

  return {
    ...klonuj(poczatkoweDaneFormularza),
    ...obecne,
    nazwaKlienta: obecne.nazwaKlienta ?? nabywca.nazwa ?? '',
    nabywca,
    odbiorca: czyNabywcaJestOdbiorca ? { ...nabywca } : odbiorca,
    czyNabywcaJestOdbiorca,
    wysylkaPaczkiDotyczy: Boolean(obecne.wysylkaPaczkiDotyczy),
    odbiorcaPaczki: {
      ...poczatkoweDaneFormularza.odbiorcaPaczki,
      ...obecne.odbiorcaPaczki,
      kraj: obecne.odbiorcaPaczki?.kraj || 'Polska',
    },
    dokumentacja: scalDokumentacje(poczatkoweDaneFormularza.dokumentacja, obecne.dokumentacja),
    logotypy: {
      ...poczatkoweDaneFormularza.logotypy,
      ...obecne.logotypy,
    },
    dodatkoweWymogi: {
      ...poczatkoweDaneFormularza.dodatkoweWymogi,
      ...obecne.dodatkoweWymogi,
      wzoryKlienta: {
        ...poczatkoweWzoryKlienta,
        ...obecne.dodatkoweWymogi?.wzoryKlienta,
      },
      szczegolyWzorowKlienta: {
        ...poczatkoweSzczegolyWzorowKlienta,
        ...obecne.dodatkoweWymogi?.szczegolyWzorowKlienta,
      },
    },
    uwagi: {
      ...poczatkoweDaneFormularza.uwagi,
      ...obecne.uwagi,
    },
  }
}

function normalizujGrupe(grupa?: Partial<GrupaSzkoleniowa>, indeks = 0): GrupaSzkoleniowa {
  const obecna = grupa ?? {}
  const formaSzkolenia = mapujForme(obecna.formaSzkolenia)
  const miejsce = formaSzkolenia === 'Online' ? 'Online' : obecna.miejsce === 'Online' ? '' : obecna.miejsce ?? ''

  return {
    ...klonuj(poczatkowaGrupa),
    ...obecna,
    id: obecna.id || `grupa-${indeks + 1}`,
    nazwa: obecna.nazwa || `Grupa ${indeks + 1}`,
    trenerzy: Array.isArray(obecna.trenerzy) ? obecna.trenerzy : [],
    formaSzkolenia,
    miejsce,
    liczbaUczestnikow: Number(obecna.liczbaUczestnikow) || 0,
    liczbaGodzin: Number(obecna.liczbaGodzin) || 0,
    cenaNetto: Number(obecna.cenaNetto) || 0,
    terminPlatnosci: Number(obecna.terminPlatnosci) || 0,
    rodzajGodzin: mapujRodzajGodzin(obecna.rodzajGodzin),
    trybCeny: String(obecna.trybCeny) === 'za osobę' || String(obecna.trybCeny) === 'za uczestnika' ? 'za osobę' : 'za grupę',
    vat: mapujVat(obecna.vat),
    protokol: Boolean(obecna.protokol),
    mechanizmPodzielonejPlatnosci: Boolean(obecna.mechanizmPodzielonejPlatnosci),
  }
}

function normalizujAdresatow(adresaci?: Partial<DaneAdresatow>): DaneAdresatow {
  const trybTresci = String(adresaci?.trybTresci) === 'Cała treść' || String(adresaci?.trybTresci) === 'cała treść' ? 'Cała treść' : 'Tylko zmiany'

  return {
    ...poczatkowiAdresaci,
    ...adresaci,
    trybTresci,
    czyPodpis: adresaci?.czyPodpis ?? true,
  }
}

function pobierzTrenerowZKartoteki(): TrenerKartoteki[] {
  try {
    const zapis = localStorage.getItem(kluczTrenerowKartoteki)
    const dane = zapis ? JSON.parse(zapis) : null

    if (!Array.isArray(dane)) {
      return trenerzyKartotekiStartowi
    }

    return dane
      .filter((trener) => trener?.status !== 'Nieaktywny')
      .map((trener) => ({
        id: String(trener.id),
        imieNazwisko: `${trener.imie ?? ''} ${trener.nazwisko ?? ''}`.trim() || String(trener.imieNazwisko ?? ''),
        telefon: String(trener.telefon ?? ''),
        email: String(trener.email ?? ''),
      }))
      .filter((trener) => trener.imieNazwisko)
  } catch {
    return trenerzyKartotekiStartowi
  }
}

function pobierzStanPoczatkowy() {
  const wersja = pobierzAktualnaWersjeRobocza()

  if (wersja) {
    return {
      dane: normalizujDane(wersja.dane),
      grupy: wersja.grupy.length ? wersja.grupy.map(normalizujGrupe) : [normalizujGrupe()],
      adresaci: normalizujAdresatow(wersja.adresaci),
      statusyPol: wersja.statusyPol ?? {},
    }
  }

  return {
    dane: normalizujDane(),
    grupy: [normalizujGrupe()],
    adresaci: { ...poczatkowiAdresaci },
    statusyPol: {},
  }
}

function scalDaneFormularza(obecne: DaneFormularza, czesciowe: Partial<DaneFormularza>): DaneFormularza {
  return normalizujDane({
    ...obecne,
    ...czesciowe,
    nabywca: scalFirme(obecne.nabywca, czesciowe.nabywca),
    odbiorca: scalFirme(obecne.odbiorca, czesciowe.odbiorca),
    dokumentacja: scalDokumentacje(obecne.dokumentacja, czesciowe.dokumentacja),
    logotypy: { ...obecne.logotypy, ...czesciowe.logotypy },
    dodatkoweWymogi: {
      ...obecne.dodatkoweWymogi,
      ...czesciowe.dodatkoweWymogi,
      wzoryKlienta: {
        ...obecne.dodatkoweWymogi.wzoryKlienta,
        ...czesciowe.dodatkoweWymogi?.wzoryKlienta,
      },
      szczegolyWzorowKlienta: {
        ...obecne.dodatkoweWymogi.szczegolyWzorowKlienta,
        ...czesciowe.dodatkoweWymogi?.szczegolyWzorowKlienta,
      },
    },
    uwagi: { ...obecne.uwagi, ...czesciowe.uwagi },
  })
}

function scalGrupe(obecna: GrupaSzkoleniowa, czesciowa: Partial<GrupaSzkoleniowa>): GrupaSzkoleniowa {
  return normalizujGrupe({
    ...obecna,
    ...czesciowa,
    trenerzy: czesciowa.trenerzy ?? obecna.trenerzy,
  })
}

function zbudujProblemyWalidacji(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]): ProblemWalidacji[] {
  const problemy: ProblemWalidacji[] = []

  function dodaj(sekcja: string, pole: string, komunikat: string, czyBlokuje = true, poziom: ProblemWalidacji['poziom'] = 'blad') {
    problemy.push({ sekcja, pole, komunikat, poziom, czyBlokuje })
  }

  if (!dane.tytulSzkolenia.trim()) {
    dodaj('Podstawowe informacje', 'Tytuł szkolenia', 'Tytuł szkolenia: wpisz tytuł szkolenia')
  }

  if (!dane.nazwaKlienta.trim()) {
    dodaj('Podstawowe informacje', 'Nazwa klienta', 'Nazwa klienta: wpisz nazwę klienta')
  }

  if (!grupy.length) {
    dodaj('Grupy szkoleniowe', 'Grupy', 'Dodaj co najmniej jedną grupę szkoleniową')
  }

  grupy.forEach((grupa, indeks) => {
    const nazwaGrupy = `Grupa ${indeks + 1}`

    if (!grupa.trenerzy.length || !grupa.trenerzy[0]?.imieNazwisko.trim()) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Trener`, `${nazwaGrupy}: wybierz trenera`)
    }

    if (!grupa.formaSzkolenia) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Forma szkolenia`, `${nazwaGrupy}: wybierz formę szkolenia`)
    }

    if (!grupa.dataOd) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Data od`, `${nazwaGrupy}: wpisz datę od`)
    }

    if (!grupa.dataDo) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Data do`, `${nazwaGrupy}: wpisz datę do`)
    }

    if (grupa.dataOd && grupa.dataDo && grupa.dataDo < grupa.dataOd) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Zakres dat`, `${nazwaGrupy}: data do nie może być wcześniejsza niż data od`)
    }

    if (!Number.isFinite(grupa.liczbaUczestnikow) || grupa.liczbaUczestnikow < 1) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Liczba uczestników`, `${nazwaGrupy}: wpisz liczbę uczestników minimum 1`)
    }

    if (!Number.isFinite(grupa.liczbaGodzin) || grupa.liczbaGodzin < 0) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Liczba godzin`, `${nazwaGrupy}: liczba godzin nie może być ujemna`)
    }

    if (!Number.isFinite(grupa.cenaNetto)) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Cena netto`, `${nazwaGrupy}: cena nie może zawierać liter`)
    } else if (grupa.cenaNetto <= 0) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Cena netto`, `${nazwaGrupy}: wpisz cenę netto`)
    }

    if (!Number.isFinite(grupa.terminPlatnosci) || grupa.terminPlatnosci < 0) {
      dodaj('Grupy szkoleniowe', `${nazwaGrupy}: Termin płatności`, `${nazwaGrupy}: termin płatności nie może być ujemny`)
    }
  })

  if (dane.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera && dane.dodatkoweWymogi.minutyWczesniej < 0) {
    dodaj('Dodatkowe wymogi', 'Ile minut wcześniej', 'Wcześniejszy przyjazd trenera: wpisz liczbę minut minimum 0')
  }

  if (dane.wysylkaPaczkiDotyczy) {
    if (dane.odbiorcaPaczki.email && !czyEmailPoprawny(dane.odbiorcaPaczki.email)) {
      dodaj('Wysyłka paczki', 'Email', 'Wysyłka paczki: popraw adres email', false, 'ostrzezenie')
    }

    if (dane.odbiorcaPaczki.kodPocztowy && !czyKodPocztowyPoprawny(dane.odbiorcaPaczki.kodPocztowy)) {
      dodaj('Wysyłka paczki', 'Kod pocztowy', 'Wysyłka paczki: popraw kod pocztowy', false, 'ostrzezenie')
    }
  }

  return problemy
}

export function useGeneratorSzczegolow() {
  const stanPoczatkowy = useMemo(() => pobierzStanPoczatkowy(), [])
  const [daneFormularza, ustawDaneFormularza] = useState<DaneFormularza>(stanPoczatkowy.dane)
  const [grupy, ustawGrupy] = useState<GrupaSzkoleniowa[]>(stanPoczatkowy.grupy)
  const [adresaci, ustawAdresaci] = useState<DaneAdresatow>(stanPoczatkowy.adresaci)
  const [statusyPol, ustawStatusyPol] = useState<StatusyPolImportu>(stanPoczatkowy.statusyPol)
  const [trescMaila, ustawTrescMaila] = useState('')
  const [rozpoznaneObszary, ustawRozpoznaneObszary] = useState<string[]>([])
  const [komunikat, ustawKomunikat] = useState('Generator gotowy.')
  const [trenerzyKartoteki, ustawTrenerzyKartoteki] = useState<TrenerKartoteki[]>(pobierzTrenerowZKartoteki)
  const [kopieRobocze, ustawKopieRobocze] = useState(pobierzKopieRobocze)
  const problemyWalidacji = useMemo(() => zbudujProblemyWalidacji(daneFormularza, grupy), [daneFormularza, grupy])
  const czyFormularzKompletny = useMemo(() => problemyWalidacji.every((problem) => !problem.czyBlokuje), [problemyWalidacji])
  const podgladSzczegolow = useMemo(() => utworzTekstSzczegolow(daneFormularza, grupy), [daneFormularza, grupy])
  const czyAdresaciAktualizacjiPoprawni = useMemo(() => {
    const lista = podzielAdresatow(adresaci.reczniAdresaci)
    return lista.length > 0 && lista.every(czyEmailPoprawny)
  }, [adresaci.reczniAdresaci])

  function oznaczPoleRecznie(pole: string) {
    ustawStatusyPol((obecne) => ({ ...obecne, [pole]: 'reczne' }))
  }

  function aktualizujDane(aktualizacja: (dane: DaneFormularza) => DaneFormularza, pole?: string) {
    ustawDaneFormularza((obecne) => normalizujDane(aktualizacja(obecne)))

    if (pole) {
      oznaczPoleRecznie(pole)
    }
  }

  function aktualizujGrupe(id: string, aktualizacja: (grupa: GrupaSzkoleniowa) => GrupaSzkoleniowa, pole?: string) {
    ustawGrupy((obecne) =>
      obecne.map((grupa, indeks) => {
        if (grupa.id !== id) {
          return grupa
        }

        return normalizujGrupe(aktualizacja(grupa), indeks)
      }),
    )

    if (pole) {
      oznaczPoleRecznie(pole)
    }
  }

  function dodajGrupe() {
    ustawGrupy((obecne) => [...obecne, utworzPoczatkowaGrupe(obecne.length + 1)])
  }

  function duplikujGrupe(id: string) {
    ustawGrupy((obecne) => {
      const indeks = obecne.findIndex((grupa) => grupa.id === id)

      if (indeks === -1) {
        return obecne
      }

      const kopia = normalizujGrupe(
        {
          ...klonuj(obecne[indeks]),
          id: `grupa-${Date.now()}-${obecne.length + 1}`,
          nazwa: `${obecne[indeks].nazwa || `Grupa ${indeks + 1}`} kopia`,
        },
        obecne.length,
      )

      return [...obecne.slice(0, indeks + 1), kopia, ...obecne.slice(indeks + 1)].map(normalizujGrupe)
    })
  }

  function usunGrupe(id: string) {
    ustawGrupy((obecne) => (obecne.length > 1 ? obecne.filter((grupa) => grupa.id !== id).map(normalizujGrupe) : obecne))
  }

  function obsluzImportMaila() {
    if (!trescMaila.trim()) {
      ustawKomunikat('Wklej treść maila przed importem.')
      return
    }

    const wynik = parsujMailaSzczegolow(trescMaila)
    ustawDaneFormularza((obecne) => scalDaneFormularza(obecne, wynik.daneFormularza))
    ustawGrupy((obecne) => {
      const pierwsza = scalGrupe(obecne[0] ?? normalizujGrupe(), wynik.pierwszaGrupa)
      return [pierwsza, ...obecne.slice(1)]
    })
    ustawRozpoznaneObszary(wynik.rozpoznaneObszary)
    ustawStatusyPol(() => {
      const statusy: StatusyPolImportu = {}
      polaWymaganePoImporcie.forEach((pole) => {
        statusy[pole] = 'brak'
      })
      wynik.rozpoznanePola.forEach((pole) => {
        statusy[pole] = 'zaimportowane'
      })
      wynik.polaNiepewne.forEach((pole) => {
        statusy[pole] = 'niepewne'
      })
      return statusy
    })
    ustawKomunikat(
      wynik.rozpoznaneObszary.length
        ? `Import zakończony. Rozpoznano obszary: ${wynik.rozpoznaneObszary.join(', ')}.`
        : 'Import zakończony. Nie odnaleziono jawnie opisanych danych.',
    )
  }

  function zapiszWersje() {
    const wersja = zbudujWersjeRobocza(daneFormularza, grupy, adresaci, statusyPol)
    zapiszWersjeRobocza(wersja)
    ustawKopieRobocze(pobierzKopieRobocze())
    ustawKomunikat('Zapisano kopię roboczą lokalnie.')
  }

  function wczytajWersje(wersja: WersjaRoboczaGeneratora) {
    ustawDaneFormularza(normalizujDane(wersja.dane))
    ustawGrupy(wersja.grupy.length ? wersja.grupy.map(normalizujGrupe) : [normalizujGrupe()])
    ustawAdresaci(normalizujAdresatow(wersja.adresaci))
    ustawStatusyPol(wersja.statusyPol ?? {})
    ustawKomunikat('Wczytano kopię roboczą.')
  }

  function wyczyscFormularz() {
    ustawDaneFormularza(normalizujDane())
    ustawGrupy([normalizujGrupe()])
    ustawAdresaci({ ...poczatkowiAdresaci })
    ustawStatusyPol({})
    ustawRozpoznaneObszary([])
    ustawTrescMaila('')
    wyczyscAktualnaWersjeRobocza()
    ustawKomunikat('Wyczyszczono formularz i aktualny szkic.')
  }

  function importujJson(zawartosc: string) {
    try {
      const wersja = JSON.parse(zawartosc) as Partial<WersjaRoboczaGeneratora>

      if (wersja.wersja !== wersjaEksportuSzczegolow || !czyObiekt(wersja.dane) || !Array.isArray(wersja.grupy) || !czyObiekt(wersja.adresaci)) {
        ustawKomunikat('Plik JSON nie pasuje do eksportu generatora szczegółów organizacyjnych.')
        return
      }

      wczytajWersje(wersja as WersjaRoboczaGeneratora)
    } catch {
      ustawKomunikat('Nie udało się odczytać JSON.')
    }
  }

  function eksportujJson() {
    const wersja = zbudujWersjeRobocza(daneFormularza, grupy, adresaci, statusyPol)
    const blob = new Blob([JSON.stringify(wersja, null, 2)], { type: 'application/json;charset=utf-8' })
    const adres = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = adres
    link.download = 'szczegoly-organizacyjne.json'
    link.click()
    URL.revokeObjectURL(adres)
    ustawKomunikat('Wyeksportowano JSON formularza.')
  }

  function wprowadzSzkolenie() {
    if (!czyFormularzKompletny) {
      ustawKomunikat('Uzupełnij wymagane pola przed wprowadzeniem szkolenia.')
      return
    }

    ustawDaneFormularza((obecne) => ({
      ...obecne,
      status: obecne.status === 'NIEPEŁNE' ? 'OCZEKUJĄCE' : obecne.status,
    }))
    ustawKomunikat('Szkolenie oznaczono lokalnie jako gotowe do wprowadzenia.')
  }

  function przygotujAktualizacje() {
    if (!czyAdresaciAktualizacjiPoprawni) {
      ustawKomunikat('Wpisz poprawnych adresatów aktualizacji oddzielonych przecinkiem.')
      return
    }

    ustawKomunikat('Wysyłka wymaga podłączenia usługi pocztowej — obecnie przygotowano dane wiadomości.')
  }

  function pokazKomunikatImportuDokumentow() {
    ustawKomunikat('Pełny import Word/PDF wymaga parsera backendowego i obecnie nie jest wykonywany.')
  }

  function odswiezTrenerowZKartoteki() {
    ustawTrenerzyKartoteki(pobierzTrenerowZKartoteki())
    ustawKomunikat('Odświeżono lokalną kartotekę trenerów.')
  }

  return {
    daneFormularza,
    grupy,
    adresaci,
    statusyPol,
    trescMaila,
    rozpoznaneObszary,
    komunikat,
    trenerzyKartoteki,
    kopieRobocze,
    problemyWalidacji,
    czyFormularzKompletny,
    czyAdresaciAktualizacjiPoprawni,
    podgladSzczegolow,
    ustawTrescMaila,
    ustawAdresaci,
    aktualizujDane,
    aktualizujGrupe,
    dodajGrupe,
    duplikujGrupe,
    usunGrupe,
    obsluzImportMaila,
    zapiszWersje,
    wczytajWersje,
    wyczyscFormularz,
    importujJson,
    eksportujJson,
    wprowadzSzkolenie,
    przygotujAktualizacje,
    pokazKomunikatImportuDokumentow,
    odswiezTrenerowZKartoteki,
  }
}
