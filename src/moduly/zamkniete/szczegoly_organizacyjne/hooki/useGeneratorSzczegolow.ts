import { useEffect, useMemo, useState } from 'react'
import {
  pobierzLokalizacjeZMagazynu,
  pobierzPotwierdzonyMiejscownikLokalizacji,
  znajdzLokalizacjeDlaMiejsca,
} from '../../../../kartoteki/lokalizacje/magazynLokalizacji'
import {
  poczatkowaFirma,
  poczatkowaGrupa,
  poczatkoweDaneFormularza,
  poczatkoweSzczegolyWzorowKlienta,
  poczatkoweWzoryKlienta,
  poczatkowiAdresaci,
} from '../danePoczatkowe'
import { pobierzBrakujacePolaEfektywnegoOdbiorcy, pobierzEfektywneStatusyPolOdbiorcy } from '../logikaDanychOdbiorcy'
import { dodajGrupeDoListy, przetworzUsuniecieGrupy } from '../logikaGrupSzkoleniowych'
import { zbudujBledyDynamicznychPolGrupy } from '../logikaPolDynamicznych'
import { polaWymaganePoImporcie, trenerzyKartotekiStartowi } from '../stale'
import { czyKontoMozeWidziecKopie, pobierzAktywneKontoSzczegolow } from '../uzytkownicySzczegolow'
import type {
  AutosaveSzczegolow,
  DaneAdresatow,
  DaneDokumentacjiMaterialow,
  DaneFirmy,
  DaneFormularza,
  DaneUwag,
  FormaSzkolenia,
  GrupaSzkoleniowa,
  KluczSekcjiSzczegolow,
  ModelSekcyjnySzczegolow,
  OswiadczenieVat,
  ProblemWalidacji,
  RodzajGodzin,
  StatusKompletnosciSekcji,
  StatusyPolImportu,
  TrenerKartoteki,
  WersjaRoboczaGeneratora,
} from '../typy'
import { utworzTekstSzczegolow } from '../uslugi/eksportSzczegolow'
import {
  dodajWpisHistoriiSzczegolow,
  opublikujWersjeRobocza,
  pobierzAktualnaWersjeRobocza,
  pobierzAutosaveSzczegolow,
  pobierzHistorieSzczegolow,
  pobierzKopieRobocze,
  ustawAktualnaWersjeRobocza,
  usunAutosaveSzczegolow,
  wersjaEksportuSzczegolow,
  wyczyscAktualnaWersjeRobocza,
  zapiszAutosaveSzczegolow,
  zapiszWersjeRobocza,
  zbudujWersjeRobocza,
} from '../uslugi/magazynWersjiRoboczych'
import { parsujMailaSzczegolow } from '../uslugi/parserMailaSzczegolow'
import { czyKontoMozeEdytowacSzczegoly } from '../uzytkownicySzczegolow'

const kluczTrenerowKartoteki = 'ultimate-pomagier.kartoteki.trenerzy'

const etykietySekcji: Record<KluczSekcjiSzczegolow, string> = {
  podstawoweInformacje: 'Podstawowe informacje',
  klient: 'Klient',
  opiekun: 'Opiekun',
  trenerzy: 'Trenerzy',
  lokalizacja: 'Lokalizacja',
  grupySzkoleniowe: 'Grupy szkoleniowe',
  harmonogram: 'Harmonogram',
  wysylka: 'Wysyłka',
  dokumenty: 'Dokumenty',
  rozliczenia: 'Rozliczenia',
  uwagi: 'Uwagi',
  metadane: 'Metadane',
}

const wymaganeSekcjeDoPublikacji: KluczSekcjiSzczegolow[] = [
  'podstawoweInformacje',
  'opiekun',
  'trenerzy',
  'lokalizacja',
  'grupySzkoleniowe',
  'harmonogram',
  'rozliczenia',
]

const polaSekcji: Record<KluczSekcjiSzczegolow, string[]> = {
  podstawoweInformacje: ['tytulSzkolenia', 'nazwaKlienta', 'organizator'],
  klient: ['nabywca.', 'odbiorca.', 'czyNabywcaJestOdbiorca'],
  opiekun: ['opiekunId'],
  trenerzy: ['grupy.trenerzy', 'grupy.0.trenerzy'],
  lokalizacja: ['grupy.miejsce', 'grupy.0.miejsce', 'grupy.formaSzkolenia', 'grupy.0.formaSzkolenia'],
  grupySzkoleniowe: ['grupy.', 'grupy.0.liczbaUczestnikow'],
  harmonogram: ['grupy.dataOd', 'grupy.0.dataOd', 'grupy.dataDo', 'grupy.0.dataDo', 'grupy.liczbaGodzin', 'grupy.0.liczbaGodzin'],
  wysylka: ['wysylkaPaczkiDotyczy', 'odbiorcaPaczki.'],
  dokumenty: ['dokumentacja.', 'logotypy.', 'programSzkolenia'],
  rozliczenia: ['grupy.cenaNetto', 'grupy.0.cenaNetto', 'grupy.vat', 'grupy.0.vat', 'grupy.terminPlatnosci', 'grupy.0.terminPlatnosci'],
  uwagi: ['uwagiWewnetrzne', 'informacjeNiepewne', 'uwagiOpiekuna', 'uwagiDlaKlienta', 'uwagiDlaTrenera', 'uwagiDlaWysylaczy', 'dodatkoweWymogi.uwagiDodatkoweDodatkowe'],
  metadane: ['status', 'statusSzkolenia', 'powodNiezrealizowania'],
}

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
  if (
    wartosc === 'Dydaktyczne (45 min)' ||
    wartosc === 'Edukacyjne (45 min)' ||
    wartosc === 'Szkoleniowe (45 min)' ||
    wartosc === 'Lekcyjne (45 min)' ||
    wartosc === 'Zegarowe (60 min)' ||
    wartosc === 'Niestandardowe'
  ) {
    return wartosc
  }

  if (wartosc === 'Akademickie (45 min)' || wartosc === 'dydaktyczne') {
    return 'Dydaktyczne (45 min)'
  }

  if (wartosc === 'Zajęciowe (60 min)' || wartosc === 'zegarowe') {
    return 'Zegarowe (60 min)'
  }

  return 'Dydaktyczne (45 min)'
}

function mapujForme(wartosc: unknown): FormaSzkolenia {
  return wartosc === 'Online' ? 'Online' : 'Stacjonarne'
}

function normalizujDane(dane?: Partial<DaneFormularza> & { uwagiWewnetrzne?: string; informacjeNiepewne?: string; uwagiOpiekuna?: string; uwagiDlaKlienta?: string; uwagiDlaTrenera?: string; uwagiDlaWysylaczy?: string }): DaneFormularza {
  const obecne = dane ?? {}
  const uwagiStarsze: Partial<DaneUwag> = obecne.uwagi ?? {}
  const nabywca = scalFirme(poczatkoweDaneFormularza.nabywca, obecne.nabywca)
  const odbiorca = scalFirme(poczatkoweDaneFormularza.odbiorca, obecne.odbiorca)
  const czyNabywcaJestOdbiorca = Boolean(obecne.czyNabywcaJestOdbiorca)

  return {
    ...klonuj(poczatkoweDaneFormularza),
    ...obecne,
    nazwaKlienta: obecne.nazwaKlienta ?? nabywca.nazwa ?? '',
    opiekunId: typeof obecne.opiekunId === 'string' ? obecne.opiekunId : '',
    status: obecne.status ?? 'NIEPEŁNE',
    statusSzkolenia: obecne.statusSzkolenia ?? 'W PRZYGOTOWANIACH',
    powodNiezrealizowania: obecne.powodNiezrealizowania ?? '',
    uwagi: {
      wewnetrzne: uwagiStarsze.wewnetrzne ?? (obecne as { uwagiWewnetrzne?: string }).uwagiWewnetrzne ?? '',
      informacjeNiepewne: uwagiStarsze.informacjeNiepewne ?? obecne.informacjeNiepewne ?? '',
      opiekuna: uwagiStarsze.opiekuna ?? (obecne as { uwagiOpiekuna?: string }).uwagiOpiekuna ?? '',
      dlaKlienta: uwagiStarsze.dlaKlienta ?? (obecne as { uwagiDlaKlienta?: string }).uwagiDlaKlienta ?? '',
      dlaTrenera: uwagiStarsze.dlaTrenera ?? (obecne as { uwagiDlaTrenera?: string }).uwagiDlaTrenera ?? '',
      dlaWysylaczy: uwagiStarsze.dlaWysylaczy ?? (obecne as { uwagiDlaWysylaczy?: string }).uwagiDlaWysylaczy ?? '',
    },
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
      uwagiDodatkowe: obecne.dodatkoweWymogi?.uwagiDodatkowe ?? (obecne.dodatkoweWymogi as { uwagi?: string } | undefined)?.uwagi ?? '',
      wzoryKlienta: {
        ...poczatkoweWzoryKlienta,
        ...obecne.dodatkoweWymogi?.wzoryKlienta,
      },
      szczegolyWzorowKlienta: {
        ...poczatkoweSzczegolyWzorowKlienta,
        ...obecne.dodatkoweWymogi?.szczegolyWzorowKlienta,
      },
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
    uczestnicy: Array.isArray(obecna.uczestnicy) ? obecna.uczestnicy : [],
    formaSzkolenia,
    miejsce,
    liczbaUczestnikow: Number(obecna.liczbaUczestnikow) || 0,
    liczbaGodzin: Number(obecna.liczbaGodzin) || 0,
    cenaNetto: Number(obecna.cenaNetto) || 0,
    terminPlatnosci: Number(obecna.terminPlatnosci) || 0,
    rodzajGodzin: mapujRodzajGodzin(obecna.rodzajGodzin),
    nazwaNiestandardowychGodzin: String(obecna.nazwaNiestandardowychGodzin ?? ''),
    liczbaMinutNiestandardowychGodzin: Number(obecna.liczbaMinutNiestandardowychGodzin) || 45,
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
      aktywnaKopiaId: wersja.id,
      zrodloOpublikowanegoId: wersja.zrodloOpublikowanegoId,
    }
  }

  return {
    dane: normalizujDane(),
    grupy: [normalizujGrupe()],
    adresaci: { ...poczatkowiAdresaci },
    statusyPol: {},
    aktywnaKopiaId: null,
    zrodloOpublikowanegoId: undefined,
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
      uwagiDodatkowe: obecne.dodatkoweWymogi?.uwagiDodatkowe ?? (obecne.dodatkoweWymogi as { uwagi?: string } | undefined)?.uwagi ?? '',
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
      })
}

function scalGrupe(obecna: GrupaSzkoleniowa, czesciowa: Partial<GrupaSzkoleniowa>): GrupaSzkoleniowa {
  return normalizujGrupe({
    ...obecna,
    ...czesciowa,
    trenerzy: czesciowa.trenerzy ?? obecna.trenerzy,
  })
}

function pobierzWidoczneKopieRobocze(konto: ReturnType<typeof pobierzAktywneKontoSzczegolow>) {
  return pobierzKopieRobocze().filter((kopia) => czyKontoMozeWidziecKopie(konto, kopia))
}

export function zbudujProblemyWalidacji(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]): ProblemWalidacji[] {
  const problemy: ProblemWalidacji[] = []
  const lokalizacje = pobierzLokalizacjeZMagazynu()

  function dodaj(sekcja: string, pole: string, komunikat: string, czyBlokuje = true, poziom: ProblemWalidacji['poziom'] = 'blad', polaPowiazane?: string[]) {
    problemy.push({ sekcja, pole, polaPowiazane, komunikat, poziom, czyBlokuje })
  }

  if (!dane.tytulSzkolenia.trim()) {
    dodaj('Podstawowe informacje', 'tytulSzkolenia', 'Tytuł szkolenia: wpisz tytuł szkolenia')
  }

  if (!dane.nazwaKlienta.trim()) {
    dodaj('Podstawowe informacje', 'nazwaKlienta', 'Nazwa klienta: wpisz nazwę klienta')
  }

  if (!dane.opiekunId.trim()) {
    dodaj('Podstawowe informacje', 'opiekunId', 'Opiekun: wybierz opiekuna')
  }

  pobierzBrakujacePolaEfektywnegoOdbiorcy(dane).forEach((pole) => {
    const komunikaty = {
      nazwa: 'Odbiorca: wpisz nazwę firmy odbiorcy',
      email: 'Odbiorca: wpisz adres email',
    }
    dodaj('Dane klienta', 'odbiorca.' + pole, komunikaty[pole])
  })

  if (!grupy.length) {
    dodaj('Grupy szkoleniowe', 'Grupy', 'Dodaj co najmniej jedną grupę szkoleniową')
  }

  grupy.forEach((grupa, indeks) => {
    const nazwaGrupy = `Grupa ${indeks + 1}`

    if (!grupa.trenerzy.length || !grupa.trenerzy[0]?.imieNazwisko.trim()) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.trenerzy`, `${nazwaGrupy}: wybierz trenera`)
    }

    if (!grupa.formaSzkolenia) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.formaSzkolenia`, `${nazwaGrupy}: wybierz formę szkolenia`)
    }

    if (!grupa.dataOd) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.dataOd`, `${nazwaGrupy}: wpisz datę od`)
    }

    if (!grupa.dataDo) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.dataDo`, `${nazwaGrupy}: wpisz datę do`)
    }

    if (grupa.dataOd && grupa.dataDo && grupa.dataDo < grupa.dataOd) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.dataDo`, `${nazwaGrupy}: data do nie może być wcześniejsza niż data od`, true, 'blad', [`grupy.${indeks}.dataOd`])
    }

    if (!Number.isFinite(grupa.liczbaUczestnikow) || grupa.liczbaUczestnikow < 1) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.liczbaUczestnikow`, `${nazwaGrupy}: wpisz liczbę uczestników minimum 1`)
    }

    if (!Number.isFinite(grupa.liczbaGodzin) || grupa.liczbaGodzin < 0) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.liczbaGodzin`, `${nazwaGrupy}: liczba godzin nie może być ujemna`)
    }

    const bledyDynamiczne = zbudujBledyDynamicznychPolGrupy(grupa)
    bledyDynamiczne.forEach((blad) => {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.${blad.pole}`, `${nazwaGrupy}: ${blad.komunikat}`)
    })

    if (!Number.isFinite(grupa.cenaNetto)) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.cenaNetto`, `${nazwaGrupy}: cena nie może zawierać liter`)
    } else if (grupa.cenaNetto <= 0) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.cenaNetto`, `${nazwaGrupy}: wpisz cenę netto`)
    }

    if (!Number.isFinite(grupa.terminPlatnosci) || grupa.terminPlatnosci < 0) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.terminPlatnosci`, `${nazwaGrupy}: termin płatności nie może być ujemny`)
    }


    const lokalizacja = grupa.formaSzkolenia === 'Online' ? null : znajdzLokalizacjeDlaMiejsca(grupa.miejsce, lokalizacje)
    const miejscownik = lokalizacja ? pobierzPotwierdzonyMiejscownikLokalizacji(lokalizacja.klucz_lokalizacji) : null

    if (miejscownik?.blad) {
      dodaj('Grupy szkoleniowe', `grupy.${indeks}.miejsce`, miejscownik.blad)
    }
  })

  if (dane.dodatkoweWymogi.wczesniejszyPrzyjazdTrenera && dane.dodatkoweWymogi.minutyWczesniej < 0) {
    dodaj('Dodatkowe wymogi', 'dodatkoweWymogi.minutyWczesniej', 'Wcześniejszy przyjazd trenera: wpisz liczbę minut minimum 0')
  }

  if (dane.wysylkaPaczkiDotyczy) {
    if (dane.odbiorcaPaczki.email && !czyEmailPoprawny(dane.odbiorcaPaczki.email)) {
      dodaj('Wysyłka paczki', 'odbiorcaPaczki.email', 'Wysyłka paczki: popraw adres email', false, 'ostrzezenie')
    }

    if (dane.odbiorcaPaczki.kodPocztowy && !czyKodPocztowyPoprawny(dane.odbiorcaPaczki.kodPocztowy)) {
      dodaj('Wysyłka paczki', 'odbiorcaPaczki.kodPocztowy', 'Wysyłka paczki: popraw kod pocztowy', false, 'ostrzezenie')
    }
  }

  return problemy
}

function czyPoleNalezyDoSekcji(pole: string, klucz: KluczSekcjiSzczegolow) {
  return polaSekcji[klucz].some((wzorzec) => pole === wzorzec || pole.startsWith(wzorzec))
}

function pobierzKluczSekcjiZProblemu(problem: ProblemWalidacji): KluczSekcjiSzczegolow {
  const wpis = Object.entries(etykietySekcji).find(([, etykieta]) => etykieta === problem.sekcja)
  return (wpis?.[0] as KluczSekcjiSzczegolow | undefined) ?? 'metadane'
}

function zbudujProblemyPolNiepewnych(statusyPol: StatusyPolImportu): ProblemWalidacji[] {
  return Object.entries(statusyPol)
    .filter(([, status]) => status === 'niepewne')
    .map(([pole]) => {
      const kluczSekcji = Object.entries(polaSekcji).find(([klucz]) => czyPoleNalezyDoSekcji(pole, klucz as KluczSekcjiSzczegolow))?.[0] as
        | KluczSekcjiSzczegolow
        | undefined

      return {
        sekcja: kluczSekcji ? etykietySekcji[kluczSekcji] : 'Import',
        pole,
        komunikat: `Pole "${pole}" jest niepewne po imporcie i wymaga akceptacji.`,
        poziom: 'blad' as const,
        czyBlokuje: true,
      }
    })
}

function zbudujModelSekcyjny(
  dane: DaneFormularza,
  grupy: GrupaSzkoleniowa[],
  adresaci: DaneAdresatow,
  statusyPol: StatusyPolImportu,
  problemyPodstawowe: ProblemWalidacji[],
): ModelSekcyjnySzczegolow {
  const problemyNiepewnychPol = zbudujProblemyPolNiepewnych(statusyPol)
  const wszystkieProblemy = [...problemyPodstawowe, ...problemyNiepewnychPol]

  function problemySekcji(klucz: KluczSekcjiSzczegolow) {
    return wszystkieProblemy.filter((problem) => pobierzKluczSekcjiZProblemu(problem) === klucz || czyPoleNalezyDoSekcji(problem.pole, klucz))
  }

  function polaNiepewneSekcji(klucz: KluczSekcjiSzczegolow) {
    return Object.entries(statusyPol)
      .filter(([pole, status]) => status === 'niepewne' && czyPoleNalezyDoSekcji(pole, klucz))
      .map(([pole]) => pole)
  }

  function utworzSekcje(klucz: KluczSekcjiSzczegolow, daneSekcji: unknown) {
    const problemy = problemySekcji(klucz)
    const bledyKrytyczne = problemy.filter((problem) => problem.czyBlokuje)
    const ostrzezenia = problemy.filter((problem) => !problem.czyBlokuje)
    const polaNiepewne = polaNiepewneSekcji(klucz)
    const wymaganaDoPublikacji = wymaganeSekcjeDoPublikacji.includes(klucz)
    const wynikWalidacji = bledyKrytyczne.length === 0
    const statusKompletnosci: StatusKompletnosciSekcji =
      wynikWalidacji && (!wymaganaDoPublikacji || polaNiepewne.length === 0) ? 'kompletna' : 'niekompletna'

    return {
      klucz,
      etykieta: etykietySekcji[klucz],
      dane: daneSekcji,
      wynikWalidacji,
      statusKompletnosci,
      bledyKrytyczne,
      ostrzezenia,
      polaNiepewne,
      wymaganaDoPublikacji,
    }
  }

  return {
    podstawoweInformacje: utworzSekcje('podstawoweInformacje', {
      tytulSzkolenia: dane.tytulSzkolenia,
      nazwaKlienta: dane.nazwaKlienta,
      organizator: dane.organizator,
    }),
    klient: utworzSekcje('klient', { nabywca: dane.nabywca, odbiorca: dane.odbiorca, czyNabywcaJestOdbiorca: dane.czyNabywcaJestOdbiorca }),
    opiekun: utworzSekcje('opiekun', { opiekunId: dane.opiekunId }),
    trenerzy: utworzSekcje('trenerzy', grupy.map((grupa) => grupa.trenerzy)),
    lokalizacja: utworzSekcje('lokalizacja', grupy.map((grupa) => ({ formaSzkolenia: grupa.formaSzkolenia, miejsce: grupa.miejsce }))),
    grupySzkoleniowe: utworzSekcje('grupySzkoleniowe', grupy),
    harmonogram: utworzSekcje('harmonogram', grupy.map((grupa) => ({ dataOd: grupa.dataOd, dataDo: grupa.dataDo, liczbaGodzin: grupa.liczbaGodzin }))),
    wysylka: utworzSekcje('wysylka', { wysylkaPaczkiDotyczy: dane.wysylkaPaczkiDotyczy, odbiorcaPaczki: dane.odbiorcaPaczki }),
    dokumenty: utworzSekcje('dokumenty', { dokumentacja: dane.dokumentacja, logotypy: dane.logotypy, programSzkolenia: dane.programSzkolenia }),
    rozliczenia: utworzSekcje('rozliczenia', grupy.map((grupa) => ({ cenaNetto: grupa.cenaNetto, vat: grupa.vat, terminPlatnosci: grupa.terminPlatnosci }))),
    uwagi: utworzSekcje('uwagi', { uwagi: dane.uwagi, dodatkoweWymogi: dane.dodatkoweWymogi, adresaci }),
    metadane: utworzSekcje('metadane', {
      status: dane.status,
      statusSzkolenia: dane.statusSzkolenia,
      powodNiezrealizowania: dane.powodNiezrealizowania,
    }),
  }
}

function czySekcjeWymaganeKompletne(modelSekcyjny: ModelSekcyjnySzczegolow) {
  return wymaganeSekcjeDoPublikacji.every((klucz) => modelSekcyjny[klucz].wynikWalidacji && modelSekcyjny[klucz].statusKompletnosci === 'kompletna')
}

export function useGeneratorSzczegolow() {
  const aktywneKonto = useMemo(() => pobierzAktywneKontoSzczegolow(), [])
  const stanPoczatkowy = useMemo(() => pobierzStanPoczatkowy(), [])
  const [daneFormularza, ustawDaneFormularza] = useState<DaneFormularza>(stanPoczatkowy.dane)
  const [grupy, ustawGrupy] = useState<GrupaSzkoleniowa[]>(stanPoczatkowy.grupy)
  const [adresaci, ustawAdresaci] = useState<DaneAdresatow>(stanPoczatkowy.adresaci)
  const [statusyPol, ustawStatusyPol] = useState<StatusyPolImportu>(stanPoczatkowy.statusyPol)
  const [aktywnaKopiaId, ustawAktywnaKopiaId] = useState<string | null>(stanPoczatkowy.aktywnaKopiaId)
  const [zrodloOpublikowanegoId, ustawZrodloOpublikowanegoId] = useState<string | undefined>(stanPoczatkowy.zrodloOpublikowanegoId)
  const [trescMaila, ustawTrescMaila] = useState('')
  const [rozpoznaneObszary, ustawRozpoznaneObszary] = useState<string[]>([])
  const [komunikat, ustawKomunikat] = useState(() => (pobierzAutosaveSzczegolow() ? 'Znaleziono niezapisaną wersję roboczą.' : 'Generator gotowy.'))
  const [trenerzyKartoteki, ustawTrenerzyKartoteki] = useState<TrenerKartoteki[]>(pobierzTrenerowZKartoteki)
  const [kopieRobocze, ustawKopieRobocze] = useState(() => pobierzWidoczneKopieRobocze(aktywneKonto))
  const [historiaSzczegolow, ustawHistorieSzczegolow] = useState(() => pobierzHistorieSzczegolow())
  const [autosaveDoDecyzji, ustawAutosaveDoDecyzji] = useState<AutosaveSzczegolow | null>(() => pobierzAutosaveSzczegolow())
  const [czyAutosaveAktywny, ustawCzyAutosaveAktywny] = useState(() => !pobierzAutosaveSzczegolow())
  const podstawoweProblemyWalidacji = useMemo(() => zbudujProblemyWalidacji(daneFormularza, grupy), [daneFormularza, grupy])
  const efektywneStatusyPol = useMemo(
    () => pobierzEfektywneStatusyPolOdbiorcy(daneFormularza, statusyPol),
    [daneFormularza, statusyPol],
  )
  const modelSekcyjny = useMemo(
    () => zbudujModelSekcyjny(daneFormularza, grupy, adresaci, efektywneStatusyPol, podstawoweProblemyWalidacji),
    [daneFormularza, grupy, adresaci, efektywneStatusyPol, podstawoweProblemyWalidacji],
  )
  const problemyWalidacji = useMemo(
    () => Object.values(modelSekcyjny).flatMap((sekcja) => [...sekcja.bledyKrytyczne, ...sekcja.ostrzezenia]),
    [modelSekcyjny],
  )
  const bledyPol = useMemo(() => {
    const wynik: Record<string, string> = {}
    podstawoweProblemyWalidacji.forEach(({ pole, polaPowiazane, komunikat }) => {
      ;[pole, ...(polaPowiazane ?? [])].forEach((kluczPola) => {
        wynik[kluczPola] ??= komunikat
      })
    })
    return wynik
  }, [podstawoweProblemyWalidacji])
  const polaNiepewne = useMemo(() => Object.entries(statusyPol).filter(([, status]) => status === 'niepewne').map(([pole]) => pole), [statusyPol])
  const ostrzezeniaWalidacji = useMemo(() => problemyWalidacji.filter((problem) => !problem.czyBlokuje), [problemyWalidacji])
  const bledyKrytyczne = useMemo(() => problemyWalidacji.filter((problem) => problem.czyBlokuje), [problemyWalidacji])
  const czyFormularzKompletny = useMemo(() => czySekcjeWymaganeKompletne(modelSekcyjny), [modelSekcyjny])
  const podgladSzczegolow = useMemo(() => utworzTekstSzczegolow(daneFormularza, grupy), [daneFormularza, grupy])
  const czyMoznaEdytowac = useMemo(() => czyKontoMozeEdytowacSzczegoly(aktywneKonto, daneFormularza.opiekunId), [aktywneKonto, daneFormularza.opiekunId])
  const ostatniAutosave = pobierzAutosaveSzczegolow()?.dataZapisu
  const czyAdresaciAktualizacjiPoprawni = useMemo(() => {
    const lista = podzielAdresatow(adresaci.reczniAdresaci)
    return lista.length > 0 && lista.every(czyEmailPoprawny)
  }, [adresaci.reczniAdresaci])

  useEffect(() => {
    if (!czyAutosaveAktywny) {
      return
    }

    zapiszAutosaveSzczegolow({
      id: `autosave-${Date.now()}`,
      dataZapisu: new Date().toISOString(),
      dane: daneFormularza,
      grupy,
      adresaci,
      statusyPol,
      aktywnaKopiaId,
      zrodloOpublikowanegoId,
    })
  }, [czyAutosaveAktywny, daneFormularza, grupy, adresaci, statusyPol, aktywnaKopiaId, zrodloOpublikowanegoId])

  function oznaczPoleRecznie(pole: string) {
    ustawStatusyPol((obecne) => ({ ...obecne, [pole]: 'reczne' }))
  }

  function cofnijStatusJesliNiekompletne(dane: DaneFormularza, grupyDoSprawdzenia: GrupaSzkoleniowa[], statusyDoSprawdzenia: StatusyPolImportu) {
    if (dane.status !== 'PEŁNE') {
      return dane
    }

    const problemy = zbudujProblemyWalidacji(dane, grupyDoSprawdzenia)
    const model = zbudujModelSekcyjny(dane, grupyDoSprawdzenia, adresaci, statusyDoSprawdzenia, problemy)

    return czySekcjeWymaganeKompletne(model) ? dane : { ...dane, status: 'NIEPEŁNE' as const }
  }

  function aktualizujDane(aktualizacja: (dane: DaneFormularza) => DaneFormularza, pole?: string) {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    ustawDaneFormularza((obecne) => cofnijStatusJesliNiekompletne(normalizujDane(aktualizacja(obecne)), grupy, statusyPol))

    if (pole) {
      oznaczPoleRecznie(pole)
    }
  }

  function aktualizujGrupe(id: string, aktualizacja: (grupa: GrupaSzkoleniowa) => GrupaSzkoleniowa, pole?: string) {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    ustawGrupy((obecne) => {
      const nastepneGrupy = obecne.map((grupa, indeks) => {
        if (grupa.id !== id) {
          return grupa
        }

        return normalizujGrupe(aktualizacja(grupa), indeks)
      })

      ustawDaneFormularza((dane) => cofnijStatusJesliNiekompletne(dane, nastepneGrupy, statusyPol))
      return nastepneGrupy
    })

    if (pole) {
      oznaczPoleRecznie(pole)
    }
  }

  function dodajGrupe() {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    ustawGrupy(dodajGrupeDoListy)
  }

  function duplikujGrupe(id: string) {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

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

  function usunGrupe(id: string, czyPotwierdzone: boolean) {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    ustawGrupy((obecne) => przetworzUsuniecieGrupy(obecne, id, czyPotwierdzone))
  }

  function obsluzImportMaila() {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

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
    dodajWpisHistoriiSzczegolow({
      typ: 'import',
      autorId: aktywneKonto.id,
      autorNazwa: aktywneKonto.nazwa,
      komentarz: `Zaimportowano dane z maila. Pola niepewne: ${wynik.polaNiepewne.length || 0}.`,
    })
    ustawHistorieSzczegolow(pobierzHistorieSzczegolow())
  }

  function zapiszWersje() {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    if (problemyWalidacji.some((problem) => problem.komunikat === 'Odmiana nazwy tej lokalizacji nie została jeszcze potwierdzona.')) {
      ustawKomunikat('Potwierdź odmianę lokalizacji przed zapisaniem formularza.')
      return
    }

    const daneDoZapisu: DaneFormularza = {
      ...daneFormularza,
      status: czyFormularzKompletny ? 'PEŁNE' : 'NIEPEŁNE',
    }
    const wersja = zbudujWersjeRobocza(daneDoZapisu, grupy, adresaci, statusyPol, aktywneKonto, {
      id: aktywnaKopiaId,
      zrodloOpublikowanegoId,
    })
    zapiszWersjeRobocza(wersja)
    ustawDaneFormularza(normalizujDane(daneDoZapisu))
    ustawAktywnaKopiaId(wersja.id)
    ustawKopieRobocze(pobierzWidoczneKopieRobocze(aktywneKonto))
    ustawHistorieSzczegolow(pobierzHistorieSzczegolow())
    ustawKomunikat(`Zapisano wersję roboczą ${wersja.etykietaWersji}.`)
  }

  function wczytajWersje(wersja: WersjaRoboczaGeneratora) {
    ustawDaneFormularza(normalizujDane(wersja.dane))
    ustawGrupy(wersja.grupy.length ? wersja.grupy.map(normalizujGrupe) : [normalizujGrupe()])
    ustawAdresaci(normalizujAdresatow(wersja.adresaci))
    ustawStatusyPol(wersja.statusyPol ?? {})
    ustawAktywnaKopiaId(wersja.id)
    ustawZrodloOpublikowanegoId(wersja.zrodloOpublikowanegoId)
    ustawAktualnaWersjeRobocza(wersja)
    ustawKomunikat('Wczytano kopię roboczą.')
  }

  function wyczyscFormularz() {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    ustawDaneFormularza(normalizujDane())
    ustawGrupy([normalizujGrupe()])
    ustawAdresaci({ ...poczatkowiAdresaci })
    ustawStatusyPol({})
    ustawAktywnaKopiaId(null)
    ustawZrodloOpublikowanegoId(undefined)
    ustawRozpoznaneObszary([])
    ustawTrescMaila('')
    wyczyscAktualnaWersjeRobocza()
    usunAutosaveSzczegolow()
    ustawAutosaveDoDecyzji(null)
    ustawCzyAutosaveAktywny(true)
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
    if (bledyKrytyczne.length || polaNiepewne.length) {
      ustawKomunikat('Eksport zablokowany: usuń błędy krytyczne i zaakceptuj pola niepewne.')
      return
    }

    const wersja = zbudujWersjeRobocza(daneFormularza, grupy, adresaci, statusyPol, aktywneKonto, {
      id: aktywnaKopiaId,
      zrodloOpublikowanegoId,
    })
    const blob = new Blob([JSON.stringify(wersja, null, 2)], { type: 'application/json;charset=utf-8' })
    const adres = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = adres
    link.download = 'szczegoly-organizacyjne.json'
    link.click()
    URL.revokeObjectURL(adres)
    ustawKomunikat('Wyeksportowano JSON formularza.')
  }

  function opublikujSzczegoly() {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    if (polaNiepewne.length) {
      ustawKomunikat('Publikacja zablokowana: zaakceptuj pola niepewne po imporcie.')
      return
    }

    if (!czyFormularzKompletny) {
      ustawKomunikat('Uzupełnij wymagane pola przed publikacją szczegółów organizacyjnych.')
      return
    }

    if (ostrzezeniaWalidacji.length && !window.confirm(`Wykryto ostrzeżenia: ${ostrzezeniaWalidacji.length}. Czy mimo to opublikować szczegóły?`)) {
      ustawKomunikat('Publikacja przerwana przez użytkownika po ostrzeżeniach.')
      return
    }

    const daneDoPublikacji: DaneFormularza = {
      ...daneFormularza,
      status: 'PEŁNE',
    }
    const wersja = zbudujWersjeRobocza(daneDoPublikacji, grupy, adresaci, statusyPol, aktywneKonto, {
      id: aktywnaKopiaId,
      zrodloOpublikowanegoId,
    })

    opublikujWersjeRobocza(wersja)
    ustawDaneFormularza(normalizujDane())
    ustawGrupy([normalizujGrupe()])
    ustawAdresaci({ ...poczatkowiAdresaci })
    ustawStatusyPol({})
    ustawAktywnaKopiaId(null)
    ustawZrodloOpublikowanegoId(undefined)
    ustawRozpoznaneObszary([])
    ustawTrescMaila('')
    ustawKopieRobocze(pobierzWidoczneKopieRobocze(aktywneKonto))
    ustawHistorieSzczegolow(pobierzHistorieSzczegolow())
    ustawKomunikat('Opublikowano szczegóły organizacyjne ze statusem OCZEKUJĄCE.')
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

  function ustawAdresaciBezpiecznie(aktualizacja: (adresaci: DaneAdresatow) => DaneAdresatow) {
    if (!czyMoznaEdytowac) {
      ustawKomunikat('Ten formularz jest dostępny tylko do podglądu dla bieżącego konta.')
      return
    }

    ustawAdresaci(aktualizacja)
  }

  function przywrocAutosave() {
    if (!autosaveDoDecyzji) {
      return
    }

    const dane = normalizujDane(autosaveDoDecyzji.dane)
    const grupyDoZapisu = autosaveDoDecyzji.grupy.length ? autosaveDoDecyzji.grupy.map(normalizujGrupe) : [normalizujGrupe()]
    const adresaciDoZapisu = normalizujAdresatow(autosaveDoDecyzji.adresaci)
    const wersja = zbudujWersjeRobocza(dane, grupyDoZapisu, adresaciDoZapisu, autosaveDoDecyzji.statusyPol, aktywneKonto, {
      id: autosaveDoDecyzji.aktywnaKopiaId,
      zrodloOpublikowanegoId: autosaveDoDecyzji.zrodloOpublikowanegoId,
    })

    zapiszWersjeRobocza(wersja)
    ustawDaneFormularza(dane)
    ustawGrupy(grupyDoZapisu)
    ustawAdresaci(adresaciDoZapisu)
    ustawStatusyPol(autosaveDoDecyzji.statusyPol)
    ustawAktywnaKopiaId(wersja.id)
    ustawZrodloOpublikowanegoId(autosaveDoDecyzji.zrodloOpublikowanegoId)
    ustawKopieRobocze(pobierzWidoczneKopieRobocze(aktywneKonto))
    ustawHistorieSzczegolow(pobierzHistorieSzczegolow())
    ustawAutosaveDoDecyzji(null)
    ustawCzyAutosaveAktywny(true)
    ustawKomunikat('Przywrócono niezapisaną wersję roboczą.')
  }

  function odrzucAutosave() {
    usunAutosaveSzczegolow()
    ustawAutosaveDoDecyzji(null)
    ustawCzyAutosaveAktywny(true)
    ustawKomunikat('Odrzucono niezapisaną wersję roboczą.')
  }

  function zaakceptujWszystkiePolaNiepewne() {
    if (!polaNiepewne.length) {
      return
    }

    ustawStatusyPol((obecne) => {
      const nastepne = { ...obecne }
      polaNiepewne.forEach((pole) => {
        nastepne[pole] = 'zaimportowane'
      })
      return nastepne
    })
    dodajWpisHistoriiSzczegolow({
      typ: 'import',
      autorId: aktywneKonto.id,
      autorNazwa: aktywneKonto.nazwa,
      komentarz: `Zaakceptowano pola niepewne po imporcie: ${polaNiepewne.join(', ')}.`,
    })
    ustawHistorieSzczegolow(pobierzHistorieSzczegolow())
    ustawKomunikat('Zaakceptowano wszystkie pola niepewne po imporcie.')
  }

  return {
    daneFormularza,
    grupy,
    adresaci,
    statusyPol: efektywneStatusyPol,
    trescMaila,
    rozpoznaneObszary,
    komunikat,
    trenerzyKartoteki,
    kopieRobocze,
    aktywnaKopiaId,
    zrodloOpublikowanegoId,
    historiaSzczegolow,
    autosaveDoDecyzji,
    ostatniAutosave,
    modelSekcyjny,
    problemyWalidacji,
    bledyPol,
    bledyKrytyczne,
    ostrzezeniaWalidacji,
    polaNiepewne,
    czyFormularzKompletny,
    czyMoznaEdytowac,
    czyTylkoPodglad: !czyMoznaEdytowac,
    czyAdresaciAktualizacjiPoprawni,
    podgladSzczegolow,
    ustawTrescMaila,
    ustawAdresaci: ustawAdresaciBezpiecznie,
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
    opublikujSzczegoly,
    przygotujAktualizacje,
    pokazKomunikatImportuDokumentow,
    odswiezTrenerowZKartoteki,
    przywrocAutosave,
    odrzucAutosave,
    zaakceptujWszystkiePolaNiepewne,
  }
}
