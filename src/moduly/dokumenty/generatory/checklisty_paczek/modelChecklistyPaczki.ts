export type StatusGotowosciPozycji = 'NIEGOTOWE' | 'W_TOKU_LUB_PROBLEM' | 'CZESCIOWO_GOTOWE' | 'GOTOWE'
export type StatusChecklistyPaczki = 'KOPIA_ROBOCZA' | 'GOTOWA_DO_WYDRUKU' | 'WYDRUKOWANA' | 'KOMPLETNA' | 'ZARCHIWIZOWANA'
export type TypRegulyIlosci = 'STALA' | 'UCZESTNICY' | 'UCZESTNICY_RAZY_MNOZNIK' | 'UCZESTNICY_PLUS_DODATEK' | 'NA_KAZDY_DZIEN' | 'RECZNA' | 'WYLACZONA'
export type TypZalacznikaChecklisty = 'SKAN_PODPISANEJ_CHECKLISTY' | 'ZDJECIE_PACZKI' | 'INSTRUKCJA' | 'INNY'

export type RegulaIlosci = {
  typ: TypRegulyIlosci
  wartoscStala?: number
  mnoznik?: number
  wartoscReczna?: number
}

export type DodatkowyEgzemplarz = {
  wartosc: number
  opis: string
}

export type KategoriaChecklisty = {
  id: string
  nazwa: string
  kolejnosc: number
}

export type PozycjaChecklisty = {
  id: string
  kategoriaId: string
  nazwa: string
  kolejnosc: number
  statusGotowosci: StatusGotowosciPozycji
  czyWymagana: boolean
  czyOpcjonalna: boolean
  czyNieDotyczy: boolean
  czyOnline: boolean
  regulaIlosci: RegulaIlosci
  dodatkoweEgzemplarze: DodatkowyEgzemplarz[]
  nadpisanieReczne: number | null
  uwagiDrukowane: string
  notatkiWewnetrzne: string
}

export type DaneOdbiorcyChecklisty = {
  nazwaFirmy: string
  imieNazwisko: string
  ulica: string
  nrBudynku: string
  nrLokalu: string
  kodPocztowy: string
  miasto: string
  kraj: string
  telefon: string
  email: string
  zrodloPropozycji: string | null
}

export type WariantMaterialow = {
  id: string
  nazwa: string
  liczbaUczestnikow: number
  uczestnicyId: string[]
  logotypy: Array<{ nazwa: string; podglad: string }>
  finansowanie: string
}

export type MigawkaZrodlaChecklisty = {
  szczegolyOrganizacyjneId: string
  grupaId: string
  odciskDanych: string
  tytulSzkolenia: string
  klient: string
  opiekunId: string
  trenerzy: string[]
  terminy: string[]
  miejsce: string
  uczestnicy: Array<{ id: string | null; nazwaPelna: string }>
  liczbaUczestnikow: number
  logotypy: Array<{ nazwa: string; podglad: string }>
  finansowanie: string
  odbiorca: DaneOdbiorcyChecklisty
}

export type WersjaWydrukuChecklisty = {
  wersja: number
  identyfikator: string
  odciskTresci: string
  utworzono: string
  autorId: string | null
}

export type ZalacznikChecklisty = {
  id: string
  nazwa: string
  typ: TypZalacznikaChecklisty
  dane: string
  typMime: string
  dodano: string
  autorId: string | null
  wersjaWydruku: number | null
}

export type WpisAudytuChecklisty = {
  id: string
  typ: 'UTWORZENIE' | 'EDYCJA' | 'ZMIANA_ILOSCI' | 'NADPISANIE_RECZNE' | 'ZMIANA_STATUSU' | 'WYDRUK' | 'NOWA_WERSJA' | 'PROSBA_O_AKCEPTACJE' | 'ODPOWIEDZ_AKCEPTACJI' | 'DODANIE_ZALACZNIKA' | 'ARCHIWIZACJA' | 'PONOWNE_OTWARCIE' | 'ZMIANA_PARAMETROW_PACZKI'
  data: string
  uzytkownikId: string | null
  opis: string
}

export type ProsbaOWeryfikacje = {
  id: string
  odUzytkownikaId: string
  doUzytkownikaId: string
  utworzono: string
  status: 'OCZEKUJE' | 'ZAAKCEPTOWANA' | 'ODRZUCONA'
  odpowiedz: string
}

export type DaneChecklistyPaczki = {
  identyfikator: string
  numerDzienny: number
  statusChecklisty: StatusChecklistyPaczki
  szczegolyOrganizacyjneId: string | null
  grupaId: string | null
  migawkaZrodla: MigawkaZrodlaChecklisty | null
  czyDaneZrodloweNowsze: boolean
  klient: string
  czyKlientNadpisany: boolean
  opiekunId: string
  wysylaczId: string | null
  pilna: boolean
  kategorie: KategoriaChecklisty[]
  pozycje: PozycjaChecklisty[]
  wariantyMaterialow: WariantMaterialow[]
  daneOdbiorcy: DaneOdbiorcyChecklisty
  przewoznik: string
  numerPrzesylki: string
  waga: string
  wysokosc: string
  wersjeWydruku: WersjaWydrukuChecklisty[]
  zalaczniki: ZalacznikChecklisty[]
  historia: WpisAudytuChecklisty[]
  prosbyOWeryfikacje: ProsbaOWeryfikacje[]
}

const nazwyKategoriiDomyslnych = ['Materiały', 'Teczki', 'Pakiet CRM', 'Gadżety', 'Inne']

function utworzId(prefiks: string) {
  return `${prefiks}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function dodatkiDoSumy(dodatki: DodatkowyEgzemplarz[]) {
  return dodatki.reduce((suma, dodatek) => suma + Math.max(0, dodatek.wartosc || 0), 0)
}

export function utworzKategorieDomyslne(): KategoriaChecklisty[] {
  return nazwyKategoriiDomyslnych.map((nazwa, kolejnosc) => ({ id: `kategoria-${kolejnosc + 1}`, nazwa, kolejnosc }))
}

function utworzPozycjeDomyslne(kategorie: KategoriaChecklisty[], wariantOnline: boolean): PozycjaChecklisty[] {
  const kategoria = (nazwa: string) => kategorie.find((pozycja) => pozycja.nazwa === nazwa)?.id ?? kategorie[0].id
  const utworz = (nazwa: string, nazwaKategorii: string, regulaIlosci: RegulaIlosci, kolejnosc: number, czyOnline = false): PozycjaChecklisty => ({
    id: utworzId('pozycja'),
    kategoriaId: kategoria(nazwaKategorii),
    nazwa,
    kolejnosc,
    statusGotowosci: 'NIEGOTOWE',
    czyWymagana: true,
    czyOpcjonalna: false,
    czyNieDotyczy: false,
    czyOnline,
    regulaIlosci,
    dodatkoweEgzemplarze: [],
    nadpisanieReczne: null,
    uwagiDrukowane: '',
    notatkiWewnetrzne: '',
  })

  return [
    utworz('Podręczniki / materiały szkoleniowe', 'Materiały', { typ: 'UCZESTNICY' }, 0, wariantOnline),
    utworz('Materiały dodatkowe', 'Materiały', { typ: 'UCZESTNICY' }, 1, wariantOnline),
    utworz('Ankiety', 'Materiały', { typ: 'UCZESTNICY' }, 2),
    utworz('Programy szkolenia', 'Materiały', { typ: 'UCZESTNICY' }, 3),
    utworz('Certyfikaty', 'Materiały', { typ: 'UCZESTNICY' }, 4),
    utworz('Lista obecności', 'Pakiet CRM', { typ: 'STALA', wartoscStala: 1 }, 0),
    utworz('Karta na drzwi', 'Pakiet CRM', { typ: 'STALA', wartoscStala: 2 }, 1),
    utworz('Pre-test + Post-test', 'Pakiet CRM', { typ: 'UCZESTNICY_RAZY_MNOZNIK', mnoznik: 2 }, 2),
    utworz('Długopisy', 'Gadżety', { typ: 'UCZESTNICY_PLUS_DODATEK' }, 0),
    utworz('Torby', 'Gadżety', { typ: 'UCZESTNICY' }, 1),
  ]
}

export function obliczIloscAutomatyczna(pozycja: PozycjaChecklisty, liczbaUczestnikow: number, liczbaDni: number) {
  const uczestnicy = Math.max(0, liczbaUczestnikow)
  const dni = Math.max(0, liczbaDni)
  const regula = pozycja.regulaIlosci

  switch (regula.typ) {
    case 'STALA': return Math.max(0, regula.wartoscStala ?? 0)
    case 'UCZESTNICY': return uczestnicy
    case 'UCZESTNICY_RAZY_MNOZNIK': return uczestnicy * Math.max(1, regula.mnoznik ?? 1)
    case 'UCZESTNICY_PLUS_DODATEK': return uczestnicy + dodatkiDoSumy(pozycja.dodatkoweEgzemplarze)
    case 'NA_KAZDY_DZIEN': return dni
    case 'RECZNA': return Math.max(0, regula.wartoscReczna ?? 0)
    case 'WYLACZONA': return 0
  }
}

export function pobierzIloscPozycji(pozycja: PozycjaChecklisty, liczbaUczestnikow: number, liczbaDni: number) {
  const automatyczna = obliczIloscAutomatyczna(pozycja, liczbaUczestnikow, liczbaDni)
  return { automatyczna, koncowa: pozycja.nadpisanieReczne ?? automatyczna, czyNadpisanaRecznie: pozycja.nadpisanieReczne !== null }
}

export function formatujIloscPozycji(pozycja: PozycjaChecklisty, liczbaUczestnikow: number, liczbaDni: number) {
  const ilosc = pobierzIloscPozycji(pozycja, liczbaUczestnikow, liczbaDni)
  if (ilosc.czyNadpisanaRecznie) return String(ilosc.koncowa)
  if (pozycja.regulaIlosci.typ === 'UCZESTNICY_RAZY_MNOZNIK' && (pozycja.regulaIlosci.mnoznik ?? 1) > 1) return `${pozycja.regulaIlosci.mnoznik}x ${liczbaUczestnikow}`
  const dodatki = pozycja.dodatkoweEgzemplarze.filter((dodatek) => dodatek.wartosc > 0)
  if (dodatki.length) return `${Math.max(0, ilosc.automatyczna - dodatkiDoSumy(dodatki))} + ${dodatki.map((dodatek) => `${dodatek.wartosc} ${dodatek.opis}`.trim()).join(', ')}`
  return String(ilosc.koncowa)
}

export function formatujTerminyZPrzerwami(wartosci: string[]) {
  const daty = [...new Set(wartosci.filter(Boolean))]
    .map((wartosc) => new Date(`${wartosc}T00:00:00`))
    .filter((data) => !Number.isNaN(data.getTime()))
    .sort((pierwsza, druga) => pierwsza.getTime() - druga.getTime())
  const grupy: Date[][] = []

  daty.forEach((data) => {
    const ostatniaGrupa = grupy.at(-1)
    const poprzednia = ostatniaGrupa?.at(-1)
    if (poprzednia && ostatniaGrupa && data.getTime() - poprzednia.getTime() === 86400000) ostatniaGrupa.push(data)
    else grupy.push([data])
  })

  const dataTekst = (data: Date) => `${String(data.getDate()).padStart(2, '0')}.${String(data.getMonth() + 1).padStart(2, '0')}.${data.getFullYear()}`
  return grupy.map((grupa) => grupa.length === 1 ? dataTekst(grupa[0]) : `${dataTekst(grupa[0])}-${dataTekst(grupa.at(-1)!)}`).join(', ')
}

export function utworzDomyslneDaneChecklisty(opcje: { identyfikator: string; numerDzienny: number; migawka?: MigawkaZrodlaChecklisty | null; wariantOnline?: boolean; uzytkownikId?: string | null }): DaneChecklistyPaczki {
  const migawka = opcje.migawka ?? null
  const kategorie = utworzKategorieDomyslne()
  const teraz = new Date().toISOString()
  return {
    identyfikator: opcje.identyfikator,
    numerDzienny: opcje.numerDzienny,
    statusChecklisty: 'KOPIA_ROBOCZA',
    szczegolyOrganizacyjneId: migawka?.szczegolyOrganizacyjneId ?? null,
    grupaId: migawka?.grupaId ?? null,
    migawkaZrodla: migawka,
    czyDaneZrodloweNowsze: false,
    klient: migawka?.klient ?? '',
    czyKlientNadpisany: false,
    opiekunId: migawka?.opiekunId ?? '',
    wysylaczId: null,
    pilna: false,
    kategorie,
    pozycje: utworzPozycjeDomyslne(kategorie, Boolean(opcje.wariantOnline)),
    wariantyMaterialow: [],
    daneOdbiorcy: migawka?.odbiorca ?? { nazwaFirmy: '', imieNazwisko: '', ulica: '', nrBudynku: '', nrLokalu: '', kodPocztowy: '', miasto: '', kraj: 'Polska', telefon: '', email: '', zrodloPropozycji: null },
    przewoznik: '',
    numerPrzesylki: '',
    waga: '',
    wysokosc: '',
    wersjeWydruku: [],
    zalaczniki: [],
    historia: [{ id: utworzId('audyt'), typ: 'UTWORZENIE', data: teraz, uzytkownikId: opcje.uzytkownikId ?? null, opis: 'Utworzono checklistę paczki.' }],
    prosbyOWeryfikacje: [],
  }
}

export function czyDaneOdbiorcySaKompletne(dane: DaneOdbiorcyChecklisty) {
  return [dane.imieNazwisko || dane.nazwaFirmy, dane.ulica, dane.nrBudynku, dane.kodPocztowy, dane.miasto, dane.kraj].every((wartosc) => wartosc.trim().length > 0)
}

export function czyMoznaFinalizowacCheckliste(dane: DaneChecklistyPaczki) {
  const brakujacePozycje = dane.pozycje.filter((pozycja) => pozycja.czyWymagana && !pozycja.czyOpcjonalna && !pozycja.czyNieDotyczy && pozycja.statusGotowosci !== 'GOTOWE')
  return { czyMozna: !brakujacePozycje.length && czyDaneOdbiorcySaKompletne(dane.daneOdbiorcy), brakujacePozycje, czyBrakujeDanychWysylkowych: !czyDaneOdbiorcySaKompletne(dane.daneOdbiorcy) }
}

export function pobierzEtykieteStatusuGotowosci(status: StatusGotowosciPozycji) {
  return { NIEGOTOWE: 'Niegotowe', W_TOKU_LUB_PROBLEM: 'W toku / problem', CZESCIOWO_GOTOWE: 'Częściowo gotowe', GOTOWE: 'Gotowe' }[status]
}
