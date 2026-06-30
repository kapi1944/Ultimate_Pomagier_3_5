export type StatusSzczegolow =
  | 'NIEPEŁNE'
  | 'PEŁNE'
  | 'OCZEKUJĄCE'
  | 'ZAAKCEPTOWANE'
  | 'GOTOWE'
  | 'ZREALIZOWANE'
  | 'NIEZREALIZOWANE'
  | 'ROZLICZONE'

export type StatusPolaImportu = 'zaimportowane' | 'brak' | 'niepewne' | 'reczne'
export type OswiadczenieVat = 'brak' | '23%' | '8%' | '0%' | 'zwolnione'
export type TrybCeny = 'za grupę' | 'za uczestnika'
export type RodzajGodzin = 'dydaktyczne' | 'zegarowe' | 'niestandardowe'
export type OrganizatorSzkolenia = 'SEMPER' | 'IIST'
export type FormaSzkolenia = 'Stacjonarne' | 'Online' | 'Hybrydowe'
export type StatusTerminu = 'Niepotwierdzony' | 'Potwierdzony' | 'Do ustalenia'
export type SposobDokumentu = 'druk' | 'online'
export type TrybTresciMaila = 'cała treść' | 'tylko zmiany'
export type RolaLokalnegoUzytkownika = 'Administrator' | 'Opiekun' | 'Koordynator klienta' | 'Trener' | 'Gość'

export type DaneFirmy = {
  nazwa: string
  nip: string
  adres: string
}

export type DaneFaktury = {
  sposob: string
  email: string
  uwagi: string
}

export type DaneKontaktuOrganizacyjnego = {
  imieNazwisko: string
  email: string
  telefon: string
}

export type DaneDokumentacjiMaterialow = {
  listaObecnosci: boolean
  ankiety: boolean
  certyfikaty: boolean
  program: boolean
  kartaInformacyjna: boolean
  materialyInspekcyjne: boolean
  podreczniki: boolean
  materialyDodatkowe: boolean
  testPrzedPo: boolean
  dostepnoscCyfrowa: boolean
  kompletDlaZamawiajacego: boolean
  wzorKlienta: boolean
  sposobDokumentu: SposobDokumentu
  uwagi: string
}

export type DaneLogotypow = {
  czyWymagane: boolean
  nazwaPliku: string
  link: string
  podglad: string
  informacjaOFinansowaniu: string
  zastrzezenie: string
}

export type DaneDodatkowychWymogow = {
  wczesniejszyPrzyjazdTrenera: boolean
  minutyWczesniej: number
  dokumentacjaZdjęciowa: boolean
  karyZaNieterminowosc: boolean
  noweSzkolenieZaOcene: boolean
  kfs: boolean
  uwagi: string
}

export type DaneUwag = {
  wewnetrzne: string
  informacjeNiepewne: string
  opiekuna: string
  dlaKlienta: string
  dlaTrenera: string
  dlaWysylaczy: string
}

export type DaneFormularza = {
  tytulSzkolenia: string
  organizator: OrganizatorSzkolenia
  status: StatusSzczegolow
  nabywca: DaneFirmy
  odbiorca: DaneFirmy
  czyNabywcaJestOdbiorca: boolean
  adresPaczkiWspolny: string
  faktura: DaneFaktury
  raport: string
  protokol: string
  dataUmowy: string
  numerUmowy: string
  terminPlatnosci: string
  kontaktWspolnyDlaGrup: boolean
  koordynatorKlienta: DaneKontaktuOrganizacyjnego
  odbiorcaPaczki: DaneKontaktuOrganizacyjnego
  czyKoordynatorOdbieraPaczki: boolean
  dokumentacja: DaneDokumentacjiMaterialow
  materialy: string
  logotypy: DaneLogotypow
  dodatkoweWymogi: DaneDodatkowychWymogow
  programSzkolenia: string
  uwagi: DaneUwag
}

export type TrenerKartoteki = {
  id: string
  imieNazwisko: string
  telefon: string
  email: string
}

export type TrenerGrupy = {
  id: string
  imieNazwisko: string
  telefon: string
  email: string
}

export type UczestnikGrupy = {
  id: string
  imie: string
  nazwisko: string
  email: string
}

export type LokalizacjaKartoteki = {
  id: string
  nazwa: string
  miejscownik: string
  miejscownikPotwierdzony: boolean
  adres: string
}

export type GrupaSzkoleniowa = {
  id: string
  nazwa: string
  statusTerminu: StatusTerminu
  dataOd: string
  dataDo: string
  godzinaRozpoczecia: string
  godzinaZakonczenia: string
  formaSzkolenia: FormaSzkolenia
  cenaNetto: number
  vat: OswiadczenieVat
  cenaBrutto: number
  trybCeny: TrybCeny
  liczbaGodzin: number
  rodzajGodzin: RodzajGodzin
  niestandardowaFormulaGodzin: string
  lokalizacjaId: string
  miejscownik: string
  miejscownikPotwierdzony: boolean
  miejsce: string
  ktoZapewniaSale: string
  nazwaLokalizacji: string
  adresLokalizacji: string
  sala: string
  informacjeDojazdowe: string
  platformaOnline: 'Zoom' | 'Microsoft Teams' | 'Inna'
  linkOnline: string
  kodDostepuOnline: string
  informacjeTechniczne: string
  trenerzy: TrenerGrupy[]
  czyTrenerSzkoliKazdaGrupe: boolean
  dokumentacja: DaneDokumentacjiMaterialow
  uczestnicy: UczestnikGrupy[]
  liczbaUczestnikow: number
  pustaListaObecnosci: boolean
  marginesWierszyListy: number
  koordynatorKlienta: DaneKontaktuOrganizacyjnego
  odbiorcaPaczki: DaneKontaktuOrganizacyjnego
}

export type DaneAdresatow = {
  reczniAdresaci: string
  wyszukiwarka: string
  wybraneGrupy: string[]
  trybTresci: TrybTresciMaila
  czyPodswietlacZmiany: boolean
}

export type StatusyPolImportu = Partial<Record<string, StatusPolaImportu>>

export type WersjaRoboczaGeneratora = {
  id: string
  nazwa: string
  dataZapisu: string
  dane: DaneFormularza
  grupy: GrupaSzkoleniowa[]
  adresaci: DaneAdresatow
  statusyPol: StatusyPolImportu
}

export type KopiaRoboczaSzkolenia = WersjaRoboczaGeneratora

export type LokalnyUzytkownik = {
  id: string
  nazwa: string
  rola: RolaLokalnegoUzytkownika
  email: string
  czyPracownik: boolean
  czyOpiekunSzkolenia: boolean
  trenerId?: string
  odznaki: string[]
}

export type WynikParseraMailaSzczegolow = {
  daneFormularza: Partial<DaneFormularza>
  pierwszaGrupa: Partial<GrupaSzkoleniowa>
  rozpoznaneObszary: string[]
  rozpoznanePola: string[]
  polaNiepewne: string[]
}
