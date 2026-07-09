export type StatusSzczegolow =
  | 'NIEPEŁNE'
  | 'PEŁNE'
  | 'OCZEKUJĄCE'
  | 'ZAAKCEPTOWANE'
  | 'GOTOWE'

export type StatusSzkolenia =
  | 'W PRZYGOTOWANIACH'
  | 'POTWIERDZONE'
  | 'PRZYGOTOWANE'
  | 'WYSŁANA PACZKA'
  | 'TRWA'
  | 'ZREALIZOWANE'
  | 'NIEZREALIZOWANE'
  | 'ROZLICZONE'

export type StatusOpublikowanychSzczegolow = Exclude<StatusSzczegolow, 'NIEPEŁNE' | 'PEŁNE'>
export type StatusKompletnosciSekcji = 'pusta' | 'niekompletna' | 'kompletna'
export type KluczSekcjiSzczegolow =
  | 'podstawoweInformacje'
  | 'klient'
  | 'opiekun'
  | 'trenerzy'
  | 'lokalizacja'
  | 'grupySzkoleniowe'
  | 'harmonogram'
  | 'wysylka'
  | 'dokumenty'
  | 'rozliczenia'
  | 'uwagi'
  | 'metadane'

export type StatusPolaImportu = 'zaimportowane' | 'brak' | 'niepewne' | 'reczne'
export type OswiadczenieVat = 'Nie – 23%' | 'Min. 70%' | 'ZW – 100%'
export type TrybCeny = 'za grupę' | 'za osobę'
export type RodzajGodzin =
  | 'Dydaktyczne (45 min)'
  | 'Edukacyjne (45 min)'
  | 'Szkoleniowe (45 min)'
  | 'Lekcyjne (45 min)'
  | 'Zegarowe (60 min)'
  | 'Niestandardowe'
export type OrganizatorSzkolenia = 'SEMPER' | 'IIST' | 'SD' | 'klient' | 'inny'
export type FormaSzkolenia = 'Stacjonarne' | 'Online'
export type TrybTresciMaila = 'Tylko zmiany' | 'Cała treść'
export type StatusLogotypow = 'Tak' | 'Nie' | 'Nie dotyczy'

export type DaneFirmy = {
  nazwa: string
  nip: string
  adres: string
  ulica: string
  nrBudynku: string
  nrLokalu: string
  kodPocztowy: string
  miasto: string
  kraj: string
  osobaKontaktowa: string
  imieNazwiskoOdbiorcy: string
  telefon: string
  email: string
  sposobWysylkiRaportu: string
}

export type DaneKontaktuOrganizacyjnego = {
  imieNazwisko: string
  email: string
  telefon: string
}

export type DaneOdbiorcyPaczki = DaneKontaktuOrganizacyjnego & {
  nazwaFirmy: string
  ulica: string
  nrBudynku: string
  nrLokalu: string
  kodPocztowy: string
  miasto: string
  kraj: string
}

export type WzoryKlienta = Record<string, boolean>

export type SzczegolyWzoruKlienta = {
  nazwaPliku: string
  uwagi: string
}

export type SzczegolyWzorowKlienta = Record<string, SzczegolyWzoruKlienta>

export type DaneDokumentacjiMaterialow = {
  listaObecnosci: boolean
  ankiety: boolean
  certyfikaty: boolean
  program: boolean
  kartaInformacyjna: boolean
  podreczniki: boolean
  materialyDodatkowe: boolean
  projektTesty: boolean
  dostepnoscCyfrowa: boolean
  logotypy: StatusLogotypow
  plusJedenEgzemplarz: boolean
  wzoryKlienta: WzoryKlienta
  szczegolyWzorowKlienta: SzczegolyWzorowKlienta
}

export type DaneLogotypow = {
  nazwaPliku: string
  podglad: string
}

export type DaneDodatkowychWymogow = {
  wczesniejszyPrzyjazdTrenera: boolean
  minutyWczesniej: number
  dokumentacjaZdjęciowa: boolean
  karyWHarmonogramie: boolean
  noweSzkolenieZaOcene: boolean
  kfs: boolean
  uwagi: string
  wzoryKlienta: WzoryKlienta
  szczegolyWzorowKlienta: SzczegolyWzorowKlienta
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
  nazwaKlienta: string
  organizator: OrganizatorSzkolenia
  opiekunId: string
  status: StatusSzczegolow
  statusSzkolenia: StatusSzkolenia
  powodNiezrealizowania: string
  nabywca: DaneFirmy
  odbiorca: DaneFirmy
  czyNabywcaJestOdbiorca: boolean
  wysylkaPaczkiDotyczy: boolean
  odbiorcaPaczki: DaneOdbiorcyPaczki
  dokumentacja: DaneDokumentacjiMaterialow
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
  trenerzy: TrenerGrupy[]
  formaSzkolenia: FormaSzkolenia
  dataOd: string
  dataDo: string
  liczbaUczestnikow: number
  liczbaGodzin: number
  rodzajGodzin: RodzajGodzin
  nazwaNiestandardowychGodzin: string
  liczbaMinutNiestandardowychGodzin: number
  miejsce: string
  ktoZapewniaSale: string
  cenaNetto: number
  trybCeny: TrybCeny
  vat: OswiadczenieVat
  terminPlatnosci: number
  protokol: boolean
  mechanizmPodzielonejPlatnosci: boolean
  dataUmowy: string
  numerUmowy: string
}

export type DaneAdresatow = {
  reczniAdresaci: string
  trybTresci: TrybTresciMaila
  czyPodpis: boolean
  wiadomoscWlasna: string
}

export type StatusyPolImportu = Partial<Record<string, StatusPolaImportu>>

export type ProblemWalidacji = {
  sekcja: string
  pole: string
  komunikat: string
  poziom: 'blad' | 'ostrzezenie' | 'informacja'
  czyBlokuje: boolean
}

export type WynikSekcjiSzczegolow<DaneSekcji> = {
  klucz: KluczSekcjiSzczegolow
  etykieta: string
  dane: DaneSekcji
  wynikWalidacji: boolean
  statusKompletnosci: StatusKompletnosciSekcji
  bledyKrytyczne: ProblemWalidacji[]
  ostrzezenia: ProblemWalidacji[]
  polaNiepewne: string[]
  wymaganaDoPublikacji: boolean
}

export type ModelSekcyjnySzczegolow = Record<KluczSekcjiSzczegolow, WynikSekcjiSzczegolow<unknown>>

export type AutosaveSzczegolow = {
  id: string
  dataZapisu: string
  dane: DaneFormularza
  grupy: GrupaSzkoleniowa[]
  adresaci: DaneAdresatow
  statusyPol: StatusyPolImportu
  aktywnaKopiaId: string | null
  zrodloOpublikowanegoId?: string
}

export type WpisHistoriiSzczegolow = {
  id: string
  typ: 'wersja' | 'status' | 'import' | 'autosave' | 'zdarzenie'
  etykietaWersji?: string
  data: string
  autorId: string
  autorNazwa: string
  komentarz: string
  zmianaStatusu?: {
    z?: StatusSzczegolow | StatusSzkolenia
    na: StatusSzczegolow | StatusSzkolenia
  }
  zdarzenieSpecjalne?: string
  dane?: DaneFormularza
  grupy?: GrupaSzkoleniowa[]
  adresaci?: DaneAdresatow
  statusyPol?: StatusyPolImportu
}

export type WersjaRoboczaGeneratora = {
  id: string
  wersja: string
  etykietaWersji: string
  nazwa: string
  dataZapisu: string
  autorId: string
  autorNazwa: string
  zrodloOpublikowanegoId?: string
  dane: DaneFormularza
  grupy: GrupaSzkoleniowa[]
  adresaci: DaneAdresatow
  statusyPol: StatusyPolImportu
}

export type KopiaRoboczaSzkolenia = WersjaRoboczaGeneratora

export type OpublikowaneSzczegolyOrganizacyjne = {
  id: string
  wersja: string
  nazwa: string
  dataPublikacji: string
  autorId: string
  autorNazwa: string
  opiekunId: string
  status: StatusOpublikowanychSzczegolow
  statusSzkolenia: StatusSzkolenia
  dane: DaneFormularza
  grupy: GrupaSzkoleniowa[]
  adresaci: DaneAdresatow
  statusyPol: StatusyPolImportu
  zrodloKopiiRoboczejId: string
}

export type WynikParseraMailaSzczegolow = {
  daneFormularza: Partial<DaneFormularza>
  pierwszaGrupa: Partial<GrupaSzkoleniowa>
  rozpoznaneObszary: string[]
  rozpoznanePola: string[]
  polaNiepewne: string[]
}
