import type {
  LokalizacjaKartoteki,
  StatusPolaImportu,
  StatusSzkolenia,
  StatusSzczegolow,
} from './typy'
export { trenerzyKartotekiStartowi } from './trenerzyKartoteki'

export const statusySzczegolow: StatusSzczegolow[] = [
  'NIEPEŁNE',
  'PEŁNE',
  'OCZEKUJĄCE',
  'ZAAKCEPTOWANE',
  'GOTOWE',
]

export const statusySzkolenia: StatusSzkolenia[] = [
  'W PRZYGOTOWANIACH',
  'POTWIERDZONE',
  'PRZYGOTOWANE',
  'WYSŁANA PACZKA',
  'TRWA',
  'ZREALIZOWANE',
  'NIEZREALIZOWANE',
  'ROZLICZONE',
]

export const etykietyStatusowPol: Record<StatusPolaImportu, string> = {
  zaimportowane: 'Zaimportowane',
  brak: 'Brak',
  niepewne: '⚠ Niepewne',
  reczne: 'Ręcznie uzupełnione',
}

export const klasyStatusowPol: Record<StatusPolaImportu, string> = {
  zaimportowane: 'szczegoly-pole--zaimportowane',
  brak: 'szczegoly-pole--brak',
  niepewne: 'szczegoly-pole--niepewne',
  reczne: 'szczegoly-pole--reczne',
}

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
  'nazwaKlienta',
  'opiekunId',
  'nabywca.nazwa',
  'nabywca.ulica',
  'nabywca.kodPocztowy',
  'nabywca.miasto',
  'odbiorca.nazwa',
  'odbiorca.email',
  'grupy.0.dataOd',
  'grupy.0.dataDo',
  'grupy.0.formaSzkolenia',
  'grupy.0.miejsce',
  'grupy.0.liczbaGodzin',
  'grupy.0.cenaNetto',
  'grupy.0.vat',
  'grupy.0.trenerzy',
  'grupy.0.liczbaUczestnikow',
  'grupy.0.terminPlatnosci',
  'grupy.0.numerUmowy',
  'grupy.0.dataUmowy',
]
