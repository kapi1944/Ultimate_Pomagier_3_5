import type {
  DaneAdresatow,
  DaneDokumentacjiMaterialow,
  DaneFirmy,
  DaneFormularza,
  GrupaSzkoleniowa,
} from './typy'

export const poczatkoweWzoryKlienta = {
  listaObecnosci: false,
  ankiety: false,
  certyfikaty: false,
  program: false,
  kartaInformacyjna: false,
  podreczniki: false,
  materialyDodatkowe: false,
  projektTesty: false,
  dostepnoscCyfrowa: false,
  logotypy: false,
  plusJedenEgzemplarz: false,
  wczesniejszyPrzyjazdTrenera: false,
  dokumentacjaZdjęciowa: false,
  karyWHarmonogramie: false,
  noweSzkolenieZaOcene: false,
  kfs: false,
}

export const poczatkoweSzczegolyWzorowKlienta = Object.fromEntries(
  Object.keys(poczatkoweWzoryKlienta).map((klucz) => [klucz, { nazwaPliku: '', uwagi: '' }]),
)

export const poczatkowaFirma: DaneFirmy = {
  nazwa: '',
  nip: '',
  adres: '',
  ulica: '',
  nrBudynku: '',
  nrLokalu: '',
  kodPocztowy: '',
  miasto: '',
  kraj: 'Polska',
  osobaKontaktowa: '',
  imieNazwiskoOdbiorcy: '',
  telefon: '',
  email: '',
  sposobWysylkiRaportu: '',
}

export const poczatkowaDokumentacja: DaneDokumentacjiMaterialow = {
  listaObecnosci: true,
  ankiety: true,
  certyfikaty: true,
  program: true,
  kartaInformacyjna: false,
  podreczniki: false,
  materialyDodatkowe: false,
  projektTesty: false,
  dostepnoscCyfrowa: false,
  logotypy: 'Nie',
  plusJedenEgzemplarz: false,
  wzoryKlienta: { ...poczatkoweWzoryKlienta },
  szczegolyWzorowKlienta: { ...poczatkoweSzczegolyWzorowKlienta },
}

export const poczatkoweDaneFormularza: DaneFormularza = {
  tytulSzkolenia: '',
  nazwaKlienta: '',
  organizator: 'SEMPER',
  opiekunId: '',
  status: 'NIEPEŁNE',
  statusSzkolenia: 'W PRZYGOTOWANIACH',
  powodNiezrealizowania: '',
  nabywca: { ...poczatkowaFirma },
  odbiorca: { ...poczatkowaFirma },
  czyNabywcaJestOdbiorca: false,
  wysylkaPaczkiDotyczy: false,
  odbiorcaPaczki: {
    nazwaFirmy: '',
    ulica: '',
    nrBudynku: '',
    nrLokalu: '',
    kodPocztowy: '',
    miasto: '',
    kraj: 'Polska',
    imieNazwisko: '',
    telefon: '',
    email: '',
  },
  dokumentacja: { ...poczatkowaDokumentacja, wzoryKlienta: { ...poczatkoweWzoryKlienta } },
  logotypy: {
    nazwaPliku: '',
    podglad: '',
  },
  dodatkoweWymogi: {
    wczesniejszyPrzyjazdTrenera: true,
    minutyWczesniej: 20,
    dokumentacjaZdjęciowa: false,
    karyWHarmonogramie: false,
    noweSzkolenieZaOcene: false,
    kfs: false,
    uwagi: '',
    wzoryKlienta: { ...poczatkoweWzoryKlienta },
    szczegolyWzorowKlienta: { ...poczatkoweSzczegolyWzorowKlienta },
  },
  programSzkolenia: '',
  uwagi: {
    wewnetrzne: '',
    informacjeNiepewne: '',
    opiekuna: '',
    dlaKlienta: '',
    dlaTrenera: '',
    dlaWysylaczy: '',
  },
}

export const poczatkowaGrupa: GrupaSzkoleniowa = {
  id: 'grupa-1',
  nazwa: 'Grupa 1',
  trenerzy: [],
  uczestnicy: [],
  formaSzkolenia: 'Stacjonarne',
  dataOd: '',
  dataDo: '',
  liczbaUczestnikow: 0,
  liczbaGodzin: 0,
  rodzajGodzin: 'Dydaktyczne (45 min)',
  nazwaNiestandardowychGodzin: '',
  liczbaMinutNiestandardowychGodzin: 45,
  miejsce: '',
  ktoZapewniaSale: '',
  cenaNetto: 0,
  trybCeny: 'za grupę',
  vat: 'Nie – 23%',
  terminPlatnosci: 0,
  protokol: false,
  mechanizmPodzielonejPlatnosci: false,
  dataUmowy: '',
  numerUmowy: '',
}

export const poczatkowiAdresaci: DaneAdresatow = {
  reczniAdresaci: '',
  trybTresci: 'Tylko zmiany',
  czyPodpis: true,
  wiadomoscWlasna: '',
}

export function utworzPoczatkowaGrupe(indeks: number): GrupaSzkoleniowa {
  return {
    ...poczatkowaGrupa,
    id: `grupa-${Date.now()}-${indeks}`,
    nazwa: `Grupa ${indeks}`,
    trenerzy: [],
  }
}
