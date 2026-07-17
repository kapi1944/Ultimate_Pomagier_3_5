export type RolaUzytkownika =
  | 'ADMINISTRATOR'
  | 'MODERATOR'
  | 'OPIEKUN'
  | 'PRACOWNIK'
  | 'TRENER'
  | 'KOORDYNATOR_KLIENTA'
  | 'GOSC'

export type OrganizacjaUzytkownika = 'SEMPER' | 'IIST' | 'KLIENT' | 'ZEWNĘTRZNY'
export type StatusUzytkownika = 'AKTYWNY' | 'ZABLOKOWANY' | 'NIEAKTYWNY'
export type OdznakaUzytkownika = 'WYSYLACZ' | 'AKCEPTUJACY' | 'EKSPORTER' | 'ROZLICZAJACY' | 'AUDYTOR'
export type Zwrot = '' | 'Pan' | 'Pani'
export type TytulNaukowy = '' | 'dr' | 'dr hab.' | 'mgr' | 'inż.' | 'mgr inż.' | 'prof.'
export type PrefiksTelefonu = '+48'

export type Telefon = {
  prefiks: PrefiksTelefonu
  numer: string
}

export type Uzytkownik = {
  id: string
  zwrot: Zwrot
  tytulNaukowy: TytulNaukowy
  imie: string
  nazwisko: string
  pseudonim: string
  emaile: string[]
  telefony: Telefon[]
  login: string
  rola: RolaUzytkownika
  organizacja: OrganizacjaUzytkownika
  odznaki: OdznakaUzytkownika[]
  status: StatusUzytkownika
  kolorProfilu: string
  aliasyHistoryczne: string[]
  przypisanyKlientId?: string
  przypisanyTrenerId?: string
  wymagaZmianyHasla: boolean
  wersjaUprawnien: number
  ostatnieLogowanie?: string
  utworzono: string
  zaktualizowano: string
}

export type FormularzUzytkownika = Omit<Uzytkownik, 'id' | 'ostatnieLogowanie' | 'utworzono' | 'zaktualizowano' | 'wersjaUprawnien'>
export type KluczBledu = keyof FormularzUzytkownika | `email-${number}` | `telefon-${number}`
export type BledyFormularza = Partial<Record<KluczBledu, string>>
export type TrybFormularza = 'edycja' | 'nowy'

export const etykietyRol: Record<RolaUzytkownika, string> = {
  ADMINISTRATOR: 'Administrator',
  MODERATOR: 'Moderator',
  OPIEKUN: 'Opiekun',
  PRACOWNIK: 'Pracownik',
  TRENER: 'Trener',
  KOORDYNATOR_KLIENTA: 'Koordynator klienta',
  GOSC: 'Gość',
}

export const koloryRol: Record<RolaUzytkownika, string> = {
  ADMINISTRATOR: '#b91c1c',
  MODERATOR: '#7c3aed',
  OPIEKUN: '#0369a1',
  PRACOWNIK: '#047857',
  TRENER: '#b45309',
  KOORDYNATOR_KLIENTA: '#9d174d',
  GOSC: '#475569',
}

export const etykietyOrganizacji: Record<OrganizacjaUzytkownika, string> = {
  SEMPER: 'SEMPER',
  IIST: 'IIST',
  KLIENT: 'Klient',
  ZEWNĘTRZNY: 'Zewnętrzny',
}

export const metadaneOdznak: Record<OdznakaUzytkownika, { etykieta: string; opis: string }> = {
  WYSYLACZ: { etykieta: 'Wysyłacz', opis: 'Może wysyłać materiały i komunikaty.' },
  AKCEPTUJACY: { etykieta: 'Akceptujący', opis: 'Może akceptować przygotowane szczegóły.' },
  EKSPORTER: { etykieta: 'Eksporter', opis: 'Może eksportować dane.' },
  ROZLICZAJACY: { etykieta: 'Rozliczający', opis: 'Może wykonywać rozliczenia.' },
  AUDYTOR: { etykieta: 'Audytor', opis: 'Może czytać audyt.' },
}

export function pobierzNazweWyswietlanaUzytkownika(uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko' | 'pseudonim'>) {
  return uzytkownik.pseudonim.trim() || `${uzytkownik.imie} ${uzytkownik.nazwisko}`.trim() || 'Nieznany użytkownik'
}

export function pobierzInicjalyUzytkownika(uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko' | 'pseudonim'>) {
  const czesci = `${uzytkownik.imie} ${uzytkownik.nazwisko}`.trim().split(/\s+/).filter(Boolean)
  const inicjaly = czesci.slice(0, 2).map((czesc) => czesc[0]).join('')

  return (inicjaly || uzytkownik.pseudonim.slice(0, 2) || '?').toLocaleUpperCase('pl')
}

export function czyKontoJestAktywne(uzytkownik: Pick<Uzytkownik, 'status'> | null | undefined) {
  return uzytkownik?.status === 'AKTYWNY'
}
