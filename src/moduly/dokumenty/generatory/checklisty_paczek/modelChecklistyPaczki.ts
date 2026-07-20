export type StatusGotowosciPozycji = 'NIEGOTOWE' | 'W_TOKU_LUB_PROBLEM' | 'CZESCIOWO_GOTOWE' | 'GOTOWE'
export type StatusChecklistyPaczki = 'KOPIA_ROBOCZA' | 'GOTOWA_DO_WYDRUKU' | 'WYDRUKOWANA' | 'KOMPLETNA' | 'ZARCHIWIZOWANA'
export type TypRegulyIlosci = 'STALA' | 'UCZESTNICY' | 'UCZESTNICY_RAZY_MNOZNIK' | 'UCZESTNICY_PLUS_DODATEK' | 'NA_KAZDY_DZIEN' | 'RECZNA' | 'WYLACZONA'
export type TypZalacznikaChecklisty = 'SKAN_PODPISANEJ_CHECKLISTY' | 'ZDJECIE_PACZKI' | 'INSTRUKCJA' | 'INNY'
export type TrybPrePostTestow = 'BRAK' | 'PRE' | 'POST' | 'PRE_I_POST'

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
  trybPrePost: TrybPrePostTestow | null
  dodatkoweEgzemplarze: DodatkowyEgzemplarz[]
  nadpisanieReczne: number | null
  wzorKlienta: string
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

export type UwagaZeSzczegolow = {
  etykieta: string
  tresc: string
}

export type MigawkaZrodlaChecklisty = {
  szczegolyOrganizacyjneId: string
  grupaId: string
  nazwaGrupy: string
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
  uwagiZeSzczegolow: UwagaZeSzczegolow[]
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
  dataWyslania: string
  osobaPakujaca: string
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

function odbiorcaDomyslny(): DaneOdbiorcyChecklisty {
  return { nazwaFirmy: '', imieNazwisko: '', ulica: '', nrBudynku: '', nrLokalu: '', kodPocztowy: '', miasto: '', kraj: 'Polska', telefon: '', email: '', zrodloPropozycji: null }
}

export function utworzKategorieDomyslne(): KategoriaChecklisty[] {
  return nazwyKategoriiDomyslnych.map((nazwa, kolejnosc) => ({ id: `kategoria-${kolejnosc + 1}`, nazwa, kolejnosc }))
}

export function utworzNowaKategorieChecklisty(kategorie: KategoriaChecklisty[], nazwa: string): KategoriaChecklisty | null {
  const nazwaPoPrzycieciu = nazwa.trim()
  if (!nazwaPoPrzycieciu || kategorie.some((kategoria) => kategoria.nazwa.localeCompare(nazwaPoPrzycieciu, 'pl', { sensitivity: 'accent' }) === 0)) return null
  return { id: utworzId('kategoria'), nazwa: nazwaPoPrzycieciu, kolejnosc: Math.max(-1, ...kategorie.map((kategoria) => kategoria.kolejnosc)) + 1 }
}

export function utworzNowaPozycjeChecklisty(kategoriaId: string, nazwa: string, pozycje: PozycjaChecklisty[]): PozycjaChecklisty | null {
  const nazwaPoPrzycieciu = nazwa.trim()
  if (!kategoriaId || !nazwaPoPrzycieciu) return null
  return {
    id: utworzId('pozycja'),
    kategoriaId,
    nazwa: nazwaPoPrzycieciu,
    kolejnosc: Math.max(-1, ...pozycje.filter((pozycja) => pozycja.kategoriaId === kategoriaId).map((pozycja) => pozycja.kolejnosc)) + 1,
    statusGotowosci: 'NIEGOTOWE',
    czyWymagana: true,
    czyOpcjonalna: false,
    czyNieDotyczy: false,
    czyOnline: false,
    regulaIlosci: { typ: 'UCZESTNICY' },
    trybPrePost: null,
    dodatkoweEgzemplarze: [],
    nadpisanieReczne: null,
    wzorKlienta: '',
    uwagiDrukowane: '',
    notatkiWewnetrzne: '',
  }
}

function utworzPozycjeDomyslne(kategorie: KategoriaChecklisty[], wariantOnline: boolean): PozycjaChecklisty[] {
  const kategoria = (nazwa: string) => kategorie.find((pozycja) => pozycja.nazwa === nazwa)?.id ?? kategorie[0].id
  const utworz = (nazwa: string, nazwaKategorii: string, regulaIlosci: RegulaIlosci, kolejnosc: number, opcje: Partial<PozycjaChecklisty> = {}): PozycjaChecklisty => ({
    id: utworzId('pozycja'),
    kategoriaId: kategoria(nazwaKategorii),
    nazwa,
    kolejnosc,
    statusGotowosci: 'NIEGOTOWE',
    czyWymagana: true,
    czyOpcjonalna: false,
    czyNieDotyczy: false,
    czyOnline: false,
    regulaIlosci,
    trybPrePost: null,
    dodatkoweEgzemplarze: [],
    nadpisanieReczne: null,
    wzorKlienta: '',
    uwagiDrukowane: '',
    notatkiWewnetrzne: '',
    ...opcje,
  })

  return [
    utworz('Prezentacje', 'Materiały', { typ: 'UCZESTNICY' }, 0),
    utworz('Podręczniki / materiały szkoleniowe', 'Materiały', { typ: 'UCZESTNICY' }, 1, { czyOnline: wariantOnline }),
    utworz('Materiały dodatkowe', 'Materiały', { typ: 'UCZESTNICY' }, 2, { czyOnline: wariantOnline }),
    utworz('Pre/Post-testy', 'Materiały', { typ: 'UCZESTNICY' }, 3, { czyWymagana: false, trybPrePost: 'BRAK' }),
    utworz('Teczki', 'Teczki', { typ: 'UCZESTNICY' }, 0, { uwagiDrukowane: 'Skład: Program szkolenia, notatnik, wizytówka' }),
    utworz('Lista obecności', 'Pakiet CRM', { typ: 'STALA', wartoscStala: 1 }, 0),
    utworz('Ankiety', 'Pakiet CRM', { typ: 'UCZESTNICY' }, 1),
    utworz('Certyfikaty / Dyplomy', 'Pakiet CRM', { typ: 'UCZESTNICY' }, 2),
    utworz('Karta na drzwi', 'Pakiet CRM', { typ: 'STALA', wartoscStala: 2 }, 3),
    utworz('Długopisy', 'Gadżety', { typ: 'UCZESTNICY_PLUS_DODATEK' }, 0),
    utworz('Torby', 'Gadżety', { typ: 'UCZESTNICY' }, 1),
  ]
}

export function czyPozycjaZaleznaOdUczestnikow(pozycja: PozycjaChecklisty) {
  return pozycja.trybPrePost !== null || ['UCZESTNICY', 'UCZESTNICY_RAZY_MNOZNIK', 'UCZESTNICY_PLUS_DODATEK'].includes(pozycja.regulaIlosci.typ)
}

export function czyPozycjaJestAktywna(pozycja: PozycjaChecklisty) {
  return !pozycja.czyNieDotyczy && pozycja.trybPrePost !== 'BRAK'
}

export function obliczIloscPodstawowa(pozycja: PozycjaChecklisty, liczbaUczestnikow: number, liczbaDni: number) {
  const uczestnicy = Math.max(0, liczbaUczestnikow)
  const dni = Math.max(0, liczbaDni)
  if (pozycja.trybPrePost === 'BRAK') return 0
  if (pozycja.trybPrePost === 'PRE' || pozycja.trybPrePost === 'POST') return uczestnicy
  if (pozycja.trybPrePost === 'PRE_I_POST') return uczestnicy * 2

  switch (pozycja.regulaIlosci.typ) {
    case 'STALA': return Math.max(0, pozycja.regulaIlosci.wartoscStala ?? 0)
    case 'UCZESTNICY':
    case 'UCZESTNICY_PLUS_DODATEK': return uczestnicy
    case 'UCZESTNICY_RAZY_MNOZNIK': return uczestnicy * Math.max(1, pozycja.regulaIlosci.mnoznik ?? 1)
    case 'NA_KAZDY_DZIEN': return dni
    case 'RECZNA': return Math.max(0, pozycja.regulaIlosci.wartoscReczna ?? 0)
    case 'WYLACZONA': return 0
  }
}

export function obliczIloscAutomatyczna(pozycja: PozycjaChecklisty, liczbaUczestnikow: number, liczbaDni: number) {
  const podstawa = obliczIloscPodstawowa(pozycja, liczbaUczestnikow, liczbaDni)
  return podstawa + (czyPozycjaZaleznaOdUczestnikow(pozycja) ? dodatkiDoSumy(pozycja.dodatkoweEgzemplarze) : 0)
}

export function pobierzIloscPozycji(pozycja: PozycjaChecklisty, liczbaUczestnikow: number, liczbaDni: number) {
  const automatyczna = obliczIloscAutomatyczna(pozycja, liczbaUczestnikow, liczbaDni)
  return { automatyczna, koncowa: pozycja.nadpisanieReczne ?? automatyczna, czyNadpisanaRecznie: pozycja.nadpisanieReczne !== null }
}

export function formatujIloscPozycji(pozycja: PozycjaChecklisty, liczbaUczestnikow: number, liczbaDni: number) {
  if (pozycja.czyOnline) return 'Online'
  if (pozycja.trybPrePost === 'BRAK') return '—'
  const ilosc = pobierzIloscPozycji(pozycja, liczbaUczestnikow, liczbaDni)
  if (ilosc.czyNadpisanaRecznie) return String(ilosc.koncowa)
  const podstawa = obliczIloscPodstawowa(pozycja, liczbaUczestnikow, liczbaDni)
  const opisPodstawy = pozycja.trybPrePost === 'PRE_I_POST'
    ? `2x ${Math.max(0, liczbaUczestnikow)}`
    : pozycja.regulaIlosci.typ === 'UCZESTNICY_RAZY_MNOZNIK' && (pozycja.regulaIlosci.mnoznik ?? 1) > 1
      ? `${pozycja.regulaIlosci.mnoznik}x ${Math.max(0, liczbaUczestnikow)}`
      : String(podstawa)
  const dodatki = pozycja.dodatkoweEgzemplarze.filter((dodatek) => dodatek.wartosc > 0)
  return dodatki.length ? `${opisPodstawy} + ${dodatki.map((dodatek) => `${dodatek.wartosc} ${dodatek.opis}`.trim()).join(', ')}` : opisPodstawy
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
  return grupy.map((grupa) => {
    if (grupa.length === 1) return dataTekst(grupa[0])
    const pierwsza = grupa[0]
    const ostatnia = grupa.at(-1)!
    if (pierwsza.getFullYear() === ostatnia.getFullYear() && pierwsza.getMonth() === ostatnia.getMonth()) return `${String(pierwsza.getDate()).padStart(2, '0')}–${dataTekst(ostatnia)}`
    if (pierwsza.getFullYear() === ostatnia.getFullYear()) return `${String(pierwsza.getDate()).padStart(2, '0')}.${String(pierwsza.getMonth() + 1).padStart(2, '0')}–${dataTekst(ostatnia)}`
    return `${dataTekst(pierwsza)}–${dataTekst(ostatnia)}`
  }).join(', ')
}

export function zastosujWariantMaterialowOnline(dane: DaneChecklistyPaczki): DaneChecklistyPaczki {
  return {
    ...dane,
    pozycje: dane.pozycje.map((pozycja) => {
      const nazwa = pozycja.nazwa.toLocaleLowerCase('pl')
      const czyMaterialOnline = nazwa.includes('podręczniki') || nazwa.includes('materiały dodatkowe')
      const czyDokumentDoDruku = nazwa.includes('lista obecności') || nazwa.includes('ankiety') || nazwa.includes('certyfikaty')
      return czyMaterialOnline ? { ...pozycja, czyOnline: true } : czyDokumentDoDruku ? { ...pozycja, czyOnline: false } : pozycja
    }),
  }
}

export function przeniesPozycjeWObrebieKategorii(dane: DaneChecklistyPaczki, pozycjaId: string, przesuniecie: -1 | 1): DaneChecklistyPaczki {
  const pozycja = dane.pozycje.find((obecna) => obecna.id === pozycjaId)
  if (!pozycja) return dane
  const wKategorii = dane.pozycje.filter((obecna) => obecna.kategoriaId === pozycja.kategoriaId).sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc)
  const indeks = wKategorii.findIndex((obecna) => obecna.id === pozycjaId)
  const cel = indeks + przesuniecie
  if (cel < 0 || cel >= wKategorii.length) return dane
  const druga = wKategorii[cel]
  return { ...dane, pozycje: dane.pozycje.map((obecna) => obecna.id === pozycja.id ? { ...obecna, kolejnosc: druga.kolejnosc } : obecna.id === druga.id ? { ...obecna, kolejnosc: pozycja.kolejnosc } : obecna) }
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
    daneOdbiorcy: migawka?.odbiorca ?? odbiorcaDomyslny(),
    przewoznik: '',
    numerPrzesylki: '',
    waga: '',
    wysokosc: '',
    dataWyslania: '',
    osobaPakujaca: '',
    wersjeWydruku: [],
    zalaczniki: [],
    historia: [{ id: utworzId('audyt'), typ: 'UTWORZENIE', data: teraz, uzytkownikId: opcje.uzytkownikId ?? null, opis: 'Utworzono checklistę paczki.' }],
    prosbyOWeryfikacje: [],
  }
}

export function normalizujDaneChecklisty(dane: DaneChecklistyPaczki): DaneChecklistyPaczki {
  const migawka = dane.migawkaZrodla ? {
    ...dane.migawkaZrodla,
    nazwaGrupy: dane.migawkaZrodla.nazwaGrupy ?? dane.migawkaZrodla.grupaId,
    uwagiZeSzczegolow: dane.migawkaZrodla.uwagiZeSzczegolow ?? [],
    logotypy: dane.migawkaZrodla.logotypy ?? [],
  } : null
  return {
    ...dane,
    migawkaZrodla: migawka,
    pozycje: dane.pozycje.map((pozycja) => ({
      ...pozycja,
      trybPrePost: pozycja.trybPrePost ?? (pozycja.nazwa.toLocaleLowerCase('pl').includes('pre-test') ? 'PRE_I_POST' : null),
      wzorKlienta: pozycja.wzorKlienta ?? '',
      dodatkoweEgzemplarze: pozycja.dodatkoweEgzemplarze ?? [],
      nadpisanieReczne: pozycja.nadpisanieReczne ?? null,
      uwagiDrukowane: pozycja.uwagiDrukowane ?? '',
      notatkiWewnetrzne: pozycja.notatkiWewnetrzne ?? '',
    })),
    wariantyMaterialow: dane.wariantyMaterialow ?? [],
    daneOdbiorcy: { ...odbiorcaDomyslny(), ...dane.daneOdbiorcy },
    dataWyslania: dane.dataWyslania ?? '',
    osobaPakujaca: dane.osobaPakujaca ?? '',
    przewoznik: dane.przewoznik ?? '',
    numerPrzesylki: dane.numerPrzesylki ?? '',
    waga: dane.waga ?? '',
    wysokosc: dane.wysokosc ?? '',
  }
}

export function czyDaneOdbiorcySaKompletne(dane: DaneOdbiorcyChecklisty) {
  return [dane.imieNazwisko || dane.nazwaFirmy, dane.ulica, dane.nrBudynku, dane.kodPocztowy, dane.miasto, dane.kraj].every((wartosc) => wartosc.trim().length > 0)
}

export function czyMoznaFinalizowacCheckliste(dane: DaneChecklistyPaczki) {
  const brakujacePozycje = dane.pozycje.filter((pozycja) => pozycja.czyWymagana && !pozycja.czyOpcjonalna && czyPozycjaJestAktywna(pozycja) && !pozycja.czyOnline && pozycja.statusGotowosci !== 'GOTOWE')
  return { czyMozna: !brakujacePozycje.length && czyDaneOdbiorcySaKompletne(dane.daneOdbiorcy), brakujacePozycje, czyBrakujeDanychWysylkowych: !czyDaneOdbiorcySaKompletne(dane.daneOdbiorcy) }
}

export function pobierzEtykieteStatusuGotowosci(status: StatusGotowosciPozycji) {
  return { NIEGOTOWE: 'Niegotowe', W_TOKU_LUB_PROBLEM: 'W toku / problem', CZESCIOWO_GOTOWE: 'Częściowo gotowe', GOTOWE: 'Gotowe' }[status]
}
