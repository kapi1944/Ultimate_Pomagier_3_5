export const roleUzytkownikow = [
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

export type Uzytkownik = {
  id: string
  imie: string
  nazwisko: string
  email: string
  rola: RolaUzytkownika
  organizacja: OrganizacjaUzytkownika
  odznaki: OdznakaUzytkownika[]
  status: StatusUzytkownika
  przypisanyKlientId?: string
  przypisanyTrenerId?: string
  wymagaZmianyHasla: boolean
  wersjaUprawnien: number
  ostatnieLogowanie: string | null
  utworzono: string
  zaktualizowano: string
}

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
    | 'email'
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
  ADMINISTRATOR: { etykieta: 'Administrator', kolor: '#b91c1c' },
  MODERATOR: { etykieta: 'Moderator', kolor: '#7c3aed' },
  OPIEKUN: { etykieta: 'Opiekun', kolor: '#0f766e' },
  PRACOWNIK: { etykieta: 'Pracownik', kolor: '#1d4ed8' },
  TRENER: { etykieta: 'Trener', kolor: '#b45309' },
  KOORDYNATOR_KLIENTA: { etykieta: 'Koordynator klienta', kolor: '#be123c' },
  GOSC: { etykieta: 'Gość', kolor: '#475569' },
}

export const etykietyOrganizacji: Record<OrganizacjaUzytkownika, string> = {
  SEMPER: 'SEMPER',
  IIST: 'IIST',
  KLIENT: 'Klient',
  ZEWNETRZNY: 'Zewnętrzny',
}

export const metadaneOdznak: Record<OdznakaUzytkownika, { etykieta: string; opis: string }> = {
  WYSYLACZ: { etykieta: 'Wysyłacz', opis: 'Może uruchamiać wysyłkę w lokalnym obiegu.' },
  AKCEPTUJACY: { etykieta: 'Akceptujący', opis: 'Może akceptować szczegóły organizacyjne.' },
  EKSPORTER: { etykieta: 'Eksporter', opis: 'Może eksportować dokumenty.' },
  ROZLICZAJACY: { etykieta: 'Rozliczający', opis: 'Odznaka przygotowana dla obiegu rozliczeń.' },
  AUDYTOR: { etykieta: 'Audytor', opis: 'Może przeglądać lokalny audyt zdarzeń.' },
}

export function pobierzNazweUzytkownika(uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko'>) {
  return `${uzytkownik.imie} ${uzytkownik.nazwisko}`.trim()
}

export function czyUzytkownikJestAktywny(uzytkownik: Pick<Uzytkownik, 'status'> | null | undefined) {
  return uzytkownik?.status === 'AKTYWNY'
}
