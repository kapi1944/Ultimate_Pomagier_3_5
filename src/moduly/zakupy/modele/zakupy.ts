import type { StatusZapotrzebowaniaZakupowego } from '../../zamkniete/pulpit/modele/pulpit'

export type Produkt = {
  id: string
  nazwa: string
  rodzaj: 'MATERIAL_ZUZYWALNY' | 'SPRZET'
  sposobEwidencji: 'ILOSCIOWY' | 'EGZEMPLARZOWY'
  jednostkaMiary: string
  czyAktywny: boolean
}

export type WariantProduktu = {
  id: string
  produktId: Produkt['id']
  nazwa: string
  cechy: Record<string, string>
  kodProducenta?: string
  czyAktywny: boolean
}

// Wszystkie pozycje i stany wskazują ten sam katalog; wariant należy do produktu.
export type OdwolanieDoProduktu = {
  produktId: Produkt['id']
  wariantProduktuId?: WariantProduktu['id']
}

export type OfertaProduktu = OdwolanieDoProduktu & {
  id: string
  dostawca: string
  adresOferty?: string
  kodDostawcy?: string
}

// Kwoty w najmniejszych jednostkach waluty; snapshot utrwala cenę z chwili zakupu.
export type SnapshotCeny = {
  id: string
  ofertaProduktuId: OfertaProduktu['id']
  kwotaNetto: number
  kwotaBrutto: number
  waluta: string
  stawkaVat: number
  zarejestrowano: string
}

export type Zapotrzebowanie = {
  id: string
  nazwa: string
  status: StatusZapotrzebowaniaZakupowego
  utworzonePrzezId: string
  utworzonoAt: string
  uwagi?: string
}

export type PozycjaZapotrzebowania = {
  id: string
  zapotrzebowanieId: Zapotrzebowanie['id']
  // Zgłoszenie może poprzedzać wybór produktu z katalogu.
  produkt?: OdwolanieDoProduktu
  nazwa: string
  ilosc: number
  jednostkaMiary?: string
}

export type ListaZakupowa = {
  id: string
  nazwa: string
  status: 'ROBOCZA' | 'DO_REALIZACJI' | 'ZAMKNIETA'
  utworzono: string
}

export type PozycjaListyZakupowej = OdwolanieDoProduktu & {
  id: string
  listaZakupowaId: ListaZakupowa['id']
  pozycjeZapotrzebowaniaId: PozycjaZapotrzebowania['id'][]
  ilosc: number
  ofertaProduktuId?: OfertaProduktu['id']
}

export type Zamowienie = {
  id: string
  numer: string
  dostawca: string
  status: 'ROBOCZE' | 'ZLOZONE' | 'CZESCIOWO_DOSTARCZONE' | 'DOSTARCZONE' | 'ANULOWANE'
  utworzono: string
}

export type PozycjaZamowienia = OdwolanieDoProduktu & {
  id: string
  zamowienieId: Zamowienie['id']
  pozycjaListyZakupowejId?: PozycjaListyZakupowej['id']
  snapshotCenyId: SnapshotCeny['id']
  ilosc: number
}

export type Przesylka = {
  id: string
  zamowienieId: Zamowienie['id']
  status: 'OCZEKIWANA' | 'W_DRODZE' | 'ODEBRANA'
  numerSledzenia?: string
  planowanaDataDostawy?: string
  odebrano?: string
}

export type PozycjaPrzesylki = {
  id: string
  przesylkaId: Przesylka['id']
  pozycjaZamowieniaId: PozycjaZamowienia['id']
  ilosc: number
}

export type LokalizacjaMagazynowa = {
  id: string
  nazwa: string
  nadrzednaLokalizacjaId?: LokalizacjaMagazynowa['id']
  czyAktywna: boolean
}

// Egzemplarz ma stabilną tożsamość przy przenoszeniu między lokalizacjami.
export type EgzemplarzProduktu = OdwolanieDoProduktu & {
  id: string
  numerEwidencyjny: string
  numerSeryjny?: string
}

export type StanWLokalizacji = OdwolanieDoProduktu & {
  id: string
  lokalizacjaId: LokalizacjaMagazynowa['id']
  egzemplarzProduktuId?: EgzemplarzProduktu['id']
  ilosc: number
}

export type RuchMagazynowy = OdwolanieDoProduktu & {
  id: string
  rodzaj: 'PRZYJECIE' | 'WYDANIE' | 'PRZESUNIECIE' | 'KOREKTA'
  lokalizacjaZrodlowaId?: LokalizacjaMagazynowa['id']
  lokalizacjaDocelowaId?: LokalizacjaMagazynowa['id']
  egzemplarzProduktuId?: EgzemplarzProduktu['id']
  pozycjaPrzesylkiId?: PozycjaPrzesylki['id']
  pozycjaInwentaryzacjiId?: PozycjaInwentaryzacji['id']
  ilosc: number
  wykonano: string
  wykonanePrzezId: string
}

export type Inwentaryzacja = {
  id: string
  lokalizacjaId: LokalizacjaMagazynowa['id']
  status: 'ROBOCZA' | 'W_TRAKCIE' | 'ZAMKNIETA'
  rozpoczeto: string
  zakonczono?: string
}

export type PozycjaInwentaryzacji = OdwolanieDoProduktu & {
  id: string
  inwentaryzacjaId: Inwentaryzacja['id']
  egzemplarzProduktuId?: EgzemplarzProduktu['id']
  iloscOczekiwana: number
  iloscStwierdzona?: number
}

export type StanZakupow = {
  wersjaSchematu: 1
  produkty: Produkt[]
  wariantyProduktow: WariantProduktu[]
  ofertyProduktow: OfertaProduktu[]
  snapshotyCen: SnapshotCeny[]
  zapotrzebowania: Zapotrzebowanie[]
  pozycjeZapotrzebowan: PozycjaZapotrzebowania[]
  listyZakupowe: ListaZakupowa[]
  pozycjeListZakupowych: PozycjaListyZakupowej[]
  zamowienia: Zamowienie[]
  pozycjeZamowien: PozycjaZamowienia[]
  przesylki: Przesylka[]
  pozycjePrzesylek: PozycjaPrzesylki[]
  lokalizacjeMagazynowe: LokalizacjaMagazynowa[]
  egzemplarzeProduktow: EgzemplarzProduktu[]
  stanyWLokalizacjach: StanWLokalizacji[]
  ruchyMagazynowe: RuchMagazynowy[]
  inwentaryzacje: Inwentaryzacja[]
  pozycjeInwentaryzacji: PozycjaInwentaryzacji[]
}
