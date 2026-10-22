import type { Uzytkownik } from './typyUzytkownikow'
let podgladUzytkownikaId: string | null = null
export function czyTrwaPodgladUzytkownika() { return podgladUzytkownikaId !== null }
export function ustawPodgladUzytkownika(konto: Uzytkownik | null) { podgladUzytkownikaId = konto?.id ?? null }
