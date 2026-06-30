import type {
  LokalizacjaKartoteki,
  LokalnyUzytkownik,
  StatusPolaImportu,
  StatusSzczegolow,
  TrenerKartoteki,
} from './typy'

export const statusySzczegolow: StatusSzczegolow[] = [
  'NIEPEŁNE',
  'PEŁNE',
  'OCZEKUJĄCE',
  'ZAAKCEPTOWANE',
  'GOTOWE',
  'ZREALIZOWANE',
  'NIEZREALIZOWANE',
  'ROZLICZONE',
]

export const etykietyStatusowPol: Record<StatusPolaImportu, string> = {
  zaimportowane: 'Zaimportowane',
  brak: 'Brak',
  niepewne: 'Niepewne',
  reczne: 'Ręcznie uzupełnione',
}

export const klasyStatusowPol: Record<StatusPolaImportu, string> = {
  zaimportowane: 'szczegoly-pole--zaimportowane',
  brak: 'szczegoly-pole--brak',
  niepewne: 'szczegoly-pole--niepewne',
  reczne: 'szczegoly-pole--reczne',
}

export const lokalniUzytkownicy: LokalnyUzytkownik[] = [
  {
    id: 'administrator',
    nazwa: 'Administrator SEMPER',
    rola: 'Administrator',
    email: 'administrator@pomagier.local',
    czyPracownik: true,
    czyOpiekunSzkolenia: true,
    odznaki: ['Wysyłacz'],
  },
  {
    id: 'opiekun',
    nazwa: 'Opiekun szkolenia',
    rola: 'Opiekun',
    email: 'opiekun@pomagier.local',
    czyPracownik: true,
    czyOpiekunSzkolenia: true,
    odznaki: ['Wysyłacz'],
  },
  {
    id: 'koordynator-klienta',
    nazwa: 'Koordynator klienta',
    rola: 'Koordynator klienta',
    email: 'koordynator@klient.local',
    czyPracownik: false,
    czyOpiekunSzkolenia: false,
    odznaki: [],
  },
  {
    id: 'trener',
    nazwa: 'Trener przypisany',
    rola: 'Trener',
    email: 'trener@pomagier.local',
    czyPracownik: false,
    czyOpiekunSzkolenia: false,
    trenerId: 'trener-anna-kowalska',
    odznaki: [],
  },
  {
    id: 'gosc',
    nazwa: 'Gość',
    rola: 'Gość',
    email: 'gosc@pomagier.local',
    czyPracownik: false,
    czyOpiekunSzkolenia: false,
    odznaki: [],
  },
]

export const trenerzyKartotekiStartowi: TrenerKartoteki[] = [
  {
    id: 'trener-anna-kowalska',
    imieNazwisko: 'Anna Kowalska',
    telefon: '501 111 222',
    email: 'anna.kowalska@pomagier.local',
  },
  {
    id: 'trener-piotr-nowak',
    imieNazwisko: 'Piotr Nowak',
    telefon: '502 333 444',
    email: 'piotr.nowak@pomagier.local',
  },
  {
    id: 'trener-marta-zielinska',
    imieNazwisko: 'Marta Zielińska',
    telefon: '503 555 666',
    email: 'marta.zielinska@pomagier.local',
  },
]

export const lokalizacjeKartoteki: LokalizacjaKartoteki[] = [
  {
    id: 'warszawa',
    nazwa: 'Warszawa',
    miejscownik: 'Warszawie',
    miejscownikPotwierdzony: true,
    adres: 'ul. Marszałkowska 1, 00-001 Warszawa',
  },
  {
    id: 'krakow',
    nazwa: 'Kraków',
    miejscownik: 'Krakowie',
    miejscownikPotwierdzony: true,
    adres: 'ul. Floriańska 1, 31-019 Kraków',
  },
  {
    id: 'poznan',
    nazwa: 'Poznań',
    miejscownik: 'Poznaniu',
    miejscownikPotwierdzony: true,
    adres: 'ul. Święty Marcin 1, 61-808 Poznań',
  },
  {
    id: 'inna',
    nazwa: 'Inna lokalizacja',
    miejscownik: '',
    miejscownikPotwierdzony: false,
    adres: '',
  },
]

export const grupyAdresatow = [
  {
    id: 'dzial-zamkniety',
    nazwa: 'Dział zamknięty',
    adresaci: ['zamkniete@semper.pl', 'koordynacja@semper.pl'],
  },
  {
    id: 'wysylacze',
    nazwa: 'Wysyłacze',
    adresaci: ['wysylka@semper.pl'],
  },
  {
    id: 'ksiegowosc',
    nazwa: 'Księgowość',
    adresaci: ['faktury@semper.pl'],
  },
]

export const polaWymaganePoImporcie = [
  'tytulSzkolenia',
  'nabywca.nazwa',
  'nabywca.nip',
  'odbiorca.nazwa',
  'faktura.email',
  'protokol',
  'raport',
  'programSzkolenia',
  'grupy.0.dataOd',
  'grupy.0.godzinaRozpoczecia',
  'grupy.0.godzinaZakonczenia',
  'grupy.0.liczbaGodzin',
  'grupy.0.cenaNetto',
  'grupy.0.vat',
  'grupy.0.nazwaLokalizacji',
  'grupy.0.trenerzy',
  'grupy.0.liczbaUczestnikow',
]
