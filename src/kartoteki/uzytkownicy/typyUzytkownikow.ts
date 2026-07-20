export const roleUzytkownikow = [
  'ARCHITEKT',
  'ADMINISTRATOR',
  'MODERATOR',
  'OPIEKUN',
  'PRACOWNIK',
  'TRENER',
  'KOORDYNATOR_KLIENTA',
  'GOSC',
] as const

export type RolaUzytkownika = (typeof roleUzytkownikow)[number]

export const organizacjeUzytkownikow = ['SEMPER', 'IIST', 'KLIENT', 'ZEWNETRZNY'] as const

export type OrganizacjaUzytkownika = (typeof organizacjeUzytkownikow)[number]

export const odznakiUzytkownikow = ['WYSYLACZ', 'AKCEPTUJACY', 'EKSPORTER', 'ROZLICZAJACY', 'AUDYTOR'] as const

export type OdznakaUzytkownika = (typeof odznakiUzytkownikow)[number]

export const statusyUzytkownikow = ['AKTYWNY', 'ZABLOKOWANY', 'NIEAKTYWNY'] as const

export type StatusUzytkownika = (typeof statusyUzytkownikow)[number]

export type Zwrot = '' | 'Pan' | 'Pani'
export type TytulNaukowy = '' | 'dr' | 'dr hab.' | 'mgr' | 'inż.' | 'mgr inż.' | 'prof.'
export type PrefiksTelefonu = string

export type Telefon = {
  prefiks: PrefiksTelefonu
  numer: string
  krajIso2?: string
  numerE164?: string
}

export type Uzytkownik = {
  id: string
  zwrot: Zwrot
  tytulNaukowy: TytulNaukowy
  imie: string
  nazwisko: string
  pseudonim: string
  email: string
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
  ostatnieLogowanie: string | null
  utworzono: string
  zaktualizowano: string
}

export type FormularzUzytkownika = Omit<Uzytkownik, 'id' | 'ostatnieLogowanie' | 'utworzono' | 'zaktualizowano' | 'wersjaUprawnien'>
export type KluczBledu = keyof FormularzUzytkownika | `email-${number}` | `telefon-${number}`
export type BledyFormularza = Partial<Record<KluczBledu, string>>
export type TrybFormularza = 'edycja' | 'nowy'

export type DaneNowegoUzytkownika = Pick<
  Uzytkownik,
  'imie' | 'nazwisko' | 'email' | 'rola' | 'organizacja' | 'przypisanyKlientId' | 'przypisanyTrenerId'
> & {
  odznaki?: OdznakaUzytkownika[]
  status?: StatusUzytkownika
}

export type ZmianaUzytkownika = Partial<
  Pick<
    Uzytkownik,
    | 'imie'
    | 'nazwisko'
    | 'pseudonim'
    | 'email'
    | 'emaile'
    | 'telefony'
    | 'rola'
    | 'organizacja'
    | 'odznaki'
    | 'status'
    | 'przypisanyKlientId'
    | 'przypisanyTrenerId'
    | 'wymagaZmianyHasla'
  >
>

export const metadaneRol: Record<RolaUzytkownika, { etykieta: string; kolor: string }> = {
  ARCHITEKT: { etykieta: 'Architekt', kolor: '#7f1d1d' },
  ADMINISTRATOR: { etykieta: 'Administrator', kolor: '#b91c1c' },
  MODERATOR: { etykieta: 'Moderator', kolor: '#7c3aed' },
  OPIEKUN: { etykieta: 'Opiekun', kolor: '#0369a1' },
  PRACOWNIK: { etykieta: 'Pracownik', kolor: '#047857' },
  TRENER: { etykieta: 'Trener', kolor: '#b45309' },
  KOORDYNATOR_KLIENTA: { etykieta: 'Koordynator klienta', kolor: '#9d174d' },
  GOSC: { etykieta: 'Gość', kolor: '#475569' },
}

export const etykietyRol = Object.fromEntries(
  Object.entries(metadaneRol).map(([rola, metadane]) => [rola, metadane.etykieta]),
) as Record<RolaUzytkownika, string>

export const koloryRol = Object.fromEntries(
  Object.entries(metadaneRol).map(([rola, metadane]) => [rola, metadane.kolor]),
) as Record<RolaUzytkownika, string>

export const poziomyRol: Record<RolaUzytkownika, number> = {
  ARCHITEKT: 8,
  ADMINISTRATOR: 7,
  MODERATOR: 6,
  OPIEKUN: 5,
  PRACOWNIK: 4,
  TRENER: 3,
  KOORDYNATOR_KLIENTA: 2,
  GOSC: 1,
}

export const domyslnyKolorProfilu = '#334155'

export const etykietyOrganizacji: Record<OrganizacjaUzytkownika, string> = {
  SEMPER: 'SEMPER',
  IIST: 'IIST',
  KLIENT: 'Klient',
  ZEWNETRZNY: 'Zewnętrzny',
}

export const metadaneOdznak: Record<OdznakaUzytkownika, { etykieta: string; opis: string }> = {
  WYSYLACZ: { etykieta: 'Wysyłacz', opis: 'Może uruchamiać wysyłkę w lokalnym obiegu.' },
  AKCEPTUJACY: { etykieta: 'Akceptujący', opis: 'Może akceptować przygotowane szczegóły.' },
  EKSPORTER: { etykieta: 'Eksporter', opis: 'Może eksportować dokumenty.' },
  ROZLICZAJACY: { etykieta: 'Rozliczający', opis: 'Odznaka przygotowana dla obiegu rozliczeń.' },
  AUDYTOR: { etykieta: 'Audytor', opis: 'Może przeglądać lokalny audyt zdarzeń.' },
}

export function pobierzPoziomRoli(rola: RolaUzytkownika) {
  return poziomyRol[rola]
}

export function pobierzNadrzednaRoleUzytkownika(uzytkownik: Pick<Uzytkownik, 'rola'>) {
  return uzytkownik.rola
}

export function czyJestArchitektem(uzytkownik: Pick<Uzytkownik, 'rola'> | null | undefined) {
  return uzytkownik?.rola === 'ARCHITEKT'
}

export function czyRolaJestCoNajmniej(rola: RolaUzytkownika, minimalnaRola: RolaUzytkownika) {
  return pobierzPoziomRoli(rola) >= pobierzPoziomRoli(minimalnaRola)
}

export function pobierzKolorTekstuDlaTla(kolor: string) {
  const dopasowanie = /^#([0-9a-f]{6})$/i.exec(kolor)
  if (!dopasowanie) return '#f8fafc'
  const wartosc = Number.parseInt(dopasowanie[1], 16)
  const jasnosc = ((wartosc >> 16) * 299 + ((wartosc >> 8) & 255) * 587 + (wartosc & 255) * 114) / 1000
  return jasnosc > 150 ? '#111827' : '#f8fafc'
}

export function pobierzNazweWyswietlanaUzytkownika(uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko' | 'pseudonim'>) {
  return uzytkownik.pseudonim.trim() || `${uzytkownik.imie} ${uzytkownik.nazwisko}`.trim() || 'Nieznany użytkownik'
}

export function pobierzNazweUzytkownika(uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko'>) {
  return `${uzytkownik.imie} ${uzytkownik.nazwisko}`.trim()
}

export function pobierzInicjalyUzytkownika(uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko' | 'pseudonim'>) {
  const czesci = `${uzytkownik.imie} ${uzytkownik.nazwisko}`.trim().split(/\s+/).filter(Boolean)
  const inicjaly = czesci.slice(0, 2).map((czesc) => czesc[0]).join('')
  return (inicjaly || uzytkownik.pseudonim.slice(0, 2) || '?').toLocaleUpperCase('pl')
}

export function czyKontoJestAktywne(uzytkownik: Pick<Uzytkownik, 'status'> | null | undefined) {
  return uzytkownik?.status === 'AKTYWNY'
}

export const czyUzytkownikJestAktywny = czyKontoJestAktywne

export function czyJestPracownikiemWewnetrznym(uzytkownik: Uzytkownik | null | undefined) {
  return Boolean(
    czyKontoJestAktywne(uzytkownik) &&
      (uzytkownik?.organizacja === 'SEMPER' || uzytkownik?.organizacja === 'IIST') &&
      uzytkownik.rola !== 'KOORDYNATOR_KLIENTA' &&
      uzytkownik.rola !== 'GOSC',
  )
}
